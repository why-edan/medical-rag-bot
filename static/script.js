const form = document.getElementById("chat-form");
const chatContainer = document.getElementById("chat");
const msgInput = document.getElementById("msg");

// Remove welcome message on first interaction
let firstMessage = true;

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    
    if (!msg) return;

    // Remove welcome message
    if (firstMessage) {
        const welcome = chatContainer.querySelector('.welcome-message');
        if (welcome) {
            welcome.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => welcome.remove(), 300);
        }
        firstMessage = false;
    }

    // Display user message
    const userDiv = document.createElement("div");
    userDiv.className = "user-msg";
    userDiv.textContent = msg;
    chatContainer.appendChild(userDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Clear input
    msgInput.value = "";

    // Show typing indicator
    const typingDiv = document.createElement("div");
    typingDiv.className = "bot-msg typing-indicator";
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // Send to FastAPI
        const formData = new FormData();
        formData.append("msg", msg);

        const response = await fetch("/get", { method: "POST", body: formData });

        // Remove typing indicator
        typingDiv.remove();

        // Create bot message container
        const botDiv = document.createElement("div");
        botDiv.className = "bot-msg";
        botDiv.textContent = "";
        chatContainer.appendChild(botDiv);

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    
                    try {
                        const parsed = JSON.parse(data);
                        botDiv.textContent += parsed.text;
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } catch (error) {
        typingDiv.remove();
        const botDiv = document.createElement("div");
        botDiv.className = "bot-msg";
        botDiv.textContent = `⚠️ Error: ${error.message}`;
        chatContainer.appendChild(botDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});

// Add CSS for fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
`;
document.head.appendChild(style);