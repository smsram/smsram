"use client";

import { useState, useEffect } from 'react';
import Skeleton from '@/components/Skeleton';
import { timelineData } from '@/config/timeline';

export default function AboutPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pb-12 animate-in fade-in duration-300 font-display" style={{ padding: '40px' }}>
      <div className="mx-auto flex flex-col" style={{ maxWidth: '1200px', gap: '40px' }}>
        
        {/* Profile Card Header Section */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '32px', gap: '32px' }} className="flex-col md:flex-row items-start w-full">
          <div style={{ width: '96px', height: '96px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--color-outline-variant)', flexShrink: 0 }} className="bg-surface-container shadow-sm">
            <img src="/smsram.jpg" alt="Meher Siva Ram" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-left min-w-0" style={{ display: 'block' }}>
            <h2 className="font-display text-3xl font-bold text-primary tracking-tight">Meher Siva Ram Sorampudi</h2>
            <p className="text-on-surface-variant font-code text-xs mt-1 uppercase tracking-widest font-bold text-accent-blue">
              Machine Learning Engineer & Full-Stack Developer
            </p>
            <p className="text-sm font-body-sm text-on-surface-variant leading-relaxed mt-4 max-w-3xl">
              Third-year B.Tech student specializing in Artificial Intelligence and Machine Learning at Godavari Global University. Transitioning from full-stack software development to core ML systems engineering. Focused on building predictive model pipelines, computer vision document security modules, and automated distributed deployment grids.
            </p>
            
            {/* Portfolio Link Button Redirecting to / */}
            <div style={{ display: 'block', marginTop: '24px' }}>
              <a 
                href="/" 
                style={{ display: 'inline-flex', height: '38px', alignItems: 'center', gap: '8px', padding: '0 16px', textDecoration: 'none' }}
                className="bg-primary text-on-primary font-code text-xs uppercase tracking-widest font-bold rounded shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>Return to Home Page</span>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              </a>
            </div>
          </div>
        </div>

        {/* Learning & Progress Track Matrices */}
        <div style={{ display: 'grid' }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          
          <div style={{ display: 'block' }} className="lg:col-span-2">
            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface-variant" style={{ marginBottom: '24px' }}>
              Learning & Development Timeline
            </h3>
            
            {isLoading ? (
              <div style={{ display: 'block' }} className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
            ) : (
              <div style={{ display: 'block', borderLeft: '1px solid var(--color-outline-variant)', paddingLeft: '24px' }} className="space-y-8 ml-2">
                
                {/* Dynamically Map the External Timeline Data */}
                {timelineData.map((item) => (
                  <div key={item.id} style={{ display: 'block', position: 'relative' }}>
                    <span 
                      style={{ position: 'absolute', left: '-29px', top: '4px', width: '10px', height: '10px', borderRadius: '9999px', backgroundColor: item.dotColor, border: '4px solid var(--color-background)' }} 
                    />
                    <div className={`font-code text-[11px] font-bold uppercase tracking-wider ${item.textColor}`}>
                      {item.date}
                    </div>
                    <h4 className="text-base font-bold text-primary font-display mt-1">{item.title}</h4>
                    <p className="text-xs text-on-surface-variant font-code uppercase tracking-wide mt-0.5">{item.subtitle}</p>
                    <p className="text-sm font-body-sm text-on-surface-variant mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}

              </div>
            )}
          </div>

          {/* Development Capability Distribution bars */}
          <div style={{ display: 'block' }} className="lg:col-span-1">
            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface-variant" style={{ marginBottom: '24px' }}>
              Technical Experience Focus
            </h3>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-5 space-y-5 shadow-sm" style={{ display: 'block' }}>
              
              <div style={{ display: 'block' }}>
                <div className="flex justify-between font-code text-xs uppercase tracking-wider mb-2">
                  <span className="text-primary font-medium">Machine Learning</span>
                  <span className="text-on-surface-variant opacity-80">Ongoing</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue rounded-full" style={{ width: '60%' }} />
                </div>
              </div>

              <div style={{ display: 'block' }}>
                <div className="flex justify-between font-code text-xs uppercase tracking-wider mb-2">
                  <span className="text-primary font-medium">Full-Stack & Mobile</span>
                  <span className="text-on-surface-variant opacity-80">92%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-accent-orange rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}