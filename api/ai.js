import { createClient } from '@supabase/supabase-js';
import { streamText, convertToModelMessages, smoothStream } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function loadContextFiles(userMessage) {
  const contextDir = path.join(process.cwd(), 'context');
  if (!fs.existsSync(contextDir)) return { content: '', fileNames: [] };

  const msg = userMessage?.toLowerCase() ?? '';

  const matched = fs
    .readdirSync(contextDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(contextDir, f), 'utf8');
      const { data, content } = matter(raw);
      return { fileName: f, data, content };
    })
    .filter(({ data }) => {
      if (data.always) return true;
      if (!data.triggers || data.triggers.length === 0) return true;
      return data.triggers.some((t) => msg.includes(t.toLowerCase()));
    });

  return {
    content: matched.map(({ content }) => content.trim()).join('\n\n---\n\n'),
    fileNames: matched.map(({ fileName }) => fileName),
  };
}

// Remove lone Unicode surrogates that cause JSON parse errors
function sanitize(str) {
  return str ? str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') : '';
}

function buildSystemPrompt(posts, contextFiles) {
  const posted = posts?.filter((p) => p.status === 'posted').slice(0, 15) ?? [];
  const queued = posts?.filter((p) => p.status === 'queued').slice(0, 10) ?? [];
  const drafts = posts?.filter((p) => p.status === 'draft').slice(0, 10) ?? [];

  return `You are an expert Twitter/X content strategist and ghostwriter.

## YOUR CONTEXT FILES
${contextFiles || 'No context files found. Ask the user to add files to /context/.'}

## RECENT POST HISTORY
${
  posted.length
    ? posted
        .map(
          (p) =>
            `- ${sanitize(p.tweets
              .map((t) => t.content)
              .join(' [→] ')
              .slice(0, 200))}`,
        )
        .join('\n')
    : 'No posts yet.'
}

## QUEUED (avoid duplicating these)
${queued.length ? queued.map((p) => `- ${sanitize(p.tweets[0]?.content?.slice(0, 100))}`).join('\n') : 'Nothing queued.'}

## DRAFTS
${drafts.length ? drafts.map((p) => `- ${sanitize(p.tweets[0]?.content?.slice(0, 100))}`).join('\n') : 'No drafts.'}

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
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;

  const lastUserMessage = messages?.findLast((m) => m.role === 'user');
  const lastUserText = lastUserMessage?.parts
    ?.filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join(' ') ?? '';

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: posts } = await supabase
    .from('posts')
    .select('tweets, status, scheduled_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const { content: contextContent, fileNames } = loadContextFiles(lastUserText);

  res.setHeader('X-Context-Files', fileNames.join(','));

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: buildSystemPrompt(posts, contextContent),
    messages: await convertToModelMessages(messages),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
  });

  result.pipeUIMessageStreamToResponse(res);
}
