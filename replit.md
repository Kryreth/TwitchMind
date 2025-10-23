# StreamDachi - Twitch AI Integration Platform

## Overview

StreamDachi is a comprehensive Twitch integration application designed to enhance live streams with AI-powered features. It offers real-time chat monitoring, AI-driven chat analysis, user profile tracking (VIPs, moderators, subscribers), an automated shoutout system for VIPs with a 24-hour cooldown, and full per-stream chat logging. A key feature is its AI user learning engine, which provides personalized responses and configurable DachiPool settings, including ElevenLabs TTS integration. The platform boasts a dark-themed dashboard with a distinctive Twitch aesthetic, utilizing purple accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool.
**UI Component System**: Shadcn UI (New York variant) built on Radix UI primitives, featuring a dark-first design with Twitch-inspired purple accent colors (HSL 265 100% 70%).
**State Management**: TanStack Query (React Query) for server state and data fetching, integrated with WebSockets for real-time chat updates.
**Routing**: Wouter for lightweight client-side routing across eight main pages: Dashboard, Live Chat, Analytics, AI Controls, DachiStream, VIP Management, Raid Management, Monitor, and Settings.
**Styling**: Tailwind CSS with custom design tokens for theming and a custom color palette matching the Twitch aesthetic.
**Data Visualization**: Recharts library for analytics charts, including bar charts for user activity, pie charts for sentiment distribution, and line charts for sentiment trends.

### Backend Architecture

**Server Framework**: Express.js with TypeScript, providing RESTful API endpoints and a WebSocket server for real-time communication.
**Database Layer**: Drizzle ORM with Neon PostgreSQL serverless driver, utilizing a schema-first approach for type safety. Key tables include `user_profiles`, `user_insights`, `chat_messages`, `ai_analysis`, `ai_commands`, `raids`, and `settings`. Chat messages are enhanced with `userId`, `streamId`, and `eventType` for detailed logging. Settings table includes browser source tokens for OBS integration.
**Real-time Communication**: A WebSocket server using the `ws` library broadcasts new messages, AI analysis, and connection statuses.
**Service Layer**: Includes `storage.ts` for database abstraction, `openai-service.ts` (now using Groq SDK) for AI analysis, `twitch-client.ts` for Twitch chat interaction and role tracking, and `ai-learning-service.ts` for periodic AI user learning.

### Key Architectural Decisions

1.  **WebSocket for Real-time Updates**: Chosen for instant message delivery and reduced server load.
2.  **Drizzle ORM**: Selected for type-safe and efficient database operations.
3.  **Separation of Concerns**: Clear modularity between storage, service, and API layers.
4.  **AI Analysis Pipeline**: Asynchronous AI processing of messages with separate storage for analysis results.
5.  **AI Learning Engine**: Periodically analyzes user chat history to generate personality summaries, now powered by Groq AI.
6.  **Auto-Shoutout System**: Automated greetings for VIP users with a configurable 24-hour cooldown.
7.  **Per-Stream Chat Logging**: Unique `streamId` for each session enables detailed historical analysis.
8.  **DachiStream Configuration**: Comprehensive AI behavior customization, including energy levels, response modes, and ElevenLabs TTS integration.
9.  **Dark Mode First**: Prioritized design for optimal viewing during long streaming sessions.

### Feature Specifications

*   **Configurable DachiStream Interval**: Customizable cycle interval (5-60 seconds) for DachiStream operations, stored in `dachipoolCycleInterval`.
*   **Global Twitch User Search**: VIP management now supports searching all Twitch users using the Twitch Helix API, independent of active chatters.
*   **AI Provider Switch**: Migrated all AI functionalities from OpenAI to GroqCloud, utilizing Groq SDK and models like Llama 3.3 70B Versatile.
*   **Auto-Send to Chat**: AI responses can be automatically sent to Twitch chat.
*   **Real-time Countdown**: Monitor page displays a live countdown to the next DachiStream cycle via WebSockets.
*   **VIP Autocomplete with Profile Pictures**: Improved autocomplete search with Twitch profile pictures, smooth typing experience, and smart Enter key selection.
*   **Token Refresh System**: Automatic Twitch OAuth token renewal.
*   **DachiStream Page Consolidation**: Dedicated `/dachistream` page for all stream interaction and AI behavior settings, including message selection, response modes, topic filters, general configuration, shoutouts, and TTS.
*   **AI Personality System**: Introduces six personality options (Casual, Comedy, Quirky, Serious, Gaming, Professional) to customize AI response tone.
*   **VIP Management System**: Dedicated `/vip-management` page for adding/removing VIPs, viewing shoutout cooldowns, and role tracking.
*   **AI Learning Engine**: Periodic analysis (every 10 minutes) of user chat patterns to generate personality summaries for personalized AI responses.
*   **Raid Management System**: Dedicated `/raid-management` page with two-way raid functionality. View incoming raids with clickable Twitch profile links. Send outgoing raids with VIPs shown first, supports any Twitch channel via search, and executes raid commands through Twitch Helix API.
*   **VIP Shoutout Browser Source**: Toggleable browser source feature generating a static, private URL for OBS integration. Displays VIP shoutouts in real-time via WebSocket connection with animated gradient design.
*   **Voice Rephrasing System**: Continuous voice-to-text with AI rephrasing on the Monitor page. Uses Web Speech API for browser-based transcription and llama-3.1-8b-instant (fastest Groq model) for ultra-fast rephrasing. After 5 seconds of silence, AI automatically rephrases spoken text (same meaning, different words) removing stutters and filler words. Auto-pauses DachiStream while speaking to prevent interruptions.

## External Dependencies

**Twitch Integration**:
*   `tmi.js`: For connecting to Twitch IRC and listening to chat messages, including incoming raid detection.
*   Twitch Helix API: For global user search, OAuth authentication, and outgoing raid commands via POST /helix/raids endpoint.

**GroqCloud AI Integration**:
*   `groq-sdk`: Official SDK for all AI functionalities.
*   Models: Llama 3.3 70B Versatile (default), Llama 3.1 70B, Mixtral 8x7B, Llama 3.1 8B Instant, Gemma 2 9B.
*   Features: Sentiment analysis, toxicity detection, message categorization, custom AI command responses, DachiStream AI responses, user behavior learning, and speech-to-text cleanup.

**Database**:
*   Neon Serverless PostgreSQL: The primary database provider.
*   `@neondatabase/serverless`: For connecting to Neon PostgreSQL.
*   `connect-pg-simple`: For Express session storage.
*   Drizzle Kit: For database schema migrations.

**UI Component Libraries**:
*   Radix UI: Primitives for accessible UI components.
*   Heroicons: For iconography.
*   React Icons (`react-icons/si`): For specific icons like the Twitch logo.
*   Recharts: For data visualization.

**ElevenLabs**:
*   For Text-to-Speech (TTS) integration within DachiPool settings.