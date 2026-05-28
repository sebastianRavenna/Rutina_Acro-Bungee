import { useCallback, useEffect, useRef, useState } from 'react';
import { audioCacheGet, audioCachePut } from '../utils/audio-cache';

export interface AzureVoice {
  id: string;
  label: string;
  gender: 'female' | 'male';
  locale: string;
  region: string;
  styles?: string[];
}

interface TTSRequest {
  text: string;
  voice: string;
  rate?: string;
  pitch?: string;
  style?: string;
}

interface UseAzureTTSResult {
  voices: AzureVoice[];
  voicesLoading: boolean;
  voicesError: string | null;
  /** Último mensaje de error del proxy /api/tts (para mostrar en UI). */
  lastFetchError: string | null;
  /** Pre-genera una lista de textos. Resuelve cuando todos están listos (o cacheados). */
  preload: (
    requests: TTSRequest[],
    onProgress?: (done: number, total: number) => void,
  ) => Promise<{ ok: number; failed: number }>;
  /** Reproduce un audio pre-cargado (o lo busca on-the-fly si no estaba). Resuelve true si pudo reproducir, false si falló. */
  play: (req: TTSRequest, opts?: { onStart?: () => void; onEnd?: () => void }) => Promise<boolean>;
  /** Cancela la reproducción actual. */
  cancel: () => void;
  /** Limpia el último error reportado. */
  clearError: () => void;
}

function cacheKey(req: TTSRequest): string {
  return [req.voice, req.rate ?? '0', req.pitch ?? '0', req.style ?? '', req.text].join('|');
}

export function useAzureTTS(enabled: boolean): UseAzureTTSResult {
  const [voices, setVoices] = useState<AzureVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);

  // Cache en memoria (URLs creadas con URL.createObjectURL para reproducción instantánea)
  const memCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  // Un solo HTMLAudioElement compartido — evita el "warmup" del browser
  // en cada play() nuevo, que se nota como "primera palabra cortada".
  const sharedAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setVoicesLoading(true);
    setVoicesError(null);
    fetch('/api/tts-voices')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setVoices(data.voices ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setVoicesError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setVoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Liberar object URLs al desmontar
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
      memCacheRef.current.clear();
      try {
        currentAudioRef.current?.pause();
      } catch {
        // ignore
      }
    };
  }, []);

  const fetchOne = useCallback(async (req: TTSRequest): Promise<ArrayBuffer | null> => {
    const key = cacheKey(req);

    // 1) memoria
    const fromMem = memCacheRef.current.get(key);
    if (fromMem) return fromMem;

    // 2) IndexedDB
    const fromDisk = await audioCacheGet(key);
    if (fromDisk) {
      memCacheRef.current.set(key, fromDisk);
      return fromDisk;
    }

    // 3) red
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        // Tratamos de leer el JSON {error: "..."} que devuelve nuestro proxy
        let detail = '';
        try {
          const json = await res.clone().json();
          if (json && typeof json.error === 'string') detail = json.error;
        } catch {
          detail = await res.text().catch(() => '');
        }
        throw new Error(`/api/tts ${res.status}: ${detail.slice(0, 300)}`);
      }
      const buf = await res.arrayBuffer();
      memCacheRef.current.set(key, buf);
      void audioCachePut(key, buf);
      setLastFetchError(null);
      return buf;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[azure-tts] fetch failed:', msg);
      setLastFetchError(msg);
      return null;
    }
  }, []);

  const preload = useCallback<UseAzureTTSResult['preload']>(
    async (requests, onProgress) => {
      let done = 0;
      let ok = 0;
      let failed = 0;
      // dedup
      const seen = new Set<string>();
      const unique = requests.filter((r) => {
        const k = cacheKey(r);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const total = unique.length;
      onProgress?.(0, total);

      // Paralelizar pero sin saturar (chunks de 4)
      const CONCURRENCY = 4;
      for (let i = 0; i < unique.length; i += CONCURRENCY) {
        const chunk = unique.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map((r) => fetchOne(r)));
        results.forEach((r) => {
          done++;
          if (r) ok++;
          else failed++;
        });
        onProgress?.(done, total);
      }
      return { ok, failed };
    },
    [fetchOne],
  );

  const play = useCallback<UseAzureTTSResult['play']>(
    async (req, opts) => {
      const key = cacheKey(req);
      let buf = memCacheRef.current.get(key);
      if (!buf) {
        const fetched = await fetchOne(req);
        if (!fetched) {
          opts?.onEnd?.();
          return false;
        }
        buf = fetched;
      }

      let url = objectUrlsRef.current.get(key);
      if (!url) {
        const blob = new Blob([buf], { type: 'audio/mpeg' });
        url = URL.createObjectURL(blob);
        objectUrlsRef.current.set(key, url);
      }

      // Reutilizar un único <audio> compartido — el primer load tiene warmup
      // del browser (que se nota como "primera palabra cortada"); los plays
      // subsecuentes reutilizan el mismo decoder y son inmediatos.
      if (!sharedAudioRef.current) {
        sharedAudioRef.current = new Audio();
        sharedAudioRef.current.preload = 'auto';
      }
      const audio = sharedAudioRef.current;

      // Detener cualquier reproducción anterior limpiamente (sin AbortError)
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }

      currentAudioRef.current = audio;
      // Reasignar handlers — solo el último play "gana"
      audio.onplay = () => opts?.onStart?.();
      audio.onended = () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
        opts?.onEnd?.();
      };
      audio.onerror = () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
        opts?.onEnd?.();
      };

      audio.src = url;
      try {
        // Esperar a que esté listo para minimizar el delay del primer frame
        if (audio.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => {
              audio.removeEventListener('canplay', onReady);
              audio.removeEventListener('error', onReady);
              resolve();
            };
            audio.addEventListener('canplay', onReady, { once: true });
            audio.addEventListener('error', onReady, { once: true });
            // Timeout defensivo por si nunca dispara canplay
            setTimeout(onReady, 1500);
          });
        }
        await audio.play();
        return true;
      } catch (e) {
        // AbortError de pause/play race ya no nos importa: lo manejamos arriba
        if (e instanceof DOMException && e.name === 'AbortError') {
          return false;
        }
        console.warn('[azure-tts] audio.play() failed:', e);
        opts?.onEnd?.();
        return false;
      }
    },
    [fetchOne],
  );

  const cancel = useCallback(() => {
    try {
      const audio = currentAudioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      currentAudioRef.current = null;
    } catch {
      // ignore
    }
  }, []);

  const clearError = useCallback(() => setLastFetchError(null), []);

  return { voices, voicesLoading, voicesError, lastFetchError, preload, play, cancel, clearError };
}
