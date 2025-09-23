import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')

  // Ensure original dashboard styling is applied only on this page
  useEffect(() => {
    const id = 'dashboard-css-link'
    let link = document.getElementById(id)
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = '/dashboard.css'
      document.head.appendChild(link)
    }
    return () => {
      const existing = document.getElementById(id)
      if (existing) existing.remove()
    }
  }, [])

  async function loadConversations() {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/conversations')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = (data.conversations || [])
      setConversations(list)
      // If a conversation is currently selected, refresh its details as well
      if (selectedId) {
        try {
          await selectConversation(selectedId)
        } catch {}
      }
    } catch (e) {
      setError('Failed to load conversations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConversations() }, [])

  async function selectConversation(id) {
    setSelectedId(id)
    setAnalysis(null)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (!res.ok) throw new Error('Failed to fetch conversation')
      const data = await res.json()
      const conv = data.conversation
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages: conv.messages, createdAt: conv.createdAt } : c)))
    } catch (e) {
      setError('Failed to load conversation details.')
    }
  }

  async function deleteSelected() {
    if (!selectedId) return
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setConversations((prev) => prev.filter((c) => c.id !== selectedId))
      setSelectedId(null)
      setAnalysis(null)
    } catch (e) {
      setError('Failed to delete conversation.')
    }
  }

  async function exportSelected() {
    if (!selectedId) return
    const res = await fetch(`/api/conversations/${selectedId}`)
    const data = await res.json()
    const conv = data.conversation
    const exportData = { id: conv.id, createdAt: conv.createdAt, messageCount: conv.messages.length, messages: conv.messages }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conv.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function analyzeSelected() {
    if (!selectedId) return
    setAnalysis({ loading: true })
    try {
      const res = await fetch(`/api/conversations/${selectedId}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to analyze lead')
      }
      const data = await res.json()
      setAnalysis({ loading: false, data: data.leadAnalysis })
    } catch (e) {
      setAnalysis({ loading: false, error: 'Failed to analyze lead. Please try again.' })
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedId)

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>MindTek AI - Conversation Dashboard</h1>
        <div className="header-actions">
          <button id="refresh-btn" className="btn btn-secondary" onClick={loadConversations}>Refresh</button>
          <Link id="back-to-chat-btn" to="/" className="btn btn-primary">Back to Chat</Link>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="conversations-sidebar">
          <h2>Lead Conversations</h2>
          <div id="conversations-list" className="conversations-list">
            {conversations.map((conv) => {
              const lastMessage = conv.lastMessage
              const preview = lastMessage ? (lastMessage.content.length > 100 ? lastMessage.content.substring(0, 100) + '...' : lastMessage.content) : 'No messages yet'
              const date = new Date(conv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              return (
                <div key={conv.id} className={`conversation-item ${selectedId === conv.id ? 'active' : ''}`} onClick={() => selectConversation(conv.id)}>
                  <div className="conversation-item-header">
                    <span className="conversation-id">{conv.id}</span>
                    <span className="conversation-date">{date}</span>
                  </div>
                  <div className="conversation-preview">{preview}</div>
                  <div className="conversation-meta">
                    <span className="message-count">{conv.messageCount} messages</span>
                  </div>
                </div>
              )
            })}
          </div>
          {loading && (
            <div id="loading-indicator" className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading lead conversations...</p>
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div id="empty-state" className="empty-state">
              <p>No lead conversations found</p>
            </div>
          )}
        </div>

        <div className="conversation-detail">
          {!selectedConv && (
            <div id="no-conversation-selected" className="no-selection">
              <h3>Select a lead conversation to view details</h3>
              <p>Choose a conversation from the list to see the lead's information and conversation history.</p>
            </div>
          )}

          {selectedConv && (
            <div id="conversation-view" className="conversation-view">
              <div className="conversation-header">
                <h3 id="conversation-title">Conversation {selectedConv.id}</h3>
                <div className="conversation-meta">
                  <span id="conversation-date">Created: {new Date(selectedConv.createdAt).toLocaleString()}</span>
                  <span id="conversation-message-count">{(selectedConv.messages || []).length} messages</span>
                </div>
              </div>

              <div className="messages-container">
                <div id="messages-list" className="messages-list">
                  {(selectedConv.messages || []).length === 0 && (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No messages in this conversation</p>
                  )}
                  {(selectedConv.messages || []).map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                      <div className="message-avatar">{m.role === 'user' ? 'U' : 'B'}</div>
                      <div className="message-content">
                        <div className="message-text">{m.content}</div>
                        <div className="message-timestamp">{new Date(m.timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="conversation-actions">
                <button id="analyze-lead-btn" className="btn btn-primary" onClick={analyzeSelected}>Analyze Lead</button>
                <button id="delete-conversation-btn" className="btn btn-danger" onClick={deleteSelected}>Delete Conversation</button>
                <button id="export-conversation-btn" className="btn btn-secondary" onClick={exportSelected}>Export Messages</button>
              </div>

              <div id="lead-analysis-section" className="lead-analysis-section" style={{ display: analysis ? 'block' : 'none' }}>
                <h3>Lead Analysis Results</h3>
                <div id="lead-analysis-content" className="lead-analysis-content">
                  {analysis?.loading && (
                    <div className="analysis-loading"><div className="spinner"></div>Analyzing lead...</div>
                  )}
                  {analysis?.error && (
                    <div className="analysis-error">{analysis.error}</div>
                  )}
                  {analysis?.data && (
                    <>
                      {[
                        { key: 'customerName', label: 'Customer Name', value: analysis.data.customerName || 'Not provided' },
                        { key: 'customerEmail', label: 'Email Address', value: analysis.data.customerEmail || 'Not provided' },
                        { key: 'customerPhone', label: 'Phone Number', value: analysis.data.customerPhone || 'Not provided' },
                        { key: 'customerIndustry', label: 'Industry', value: analysis.data.customerIndustry || 'Not specified' },
                        { key: 'customerProblem', label: 'Problems & Goals', value: analysis.data.customerProblem || 'Not specified' },
                        { key: 'customerAvailability', label: 'Availability', value: analysis.data.customerAvailability || 'Not specified' },
                        { key: 'specialNotes', label: 'Special Notes', value: analysis.data.specialNotes || 'None' },
                        { key: 'leadQuality', label: 'Lead Quality', value: analysis.data.leadQuality, isQuality: true },
                        { key: 'customerConsultation', label: 'Consultation Booked', value: analysis.data.customerConsultation, isConsultation: true }
                      ].map((f) => (
                        <div key={f.key} className={`lead-field ${f.key === 'customerConsultation' ? 'consultation' : ''}`}>
                          <div className="lead-field-label">{f.label}</div>
                          <div className="lead-field-value">
                            {f.isQuality ? (
                              <span className={`lead-quality ${f.value}`}>{f.value || 'unknown'}</span>
                            ) : f.isConsultation ? (
                              <span className={`consultation-badge ${f.value ? 'booked' : 'not-booked'}`}>{f.value ? 'Yes' : 'No'}</span>
                            ) : (
                              f.value
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, border: '1px solid #fecaca', textAlign: 'center' }}>{error}</div>}
      <script src="/config.js"></script>
    </div>
  )
}


