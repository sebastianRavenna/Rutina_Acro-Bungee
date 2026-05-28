import { Button } from '../ui/Button';

interface PlaybackControlsProps {
  isPlaying: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onEnd: () => void;
}

export function PlaybackControls({
  isPlaying,
  canPrev,
  canNext,
  onPrev,
  onPlayPause,
  onNext,
  onEnd,
}: PlaybackControlsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          variant="secondary"
          size="md"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Movimiento anterior"
          style={{ flex: 1 }}
        >
          ⏮ Ant
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pausar' : 'Continuar'}
          style={{ flex: 1.4 }}
        >
          {isPlaying ? '⏸ Pausa' : '▶ Continuar'}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Movimiento siguiente"
          style={{ flex: 1 }}
        >
          Sig ⏭
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onEnd} aria-label="Terminar rutina">
        ✕ Terminar
      </Button>
    </div>
  );
}
