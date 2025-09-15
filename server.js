require("dotenv").config();
const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");

const { warmAllTenants, kbIndex } = require("./knowledge/loader");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Example API route (adjust to your needs)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Mini Brain service is running 🚀" });
});

// Version check endpoint (shows commit + app version)
app.get("/api/version", (req, res) => {
  res.json({
    version: process.env.npm_package_version || "unknown",
    commit: process.env.RENDER_GIT_COMMIT || "local-dev"
  });
});

// --- Port Handling ---
const PORT = process.env.PORT || 3000;

// SSL paths (local dev only)
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./certs/key.pem";
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./certs/cert.pem";

const axios = require("axios");

// Shared handler for chat/ask endpoints
async function handleAsk(req, res) {
  try {
    const { message, tenantId = "default", mode = "default" } = req.body;

    // Debug logs
    console.log("🔎 Incoming chat request:", { tenantId, mode, message });
    console.log("🔑 API Key (truncated):", process.env.OPENAI_API_KEY?.slice(0, 8));

    if (!message) {
      console.warn("⚠️ No message provided");
      return res.status(400).json({ error: "Message is required" });
    }

    // --- Tenant facts from loader.js ---
    const tenantData = kbIndex[tenantId];
    const facts = tenantData
      ? Object.entries(tenantData)
          .map(([file, content]) => `### ${file}\n${content}`)
          .join("\n\n")
      : "No facts available for this tenant.";

    console.log(`📚 Injected facts for tenant '${tenantId}':`, facts.length);

    // --- Hive mind placeholder (style guidance only) ---
    const hiveMindContext = "Best practices: Be friendly, concise, and helpful.";

    // --- Call OpenAI ---
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant for tenant: ${tenantId}.
Mode: ${mode}

Tenant Facts (must follow strictly):
${facts}

Hive Mind Learnings (style only, never override facts):
${hiveMindContext}

STYLE RULES (must always follow):
- Keep answers short and conversational.
- Maximum 2 sentences.
- Never use lists, bullet points, or formatting.
- If unsure, say so briefly.`
          },
          { role: "user", content: message }
        ],
        max_tokens: 80,
        temperature: 0.6
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // --- Extract + enforce final safety ---
    let reply = response.data.choices[0].message.content.trim();
    // Hard trim to 2 sentences max
    reply = reply.split(/(?<=\.)\s+/).slice(0, 2).join(" ");

    console.log("✅ Final reply sent to client:", reply);
    res.json({ reply });

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error("❌ Chat API error:", err.response?.data || err.message);

    res.status(500).json({ error: `Debug: ${errorMsg}` });
  }
}


// Chat endpoints
app.post("/api/chat", handleAsk);
app.post("/api/ask", handleAsk);

const path = require("path");

// Explicit root route → always serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Catch-all for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next(); // leave API routes alone
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Server Startup ---
async function startServer() {
  await warmAllTenants();
  console.log("📚 Knowledge stores warmed:", Object.keys(kbIndex));

  if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    const creds = {
      key: fs.readFileSync(SSL_KEY_PATH, "utf8"),
      cert: fs.readFileSync(SSL_CERT_PATH, "utf8"),
    };
    https.createServer(creds, app).listen(PORT, () => {
      console.log(`🔒 HTTPS server running at https://localhost:${PORT}`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
