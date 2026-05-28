import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { formatSeconds, sumDurations } from '../../utils/format';

export function RoutineList() {
  const routines = useAppStore((s) => s.routines);
  const deleteRoutine = useAppStore((s) => s.deleteRoutine);
  const duplicateRoutine = useAppStore((s) => s.duplicateRoutine);
  const startPlayback = useAppStore((s) => s.startPlayback);
  const setActive = useAppStore((s) => s.setActiveRoutine);
  const setView = useAppStore((s) => s.setView);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (routines.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-card)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>•</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
          AÚN NO HAY RUTINAS
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          Creá tu primera rutina y empezá a programar los pasos de tu coreografía.
        </p>
      </div>
    );
  }

  const pendingDelete = routines.find((r) => r.id === confirmDeleteId);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {routines.map((r) => {
          const total = sumDurations(r.movements);
          return (
            <div
              key={r.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-card)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.04em',
                    fontSize: 22,
                    marginBottom: 6,
                  }}
                >
                  {r.name}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {r.movements.length} {r.movements.length === 1 ? 'movimiento' : 'movimientos'} · {formatSeconds(total)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => startPlayback(r.id)}
                  disabled={r.movements.length === 0}
                  aria-label={`Iniciar rutina ${r.name}`}
                >
                  ▶ Iniciar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActive(r.id);
                    setView('editor');
                  }}
                  aria-label={`Editar rutina ${r.name}`}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateRoutine(r.id)}
                  aria-label={`Duplicar rutina ${r.name}`}
                >
                  Duplicar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDeleteId(r.id)}
                  aria-label={`Eliminar rutina ${r.name}`}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!pendingDelete}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar rutina"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDeleteId) deleteRoutine(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        ¿Seguro que querés eliminar <strong style={{ color: 'var(--text-primary)' }}>{pendingDelete?.name}</strong>?
        Esta acción no se puede deshacer.
      </Modal>
    </>
  );
}
