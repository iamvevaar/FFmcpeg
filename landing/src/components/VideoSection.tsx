import { siteConfig } from '@/config/site';
import { YouTubeFacade } from './YouTubeFacade';

export function VideoSection() {
  const { video } = siteConfig;

  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: [
      `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    ],
    uploadDate: `${video.uploadDate}T00:00:00Z`,
    contentUrl: video.url,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}`,
    publisher: {
      '@type': 'Person',
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
  };

  return (
    <section id="watch" className="section bg-[var(--color-soft-gray)]">
      <div className="container-wide">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <span className="eyebrow">Walkthrough</span>
          <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
            {video.heading}
          </h2>
          <p className="mt-5 text-[18px] leading-[1.55] text-[var(--color-slate)]">
            {video.sub}
          </p>
        </div>

        <div className="max-w-[1100px] mx-auto">
          <YouTubeFacade videoId={video.id} title={video.title} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
    </section>
  );
}
