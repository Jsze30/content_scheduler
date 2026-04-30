import { useState } from 'react';
import Navbar from './components/Navbar';
import BottomBar from './components/BottomBar';
import Composer from './components/Composer';
import Queue from './components/Queue';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import AIAssistant from './components/AIAssistant';
import Toast, { useToast } from './components/Toast';
import { usePosts } from './hooks/usePosts';
import { useAuth } from './hooks/useAuth';
import { useIsMobile } from './hooks/useIsMobile';
import { findNextSlot } from './utils/scheduling';

export default function App() {
  const [activeView, setActiveViewState] = useState(() => {
    return localStorage.getItem('cp-active-view') || 'composer';
  });
  const setActiveView = (v) => {
    localStorage.setItem('cp-active-view', v);
    setActiveViewState(v);
  };
  const [showSettings, setShowSettings] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [composerTweets, setComposerTweets] = useState([{ content: '', media: [] }]);
  const [pendingAIMessage, setPendingAIMessage] = useState(null);
  const [chatKey, setChatKey] = useState(0);
  const { toasts, addToast, removeToast } = useToast();
  const { isConnected, isLoading: isAuthLoading, login, logout } = useAuth();

  const isMobile = useIsMobile();

  const {
    posts,
    settings,
    setSettings,
    addToQueue,
    schedulePost,
    saveDraft,
    updatePost,
    deletePost,
    getQueuedPosts,
    getDrafts,
    getTodayCount,
    getNextPost,
  } = usePosts();

  // Composer handlers
  const handleAddToQueue = async (tweets, editId) => {
    if (editId) {
      const editingPostObj = posts.find(p => p.id === editId);
      if (editingPostObj?.scheduledAt) {
        const ok = await updatePost(editId, { tweets });
        if (ok) addToast('Post updated');
        else addToast('Failed to update post — please try again', 'error');
      } else {
        const nextSlot = findNextSlot(posts, settings.timeSlots);
        if (!nextSlot) {
          addToast('No available slots — add more time slots in Settings', 'error');
          return null;
        }
        const ok = await updatePost(editId, { tweets, scheduledAt: nextSlot, status: 'queued' });
        if (ok) addToast('Added to queue');
        else addToast('Failed to add to queue — please try again', 'error');
      }
      return true;
    }
    const result = await addToQueue(tweets);
    if (result) {
      addToast('Added to queue');
      return result;
    }
    addToast('No available slots — add more time slots in Settings', 'error');
    return null;
  };

  const handleSchedule = async (tweets, scheduledAt, editId) => {
    if (editId) {
      const ok = await updatePost(editId, { tweets, scheduledAt, status: 'queued' });
      if (ok) addToast('Post rescheduled');
      else addToast('Failed to reschedule — please try again', 'error');
      return ok || null;
    }
    const result = await schedulePost(tweets, scheduledAt);
    if (result) {
      addToast('Post scheduled');
      return result;
    }
    return null;
  };

  const handleSaveDraft = async (tweets, editId) => {
    if (editId) {
      const ok = await updatePost(editId, { tweets, status: 'draft', scheduledAt: null });
      if (ok) {
        addToast('Saved as draft');
        setActiveView('queue');
      } else {
        addToast('Failed to save draft — please try again', 'error');
      }
      return ok || null;
    }
    const result = await saveDraft(tweets);
    if (result) {
      addToast('Draft saved');
      setActiveView('queue');
      return result;
    }
    return null;
  };

  const handleAskAI = (tweets) => {
    const draftText = tweets.map((t) => t.content).join('\n\n[thread continues]\n\n');
    setPendingAIMessage(`Here is my X post:\n\n${draftText}\n\n`);
    setActiveView('ai');
  };

  const handleUseInComposer = (tweets) => {
    setComposerTweets(tweets.map(t => ({ content: t.content, media: t.media || [] })));
    setEditingPost({ id: null, tweets, fromAI: true });
    setActiveView('composer');
  };

  const handleEdit = (post) => {
    setComposerTweets(post.tweets.map(t => ({ content: t.content, media: t.media || [] })));
    setEditingPost(post);
    setActiveView('composer');
  };

  const handleDelete = async (id) => {
    const ok = await deletePost(id);
    if (ok) addToast('Post deleted');
    else addToast('Failed to delete — please try again', 'error');
  };

  const queuedPosts = getQueuedPosts();
  const drafts = getDrafts();

  return (
    <div style={{ minHeight: '100vh', paddingTop: '64px', paddingBottom: activeView === 'ai' ? 0 : isMobile ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '100px', overflow: activeView === 'ai' ? 'hidden' : undefined }}>
      <Navbar
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          if (v !== 'composer') setEditingPost(null);
        }}
        onSettingsClick={() => setShowSettings(true)}
        isConnected={isConnected}
        isAuthLoading={isAuthLoading}
        onLogin={login}
        onLogout={logout}
      />

      <main style={{ paddingTop: activeView === 'ai' ? 0 : '24px' }}>
        {activeView === 'composer' && (
          <Composer
            onAddToQueue={handleAddToQueue}
            onSchedule={handleSchedule}
            onSaveDraft={handleSaveDraft}
            editingPost={editingPost}
            onClearEdit={() => setEditingPost(null)}
            onAskAI={handleAskAI}
            tweets={composerTweets}
            onTweetsChange={setComposerTweets}
          />
        )}

        {activeView === 'queue' && (
          <Queue
            posts={posts}
            drafts={drafts}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {activeView === 'calendar' && (
          <Calendar
            posts={posts}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {activeView === 'ai' && (
          <AIAssistant
            key={chatKey}
            onUseInComposer={handleUseInComposer}
            pendingMessage={pendingAIMessage}
            onPendingMessageSent={() => setPendingAIMessage(null)}
            onNewChat={() => setChatKey(k => k + 1)}
          />
        )}
      </main>

      <BottomBar
        queuedCount={queuedPosts.length}
        todayCount={getTodayCount()}
        nextPost={getNextPost()}
        onQueueClick={() => setActiveView('queue')}
      />

      {showSettings && (
        <Settings
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
