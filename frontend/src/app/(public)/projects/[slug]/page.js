"use client";
import { use, useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import UniversalDetailPage from '@/components/UniversalDetailPage';
import Loader from '@/components/Loader';

export default function PublicDetailPage({ params }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [assetData, setAssetData] = useState(null);
  const [connectedAssets, setConnectedAssets] = useState([]);

  const structuralNavigationMap = useMemo(() => {
    if (pathname.includes('/videos/')) return { label: "Back to broadcasts", url: "/videos" };
    if (pathname.includes('/source-code/')) return { label: "Back to source directories", url: "/source-code" };
    if (pathname.includes('/blog/')) return { label: "Back to transmissions", url: "/blog" };
    if (pathname.includes('/services/')) return { label: "Back to utilities", url: "/services" };
    return { label: "Back to projects overview", url: "/projects" };
  }, [pathname]);

  useEffect(() => {
    async function pullDetailedEcosystemTrace() {
      setIsLoading(true);
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
      
      try {
        const detailsRes = await fetch(`${serverUrl}/api/assets/${slug}`);
        const detailsPayload = await detailsRes.json();
        
        if (detailsPayload.success && detailsPayload.data) {
          const coreNode = detailsPayload.data;
          setAssetData(coreNode);

          const connectionsRes = await fetch(`${serverUrl}/api/connections/${coreNode.id}`);
          const connectionsPayload = await connectionsRes.json();
          const linkedNodes = connectionsPayload?.data || [];

          const accentLoopSequence = ["#f57f15", "#03b5ff", "#730697"];
          const normalizedConnections = linkedNodes.map((item, index) => {
            let meta = {};
            try { meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; } catch(e){}
            let tagsArr = [];
            try { tagsArr = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags; } catch(e){}

            const pathwayMap = { PROJECT: 'projects', VIDEO: 'videos', SOURCE: 'source-code', BLOG: 'blog', SERVICE: 'services' };
            const relativePath = pathwayMap[item.type] || 'projects';

            return {
              title: item.title,
              description: meta?.summary || 'No structural overview trace parameters saved.',
              tags: Array.isArray(tagsArr) ? tagsArr : [],
              accentColor: accentLoopSequence[index % accentLoopSequence.length],
              href: `/${relativePath}/${item.slug}`
            };
          });

          setConnectedAssets(normalizedConnections);
        }
      } catch (err) {
        console.error("Failed to map dynamic content page vectors", err);
      } finally {
        setIsLoading(false);
      }
    }
    pullDetailedEcosystemTrace();
  }, [slug]);

  if (isLoading) return <Loader fullScreen={true} size="lg" />;
  if (!assetData) return <div className="py-20 text-center text-on-surface-variant font-display text-sm">Asset node parameters not found in the infrastructure bounds.</div>;

  let parsedMeta = {};
  try { parsedMeta = typeof assetData.metadata === 'string' ? JSON.parse(assetData.metadata) : assetData.metadata; } catch(e){}
  
  let parsedTags = [];
  try { parsedTags = typeof assetData.tags === 'string' ? JSON.parse(assetData.tags) : assetData.tags; } catch(e){}

  // 1. EXTRACT LINKS AS ACTION BUTTONS
  const actionLinks = [];
  if (parsedMeta?.website_url) actionLinks.push({ label: 'Visit Live Site', url: parsedMeta.website_url, icon: 'public' });
  if (parsedMeta?.github_url) actionLinks.push({ label: 'GitHub Repository', url: parsedMeta.github_url, icon: 'code' });
  if (parsedMeta?.repo_url && !parsedMeta?.github_url) actionLinks.push({ label: 'Source Code', url: parsedMeta.repo_url, icon: 'data_object' });
  if (parsedMeta?.endpoint_url) actionLinks.push({ label: 'API Endpoint', url: parsedMeta.endpoint_url, icon: 'api' });
  if (parsedMeta?.documentation_url) actionLinks.push({ label: 'Documentation', url: parsedMeta.documentation_url, icon: 'menu_book' });

  // 2. EXTRACT TEXT METRICS AS HIGHLIGHT PILLS
  const highlightItems = [];
  if (parsedMeta?.status) highlightItems.push({ label: "Production Status", value: parsedMeta.status, icon: "info" });
  if (parsedMeta?.api_status) highlightItems.push({ label: "System Health", value: parsedMeta.api_status, icon: "settings_ethernet" });
  if (parsedMeta?.author) highlightItems.push({ label: "Author", value: parsedMeta.author, icon: "person" });
  if (parsedMeta?.read_time) highlightItems.push({ label: "Read Time", value: parsedMeta.read_time, icon: "schedule" });
  if (parsedMeta?.duration) highlightItems.push({ label: "Duration", value: parsedMeta.duration, icon: "timer" });
  if (parsedMeta?.language) highlightItems.push({ label: "Language", value: parsedMeta.language, icon: "code_blocks" });

  const watchVideoUrlId = parsedMeta?.youtube_id ? `https://www.youtube.com/embed/${parsedMeta.youtube_id}` : null;

  return (
    <UniversalDetailPage 
      title={assetData.title}
      tags={parsedTags}
      accentColor="#f57f15"
      summary={parsedMeta?.summary}
      content={parsedMeta?.content} 
      highlightItems={highlightItems}
      actionLinks={actionLinks}
      videoUrl={watchVideoUrlId}
      connectedAssets={connectedAssets}
      backUrl={structuralNavigationMap.url}
      backLabel={structuralNavigationMap.label}
    />
  );
}