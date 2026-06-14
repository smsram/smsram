'use client';
import { useState, useEffect, useCallback } from 'react';
import FloatingMenu from '@/components/FloatingMenu';
import AssetFormDrawer from '@/components/AssetFormDrawer';
import Skeleton from '@/components/Skeleton';
import AlertModal from '@/components/AlertModal';

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('PROJECT');
  const [isLoading, setIsLoading] = useState(true);
  const [statusText, setStatusText] = useState('');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, assetId: null });

  const [formData, setFormData] = useState({
    slug: '',
    type: 'PROJECT',
    title: '',
    tagsRaw: '',
    summary: '',
    content: '', // Added content field to state
    metaDynamic: {}, 
    isHidden: false
  });

  const contentTabs = [
    { value: 'PROJECT', label: 'Projects', icon: 'layers' },
    { value: 'VIDEO', label: 'Videos', icon: 'subscriptions' },
    { value: 'SOURCE', label: 'Repositories', icon: 'code_blocks' },
    { value: 'BLOG', label: 'Transmissions', icon: 'article' },
    { value: 'SERVICE', label: 'Utilities', icon: 'terminal' }
  ];

  const assetTypeOptions = [
    { value: 'PROJECT', label: 'Project Showcase' },
    { value: 'VIDEO', label: 'Video Transmission' },
    { value: 'SOURCE', label: 'Source Repository' },
    { value: 'BLOG', label: 'Blog Publication' },
    { value: 'SERVICE', label: 'Live Utility Service' }
  ];

  const fetchInventory = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${serverUrl}/api/assets`);
      const payload = await res.json();
      const records = payload?.data || payload?.results || (Array.isArray(payload) ? payload : []);
      
      const normalRecords = records.map(item => {
        let parsedMeta = {};
        try { parsedMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; } catch(e){}
        return {
          ...item,
          isHidden: parsedMeta?.hidden || false
        };
      });
      setAssets(normalRecords);
    } catch (err) {
      console.error("Failed to query central asset ledger boundaries", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory(true);
  }, [fetchInventory]);

  const openCreationDrawer = () => {
    setEditingAssetId(null);
    setStatusText('');
    setFormData({ slug: '', type: activeTab, title: '', tagsRaw: '', summary: '', content: '', metaDynamic: {}, isHidden: false });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (asset) => {
    setEditingAssetId(asset.id);
    setStatusText('');
    let parsedMeta = {};
    try { parsedMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}
    
    // Extract both summary and content safely to feed into the drawer mapping
    const { summary, content, hidden, ...remainingDynamicMeta } = parsedMeta;
    
    let parsedTags = [];
    try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}

    setFormData({
      slug: asset.slug,
      type: asset.type,
      title: asset.title,
      tagsRaw: Array.isArray(parsedTags) ? parsedTags.join(', ') : '',
      summary: summary || '',
      content: content || '', // Populate content specifically
      metaDynamic: remainingDynamicMeta, 
      isHidden: asset.isHidden
    });
    setIsDrawerOpen(true);
  };

  const handlePersistenceSubmit = async (e) => {
    e.preventDefault();
    setStatusText('Processing core ledger write transaction...');
    
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    const adminToken = localStorage.getItem('admin_session_token');
    
    const tagsString = formData.tagsRaw ? formData.tagsRaw.trim() : '';
    const parsedTags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

    const mergedMetadata = {
        summary: formData.summary || 'No summary text provided.',
        content: formData.content || '', // Append content field alongside dynamic config
        hidden: formData.isHidden || false,
        ...(formData.metaDynamic || {})
    };

    const targetPayload = {
        id: editingAssetId || `asset_${Date.now()}`,
        slug: formData.slug ? formData.slug.toLowerCase().trim() : `asset-${Date.now()}`,
        type: formData.type || 'PROJECT',
        title: formData.title || 'Untitled Asset Node',
        tags: JSON.stringify(parsedTags),
        metadata: JSON.stringify(mergedMetadata)
    };

    try {
        const endpointPath = editingAssetId ? `${serverUrl}/api/assets/${editingAssetId}` : `${serverUrl}/api/assets`;
        const response = await fetch(endpointPath, {
          method: editingAssetId ? 'PUT' : 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(targetPayload)
        });

        if (response.ok) {
          setStatusText('Data committed successfully.');
          setTimeout(async () => {
              setIsDrawerOpen(false);
              await fetchInventory(false); 
          }, 600);
        } else {
          setStatusText('Execution rejected: Check structural fields.');
        }
    } catch (err) {
        setStatusText('Network server pipeline error.');
    }
  };

  const executeVisibilityToggle = async (asset) => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    const adminToken = localStorage.getItem('admin_session_token');
    
    let currentMeta = {};
    try { currentMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}
    
    const updatedMeta = { ...currentMeta, hidden: !asset.isHidden };
    const nextVisibilityState = !asset.isHidden;

    try {
      setAssets(assets.map(item => item.id === asset.id ? { ...item, isHidden: nextVisibilityState } : item));
      
      await fetch(`${serverUrl}/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ ...asset, metadata: JSON.stringify(updatedMeta) })
      });
    } catch (e) {
      console.error(e);
      fetchInventory(false);
    }
  };

  const confirmAssetRemoval = (assetId) => {
    setDeleteModal({ isOpen: true, assetId });
  };

  const executeAssetRemoval = async () => {
    const { assetId } = deleteModal;
    if (!assetId) return;

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    const adminToken = localStorage.getItem('admin_session_token');

    try {
      setAssets(assets.filter(item => item.id !== assetId));
      setDeleteModal({ isOpen: false, assetId: null });

      await fetch(`${serverUrl}/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    } catch (e) {
      console.error(e);
      fetchInventory(false);
    }
  };

  const filteredVisibleAssets = assets.filter(item => item.type === activeTab);

  return (
    <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in duration-300 font-display" style={{ padding: '40px' }}>
      <div className="mx-auto flex flex-col" style={{ maxWidth: '1200px', gap: '24px' }}>
        
        <div className="flex justify-between items-center w-full flex-col sm:flex-row gap-4 text-left">
          <div style={{ display: 'block' }}>
            <h2 className="font-display text-2xl font-bold text-primary uppercase tracking-wider">Content Matrix Registry</h2>
            <p className="text-on-surface-variant text-sm mt-1 opacity-80">
              Review and modify indexed components within the central database limits
            </p>
          </div>
          <button 
            onClick={openCreationDrawer}
            style={{ height: '40px', backgroundColor: 'var(--color-accent-orange)' }}
            className="w-full sm:w-auto px-5 text-white font-display text-xs uppercase tracking-widest font-bold rounded shadow-md hover:opacity-90 transition-opacity cursor-pointer border-none outline-none flex items-center justify-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>Register Content Node</span>
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-outline-variant)' }} className="w-full overflow-x-auto gap-2 [&::-webkit-scrollbar]:hidden">
          {contentTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{ height: '44px', borderBottomWidth: '2px', transition: 'all 0.2s' }}
              className={`px-4 flex items-center gap-2 font-display text-xs uppercase tracking-wider font-bold whitespace-nowrap bg-transparent border-none cursor-pointer outline-none
                ${activeTab === tab.value 
                  ? 'text-accent-orange border-accent-orange' 
                  : 'text-on-surface-variant border-transparent hover:text-primary'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'block' }} className="w-full bg-surface-container-lowest border border-outline-variant rounded-md p-6 shadow-xs text-left">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left table-fixed min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-outline-variant font-display text-xs text-on-surface-variant uppercase tracking-wider h-10">
                  <th className="pb-2 font-bold pl-2 w-[12%]">Status</th>
                  <th className="pb-2 font-bold w-[25%]">Asset Title</th>
                  <th className="pb-2 font-bold w-[20%]">Route Slug</th>
                  <th className="pb-2 font-bold w-[35%]">Summary Abstract</th>
                  <th className="pb-2 font-bold pr-2 text-right w-[8%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-sm">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, skeletonIdx) => (
                    <tr key={skeletonIdx} className="h-12 border-b border-outline-variant/20">
                      <td className="pl-2 pr-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="pr-4"><Skeleton className="h-5 w-4/5" /></td>
                      <td className="pr-4"><Skeleton className="h-5 w-2/3" /></td>
                      <td className="pr-4"><Skeleton className="h-5 w-11/12" /></td>
                      <td className="text-right pr-2"><Skeleton className="h-7 w-7 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredVisibleAssets.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-on-surface-variant italic font-display">No component elements verified under this active filter mapping.</td></tr>
                ) : (
                  filteredVisibleAssets.map((asset) => {
                    let parsedMeta = {};
                    try { parsedMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}

                    return (
                      <tr key={asset.id} className={`hover:bg-surface-container-low border-b border-outline-variant/30 transition-colors h-12 text-primary ${asset.isHidden ? 'opacity-40' : ''}`}>
                        <td className="pl-2 truncate pr-2">
                          {asset.isHidden ? (
                            <span className="inline-block px-2 py-0.5 rounded w-max text-[10px] font-bold bg-surface-container border border-outline-variant text-on-surface-variant uppercase">Hidden</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded w-max text-[10px] font-bold bg-green-500/10 border border-green-500/20 text-green-600 uppercase">Live public</span>
                          )}
                        </td>
                        
                        <td className="font-bold truncate pr-4">{asset.title}</td>
                        <td className="text-on-surface-variant font-medium truncate pr-4">/{asset.slug}</td>
                        <td className="text-on-surface-variant opacity-80 font-normal truncate pr-4">{parsedMeta?.summary || '---'}</td>
                        
                        <td className="text-right pr-2 relative">
                          <FloatingMenu 
                            renderTrigger={(isOpen) => (
                              <button type="button" style={{ width: '28px', height: '28px' }} className={`rounded flex items-center justify-center border-none bg-transparent hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer outline-none ${isOpen ? 'bg-surface-container text-primary' : ''} ml-auto`}>
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>
                            )}
                          >
                            <div className="flex flex-col text-xs uppercase tracking-wider py-1 bg-surface text-on-surface min-w-[140px] text-left">
                              <button onClick={() => openEditDrawer(asset)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-container transition-colors text-primary border-none bg-transparent w-full text-left font-medium cursor-pointer">
                                <span className="material-symbols-outlined text-[16px] text-accent-blue">edit</span> Edit Values
                              </button>
                              <button onClick={() => executeVisibilityToggle(asset)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface-container transition-colors text-primary border-none bg-transparent w-full text-left font-medium cursor-pointer">
                                <span className="material-symbols-outlined text-[16px]">{asset.isHidden ? 'visibility' : 'visibility_off'}</span> 
                                {asset.isHidden ? 'Unhide Card' : 'Hide Card'}
                              </button>
                              <div className="border-t border-outline-variant/60 my-1 w-full" />
                              <button onClick={() => confirmAssetRemoval(asset.id)} className="flex items-center gap-2.5 px-4 py-2 hover:bg-red-500/10 transition-colors text-red-500 border-none bg-transparent w-full text-left font-bold cursor-pointer">
                                <span className="material-symbols-outlined text-[16px]">delete_forever</span> Delete Node
                              </button>
                            </div>
                          </FloatingMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <AssetFormDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handlePersistenceSubmit}
        formData={formData}
        setFormData={setFormData}
        editingAssetId={editingAssetId}
        statusText={statusText}
        assetTypeOptions={assetTypeOptions}
      />

      <AlertModal
        isOpen={deleteModal.isOpen}
        title="Purge Component Node"
        message="Are you sure you want to permanently erase this component from your database single-table storage instance? This operation cannot be undone."
        type="danger"
        confirmText="Erase Permanently"
        cancelText="Cancel"
        onConfirm={executeAssetRemoval}
        onCancel={() => setDeleteModal({ isOpen: false, assetId: null })}
      />

    </div>
  );
}