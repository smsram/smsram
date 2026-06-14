"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import DirectoryCard from '@/components/DirectoryCard';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import Skeleton from '@/components/Skeleton';

export default function ServicesPage() {
  const pathname = usePathname();
  const observerTargetRef = useRef(null);

  const [rawAssets, setRawAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const directoryMeta = useMemo(() => {
    return {
      title: "Public Utilities",
      sub: "Interactive web micro-tools, secure sandboxes, and developer helper automation containers directory",
      path: "services",
      type: "SERVICE"
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
        stack: selectedStatus
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
      console.error("Failed to query operational services:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [directoryMeta.type, searchQuery, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
    fetchInventoryBatch(1, true);
  }, [searchQuery, selectedStatus, fetchInventoryBatch]);

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

  const statusOptions = useMemo(() => {
    const uniqueTags = new Set();
    rawAssets.forEach(asset => {
      let parsedTags = [];
      try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}
      if (Array.isArray(parsedTags)) {
        parsedTags.forEach(tag => { if (tag) uniqueTags.add(tag.trim()); });
      }
    });

    return [
      { value: 'ALL', label: 'All Utilities' },
      ...Array.from(uniqueTags).sort().map(tag => ({ value: tag, label: tag }))
    ];
  }, [rawAssets]);

  const processedCardsList = useMemo(() => {
    const accentLoopSequence = ["#03b5ff", "#730697", "#f57f15"];

    return rawAssets.map((asset, index) => {
      let parsedMeta = {};
      try { parsedMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}
      
      let parsedTags = [];
      try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}

      return {
        id: asset.id,
        title: asset.title,
        description: parsedMeta?.summary || 'No operational scope parameters configured for this runtime service utility.',
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
                placeholder="Search open operational software tools..."
                style={{ height: '44px', marginTop: 0 }}
              />
            </div>

            <div style={{ display: 'block' }} className="w-full sm:w-[220px] shrink-0">
              <Dropdown 
                options={statusOptions}
                selectedValue={selectedStatus}
                onChange={(value) => setSelectedStatus(value)}
                labelPrefix="Scope:"
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
              No online automation tools map inside active directory filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in fade-in duration-300">
                {processedCardsList.map((item) => (
                  <DirectoryCard 
                    key={item.id}
                    title={item.title}
                    description={item.description}
                    tags={item.tags}
                    accentColor={item.accentColor}
                    href={`/${directoryMeta.path}/${item.slug}`}
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