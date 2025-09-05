import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// In-memory storage for conversations (fallback if Supabase is unavailable)
const conversations = {};

// Helper functions for Supabase operations
async function createConversationInSupabase(conversationId) {
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

async function getConversationFromSupabase(conversationId) {
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

async function updateConversationInSupabase(conversationId, messages) {
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

async function getAllConversationsFromSupabase() {
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

async function deleteConversationFromSupabase(conversationId) {
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

app.use(express.json());
app.use(express.static('.'));

app.post('/api/chat', async (req, res) => {
  try {
    const { message, model, max_tokens, temperature, system_prompt, conversation_history, conversation_id } = req.body || {};
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
        } else {
          // Fallback to in-memory storage if Supabase fails
          console.warn('Supabase unavailable, using in-memory storage');
          if (!conversations[conversation_id]) {
            conversations[conversation_id] = {
              id: conversation_id,
              createdAt: new Date().toISOString(),
              messages: []
            };
          }
          
          conversations[conversation_id].messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
          });
          conversations[conversation_id].messages.push({
            role: 'assistant',
            content: content || "I'm not sure how to answer that.",
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error storing conversation:', error);
        // Fallback to in-memory storage
        if (!conversations[conversation_id]) {
          conversations[conversation_id] = {
            id: conversation_id,
            createdAt: new Date().toISOString(),
            messages: []
          };
        }
        
        conversations[conversation_id].messages.push({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        });
        conversations[conversation_id].messages.push({
          role: 'assistant',
          content: content || "I'm not sure how to answer that.",
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.json({ 
      reply: content || "I'm not sure how to answer that.",
      conversation_id: conversation_id 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const supabaseConversations = await getAllConversationsFromSupabase();
    
    if (supabaseConversations.length > 0) {
      const conversationList = supabaseConversations.map(conv => ({
        id: conv.conversation_id,
        createdAt: conv.created_at,
        messageCount: conv.messages ? conv.messages.length : 0,
        lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null
      }));
      
      res.json({ conversations: conversationList });
    } else {
      // Fallback to in-memory storage
      const conversationList = Object.values(conversations).map(conv => ({
        id: conv.id,
        createdAt: conv.createdAt,
        messageCount: conv.messages.length,
        lastMessage: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null
      }));
      
      res.json({ conversations: conversationList });
    }
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific conversation
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get conversation from Supabase first
    let conversation = await getConversationFromSupabase(id);
    
    if (conversation) {
      // Transform Supabase data to match expected format
      const transformedConversation = {
        id: conversation.conversation_id,
        createdAt: conversation.created_at,
        messages: conversation.messages || []
      };
      res.json({ conversation: transformedConversation });
    } else {
      // Fallback to in-memory storage
      const localConversation = conversations[id];
      
      if (!localConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json({ conversation: localConversation });
    }
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new conversation
app.post('/api/conversations', async (req, res) => {
  try {
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
      // Fallback to in-memory storage
      const conversation = {
        id: conversationId,
        createdAt: new Date().toISOString(),
        messages: []
      };
      
      conversations[conversationId] = conversation;
      res.json({ conversation });
    }
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete conversation
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to delete from Supabase first
    const supabaseDeleted = await deleteConversationFromSupabase(id);
    
    if (supabaseDeleted) {
      res.json({ message: 'Conversation deleted successfully' });
    } else {
      // Fallback to in-memory storage
      if (!conversations[id]) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      delete conversations[id];
      res.json({ message: 'Conversation deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear all conversations
app.delete('/api/conversations', async (req, res) => {
  try {
    // Note: This endpoint will only clear in-memory conversations
    // For Supabase, you would need to implement a bulk delete or truncate operation
    Object.keys(conversations).forEach(key => delete conversations[key]);
    res.json({ message: 'All conversations cleared successfully (in-memory only)' });
  } catch (err) {
    console.error('Error clearing conversations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analyze lead from conversation
app.post('/api/conversations/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing OPENAI_API_KEY' });
    }

    // Get conversation from Supabase
    const conversation = await getConversationFromSupabase(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Prepare conversation transcript for analysis
    const transcript = conversation.messages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    const analysisPrompt = `Extract the following customer details from the transcript:
- Name
- Email address
- Phone number
- Industry
- Problems, needs, and goals summary
- Availability
- Whether they have booked a consultation (true/false)
- Any special notes
- Lead quality (categorize as 'good', 'ok', or 'spam')

Format the response using this JSON schema:
{
  "type": "object",
  "properties": {
    "customerName": { "type": "string" },
    "customerEmail": { "type": "string" },
    "customerPhone": { "type": "string" },
    "customerIndustry": { "type": "string" },
    "customerProblem": { "type": "string" },
    "customerAvailability": { "type": "string" },
    "customerConsultation": { "type": "boolean" },
    "specialNotes": { "type": "string" },
    "leadQuality": { "type": "string", "enum": ["good", "ok", "spam"] }
  },
  "required": ["customerName", "customerEmail", "customerProblem", "leadQuality"]
}

Conversation transcript:
${transcript}

Please analyze this conversation and return only the JSON response.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a lead analysis assistant. Extract customer information from conversation transcripts and return structured JSON data.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'OpenAI API error', detail: text });
    }

    const data = await response.json();
    const analysisResult = data?.choices?.[0]?.message?.content?.trim();
    
    if (!analysisResult) {
      return res.status(500).json({ error: 'Failed to get analysis result' });
    }

    // Parse the JSON response
    let leadData;
    try {
      // Clean up the response in case it has extra text
      let cleanResult = analysisResult.trim();
      
      // Remove any markdown code blocks if present
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      leadData = JSON.parse(cleanResult);
      
      // Validate required fields
      if (!leadData.customerName || !leadData.leadQuality) {
        console.warn('Analysis result missing required fields:', leadData);
        // Set defaults for missing required fields
        leadData.customerName = leadData.customerName || 'Not provided';
        leadData.leadQuality = leadData.leadQuality || 'ok';
      }
      
    } catch (parseError) {
      console.error('Error parsing analysis result:', parseError);
      console.error('Raw analysis result:', analysisResult);
      
      // Return a fallback analysis if parsing fails
      leadData = {
        customerName: 'Analysis failed',
        customerEmail: 'Not available',
        customerPhone: 'Not available',
        customerIndustry: 'Not specified',
        customerProblem: 'Could not extract from conversation',
        customerAvailability: 'Not specified',
        customerConsultation: false,
        specialNotes: 'Analysis parsing failed',
        leadQuality: 'ok'
      };
    }

    // Try to update conversation in Supabase with lead analysis data
    // This will work once the database columns are added
    let updatedConversation = null;
    try {
      const { data, error: updateError } = await supabase
        .from('Conversations')
        .update({ 
          lead_analysis: leadData,
          analyzed_at: new Date().toISOString()
        })
        .eq('conversation_id', id)
        .select()
        .single();

      if (updateError) {
        console.warn('Could not save analysis to database (columns may not exist yet):', updateError.message);
        // Continue without failing - the analysis still worked
      } else {
        updatedConversation = data;
      }
    } catch (dbError) {
      console.warn('Database update failed (columns may not exist yet):', dbError.message);
      // Continue without failing - the analysis still worked
    }

    res.json({ 
      success: true, 
      leadAnalysis: leadData,
      conversation: updatedConversation,
      note: updatedConversation ? 'Analysis saved to database' : 'Analysis completed (database columns not yet added)'
    });

  } catch (err) {
    console.error('Error analyzing lead:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


