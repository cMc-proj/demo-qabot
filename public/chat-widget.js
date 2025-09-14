(() => {
  // --- Config ---
  const API_BASE_URL = "https://demo-qabot.onrender.com"; // update if your Render URL changes
  const TENANT_ID = "default"; // later: set dynamically per business
  let currentMode = "restaurant"; // default mode

document.addEventListener("DOMContentLoaded", () => {
    // --- Create Chat Window ---
    const chatWindow = document.createElement("div");
    chatWindow.id = "chat-window";
    Object.assign(chatWindow.style, {
      position: "fixed",
      bottom: "90px",
      right: "20px",
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

chatWindow.innerHTML = `
      <div style="background:#2563eb; color:#fff; padding:10px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
        <span id="chat-title">${currentMode}</span>
        <button id="chat-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div id="chat-messages" style="flex:1; padding:10px; overflow-y:auto; font-size:14px; line-height:1.4;"></div>
      <div style="display:flex; border-top:1px solid #ddd;">
        <input id="chat-input" type="text" placeholder="Type a message..."
          style="flex:1; padding:10px; border:none; font-size:14px; outline:none;" />
        <button id="chat-send" style="background:#2563eb;color:#fff;border:none;padding:0 16px;cursor:pointer;">Send</button>
      </div>
    `;
    document.body.appendChild(chatWindow);

 // --- Elements ---
    const chatMessages = chatWindow.querySelector("#chat-messages");
    const chatInput = chatWindow.querySelector("#chat-input");
    const chatSend = chatWindow.querySelector("#chat-send");
    const chatClose = chatWindow.querySelector("#chat-close");

   // --- Bubble Handlers ---
    document.querySelectorAll(".chat-bubble").forEach((bubble) => {
      bubble.addEventListener("click", () => {
        currentMode = bubble.id;
        document.querySelector("#chat-title").textContent = currentMode;
        chatWindow.style.display = "flex";
        chatInput.focus();
      });
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

        // Show loading message
      const loadingMsg = document.createElement("div");
      loadingMsg.style.marginBottom = "8px";
      loadingMsg.innerHTML = `<em>Assistant is typing...</em>`;
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
        appendMessage("Assistant", data.reply || "⚠️ No reply received.");
      } catch (err) {
        console.error("Chat error:", err);
        chatMessages.removeChild(loadingMsg);
        appendMessage("Assistant", "⚠️ Something went wrong. Please try again.");
      
      }
  }

   // --- Send on button click or Enter ---
    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  });
})();
