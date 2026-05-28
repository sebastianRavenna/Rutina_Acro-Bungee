interface ProgressBarProps {
  value: number;
  total: number;
}

export function ProgressBar({ value, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div
      style={{
        width: '100%',
        height: 6,
        background: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00d4ff 0%, #00ff88 100%)',
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}
