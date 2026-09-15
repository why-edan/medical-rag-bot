const form = document.getElementById("chat-form");
const chatContainer = document.getElementById("chat");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send-btn");

let firstMessage = true;

// Auto-grow the textarea as the user types
msgInput.addEventListener("input", () => {
    msgInput.style.height = "auto";
    msgInput.style.height = Math.min(msgInput.scrollHeight, 140) + "px";
});

// Enter to send, Shift+Enter for a newline
msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
    }
});

// Suggestion chips fill the input and send immediately
document.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
        msgInput.value = chip.dataset.prompt || chip.textContent.trim();
        form.requestSubmit();
    });
});

function removeWelcome() {
    const welcome = document.getElementById("welcome");
    if (!welcome) return;
    welcome.style.transition = "opacity 0.2s ease";
    welcome.style.opacity = "0";
    setTimeout(() => welcome.remove(), 200);
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendRow(kind) {
    const row = document.createElement("div");
    row.className = `msg-row from-${kind}`;
    const bubble = document.createElement("div");
    bubble.className = kind === "user" ? "user-msg" : "bot-msg";
    row.appendChild(bubble);
    chatContainer.appendChild(row);
    return { row, bubble };
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    if (!msg) return;

    if (firstMessage) {
        removeWelcome();
        firstMessage = false;
    }

    appendRow("user").bubble.textContent = msg;
    scrollToBottom();

    msgInput.value = "";
    msgInput.style.height = "auto";
    sendBtn.disabled = true;

    const typingRow = appendRow("bot");
    typingRow.bubble.classList.add("typing-indicator");
    typingRow.bubble.innerHTML = "<span></span><span></span><span></span>";
    scrollToBottom();

    try {
        const formData = new FormData();
        formData.append("msg", msg);

        const response = await fetch("/get", {
            method: "POST",
            body: formData,
        });

        typingRow.row.remove();
        const { bubble: botBubble } = appendRow("bot");

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
                            botBubble.textContent += parsed.text;
                            scrollToBottom();
                        }
                    } catch (_) {}
                }
            }
        }
    } catch (err) {
        typingRow.row.remove();
        appendRow("bot").bubble.textContent = "Error connecting to server. Please try again.";
        console.error(err);
    } finally {
        sendBtn.disabled = false;
        scrollToBottom();
    }
});