import { CSSProperties, ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const backdrop: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  };
  const card: CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-card)',
    padding: 24,
    width: '100%',
    maxWidth: 380,
    animation: 'fadeIn 0.2s ease-out',
  };

  return (
    <div style={backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={{ marginBottom: 12, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{title}</h3>}
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{children}</div>
        {actions && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
