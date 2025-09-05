(function () {
  const messagesEl = document.getElementById('messages');
  const formEl = document.getElementById('chat-form');
  const inputEl = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');

  // The frontend no longer holds the API key. It will call our backend proxy.
  const FIXED_BOT_REPLY = "Hi! I'm a demo bot. How can I help you today?";
  
  // Store conversations in a dictionary data structure
  let conversations = {};
  let currentConversationId = null;

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

  // Generate a unique conversation ID
  function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Create a new conversation
  function createNewConversation() {
    const conversationId = generateConversationId();
    conversations[conversationId] = {
      id: conversationId,
      createdAt: new Date().toISOString(),
      messages: []
    };
    currentConversationId = conversationId;
    return conversationId;
  }

  // Get current conversation or create new one
  function getCurrentConversation() {
    if (!currentConversationId || !conversations[currentConversationId]) {
      return createNewConversation();
    }
    return currentConversationId;
  }

  // Add message to current conversation
  function addToConversationHistory(role, content) {
    const convId = getCurrentConversation();
    const message = { 
      role, 
      content, 
      timestamp: new Date().toISOString() 
    };
    
    conversations[convId].messages.push(message);
    
    // Keep only last 20 messages to prevent context from getting too long
    if (conversations[convId].messages.length > 20) {
      conversations[convId].messages = conversations[convId].messages.slice(-20);
    }
  }

  // Get conversation history for API
  function getConversationHistory() {
    const convId = getCurrentConversation();
    return conversations[convId] ? conversations[convId].messages : [];
  }

  // Get all conversations
  function getAllConversations() {
    return conversations;
  }

  // Switch to a different conversation
  function switchConversation(conversationId) {
    if (conversations[conversationId]) {
      currentConversationId = conversationId;
      return true;
    }
    return false;
  }

  // Clear current conversation
  function clearCurrentConversation() {
    if (currentConversationId && conversations[currentConversationId]) {
      conversations[currentConversationId].messages = [];
    }
  }

  // API functions for conversation management
  async function createConversationOnServer() {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        return data.conversation;
      }
    } catch (err) {
      console.error('Error creating conversation on server:', err);
    }
    return null;
  }

  async function getAllConversationsFromServer() {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        return data.conversations;
      }
    } catch (err) {
      console.error('Error fetching conversations from server:', err);
    }
    return [];
  }

  async function getConversationFromServer(conversationId) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        return data.conversation;
      }
    } catch (err) {
      console.error('Error fetching conversation from server:', err);
    }
    return null;
  }

  async function deleteConversationFromServer(conversationId) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (err) {
      console.error('Error deleting conversation from server:', err);
      return false;
    }
  }

  // Sync local conversations with server
  async function syncConversationsWithServer() {
    try {
      const serverConversations = await getAllConversationsFromServer();
      // Update local conversations with server data
      serverConversations.forEach(serverConv => {
        if (conversations[serverConv.id]) {
          // Update existing conversation metadata
          conversations[serverConv.id].createdAt = serverConv.createdAt;
        }
      });
    } catch (err) {
      console.error('Error syncing conversations with server:', err);
    }
  }

  async function getBotReply(userText) {
    try {
      const cfg = (window.APP_CONFIG || {});
      
      // Add user message to conversation history
      addToConversationHistory('user', userText);
      
      // Get current conversation history for API
      const conversationHistory = getConversationHistory();
      
      const response = await fetch(cfg.API_URL || '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          model: cfg.model,
          max_tokens: cfg.max_tokens,
          temperature: cfg.temperature,
          system_prompt: cfg.system_prompt,
          conversation_history: conversationHistory,
          conversation_id: currentConversationId
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

  // Dashboard button functionality
  const dashboardBtn = document.getElementById('dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // Initialize with a new conversation and welcome message
  createNewConversation();
  const welcomeMessage = "Hello! I'm the MindTek AI Assistant. I'm here to help you discover how AI can transform your business. What industry do you work in?";
  appendMessage('bot', welcomeMessage);
  addToConversationHistory('assistant', welcomeMessage);

  // Sync with server on initialization
  syncConversationsWithServer();

  // Expose conversation management functions globally for debugging
  window.conversationManager = {
    getAllConversations,
    getCurrentConversation,
    switchConversation,
    createNewConversation,
    clearCurrentConversation,
    syncConversationsWithServer,
    conversations: () => conversations
  };
})();


