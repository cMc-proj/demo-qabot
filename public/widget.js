(function () {
  // Namespace
  window.CMC = {
    init: function (config) {
      const clientId = config.clientId || "faqs";
      const apiBase = config.apiBase || window.location.origin;

      // --- Styles ---
      const style = document.createElement("style");
      style.innerHTML = `
        #cmc-bubble {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 9999;
        }
        #cmc-chat {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 320px;
          max-height: 500px;
          background: #1a1a1a;
          color: white;
          border-radius: 12px;
          display: none;
          flex-direction: column;
          box-shadow: 0 8px 20px rgba(0,0,0,0.4);
          z-index: 9999;
          overflow: hidden;
        }
        #cmc-chat header {
          background: #000;
          padding: 10px;
          font-weight: bold;
          text-align: center;
          color: #7fff00;
          font-family: 'Permanent Marker', cursive;
        }
        #cmc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cmc-bubble {
          padding: 8px 12px;
          border-radius: 12px;
          max-width: 80%;
          animation: fadeInUp 0.3s ease;
        }
        .cmc-user {
          align-self: flex-end;
          background: #22c55e;
          color: black;
        }
        .cmc-bot {
          align-self: flex-start;
          background: #333;
          color: white;
        }
        #cmc-input {
          display: flex;
          border-top: 1px solid #333;
        }
        #cmc-input input {
          flex: 1;
          border: none;
          padding: 10px;
          background: #111;
          color: white;
          outline: none;
        }
        #cmc-input button {
          background: #22c55e;
          color: black;
          border: none;
          padding: 0 16px;
          cursor: pointer;
          font-weight: bold;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);

      // --- Bubble ---
      const bubble = document.createElement("div");
      bubble.id = "cmc-bubble";
      bubble.innerHTML = "💬";
      document.body.appendChild(bubble);

      // --- Chat Window ---
      const chat = document.createElement("div");
      chat.id = "cmc-chat";
      chat.innerHTML = `
        <header>CMC</header>
        <div id="cmc-messages">
          <div class="cmc-bot cmc-bubble">Welcome to CMC — ask me anything.</div>
        </div>
        <div id="cmc-input">
          <input type="text" id="cmc-question" placeholder="Type your message..." />
          <button id="cmc-send">➤</button>
        </div>
      `;
      document.body.appendChild(chat);

      // --- Toggle ---
      bubble.onclick = () => {
        chat.style.display = chat.style.display === "flex" ? "none" : "flex";
      };

      // --- Send Message ---
      const input = chat.querySelector("#cmc-question");
      const sendBtn = chat.querySelector("#cmc-send");
      const messages = chat.querySelector("#cmc-messages");

      async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;
        appendMessage("user", text);
        input.value = "";

        try {
          const res = await fetch(`${apiBase}/qa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, question: text })
          });
          const data = await res.json();
          appendMessage("bot", data.answer || "Sorry, no answer available.");
        } catch (err) {
          appendMessage("bot", "⚠️ Error connecting to server.");
        }
      }

      function appendMessage(role, text) {
        const div = document.createElement("div");
        div.className = `cmc-bubble cmc-${role}`;
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
      }

      sendBtn.onclick = sendMessage;
      input.addEventListener("keypress", e => {
        if (e.key === "Enter") sendMessage();
      });
    }
  };
})();

