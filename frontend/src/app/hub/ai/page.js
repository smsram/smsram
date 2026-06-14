'use client';
import { useState, useEffect, useRef } from 'react';

export default function AIPage() {
  const [activeTab, setActiveTab] = useState('playground');
  
  // Model Configuration Registry State Matrix Maps
  const [registry, setRegistry] = useState({});
  const [modesList, setModesList] = useState(['auto']);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active User Execution Parameters
  const [selectedMode, setSelectedMode] = useState('auto');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [useStreaming, setUseStreaming] = useState(true);
  const [activeTask, setActiveTask] = useState('text'); 

  // Conversational Data Layers
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Cluster Diagnostics Test Matrix States
  const [diagnosticResults, setDiagnosticResults] = useState({});
  const [isTestingCluster, setIsTestingCluster] = useState(false);
  
  // 🟢 FIXED RULES OF HOOKS: Shifted documentation view state variables out of inner IIFE blocks to avoid conditional execution faults
  const [apiSchemaType, setApiSchemaType] = useState('text'); 
  const [showAuthHeader, setShowAuthHeader] = useState(true);

  // Active Dynamic Server Meta Reference Layer Tracking
  const [metaTracker, setMetaTracker] = useState({ provider: 'Cluster Auto Router', model: 'Dynamic Model Allocation', mode: 'auto' });
  const chatEndRef = useRef(null);
  const apiRoot = process.env.NEXT_PUBLIC_BAAS_API_ROOT || ''; 

  // Synchronize internal system registries directly from backend deployment map rules
  useEffect(() => {
    async function loadBackendMetaMap() {
      try {
        const res = await fetch(`${apiRoot}/ai/models`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;

        const data = await res.json();
        if (data.success) {
          setRegistry(data.registry);
          setModesList(data.modes);
        }
      } catch (err) {
        console.error("Cluster discovery pipeline error:", err);
      }
    }
    loadBackendMetaMap();
  }, [apiRoot]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getFlattenedModels = () => {
    return Object.entries(registry).flatMap(([tierName, nodes]) => 
      nodes.map(node => ({ ...node, tier: tierName }))
    ).filter((value, idx, self) => self.findIndex(v => v.model === value.model) === idx);
  };

  // --- PARALLEL CLUSTER DIAGNOSTIC HEALTH CHECKER (LIVE STREAMING) ---
  const runParallelClusterDiagnostics = async () => {
    const activeModels = getFlattenedModels();
    const targetChatModels = activeModels.filter(m => m.tier !== 'image_generation' && !m.isImage);
    if (targetChatModels.length === 0 || isTestingCluster) return;

    setIsTestingCluster(true);
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('hub_session_token') : '';
    
    const initialStatusState = {};
    targetChatModels.forEach(m => {
      initialStatusState[m.model] = { status: 'testing', latency: 0, response: '', provider: m.name };
    });
    setDiagnosticResults(initialStatusState);

    await Promise.all(targetChatModels.map(async (target) => {
      const startTime = performance.now();
      let firstTokenTime = 0; 

      try {
        const response = await fetch(`${apiRoot}/ai/generate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Reply exactly with the word: ONLINE' }],
            modelOverride: target.model,
            stream: true 
          })
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let runningText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          if (firstTokenTime === 0) firstTokenTime = performance.now();

          const rawChunk = decoder.decode(value, { stream: true });
          const parts = rawChunk.split('\n');

          for (const rawPart of parts) {
            if (!rawPart.trim() || !rawPart.startsWith('data:')) continue;
            const cleanJsonStr = rawPart.slice(5).trim();
            
            if (cleanJsonStr === '[DONE]') {
                setDiagnosticResults(prev => ({
                  ...prev,
                  [target.model]: { ...prev[target.model], status: 'online' }
                }));
                continue;
            }

            try {
              const parsed = JSON.parse(cleanJsonStr);
              if (parsed.content) runningText += parsed.content;
              if (parsed.thinking) runningText += `[Thinking...] ${parsed.thinking}`;
              
              setDiagnosticResults(prev => ({
                ...prev,
                [target.model]: {
                  status: 'testing',
                  latency: Math.round(firstTokenTime - startTime),
                  response: runningText,
                  provider: parsed.provider || target.name
                }
              }));
            } catch (e) {}
          }
        }
      } catch (err) {
        const endTime = performance.now();
        setDiagnosticResults(prev => ({
          ...prev,
          [target.model]: {
            status: 'offline',
            latency: Math.round((firstTokenTime || endTime) - startTime),
            response: err.message,
            provider: target.name
          }
        }));
      }
    }));

    setIsTestingCluster(false);
  };

  const handleSubmissionCascade = async () => {
    if (!inputPrompt.trim() || isGenerating) return;

    const userPayload = { role: 'user', content: inputPrompt, task: activeTask };
    const updatedHistory = [...messages, userPayload];
    
    setMessages(updatedHistory);
    setInputPrompt('');
    setIsGenerating(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '', thinking: '', type: activeTask }]);

    try {
      const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('hub_session_token') : '';
      const isImageTask = activeTask === 'image_generation';
      const actualStreamingConfig = isImageTask ? false : useStreaming;

      const response = await fetch(`${apiRoot}/ai/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          messages: updatedHistory,
          mode: isImageTask ? 'image_generation' : selectedMode,
          modelOverride: selectedModel === 'auto' ? null : selectedModel,
          stream: actualStreamingConfig,
          task: activeTask
        })
      });

      if (!response.ok) throw new Error("Cluster endpoint rejected delivery context.");

      if (actualStreamingConfig) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let runningContent = '';
        let runningThinking = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const rawChunk = decoder.decode(value, { stream: true });
          const parts = rawChunk.split('\n');

          for (const rawPart of parts) {
            if (!rawPart.trim() || !rawPart.startsWith('data:')) continue;
            const cleanJsonStr = rawPart.slice(5).trim();
            if (cleanJsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(cleanJsonStr);
              
              if (parsed.provider) {
                setMetaTracker({ provider: parsed.provider, model: parsed.model, mode: parsed.mode || 'auto' });
              }
              if (parsed.thinking) runningThinking += parsed.thinking;
              if (parsed.content) runningContent += parsed.content;

              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                last.content = runningContent;
                last.thinking = runningThinking;
                return copy;
              });
            } catch (e) {}
          }
        }
      } else {
        const staticData = await response.json();
        if (staticData.success) {
          setMetaTracker({ provider: staticData.provider, model: staticData.model, mode: staticData.mode || 'auto' });
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            last.content = staticData.content;
            last.thinking = staticData.thinking;
            return copy;
          });
        }
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1].content = `Cluster Router Error: ${err.message}. Please swap operational parameters.`;
        return copy;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const flattenedModels = getFlattenedModels();
  const filteredCollection = flattenedModels.filter(m => {
    const modelId = m?.model || ''; 
    const providerName = m?.name || '';
    const search = searchQuery ? searchQuery.toLowerCase() : '';

    return modelId.toLowerCase().includes(search) || 
          providerName.toLowerCase().includes(search);
  });

  // Structural mapping dictionary declaration block for API Documentation Tab layouts
  const documentationSchemas = {
    text: {
      title: "Text Generation / Chat Completion",
      endpoint: "/ai/generate",
      method: "POST",
      body: {
        task: "text",
        mode: selectedMode,
        modelOverride: selectedModel === 'auto' ? null : selectedModel,
        stream: useStreaming,
        messages: [
          { role: "user", content: "Explain LIFO search strategy in Branch and Bound." }
        ]
      },
      response: {
        success: true,
        provider: "Cerebras",
        model: "llama-3.3-70b",
        mode: "default",
        thinking: "",
        content: "LIFO (Last-In-First-Out) uses a Stack data structure...",
        embeddings: []
      }
    },
    image: {
      title: "Text-to-Image Generation Cluster",
      endpoint: "/ai/generate",
      method: "POST",
      body: {
        task: "image_generation",
        mode: "image_generation",
        modelOverride: selectedModel === 'auto' ? null : selectedModel,
        stream: false,
        messages: [
          { role: "user", content: "A cinematic silhouette stickman brawler arena, neon override theme." }
        ]
      },
      response: {
        success: true,
        provider: "Cloudflare Flux",
        model: "@cf/black-forest-labs/flux-1-schnell",
        mode: "image_generation",
        task: "image_generation",
        thinking: "",
        content: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQg...",
        embeddings: []
      }
    },
    embeddings: {
      title: "1024-Dimension Text Vector Embeddings",
      endpoint: "/ai/generate",
      method: "POST",
      body: {
        task: "text",
        mode: "auto",
        stream: false,
        generateEmbeddings: true,
        messages: [
          { role: "user", content: "RythuMart agritech platform" }
        ]
      },
      response: {
        success: true,
        provider: "Cloudflare",
        model: "@cf/google/gemma-2-2b-it-lora",
        mode: "default",
        thinking: "",
        content: "RythuMart agritech platform",
        embeddings: [0.0142581, -0.0514782, 0.0914285, "...", -0.0021458]
      }
    },
    vision: {
      title: "Multimodal Vision Analysis / Image Description",
      endpoint: "/ai/generate",
      method: "POST",
      body: {
        task: "text",
        mode: "auto",
        stream: useStreaming,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Identify the floating visual graph structures inside this page layout canvas." },
              { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." } }
            ]
          }
        ]
      },
      response: {
        success: true,
        provider: "Cloudflare Vision",
        model: "@cf/meta/llama-3.2-11b-vision-instruct",
        mode: "default",
        thinking: "Parsing visual bounding coordinates...",
        content: "The image exhibits a state-space execution tree layout containing nodes labeled 1 through 15...",
        embeddings: []
      }
    }
  };

  const currentSchema = documentationSchemas[apiSchemaType] || documentationSchemas.text;

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] animate-in fade-in duration-300 bg-neutral-950 text-neutral-200">
      
      {/* Inner Sidebar: Real-time Backend Node Registry Mapping */}
      <div className="hidden lg:flex w-[320px] shrink-0 border-r border-neutral-800 bg-neutral-900 flex-col z-0">
        <div className="p-lg border-b border-neutral-800">
          <h2 className="font-headline-md text-headline-md text-white font-bold mb-md">Cluster Registry</h2>
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-neutral-500 text-[18px]">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter active registry mapping..." 
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-xs pl-xl text-white focus:outline-none focus:border-orange-500 font-code text-xs transition-all placeholder:text-neutral-600"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredCollection.map((item, idx) => {
            const isSelected = selectedModel === item.model;
            return (
              <div 
                key={idx}
                onClick={() => {
                  setSelectedModel(item.model);
                  if (item.tier === 'image_generation' || item.isImage) {
                    setActiveTask('image_generation');
                  } else {
                    setActiveTask('text');
                    setSelectedMode('auto');
                  }
                }}
                className={`px-lg py-md border-b border-neutral-800 border-l-2 cursor-pointer transition-colors
                  ${isSelected ? 'bg-neutral-950 border-l-orange-500' : 'border-l-transparent hover:bg-neutral-800/50'}
                `}
              >
                <div className="flex flex-col gap-0.5">
                  <span className={`font-code text-xs font-mono break-all ${isSelected ? 'text-orange-500 font-bold' : 'text-neutral-300'}`}>{item.model}</span>
                  <span className="text-[10px] font-mono text-neutral-500">Node Channel: {item.name}</span>
                </div>
                <div className="flex items-center gap-sm mt-sm">
                  <span className="bg-neutral-800 text-neutral-400 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border border-neutral-700 tracking-wider">{item.tier}</span>
                  <span className="text-neutral-600 text-[10px] font-mono uppercase tracking-widest">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Core Canvas Workspace Display */}
      <div className="flex-1 flex flex-col h-full bg-neutral-950 relative min-w-0">
        
        {/* Dynamic Context Track Metadata Header */}
        <div className="px-4 md:px-xl pt-lg pb-sm bg-neutral-900 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-sm">
          <div className="flex items-center gap-xs text-neutral-400 font-code text-[11px] uppercase tracking-widest truncate max-w-full">
            <span>Cluster Trace</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-orange-500 font-bold font-mono">{metaTracker.provider}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-neutral-400 font-bold font-mono text-[10px] uppercase bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">{metaTracker.mode}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-white font-bold font-mono text-xs truncate max-w-[180px] md:max-w-[300px]">{metaTracker.model}</span>
          </div>

          <div className="flex items-center gap-sm flex-wrap">
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded p-0.5">
              <button 
                onClick={() => { setActiveTask('text'); setSelectedModel('auto'); }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all ${activeTask === 'text' ? 'bg-orange-500 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                Text
              </button>
              <button 
                onClick={() => { setActiveTask('image_generation'); setSelectedModel('auto'); }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all ${activeTask === 'image_generation' ? 'bg-orange-500 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                Images
              </button>
            </div>

            {activeTask !== 'image_generation' && (
              <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Mode:</span>
                <select 
                  value={selectedMode}
                  onChange={(e) => {
                    setSelectedMode(e.target.value);
                    if (e.target.value !== 'auto') setSelectedModel('auto');
                  }}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer"
                >
                  <option value="auto" className="bg-neutral-900">Auto Router</option>
                  {modesList.filter(m => m !== 'auto' && m !== 'image_generation').map((m, i) => (
                    <option key={i} value={m} className="bg-neutral-900 uppercase">{m}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              onClick={() => setUseStreaming(!useStreaming)}
              disabled={activeTask === 'image_generation'}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[11px] uppercase transition-colors disabled:opacity-30
                ${useStreaming && activeTask !== 'image_generation' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-neutral-950 border-neutral-800 text-neutral-500'}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${useStreaming && activeTask !== 'image_generation' ? 'bg-orange-500 animate-pulse' : 'bg-neutral-600'}`}></span>
              Stream
            </button>
          </div>
        </div>

        {/* Dynamic Tab Toggle Bars */}
        <div className="px-4 md:px-xl border-b border-neutral-800 flex gap-md sm:gap-xl bg-neutral-900">
          <button onClick={() => setActiveTab('playground')} className={`pb-sm pt-sm border-b-2 font-mono uppercase tracking-wider text-[11px] ${activeTab === 'playground' ? 'border-orange-500 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>Playground</button>
          <button onClick={() => setActiveTab('diagnostics')} className={`pb-sm pt-sm border-b-2 font-mono uppercase tracking-wider text-[11px] ${activeTab === 'diagnostics' ? 'border-orange-500 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>Cluster Metrics</button>
          <button onClick={() => setActiveTab('api')} className={`pb-sm pt-sm border-b-2 font-mono uppercase tracking-wider text-[11px] ${activeTab === 'api' ? 'border-orange-500 text-white font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>API Parameters</button>
        </div>

        {/* View Layout A: Playground Area */}
        {activeTab === 'playground' && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-xl flex flex-col gap-lg bg-neutral-950">
              {selectedModel !== 'auto' && (
                <div className="flex justify-center">
                  <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 font-code text-[11px] px-md py-xs rounded-full flex items-center gap-md">
                    <span>Active Lock: <strong className="text-orange-500 font-mono">{selectedModel}</strong></span>
                    <button onClick={() => setSelectedModel('auto')} className="text-red-400 underline font-bold hover:text-red-300">Clear Lock</button>
                  </span>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start animate-in fade-in duration-200'}`}>
                  <div className={`p-md rounded-lg max-w-[85%] font-mono text-sm shadow-md border 
                    ${msg.role === 'user' 
                      ? 'bg-neutral-900 text-neutral-100 border-neutral-800 rounded-tr-none' 
                      : 'bg-neutral-900 text-neutral-200 border-neutral-800 rounded-tl-none flex flex-col gap-sm'
                    }`}
                  >
                    {msg.thinking && (
                      <div className="mb-2 border-l-2 border-neutral-700 pl-3 bg-neutral-950/40 p-2 rounded text-neutral-400 text-xs animate-in fade-in duration-300">
                        <div className="text-neutral-500 uppercase tracking-widest text-[9px] font-bold mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] animate-spin">cyclone</span> Deep Reasoning Chain
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed font-sans italic">{msg.thinking}</p>
                      </div>
                    )}
                    
                    {msg.content && (msg.content.startsWith('data:image') || msg.content.includes('base64,')) ? (
                      <div className="flex flex-col gap-xs animate-in zoom-in-95 duration-300 mt-1">
                        {msg.content.startsWith('data:application/json') ? (
                          <div className="p-sm bg-red-950/20 border border-red-900/40 rounded-lg text-xs font-mono text-red-400">
                            <span className="font-bold uppercase tracking-wider block mb-1">⚠️ Outbound Mime Mismatch Detected</span>
                            The cluster returned a string-nested text map instead of a raster viewport. Please switch your model lock to Flux.
                          </div>
                        ) : (
                          <>
                            <img 
                              src={msg.content} 
                              alt="Cluster Node Generation Asset" 
                              className="rounded-lg border border-neutral-800 max-w-full sm:max-w-[480px] h-auto object-contain shadow bg-neutral-950" 
                              onError={(e) => {
                                console.error("Image render broke on target format layout.");
                                e.target.style.display = 'none'; 
                              }}
                            />
                            <a 
                              href={msg.content} 
                              download={`${metaTracker.model.replace(/[^a-z0-9]/gi, '_')}_asset.png`}
                              className="text-[11px] font-mono text-orange-500 font-bold hover:underline mt-1 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">download</span>
                              Download Output Asset PNG
                            </a>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed font-sans">
                        {msg.content || (isGenerating && index === messages.length - 1 ? 'Streaming operational layout buffers...' : '')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 md:p-xl bg-neutral-900 border-t border-neutral-800 shrink-0 relative">
              <div className="flex items-end gap-2 md:gap-md max-w-5xl mx-auto">
                <textarea 
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmissionCascade(); } }}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-md text-white focus:outline-none focus:border-orange-500 font-sans text-sm resize-none shadow-sm placeholder:text-neutral-600" 
                  placeholder={isGenerating ? "Awaiting active response completion..." : activeTask === 'image_generation' ? "Describe the image you want Flux/SDXL to create..." : "Enter chat prompt profile task..."} 
                  rows="2"
                  disabled={isGenerating}
                ></textarea>
                <button 
                  onClick={handleSubmissionCascade}
                  disabled={isGenerating || !inputPrompt.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white h-12 px-4 md:px-lg rounded flex items-center justify-center gap-sm transition-colors shadow-sm shrink-0"
                >
                  <span className="font-mono text-xs uppercase font-bold hidden sm:inline">Submit</span>
                  <span className="material-symbols-outlined text-[18px]">{activeTask === 'image_generation' ? 'image' : 'send'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Layout B: Diagnostics Workspace Panel */}
        {activeTab === 'diagnostics' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-xl bg-neutral-950 animate-in fade-in duration-200">
            <div className="max-w-6xl w-full mx-auto flex flex-col gap-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md border-b border-neutral-800 pb-md">
                <div>
                  <h3 className="text-lg font-mono font-bold text-white uppercase tracking-wider">Parallel Node Cluster Testing</h3>
                  <p className="text-xs text-neutral-400 font-sans mt-0.5">Dispatches simultaneous async validation queries to check system line capacities across active routes (Excluding Image Clusters).</p>
                </div>
                <button 
                  onClick={runParallelClusterDiagnostics}
                  disabled={isTestingCluster || flattenedModels.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider px-lg py-sm rounded flex items-center gap-sm shadow transition-colors shrink-0"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isTestingCluster ? 'animate-spin' : ''}`}>
                    {isTestingCluster ? 'sync' : 'network_check'}
                  </span>
                  {isTestingCluster ? 'Testing...' : 'Run Cluster Diagnostics'}
                </button>
              </div>

              {flattenedModels.length === 0 ? (
                <div className="text-center py-xl border border-dashed border-neutral-800 rounded bg-neutral-900/20">
                  <span className="material-symbols-outlined text-neutral-600 text-[48px] animate-pulse">hub</span>
                  <p className="font-mono text-xs text-neutral-400 mt-md">Awaiting internal data maps from backend...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {flattenedModels.filter(m => m.tier !== 'image_generation' && !m.isImage).map((item, idx) => {
                    const result = diagnosticResults[item.model];
                    return (
                      <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-lg p-md flex flex-col justify-between gap-md shadow-sm">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-sm">
                            <span className="font-mono text-xs font-bold text-white break-all">{item.model}</span>
                            <span className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0
                              ${result?.status === 'online' ? 'bg-green-500/10 border-green-500/30 text-green-400' : ''}
                              ${result?.status === 'offline' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
                              ${result?.status === 'testing' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse' : ''}
                              ${!result ? 'bg-neutral-950 border-neutral-800 text-neutral-500' : ''}
                            `}>
                              {result?.status || 'untested'}
                            </span>
                          </div>
                          <div className="flex gap-md text-[10px] text-neutral-500 font-mono mt-0.5">
                            <span>Gateway: <strong className="text-neutral-400 font-normal">{item.name}</strong></span>
                            <span>Tier: <strong className="text-neutral-400 font-normal uppercase">{item.tier}</strong></span>
                            {result?.status && result.status !== 'testing' && (
                              <span>Latency: <strong className={result.status === 'online' ? 'text-green-400' : 'text-red-400'}>{result.latency}ms</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="bg-neutral-950 border border-neutral-800/80 rounded p-sm max-h-[100px] overflow-y-auto no-scrollbar">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-600 block font-mono mb-1">Payload Response Dump:</span>
                          <p className={`font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap
                            ${result?.status === 'online' ? 'text-neutral-300' : ''}
                            ${result?.status === 'offline' ? 'text-red-400/90 font-sans italic' : ''}
                            ${result?.status === 'testing' ? 'text-neutral-500 animate-pulse' : ''}
                            ${!result ? 'text-neutral-600 italic' : ''}
                          `}>
                            {result?.response || 'Run check diagnostic routine to trace output parameters.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Layout C: API Parameters Sheet */}
        {activeTab === 'api' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-950 animate-in fade-in duration-200 min-w-0 w-full">
            
            {/* Parameters Sidebar Selector Sub-tab Row */}
            <div className="w-full md:w-[240px] shrink-0 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900/60 flex flex-row md:flex-col p-2 md:p-4 gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar">
              {/* Maps exactly over the hardcoded layout configurations dictionary keys */}
              <button
                onClick={() => setApiSchemaType('text')}
                className={`px-3 py-2 rounded text-left font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap w-full
                  ${apiSchemaType === 'text' 
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold' 
                    : 'border border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                  }
                `}
              >
                Text Schema
              </button>
              <button
                onClick={() => setApiSchemaType('image')}
                className={`px-3 py-2 rounded text-left font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap w-full
                  ${apiSchemaType === 'image' 
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold' 
                    : 'border border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                  }
                `}
              >
                Image Schema
              </button>
              <button
                onClick={() => setApiSchemaType('pure_embeddings')}
                className={`px-3 py-2 rounded text-left font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap w-full
                  ${apiSchemaType === 'pure_embeddings' 
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold' 
                    : 'border border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                  }
                `}
              >
                Pure Embeddings
              </button>
              <button
                onClick={() => setApiSchemaType('document_embeddings')}
                className={`px-3 py-2 rounded text-left font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap w-full
                  ${apiSchemaType === 'document_embeddings' 
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold' 
                    : 'border border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                  }
                `}
              >
                Document Embeddings
              </button>
              <button
                onClick={() => setApiSchemaType('vision')}
                className={`px-3 py-2 rounded text-left font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap w-full
                  ${apiSchemaType === 'vision' 
                    ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold' 
                    : 'border border-transparent text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                  }
                `}
              >
                Vision Schema
              </button>
              
              <div className="hidden md:block my-4 border-t border-neutral-800/80 w-full" />
              
              {/* Toggle Option for Authorization Header Scheme Injection */}
              <button
                onClick={() => setShowAuthHeader(!showAuthHeader)}
                className={`px-3 py-2 rounded text-center md:text-left font-mono text-[10px] uppercase tracking-widest transition-all mt-auto border w-full
                  ${showAuthHeader 
                    ? 'bg-green-500/5 border-green-500/20 text-green-400 font-bold' 
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>API Key Header</span>
                  <span className="font-sans text-[12px]">{showAuthHeader ? 'ON' : 'OFF'}</span>
                </div>
              </button>
            </div>

            {/* Code Viewer Request/Response Canvas Panel */}
            <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-xl gap-lg min-w-0 w-full max-w-full">
              {(() => {
                // Determine layout content purely with standard assignments, avoiding dynamic hook checks inside the render engine
                let currentDocSchema = {
                  title: "Standard Text / Chat Completions",
                  endpoint: "/ai/generate",
                  method: "POST",
                  contentType: "application/json",
                  body: { task: "text", mode: "auto", modelOverride: null, avoidModels: ["gemma-2b-it-lora"], stream: true, messages: [{ role: "user", content: "Explain LIFO search strategy in Branch and Bound." }] },
                  response: { success: true, provider: "Cerebras", model: "llama-3.3-70b", mode: "default", thinking: "", content: "LIFO (Last-In-First-Out) uses an explicit Stack boundary layer...", embeddings: [] }
                };

                if (apiSchemaType === 'image') {
                  currentDocSchema = {
                    title: "Text-to-Image Generation (Flux 1 Schnell)",
                    endpoint: "/ai/generate",
                    method: "POST",
                    contentType: "application/json",
                    body: { task: "image_generation", mode: "image_generation", modelOverride: "@cf/black-forest-labs/flux-1-schnell", stream: false, messages: [{ role: "user", content: "Cinematic stickman brawler battle frame asset background, neon override tracers." }] },
                    response: { success: true, provider: "Cloudflare Flux", model: "@cf/black-forest-labs/flux-1-schnell", mode: "image_generation", task: "image_generation", thinking: "", content: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCA...", embeddings: [] }
                  };
                } else if (apiSchemaType === 'pure_embeddings') {
                  currentDocSchema = {
                    title: "Pure Text Token Vectorization (Without Document File)",
                    endpoint: "/ai/generate",
                    method: "POST",
                    contentType: "application/json",
                    body: { task: "text", mode: "auto", stream: false, generateEmbeddings: true, messages: [{ role: "user", content: "RythuMart agritech platform built with the MERN stack." }] },
                    response: { success: true, provider: "Cloudflare", model: "@cf/google/gemma-2-2b-it-lora", mode: "default", thinking: "", content: "RythuMart agritech platform built with the MERN stack.", embeddings: [0.021584, -0.048591, 0.083145, "...", -0.001948] }
                  };
                } else if (apiSchemaType === 'document_embeddings') {
                  currentDocSchema = {
                    title: "Document File Analysis & Vector Embeddings",
                    endpoint: "/ai/extract-doc",
                    method: "POST",
                    contentType: "multipart/form-data",
                    body: `// Execute via Multipart FormData instead of a standard JSON payload\nconst payload = new FormData();\npayload.append('file', fileInputReference.files[0]); // Accepts .pdf, .txt, .docx, .xlsx, .pptx\npayload.append('generateEmbeddings', 'true');\npayload.append('extractImages', 'true');\npayload.append('enableImageEmbeddings', 'false');\npayload.append('stream', 'false');`,
                    response: { success: true, fileName: "rythumart_spec.pdf", fileType: "pdf", content: "\n--- Page 1 ---\nRythuMart project spec. Core modules leverage MERN structure architecture...\n\n::DIAGRAM_START [Page 1] [ID_B56C71]::\nTechnical visual description outlining database table collections inline...\n::DIAGRAM_END::", embeddings: [0.014285, -0.051942, 0.082145, "...", -0.003184] }
                  };
                } else if (apiSchemaType === 'vision') {
                  currentDocSchema = {
                    title: "Multimodal Vision Analysis / Image Descriptors",
                    endpoint: "/ai/generate",
                    method: "POST",
                    contentType: "application/json",
                    body: { task: "text", mode: "auto", stream: true, messages: [{ role: "user", content: [{ type: "text", text: "Analyze the state-space execution tree layout." }, { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." } }] }] },
                    response: { success: true, provider: "Cloudflare Vision", model: "@cf/meta/llama-3.2-11b-vision-instruct", mode: "default", thinking: "Evaluating structural pixel arrays...", content: "The image depicts a branch and bound matrix layout diagram indicating depth metrics...", embeddings: [] }
                  };
                }

                return (
                  <div className="max-w-4xl w-full mx-auto flex flex-col gap-md">
                    <div>
                      <span className="text-[10px] font-mono uppercase bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-orange-400 tracking-widest">
                        {currentDocSchema.method} {currentDocSchema.endpoint}
                      </span>
                      <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider mt-2">{currentDocSchema.title}</h3>
                    </div>

                    {/* Request Header and Body Segment Block */}
                    <div className="flex flex-col gap-1.5 w-full max-w-full">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-neutral-500">HTTP Request Payload Spec</span>
                      <div className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-sm p-md font-mono text-xs leading-relaxed text-orange-400/90 relative w-full max-w-full overflow-hidden">
                        <pre className="overflow-x-auto overflow-y-auto max-h-[350px] md:max-h-[500px] whitespace-pre-wrap break-all max-w-full select-all text-xs font-mono tracking-tight text-orange-400/90 pr-2 no-scrollbar">
{`${currentDocSchema.method} ${apiRoot}${currentDocSchema.endpoint} HTTP/1.1
Content-Type: ${currentDocSchema.contentType}${showAuthHeader ? `\nAuthorization: Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('hub_session_token') || 'sk_liviar-hackathon_4ilu5usz') : 'sk_liviar-hackathon_4ilu5usz'}` : ''}

${typeof currentDocSchema.body === 'string' ? currentDocSchema.body : JSON.stringify(currentDocSchema.body, null, 2)}`}
                        </pre>
                      </div>
                    </div>

                    {/* Corresponding Outbound Payload Response Segment Block */}
                    <div className="flex flex-col gap-1.5 mt-2 w-full max-w-full">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-neutral-500">Expected JSON Response Layout Structure</span>
                      <div className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-sm p-md font-mono text-xs leading-relaxed text-emerald-400/90 relative w-full max-w-full overflow-hidden">
                        <pre className="overflow-x-auto overflow-y-auto max-h-[350px] md:max-h-[500px] whitespace-pre-wrap break-all max-w-full select-all text-xs font-mono tracking-tight text-emerald-400/90 pr-2 no-scrollbar">
{`HTTP/1.1 200 OK
Content-Type: application/json

${JSON.stringify(currentDocSchema.response, null, 2)}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}