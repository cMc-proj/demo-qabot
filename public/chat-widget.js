// Utility: create a chat window for each industry
function createChatWindow(industry, label, emoji) {
  const chat = document.createElement("div");
  chat.className = "industry-chat hidden";
  chat.id = `chat-${industry}`;

  chat.innerHTML = `
    <header class="industry-chat-header">
      <span>${emoji} ${label} Assistant</span>
      <span class="close-btn" data-industry="${industry}">✖</span>
    </header>
    <div class="industry-messages" id="messages-${industry}">
      <div class="cmc-bot cmc-bubble">Welcome to the ${label} assistant — ask me anything.</div>
    </div>
    <div class="industry-input">
      <input type="text" id="input-${industry}" placeholder="Type your message..." />
      <button id="send-${industry}">➤</button>
    </div>
  `;

  document.body.appendChild(chat);

  const input = chat.querySelector(`#input-${industry}`);
  const sendBtn = chat.querySelector(`#send-${industry}`);
  const messages = chat.querySelector(`#messages-${industry}`);
  const closeBtn = chat.querySelector(`.close-btn`);

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
        mode: industry,   // or currentMode depending on your setup
        verbose: false
      })
    });

    const data = await res.json();
    console.log("🔎 API response:", data); // 👈 add this

    if (data.error) {
      appendMessage("bot", `⚠️ ${data.error.message}`);
    } else if (data.answer) {
      appendMessage("bot", data.answer);
    } else if (data.reply) {
      appendMessage("bot", data.reply);
    } else {
      appendMessage("bot", "⚠️ Unexpected response format.");
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
  closeBtn.onclick = () => chat.classList.add("hidden");
}

// Create one chat window per industry
createChatWindow("restaurant", "Restaurant", "🍽️");
createChatWindow("retail", "Retail", "🛍️");
createChatWindow("ecommerce", "E-commerce", "💻");
createChatWindow("medical", "Medical", "🏥");

// Bubble click listeners: show only the relevant chat
document.querySelectorAll(".chat-bubble").forEach(bubble => {
  bubble.addEventListener("click", () => {
    const industry = bubble.id;
    // Hide all chats
    document.querySelectorAll(".industry-chat").forEach(c => c.classList.add("hidden"));
    // Show selected one
    document.getElementById(`chat-${industry}`).classList.remove("hidden");
  });
});
