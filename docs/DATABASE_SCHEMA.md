# 🗄️ Supabase PostgreSQL Database Schema

Complete database architecture, tables, columns, primary keys, foreign keys, and relationships for the **Payment-Track** platform.

---

## 📊 Entity Relationship Summary

```mermaid
erDiagram
    PROFILES ||--o{ CUSTOMERS : "user_id"
    PROFILES ||--o{ TRANSACTIONS : "user_id"
    PROFILES ||--o{ EXPENSES : "user_id"
    PROFILES ||--o{ APP_SETTINGS : "user_id"
    PROFILES ||--o{ DUES : "user_id"
    PROFILES ||--o{ GOALS : "user_id"
    PROFILES ||--o{ ACTIVITY_LOGS : "user_id"
    
    CUSTOMERS ||--o{ TRANSACTIONS : "customer_id"
    CUSTOMERS ||--o{ DUES : "customer_id"
    PORTALS ||--o{ TRANSACTIONS : "portal_id"

    PROFILES {
        uuid id PK
        text email
        text full_name
        text business_name
        text avatar_url
        app_role role
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMERS {
        uuid id PK
        uuid user_id FK
        text name
        text phone
        timestamp created_at
        timestamp updated_at
    }

    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        uuid portal_id FK
        uuid customer_id FK
        numeric amount
        numeric commission
        numeric site_fee
        numeric profit
        text transaction_type
        text card_type
        timestamp transaction_date
        text customer_name
        text customer_phone
        text username
        text notes
        timestamp created_at
        timestamp updated_at
    }

    EXPENSES {
        uuid id PK
        uuid user_id FK
        text category
        numeric amount
        timestamp expense_date
        text notes
        timestamp created_at
        timestamp updated_at
    }

    DUES {
        uuid id PK
        uuid user_id FK
        uuid customer_id FK
        text borrower_name
        text borrower_contact
        numeric principal_amount
        numeric amount_paid
        timestamp date_given
        timestamp expected_return_date
        text status
        jsonb payments
        text notes
        timestamp created_at
        timestamp updated_at
    }

    GOALS {
        uuid id PK
        uuid user_id FK
        text goal_type
        numeric target_amount
        timestamp period_start
        timestamp period_end
        timestamp created_at
        timestamp updated_at
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid user_id FK
        text action
        text category
        text description
        jsonb metadata
        timestamp created_at
    }

    PORTALS {
        uuid id PK
        text name
        numeric default_commission_rate
        numeric default_site_fee
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    APP_SETTINGS {
        uuid id PK
        uuid user_id FK
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
```

---

## 📋 Table Definitions

### 1. `transactions`
Stores credit card withdrawals, repayments, customer charges, commissions, and portal fees.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Unique transaction ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` / `profiles.id` | User who created the transaction (Multi-tenant) |
| `portal_id` | `uuid` | NO | **FK** -> `portals.id` | Associated portal / gateway |
| `amount` | `numeric` | NO | - | Total transaction amount (₹) (Check: `amount >= 0`) |
| `commission` | `numeric` | YES | - | Gross commission earned (₹) |
| `site_fee` | `numeric` | YES | - | Portal processing / site fee paid (₹) |
| `profit` | `numeric` | YES | - | Net profit = `commission - site_fee` (₹) |
| `transaction_type` | `text` | NO | - | Type (`withdrawal`, `repayment`, `cash`, etc.) |
| `card_type` | `text` | YES | - | Card brand / category (`Visa`, `Mastercard`, etc.) |
| `transaction_date` | `timestamptz` | NO | - | Date/time transaction occurred |
| `customer_id` | `uuid` | YES | **FK** -> `customers.id` | Reference to canonical customer record |
| `customer_name` | `text` | YES | - | Customer name snapshot / fallback |
| `customer_phone` | `text` | YES | - | Customer phone snapshot / fallback |
| `username` | `text` | YES | - | Profile username snapshot |
| `notes` | `text` | YES | - | User-entered transaction notes |
| `created_at` | `timestamptz` | NO | - | Record creation timestamp |
| `updated_at` | `timestamptz` | NO | - | Record update timestamp |

---

### 2. `customers`
Dedicated canonical customer records for customer tracking, repeat customer auto-fill, and CRM analytics.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Unique customer ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` | User/merchant who owns this customer record (Multi-tenant) |
| `name` | `text` | NO | - | Customer full name |
| `phone` | `text` | YES | - | Normalized 10-digit customer phone number (Unique per user) |
| `created_at` | `timestamptz` | NO | - | Customer record creation timestamp |
| `updated_at` | `timestamptz` | NO | - | Customer record last update timestamp (Trigger-managed) |

---

