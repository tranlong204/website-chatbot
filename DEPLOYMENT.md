# Vercel Deployment Guide

This guide will help you deploy your MindTek AI Assistant chatbot to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Have your API keys ready

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Login to Vercel

```bash
vercel login
```

## Step 3: Deploy to Vercel

### Option A: Deploy from Command Line
```bash
# From your project directory
vercel

# For production deployment
vercel --prod
```

### Option B: Deploy from Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

## Step 4: Set Environment Variables

In your Vercel dashboard:
1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Add the following variables:

```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Step 5: Redeploy

After adding environment variables:
```bash
vercel --prod
```

## API Endpoints

Your deployed app will have these endpoints:

- `GET /` - Main chat interface
- `GET /dashboard` - Conversation dashboard
- `POST /api/chat` - Chat API
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get specific conversation
- `DELETE /api/conversations/[id]` - Delete conversation
- `POST /api/conversations/[id]/analyze` - Analyze lead

## File Structure

```
website-chatbot/
├── api/
│   ├── _lib/
│   │   └── supabase.js          # Supabase utilities
│   ├── chat.js                  # Chat API endpoint
│   └── conversations/
│       ├── index.js             # Conversations list API
│       ├── [id].js              # Individual conversation API
│       └── [id]/
│           └── analyze.js       # Lead analysis API
├── vercel.json                  # Vercel configuration
├── index.html                   # Main chat page
├── dashboard.html               # Dashboard page
├── config.js                    # App configuration
├── script.js                    # Frontend logic
├── styles.css                   # Main styles
├── dashboard.css                # Dashboard styles
├── dashboard.js                 # Dashboard logic
└── package.json                 # Dependencies
```

## Troubleshooting

### Common Issues:

1. **Environment Variables Not Working**
   - Make sure they're set in Vercel dashboard
   - Redeploy after adding variables

2. **CORS Errors**
   - CORS headers are already configured in each API endpoint

3. **Database Connection Issues**
   - Verify Supabase URL and service role key
   - Check if your Supabase project is active

4. **OpenAI API Errors**
   - Verify your OpenAI API key is valid
   - Check if you have sufficient credits

## Local Development

To test locally with Vercel:

```bash
# Install dependencies
npm install

# Run local development server
vercel dev
```

This will start a local server that mimics Vercel's serverless environment.

## Production URL

After deployment, your app will be available at:
`https://your-project-name.vercel.app`

## Support

If you encounter issues:
1. Check Vercel function logs in the dashboard
2. Verify all environment variables are set
3. Test API endpoints individually
4. Check Supabase connection and table structure
