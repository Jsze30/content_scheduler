import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';

const MAX_MEDIA = 4; // X allows up to 4 images per tweet

export default function TweetCard({ index, content, media = [], onChange, onMediaChange, onDelete, canDelete, totalTweets, onAskAI }) {
  const charCount = content.length;
  const isNearLimit = charCount > 250;
  const isOverLimit = charCount > 280;
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    const remaining = MAX_MEDIA - media.length;
    const toAdd = validFiles.slice(0, remaining);

    if (toAdd.length === 0) return;

    // Convert files to data URLs for preview + localStorage persistence
    const readers = toAdd.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          dataUrl: reader.result,
          type: file.type,
          name: file.name,
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newMedia => {
      onMediaChange(index, [...media, ...newMedia]);
    });
  };

  const removeMedia = (mediaIndex) => {
    onMediaChange(index, media.filter((_, i) => i !== mediaIndex));
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're leaving the card entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '12px' }}>
      {/* Thread connector line */}
      {totalTweets > 1 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '32px',
          flexShrink: 0,
          paddingTop: '4px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}>
            {index + 1}
          </div>
          {index < totalTweets - 1 && (
            <div style={{
              width: '2px',
              flex: 1,
              background: 'var(--color-border)',
              marginTop: '4px',
              marginBottom: '-20px',
              minHeight: '20px',
            }} />
          )}
        </div>
      )}

      {/* Tweet content */}
      <div
        style={{
          flex: 1,
          background: 'var(--color-surface)',
          border: isDragging ? '1px solid var(--color-accent)' : '1px solid var(--color-border-light)',
          borderRadius: '16px',
          padding: '16px',
          transition: 'all 0.2s',
          boxShadow: isDragging ? '0 0 0 3px rgba(255,107,80,0.15), var(--shadow-md)' : 'var(--shadow-md)',
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <textarea
          value={content}
          onChange={e => onChange(index, e.target.value)}
          placeholder={index === 0 ? "What's happening?" : "Add to your thread..."}
          style={{
            width: '100%',
            minHeight: '100px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text)',
            fontSize: '16px',
            lineHeight: 1.6,
            fontFamily: 'var(--font-satoshi)',
            resize: 'none',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        />

        {/* Drag overlay hint */}
        {isDragging && (
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(255,107,80,0.08)',
            border: '1px dashed var(--color-accent)',
            textAlign: 'center',
            color: 'var(--color-accent)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '8px',
          }}>
            <Icon icon="lucide:image-plus" style={{ fontSize: '20px', marginBottom: '4px', display: 'block', margin: '0 auto 4px' }} />
            Drop media here
          </div>
        )}

        {/* Media previews */}
        {media.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: media.length === 1 ? '1fr' : 'repeat(2, 1fr)',
            gap: '6px',
            marginTop: '10px',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {media.map((item, mIdx) => (
              <div key={mIdx} style={{
                position: 'relative',
                aspectRatio: media.length === 1 ? '16/9' : '1',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'var(--color-bg)',
              }}>
                {item.type.startsWith('video/') ? (
                  <video
                    src={item.dataUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    muted
                  />
                ) : (
                  <img
                    src={item.dataUrl}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeMedia(mIdx)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(4px)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.9)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                >
                  <Icon icon="lucide:x" style={{ fontSize: '12px' }} />
                </button>

                {/* Video indicator */}
                {item.type.startsWith('video/') && (
                  <div style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '6px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Icon icon="lucide:play" style={{ fontSize: '10px' }} />
                    Video
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Add media button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={media.length >= MAX_MEDIA}
              title={media.length >= MAX_MEDIA ? 'Max 4 media per tweet' : 'Add media'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: media.length >= MAX_MEDIA ? 'var(--color-border)' : 'var(--color-text-ghost)',
                cursor: media.length >= MAX_MEDIA ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (media.length < MAX_MEDIA) {
                  e.currentTarget.style.color = 'var(--color-accent)';
                  e.currentTarget.style.background = 'rgba(255,107,80,0.1)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = media.length >= MAX_MEDIA ? 'var(--color-border)' : 'var(--color-text-ghost)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon icon="lucide:image-plus" style={{ fontSize: '16px' }} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />

            {/* Media count */}
            {media.length > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-ghost)',
              }}>
                {media.length}/{MAX_MEDIA}
              </span>
            )}

            <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />

            {/* Char count */}
            <div style={{
              fontSize: '13px',
              fontWeight: 500,
              color: isOverLimit ? '#f87171' : isNearLimit ? 'var(--color-accent)' : 'var(--color-text-ghost)',
            }}>
              {charCount} / 280
            </div>
          </div>

          {index === 0 && onAskAI ? (
            <button
              onClick={onAskAI}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-ghost)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-satoshi)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.background = 'rgba(255,107,80,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--color-text-ghost)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon icon="lucide:sparkles" style={{ fontSize: '13px' }} />
              Ask AI
            </button>
          ) : canDelete && (
            <button
              onClick={() => onDelete(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-ghost)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-satoshi)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.background = 'rgba(248,113,113,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--color-text-ghost)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon icon="lucide:trash-2" style={{ fontSize: '13px' }} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
