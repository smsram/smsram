"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DirectoryCard from '@/components/DirectoryCard';
import Skeleton from '@/components/Skeleton';

// Smooth Scroll Reveal Component Wrapper
function ScrollReveal({ children, delay = "0ms" }) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) observer.unobserve(currentElement);
    };
  }, []);

  return (
    <div
      ref={elementRef}
      style={{ transitionDelay: delay }}
      className={`transition-all duration-1000 ease-out transform w-full ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}

export default function PortfolioLandingPage() {
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Fetch featured production builds
  useEffect(() => {
    async function fetchLatestProjects() {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
      try {
        const res = await fetch(`${serverUrl}/api/assets?type=PROJECT&limit=4`);
        const payload = await res.json();
        
        if (payload.success && payload.data) {
          const formattedProjects = payload.data.map((asset, index) => {
            const accentLoopSequence = ["#f57f15", "#03b5ff", "#730697"];
            let parsedMeta = {};
            try { parsedMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}
            let parsedTags = [];
            try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}

            return {
              id: asset.id,
              title: asset.title,
              description: parsedMeta?.summary || 'No description layout metrics declared.',
              tags: Array.isArray(parsedTags) ? parsedTags : [],
              slug: asset.slug,
              accentColor: accentLoopSequence[index % accentLoopSequence.length],
              image: parsedMeta?.thumbnail_url || null
            };
          });
          setFeaturedProjects(formattedProjects);
        }
      } catch (err) {
        console.error("Failed to sync featured portfolio assets:", err);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    fetchLatestProjects();
  }, []);

  // Technologies configured with official Devicon SVG CDN paths
  const techStack = [
    { name: "Python", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg" },
    { name: "PyTorch", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pytorch/pytorch-original.svg" },
    { name: "Next.js", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg", invert: true },
    { name: "React Native", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" },
    { name: "Node.js", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" },
    { name: "Docker", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg" },
    { name: "SQLite", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlite/sqlite-original.svg" },
    { name: "Prisma", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prisma/prisma-original.svg", invert: true },
    { name: "TypeScript", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" },
    { name: "Tailwind CSS", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg" },
    { name: "Linux", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg" },
    { name: "Git", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg" }
  ];

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto font-display relative selection:bg-accent-blue/30 bg-background text-on-background">
      
      {/* Background Matrix & Flowing Gradient Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scrollMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-marquee-stream {
          animation: scrollMarquee 45s linear infinite;
        }
        .hover-pause:hover {
          animation-play-state: paused;
        }
        .bg-dashboard-grid {
          background-image: radial-gradient(var(--color-outline-variant) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.3;
        }
        .animate-gradient-text {
          background-size: 200% auto;
          animation: gradientFlow 5s ease infinite;
        }
      `}} />

      {/* Structured Minimal Background Matrix Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-dashboard-grid [mask-image:linear-gradient(to_bottom,white,transparent_90%)]" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col min-h-full">
        
        {/* ========================================================
            1. HERO SECTION
        ======================================================== */}
        <ScrollReveal>
          <section className="pt-28 pb-20 w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            <div className="md:col-span-7 lg:col-span-8 text-center md:text-left flex flex-col items-center md:items-start w-full whitespace-normal break-normal">
              
              <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold text-primary tracking-tighter leading-[1.05] w-full">
                Software & <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-orange via-accent-purple to-accent-blue animate-gradient-text">
                  Machine Learning
                </span><br className="hidden lg:block" /> Engineer.
              </h1>
              
              <p className="text-lg sm:text-xl font-body text-on-surface-variant max-w-2xl leading-relaxed mt-6 mb-10 mx-auto md:mx-0 w-full whitespace-normal break-words">
                Hi, I'm <b className="text-primary">Meher Siva Ram Sorampudi</b>. I build high-performance full-stack architectures and design automated data pipelines for predictive intelligence models.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link href="/dashboard" className="w-full sm:w-auto h-12 px-8 bg-primary text-on-primary font-display font-bold text-sm uppercase tracking-widest rounded shadow-sm hover:opacity-90 transition-all flex items-center justify-center no-underline gap-2">
                  <span className="material-symbols-outlined text-[20px]">query_stats</span>
                  View Dashboard
                </Link>
                <Link href="/projects" className="w-full sm:w-auto h-12 px-8 bg-surface-container-lowest border border-outline-variant text-primary hover:border-primary font-display font-bold text-sm uppercase tracking-widest rounded shadow-xs transition-all flex items-center justify-center no-underline">
                  Explore Work
                </Link>
              </div>
            </div>

            {/* Right Graphics Frame */}
            <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-end w-full relative">
              <div className="w-56 sm:w-64 lg:w-80 aspect-square rounded-2xl overflow-hidden border-2 border-outline-variant shadow-2xl bg-surface-container p-2 relative z-10 hover:scale-105 transition-transform duration-500">
                <img src="/smsram.jpg" alt="Meher Siva Ram" className="w-full h-full object-cover rounded-xl border border-outline-variant" />
              </div>
              <div className="absolute inset-0 bg-accent-purple/30 blur-3xl rounded-full -z-10 transform translate-y-6 opacity-50" />
            </div>

          </section>
        </ScrollReveal>

        {/* ========================================================
            2. SMOOTH SCROLLING TECH MARQUEE 
        ======================================================== */}
        <section className="mb-24 overflow-hidden relative w-full opacity-95">
          <div className="absolute left-0 top-0 w-12 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 w-12 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          <div className="flex w-max animate-marquee-stream hover-pause">
            {[...techStack, ...techStack].map((tech, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-3 px-6 py-3.5 mx-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs shrink-0 transition-colors hover:border-primary cursor-default"
              >
                <img 
                  src={tech.icon} 
                  alt={tech.name} 
                  className="w-5 h-5 object-contain"
                  style={tech.invert ? { filter: 'var(--invert-icon, none)' } : {}}
                />
                <span className="font-code font-bold text-primary text-xs uppercase tracking-wider">{tech.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            3. ABOUT ME SECTION
        ======================================================== */}
        <ScrollReveal>
          <section className="mb-24 text-left w-full">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-sm w-full">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-blue" />
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent-blue/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-accent-blue text-[20px]">person</span>
                <h3 className="font-code text-xs uppercase tracking-widest font-bold text-on-surface-variant">Profile</h3>
              </div>
              
              <div className="font-body text-sm sm:text-base text-on-surface-variant max-w-4xl leading-relaxed space-y-4 w-full whitespace-normal break-words">
                <p>
                  My core development competencies reside in launching end-to-end full-stack websites and Android applications integrated with AI, utilizing systems like <span className="text-primary font-bold">Next.js, Node.js, React Native, and Docker</span>.
                </p>
                <p>
                  I am currently advancing my engineering targets to become a <span className="text-primary font-bold">Machine Learning Engineer</span>. I focus on training computer vision systems, tuning matrix weights, and parsing data sequences down client-side via optimized computational wrappers.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-outline-variant/60">
                <Link href="/about" className="inline-flex items-center gap-1.5 font-code text-[11px] uppercase tracking-wider text-accent-blue font-bold hover:text-primary transition-colors no-underline group">
                  Read Core Timeline Documentation
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
                </Link>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ========================================================
            4. RECENT PROJECTS SECTION
        ======================================================== */}
        <ScrollReveal>
          <section className="mb-32 text-left w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 w-full">
              <div style={{ display: 'block' }}>
                <h3 className="font-display text-3xl md:text-4xl font-bold text-primary tracking-tight">Recent Projects</h3>
                <p className="text-on-surface-variant font-code text-xs uppercase tracking-wider opacity-80 mt-1.5">
                  Latest builds registered within the matrix database
                </p>
              </div>
              <Link href="/projects" className="h-10 px-5 bg-surface-container-lowest border border-outline-variant text-primary font-code text-xs uppercase tracking-wider font-bold rounded shadow-xs hover:bg-surface-container transition-colors flex items-center gap-2 w-max no-underline">
                <span>View Full Index</span>
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {isLoadingProjects ? (
                <>
                  <Skeleton className="h-[200px] w-full" />
                  <Skeleton className="h-[200px] w-full" />
                </>
              ) : featuredProjects.length === 0 ? (
                <div className="col-span-1 md:col-span-2 py-16 text-center text-on-surface-variant font-code text-xs italic border border-dashed border-outline-variant rounded-xl w-full">
                  No verified system items synchronized inside chosen ledger limits.
                </div>
              ) : (
                featuredProjects.map((project, index) => (
                  <div 
                    key={project.id}
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full"
                    style={{ animationFillMode: 'both', animationDelay: `${index * 150}ms` }}
                  >
                    <DirectoryCard 
                      title={project.title}
                      description={project.description}
                      tags={project.tags}
                      accentColor={project.accentColor}
                      image={project.image}
                      href={`/projects/${project.slug}`}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* ========================================================
            5. FIXED SYSTEM CALL TO ACTION PANEL
        ======================================================== */}
        <ScrollReveal>
          <section className="mb-20 w-full block">
            {/* Block-level outer layout deck centered via auto margins */}
            <div className="w-full max-w-[800px] mx-auto bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 sm:p-12 md:p-16 text-center shadow-sm relative overflow-hidden block">
              
              {/* Decorative Gradient Glow Orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-orange/10 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-purple/10 blur-3xl rounded-full pointer-events-none" />
              
              {/* Icon Wrapper Context */}
              <div className="relative z-10 mb-4 block text-center">
                <span className="material-symbols-outlined text-4xl text-accent-orange inline-block">handshake</span>
              </div>
              
              {/* Call to Action Section Heading */}
              <h3 className="font-display text-3xl md:text-4xl font-bold text-primary tracking-tight relative z-10 mb-4 block w-full text-center">
                Let's Build Something Together
              </h3>
              
              {/* FIXED: Explicitly forced block display with min-width rules stops compression wrapping anomalies completely */}
              <p className="text-on-surface-variant font-body text-base md:text-lg mb-8 leading-relaxed relative z-10 mx-auto block w-full max-w-xl text-center min-w-full sm:min-w-[500px] tracking-normal whitespace-normal break-normal word-break-normal">
                Interested in working together or have a question? Feel free to reach out and establish a connection.
              </p>
              
              {/* Dynamic Action Interaction Link Gateway Button */}
              <div className="relative z-10 block w-full text-center">
                <Link href="/contact" className="h-11 px-6 bg-primary text-on-primary font-display font-bold text-xs uppercase tracking-widest rounded shadow-sm hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 no-underline">
                  <span>Contact Me</span>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </Link>
              </div>

            </div>
          </section>
        </ScrollReveal>

        {/* ========================================================
            6. FOOTER 
        ======================================================== */}
        <footer className="mt-auto border-t border-outline-variant pt-8 pb-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left opacity-90 text-xs font-code uppercase tracking-wider w-full">
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-primary tracking-wide text-sm normal-case">Meher Siva Ram Sorampudi</span>
            <span className="text-on-surface-variant text-[10px] tracking-widest mt-0.5">© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-6 font-bold">
            <Link href="/about" className="text-on-surface-variant hover:text-primary transition-colors no-underline">About</Link>
            <Link href="/source-code" className="text-on-surface-variant hover:text-primary transition-colors no-underline">Code</Link>
            <Link href="/contact" className="text-on-surface-variant hover:text-primary transition-colors no-underline">Contact</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}