"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import DirectoryCard from "@/components/DirectoryCard";
import Dropdown from "@/components/Dropdown";
import Input from "@/components/Input";
import Skeleton from "@/components/Skeleton";

export default function VideosPage() {
  const observerTargetRef = useRef(null);

  const [rawAssets, setRawAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const directoryMeta = useMemo(
    () => ({
      title: "SMSRam Broadcasts",
      sub: "Video tutorials, core platform build deep-dives, and technical transmissions stream logs",
      path: "videos",
      type: "VIDEO",
    }),
    []
  );

  const fetchInventoryBatch = useCallback(
    async (pageToLoad, isNewSearch = false) => {
      if (isNewSearch) setIsLoading(true);
      else setIsLoadingMore(true);

      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000";

      const limit = 20;

      try {
        const urlParams = new URLSearchParams({
          type: directoryMeta.type,
          page: pageToLoad,
          limit,
          search: searchQuery,
          stack: selectedCategory,
        });

        const res = await fetch(
          `${serverUrl}/api/assets?${urlParams.toString()}`
        );

        const payload = await res.json();
        const nextRecords = payload?.data || [];

        if (isNewSearch) {
          setRawAssets(nextRecords);
        } else {
          setRawAssets((prev) => [...prev, ...nextRecords]);
        }

        setHasMoreData(nextRecords.length === limit);
      } catch (err) {
        console.error(
          "Failed to compile paginated video broadcast entries:",
          err
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [directoryMeta.type, searchQuery, selectedCategory]
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchInventoryBatch(1, true);
  }, [searchQuery, selectedCategory, fetchInventoryBatch]);

  useEffect(() => {
    if (isLoading || !hasMoreData || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchInventoryBatch(nextPage, false);
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTargetRef.current;

    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    currentPage,
    hasMoreData,
    isLoading,
    isLoadingMore,
    fetchInventoryBatch,
  ]);

  const categoryOptions = useMemo(() => {
    const uniqueTags = new Set();

    rawAssets.forEach((asset) => {
      let parsedTags = [];

      try {
        parsedTags =
          typeof asset.tags === "string"
            ? JSON.parse(asset.tags)
            : asset.tags;
      } catch {}

      if (Array.isArray(parsedTags)) {
        parsedTags.forEach((tag) => {
          if (tag) uniqueTags.add(tag.trim());
        });
      }
    });

    return [
      {
        value: "ALL",
        label: "All Broadcasts",
      },
      ...Array.from(uniqueTags)
        .sort()
        .map((tag) => ({
          value: tag,
          label: `${tag} Streams`,
        })),
    ];
  }, [rawAssets]);

  const processedCardsList = useMemo(() => {
    const accentLoopSequence = [
      "#f57f15",
      "#03b5ff",
      "#730697",
    ];

    const fallbackThumbnails = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=600&auto=format&fit=crop",
    ];

    return rawAssets.map((asset, index) => {
      let parsedMeta = {};

      try {
        parsedMeta =
          typeof asset.metadata === "string"
            ? JSON.parse(asset.metadata)
            : asset.metadata;
      } catch {}

      let parsedTags = [];

      try {
        parsedTags =
          typeof asset.tags === "string"
            ? JSON.parse(asset.tags)
            : asset.tags;
      } catch {}

      return {
        id: asset.id,
        title: asset.title,
        description:
          parsedMeta?.summary ||
          "No overview text metrics configured for this video stream asset node.",

        tags: Array.isArray(parsedTags) ? parsedTags : [],

        slug: asset.slug,

        accentColor:
          accentLoopSequence[
            index % accentLoopSequence.length
          ],

        type: asset.type || "VIDEO",

        youtubeId:
          parsedMeta?.youtube_id ||
          parsedMeta?.videoId ||
          "",

        videoUrl:
          parsedMeta?.video_url ||
          parsedMeta?.url ||
          "",

        image:
          parsedMeta?.thumbnail_url ||
          fallbackThumbnails[
            index % fallbackThumbnails.length
          ],

        fallbackImage:
          fallbackThumbnails[
            index % fallbackThumbnails.length
          ],
      };
    });
  }, [rawAssets]);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-12 animate-in fade-in duration-300 font-display">
      <div className="max-w-[1400px] mx-auto mt-10 flex flex-col gap-6">

        <div className="text-left">
          <h2 className="font-display text-3xl font-bold text-primary tracking-tight">
            {directoryMeta.title}
          </h2>

          <p className="text-on-surface-variant text-xs mt-1 uppercase tracking-widest opacity-70">
            {directoryMeta.sub}
          </p>
        </div>

        <div className="w-full">
          <div className="flex items-center gap-4 w-full flex-col sm:flex-row">

            <div className="w-full sm:flex-1">
              <Input
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search broadcast library indices..."
                style={{
                  height: "44px",
                  marginTop: 0,
                }}
              />
            </div>

            <div className="w-full sm:w-[220px] shrink-0">
              <Dropdown
                options={categoryOptions}
                selectedValue={selectedCategory}
                onChange={(value) =>
                  setSelectedCategory(value)
                }
                labelPrefix="Type:"
              />
            </div>

          </div>
        </div>

        <div className="mt-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          ) : processedCardsList.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant text-xs italic border border-dashed border-outline-variant rounded-md">
              No technical broadcast media nodes located inside target filter keys.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">

                {processedCardsList.map((video) => (
                  <DirectoryCard
                    key={video.id}
                    title={video.title}
                    description={video.description}
                    tags={video.tags}
                    accentColor={video.accentColor}
                    image={video.image}
                    fallbackImage={video.fallbackImage}
                    type={video.type}
                    youtubeId={video.youtubeId}
                    videoUrl={video.videoUrl}
                    href={`/${directoryMeta.path}/${video.slug}`}
                  />
                ))}

              </div>

              <div
                ref={observerTargetRef}
                className="w-full h-12 flex items-center justify-center mt-6"
              >
                {isLoadingMore && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full opacity-60">
                    <Skeleton className="h-[280px] w-full" />
                    <Skeleton className="h-[280px] w-full" />
                    <Skeleton className="h-[280px] w-full" />
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