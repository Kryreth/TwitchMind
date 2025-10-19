# Design Guidelines: Twitch + OpenAI Integration Dashboard

## Design Approach

**Selected Approach:** Design System (Material Design + Twitch Aesthetic)

**Justification:** This is a utility-focused, information-dense application requiring real-time data visualization, chat monitoring, and analytics. Drawing from Material Design for component consistency and Twitch's brand aesthetic for familiarity.

**Key References:**
- Twitch Creator Dashboard (dark theme, purple accents)
- Discord (chat interface patterns)
- Linear (clean data tables, modern inputs)
- Streamlabs OBS (streaming tool UX patterns)

## Core Design Principles

1. **Real-time Clarity:** Information updates must be instantly visible without disrupting focus
2. **Scan-ability:** Chat messages and analytics should be quickly parsable
3. **Action Hierarchy:** Moderation and AI controls prominently accessible
4. **Dark-First:** Optimized for extended viewing sessions

## Color Palette

### Dark Mode (Primary)
- **Background Base:** 218 25% 8%
- **Background Elevated:** 218 20% 12%
- **Background Panel:** 218 18% 15%
- **Twitch Purple Primary:** 265 100% 70%
- **Twitch Purple Hover:** 265 100% 75%
- **AI Accent (Green):** 142 70% 50%
- **Warning/Moderation (Amber):** 38 92% 50%
- **Danger/Block (Red):** 0 84% 60%

### Text Colors
- **Primary Text:** 0 0% 95%
- **Secondary Text:** 0 0% 70%
- **Muted/Timestamps:** 0 0% 50%
- **Success Messages:** 142 70% 60%

## Typography

**Font Families:**
- Primary: "Inter" (Google Fonts) - UI elements, labels, chat
- Monospace: "Roboto Mono" (Google Fonts) - timestamps, usernames, data values

**Text Hierarchy:**
- Page Titles: text-2xl font-bold (24px)
- Section Headers: text-lg font-semibold (18px)
- Body/Chat: text-sm (14px)
- Labels/Meta: text-xs (12px)
- Timestamps: text-xs font-mono

## Layout System

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8
- Component padding: p-4, p-6
- Section gaps: gap-4, gap-6
- Card spacing: space-y-4
- Tight grouping: gap-2, gap-3

**Grid Structure:**
- Main layout: Sidebar (240px fixed) + Content (flex-1)
- Dashboard cards: grid-cols-1 lg:grid-cols-2 xl:grid-cols-3
- Chat + Details: 2:1 ratio split on desktop, stacked mobile

## Component Library

### Navigation
- **Fixed Sidebar (Left):** 240px width, background elevated
  - Logo/App name at top (p-6)
  - Navigation items with icons (Heroicons)
  - Active state: purple background, full width
  - Sections: Dashboard, Live Chat, Analytics, AI Controls, Settings

### Live Chat Interface
- **Message Stream Container:** Background panel, rounded-lg, max height with scroll
- **Individual Messages:** 
  - Horizontal layout: Avatar (8x8) + Username (purple/colored) + Message + Timestamp
  - Padding: px-4 py-2
  - Hover: subtle background highlight
  - AI-analyzed messages: Left border (2px) in green/amber/red based on sentiment
- **Chat Input:** Fixed bottom bar with send button and AI toggle

### Dashboard Cards
- **Card Container:** Background elevated, rounded-lg, p-6, border border-white/5
- **Card Header:** Flex justify-between with title + action icon
- **Stat Cards:** Large number (text-3xl font-bold) + label + trend indicator
- **Metrics:** 
  - Messages/minute counter
  - AI interactions count
  - Moderation actions
  - Active users

### AI Interaction Panel
- **Command List:** Table showing trigger commands, response types, usage count
- **Live Analysis Feed:** Real-time sentiment scores, toxicity detection results
- **Configuration Toggles:** Auto-moderation switches, threshold sliders

### Data Tables
- **Headers:** Background panel, sticky top, text-xs uppercase tracking-wide
- **Rows:** Hover state, alternating subtle background
- **Cells:** py-3 px-4, consistent alignment
- **Actions:** Icon buttons (edit, delete) revealed on row hover

### Forms & Controls
- **Input Fields:** Background base, border border-white/10, rounded-md, px-4 py-2.5
- **Focus State:** Ring-2 ring-purple-500
- **Select Dropdowns:** Consistent height, chevron icon
- **Switches/Toggles:** Purple when active, gray when inactive
- **Range Sliders:** Purple track with white thumb

### Modals & Overlays
- **Backdrop:** bg-black/70 backdrop-blur-sm
- **Modal Content:** Background elevated, rounded-lg, shadow-2xl, max-w-2xl
- **Modal Header:** Border-b with close button
- **Modal Actions:** Right-aligned button group in footer

### Status Indicators
- **Online/Active:** Green dot (h-2 w-2)
- **AI Processing:** Pulsing purple dot
- **Warning State:** Amber border-l-4
- **Error/Blocked:** Red background with white text

### Buttons
- **Primary (Purple):** Full background, white text, hover brightens
- **Secondary:** Border outline, purple text
- **Danger:** Red background
- **Icon Only:** Rounded-md p-2, hover background

## Real-Time Elements

### Animation Strategy (Minimal)
- **Message Arrival:** Subtle fade-in (200ms) only
- **AI Analysis Badge:** Gentle pulse on completion
- **Live Counters:** Number transitions (not animated)
- **NO continuous animations** - preserves performance

### Live Data Updates
- **Update Indicators:** Small purple dot appears briefly when data refreshes
- **Scroll Behavior:** Chat auto-scrolls only if user at bottom
- **Timestamp Format:** Relative time (2m ago) updating every minute

## Iconography

**Icon Library:** Heroicons (outline for navigation, solid for actions)

**Key Icons:**
- Dashboard: chart-bar
- Chat: chat-bubble-left-right
- AI: sparkles / cpu-chip
- Analytics: presentation-chart-line
- Settings: cog-6-tooth
- Moderation: shield-check / shield-exclamation

## Accessibility Notes

- Maintain WCAG AA contrast ratios throughout dark theme
- All interactive elements have visible focus states (ring-2)
- Form inputs have associated labels
- Real-time updates announced to screen readers
- Chat messages have semantic HTML structure

## Images

**No hero images required** - This is a dashboard application focused on data display and real-time functionality, not marketing content.