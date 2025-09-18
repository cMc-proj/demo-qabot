const API_BASE_URL = "/api/chat";

// Industry → title mapping
const INDUSTRIES = {
  restaurant: "Restaurant Assistant",
  retail: "Retail Assistant",
  ecommerce: "E-commerce Assistant",
  medical: "Medical Assistant",
};

window.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const chatPanel = document.getElementById("chat-panel");
  const chatTitle = chatPanel.querySelector(".title");
  const messagesContainer = document.getElementById("messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const closeBtn = document.getElementById("chat-close");

  let activeIndustry = null;

  // Store chat history per industry
  const chatHistories = Object.fromEntries(
    Object.keys(INDUSTRIES).map((id) => [id, []])
  );

  // --- Render history for an industry ---
  function renderHistory(industry) {
    messagesContainer.innerHTML = "";
    chatHistories[industry].forEach(({ text, type }) => {
      appendMessage(text, type, false);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // --- Append message ---
  function appendMessage(text, type, save = true) {
    const div = document.createElement("div");
    div.classList.add("cmc-msg", type);
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (save && activeIndustry) {
      chatHistories[activeIndustry].push({ text, type });
    }
  }

  // --- Send message ---
  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !activeIndustry) return;

    appendMessage(text, "user");
    userInput.value = "";

    // Loading indicator
    const loading = document.createElement("div");
    loading.classList.add("cmc-msg", "bot");
    loading.textContent = `${INDUSTRIES[activeIndustry]} is typing…`;
    messagesContainer.appendChild(loading);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const res = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, tenantId: activeIndustry }),
      });
      const data = await res.json();
      messagesContainer.removeChild(loading);

      if (data.error) {
        appendMessage(`⚠️ ${data.error}`, "bot");
      } else {
        appendMessage(
          data.reply || data.answer || data.message || "⚠️ Unexpected response",
          "bot"
        );
      }
    } catch (err) {
      messagesContainer.removeChild(loading);
      appendMessage("⚠️ Could not reach server.", "bot");
      console.error("Chat error:", err);
    }
  }

  // --- Industry bubble clicks ---
  Object.keys(INDUSTRIES).forEach((industry) => {
    const bubble = document.getElementById(industry);
    if (!bubble) return;
    bubble.addEventListener("click", () => {
      activeIndustry = industry;
      chatTitle.textContent = INDUSTRIES[industry];
      chatPanel.classList.add("active");
      renderHistory(industry);
      userInput.focus();
    });
  });

  // --- Close button ---
  closeBtn.addEventListener("click", () => {
    chatPanel.classList.remove("active");
    activeIndustry = null;
  });

  // --- Input events ---
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});
