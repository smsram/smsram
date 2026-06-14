"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FloatingMenu from '@/components/FloatingMenu';
import AlertModal from '@/components/AlertModal';
import Skeleton from '@/components/Skeleton';
import Input from '@/components/Input';

// CodeMirror packages for Syntax Highlighting and Autocomplete
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';

export default function DatabasePage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); 
  const [projectTables, setProjectTables] = useState({});
  const [savedQueries, setSavedQueries] = useState([]);
  
  // 🟢 NEW: Detect System Dark Mode theme to adjust CodeMirror environment canvas dynamically
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Editor Tabs Systems State
  const [tabs, setTabs] = useState([{ id: 'tab_1', name: 'Query 1', sql: 'SELECT * FROM sqlite_master;', originalName: null }]);
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const editorRef = useRef(null);

  // Cluster Analytics States
  const [results, setResults] = useState(null);
  const [columns, setColumns] = useState([]);
  const [execTime, setExecTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // UI Panel Split Scaling State
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const splitPaneRef = useRef(null);

  // Workflow Context States
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'default', onConfirm: null });
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [showFormInput, setShowFormInput] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  const hubRoot = process.env.NEXT_PUBLIC_BAAS_HUB_ROOT;

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('hub_session_token')}`,
    'Content-Type': 'application/json'
  });

  // Track global tailwind/document layer dark mode status flags
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkDark = () => {
        const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
        setIsDarkMode(isDarkClass);
      };
      checkDark();
      
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const stored = localStorage.getItem(`saved_queries_${selectedProject.name}`);
      setSavedQueries(stored ? JSON.parse(stored) : []);
      setResults(null); 
      setError('');
      fetchTablesForProject(selectedProject.name);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${hubRoot}/projects`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        const masterProject = { id: 'master', name: 'Master Registry', db_filename: 'master_registry.db', isMaster: true };
        const allProjects = [masterProject, ...data.projects];
        setProjects(allProjects);
      }
    } catch (err) {
      console.error("Failed to map target server data projects");
    }
  };

  const fetchTablesForProject = async (projectName) => {
    if (projectTables[projectName]) return;
    try {
      const res = await fetch(`${hubRoot}/admin-query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectName, sql: "SELECT name FROM sqlite_master WHERE type='table';" })
      });
      const data = await res.json();
      if (data.success) {
        setProjectTables(prev => ({ ...prev, [projectName]: data.data.map(t => t.name) }));
      }
    } catch (err) {}
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  const updateActiveSql = (newSql) => {
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, sql: newSql } : t));
  };

  const handleAddTab = (name = 'New Query', sql = '', originalName = null) => {
    const newId = `tab_${Math.random().toString(36).substr(2, 9)}`;
    setTabs([...tabs, { id: newId, name, sql, originalName }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (e, id) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
      setTabs([{ id: 'tab_1', name: 'Query 1', sql: '', originalName: null }]);
      setActiveTabId('tab_1');
    } else {
      setTabs(newTabs);
      if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleRunQuery = async () => {
    if (!selectedProject || !activeTab) return;
    setIsLoading(true);
    setError('');
    setIsResultsCollapsed(false);
    const startTime = performance.now();
    let sqlToRun = activeTab.sql;

    if (editorRef.current && editorRef.current.view) {
        const view = editorRef.current.view;
        const selection = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
        if (selection && selection.trim().length > 0) {
            sqlToRun = selection;
        }
    }

    if (!sqlToRun.trim()) {
      setError("Empty query target block.");
      setIsLoading(false);
      return;
    }

    const queries = sqlToRun.split(';').map(q => q.trim()).filter(Boolean);
    let finalData = null;
    let finalCols = [];

    try {
      for (let i = 0; i < queries.length; i++) {
        const res = await fetch(`${hubRoot}/admin-query`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ projectName: selectedProject.name, sql: queries[i] })
        });
        
        const data = await res.json();
        
        if (!data.success) {
          setError(`Query Error [Statement ${i + 1}]: ${data.error}`);
          setResults(null);
          setIsLoading(false);
          return;
        }
        
        if (Array.isArray(data.data)) {
          finalData = data.data;
          finalCols = data.data.length > 0 ? Object.keys(data.data[0]) : [];
        } else {
          finalData = [{ Status: "Success", Changes: data.data.changes, LastInsertID: data.data.lastInsertRowid }];
          finalCols = ["Status", "Changes", "LastInsertID"];
        }
      }

      setExecTime(Math.round(performance.now() - startTime));
      setResults(finalData);
      setColumns(finalCols);
      fetchTablesForProject(selectedProject.name);

    } catch (err) {
      setError("API Gateway runtime compilation execution tracking error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleCellDoubleClick = (text) => {
      if (!text || !activeTab) return;
      const spacing = activeTab.sql.endsWith(' ') || activeTab.sql === '' ? '' : ' ';
      updateActiveSql(activeTab.sql + spacing + text);
  };

  // 🟢 FIXED: Loads connection metadata query context string snippets on-demand securely
  const handleShowApiInfo = async () => {
    if (!selectedProject) return;
    try {
      if (selectedProject.isMaster) {
         setAlertConfig({
            isOpen: true,
            title: 'Master Registry Protected',
            message: 'The Master Database Registry cannot be hooked directly to external apps via SDK routing.',
            type: 'default'
         });
         return;
      }

      const res = await fetch(`${hubRoot}/paas/project-connection/${selectedProject.name}`, { headers: getHeaders() });
      const data = await res.json();
      
      if (data.success) {
         setAlertConfig({
           isOpen: true,
           title: `Connect to ${selectedProject.name}`,
           message: 'Integrate this database space into external software applications using these structural configurations.',
           type: 'default'
         });
         setSuccessDetails(data.details);
      }
    } catch (e) {
       console.error("Failed to read remote connection blueprints.");
    }
  };

  const handleShowSchema = (proj) => {
      setSelectedProject(proj);
      const schemaQuery = `SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL;`;
      if (activeTab.sql.trim() === '') {
          updateActiveSql(schemaQuery);
      } else {
          handleAddTab(`${proj.name} Schema`, schemaQuery);
      }
      setTimeout(() => handleRunQuery(), 100);
  };

  const handleSaveQuery = () => {
    if (!selectedProject || !activeTab?.sql.trim()) return;
    if (activeTab.originalName) {
      executeSaveBookmark(activeTab.originalName);
      return;
    }

    setInputValue('');
    setInputLabel('Query Reference Label');
    setShowFormInput(true);
    setAlertConfig({
      isOpen: true,
      title: 'Save Active Query Block',
      message: 'Provide a title reference tag to save this query block cleanly.',
      type: 'default',
      onConfirm: (val) => {
        if (!val.trim()) return;
        executeSaveBookmark(val.trim());
      }
    });
  };

  const executeSaveBookmark = (bookmarkName) => {
    const updatedQueries = savedQueries.filter(q => q.name !== bookmarkName);
    updatedQueries.push({ name: bookmarkName, sql: activeTab.sql });
    setSavedQueries(updatedQueries);
    localStorage.setItem(`saved_queries_${selectedProject.name}`, JSON.stringify(updatedQueries));
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, name: bookmarkName, originalName: bookmarkName } : t));
    closeModalWorkflow();
  };

  const handleDeleteBookmark = () => {
    if (!activeTab?.originalName) return;
    setShowFormInput(false);
    setAlertConfig({
      isOpen: true,
      title: 'Delete Selected Bookmark',
      message: `Confirm dropping the local index bookmark saved under configuration path "${activeTab.originalName}"?`,
      type: 'danger',
      onConfirm: () => {
        const updatedQueries = savedQueries.filter(q => q.name !== activeTab.originalName);
        setSavedQueries(updatedQueries);
        localStorage.setItem(`saved_queries_${selectedProject.name}`, JSON.stringify(updatedQueries));
        setTabs(tabs.map(t => t.id === activeTabId ? { ...t, name: 'Query', originalName: null } : t));
        closeModalWorkflow();
      }
    });
  };

  const handleCreateProject = () => {
    setInputValue('');
    setInputLabel('Database Module Namespace');
    setShowFormInput(true);
    setAlertConfig({
      isOpen: true,
      title: 'Provision Cloud Registry Database',
      message: 'Allocate dynamic isolated SQLite storage container.',
      type: 'default',
      onConfirm: async (val) => {
        if (!val.trim()) return;
        const name = val.trim();
        const apiKey = `sk_${name.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
        const dbFilename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.db`;

        const res = await fetch(`${hubRoot}/create-project`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ name, apiKey, dbFilename, visibility: 'private' })
        });
        const data = await res.json();
        if (data.success) {
          fetchProjects();
          closeModalWorkflow();
        } else {
          setError(data.error);
        }
      }
    });
  };

  const handleRenameDatabase = (proj) => {
    setInputValue(proj.name);
    setInputLabel('Project Label String');
    setShowFormInput(true);
    setAlertConfig({
      isOpen: true,
      title: `Rename DB Registry`,
      message: `Modify internal metadata strings for database project: ${proj.name}.`,
      type: 'default',
      onConfirm: async (val) => {
        if (!val.trim() || val.trim() === proj.name) return;
        await fetch(`${hubRoot}/admin-query`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            projectName: 'Master Registry',
            sql: `UPDATE projects SET name = '${val.trim().replace(/'/g, "''")}' WHERE id = ${proj.id}`
          })
        });
        fetchProjects();
        closeModalWorkflow();
      }
    });
  };

  const handleDropDatabase = (proj) => {
    setShowFormInput(false);
    setAlertConfig({
      isOpen: true,
      title: 'Drop Master Project Schema Linkage',
      message: `WARNING: Server will delete operational configuration data links mapping to ${proj.name}. Proceed?`,
      type: 'danger',
      onConfirm: async () => {
        await fetch(`${hubRoot}/admin-query`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            projectName: 'Master Registry',
            sql: `DELETE FROM projects WHERE id = ${proj.id}`
          })
        });
        if (selectedProject?.id === proj.id) setSelectedProject(null);
        fetchProjects();
        closeModalWorkflow();
      }
    });
  };

  const closeModalWorkflow = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
    setShowFormInput(false);
    setInputValue('');
    setSuccessDetails(null);
  };

  const handleExport = (format) => {
    if (!results || results.length === 0) return;
    let content = '';
    let mimeType = 'text/plain';

    if (format === 'csv') {
      content = [columns.join(','), ...results.map(row => columns.map(c => `"${String(row[c] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      mimeType = 'text/csv';
    } else if (format === 'xls') {
      content = '\ufeff' + [columns.join('\t'), ...results.map(row => columns.map(c => String(row[c] || '')).join('\t'))].join('\n');
      mimeType = 'application/vnd.ms-excel';
    } else if (format === 'txt') {
      content = [columns.join('\t'), ...results.map(row => columns.map(c => String(row[c] || '')).join('\t'))].join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${selectedProject.name}_${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startRatio = splitRatio;

    const handleMouseMove = (moveEvent) => {
      if (!splitPaneRef.current) return;
      const containerHeight = splitPaneRef.current.getBoundingClientRect().height;
      const deltaY = moveEvent.clientY - startY;
      const newRatio = Math.max(10, Math.min(90, startRatio + (deltaY / containerHeight) * 100));
      setSplitRatio(newRatio);
      if (isResultsCollapsed && newRatio < 95) setIsResultsCollapsed(false);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [splitRatio, isResultsCollapsed]);

  const sqlSchemaCache = useMemo(() => {
    if (!selectedProject || !projectTables[selectedProject.name]) return {};
    return projectTables[selectedProject.name].reduce((acc, tableName) => {
      acc[tableName] = []; 
      return acc;
    }, {});
  }, [selectedProject, projectTables]);

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] animate-in fade-in duration-300 bg-background text-on-background" onKeyDown={handleKeyDown}>
      
      <AlertModal 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() => alertConfig.onConfirm ? alertConfig.onConfirm(inputValue) : closeModalWorkflow()}
        onCancel={closeModalWorkflow}
      >
        {showFormInput && (
          <div className="mt-4 w-full">
            <Input label={inputLabel} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter details..." autoFocus />
          </div>
        )}
        {successDetails && (
          <div className="mt-4 flex flex-col gap-3 text-left border-t border-outline/30 pt-4 text-xs font-code max-w-full overflow-x-hidden">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Bearer Authentication Secret</span>
              <div className="bg-surface-container border border-accent-orange/30 px-3 py-2 rounded text-accent-orange font-bold break-all select-all select-text">{successDetails.apiKey}</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Dynamic REST Sync Route</span>
              <div className="bg-surface-container border border-outline/20 px-3 py-2 rounded text-on-surface break-all select-all select-text">{successDetails.restEndpoint}</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Raw SQL Execute Channel</span>
              <div className="bg-surface-container border border-outline/20 px-3 py-2 rounded text-on-surface break-all select-all select-text">{successDetails.sqlEndpoint}</div>
            </div>
          </div>
        )}
      </AlertModal>

      {/* COMPONENT CONTENT SHELL LAYOUT TREE SIDEBAR */}
      <aside className={`hidden lg:flex border-r border-outline-variant bg-surface-container-lowest flex-col z-0 shrink-0 transition-[width] duration-300 ${isSidebarCollapsed ? 'w-14' : 'w-64'}`}>
        <div className="p-sm border-b border-outline-variant bg-surface-bright flex justify-between items-center h-11 shrink-0">
          {!isSidebarCollapsed && <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest px-2">Databases</span>}
          <div className={`flex gap-1 ${isSidebarCollapsed ? 'w-full justify-center' : ''}`}>
            {!isSidebarCollapsed && (
              <button onClick={handleCreateProject} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary" title="New Database">
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            )}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary" title={isSidebarCollapsed ? "Expand" : "Collapse"}>
              <span className="material-symbols-outlined text-[16px]">{isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}</span>
            </button>
          </div>
        </div>
        
        <ul className="flex-1 overflow-y-auto p-xs space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {projects.map(proj => {
            const isSelected = selectedProject?.id === proj.id;
            return (
              <li key={proj.id} className="flex flex-col">
                <div 
                  onClick={() => setSelectedProject(proj)}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-sm'} py-2 rounded transition-colors group border cursor-pointer ${
                    isSelected ? 'bg-surface-container-low border-outline-variant' : 'border-transparent hover:bg-surface-container'
                  }`}
                  title={isSidebarCollapsed ? proj.name : ''}
                >
                  <div className={`flex items-center gap-sm ${isSidebarCollapsed ? '' : 'min-w-0'}`}>
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${isSelected ? 'text-accent-blue' : proj.isMaster ? 'text-accent-orange' : 'text-on-surface-variant'}`}>
                      {proj.isMaster ? 'dns' : isSelected ? 'folder_open' : 'folder'}
                    </span>
                    {!isSidebarCollapsed && <span className={`font-body-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>{proj.name}</span>}
                  </div>
                  
                  {!proj.isMaster && !isSidebarCollapsed && (
                    <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                      <FloatingMenu renderTrigger={() => <span className="material-symbols-outlined text-[16px] text-on-surface-variant hover:text-primary">more_vert</span>}>
                        <div className="flex flex-col text-sm py-1 font-body-sm text-on-surface">
                          <button onClick={() => handleShowSchema(proj)} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container w-full text-left">
                            <span className="material-symbols-outlined text-[16px]">integration_instructions</span> Show Schema
                          </button>
                          <button onClick={() => handleRenameDatabase(proj)} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container w-full text-left">
                            <span className="material-symbols-outlined text-[16px]">edit</span> Rename
                          </button>
                          <button onClick={() => handleDropDatabase(proj)} className="flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-500 w-full text-left font-medium">
                            <span className="material-symbols-outlined text-[16px]">delete_forever</span> Drop DB
                          </button>
                        </div>
                      </FloatingMenu>
                    </div>
                  )}
                </div>
                
                {isSelected && projectTables[proj.name] && !isSidebarCollapsed && (
                  <ul className="ml-6 mt-1 mb-2 space-y-1 border-l border-outline-variant pl-2 animate-in slide-in-from-top-1">
                    {projectTables[proj.name].map(tableName => (
                      <li key={tableName} className="flex items-center gap-2 text-xs font-code text-on-surface-variant py-1 hover:text-primary cursor-default truncate pr-2">
                        <span className="material-symbols-outlined text-[14px] opacity-70 shrink-0">table</span>
                        <span className="truncate">{tableName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* CORE WORKSPACE SYSTEM WRAPPER */}
      {!selectedProject ? (
        <div className="flex-1 flex items-center justify-center bg-surface text-on-surface-variant font-code flex-col gap-4">
           <span className="material-symbols-outlined text-[48px] opacity-30">database</span>
           <span>Select a database from the sidebar to initialize connection.</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface" ref={splitPaneRef}>
          
          {/* UPPER EDITOR VIEW FRAME GRID BLOCK */}
          {/* 🟢 THEME FIX: Swapped hardcoded dark background values for theme tokens to preserve adaptive light mode tracking */}
          <div 
            className="flex flex-col border-b border-outline-variant bg-surface-container-low text-on-surface relative transition-[height] duration-75 min-h-0 shrink-0 md:shrink"
            style={{ height: isResultsCollapsed ? '100%' : `${splitRatio}%` }}
          >
            {/* Editor Header Workspace Tabs Layout */}
            <div className="flex bg-surface-container-high overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 border-b border-outline/20 h-11">
              {tabs.map(tab => (
                <div 
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-r border-outline/20 cursor-pointer min-w-[120px] max-w-[200px] group h-full transition-colors ${
                    activeTabId === tab.id ? 'bg-surface border-t-2 border-t-accent-blue text-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="truncate text-xs font-code flex-1">{tab.name}{tab.sql !== '' && !tab.originalName ? '*' : ''}</span>
                  <span onClick={(e) => handleCloseTab(e, tab.id)} className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 hover:bg-outline/20 rounded transition-all">close</span>
                </div>
              ))}
              <button onClick={() => handleAddTab()} className="px-3 hover:bg-surface-container text-on-surface-variant transition-colors flex items-center h-full">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>

            {/* Action Control Panel Frame Grid Anchor */}
            <div className="flex justify-between items-center px-sm py-2 border-b border-outline/20 bg-surface h-11 shrink-0">
              <span className="text-xs font-code font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded flex-1 min-w-0 truncate mr-4 max-w-fit uppercase tracking-wider">
                {selectedProject.name}
              </span>
              
              <div className="flex items-center gap-sm shrink-0">
                {activeTab?.originalName && (
                  <button onClick={handleDeleteBookmark} className="flex items-center p-1 border border-red-500/30 rounded text-red-500 hover:bg-red-500/10 transition-colors" title="Delete Bookmark">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}

                {/* 🟢 NEW CONNECTIONS LINK HOOK BUTTON */}
                <button onClick={handleShowApiInfo} className="flex items-center gap-xs px-sm py-1 border border-outline hover:bg-surface-container rounded text-xs text-on-surface hover:text-primary transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  <span className="hidden sm:inline">Connect (API)</span>
                </button>

                <button onClick={handleSaveQuery} className="flex items-center gap-xs px-sm py-1 border border-accent-purple rounded text-xs text-on-surface hover:bg-accent-purple/20 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">{activeTab?.originalName ? 'update' : 'bookmark_add'}</span>
                  <span className="hidden sm:inline">{activeTab?.originalName ? 'Update' : 'Save'}</span>
                </button>

                <button onClick={handleRunQuery} disabled={isLoading} className="flex items-center gap-xs px-sm py-1 border border-accent-blue rounded text-xs text-on-surface bg-accent-blue/10 hover:bg-accent-blue/30 transition-colors disabled:opacity-50 cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span className="hidden sm:inline">Run (Ctrl+Enter)</span>
                </button>
              </div>
            </div>
            
            {/* CodeMirror Syntax Component */}
            <div className="flex-1 overflow-auto relative font-code text-[14px]">
              <CodeMirror
                ref={editorRef}
                value={activeTab?.sql || ''}
                height="100%"
                theme={isDarkMode ? 'dark' : 'light'} // 🟢 THEME FIX: Toggles native theme extension states
                extensions={[sql({ dialect: SQLite, schema: sqlSchemaCache })]}
                onChange={(value) => updateActiveSql(value)}
                basicSetup={{ lineNumbers: true, highlightActiveLineGutter: true, autocompletion: true }}
                style={{ height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            </div>

            <div className="p-sm bg-surface-container-high border-t border-outline/20 flex gap-sm overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] h-9">
              <span className="material-symbols-outlined text-[14px] text-accent-purple self-center">bookmarks</span>
              {savedQueries.map((sq, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    const exists = tabs.find(t => t.originalName === sq.name);
                    if (exists) setActiveTabId(exists.id);
                    else handleAddTab(sq.name, sq.sql, sq.name);
                  }}
                  className="px-2 py-0.5 bg-surface border border-outline/30 rounded text-[11px] font-code text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors"
                >
                  {sq.name}
                </button>
              ))}
            </div>
          </div>

          {/* DRAGGABLE ROW SPLITTER LINE MODULE */}
          {!isResultsCollapsed && (
            <div 
              className="h-2 cursor-row-resize bg-surface-container border-y border-outline/20 hover:bg-accent-blue/30 active:bg-accent-blue/50 transition-colors shrink-0 flex items-center justify-center z-10"
              onMouseDown={handleDragStart}
            >
              <div className="w-8 h-1 bg-outline/40 rounded-full pointer-events-none" />
            </div>
          )}

          {/* LOWER DATA TABLE VIEWER GRID LAYER MODULE */}
          <div 
            className="flex flex-col bg-surface-container-lowest overflow-hidden transition-[height] duration-75 min-h-0"
            style={{ height: isResultsCollapsed ? '40px' : `${100 - splitRatio}%` }}
          >
            <div className="flex justify-between items-center p-sm border-b border-outline-variant bg-surface-bright shrink-0 h-11">
              <div className="flex items-center gap-md min-w-0">
                <button onClick={() => setIsResultsCollapsed(!isResultsCollapsed)} className="flex items-center text-on-surface-variant hover:text-primary transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{isResultsCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                </button>
                <span className="font-body-sm font-medium text-primary shrink-0">Results</span>
                {results && !isResultsCollapsed && (
                  <span className="text-[10px] sm:text-xs font-code text-on-surface-variant bg-surface-container px-xs py-px rounded truncate">
                    {results.length} rows in {execTime}ms
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-sm min-w-0">
                {error && <span className="text-xs font-code text-red-500 bg-red-500/10 px-2 py-1 rounded truncate max-w-[140px] sm:max-w-xs">{error}</span>}
                {!isResultsCollapsed && results?.length > 0 && (
                  <FloatingMenu renderTrigger={() => (
                    <button className="flex items-center gap-xs px-sm py-1 border border-outline-variant rounded text-xs bg-surface text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-[16px]">download</span> <span className="hidden sm:inline">Export</span>
                    </button>
                  )}>
                    <div className="flex flex-col text-sm py-1 font-body-sm text-on-surface">
                      <button onClick={() => handleExport('csv')} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container w-full text-left">CSV (.csv)</button>
                      <button onClick={() => handleExport('xls')} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container w-full text-left">Excel (.xls)</button>
                      <button onClick={() => handleExport('txt')} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container w-full text-left">Text (.txt)</button>
                    </div>
                  </FloatingMenu>
                )}
              </div>
            </div>
            
            {!isResultsCollapsed && (
              <div className="flex-1 overflow-auto bg-surface-container-lowest p-2">
                {isLoading && (
                  <div className="p-4 space-y-3 w-full max-w-4xl"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-[92%]" /><Skeleton className="h-6 w-[95%]" /></div>
                )}

                {!isLoading && !results && !error && (
                  <div className="flex items-center justify-center h-full text-sm text-on-surface-variant font-code opacity-50">Execute a query or highlight text selection to analyze data layers.</div>
                )}

                {/* 🟢 FIX 1: Complete elimination of page overflow container breakage. Tables lock, headers remain sticky, cells wrap internally */}
                {!isLoading && results && results.length > 0 && (
                  <div className="w-full max-w-full overflow-x-auto pb-4">
                    <table className="text-left border-collapse text-xs font-code whitespace-nowrap min-w-max border border-outline/10">
                      <thead className="sticky top-0 bg-surface-bright border-b border-outline-variant z-10 shadow-sm">
                        <tr>
                          <th className="px-md py-sm font-medium text-on-surface-variant border-r border-outline-variant w-12 text-center">#</th>
                          {columns.map((col, idx) => (
                            <th 
                              key={idx} 
                              className="px-md py-sm font-medium text-on-surface-variant border-r border-outline-variant select-none cursor-col-resize active:bg-surface-container"
                              style={{ resize: 'horizontal', overflow: 'hidden', minWidth: '120px', maxWidth: '400px' }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/10">
                        {results.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-outline-variant hover:bg-surface-container transition-colors">
                            <td className="px-md py-sm text-on-surface-variant border-r border-outline-variant bg-surface-bright font-bold text-center">{rowIdx + 1}</td>
                            {columns.map((col, colIdx) => {
                              const cellValue = row[col] !== null ? String(row[col]) : "NULL";
                              const isNull = row[col] === null;
                              return (
                                <td 
                                  key={colIdx} 
                                  onDoubleClick={() => handleCellDoubleClick(cellValue)}
                                  className={`px-md py-sm border-r border-outline-variant max-w-[240px] overflow-x-auto whitespace-nowrap select-text transition-colors hover:bg-accent-blue/5 cursor-copy group ${
                                    isNull ? 'text-outline italic' : 'text-primary font-medium'
                                  } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
                                  title="Double-click cell item text to append to query editor layout position"
                                >
                                  {row[col] !== null ? cellValue : <span>NULL</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}