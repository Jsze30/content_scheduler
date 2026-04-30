import { useState } from 'react';
import { Icon } from '@iconify/react';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay } from '../utils/helpers';
import PostCard from './PostCard';
import { useIsMobile } from '../hooks/useIsMobile';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_MOBILE = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar({ posts, onEdit, onDelete }) {
  const isMobile = useIsMobile();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const getPostsForDay = (day) => {
    const date = new Date(year, month, day);
    return posts.filter(p => {
      if (!p.scheduledAt) return false;
      return isSameDay(new Date(p.scheduledAt), date);
    });
  };

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="animate-fade-in" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: isMobile ? '16px' : '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '16px' : '32px',
      }}>
        <h1 style={{
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}>Calendar</h1>

        {/* Month navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '16px',
        }}>
          <button onClick={prevMonth} style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid var(--color-border-light)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <Icon icon="lucide:chevron-left" style={{ fontSize: '18px' }} />
          </button>

          <span style={{
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: 600,
            minWidth: isMobile ? '120px' : '160px',
            textAlign: 'center',
          }}>
            {isMobile ? MONTHS[month].slice(0, 3) : MONTHS[month]} {year}
          </span>

          <button onClick={nextMonth} style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid var(--color-border-light)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <Icon icon="lucide:chevron-right" style={{ fontSize: '18px' }} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '20px',
        border: '1px solid var(--color-border-light)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Weekday headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          {(isMobile ? WEEKDAYS_MOBILE : WEEKDAYS).map((day, i) => (
            <div key={i} style={{
              padding: isMobile ? '8px 4px' : '12px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: isMobile ? '0' : '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-ghost)',
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
        }}>
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} style={{
                minHeight: isMobile ? '52px' : '80px',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none',
                borderBottom: '1px solid var(--color-border)',
              }} />;
            }

            const dayPosts = getPostsForDay(day);
            const isToday = isSameDay(new Date(year, month, day), now);
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{
                  minHeight: isMobile ? '52px' : '80px',
                  padding: isMobile ? '4px' : '8px',
                  cursor: 'pointer',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none',
                  borderBottom: '1px solid var(--color-border)',
                  background: isSelected ? 'rgba(255,107,80,0.05)' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: isMobile ? '2px' : '4px',
                }}>
                  <span style={{
                    width: isMobile ? '22px' : '28px',
                    height: isMobile ? '22px' : '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#000' : 'var(--color-text-muted)',
                    background: isToday ? 'var(--color-accent)' : 'transparent',
                  }}>
                    {day}
                  </span>
                </div>

                {/* Post dots */}
                {dayPosts.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: isMobile ? '2px' : '3px',
                    flexWrap: 'wrap',
                    marginTop: isMobile ? '2px' : '4px',
                  }}>
                    {dayPosts.slice(0, isMobile ? 3 : 4).map((_, idx) => (
                      <div key={idx} style={{
                        width: isMobile ? '4px' : '6px',
                        height: isMobile ? '4px' : '6px',
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                      }} />
                    ))}
                    {dayPosts.length > (isMobile ? 3 : 4) && (
                      <span style={{
                        fontSize: '9px',
                        color: 'var(--color-text-ghost)',
                        fontWeight: 600,
                      }}>
                        +{dayPosts.length - (isMobile ? 3 : 4)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day expansion */}
      {selectedDay && (
        <div className="animate-slide-up" style={{
          marginTop: '16px',
          padding: '20px',
          background: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border-light)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: '12px',
          }}>
            {MONTHS[month]} {selectedDay}, {year}
          </h3>

          {selectedDayPosts.length === 0 ? (
            <p style={{
              fontSize: '14px',
              color: 'var(--color-text-ghost)',
              padding: '20px 0',
              textAlign: 'center',
            }}>
              No posts scheduled for this day
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
