> ⚠️ **CONFIDENTIAL & PROPRIETARY — ALL RIGHTS RESERVED**
>
> © 2026 **Srimanth Adep** (`srimanthadep@gmail.com`). This document and the architecture, schemas, prompt templates, system designs, and trade secrets contained herein are the exclusive intellectual property of the author. This material is shared solely for the purpose of authorized development work on the SmartCare platform.
>
> **RESTRICTIONS:** Unauthorized copying, reproduction, redistribution, reverse engineering, or creation of derivative works based on this document or its contents — in whole or in part — is **strictly prohibited** and may result in civil and criminal liability under the Indian Copyright Act, 1957, the Information Technology Act, 2000, and applicable trade secret laws.
>
> **LEGAL COUNSEL:** Any disputes or violations will be pursued through **Adv. B. Mythili Sruthi** (`mythilli.sruthi1234@gmail.com`, Bar Council of Delhi, Enrolment No. **D/4662/2025**), under the jurisdiction of the courts of Hyderabad, Telangana, India.

---

# Specification: Production WhatsApp Integration, Inbox & AI Bot Engine

> **Document ID:** SPEC-WA-PROD-001  
> **Version:** 1.0.0  
> **Status:** Approved / Production Baselined  
> **Last Updated:** 2026-09-03  
> **Target Systems:** Express.js Backend, React (Vite) Frontend, PostgreSQL (Supabase), SQLite Queue, Baileys Socket Engine, Google Gemini AI, Cloudinary CDN  
> **Conformance Keywords:** The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## Document Metadata & Governance

### Sign-Off & Approval Trail

| Role | Name | Contact | Status | Date |
| :--- | :--- | :--- | :--- | :--- |
| **Lead Architect & Author** | Srimanth Adep | `srimanthadep@gmail.com` | Approved | 2026-09-03 |

### Revision Changelog

| Version | Date | Author | Summary of Changes |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Srimanth Adep | Initial Production Baseline. Added formal state machines, non-goals, complete schema DDL, Baileys connection invariants, Gemini bot prompt and JSON schemas, threat model, BDD scenarios, and bidirectional traceability matrix. |

---

