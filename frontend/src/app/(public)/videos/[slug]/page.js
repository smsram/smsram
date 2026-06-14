"use client";
import { use, useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import UniversalDetailPage from '@/components/UniversalDetailPage';
import Loader from '@/components/Loader';

export default function VideoBroadcastPage({ params }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [assetData, setAssetData] = useState(null);
  const [connectedAssets, setConnectedAssets] = useState([]);

  const structuralNavigationMap = useMemo(() => {
    return { label: "Back to videos overview", url: "/videos" };
  }, []);

  useEffect(() => {
    async function pullDetailedVideoTrace() {
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

          const accentLoopSequence = ["#03b5ff", "#f57f15", "#730697"];
          const normalizedConnections = linkedNodes.map((item, index) => {
            let meta = {};
            try { meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; } catch(e){}
            let tagsArr = [];
            try { tagsArr = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags; } catch(e){}

            const pathwayMap = { PROJECT: 'projects', VIDEO: 'videos', SOURCE: 'source-code', BLOG: 'blog', SERVICE: 'services' };
            const relativePath = pathwayMap[item.type] || 'projects';

            return {
              title: item.title,
              description: meta?.summary || 'No structural overview parameters logged.',
              tags: Array.isArray(tagsArr) ? tagsArr : [],
              accentColor: accentLoopSequence[index % accentLoopSequence.length],
              href: `/${relativePath}/${item.slug}`
            };
          });

          setConnectedAssets(normalizedConnections);
        }
      } catch (err) {
        console.error("Failed to map dynamic video assets array profiles:", err);
      } finally {
        setIsLoading(false);
      }
    }
    pullDetailedVideoTrace();
  }, [slug]);

  if (isLoading) return <Loader fullScreen={true} size="lg" />;
  if (!assetData) return <div className="py-20 text-center text-on-surface-variant font-display text-sm">Broadcast profile element node missing in backend records mapping.</div>;

  let parsedMeta = {};
  try { parsedMeta = typeof assetData.metadata === 'string' ? JSON.parse(assetData.metadata) : assetData.metadata; } catch(e){}
  
  let parsedTags = [];
  try { parsedTags = typeof assetData.tags === 'string' ? JSON.parse(assetData.tags) : assetData.tags; } catch(e){}

  const actionLinks = [];
  if (parsedMeta?.github_url) actionLinks.push({ label: 'Get Video Source Reference', url: parsedMeta.github_url, icon: 'code' });
  if (parsedMeta?.documentation_url) actionLinks.push({ label: 'Companion Entry Documentation', url: parsedMeta.documentation_url, icon: 'menu_book' });

  const highlightItems = [];
  if (parsedMeta?.duration) highlightItems.push({ label: "Runtime Duration", value: parsedMeta.duration, icon: "timer" });
  if (parsedMeta?.status) highlightItems.push({ label: "Stream Status", value: parsedMeta.status, icon: "info" });

  const watchVideoUrlId = parsedMeta?.youtube_id ? `https://www.youtube.com/embed/${parsedMeta.youtube_id}` : null;

  return (
    <UniversalDetailPage 
      title={assetData.title}
      tags={parsedTags}
      accentColor="#03b5ff" // Dedicated sky blue stream branding color token
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