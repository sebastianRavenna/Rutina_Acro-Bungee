import { useEffect } from 'react';
import { exchangeCodeForTokens } from '../utils/spotify-auth';
import { useAppStore } from '../store/useAppStore';

/**
 * Detecta si llegamos a /callback?code=... como retorno del OAuth de Spotify,
 * intercambia el code por tokens y limpia la URL. Vuelve a la vista anterior.
 */
export function useSpotifyAuthCallback() {
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const isCallback = url.pathname === '/callback';
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (!isCallback) return;

    const finalize = (target: 'settings' | 'home') => {
      window.history.replaceState({}, '', '/');
      setView(target);
    };

    if (error) {
      console.warn('Spotify auth error:', error);
      finalize('settings');
      return;
    }

    if (code) {
      exchangeCodeForTokens(code)
        .then(() => finalize('settings'))
        .catch((e) => {
          console.error('Spotify token exchange failed', e);
          finalize('settings');
        });
      return;
    }

    finalize('home');
  }, [setView]);
}
