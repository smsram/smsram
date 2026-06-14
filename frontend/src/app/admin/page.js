'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Skeleton from '@/components/Skeleton';

export default function AdminDashboardIndex() {
  const [metrics, setMetrics] = useState({
    totalAssets: 0,
    totalConnections: 0,
    distribution: { PROJECT: 0, VIDEO: 0, SOURCE: 0, BLOG: 0, SERVICE: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function gatherEcosystemMetrics() {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
      const adminToken = localStorage.getItem('admin_session_token');
      try {
        const res = await fetch(`${serverUrl}/api/analytics/dashboard-summary`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        const payload = await res.json();
        if (payload.success && payload.metrics) {
          setMetrics(payload.metrics);
        }
      } catch (err) {
        console.error("Failed to establish secure communications with analytics telemetry engine", err);
      } finally {
        setIsLoading(false);
      }
    }
    gatherEcosystemMetrics();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in duration-300 font-display" style={{ padding: '40px' }}>
      <div className="mx-auto flex flex-col" style={{ maxWidth: '1200px', gap: '32px' }}>
        
        {/* Dynamic Heading Panel */}
        <div style={{ display: 'block' }} className="text-left">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-wide">Console Overview</h2>
          <p className="text-on-surface-variant font-display text-sm mt-1 opacity-80">
            Manage single-table ledger metadata asset graphs, live connections, and architecture distribution states
          </p>
        </div>

        {/* Real-time Content Node Ledger Metric Indicators Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ display: 'grid' }}>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-4 flex items-center gap-4 text-left shadow-xs">
            <div className="w-10 h-10 rounded bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
              <span className="material-symbols-outlined">layers</span>
            </div>
            <div className="min-w-0 flex-1 font-display">
              <div className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Total Assets</div>
              {isLoading ? <Skeleton className="h-6 w-16 mt-1" /> : (
                <div className="text-lg font-bold text-primary mt-0.5">{metrics.totalAssets} Nodes</div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-4 flex items-center gap-4 text-left shadow-xs">
            <div className="w-10 h-10 rounded bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shrink-0">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <div className="min-w-0 flex-1 font-display">
              <div className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Graph Edges</div>
              {isLoading ? <Skeleton className="h-6 w-16 mt-1" /> : (
                <div className="text-lg font-bold text-primary mt-0.5">{metrics.totalConnections} Links</div>
              )}
            </div>
          </div>

        </div>

        {/* DYNAMIC TELEMETRY DISTRIBUTION EXTRACTION VIEW PANEL */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-xs text-left">
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-4">
            Ecosystem Content Distribution Inventory Matrix
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Projects', key: 'PROJECT', bg: 'bg-accent-orange/5', text: 'text-accent-orange', border: 'border-accent-orange/10' },
              { label: 'Broadcasts', key: 'VIDEO', bg: 'bg-red-500/5', text: 'text-red-500', border: 'border-red-500/10' },
              { label: 'Repositories', key: 'SOURCE', bg: 'bg-accent-blue/5', text: 'text-accent-blue', border: 'border-accent-blue/10' },
              { label: 'Transmissions', key: 'BLOG', bg: 'bg-green-500/5', text: 'text-green-500', border: 'border-green-500/10' },
              { label: 'Utilities', key: 'SERVICE', bg: 'bg-purple-500/5', text: 'text-purple-500', border: 'border-purple-500/10' }
            ].map((distItem) => (
              <div key={distItem.key} className={`${distItem.bg} ${distItem.border} border rounded p-4 font-display flex flex-col items-start gap-1`}>
                <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">{distItem.label}</span>
                {isLoading ? <Skeleton className="h-5 w-10 mt-1" /> : (
                  <span className={`text-base font-bold ${distItem.text}`}>{metrics.distribution[distItem.key]} Cards</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Management Shortcuts Section */}
        <div style={{ display: 'block' }}>
          <h3 className="font-display font-bold text-sm text-on-surface-variant text-left mb-4 uppercase tracking-wider">Direct Management Gateways</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid' }}>
            
            <Link href="/admin/assets" className="group bg-surface-container-lowest border border-outline-variant hover:border-outline p-5 rounded-md text-left transition-all block no-underline cursor-pointer shadow-xs">
              <div className="flex items-center justify-between text-on-surface-variant group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[24px] text-accent-orange">post_add</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
              <h4 className="font-display text-base font-bold text-primary mt-4">Asset Content Registry</h4>
              <p className="text-sm text-on-surface-variant font-body-sm mt-1 leading-relaxed">
                Insert, rewrite, or clear content entries from the core SQLite database. Stores metadata definitions cleanly using raw JSON strings.
              </p>
            </Link>

            <Link href="/admin/connections" className="group bg-surface-container-lowest border border-outline-variant hover:border-outline p-5 rounded-md text-left transition-all block no-underline cursor-pointer shadow-xs">
              <div className="flex items-center justify-between text-on-surface-variant group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[24px] text-accent-orange">device_hub</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
              <h4 className="font-display text-base font-bold text-primary mt-4">Bidirectional Symmetrical Linker</h4>
              <p className="text-sm text-on-surface-variant font-body-sm mt-1 leading-relaxed">
                Establish or invalidate connection lines between separate directory cards. Drives your Related Content recommendation layout rows.
              </p>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}