# Plan: AI Assistant Tab

## Context

Add a 4th "Chat" tab to the content scheduler — a chat interface where the AI knows your content history, your personal context (from editable markdown files), and can send drafted tweets straight to the Composer. Switching between Composer and AI is seamless in both directions.

---

## Architecture

### New files

- **`/api/ai.js`** — Streaming serverless endpoint
- **`/src/components/AIAssistant.jsx`** — Chat UI component
- **`/src/utils/parseDrafts.js`** — Parses `<draft>...</draft>` blocks from AI messages
- **`/context/profile.md`** — Who you are, your brand, your audience
- **`/context/pillars.md`** — Your content pillars and topic areas
- **`/context/tone.md`** — Voice, style rules, what to avoid

### Modified files

- **`/src/components/Navbar.jsx`** — Add AI tab to `tabs` array (1 line)
- **`/src/components/Composer.jsx`** — Add "Ask AI" button near the action buttons
- **`/src/App.jsx`** — Add `handleUseInComposer`, `handleAskAI`, `pendingAIMessage` state

---

## Context Files (`/context/*.md`)

Plain markdown files you edit directly — just like Claude Code skills. Each file has a YAML frontmatter header that controls when it loads. The API parses the last user message and only injects files whose triggers match — no wasted tokens on irrelevant context.

**Loading rules:**
- `always: true` → loaded on every message (use for foundational background like your profile)
- `triggers: [...]` → loaded only when the message contains one of those keywords
- No frontmatter → always loaded (backwards compatible)

**Suggested starter files:**

`/context/profile.md`
```md
---
always: true
description: Who I am, my brand, my audience
---

# Profile
- Name: [your name / handle]
- What I do: [1-2 sentences]
- Target audience: [who reads your tweets]
```

`/context/pillars.md`
```md
---
description: Content pillars and topic areas
triggers: [ideas, topics, what to post, niche, pillar, week, content, about]
---

# Content Pillars
1. [Topic 1] — [brief description]
2. [Topic 2] — [brief description]
3. [Topic 3] — [brief description]
```

`/context/tone.md`
```md
---
description: Voice, style rules, writing guidelines
triggers: [write, draft, rewrite, improve, hook, tone, style, punchy, thread]
---

# Voice & Tone
- Style: [e.g. casual, direct, no fluff]
- I avoid: [e.g. emojis, corporate speak]
- Tweet length: [e.g. short punchy takes, occasional threads]
```

**Adding new files:** Drop any `.md` in `/context/` with frontmatter triggers — no code changes needed. Examples:
- `context/campaigns.md` → `triggers: [launch, campaign, event, promote]`
- `context/ideas.md` → `triggers: [ideas, brainstorm, topic]`
- `context/competitors.md` → `triggers: [competitor, niche, market]`

**Example matching:**
- "Give me tweet ideas about productivity" → `pillars.md` (`ideas`), `profile.md` (always) — tone skipped
- "Rewrite this to be punchier" → `tone.md` (`rewrite`, `punchy`), `profile.md` (always) — pillars skipped
- "Draft a thread about my pillars" → all three load (`draft`→tone, `pillar`→pillars, always→profile)

---

## Bidirectional Flow

```
Composer ──[Ask AI]──▶ AI tab (draft pre-loaded as message, auto-sent)
AI tab ──[Use in Composer]──▶ Composer (draft pre-filled, ready to queue)
```

**Composer → AI ("Ask AI" button):**

- Composer has a secondary "Ask AI" button next to the existing action buttons
- Clicking it calls `onAskAI(tweets)` in App.jsx
- App formats the draft as a message: `"Help me with this draft:\n\n[tweet content]"`, stores it in `pendingAIMessage` state, then switches to `'ai'` view
- AIAssistant receives `pendingAIMessage` as a prop — a `useEffect` auto-sends it when non-null, then clears it

**AI → Composer ("Use in Composer" button):**

- Draft cards in AI messages show a "Use in Composer" button
- Clicking calls `onUseInComposer(tweets)` in App.jsx
- App sets `editingPost({ id: null, tweets, fromAI: true })` and switches to `'composer'` view
- The Composer pre-fills with the AI draft — `fromAI: true` prevents "Edit Post" header showing

---

## Implementation Steps

### 1. Install packages

```bash
npm install ai @ai-sdk/react @ai-sdk/anthropic gray-matter
```

- `ai` — core SDK with `streamText`, `convertToModelMessages`
- `@ai-sdk/react` — `useChat`, `DefaultChatTransport`
- `@ai-sdk/anthropic` — direct Anthropic provider
- `gray-matter` — parses YAML frontmatter from context files
- Set `ANTHROPIC_API_KEY` in `.env.local` (no `VITE_` prefix — server-side only)

### 2. `/api/ai.js`

