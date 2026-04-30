import { Icon } from '@iconify/react';
import AuthButton from './AuthButton';
import { useIsMobile } from '../hooks/useIsMobile';

const tabs = [
  { id: 'composer', label: 'Composer', icon: 'lucide:pen-line' },
  { id: 'queue', label: 'Queue', icon: 'lucide:list-ordered' },
  { id: 'calendar', label: 'Calendar', icon: 'lucide:calendar' },
  { id: 'ai', label: 'Chat', icon: 'lucide:sparkles' },
];

export default function Navbar({ activeView, setActiveView, onSettingsClick, isConnected, isAuthLoading, onLogin, onLogout }) {
  const isMobile = useIsMobile();

  return (
    <nav className="glass" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: isMobile ? '0 12px' : '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '32px' }}>
        <a href="/" id="nav-logo" style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'rotate(12deg)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
          >
            <img src="/logo.png" alt="Content Scheduler" style={{
              width: '28px',
              height: '28px',
              filter: 'invert(1)',
            }} />
          </div>
        </a>

        {/* Nav Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => setActiveView(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: isMobile ? '8px 10px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeView === tab.id ? 'rgba(255, 107, 80, 0.12)' : 'transparent',
                color: activeView === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-satoshi)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (activeView !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (activeView !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon icon={tab.icon} style={{ fontSize: '16px' }} />
              {!isMobile && tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AuthButton
          isConnected={isConnected}
          isLoading={isAuthLoading}
          onLogin={onLogin}
          onLogout={onLogout}
        />
        <button
          id="nav-settings"
          onClick={onSettingsClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid var(--color-border-light)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
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
          <Icon icon="lucide:settings" style={{ fontSize: '18px' }} />
        </button>
      </div>
    </nav>
  );
}
