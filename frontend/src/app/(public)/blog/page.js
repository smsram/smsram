"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import DirectoryCard from '@/components/DirectoryCard';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import Skeleton from '@/components/Skeleton';

export default function BlogPage() {
  const pathname = usePathname();
  const observerTargetRef = useRef(null);

  const [rawAssets, setRawAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('ALL');

  const directoryMeta = useMemo(() => {
    return {
      title: "Technical Transmissions",
      sub: "Systems architecture blueprints, performance notes, and telemetry log breakdowns",
      path: "blog",
      type: "BLOG"
    };
  }, []);

  const fetchInventoryBatch = useCallback(async (pageToLoad, isNewSearch = false) => {
    if (isNewSearch) setIsLoading(true);
    else setIsLoadingMore(true);

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://localhost:5000';
    const limit = 20;
    
    try {
      const urlParams = new URLSearchParams({
        type: directoryMeta.type,
        page: pageToLoad,
        limit: limit,
        search: searchQuery,
        stack: selectedTopic
      });

      const res = await fetch(`${serverUrl}/api/assets?${urlParams.toString()}`);
      const payload = await res.json();
      const nextRecords = payload?.data || [];

      if (isNewSearch) {
        setRawAssets(nextRecords);
      } else {
        setRawAssets(prev => [...prev, ...nextRecords]);
      }

      setHasMoreData(nextRecords.length === limit);
    } catch (err) {
      console.error("Failed to fetch paginated transmissions:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [directoryMeta.type, searchQuery, selectedTopic]);

  useEffect(() => {
    setCurrentPage(1);
    fetchInventoryBatch(1, true);
  }, [searchQuery, selectedTopic, fetchInventoryBatch]);

  useEffect(() => {
    if (isLoading || !hasMoreData || isLoadingMore) return;

    const observerInstance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchInventoryBatch(nextPage, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) observerInstance.observe(currentTarget);

    return () => {
      if (currentTarget) observerInstance.unobserve(currentTarget);
    };
  }, [currentPage, hasMoreData, isLoading, isLoadingMore, fetchInventoryBatch]);

  const topicOptions = useMemo(() => {
    const uniqueTags = new Set();
    rawAssets.forEach(asset => {
      let parsedTags = [];
      try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}
      if (Array.isArray(parsedTags)) {
        parsedTags.forEach(tag => { if (tag) uniqueTags.add(tag.trim()); });
      }
    });

    return [
      { value: 'ALL', label: 'All Transmissions' },
      ...Array.from(uniqueTags).sort().map(tag => ({ value: tag, label: tag }))
    ];
  }, [rawAssets]);

  const processedCardsList = useMemo(() => {
    const accentLoopSequence = ["#f57f15", "#03b5ff", "#730697"];

    return rawAssets.map((asset, index) => {
      let parsedMeta = {};
      try { parsedMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}
      
      let parsedTags = [];
      try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}

      return {
        id: asset.id,
        title: asset.title,
        description: parsedMeta?.summary || 'No overview summary parameters saved for this article node.',
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        slug: asset.slug,
        accentColor: accentLoopSequence[index % accentLoopSequence.length]
      };
    });
  }, [rawAssets]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-12 animate-in fade-in duration-300 font-display">
      <div className="max-w-[1400px] mx-auto mt-10 flex flex-col gap-6">
        
        <div style={{ display: 'block' }} className="text-left">
          <h2 className="font-display text-3xl font-bold text-primary tracking-tight">{directoryMeta.title}</h2>
          <p className="text-on-surface-variant text-xs mt-1 uppercase tracking-widest opacity-70">
            {directoryMeta.sub}
          </p>
        </div>

        <div style={{ display: 'block' }} className="w-full">
          <div style={{ display: 'flex' }} className="items-center gap-4 w-full flex-col sm:flex-row">
            
            <div style={{ display: 'block' }} className="w-full sm:flex-1">
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chronological article transmissions..."
                style={{ height: '44px', marginTop: 0 }}
              />
            </div>

            <div style={{ display: 'block' }} className="w-full sm:w-[220px] shrink-0">
              <Dropdown 
                options={topicOptions}
                selectedValue={selectedTopic}
                onChange={(value) => setSelectedTopic(value)}
                labelPrefix="Topic:"
              />
            </div>

          </div>
        </div>

        <div style={{ display: 'block' }} className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <Skeleton className="h-[210px] w-full" />
              <Skeleton className="h-[210px] w-full" />
              <Skeleton className="h-[210px] w-full" />
            </div>
          ) : processedCardsList.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant text-xs italic border border-dashed border-outline-variant rounded-md">
              No technical notes compiled matching selected parameters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in fade-in duration-300">
                {processedCardsList.map((article) => (
                  <DirectoryCard 
                    key={article.id}
                    title={article.title}
                    description={article.description}
                    tags={article.tags}
                    accentColor={article.accentColor}
                    href={`/${directoryMeta.path}/${article.slug}`}
                  />
                ))}
              </div>

              <div ref={observerTargetRef} className="w-full h-12 flex items-center justify-center mt-6">
                {isLoadingMore && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full opacity-60">
                    <Skeleton className="h-[210px] w-full" />
                    <Skeleton className="h-[210px] w-full" />
                    <Skeleton className="h-[210px] w-full" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}