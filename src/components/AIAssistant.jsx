import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Icon } from '@iconify/react';
import ReactMarkdown from 'react-markdown';
import { getMessageText, parseMessageSegments } from '../utils/parseDrafts';
import { useIsMobile } from '../hooks/useIsMobile';

function DraftCard({ tweets, onUseInComposer }) {
  return (
    <div style={{
      margin: '12px 0',
      padding: '16px 20px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 107, 80, 0.3)',
      background: 'rgba(255, 107, 80, 0.05)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '12px',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--color-accent)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        <Icon icon="lucide:sparkles" style={{ fontSize: '12px' }} />
        {tweets.length > 1 ? `Thread · ${tweets.length} tweets` : 'Draft'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {tweets.map((tweet, i) => (
          <div key={i} style={{
            fontSize: '15px',
            fontWeight: 450,
            color: 'var(--color-text)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            paddingLeft: tweets.length > 1 ? '14px' : 0,
            borderLeft: tweets.length > 1 ? '2px solid rgba(255, 107, 80, 0.35)' : 'none',
          }}>
            {tweet.content}
          </div>
        ))}
      </div>
      <button
        onClick={() => onUseInComposer(tweets)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--color-accent)',
          color: '#000',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'var(--font-satoshi)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
      >
        <Icon icon="lucide:pen-line" style={{ fontSize: '13px' }} />
        Use in Composer
      </button>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--color-accent)',
            animation: `thinking-pulse 1.4s ease-in-out ${i * 0.22}s infinite`,
            opacity: 0.4,
          }} />
        ))}
      </div>
      <span style={{
        fontSize: '13px',
        fontWeight: 450,
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
        letterSpacing: '0.01em',
      }}>
        Thinking…
      </span>
    </div>
  );
}

function ReadFilesIndicator({ files, reading }) {
  if (reading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        marginBottom: '10px',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--color-text-ghost)',
        animation: 'reading-fade 0.3s ease-out',
      }}>
        <div style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: 'var(--color-accent)',
          animation: 'reading-blink 1s ease-in-out infinite',
          opacity: 0.6,
        }} />
        Reading context files…
      </div>
    );
  }

  if (!files || files.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '6px',
      marginBottom: '10px',
      animation: 'reading-fade 0.3s ease-out',
    }}>
      {files.map(f => (
        <span key={f} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--color-border)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-text-ghost)',
        }}>
          <Icon icon="lucide:file-text" style={{ fontSize: '10px' }} />
          {f}
        </span>
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  'Give me 5 tweet ideas',
  'What should I post this week?',
  'Draft a thread about my pillars',
  'Rewrite my last post to be punchier',
];

