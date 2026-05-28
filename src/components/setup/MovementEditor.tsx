import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { MovementItem } from './MovementItem';
import { formatSeconds, sumDurations } from '../../utils/format';

export function MovementEditor() {
  const routineId = useAppStore((s) => s.activeRoutineId);
  const routine = useAppStore((s) =>
    routineId ? s.routines.find((r) => r.id === routineId) ?? null : null,
  );
  const globalWarnSeconds = useAppStore((s) => s.settings.warnBeforeSeconds);
  const templates = useAppStore((s) => s.movementTemplates);
  const updateRoutine = useAppStore((s) => s.updateRoutine);
  const addMovement = useAppStore((s) => s.addMovement);
  const updateMovement = useAppStore((s) => s.updateMovement);
  const deleteMovement = useAppStore((s) => s.deleteMovement);
  const reorderMovements = useAppStore((s) => s.reorderMovements);
  const saveMovementAsTemplate = useAppStore((s) => s.saveMovementAsTemplate);
  const addTemplateToRoutine = useAppStore((s) => s.addTemplateToRoutine);
  const setView = useAppStore((s) => s.setView);
  const startPlayback = useAppStore((s) => s.startPlayback);

  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState<number | ''>('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const totalSeconds = useMemo(() => (routine ? sumDurations(routine.movements) : 0), [routine]);

  const templateNameKeys = useMemo(
    () =>
      new Set(
        templates.map((t) => `${t.name.trim().toLowerCase()}|${t.duration}`),
      ),
    [templates],
  );

  if (!routine) {
    return (
      <div className="app-shell">
        <p style={{ color: 'var(--text-secondary)' }}>Rutina no encontrada.</p>
        <Button variant="secondary" onClick={() => setView('home')}>
          ← Volver
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    const name = newName.trim();
    const duration =
      typeof newDuration === 'number' ? newDuration : parseInt(String(newDuration), 10);
    if (!name || !duration || duration <= 0) return;
    addMovement(routine.id, { name, duration });
    setNewName('');
    setNewDuration('');
  };

  const filteredTemplates = templates.filter((t) => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return true;
    return t.name.toLowerCase().includes(q);
  });

  return (
    <div className="app-shell">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setView('home')}
          aria-label="Volver"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: 38,
            height: 38,
            color: 'var(--text-secondary)',
            flexShrink: 0,
            fontSize: 16,
          }}
        >
          ←
        </button>
        <Input
          value={routine.name}
          onChange={(e) => updateRoutine(routine.id, { name: e.target.value })}
          aria-label="Nombre de la rutina"
          style={{ fontWeight: 700, fontSize: 17 }}
        />
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {routine.movements.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              color: 'var(--text-secondary)',
              fontSize: 14,
            }}
          >
            Agregá el primer movimiento abajo para empezar.
          </div>
        )}
        {routine.movements.map((m, i) => {
          const key = `${m.name.trim().toLowerCase()}|${m.duration}`;
          return (
            <MovementItem
              key={m.id}
              index={i}
              total={routine.movements.length}
              movement={m}
              globalWarnSeconds={globalWarnSeconds}
              alreadyInLibrary={templateNameKeys.has(key)}
              onChange={(partial) => updateMovement(routine.id, m.id, partial)}
              onDelete={() => deleteMovement(routine.id, m.id)}
              onMoveUp={() => reorderMovements(routine.id, i, i - 1)}
              onMoveDown={() => reorderMovements(routine.id, i, i + 1)}
              onSaveAsTemplate={() => saveMovementAsTemplate(m)}
            />
          );
        })}
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-card)',
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>
          AGREGAR MOVIMIENTO
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Nombre"
            style={{ flex: 1 }}
          />
          <Input
            type="number"
            min={1}
            value={newDuration}
            onChange={(e) => {
              const v = e.target.value;
              setNewDuration(v === '' ? '' : Math.max(0, parseInt(v, 10) || 0));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="seg"
            style={{ width: 80 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <Button
            variant="secondary"
            size="md"
            onClick={handleAdd}
            disabled={!newName.trim() || !newDuration}
            style={{ flex: 1 }}
          >
            + Agregar
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setShowPicker(true)}
            disabled={templates.length === 0}
            title={templates.length === 0 ? 'Aún no guardaste plantillas' : 'Elegir de la biblioteca'}
            style={{ flex: 1 }}
          >
            ☆ Biblioteca ({templates.length})
          </Button>
        </div>
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          paddingTop: 12,
          marginTop: 'auto',
          background: 'linear-gradient(to top, var(--bg-primary) 60%, rgba(6, 6, 16, 0))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          <span>Duración total</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatSeconds(totalSeconds)}
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={routine.movements.length === 0}
          onClick={() => startPlayback(routine.id)}
        >
          Iniciar rutina ▶
        </Button>
      </div>

      <Modal
        open={showPicker}
        onClose={() => {
          setShowPicker(false);
          setPickerSearch('');
        }}
        title="Elegir de biblioteca"
        actions={
          <Button
            variant="ghost"
            onClick={() => {
              setShowPicker(false);
              setPickerSearch('');
            }}
          >
            Cerrar
          </Button>
        }
      >
        <Input
          autoFocus
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
          placeholder="Buscar plantilla..."
          style={{ marginBottom: 12 }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {filteredTemplates.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
              {templates.length === 0
                ? 'Todavía no tenés plantillas guardadas.'
                : 'Ningún resultado.'}
            </div>
          )}
          {filteredTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                addTemplateToRoutine(routine.id, t.id);
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                {t.duration}s
                {t.warnBeforeSeconds !== undefined && (
                  <span style={{ color: 'var(--accent-cyan)', marginLeft: 6 }}>
                    aviso {t.warnBeforeSeconds}s
                  </span>
                )}
              </span>
              <span style={{ color: 'var(--accent-green)', fontSize: 18 }}>+</span>
            </button>
          ))}
        </div>
        <small style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginTop: 8 }}>
          Cada plantilla se copia a la rutina. Editarla acá no toca la plantilla original.
        </small>
      </Modal>
    </div>
  );
}
