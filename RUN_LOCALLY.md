# Running StreamDachi Locally

This guide will help you set up and run StreamDachi on your local computer.

---

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher (recommended: Node 20)
- **PostgreSQL Database**: Version 12 or higher
- **npm** or **yarn**: For package management
- **Git**: To clone the repository

---

## 🔑 Required API Keys & Secrets

Create a `.env` file in the root directory with the following environment variables:

### Essential (Required)

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/streamdachi

# Twitch API (Required for chat integration)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Groq AI (Required for AI features)
GROQ_API_KEY=your_groq_api_key

# Session Security
SESSION_SECRET=random_secure_string_at_least_32_chars
```

### Optional (For Enhanced Features)

```bash
# OpenAI (Legacy/fallback - mostly migrated to Groq)
OPENAI_API_KEY=sk-your_openai_key

# ElevenLabs (For premium TTS - app uses free Puter.js by default)
ELEVENLABS_API_KEY=your_elevenlabs_key

# Server Port (defaults to 5000 if not set)
PORT=5000
```

---

## 🔧 Getting API Keys

### Twitch API (Required)
1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in application details:
   - **Name**: StreamDachi Local
   - **OAuth Redirect URLs**: `http://localhost:5000/api/auth/twitch/callback`
   - **Category**: Choose appropriate category
4. Copy the **Client ID** and **Client Secret**

### Groq API (Required)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it won't be shown again)

**Models Used by StreamDachi:**
- Llama 3.3 70B Versatile (default)
- Llama 3.1 8B Instant (voice rephrasing)
- Mixtral 8x7B, Gemma 2 9B (alternatives)

### OpenAI API (Optional)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create new secret key
5. Copy and save securely

**Note:** The app has migrated most AI features to Groq, so this is optional.

### ElevenLabs API (Optional)
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up for an account
3. Get your API key from the profile section

**Note:** StreamDachi uses free unlimited Puter.js TTS by default, so ElevenLabs is completely optional.

---

## 📦 Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd streamdachi
```

### 2. Install Node.js Dependencies
```bash
npm install
```

This will install:
- **81 production dependencies** including React, Express, TypeScript, Drizzle ORM, PostgreSQL drivers, Twitch integration (tmi.js), Groq SDK, Shadcn UI components, and WebSocket support
- **15 dev dependencies** including Vite, TypeScript compiler, Tailwind CSS, and build tools

### 3. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb streamdachi
```

**Linux (Ubuntu/Debian):**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb streamdachi

# Create user (optional)
sudo -u postgres createuser -P yourusername
```

**Windows:**
1. Download PostgreSQL installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer and follow setup wizard
3. Use pgAdmin or command line to create `streamdachi` database

**Option B: Use Neon Serverless (Recommended)**

This is what StreamDachi uses on Replit:

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Create a new database
4. Copy the connection string
5. Paste it into your `.env` file as `DATABASE_URL`

### 4. Initialize Database Schema

Run the following command to create all database tables:

```bash
npm run db:push
```

This creates **10 tables**:
- `user_profiles` - Twitch user tracking with VIP/mod/subscriber roles
- `user_insights` - AI-generated personality summaries
- `chat_messages` - Message history with stream session tracking
- `ai_analysis` - Sentiment and toxicity analysis results
- `ai_commands` - Custom AI command definitions
- `voice_ai_responses` - Voice transcription and AI rephrasing logs
- `authenticated_users` - OAuth authentication data
- `raids` - Incoming raid tracking
- `moderation_actions` - Twitch moderation event logs
- `settings` - Application configuration

---

## 🚀 Running the Application

### Development Mode (Recommended)

Start the development server with hot reload:

```bash
npm run dev
```

This will:
- Start Express backend server on port 5000
- Start Vite development server for frontend
- Watch for file changes and auto-reload
- Enable source maps for debugging

**Access the application at:** `http://localhost:5000`

### Production Mode

Build and run the production version:

```bash
# Build the application
npm run build

# Start production server
npm start
```

Production mode:
- Optimized frontend bundle
- No hot reload
- Better performance
- Minified assets

### Other Available Commands

```bash
# Type checking (no compilation)
npm run check

# Database schema synchronization
npm run db:push
```

---

## 🌐 Accessing the Application

