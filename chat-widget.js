let currentMode = "general"; // default mode

// Create a single chat window
function initChat() {
  const chat = document.createElement("div");
  chat.className = "industry-chat";
  chat.id = "chat-window";
  chat.style.display = "none"; // hidden by default

  chat.innerHTML = `
    <header class="industry-chat-header">
      <span id="chat-title">💬 General Assistant</span>
      <span class="close-btn">✖</span>
    </header>
    <div class="industry-messages" id="messages">
      <div class="cmc-bot cmc-bubble">Welcome — select an industry bubble to get started.</div>
    </div>
    <div class="industry-input">
      <input type="text" id="chat-input" placeholder="Type your message..." />
      <button id="chat-send">➤</button>
    </div>
  `;

  document.body.appendChild(chat);

  const input = chat.querySelector("#chat-input");
  const sendBtn = chat.querySelector("#chat-send");
  const messages = chat.querySelector("#messages");
  const closeBtn = chat.querySelector(".close-btn");

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `cmc-bubble cmc-${role}`;
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    appendMessage("user", text);
    input.value = "";

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          mode: currentMode,   // 🔑 mode set by clicked bubble
          verbose: false
        })
      });

      const data = await res.json();

      if (data.error) {
        appendMessage("bot", `⚠️ ${data.error.message}`);
      } else {
        appendMessage("bot", data.answer || "No answer available.");
      }
    } catch (err) {
      appendMessage("bot", "⚠️ Error connecting to server.");
      console.error("Chat error:", err);
    }
  }

  sendBtn.onclick = sendMessage;
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });
  closeBtn.onclick = () => chat.style.display = "none";
}

// Initialize chat window once
initChat();

// Bubble click listeners: switch mode + open chat
document.querySelectorAll(".chat-bubble").forEach(bubble => {
  bubble.addEventListener("click", () => {
    currentMode = bubble.id; // restaurant, retail, ecommerce, medical
    const chat = document.getElementById("chat-window");
    const title = document.getElementById("chat-title");

    // Update header title
    const emoji = bubble.textContent.split(" ")[0];
    const label = bubble.textContent.split(" ")[1];
    title.textContent = `${emoji} ${label} Assistant`;

    // Show chat
    chat.style.display = "flex";
  });
});
