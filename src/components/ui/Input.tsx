import { CSSProperties, InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

const baseInputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-input)',
  padding: '12px 14px',
  color: 'var(--text-primary)',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color 0.2s ease, background 0.2s ease',
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ style, onFocus, onBlur, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        style={{ ...baseInputStyle, ...style }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          onBlur?.(e);
        }}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ style, onFocus, onBlur, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        {...rest}
        style={{ ...baseInputStyle, minHeight: 60, resize: 'vertical', ...style }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          onBlur?.(e);
        }}
      />
    );
  },
);
