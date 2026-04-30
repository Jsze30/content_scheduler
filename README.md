# Content Scheduler

An AI-powered, multi-tenant content scheduling platform built for creators to draft, generate, queue, and automate their social media posts (currently tailored for Twitter/X).

## Features

- **AI-Powered Generation**: Brainstorm and generate content directly within the app using an AI assistant (powered by Anthropic Claude). The AI leverages personal context—your tone, profile details, and content pillars—to write posts that actually sound like you.
- **Smart Queueing & Calendar View**: Visually manage your upcoming content, drag drafts around, and seamlessly organize your posting schedule.
- **Automated Publishing**: Background workers securely handle publishing to connected X/Twitter accounts at your scheduled times without needing manual intervention.
- **Multi-Tenant Architecture**: Robust user authentication via Email Magic Links. Data isolation is strictly enforced via Row-Level Security (RLS) so users only see and manage their own posts, context files, and integrations.

## Technical Architecture

This application leverages a modern, full-stack serverless architecture:

### Frontend

- **Framework**: React 19 (Single Page Application)
- **Build Tool**: Vite for fast bundling and HMR
- **Styling**: Tailwind CSS v4
- **AI UI**: Vercel AI SDK (`@ai-sdk/react`) for fluid, chunked chat streaming interfaces

### Backend & API

- **Compute**: Vercel Serverless Functions (`/api/*`). Perfect for lightweight, on-demand compute handling auth flows, background jobs, and AI API proxying.
- **Database & Auth**: Supabase (PostgreSQL). Stores users, posts, personalized context files, and OAuth tokens. Uses Supabase Auth (Magic Links) and enforces Row-Level Security (RLS).
- **AI Inference**: `@ai-sdk/anthropic` connecting to Anthropic's API for intelligent text generation.
- **Social Integration**: `twitter-api-v2` handles the entire X API lifecycle—including OAuth2 callback parsing, token refreshment, and posting.

## Project Structure

```text
├── api/                  # Vercel Serverless Backend Functions
│   ├── auth/             # Twitter/X OAuth2 routes (login, callback, status, logout)
│   ├── ai.js             # Streams LLM chat responses with injected user context
│   ├── cron.js           # Automated cron job for pushing scheduled posts
│   └── boost-worker.js   # Background worker scripts
├── context/              # Defaults markdown templates for AI context
├── src/                  # React Frontend Code
│   ├── components/       # Core UI views (Composer, Queue, Calendar)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Client wrappers (Supabase)
│   └── utils/            # Helper functions for scheduling & parsing
```

## Setup & Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env.local` file at the root with your API keys:

   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ANTHROPIC_API_KEY=...
   X_CLIENT_ID=...
   X_CLIENT_SECRET=...
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Deploying**:
   Push to Vercel. Setup serverless functions natively.
