require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
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

// Admin User Creation Endpoint
async function handleAdminCreateUser(req, res) {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: "Supabase service role credentials not configured on backend server",
      });
    }

    const { email, password, full_name, make_admin, username } = req.body;

    // Support both direct email and username
    let userEmail = email;
    if (!userEmail && username) {
      userEmail = `${username.toLowerCase().trim()}@paymenttrack.local`;
    }

    if (!userEmail || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    // 1. Create auth user via Supabase admin API
    const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: full_name || username },
    });

    if (createErr) {
      return res.status(400).json({ error: createErr.message });
    }

    const newUserId = createRes.user?.id;
    if (!newUserId) {
      return res.status(500).json({ error: "User creation failed: missing id" });
    }

    // 2. Assign role
    const roleToAssign = make_admin ? "admin" : "staff";
    await supabase
      .from("user_roles")
      .upsert({ user_id: newUserId, role: roleToAssign }, { onConflict: "user_id" });

    // 3. Upsert profile
    await supabase.from("profiles").upsert({
      id: newUserId,
      email: userEmail,
      full_name: full_name || username,
    });

    return res.status(200).json({
      success: true,
      id: newUserId,
      email: userEmail,
      role: roleToAssign,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

app.post("/api/admin-create-user", handleAdminCreateUser);
app.post("/functions/v1/admin-create-user", handleAdminCreateUser);

// Web Scraping & Automated Transaction Extraction Endpoint
async function handleScrapeWebsite(req, res) {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: "Supabase service role credentials not configured on backend server",
      });
    }

    const { configId } = req.body;
    if (!configId) {
      return res.status(400).json({ error: "configId is required" });
    }

    // Fetch config
    const { data: config, error: configError } = await supabase
      .from("scraping_configs")
      .select("*")
      .eq("id", configId)
      .single();

    if (configError || !config) {
      return res.status(404).json({ error: "Scraping configuration not found" });
    }

    if (!config.is_active) {
      return res.status(400).json({ error: "Scraping config is currently inactive" });
    }

    console.log(`Scraping URL: ${config.url}`);

    // Fetch webpage with custom headers and timeout
    const pageResponse = await axios.get(config.url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const html = pageResponse.data;
    const extractedData = {};
    const rules = config.extraction_rules || {};

    // Extract fields based on extraction rules
    for (const [key, pattern] of Object.entries(rules)) {
      try {
        if (!pattern || typeof pattern !== "string") continue;
        const regex = new RegExp(pattern, "g");
        const match = String(html).match(regex);
        if (match) {
          const fullMatch = match[0];
          const captureMatch = fullMatch.match(new RegExp(pattern));
          extractedData[key] =
            captureMatch && captureMatch[1] ? captureMatch[1].trim() : fullMatch.trim();
        }
      } catch (err) {
        console.warn(`Regex error for key ${key}:`, err.message);
      }
    }

    // Create transaction if portal_id and amount exist
    let transactionCreated = false;
    if (config.portal_id && extractedData.amount) {
      const amountStr = String(extractedData.amount).replace(/[₹,$,\s]/g, "");
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && amount > 0) {
        const { data: portal } = await supabase
          .from("portals")
          .select("default_commission_rate, default_site_fee")
          .eq("id", config.portal_id)
          .single();

        const commissionRate = portal?.default_commission_rate || 0;
        const siteFee = portal?.default_site_fee || 0;
        const commission = (amount * commissionRate) / 100;

        const { data: newTx, error: txError } = await supabase
          .from("transactions")
          .insert({
            user_id: config.user_id,
            portal_id: config.portal_id,
            amount: amount,
            commission: commission,
            site_fee: siteFee,
            transaction_type: (extractedData.type || "withdrawal").toLowerCase() === "repayment" ? "Repayment" : "Withdrawal",
            reference_number: extractedData.reference || `SCRAPED-${Date.now()}`,
            notes: `Auto-scraped from ${config.name} on ${new Date().toISOString()}`,
            status: "completed",
          })
          .select()
          .single();

        if (txError) {
          console.error("Failed to insert scraped transaction:", txError);
        } else {
          transactionCreated = true;
          console.log("Created transaction:", newTx.id);
        }
      }
    }

    // Update last_scraped_at
    await supabase
      .from("scraping_configs")
      .update({ last_scraped_at: new Date().toISOString() })
      .eq("id", configId);

    return res.status(200).json({
      success: true,
      data: extractedData,
      transactionCreated,
      message: transactionCreated
        ? "Website scraped and transaction logged successfully"
        : "Website scraped successfully",
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return res.status(500).json({
      error: error.message || "Failed to scrape website",
    });
  }
}

app.post("/api/scrape-website", handleScrapeWebsite);
app.post("/functions/v1/scrape-website", handleScrapeWebsite);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Payment Tracker Backend running on port ${PORT}`);
});
