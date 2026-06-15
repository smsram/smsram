'use client';
import { useState } from 'react';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';

export default function AssetFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingAssetId,
  statusText,
  assetTypeOptions
}) {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  if (!isOpen) return null;

  const handleTitleChange = (e) => {
    const val = e.target.value;
    const updates = { title: val };
    if (!editingAssetId) {
      updates.slug = val.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }
    setFormData({ ...formData, ...updates });
  };

  const typeSchemas = {
    PROJECT: [
      { key: 'status',      label: 'Production Status',    placeholder: 'e.g. Beta, Live, Deprecated' },
      { key: 'website_url', label: 'Live Website URL',     placeholder: 'https://...' },
      { key: 'github_url',  label: 'GitHub Repository',    placeholder: 'https://github.com/...' }
    ],
    VIDEO: [
      { key: 'youtube_id', label: 'YouTube Video ID',   placeholder: 'e.g. dQw4w9WgXcQ' },
      { key: 'duration',   label: 'Watch Duration',     placeholder: 'e.g. 14 mins' }
    ],
    SOURCE: [
      { key: 'repo_url',  label: 'Repository Link',        placeholder: 'https://github.com/...' },
      { key: 'language',  label: 'Primary Language Base',  placeholder: 'e.g. TypeScript, Python' }
    ],
    BLOG: [
      { key: 'author',    label: 'Author Name',         placeholder: 'Meher Siva Ram' },
      { key: 'read_time', label: 'Read Time Estimate',  placeholder: 'e.g. 5 min read' }
    ],
    SERVICE: [
      { key: 'endpoint_url', label: 'API Target Endpoint', placeholder: 'https://api.smsram...' },
      { key: 'api_status',   label: 'System Status',       placeholder: 'e.g. Operational, Offline' }
    ]
  };

  const activeSchema = typeSchemas[formData.type] || [];

  // ─── AI helpers ──────────────────────────────────────────────────────────

  const detectLinkType = (url) => {
    if (!url) return null;
    if (/youtube\.com|youtu\.be/.test(url)) return 'VIDEO';
    if (/github\.com/.test(url)) return 'SOURCE';
    return 'WEB'; // Recognizes all other URLs as valid web targets
  };

  const toSlug = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const handleAiUrlChange = (e) => {
    const url = e.target.value;
    setAiUrl(url);
    setAiError('');
    setAiSuccess('');

    const detected = detectLinkType(url);
    // Auto switch type if it's GitHub or YouTube, leave alone if generic WEB
    if (detected && detected !== 'WEB' && detected !== formData.type) {
      setFormData({ ...formData, type: detected });
    }
  };

  const handleAiEnrich = async () => {
    if (!aiUrl.trim()) {
      setAiError('Paste a valid URL to continue.');
      return;
    }
    
    // Ensure URL has http/https
    let finalUrl = aiUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
      setAiUrl(finalUrl);
    }

    setAiLoading(true);
    setAiError('');
    setAiSuccess('');

    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
      const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') : '';

      const res = await fetch(`${serverUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ 
          url: finalUrl, 
          prompt: aiPrompt.trim(),
          targetType: formData.type 
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'AI enrichment failed.');
      }

      const { prefill } = data;
      const rawTitle  = prefill.title || '';
      const cleanTitle = rawTitle.includes('/') ? rawTitle.split('/').pop() : rawTitle;

      setFormData((prev) => ({
        ...prev,
        type:  prefill.type  || prev.type,
        title: cleanTitle    || prev.title,
        slug:  cleanTitle ? toSlug(cleanTitle) : prev.slug,
        summary:  prefill.summary  || prev.summary,
        content:  prefill.content  || prev.content,
        tagsRaw:  prefill.tagsRaw  || prev.tagsRaw,
        metaDynamic: {
          ...(prev.metaDynamic || {}),
          ...(prefill.metaDynamic || {}),
        },
      }));

      setAiSuccess(`AI filled — ${prefill.type} fields loaded. Review before saving.`);
      setAiPanelOpen(false);
    } catch (err) {
      setAiError(err.message || 'Something went wrong. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <form
        onSubmit={onSubmit}
        style={{ width: '100%', maxWidth: '560px', height: '100%', display: 'flex', flexDirection: 'column' }}
        className="relative bg-surface border-l border-outline-variant shadow-2xl animate-in slide-in-from-right duration-300 font-display"
      >

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="h-16 border-b border-outline-variant/80 px-6 flex justify-between items-center shrink-0 text-left bg-surface-container-low">
          <div style={{ display: 'block' }}>
            <h3 className="font-display text-sm font-bold text-primary uppercase tracking-wider">
              {editingAssetId ? 'Update Configuration' : 'Register Content Node'}
            </h3>
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5 opacity-80 block">
              Central Ledger Sync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setAiPanelOpen((v) => !v); setAiError(''); setAiSuccess(''); }}
              title="AI Auto-fill from URL"
              style={{
                height: '32px',
                paddingLeft: '10px',
                paddingRight: '12px',
                backgroundColor: aiPanelOpen ? 'var(--color-accent-blue)' : 'transparent',
                border: '1px solid',
                borderColor: aiPanelOpen ? 'var(--color-accent-blue)' : 'var(--color-outline-variant)',
                color: aiPanelOpen ? '#fff' : 'var(--color-on-surface-variant)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AI Fill
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container border-none bg-transparent text-on-surface-variant hover:text-primary cursor-pointer transition-colors outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* ── AI Enrichment Panel ──────────────────────────────────────── */}
        {aiPanelOpen && (
          <div
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent-blue) 8%, var(--color-surface-container)) 0%, var(--color-surface-container-low) 100%)',
              borderBottom: '1px solid color-mix(in srgb, var(--color-accent-blue) 25%, var(--color-outline-variant))',
              padding: '16px',
              flexShrink: 0,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-accent-blue" style={{ fontSize: '16px' }}>auto_awesome</span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }} className="text-accent-blue">
                AI Enrichment Engine
              </span>
              <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.6 }} className="text-on-surface-variant">
                — URL Auto-Scraper
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <div style={{ position: 'relative' }}>
                <input
                  type="url"
                  value={aiUrl}
                  onChange={handleAiUrlChange}
                  placeholder="Paste ANY web link (YouTube, GitHub, Articles, etc.)"
                  style={{
                    width: '100%',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: '6px',
                    padding: '9px 36px 9px 12px',
                    fontSize: '12px',
                    color: 'var(--color-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  disabled={aiLoading}
                />
                {aiUrl && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '14px',
                      color: detectLinkType(aiUrl) === 'VIDEO' ? '#ef4444' : detectLinkType(aiUrl) === 'SOURCE' ? '#6b7280' : '#10b981',
                      pointerEvents: 'none',
                    }}
                  >
                    {detectLinkType(aiUrl) === 'VIDEO' ? 'smart_display' : detectLinkType(aiUrl) === 'SOURCE' ? 'code' : 'language'}
                  </span>
                )}
              </div>

              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Optional: extra context for AI (e.g. 'write this as a blog post')"
                style={{
                  width: '100%',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-outline-variant)',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  fontSize: '12px',
                  color: 'var(--color-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  opacity: aiLoading ? 0.6 : 1,
                }}
                disabled={aiLoading}
              />

              {aiUrl && detectLinkType(aiUrl) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6 }} className="text-on-surface-variant">
                    Link Type:
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: detectLinkType(aiUrl) === 'VIDEO' ? 'rgba(239,68,68,0.12)' : detectLinkType(aiUrl) === 'SOURCE' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                    color:      detectLinkType(aiUrl) === 'VIDEO' ? '#ef4444'              : detectLinkType(aiUrl) === 'SOURCE' ? '#6366f1'              : '#10b981',
                    border:     `1px solid ${detectLinkType(aiUrl) === 'VIDEO' ? 'rgba(239,68,68,0.25)' : detectLinkType(aiUrl) === 'SOURCE' ? 'rgba(99,102,241,0.25)' : 'rgba(16,185,129,0.25)'}`,
                  }}>
                    {detectLinkType(aiUrl) === 'VIDEO' ? '▶ Video' : detectLinkType(aiUrl) === 'SOURCE' ? '{ } Source' : '🌐 Web Page'}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.5 }} className="text-on-surface-variant">
                    — AI formatting targeting <b>{formData.type}</b>
                  </span>
                </div>
              )}

              {aiError && (
                <p style={{ fontSize: '11px', color: '#ef4444', margin: 0, letterSpacing: '0.04em' }}>
                  ⚠ {aiError}
                </p>
              )}

              <button
                type="button"
                onClick={handleAiEnrich}
                disabled={aiLoading || !aiUrl.trim()}
                style={{
                  height: '36px',
                  backgroundColor: aiLoading || !aiUrl.trim() ? 'var(--color-surface-container)' : 'var(--color-accent-blue)',
                  color: aiLoading || !aiUrl.trim() ? 'var(--color-on-surface-variant)' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: aiLoading || !aiUrl.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {aiLoading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    Fetching & Scraping...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                    Generate & Fill Fields
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── AI success banner ─────────────── */}
        {aiSuccess && !aiPanelOpen && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(34,197,94,0.08)',
            borderBottom: '1px solid rgba(34,197,94,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#22c55e' }}>check_circle</span>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#22c55e' }}>
              {aiSuccess}
            </span>
          </div>
        )}

        {/* ── Scrollable form body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left custom-scrollbar">

          {statusText && (
            <div className="w-full bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs py-2.5 px-3 rounded uppercase tracking-wider font-bold text-center leading-relaxed">
              {statusText}
            </div>
          )}

          <Input
            label="Asset Display Title" required
            value={formData.title} onChange={handleTitleChange}
            placeholder="e.g. LocalMiles Routing System"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unique Route Slug" required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="localmiles"
            />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">
                Classification Type
              </label>
              <Dropdown
                options={assetTypeOptions}
                selectedValue={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
              />
            </div>
          </div>

          <Input
            label="Ecosystem Tech Stack Tags (Comma Separated)"
            value={formData.tagsRaw}
            onChange={(e) => setFormData({ ...formData, tagsRaw: e.target.value })}
            placeholder="Python, FastAPI, Prisma, Docker"
          />

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">
              Summary Brief Abstract
            </label>
            <textarea
              required rows={2}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Provide a short overview of this component..."
              className="w-full bg-surface-container text-primary border border-outline-variant rounded px-4 py-2.5 font-display text-sm outline-none transition-all focus:border-outline shadow-xs resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[11px] text-accent-blue uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">markdown</span>
              Detailed Content (Markdown Supported)
            </label>
            <textarea
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write out technical details, explanations, or blog content here using Markdown formatting..."
              className="w-full bg-surface-container text-primary border border-outline-variant rounded px-4 py-3 font-body text-sm outline-none transition-all focus:border-outline shadow-xs resize-y custom-scrollbar leading-relaxed"
            />
          </div>

          {activeSchema.length > 0 && (
            <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant shadow-sm space-y-3 mt-2">
              <h4 className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold border-b border-outline-variant/60 pb-2 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                {formData.type} Parameters
              </h4>
              <div className="space-y-4">
                {activeSchema.map((field) => (
                  <Input
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={(formData.metaDynamic?.[field.key]) || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metaDynamic: {
                          ...(formData.metaDynamic || {}),
                          [field.key]: e.target.value,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 bg-surface-container-low p-3 rounded border border-outline-variant/60">
            <input
              type="checkbox"
              id="isHiddenCheckbox"
              checked={formData.isHidden}
              onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
              className="w-4 h-4 rounded border-outline-variant text-accent-orange focus:ring-accent-orange cursor-pointer"
            />
            <label htmlFor="isHiddenCheckbox" className="text-xs uppercase tracking-wider text-primary font-bold cursor-pointer select-none">
              Hide node inside public directory routes placeholder rows
            </label>
          </div>

        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="h-20 border-t border-outline-variant/80 px-6 flex items-center justify-end bg-surface-container-low shrink-0">
          <button
            type="submit"
            style={{ height: '42px', backgroundColor: 'var(--color-accent-orange)' }}
            className="w-full text-white text-xs uppercase tracking-widest font-bold rounded shadow-md hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer border-none outline-none"
          >
            Commit Structural Parameters
          </button>
        </div>

      </form>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}