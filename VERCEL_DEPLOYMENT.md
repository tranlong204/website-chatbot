# Vercel Serverless Deployment Guide

## Overview
This project has been successfully restructured to run as Vercel serverless functions. The Express.js server has been replaced with individual API functions in the `/api` directory.

## Project Structure
```
/
├── api/                          # Vercel serverless functions
│   ├── _lib/
│   │   └── supabase.js          # Shared Supabase utilities
│   ├── chat.js                  # POST /api/chat - Main chat endpoint
│   ├── conversations/
│   │   ├── index.js             # GET/POST /api/conversations
│   │   ├── [id].js              # GET/DELETE /api/conversations/:id
│   │   └── [id]/
│   │       └── analyze.js       # POST /api/conversations/:id/analyze
│   └── test.js                  # GET /api/test - Health check
├── public/                       # Static files served by Vercel
│   ├── index.html               # Main chat interface
│   ├── dashboard.html           # Admin dashboard
│   ├── script.js                # Frontend JavaScript
│   ├── styles.css               # Main styles
│   ├── dashboard.css            # Dashboard styles
│   ├── dashboard.js             # Dashboard JavaScript
│   └── config.js                # Frontend configuration
├── vercel.json                  # Vercel configuration
├── package.json                 # Dependencies (no Express)
└── .env.example                 # Environment variables template
```

## Key Changes Made

### 1. Removed Express.js Dependencies
- Removed `express` and `dotenv` from package.json
- Deleted `server.js` (Express server)
- All API logic moved to individual Vercel functions

### 2. API Functions Structure
Each API endpoint is now a separate file in the `/api` directory:
- **`/api/chat`** - Handles chat messages and OpenAI integration
- **`/api/conversations`** - Manages conversation CRUD operations
- **`/api/conversations/[id]`** - Individual conversation operations
- **`/api/conversations/[id]/analyze`** - Lead analysis functionality
- **`/api/test`** - Health check endpoint

### 3. Static File Hosting
- All static files moved to `/public` directory
- Vercel serves these files directly
- Frontend configuration updated to use correct API endpoints

### 4. Environment Variables
- Created `.env.example` with required variables
- All environment variables work the same way in Vercel

## Deployment Instructions

### 1. Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Environment variables configured in Vercel dashboard

### 2. Environment Variables Setup
In your Vercel project dashboard, add these environment variables:
```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. Deploy to Vercel
```bash
# Install dependencies
npm install

# Deploy to Vercel
npx vercel --prod

# Or for development
npx vercel dev
```

### 4. Local Development
```bash
# Start development server
npx vercel dev

# The server will be available at http://localhost:3000
```

## API Endpoints

### Chat API
- **POST** `/api/chat`
- Handles chat messages with OpenAI integration
- Supports conversation history and context

### Conversations API
- **GET** `/api/conversations` - List all conversations
- **POST** `/api/conversations` - Create new conversation
- **GET** `/api/conversations/:id` - Get specific conversation
- **DELETE** `/api/conversations/:id` - Delete conversation

### Lead Analysis API
- **POST** `/api/conversations/:id/analyze` - Analyze conversation for lead data

### Health Check
- **GET** `/api/test` - Simple health check endpoint

## Frontend Integration
The frontend is already configured to work with the new API structure:
- All API calls use relative paths (`/api/...`)
- Configuration in `public/config.js` points to correct endpoints
- No changes needed to the frontend code

## Benefits of Vercel Serverless
1. **Automatic Scaling** - Functions scale automatically based on demand
2. **Global CDN** - Static files served from global edge locations
3. **Zero Configuration** - No server management required
4. **Cost Effective** - Pay only for actual usage
5. **Easy Deployment** - Simple `vercel` command deployment

## Troubleshooting

### Common Issues
1. **Environment Variables** - Ensure all required env vars are set in Vercel dashboard
2. **Function Timeout** - Vercel functions have a 10-second timeout for hobby plans
3. **Cold Starts** - First request may be slower due to function initialization

### Debugging
- Check Vercel function logs in the dashboard
- Use `npx vercel dev` for local debugging
- Test individual API endpoints with curl or Postman

## Migration Complete ✅
The application has been successfully migrated from Express.js to Vercel serverless functions. All functionality is preserved and the application is ready for deployment.
