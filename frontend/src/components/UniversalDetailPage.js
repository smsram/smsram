"use client";

import { useRouter } from 'next/navigation';
import DirectoryCard from '@/components/DirectoryCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function UniversalDetailPage({
  title,
  tags = [],
  accentColor = "#f57f15",
  summary,
  content, 
  highlightItems = [], 
  actionLinks = [],    
  videoUrl, 
  connectedAssets = [],
  backUrl = "/projects",
  backLabel = "Back to directory"
}) {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in duration-300 font-display" style={{ padding: '40px' }}>
      <div className="max-w-[1000px] mx-auto flex flex-col" style={{ gap: '32px' }}>
        
        {/* Navigation Return Button */}
        <div style={{ display: 'block' }} className="text-left">
          <button 
            onClick={() => router.push(backUrl)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            className="font-code text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{backLabel}</span>
          </button>
        </div>

        {/* Header Block */}
        <div style={{ display: 'block' }} className="text-left">
          <div style={{ display: 'flex' }} className="items-center gap-3 w-full min-w-0">
            <span style={{ backgroundColor: accentColor }} className="w-3 h-3 rounded-full shrink-0" />
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-primary tracking-tight leading-none">
              {title}
            </h1>
          </div>
          
          {/* Tech Stack Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }} className="w-full">
            {tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-surface-container border border-outline-variant text-on-surface-variant font-code text-xs rounded font-medium shrink-0">
                {tag}
              </span>
            ))}
          </div>

          {/* DYNAMIC METRIC HIGHLIGHTS PILLS */}
          {highlightItems.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }} className="w-full">
              {highlightItems.map((item, idx) => (
                <div key={idx} className="inline-flex items-center w-max gap-1.5 text-sm font-code text-primary bg-surface-container-low border border-outline-variant/60 px-2.5 py-1.5 rounded shadow-xs">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{item.icon}</span>
                  <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[9px]">{item.label}:</span>
                  <span className="font-bold text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* FIXED: Dynamic Action Links with Fluid Global Button Animations */}
          {actionLinks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }} className="w-full">
              {actionLinks.map((link, idx) => (
                <a 
                  key={idx} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex w-max items-center gap-2 px-5 py-2.5 bg-surface-container-lowest border border-outline-variant text-primary text-sm font-bold font-display rounded shadow-xs transition-all hover:border-accent-blue hover:shadow-md cursor-pointer no-underline group"
                >
                  <span className="material-symbols-outlined text-[18px] text-accent-blue group-hover:scale-110 transition-transform duration-200">
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-60 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                    open_in_new
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Video Embedding Player */}
        {videoUrl && (
          <div style={{ display: 'block' }} className="w-full aspect-video bg-black rounded-md overflow-hidden border border-outline-variant/60 shadow-sm mt-2">
            <iframe 
              className="w-full h-full border-none"
              src={videoUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Main Details Panel Box */}
        <div style={{ display: 'block' }} className="w-full bg-surface-container-lowest border border-outline-variant rounded-md p-6 sm:p-8 shadow-sm text-left space-y-8">
          
          {summary && (
            <div style={{ display: 'block' }}>
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-accent-blue mb-3">Executive Summary</h3>
              <p className="text-lg font-body text-primary leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* Markdown Content Parser Area */}
          {content && (
            <div style={{ display: 'block' }} className="border-t border-outline-variant/60 pt-8">
              <div className="markdown-body font-body text-on-surface-variant leading-relaxed space-y-4 
                [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-primary [&>h1]:font-display [&>h1]:mt-8 [&>h1]:mb-4
                [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-primary [&>h2]:font-display [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-outline-variant/40
                [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-primary [&>h3]:font-display [&>h3]:mt-6 [&>h3]:mb-3
                [&>p]:mb-4 [&>p]:text-[15px]
                [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ul>li]:mb-2
                [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>ol>li]:mb-2
                [&>blockquote]:border-l-4 [&>blockquote]:border-accent-blue [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:bg-surface-container-low [&>blockquote]:py-2 [&>blockquote]:pr-4 [&>blockquote]:rounded-r
                [&>pre]:bg-[#0d1117] [&>pre]:text-[#c9d1d9] [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:font-code [&>pre]:text-sm [&>pre]:mb-4
                [&>p>code]:bg-surface-container [&>p>code]:text-accent-orange [&>p>code]:px-1.5 [&>p>code]:py-0.5 [&>p>code]:rounded [&>p>code]:font-code [&>p>code]:text-[13px]
                [&>a]:text-accent-blue [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-primary"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}

        </div>

        {/* Connected Graph Assets */}
        <div style={{ display: 'block', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '32px', marginTop: '16px' }}>
          <div className="flex items-center gap-2 mb-6 text-left">
            <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-primary">Related Content</h3>
          </div>

          {connectedAssets.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant font-code text-xs italic border border-dashed border-outline-variant rounded-md opacity-60">
              No connected ecosystem components mapped to this node.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in duration-300" style={{ display: 'grid' }}>
              {connectedAssets.map((asset, idx) => (
                <DirectoryCard 
                  key={idx}
                  title={asset.title}
                  description={asset.description}
                  tags={asset.tags}
                  accentColor={asset.accentColor}
                  image={asset.image} 
                  href={asset.href}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}