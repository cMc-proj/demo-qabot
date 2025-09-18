const API_BASE_URL = "/api/chat";

// Industry → Display Titles
const INDUSTRIES = {
  restaurant: "Restaurant Assistant",
  retail: "Retail Assistant",
  ecommerce: "E-commerce Assistant",
  medical: "Medical Assistant",
};

window.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("chat-panel");
  const title = panel.querySelector(".title");
  const messagesContainer = document.getElementById("chat-messages");
  const userInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const closeBtn = document.getElementById("chat-close");

  let activeIndustry = null;
  const chatHistories = Object.fromEntries(
    Object.keys(INDUSTRIES).map((k) => [k, []])
  );

  // --- Render history ---
  function renderHistory(industry) {
    messagesContainer.innerHTML = "";
    chatHistories[industry].forEach(({ text, type }) => {
      appendMessage(text, type, false);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // --- Append new message ---
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

    // Loading bubble
    const loading = document.createElement("div");
    loading.classList.add("cmc-msg", "bot");
    loading.textContent = `${INDUSTRIES[activeIndustry]} is typing…`;
    messagesContainer.appendChild(loading);

    try {
      const res = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, tenantId: activeIndustry }),
      });
      const data = await res.json();
      messagesContainer.removeChild(loading);

      appendMessage(
        data.reply || data.answer || data.message || "⚠️ Unexpected response",
        "bot"
      );
    } catch (err) {
      messagesContainer.removeChild(loading);
      appendMessage("⚠️ Could not reach server.", "bot");
      console.error("Chat error:", err);
    }
  }

  // --- Open chat ---
  function openChat(industry) {
    activeIndustry = industry;
    title.textContent = INDUSTRIES[industry];
    panel.classList.add("active");
    renderHistory(industry);
    userInput.focus();
  }

  // --- Close chat ---
  function closeChat() {
    panel.classList.remove("active");
    activeIndustry = null;
  }

  // --- Wire up industry bubbles ---
  document.querySelectorAll(".cmc-bubble[data-industry]").forEach((bubble) => {
    bubble.addEventListener("click", () => {
      const industry = bubble.dataset.industry;
      openChat(industry);
    });
  });

  // --- Wire up close button ---
  closeBtn.addEventListener("click", closeChat);

  // --- Wire up send ---
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});
