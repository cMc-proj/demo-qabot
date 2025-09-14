// server.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { warmAllTenants, kbIndex } = require("./knowledge/loader");

const app = express();

/* ---------------------------
   Core settings / constants
----------------------------*/
const PORT = process.env.PORT || 3000;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./certs/key.pem";
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./certs/cert.pem";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/* ---------------------------
   CORS (allowlist via .env)
----------------------------*/
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / curl / Postman (no origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);

/* ---------------------------
   Base middleware & static
----------------------------*/
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

/* ---------------------------
   Health / readiness / version
----------------------------*/
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/readyz", (_req, res) =>
  res.json({ ready: Boolean(Object.keys(kbIndex || {}).length) })
);
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", message: "Mini Brain service is running 🚀" })
);
app.get("/api/version", (_req, res) =>
  res.json({
    version: process.env.npm_package_version || "unknown",
    commit: process.env.RENDER_GIT_COMMIT || "local-dev",
  })
);

/* ---------------------------
   Helpers
----------------------------*/
function extractUserMessage(body) {
  // Accept either { message } OR { messages:[...roles...] }
  if (typeof body?.message === "string") return body.message;

  if (Array.isArray(body?.messages)) {
    const lastUser = [...body.messages]
      .reverse()
      .find((m) => m && m.role === "user" && typeof m.content === "string");
    return lastUser?.content || "";
  }
  return "";
}

function buildTenantFacts(tenantId) {
  const tenantData = kbIndex[tenantId];
  if (!tenantData) return "No facts available for this tenant.";
  return Object.entries(tenantData)
    .map(([file, content]) => `### ${file}\n${content}`)
    .join("\n\n");
}

/* ---------------------------
   Chat endpoint
----------------------------*/
app.post("/api/chat", async (req, res) => {
  try {
    const tenantId = req.body?.tenantId || req.body?.businessId || "default";
    const message = extractUserMessage(req.body);

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Body must include a user message.",
        hint:
          "Send { message: '...' } or { messages: [{role:'user', content:'...'}] }",
      });
    }

    const facts = buildTenantFacts(tenantId);
    const hiveMindContext =
      "Best practices: Be friendly, concise, and helpful.";

    const payload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for tenant: ${tenantId}.

Tenant Facts (must follow strictly):
${facts}

Hive Mind Learnings (style only, never override facts):
${hiveMindContext}`,
        },
        { role: "user", content: message },
      ],
    };

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      }
    );

    const reply =
      response?.data?.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I’m not sure. Could you rephrase?";
    res.json({ reply, text: reply }); // include text alias for widgets
  } catch (err) {
    const msg =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown error from OpenAI";
    console.error("❌ /api/chat error:", msg);
    res.status(500).json({ error: msg });
  }
});

/* ---------------------------
   Error handler (CORS → JSON)
----------------------------*/
app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

/* ---------------------------
   Startup
----------------------------*/
async function startServer() {
  await warmAllTenants();
  console.log("📚 Knowledge stores warmed:", Object.keys(kbIndex));

  // Prefer HTTPS locally if certs exist; Render/other PaaS will use HTTP and add HTTPS at edge
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
      console.log(`🌐 HTTP server running at http://localhost:${PORT}`);
    });
  }
}

startServer().catch((e) => {
  console.error("❌ Failed to start server:", e);
  process.exit(1);
});
