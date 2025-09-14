(() => {
  const API_BASE_URL = "https://demo-qabot.onrender.com";
  const TENANT_ID = "default"; // set per site

  async function loadBranding() {
    try {
      const res = await fetch("branding.json");
      const branding = await res.json();
      return branding[TENANT_ID] || branding["default"];
    } catch (err) {
      console.error("Branding load error:", err);
      return { title: "Chat Assistant", color: "#2563eb", bubbleIcon: "💬", position: "bottom-right", shape: "circle" };
    }
  }

  loadBranding().then((brand) => {
    // --- Bubble Position ---
    const bubbleStyle = {
      position: "fixed",
      width: "60px",
      height: "60px",
      background: brand.color,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      zIndex: "9999"
    };

    // Apply position
    if (brand.position.includes("bottom")) {
      bubbleStyle.bottom = "20px";
    } else {
      bubbleStyle.top = "20px";
    }
    if (brand.position.includes("right")) {
      bubbleStyle.right = "20px";
    } else {
      bubbleStyle.left = "20px";
    }

    // Apply shape
    if (brand.shape === "circle") bubbleStyle.borderRadius = "50%";
    if (brand.shape === "rounded") bubbleStyle.borderRadius = "16px";
    if (brand.shape === "square") bubbleStyle.borderRadius = "4px";

// --- Create Bubble ---
const bubble = document.createElement("div");
bubble.id = "chat-bubble";

// If logo provided → use <img>, else fallback to emoji
if (brand.logo) {
  const img = document.createElement("img");
  img.src = brand.logo;
  img.alt = brand.title;
  Object.assign(img.style, {
    width: "70%",
    height: "70%",
    objectFit: "contain"
  });
  bubble.appendChild(img);
} else {
  bubble.innerHTML = brand.bubbleIcon || "💬";
}

// Apply base bubble style
Object.assign(bubble.style, bubbleStyle);
document.body.appendChild(bubble);

    // --- Chat Window ---
    const chatWindow = document.createElement("div");
    chatWindow.id = "chat-window";
    Object.assign(chatWindow.style, {
      position: "fixed",
      width: "320px",
      height: "420px",
      background: "#fff",
      border: "1px solid #ddd",
      borderRadius: "12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      display: "none",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "system-ui, sans-serif",
      zIndex: "9999",
    });
// Header
const header = document.createElement("div");
header.className = "chat-header";

// Tenant logo
if (branding.logo) {
  const logo = document.createElement("img");
  logo.src = branding.logo;
  logo.alt = branding.title || "Logo";
  logo.className = "chat-logo";
  header.appendChild(logo);
}

// Title
const title = document.createElement("span");
title.textContent = branding.title || "Chat";
header.appendChild(title);

// Close button
const closeBtn = document.createElement("button");
closeBtn.className = "chat-close";
closeBtn.innerHTML = "&times;";
closeBtn.onclick = () => chatContainer.remove();
header.appendChild(closeBtn);

// Attach header to chat window
chatWindow.appendChild(header);


    // Position chat window relative to bubble
    if (brand.position.includes("bottom")) {
      chatWindow.style.bottom = "90px";
    } else {
      chatWindow.style.top = "90px";
    }
    if (brand.position.includes("right")) {
      chatWindow.style.right = "20px";
    } else {
      chatWindow.style.left = "20px";
    }

    chatWindow.innerHTML = `
      <div style="background:${brand.color}; color:#fff; padding:10px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
        <span>${brand.title}</span>
        <button id="chat-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div id="chat-messages" style="flex:1; padding:10px; overflow-y:auto; font-size:14px; line-height:1.4;"></div>
      <div style="display:flex; border-top:1px solid #ddd;">
        <input id="chat-input" type="text" placeholder="Type a message..." 
          style="flex:1; padding:10px; border:none; font-size:14px; outline:none;" />
        <button id="chat-send" style="background:${brand.color};color:#fff;border:none;padding:0 16px;cursor:pointer;">Send</button>
      </div>
    `;
    document.body.appendChild(chatWindow);

    // --- Elements ---
    const chatMessages = chatWindow.querySelector("#chat-messages");
    const chatInput = chatWindow.querySelector("#chat-input");
    const chatSend = chatWindow.querySelector("#chat-send");
    const chatClose = chatWindow.querySelector("#chat-close");

    // --- Toggle ---
    bubble.addEventListener("click", () => {
      chatWindow.style.display = chatWindow.style.display === "none" ? "flex" : "none";
      if (chatWindow.style.display === "flex") chatInput.focus();
    });
    chatClose.addEventListener("click", () => (chatWindow.style.display = "none"));

    // --- Helpers ---
    function appendMessage(sender, text) {
      const msg = document.createElement("div");
      msg.style.marginBottom = "8px";
      msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;

      appendMessage("You", text);
      chatInput.value = "";

      const loadingMsg = document.createElement("div");
      loadingMsg.style.marginBottom = "8px";
      loadingMsg.innerHTML = `<em>${brand.title} is typing...</em>`;
      chatMessages.appendChild(loadingMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const res = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, tenantId: TENANT_ID }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();

        chatMessages.removeChild(loadingMsg);
        appendMessage(brand.title, data.reply || "⚠️ No reply received.");
      } catch (err) {
        console.error("Chat error:", err);
        chatMessages.removeChild(loadingMsg);
        appendMessage(brand.title, "⚠️ Something went wrong. Please try again.");
      }
    }

    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  });
})();

