import fetch from 'node-fetch';
import { getConversationFromSupabase, createConversationInSupabase, updateConversationInSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model, max_tokens, temperature, system_prompt, conversation_history, conversation_id } = req.body || {};
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing message' });
    }
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
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
    
    // Store conversation on server side if conversation_id is provided
    if (conversation_id) {
      try {
        // Try to get existing conversation from Supabase
        let conversation = await getConversationFromSupabase(conversation_id);
        
        if (!conversation) {
          // Create new conversation in Supabase
          conversation = await createConversationInSupabase(conversation_id);
        }
        
        if (conversation) {
          // Add user message and bot response to conversation
          const messages = conversation.messages || [];
          messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
          });
          messages.push({
            role: 'assistant',
            content: content || "I'm not sure how to answer that.",
            timestamp: new Date().toISOString()
          });
          
          // Update conversation in Supabase
          await updateConversationInSupabase(conversation_id, messages);
        }
      } catch (error) {
        console.error('Error storing conversation:', error);
        // Continue without failing
      }
    }
    
    res.json({ 
      reply: content || "I'm not sure how to answer that.",
      conversation_id: conversation_id 
    });
  } catch (err) {
    console.error('Error in chat API:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
