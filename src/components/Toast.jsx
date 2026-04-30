import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function Toast({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      right: '24px',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={toast.exiting ? 'toast-exit' : 'toast-enter'}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-light)',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--color-text)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            cursor: 'pointer',
          }}
          onClick={() => removeToast(toast.id)}
        >
          <Icon
            icon={toast.type === 'success' ? 'lucide:check-circle' : toast.type === 'error' ? 'lucide:x-circle' : 'lucide:info'}
            style={{
              color: toast.type === 'success' ? '#4ade80' : toast.type === 'error' ? '#f87171' : 'var(--color-accent)',
              fontSize: '18px',
              flexShrink: 0,
            }}
          />
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// Hook for toast management
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 2500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  return { toasts, addToast, removeToast };
}
