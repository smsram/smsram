'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/Input';

export default function AdminLoginPage() {
  const router = useRouter();
  const [tokenKey, setTokenKey] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthenticationDispatch = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus("Establishing network handshake...");

    // Read backend URL from environment variables, defaulting to port 5000
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${serverUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokenKey })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        // Core session synchronization - store the active session tokens
        localStorage.setItem('admin_session_token', data.token);
        
        setStatus("Access granted. Synchronizing workspace configuration...");
        setTimeout(() => router.push('/admin'), 1000);
      } else {
        setStatus(data.message || "Invalid security parameters.");
        setIsSubmitting(false);
        setTimeout(() => setStatus(''), 3000);
      }
    } catch (err) {
      console.error("Backend connection failure:", err);
      setStatus("Could not connect to authentication gateway server.");
      setIsSubmitting(false);
      setTimeout(() => setStatus(''), 4000);
    }
  };

  return (
    <div className="w-full max-w-[400px] p-6 bg-[#0a0a0a] border border-neutral-900 rounded-lg shadow-xl text-left animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center text-accent-orange mb-3 shadow-inner">
          <span className="material-symbols-outlined text-[24px]">encrypted</span>
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight text-white uppercase">Access Terminal</h2>
        <p className="text-xs text-neutral-500 font-code uppercase tracking-wider mt-1">Private Security Authentication Entry</p>
      </div>

      {status && (
        <div className="w-full bg-neutral-900 text-neutral-400 border border-neutral-800 font-code text-[10px] py-2.5 px-3 rounded mb-4 uppercase tracking-widest text-center leading-relaxed">
          {status}
        </div>
      )}

      <form onSubmit={handleAuthenticationDispatch} className="space-y-4">
        <Input 
          type="password"
          label="Root Security Token Key"
          required
          disabled={isSubmitting}
          value={tokenKey}
          onChange={(e) => setTokenKey(e.target.value)}
          placeholder="Input infrastructure hash signature..."
        />
        
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ height: '42px', backgroundColor: '#f57f15' }}
          className={`w-full text-white font-code text-xs uppercase tracking-widest font-bold rounded shadow-md active:scale-[0.99] transition-all border-none outline-none mt-2
            ${isSubmitting ? 'opacity-50 cursor-not-allowed animate-pulse' : 'hover:opacity-90 cursor-pointer'}`}
        >
          {isSubmitting ? 'Verifying Link...' : 'Initialize Handshake'}
        </button>
      </form>
    </div>
  );
}