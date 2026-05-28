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
  /** Pre-genera una lista de textos. Resuelve cuando todos están listos (o cacheados). */
  preload: (
    requests: TTSRequest[],
    onProgress?: (done: number, total: number) => void,
  ) => Promise<{ ok: number; failed: number }>;
  /** Reproduce un audio pre-cargado (o lo busca on-the-fly si no estaba). */
  play: (req: TTSRequest, opts?: { onStart?: () => void; onEnd?: () => void }) => Promise<void>;
  /** Cancela la reproducción actual. */
  cancel: () => void;
}

function cacheKey(req: TTSRequest): string {
  return [req.voice, req.rate ?? '0', req.pitch ?? '0', req.style ?? '', req.text].join('|');
}

export function useAzureTTS(enabled: boolean): UseAzureTTSResult {
  const [voices, setVoices] = useState<AzureVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  // Cache en memoria (URLs creadas con URL.createObjectURL para reproducción instantánea)
  const memCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
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
        const errText = await res.text().catch(() => '');
        throw new Error(`/api/tts ${res.status}: ${errText.slice(0, 200)}`);
      }
      const buf = await res.arrayBuffer();
      memCacheRef.current.set(key, buf);
      void audioCachePut(key, buf);
      return buf;
    } catch (e) {
      console.warn('[azure-tts] fetch failed:', e);
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
          return;
        }
        buf = fetched;
      }

      let url = objectUrlsRef.current.get(key);
      if (!url) {
        const blob = new Blob([buf], { type: 'audio/mpeg' });
        url = URL.createObjectURL(blob);
        objectUrlsRef.current.set(key, url);
      }

      // Detener cualquier reproducción anterior
      try {
        currentAudioRef.current?.pause();
      } catch {
        // ignore
      }

      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onplay = () => opts?.onStart?.();
      audio.onended = () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
        opts?.onEnd?.();
      };
      audio.onerror = () => {
        if (currentAudioRef.current === audio) currentAudioRef.current = null;
        opts?.onEnd?.();
      };
      try {
        await audio.play();
      } catch (e) {
        console.warn('[azure-tts] audio.play() failed:', e);
        opts?.onEnd?.();
      }
    },
    [fetchOne],
  );

  const cancel = useCallback(() => {
    try {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
    } catch {
      // ignore
    }
  }, []);

  return { voices, voicesLoading, voicesError, preload, play, cancel };
}
