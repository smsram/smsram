'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Dropdown from '@/components/Dropdown';
import Skeleton from '@/components/Skeleton';
import AlertModal from '@/components/AlertModal';

export default function AdminConnectionsPage() {
  const [assets, setAssets] = useState([]);
  const [allConnections, setAllConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusText, setStatusText] = useState('');

  // Dropdown Filter States - Defaulted to ON
  const [hideConnected, setHideConnected] = useState(true);
  const [onlyToday, setOnlyToday] = useState(true);

  const [connectorForm, setConnectorForm] = useState({
    nodeA: '',
    nodeB: '',
    relationType: 'BOTH'
  });

  const [disconnectModal, setDisconnectModal] = useState({
    isOpen: false,
    edgeData: null
  });

  const relationOptions = [
    { value: 'BOTH', label: 'Show on BOTH pages (A displays B, and B displays A)' },
    { value: 'BONLY', label: 'Show on Asset A\'s page ONLY (If opens B, don\'t show A)' },
    { value: 'AONLY', label: 'Show on Asset B\'s page ONLY (If opens A, don\'t show B)' }
  ];

  const fetchGraphEcosystem = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    try {
      const assetsRes = await fetch(`${serverUrl}/api/assets`);
      const assetsPayload = await assetsRes.json();
      setAssets(assetsPayload?.data || []);

      const graphRes = await fetch(`${serverUrl}/api/connections/ALL_EDGES`);
      const graphPayload = await graphRes.json();
      setAllConnections(graphPayload?.data || []);
    } catch (err) {
      console.error("Failed to query central graph parameters", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphEcosystem(true);
  }, [fetchGraphEcosystem]);

  const handleEdgeCommit = async (e) => {
    e.preventDefault();
    const { nodeA, nodeB, relationType } = connectorForm;
    if (!nodeA || !nodeB || !relationType) return;
    
    if (nodeA === nodeB) {
      setStatusText('Rejected: Structural loop prevented. Cannot link item to itself.');
      return;
    }

    setStatusText('Injecting parameters into link graph...');
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    const adminToken = localStorage.getItem('admin_session_token');

    try {
      const response = await fetch(`${serverUrl}/api/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ assetA: nodeA, assetB: nodeB, relationType })
      });

      if (response.ok) {
        setStatusText('Visibility linkage registered successfully.');
        setConnectorForm({ nodeA: '', nodeB: '', relationType: 'BOTH' });
        await fetchGraphEcosystem(false);
      } else {
        setStatusText('Rejected: Structural database constraint conflict.');
      }
    } catch (e) {
      setStatusText('Network server connectivity timeout.');
    } finally {
      setTimeout(() => setStatusText(''), 3000);
    }
  };

  const confirmLinkSeverance = (edge) => {
    setDisconnectModal({ isOpen: true, edgeData: edge });
  };

  const executeLinkSeverance = async () => {
    const { edgeData } = disconnectModal;
    if (!edgeData) return;

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    const adminToken = localStorage.getItem('admin_session_token');

    setAllConnections(allConnections.filter(item => 
      !(item.asset_a === edgeData.asset_a && item.asset_b === edgeData.asset_b && item.relation_type === edgeData.relation_type)
    ));
    setDisconnectModal({ isOpen: false, edgeData: null });

    try {
      await fetch(`${serverUrl}/api/connections/${edgeData.asset_a}/${edgeData.asset_b}/${edgeData.relation_type}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    } catch (e) {
      console.error(e);
      fetchGraphEcosystem(false);
    }
  };

  // ======================================================================
  // AGGRESSIVE DATA FILTERING PIPELINE
  // ======================================================================
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const assetIdStr = String(asset.id);

      // 1. "Show Only Today" Filter
      if (onlyToday) {
        const checkDate = (dStr) => {
          if (!dStr) return false;
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return false;
          const today = new Date();
          return d.getDate() === today.getDate() &&
                 d.getMonth() === today.getMonth() &&
                 d.getFullYear() === today.getFullYear();
        };
        
        // Checks multiple possible timestamp keys to ensure compatibility
        const isCreatedToday = checkDate(asset.created_at) || checkDate(asset.createdAt);
        const isUpdatedToday = checkDate(asset.updated_at) || checkDate(asset.updatedAt);
        const isDateToday = checkDate(asset.date);

        if (!isCreatedToday && !isUpdatedToday && !isDateToday) {
          return false; // Skip if not generated today
        }
      }

      // 2. "Hide Already Linked Nodes" Filter
      if (hideConnected) {
        // Look through the ENTIRE connections ledger. If this asset is found at all, drop it.
        const isConnectedAnywhere = allConnections.some(edge => 
          String(edge.asset_a) === assetIdStr || String(edge.asset_b) === assetIdStr
        );
        if (isConnectedAnywhere) {
          return false;
        }
      }

      return true;
    });
  }, [assets, allConnections, onlyToday, hideConnected]);

  // Dropdown mapping for Node A
  const optionsNodeA = [
    { value: '', label: 'Select primary component node...' },
    ...filteredAssets.map(a => ({ value: String(a.id), label: `[${a.type || 'NODE'}] ${a.title || 'Untitled'}` }))
  ];

  // Dropdown mapping for Node B (Prevents self-linking and duplicate direct links regardless of toggles)
  const optionsNodeB = [
    { value: '', label: 'Select destination matching component...' },
    ...filteredAssets.filter(a => {
      const aId = String(a.id);
      
      // Never allow linking an item to itself
      if (aId === String(connectorForm.nodeA)) return false;

      // Even if 'Hide Connected' is off, never allow linking two items that are already paired together
      const alreadyPairedDirectly = allConnections.some(edge => 
        (String(edge.asset_a) === String(connectorForm.nodeA) && String(edge.asset_b) === aId) ||
        (String(edge.asset_b) === String(connectorForm.nodeA) && String(edge.asset_a) === aId)
      );
      
      if (alreadyPairedDirectly) return false;

      return true;
    }).map(a => ({ value: String(a.id), label: `[${a.type || 'NODE'}] ${a.title || 'Untitled'}` }))
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in duration-300 font-display" style={{ padding: '40px' }}>
      <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: '1200px' }}>
        
        <div className="text-left block">
          <h2 className="font-display text-2xl font-bold text-primary uppercase tracking-wider">Dual-Selector Node Connector</h2>
          <p className="text-on-surface-variant text-sm mt-1 opacity-80">
            Define live website visibility routing parameters by linking separate component combinations
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-xs text-left">
          {statusText && (
            <div className="w-full bg-surface-container border border-outline-variant text-accent-blue text-xs py-2.5 px-3 rounded mb-4 text-center font-bold tracking-wide uppercase">
              {statusText}
            </div>
          )}

          {/* Configuration Toggles */}
          <div className="flex flex-wrap gap-6 mb-6 pb-6 border-b border-outline-variant/40">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-on-surface-variant cursor-pointer group">
              <input 
                type="checkbox" 
                checked={hideConnected} 
                onChange={(e) => {
                  setHideConnected(e.target.checked);
                  setConnectorForm({ nodeA: '', nodeB: '', relationType: 'BOTH' }); // Instantly clear form to prevent hidden ghost selections
                }} 
                className="w-4 h-4 accent-accent-blue cursor-pointer rounded"
              />
              <span className="group-hover:text-primary transition-colors">Hide Already Linked Nodes</span>
            </label>

            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-on-surface-variant cursor-pointer group">
              <input 
                type="checkbox" 
                checked={onlyToday} 
                onChange={(e) => {
                  setOnlyToday(e.target.checked);
                  setConnectorForm({ nodeA: '', nodeB: '', relationType: 'BOTH' });
                }} 
                className="w-4 h-4 accent-accent-blue cursor-pointer rounded"
              />
              <span className="group-hover:text-primary transition-colors">Show Only Today's Assets</span>
            </label>
          </div>

          <form onSubmit={handleEdgeCommit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">
                Component Node A
                {onlyToday && optionsNodeA.length === 1 && <span className="text-red-500 ml-2">(No unlinked items today)</span>}
              </label>
              <Dropdown
                options={optionsNodeA}
                selectedValue={connectorForm.nodeA}
                onChange={(val) => setConnectorForm({ ...connectorForm, nodeA: val, nodeB: '' })} // Clears Node B automatically if A is swapped
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Live Visibility Behaviour Rule</label>
              <Dropdown
                options={relationOptions}
                selectedValue={connectorForm.relationType}
                onChange={(val) => setConnectorForm({ ...connectorForm, relationType: val })}
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">Component Node B</label>
              <Dropdown
                options={optionsNodeB}
                selectedValue={connectorForm.nodeB}
                onChange={(val) => setConnectorForm({ ...connectorForm, nodeB: val })}
              />
            </div>

            <button 
              type="submit"
              disabled={!connectorForm.nodeA || !connectorForm.nodeB}
              style={{ height: '40px', backgroundColor: (connectorForm.nodeA && connectorForm.nodeB) ? 'var(--color-accent-blue)' : 'var(--color-surface-container)' }}
              className="lg:col-span-3 w-full text-white text-xs uppercase tracking-widest font-bold rounded shadow-md hover:opacity-90 transition-all cursor-pointer border-none outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Establish Symmetrical Visibility
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-xs text-left flex flex-col">
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-4">
            Global Layout Connection Parameters
          </h3>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left table-fixed min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-outline-variant font-display text-xs text-on-surface-variant uppercase tracking-wider h-10">
                  <th className="pb-2 font-bold pl-2 w-[35%]">Component Target A</th>
                  <th className="pb-2 font-bold w-[20%] text-center">Active Display Token</th>
                  <th className="pb-2 font-bold w-[35%] pl-4">Component Target B</th>
                  <th className="pb-2 font-bold pr-2 text-right w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-sm">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, skeletonIdx) => (
                    <tr key={skeletonIdx} className="h-12 border-b border-outline-variant/20">
                      <td className="pl-2 pr-4"><Skeleton className="h-5 w-4/5" /></td>
                      <td className="px-4"><Skeleton className="h-5 w-16 mx-auto" /></td>
                      <td className="pl-4 pr-4"><Skeleton className="h-5 w-4/5" /></td>
                      <td className="text-right pr-2"><Skeleton className="h-6 w-16 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : allConnections.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-on-surface-variant italic font-display">No layout rules configured inside the database connections array ledger.</td></tr>
                ) : (
                  allConnections.map((edge, index) => (
                    <tr key={index} className="hover:bg-surface-container-low border-b border-outline-variant/30 transition-colors h-12 text-primary">
                      <td className="pl-2 font-bold truncate pr-4">{edge.asset_a_title || edge.asset_a}</td>
                      <td className="text-center truncate px-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container border border-outline-variant font-bold text-accent-blue uppercase tracking-widest">
                          {edge.relation_type}
                        </span>
                      </td>
                      <td className="font-bold truncate pr-4 pl-4">{edge.asset_b_title || edge.asset_b}</td>
                      <td className="text-right pr-2">
                        <button 
                          type="button"
                          onClick={() => confirmLinkSeverance(edge)}
                          className="text-[11px] font-bold text-red-500 bg-transparent hover:bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded transition-colors cursor-pointer outline-none uppercase tracking-wider"
                        >
                          Sever
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <AlertModal
        isOpen={disconnectModal.isOpen}
        title="Sever Symmetrical Edge Link"
        message="Are you sure you want to drop this visibility rule configuration setting? Connected recommendation entries will be detached instantly."
        type="danger"
        confirmText="Sever Connection"
        cancelText="Cancel"
        onConfirm={executeLinkSeverance}
        onCancel={() => setDisconnectModal({ isOpen: false, edgeData: null })}
      />
    </div>
  );
}