'use client';

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div style={{ display: 'block', width: '100%', marginTop: '12px' }} className="text-left">
      {label && (
        <label 
          className="text-[11px] text-on-surface-variant uppercase tracking-widest font-code font-bold"
          style={{ display: 'block', marginBottom: '6px' }}
        >
          {label}
        </label>
      )}
      <input
        style={{ display: 'block', width: '100%', height: '40px' }}
        className={`bg-surface-container-lowest text-primary border border-outline-variant rounded px-4 font-code text-sm outline-none transition-all focus:border-accent-blue placeholder:text-on-surface-variant/30 shadow-sm ${className}`}
        {...props}
      />
      {error && (
        <span className="text-red-500 text-xs font-code" style={{ display: 'block', marginTop: '4px' }}>{error}</span>
      )}
    </div>
  );
}