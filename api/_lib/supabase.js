import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions for Supabase operations
export async function createConversationInSupabase(conversationId) {
  try {
    const { data, error } = await supabase
      .from('Conversations')
      .insert([
        {
          conversation_id: conversationId,
          created_at: new Date().toISOString(),
          messages: []
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating conversation in Supabase:', error);
    return null;
  }
}

export async function getConversationFromSupabase(conversationId) {
  try {
    const { data, error } = await supabase
      .from('Conversations')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching conversation from Supabase:', error);
    return null;
  }
}

export async function updateConversationInSupabase(conversationId, messages) {
  try {
    const { data, error } = await supabase
      .from('Conversations')
      .update({ messages: messages })
      .eq('conversation_id', conversationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating conversation in Supabase:', error);
    return null;
  }
}

export async function getAllConversationsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('Conversations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching all conversations from Supabase:', error);
    return [];
  }
}

export async function deleteConversationFromSupabase(conversationId) {
  try {
    const { error } = await supabase
      .from('Conversations')
      .delete()
      .eq('conversation_id', conversationId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting conversation from Supabase:', error);
    return false;
  }
}

export { supabase };
