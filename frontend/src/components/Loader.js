'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Loader({ size = 'md', className = '', fullScreen = false }) {
  const pathname = usePathname() || '';
  const [isSubdomainOrInternal, setIsSubdomainOrInternal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const hasSubdomain = hostname.startsWith('admin.') || hostname.startsWith('hub.');
      const hasSubPath = pathname.startsWith('/admin') || pathname.startsWith('/hub');

      setIsSubdomainOrInternal(hasSubdomain || hasSubPath);
    }
  }, [pathname]);

  // Map size prop to Tailwind dimensions
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  }[size] || 'w-8 h-8 border-[3px]';

  const spinner = (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses} border-outline-variant rounded-full`}></div>
      <div className={`${sizeClasses} border-accent-blue rounded-full border-t-transparent animate-spin absolute`}></div>
    </div>
  );

  // Premium loading strings depending on the domain/route depth
  const loadingText = isSubdomainOrInternal 
    ? 'Initializing System...' 
    : 'Syncing Data...';

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        {spinner}
        <span className="font-code text-xs text-on-surface-variant tracking-widest uppercase">
          {loadingText}
        </span>
      </div>
    );
  }

  return spinner;
}