const form = document.getElementById("chat-form");
const chatContainer = document.getElementById("chat");
const msgInput = document.getElementById("msg");

let firstMessage = true;

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    if (!msg) return;

    // Remove welcome
    if (firstMessage) {
        const welcome = chatContainer.querySelector('.welcome-message');
        if (welcome) {
            welcome.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => welcome.remove(), 300);
        }
        firstMessage = false;
    }

    // User message
    const userDiv = document.createElement("div");
    userDiv.className = "user-msg";
    userDiv.textContent = msg;
    chatContainer.appendChild(userDiv);
    scrollToBottom();

    msgInput.value = "";

    // Bot typing indicator
    const typingDiv = document.createElement("div");
    typingDiv.className = "bot-msg typing-indicator";
    typingDiv.innerHTML = `<span></span><span></span><span></span>`;
    chatContainer.appendChild(typingDiv);
    scrollToBottom();

    // Create bot reply div (hidden until typing is removed)
    const botDiv = document.createElement("div");
    botDiv.className = "bot-msg";
    botDiv.textContent = "";

    try {
        const formData = new FormData();
        formData.append("msg", msg);

        const response = await fetch("/get", {
            method: "POST",
            body: formData,
        });

        typingDiv.remove();
        chatContainer.appendChild(botDiv);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") break;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            botDiv.textContent += parsed.text;
                            scrollToBottom();
                        }
                    } catch (_) {}
                }
            }
        }
    } catch (err) {
        typingDiv.remove();
        chatContainer.appendChild(botDiv);
        botDiv.textContent = "Error connecting to server. Please try again.";
        console.error(err);
    }

    scrollToBottom();
});

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}