Once the server is running:

- **Main Application**: `http://localhost:5000`
- **WebSocket**: `ws://localhost:5000/ws` (handled automatically by the app)
- **VIP Shoutout Browser Source**: Navigate to Settings → Browser Source to generate OBS URL

### Application Pages

The app includes 11 pages:

1. **Dashboard** (`/`) - Overview with clickable stat cards showing daily analytics
2. **Live Chat** (`/chat`) - Real-time Twitch chat monitoring
3. **Analytics** (`/analytics`) - User activity charts and sentiment trends
4. **AI Controls** (`/ai-controls`) - Custom AI command management
5. **DachiStream** (`/dachistream`) - Stream interaction and AI behavior settings
6. **VIP Management** (`/vip-management`) - Add/remove VIPs, manage shoutouts
7. **Raid Management** (`/raid-management`) - Incoming/outgoing raid functionality
8. **Monitor** (`/monitor`) - Voice AI with hands-free continuous listening
9. **Audio Settings** (`/audio-settings`) - Voice & TTS configuration
10. **Database** (`/database`) - Internal data management with CSV export
11. **Settings** (`/settings`) - General application configuration

---

## 🔐 Twitch Authentication

After starting the application:

1. Navigate to the Settings page
2. Click "Connect to Twitch" or similar OAuth button
3. You'll be redirected to Twitch to authorize the application
4. After authorization, you'll be redirected back to the app
5. The app will automatically connect to your Twitch chat

**Required Twitch Scopes:**
- Read chat messages
- Send chat messages
- View follower information
- Manage raids
- Access user information

---

## 📁 Project Structure

```
streamdachi/
├── client/                     # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── pages/             # 11 application pages
│   │   ├── components/        # Shadcn UI components
│   │   │   └── ui/           # Base UI primitives
│   │   ├── lib/              # Utilities, React Query setup
│   │   └── hooks/            # Custom React hooks
│   └── index.html
├── server/                     # Backend (Express + TypeScript)
│   ├── index.ts               # Main server entry point
│   ├── routes.ts              # API endpoint definitions
│   ├── storage.ts             # Database abstraction layer
│   ├── twitch-client.ts       # Twitch IRC integration
│   ├── twitch-oauth-service.ts # OAuth authentication
│   ├── groq-service.ts        # Groq AI service
│   ├── dachistream-service.ts # Stream interaction engine
│   ├── ai-learning-service.ts # User personality learning
│   └── vite.ts                # Vite dev server integration
├── shared/
│   └── schema.ts              # Database schema (Drizzle ORM)
├── migrations/                # Database migration files
├── package.json               # Dependencies and scripts
├── drizzle.config.ts          # Database configuration
├── vite.config.ts             # Frontend build configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── replit.md                  # Project documentation
└── .env                       # Environment variables (create this)
```

---

## ⚠️ Troubleshooting

### Database Connection Issues

**Problem:** `Error: DATABASE_URL, ensure the database is provisioned`

**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check `.env` file exists and contains `DATABASE_URL`
- Verify connection string format: `postgresql://user:password@host:port/database`
- Test connection: `psql $DATABASE_URL`

**Problem:** `relation "table_name" does not exist`

**Solution:**
- Run `npm run db:push` to create tables
- Check database schema: `psql $DATABASE_URL -c "\dt"`

### Twitch Connection Issues

**Problem:** Unable to connect to Twitch chat

**Solution:**
- Verify `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are correct
- Check OAuth redirect URI matches: `http://localhost:5000/api/auth/twitch/callback`
- Complete OAuth flow by visiting `/api/auth/twitch` in your browser
- Check server logs for authentication errors

**Problem:** `Invalid OAuth token`

**Solution:**
- Re-authenticate through the Settings page
- Token may have expired (app has automatic refresh, but check logs)

### AI Features Not Working

**Problem:** AI analysis not generating results

