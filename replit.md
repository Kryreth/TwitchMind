# StreamDachi - Twitch AI Integration Platform

## Overview

StreamDachi is a comprehensive Twitch integration application designed to enhance live streams with AI-powered voice features. It offers real-time chat monitoring, AI-driven chat analysis, user profile tracking (VIPs, moderators, subscribers), an automated shoutout system for VIPs with a 24-hour cooldown, and full per-stream chat logging. A key feature is its AI user learning engine, which provides personalized responses and configurable StreamDachi settings. The platform includes a hands-free voice AI system with continuous listening, automatic AI rephrasing using Groq, and unlimited free high-quality TTS using Puter.js (Neural/Generative engines). The VIP Management page includes a Test Shoutout feature that allows streamers to preview a VIP's latest Twitch clip before going live. 

The dashboard features a "Today" vs "What You Missed" tab system for tracking daily vs offline activity, with toggleable stat cards (Total Messages, AI Analyzed, Active Users, Moderation Actions) and stream session management. A dedicated Database Viewer provides comprehensive internal data management with searchable user tables, chat messages, AI analysis, and CSV export capabilities. The platform boasts a dark-themed dashboard with a distinctive Twitch aesthetic, utilizing purple accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool.
**UI Component System**: Shadcn UI (New York variant) built on Radix UI primitives, featuring a dark-first design with Twitch-inspired purple accent colors (HSL 265 100% 70%).
**State Management**: TanStack Query (React Query) for server state and data fetching, integrated with WebSockets for real-time chat updates.
**Routing**: Wouter for lightweight client-side routing across ten main pages: Dashboard, Live Chat, Analytics, AI Controls, DachiStream, VIP Management, Raid Management, Monitor, Audio Settings, Database, and Settings.
**Styling**: Tailwind CSS with custom design tokens for theming and a custom color palette matching the Twitch aesthetic.
**Data Visualization**: Recharts library for analytics charts, including bar charts for user activity, pie charts for sentiment distribution, and line charts for sentiment trends.

### Backend Architecture

**Server Framework**: Express.js with TypeScript, providing RESTful API endpoints and a WebSocket server for real-time communication.
**Database Layer**: Drizzle ORM with Neon PostgreSQL serverless driver, utilizing a schema-first approach for type safety. Key tables include `user_profiles`, `user_insights`, `chat_messages`, `ai_analysis`, `ai_commands`, `raids`, `voice_ai_responses`, `moderation_actions`, and `settings`. Chat messages are enhanced with `userId`, `streamId`, and `eventType` for detailed logging. Settings table includes browser source tokens, stream session timestamps, and dashboard card visibility toggles. Voice AI responses table logs all original and rephrased text with timestamps and speech status. Moderation actions table tracks all Twitch moderation events (bans, timeouts, deletions) with action type, target user, moderator, reason, and duration.
**Real-time Communication**: A WebSocket server using the `ws` library broadcasts new messages, AI analysis, and connection statuses.
**Service Layer**: Includes `storage.ts` for database abstraction, `groq-service.ts` for AI analysis and rephrasing, `twitch-client.ts` for Twitch chat interaction and role tracking, and `ai-learning-service.ts` for periodic AI user learning.

### Key Architectural Decisions

1.  **WebSocket for Real-time Updates**: Chosen for instant message delivery and reduced server load.
2.  **Drizzle ORM**: Selected for type-safe and efficient database operations.
3.  **Separation of Concerns**: Clear modularity between storage, service, and API layers.
4.  **AI Analysis Pipeline**: Asynchronous AI processing of messages with separate storage for analysis results.
5.  **AI Learning Engine**: Periodically analyzes user chat history to generate personality summaries, now powered by Groq AI.
6.  **Auto-Shoutout System**: Automated greetings for VIP users with a configurable 24-hour cooldown.
7.  **Per-Stream Chat Logging**: Unique `streamId` for each session enables detailed historical analysis.
8.  **StreamDachi Voice AI**: Comprehensive AI behavior customization with hands-free continuous voice recognition, automatic AI rephrasing via Groq, and unlimited free Neural/Generative TTS via Puter.js.
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
*   **VIP Management System**: Dedicated `/vip-management` page for adding/removing VIPs with enhanced UI. Features include:
    *   Profile pictures fetched from Twitch API
    *   Real-time follower count display
    *   Live streaming status with viewer count and current game
    *   Shoutout cooldown management with fixed options (1h, 2h, 4h, 12h, 24h, 48h, 72h, 1 week)
    *   Test Shoutout feature that fetches and displays VIP's latest Twitch clip with proper embed formatting and autoplay
    *   Role tracking (Moderator, Subscriber badges)
