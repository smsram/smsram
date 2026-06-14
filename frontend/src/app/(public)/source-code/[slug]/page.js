"use client";
import { use, useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import UniversalDetailPage from '@/components/UniversalDetailPage';
import Loader from '@/components/Loader';

export default function SourceCodeDetailPage({ params }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [assetData, setAssetData] = useState(null);
  const [connectedAssets, setConnectedAssets] = useState([]);

  const structuralNavigationMap = useMemo(() => {
    return { label: "Back to repository database", url: "/source-code" };
  }, []);

  useEffect(() => {
    async function pullDetailedCodebaseTrace() {
      setIsLoading(true);
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
      
      try {
        // 1. Fetch individual codebase asset metrics configuration definitions
        const detailsRes = await fetch(`${serverUrl}/api/assets/${slug}`);
        const detailsPayload = await detailsRes.json();
        
        if (detailsPayload.success && detailsPayload.data) {
          const coreNode = detailsPayload.data;
          setAssetData(coreNode);

          // 2. Query symmetrical layout visibility graph references map list array
          const connectionsRes = await fetch(`${serverUrl}/api/connections/${coreNode.id}`);
          const connectionsPayload = await connectionsRes.json();
          const linkedNodes = connectionsPayload?.data || [];

          const accentLoopSequence = ["#730697", "#03b5ff", "#f57f15"];
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
        console.error("Failed to map code-vault dynamic vectors:", err);
      } finally {
        setIsLoading(false);
      }
    }
    pullDetailedCodebaseTrace();
  }, [slug]);

  if (isLoading) return <Loader fullScreen={true} size="lg" />;
  if (!assetData) return <div className="py-20 text-center text-on-surface-variant font-display text-sm">Repository parameters not found inside workspace bounds.</div>;

  let parsedMeta = {};
  try { parsedMeta = typeof assetData.metadata === 'string' ? JSON.parse(assetData.metadata) : assetData.metadata; } catch(e){}
  
  let parsedTags = [];
  try { parsedTags = typeof assetData.tags === 'string' ? JSON.parse(assetData.tags) : assetData.tags; } catch(e){}

  // Format Action Button Vectors Link arrays
  const actionLinks = [];
  if (parsedMeta?.repo_url) actionLinks.push({ label: 'Explore Source Code', url: parsedMeta.repo_url, icon: 'code' });
  if (parsedMeta?.github_url && parsedMeta?.github_url !== parsedMeta?.repo_url) {
    actionLinks.push({ label: 'GitHub Mirror Mirror', url: parsedMeta.github_url, icon: 'terminal' });
  }

  // Format Compact Pill Badges (Short inline trackers layout)
  const highlightItems = [];
  if (parsedMeta?.language) highlightItems.push({ label: "Language Base", value: parsedMeta.language, icon: "code_blocks" });
  if (parsedMeta?.status) highlightItems.push({ label: "Ecosystem Status", value: parsedMeta.status, icon: "analytics" });

  return (
    <UniversalDetailPage
      title={assetData.title}
      tags={parsedTags}
      accentColor="#730697" // High-contrast purple vault code signature accent color
      summary={parsedMeta?.summary}
      content={parsedMeta?.content} // Deep markdown details content body mapping parsing cleanly
      highlightItems={highlightItems}
      actionLinks={actionLinks}
      connectedAssets={connectedAssets}
      backUrl={structuralNavigationMap.url}
      backLabel={structuralNavigationMap.label}
    />
  );
}