import { CSSProperties, useId } from 'react';

interface CircularTimerProps {
  timeLeft: number;
  totalDuration: number;
  warning: boolean;
  size?: number;
}

export function CircularTimer({ timeLeft, totalDuration, warning, size = 220 }: CircularTimerProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(1, totalDuration);
  const progress = Math.min(1, Math.max(0, timeLeft / safeTotal));
  const offset = circumference * (1 - progress);
  const gradientId = useId();

  const wrap: CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const digitStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: size * 0.34,
    fontWeight: 700,
    lineHeight: 1,
    color: warning ? 'var(--accent-warn)' : 'var(--text-primary)',
    transition: 'color 0.3s ease',
  };
  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    letterSpacing: '0.3em',
    color: 'var(--text-muted)',
    marginTop: 4,
  };

  return (
    <div style={wrap} role="timer" aria-live="polite" aria-label={`${timeLeft} segundos restantes`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {warning ? (
              <>
                <stop offset="0%" stopColor="#ff6b35" />
                <stop offset="100%" stopColor="#ff003c" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#00ff88" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={digitStyle}>{Math.max(0, timeLeft)}</div>
        <div style={labelStyle}>SEG</div>
      </div>
    </div>
  );
}