*   **AI Learning Engine**: Periodic analysis (every 10 minutes) of user chat patterns to generate personality summaries for personalized AI responses.
*   **Test Shoutout Feature**: Click any VIP's "Test" button to fetch and preview their latest Twitch clip in a modal, allowing streamers to test the shoutout system before going live.
*   **Raid Management System**: Dedicated `/raid-management` page with two-way raid functionality. View incoming raids with clickable Twitch profile links. Send outgoing raids with VIPs shown first, supports any Twitch channel via search, and executes raid commands through Twitch Helix API.
*   **VIP Shoutout Browser Source**: Toggleable browser source feature generating a static, private URL for OBS integration. Displays VIP shoutouts in real-time via WebSocket connection with animated gradient design.
*   **StreamDachi Voice AI System**: Hands-free continuous voice-to-text with automatic AI rephrasing on the Monitor page. Uses Web Speech API for browser-based transcription and llama-3.1-8b-instant (fastest Groq model) for ultra-fast rephrasing. Features continuous listening with auto-restart, transcript accumulation, and automatic AI rephrasing after 5 seconds of silence detection. Auto-pauses DachiStream while speaking to prevent interruptions. All voice AI responses are logged to database with timestamps for review.
*   **Dual Audio System (Puter.js + Web Speech API)**: Two completely independent audio systems on the Monitor page:
    *   **AI Voice TTS (Puter.js - Free Unlimited)**: Automatically speaks the AI-rephrased text aloud when enabled using Puter.js Neural or Generative engines (AWS Polly backend). Provides high-quality, human-like voices with three quality levels: Standard, Neural, and Generative. Activates after 5 seconds of silence to provide instant audio feedback of the rephrased message. Volume adjustable 0%-100%.
    *   **VIP Shoutout Audio (Web Speech API)**: Speaks VIP greeting messages when VIPs join chat using browser-native TTS (separate from AI voice system). Shares voice selection, pitch (0.5x-2.0x), speed (0.5x-2.0x), and volume (0%-100%) settings with AI voice system.
    *   Both systems are completely independent with separate enable/disable toggles.
*   **Clean Live Chat Experience**: Live Chat page displays authentic Twitch messages without AI analysis clutter. Sentiment badges and colored borders removed from chat view for cleaner, more familiar Twitch-like experience.
*   **Analytics-Focused Sentiment Display**: All sentiment analysis (badges, scores, charts) moved exclusively to Analytics tab, keeping data insights separate from live chat monitoring.
*   **Enhanced Dashboard with Session Tracking**: Dashboard features a two-tab system ("Today" vs "What You Missed") that filters all stats and charts based on stream session timestamps. "Today" shows activity since the stream session started, while "What You Missed" shows offline activity. Stream sessions can be manually reset via "Start New Stream Session" button, updating the streamSessionStarted timestamp in settings.
*   **Clickable Dashboard Stat Cards**: All four stat cards (Total Messages, AI Analyzed, Active Users, Moderation Actions) are interactive and clickable. Clicking any card opens a detailed modal showing in-depth statistics: Messages modal displays last 20 messages with timestamps; AI Analyzed modal shows sentiment breakdown and category distribution; Active Users modal ranks users by message count; Moderation Actions modal lists all mod events with details. Modal content automatically filters based on active tab (Today/What You Missed).
*   **Database Viewer Page**: Comprehensive internal data management interface at `/database` featuring searchable user tables with profile pictures, role badges (VIP/Mod/Sub), message counts, average sentiment scores, last message preview, and last seen timestamps. Includes three stat cards showing total users, total messages, and AI analyses. Supports role-based filtering (All/VIPs/Mods/Subs) and CSV export functionality for data analysis.
*   **Moderation Actions Tracking**: Full logging system for Twitch moderation events including bans, timeouts, message deletions, and chat clears. Tracks action type, target user, moderator, reason, duration, and timestamp. Integrated into dashboard stat cards and database viewer.
*   **Audio Settings Page**: Dedicated `/audio-settings` page consolidating all voice and audio configuration:
    *   Voice & TTS settings (Puter.js voice selection, AI voice toggle, max voice length)
    *   Microphone settings (mic mode, speech cleanup, fallback options, cooldown between replies)
    *   Separate from general settings for better organization

## External Dependencies

**Twitch Integration**:
*   `tmi.js`: For connecting to Twitch IRC and listening to chat messages, including incoming raid detection.
*   Twitch Helix API: Comprehensive integration including:
    *   Global user search with profile pictures
    *   OAuth authentication with automatic token refresh
    *   Outgoing raid commands via POST /helix/raids endpoint
    *   Follower count fetching via /helix/channels/followers endpoint
    *   Live stream status checking via /helix/streams endpoint
    *   Clip fetching for Test Shoutout feature via /helix/clips endpoint

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

**Puter.js**:
*   Free unlimited Text-to-Speech (TTS) with Neural and Generative quality engines (AWS Polly backend).
*   Three quality tiers: Standard (good, fast), Neural (high quality, natural), Generative (best quality, most human-like).
*   Zero API costs, no character limits, fully integrated into StreamDachi voice AI system.