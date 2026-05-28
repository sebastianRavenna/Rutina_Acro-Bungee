import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Routine } from '../types';

interface UseTimerArgs {
  routine: Routine | null;
  speak: (text: string, options?: { onEnd?: () => void }) => void;
}

export function useTimer({ routine, speak }: UseTimerArgs) {
  const playback = useAppStore((s) => s.playback);
  const settings = useAppStore((s) => s.settings);
  const setPlayback = useAppStore((s) => s.setPlayback);
  const endPlayback = useAppStore((s) => s.endPlayback);

  const tickedAnnouncementsRef = useRef<{ warn: boolean }>({ warn: false });
  const lastIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!playback || !routine) return;
    if (playback.currentIndex !== lastIndexRef.current) {
      lastIndexRef.current = playback.currentIndex;
      tickedAnnouncementsRef.current = { warn: false };
    }
  }, [playback, routine]);

  useEffect(() => {
    if (!playback || !routine) return;
    if (!playback.isPlaying || playback.isFinished) return;

    const interval = window.setInterval(() => {
      const state = useAppStore.getState();
      const current = state.playback;
      if (!current || !current.isPlaying || current.isFinished) return;

      const currentMovement = routine.movements[current.currentIndex];
      if (!currentMovement) return;

      const nextMovement = routine.movements[current.currentIndex + 1];
      const ann = tickedAnnouncementsRef.current;

      // Override por movimiento si está definido; si no, el global
      const effectiveWarn = currentMovement.warnBeforeSeconds ?? settings.warnBeforeSeconds;

      // Aviso previo "Próximo: X" — solo si el toggle está activo
      if (
        !ann.warn &&
        nextMovement &&
        settings.announceNextMovement &&
        effectiveWarn > 0 &&
        current.timeLeft === effectiveWarn
      ) {
        ann.warn = true;
        speak(`Próximo: ${nextMovement.name}`);
      }

      const newTimeLeft = current.timeLeft - 1;

      if (newTimeLeft <= 0) {
        const nextIndex = current.currentIndex + 1;
        const nextMov = routine.movements[nextIndex];
        if (nextMov) {
          tickedAnnouncementsRef.current = { warn: false };
          lastIndexRef.current = nextIndex;
          setPlayback({ currentIndex: nextIndex, timeLeft: nextMov.duration });
          // SIEMPRE anunciar el nombre del nuevo movimiento al cambiar
          speak(nextMov.name);
        } else {
          setPlayback({ timeLeft: 0, isPlaying: false, isFinished: true });
          speak('¡Rutina completada! Excelente trabajo.');
        }
      } else {
        setPlayback({ timeLeft: newTimeLeft });
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    playback?.isPlaying,
    playback?.isFinished,
    routine,
    settings.warnBeforeSeconds,
    settings.announceNextMovement,
    setPlayback,
    endPlayback,
    speak,
  ]);
}
