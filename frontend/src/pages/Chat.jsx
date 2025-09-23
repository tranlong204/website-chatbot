import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Chat() {
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    const welcome = "Hello! I'm the MindTek AI Assistant. I'm here to help you discover how AI can transform your business. What industry do you work in?"
    setMessages([{ role: 'assistant', content: welcome, timestamp: new Date().toISOString() }])
    // Create a server-side conversation so messages persist to DB
    ;(async () => {
      try {
        const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        if (res.ok) {
          const data = await res.json()
          setConversationId(data?.conversation?.id)
        }
      } catch (e) {
        // non-fatal; chatting still works
      }
    })()
  }, [])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text) return
    setIsSending(true)
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }])
    setInputValue('')

    try {
      const cfg = window.APP_CONFIG || {}
      const res = await fetch(cfg.API_URL || '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: cfg.model,
          max_tokens: cfg.max_tokens,
          temperature: cfg.temperature,
          system_prompt: cfg.system_prompt,
          conversation_history: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
          conversation_id: conversationId
        })
      })
      const data = res.ok ? await res.json() : { reply: "Hi! I'm a demo bot. How can I help you today?" }
      const reply = data?.reply || "Hi! I'm a demo bot. How can I help you today?"
      if (!conversationId && data?.conversation_id) setConversationId(data.conversation_id)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div id="app">
      <header className="app-header">
        <h1>MindTek AI Assistant</h1>
        <Link to="/dashboard" className="dashboard-btn" id="dashboard-btn">View Lead Conversations</Link>
      </header>
      <main className="chat-container">
        <div id="messages" className="messages" ref={messagesRef} aria-live="polite">
          {messages.map((m, idx) => (
            <div key={idx} className={`message ${m.role}`}>
              <div className={`avatar ${m.role}`}>{m.role === 'user' ? 'U' : 'B'}</div>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
        </div>
        <form id="chat-form" className="chat-input" onSubmit={sendMessage} autoComplete="off">
          <input
            id="user-input"
            type="text"
            placeholder="Tell me about your industry or business challenges..."
            aria-label="Message"
            required
            value={inputValue}
            disabled={isSending}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" id="send-btn" aria-label="Send" disabled={isSending}>Send</button>
        </form>
      </main>
    </div>
  )
}


