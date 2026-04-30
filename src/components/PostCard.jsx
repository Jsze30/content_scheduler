import { useState, useRef, useLayoutEffect } from 'react';
import { Icon } from '@iconify/react';
import { formatTime } from '../utils/helpers';
import { useIsMobile } from '../hooks/useIsMobile';

export default function PostCard({ post, onEdit, onDelete, style }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef(null);
  const previewText = post.tweets.map(t => t.content).join(' → ');

  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) setIsOverflowing(el.scrollHeight > el.clientHeight);
  }, [previewText]);
  const isThread = post.tweets.length > 1;
  const mediaCount = post.tweets.reduce((sum, t) => sum + (t.media?.length || 0), 0);

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-light)',
        borderRadius: '16px',
        padding: isMobile ? '14px 14px' : '16px 20px',
        transition: 'all 0.2s',
        cursor: 'default',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-border-light)';
        e.currentTarget.style.background = 'var(--color-surface-hover)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.background = 'var(--color-surface)';
      }}
    >
      {/* Top row: content + actions */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        {/* Content preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <p ref={textRef} style={{
              fontSize: '15px',
              lineHeight: 1.5,
              color: 'var(--color-text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              margin: 0,
            }}>
              {previewText}
            </p>
            {isOverflowing && !expanded && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2.2em',
                background: 'linear-gradient(to bottom, transparent, var(--color-surface))',
                pointerEvents: 'none',
              }} />
            )}
          </div>

          {/* Meta row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '10px',
            flexWrap: 'wrap',
          }}>
            {/* Time badge */}
            {post.scheduledAt && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                background: 'rgba(255,255,255,0.05)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}>
                <Icon icon="lucide:clock" style={{ fontSize: '12px' }} />
                {formatTime(post.scheduledAt)}
              </span>
            )}

            {/* Thread badge */}
            {isThread && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-dim)',
                background: 'rgba(255,255,255,0.05)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}>
                <Icon icon="lucide:message-square" style={{ fontSize: '12px' }} />
                {post.tweets.length} tweets
              </span>
            )}

            {/* Media badge */}
            {mediaCount > 0 && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-dim)',
                background: 'rgba(255,255,255,0.05)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}>
                <Icon icon="lucide:image" style={{ fontSize: '12px' }} />
                {mediaCount}
              </span>
            )}

            {/* Status pill */}
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '3px 10px',
              borderRadius: '9999px',
              background: post.status === 'queued' ? 'rgba(255,107,80,0.12)' : 'rgba(255,255,255,0.05)',
              color: post.status === 'queued' ? 'var(--color-accent)' : 'var(--color-text-ghost)',
            }}>
              {post.status}
            </span>

            {/* X badge */}
            <Icon icon="ri:twitter-x-fill" style={{
              fontSize: '12px',
              color: 'var(--color-text-ghost)',
            }} />

            {/* View Post toggle */}
            {isOverflowing && <button
              onClick={() => setExpanded(e => !e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                marginLeft: 'auto',
                padding: '0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-ghost)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-satoshi)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-ghost)'}
            >
              {expanded ? 'Collapse' : 'View Post'}
              <Icon
                icon="lucide:chevron-down"
                style={{
                  fontSize: '13px',
                  transition: 'transform 0.2s',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '4px',
          flexShrink: 0,
          alignItems: 'center',
        }}>
          <button
            onClick={() => onEdit(post)}
            title="Edit"
            style={{
              width: isMobile ? '40px' : '32px',
              height: isMobile ? '40px' : '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-ghost)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-ghost)';
            }}
          >
            <Icon icon="lucide:pencil" style={{ fontSize: '14px' }} />
          </button>

          <button
            onClick={() => onDelete(post.id)}
            title="Delete"
            style={{
              width: isMobile ? '40px' : '32px',
              height: isMobile ? '40px' : '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-ghost)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(248,113,113,0.1)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-ghost)';
            }}
          >
            <Icon icon="lucide:trash-2" style={{ fontSize: '14px' }} />
          </button>
        </div>
      </div>

    </div>
  );
}
