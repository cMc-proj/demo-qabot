// knowledge/loader.js
const fs = require("fs");
const path = require("path");

const kbIndex = {}; // holds tenant knowledge stores

/**
 * Load a Markdown file and return its text.
 */
function loadMarkdown(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`⚠️ Could not load file: ${filePath}`, err.message);
    return "";
  }
}

/**
 * Load all .md files for a single tenant.
 */
async function loadTenant(tenantId, tenantPath) {
  const files = fs
    .readdirSync(tenantPath, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md"));

  const tenantKnowledge = {};

  for (const file of files) {
    const key = path.basename(file.name, ".md"); // e.g. "faqs.md" -> "faqs"
    const filePath = path.join(tenantPath, file.name);
    tenantKnowledge[key] = loadMarkdown(filePath);
  }

  kbIndex[tenantId] = tenantKnowledge;
  console.log(`✅ Loaded knowledge for tenant: ${tenantId}`);
}

/**
 * Warm all tenants by loading their knowledge into memory.
 */
async function warmAllTenants() {
  const knowledgeRoot = path.join(__dirname);

  // Each subfolder inside /knowledge is treated as a tenant
  const tenants = fs
    .readdirSync(knowledgeRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  if (tenants.length === 0) {
    console.warn("⚠️ No tenant directories found in /knowledge");
  }

  for (const tenantId of tenants) {
    const tenantPath = path.join(knowledgeRoot, tenantId);
    await loadTenant(tenantId, tenantPath);
  }
}

module.exports = {
  warmAllTenants,
  kbIndex,
};

