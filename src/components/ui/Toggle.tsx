import { CSSProperties } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
  id?: string;
}

export function Toggle({ checked, onChange, label, ariaLabel, id }: ToggleProps) {
  const wrap: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    cursor: 'pointer',
    width: '100%',
  };
  const track: CSSProperties = {
    width: 44,
    height: 26,
    borderRadius: 999,
    background: checked ? 'var(--accent-green)' : 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    transition: 'background 0.2s ease',
    flexShrink: 0,
  };
  const knob: CSSProperties = {
    position: 'absolute',
    top: 3,
    left: checked ? 21 : 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  };

  return (
    <label htmlFor={id} style={wrap}>
      {label && <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{label}</span>}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
        style={{ ...track, border: 'none', padding: 0 }}
      >
        <span style={knob} />
      </button>
    </label>
  );
}