function MarkdownMessage({ content }) {
  return (
    <div className="ai-markdown">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function AIAssistant({ onUseInComposer, pendingMessage, onPendingMessageSent, onNewChat }) {
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const [readFiles, setReadFiles] = useState([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  // Store readFiles keyed to the last assistant message id
  const lastReadFilesRef = useRef([]);

  const customFetch = useCallback(async (url, options) => {
    const response = await fetch(url, options);
    const header = response.headers.get('X-Context-Files');
    if (header) {
      const files = header.split(',').filter(Boolean);
      lastReadFilesRef.current = files;
      setReadFiles(files);
    }
    setIsReadingFiles(false);
    return response;
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ai', fetch: customFetch }),
  });

  useEffect(() => {
    if (pendingMessage) {
      setInput(pendingMessage);
      onPendingMessageSent();
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [pendingMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || el.scrollHeight === 0) return;
    el.style.height = 'auto';
    const h = Math.min(el.scrollHeight, 140);
    el.style.height = h + 'px';
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden';
  }, [input]);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    setReadFiles([]);
    setIsReadingFiles(true);
    sendMessage({ text: input });
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="animate-fade-in" style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: isMobile ? '16px 16px 0' : '32px 24px 0',
      display: 'flex',
      flexDirection: 'column',
      height: isMobile
        ? 'calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px))'
        : 'calc(100vh - 64px - 80px)',
      overflow: 'hidden',
    }}>

      {/* New Chat button */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={onNewChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-ghost)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-satoshi)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.borderColor = 'var(--color-border-light)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-ghost)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <Icon icon="lucide:plus" style={{ fontSize: '12px' }} />
            New chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '16px',
      }}>
        {messages.length === 0 && !isReadingFiles ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '24px',
            paddingTop: '60px',
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'rgba(255, 107, 80, 0.1)',
              border: '1px solid rgba(255, 107, 80, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon icon="lucide:sparkles" style={{ fontSize: '24px', color: 'var(--color-accent)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                How can I help?
              </p>
              <p style={{ fontSize: '14px', fontWeight: 450, color: 'var(--color-text-muted)' }}>
                Ask me anything about your content strategy
              </p>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              maxWidth: '480px',
            }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid var(--color-border-light)',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    fontSize: '13px',
                    fontWeight: 450,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-satoshi)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-accent)';
                    e.currentTarget.style.background = 'rgba(255,107,80,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border-light)';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {messages.map((msg, msgIdx) => {
              const isUser = msg.role === 'user';
              const text = getMessageText(msg);
              const isLastMsg = msgIdx === messages.length - 1;
              const isCurrentlyStreaming = isStreaming && isLastMsg && !isUser;

              if (isUser) {
                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '10px 0',
                  }}>
                    <div style={{
                      maxWidth: isMobile ? '85%' : '72%',
                      padding: '11px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      background: 'rgba(255, 107, 80, 0.12)',
                      border: '1px solid rgba(255, 107, 80, 0.18)',
                      fontSize: '15px',
                      fontWeight: 450,
                      color: 'var(--color-text)',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'var(--font-satoshi)',
                    }}>
                      {text}
                    </div>
                  </div>
                );
              }

              // Assistant message
              const showReadFiles = isLastMsg && (isReadingFiles || readFiles.length > 0);

              if (isCurrentlyStreaming && !text) {
                return (
                  <div key={msg.id} style={{ padding: '16px 0 8px' }}>
                    {showReadFiles && (
                      <ReadFilesIndicator files={readFiles} reading={isReadingFiles} />
                    )}
                    <ThinkingIndicator />
                  </div>
                );
              }

              if (isCurrentlyStreaming) {
                return (
                  <div key={msg.id} style={{ padding: '8px 0 16px' }}>
                    {showReadFiles && (
                      <ReadFilesIndicator files={readFiles} reading={false} />
                    )}
                    <MarkdownMessage content={text} />
                  </div>
                );
              }

              const segments = parseMessageSegments(text);
              return (
                <div key={msg.id} style={{ padding: '8px 0 16px' }}>
                  {isLastMsg && readFiles.length > 0 && (
                    <ReadFilesIndicator files={readFiles} reading={false} />
                  )}
                  {segments.map((seg, i) =>
                    seg.type === 'text' ? (
                      seg.content.trim() && (
                        <MarkdownMessage key={i} content={seg.content} />
                      )
                    ) : (
                      <DraftCard key={i} tweets={seg.tweets} onUseInComposer={onUseInComposer} />
                    )
                  )}
                </div>
              );
            })}

            {/* Show "reading" state before first assistant message arrives */}
            {isReadingFiles && !messages.some(m => m.role === 'assistant' && messages.indexOf(m) === messages.length - 1) && (
              <div style={{ padding: '16px 0 8px' }}>
                <ReadFilesIndicator files={[]} reading={true} />
                <ThinkingIndicator />
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        paddingBottom: isMobile ? '12px' : '16px',
        paddingTop: '8px',
        background: 'var(--color-bg)',
      }}>
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border-light)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your content…"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '15px',
              fontWeight: 450,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-satoshi)',
              lineHeight: '1.55',
              overflowY: 'hidden',
              maxHeight: '140px',
              paddingTop: '2px',
              paddingBottom: '2px',
              alignSelf: 'center',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              const h = Math.min(e.target.scrollHeight, 140);
              e.target.style.height = h + 'px';
              e.target.style.overflowY = e.target.scrollHeight > 140 ? 'auto' : 'hidden';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              border: 'none',
              background: input.trim() && !isStreaming ? 'var(--color-accent)' : 'var(--color-border)',
              color: input.trim() && !isStreaming ? '#000' : 'var(--color-text-ghost)',
              cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (input.trim() && !isStreaming) e.currentTarget.style.background = 'var(--color-accent-hover)'; }}
            onMouseLeave={e => { if (input.trim() && !isStreaming) e.currentTarget.style.background = 'var(--color-accent)'; }}
          >
            <Icon icon="lucide:arrow-up" style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes thinking-pulse {
          0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
          40% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes reading-fade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes reading-blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }

        .ai-markdown {
          font-family: var(--font-satoshi);
          font-size: 15px;
          font-weight: 450;
          line-height: 1.75;
          color: var(--color-text);
        }
        .ai-markdown p {
          margin: 0 0 14px 0;
        }
        .ai-markdown p:last-child {
          margin-bottom: 0;
        }
        .ai-markdown h1, .ai-markdown h2, .ai-markdown h3 {
          font-weight: 800;
          margin: 26px 0 8px 0;
          letter-spacing: -0.02em;
        }
        .ai-markdown h1:first-child, .ai-markdown h2:first-child, .ai-markdown h3:first-child {
          margin-top: 0;
        }
        .ai-markdown h1 {
          font-size: 22px;
          color: #fff;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--color-border);
        }
        .ai-markdown h2 {
          font-size: 18px;
          color: rgba(255,255,255,0.95);
        }
        .ai-markdown h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-accent);
        }
        .ai-markdown strong {
          font-weight: 900;
          color: rgba(255,255,255,0.95);
        }
        .ai-markdown em {
          font-style: italic;
          color: rgba(255,255,255,0.95);
        }
        .ai-markdown ul, .ai-markdown ol {
          padding-left: 20px;
          margin: 6px 0 14px 0;
        }
        .ai-markdown li {
          margin-bottom: 6px;
          line-height: 1.65;
        }
        .ai-markdown ul li { list-style-type: disc; }
        .ai-markdown ul li::marker { color: var(--color-accent); }
        .ai-markdown ol li::marker { color: var(--color-accent); font-weight: 600; }
        .ai-markdown code {
          font-family: 'SF Mono', 'Fira Mono', monospace;
          font-size: 13px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px;
          padding: 1px 6px;
          color: var(--color-accent);
        }
        .ai-markdown pre {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 14px 16px;
          overflow-x: auto;
          margin: 12px 0;
        }
        .ai-markdown pre code {
          background: none;
          border: none;
          padding: 0;
          color: var(--color-text);
          font-size: 13px;
        }
        .ai-markdown blockquote {
          border-left: 3px solid var(--color-accent);
          padding-left: 14px;
          margin: 12px 0;
          color: var(--color-text-muted);
          font-style: italic;
        }
        .ai-markdown hr {
          border: none;
          border-top: 1px solid var(--color-border);
          margin: 18px 0;
        }
        .ai-markdown a {
          color: var(--color-accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .ai-markdown > *:first-child { margin-top: 0; }
      `}</style>
    </div>
  );
}
