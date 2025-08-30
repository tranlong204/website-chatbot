(function () {
  const messagesEl = document.getElementById('messages');
  const formEl = document.getElementById('chat-form');
  const inputEl = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');

  // The frontend no longer holds the API key. It will call our backend proxy.
  const FIXED_BOT_REPLY = "Hi! I'm a demo bot. How can I help you today?";
  
  // Store conversation history for context
  let conversationHistory = [];

  function appendMessage(role, text, isTyping = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;
    if (isTyping) wrapper.classList.add('typing');

    const avatar = document.createElement('div');
    avatar.className = `avatar ${role}`;
    avatar.textContent = role === 'user' ? 'U' : 'B';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    if (isTyping) {
      bubble.innerHTML = '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    } else {
      bubble.textContent = text;
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    
    return wrapper;
  }

  function showTypingIndicator() {
    const typingMsg = appendMessage('bot', '', true);
    return typingMsg;
  }

  function removeTypingIndicator(typingMsg) {
    if (typingMsg && typingMsg.parentNode) {
      typingMsg.remove();
    }
  }

  function addToConversationHistory(role, content) {
    conversationHistory.push({ role, content });
    
    // Keep only last 20 messages to prevent context from getting too long
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
  }

  async function getBotReply(userText) {
    try {
      const cfg = (window.APP_CONFIG || {});
      
      // Add user message to conversation history
      addToConversationHistory('user', userText);
      
      const response = await fetch(cfg.API_URL || '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          model: cfg.model,
          max_tokens: cfg.max_tokens,
          temperature: cfg.temperature,
          system_prompt: cfg.system_prompt,
          conversation_history: conversationHistory
        })
      });
      if (!response.ok) return FIXED_BOT_REPLY;
      const data = await response.json();
      const reply = data?.reply || FIXED_BOT_REPLY;
      
      // Add bot response to conversation history
      addToConversationHistory('assistant', reply);
      
      return reply;
    } catch (err) {
      return FIXED_BOT_REPLY;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    
    // Disable input and button while processing
    inputEl.disabled = true;
    sendBtn.disabled = true;
    
    // Show user message
    appendMessage('user', text);
    inputEl.value = '';

    // Show typing indicator
    const typingMsg = showTypingIndicator();

    try {
      // Call backend proxy; fallback handled inside getBotReply
      const reply = await getBotReply(text);
      
      // Remove typing indicator
      removeTypingIndicator(typingMsg);
      
      // Show bot response
      appendMessage('bot', reply);
    } catch (error) {
      // Remove typing indicator
      removeTypingIndicator(typingMsg);
      
      // Show error message
      appendMessage('bot', "Sorry, I encountered an error. Please try again.");
    } finally {
      // Re-enable input and button
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  formEl.addEventListener('submit', handleSubmit);

  // Seed a welcome message and add to conversation history
  const welcomeMessage = "Hello! I'm your website assistant. Ask me anything.";
  appendMessage('bot', welcomeMessage);
  addToConversationHistory('assistant', welcomeMessage);
})();