### 3. `expenses`
Stores business operating costs, worker salaries, rent, petrol, and overheads.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Unique expense ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` / `profiles.id` | Owner of the expense record |
| `category` | `text` | NO | - | Category (`Worker Salary`, `Petrol`, `Rent`, `Current Bills`, etc.) |
| `amount` | `numeric` | NO | - | Expense amount in ₹ |
| `expense_date` | `timestamptz` | NO | - | Date expense was incurred |
| `notes` | `text` | YES | - | Additional remarks |
| `created_at` | `timestamptz` | NO | - | Timestamp created |
| `updated_at` | `timestamptz` | NO | - | Timestamp updated |

---

### 4. `dues`
Money lent / borrower dues tracking with repayment ledger and status calculation.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Unique dues ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` / `profiles.id` | Record owner |
| `customer_id` | `uuid` | YES | **FK** -> `customers.id` | Associated customer |
| `borrower_name` | `text` | NO | - | Borrower full name |
| `borrower_contact` | `text` | YES | - | Borrower phone or contact info |
| `principal_amount` | `numeric` | NO | - | Total amount lent (₹) (Check: `>= 0`) |
| `amount_paid` | `numeric` | NO | - | Total amount recovered (₹) (Check: `>= 0`) |
| `date_given` | `timestamptz` | NO | - | Date loan / credit was given |
| `expected_return_date` | `timestamptz` | YES | - | Target date for full repayment |
| `status` | `text` | NO | - | Status (`outstanding`, `partially_paid`, `paid`, `overdue`) |
| `payments` | `jsonb` | NO | - | Array of partial payment logs |
| `notes` | `text` | YES | - | Notes / remarks |
| `created_at` | `timestamptz` | NO | - | Timestamp created |
| `updated_at` | `timestamptz` | NO | - | Timestamp updated |

---

### 5. `goals`
Financial performance targets (monthly, quarterly, yearly).

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Goal ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` / `profiles.id` | User owner |
| `goal_type` | `text` | NO | - | Goal scope (`monthly`, `quarterly`, `yearly`) |
| `target_amount` | `numeric` | NO | - | Target amount in ₹ (Check: `> 0`) |
| `period_start` | `timestamptz` | NO | - | Goal period start date |
| `period_end` | `timestamptz` | NO | - | Goal period end date (Check: `>= period_start`) |
| `created_at` | `timestamptz` | NO | - | Timestamp created |
| `updated_at` | `timestamptz` | NO | - | Timestamp updated (Trigger-managed) |

---

### 6. `activity_logs`
Audit log recording user actions, mutations, and system events.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Log entry ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` / `profiles.id` | Acting user |
| `action` | `text` | NO | - | Action identifier (e.g. `CREATE_TRANSACTION`) |
| `category` | `text` | NO | - | Category (e.g. `transaction`, `expense`, `customer`) |
| `description` | `text` | NO | - | Human-readable action description |
| `metadata` | `jsonb` | YES | - | Structured details (record IDs, changed fields) |
| `created_at` | `timestamptz` | NO | - | Timestamp created |

---

### 7. `portals`
Stores external gateways and portals through which transactions are processed.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** (gen_random_uuid()) | Portal unique identifier |
| `name` | `text` | NO | - | Portal name (`Upender`, `Chummi`, etc.) |
| `default_commission_rate`| `numeric` | YES | - | Standard commission percentage |
| `default_site_fee` | `numeric` | YES | - | Standard site fee percentage or fixed fee |
| `is_active` | `boolean` | YES | - | Active status (default: `true`) |
| `created_at` | `timestamptz` | NO | - | Timestamp created |
| `updated_at` | `timestamptz` | NO | - | Timestamp updated |

---

### 8. `profiles`
User profiles synced with Supabase Auth (`auth.users`).

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** / **FK** -> `auth.users.id` | Supabase auth user UUID |
| `email` | `text` | YES | - | User login email address |
| `full_name` | `text` | YES | - | User display name |
| `business_name` | `text` | YES | - | Company or shop name |
| `avatar_url` | `text` | YES | - | Public URL of user avatar image |
| `role` | `app_role` (`admin` \| `user`)| NO | - | User role (default: `'user'`) |
| `created_at` | `timestamptz` | NO | - | Profile creation date |
| `updated_at` | `timestamptz` | NO | - | Profile last update date |

---

### 9. `app_settings`
User custom settings, dropdown configurations (including card types with custom rates), and UI preferences.

| Column Name | Data Type | Nullable | Key / Ref | Description |
|-------------|-----------|----------|-----------|-------------|
| `id` | `uuid` | NO | **PK** | Settings ID |
| `user_id` | `uuid` | NO | **FK** -> `auth.users.id` | User owner |
| `settings` | `jsonb` | NO | - | JSON object containing customized dropdown options (`transactionCardTypes`, etc.) |
| `created_at` | `timestamptz` | NO | - | Timestamp created |
| `updated_at` | `timestamptz` | NO | - | Timestamp updated (Trigger-managed) |

---

## 🔐 Custom Enums & Functions

### Enums
- **`app_role`**: `'admin'`, `'user'`

### Functions
- **`has_role(_user_id uuid, _role app_role) -> boolean`**: Checks if user has the specified security role.
