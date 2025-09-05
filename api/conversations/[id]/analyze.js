import fetch from 'node-fetch';
import { getConversationFromSupabase, supabase } from '../../_lib/supabase.js';

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
    const { id } = req.query;
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
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
      } else {
        updatedConversation = data;
      }
    } catch (dbError) {
      console.warn('Database update failed (columns may not exist yet):', dbError.message);
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
}
