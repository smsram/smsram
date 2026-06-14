'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function FloatingMenu({ renderTrigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
    
    // Intercept clicks happening completely outside our elements to auto-close the popup
    function handleClickOutside(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        popoverRef.current && !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const triggerRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = triggerRect.right + 8;
      let top = triggerRect.top;

      setTimeout(() => {
        if (popoverRef.current) {
          const popoverRect = popoverRef.current.getBoundingClientRect();
          
          top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;

          // Flip positioning horizontally if it overflows the device frame bounds
          if (left + popoverRect.width > viewportWidth) {
            left = triggerRect.left - popoverRect.width - 8;
          }
          // Shift vertically to maintain readable spacing alignment options
          if (top + popoverRect.height > viewportHeight) {
            top = viewportHeight - popoverRect.height - 12;
          }
          if (top < 12) top = 12;

          setCoords({ top, left });
        }
      }, 0);
    }
  }, [isOpen]);

  const toggleMenuDispatch = (e) => {
    e.stopPropagation(); // Block bubbling to prevent instant outside click triggers
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative flex items-center w-full" ref={menuRef}>
      {/* Toggles the open/close state smoothly on user clicks */}
      <div onClick={toggleMenuDispatch} className="w-full cursor-pointer">
        {renderTrigger(isOpen)}
      </div>
      
      {mounted && createPortal(
        <div 
          ref={popoverRef}
          style={{ 
            position: 'fixed', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            zIndex: 9999 
          }}
          className={`bg-surface border border-outline-variant shadow-[0_8px_30px_rgb(0,0,0,0.15)] rounded-lg py-2 min-w-[200px] transition-all duration-200 ease-out
          ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}