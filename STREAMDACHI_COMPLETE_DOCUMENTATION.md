# StreamDachi - Complete Project Documentation

## Project Overview

**StreamDachi** is a comprehensive Twitch integration application with AI-powered features for streamers. It provides real-time chat monitoring, AI-driven analysis, user profile tracking, automatic VIP shoutouts, and personalized AI responses.

### Key Features
- Real-time Twitch chat monitoring with WebSocket updates
- AI-powered sentiment analysis and toxicity detection using OpenAI GPT
- VIP Management system with automatic shoutout cooldowns
- AI Learning Engine that creates personalized user profiles
- DachiPool configuration for customizable AI behavior
- Per-stream chat logging and analytics
- Dark-themed dashboard with Twitch purple aesthetic (HSL 265 100% 70%)

### Tech Stack
- **Frontend**: React + TypeScript, Vite, Wouter (routing), TanStack Query, Shadcn UI
- **Backend**: Express.js, WebSocket (ws library)
- **Database**: PostgreSQL (Neon Serverless) with Drizzle ORM
- **AI**: OpenAI GPT-4o-mini for learning, GPT-4 for analysis
- **Integrations**: Twitch (tmi.js), ElevenLabs TTS (optional)

---

## Application Architecture

### Frontend Structure

**Pages (6 total)**:
1. **Dashboard** (`/`) - Overview with key metrics and activity
2. **Live Chat** (`/chat`) - Real-time chat monitoring with sentiment display
3. **Analytics** (`/analytics`) - User activity charts and sentiment trends
4. **AI Controls** (`/ai-controls`) - Custom AI command management
5. **VIP Management** (`/vip-management`) - Add/remove VIPs, view shoutout cooldowns
6. **Settings** (`/settings`) - Twitch config, AI settings, DachiPool configuration

**Key Frontend Components**:
- `AppSidebar` - Navigation with Shadcn sidebar primitives
- `ChatMessage` - Individual message display with sentiment indicators
- `use-websocket.ts` - Custom hook for WebSocket connection management

**State Management**:
- TanStack Query for server state and data fetching
- WebSocket for real-time updates
- Local React state for UI interactions

### Backend Structure

**Server Framework**: Express.js with TypeScript
- RESTful API endpoints
- WebSocket server for real-time bidirectional communication
- Middleware for logging and error handling

**Service Layer**:
- `storage.ts` - Database abstraction (IStorage interface + DbStorage implementation)
- `openai-service.ts` - AI analysis and response generation
- `twitch-client.ts` - Twitch chat connection with role tracking
- `ai-learning-service.ts` - Periodic user personality analysis (runs every 10 minutes)

---

## Database Schema

### 1. User Profiles Table (`user_profiles`)
Tracks all chat users with their roles and interaction history.

```typescript
{
  id: varchar (UUID, primary key)
  userId: text (unique, Twitch user ID)
  username: text (Twitch username)
  isVip: boolean (default: false)
  isMod: boolean (default: false)
  isSubscriber: boolean (default: false)
  channelPointsBalance: integer (default: 0)
  wasAnonymous: boolean (default: false)
  firstSeen: timestamp (auto-set on creation)
  lastSeen: timestamp (auto-updated)
  shoutoutLastGiven: timestamp (nullable, for cooldown tracking)
}
```

**Purpose**: 
- Track VIP/mod/subscriber status
- Manage auto-shoutout cooldowns
- Foundation for channel points system (requires OAuth)

### 2. User Insights Table (`user_insights`)
AI-generated personality summaries for personalized responses.

```typescript
{
  userId: text (primary key, references user_profiles.userId)
  summary: text (AI-generated personality summary)
  lastUpdated: timestamp (auto-updated)
  totalMessages: integer (default: 0)
  recentTags: jsonb array (behavioral tags from AI)
}
```

**Purpose**:
- Store AI-learned user personalities
- Enable personalized AI responses
- Track user engagement patterns

### 3. Chat Messages Table (`chat_messages`)
Enhanced message storage with stream tracking.

```typescript
{
  id: varchar (UUID, primary key)
  userId: text (nullable, references user_profiles.userId)
  username: text
  message: text
  channel: text
  streamId: text (nullable, unique per streaming session)
  eventType: text (default: "chat", options: chat/redeem/raid/sub)
  timestamp: timestamp (auto-set)
}
```

