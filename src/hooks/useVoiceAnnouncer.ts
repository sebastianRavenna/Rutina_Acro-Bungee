import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSpeech } from './useSpeech';
import { useAzureTTS } from './useAzureTTS';
import type { Routine } from '../types';

interface VoiceAnnouncerOpts {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface SpeakOptions {
  onEnd?: () => void;
}

interface VoiceAnnouncerReturn {
  speak: (text: string, options?: SpeakOptions) => void;
  /** Espera a que termine de hablar antes de resolver. Útil para secuencias. */
  speakAndWait: (text: string, options?: SpeakOptions) => Promise<void>;
  cancel: () => void;
  preloadRoutine: (
    routine: Routine,
    onProgress?: (done: number, total: number) => void,
  ) => Promise<{ ok: number; failed: number; skipped: boolean }>;
  isPremiumActive: boolean;
  premiumError: string | null;
}

/**
 * Capa unificada de anuncios. Si la voz premium está activa y los textos
 * fueron pre-generados, usa Azure (audio instantáneo). Si no, cae a speechSynthesis.
 */
export function useVoiceAnnouncer(opts: VoiceAnnouncerOpts = {}): VoiceAnnouncerReturn {
  const settings = useAppStore((s) => s.settings);
  const speech = useSpeech({
    onSpeakStart: opts.onSpeakStart,
    onSpeakEnd: opts.onSpeakEnd,
  });
  const azure = useAzureTTS(settings.premiumVoiceEnabled);

  const isPremiumActive = settings.premiumVoiceEnabled;

  // Refs estables para que el handler de pre-generación no se invalide
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const speak = useCallback<VoiceAnnouncerReturn['speak']>(
    (text, options) => {
      if (!isPremiumActive) {
        speech.speak(text, options);
        return;
      }
      let endFired = false;
      const fireOnEnd = () => {
        if (endFired) return;
        endFired = true;
        options?.onEnd?.();
      };
      void (async () => {
        const played = await azure.play(
          {
            text,
            voice: settings.premiumVoiceId,
            // Sin prosody y sin style: la voz va al natural.
          },
          {
            onStart: () => optsRef.current.onSpeakStart?.(),
            onEnd: () => {
              optsRef.current.onSpeakEnd?.();
              fireOnEnd();
            },
          },
        );
        if (!played) {
          // Fallback: si Azure no respondió o no está configurado, usar la voz del navegador
          // para no dejar al user en silencio durante la rutina.
          console.warn('[announcer] Azure TTS no disponible, fallback a speechSynthesis');
          speech.speak(text, { ...options, onEnd: fireOnEnd });
        }
      })();
    },
    [isPremiumActive, speech, azure, settings.premiumVoiceId],
  );

  const cancel = useCallback(() => {
    speech.cancel();
    azure.cancel();
  }, [speech, azure]);

  const speakAndWait = useCallback<VoiceAnnouncerReturn['speakAndWait']>(
    (text, options) => {
      return new Promise<void>((resolve) => {
        speak(text, {
          ...options,
          onEnd: () => {
            options?.onEnd?.();
            resolve();
          },
        });
      });
    },
    [speak],
  );

  const preloadRoutine = useCallback<VoiceAnnouncerReturn['preloadRoutine']>(
    async (routine, onProgress) => {
      if (!isPremiumActive) {
        return { ok: 0, failed: 0, skipped: true };
      }
      const texts = new Set<string>();
      // Nombre de cada movimiento SIEMPRE (se anuncia al cambiar)
      routine.movements.forEach((m, i) => {
        texts.add(m.name);
        // "Próximo: X" solo si está activo el aviso
        if (settings.announceNextMovement) {
          const next = routine.movements[i + 1];
          if (next) {
            texts.add(`Próximo: ${next.name}`);
          }
        }
      });
      // Cuenta regresiva inicial: pre-cargar números 1..startCountdownSeconds
      for (let n = 1; n <= settings.startCountdownSeconds; n++) {
        texts.add(String(n));
      }
      texts.add('¡Rutina completada! Excelente trabajo.');

      const requests = Array.from(texts).map((text) => ({
        text,
        voice: settings.premiumVoiceId,
      }));

      const result = await azure.preload(requests, onProgress);
      return { ...result, skipped: false };
    },
    [
      isPremiumActive,
      settings.announceNextMovement,
      settings.startCountdownSeconds,
      settings.premiumVoiceId,
      azure,
    ],
  );

  return {
    speak,
    speakAndWait,
    cancel,
    preloadRoutine,
    isPremiumActive,
    premiumError: azure.lastFetchError,
  };
}