```js
import { createClient } from "@supabase/supabase-js";
import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function loadContextFiles(userMessage) {
  const contextDir = path.join(process.cwd(), "context");
  if (!fs.existsSync(contextDir)) return "";

  const msg = userMessage.toLowerCase();

  return fs
    .readdirSync(contextDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(contextDir, f), "utf8");
      const { data, content } = matter(raw);
      return { data, content };
    })
    .filter(({ data }) => {
      if (data.always) return true;
      if (!data.triggers || data.triggers.length === 0) return true; // no frontmatter = always load
      return data.triggers.some((t) => msg.includes(t.toLowerCase()));
    })
    .map(({ content }) => content.trim())
    .join("\n\n---\n\n");
}

function buildSystemPrompt(posts, contextFiles) {
  const posted = posts?.filter((p) => p.status === "posted").slice(0, 15) ?? [];
  const queued = posts?.filter((p) => p.status === "queued").slice(0, 10) ?? [];
  const drafts = posts?.filter((p) => p.status === "draft").slice(0, 10) ?? [];

  return `You are an expert Twitter/X content strategist and ghostwriter.

## YOUR CONTEXT FILES
${contextFiles || "No context files found. Ask the user to add files to /context/."}

## RECENT POST HISTORY
${
  posted.length
    ? posted
        .map(
          (p) =>
            `- ${p.tweets
              .map((t) => t.content)
              .join(" [→] ")
              .slice(0, 200)}`,
        )
        .join("\n")
    : "No posts yet."
}

## QUEUED (avoid duplicating these)
${queued.length ? queued.map((p) => `- ${p.tweets[0]?.content?.slice(0, 100)}`).join("\n") : "Nothing queued."}

## DRAFTS
${drafts.length ? drafts.map((p) => `- ${p.tweets[0]?.content?.slice(0, 100)}`).join("\n") : "No drafts."}

## DRAFTING FORMAT
When producing a finalized tweet ready to use, wrap it in a draft block:

<draft>
Tweet content here
</draft>

For threads, separate tweets with ---:

<draft>
First tweet
---
Second tweet
---
Third tweet
</draft>

Only use <draft> blocks for finalized content — not brainstorming or rough ideas. Keep each tweet under 280 characters.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: posts } = await supabase
    .from("posts")
    .select("tweets, status, scheduled_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const contextFiles = loadContextFiles();

  const result = streamText({
    model: anthropic("claude-sonnet-4.6"),
    system: buildSystemPrompt(posts, contextFiles),
    messages: convertToModelMessages(messages), // v6: UIMessage[] → ModelMessage[]
  });

  result.pipeUIMessageStreamToResponse(res); // v6: Node.js req/res with useChat
}
```

### 3. `/src/utils/parseDrafts.js`

Extracts text from `message.parts` (v6 UIMessage format) then splits on `<draft>` blocks.

```js
/**
 * Extracts the full text content from a v6 UIMessage by concatenating text parts.
 */
