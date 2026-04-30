import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(({ connected }) => {
        setIsConnected(connected);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Handle ?connected=true redirect from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setIsConnected(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const login = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsConnected(false);
  }, []);

  return { isConnected, isLoading, login, logout };
}
