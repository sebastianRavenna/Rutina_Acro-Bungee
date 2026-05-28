import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { SetupView } from './components/setup/SetupView';
import { MovementEditor } from './components/setup/MovementEditor';
import { SettingsPanel } from './components/setup/SettingsPanel';
import { LibraryView } from './components/setup/LibraryView';
import { PlaybackView } from './components/playback/PlaybackView';
import { useSpotifyAuthCallback } from './hooks/useSpotifyAuth';

export function App() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  // Maneja el callback OAuth de Spotify (intercambio code → tokens) si llegamos a /callback?code=...
  useSpotifyAuthCallback();

  useEffect(() => {
    // Si el store quedó en 'playback' o 'editor' sin contexto válido tras un refresh, volvemos a home
    const state = useAppStore.getState();
    if (state.view === 'playback' && !state.playback) {
      setView('home');
    }
    if (state.view === 'editor' && !state.activeRoutineId) {
      setView('home');
    }
  }, [setView]);

  switch (view) {
    case 'editor':
      return <MovementEditor />;
    case 'playback':
      return <PlaybackView />;
    case 'settings':
      return <SettingsPanel />;
    case 'library':
      return <LibraryView />;
    case 'home':
    default:
      return <SetupView />;
  }
}
