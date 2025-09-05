(function() {
    // DOM elements
    const conversationsList = document.getElementById('conversations-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    const noConversationSelected = document.getElementById('no-conversation-selected');
    const conversationView = document.getElementById('conversation-view');
    const messagesList = document.getElementById('messages-list');
    const conversationTitle = document.getElementById('conversation-title');
    const conversationDate = document.getElementById('conversation-date');
    const conversationMessageCount = document.getElementById('conversation-message-count');
    
    // Buttons
    const refreshBtn = document.getElementById('refresh-btn');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const deleteConversationBtn = document.getElementById('delete-conversation-btn');
    const exportConversationBtn = document.getElementById('export-conversation-btn');
    const analyzeLeadBtn = document.getElementById('analyze-lead-btn');
    
    // Lead analysis elements
    const leadAnalysisSection = document.getElementById('lead-analysis-section');
    const leadAnalysisContent = document.getElementById('lead-analysis-content');
    
    // State
    let conversations = [];
    let selectedConversationId = null;
    
    // Initialize dashboard
    function init() {
        loadConversations();
        setupEventListeners();
    }
    
    // Setup event listeners
    function setupEventListeners() {
        refreshBtn.addEventListener('click', loadConversations);
        backToChatBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        deleteConversationBtn.addEventListener('click', deleteSelectedConversation);
        exportConversationBtn.addEventListener('click', exportSelectedConversation);
        analyzeLeadBtn.addEventListener('click', analyzeSelectedLead);
    }
    
    // Load all conversations from the server
    async function loadConversations() {
        try {
            showLoading(true);
            hideEmptyState();
            
            const response = await fetch('/api/conversations');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            conversations = data.conversations || [];
            
            if (conversations.length === 0) {
                showEmptyState();
            } else {
                renderConversationsList();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            showError('Failed to load conversations. Please try again.');
        } finally {
            showLoading(false);
        }
    }
    
    // Render the conversations list
    function renderConversationsList() {
        conversationsList.innerHTML = '';
        
        conversations.forEach(conversation => {
            const conversationElement = createConversationElement(conversation);
            conversationsList.appendChild(conversationElement);
        });
    }
    
    // Create a conversation list item element
    function createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.conversationId = conversation.id;
        
        const lastMessage = conversation.lastMessage;
        const preview = lastMessage ? 
            (lastMessage.content.length > 100 ? 
                lastMessage.content.substring(0, 100) + '...' : 
                lastMessage.content) : 
            'No messages yet';
        
        const date = new Date(conversation.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <div class="conversation-item-header">
                <span class="conversation-id">${conversation.id}</span>
                <span class="conversation-date">${date}</span>
            </div>
            <div class="conversation-preview">${preview}</div>
            <div class="conversation-meta">
                <span class="message-count">${conversation.messageCount} messages</span>
            </div>
        `;
        
        div.addEventListener('click', () => selectConversation(conversation.id));
        
        return div;
    }
    
    // Select a conversation and load its details
    async function selectConversation(conversationId) {
        try {
            selectedConversationId = conversationId;
            
            // Update UI to show selected conversation
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-conversation-id="${conversationId}"]`).classList.add('active');
            
            // Load conversation details
            const response = await fetch(`/api/conversations/${conversationId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const conversation = data.conversation;
            
            // Show conversation view
            noConversationSelected.style.display = 'none';
            conversationView.style.display = 'flex';
            
            // Update conversation header
            conversationTitle.textContent = `Conversation ${conversation.id}`;
            conversationDate.textContent = `Created: ${new Date(conversation.createdAt).toLocaleString()}`;
            conversationMessageCount.textContent = `${conversation.messages.length} messages`;
            
            // Render messages
            renderMessages(conversation.messages);
            
        } catch (error) {
            console.error('Error loading conversation:', error);
            showError('Failed to load conversation details.');
        }
    }
    
    // Render messages in the conversation view
    function renderMessages(messages) {
        messagesList.innerHTML = '';
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No messages in this conversation</p>';
            return;
        }
        
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            messagesList.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    }
    
    // Create a message element
    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.role}`;
        
        const timestamp = new Date(message.timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const avatar = message.role === 'user' ? 'U' : 'B';
        
        div.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${escapeHtml(message.content)}</div>
                <div class="message-timestamp">${timestamp}</div>
            </div>
        `;
        
        return div;
    }
    
    // Delete the selected conversation
    async function deleteSelectedConversation() {
        if (!selectedConversationId) return;
        
        if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/conversations/${selectedConversationId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Remove from local state
            conversations = conversations.filter(conv => conv.id !== selectedConversationId);
            
            // Update UI
            document.querySelector(`[data-conversation-id="${selectedConversationId}"]`).remove();
            
            // Reset selection
            selectedConversationId = null;
            noConversationSelected.style.display = 'flex';
            conversationView.style.display = 'none';
            
            // Show empty state if no conversations left
            if (conversations.length === 0) {
                showEmptyState();
            }
            
        } catch (error) {
            console.error('Error deleting conversation:', error);
            showError('Failed to delete conversation.');
        }
    }
    
    // Export the selected conversation
    function exportSelectedConversation() {
        if (!selectedConversationId) return;
        
        const conversation = conversations.find(conv => conv.id === selectedConversationId);
        if (!conversation) return;
        
        // Get full conversation details
        fetch(`/api/conversations/${selectedConversationId}`)
            .then(response => response.json())
            .then(data => {
                const conversationData = data.conversation;
                const exportData = {
                    id: conversationData.id,
                    createdAt: conversationData.createdAt,
                    messageCount: conversationData.messages.length,
                    messages: conversationData.messages
                };
                
                // Create and download file
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `conversation-${conversationData.id}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error exporting conversation:', error);
                showError('Failed to export conversation.');
            });
    }
    
    // Analyze the selected lead
    async function analyzeSelectedLead() {
        if (!selectedConversationId) return;
        
        try {
            // Show loading state
            showAnalysisLoading(true);
            hideLeadAnalysis();
            
            const response = await fetch(`/api/conversations/${selectedConversationId}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze lead');
            }
            
            const data = await response.json();
            const leadAnalysis = data.leadAnalysis;
            
            // Display the analysis results
            displayLeadAnalysis(leadAnalysis);
            
            // Show note about database status if provided
            if (data.note) {
                console.log('Analysis note:', data.note);
            }
            
        } catch (error) {
            console.error('Error analyzing lead:', error);
            showAnalysisError('Failed to analyze lead. Please try again.');
        } finally {
            showAnalysisLoading(false);
        }
    }
    
    // Display lead analysis results
    function displayLeadAnalysis(analysis) {
        leadAnalysisContent.innerHTML = '';
        
        // Create lead fields
        const fields = [
            { key: 'customerName', label: 'Customer Name', value: analysis.customerName || 'Not provided' },
            { key: 'customerEmail', label: 'Email Address', value: analysis.customerEmail || 'Not provided' },
            { key: 'customerPhone', label: 'Phone Number', value: analysis.customerPhone || 'Not provided' },
            { key: 'customerIndustry', label: 'Industry', value: analysis.customerIndustry || 'Not specified' },
            { key: 'customerProblem', label: 'Problems & Goals', value: analysis.customerProblem || 'Not specified' },
            { key: 'customerAvailability', label: 'Availability', value: analysis.customerAvailability || 'Not specified' },
            { key: 'specialNotes', label: 'Special Notes', value: analysis.specialNotes || 'None' },
            { key: 'leadQuality', label: 'Lead Quality', value: analysis.leadQuality, isQuality: true },
            { key: 'customerConsultation', label: 'Consultation Booked', value: analysis.customerConsultation, isConsultation: true }
        ];
        
        fields.forEach(field => {
            const fieldElement = createLeadField(field);
            leadAnalysisContent.appendChild(fieldElement);
        });
        
        showLeadAnalysis();
    }
    
    // Create a lead field element
    function createLeadField(field) {
        const div = document.createElement('div');
        div.className = `lead-field ${field.key === 'customerConsultation' ? 'consultation' : ''}`;
        
        const label = document.createElement('div');
        label.className = 'lead-field-label';
        label.textContent = field.label;
        
        const value = document.createElement('div');
        value.className = 'lead-field-value';
        
        if (field.isQuality) {
            const qualitySpan = document.createElement('span');
            qualitySpan.className = `lead-quality ${field.value}`;
            qualitySpan.textContent = field.value || 'unknown';
            value.appendChild(qualitySpan);
        } else if (field.isConsultation) {
            const badge = document.createElement('span');
            badge.className = `consultation-badge ${field.value ? 'booked' : 'not-booked'}`;
            badge.textContent = field.value ? 'Yes' : 'No';
            value.appendChild(badge);
        } else {
            value.textContent = field.value;
        }
        
        div.appendChild(label);
        div.appendChild(value);
        
        return div;
    }
    
    // Show/hide lead analysis section
    function showLeadAnalysis() {
        leadAnalysisSection.style.display = 'block';
    }
    
    function hideLeadAnalysis() {
        leadAnalysisSection.style.display = 'none';
    }
    
    // Show analysis loading state
    function showAnalysisLoading(show) {
        if (show) {
            leadAnalysisContent.innerHTML = `
                <div class="analysis-loading">
                    <div class="spinner"></div>
                    Analyzing lead...
                </div>
            `;
            showLeadAnalysis();
        }
    }
    
    // Show analysis error
    function showAnalysisError(message) {
        leadAnalysisContent.innerHTML = `
            <div class="analysis-error">
                ${message}
            </div>
        `;
        showLeadAnalysis();
    }
    
    // Utility functions
    function showLoading(show) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    
    function showEmptyState() {
        emptyState.style.display = 'block';
    }
    
    function hideEmptyState() {
        emptyState.style.display = 'none';
    }
    
    function showError(message) {
        // Simple error display - you could enhance this with a proper notification system
        alert(message);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
