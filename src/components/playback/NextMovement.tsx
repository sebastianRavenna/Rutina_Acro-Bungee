import { Movement } from '../../types';

interface NextMovementProps {
  movement: Movement | null;
}

export function NextMovement({ movement }: NextMovementProps) {
  return (
    <div
      style={{
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        padding: '12px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          letterSpacing: '0.3em',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}
      >
        PRÓXIMO
      </div>
      {movement ? (
        <>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
            }}
          >
            {movement.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {movement.duration}s
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '4px 0' }}>
          Último movimiento
        </div>
      )}
    </div>
  );
}
