import { useCallback, useEffect, useRef, useState } from 'react';
import { getValidAccessToken, loadTokens, clearTokens } from '../utils/spotify-auth';

export interface SpotifyTrack {
  name: string;
  artists: string;
  albumImageUrl: string | null;
  uri: string;
}

interface UseSpotifyResult {
  isAuthenticated: boolean;
  /** Hay un dispositivo activo en Spotify Connect (algún device del user reproduciendo). */
  hasActiveDevice: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  volume: number;
  errorMessage: string | null;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  duckVolume: () => Promise<void>;
  restoreVolume: () => Promise<void>;
  logout: () => void;
}

const POLL_INTERVAL_MS = 3000;
const DUCK_RATIO = 0.3;

interface SpotifyPlayerState {
  is_playing: boolean;
  device: { id: string; volume_percent: number; is_active: boolean } | null;
  item: {
    name: string;
    uri: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  } | null;
}

async function fetchPlayerState(): Promise<SpotifyPlayerState | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return null; // sin device activo
    if (!res.ok) return null;
    return (await res.json()) as SpotifyPlayerState;
  } catch {
    return null;
  }
}

async function apiCall(
  method: 'PUT' | 'POST',
  path: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, status: 0, body: 'sin token' };
  try {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = res.ok ? '' : await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : String(e) };
  }
}

function describeApiError(status: number, body: string): string {
  if (status === 401) return 'Sesión expirada. Reconectá tu cuenta de Spotify.';
  if (status === 403) {
    if (body.toLowerCase().includes('premium')) {
      return 'Requiere Spotify Premium para controlar la reproducción.';
    }
    return 'Spotify no permite esta acción ahora mismo (¿reproducción restringida?).';
  }
  if (status === 404) {
    return 'No hay ningún dispositivo reproduciendo. Abrí Spotify y pone play a algo primero.';
  }
  if (status === 429) return 'Demasiadas peticiones a Spotify. Esperá unos segundos.';
  if (status === 0) return body || 'No se pudo contactar a Spotify.';
  return `Error Spotify ${status}${body ? ': ' + body.slice(0, 120) : ''}`;
}

export function useSpotify(enabled: boolean): UseSpotifyResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!loadTokens());
  const [hasActiveDevice, setHasActiveDevice] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Para ducking: guardamos el volumen previo antes de bajar
  const preDuckVolumeRef = useRef<number | null>(null);
  // Para optimistic UI: si el user mueve el slider, no querés que el siguiente poll lo pise
  const lastUserVolumeChangeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    setIsAuthenticated(!!loadTokens());
  }, [enabled]);

  const refreshState = useCallback(async () => {
    const state = await fetchPlayerState();
    if (!state || !state.device) {
      setHasActiveDevice(false);
      setIsPlaying(false);
      setCurrentTrack(null);
      return;
    }
    setHasActiveDevice(!!state.device.is_active);
    setIsPlaying(state.is_playing);
    // No pisar el slider si el user lo movió hace menos de 2s
    if (Date.now() - lastUserVolumeChangeRef.current > 2000) {
      setVolumeState(state.device.volume_percent);
    }
    if (state.item) {
      setCurrentTrack({
        name: state.item.name,
        artists: state.item.artists.map((a) => a.name).join(', '),
        albumImageUrl: state.item.album.images[0]?.url ?? null,
        uri: state.item.uri,
      });
    } else {
      setCurrentTrack(null);
    }
  }, []);

  // Polling para mantener el estado al día
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshState();
    };
    tick();
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, isAuthenticated, refreshState]);

  const togglePlay = useCallback(async () => {
    setErrorMessage(null);
    const endpoint = isPlaying ? '/me/player/pause' : '/me/player/play';
    const r = await apiCall('PUT', endpoint);
    if (!r.ok) {
      setErrorMessage(describeApiError(r.status, r.body));
      return;
    }
    setIsPlaying(!isPlaying);
    // Refrescar enseguida para confirmar
    setTimeout(refreshState, 400);
  }, [isPlaying, refreshState]);

  const nextTrack = useCallback(async () => {
    setErrorMessage(null);
    const r = await apiCall('POST', '/me/player/next');
    if (!r.ok) {
      setErrorMessage(describeApiError(r.status, r.body));
      return;
    }
    setTimeout(refreshState, 600);
  }, [refreshState]);

  const previousTrack = useCallback(async () => {
    setErrorMessage(null);
    const r = await apiCall('POST', '/me/player/previous');
    if (!r.ok) {
      setErrorMessage(describeApiError(r.status, r.body));
      return;
    }
    setTimeout(refreshState, 600);
  }, [refreshState]);

  const setVolume = useCallback(async (v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v <= 1 ? v * 100 : v)));
    setVolumeState(clamped);
    lastUserVolumeChangeRef.current = Date.now();
    setErrorMessage(null);
    const r = await apiCall('PUT', `/me/player/volume?volume_percent=${clamped}`);
    if (!r.ok) setErrorMessage(describeApiError(r.status, r.body));
  }, []);

  const duckVolume = useCallback(async () => {
    if (preDuckVolumeRef.current !== null) return; // ya estamos ducked
    const state = await fetchPlayerState();
    if (!state || !state.device) return;
    const currentVol = state.device.volume_percent;
    preDuckVolumeRef.current = currentVol;
    const ducked = Math.max(0, Math.round(currentVol * DUCK_RATIO));
    await apiCall('PUT', `/me/player/volume?volume_percent=${ducked}`);
  }, []);

  const restoreVolume = useCallback(async () => {
    const prev = preDuckVolumeRef.current;
    preDuckVolumeRef.current = null;
    if (prev === null) return;
    await apiCall('PUT', `/me/player/volume?volume_percent=${prev}`);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setIsAuthenticated(false);
    setCurrentTrack(null);
    setIsPlaying(false);
    setHasActiveDevice(false);
  }, []);

  return {
    isAuthenticated,
    hasActiveDevice,
    isPlaying,
    currentTrack,
    volume: volume / 100,
    errorMessage,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    duckVolume,
    restoreVolume,
    logout,
  };
}
