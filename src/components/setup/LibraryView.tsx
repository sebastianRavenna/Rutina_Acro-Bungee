import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export function LibraryView() {
  const templates = useAppStore((s) => s.movementTemplates);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const updateTemplate = useAppStore((s) => s.updateTemplate);
  const setView = useAppStore((s) => s.setView);
  const globalWarn = useAppStore((s) => s.settings.warnBeforeSeconds);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editing = templates.find((t) => t.id === editingId);
  const pendingDelete = templates.find((t) => t.id === confirmDeleteId);

  // estado local del modal de edición
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editWarn, setEditWarn] = useState<number | ''>('');
  const [editNotes, setEditNotes] = useState('');

  const openEdit = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setEditName(t.name);
    setEditDuration(t.duration);
    setEditWarn(t.warnBeforeSeconds ?? '');
    setEditNotes(t.notes ?? '');
  };

  const closeEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateTemplate(editingId, {
      name: editName.trim() || 'Sin nombre',
      duration: Math.max(1, editDuration),
      warnBeforeSeconds: editWarn === '' ? undefined : Math.max(0, Number(editWarn)),
      notes: editNotes.trim() || undefined,
    });
    closeEdit();
  };

  return (
    <div className="app-shell" style={{ paddingTop: 70 }}>
      <button
        onClick={() => setView('settings')}
        aria-label="Volver"
        style={{
          position: 'fixed',
          top: 'calc(14px + env(safe-area-inset-top))',
          left: 14,
          background: 'rgba(13, 27, 53, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-strong)',
          borderRadius: '50%',
          width: 44,
          height: 44,
          color: 'var(--text-primary)',
          fontSize: 18,
          zIndex: 50,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        }}
      >
        ←
      </button>

      <header style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: 24 }}>
          BIBLIOTECA
        </h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {templates.length} {templates.length === 1 ? 'plantilla' : 'plantillas'}
        </div>
      </header>

      {templates.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-card)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>☆</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
            BIBLIOTECA VACÍA
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>
            Desde el editor de cada rutina podés tocar la estrella ☆ junto a un movimiento para
            guardarlo como plantilla y reusarlo después.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map((t) => (
            <div
              key={t.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-card)',
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.04em',
                    fontSize: 18,
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {t.duration}s
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                <span>
                  aviso{' '}
                  {t.warnBeforeSeconds !== undefined ? `${t.warnBeforeSeconds}s` : `${globalWarn}s (global)`}
                </span>
                <span>·</span>
                <span>usada {t.usageCount}×</span>
              </div>
              {t.notes && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '6px 8px',
                    borderRadius: 6,
                    marginBottom: 10,
                  }}
                >
                  {t.notes}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => openEdit(t.id)}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(t.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={closeEdit}
        title="Editar plantilla"
        actions={
          <>
            <Button variant="ghost" onClick={closeEdit}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveEdit} disabled={!editName.trim() || editDuration <= 0}>
              Guardar
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Nombre</div>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Duración (seg)</div>
            <Input
              type="number"
              min={1}
              value={editDuration}
              onChange={(e) => setEditDuration(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Aviso personalizado (vacío = global {globalWarn}s)
            </div>
            <Input
              type="number"
              min={0}
              value={editWarn}
              onChange={(e) => {
                const v = e.target.value;
                setEditWarn(v === '' ? '' : Math.max(0, parseInt(v, 10) || 0));
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Notas</div>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 14,
                minHeight: 60,
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!pendingDelete}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar plantilla"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDeleteId) deleteTemplate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        ¿Eliminar la plantilla <strong style={{ color: 'var(--text-primary)' }}>{pendingDelete?.name}</strong>?
        Las rutinas que ya la usan no se modifican.
      </Modal>
    </div>
  );
}
