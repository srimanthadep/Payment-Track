require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const allowedEnv = process.env.FRONTEND_URL;
      if (!allowedEnv || allowedEnv === "*" || allowedEnv.trim() === "") {
        return callback(null, true);
      }

      const allowedList = allowedEnv.split(",").map((u) => u.trim());
      if (
        allowedList.includes("*") ||
        allowedList.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
  })
);

app.options("*", cors());

app.use(express.json());

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.PROJECT_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log("Supabase Admin Client initialized successfully");
} else {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in environment variables!");
}

// Health Check Endpoint (Required for Render zero-downtime health probes)
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Payment Tracker Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// User Registration & Creation Endpoint (Used for both public signup and admin creation)
async function handleRegisterUser(req, res) {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: "Supabase service role credentials not configured on backend server",
      });
    }

    const { email, password, full_name, business_name, make_admin, make_staff, role, username } = req.body;

    // Support both direct email and username (map to @paymenttrack.com)
    let userEmail = email ? email.trim().toLowerCase() : "";
    if (!userEmail && username) {
      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
      userEmail = `${cleanUsername || "user"}@paymenttrack.com`;
    }

    if (!userEmail || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const displayName = full_name || username || userEmail.split("@")[0];

    // 1. Create auth user via Supabase admin API (bypasses GoTrue disabled signups)
    const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        business_name: business_name || "My Business",
        username: username || userEmail.split("@")[0],
      },
    });

    if (createErr) {
      const msg = createErr.message || "Failed to create user";
      const userFriendlyMsg = msg.includes("already registered") || msg.includes("already exists")
        ? "This username or email is already registered. Please sign in or choose another."
        : msg;
      return res.status(400).json({ error: userFriendlyMsg });
    }

    const newUserId = createRes.user?.id;
    if (!newUserId) {
      return res.status(500).json({ error: "User creation failed: missing id" });
    }

    const isAdminRoute = req.path.includes("admin-create-user");
    let callerAdminId = null;

    if (isAdminRoute) {
      // Verify caller is admin
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: { user: callerUser }, error: authErr } = await supabase.auth.getUser(token);
        if (!authErr && callerUser) {
          const { data: callerProfile } = await supabase
            .from("profiles")
            .select("role, id")
            .eq("id", callerUser.id)
            .maybeSingle();
          if (callerProfile?.role === "admin") {
            callerAdminId = callerProfile.id;
          }
        }
      }

      // If admins already exist in the system, caller MUST be an authenticated admin
      const { count: adminCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (adminCount && adminCount > 0 && !callerAdminId) {
        return res.status(403).json({ error: "Unauthorized: Admin privileges required to manage users" });
      }
    }

    // 2. Upsert profile with role and owner_id
    let roleToAssign = "user";
    let ownerIdToAssign = null;
    if (isAdminRoute && (role === "admin" || make_admin)) {
      roleToAssign = "admin";
    } else if (isAdminRoute && (role === "staff" || make_staff)) {
      roleToAssign = "staff";
      ownerIdToAssign = callerAdminId;
      if (!ownerIdToAssign) {
        const { data: adminUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        ownerIdToAssign = adminUser?.id || null;
      }
    }

    await supabase.from("profiles").upsert({
      id: newUserId,
      email: userEmail,
      full_name: displayName,
      business_name: business_name || "My Business",
      role: roleToAssign,
      owner_id: ownerIdToAssign,
    });

    return res.status(200).json({
      success: true,
      id: newUserId,
      email: userEmail,
      role: roleToAssign,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

app.post("/api/register", handleRegisterUser);
app.post("/api/admin-create-user", handleRegisterUser);
app.post("/functions/v1/admin-create-user", handleRegisterUser);

// ====================================================================
// WhatsApp Business Cloud API Integration
// ====================================================================

const WA_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Sends a text message via WhatsApp Business Cloud API
 */
async function sendWhatsAppMessage(phone, message) {
  if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
    throw new Error("WhatsApp not configured: missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data?.error?.message || `WhatsApp API error (${response.status})`;
    throw new Error(errMsg);
  }

  return data;
}

/**
 * Sends a document/PDF via WhatsApp Business Cloud API
 */
async function sendWhatsAppDocument(phone, documentUrl, filename, caption) {
  if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
    throw new Error("WhatsApp not configured: missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "document",
      document: {
        link: documentUrl,
        filename: filename || "Receipt.pdf",
        caption: caption || "",
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data?.error?.message || `WhatsApp API error (${response.status})`;
    throw new Error(errMsg);
  }

  return data;
}

/**
 * Logs WhatsApp message to audit table
 */
async function logWhatsAppMessage({ phone, action, message, status, error, customerId, customerName, transactionId, userId }) {
  if (!supabase) return;
  try {
    await supabase.from("whatsapp_message_log").insert({
      phone,
      action,
      message,
      status: status || "sent",
      error: error || null,
      customer_id: customerId || null,
      customer_name: customerName || null,
      transaction_id: transactionId || null,
      user_id: userId || null,
    });
  } catch (err) {
    console.error("Failed to log WhatsApp message:", err);
  }
}

// POST /api/whatsapp/send-welcome - Send welcome message to new customer
app.post("/api/whatsapp/send-welcome", async (req, res) => {
  try {
    const { customerName, phone, userId, customerId } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
      return res.status(503).json({ error: "WhatsApp not configured on server" });
    }

    // Fetch business name from user's profile
    let businessName = "Our Business";
    if (supabase && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.business_name) {
        businessName = profile.business_name;
      }
    }

    const message = `👋 Welcome, ${customerName || "Valued Customer"}!\n\nThank you for choosing ${businessName}. 🎉\n\nWe'll send your transaction receipts directly here on WhatsApp for your convenience.\n\nFor any queries, feel free to reach out!\n— ${businessName}`;

    await sendWhatsAppMessage(phone, message);

    await logWhatsAppMessage({
      phone,
      action: "welcome",
      message,
      status: "sent",
      customerId,
      customerName,
      userId,
    });

    return res.status(200).json({ success: true, message: "Welcome message sent" });
  } catch (error) {
    console.error("WhatsApp welcome error:", error);

    await logWhatsAppMessage({
      phone: req.body.phone,
      action: "welcome",
      message: null,
      status: "failed",
      error: error.message,
      customerId: req.body.customerId,
      customerName: req.body.customerName,
      userId: req.body.userId,
    });

    return res.status(500).json({ error: error.message || "Failed to send welcome message" });
  }
});

// POST /api/whatsapp/send-receipt - Send transaction receipt to customer
app.post("/api/whatsapp/send-receipt", async (req, res) => {
  try {
    const { customerName, phone, userId, customerId, transactionId, transaction } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    if (!transaction) {
      return res.status(400).json({ error: "Transaction details are required" });
    }

    if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
      return res.status(503).json({ error: "WhatsApp not configured on server" });
    }

    // Fetch business name
    let businessName = "Our Business";
    if (supabase && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.business_name) {
        businessName = profile.business_name;
      }
    }

    const amount = Number(transaction.amount || 0).toLocaleString("en-IN");
    const commission = Number(transaction.commission || 0).toLocaleString("en-IN");
    const txDate = transaction.transactionDate
      ? new Date(transaction.transactionDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    const message = `📄 *Transaction Receipt*\n\n*Customer:* ${customerName || "N/A"}\n*Date:* ${txDate}\n*Portal:* ${transaction.portalName || "N/A"}\n*Type:* ${transaction.transactionType || "N/A"}\n*Amount:* ₹${amount}\n*Commission:* ₹${commission}\n${transaction.cardType ? `*Card Type:* ${transaction.cardType}\n` : ""}\nThank you for your business! 🙏\n— *${businessName}*`;

    if (req.body.pdfUrl) {
      await sendWhatsAppDocument(phone, req.body.pdfUrl, req.body.pdfFilename || `Receipt_${customerName || "Customer"}.pdf`, message);
    } else {
      await sendWhatsAppMessage(phone, message);
    }

    await logWhatsAppMessage({
      phone,
      action: "receipt",
      message,
      status: "sent",
      customerId,
      customerName,
      transactionId,
      userId,
    });

    return res.status(200).json({ success: true, message: "Receipt sent" });
  } catch (error) {
    console.error("WhatsApp receipt error:", error);

    await logWhatsAppMessage({
      phone: req.body.phone,
      action: "receipt",
      message: null,
      status: "failed",
      error: error.message,
      customerId: req.body.customerId,
      customerName: req.body.customerName,
      transactionId: req.body.transactionId,
      userId: req.body.userId,
    });

    return res.status(500).json({ error: error.message || "Failed to send receipt" });
  }
});

// POST /api/whatsapp/status - Check if WhatsApp is configured
app.post("/api/whatsapp/status", async (req, res) => {
  const configured = Boolean(WA_PHONE_NUMBER_ID && WA_ACCESS_TOKEN);
  return res.status(200).json({
    configured,
    phoneNumberId: configured ? WA_PHONE_NUMBER_ID.slice(0, 4) + "***" : null,
    apiVersion: WA_API_VERSION,
  });
});

// POST /api/whatsapp/send-test - Send test verification ping
app.post("/api/whatsapp/send-test", async (req, res) => {
  try {
    const { phone, userId } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
      return res.status(503).json({ error: "WhatsApp not configured on server. Please add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN." });
    }

    let businessName = "Payment Tracker";
    if (supabase && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.business_name) {
        businessName = profile.business_name;
      }
    }

    const testMsg = `✅ *WhatsApp Connection Verified*\n\nYour WhatsApp Business integration with *${businessName}* is active and connected!\n\nAll customer welcome messages and transaction receipts will be delivered automatically to your clients. 🎉\n\n— *${businessName}*`;
    await sendWhatsAppMessage(phone, testMsg);

    await logWhatsAppMessage({
      phone,
      action: "test",
      message: testMsg,
      status: "sent",
      userId,
    });

    return res.status(200).json({ success: true, message: "Test message sent successfully" });
  } catch (error) {
    console.error("WhatsApp test error:", error);
    await logWhatsAppMessage({
      phone: req.body.phone,
      action: "test",
      message: null,
      status: "failed",
      error: error.message,
      userId: req.body.userId,
    });
    return res.status(500).json({ error: error.message || "Failed to send test message" });
  }
});

// POST /api/whatsapp/logs - Get recent message logs
app.post("/api/whatsapp/logs", async (req, res) => {
  try {
    const { userId, limit = 50 } = req.body;
    if (!supabase) {
      return res.status(200).json({ logs: [] });
    }

    let query = supabase
      .from("whatsapp_message_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(200).json({ logs: [], warning: error.message });
    }

    return res.status(200).json({ logs: data || [] });
  } catch (err) {
    return res.status(200).json({ logs: [] });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Payment Tracker Backend running on port ${PORT}`);
});
