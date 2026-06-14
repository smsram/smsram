"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // FIX: Must use the API_ROOT, not HUB_ROOT, because the route is /api/auth/login
    const apiRoot = process.env.NEXT_PUBLIC_BAAS_API_ROOT;

    try {
      const response = await fetch(`${apiRoot}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('hub_session_token', data.token);
        router.push('/hub'); 
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to connect to SMSRam Infrastructure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] dark:bg-[#000000] flex flex-col items-center justify-center p-4 antialiased selection:bg-neutral-800">
      
      {/* Outer block constraint limits text drift or structural component warping */}
      <div className="w-full max-w-[400px] flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Identity Headings */}
        <div className="flex flex-col gap-2 text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ffffff] font-display uppercase leading-tight">
            SMSRam<br />Infrastructure
          </h1>
          <div className="flex flex-col font-code text-[11px] tracking-widest text-neutral-500 font-medium">
            <span>SECURE</span>
            <span>CONTROL</span>
            <span>CENTRALE</span>
          </div>
        </div>

        {/* Input Interactive Form Layer */}
        <form className="flex flex-col gap-6 w-full" onSubmit={handleLogin}>
          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor="admin_key"
              className="text-[11px] text-neutral-400 uppercase tracking-widest font-code font-bold"
            >
              MASTER_ADMIN_KEY
            </label>
            
            {/* Input wrap layout handles width explicitly to stop scaling problems */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none text-[20px]">
                key
              </span>
              <input
                id="admin_key"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter strictly confidential key"
                className="w-full h-11 bg-[#000000] text-[#ffffff] border border-neutral-800 rounded pl-10 pr-4 font-code text-sm outline-none transition-all duration-200 focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff] placeholder:text-neutral-700 shadow-sm"
              />
            </div>
            
            {error && (
              <div className="flex items-start gap-2 text-red-500 text-xs mt-1 font-code bg-red-950/20 border border-red-900/30 p-2.5 rounded animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span className="leading-normal">{error}</span>
              </div>
            )}
          </div>

          {/* Clean Vercel action layer uses minimalist orange inline glow states */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#f57f15] hover:bg-[#d66f12] disabled:opacity-40 text-[#ffffff] font-medium rounded transition-all duration-200 flex items-center justify-between px-4 group shadow-lg active:scale-[0.99] shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full animate-spin mx-auto" />
            ) : (
              <>
                <span className="font-label-caps text-xs uppercase tracking-widest font-bold">Authenticate</span>
                <span className="material-symbols-outlined text-[18px] transform transition-transform duration-200 group-hover:translate-x-1">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}