'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const FALLBACK_THUMBNAIL = '/images/video-fallback.jpg';

export default function DirectoryCard({
  title,
  description,
  tags = [],
  accentColor = '#f57f15',
  href = '#',
  image,
  youtubeUrl,
  youtubeId,
}) {
  const router = useRouter();

  const handleNavigation = (e) => {
    e.preventDefault();
    router.push(href);
  };

  const extractedVideoId = useMemo(() => {
    if (youtubeId) return youtubeId;
    if (!youtubeUrl) return null;

    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    ];

    for (const pattern of patterns) {
      const match = youtubeUrl.match(pattern);
      if (match?.[1]) return match[1];
    }

    return null;
  }, [youtubeId, youtubeUrl]);

  // Only build candidates when there's actually something to show.
  // Never insert FALLBACK_THUMBNAIL here — that would make hasMedia true
  // even when no real image or video was provided.
  const thumbnailCandidates = useMemo(() => {
    if (extractedVideoId) {
      return [
        `https://img.youtube.com/vi/${extractedVideoId}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${extractedVideoId}/hqdefault.jpg`,
        `https://img.youtube.com/vi/${extractedVideoId}/mqdefault.jpg`,
        // Use caller-supplied image as last resort, fall back to static only for video cards
        image || FALLBACK_THUMBNAIL,
      ];
    }

    // Non-video card: only include image if one was actually passed
    return image ? [image] : [];
  }, [extractedVideoId, image]);

  const [thumbIndex, setThumbIndex] = useState(0);

  const isVideoCard = Boolean(extractedVideoId);

  // True only when there is a real image URL or a YouTube video ID
  const hasMedia = isVideoCard || Boolean(image && image.trim());

  const currentThumbnail = thumbnailCandidates[thumbIndex] ?? null;

  return (
    <div
      onClick={handleNavigation}
      style={{ display: 'block' }}
      className="group bg-surface-container-lowest border border-outline-variant rounded-md p-5 transition-all duration-200 hover:border-neutral-400 dark:hover:border-neutral-600 shadow-sm text-left cursor-pointer select-none flex flex-col min-w-0"
    >
      {/* Media block — skipped entirely when no image or video is present */}
      {hasMedia && currentThumbnail && (
        <div className="w-full aspect-video bg-surface-container border border-outline-variant/60 rounded mb-4 overflow-hidden relative shrink-0">
          <img
            src={currentThumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            onError={() => {
              if (thumbIndex < thumbnailCandidates.length - 1) {
                setThumbIndex((prev) => prev + 1);
              }
            }}
          />

          {isVideoCard && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-colors">
              <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-md">
                <span className="material-symbols-outlined text-[20px] fill-1">
                  play_arrow
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{ display: 'flex' }}
        className="items-center justify-between gap-md mb-4 w-full min-w-0 shrink-0"
      >
        <div style={{ display: 'flex' }} className="items-center gap-2 min-w-0 flex-1">
          <span
            style={{ backgroundColor: accentColor }}
            className="w-2.5 h-2.5 rounded-full shrink-0"
          />
          <h3 className="text-lg font-bold text-primary tracking-wide font-display truncate flex-1 leading-none">
            {title}
          </h3>
        </div>

        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[20px] shrink-0 self-center">
          open_in_new
        </span>
      </div>

      <p
        className="text-sm font-body-sm text-on-surface-variant leading-relaxed mb-5 flex-1 overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
        }}
      >
        {description}
      </p>

      {tags.length > 0 && (
        <div
          style={{
            display: 'block',
            width: '100%',
            borderTop: '1px solid var(--color-outline-variant)',
            paddingTop: '16px',
          }}
          className="shrink-0"
        >
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
            className="w-full [&::-webkit-scrollbar]:hidden"
          >
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-surface border border-outline-variant text-on-surface-variant font-code text-xs rounded font-medium shrink-0 whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}