**Solution:**
- Verify `GROQ_API_KEY` is set correctly in `.env`
- Check Groq API quota at [console.groq.com](https://console.groq.com)
- Review server logs for API errors
- Ensure "Enable AI Analysis" is turned on in Settings

**Problem:** `Invalid API key` error

**Solution:**
- Regenerate API key from Groq console
- Ensure no extra spaces in `.env` file
- Restart server after updating `.env`

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
- Change `PORT` in `.env` file to a different port (e.g., 3000, 8080)
- Kill process using port 5000:
  ```bash
  # macOS/Linux
  lsof -ti:5000 | xargs kill
  
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

### WebSocket Connection Issues

**Problem:** Live updates not working, WebSocket errors in console

**Solution:**
- Ensure server is running on the expected port
- Check browser console for WebSocket connection errors
- Verify no proxy/firewall blocking WebSocket connections
- Try accessing `ws://localhost:5000/ws` directly

### Build Errors

**Problem:** TypeScript compilation errors

**Solution:**
- Run `npm run check` to see all type errors
- Ensure all dependencies are installed: `npm install`
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Problem:** Vite build fails

**Solution:**
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check for conflicting ports
- Update Vite if needed: `npm update vite`

---

## 📊 Resource Requirements

**Typical Resource Usage:**
- **RAM**: ~500-800MB for Node.js process
- **Disk Space**: ~300MB for `node_modules`, plus database storage
- **CPU**: Minimal baseline, spikes during AI analysis (Groq API calls)
- **Network**: Continuous connection to Twitch IRC required for chat functionality

---

## 🔄 Differences from Replit Environment

StreamDachi is designed to run identically on Replit and locally. Key differences:

### Environment Variables
- **Replit**: Automatically provides `REPLIT_DEV_DOMAIN`, `REPLIT_DB_URL`, etc.
- **Local**: Uses `localhost` fallbacks for all Replit-specific variables

### Database
- **Replit**: Uses Neon Serverless PostgreSQL (managed)
- **Local**: You manage your own PostgreSQL instance (or use Neon)

### OAuth Redirect
- **Replit**: Uses `https://{REPLIT_DEV_DOMAIN}/api/auth/twitch/callback`
- **Local**: Uses `http://localhost:5000/api/auth/twitch/callback`

### Secrets Management
- **Replit**: Uses Replit Secrets (encrypted key-value store)
- **Local**: Uses `.env` file (ensure it's in `.gitignore`)

### Port Configuration
- **Replit**: Automatically binds to port 5000 and handles HTTPS
- **Local**: You control the port via `PORT` environment variable

---

## 🛡️ Security Best Practices

### Local Development
1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Use strong SESSION_SECRET** - Generate with: `openssl rand -base64 32`
3. **Keep API keys secure** - Don't share or expose them
4. **Use HTTPS in production** - Set up SSL certificates for production deployments

### API Key Rotation
- Regularly rotate API keys, especially if exposed
- Use different keys for development and production
- Monitor API usage for unexpected activity

---

## 📝 Additional Notes

### First Time Setup Checklist
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed and running
- [ ] `.env` file created with all required variables
- [ ] Twitch application registered with correct redirect URI
- [ ] Groq API key obtained
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema created (`npm run db:push`)
- [ ] Server started (`npm run dev`)
- [ ] Twitch OAuth completed via Settings page

### Development Workflow
1. Start server: `npm run dev`
2. Make code changes
3. Server auto-restarts (backend changes)
4. Browser auto-reloads (frontend changes)
5. Test changes in browser
6. Check server logs for errors

### Useful Development Tools
- **PostgreSQL GUI**: pgAdmin, TablePlus, or DBeaver for database inspection
- **API Testing**: Postman or Insomnia for testing API endpoints
- **WebSocket Testing**: Browser DevTools → Network → WS tab
- **React DevTools**: Browser extension for React component inspection

---

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. **Check Server Logs**: Most issues show detailed error messages in terminal
2. **Check Browser Console**: Frontend errors appear in DevTools console
3. **Review Documentation**: See `replit.md` for architecture details
4. **Database Inspection**: Use `psql` or GUI tools to verify schema
5. **API Key Verification**: Double-check all keys are correctly copied

---

## 🎉 Success!

If everything is set up correctly, you should see:
- ✅ Server running on `http://localhost:5000`
- ✅ Database connection established
- ✅ Twitch connected (after OAuth)
- ✅ AI learning service started
- ✅ DachiStream service running
- ✅ WebSocket server active

Navigate to `http://localhost:5000` and start exploring StreamDachi!
