(() => {
  const API_URL = "/api/chat";

  // Create bubble
  const bubble = document.createElement("div");
  bubble.id = "chat-bubble";
  bubble.setAttribute("role", "button");
  bubble.setAttribute("aria-label", "Open chat widget");
  bubble.innerHTML = "💬";
  document.body.appendChild(bubble);

  // Create chat window
  const win = document.createElement("div");
  win.id = "chat-window";
  win.classList.add("hidden");
  win.innerHTML = `
    <div id="chat-header">
      <span>Chat</span>
      <button id="chat-close" aria-label="Close chat">&times;</button>
    </div>
    <div id="chat-messages" aria-live="polite"></div>
    <div id="chat-input-area">
      <input id="chat-input" type="text" placeholder="Type a message..." autocomplete="off" />
      <button id="chat-send" aria-label="Send message">➤</button>
    </div>
  `;
  document.body.appendChild(win);

  const closeBtn = win.querySelector("#chat-close");
  const input = win.querySelector("#chat-input");
  const sendBtn = win.querySelector("#chat-send");
  const messages = win.querySelector("#chat-messages");

  function openChat() {
    win.classList.remove("hidden");
    win.classList.add("open");
    input.focus();
  }
  function closeChat() {
    win.classList.remove("open");
    setTimeout(() => win.classList.add("hidden"), 200);
  }

  bubble.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `message ${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    appendMessage("user", text);
    input.value = "";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      appendMessage("bot", data.reply || "⚠️ No response");
    } catch (err) {
      console.error("Chat error:", err);
      appendMessage("bot", "⚠️ Something went wrong. Please try again.");
    }
  }

  // Send on click
  sendBtn.addEventListener("click", sendMessage);
  // Send on Enter
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
