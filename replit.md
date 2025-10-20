# StreamDachi - Twitch AI Integration Platform

## Overview

StreamDachi is a comprehensive Twitch integration app with AI-powered features including real-time chat monitoring, AI-driven chat analysis, user profile tracking (VIPs, mods, subscribers), automatic shoutout system for VIPs with 24-hour cooldown, full per-stream chat logging, AI user learning engine for personalized responses, and configurable DachiPool settings with ElevenLabs TTS integration. Features a dark-themed dashboard with Twitch aesthetic (purple accents HSL 265 100% 70%).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool

**UI Component System**: Shadcn UI (New York variant) built on Radix UI primitives
- Provides accessible, customizable components following Material Design principles
- Dark-first design optimized for extended viewing sessions
- Twitch-inspired purple accent colors (HSL 265 100% 70%)

**State Management**:
- TanStack Query (React Query) for server state and data fetching
- WebSocket integration for real-time chat updates
- Custom hooks for WebSocket connection management (`use-websocket.ts`)

**Routing**: Wouter for client-side routing
- Lightweight alternative to React Router
- Six main pages: Dashboard, Live Chat, Analytics, AI Controls, VIP Management, Settings

**Styling**: Tailwind CSS with custom design tokens
- CSS variables for theming
- Dark mode as default with light mode support
- Custom color palette matching Twitch aesthetic

**Data Visualization**: Recharts library for analytics charts
- Bar charts for user activity
- Pie charts for sentiment distribution
- Line charts for sentiment trends over time

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- RESTful API endpoints for CRUD operations
- WebSocket server for real-time bidirectional communication
- Middleware for request logging and error handling

**Database Layer**: 
- ORM: Drizzle ORM with Neon PostgreSQL serverless driver
- Schema-first approach with TypeScript type safety
- Six main tables: user_profiles, user_insights, chat_messages, ai_analysis, ai_commands, settings
- **user_profiles**: Tracks all chat users with VIP/mod/subscriber status, shoutout timestamps, channel points
- **user_insights**: AI-generated personality summaries and behavior analysis per user
- **chat_messages**: Enhanced with userId, streamId (per-stream logging), eventType (chat/redeem/raid/sub)

**Real-time Communication**:
- WebSocket server using `ws` library
- Broadcasts new messages, AI analysis results, and connection status to all connected clients
- Maintains set of active WebSocket connections for efficient message distribution

**API Structure**:
- `/api/messages` - Chat message retrieval and creation
- `/api/analyses` - AI analysis results
- `/api/commands` - Custom AI command management
- `/api/settings` - Application configuration (now includes DachiPool settings)
- `/api/users` - User profile management (GET all, POST create/update, GET by userId)
- `/api/users/vips` - Fetch all VIP users
- `/api/users/:userId/vip` - Toggle VIP status (PATCH with isVip boolean)
- `/api/insights` - AI-generated user insights (GET all, GET by userId, POST save)
- `/ws` - WebSocket endpoint for real-time updates

**Service Layer**:
- `storage.ts`: Database abstraction layer implementing IStorage interface with user profile and insights methods
- `openai-service.ts`: AI analysis and response generation
- `twitch-client.ts`: Enhanced Twitch chat connection with role tracking (VIP/mod badges) and auto-shoutout system
- `ai-learning-service.ts`: Periodic AI user learning engine (runs every 10 minutes)

### External Dependencies

**Twitch Integration**:
- Library: `tmi.js` (Twitch Messaging Interface)
- Purpose: Connect to Twitch IRC, listen to chat messages
- Authentication: Anonymous or authenticated username
- Real-time message streaming from specified Twitch channels

**OpenAI Integration**:
- Library: `openai` official SDK
- Model: GPT-5 (latest model as of August 2025)
- Features:
  - Sentiment analysis (positive/neutral/negative with 1-5 scoring)
  - Toxicity detection
  - Message categorization
  - Custom AI command responses
- Response format: Structured JSON for consistent parsing

**Database**:
- Provider: Neon Serverless PostgreSQL
- Connection: `@neondatabase/serverless` with WebSocket support
- Session storage: `connect-pg-simple` for Express sessions
- Schema management: Drizzle Kit for migrations

**UI Component Libraries**:
- Radix UI primitives for accessible component foundations
- Heroicons for consistent iconography
- React Icons (specifically `react-icons/si` for Twitch logo)
- Recharts for data visualization

