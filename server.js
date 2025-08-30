import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json());
app.use(express.static('.'));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, model, max_tokens, temperature, system_prompt, conversation_history } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing message' });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing OPENAI_API_KEY' });
    }

    // Build messages array with conversation history
    let messages = [
      { role: 'system', content: system_prompt || 'You are a helpful website assistant.' }
    ];

    // Add conversation history if provided
    if (conversation_history && Array.isArray(conversation_history)) {
      // Filter out any invalid entries and add to messages
      conversation_history.forEach(msg => {
        if (msg && msg.role && msg.content && 
            (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 256,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        messages: messages
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Upstream error', detail: text });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    res.json({ reply: content || "I'm not sure how to answer that." });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


