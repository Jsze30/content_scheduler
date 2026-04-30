import { Icon } from '@iconify/react';

export default function AuthButton({ isConnected, isLoading, onLogin, onLogout }) {
  if (isLoading) {
    return (
      <div style={{
        width: '120px',
        height: '36px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
      }} />
    );
  }

  if (isConnected) {
    return null;
  }

  return (
    <button
      onClick={onLogin}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '10px',
        border: '1px solid var(--color-border-light)',
        background: 'transparent',
        color: 'var(--color-text-muted)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-satoshi)',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--color-surface)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-muted)';
      }}
    >
      <Icon icon="ri:twitter-x-fill" style={{ fontSize: '14px' }} />
      Log in
    </button>
  );
}
