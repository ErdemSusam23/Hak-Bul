import { useEffect, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';

/* ── Dynamic Lucide icon wrapper ── */
export function Icon({ name = '', size = 16, className = '', strokeWidth = 1.6, style }) {
  const componentName = name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const IconComponent = LucideIcons[componentName];
  if (!IconComponent) return null;
  return (
    <IconComponent
      size={size}
      className={className}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}

/* ── Logo ── */
export function Logo({ size = 20, showText = true, tone = 'ink' }) {
  const color = tone === 'ink' ? 'var(--ink)' : 'var(--accent-ink)';
  return (
    <div className="flex items-center gap-2 select-none">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color }}>
        <path d="M4 6h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2l3-11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
        <path d="M16 6v11a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2l-3-11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
        <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {showText && (
        <span className="font-display" style={{ fontSize: size + 6, lineHeight: 1, color }}>
          Hak<span style={{ color: 'var(--highlight)' }}>·</span>Bul
        </span>
      )}
    </div>
  );
}

/* ── Avatar ── */
export function Avatar({ name = '?', size = 28, role }) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const bg =
    role === 'lawyer' ? 'linear-gradient(135deg,#c9a96e,#8a6b2a)' :
    role === 'admin'  ? 'var(--accent)' :
    'var(--surface-muted)';
  const color = role ? '#fff' : 'var(--ink-soft)';
  return (
    <div
      style={{ width: size, height: size, background: bg, color, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-medium border border-line shrink-0"
    >
      {initials}
    </div>
  );
}

/* ── Pill / chip ── */
export function Pill({ children, active, onClick, tone = 'default' }) {
  const styles = active
    ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }
    : tone === 'lawyer'
    ? { background: 'transparent', color: 'var(--highlight)', borderColor: 'var(--highlight)' }
    : {};
  return (
    <button onClick={onClick} className="chip" style={styles}>
      {children}
    </button>
  );
}

/* ── Tooltip ── */
export function Tooltip({ label, children }) {
  return (
    <span className="relative group">
      {children}
      <span
        className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[11px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        {label}
      </span>
    </span>
  );
}

/* ── Keyboard shortcut badge ── */
export function Kbd({ children }) {
  return (
    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-line bg-surface-muted text-ink-muted">
      {children}
    </span>
  );
}

/* ── Section header ── */
export function SectionHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div className="max-w-2xl">
        {eyebrow && <div className="label mb-3">{eyebrow}</div>}
        <h1 className="font-display text-4xl leading-[1.05] text-ink" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {sub && <p className="text-ink-muted mt-3 text-[15px] leading-relaxed">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ── Toast notifications ── */
export function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="card slide-in flex items-center gap-3 px-4 py-3 pr-6 shadow-sm"
          style={{ borderColor: 'var(--line-strong)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background:
                t.kind === 'error' ? 'var(--danger)' :
                t.kind === 'info'  ? 'var(--accent)' :
                'var(--success)',
            }}
          />
          <span className="text-sm">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Modal overlay ── */
export function Modal({ open, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 fade-in" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(10,10,10,0.35)', backdropFilter: 'blur(2px)' }} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={'card relative w-full ' + (wide ? 'max-w-3xl' : 'max-w-md')}
          onClick={e => e.stopPropagation()}
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Toggle switch ── */
export function Toggle({ defaultOn, onChange }) {
  const [on, setOn] = useState(!!defaultOn);
  const handleClick = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };
  return (
    <button
      onClick={handleClick}
      className="w-11 h-6 rounded-full transition relative"
      style={{ background: on ? 'var(--accent)' : 'var(--line-strong)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
        style={{ left: on ? '22px' : '2px', background: '#fff' }}
      />
    </button>
  );
}

/* ── Form field ── */
export function Field({ label, ph, type = 'text', suffix, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <div className="flex items-center border border-line rounded-md bg-surface-muted focus-within:bg-surface focus-within:border-line-strong">
        <input
          type={type}
          placeholder={ph}
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent px-3 py-2 text-sm"
        />
        {suffix && <span className="pr-3 text-xs text-ink-faint font-mono">{suffix}</span>}
      </div>
    </label>
  );
}

export function FieldArea({ label, ph, rows = 3, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <textarea
        rows={rows}
        placeholder={ph}
        value={value}
        onChange={onChange}
        className="bg-surface-muted border border-line rounded-md px-3 py-2 text-sm resize-none focus:bg-surface focus:border-line-strong"
      />
    </label>
  );
}

/* ── Inline bold parser ── */
export function renderInline(text = '') {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
