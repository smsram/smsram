'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function AlertModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "OK", 
  cancelText = "Cancel", 
  showCancel = true,
  type = "default",
  children
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // 🟢 FIXED: Removed the stray semicolon from the default key property to resolve compilation crash
  const confirmBtnStyle = {
    default: { backgroundColor: 'var(--color-accent-blue)', color: '#ffffff' },
    danger: { backgroundColor: '#dc2626', color: '#ffffff' },
    success: { backgroundColor: '#16a34a', color: '#ffffff' }
  }[type] || { backgroundColor: 'var(--color-accent-blue)', color: '#ffffff' };

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      className="antialiased"
    >
      {/* Backdrop overlay */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.75)', 
          backdropFilter: 'blur(4px)' 
        }}
        onClick={onCancel || onConfirm} 
      />
      
      {/* Central Card Modal View Window Layout Container */}
      <div 
        style={{ 
          position: 'relative',
          width: '520px', 
          maxWidth: '100%',
          maxHeight: '85vh',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        className="bg-surface border border-outline-variant text-on-background"
      >
        {/* Scrollable Container Window Layer Area */}
        <div className="flex-grow overflow-y-auto no-scrollbar p-6" style={{ maxHeight: 'calc(85vh - 56px)' }}>
          <h3 className="text-lg font-bold text-primary font-display" style={{ margin: '0 0 8px 0', display: 'block' }}>
            {title}
          </h3>
          <p className="text-sm text-on-surface-variant font-body-sm" style={{ margin: '0 0 16px 0', display: 'block', lineHeight: '1.6' }}>
            {message}
          </p>
          {children && <div className="w-full block relative mt-2">{children}</div>}
        </div>

        {/* Footer Actions Strip panel wrapper context */}
        <div 
          className="bg-surface-container border-t border-outline-variant w-full shrink-0 flex items-center justify-end px-6"
          style={{ 
            height: '56px'
          }}
        >
          {showCancel && (
            <button 
              type="button"
              onClick={onCancel}
              className="font-label-caps text-xs tracking-widest text-on-surface-variant hover:opacity-80 transition-opacity"
              style={{
                display: 'inline-block',
                height: '32px',
                padding: '0 16px',
                marginRight: '8px',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent'
              }}
            >
              {cancelText}
            </button>
          )}
          <button 
            type="button"
            onClick={onConfirm}
            className="font-label-caps text-xs tracking-widest font-bold rounded shadow-sm hover:opacity-90 transition-opacity"
            style={{
              display: 'inline-block',
              height: '32px',
              padding: '0 20px',
              cursor: 'pointer',
              border: 'none',
              ...confirmBtnStyle 
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}