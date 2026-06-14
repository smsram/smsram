"use client";

import { useState, useEffect, useRef } from 'react';

export default function StoragePage() {
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Preview System Modal States
  const [previewFile, setPreviewFile] = useState(null); 
  const fileInputRef = useRef(null);

  const hubRoot = process.env.NEXT_PUBLIC_BAAS_HUB_ROOT;
  const apiRoot = process.env.NEXT_PUBLIC_BAAS_API_ROOT;

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('hub_session_token')}`
  });

  useEffect(() => {
    fetchFiles();
    fetchProjects();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${hubRoot}/files`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setFiles(data.files);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${hubRoot}/projects`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        if (data.projects.length > 0) setSelectedProjectId(data.projects[0].id);
      }
    } catch (err) {}
  };

  // --- UPLOAD LOGIC ---
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const uploadFile = async (file) => {
    if (!selectedProjectId) {
      setError("Please select a project first.");
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', selectedProjectId);
    formData.append('bucket', 'default'); 
    formData.append('visibility', 'public');

    try {
      const res = await fetch(`${hubRoot}/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hub_session_token')}` },
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        fetchFiles();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this file from the registry?")) return;
    
    try {
      await fetch(`${hubRoot}/files/delete/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (previewFile?.id === id) setPreviewFile(null); // Close if open
      fetchFiles();
    } catch (err) {
      alert("Failed to delete file.");
    }
  };

  const copyLink = (id) => {
    const url = `${apiRoot}/fs/view/${id}`;
    navigator.clipboard.writeText(url);
    alert("Public link copied to clipboard!");
  };

  const getIcon = (mimeType) => {
    if (mimeType?.includes('image')) return 'image';
    if (mimeType?.includes('pdf')) return 'picture_as_pdf';
    if (mimeType?.includes('zip') || mimeType?.includes('tar')) return 'folder_zip';
    return 'description';
  };

  const formatSize = (bytes) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-margin-desktop pb-margin-desktop animate-in fade-in duration-300 relative">
      <div className="max-w-[1200px] mx-auto mt-lg">
        
        {/* Header */}
        <div className="mb-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-sm">
            <div>
              <h2 className="font-display text-headline-lg font-bold text-primary">Storage Vault</h2>
              <p className="text-on-surface-variant font-code text-xs mt-1 uppercase tracking-widest">Global Asset Manager</p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-code text-on-surface-variant">Upload to:</span>
              <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-surface-container-low text-primary border border-outline-variant rounded px-2 py-1.5 font-code text-sm outline-none"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-32 bg-surface-container-lowest rounded border border-dashed transition-colors duration-200 flex flex-col items-center justify-center mb-md cursor-pointer group ${isUploading ? 'opacity-50 pointer-events-none border-outline-variant' : 'border-outline-variant hover:border-accent-orange'}`}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          
          {isUploading ? (
            <div className="w-8 h-8 border-2 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin mb-2" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mb-sm group-hover:bg-accent-orange/10 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-accent-orange transition-colors">cloud_upload</span>
            </div>
          )}
          <p className="font-body-sm text-primary font-medium">{isUploading ? 'Uploading to Hugging Face...' : 'Drag and drop files here'}</p>
          {!isUploading && <p className="font-body-sm text-on-surface-variant text-sm mt-1">or click to browse from your computer</p>}
        </div>

        {error && (
          <div className="mb-md p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm font-code">
            {error}
          </div>
        )}

        {/* File Table Grid */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="font-code text-label-caps text-on-surface-variant py-sm px-md">File Details</th>
                <th className="font-code text-label-caps text-on-surface-variant py-sm px-md w-1/6">Project</th>
                <th className="font-code text-label-caps text-on-surface-variant py-sm px-md w-1/6">Visibility</th>
                <th className="font-code text-label-caps text-on-surface-variant py-sm px-md w-1/6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-sm">
              {files.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-on-surface-variant font-code text-sm italic">
                    No files found in the master registry.
                  </td>
                </tr>
              )}
              
              {files.map(file => (
                <tr key={file.id} className="border-b border-outline-variant hover:bg-surface transition-colors group">
                  <td className="py-3 px-md">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{getIcon(file.mime_type)}</span>
                      <div className="flex flex-col">
                        <span className="text-primary font-medium">{file.original_name}</span>
                        <span className="text-on-surface-variant font-code text-[10px] uppercase tracking-wider">{file.id.split('-')[0]} • {file.mime_type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-md">
                    <span className="bg-surface-container px-2 py-1 rounded font-code text-[11px] text-primary">{file.project_name}</span>
                  </td>
                  <td className="py-3 px-md">
                    <div className={`flex items-center gap-1 ${file.visibility === 'public' ? 'text-accent-blue' : 'text-outline'}`}>
                      <span className="material-symbols-outlined text-[16px]">{file.visibility === 'public' ? 'public' : 'lock'}</span>
                      <span className="font-code text-[11px] uppercase tracking-wider font-medium">{file.visibility}</span>
                    </div>
                  </td>
                  <td className="py-3 px-md text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* NEW: Inline Interactive Preview Action Button */}
                      <button 
                        onClick={() => setPreviewFile(file)} 
                        className="p-1 text-[#f57f15] hover:bg-orange-500/10 transition-colors rounded" 
                        title="Open Document Preview"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button onClick={() => copyLink(file.id)} className="p-1 text-on-surface-variant hover:text-accent-blue transition-colors rounded hover:bg-surface-container" title="Copy Public Link">
                        <span className="material-symbols-outlined text-[18px]">link</span>
                      </button>
                      <button onClick={() => window.open(`${apiRoot}/fs/view/${file.id}`, '_blank')} className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-container" title="Download Document">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                      <button onClick={() => handleDelete(file.id)} className="p-1 text-on-surface-variant hover:text-red-500 transition-colors rounded hover:bg-red-500/10" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- NATIVE DOCUMENT PREVIEW MODAL FRAME LAYER --- */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-neutral-800 rounded-lg w-full max-w-[1000px] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            
            {/* Modal Navigation Control Header bar */}
            <div className="flex items-center justify-between px-md py-sm bg-[#1e1e1e] border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-sm overflow-hidden mr-4">
                <span className="material-symbols-outlined text-orange-500">{getIcon(previewFile.mime_type)}</span>
                <span className="text-white font-medium truncate text-sm font-code">{previewFile.original_name}</span>
                <span className="hidden sm:inline text-xs font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{previewFile.project_name}</span>
              </div>
              
              <div className="flex items-center gap-sm shrink-0">
                <button 
                  onClick={() => window.open(`${apiRoot}/fs/view/${previewFile.id}`, '_blank')} 
                  className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                  title="Download File"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
                <button 
                  onClick={() => setPreviewFile(null)} 
                  className="p-1.5 text-neutral-400 hover:text-red-500 rounded hover:bg-neutral-800 transition-colors"
                  title="Close Preview"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Render Output Workspace Container */}
            <div className="flex-1 w-full bg-[#000000] relative">
              <iframe 
                src={`${apiRoot}/fs/preview/${previewFile.id}`}
                className="w-full h-full border-none bg-[#000000]"
                title="SMSRam Core Document Rendering Subsystem"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}