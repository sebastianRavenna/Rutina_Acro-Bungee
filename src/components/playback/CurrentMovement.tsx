import { Movement } from '../../types';

interface CurrentMovementProps {
  movement: Movement;
  pulsing: boolean;
}

export function CurrentMovement({ movement, pulsing }: CurrentMovementProps) {
  return (
    <div
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 255, 136, 0.1) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.4)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 18px',
        textAlign: 'center',
        animation: pulsing ? 'pulse 1.6s ease-in-out infinite' : undefined,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          letterSpacing: '0.3em',
          color: 'var(--accent-cyan)',
          marginBottom: 6,
        }}
      >
        EN CURSO
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 30,
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          color: 'var(--text-primary)',
        }}
      >
        {movement.name}
      </div>
      {movement.notes && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          {movement.notes}
        </div>
      )}
    </div>
  );
}
