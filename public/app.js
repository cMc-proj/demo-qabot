// UI wiring for Demo AI Assistant (frontend-only; plugs into /api/ask)
(function () {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#ask-form");
  const input = $("#query");
  const submit = $("#submit");
  const verboseToggle = $("#verbose");
  const modeSelect = $("#mode");
  const botSelect = $("#bot");

  const alertBox = $("#alert");
  const results = $("#results");
  const empty = $("#empty");
  const loading = $("#loading");
  const answerEl = $("#answer");
  const verbosePanel = $("#verbose-panel");
  const stepsEl = $("#steps");
  const metaEl = $("#meta");

  // Keep bot in sync with mode by default (editable later if you diverge bots)
  modeSelect.addEventListener("change", () => {
    if (!botSelect.dataset.userEdited) {
      botSelect.value = modeSelect.value;
    }
  });
  botSelect.addEventListener("change", () => {
    botSelect.dataset.userEdited = "true";
  });

  // Footer year
  $("#year").textContent = new Date().getFullYear();

  // Disable submit when empty, enable when text exists
  const syncSubmitState = () => {
    const hasText = input.value.trim().length > 0;
    submit.disabled = !hasText;
  };
  input.addEventListener("input", syncSubmitState);
  syncSubmitState();

  // Helpers
  function setAlert(msg) {
    if (!msg) {
      alertBox.classList.add("hidden");
      alertBox.textContent = "";
    } else {
      alertBox.textContent = msg;
      alertBox.classList.remove("hidden");
    }
  }

  function setLoading(isLoading) {
    results.setAttribute("aria-busy", String(isLoading));
    loading.classList.toggle("hidden", !isLoading);
  }

  function clearResults() {
    answerEl.textContent = "";
    stepsEl.innerHTML = "";
    metaEl.textContent = "";
    answerEl.classList.add("hidden");
    verbosePanel.classList.add("hidden");
  }

// Submit handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAlert(null);

  const query = input.value.trim();
  if (!query) {
    setAlert("Please enter a question.");
    return;
  }

  // UI states
  empty.classList.add("hidden");
  clearResults();
  setLoading(true);
  submit.disabled = true;

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query,
        tenantId: "default" // or dynamic if you want to support multiple tenants
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || data.error) {
      throw new Error(data.error || `Request failed (${resp.status})`);
    }

    // Render meta (not provided by /api/chat, so simplified)
    metaEl.textContent = "Bot • live";

    // Render answer
    const answer = data.reply || "";
    answerEl.textContent = answer;
    answerEl.classList.toggle("hidden", !answer);

    // Verbose steps (not returned by /api/chat, so we just hide)
    verbosePanel.classList.add("hidden");
    verbosePanel.open = false;

  } catch (err) {
    setAlert(err.message || "Something went wrong. Please try again.");
    empty.classList.add("hidden");
  } finally {
    setLoading(false);
    syncSubmitState(); // re-enable if input still has text
  }
});


  // Basic HTML escaper for list items
  function escapeHtml(str){
    return str
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }
})();
