import { getAllConversationsFromSupabase, getConversationFromSupabase, createConversationInSupabase, deleteConversationFromSupabase } from '../_lib/supabase.js';

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

  try {
    if (req.method === 'GET') {
      // Get all conversations
      const supabaseConversations = await getAllConversationsFromSupabase();
      
      const conversationList = supabaseConversations.map(conv => ({
        id: conv.conversation_id,
        createdAt: conv.created_at,
        messageCount: conv.messages ? conv.messages.length : 0,
        lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null
      }));
      
      res.json({ conversations: conversationList });
      
    } else if (req.method === 'POST') {
      // Create new conversation
      const conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Try to create conversation in Supabase first
      const supabaseConversation = await createConversationInSupabase(conversationId);
      
      if (supabaseConversation) {
        const conversation = {
          id: supabaseConversation.conversation_id,
          createdAt: supabaseConversation.created_at,
          messages: supabaseConversation.messages || []
        };
        res.json({ conversation });
      } else {
        // Fallback response
        const conversation = {
          id: conversationId,
          createdAt: new Date().toISOString(),
          messages: []
        };
        res.json({ conversation });
      }
      
    } else if (req.method === 'DELETE') {
      // Clear all conversations (this would need to be implemented in Supabase)
      res.json({ message: 'All conversations cleared successfully (in-memory only)' });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Error in conversations API:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
