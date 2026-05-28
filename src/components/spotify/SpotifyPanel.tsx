import type { SpotifyTrack } from '../../hooks/useSpotify';

interface SpotifyPanelProps {
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  volume: number;
  errorMessage: string | null;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolume: (v: number) => void;
}

export function SpotifyPanel({
  isReady,
  isPlaying,
  currentTrack,
  volume,
  errorMessage,
  onTogglePlay,
  onNext,
  onPrev,
  onVolume,
}: SpotifyPanelProps) {
  return (
    <div
      style={{
        background: 'rgba(29, 185, 84, 0.07)',
        border: '1px solid rgba(29, 185, 84, 0.3)',
        borderRadius: 'var(--radius-card)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.05)',
            backgroundImage: currentTrack?.albumImageUrl ? `url(${currentTrack.albumImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-spotify)',
            fontSize: 18,
          }}
        >
          {!currentTrack?.albumImageUrl && '♪'}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentTrack?.name ?? (isReady ? 'Listo para reproducir' : 'Conectando...')}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentTrack?.artists ??
              (isReady
                ? 'Elegí "AcroBungee Timer" como dispositivo en la app de Spotify'
                : '')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CircleBtn aria-label="Anterior" onClick={onPrev} disabled={!isReady}>
          ⏮
        </CircleBtn>
        <CircleBtn
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          onClick={onTogglePlay}
          disabled={!isReady}
          accent
        >
          {isPlaying ? '⏸' : '▶'}
        </CircleBtn>
        <CircleBtn aria-label="Siguiente" onClick={onNext} disabled={!isReady}>
          ⏭
        </CircleBtn>
        <div style={{ flex: 1, marginLeft: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolume(parseFloat(e.target.value))}
            disabled={!isReady}
            aria-label="Volumen de Spotify"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            fontSize: 11,
            color: '#ff7593',
            background: 'rgba(255, 0, 60, 0.08)',
            border: '1px solid rgba(255, 0, 60, 0.3)',
            padding: '6px 8px',
            borderRadius: 6,
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}

function CircleBtn({
  children,
  onClick,
  disabled,
  accent,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  'aria-label': string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: accent ? 40 : 34,
        height: accent ? 40 : 34,
        borderRadius: '50%',
        border: accent ? 'none' : '1px solid var(--border-subtle)',
        background: accent ? 'var(--accent-spotify)' : 'transparent',
        color: accent ? '#000' : 'var(--text-primary)',
        fontSize: accent ? 16 : 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