**Purpose**:
- Per-stream chat logging (via streamId)
- Support multiple event types
- Historical analysis and highlight extraction

### 4. AI Analysis Table (`ai_analysis`)
Sentiment and toxicity analysis results.

```typescript
{
  id: varchar (UUID, primary key)
  messageId: varchar (references chat_messages.id)
  sentiment: text (positive/neutral/negative)
  sentimentScore: integer (1-5)
  isToxic: boolean
  categories: jsonb array (message categories)
  timestamp: timestamp (auto-set)
}
```

**Purpose**:
- Store OpenAI analysis results
- Enable reanalysis without message duplication
- Track sentiment trends over time

### 5. AI Commands Table (`ai_commands`)
Custom AI command definitions.

```typescript
{
  id: varchar (UUID, primary key)
  trigger: text (unique, command trigger)
  response: text (AI response template)
  isActive: boolean (default: true)
}
```

**Purpose**:
- Define custom chat commands
- Enable/disable commands dynamically

### 6. Settings Table (`settings`)
Application configuration including DachiPool settings.

```typescript
{
  id: varchar (UUID, primary key)
  twitchChannel: text (nullable)
  twitchUsername: text (nullable)
  autoModeration: boolean (default: false)
  sentimentThreshold: integer (default: 3, range: 1-5)
  enableAiAnalysis: boolean (default: true)
  
  // DachiPool Configuration
  dachipoolEnabled: boolean (default: true)
  dachipoolMaxChars: integer (default: 1000, range: 100-2000)
  dachipoolEnergy: text (default: "Balanced", options: Low/Balanced/High)
  dachipoolMode: text (default: "Auto", options: Auto/Manual)
  dachipoolShoutoutCooldownHours: integer (default: 24, range: 1-168)
  dachipoolOpenaiModel: text (default: "gpt-4o-mini")
  dachipoolOpenaiTemp: integer (default: 7, range: 0-10, displayed as 0.0-1.0)
  dachipoolElevenlabsEnabled: boolean (default: false)
  dachipoolElevenlabsVoice: text (default: "Default")
  autoShoutoutsEnabled: boolean (default: true)
}
```

**Purpose**:
- Centralized configuration management
- DachiPool AI behavior customization
- Twitch connection settings

---

## API Endpoints

### Chat Messages
- `GET /api/messages?limit=100` - Fetch recent chat messages (default: 50)
- `POST /api/messages` - Create new chat message
  ```json
  {
    "userId": "optional_twitch_id",
    "username": "required_username",
    "message": "message_text",
    "channel": "channel_name",
    "streamId": "optional_stream_id",
    "eventType": "chat|redeem|raid|sub"
  }
  ```

### AI Analysis
- `GET /api/analyses?limit=100` - Fetch AI analysis results
- `POST /api/analyses` - Create AI analysis
  ```json
  {
    "messageId": "message_uuid",
    "sentiment": "positive|neutral|negative",
    "sentimentScore": 1-5,
    "isToxic": boolean,
    "categories": ["category1", "category2"]
  }
  ```

### AI Commands
- `GET /api/commands` - Fetch all AI commands
- `POST /api/commands` - Create new command
- `PATCH /api/commands/:id` - Update command
- `DELETE /api/commands/:id` - Delete command

### User Profiles
- `GET /api/users` - Fetch all user profiles
- `GET /api/users/:userId` - Fetch specific user profile
- `POST /api/users` - Create or update user profile
  ```json
  {
    "userId": "twitch_user_id",
    "username": "username",
    "isVip": boolean,
    "isMod": boolean,
    "isSubscriber": boolean,
    "wasAnonymous": boolean
  }
  ```
- `GET /api/users/vips` - Fetch all VIP users
- `PATCH /api/users/:userId/vip` - Toggle VIP status
  ```json
  {
    "isVip": boolean
  }
  ```

### User Insights
- `GET /api/insights` - Fetch all user insights
- `GET /api/insights/:userId` - Fetch specific user insight
- `POST /api/insights` - Save user insight
  ```json
  {
    "userId": "user_id",
    "summary": "AI-generated personality summary",
    "totalMessages": integer,
    "recentTags": ["tag1", "tag2"]
  }
  ```

