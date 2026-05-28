export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatTimerDigits(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return safe.toString();
}

export function sumDurations(movements: { duration: number }[]): number {
  return movements.reduce((acc, m) => acc + (m.duration || 0), 0);
}
