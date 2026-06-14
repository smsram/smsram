"use client";
import { use, useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import UniversalDetailPage from '@/components/UniversalDetailPage';
import Loader from '@/components/Loader';

export default function ServiceDetailPage({ params }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [assetData, setAssetData] = useState(null);
  const [connectedAssets, setConnectedAssets] = useState([]);

  const structuralNavigationMap = useMemo(() => {
    return { label: "Back to web utilities console", url: "/services" };
  }, []);

  useEffect(() => {
    async function pullDetailedServiceTrace() {
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

          const accentLoopSequence = ["#03b5ff", "#730697", "#f57f15"];
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
        console.error("Failed to map dynamic utility page configurations:", err);
      } finally {
        setIsLoading(false);
      }
    }
    pullDetailedServiceTrace();
  }, [slug]);

  if (isLoading) return <Loader fullScreen={true} size="lg" />;
  if (!assetData) return <div className="py-20 text-center text-on-surface-variant font-display text-sm">Microservice endpoint parameters not found on storage limits.</div>;

  let parsedMeta = {};
  try { parsedMeta = typeof assetData.metadata === 'string' ? JSON.parse(assetData.metadata) : assetData.metadata; } catch(e){}
  
  let parsedTags = [];
  try { parsedTags = typeof assetData.tags === 'string' ? JSON.parse(assetData.tags) : assetData.tags; } catch(e){}

  // Distribute active system routes into Action Link array selections
  const actionLinks = [];
  if (parsedMeta?.endpoint_url) actionLinks.push({ label: 'Query Live Endpoint', url: parsedMeta.endpoint_url, icon: 'api' });
  if (parsedMeta?.documentation_url) actionLinks.push({ label: 'API Reference Documentation', url: parsedMeta.documentation_url, icon: 'menu_book' });

  // Distribute simple statuses into tracking badges rows
  const highlightItems = [];
  if (parsedMeta?.api_status) highlightItems.push({ label: "Utility Health", value: parsedMeta.api_status, icon: "settings_ethernet" });
  if (parsedMeta?.status && parsedMeta?.status !== parsedMeta?.api_status) {
    highlightItems.push({ label: "Deployment State", value: parsedMeta.status, icon: "info" });
  }

  return (
    <UniversalDetailPage
      title={assetData.title}
      tags={parsedTags}
      accentColor="#03b5ff" 
      summary={parsedMeta?.summary}
      content={parsedMeta?.content}
      highlightItems={highlightItems}
      actionLinks={actionLinks}
      connectedAssets={connectedAssets}
      backUrl={structuralNavigationMap.url}
      backLabel={structuralNavigationMap.label}
    />
  );
}