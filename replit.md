# Twitch AI Dashboard

## Overview

A real-time Twitch chat monitoring and analytics dashboard powered by OpenAI's GPT-5 for sentiment analysis, toxicity detection, and automated chat responses. The application provides streamers with AI-driven insights into their chat activity, moderation tools, and customizable AI commands for audience engagement.

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
- Five main pages: Dashboard, Live Chat, Analytics, AI Controls, Settings

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
- Four main tables: chat_messages, ai_analysis, ai_commands, settings

**Real-time Communication**:
- WebSocket server using `ws` library
- Broadcasts new messages, AI analysis results, and connection status to all connected clients
- Maintains set of active WebSocket connections for efficient message distribution

**API Structure**:
- `/api/messages` - Chat message retrieval and creation
- `/api/analyses` - AI analysis results
- `/api/commands` - Custom AI command management
- `/api/settings` - Application configuration
- `/ws` - WebSocket endpoint for real-time updates

**Service Layer**:
- `storage.ts`: Database abstraction layer implementing IStorage interface
- `openai-service.ts`: AI analysis and response generation
- `twitch-client.ts`: Twitch chat connection and message handling

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

5. **Dark Mode First**: Design system prioritized dark theme as primary use case, recognizing that streamers often use dashboards during long streaming sessions.

6. **Component Co-location**: UI components are organized with related logic (e.g., `ChatMessage` component includes sentiment visualization logic), reducing coupling between features.