export function getMessageText(message) {
  if (!message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * Splits a message text string into segments:
 *   { type: 'text', content: string }
 *   { type: 'draft', tweets: [{ content: string, media: [] }] }
 */
export function parseMessageSegments(text) {
  const segments = [];
  const draftRegex = /<draft>([\s\S]*?)<\/draft>/g;
  let lastIndex = 0;
  let match;

  while ((match = draftRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    const tweetContents = match[1]
      .trim()
      .split(/\n---\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    segments.push({
      type: "draft",
      tweets: tweetContents.map((content) => ({ content, media: [] })),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
```

### 4. `/src/components/AIAssistant.jsx`

```jsx
import { useEffect } from "react";
import { useChat, DefaultChatTransport } from "@ai-sdk/react";
import { getMessageText, parseMessageSegments } from "../utils/parseDrafts";

export default function AIAssistant({
  onUseInComposer,
  pendingMessage,
  onPendingMessageSent,
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai" }),
  });

  // Auto-send when Composer passes a draft via "Ask AI"
  useEffect(() => {
    if (pendingMessage) {
      sendMessage({ text: pendingMessage });
      onPendingMessageSent(); // clears it in App
    }
  }, [pendingMessage]);

  const handleSend = () => {
    if (!input.trim() || status === "streaming") return;
    sendMessage({ text: input });
    setInput("");
  };
}
```

**Rendering messages (v6 `message.parts`):**

```jsx
{
  messages.map((msg) => {
    const isUser = msg.role === "user";
    if (isUser) {
      // User messages: render text parts directly
      const text = getMessageText(msg);
      return <UserBubble key={msg.id} text={text} />;
    }

    // Assistant messages: parse for draft blocks
    // Only parse completed messages (not the one currently streaming)
    const isStreaming =
      status === "streaming" && msg === messages[messages.length - 1];
    const text = getMessageText(msg);

    if (isStreaming) {
      return <AssistantBubble key={msg.id} text={text} streaming />;
    }

    const segments = parseMessageSegments(text);
    return (
      <div key={msg.id}>
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <AssistantBubble key={i} text={seg.content} />
          ) : (
            <DraftCard
              key={i}
              tweets={seg.tweets}
              onUseInComposer={onUseInComposer}
            />
          ),
        )}
      </div>
    );
  });
}
```

**Layout:**

- Empty state: suggestion chips ("Give me 5 tweet ideas", "What should I post this week?", "Draft a thread about...")
- Scrollable message list — user bubbles right (coral tint), AI bubbles left (surface)
- Draft cards: coral border, subtle coral background, tweet preview text, "Use in Composer" button
- Typing indicator (animated dots) while `status === 'streaming'`
- Fixed bottom input: textarea (Enter sends, Shift+Enter newlines) + send button disabled while streaming

### 5. `src/components/Composer.jsx`

Add "Ask AI" button near the existing Queue/Schedule/Draft buttons:

```jsx
// Props: add onAskAI
<button
  onClick={() => onAskAI(tweets)}
  style={
    {
      /* secondary style */
    }
  }
>
  <Icon icon="lucide:sparkles" /> Ask AI
</button>
```

The button calls `onAskAI(tweets)` — passed down from App.jsx. Composer state (the current draft) is preserved in App while you switch tabs since `editingPost` / the composer's local state doesn't get destroyed until you explicitly clear it.

### 6. `src/components/Navbar.jsx`

```js
const tabs = [
  { id: "composer", label: "Composer", icon: "lucide:pen-line" },
  { id: "queue", label: "Queue", icon: "lucide:list-ordered" },
  { id: "calendar", label: "Calendar", icon: "lucide:calendar" },
  { id: "ai", label: "AI", icon: "lucide:sparkles" },
];
```

### 7. `src/App.jsx`

New state + handlers:

```js
const [pendingAIMessage, setPendingAIMessage] = useState(null);

// Composer → AI: formats current draft and switches tab
const handleAskAI = (tweets) => {
  const draftText = tweets
    .map((t) => t.content)
    .join("\n\n[thread continues]\n\n");
  setPendingAIMessage(`Help me with this draft:\n\n${draftText}`);
  setActiveView("ai");
};

// AI → Composer: pre-fills composer with AI draft
const handleUseInComposer = (tweets) => {
  setEditingPost({ id: null, tweets, fromAI: true });
  setActiveView("composer");
};
```

Updated render:

```jsx
{
  activeView === "composer" && (
    <Composer
      onAddToQueue={handleAddToQueue}
      onSchedule={handleSchedule}
      onSaveDraft={handleSaveDraft}
      editingPost={editingPost}
      onClearEdit={() => setEditingPost(null)}
      onAskAI={handleAskAI} // ← new
    />
  );
}

{
  activeView === "ai" && (
    <AIAssistant
      onUseInComposer={handleUseInComposer}
      pendingMessage={pendingAIMessage}
      onPendingMessageSent={() => setPendingAIMessage(null)}
    />
  );
}
```

Minor tweak in `Composer.jsx`: check `editingPost?.fromAI` to show "Compose" header instead of "Edit Post".

---

## Key Technical Notes

- **Model:** `claude-sonnet-4.6` via `@ai-sdk/anthropic` direct. Set `ANTHROPIC_API_KEY` in `.env.local`.
- **`convertToModelMessages(messages)`:** Required in v6 — `useChat` sends `UIMessage[]`, but `streamText` expects `ModelMessage[]`. Import from `ai`.
- **`message.parts` not `message.content`:** v6 UIMessage format. Text lives in `{ type: 'text', text }` parts. `parseDrafts` uses `getMessageText()` to extract it.
- **`pipeUIMessageStreamToResponse(res)`:** Correct for Node.js `req/res`. Don't use `toUIMessageStreamResponse()` — that's for Web API responses (Next.js/Edge only).
- **`sendMessage({ text })`:** v6 API. `handleSubmit` was removed.
- **`status === 'streaming'`:** v6 replaces `isLoading`. Disable send button and show typing indicator.
- **Context files read at request time:** Edits to `/context/*.md` take effect on the next message sent. No restart needed.
- **Composer state while switching tabs:** The Composer's local tweet state lives in its own `useState`. Switching to the AI tab does NOT unmount it (it's hidden with `activeView !== 'composer'`). So when you click "Use in Composer", the previous draft is replaced by the AI content via `setEditingPost`.

---

## Verification

1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Create `/context/profile.md`, `/context/pillars.md`, `/context/tone.md`
3. Run `vercel dev`
4. **Ideate flow:** AI tab → send "Give me 5 tweet ideas" → see response → ask "Draft #3" → draft card appears → "Use in Composer" → Composer pre-filled
5. **Validate flow:** Write a tweet in Composer → click "Ask AI" → AI tab opens with draft pre-sent → AI gives feedback → ask for rewrite → "Use in Composer" → back in Composer with improved draft
6. **Context check:** Ask "what have I posted about?" → AI accurately describes post history topics
7. **Thread draft:** Ask for a thread → draft card shows all tweets in order → "Use in Composer" loads full thread
