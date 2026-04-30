/**
 * Extracts the full text content from a v6 UIMessage by concatenating text parts.
 */
export function getMessageText(message) {
  if (!message.parts) return '';
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
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
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const tweetContents = match[1]
      .trim()
      .split(/\n---\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    segments.push({
      type: 'draft',
      tweets: tweetContents.map((content) => ({ content, media: [] })),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}
