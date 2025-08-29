(function () {
  const messagesEl = document.getElementById('messages');
  const formEl = document.getElementById('chat-form');
  const inputEl = document.getElementById('user-input');

  const FIXED_BOT_REPLY = "Hi! I'm a demo bot. How can I help you today?";

  function appendMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${role}`;
    avatar.textContent = role === 'user' ? 'U' : 'B';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    appendMessage('user', text);
    inputEl.value = '';

    // Simulate thinking delay
    setTimeout(() => {
      appendMessage('bot', FIXED_BOT_REPLY);
    }, 300);
  }

  formEl.addEventListener('submit', handleSubmit);

  // Seed a welcome message
  appendMessage('bot', "Hello! I'm your website assistant. Ask me anything.");
})();


