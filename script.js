const DOM = {
  messages: document.getElementById("message-container"),
  scrollContainer: document.getElementById("messages"),
  prompt: document.getElementById("prompt"),
  sendBtn: document.getElementById("send-btn"),
  hero: document.getElementById("hero"),
};

const UI = {
  appendMessage(role, text) {
    const isUser = role === "user";
    const wrapper = document.createElement("div");
    wrapper.className = `flex flex-col ${isUser ? "items-end" : "items-start"}`;

    const bubble = document.createElement("div");
    bubble.className = "max-w-[95%] sm:max-w-[85%] px-3 py-2 sm:px-4 sm:py-3 text-[13px] sm:text-sm leading-relaxed";

    if (isUser) {
      bubble.className += " whitespace-pre-wrap";
    } else {
      bubble.className += " prose prose-sm max-w-none prose-slate";
    }

    bubble.style.background = isUser ? 'var(--msg-user-bg)' : 'var(--bg)';
    bubble.style.color = isUser ? 'var(--msg-user-text)' : 'var(--text)';
    bubble.style.border = '2px solid var(--border)';

    if (isUser) {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
    }

    wrapper.appendChild(bubble);
    DOM.messages.appendChild(wrapper);
    DOM.scrollContainer.scrollTop = DOM.scrollContainer.scrollHeight;

    // Fade out hero on first message
    if (DOM.hero && DOM.hero.style.opacity !== "0") {
      DOM.hero.style.opacity = "0";
    }

    return bubble;
  },

  updateMessage(element, text, isUser = false) {
    if (isUser) {
      element.textContent = text;
    } else {
      element.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
    }
    DOM.scrollContainer.scrollTop = DOM.scrollContainer.scrollHeight;
  },

  updateButtonState() {
    DOM.sendBtn.disabled = !DOM.prompt.value.trim();
  }
};

const Model = {
  API_URL: 'https://la.prathamkhanal962.workers.dev/query/stream',

  async streamReply(question, onUpdate, onComplete, onError) {
    try {
      const res = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            if (currentEvent === 'sources') {
              // Ignore sources structure for now to keep minimum layout
              currentEvent = null;
            } else {
              if (dataStr === '[DONE]') {
                onComplete();
                return;
              }
              const token = dataStr.replace(/\\n/g, '\n');
              fullText += token;
              onUpdate(fullText);
              currentEvent = null;
            }
          }
        }
      }
      onComplete();
    } catch (err) {
      onError(err.message);
    }
  }
};

const Events = {
  async sendPrompt() {
    const message = DOM.prompt.value.trim();
    if (!message) return;

    UI.appendMessage("user", message);
    DOM.prompt.value = "";
    UI.updateButtonState();

    DOM.prompt.disabled = true;
    DOM.sendBtn.disabled = true;

    const replyBubble = UI.appendMessage("assistant", "Thinking...");

    await Model.streamReply(
      message,
      (text) => {
        if (text) {
          UI.updateMessage(replyBubble, text);
        }
      },
      () => {
        DOM.prompt.disabled = false;
        DOM.prompt.focus();
        UI.updateButtonState();
      },
      (error) => {
        UI.updateMessage(replyBubble, `Error: ${error}`);
        DOM.prompt.disabled = false;
        UI.updateButtonState();
      }
    );
  },

  bind() {
    DOM.sendBtn.onclick = () => Events.sendPrompt();
    DOM.prompt.oninput = () => UI.updateButtonState();
    DOM.prompt.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        Events.sendPrompt();
      }
    };
  }
};

Events.bind();
UI.updateButtonState();
