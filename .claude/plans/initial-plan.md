# 🔥 ContentPoster — Implementation Plan

> A minimal, beautiful Hypefury clone for scheduling X posts to a queue.  
> Styled in the **Midnight Editorial** dark theme. Built with **Vite + React**.

---

## 1. Overview

**What it is:** A single-page React app that lets you compose X (Twitter) posts, add them to a time-slot queue, and visualize your upcoming schedule. Modeled directly after Hypefury's core workflow.

**What it is NOT:** No actual X API integration yet — purely a local scheduling & drafting tool. The React + Vite foundation makes adding X API integration straightforward in the future.

**Tech stack:**
- **Vite + React** (JavaScript, not TypeScript — keep it simple)
- **TailwindCSS v4** (installed as a dependency, not CDN)
- **Iconify React** (`@iconify/react`) for icons
- **Satoshi + Inter** fonts (via Google Fonts / CDN)
- **localStorage** for persistence — no backend yet
- **React Router** is NOT needed — simple state-based view switching

---

## 2. Design System — Midnight Editorial

Pulled directly from the reference. Every UI element will use these tokens:

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#050505` | Page background |
| `--color-surface` | `#111111` | Cards, panels |
| `--color-surface-hover` | `#161616` | Card hover states |
| `--color-border` | `#222222` / `#333333` | Borders, dividers |
| `--color-accent` | `#FF6B50` (coral) | CTAs, active states, badges |
| `--color-accent-hover` | `#E55A40` | Accent hover |
| `--color-text` | `#ebebeb` | Primary text |
| `--color-text-muted` | `#888888` | Secondary text |
| `--color-text-dim` | `#666666` | Tertiary / disabled text |
| `--color-text-ghost` | `#444444` | Ghost text, placeholders |
| Font | Satoshi (primary), Inter (fallback) | All text |
| Radius | Cards `1.5rem`, Buttons `0.75rem`, Badges `9999px` | Consistent rounding |
| Glass effect | `rgba(17,17,17,0.8)` + `backdrop-filter: blur(12px)` | Nav bar, floating panels |

---

## 3. App Layout & Views

The app has **3 main views** accessible from the top nav, matching Hypefury's navigation:

```
┌─────────────────────────────────────────────────────────┐
│  TOP NAV (glass) — Logo · Composer · Queue · Calendar   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  MAIN CONTENT AREA                       │
│                                                         │
│  Renders one of:                                        │
│   • Composer View (write & schedule posts)              │
│   • Queue View (see upcoming scheduled posts)           │
│   • Calendar View (monthly overview)                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FLOATING BOTTOM BAR (glass) — Quick stats              │
└─────────────────────────────────────────────────────────┘
```

### 3.1 Top Navigation — `<Navbar />`
- **Glass-style** fixed nav
- Left: Logo ("CP." in a white square, matching the "S." pattern)
- Center: Nav tabs — **Composer**, **Queue**, **Calendar**
- Right: Settings gear icon
- Active tab gets coral underline indicator

### 3.2 Composer View — `<Composer />`
Modeled after Hypefury's composer — a full-page centered writing area:

- **Large, clean textarea** — centered on the page, generous padding, dark surface card
- **Character counter** — shows `0 / 280`, turns coral when approaching limit, turns red when over
- **Thread support** — "Add another tweet" button below the textarea to chain tweets into a thread. Each tweet in the thread is a separate textarea card, connected by a vertical line (like Hypefury)
- **Schedule controls** at the bottom of the composer:
  - "Add to Queue" button (coral CTA) — assigns to next available time slot
  - "Schedule for specific time" — date/time picker
  - "Save as Draft" — ghost button
- **Toolbar** below each textarea:
  - Character count
  - Delete tweet from thread (if more than one)

### 3.3 Queue View — `<Queue />`
- Grouped by day: **Today**, **Tomorrow**, **Wed Apr 9**, etc.
- Each day section: date header with post count + list of post cards
- Post cards (`<PostCard />`, `#111111` surface):
  - Post text preview (truncated to ~2 lines)
  - Scheduled time badge (e.g. "2:30 PM")
  - X icon badge
  - Status pill: `Queued` (coral) / `Draft` (dim)
  - Hover: reveal **Edit** (opens in Composer) / **Delete** / **Reschedule** actions
- Drag-and-drop reordering within a day
- Empty state: "Your queue is empty — head to Composer to write your first post"

### 3.4 Calendar View — `<Calendar />`
- Monthly calendar grid
- Each day cell shows coral dot indicators for number of scheduled posts
- Click a day → shows that day's posts in an expanded panel below
- Current day highlighted with coral ring
- Navigation: `← Apr 2026 →`

### 3.5 Drafts
- Drafts show up in the Queue view under a separate "Drafts" section at the bottom
- Click a draft → opens it in the Composer for editing

### 3.6 Floating Bottom Bar — `<BottomBar />`
- Glass-style bar (matching reference)
- Quick stats: "12 posts queued · 3 today · Next post in 2h 15m"

---

## 4. Core Features

### 4.1 Composer (Hypefury-style)
- Write single tweets or multi-tweet threads
- Each tweet card shows character count (280 limit)
- Add/remove tweets in a thread
- Schedule options: queue (auto-slot), specific time, or save as draft
- Edit existing posts by loading them back into the composer

### 4.2 Queue Management
- View all scheduled posts grouped by day
- Edit any post (switches to Composer view with post loaded)
- Delete posts with confirmation modal
- Drag-and-drop to reorder posts within a day
- Time-slot auto-assignment fills the next open slot