**Development Tools**:
- Replit-specific plugins for development experience
- Runtime error overlay for debugging
- Development banner and cartographer for Replit integration

**Key Architectural Decisions**:

1. **WebSocket for Real-time Updates**: Chosen over polling to reduce server load and provide instant message updates. WebSocket connections are maintained in a Set for efficient broadcast operations.

2. **Drizzle ORM**: Selected for type-safe database operations with minimal overhead. Schema-first design ensures TypeScript types are automatically generated from database schema.

3. **Separation of Concerns**: Clear separation between storage layer, service layer, and API routes. The IStorage interface allows for potential database swapping without changing business logic.

4. **AI Analysis Pipeline**: Messages are stored first, then analyzed asynchronously by OpenAI. Analysis results are stored separately and joined with messages for display, allowing for reanalysis without message duplication.

5. **AI Learning Engine**: Runs every 10 minutes using gpt-4o-mini for cost efficiency. Generates personality summaries by analyzing recent chat history per user. Summaries stored in user_insights table for personalized AI responses.

6. **Auto-Shoutout System**: VIP users receive automatic greetings on first interaction per stream. 24-hour cooldown tracked via shoutoutLastGiven timestamp. Configurable via autoShoutoutsEnabled setting.

7. **Per-Stream Chat Logging**: Each streaming session assigned unique streamId. Enables historical analysis, highlight extraction, and stream-specific insights.

8. **DachiPool Configuration**: Comprehensive AI behavior customization including energy levels (Low/Balanced/High), modes (Auto/Manual), OpenAI model selection, temperature control, ElevenLabs TTS integration, and shoutout cooldown adjustment.

9. **Dark Mode First**: Design system prioritized dark theme as primary use case, recognizing that streamers often use dashboards during long streaming sessions.

10. **Component Co-location**: UI components are organized with related logic (e.g., `ChatMessage` component includes sentiment visualization logic), reducing coupling between features.

## New Features Implemented

### VIP Management System
- **VIP Management Page** (`/vip-management`): Add/remove VIP users, view shoutout cooldown status
- **Auto-Shoutouts**: Configurable 24-hour cooldown per VIP user
- **Role Tracking**: Automatic detection of VIP/mod status from Twitch chat badges
- **Manual VIP Addition**: Add users to VIP list even if not currently in chat

### AI Learning Engine
- **Periodic Analysis**: Runs every 10 minutes analyzing user chat patterns
- **Personality Summaries**: AI-generated behavior summaries per user
- **Cost Optimization**: Uses gpt-4o-mini model for efficient learning
- **Personalized Responses**: Future AI responses can reference user insights for contextual engagement

### DachiPool Configuration (Settings Page)
- **Enable/Disable DachiPool**: Master toggle for enhanced AI features
- **Energy Levels**: Low/Balanced/High settings for AI response intensity
- **Mode Selection**: Auto (AI decides) or Manual (user-controlled)
- **Max Characters**: Configurable AI response length (100-2000 chars)
- **Shoutout Cooldown**: Adjustable from 1-168 hours (1 week)
- **OpenAI Settings**: Model selection and temperature control (0.0-1.0)
- **ElevenLabs TTS**: Toggle for text-to-speech integration with voice selection
- **Auto Shoutouts**: Master toggle for VIP greeting system

### Enhanced Chat Features
- **Stream ID Tracking**: Each streaming session gets unique identifier
- **Event Types**: Support for chat, redeems, raids, subs, and more
- **User Profiles**: Complete tracking of user interactions across streams
- **Channel Points**: Foundation for future point-based interactions (requires OAuth)

## Technical Implementation Notes

- **Twitch Role Detection**: VIP and moderator status detected from chat badges. Subscriber status and channel points require Twitch OAuth (optional future enhancement).
- **AI Model Choice**: gpt-4o-mini selected for learning service to balance cost and quality. Configurable via DachiPool settings.
- **Database Expansion**: New tables added with proper foreign key relationships (userId references across tables).
- **API Design**: RESTful endpoints following consistent patterns (GET for retrieval, POST for creation, PATCH for updates).
- **Frontend State Management**: TanStack Query cache invalidation ensures UI stays in sync after mutations.
- **Error Handling**: Comprehensive error messages and toast notifications for user feedback.