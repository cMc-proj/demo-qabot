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

  let activeIndustry = null;

  // --- Store chat history per industry ---
  const chatHistories = {
    restaurant: [],
    retail: [],
    ecommerce: [],
    medical: [],
  };

  // Render stored history for a given industry
  function renderHistory(industry) {
    messagesContainer.innerHTML = "";
    chatHistories[industry].forEach(({ sender, text, type }) => {
      const div = document.createElement("div");
      div.classList.add("cmc-bubble", type);
      div.textContent = text;
      messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Append message to current chat + history
  function appendMessage(text, type) {
    if (!activeIndustry) return;
    const div = document.createElement("div");
    div.classList.add("cmc-bubble", type);
    div.textContent = text;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Save to history
    chatHistories[activeIndustry].push({ text, type });
  }

  // --- Send message ---
  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || !activeIndustry) return;

    appendMessage(text, "cmc-user");
    userInput.value = "";
    userInput.focus();

    // Temporary loading bubble
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

      if (data.error) {
        appendMessage(`⚠️ ${data.error}`, "cmc-error");
      } else {
        appendMessage(
          data.reply || data.answer || data.message || "⚠️ Unexpected response",
          "cmc-bot"
        );
      }
    } catch (err) {
      messagesContainer.removeChild(loading);
      appendMessage("⚠️ Could not reach server.", "cmc-error");
      console.error("Chat error:", err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // --- Industry Bubble Clicks ---
  Object.keys(INDUSTRIES).forEach((industry) => {
    const bubble = document.getElementById(industry);
    if (!bubble) return;
    bubble.addEventListener("click", () => {
      activeIndustry = industry;
      chatTitle.textContent = INDUSTRIES[industry];
      openChat();
      renderHistory(industry); // Load that industry’s chat
    });
  });

  // --- Placeholder Bubble ---
  if (placeholderBubble) {
    placeholderBubble.addEventListener("click", () => {
      if (!activeIndustry) {
        // Default to Restaurant if none selected
        activeIndustry = "restaurant";
        chatTitle.textContent = INDUSTRIES[activeIndustry];
      }
      openChat();
      renderHistory(activeIndustry);
    });
  }

  // --- Close Button ---
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      chatWindow.classList.remove("show");
      placeholderBubble.classList.remove("open");
      userInput.blur();
    });
  });

  // --- Helpers ---
  function openChat() {
    placeholderBubble.classList.add("open");
    setTimeout(() => {
      chatWindow.classList.add("show");
      userInput.focus();
    }, 250);
  }
});