### 4.3 Time Slots
- Default slots: 9 AM, 12 PM, 6 PM daily
- Configurable in Settings
- "Add to Queue" auto-assigns to the next available slot across upcoming days
- Visual indicator in queue showing which slots are filled vs. open

### 4.4 Calendar Overview
- Monthly grid with post density indicators
- Click-to-expand day detail

### 4.5 Persistence
- All data saved to `localStorage` via a custom `useLocalStorage` hook
- Auto-save on every change
- Export/Import as JSON (in Settings)

---

## 5. Data Model

```javascript
// Stored in localStorage as JSON

const appState = {
  posts: [
    {
      id: "uuid-1",
      tweets: [                            // array for thread support
        { content: "Just shipped a new feature! 🚀" },
        { content: "Here's what we learned along the way..." }
      ],
      scheduledAt: "2026-04-08T14:30:00",  // ISO string, null if draft
      status: "queued",                     // "queued" | "draft"
      createdAt: "2026-04-07T19:15:00",
      updatedAt: "2026-04-07T19:15:00",
      order: 0                              // for ordering within a day
    }
  ],
  
  settings: {
    timeSlots: [
      { time: "09:00", enabled: true },
      { time: "12:00", enabled: true },
      { time: "18:00", enabled: true }
    ],
    timezone: "America/Chicago"
  }
};
```

---

## 6. Project Structure

```
content_poster/
├── index.html
├── package.json
├── vite.config.js
├── PLAN.md
├── README.md
├── public/
│   └── favicon.ico
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root component — nav + view switching
│   ├── index.css                # Global styles, design tokens, Tailwind imports
│   ├── components/
│   │   ├── Navbar.jsx           # Glass top nav with tab switching
│   │   ├── BottomBar.jsx        # Floating glass stats bar
│   │   ├── Composer.jsx         # Full composer view
│   │   ├── TweetCard.jsx        # Single tweet textarea in composer
│   │   ├── Queue.jsx            # Queue view — posts grouped by day
│   │   ├── PostCard.jsx         # Single post card in queue
│   │   ├── Calendar.jsx         # Monthly calendar view
│   │   ├── Settings.jsx         # Settings modal
│   │   └── Toast.jsx            # Toast notification component
│   ├── hooks/
│   │   ├── useLocalStorage.js   # Persist state to localStorage
│   │   └── usePosts.js          # All post CRUD logic (add, edit, delete, reorder)
│   └── utils/
│       ├── scheduling.js        # Time-slot logic — find next available slot
│       └── helpers.js           # Date formatting, UUID generation, etc.
```

---

## 7. Build Phases

### Phase 1 — Project Setup & Layout
1. Initialize Vite + React project (`npx create-vite`)
2. Install TailwindCSS v4, `@iconify/react`
3. Set up `index.css` with design tokens, font imports, glass utilities
4. Build `<App />` with state-based view switching
5. Build `<Navbar />` with tab navigation (Composer / Queue / Calendar)
6. Build `<BottomBar />` placeholder

### Phase 2 — Composer & Data Layer
1. Build `<Composer />` — textarea, character counter, schedule controls
2. Build `<TweetCard />` — individual tweet in a thread with character count
3. Add thread support — add/remove tweet cards, vertical connector line
4. Create `useLocalStorage` hook and `usePosts` hook
5. Wire "Add to Queue" / "Save as Draft" / "Schedule" actions
6. Implement `scheduling.js` — find next available time slot

### Phase 3 — Queue & Calendar
1. Build `<Queue />` — posts grouped by day with `<PostCard />` components
2. Add edit (→ Composer) / delete / reschedule actions on `<PostCard />`
3. Implement drag-and-drop reordering within a day
4. Build `<Calendar />` month view with day-click expansion
5. Wire drafts section in Queue view

### Phase 4 — Polish & Settings
1. Build `<Settings />` modal — configure time slots, export/import JSON
2. Build `<Toast />` notification system
3. Empty states for all views
4. Micro-animations: card entrance, delete slide-out, tab transitions
5. Floating bottom bar with live stats
6. Final responsive pass

---

## 8. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Vite + React** | Future-proofed for X API integration, OAuth flows, async state |
| **JavaScript (not TypeScript)** | Keep it simple, less boilerplate |
| **No React Router** | Only 3 views — `useState` switching is simpler |
| **TailwindCSS v4 (installed)** | Proper build pipeline, not CDN — better for production |
| **X-only** | Keep scope tight — one platform, done well |
| **Thread support** | Core Hypefury feature, essential for X power users |
| **No backend yet** | localStorage for now, backend when adding X API |
| **Custom hooks for state** | Clean separation — `usePosts` owns all post logic |

---

## 9. Future Enhancements (Out of Scope for v1)

- [ ] X API integration (OAuth + posting) — will need a Node/Express backend
- [ ] Image/media attachments in composer
- [ ] Thread previewer (visual mock of how it'll look on X)
- [ ] Instagram & LinkedIn platform support
- [ ] Analytics dashboard
- [ ] Multi-account support
- [ ] Cloud sync (Supabase or similar)
- [ ] Recurring/evergreen post rotation

---

> [!IMPORTANT]
> **The goal is simplicity.** Model it after Hypefury's core experience: compose → schedule → queue. No AI, no bells and whistles. Just a clean, premium-feeling scheduling tool for X — built on a foundation that's ready to grow.
