import { useState } from 'react';
import { Icon } from '@iconify/react';
import TweetCard from './TweetCard';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Composer({ onAddToQueue, onSchedule, onSaveDraft, editingPost, onClearEdit, onAskAI, tweets, onTweetsChange }) {
  const isMobile = useIsMobile();
  const setTweets = onTweetsChange;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');


  const handleTweetChange = (index, content) => {
    setTweets(prev => prev.map((t, i) => i === index ? { ...t, content } : t));
  };

  const handleMediaChange = (index, media) => {
    setTweets(prev => prev.map((t, i) => i === index ? { ...t, media } : t));
  };

  const addTweet = () => {
    setTweets(prev => [...prev, { content: '', media: [] }]);
  };

  const removeTweet = (index) => {
    setTweets(prev => prev.filter((_, i) => i !== index));
  };

  const resetComposer = () => {
    setTweets([{ content: '', media: [] }]);
    setShowDatePicker(false);
    setScheduleDate('');
    setScheduleTime('');
    if (onClearEdit) onClearEdit();
  };

  const hasContent = tweets.some(t => t.content.trim().length > 0 || (t.media && t.media.length > 0));

  const handleAddToQueue = () => {
    if (!hasContent) return;
    const result = onAddToQueue(tweets, editingPost?.id);
    if (result) resetComposer();
  };

  const handleSchedule = () => {
    if (!hasContent || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    const result = onSchedule(tweets, scheduledAt, editingPost?.id);
    if (result) resetComposer();
  };

  const handleSaveDraft = () => {
    if (!hasContent) return;
    const result = onSaveDraft(tweets, editingPost?.id);
    if (result) resetComposer();
  };

  return (
    <div className="animate-fade-in" style={{
      maxWidth: '640px',
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
            color: 'var(--color-text)',
          }}>
            {editingPost && !editingPost.fromAI ? 'Edit Post' : 'Compose'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            marginTop: '4px',
          }}>
            {editingPost ? 'Make your changes and reschedule' : 'Write your next post for X'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
        }}>
          <Icon icon="ri:twitter-x-fill" style={{ fontSize: '14px' }} />
          Post
        </div>
      </div>

      {/* Tweet Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tweets.map((tweet, i) => (
          <TweetCard
            key={i}
            index={i}
            content={tweet.content}
            media={tweet.media || []}
            onChange={handleTweetChange}
            onMediaChange={handleMediaChange}
            onDelete={removeTweet}
            canDelete={tweets.length > 1 && i > 0}
            totalTweets={tweets.length}
            onAskAI={i === 0 && onAskAI ? () => onAskAI(tweets) : undefined}
          />
        ))}
      </div>

      {/* Add tweet to thread */}
      <button
        onClick={addTweet}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '14px',
          marginTop: '12px',
          borderRadius: '12px',
          border: '1px dashed var(--color-border-light)',
          background: 'transparent',
          color: 'var(--color-text-ghost)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-satoshi)',
          transition: 'all 0.2s',
          justifyContent: 'center',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.color = 'var(--color-accent)';
          e.currentTarget.style.background = 'rgba(255,107,80,0.05)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-border-light)';
          e.currentTarget.style.color = 'var(--color-text-ghost)';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Icon icon="lucide:plus" style={{ fontSize: '16px' }} />
        Add to thread
      </button>

      {/* Schedule Controls */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: 'var(--color-surface)',
        borderRadius: '16px',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Date picker toggle */}
        {showDatePicker && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <input
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--color-border-light)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontFamily: 'var(--font-satoshi)',
                outline: 'none',
                width: isMobile ? '100%' : undefined,
              }}
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
              style={{
                width: isMobile ? '100%' : '140px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--color-border-light)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontFamily: 'var(--font-satoshi)',
                outline: 'none',
              }}
            />
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '10px',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Add to Queue */}
          <button
            onClick={handleAddToQueue}
            disabled={!hasContent}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: hasContent ? 'var(--color-accent)' : 'var(--color-border)',
              color: hasContent ? '#000' : 'var(--color-text-ghost)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: hasContent ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-satoshi)',
              transition: 'all 0.2s',
              flex: 1,
            }}
            onMouseEnter={e => {
              if (hasContent) e.currentTarget.style.background = 'var(--color-accent-hover)';
            }}
            onMouseLeave={e => {
              if (hasContent) e.currentTarget.style.background = 'var(--color-accent)';
            }}
          >
            <Icon icon="lucide:layers" style={{ fontSize: '16px' }} />
            {editingPost ? 'Update in Queue' : 'Add to Queue'}
          </button>

          {/* Schedule for specific time */}
          {showDatePicker ? (
            <button
              onClick={handleSchedule}
              disabled={!hasContent || !scheduleDate || !scheduleTime}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '1px solid var(--color-border-light)',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (!hasContent || !scheduleDate || !scheduleTime) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-satoshi)',
                transition: 'all 0.2s',
                opacity: (!hasContent || !scheduleDate || !scheduleTime) ? 0.4 : 1,
                flex: 1,
              }}
            >
              <Icon icon="lucide:calendar-clock" style={{ fontSize: '16px' }} />
              Schedule
            </button>
          ) : (
            <button
              onClick={() => setShowDatePicker(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '1px solid var(--color-border-light)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-satoshi)',
                transition: 'all 0.2s',
                flex: 1,
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
              <Icon icon="lucide:calendar-clock" style={{ fontSize: '16px' }} />
              Pick time
            </button>
          )}

          {/* Save as Draft */}
          <button
            onClick={handleSaveDraft}
            disabled={!hasContent}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: hasContent ? 'var(--color-text-muted)' : 'var(--color-text-ghost)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: hasContent ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-satoshi)',
              transition: 'all 0.2s',
              flex: 1,
            }}
            onMouseEnter={e => {
              if (hasContent) {
                e.currentTarget.style.background = 'var(--color-surface)';
                e.currentTarget.style.color = 'var(--color-text)';
              }
            }}
            onMouseLeave={e => {
              if (hasContent) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }
            }}
          >
            <Icon icon="lucide:file-text" style={{ fontSize: '16px' }} />
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}
