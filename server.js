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

// --- Port Handling ---
const PORT = process.env.PORT || 3000;

// SSL paths (local dev only)
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./certs/key.pem";
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./certs/cert.pem";

const axios = require("axios");

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, tenantId = "default" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Example: call OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini", // or gpt-4o, depending on your plan
        messages: [
          { role: "system", content: `You are a helpful AI assistant for tenant: ${tenantId}` },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get response from AI" });
  }
});


// --- Server Startup ---
async function startServer() {
  await warmAllTenants();
  console.log("📚 Knowledge stores warmed:", Object.keys(kbIndex));

  if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    // Local HTTPS
    const creds = {
      key: fs.readFileSync(SSL_KEY_PATH, "utf8"),
      cert: fs.readFileSync(SSL_CERT_PATH, "utf8"),
    };
    https.createServer(creds, app).listen(PORT, () => {
      console.log(`🔒 HTTPS server running at https://localhost:${PORT}`);
    });
  } else {
    // Default HTTP (Render will use this)
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

