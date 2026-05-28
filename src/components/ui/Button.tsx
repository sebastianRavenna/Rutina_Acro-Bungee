import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warn';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

const baseStyle: CSSProperties = {
  border: 'none',
  borderRadius: 'var(--radius-btn)',
  fontWeight: 700,
  letterSpacing: '0.02em',
  transition: 'transform 0.15s ease, opacity 0.2s ease, background 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
};

const sizeStyles: Record<Size, CSSProperties> = {
  sm: { padding: '8px 16px', fontSize: 13, minHeight: 36 },
  md: { padding: '12px 22px', fontSize: 15, minHeight: 44 },
  lg: { padding: '16px 28px', fontSize: 17, minHeight: 52 },
};

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
    color: '#040414',
  },
  secondary: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  danger: {
    background: 'rgba(255, 0, 60, 0.15)',
    color: '#ff7593',
    border: '1px solid rgba(255, 0, 60, 0.35)',
  },
  warn: {
    background: 'linear-gradient(135deg, #ff6b35 0%, #ff003c 100%)',
    color: '#fff',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  style,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const composed: CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(fullWidth ? { width: '100%' } : null),
    ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : null),
    ...style,
  };

  return (
    <button {...rest} disabled={disabled} style={composed}>
      {children}
    </button>
  );
}
