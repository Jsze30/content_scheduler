import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Settings({ settings, setSettings, onClose }) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState(settings);

  const updateSlot = (index, updates) => {
    setDraft(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map((s, i) => i === index ? { ...s, ...updates } : s),
    }));
  };

  const addSlot = () => {
    setDraft(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { time: '15:00', enabled: true }],
    }));
  };

  const removeSlot = (index) => {
    setDraft(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    setSettings(draft);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 150,
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        className="animate-slide-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: isMobile ? '24px 24px 0 0' : '24px',
          padding: isMobile ? '24px 20px' : '32px',
          paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom, 0px))' : '32px',
          width: isMobile ? '100%' : '90%',
          maxWidth: isMobile ? 'none' : '480px',
          maxHeight: isMobile ? '92vh' : '80vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <Icon icon="lucide:x" style={{ fontSize: '16px' }} />
          </button>
        </div>

        {/* Time Slots */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: '12px',
          }}>
            Queue Time Slots
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {draft.timeSlots.map((slot, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <button
                  onClick={() => updateSlot(i, { enabled: !slot.enabled })}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: `2px solid ${slot.enabled ? 'var(--color-accent)' : 'var(--color-border-light)'}`,
                    background: slot.enabled ? 'var(--color-accent)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {slot.enabled && <Icon icon="lucide:check" style={{ fontSize: '12px', color: '#000' }} />}
                </button>

                <input
                  type="time"
                  value={slot.time}
                  onChange={e => updateSlot(i, { time: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: slot.enabled ? 'var(--color-text)' : 'var(--color-text-ghost)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-satoshi)',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={() => removeSlot(i)}
                  style={{
                    width: '32px',
                    height: '32px',
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
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-ghost)'; }}
                >
                  <Icon icon="lucide:minus-circle" style={{ fontSize: '16px' }} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSlot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px dashed var(--color-border-light)',
              background: 'transparent',
              color: 'var(--color-text-ghost)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-satoshi)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-ghost)'; }}
          >
            <Icon icon="lucide:plus" style={{ fontSize: '14px' }} />
            Add time slot
          </button>
        </div>

        {/* Repost Boost */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: '12px',
          }}>
            Repost Boost
          </h3>

          {/* Enable toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '12px',
            border: `1px solid ${draft.boost?.enabled ? 'var(--color-accent)' : 'var(--color-border)'}`,
            background: draft.boost?.enabled ? 'rgba(255,107,80,0.05)' : 'var(--color-bg)',
            marginBottom: '12px',
            transition: 'all 0.2s',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                Enable Repost Boost
              </div>
            </div>
            <button
              onClick={() => setDraft(prev => ({
                ...prev,
                boost: { ...prev.boost, enabled: !prev.boost?.enabled },
              }))}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                border: 'none',
                background: draft.boost?.enabled ? 'var(--color-accent)' : 'var(--color-border-light)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '3px',
                left: draft.boost?.enabled ? '21px' : '3px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                display: 'block',
              }} />
            </button>
          </div>

          {/* Delay inputs — only shown when enabled */}
          {draft.boost?.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <Icon icon="lucide:repeat-2" style={{ fontSize: '15px', color: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>
                  Repost after
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={draft.boost?.repostAfterHours ?? 20}
                    onChange={e => setDraft(prev => ({
                      ...prev,
                      boost: { ...prev.boost, repostAfterHours: Math.max(1, Math.min(72, Number(e.target.value))) },
                    }))}
                    style={{
                      width: '60px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontSize: '14px',
                      fontFamily: 'var(--font-satoshi)',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>hours</span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <Icon icon="lucide:trash-2" style={{ fontSize: '15px', color: 'var(--color-text-ghost)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', flex: 1 }}>
                  Delete repost after
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={draft.boost?.unrepostAfterHours ?? 3}
                    onChange={e => setDraft(prev => ({
                      ...prev,
                      boost: { ...prev.boost, unrepostAfterHours: Math.max(1, Math.min(24, Number(e.target.value))) },
                    }))}
                    style={{
                      width: '60px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontSize: '14px',
                      fontFamily: 'var(--font-satoshi)',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>hours</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--color-accent)',
            color: '#000',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-satoshi)',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
