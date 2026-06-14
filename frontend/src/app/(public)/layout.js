'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FloatingMenu from '@/components/FloatingMenu';

export default function PublicLayout({ children }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState('system');

  // Initialize theme preference on mounting
  useEffect(() => {
    const savedTheme = localStorage.getItem('smsram-theme') || 'system';
    setTheme(savedTheme);
  }, []);

  // Sync theme choices with the HTML root structure
  useEffect(() => {
    const root = document.documentElement;
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    
    localStorage.setItem('smsram-theme', theme);
  }, [theme]);

  // Close mobile navigation drawer on route change updates
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const pathParts = pathname.split('/').filter(Boolean).join(' > ');

  return (
    <div className="min-h-screen bg-background flex overflow-hidden transition-colors duration-300">
      
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Persistent Public Navigation Sidebar Frame */}
      <nav 
        className={`fixed top-0 left-0 h-full bg-surface border-r border-outline-variant flex flex-col z-50 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'md:w-16' : 'md:w-64'} 
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Core Workspace Logo Header */}
        <div className={`flex items-center pt-lg pb-md mb-md h-20 transition-all duration-300 ${isCollapsed ? 'px-0 justify-center w-full' : 'px-md gap-sm'}`}>
          <Link href="/" className="flex items-center group justify-center">
            <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant shrink-0 flex items-center justify-center">
              <img src="/smsram.jpg" alt="Logo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
            </div>
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 pl-0' : 'w-auto opacity-100 pl-2'}`}>
              <h1 className="font-display text-headline-md font-bold text-primary leading-none">SMSRam</h1>
            </div>
          </Link>
        </div>
        
        {/* Main Navigation Groups with Visual Separators */}
        <div className="flex-grow space-y-1 px-sm overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* Section 1: Technical & Directories Node */}
          <NavItem href="/dashboard" icon="dashboard" label="Dashboard" isActive={pathname === '/dashboard'} isCollapsed={isCollapsed} />
          <NavItem href="/projects" icon="account_tree" label="Projects" isActive={pathname.includes('/projects')} isCollapsed={isCollapsed} />
          <NavItem href="/source-code" icon="code_blocks" label="Source Code" isActive={pathname.includes('/source-code')} isCollapsed={isCollapsed} />
          <NavItem href="/blog" icon="menu_book" label="Transmissions" isActive={pathname.includes('/blog')} isCollapsed={isCollapsed} />
          <NavItem href="/videos" icon="subscriptions" label="Broadcasts" isActive={pathname.includes('/videos')} isCollapsed={isCollapsed} />
          <NavItem href="/services" icon="widgets" label="Public Utilities" isActive={pathname.includes('/services')} isCollapsed={isCollapsed} />
          
          {/* Divider Line separating Production Directories from Personal Nodes */}
          <div className="border-t border-outline-variant/60 my-3 mx-2" />
          
          {/* Section 2: Identity & Connection Paths */}
          <NavItem href="/about" icon="badge" label="Identity" isActive={pathname.includes('/about')} isCollapsed={isCollapsed} />
          <NavItem href="/contact" icon="alternate_email" label="Connection Node" isActive={pathname.includes('/contact')} isCollapsed={isCollapsed} />
        </div>

        {/* Lower Configurations Footer Block */}
        <div className="px-sm mt-auto border-t border-outline-variant pt-sm pb-md relative">
          
          {/* Theme Switch Trigger via FloatingMenu Portal */}
          <FloatingMenu 
            renderTrigger={(isOpen) => (
              <NavItem 
                asButton 
                icon="palette" 
                label="Theme Space" 
                isCollapsed={isCollapsed} 
                isActive={isOpen} 
              />
            )}
          >
            <div className="flex flex-col text-sm font-body-sm text-on-surface py-1">
              <div className="px-4 py-2 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                Workspace Theme
              </div>
              <button onClick={() => setTheme('light')} className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-container transition-colors w-full text-left ${theme === 'light' ? 'text-accent-blue font-bold' : ''}`}>
                <span className="material-symbols-outlined text-[18px]">light_mode</span> Light Theme
              </button>
              <button onClick={() => setTheme('dark')} className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-container transition-colors w-full text-left ${theme === 'dark' ? 'text-accent-blue font-bold' : ''}`}>
                <span className="material-symbols-outlined text-[18px]">dark_mode</span> Dark Theme
              </button>
              <button onClick={() => setTheme('system')} className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-container transition-colors w-full text-left ${theme === 'system' ? 'text-accent-blue font-bold' : ''}`}>
                <span className="material-symbols-outlined text-[18px]">contrast</span> System Default
              </button>
            </div>
          </FloatingMenu>
        </div>
      </nav>

      {/* Top Header Breadcrumb Panel Frame */}
      <header 
        className={`bg-surface text-primary fixed top-0 right-0 h-16 border-b border-outline-variant flex justify-between items-center px-4 md:px-lg z-30 transition-all duration-300 ease-in-out ${isCollapsed ? 'md:left-16' : 'md:left-64'} left-0`}
      >
        <div className="flex items-center gap-md">
          <button onClick={() => setIsMobileOpen(true)} className="md:hidden text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">{isCollapsed ? 'menu_open' : 'menu'}</span>
          </button>
          <div className="hidden sm:flex text-on-surface-variant items-center font-code text-[11px] uppercase tracking-widest bg-surface-container px-sm py-1 rounded">
            {pathParts || 'home'}
          </div>
        </div>
      </header>

      {/* Application Content Mount Frame */}
      <main 
        className={`pt-16 w-full h-screen flex flex-col transition-all duration-300 ease-in-out bg-background ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}
      >
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, isActive, isCollapsed, asButton }) {
  const content = (
    <>
      <span className="material-symbols-outlined shrink-0">{icon}</span>
      <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 pl-0' : 'w-auto opacity-100 pl-4'}`}>
        {label}
      </span>
    </>
  );
  
  const className = `flex items-center w-full h-10 rounded transition-all duration-200 group border-l-2
    ${isCollapsed ? 'justify-center px-0' : 'px-md gap-0'}
    ${isActive ? 'text-primary font-bold border-accent-blue bg-surface-container-low' : 'text-on-surface-variant hover:bg-surface-container border-transparent'}
  `;

  if (asButton) {
    return <button type="button" className={className} title={isCollapsed ? label : ''}>{content}</button>;
  }
  return <Link href={href} className={className} title={isCollapsed ? label : ''}>{content}</Link>;
}