"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import DirectoryCard from '@/components/DirectoryCard';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import Skeleton from '@/components/Skeleton';

export default function SourceCodePage() {
  const pathname = usePathname();
  const observerTargetRef = useRef(null);

  // Infinite Scroll & Data States
  const [rawAssets, setRawAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');

  // Dynamically resolve directory identity traits mapping from active route parameters
  const directoryMeta = useMemo(() => {
    return {
      title: "Source Code Vault",
      sub: "Open-source core repositories, algorithm kernels, and microservices engines directory",
      path: "source-code",
      type: "SOURCE"
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
        stack: selectedLanguage
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
      console.error("Failed to query paginated code vault entries:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [directoryMeta.type, searchQuery, selectedLanguage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchInventoryBatch(1, true);
  }, [searchQuery, selectedLanguage, fetchInventoryBatch]);

  // Infinite Scroll Observer Trigger Boundary
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

  // Extract stack tags list dynamically directly from raw repository assets
  const languageOptions = useMemo(() => {
    const uniqueTags = new Set();
    rawAssets.forEach(asset => {
      let parsedTags = [];
      try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}
      if (Array.isArray(parsedTags)) {
        parsedTags.forEach(tag => { if (tag) uniqueTags.add(tag.trim()); });
      }
    });

    return [
      { value: 'ALL', label: 'All Code Bases' },
      ...Array.from(uniqueTags).sort().map(tag => ({ value: tag, label: `${tag} Projects` }))
    ];
  }, [rawAssets]);

  const processedCardsList = useMemo(() => {
    const accentLoopSequence = ["#730697", "#03b5ff", "#f57f15"]; // Purple base theme sequence focus

    return rawAssets.map((asset, index) => {
      let parsedMeta = {};
      try { parsedMeta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata; } catch(e){}
      
      let parsedTags = [];
      try { parsedTags = typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags; } catch(e){}

      return {
        id: asset.id,
        title: asset.title,
        description: parsedMeta?.summary || 'No structural overview trace parameters configured for this repository node.',
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        slug: asset.slug,
        accentColor: accentLoopSequence[index % accentLoopSequence.length]
      };
    });
  }, [rawAssets]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-12 animate-in fade-in duration-300 font-display">
      <div className="max-w-[1400px] mx-auto mt-10 flex flex-col gap-6">
        
        {/* Module Title Block */}
        <div style={{ display: 'block' }} className="text-left">
          <h2 className="font-display text-3xl font-bold text-primary tracking-tight">{directoryMeta.title}</h2>
          <p className="text-on-surface-variant text-xs mt-1 uppercase tracking-widest opacity-70">
            {directoryMeta.sub}
          </p>
        </div>

        {/* Input Controls Filter Area */}
        <div style={{ display: 'block' }} className="w-full">
          <div style={{ display: 'flex' }} className="items-center gap-4 w-full flex-col sm:flex-row">
            
            <div style={{ display: 'block' }} className="w-full sm:flex-1">
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repository registry components..."
                style={{ height: '44px', marginTop: 0 }}
              />
            </div>

            <div style={{ display: 'block' }} className="w-full sm:w-[220px] shrink-0">
              <Dropdown 
                options={languageOptions}
                selectedValue={selectedLanguage}
                onChange={(value) => setSelectedLanguage(value)}
                labelPrefix="Lang:"
              />
            </div>

          </div>
        </div>

        {/* Dynamic Cards Grid Matrix */}
        <div style={{ display: 'block' }} className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <Skeleton className="h-[210px] w-full" />
              <Skeleton className="h-[210px] w-full" />
              <Skeleton className="h-[210px] w-full" />
            </div>
          ) : processedCardsList.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant text-xs italic border border-dashed border-outline-variant rounded-md">
              No matching file structures mapped inside registry configurations.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in fade-in duration-300">
                {processedCardsList.map((repo) => (
                  <DirectoryCard 
                    key={repo.id}
                    title={repo.title}
                    description={repo.description}
                    tags={repo.tags}
                    accentColor={repo.accentColor}
                    href={`/${directoryMeta.path}/${repo.slug}`}
                  />
                ))}
              </div>

              {/* Viewport Intersector Anchor Hook */}
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