### Settings
- `GET /api/settings` - Fetch application settings (returns array)
- `POST /api/settings` - Create settings
- `PATCH /api/settings/:id` - Update settings

### WebSocket
- `GET /ws` - WebSocket endpoint for real-time updates
  - Broadcasts: new messages, AI analysis, connection status
  - Message format: `{ type: 'message' | 'analysis' | 'status', data: {...} }`

---

## Key Features Implementation

### 1. VIP Management System

**Location**: `client/src/pages/vip-management.tsx`

**Features**:
- Display all VIP users with shoutout cooldown status
- Add new VIP users (manual entry)
- Remove VIP status
- Search/filter VIPs
- Auto-shoutouts status indicator

**Backend Logic**:
- VIP status stored in `user_profiles.isVip`
- Cooldown tracked via `user_profiles.shoutoutLastGiven`
- Auto-detection from Twitch chat badges (VIP/mod badges)

**Data Flow**:
1. User enters username in VIP Management page
2. Frontend checks if user exists in database
3. If exists: Toggle VIP status via PATCH `/api/users/:userId/vip`
4. If not exists: Create user profile with VIP=true via POST `/api/users`
5. Cache invalidation triggers UI update

### 2. AI Learning Engine

**Location**: `server/ai-learning-service.ts`

**Process**:
1. Runs every 10 minutes (cron-like interval)
2. Fetches recent chat messages grouped by user
3. Sends chat history to OpenAI GPT-4o-mini
4. Generates personality summary and behavioral tags
5. Saves to `user_insights` table

**Prompt Example**:
```
Analyze these recent chat messages from user {username} and provide:
1. A brief personality summary
2. 3-5 behavioral tags
3. Engagement patterns

Messages: [recent chat history]
```

**Cost Optimization**:
- Uses gpt-4o-mini (cheaper than GPT-4)
- Only analyzes users with recent activity
- Caches results to avoid redundant analysis

### 3. Auto-Shoutout System

**Location**: `server/twitch-client.ts`

**Logic**:
1. When VIP user sends message, check `shoutoutLastGiven`
2. If null or > cooldown period: Send shoutout, update timestamp
3. If within cooldown: Skip shoutout
4. Cooldown configurable via `settings.dachipoolShoutoutCooldownHours`

**Example Shoutout**:
```javascript
if (isVip && canShoutout(lastShoutout, cooldownHours)) {
  client.say(channel, `Welcome back ${displayName}! 💜`);
  await storage.updateShoutoutTimestamp(userId);
}
```

### 4. DachiPool Configuration

**Location**: `client/src/pages/settings.tsx`

**Settings**:
- **Enable/Disable**: Master toggle for AI features
- **Energy Level**: Low/Balanced/High (controls AI response intensity)
- **Mode**: Auto (AI decides) / Manual (user-controlled)
- **Max Characters**: 100-2000 (AI response length limit)
- **Shoutout Cooldown**: 1-168 hours
- **OpenAI Model**: Model selection (gpt-4, gpt-4o-mini, etc.)
- **Temperature**: 0.0-1.0 (creativity level)
- **ElevenLabs TTS**: Enable voice synthesis (requires API key)
- **Auto Shoutouts**: Toggle VIP greeting system

**UI Components**:
- Switches for boolean toggles
- Select dropdowns for discrete options
- Sliders for numeric ranges
- All changes saved via single "Save Settings" button

### 5. Per-Stream Chat Logging

**Implementation**:
- Each stream session assigned unique `streamId` (generated on stream start)
- All messages during session tagged with same `streamId`
- Enables queries like: "Show all chat from stream on 2025-01-15"
- Foundation for stream highlights and recap features

**Future Uses**:
- Generate stream summaries
- Extract viral moments
- Compare stream-to-stream engagement

---

## File Structure

