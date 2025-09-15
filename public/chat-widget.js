const API_BASE_URL = "/api/chat";

// Map of industry IDs → display titles
const INDUSTRIES = {
  restaurant: "Restaurant Assistant",
  retail: "Retail Assistant",
  ecommerce: "E-commerce Assistant",
  medical: "Medical Assistant",
};

window.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const placeholderBubble = document.getElementById("demo-placeholder-bubble");
  const chatWindow = document.querySelector(".industry-chat");
  const chatTitle = chatWindow.querySelector(".title");
  const messagesContainer = document.getElementById("messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");

  // Track active tenant
  let activeIndustry = null;

  // --- Messaging ---
  function appendMessage(sender, text) {
    const div = document.createElement("div");
    div.classList.add("cmc-bubble");
    if (sender === "You") div.classList.add("cmc-user");
    else div.classList.add("cmc-bot");
    div.textContent = `${sender}: ${text}`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !activeIndustry) return;
    appendMessage("You", text);
    userInput.value = "";

    const loading = document.createElement("div");
    loading.classList.add("cmc-bubble", "cmc-bot");
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

      if (data.error) appendMessage("⚠️ Error", data.error);
      else appendMessage(INDUSTRIES[activeIndustry], data.reply || data.answer || "⚠️ Unexpected response format.");
    } catch (err) {
      messagesContainer.removeChild(loading);
      appendMessage("⚠️ Error", "Could not reach server.");
      console.error("Chat error:", err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  // --- Industry Bubble Clicks ---
  Object.keys(INDUSTRIES).forEach(industry => {
    const bubble = document.getElementById(industry);
    if (!bubble) return;
    bubble.addEventListener("click", () => {
      activeIndustry = industry;
      chatTitle.textContent = INDUSTRIES[industry];

      placeholderBubble.classList.add("open");
      setTimeout(() => {
        chatWindow.classList.add("show");
      }, 250);
    });
  });

  // --- Placeholder Bubble Toggle ---
  if (placeholderBubble && chatWindow) {
    placeholderBubble.addEventListener("click", () => {
      placeholderBubble.classList.add("open");
      setTimeout(() => {
        chatWindow.classList.add("show");
      }, 250);
    });

    document.querySelectorAll(".close-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        chatWindow.classList.remove("show");
        placeholderBubble.classList.remove("open");
        activeIndustry = null;
      });
    });
  }
});
