/**
 * Mini Brain Server — Express backend with local HTTPS support.
 * - Serves HTTP on PORT (default 3000)
 * - If certs exist, also serves HTTPS on HTTPS_PORT (default 3443)
 * - When HTTPS is enabled, HTTP auto-redirects to HTTPS
 *
 * Cert paths (override via env): SSL_KEY_PATH, SSL_CERT_PATH
 */
"use strict";

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { OpenAI } = require("openai");

/* =========================
   Ports & Certs
   ========================= */
const HTTP_PORT = Number(process.env.PORT || 3000);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const SSL_KEY_PATH =
  process.env.SSL_KEY_PATH || path.join(__dirname, "certs", "localhost.key");
const SSL_CERT_PATH =
  process.env.SSL_CERT_PATH || path.join(__dirname, "certs", "localhost.crt");

/* =========================
   OpenAI Config
   ========================= */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY in environment");
  process.exit(1);
}
const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4o-mini";
const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";
const MODERATION_MODEL = process.env.MODERATION_MODEL || "omni-moderation-latest";

const TEMP = Number(process.env.TEMP || 0.2);
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 200);
const MAX_INPUT_CHARS = Number(process.env.MAX_INPUT_CHARS || 1200);
const MAX_CONTEXT_CHARS = Number(process.env.MAX_CONTEXT_CHARS || 4000);
const K_CONTEXT = Number(process.env.K_CONTEXT || 6);

const DEFAULT_TENANT = (process.env.DEFAULT_BUSINESS_ID || "default").toLowerCase();
const KB_DIR = path.join(__dirname, "knowledge");

// CORS allowlist (comma-separated)
const ALLOWLIST = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const ENABLE_MODERATION = (process.env.ENABLE_MODERATION || "true").toLowerCase() !== "false";

/* =========================
   Express App
   ========================= */
