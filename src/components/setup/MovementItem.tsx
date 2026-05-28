import { useState } from 'react';
import { Input, Textarea } from '../ui/Input';
import type { Movement } from '../../types';

interface MovementItemProps {
  index: number;
  total: number;
  movement: Movement;
  globalWarnSeconds: number;
  /** Si false (toggle global "Anunciar próximo" está OFF), ocultamos la UI del aviso personalizado. */
  showCustomWarn: boolean;
  /** True si ya existe una plantilla con mismo nombre + duración. */
  alreadyInLibrary: boolean;
  onChange: (partial: Partial<Omit<Movement, 'id'>>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveAsTemplate: () => void;
}

export function MovementItem({
  index,
  total,
  movement,
  globalWarnSeconds,
  showCustomWarn,
  alreadyInLibrary,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSaveAsTemplate,
}: MovementItemProps) {
  const [showNotes, setShowNotes] = useState(!!movement.notes);
  const hasCustomWarn = movement.warnBeforeSeconds !== undefined;
  const [showWarn, setShowWarn] = useState(hasCustomWarn);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
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
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(0, 212, 255, 0.15)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <Input
          value={movement.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nombre del movimiento"
          aria-label={`Nombre del movimiento ${index + 1}`}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input
          type="number"
          min={1}
          max={3600}
          value={movement.duration || ''}
          onChange={(e) => onChange({ duration: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          placeholder="seg"
          aria-label={`Duración del movimiento ${index + 1} en segundos`}
          style={{ width: 90 }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>segundos</span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onSaveAsTemplate}
          disabled={alreadyInLibrary || !movement.name.trim() || !movement.duration}
          aria-label={alreadyInLibrary ? 'Ya está en la biblioteca' : 'Guardar como plantilla'}
          title={alreadyInLibrary ? 'Ya está en la biblioteca' : 'Guardar como plantilla'}
          style={{
            ...iconBtn(alreadyInLibrary || !movement.name.trim() || !movement.duration),
            color: alreadyInLibrary ? 'var(--accent-green)' : 'var(--text-secondary)',
          }}
        >
          {alreadyInLibrary ? '★' : '☆'}
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Mover arriba"
          style={iconBtn(index === 0)}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Mover abajo"
          style={iconBtn(index === total - 1)}
        >
          ▼
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar movimiento ${index + 1}`}
          style={{ ...iconBtn(false), color: 'var(--accent-danger)' }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setShowNotes((v) => !v)} style={linkBtn}>
          {showNotes ? '− Ocultar notas' : '+ Agregar nota'}
        </button>
        {showCustomWarn && (
          <button type="button" onClick={() => setShowWarn((v) => !v)} style={linkBtn}>
            {showWarn || hasCustomWarn ? '− Aviso personalizado' : '+ Aviso personalizado'}
          </button>
        )}
      </div>

      {showNotes && (
        <Textarea
          value={movement.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Nota opcional (se muestra durante la rutina)"
          aria-label={`Notas del movimiento ${index + 1}`}
        />
      )}

      {showCustomWarn && showWarn && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            background: 'rgba(0, 212, 255, 0.06)',
            border: '1px solid rgba(0, 212, 255, 0.18)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>Avisar</span>
          <Input
            type="number"
            min={0}
            max={Math.max(0, movement.duration - 1)}
            value={hasCustomWarn ? movement.warnBeforeSeconds : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                onChange({ warnBeforeSeconds: undefined });
              } else {
                onChange({ warnBeforeSeconds: Math.max(0, parseInt(v, 10) || 0) });
              }
            }}
            placeholder={String(globalWarnSeconds)}
            aria-label={`Aviso previo personalizado del movimiento ${index + 1}`}
            style={{ width: 70, padding: '8px 10px' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            seg antes del fin
          </span>
          <div style={{ flex: 1 }} />
          {hasCustomWarn ? (
            <button
              type="button"
              onClick={() => onChange({ warnBeforeSeconds: undefined })}
              style={{ ...linkBtn, color: 'var(--accent-cyan)' }}
              aria-label="Usar valor global"
            >
              usar global ({globalWarnSeconds}s)
            </button>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              global: {globalWarnSeconds}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: 12,
  textAlign: 'left',
  padding: 0,
  cursor: 'pointer',
};

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.3 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
