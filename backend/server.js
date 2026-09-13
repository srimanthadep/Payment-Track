require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
  })
);

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

    const { email, password, full_name, business_name, make_admin, username } = req.body;

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

    // 2. Upsert profile with role
    const roleToAssign = make_admin ? "admin" : "user";
    await supabase.from("profiles").upsert({
      id: newUserId,
      email: userEmail,
      full_name: displayName,
      business_name: business_name || "My Business",
      role: roleToAssign,
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Payment Tracker Backend running on port ${PORT}`);
});
