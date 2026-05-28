import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Routine } from '../types';

interface UseTimerArgs {
  routine: Routine | null;
  speak: (text: string, options?: { hype?: boolean }) => void;
}

export function useTimer({ routine, speak }: UseTimerArgs) {
  const playback = useAppStore((s) => s.playback);
  const settings = useAppStore((s) => s.settings);
  const setPlayback = useAppStore((s) => s.setPlayback);
  const endPlayback = useAppStore((s) => s.endPlayback);

  const tickedAnnouncementsRef = useRef<{ warn: boolean; countdown: Set<number> }>({
    warn: false,
    countdown: new Set(),
  });
  const lastIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!playback || !routine) return;
    if (playback.currentIndex !== lastIndexRef.current) {
      lastIndexRef.current = playback.currentIndex;
      tickedAnnouncementsRef.current = { warn: false, countdown: new Set() };
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

      // Aviso previo: cuando faltan exactamente effectiveWarn segundos y hay siguiente
      if (
        !ann.warn &&
        nextMovement &&
        effectiveWarn > 0 &&
        current.timeLeft === effectiveWarn
      ) {
        ann.warn = true;
        speak(`Próximo: ${nextMovement.name}`);
      }

      // Countdown "3, 2, 1"
      if (settings.announceCountdown && current.timeLeft <= 3 && current.timeLeft > 0) {
        if (!ann.countdown.has(current.timeLeft)) {
          ann.countdown.add(current.timeLeft);
          speak(String(current.timeLeft));
        }
      }

      const newTimeLeft = current.timeLeft - 1;

      if (newTimeLeft <= 0) {
        const nextIndex = current.currentIndex + 1;
        const nextMov = routine.movements[nextIndex];
        if (nextMov) {
          tickedAnnouncementsRef.current = { warn: false, countdown: new Set() };
          lastIndexRef.current = nextIndex;
          setPlayback({ currentIndex: nextIndex, timeLeft: nextMov.duration });
          if (settings.announceMovementName) {
            speak(nextMov.name, { hype: true });
          }
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
    settings.announceMovementName,
    settings.announceCountdown,
    setPlayback,
    endPlayback,
    speak,
  ]);
}
