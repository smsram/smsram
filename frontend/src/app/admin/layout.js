'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import FloatingMenu from '@/components/FloatingMenu';
import Loader from '@/components/Loader';
import AlertModal from '@/components/AlertModal';

const SESSION_KEY = 'admin_session_token';
const SESSION_EXPIRY_KEY = 'admin_session_expiry';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/admin/login' || pathname === '/login';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // 1. Session token validation + 24h expiry
  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingAuth(false);
      return;
    }

    async function verifyAdminSession() {
      const token = localStorage.getItem(SESSION_KEY);
      const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';

      if (!token) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        setIsAuthenticated(false);
        router.replace('/admin/login');
        setIsCheckingAuth(false);
        return;
      }

      const expiryTime = expiry ? Number(expiry) : null;

      if (
        expiry &&
        (Number.isNaN(expiryTime) || Date.now() > expiryTime)
      ) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        setIsAuthenticated(false);
        router.replace('/admin/login');
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch(`${serverUrl}/api/admin/verify`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (!expiry) {
            localStorage.setItem(
              SESSION_EXPIRY_KEY,
              String(Date.now() + SESSION_DURATION_MS)
            );
          }
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
          setIsAuthenticated(false);
          router.replace('/admin/login');
        }
      } catch (err) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        setIsAuthenticated(false);
        router.replace('/admin/login');
      } finally {
        setIsCheckingAuth(false);
      }
    }

    verifyAdminSession();
  }, [pathname, router, isLoginPage]);

  // 2. Auto-expire check while user is active
  useEffect(() => {
    if (isLoginPage) return;

    const interval = setInterval(() => {
      const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);

      if (!expiry) return;

      const expiryTime = Number(expiry);

      if (Number.isNaN(expiryTime) || Date.now() > expiryTime) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        setIsAuthenticated(false);
        router.replace('/admin/login');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [router, isLoginPage]);

  // 3. Active workspace theme setup
  useEffect(() => {
    const savedTheme = localStorage.getItem('smsram-theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  // 4. Theme sync
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    localStorage.setItem('smsram-theme', theme);
  }, [theme]);

  // 5. Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    setShowLogoutAlert(false);
    setIsAuthenticated(false);
    router.replace('/admin/login');
  };

  if (isCheckingAuth) {
    return <Loader fullScreen={true} size="lg" />;
  }

  if (isLoginPage) {
    return (
      <div className="bg-background min-h-screen text-on-background flex items-center justify-center">
        {children}
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const getDirectPageName = () => {
    if (pathname === '/admin' || pathname === '/') return 'Dashboard';
    if (pathname.includes('/admin/assets') || pathname.includes('/assets'))
      return 'Manage Content';
    if (
      pathname.includes('/admin/connections') ||
      pathname.includes('/connections')
    )
      return 'Asset Graph Links';
    return 'Admin';
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden transition-colors duration-300">
      <AlertModal
        isOpen={showLogoutAlert}
        title="Terminate Management Session"
        message="Are you sure you want to invalidate your active access token and disconnect from the administration console engine?"
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
        <div
          className={`flex items-center pt-lg pb-md mb-md h-20 transition-all duration-300 ${
            isCollapsed ? 'px-0 justify-center w-full' : 'px-md gap-sm'
          }`}
        >
          <Link href="/admin" className="flex items-center group justify-center">
            <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant shrink-0 flex items-center justify-center">
              <img
                src="/smsram.jpg"
                alt="Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div
              className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isCollapsed ? 'w-0 opacity-0 pl-0' : 'w-auto opacity-100 pl-2'
              }`}
            >
              <h1 className="font-display text-headline-md font-bold text-primary leading-none">
                SMSRam
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex-grow space-y-1 px-sm overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <NavItem
            href="/admin"
            icon="dashboard"
            label="Console Overview"
            isActive={pathname === '/admin' || pathname === '/'}
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/admin/assets"
            icon="layers"
            label="Manage Content"
            isActive={
              pathname.includes('/admin/assets') || pathname.includes('/assets')
            }
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/admin/connections"
            icon="hub"
            label="Asset Graph Links"
            isActive={
              pathname.includes('/admin/connections') ||
              pathname.includes('/connections')
            }
            isCollapsed={isCollapsed}
          />
        </div>

        <div className="px-sm mt-auto border-t border-outline-variant pt-sm pb-md relative">
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
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-container transition-colors w-full text-left ${
                  theme === 'light' ? 'text-accent-orange font-bold' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  light_mode
                </span>
                Light Theme
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-container transition-colors w-full text-left ${
                  theme === 'dark' ? 'text-accent-orange font-bold' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  dark_mode
                </span>
                Dark Theme
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-surface-container transition-colors w-full text-left ${
                  theme === 'system' ? 'text-accent-orange font-bold' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  contrast
                </span>
                System Default
              </button>

              <div className="border-t border-outline-variant my-1 w-full" />

              <button
                onClick={() => setShowLogoutAlert(true)}
                className="flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-500/10 transition-colors w-full text-left font-medium border-none bg-transparent outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Disconnect Node
              </button>
            </div>
          </FloatingMenu>
        </div>
      </nav>

      <header
        className={`bg-surface text-primary fixed top-0 right-0 h-16 border-b border-outline-variant flex justify-between items-center px-4 md:px-lg z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:left-16' : 'md:left-64'
        } left-0`}
      >
        <div className="flex items-center gap-md">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>
          <div className="hidden sm:flex text-on-surface-variant items-center font-display text-headline-sm font-bold bg-surface-container px-sm py-1 rounded">
            {getDirectPageName()}
          </div>
        </div>
      </header>

      <main
        className={`pt-16 w-full h-screen flex flex-col transition-all duration-300 ease-in-out bg-background ${
          isCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
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
      <span
        className={`whitespace-nowrap transition-all duration-300 overflow-hidden text-sm font-display ${
          isCollapsed ? 'w-0 opacity-0 pl-0' : 'w-auto opacity-100 pl-4'
        }`}
      >
        {label}
      </span>
    </>
  );

  const className = `flex items-center w-full h-10 rounded transition-all duration-200 group border-none outline-none text-left border-l-2
    ${isCollapsed ? 'justify-center px-0' : 'px-md gap-0'}
    ${
      isActive
        ? 'text-primary font-bold border-accent-orange bg-surface-container-low'
        : 'text-on-surface-variant hover:bg-surface-container border-transparent'
    }
  `;

  if (asButton) {
    return (
      <button
        type="button"
        className={className}
        title={isCollapsed ? label : ''}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={className} title={isCollapsed ? label : ''}>
      {content}
    </Link>
  );
}