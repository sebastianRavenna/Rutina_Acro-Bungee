import { useCallback, useEffect, useRef, useState } from 'react';
import { getValidAccessToken, loadTokens, clearTokens } from '../utils/spotify-auth';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

export interface SpotifyTrack {
  name: string;
  artists: string;
  albumImageUrl: string | null;
  uri: string;
}

interface UseSpotifyResult {
  isAuthenticated: boolean;
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  deviceId: string | null;
  volume: number;
  errorMessage: string | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  duckVolume: () => Promise<void>;
  restoreVolume: () => Promise<void>;
  logout: () => void;
}

let sdkLoadingPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (sdkLoadingPromise) return sdkLoadingPromise;
  if (window.Spotify) return Promise.resolve();

  sdkLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      if (window.Spotify) return resolve();
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de Spotify.'));
    document.body.appendChild(script);
  });
  return sdkLoadingPromise;
}

const DUCK_RATIO = 0.3;

export function useSpotify(enabled: boolean): UseSpotifyResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!loadTokens());
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const playerRef = useRef<Spotify.Player | null>(null);
  const preDuckVolumeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setIsAuthenticated(!!loadTokens());
  }, [enabled]);

  // Inicializar SDK
  useEffect(() => {
    if (!enabled) return;
    if (!isAuthenticated) return;
    let cancelled = false;
    let player: Spotify.Player | null = null;

    (async () => {
      try {
        await loadSdk();
        if (cancelled) return;

        player = new window.Spotify.Player({
          name: 'AcroBungee Timer',
          getOAuthToken: async (cb: (token: string) => void) => {
            const token = await getValidAccessToken();
            if (token) cb(token);
          },
          volume,
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          if (cancelled) return;
          setDeviceId(device_id);
          setIsReady(true);
        });

        player.addListener('not_ready', () => {
          if (cancelled) return;
          setIsReady(false);
        });

        player.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
          if (cancelled || !state) return;
          setIsPlaying(!state.paused);
          const t = state.track_window?.current_track;
          if (t) {
            setCurrentTrack({
              name: t.name,
              artists: t.artists.map((a) => a.name).join(', '),
              albumImageUrl: t.album.images[0]?.url ?? null,
              uri: t.uri,
            });
          } else {
            setCurrentTrack(null);
          }
        });

        player.addListener('initialization_error', ({ message }: { message: string }) => {
          setErrorMessage(`Spotify init error: ${message}`);
        });
        player.addListener('authentication_error', ({ message }: { message: string }) => {
          setErrorMessage(`Spotify auth error: ${message}. Reconectá tu cuenta.`);
          clearTokens();
          setIsAuthenticated(false);
        });
        player.addListener('account_error', ({ message }: { message: string }) => {
          setErrorMessage(
            `Spotify account error: ${message}. El SDK requiere Spotify Premium.`,
          );
        });
        player.addListener('playback_error', ({ message }: { message: string }) => {
          setErrorMessage(`Spotify playback error: ${message}`);
        });

        const connected = await player.connect();
        if (!connected) {
          setErrorMessage('No se pudo conectar el reproductor de Spotify.');
        }
        playerRef.current = player;
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        player?.disconnect();
      } catch {
        // ignore
      }
      playerRef.current = null;
      setIsReady(false);
      setDeviceId(null);
      setCurrentTrack(null);
      setIsPlaying(false);
    };
  }, [enabled, isAuthenticated]);

  const play = useCallback(async () => {
    await playerRef.current?.resume();
  }, []);
  const pause = useCallback(async () => {
    await playerRef.current?.pause();
  }, []);
  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);
  const nextTrack = useCallback(async () => {
    await playerRef.current?.nextTrack();
  }, []);
  const previousTrack = useCallback(async () => {
    await playerRef.current?.previousTrack();
  }, []);
  const setVolume = useCallback(async (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    await playerRef.current?.setVolume(clamped);
  }, []);

  // Ducking: bajar volumen cuando habla la voz, restaurar al terminar
  const duckVolume = useCallback(async () => {
    if (!playerRef.current) return;
    if (preDuckVolumeRef.current !== null) return; // ya estamos ducked
    try {
      const current = await playerRef.current.getVolume();
      preDuckVolumeRef.current = current;
      await playerRef.current.setVolume(Math.max(0, current * DUCK_RATIO));
    } catch {
      // ignore
    }
  }, []);

  const restoreVolume = useCallback(async () => {
    if (!playerRef.current) return;
    const prev = preDuckVolumeRef.current;
    preDuckVolumeRef.current = null;
    if (prev === null) return;
    try {
      await playerRef.current.setVolume(prev);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setIsAuthenticated(false);
    try {
      playerRef.current?.disconnect();
    } catch {
      // ignore
    }
    playerRef.current = null;
    setIsReady(false);
    setDeviceId(null);
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  return {
    isAuthenticated,
    isReady,
    isPlaying,
    currentTrack,
    deviceId,
    volume,
    errorMessage,
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    duckVolume,
    restoreVolume,
    logout,
  };
}
