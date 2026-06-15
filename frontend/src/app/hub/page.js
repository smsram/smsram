'use client';
import { useState, useEffect } from 'react';
import AlertModal from '@/components/AlertModal';
import Input from '@/components/Input';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalDatabases: 0,
    storageUsed: '0.00',
    storagePercent: 0,
    ramUsedDisplay: '0.0 / 16.0 GB',
    ramPercent: 0,
    totalFiles: 0,
    runningProcesses: 0,       
    backups: [],               
    latestBackupTime: '...'    
  });

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'default' });
  const [showFormInput, setShowFormInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);

  const hubRoot = process.env.NEXT_PUBLIC_BAAS_HUB_ROOT || '';

  const fetchSystemMetrics = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const sessionToken = localStorage.getItem('hub_session_token');
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${hubRoot}/stats`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats({
            totalDatabases: data.stats.totalDatabases ?? 0,
            storageUsed: data.stats.storageUsed ?? '0.00',
            storagePercent: data.stats.storagePercent ?? 0,
            ramUsedDisplay: data.stats.ramUsedDisplay ?? '0.0 / 16.0 GB',
            ramPercent: data.stats.ramPercent ?? 0,
            totalFiles: data.stats.totalFiles ?? 0,
            runningProcesses: data.stats.runningProcesses ?? 0, 
            backups: data.stats.backups ?? [],                 
            latestBackupTime: data.stats.latestBackupTime       
              ? new Date(data.stats.latestBackupTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'N/A'
          });
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchSystemMetrics();
    }
  }, [hubRoot]);

  const handleLaunchCreateProjectModal = () => {
    setInputValue('');
    setSuccessDetails(null);
    setInputLabel('Database Module Namespace');
    setShowFormInput(true);
    setAlertConfig({
      isOpen: true,
      title: 'Provision Cloud Registry Database',
      message: 'Allocate dynamic isolated SQLite storage container.',
      type: 'default'
    });
  };

  const handleConfirmProjectCreation = async () => {
    if (!inputValue.trim()) return;
    const name = inputValue.trim();
    const apiKey = `sk_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;
    const dbFilename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.db`;

    try {
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('hub_session_token') : '';
      const res = await fetch(`${hubRoot}/create-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ name, apiKey, dbFilename, visibility: 'private' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessDetails({ name, apiKey, dbFilename });
        setShowFormInput(false);
        setAlertConfig({ isOpen: true, title: 'Environment Deployed Successfully', message: 'Isolated workspace initialized.', type: 'default' });
        fetchSystemMetrics(); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeModalWorkflow = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
    setShowFormInput(false);
    setInputValue('');
    setSuccessDetails(null);
  };

  return (
    /* 🟢 FIX 1: Map variables to support light/dark context while handling overflow rules cleanly */
    <div className="w-full min-h-[calc(100vh-64px)] overflow-x-hidden overflow-y-auto bg-background text-on-background font-body-lg">
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
        
        <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onConfirm={successDetails ? closeModalWorkflow : handleConfirmProjectCreation} onCancel={closeModalWorkflow}>
          {showFormInput && (
            <div className="w-full mt-2">
              <Input label={inputLabel} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="e.g. RythuMart" autoFocus />
            </div>
          )}
          {successDetails && (
            <div className="mt-4 flex flex-col gap-3 border-t border-outline/30 pt-4 text-left">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-code tracking-widest text-on-surface-variant font-bold">PROJECT NAMESPACE</span>
                <div className="bg-surface-container border border-outline/20 px-3 py-2 rounded text-on-surface font-code text-sm">{successDetails.name}</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-code tracking-widest text-on-surface-variant font-bold">SDK PRIVATE KEY</span>
                <div className="bg-surface-container border border-accent-orange/30 px-3 py-2 rounded text-accent-orange font-code text-xs break-all">{successDetails.apiKey}</div>
              </div>
            </div>
          )}
        </AlertModal>

        {/* Overview Title Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-display text-on-background">System Overview</h2>
            <p className="text-on-surface-variant font-sans mt-1 text-sm">Real-time container infrastructure health monitoring matrix.</p>
          </div>
          <button onClick={handleLaunchCreateProjectModal} className="bg-accent-orange hover:opacity-90 text-white font-code text-xs font-bold px-4 h-10 rounded flex items-center gap-2 w-full sm:w-auto justify-center shadow transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">add</span> Create New Project
          </button>
        </div>

        {/* Primary Infrastructure Counters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Active Databases */}
          <div className="bg-surface border border-outline/20 rounded-lg flex flex-col p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-blue"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-code text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">Total Project Spaces</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">database</span>
            </div>
            <div className="font-code text-3xl font-bold text-on-surface mt-auto">{isLoading ? '...' : stats.totalDatabases}</div>
            <span className="text-[10px] font-code text-on-surface-variant mt-2 block uppercase">Active SQLite Targets</span>
          </div>

          {/* Card 2: Process Monitor Panel */}
          <div className="bg-surface border border-outline/20 rounded-lg flex flex-col p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-blue"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-code text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">Running Apps Fleet</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">terminal</span>
            </div>
            <div className="font-code text-3xl font-bold text-accent-blue mt-auto">{isLoading ? '...' : stats.runningProcesses}</div>
            <span className="text-[10px] font-code text-on-surface-variant mt-2 block uppercase">Isolated Process Threads Running</span>
          </div>

          {/* Card 3: Storage Allocation */}
          <div className="bg-surface border border-outline/20 rounded-lg flex flex-col p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-purple"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-code text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">Total Storage Used</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">inventory_2</span>
            </div>
            <div className="font-code text-3xl font-bold text-on-surface mt-auto flex items-baseline">
              {isLoading ? '...' : stats.storageUsed}<span className="text-sm font-sans text-on-surface-variant ml-1">GB</span>
            </div>
            <div className="w-full h-1 bg-surface-container-low border border-outline/10 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent-purple transition-all duration-500" style={{ width: `${stats.storagePercent}%` }}></div>
            </div>
          </div>

          {/* Card 4: RAM Monitor */}
          <div className="bg-surface border border-outline/20 rounded-lg flex flex-col p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-orange"></div>
            <div className="flex justify-between items-start mb-4">
              <span className="font-code text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">Memory Footprint</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">memory</span>
            </div>
            <div className="font-code text-3xl font-bold text-on-surface mt-auto flex items-baseline">{isLoading ? '...' : stats.ramUsedDisplay}</div>
            <div className="w-full h-1 bg-surface-container-low border border-outline/10 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent-orange transition-all duration-500" style={{ width: `${stats.ramPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Litestream Live Synchronization Info Status Banner */}
        <div className="bg-surface border border-outline/20 rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 bg-surface-container border border-outline/20 rounded flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">cloud_done</span>
            </div>
            <div>
              <h3 className="font-code text-xs font-bold text-on-surface uppercase tracking-wider">Litestream Cloud Recovery Sync Status</h3>
              <div className="font-code text-[11px] text-on-surface-variant mt-0.5">
                Latest cluster update checkpoint matched at: <span className="text-on-surface font-bold">{stats.latestBackupTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded border border-outline/20 w-full sm:w-auto justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-code text-[10px] text-on-surface tracking-widest uppercase font-bold">Active Direct replication</span>
          </div>
        </div>

        {/* Detailed Database File Backups Breakdown Table */}
        <div className="bg-surface border border-outline/20 rounded-lg overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-outline/20 bg-surface-container flex justify-between items-center">
            <h3 className="font-code text-xs font-bold uppercase tracking-wider text-on-surface">Backblaze B2 Replication Map</h3>
            <span className="font-code text-[10px] text-on-surface-variant px-2 py-0.5 bg-surface-container-low rounded border border-outline/20">1-Min Interval Active</span>
          </div>
          
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left border-collapse text-xs font-code min-w-[800px]">
              <thead>
                <tr className="border-b border-outline/20 text-on-surface-variant bg-surface-container-low">
                  <th className="p-4 uppercase tracking-wider">Database Source File</th>
                  <th className="p-4 uppercase tracking-wider">Backblaze B2 Target Map</th>
                  <th className="p-4 uppercase tracking-wider">Exact Cloud Saving Time</th>
                  <th className="p-4 uppercase tracking-wider text-right">Replication Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/10">
                {stats.backups.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-on-surface-variant italic">No storage modules monitored inside working clusters directory.</td>
                  </tr>
                ) : (
                  stats.backups.map((db, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-lowest/40 transition-colors">
                      <td className="p-4 font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-accent-blue">database</span>
                        {db.name}
                        <span className="text-[10px] font-normal text-on-surface-variant ml-2 opacity-70">({db.size})</span>
                      </td>
                      
                      <td className="p-4 text-on-surface-variant">
                        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline/10 px-2 py-1 rounded w-fit">
                          <span className="material-symbols-outlined text-[12px] text-accent-orange">cloud</span>
                          <span className="text-[11px] tracking-wide">{db.b2Target}</span>
                        </div>
                      </td>
                      
                      <td className="p-4 text-on-surface-variant font-medium">
                        {new Date(db.lastSyncTime).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      
                      <td className="p-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {db.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}