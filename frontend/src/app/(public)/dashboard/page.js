"use client";

import { useState, useEffect } from 'react';
import Skeleton from '@/components/Skeleton';
import { socialLinks } from '@/config/socials';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [latestCommits, setLatestCommits] = useState([]);
  const [stats, setStats] = useState({
    youtube: { subs: "0", growth: "0%", videos: "0 videos" },
    github: { commits: "0", activeDays: "0 days", streak: "0 days", heatmap: [] },
    leetcode: { solved: "0", rank: "Unranked", activeDays: "0 days", streak: "0 days", heatmap: [] },
    linkedin: { impressions: "0", profileViews: "+0", growth: "0%" }
  });

  useEffect(() => {
    async function fetchMatrixTelemetry() {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
        const res = await fetch(`${serverUrl}/api/public/telemetry/dashboard`);
        const payload = await res.json();
        
        if (payload.success && payload.data) {
          const cleanNumber = (val) => {
            if (!val) return 0;
            const num = parseInt(String(val).replace(/[^0-9.-]/g, ""), 10);
            return isNaN(num) ? 0 : num;
          };

          setStats({
            youtube: {
              subs: cleanNumber(payload.data.youtube?.subs).toLocaleString(),
              videos: payload.data.youtube?.videos ? 
                (String(payload.data.youtube.videos).includes('videos') ? payload.data.youtube.videos : `${payload.data.youtube.videos} videos`) 
                : "0 videos",
              growth: payload.data.youtube?.growth || "+1.2%"
            },
            github: {
              commits: cleanNumber(payload.data.github?.commits).toLocaleString(),
              activeDays: payload.data.github?.activeDays || "0 days",
              streak: payload.data.github?.streak || "0 days",
              heatmap: payload.data.github?.heatmap || []
            },
            leetcode: {
              solved: payload.data.leetcode?.solved || "0",
              rank: payload.data.leetcode?.rank || "Unranked",
              activeDays: payload.data.leetcode?.activeDays || "0 days",
              streak: payload.data.leetcode?.streak || "0 days",
              heatmap: payload.data.leetcode?.heatmap || []
            },
            linkedin: {
              impressions: payload.data.linkedin?.impressions || "12.4K",
              profileViews: String(payload.data.linkedin?.profile_views || payload.data.linkedin?.profileViews || "0").includes('profile') ? 
                (payload.data.linkedin?.profile_views || payload.data.linkedin?.profileViews) : 
                `+${payload.data.linkedin?.profile_views || payload.data.linkedin?.profileViews || 240} profile views (7d)`,
              growth: payload.data.linkedin?.growth || "+18.5%"
            }
          });

          if (payload.data.latestCommits) {
            setLatestCommits(payload.data.latestCommits);
          }
        }
      } catch (err) {
        console.error("Dashboard connection handshake failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMatrixTelemetry();
  }, []);

  const PlatformIcons = {
    youtube: (
      <svg className="w-5 h-5 fill-[#FF0000]" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    github: (
      <svg className="w-5 h-5 fill-current text-primary" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.061.069-.061 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
    leetcode: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_iconCarrier">
          <title>LeetCode icon</title>
          <path className="fill-current text-primary" d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.645 1.837-.645s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.055 5.055 0 0 0-2.445-1.337l2.467-2.503c.516-.514.498-1.366-.037-1.901-.535-.535-1.387-.552-1.902-.038l-10.1 10.101c-.981.982-1.494 2.337-1.494 3.835 0 1.498.513 2.895 1.494 3.875l4.347 4.361c.981.979 2.337 1.452 3.834 1.452s2.853-.512 3.835-1.494l2.609-2.637c.514-.514.496-1.365-.039-1.9s-1.386-.553-1.899-.039z"/>
          <path fill="#FFA116" d="M20.811 13.01H10.666c-.702 0-1.27.604-1.27 1.346s.568 1.346 1.27 1.346h10.145c.701 0 1.27-.604 1.27-1.346s-.569-1.346-1.27-1.346z"/>
        </g>
      </svg>
    )
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-margin-desktop pb-margin-desktop animate-in fade-in duration-300 bg-background text-on-background">
      
      {/* Structural layout rules: Strips standard webkit rendering bar from horizontal maps */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <div className="max-w-[1200px] mx-auto mt-lg flex flex-col gap-8">
        
        <div>
          <h2 className="font-display text-headline-lg font-bold text-primary">Command Center</h2>
          <p className="text-on-surface-variant font-code text-xs mt-1 uppercase tracking-widest opacity-80">Synced Matrix Analytics Dashboard</p>
        </div>

        {/* Analytics Summary 3-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          
          {/* YouTube Node */}
          <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md relative overflow-hidden shadow-sm hover:border-accent-orange/40 transition-all duration-300 block group">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent-orange" />
            <div className="flex justify-between items-center text-on-surface-variant mb-2">
              <span className="font-code text-[11px] uppercase tracking-widest font-bold group-hover:text-primary transition-colors">YouTube Hub</span>
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">{PlatformIcons.youtube}</div>
            </div>
            {isLoading ? <Skeleton className="h-8 w-24 mt-2" /> : (
              <>
                <div className="text-2xl font-bold text-primary tracking-tight font-display animate-in fade-in zoom-in-95 duration-500">{stats.youtube.subs}</div>
                <div className="flex flex-col gap-0.5 mt-2 text-xs font-code text-on-surface-variant">
                  <span className="text-green-600 font-bold">{stats.youtube.growth} this month</span>
                  <span className="opacity-70">{stats.youtube.videos}</span>
                </div>
              </>
            )}
          </a>

          {/* GitHub Node */}
          <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md relative overflow-hidden shadow-sm hover:border-accent-purple/40 transition-all duration-300 block group">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent-purple" />
            <div className="flex justify-between items-center text-on-surface-variant mb-2">
              <span className="font-code text-[11px] uppercase tracking-widest font-bold group-hover:text-primary transition-colors">GitHub Repository</span>
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">{PlatformIcons.github}</div>
            </div>
            {isLoading ? <Skeleton className="h-8 w-24 mt-2" /> : (
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-primary tracking-tight font-display animate-in fade-in zoom-in-95 duration-500">{stats.github.commits}</div>
                  <span className="text-[11px] font-code text-on-surface-variant opacity-70">Total Commits YTD</span>
                </div>
                <div className="w-20 h-10 mb-1 opacity-80">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <path d="M0,35 Q15,20 30,28 T60,10 T90,5 L100,8" fill="none" stroke="var(--color-accent-purple)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="100" cy="8" r="3" fill="var(--color-accent-purple)" />
                  </svg>
                </div>
              </div>
            )}
          </a>

          {/* LeetCode Node */}
          <a href={socialLinks.leetcode} target="_blank" rel="noopener noreferrer" className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md relative overflow-hidden shadow-sm hover:border-accent-blue/40 transition-all duration-300 block group">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue" />
            <div className="flex justify-between items-center text-on-surface-variant mb-2">
              <span className="font-code text-[11px] uppercase tracking-widest font-bold group-hover:text-primary transition-colors">LeetCode Space</span>
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">{PlatformIcons.leetcode}</div>
            </div>
            {isLoading ? <Skeleton className="h-8 w-24 mt-2" /> : (
              <>
                <div className="text-2xl font-bold text-primary tracking-tight font-display animate-in fade-in zoom-in-95 duration-500">{stats.leetcode.solved}</div>
                <div className="flex flex-col gap-0.5 mt-2 text-xs font-code text-on-surface-variant">
                  <span className="text-accent-blue font-bold">Total Algorithms Solved</span>
                  <span className="opacity-70">Global Rank: {stats.leetcode.rank}</span>
                </div>
              </>
            )}
          </a>

        </div>

        {/* Heatmaps Layout Container */}
        <div className="grid grid-cols-1 gap-lg">
          
          {/* GitHub Monthly Layout Panel */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm text-left">
            <div className="flex items-center gap-sm border-b border-outline-variant pb-sm mb-md">
              <span className="material-symbols-outlined text-accent-purple text-[20px]">insights</span>
              <h3 className="font-display font-bold text-primary text-sm uppercase tracking-wider">GitHub Activity Matrix</h3>
            </div>
            {isLoading ? (
              <div className="space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></div>
            ) : stats.github.heatmap && stats.github.heatmap.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-sm font-body-sm text-on-surface-variant">Active Days (YTD): <b className="text-primary font-code ml-1">{stats.github.activeDays}</b></span>
                  <span className="font-code text-xs font-bold text-accent-purple bg-accent-purple/5 border border-accent-purple/20 px-2 py-0.5 rounded">Streak: {stats.github.streak}</span>
                </div>
                
                {/* 12 Split Month Matrix Deck - Matched directly to your custom image specification */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-2 bg-surface rounded-md border border-outline-variant/60">
                  {stats.github.heatmap.map((m, idx) => (
                    <div 
                      key={m.month} 
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                      className="flex flex-col gap-1.5 p-2 bg-surface-container-lowest border border-outline-variant/40 rounded scale-98 hover:scale-102 transition-all duration-300 shadow-2xs animate-in fade-in zoom-in-95"
                    >
                      <span className="font-code text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-80 border-b border-outline-variant/30 pb-0.5 mb-1 text-center">{m.month}</span>
                      <div className="grid grid-cols-7 gap-[3px] justify-center mx-auto">
                        {m.days?.map((day, dIdx) => {
                          const colorMap = [
                            'bg-outline-variant/20 dark:bg-neutral-800',
                            'bg-accent-purple/20',
                            'bg-accent-purple/40',
                            'bg-accent-purple/70',
                            'bg-accent-purple'
                          ];
                          return (
                            <div 
                              key={`gh-${m.month}-${dIdx}`} 
                              title={`${day.date}: ${day.count} contributions`}
                              className={`w-[11px] h-[11px] rounded-[1px] transition-all duration-200 hover:scale-125 cursor-crosshair ${colorMap[day.intensity || 0]}`} 
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-code text-on-surface-variant italic opacity-60">
                No activity stream available for the current matrix session.
              </div>
            )}
          </div>

          {/* LeetCode Monthly Layout Panel */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm text-left">
            <div className="flex items-center gap-sm border-b border-outline-variant pb-sm mb-md">
              <span className="material-symbols-outlined text-accent-blue text-[20px]">military_tech</span>
              <h3 className="font-display font-bold text-primary text-sm uppercase tracking-wider">LeetCode Submission Matrix</h3>
            </div>
            {isLoading ? (
              <div className="space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></div>
            ) : stats.leetcode.heatmap && stats.leetcode.heatmap.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-sm font-body-sm text-on-surface-variant">Practice Days (YTD): <b className="text-primary font-code ml-1">{stats.leetcode.activeDays}</b></span>
                  <span className="font-code text-xs font-bold text-accent-blue bg-accent-blue/5 border border-accent-blue/20 px-2 py-0.5 rounded">Streak: {stats.leetcode.streak}</span>
                </div>
                
                {/* 12 Split Month Matrix Deck - Matched directly to your custom image specification */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-2 bg-surface rounded-md border border-outline-variant/60">
                  {stats.leetcode.heatmap.map((m, idx) => (
                    <div 
                      key={m.month} 
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                      className="flex flex-col gap-1.5 p-2 bg-surface-container-lowest border border-outline-variant/40 rounded scale-98 hover:scale-102 transition-all duration-300 shadow-2xs animate-in fade-in zoom-in-95"
                    >
                      <span className="font-code text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-80 border-b border-outline-variant/30 pb-0.5 mb-1 text-center">{m.month}</span>
                      <div className="grid grid-cols-7 gap-[3px] justify-center mx-auto">
                        {m.days?.map((day, dIdx) => {
                          const colorMap = [
                            'bg-outline-variant/20 dark:bg-neutral-800',
                            'bg-accent-blue/20',
                            'bg-accent-blue/40',
                            'bg-accent-blue/70',
                            'bg-accent-blue'
                          ];
                          return (
                            <div 
                              key={`lc-${m.month}-${dIdx}`} 
                              title={`${day.date}: ${day.count} solutions`}
                              className={`w-[11px] h-[11px] rounded-[1px] transition-all duration-200 hover:scale-125 cursor-crosshair ${colorMap[day.intensity || 0]}`} 
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-code text-on-surface-variant italic opacity-60">
                No sub-system analytical arrays found inside tracking storage.
              </div>
            )}
          </div>

        </div>

        {/* Live GitHub Commits Feed Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm text-left">
          <div className="flex items-center gap-sm border-b border-outline-variant pb-sm mb-md">
            <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
            <h3 className="font-display font-bold text-primary text-sm uppercase tracking-wider">Latest Commits</h3>
          </div>
          
          <div className="flex flex-col">
            {isLoading ? (
              <div className="space-y-4 py-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : latestCommits.length === 0 ? (
              <p className="text-xs font-code italic text-on-surface-variant p-4 text-center">No recent repository code modifications mapped.</p>
            ) : (
              <div className="divide-y divide-outline-variant/60">
                {latestCommits.map(commit => (
                  <div key={commit.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0 group">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="material-symbols-outlined text-on-surface-variant mt-0.5 text-[16px] shrink-0 group-hover:text-primary transition-colors">commit</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-body-sm text-primary font-medium truncate pr-4">{commit.message}</span>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-code text-on-surface-variant tracking-wider uppercase opacity-80">Repository:</span>
                          <a href={`/projects/${commit.slug}`} className="text-[10px] font-code text-accent-blue uppercase tracking-wider font-bold hover:underline transition-all">
                            {commit.repo}
                          </a>
                        </div>
                      </div>
                    </div>
                    <span className="font-code text-[11px] text-on-surface-variant bg-surface border border-outline-variant px-2 py-0.5 rounded shrink-0 self-start sm:self-center">
                      {commit.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}