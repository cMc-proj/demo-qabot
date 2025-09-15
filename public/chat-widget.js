(() => {
  const API_BASE_URL = "/api/chat";

  const INDUSTRIES = {
    restaurant: "Restaurant Assistant",
    retail: "Retail Assistant",
    ecommerce: "E-commerce Assistant",
    medical: "Medical Assistant",
  };

  const chatWindows = {};
  let activeIndustry = null;

  function createChatWindow(industry) {
    if (chatWindows[industry]) return chatWindows[industry];

    const wrapper = document.createElement("div");
    wrapper.className = "chat-window";
    Object.assign(wrapper.style, {
      position: "fixed",
      bottom: "90px",
      right: "20px",
      width: "320px",
      height: "420px",
      background: "#111",
      color: "#fff",
      borderRadius: "12px",
      display: "none",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: "9999",
      boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
    });

    wrapper.innerHTML = `
      <div style="background:#000; padding:10px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:bold; color:#7fff00">${INDUSTRIES[industry]}</span>
        <button class="chat-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div class="chat-messages" style="flex:1; padding:10px; overflow-y:auto; font-size:14px;"></div>
      <div style="display:flex; border-top:1px solid #333;">
        <input type="text" class="chat-input" placeholder="Type your message..." 
          style="flex:1; padding:10px; border:none; background:#222; color:#fff;"/>
        <button class="chat-send" style="background:#22c55e;color:#000;border:none;padding:0 16px;cursor:pointer;">Send</button>
      </div>
    `;

    document.body.appendChild(wrapper);

    const closeBtn = wrapper.querySelector(".chat-close");
    const sendBtn = wrapper.querySelector(".chat-send");
    const input = wrapper.querySelector(".chat-input");
    const messages = wrapper.querySelector(".chat-messages");

    function appendMessage(sender, text) {
      const div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.innerHTML = `<strong>${sender}:</strong> ${text}`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      appendMessage("You", text);
      input.value = "";

      const loading = document.createElement("div");
      loading.innerHTML = `<em>${INDUSTRIES[industry]} is typing…</em>`;
      messages.appendChild(loading);

      try {
        const res = await fetch(API_BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, tenantId: industry }),
        });
        const data = await res.json();
        messages.removeChild(loading);

        if (data.error) {
          appendMessage("⚠️ Error", data.error);
        } else if (data.reply) {
          appendMessage(INDUSTRIES[industry], data.reply);
        } else if (data.answer) {
          appendMessage(INDUSTRIES[industry], data.answer);
        } else {
          appendMessage(INDUSTRIES[industry], "⚠️ Unexpected response format.");
        }
      } catch (err) {
        messages.removeChild(loading);
        appendMessage("⚠️ Error", "Could not reach server.");
        console.error("Chat error:", err);
      }
    }

    sendBtn.onclick = sendMessage;
    input.addEventListener("keypress", e => {
      if (e.key === "Enter") sendMessage();
    });
    closeBtn.onclick = () => {
      wrapper.style.display = "none";
      if (activeIndustry === industry) activeIndustry = null;
    };

    chatWindows[industry] = wrapper;
    return wrapper;
  }

  function toggleChat(industry) {
    // If clicking the same industry again, toggle hide/show
    if (activeIndustry === industry) {
      const win = chatWindows[industry];
      if (win && win.style.display === "flex") {
        win.style.display = "none";
        activeIndustry = null;
      } else {
        win.style.display = "flex";
        activeIndustry = industry;
      }
      return;
    }

    // Hide the current one
    if (activeIndustry && chatWindows[activeIndustry]) {
      chatWindows[activeIndustry].style.display = "none";
    }

    // Show or create new one
    const win = createChatWindow(industry);
    win.style.display = "flex";
    activeIndustry = industry;
  }

  window.addEventListener("DOMContentLoaded", () => {
    Object.keys(INDUSTRIES).forEach(industry => {
      const bubble = document.getElementById(industry);
      if (!bubble) return;
      bubble.addEventListener("click", () => toggleChat(industry));
    });
  });
})();
// --- Bubble → Chat Transition ---
const placeholderBubble = document.getElementById("demo-placeholder-bubble");
const chatWindow = document.querySelector(".industry-chat");

if (placeholderBubble && chatWindow) {
  // Expand bubble into chat
  placeholderBubble.addEventListener("click", () => {
    placeholderBubble.classList.add("open");
    setTimeout(() => {
      chatWindow.classList.add("show");
    }, 250); // matches CSS transition timing
  });

  // Close chat → shrink bubble
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      chatWindow.classList.remove("show");
      placeholderBubble.classList.remove("open");
    });
  });
}
