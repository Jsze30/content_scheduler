import { Icon } from '@iconify/react';
import PostCard from './PostCard';
import { groupPostsByDay, formatDate } from '../utils/helpers';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Queue({ posts, drafts, onEdit, onDelete }) {
  const isMobile = useIsMobile();
  const grouped = groupPostsByDay(posts.filter(p => p.status === 'queued'));
  const dayKeys = Object.keys(grouped).sort();

  return (
    <div className="animate-fade-in" style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: isMobile ? '16px' : '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '20px' : '32px',
      }}>
        <div>
          <h1 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>Queue</h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            marginTop: '4px',
          }}>
            Your upcoming scheduled posts
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-dim)',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            background: 'rgba(255,107,80,0.12)',
            color: 'var(--color-accent)',
            fontSize: '12px',
            fontWeight: 800,
          }}>
            {posts.filter(p => p.status === 'queued').length}
          </span>
          posts queued
        </div>
      </div>

      {/* Empty state */}
      {dayKeys.length === 0 && drafts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          color: 'var(--color-text-dim)',
        }}>
          <Icon icon="lucide:inbox" style={{
            fontSize: '48px',
            color: 'var(--color-text-ghost)',
            marginBottom: '16px',
            display: 'block',
            margin: '0 auto 16px',
          }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--color-text-muted)',
          }}>
            Your queue is empty
          </h3>
          <p style={{ fontSize: '14px' }}>
            Head to Composer to write your first post
          </p>
        </div>
      )}

      {/* Queued posts grouped by day */}
      {dayKeys.map((dayKey, dayIndex) => (
        <div key={dayKey} style={{
          marginBottom: '32px',
          animationDelay: `${dayIndex * 0.05}s`,
        }} className="animate-slide-up">
          {/* Day header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <h2 style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
            }}>
              {formatDate(dayKey + 'T00:00:00')}
            </h2>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'var(--color-border)',
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-ghost)',
            }}>
              {grouped[dayKey].length} {grouped[dayKey].length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {/* Posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {grouped[dayKey].map(post => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={onEdit}
                onDelete={onDelete}

              />
            ))}
          </div>
        </div>
      ))}

      {/* Drafts section */}
      {drafts.length > 0 && (
        <div style={{ marginTop: '48px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <h2 style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-ghost)',
            }}>
              Drafts
            </h2>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'var(--color-border)',
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-ghost)',
            }}>
              {drafts.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drafts.map(draft => (
              <PostCard
                key={draft.id}
                post={draft}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
