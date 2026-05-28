import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { RoutineList } from './RoutineList';

export function SetupView() {
  const createRoutine = useAppStore((s) => s.createRoutine);
  const setView = useAppStore((s) => s.setView);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const submitNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createRoutine(trimmed);
    setNewName('');
    setCreating(false);
  };

  return (
    <div className="app-shell">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.06em',
              fontSize: 32,
              background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ACROBUNGEE
          </h1>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.3em',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            TIMER
          </div>
        </div>
        <button
          onClick={() => setView('settings')}
          aria-label="Configuración"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: 18,
          }}
        >
          ⚙
        </button>
      </header>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => setCreating(true)}
        style={{ marginBottom: 24 }}
      >
        + Nueva rutina
      </Button>

      <div style={{ flex: 1 }}>
        <RoutineList />
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nueva rutina"
        actions={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitNew} disabled={!newName.trim()}>
              Crear
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitNew();
          }}
          placeholder="Nombre de la rutina"
        />
      </Modal>
    </div>
  );
}
