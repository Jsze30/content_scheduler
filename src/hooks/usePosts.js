import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { findNextSlot } from '../utils/scheduling';

// Map Supabase snake_case row → local camelCase shape
function fromDb(row) {
  return {
    id: row.id,
    tweets: row.tweets,
    scheduledAt: row.scheduled_at,
    status: row.status,
    postedAt: row.posted_at,
    tweetIds: row.tweet_ids,
    boost: row.boost || null,
    error: row.error,
    createdAt: row.created_at,
  };
}

const DEFAULT_SETTINGS = {
  timeSlots: [
    { time: '09:00', enabled: true },
    { time: '12:00', enabled: true },
    { time: '18:00', enabled: true },
  ],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  boost: {
    enabled: false,
    repostAfterHours: 20,
    unrepostAfterHours: 3,
  },
};

export function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Settings: localStorage for instant load, Supabase for cross-device sync
  const [settings, setSettingsState] = useState(() => {
    try {
      const saved = localStorage.getItem('cp-settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const fetchSettings = useCallback(() => {
    supabase
      .from('settings')
      .select('data')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.data && Object.keys(data.data).length > 0) {
          const merged = { ...DEFAULT_SETTINGS, ...data.data };
          setSettingsState(merged);
          localStorage.setItem('cp-settings', JSON.stringify(merged));
        }
      });
  }, []);

  const fetchPosts = useCallback(() => {
    supabase
      .from('posts')
      .select('*')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!error && data) setPosts(data.map(fromDb));
        setLoading(false);
      });
  }, []);

  // Load on mount
  useEffect(() => {
    fetchSettings();
    fetchPosts();
  }, [fetchSettings, fetchPosts]);

  // Refetch when the user switches back to this tab/app (cross-device sync)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSettings();
        fetchPosts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchSettings, fetchPosts]);

  const setSettings = useCallback((value) => {
    setSettingsState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('cp-settings', JSON.stringify(next));
      supabase.from('settings').upsert({ id: 1, data: next }).then(() => {});
      return next;
    });
  }, []);

  const addPost = useCallback(async (tweets, scheduledAt, status = 'queued', boost = null) => {
    const insertData = { tweets, scheduled_at: scheduledAt || null, status };
    if (boost) insertData.boost = boost;

    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (error) return null;
    const newPost = fromDb(data);
    setPosts(prev => [...prev, newPost]);
    return newPost;
  }, []);

  const buildBoost = useCallback((boostSettings) => {
    if (!boostSettings?.enabled) return null;
    return {
      status: 'pending',
      repostAfterHours: boostSettings.repostAfterHours,
      unrepostAfterHours: boostSettings.unrepostAfterHours,
      repostId: null,
      repostedAt: null,
      unrepostedAt: null,
      error: null,
    };
  }, []);

  const addToQueue = useCallback(async (tweets) => {
    const nextSlot = findNextSlot(posts, settings.timeSlots);
    if (!nextSlot) return null;
    return addPost(tweets, nextSlot, 'queued', buildBoost(settings.boost));
  }, [posts, settings, addPost, buildBoost]);

  const schedulePost = useCallback(async (tweets, scheduledAt) => {
    return addPost(tweets, scheduledAt, 'queued', buildBoost(settings.boost));
  }, [settings, addPost, buildBoost]);

  const saveDraft = useCallback(async (tweets) => {
    return addPost(tweets, null, 'draft');
  }, [addPost]);

  const updatePost = useCallback(async (id, updates) => {
    const dbUpdates = {};
    if (updates.tweets !== undefined) dbUpdates.tweets = updates.tweets;
    if (updates.scheduledAt !== undefined) dbUpdates.scheduled_at = updates.scheduledAt;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase.from('posts').update(dbUpdates).eq('id', id);
    if (!error) setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    return !error;
  }, []);

  const deletePost = useCallback(async (id) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) setPosts(prev => prev.filter(p => p.id !== id));
    return !error;
  }, []);

  const getQueuedPosts = useCallback(() => {
    return posts
      .filter(p => p.status === 'queued' && p.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [posts]);

  const getDrafts = useCallback(() => {
    return posts.filter(p => p.status === 'draft');
  }, [posts]);

  const getPostsForDate = useCallback((dateStr) => {
    return posts.filter(p => {
      if (!p.scheduledAt) return false;
      const postDate = new Date(p.scheduledAt);
      const targetDate = new Date(dateStr);
      return postDate.getFullYear() === targetDate.getFullYear() &&
        postDate.getMonth() === targetDate.getMonth() &&
        postDate.getDate() === targetDate.getDate();
    });
  }, [posts]);

  const getTodayCount = useCallback(() => {
    const today = new Date();
    return posts.filter(p => {
      if (!p.scheduledAt || p.status !== 'queued') return false;
      const d = new Date(p.scheduledAt);
      return d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    }).length;
  }, [posts]);

  const getNextPost = useCallback(() => {
    const now = new Date();
    return posts
      .filter(p => p.status === 'queued' && p.scheduledAt && new Date(p.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;
  }, [posts]);

  return {
    posts,
    loading,
    settings,
    setSettings,
    addToQueue,
    schedulePost,
    saveDraft,
    updatePost,
    deletePost,
    getQueuedPosts,
    getDrafts,
    getPostsForDate,
    getTodayCount,
    getNextPost,
  };
}
