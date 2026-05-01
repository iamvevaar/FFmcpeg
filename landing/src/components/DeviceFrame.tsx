'use client';

import { useState } from 'react';

type DeviceFrameProps = {
  src: string;
  alt: string;
  /** Aspect ratio of the captured app window. Default 16:10. */
  ratio?: number;
  caption?: string;
  /** Hero / above-the-fold images should pass `priority` for eager loading + high fetch priority. */
  priority?: boolean;
};

/**
 * macOS-style window chrome wrapper for product screenshots.
 *
 * The image is layered on top of a styled gradient placeholder. If the image
 * 404s (file not present yet), `onError` flips us to a "Screenshot coming soon"
 * pill. We avoid the React/SSR cached-image race by NOT gating display on `onLoad`.
 */
export function DeviceFrame({ src, alt, ratio = 16 / 10, caption, priority }: DeviceFrameProps) {
  const [errored, setErrored] = useState(false);

  return (
    <figure className="relative m-0 rounded-2xl overflow-hidden border border-black/10 bg-[#f7f8fa] shadow-[0_30px_60px_-20px_rgba(15,30,60,0.18),0_12px_24px_-12px_rgba(15,30,60,0.12)]">
      <div className="flex items-center gap-2 px-[18px] py-[14px] bg-gradient-to-b from-[#fafbfc] to-[#f1f4f7] border-b border-black/5">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
      </div>

      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-[#f7f8fa] via-[#e8f3ff] to-[#f7f8fa]"
        style={{ aspectRatio: ratio }}
      >
        {!errored && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={() => setErrored(true)}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        )}
        {errored && (
          <div className="absolute inset-0 flex items-center justify-center text-[#5D6C7B] text-sm tracking-tight pointer-events-none">
            <span className="px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-black/5">
              Screenshot coming soon
            </span>
          </div>
        )}
      </div>

      {caption && (
        <figcaption className="px-[18px] py-3 text-[13px] text-[#5D6C7B] bg-white border-t border-black/5">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
