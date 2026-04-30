import { Icon } from '@iconify/react';
import { getTimeUntil } from '../utils/helpers';
import { useIsMobile } from '../hooks/useIsMobile';

export default function BottomBar({ queuedCount, todayCount, nextPost, onQueueClick }) {
  const isMobile = useIsMobile();
  const nextPostTime = nextPost ? getTimeUntil(nextPost.scheduledAt) : null;

  const containerStyle = isMobile ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    fontSize: '13px',
    fontWeight: 500,
  } : {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 110,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 12px 10px 24px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontSize: '13px',
    fontWeight: 500,
  };

  return (
    <div className="glass" style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Icon icon="lucide:layers" style={{ fontSize: '15px', color: 'var(--color-accent)', flexShrink: 0 }} />
          <strong style={{ color: 'var(--color-text)' }}>{queuedCount}</strong>
          {!isMobile && ' queued'}
        </span>

        <div style={{ width: '1px', height: '16px', background: 'var(--color-border-light)', flexShrink: 0 }} />

        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Icon icon="lucide:calendar-check" style={{ fontSize: '15px', flexShrink: 0 }} />
          <strong style={{ color: 'var(--color-text)' }}>{todayCount}</strong>
          {!isMobile && ' today'}
        </span>

        {!isMobile && nextPostTime && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--color-border-light)' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Icon icon="lucide:clock" style={{ fontSize: '15px' }} />
              Next in <strong style={{ color: 'var(--color-text)' }}>{nextPostTime}</strong>
            </span>
          </>
        )}

        {isMobile && nextPostTime && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--color-border-light)', flexShrink: 0 }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-dim)' }}>
              <Icon icon="lucide:clock" style={{ fontSize: '13px', flexShrink: 0 }} />
              <strong style={{ color: 'var(--color-text)', fontWeight: 600 }}>{nextPostTime}</strong>
            </span>
          </>
        )}
      </div>

      <button
        onClick={onQueueClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: isMobile ? '9px 16px' : '8px 18px',
          borderRadius: '12px',
          background: 'var(--color-accent)',
          color: '#000',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          border: 'none',
          fontFamily: 'var(--font-satoshi)',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
      >
        <Icon icon="ri:twitter-x-fill" style={{ fontSize: '14px' }} />
        Queue
      </button>
    </div>
  );
}