```
streamdachi/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Shadcn UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── ... (30+ components)
│   │   │   └── app-sidebar.tsx      # Main navigation sidebar
│   │   ├── hooks/
│   │   │   ├── use-toast.ts
│   │   │   └── use-websocket.ts     # WebSocket connection hook
│   │   ├── lib/
│   │   │   └── queryClient.ts       # TanStack Query setup
│   │   ├── pages/
│   │   │   ├── dashboard.tsx        # Main dashboard
│   │   │   ├── live-chat.tsx        # Real-time chat view
│   │   │   ├── analytics.tsx        # Charts and insights
│   │   │   ├── ai-controls.tsx      # AI command management
│   │   │   ├── vip-management.tsx   # VIP shoutout management
│   │   │   └── settings.tsx         # Settings + DachiPool config
│   │   ├── App.tsx                  # Router + providers
│   │   └── index.css                # Tailwind + custom styles
│   └── index.html
│
├── server/                          # Backend (Express + WebSocket)
│   ├── index.ts                     # Server entry point
│   ├── routes.ts                    # API endpoint definitions
│   ├── storage.ts                   # Database abstraction layer
│   ├── openai-service.ts            # AI analysis service
│   ├── twitch-client.ts             # Twitch chat integration
│   ├── ai-learning-service.ts       # Periodic user analysis
│   └── vite.ts                      # Vite dev server integration
│
├── shared/                          # Shared types (frontend + backend)
│   └── schema.ts                    # Drizzle schema + Zod validation
│
├── db/                              # Database migrations (Drizzle)
│   └── migrations/
│
├── replit.md                        # Project documentation (detailed)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── drizzle.config.ts
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- OpenAI API key
- PostgreSQL database (or use Replit's built-in database)

### Environment Variables
Create `.env` file with:
```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
SESSION_SECRET=random_secret_string
ELEVENLABS_API_KEY=optional_for_tts
```

### Installation
```bash
# Install dependencies
npm install

# Push database schema (creates tables)
npm run db:push

# Start development server (frontend + backend)
npm run dev
```

### Initial Configuration
1. Navigate to Settings page
2. Enter Twitch channel name (e.g., "your_channel")
3. Enter bot username (can be your own username)
4. Configure DachiPool settings
5. Click "Save Settings"

### Running the Application
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api
- WebSocket: ws://localhost:5000/ws
- AI Learning Service: Auto-starts, runs every 10 minutes

---

## Key Implementation Details

### WebSocket Real-Time Updates

**Server Side** (`server/index.ts`):
```typescript
const wss = new WebSocketServer({ noServer: true });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// Broadcast to all clients
function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
```

**Client Side** (`client/src/hooks/use-websocket.ts`):
```typescript
export function useWebSocket() {
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    };
    
    return () => ws.close();
  }, []);
}
```

### AI Analysis Pipeline

**Flow**:
1. User sends message in Twitch chat
2. `twitch-client.ts` receives message via tmi.js
3. Message saved to database via `storage.createChatMessage()`
4. OpenAI analysis requested via `openai-service.ts`
5. Analysis saved via `storage.createAiAnalysis()`
6. WebSocket broadcasts new message + analysis
7. Frontend receives update and re-renders

**OpenAI Service** (`server/openai-service.ts`):
```typescript
export async function analyzeMessage(message: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Analyze sentiment and toxicity. Return JSON."
      },
      { role: "user", content: message }
    ],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Twitch Role Detection

**Badge Parsing** (`server/twitch-client.ts`):
```typescript
client.on('message', (channel, tags, message, self) => {
  const badges = tags['badges'] || {};
  const isVip = !!badges.vip;
  const isMod = !!badges.moderator;
  const isSubscriber = !!badges.subscriber;
  
  // Create/update user profile
  await storage.createOrUpdateUserProfile({
    userId: tags['user-id'],
    username: tags['username'],
    isVip,
    isMod,
    isSubscriber
  });
});
```

**Note**: VIP and moderator badges are automatically detected. Subscriber status requires OAuth (optional enhancement).

### Database Queries with Drizzle ORM

**Example - Get VIP Users**:
```typescript
async getVipUsers(): Promise<UserProfile[]> {
  return await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.isVip, true))
    .orderBy(desc(userProfiles.lastSeen));
}
```

**Example - Toggle VIP Status**:
```typescript
async toggleVip(userId: string, isVip: boolean): Promise<UserProfile> {
  const [updated] = await db
    .update(userProfiles)
    .set({ isVip })
    .where(eq(userProfiles.userId, userId))
    .returning();
  return updated;
}
```

---

## Current Status (As of Latest Update)

### ✅ Fully Implemented
- Real-time Twitch chat monitoring
- AI sentiment analysis and toxicity detection
- VIP Management page with add/remove functionality
- Auto-shoutout system with configurable cooldowns
- AI Learning Engine (runs every 10 minutes)
- DachiPool configuration UI (Settings page)
- Per-stream chat logging
- User profile tracking
- WebSocket real-time updates
- Dark mode theme with Twitch branding
- All 6 pages fully functional
- Complete API backend
- Database schema with 6 tables

