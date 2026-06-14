'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import FloatingMenu from '@/components/FloatingMenu';
import Loader from '@/components/Loader';
import AlertModal from '@/components/AlertModal';

export default function HubLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const isLoginPage = pathname === '/hub/login' || pathname === '/login';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState('system');
  
  // Logout Modal Trigger State
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // 1. Live Session Validation Flow
  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingAuth(false);
      return;
    }

    async function verifySession() {
      const token = localStorage.getItem('hub_session_token');
      const hubRoot = process.env.NEXT_PUBLIC_BAAS_HUB_ROOT;

      if (!token) {
        setIsAuthenticated(false);
        router.replace('/hub/login');
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${hubRoot}/verify`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });

        const data = await response.json();

        if (data.success) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('hub_session_token');
          setIsAuthenticated(false);
          router.replace('/hub/login');
        }
      } catch (err) {
        console.error("BaaS authentication verify path unavailable");
        setIsAuthenticated(false); 
        router.replace('/hub/login');
      } finally {
        setIsCheckingAuth(false);
      }
    }

    verifySession();
  }, [pathname, router, isLoginPage]);

  // 2. Theme Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('smsram-theme') || 'system';
    setTheme(savedTheme);
  }, []);

  // 3. Apply Active Theme
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

  // 4. Close mobile views
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('hub_session_token');
    setShowLogoutAlert(false);
    router.replace('/hub/login');
  };

  if (isCheckingAuth) {
    return <Loader fullScreen={true} size="lg" />;
  }

  if (isLoginPage) {
    return <div className="bg-background min-h-screen text-on-background">{children}</div>;
  }

  if (!isAuthenticated) return null;

  const pathParts = pathname.split('/').filter(Boolean).join(' > ');

  return (
    <div className="min-h-screen bg-background flex overflow-hidden transition-colors duration-300">
      
      {/* LOGOUT CONFIRMATION MODAL */}
      <AlertModal 
        isOpen={showLogoutAlert}
        title="Terminate Master Session"
        message="Are you sure you want to invalidate your active access token and clear your infrastructure management session?"
        type="danger"
        confirmText="Disconnect"
        cancelText="Stay"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutAlert(false)}
      />

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <nav 
        className={`fixed top-0 left-0 h-full bg-surface border-r border-outline-variant flex flex-col z-50 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'md:w-16' : 'md:w-64'} 
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className={`flex items-center pt-lg pb-md mb-md h-20 transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-md gap-sm'}`}>
          <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant shrink-0">
            <img src="/smsram.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <h1 className="font-display text-headline-md font-bold text-primary leading-none">SMSRam</h1>
            <span className="text-xs text-on-surface-variant font-code">v4.2.0</span>
          </div>
        </div>
        
        <div className="flex-grow space-y-1 px-sm overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <NavItem href="/hub" icon="dashboard" label="Dashboard" isActive={pathname === '/hub' || pathname === '/'} isCollapsed={isCollapsed} />
          <NavItem href="/hub/database" icon="database" label="Database" isActive={pathname.includes('/database')} isCollapsed={isCollapsed} />
          <NavItem href="/hub/storage" icon="inventory_2" label="Storage" isActive={pathname.includes('/storage')} isCollapsed={isCollapsed} />
          <NavItem href="/hub/ai" icon="smart_toy" label="AI Services" isActive={pathname.includes('/ai')} isCollapsed={isCollapsed} />
          <NavItem href="/hub/apps" icon="layers" label="App Services" isActive={pathname.includes('/apps')} isCollapsed={isCollapsed} />
        </div>

        <div className="px-sm mt-auto border-t border-outline-variant pt-sm pb-md relative">
          <FloatingMenu 
            renderTrigger={(isOpen) => (
              <NavItem 
                asButton 
                icon="settings" 
                label="Settings" 
                isCollapsed={isCollapsed} 
                isActive={isOpen} 
              />
            )}
          >
            <div className="flex flex-col text-sm font-body-sm text-on-surface py-1">
              <div className="px-4 py-2 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">
                Workspace Preferences
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
              
              <div className="border-t border-outline-variant my-1 w-full"></div>
              
              {/* Trigger the custom top-aligned AlertModal instead of running line-execution raw deletes directly */}
              <button 
                onClick={() => setShowLogoutAlert(true)} 
                className="flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-500/10 transition-colors w-full text-left font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span> Terminate Session
              </button>
            </div>
          </FloatingMenu>

          <NavItem href="/docs" icon="menu_book" label="Docs" isActive={pathname.includes('/docs')} isCollapsed={isCollapsed} />
        </div>
      </nav>

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
            {pathParts || 'hub'}
          </div>
        </div>
      </header>

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
      <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
        {label}
      </span>
    </>
  );
  
  const className = `flex items-center w-full h-10 rounded transition-all duration-200 group
    ${isCollapsed ? 'justify-center px-0' : 'px-md gap-md'}
    ${isActive ? 'text-primary font-bold border-l-2 border-accent-purple bg-surface-container-low' : 'text-on-surface-variant hover:bg-surface-container border-l-2 border-transparent'}
  `;

  if (asButton) {
    return <button type="button" className={className} title={isCollapsed ? label : ''}>{content}</button>;
  }
  return <Link href={href} className={className} title={isCollapsed ? label : ''}>{content}</Link>;
}