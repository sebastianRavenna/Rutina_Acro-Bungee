import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceAnnouncer } from '../../hooks/useVoiceAnnouncer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useTimer } from '../../hooks/useTimer';
import { useSpotify } from '../../hooks/useSpotify';
import { CircularTimer } from '../ui/CircularTimer';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ProgressBar } from './ProgressBar';
import { CurrentMovement } from './CurrentMovement';
import { NextMovement } from './NextMovement';
import { PlaybackControls } from './PlaybackControls';
import { SpotifyPanel } from '../spotify/SpotifyPanel';
import { sumDurations } from '../../utils/format';
import { unlockAudio } from '../../utils/audio-unlock';

type PreloadState =
  | { kind: 'idle' }
  | { kind: 'loading'; done: number; total: number }
  | { kind: 'done'; ok: number; failed: number }
  | { kind: 'error'; message: string };

export function PlaybackView() {
  const playback = useAppStore((s) => s.playback);
  const routine = useAppStore((s) =>
    playback ? s.routines.find((r) => r.id === playback.routineId) ?? null : null,
  );
  const settings = useAppStore((s) => s.settings);
  const setPlayback = useAppStore((s) => s.setPlayback);
  const endPlayback = useAppStore((s) => s.endPlayback);
  const setActiveRoutine = useAppStore((s) => s.setActiveRoutine);
  const setView = useAppStore((s) => s.setView);

  const spotify = useSpotify(settings.spotifyEnabled);
  // Refs estables para que los callbacks de duck/restore no fuercen recreación del announcer
  const duckRef = useRef(spotify.duckVolume);
  const restoreRef = useRef(spotify.restoreVolume);
  duckRef.current = spotify.duckVolume;
  restoreRef.current = spotify.restoreVolume;

  const handleSpeakStart = useCallback(() => {
    if (settings.spotifyEnabled) void duckRef.current();
  }, [settings.spotifyEnabled]);
  const handleSpeakEnd = useCallback(() => {
    if (settings.spotifyEnabled) void restoreRef.current();
  }, [settings.spotifyEnabled]);

  const {
    speak,
    speakAndWait,
    cancel: cancelSpeech,
    preloadRoutine,
    isPremiumActive,
    premiumError,
  } = useVoiceAnnouncer({
    onSpeakStart: handleSpeakStart,
    onSpeakEnd: handleSpeakEnd,
  });

  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  useTimer({ routine, speak });

  const [started, setStarted] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [preload, setPreloadState] = useState<PreloadState>({ kind: 'idle' });

  const currentMovement = useMemo(() => {
    if (!routine || !playback) return null;
    return routine.movements[playback.currentIndex] ?? null;
  }, [routine, playback]);

  const nextMovement = useMemo(() => {
    if (!routine || !playback) return null;
    return routine.movements[playback.currentIndex + 1] ?? null;
  }, [routine, playback]);

  const totalSecondsAll = useMemo(() => (routine ? sumDurations(routine.movements) : 0), [routine]);
  const elapsedSeconds = useMemo(() => {
    if (!routine || !playback) return 0;
    let elapsed = 0;
    for (let i = 0; i < playback.currentIndex; i++) {
      elapsed += routine.movements[i]?.duration ?? 0;
    }
    if (currentMovement) {
      elapsed += currentMovement.duration - playback.timeLeft;
    }
    return Math.max(0, Math.min(totalSecondsAll, elapsed));
  }, [routine, playback, currentMovement, totalSecondsAll]);

  // CRÍTICO: cleanup SOLO cuando el componente se desmonta de verdad.
  // Si pusiéramos cancelSpeech/releaseWakeLock como deps, el cleanup se
  // re-ejecutaría en cada render (porque esas funciones cambian de identidad),
  // y cancelSpeech() llamaría pause() al audio en curso → AbortError →
  // fallback a voz nativa cuando debería usarse premium.
  const cancelSpeechRef = useRef(cancelSpeech);
  const releaseWakeLockRef = useRef(releaseWakeLock);
  cancelSpeechRef.current = cancelSpeech;
  releaseWakeLockRef.current = releaseWakeLock;
  useEffect(() => {
    return () => {
      cancelSpeechRef.current();
      void releaseWakeLockRef.current();
    };
  }, []);

  if (!playback || !routine || !currentMovement) {
    return (
      <div className="app-shell">
        <p style={{ color: 'var(--text-secondary)' }}>No hay sesión activa.</p>
        <Button variant="secondary" onClick={() => setView('home')}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  const launchPlayback = async () => {
    setStarted(true);
    await requestWakeLock();

    // 1) Anunciar el nombre del primer movimiento — SIEMPRE
    await speakAndWait(currentMovement.name);

    // 2) Cuenta regresiva inicial: N, N-1, ..., 1 con pausas de ~1s entre cada uno
    if (settings.startCountdownSeconds > 0) {
      for (let n = settings.startCountdownSeconds; n >= 1; n--) {
        await speakAndWait(String(n));
        // Pausa corta entre números para que se sienta como "5 ... 4 ... 3"
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // 3) Arrancar timer
    setPlayback({ isPlaying: true });
  };

  const handleStart = async () => {
    // CRÍTICO: desbloquear el audio del browser AHORA, durante el handler del click.
    // Si no, después del await del preload (~2-5s), el browser pierde el user gesture
    // y bloquea audio.play(), forzando fallback a voz nativa.
    // Lo disparamos sincrónicamente — no await — para no perder el contexto del click.
    void unlockAudio();

    if (!isPremiumActive) {
      void launchPlayback();
      return;
    }
    // Premium: pre-cargar y luego arrancar
    setPreloadState({ kind: 'loading', done: 0, total: 0 });
    try {
      const result = await preloadRoutine(routine, (done, total) => {
        setPreloadState({ kind: 'loading', done, total });
      });
      setPreloadState({ kind: 'done', ok: result.ok, failed: result.failed });
      // Si todo falló, el announcer va a caer a voz nativa automáticamente,
      // pero avisamos al user para que sepa qué pasó.
      if (result.ok === 0 && result.failed > 0) {
        const detail = premiumError ? ` (${premiumError})` : '';
        setPreloadState({
          kind: 'error',
          message: `Azure no respondió.${detail} Vamos a usar la voz del navegador.`,
        });
        return;
      }
      void launchPlayback();
    } catch (e) {
      setPreloadState({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handlePlayPause = () => {
    if (playback.isFinished) return;
    if (playback.isPlaying) {
      cancelSpeech();
      setPlayback({ isPlaying: false });
    } else {
      setPlayback({ isPlaying: true });
    }
  };

  const handlePrev = () => {
    if (playback.currentIndex === 0) return;
    const prevIndex = playback.currentIndex - 1;
    const prev = routine.movements[prevIndex];
    if (!prev) return;
    setPlayback({ currentIndex: prevIndex, timeLeft: prev.duration, isFinished: false });
    speak(prev.name);
  };

  const handleNext = () => {
    const nextIndex = playback.currentIndex + 1;
    const next = routine.movements[nextIndex];
    if (!next) {
      setPlayback({ timeLeft: 0, isPlaying: false, isFinished: true });
      speak('¡Rutina completada! Excelente trabajo.');
      return;
    }
    setPlayback({ currentIndex: nextIndex, timeLeft: next.duration });
    speak(next.name);
  };

  const handleEnd = () => {
    cancelSpeech();
    void releaseWakeLock();
    setActiveRoutine(routine.id);
    endPlayback();
    setView('editor');
  };

  const effectiveWarn = currentMovement.warnBeforeSeconds ?? settings.warnBeforeSeconds;
  const warning =
    !playback.isFinished &&
    effectiveWarn > 0 &&
    playback.timeLeft <= effectiveWarn &&
    playback.timeLeft > 0;

  return (
    <div className="app-shell">
      <header style={{ marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.06em',
              fontSize: 18,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {routine.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
            Paso {playback.currentIndex + 1} de {routine.movements.length}
          </div>
        </div>
        <ProgressBar value={elapsedSeconds} total={totalSecondsAll} />
      </header>

      {playback.isFinished ? (
        <FinishedScreen
          onClose={() => {
            setActiveRoutine(routine.id);
            endPlayback();
            setView('editor');
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          <CurrentMovement movement={currentMovement} pulsing={playback.isPlaying} />

          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <CircularTimer
              timeLeft={playback.timeLeft}
              totalDuration={currentMovement.duration}
              warning={warning}
            />
          </div>

          <NextMovement movement={nextMovement} />

          {settings.spotifyEnabled && spotify.isAuthenticated && (
            <SpotifyPanel
              hasActiveDevice={spotify.hasActiveDevice}
              isPlaying={spotify.isPlaying}
              currentTrack={spotify.currentTrack}
              volume={spotify.volume}
              errorMessage={spotify.errorMessage}
              onTogglePlay={() => void spotify.togglePlay()}
              onNext={() => void spotify.nextTrack()}
              onPrev={() => void spotify.previousTrack()}
              onVolume={(v) => void spotify.setVolume(v)}
            />
          )}

          <div style={{ flex: 1 }} />

          <PlaybackControls
            isPlaying={playback.isPlaying}
            canPrev={playback.currentIndex > 0}
            canNext={true}
            onPrev={handlePrev}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onEnd={() => setConfirmEnd(true)}
          />
        </div>
      )}

      {!started && !playback.isFinished && (
        <StartOverlay
          routineName={routine.name}
          firstMovement={currentMovement.name}
          onStart={handleStart}
          preload={preload}
          isPremiumActive={isPremiumActive}
          onBack={() => {
            cancelSpeech();
            void releaseWakeLock();
            setActiveRoutine(routine.id);
            endPlayback();
            setView('editor');
          }}
        />
      )}

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="Terminar rutina"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmEnd(false);
                handleEnd();
              }}
            >
              Terminar
            </Button>
          </>
        }
      >
        ¿Querés terminar la rutina y volver al editor?
      </Modal>
    </div>
  );
}

function StartOverlay({
  routineName,
  firstMovement,
  onStart,
  preload,
  isPremiumActive,
  onBack,
}: {
  routineName: string;
  firstMovement: string;
  onStart: () => void;
  preload: PreloadState;
  isPremiumActive: boolean;
  onBack: () => void;
}) {
  const isLoading = preload.kind === 'loading';
  const isError = preload.kind === 'error';
  const errorMessage = preload.kind === 'error' ? preload.message : null;
  const pct =
    preload.kind === 'loading' && preload.total > 0
      ? Math.round((preload.done / preload.total) * 100)
      : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 6, 16, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {/* Botón volver - permite salir sin tener que refrescar */}
      <button
        onClick={onBack}
        aria-label="Volver al editor"
        style={{
          position: 'absolute',
          top: 'calc(20px + env(safe-area-inset-top))',
          left: 20,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '50%',
          width: 42,
          height: 42,
          color: 'var(--text-secondary)',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        ←
      </button>

      <div style={{ fontSize: 13, letterSpacing: '0.3em', color: 'var(--text-muted)', marginBottom: 10 }}>
        LISTO PARA COMENZAR
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.06em',
          fontSize: 36,
          marginBottom: 8,
          background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          maxWidth: 360,
        }}
      >
        {routineName}
      </h2>
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 36 }}>
        Empieza con: <strong style={{ color: 'var(--text-primary)' }}>{firstMovement}</strong>
      </div>

      <button
        onClick={onStart}
        disabled={isLoading}
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: 'none',
          background: isLoading
            ? 'rgba(255, 255, 255, 0.08)'
            : 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
          color: isLoading ? 'var(--text-secondary)' : '#040414',
          fontSize: isLoading ? 14 : 24,
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.06em',
          boxShadow: isLoading ? 'none' : '0 0 40px rgba(0, 212, 255, 0.4)',
          cursor: isLoading ? 'wait' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? `PREPARANDO ${pct}%` : '▶ INICIAR'}
      </button>

      {isPremiumActive && (
        <div style={{ marginTop: 18, fontSize: 11, color: 'var(--text-muted)', maxWidth: 320 }}>
          {isLoading
            ? `Generando audios premium... ${preload.kind === 'loading' ? `${preload.done}/${preload.total}` : ''}`
            : 'Voces premium activas: los audios se pre-cargan al iniciar y se reproducen sin delay.'}
        </div>
      )}

      {isError && (
        <div
          style={{
            marginTop: 18,
            background: 'rgba(255, 107, 53, 0.08)',
            border: '1px solid rgba(255, 107, 53, 0.3)',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: 'var(--accent-warn)',
            maxWidth: 360,
            wordBreak: 'break-word',
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No se pudo usar voz premium</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 10, fontSize: 11 }}>
            {errorMessage ?? 'Error desconocido'}
          </div>
          <Button variant="secondary" size="sm" onClick={onStart}>
            Iniciar con voz del navegador
          </Button>
        </div>
      )}
    </div>
  );
}

function FinishedScreen({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        paddingBottom: 24,
      }}
    >
      <Confetti />
      <div
        style={{
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.06em',
          fontSize: 48,
          background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8,
        }}
      >
        ¡COMPLETADA!
      </div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 36, maxWidth: 280 }}>
        Excelente trabajo. Tu rutina terminó.
      </div>
      <Button variant="primary" size="lg" onClick={onClose}>
        Volver al editor
      </Button>
    </div>
  );
}

function Confetti() {
  const colors = ['#00d4ff', '#00ff88', '#ff6b35', '#ff003c', '#ffffff'];
  const pieces = Array.from({ length: 40 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 1.5;
    const duration = 2.5 + Math.random() * 2;
    const color = colors[i % colors.length];
    const size = 6 + Math.random() * 6;
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          top: -20,
          left: `${left}%`,
          width: size,
          height: size,
          background: color,
          borderRadius: 2,
          animation: `confetti-fall ${duration}s linear ${delay}s forwards`,
        }}
      />
    );
  });
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {pieces}
    </div>
  );
}
