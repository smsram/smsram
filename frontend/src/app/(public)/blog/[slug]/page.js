"use client";
import { use, useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import UniversalDetailPage from '@/components/UniversalDetailPage';
import Loader from '@/components/Loader';

export default function BlogDetailPage({ params }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [assetData, setAssetData] = useState(null);
  const [connectedAssets, setConnectedAssets] = useState([]);

  const structuralNavigationMap = useMemo(() => {
    return { label: "Back to all transmissions", url: "/blog" };
  }, []);

  useEffect(() => {
    async function pullDetailedArticleTrace() {
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
        console.error("Failed to map dynamic article page vectors:", err);
      } finally {
        setIsLoading(false);
      }
    }
    pullDetailedArticleTrace();
  }, [slug]);

  if (isLoading) return <Loader fullScreen={true} size="lg" />;
  if (!assetData) return <div className="py-20 text-center text-on-surface-variant font-display text-sm">Transmission log record not located.</div>;

  let parsedMeta = {};
  try { parsedMeta = typeof assetData.metadata === 'string' ? JSON.parse(assetData.metadata) : assetData.metadata; } catch(e){}
  
  let parsedTags = [];
  try { parsedTags = typeof assetData.tags === 'string' ? JSON.parse(assetData.tags) : assetData.tags; } catch(e){}

  // Format Compact Pill Badges (Short inline trackers layout)
  const highlightItems = [];
  if (parsedMeta?.author) highlightItems.push({ label: "Author", value: parsedMeta.author, icon: "person" });
  if (parsedMeta?.read_time) highlightItems.push({ label: "Read Time", value: parsedMeta.read_time, icon: "schedule" });
  if (parsedMeta?.status) highlightItems.push({ label: "Status", value: parsedMeta.status, icon: "info" });

  return (
    <UniversalDetailPage
      title={assetData.title}
      tags={parsedTags}
      accentColor="#f57f15" 
      summary={parsedMeta?.summary}
      content={parsedMeta?.content} 
      highlightItems={highlightItems}
      actionLinks={[]} // Blog relies purely on internal markdown structures instead of static urls
      connectedAssets={connectedAssets}
      backUrl={structuralNavigationMap.url}
      backLabel={structuralNavigationMap.label}
    />
  );
}