## Table of Contents
1. [System Overview, Boundaries & Non-Goals](#1-system-overview-boundaries--non-goals)
2. [Domain Models & State Machines](#2-domain-models--state-machines)
3. [Data Storage & Schema Specifications](#3-data-storage--schema-specifications)
4. [Baileys Engine Specifications & Invariants](#4-baileys-engine-specifications--invariants)
5. [API & Interface Specifications](#5-api--interface-specifications)
6. [Real-Time Socket.IO Synchronization Engine](#6-real-time-socketio-synchronization-engine)
7. [Background Worker & Queue Engine Specifications](#7-background-worker--queue-engine-specifications)
8. [Gemini AI Patient Bot Specifications](#8-gemini-ai-patient-bot-specifications)
9. [Failure Modes & Resilience Matrix](#9-failure-modes--resilience-matrix)
10. [Security, Threat Model & Privacy Specifications](#10-security-threat-model--privacy-specifications)
11. [Acceptance Criteria & Verification Scenarios (BDD)](#11-acceptance-criteria--verification-scenarios-bdd)
12. [Traceability Matrix: Invariants to Verification Scenarios](#12-traceability-matrix-invariants-to-verification-scenarios)
13. [Environment Configuration & Dependency Specifications](#13-environment-configuration--dependency-specifications)

---

## 1. System Overview, Boundaries & Non-Goals

### 1.1 Purpose & Scope
This specification defines the complete architectural requirements, data contracts, and operational invariants for the WhatsApp integration powering the SmartCare platform.

The system encompasses:
1. **Persistent Session Engine**: A PostgreSQL-backed session lifecycle resilient against container restarts and ephemeral cloud disks.
2. **Real-time Admin Inbox**: A two-way chat synchronization layer over Socket.IO with optimistic frontend updates.
3. **Resilient Background Queue**: An offline-safe, token-bucket rate-limited SQLite queue for automated transactional documents (invoices, prescriptions, X-rays) and appointment reminders.
4. **Grounded Gemini AI Bot**: A zero-leakage patient auto-reply assistant with Linked ID (`@lid`) resolution and deterministic document resending.

### 1.2 System Topology (Mermaid)

```mermaid
graph TD
    User["Admin Browser (React / Vite)"]
    
    subgraph ExpressBackend ["Express.js Backend Core"]
        SSEStream["SSE Endpoint (/qr-stream)"]
        InboxRoutes["Admin Inbox Routes (/chats)"]
        SocketServer["Socket.IO Server"]
        BaileysSock["Baileys Socket Runtime (@whiskeysockets/baileys)"]
        Worker["WhatsApp Queue Worker"]
        BotService["Gemini AI Bot Service"]
    end
    
    subgraph StorageTier ["Persistence & Cloud Infrastructure"]
        Postgres[("PostgreSQL (Supabase)<br/>- whatsapp_sessions<br/>- whatsapp_chats<br/>- whatsapp_messages")]
        SQLite[("SQLite Local Queue<br/>- queues<br/>- ack_tracking")]
        Cloudinary["Cloudinary CDN<br/>Media Assets & Thumbnails"]
        GeminiAPI["Google Gemini API<br/>gemini-3.1-flash-lite"]
        WAServers["WhatsApp Central Servers<br/>(WSS Protocol)"]
    end

    User <-->|"REST / SSE"| ExpressBackend
    User <-->|"WSS (whatsapp room)"| SocketServer
    ExpressBackend <-->|"Auth & Inbox Mirroring"| Postgres
    Worker <-->|"Poll & Lease Jobs"| SQLite
    Worker -->|"Send Document"| BaileysSock
    BaileysSock <-->|"E2E Signal Sync"| WAServers
    BaileysSock -->|"Upload Decrypted Media"| Cloudinary
    BotService <-->|"Grounded Prompt / JSON"| GeminiAPI
    BotService -->|"Execute Action"| Worker
```

### 1.3 Explicit Non-Goals (Out of Scope)
To maintain architectural boundaries, the following functions are strictly **OUT OF SCOPE**:
- **NON-GOAL 1 (Mass Marketing / Promotional Spam):** The system MUST NOT be used for bulk marketing or promotional spam. All outbound messaging is strictly transactional or responsive to 1:1 patient interactions.
- **NON-GOAL 2 (Autonomous Medical Diagnosis / Prescribing):** The AI bot MUST NOT formulate medical diagnoses or modify drug dosages. Its remit is strictly limited to restating instructions from existing records or advising clinical consultation.
- **NON-GOAL 3 (Payment Gateway Processing in WhatsApp):** In-chat financial transactions (e.g. WhatsApp Pay) are not supported; invoices are distributed with secure web payment links.
- **NON-GOAL 4 (Group Chat Orchestration):** Group conversations (`@g.us`) and broadcast channels (`@newsletter`, `status@broadcast`) are explicitly ignored by both the inbox and AI bot.
- **NON-GOAL 5 (Multi-Tenant Numbers on a Single Worker):** The runtime manages a single authoritative clinic WhatsApp pairing (`default-session`). Multi-tenant number switching on a single instance is not supported.

---

## 2. Domain Models & State Machines

### 2.1 WhatsApp Session Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: initWhatsApp()
    Connecting --> AwaitingQR: connection.update(qr)
    AwaitingQR --> Connecting: Scanned by Phone
    Connecting --> Connected: connection.update(open)
    Connected --> Disconnected: Temporary Socket Drop
    Disconnected --> Connecting: Auto-reconnect (5s backoff)
    Connected --> LoggedOut: DisconnectReason.loggedOut (401)
    LoggedOut --> Disconnected: Wipe whatsapp_sessions
```

- **State Definitions:**
  - `disconnected`: No active WebSocket connection. Socket object is `null`.
  - `connecting`: Socket handshake in progress; cryptographic keys loading from database.
  - `awaiting_qr`: Device unauthenticated. QR string generated and converted to Base64 PNG DataURL.
  - `connected`: Authenticated WebSocket established with WhatsApp servers. Inbound/outbound pipelines active.
  - `logged_out`: Device unlinked from phone. All session keys MUST be wiped from PostgreSQL.

### 2.2 Outbound Queue Job State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending: enqueue(type, action, payload)
    Pending --> InProgress: fetchNext() [Locked]
    InProgress --> Done: performSend() Success
    InProgress --> Pending: Temporary Error (Attempts < Max, Backoff Delay)
    InProgress --> Failed: Terminal Error / Max Attempts Exhausted (3)
    InProgress --> Pending: Stale Recovery (updated_at > 5m ago)
```

- **State Definitions:**
  - `pending`: Ready for execution when `run_at <= current_time`.
  - `in_progress`: Leased by the background worker. Locked to prevent duplicate execution.
  - `done`: Message transmitted to Baileys socket and ACK recorded.
  - `failed`: Maximum retry attempts exhausted (3 attempts). Logged to audit trail.

---

## 3. Data Storage & Schema Specifications

### 3.1 PostgreSQL Schemas (Primary Persistence)

#### 1. `whatsapp_sessions` (Cryptographic Key-Value Store)
```sql
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_created ON whatsapp_sessions(created_at ASC);
```

#### 2. `whatsapp_chats` (Inbox Conversation Metadata)
```sql
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    jid TEXT PRIMARY KEY,
    name TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    last_message_preview TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INT DEFAULT 0,
    participant_count INT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_chats_last_msg ON whatsapp_chats(last_message_at DESC NULLS LAST);
```

#### 3. `whatsapp_contacts` (Contact Directory & Name Authority)
```sql
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    jid TEXT PRIMARY KEY,
    name TEXT,             -- Authoritative address book name
    push_name TEXT,        -- WhatsApp profile push name (fallback)
    avatar_url TEXT
);
```

#### 4. `whatsapp_messages` (Audit & History Store)
```sql
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    chat_jid TEXT REFERENCES whatsapp_chats(jid) ON DELETE CASCADE,
    sender_jid TEXT,
    from_me BOOLEAN NOT NULL DEFAULT FALSE,
    body TEXT,
    message_type TEXT NOT NULL, -- 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker'
    media_url TEXT,
    status TEXT,                -- 'sent' | 'delivered' | 'read'
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    raw JSONB                   -- Full BufferJSON payload for Signal retries
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_ts ON whatsapp_messages (chat_jid, timestamp DESC);
```

#### 5. `whatsapp_bot_messages` (AI Conversation Turns)
```sql
CREATE TABLE IF NOT EXISTS whatsapp_bot_messages (
    id SERIAL PRIMARY KEY,
    jid TEXT NOT NULL,
    patient_id TEXT,
    role TEXT NOT NULL,         -- 'user' | 'assistant'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_bot_msgs_jid_created ON whatsapp_bot_messages(jid, created_at DESC);
```

#### 6. `whatsapp_message_log` (Outbound Audit Trail)
```sql
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id SERIAL PRIMARY KEY,
    phone TEXT,
    action TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    error TEXT,
    patient_id TEXT,
    patient_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_log_created ON whatsapp_message_log(created_at DESC);
```

### 3.2 SQLite Schemas (Local Background Queue Store)

```sql
CREATE TABLE IF NOT EXISTS queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                     -- 'text' | 'media' | 'background'
    action TEXT NOT NULL,                   -- 'sendWelcome' | 'sendInvoice' | 'sendPrescription' | 'sendXrayReport' | 'sendReminder' | 'sendRecallReminder'
    payload TEXT NOT NULL,                  -- JSON encoded arguments
    dedup_key TEXT,                         -- Unique identifier to prevent double-enqueuing
    jid TEXT,                               -- Target recipient JID for batching
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'done' | 'failed'
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    run_at INTEGER,                         -- Epoch MS timestamp for scheduled delay
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_queues_type_status_runat ON queues(type, status, run_at, created_at);
CREATE INDEX IF NOT EXISTS idx_queues_jid ON queues(jid, type, status);

CREATE TABLE IF NOT EXISTS ack_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_id INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(queue_id) REFERENCES queues(id)
);
```

---

## 4. Baileys Engine Specifications & Invariants

### 4.1 Connection & Version Invariants
- **INV-BAI-01 (Version Timeout Race):** `fetchLatestBaileysVersion()` MUST be raced against a `1500ms` timeout:
  ```javascript
  const version = await Promise.race([
    fetchLatestBaileysVersion().then((r) => r.version).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
  const socketOpts = version ? { version } : {};
  ```
  - *Invariant:* If the network request times out, the `version` property MUST be omitted from socket configuration. It MUST NOT be passed as `{ version: undefined }` (which crashes Baileys version checks).
- **INV-BAI-02 (History Sync Restriction):** `shouldSyncHistoryMessage` MUST return `true` ONLY for:
  - `proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP`
  - `proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3`
  - *Rationale:* Blanket approval dumps thousands of contacts/messages, exhausting the database connection pool. Blanket rejection breaks the cryptographic LID-to-phone mapping.
- **INV-BAI-03 (Signal Key Pruning):** During `usePostgresAuthState` initialization:
  - Total non-creds keys MUST be checked (`WHERE id LIKE '${sessionId}-%' AND id NOT LIKE '${sessionId}-creds'`).
  - If count > 200, the oldest `(total - 200)` rows ordered by `created_at ASC` MUST be pruned.
  - Rows matching `${sessionId}-creds` MUST NEVER be deleted.
- **INV-BAI-04 (Retry Decryption Hook):** `getMessage` MUST read from `whatsapp_messages.raw` via `getMessageFromStore(key.id)` and revive Buffers using `BufferJSON.reviver`. If not found, it MUST return `{ conversation: '' }`.

### 4.2 Auto-Reconnection & Teardown Protocol
- **On `connection === 'close'`:**
  - If `lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut` AND `hasPostgresAuthState('default-session') === true`:
    - System MUST wait `5000ms` and call `initWhatsApp()`.
  - If `DisconnectReason.loggedOut`:
    - System MUST wipe all records matching `default-session-%` from `whatsapp_sessions`.
    - Connection status MUST transition to `disconnected`.

### 4.3 Media Decryption & Cloud Offloading Specification
- When binary media arrives (`image`, `video`, `audio`, `document`, `sticker`), the engine MUST:
  1. Decrypt the binary stream using `downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: sock?.updateMediaMessage })`.
  2. Map the resource type:
     - `document` -> Cloudinary resource type `raw`
     - `video` | `audio` -> Cloudinary resource type `video`
     - `image` | `sticker` -> Cloudinary resource type `image`
  3. Upload binary buffer to Cloudinary folder `smartcare/whatsapp`.
  4. Store the resulting HTTPS CDN URL in `whatsapp_messages.media_url`.
  - *Optimization Flag:* In resource-constrained hosting environments, media download for live inbound messages MAY be toggled off via `WA_ENABLE_INBOX_PERSIST`, preserving type placeholders (`📷 Photo`, `📄 Document`) while skipping binary downloads.

---

## 5. API & Interface Specifications

### 5.1 Real-Time Server-Sent Events (SSE)

#### Endpoint: `GET /api/whatsapp/qr-stream`
- **Authentication:** `authSSE` (JWT token verified via query param or cookie).
- **Headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- **Payload Schema:**
```typescript
interface WaStatusPayload {
  status: 'disconnected' | 'connecting' | 'awaiting_qr' | 'connected';
  qr: string | null; // DataURL "data:image/png;base64,..." or null
}
```
- **Interval:** Active stream updates broadcast every `1500ms` or immediately on state changes.
- **Auto-Termination:** Stream MUST auto-terminate (`res.end()`) once `status === 'connected'` or after `120000ms` (2 minutes).

### 5.2 REST Inbox API (Admin Gated)
All endpoints require `auth` AND `authorize('admin')`.

#### 1. `GET /api/whatsapp/chats`
- **Response:** `200 OK` -> `WaChatDto[]`
```typescript
interface WaChatDto {
  jid: string;
  name: string | null;
  isGroup: boolean;
  avatarUrl: string | null;
  preview: string;
  lastMessageAt: number | null; // Epoch MS
  unreadCount: number;
  participantCount: number | null;
}
```

#### 2. `GET /api/whatsapp/chats/:jid/messages`
- **Query Params:** `limit` (default: 50, max: 100), `before` (epoch MS timestamp).
- **Response:** `200 OK` -> `WaMessageDto[]`
```typescript
interface WaMessageDto {
  id: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  body: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl: string | null;
  status: 'sent' | 'delivered' | 'read' | null;
  timestamp: number; // Epoch MS
}
```

#### 3. `POST /api/whatsapp/chats/:jid/messages`
- **Request Body:** `{ text: string }`
- **Response:** `200 OK` -> `{ id: string }` | `503 Service Unavailable` if socket disconnected.

#### 4. `PATCH /api/whatsapp/chats/:jid/read`
- **Action:** Resets `unread_count = 0` in database AND transmits `sock.readMessages(keys)` to WhatsApp servers for up to 30 unread messages.
- **Response:** `200 OK` -> `{ ok: true, chat: WaChatDto }`

#### 5. `GET /api/whatsapp/bot/status` & `PUT /api/whatsapp/bot/status`
- **Purpose:** Read / toggle AI bot auto-replies across the clinic.
- **Storage:** Persisted in `app_settings` under key `whatsapp_bot_enabled` with a 30-second memory cache.

---

## 6. Real-Time Socket.IO Synchronization Engine

### 6.1 Event Definitions
Broadcasted exclusively to the `whatsapp` room (`emitWhatsApp(event, payload)`):

| Event Name | Trigger | Payload Interface |
| :--- | :--- | :--- |
| `whatsapp:new-message` | Inbound message received or outbound message sent | `{ message: WaMessageDto, chat: WaChatDto }` |
| `whatsapp:chat-update` | Metadata update, read receipt, or history sync | `WaChatDto \| { historySync: true }` |
| `whatsapp:message-status` | WhatsApp delivery/read ack receipt (`messages.update`) | `{ id: string, chatJid: string, status: 'sent' \| 'delivered' \| 'read' }` |

### 6.2 Frontend Cache Reconciliation Invariants
- **Optimistic Sends:** 
  1. Frontend MUST inject a temporary message object with `id: temp-<timestamp>` and `status: 'sending'` into TanStack Query cache `['wa-messages', chatJid]`.
  2. On API resolution, temporary ID MUST be replaced with server ID without triggering a refetch.
  3. On API error, temporary bubble MUST be removed and toast notification displayed.
- **Cache Invalidation:** Live `whatsapp:new-message` events MUST atomically update both `['wa-chats']` (re-sorting conversation order) and `['wa-messages', chatJid]` (appending bubble).

---

## 7. Background Worker & Queue Engine Specifications

### 7.1 Token Bucket Rate Limiter
- **Configuration:** 5 tokens per category bucket (`invoices`, `reminders`, `reports`).
- **Refill Rate:** 5 tokens per second.
- **Worker Tick Delay:** 5000ms polling intervals across `processTextQueue`, `processMediaQueue`, and `processBackgroundQueue`.
- **INV-QUE-01 (Tick Guard):** Every queue processor MUST be wrapped in a re-entrancy lock (`guarded = (fn) => ...`). A new execution tick MUST NOT start if the prior tick is still running.

### 7.2 Message Batching Algorithm
When `processTextQueue` handles a job for recipient `jid`:
1. It MUST check SQLite for other pending `text` jobs matching the same `jid`.
2. Sibling text payloads MUST be concatenated with `\n\n`.
3. Sibling jobs MUST be held in memory and marked `done` **ONLY AFTER** `performSend` succeeds. If sending throws, all siblings remain `pending`.

### 7.3 Lazy Document Rendering Specification
- To prevent heavy PDF rendering (Puppeteer/PDFKit) from blocking Express request cycles:
  - Immediate send API attempts to render and send synchronously.
  - If disconnected or failed, enqueue lightweight reference: `{ jid, patientId, invoiceId, fileName, caption }`.
  - The worker MUST lazily generate the PDF from the database ID inside `performSend` at send time.
  - For X-ray reports, lazy worker generation of WebP thumbnails (`mediaCacheService.generateThumbnail`) MUST be supported.

### 7.4 Stale Job Recovery Specification
- Every 60 seconds, `recoverStaleJobs` checks `queues WHERE status = 'in_progress' AND updated_at < (now - 5 minutes)`.
- If an entry in `ack_tracking` exists for the job, mark `done`.
- Otherwise, reset `status = 'pending'`, `last_error = 'Recovered stale in-progress job'`, and set `run_at = now`.

---

## 8. Gemini AI Patient Bot Specifications

### 8.1 Inbound Query Filtering Criteria
An incoming message MUST trigger the AI pipeline ONLY IF:
1. `isBotEnabled() === true`.
2. `msg.key.fromMe === false`.
3. `isExcludedJid(chatJid) === false` (Chat is 1:1, not a group `@g.us` or broadcast).
4. Content type is `text` with non-empty trimmed body.
5. Inbound count for `jid` within the last 1 hour is `< WA_BOT_RATE_LIMIT_PER_HOUR` (default: 20).

### 8.2 Linked ID (`@lid`) Resolution Protocol
WhatsApp contacts may transmit from opaque `@lid` identifiers (e.g. `83408281698402@lid`).
```
[Inbound JID]
      |
      +---> Is it @lid?
              |
        (YES) v
              1. Check msg.key.remoteJidAlt (Fast Path)
              2. If null, call sock.signalRepository.lidMapping.getPNForLID(jid)
              3. If resolved, extract last 10 digits
              |
        (NO)  v
              Extract last 10 digits directly from JID
```
- Sender national number MUST be queried against `patients.phone` using `RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) = $1`.

### 8.3 Grounded Context Construction Invariant
- **INV-BOT-01 (Zero PHI Leakage):** The AI prompt MUST contain data ONLY for the matched patient.
- Context payload MUST be constructed using:
  - Upcoming non-cancelled appointments (`>= today`, limit 5).
  - Recent invoices (limit 5).
  - Recent prescriptions with medicines and instructions (limit 3).
- If no patient matches, `patientContext` MUST be initialized with empty arrays and a flag indicating an unmatched sender. Clinic general info MUST still be provided.

### 8.4 System Prompt Specification & Exact Contract
The Gemini API prompt MUST be constructed using the following template:

```
You are "Siara AI", the WhatsApp assistant for Siara Dental Clinic, replying directly to a patient over WhatsApp.
You must return the response in strict JSON format:
{
  "reply": "The exact WhatsApp message text to send back to the patient. Keep it warm, concise, and use simple WhatsApp-friendly formatting (e.g. *bold*).",
  "action": "none" | "resend_invoice" | "resend_prescription",
  "actionId": "the specific invoice or prescription id to resend, or null if action is none"
}

CLINIC INFO:
{
  "name": "SIARA Dental Clinic",
  "phone": "+91 8919878543",
  "address": "Kothapet Main Road, Kothapet, Hyderabad",
  "timings": "Mon - Sat | 10:00 AM - 8:00 PM (Closed on Sundays)",
  "website": "https://siaradental.in"
}

PATIENT RECORD (this is the ONLY patient data you may reference — it belongs to the person you are speaking with):
${JSON.stringify(patientContext, null, 2)}

CRITICAL RULES:
1. STRICT FACTS ONLY: Never invent appointment dates, invoice amounts, or medicine names. Only use what is in PATIENT RECORD.
2. NO MEDICAL DIAGNOSIS: For "how/when to take medicine" questions, only restate the instructions already present in their prescription record. If an urgent symptom is described, advise them to call ${CLINIC_INFO.phone}.
3. RESEND DOCUMENTS: If the patient asks for their invoice or prescription, set "action" accordingly and "actionId" to the relevant ID.
4. NO PHI LEAKAGE: Never mention other patients or clinic-wide data.
5. TONE: 2-5 sentences max, friendly and professional.
```

### 8.5 Gemini REST API Caller Specification
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`
- **Request Headers:** `{ "Content-Type": "application/json" }`
- **Request Body:**
```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "<System Prompt with Grounded Context>" }] },
    { "role": "user", "parts": [{ "text": "<Inbound Patient Query>" }] }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "max_output_tokens": 512,
    "response_mime_type": "application/json"
  }
}
```
- **Action Execution:**
  - If `action === 'resend_invoice'` and `actionId` is valid, `whatsappService.sendInvoice(patient, invoice)` MUST be triggered.
  - If `action === 'resend_prescription'` and `actionId` is valid, `whatsappService.sendPrescription(patient, prescription)` MUST be triggered.

---

## 9. Failure Modes & Resilience Matrix

| Failure Mode | Impact | Automatic Recovery Mechanism |
| :--- | :--- | :--- |
| **Container Redeploy / Restart** | Disk wiped; in-memory socket cleared | `hasPostgresAuthState` detects existing credentials on startup; initiates socket silently without QR scan. |
| **WhatsApp Network Drop** | Socket closes unexpectedly | `connection.update` detects non-logout disconnect; triggers `setTimeout(() => initWhatsApp(), 5000)`. |
| **User Unlinks Device (Phone)** | Baileys returns 401 Unauthorized | DisconnectReason detected; `whatsapp_sessions` cleared; status set to `disconnected`. |
| **Message Spike (Rate Limiting)** | Potential WhatsApp account ban | SQLite queue throttles sends to 5 tokens/sec per bucket; cooldown delays applied. |
| **Worker Process Crash Mid-Send** | Job stuck in `in_progress` | `recoverStaleJobs` sweeps jobs older than 5 minutes every 60s and resets them to `pending`. |
| **AI Bot Infinite Loop / Spam** | Expensive Gemini API billing | Hourly rate limiter blocks queries exceeding 20 msg/hr per JID; turns logged to `whatsapp_bot_messages`. |
| **Signal Key Table Bloat** | Postgres storage explosion | `usePostgresAuthState` auto-prunes keys exceeding 200 rows on every initialization. |

---

## 10. Security, Threat Model & Privacy Specifications

### 10.1 STRIDE Threat Analysis & Mitigations

| Threat Category | Potential Vector | Mitigation Requirement |
| :--- | :--- | :--- |
| **Spoofing** | Unauthorized user injecting messages into inbox | All inbox endpoints require JWT authentication (`auth`) AND strict `admin` role check (`authorize('admin')`). Non-admin requests receive `403 Forbidden`. |
| **Tampering** | Malicious alteration of outbound PDF invoices or prescriptions | Outbound documents are rendered directly from immutable database IDs via `pdfService` and hashed in `mediaCacheService`. Payloads pass cryptographic hashes. |
| **Repudiation** | Denying an outbound message was sent or received | Every outbound attempt is logged with timestamp, patient ID, JID, and delivery status to `whatsapp_message_log` and `ack_tracking`. |
| **Information Disclosure** | Cross-patient Protected Health Information (PHI) leakage via AI bot | **INV-BOT-01** strictly limits the database query to the patient record matching the sender's phone number. AI context receives only this one patient's appointments/invoices/prescriptions. |
| **Denial of Service (DoS)** | Message bombing / spamming to exhaust Gemini API credits or Postgres connections | Inbound queries are rate-limited to `< 20 msgs/hour` per JID (`WA_BOT_RATE_LIMIT_PER_HOUR`). History sync filters block bulk contact dumps (`INV-BAI-02`). |
| **Elevation of Privilege** | Non-administrative staff accessing WhatsApp chats or QR stream | Route-level middleware enforces role validation; Server-Sent Events (`/qr-stream`) validates session credentials via `authSSE`. |

### 10.2 Secret Management & Compromise Recovery Protocol
- **Zero Hardcoded Secrets:** All secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `CLOUDINARY_API_SECRET`, `AUTH_SECRET`) MUST be injected via runtime environment variables.
- **Compromise Runbook (`GEMINI_API_KEY`):**
  1. Revoke the key immediately in Google AI Studio / Cloud Console.
  2. Provision a new API key.
  3. Update `GEMINI_API_KEY` in the hosting environment.
  4. Perform rolling container restart. No database migration or client rebuild required.
- **Compromise Runbook (WhatsApp Session Pairing):**
  1. Clinic administrator unlinks the paired device directly in WhatsApp mobile app (Settings ➔ Linked Devices).
  2. Baileys socket detects 401 Unauthorized (`DisconnectReason.loggedOut`).
  3. System automatically drops all session keys from `whatsapp_sessions`.

---

## 11. Acceptance Criteria & Verification Scenarios (BDD)

### Scenario 1: Clean Startup & Version Timeout Fallback
- **Verifies:** `INV-BAI-01`
- **Given** an empty `whatsapp_sessions` table,
- **When** the server boots or an admin hits `POST /api/whatsapp/connect`,
- **And** the GitHub version check takes longer than 1500ms,
- **Then** `fetchLatestBaileysVersion()` MUST time out cleanly,
- **And** `makeWASocket` MUST be invoked with an empty object rather than `{ version: undefined }`,
- **And** the SSE stream `/api/whatsapp/qr-stream` MUST emit status `awaiting_qr` with a valid Base64 QR DataURL without crashing.

### Scenario 2: Container Reboot with Active Pairing
- **Given** an existing `default-session-creds` record containing valid `creds.me`,
- **When** the backend container reboots,
- **Then** `hasPostgresAuthState('default-session')` MUST return `true`,
- **And** the socket MUST connect silently without generating a QR code,
- **And** connection status MUST transition to `connected`.

### Scenario 3: Inbound Message Persistence & Admin Fan-Out
- **Given** an incoming 1:1 patient message from a regular phone number,
- **When** Baileys triggers `messages.upsert`,
- **Then** nested envelopes (`ephemeralMessage`, `viewOnceMessage`) MUST be unpacked,
- **And** message record MUST be inserted into `whatsapp_messages` with `raw` JSONB,
- **And** `whatsapp_chats` preview and `last_message_at` MUST be updated,
- **And** a Socket.IO event `whatsapp:new-message` MUST be emitted to the `whatsapp` room.

### Scenario 4: Automated Inbound AI Resolution with `@lid`
- **Verifies:** `INV-BOT-01`
- **Given** an incoming message from an opaque `83408281698402@lid`,
- **When** the AI bot handles the query,
- **Then** it MUST resolve the underlying phone number using `remoteJidAlt` or `lidMapping.getPNForLID()`,
- **And** it MUST query PostgreSQL ONLY for that matched patient ID,
- **And** it MUST query Gemini Flash-Lite with structured JSON output,
- **And** it MUST send the generated reply back to the patient via `sendInboxMessage`.

### Scenario 5: Queue Resilience Under Offline Conditions
- **Given** WhatsApp socket is `disconnected`,
- **When** an invoice is issued to a patient,
- **Then** `whatsappService.sendInvoice()` MUST enqueue a job in `queues` table with `status = 'pending'`,
- **And** the worker MUST requeue the job every 30s until WhatsApp reconnects,
- **And** upon reconnection, the job MUST lazily generate the PDF and transmit successfully.

### Scenario 6: Selective History Sync & Connection Pool Protection
- **Verifies:** `INV-BAI-02`
- **Given** a connected WhatsApp socket receiving historical sync payloads,
- **When** Baileys evaluates `shouldSyncHistoryMessage({ syncType })`,
- **Then** it MUST return `true` for `INITIAL_BOOTSTRAP` and `INITIAL_STATUS_V3`,
- **And** it MUST return `false` for `PUSH_NAME`, `FULL`, and `RECENT`,
- **And** database connection pool MUST NOT experience query starvation or connection timeouts.

### Scenario 7: Signal Key Auto-Pruning & Creds Protection
- **Verifies:** `INV-BAI-03`
- **Given** `whatsapp_sessions` contains 450 total rows for session `default-session`,
- **When** `usePostgresAuthState('default-session')` initializes,
- **Then** exactly 250 oldest signal keys MUST be deleted,
- **And** total non-creds keys in `whatsapp_sessions` MUST equal 200,
- **And** the record `default-session-creds` MUST NOT be deleted.

### Scenario 8: Raw Signal Retry Receipt Message Retrieval
- **Verifies:** `INV-BAI-04`
- **Given** a patient device sends a decryption retry request for a previous message key `MSG-999`,
- **When** Baileys socket calls `getMessage({ id: 'MSG-999' })`,
- **Then** the engine MUST query `SELECT raw FROM whatsapp_messages WHERE id = 'MSG-999'`,
- **And** it MUST revive Buffers using `BufferJSON.reviver`,
- **And** it MUST return the revived `WAMessage.message` payload to Baileys.

### Scenario 9: Queue Worker Re-entrancy Lock Under Slow Outbound
- **Verifies:** `INV-QUE-01`
- **Given** a slow PDF generation taking 12 seconds in `processMediaQueue`,
- **When** the 5-second interval timer fires at `T=5s` and `T=10s`,
- **Then** the `guarded` execution lock MUST drop the secondary ticks,
- **And** concurrent duplicate sends of the same job MUST NOT occur.

### Scenario 10: Zero PHI Leakage for Unmatched Senders
- **Verifies:** `INV-BOT-01`
- **Given** an incoming message from a phone number not registered in the `patients` table,
- **When** the AI bot constructs the grounded context,
- **Then** `patientContext` MUST NOT contain data from any existing patient,
- **And** the AI reply MUST provide general clinic information while asking the user to contact the front desk.

---

## 12. Traceability Matrix: Invariants to Verification Scenarios

This matrix guarantees bidirectional traceability between architectural invariants and test verification scenarios.

| Invariant Code | Category | Invariant Rule Summary | Primary BDD Scenario | Secondary / Edge Verification |
| :--- | :--- | :--- | :--- | :--- |
| **`INV-BAI-01`** | Baileys Engine | 1500ms version race timeout; omit `version` on timeout | [Scenario 1](#scenario-1-clean-startup--version-timeout-fallback) | Unit test mocking slow `fetchLatestBaileysVersion` |
| **`INV-BAI-02`** | Baileys Engine | Allow only `INITIAL_BOOTSTRAP` & `INITIAL_STATUS_V3` history | [Scenario 6](#scenario-6-selective-history-sync--connection-pool-protection) | Integration test asserting filter function return values |
| **`INV-BAI-03`** | Storage / Auth | Auto-prune keys > 200 rows; immortal `-creds` record | [Scenario 7](#scenario-7-signal-key-auto-pruning--creds-protection) | Database migration and pruning query assertion |
| **`INV-BAI-04`** | Storage / Inbox| `getMessage` resolves from `whatsapp_messages.raw` via BufferJSON | [Scenario 8](#scenario-8-raw-signal-retry-receipt-message-retrieval) | Unit test simulating poll / retry decryption request |
| **`INV-QUE-01`** | Background Queue| Re-entrancy lock (`guarded`) prevents overlapping worker ticks | [Scenario 9](#scenario-9-queue-worker-re-entrancy-lock-under-slow-outbound) | Concurrency stress test with artificial delay |
| **`INV-BOT-01`** | Gemini AI Bot | Zero PHI leakage; context bounded strictly to sender patient | [Scenario 4](#scenario-4-automated-inbound-ai-resolution-with-lid) & [Scenario 10](#scenario-10-zero-phi-leakage-for-unmatched-senders) | End-to-end bot test with matched and unmatched numbers |

---

## 13. Environment Configuration & Dependency Specifications

### 13.1 Core NPM Dependencies
```bash
# Backend Production Dependencies
npm install @whiskeysockets/baileys qrcode better-sqlite3 jsonwebtoken socket.io cloudinary dotenv pg

# Frontend Dependencies
npm install @tanstack/react-query socket.io-client lucide-react sonner
```

### 13.2 Environment Variables (`.env`) Specification
| Variable Name | Required | Example / Format | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | YES | `postgresql://user:pass@host:5432/db?sslmode=require` | Supabase / PostgreSQL connection pool string |
| `GEMINI_API_KEY` | YES | `AIzaSy...` | Google AI Studio API key for Gemini Flash-Lite |
| `CLOUDINARY_CLOUD_NAME`| YES | `siara-dental` | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | YES | `123456789012345` | Cloudinary API access key |
| `CLOUDINARY_API_SECRET`| YES | `abcde_12345...` | Cloudinary API secret |
| `AUTH_SECRET` | YES | `secret_jwt_key` | JWT signature key for admin authentication |
| `WA_BOT_RATE_LIMIT_PER_HOUR` | NO | `20` (Default) | Inbound query cap per JID to prevent AI billing spikes |
| `WA_ENABLE_INBOX_PERSIST` | NO | `true` | Persist incoming message history to PostgreSQL |
| `WA_ENABLE_AVATAR_FETCH` | NO | `false` | Enable/disable WhatsApp profile picture downloading |

---
*Specification standard for SmartCare WhatsApp Integration Engine.*  
*Maintained by Srimanth Adep (`srimanthadep@gmail.com`).*
