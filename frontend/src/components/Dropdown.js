'use client';

import { useState, useEffect, useRef } from 'react';

export default function Dropdown({ 
  options = [], 
  selectedValue, 
  onChange, 
  placeholder = "Select filter",
  labelPrefix 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close the drop list automatically if clicking outside the component context
  useEffect(() => {
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const currentOption = options.find(opt => 
    (typeof opt === 'object' ? opt.value : opt) === selectedValue
  );
  const displayLabel = currentOption 
    ? (typeof currentOption === 'object' ? currentOption.label : currentOption)
    : placeholder;

  return (
    <div 
      ref={dropdownRef}
      style={{ display: 'block', position: 'relative' }} 
      className="w-full text-left font-code text-xs uppercase tracking-wider select-none"
    >
      {/* Active Trigger Button Frame */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', height: '44px' }}
        className={`w-full bg-surface-container-lowest text-primary border border-outline-variant rounded-md px-4 items-center justify-between shadow-sm cursor-pointer transition-all hover:bg-surface-container-low ${isOpen ? 'border-neutral-400 dark:border-neutral-600 ring-1 ring-neutral-400' : ''}`}
      >
        <span className="truncate pr-2">
          {labelPrefix && <span className="opacity-50 mr-1.5">{labelPrefix}</span>}
          {displayLabel}
        </span>
        <span className="material-symbols-outlined text-[18px] opacity-60 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          arrow_drop_down
        </span>
      </div>

      {/* Pure Floating Options Portal Frame Mounted Directly Underneath */}
      {isOpen && (
        <div 
          style={{ 
            position: 'absolute', 
            top: '48px', 
            left: 0, 
            right: 0, 
            zIndex: 9999,
            display: 'block'
          }}
          className="bg-surface border border-outline-variant shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-md py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {options.map((option, idx) => {
            const val = typeof option === 'object' ? option.value : option;
            const lbl = typeof option === 'object' ? option.label : option;
            const isSelected = val === selectedValue;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(val);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-2.5 hover:bg-surface-container w-full text-left transition-colors font-medium border-none outline-none cursor-pointer ${isSelected ? 'text-accent-blue font-bold bg-surface-container-low' : 'text-primary'}`}
              >
                <span className="truncate">{lbl}</span>
                {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}