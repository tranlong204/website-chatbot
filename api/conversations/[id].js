import { getConversationFromSupabase, deleteConversationFromSupabase, updateConversationInSupabase } from '../_lib/supabase.js';

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

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // Get specific conversation
      const conversation = await getConversationFromSupabase(id);
      
      if (conversation) {
        // Transform Supabase data to match expected format
        const transformedConversation = {
          id: conversation.conversation_id,
          createdAt: conversation.created_at,
          messages: conversation.messages || []
        };
        res.json({ conversation: transformedConversation });
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }
      
    } else if (req.method === 'POST') {
      // Update/replace messages for a conversation (used to persist welcome message)
      const { messages } = req.body || {};
      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
      }

      const updated = await updateConversationInSupabase(id, messages);
      if (updated) {
        res.json({ conversation: { id: updated.conversation_id, createdAt: updated.created_at, messages: updated.messages || [] } });
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }

    } else if (req.method === 'DELETE') {
      // Delete conversation
      const supabaseDeleted = await deleteConversationFromSupabase(id);
      
      if (supabaseDeleted) {
        res.json({ message: 'Conversation deleted successfully' });
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Error in conversation API:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
