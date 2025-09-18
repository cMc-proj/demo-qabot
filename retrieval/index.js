// retrieval/index.js
// Centralized retrieval — keyword search now; embeddings can be added later without touching routes.

const fs = require("fs");
const path = require("path");

// ------- Load docs -------
function loadTenantDocs(tenant) {
  const dir = path.join(__dirname, "..", "knowledge", tenant);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => !f.startsWith("."))
    .map((f) => {
      const full = path.join(dir, f);
      if (!fs.statSync(full).isFile()) return null;
      const text = fs.readFileSync(full, "utf8");
      return { id: `${tenant}/${f}`, text };
    })
    .filter(Boolean);
}

function loadGlobalDocs() {
  const globalTenant = process.env.HIVE_MIND_GLOBAL_TENANT || "default";
  return loadTenantDocs(globalTenant);
}

// ------- Keyword ranker -------
function rankByKeyword(docs, query) {
  const terms = String(query).toLowerCase().split(/\W+/).filter(Boolean);
  return docs
    .map(d => {
      const t = d.text.toLowerCase();
      let score = 0;
      for (const w of terms) if (t.includes(w)) score += 1;
      return { ...d, score };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ------- Public API -------
async function getRelevantContext(tenant, query, { topN = 3 } = {}) {
  const tenantDocs = loadTenantDocs(tenant);
  const kwTenant = rankByKeyword(tenantDocs, query);

  let ranked = kwTenant;

  // Hive-mind fallback if few tenant hits and hive enabled (default true)
  if (ranked.length < Math.ceil(topN / 2) && process.env.ENABLE_HIVE_MIND !== "false") {
    const globalDocs = loadGlobalDocs();
    const kwGlobal = rankByKeyword(globalDocs, query).map(d => ({ ...d, id: `[global] ${d.id}` }));
    ranked = [...kwTenant, ...kwGlobal];
  }

  const picks = ranked.slice(0, topN);
  const context = picks.map(p => p.text.slice(0, 900)).join("\n\n"); // keep prompt tight
  const sources = picks.map(p => p.id);

  return { context, sources };
}

module.exports = { getRelevantContext, loadTenantDocs };