const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (!ALLOWLIST.length || ALLOWLIST.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* =========================
   OpenAI Client
   ========================= */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* =========================
   In-memory KB & Retrieval
   ========================= */
const kbIndex = Object.create(null); // { [tenant]: { chunks: [{ id, text, source, embedding }] } }

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function splitIntoChunks(text, max = 900) {
  const paras = text.split(/\n\s*\n/g).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let buf = "";
  for (const p of paras) {
    const candidate = buf ? `${buf}\n\n${p}` : p;
    if (candidate.length > max && buf) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = candidate;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

async function embedTexts(texts) {
  if (!texts.length) return [];
  const { data } = await openai.embeddings.create({ model: EMBED_MODEL, input: texts });
  return data.map(d => d.embedding);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function loadKnowledge(tenant) {
  const dir = path.join(KB_DIR, tenant);
  const files = safeReaddir(dir).filter(d => d.isFile() && /\.(md|mdx|txt)$/i.test(d.name));
  const chunks = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f.name), "utf8");
    const parts = splitIntoChunks(raw, 900);
    for (let i = 0; i < parts.length; i++) {
      chunks.push({ id: `${f.name}#${i + 1}`, text: parts[i], source: f.name });
    }
  }
  if (!chunks.length) {
    kbIndex[tenant] = { chunks: [] };
    return;
  }
  const embeddings = await embedTexts(chunks.map(c => c.text));
  chunks.forEach((c, i) => (c.embedding = embeddings[i]));
  kbIndex[tenant] = { chunks };
}

async function warmAllTenants() {
  const tenants = safeReaddir(KB_DIR).filter(d => d.isDirectory()).map(d => d.name);
  if (!tenants.length) tenants.push(DEFAULT_TENANT);
  for (const t of tenants) {
    console.log(`⚙️  Loading KB for tenant: ${t}`);
    try {
      await loadKnowledge(t);
    } catch (err) {
      console.error("KB load error", t, err.message);
    }
  }
}

function topKContext(tenant, queryEmbedding, k = K_CONTEXT) {
  const store = kbIndex[tenant] || { chunks: [] };
  const scored = store.chunks
    .map(c => ({ ...c, score: cosine(c.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  let total = 0;
  const chosen = [];
  for (const s of scored) {
    if (total + s.text.length > MAX_CONTEXT_CHARS) break;
    chosen.push(s);
    total += s.text.length;
  }
  return chosen;
}

/* =========================
   Prompting helpers
   ========================= */
function tenantFrom({ businessId, context }) {
  return (businessId || context || DEFAULT_TENANT).toString().toLowerCase();
}
function verticalLabelFromContext(context) {
  return ({
    ShopSmart: "You are an AI shopping assistant for an e-commerce store.",
    TableNow: "You are an AI reservation and menu assistant for a restaurant.",
    CityStyle: "You are an AI assistant for a retail clothing store.",
  }[context] || null);
}
function systemPrompt(tenant, vertical) {
  return [
    `You are the embedded "mini brain" for business tenant: ${tenant}.`,
    `Answer ONLY using the provided Knowledge Base excerpts. If the KB does not contain the answer, say you don't have that info and suggest a next best step.`,
    vertical ? `Vertical: ${vertical}.` : null,
    `Tone: professional, warm, succinct. Default to 1–2 short sentences.`,
    `Never invent facts, prices, hours, names, or links.`,
  ].filter(Boolean).join("\n");
}

/* =========================
   Routes
   ========================= */
app.get("/healthz", (req, res) => res.json({ ok: true }));
app.get("/readyz", (req, res) => res.json({ ready: !!kbIndex[DEFAULT_TENANT] }));

app.post("/api/chat", async (req, res, next) => {
  try {
    const { message = "", context = null, businessId = null, history = [] } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ reply: "Please provide a message." });
    }
    if (message.length > MAX_INPUT_CHARS) {
      return res.status(413).json({ reply: `Please shorten to under ${MAX_INPUT_CHARS} characters.` });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ reply: "`history` must be an array of messages." });
    }

    const tenant = tenantFrom({ businessId, context });
    if (!kbIndex[tenant]) await loadKnowledge(tenant);

    if (ENABLE_MODERATION) {
      try {
        const mod = await openai.moderations.create({ model: MODERATION_MODEL, input: message });
        if (mod?.results?.[0]?.flagged) {
          return res.status(200).json({ reply: "I can’t help with that, but I’m happy to answer questions about the business." });
        }
      } catch (e) {
        console.warn("⚠️ Moderation check failed:", e.message);
      }
    }

    const [{ embedding: queryEmbedding }] = await openai.embeddings
      .create({ model: EMBED_MODEL, input: [message] })
      .then(r => r.data);

    const top = topKContext(tenant, queryEmbedding, K_CONTEXT);
    const kbText = top.length
      ? top.map((c, i) => `#${i + 1} (${c.source})\n${c.text}`).join("\n\n---\n\n")
      : "No matching excerpts found.";

    const vertical = verticalLabelFromContext(context);
    const messages = [
      { role: "system", content: systemPrompt(tenant, vertical) },
      { role: "system", content: `Knowledge Base Excerpts (use only if relevant):\n\n${kbText}` },
      ...history
        .filter(m => m && typeof m.role === "string" && typeof m.content === "string")
        .slice(-6),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: TEMP,
      max_tokens: MAX_TOKENS,
      messages,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I’m not sure yet. Could you rephrase or share a bit more?";

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => res.status(404).json({ error: "Not Found" }));
app.use((err, req, res, _next) => {
  console.error("🔥 Server error:", err.stack || err.message || err);
  const status = Number(err.status || 500);
  const msg = status >= 500 ? "⚠️ Something went wrong on our side. Please try again." : String(err.message || "Bad Request");
  res.status(status).json({ error: msg });
});

/* =========================
   Start servers (HTTP + optional HTTPS)
   ========================= */
function fileExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

let httpsServer = null;
if (fileExists(SSL_KEY_PATH) && fileExists(SSL_CERT_PATH)) {
  const creds = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH),
  };
  httpsServer = https.createServer(creds, app);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS server running at https://localhost:${HTTPS_PORT}`);
  });
} else {
  console.log("🔓 HTTPS not enabled (certs not found).");
  console.log(`   To enable: set SSL_KEY_PATH & SSL_CERT_PATH or place certs at:
   - ${SSL_KEY_PATH}
   - ${SSL_CERT_PATH}`);
}

const httpServer = http.createServer((req, res) => {
  // If HTTPS is available, redirect HTTP → HTTPS
  if (httpsServer) {
    const host = (req.headers.host || "localhost").split(":")[0];
    const location = `https://${host}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: location });
    return res.end();
  }
  // Otherwise, serve HTTP directly
  return app(req, res);
});

httpServer.listen(HTTP_PORT, async () => {
  console.log(`🌐 HTTP server running at http://localhost:${HTTP_PORT}`);
  await warmAllTenants();
  console.log("📚 Knowledge stores warmed:", Object.keys(kbIndex));
});
