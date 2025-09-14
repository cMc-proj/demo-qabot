import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS (match Owen's frontend origin)
const FE = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: FE, credentials: true }));

// Optional TLS relax for local dev only
if (process.env.RELAX_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// ----------------------------------------------------
// Helpers / utils (inline for now; refactor later)
// ----------------------------------------------------
const VALID_MODES = new Set(["general", "retail", "medical", "ecommerce", "restaurant"]);

function validateBody(body) {
  const errors = [];
  if (!body || typeof body !== "object") errors.push("Missing JSON body.");
  const query = body?.query;
  const mode = body?.mode;
  const verbose = !!body?.verbose;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    errors.push("Query must be a non-empty string.");
  }
  if (!mode || !VALID_MODES.has(mode)) {
    errors.push("Error, invalid mode selected.");
  }
  return { valid: errors.length === 0, errors, query, mode, verbose };
}

function normalizeOk({ answer, mode, confidence = 0.7, uncertainty = false, follow_up = [], citations = [] }) {
  return { answer, mode, confidence, uncertainty, follow_up, citations, error: null };
}

function normalizeErr(code, message, mode = "general") {
  return {
    answer: "",
    mode,
    confidence: 0.0,
    uncertainty: true,
    follow_up: [],
    citations: [],
    error: { code, message }
  };
}

// Very simple confidence heuristic (placeholder)
function scoreConfidence(text) {
  if (!text) return 0.0;
  let score = 0.7;
  if (/\b(maybe|unsure|not sure|possibly|uncertain)\b/i.test(text)) score -= 0.3;
  if (/\d/.test(text)) score += 0.1; // numbers imply specificity
  return Math.max(0, Math.min(1, score));
}

// Apply uncertainty thresholding
function applyUncertainty(answer, confidence) {
  const threshold = 0.4;
  if (confidence >= threshold) {
    return { answer, uncertainty: false, follow_up: [] };
  }
  const safe = `I'm not fully confident in this answer yet. Here's my best take: ${answer}`;
  const follow_up = [
    "Could you clarify exactly what you need?",
    "Do you want a step-by-step or a quick summary?",
    "Should I include sources or examples?"
  ];
  return { answer: safe, uncertainty: true, follow_up };
}

// ----------------------------------------------------
// Per-mode responders (stubs; replace with real logic)
// ----------------------------------------------------
async function respondGeneral(query) {
  return `General mode: You asked — "${query}"`;
}

async function respondRetail(query) {
  if (/return policy/i.test(query)) return "Retail: Returns within 30 days with receipt.";
  if (/price match/i.test(query)) return "Retail: We price match major retailers with proof.";
  if (/inventory|in stock|sku/i.test(query)) return "Retail: I can check inventory per store or SKU.";
  return "Retail: I can help with inventory checks, pricing, returns, and price matching.";
}

async function respondMedical(query) {
  // General info only; not medical advice
  if (/emergency|chest pain|stroke|severe/i.test(query)) {
    return "Medical: If this could be an emergency, call emergency services. For non-urgent questions, share symptoms, onset, duration, and history. (General info only, not medical advice.)";
  }
  if (/dosage|dose|mg|frequency/i.test(query)) {
    return "Medical: I can provide general info, but always follow your clinician/pharmacist. What medication and dose are you asking about?";
  }
  return "Medical: I can provide general info (not medical advice). What symptoms, onset, duration, and history should I consider?";
}

async function respondEcommerce(query) {
  if (/shipping|delivery/i.test(query)) return "E-commerce: Standard 3–5 business days; expedited options available at checkout.";
  if (/promo|coupon|discount/i.test(query)) return "E-commerce: One promo per order; some items excluded. Enter code at checkout.";
  if (/order status|tracking|where.*order/i.test(query)) return "E-commerce: Enter your order number to get real-time tracking.";
  return "E-commerce: I can help with cart, checkout, shipping estimates, promos, and order status.";
}

async function respondRestaurant(query) {
  if (/hours|open|close/i.test(query)) return "Restaurant: Open Mon–Sat 11am–10pm, Sun 12–8pm.";
  if (/reservation|book|table/i.test(query)) return "Restaurant: Reservations online for up to 8; call for larger parties.";
  if (/menu|gluten|vegan|allergen|nut/i.test(query)) return "Restaurant: Menu includes gluten-free and vegan options; ask about allergens before ordering.";
  return "Restaurant: I can help with hours, reservations, menu highlights, and dietary options.";
}

// ----------------------------------------------------
// Routes
// ----------------------------------------------------
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/api/ask", async (req, res) => {
  const { valid, errors, query, mode, verbose } = validateBody(req.body);
  if (!valid) {
    return res.status(400).json(
      normalizeErr("INVALID_REQUEST", errors[0], req.body?.mode ?? "general")
    );
  }

  try {
    let rawAnswer = "";
    switch (mode) {
      case "general":    rawAnswer = await respondGeneral(query); break;
      case "retail":     rawAnswer = await respondRetail(query); break;
      case "medical":    rawAnswer = await respondMedical(query); break;
      case "ecommerce":  rawAnswer = await respondEcommerce(query); break;
      case "restaurant": rawAnswer = await respondRestaurant(query); break;
      default:
        return res.status(400).json(
          normalizeErr("INVALID_MODE", "Error, invalid mode selected.", mode)
        );
    }

    const confidence = scoreConfidence(rawAnswer);
    const { answer, uncertainty, follow_up } = applyUncertainty(rawAnswer, confidence);

    if (verbose) {
      console.log("[VERBOSE]", { query, mode, rawAnswer, confidence });
    }

    return res.json(
      normalizeOk({ answer, mode, confidence, uncertainty, follow_up, citations: [] })
    );
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json(normalizeErr("SERVER_ERROR", "Something went wrong. Please try again.", "general"));
  }
});

// ----------------------------------------------------
// Start server
// ----------------------------------------------------
const port = Number(process.env.PORT ?? 5050);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`CORS allowed origin: ${FE}`);
});
