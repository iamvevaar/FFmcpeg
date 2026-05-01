'use client';

import { useState } from 'react';

type YouTubeFacadeProps = {
  videoId: string;
  title: string;
};

/**
 * Click-to-play YouTube embed. Renders the thumbnail + play button on first paint
 * (zero third-party JS), and swaps in the iframe only when the user clicks. Saves
 * ~500KB+ of JS on initial load and avoids YouTube's tracking until consent.
 *
 * Uses youtube-nocookie.com for the privacy-enhanced embed.
 */
export function YouTubeFacade({ videoId, title }: YouTubeFacadeProps) {
  const [activated, setActivated] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-black/10 bg-black shadow-[0_30px_60px_-20px_rgba(15,30,60,0.25),0_12px_24px_-12px_rgba(15,30,60,0.15)]"
      style={{ aspectRatio: '16/9' }}
    >
      {!activated ? (
        <button
          type="button"
          aria-label={`Play video: ${title}`}
          onClick={() => setActivated(true)}
          className="absolute inset-0 group cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbSrc}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() =>
              setThumbSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
            }
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 group-hover:from-black/50 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-110">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="#0064E0"
                aria-hidden="true"
                className="ml-1.5"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-5 left-6 right-6 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[12.5px] font-medium tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF0033]" />
              Watch on YouTube
            </span>
          </div>
        </button>
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      )}
    </div>
  );
}
