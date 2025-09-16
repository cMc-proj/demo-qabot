require("dotenv").config();
const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const { warmAllTenants, kbIndex } = require("./knowledge/loader");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Enforce JSON for API writes
app.use((req, res, next) => {
  if (req.path.startsWith("/api") && ["POST", "PUT", "PATCH"].includes(req.method)) {
    if (!req.is("application/json")) {
      return res
        .status(415)
        .type("application/json")
        .send({ error: "UNSUPPORTED_MEDIA_TYPE", message: "Use Content-Type: application/json" });
    }
  }
  next();
});

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Mini Brain service is running 🚀" });
});

// Config
const pkg = require("./package.json");
app.get("/api/config", (req, res) => {
  const cfg = {
    service: "mini-brain",
    version: pkg.version,
    provider: process.env.OPENAI_PROVIDER || "openai",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    requestTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 10000),
    frontendOrigin:
      process.env.FRONTEND_ORIGIN || process.env.ALLOWED_ORIGINS || "",
    knowledgeDir: process.env.KNOWLEDGE_DIR || null,
    hiveMind: String(process.env.ENABLE_HIVE_MIND).toLowerCase() === "true",
    tenant: process.env.HIVE_MIND_GLOBAL_TENANT || "global",
  };
  res.type("application/json").status(200).send(cfg);
});

// Version check
app.get("/api/version", (req, res) => {
  res.json({
    version: process.env.npm_package_version || "unknown",
    commit: process.env.RENDER_GIT_COMMIT || "local-dev",
  });
});

// --- Config constants ---
const DEFAULT_TENANT = (process.env.HIVE_MIND_GLOBAL_TENANT || "global").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 10000);

// --- DEV fallback: direct knowledge reader ---
function readKnowledgeForTenant(tenant) {
  const dir = path.join(__dirname, "knowledge", tenant);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const obj = {};
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      const content = fs.readFileSync(p, "utf8");
      obj[f] = content;
    } catch (e) {
      console.error("Failed to read", p, e);
    }
  }
  return obj;
}


// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    let { message, tenantId, tenant, mode } = req.body || {};
    const effectiveTenant =
      (tenantId || tenant || DEFAULT_TENANT || "default").toLowerCase();

    console.log("🔎 Incoming chat:", {
      tenantId: effectiveTenant,
      mode,
      hasMessage: !!message,
    });

    if (!message || typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ error: "BAD_REQUEST", message: "Message is required" });
    }

    // Tenant facts
    let tenantData = kbIndex[effectiveTenant] || kbIndex[DEFAULT_TENANT] || null;

// Fallback: direct file read if kbIndex is empty
if (!tenantData || Object.keys(tenantData).length === 0) {
  tenantData =
    readKnowledgeForTenant(effectiveTenant) ||
    readKnowledgeForTenant(DEFAULT_TENANT);
}

    const facts = tenantData
      ? Object.entries(tenantData)
          .map(([file, content]) => `### ${file}\n${content}`)
          .join("\n\n")
      : "No facts available for this tenant.";

    console.log(
      `📚 Facts for '${effectiveTenant}': ${tenantData ? "yes" : "no"} (bytes=${facts.length})`
    );

    const hiveMindContext =
      "Best practices: Be friendly, concise, and helpful.";

    // Call OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant for tenant: ${effectiveTenant}.
            
Tenant Facts (authoritative when relevant):
${facts}

Hive Mind Learnings (style only; do not override facts):
${hiveMindContext}`,
          },
          { role: "user", content: message.trim() },
        ],
        max_tokens: 80,
        temperature: 0.6
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: OPENAI_TIMEOUT_MS,
      }
    );

    const reply = response.data.choices?.[0]?.message?.content ?? "";
    console.log("✅ OpenAI reply (len):", reply.length);
    return res.status(200).json({ reply });
  } catch (err) {
    const status =
      err.code === "ECONNABORTED"
        ? 504
        : err.response?.status || 500;
    const msg =
      err.code === "ECONNABORTED"
        ? "Upstream LLM timeout"
        : err.response?.data?.error?.message ||
          err.message ||
          "Unknown error";

    console.error(
      "❌ Chat API error:",
      err.response?.data || err.stack || err.message
    );
    return res
      .status(status)
      .type("application/json")
      .send({
        error: status === 504 ? "REQUEST_TIMEOUT" : "UPSTREAM_ERROR",
        message: msg,
      });
  }
});

// Fallback: serve index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// JSON error handler
app.use((err, req, res, next) => {
  console.error("❌ Uncaught error:", err);
  const status = err.status || 500;
  res
    .status(status)
    .type("application/json")
    .send({
      error: status === 415 ? "UNSUPPORTED_MEDIA_TYPE" : "INTERNAL_ERROR",
      message: err.message || "Internal error",
    });
});

// --- Startup ---
const PORT = process.env.PORT || 3000;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./certs/key.pem";
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./certs/cert.pem";

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
