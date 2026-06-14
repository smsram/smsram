'use client';
import { useState, useEffect, useRef } from 'react';
import AlertModal from '@/components/AlertModal';
import Input from '@/components/Input';

export default function PaasApplicationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    runtime: 'nodejs',
    sourceType: 'github',
    repositoryUrl: '',
    startCommand: 'npm start',
    entryPath: '.',
    autoPull: true,
    envVars: ''
  });

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'default' });
  const [showDeploymentForm, setShowDeploymentForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeInspectedApp, setActiveInspectedApp] = useState(null);
  
  // 🟢 NEW: States to handle deletion workflows inside the native AlertModal container
  const [appPendingDelete, setAppPendingDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [logViewer, setLogViewer] = useState({ isOpen: false, appName: '', logs: '' });
  const logBottomRef = useRef(null);

  const hubRoot = process.env.NEXT_PUBLIC_BAAS_HUB_ROOT || '';
  const apiRoot = process.env.NEXT_PUBLIC_BAAS_API_ROOT || ''; 
  const projectsBaseUrl = apiRoot.replace(/\/api$/, '/projects');

  const fetchDeployedApplications = async () => {
    try {
      if (typeof window === 'undefined') return;
      const sessionToken = localStorage.getItem('hub_session_token');
      if (!sessionToken) return setIsLoading(false);

      const res = await fetch(`${hubRoot}/paas/apps`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) setApps(data.apps || []);
      }
    } catch (err) {} finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchDeployedApplications();
    const runtimeIntervalLoop = setInterval(fetchDeployedApplications, 15000);
    return () => clearInterval(runtimeIntervalLoop);
  }, [hubRoot]);

  const fetchLogs = async (appName) => {
    const sessionToken = localStorage.getItem('hub_session_token');
    try {
        const res = await fetch(`${hubRoot}/paas/logs/${appName}`, {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        const data = await res.json();
        if (data.success) {
            setLogViewer({ isOpen: true, appName, logs: data.logs });
            setTimeout(() => logBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    } catch (e) { console.error(e); }
  };

  // 🟢 NEW: Trigger native modal interceptor framework for hard deletions
  const triggerDeleteModalWorkflow = (appName) => {
    setAppPendingDelete(appName);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeletionPass = async () => {
    if (!appPendingDelete) return;
    const sessionToken = localStorage.getItem('hub_session_token');
    try {
        const res = await fetch(`${hubRoot}/paas/delete/${appPendingDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (res.ok) {
          setShowDeleteConfirm(false);
          setAppPendingDelete(null);
          fetchDeployedApplications();
        }
    } catch (e) { console.error(e); }
  };

  const handleLaunchDeployModal = () => {
    setIsEditMode(false);
    setFormData({
      name: '', runtime: 'nodejs', sourceType: 'github', repositoryUrl: '',
      startCommand: 'npm start', entryPath: '.', autoPull: true, envVars: ''
    });
    setActiveInspectedApp(null);
    setShowDeploymentForm(true);
    setAlertConfig({
      isOpen: true,
      title: 'Deploy Compute Instance',
      message: 'Provision isolated worker space nodes inside /tmp/apps. Traffic routes dynamically to /projects/:appName.',
      type: 'default'
    });
  };

  const handleLaunchEditModal = (app) => {
    setIsEditMode(true);
    setFormData({
      name: app.name,
      runtime: app.runtime,
      sourceType: app.source_type,
      repositoryUrl: app.repository_url,
      startCommand: app.start_command,
      entryPath: app.entry_path,
      autoPull: app.auto_pull === 1,
      envVars: app.env_vars || ''
    });
    setActiveInspectedApp(null);
    setShowDeploymentForm(true);
    setAlertConfig({
      isOpen: true,
      title: `Modify Application: ${app.name}`,
      message: "Update execution commands or configurations. Saving updates requires a brief sub-process container reload.",
      type: 'default'
    });
  };

  const handleConfirmDeploymentPass = async () => {
    if (!formData.name.trim() || !formData.startCommand.trim()) return;

    try {
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('hub_session_token') : '';
      const res = await fetch(`${hubRoot}/paas/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setShowDeploymentForm(false);
        setAlertConfig({
          isOpen: true,
          title: isEditMode ? 'Configurations Synchronized' : 'Orchestration Pipeline Bound',
          message: isEditMode ? `The environment variables for /projects/${formData.name} have been updated.` : `Dynamic environment configurations for /projects/${formData.name} initialized. Tracking setup logs...`,
          type: 'default'
        });
        setActiveInspectedApp({ name: formData.name, internal_port: data.internal_port, status: 'building' });
        fetchDeployedApplications();
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleApplicationProcess = async (appName, currentStatus) => {
    const actionEndpoint = currentStatus === 'running' ? '/paas/stop' : '/paas/deploy';
    const sessionToken = localStorage.getItem('hub_session_token');

    try {
      const targetApp = apps.find(a => a.name === appName);
      const payloadBody = currentStatus === 'running' 
        ? { name: appName } 
        : { 
            name: targetApp.name, runtime: targetApp.runtime, sourceType: targetApp.source_type, 
            repositoryUrl: targetApp.repository_url, startCommand: targetApp.start_command, 
            entryPath: targetApp.entry_path, autoPull: targetApp.auto_pull === 1, envVars: targetApp.env_vars
          };

      const res = await fetch(`${hubRoot}${actionEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(payloadBody)
      });

      if (res.ok) fetchDeployedApplications();
    } catch (err) { console.error(err); }
  };

  const handleToggleSleepOption = async (appName, currentSleepFlag) => {
    const sessionToken = localStorage.getItem('hub_session_token');
    await fetch(`${hubRoot}/paas/sleep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ name: appName, auto_sleep: currentSleepFlag === 1 ? 0 : 1 })
    });
    fetchDeployedApplications();
  };

  const closeModalWorkflow = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
    setShowDeploymentForm(false);
    setActiveInspectedApp(null);
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.runtime.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-md sm:p-lg lg:p-gutter w-full max-w-[1400px] mx-auto flex flex-col gap-md text-on-surface bg-background min-h-[calc(100vh-64px)] overflow-y-auto relative no-scrollbar">
      
      {/* TERMINAL LOG VIEWER PORTAL BOX */}
      {logViewer.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0d0d0d] border border-outline-variant rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-black">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-accent-blue">terminal</span>
                        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Terminal Logs: {logViewer.appName}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => fetchLogs(logViewer.appName)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[20px]">refresh</span>
                        </button>
                        <button onClick={() => setLogViewer({ isOpen: false, appName: '', logs: '' })} className="text-neutral-400 hover:text-red-400 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 font-mono text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap select-all vertical-scrollbar">
                    {logViewer.logs}
                    <div ref={logBottomRef} />
                </div>
            </div>
        </div>
      )}

      {/* 🟢 NEW: NATIVE CONTAINER FOR DELETIONS CONFIRMATION */}
      <AlertModal 
        isOpen={showDeleteConfirm} 
        title="Erase Application Environment" 
        message={`WARNING: This action is irreversible. Proceeding will completely kill the sub-process for '/projects/${appPendingDelete}', wipe its configuration keys, and delete the entire repository path inside /tmp/apps.`} 
        type="danger" 
        confirmText="Erase App" 
        cancelText="Cancel"
        onConfirm={handleConfirmDeletionPass} 
        onCancel={() => { setShowDeleteConfirm(false); setAppPendingDelete(null); }} 
      />

      {/* GLOBAL MANAGEMENT MODAL PORTAL (CREATE & EDIT MIX) */}
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onConfirm={activeInspectedApp ? closeModalWorkflow : handleConfirmDeploymentPass} onCancel={closeModalWorkflow}>
        {showDeploymentForm && (
          <div className="w-full mt-sm flex flex-col gap-sm text-left max-h-[50vh] overflow-y-auto pr-1 font-body-sm no-scrollbar relative">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Application Alias (Route Path)</label>
              <input type="text" placeholder="e.g. some-service" value={formData.name} disabled={isEditMode} onChange={e => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() })} className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-sans disabled:opacity-40 disabled:cursor-not-allowed text-on-surface" />
              <span className="text-[9px] text-neutral-500 font-mono block mt-0.5">Accessible gateway link path: /projects/{formData.name || ':name'}</span>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Target Engine Runtime</label>
                <select value={formData.runtime} onChange={e => setFormData({ ...formData, runtime: e.target.value })} className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-mono text-on-surface">
                  <option value="nodejs" className="bg-surface text-on-surface">Node.js Environment</option>
                  <option value="python" className="bg-surface text-on-surface">Python 3 Execution</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Distribution Source</label>
                <select value={formData.sourceType} onChange={e => setFormData({ ...formData, sourceType: e.target.value })} className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-mono text-on-surface">
                  <option value="github" className="bg-surface text-on-surface">GitHub Clone</option>
                  <option value="zip_upload" disabled className="bg-surface text-on-surface">Manual Zip Upload</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Repository HTTPS URL</label>
              <input type="text" placeholder="https://github.com/user/repo.git" value={formData.repositoryUrl} onChange={e => setFormData({ ...formData, repositoryUrl: e.target.value.trim() })} className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-mono text-xs text-on-surface" />
            </div>

            <div className="grid grid-cols-3 gap-sm">
              <div className="col-span-2">
                <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Boot Execution Command</label>
                <input type="text" placeholder="e.g. npm start" value={formData.startCommand} onChange={e => setFormData({ ...formData, startCommand: e.target.value })} className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-code text-xs text-accent-orange font-bold" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Sub-Root Path</label>
                <input type="text" placeholder="." value={formData.entryPath} onChange={e => setFormData({ ...formData, entryPath: e.target.value.trim() })} className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-mono text-xs text-on-surface" />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold block mb-1">Environment Variables (API Keys)</label>
              <textarea 
                placeholder="TOKEN_KEY=sk_...&#10;PROVIDER_SECRET=example..." 
                value={formData.envVars}
                onChange={e => setFormData({ ...formData, envVars: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant rounded p-2 text-sm focus:border-accent-blue outline-none font-mono text-[11px] h-24 resize-none text-on-surface"
              />
              <span className="text-[9px] text-neutral-500 font-mono block mt-0.5">Define key-value profiles securely (One assignment parameter statement per line: KEY=VALUE).</span>
            </div>

            {formData.sourceType === 'github' && (
              <div className="flex items-center gap-sm mt-xs p-2 border border-outline-variant rounded bg-surface-container-low">
                <input type="checkbox" id="modalAutoPull" checked={formData.autoPull} onChange={e => setFormData({ ...formData, autoPull: e.target.checked })} className="w-4 h-4 accent-accent-blue cursor-pointer" />
                <label htmlFor="modalAutoPull" className="text-xs font-sans text-on-surface cursor-pointer select-none">
                  Enable **GitHub Auto-Pull & Continuous Hot Reload**
                </label>
              </div>
            )}
          </div>
        )}

        {activeInspectedApp && (
          <div className="mt-md flex flex-col gap-sm text-left border-t border-outline-variant pt-md anonymity-layer">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-500 font-bold">REVERSE PROXY EDGE ENDPOINT GATEWAY</span>
              <div className="bg-surface border border-outline-variant px-sm py-2 rounded text-accent-blue font-mono text-xs font-bold select-all">
                {`${projectsBaseUrl}/${activeInspectedApp.name}`}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-sm text-[10px] font-mono mt-xs">
              <div className="bg-surface border border-outline-variant p-2 rounded text-neutral-400">CONTAINER PORT: <strong className="text-white font-bold">{activeInspectedApp.internal_port}</strong></div>
              <div className="bg-surface border border-outline-variant p-2 rounded text-neutral-400">PIPELINE STATUS: <strong className="text-accent-orange font-bold uppercase animate-pulse">{activeInspectedApp.status}</strong></div>
            </div>
          </div>
        )}
      </AlertModal>

      {/* Main Page Content Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant pb-md gap-md">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary font-display">Compute Apps Console</h2>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">Isolate and scale custom runtimes securely within sub-process clusters.</p>
        </div>
        <div className="flex items-center gap-sm w-full sm:w-auto shrink-0">
          <input type="text" placeholder="Search clusters..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-surface border border-outline-variant text-xs font-mono rounded h-9 px-sm text-white focus:border-accent-blue outline-none placeholder:text-neutral-600 w-full sm:w-[200px]" />
          <button onClick={handleLaunchDeployModal} className="bg-accent-purple hover:opacity-90 text-white font-mono text-xs font-bold px-md h-9 rounded transition-all flex items-center gap-xs shadow shrink-0 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
            Deploy App
          </button>
        </div>
      </div>

      {/* Core Node Grid Visualizer Matrix */}
      {isLoading ? (
        <div className="text-center py-xl border border-dashed border-outline-variant rounded-lg bg-surface-container-low/20">
          <span className="material-symbols-outlined text-on-surface-variant text-[44px] animate-spin">cyclone</span>
          <p className="font-mono text-xs text-on-surface-variant mt-sm">Tracing dynamic sub-process threads...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-xl border border-dashed border-outline-variant rounded-lg bg-surface-container-low/10">
          <span className="material-symbols-outlined text-neutral-500 text-[48px]">layers_clear</span>
          <p className="font-mono text-xs text-on-surface-variant mt-sm">No active isolated microservices found matching current search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {filteredApps.map((app, idx) => {
            const isOnline = app.status === 'running';
            const isBuilding = app.status === 'building';
            const hasSlept = app.status === 'sleeping';

            return (
              <div key={idx} className="bg-surface border border-outline-variant rounded-lg p-md flex flex-col justify-between gap-md relative shadow-sm hover:border-neutral-700 transition-colors">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-outline-variant overflow-hidden">
                  <div className={`h-full w-full transition-colors duration-500 ${isOnline ? 'bg-accent-blue' : ''} ${isBuilding ? 'bg-accent-orange animate-pulse' : ''} ${app.status === 'error' ? 'bg-red-500' : ''} ${hasSlept ? 'bg-neutral-600' : ''}`} />
                </div>

                <div className="flex flex-col gap-1.5 mt-xs">
                  <div className="flex items-start justify-between gap-md">
                    <div className="flex flex-col">
                      <span className="font-code text-sm font-bold text-primary break-all">/projects/{app.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500 mt-0.5">Port Assignment: {app.internal_port}</span>
                    </div>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 tracking-wider ${isOnline ? 'bg-green-500/10 border-green-500/20 text-green-400' : ''} ${isBuilding ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse' : ''} ${app.status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : ''} ${app.status === 'stopped' ? 'bg-neutral-950 border-outline-variant text-neutral-500' : ''} ${hasSlept ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : ''}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="bg-editor-bg border border-outline-variant/80 rounded p-sm flex flex-col gap-sm font-mono text-[10px] mt-xs select-all text-neutral-400">
                    <div className="flex justify-between items-center gap-md border-b border-neutral-800 pb-xs">
                      <span>Runtime: <strong className="text-white uppercase font-normal">{app.runtime}</strong></span>
                      <span>Source: <strong className="text-white uppercase font-normal">{app.source_type}</strong></span>
                    </div>
                    <div className="flex justify-between items-center gap-sm">
                      <div className="truncate">Cmd: <strong className="text-accent-orange font-normal">{app.start_command}</strong></div>
                      {app.source_type === 'github' && (
                        <span className={`text-[9px] px-1 rounded font-sans shrink-0 font-bold ${app.auto_pull === 1 ? 'text-accent-blue bg-accent-blue/10' : 'text-neutral-600 bg-neutral-900'}`}>
                          {app.auto_pull === 1 ? 'CI ACTIVE' : 'CI OFF'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-sm border-t border-neutral-800 pt-sm mt-xs">
                  <div className="flex items-center gap-1">
                      <button onClick={() => fetchLogs(app.name)} className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-1.5 rounded flex items-center justify-center text-neutral-400 transition-colors cursor-pointer" title="View Terminal Logs">
                        <span className="material-symbols-outlined text-[15px]">terminal</span>
                      </button>
                      <button onClick={() => handleLaunchEditModal(app)} className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-1.5 rounded flex items-center justify-center text-neutral-400 transition-colors cursor-pointer" title="Edit App Settings & Config Keys">
                        <span className="material-symbols-outlined text-[15px]">edit_note</span>
                      </button>
                      {/* 🟢 MODIFIED: Routes deletion target to the new portal confirm alert window */}
                      <button onClick={() => triggerDeleteModalWorkflow(app.name)} className="bg-neutral-900 hover:bg-red-500/10 hover:border-red-500/30 border border-neutral-800 p-1.5 rounded flex items-center justify-center text-neutral-500 hover:text-red-400 transition-colors cursor-pointer" title="Erase Application Permanently">
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                  </div>

                  <div className="flex items-center gap-xs">
                    <button onClick={() => { setActiveInspectedApp({ name: app.name, internal_port: app.internal_port, status: app.status }); setAlertConfig({ isOpen: true, title: `Application Registry Settings`, message: `Deployment configuration overview for /projects/${app.name}`, type: 'default' }); }} className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-1.5 rounded flex items-center justify-center text-neutral-400 transition-colors cursor-pointer" title="Inspect Endpoint URL Spec">
                      <span className="material-symbols-outlined text-[15px]">link</span>
                    </button>

                    <button onClick={() => handleToggleApplicationProcess(app.name, app.status)} disabled={isBuilding} className={`h-7 px-sm rounded font-mono text-[10px] uppercase font-bold transition-all flex items-center gap-1 shadow-sm disabled:opacity-40 cursor-pointer ${isOnline ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-accent-blue text-black hover:opacity-90'}`}>
                      <span className="material-symbols-outlined text-[14px]">{isOnline ? 'stop' : 'play_arrow'}</span>
                      {isOnline ? 'Stop' : 'Start'}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}