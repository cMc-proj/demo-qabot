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

    const options = { verbose: !!verboseToggle.checked };
    // Default to always sending a mode; mirror to bot as contract expects `bot`
    const mode = modeSelect.value || "general";
    const bot = botSelect.value || mode;

    try {
      const resp = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // You can add custom headers here if backend wants, e.g. "X-Mode": mode
        },
        body: JSON.stringify({
          query,
          options,       // { verbose: boolean }
          bot,           // contract field
          mode           // extra hint, harmless if backend ignores
        })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg = data && data.error ? data.error : `Request failed (${resp.status})`;
        throw new Error(msg);
      }
      if (data.error) {
        throw new Error(data.error);
      }

      // Render meta
      const elapsed = typeof data?.meta?.elapsed_ms === "number" ? `${data.meta.elapsed_ms} ms` : "";
      const metaBot = data?.meta?.bot || bot;
      metaEl.textContent = [metaBot, elapsed].filter(Boolean).join(" • ");

      // Render answer
      const answer = data?.answer || "";
      answerEl.textContent = answer;
      answerEl.classList.toggle("hidden", !answer);

      // Render verbose steps if present and requested
      const steps = Array.isArray(data?.verbose?.steps) ? data.verbose.steps : [];
      if (options.verbose && steps.length > 0) {
        stepsEl.innerHTML = steps.map(s => `<li>${escapeHtml(String(s))}</li>`).join("");
        verbosePanel.classList.remove("hidden");
        // Keep details open by default when verbose is on
        verbosePanel.open = true;
      } else {
        verbosePanel.classList.add("hidden");
        verbosePanel.open = false;
      }
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