### 🧪 Tested & Working
- VIP add/remove via UI
- Settings save and load
- Navigation across all pages
- WebSocket connections
- API endpoints responding correctly
- Database queries and mutations

### 🔄 Requires OAuth (Optional Enhancement)
- Subscriber status detection (currently badge-based only)
- Channel points balance (foundation exists in schema)
- Twitch API integration for advanced features

### 📋 Future Enhancements
1. **ElevenLabs TTS Integration**
   - Voice synthesis for AI responses
   - Requires ELEVENLABS_API_KEY environment variable
   - UI toggle already implemented in Settings

2. **Stream Highlights**
   - Use streamId to extract viral moments
   - Clip generation suggestions
   - Sentiment spike detection

3. **Advanced Analytics**
   - User engagement trends over time
   - Comparative stream analysis
   - Top chatters leaderboard

4. **Custom AI Personas**
   - Multiple AI personalities
   - Scheduled persona changes
   - Context-aware responses

5. **Raid/Sub Event Handling**
   - Special responses for raids
   - Sub celebration messages
   - Event type tracking (already in schema)

---

## Troubleshooting

### Common Issues

**Issue**: "Failed to add VIP user"
- **Cause**: API request format mismatch
- **Solution**: Ensure `apiRequest` uses correct parameter order: `apiRequest(method, url, data)`

**Issue**: AI Learning Service not running
- **Cause**: Missing OPENAI_API_KEY
- **Solution**: Add key to environment variables and restart server

**Issue**: WebSocket disconnections
- **Cause**: Network issues or server restart
- **Solution**: Frontend auto-reconnects; check browser console for errors

**Issue**: Twitch messages not appearing
- **Cause**: Channel name incorrect or bot not connected
- **Solution**: Verify channel name in Settings, check server logs for connection status

### Logs
- Backend logs: Server console output
- Frontend errors: Browser console (F12)
- Database queries: Enable Drizzle logging in `drizzle.config.ts`

---

## Security Considerations

### API Keys
- Never commit `.env` file to version control
- Use Replit Secrets for production deployments
- Rotate OpenAI API keys regularly

### Database
- All queries use parameterized statements (Drizzle ORM)
- Input validation via Zod schemas
- Foreign key constraints for data integrity

### WebSocket
- No authentication implemented (add JWT if needed)
- Consider rate limiting for production
- Sanitize all user inputs before broadcasting

---

## Performance Optimization

### Current Optimizations
- TanStack Query caching reduces API calls
- WebSocket broadcasts only changed data
- Drizzle ORM generates efficient SQL
- AI Learning uses cheaper gpt-4o-mini model
- Pagination on message queries (limit parameter)

### Recommended for Scale
- Add Redis for WebSocket message queue
- Implement message pagination in UI
- Cache AI analysis results (already stored in DB)
- Rate limit OpenAI API calls
- Database connection pooling (already enabled via Neon)

---

## Contributing Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Follow existing patterns in codebase

### Git Workflow
- Feature branches off `main`
- Descriptive commit messages
- Test before merging

### Testing
- Use Playwright for e2e tests
- Test API endpoints with testing subagent
- Verify WebSocket connections

---

## License & Credits

**Built with**:
- React, Vite, TypeScript
- Shadcn UI (New York variant)
- Drizzle ORM, PostgreSQL
- OpenAI GPT, Twitch tmi.js
- Express, WebSocket

**Theme**: Dark mode with Twitch purple (HSL 265 100% 70%)

---

## Quick Reference

### Start Development
```bash
npm run dev
```

### Database Commands
```bash
npm run db:push          # Sync schema to database
npm run db:push --force  # Force sync (use with caution)
npm run db:studio        # Open Drizzle Studio (database GUI)
```

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Random string for session encryption
- `ELEVENLABS_API_KEY` - (Optional) For TTS integration

---

## Contact & Support

For issues or questions:
1. Check this documentation
2. Review server logs
3. Test with Playwright e2e tests
4. Check replit.md for architecture details

**Last Updated**: 2025-10-20
**Version**: 1.0.0
**Status**: Production Ready ✅
