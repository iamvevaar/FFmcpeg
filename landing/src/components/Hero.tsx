import { siteConfig } from '@/config/site';
import { DeviceFrame } from './DeviceFrame';

export function Hero() {
  const { hero, screenshots } = siteConfig;

  return (
    <section id="top" className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      <div className="gradient-glow" />
      <div className="container-wide relative">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <span className="eyebrow">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-meta-blue)]" />
            {hero.eyebrow}
          </span>

          <h1 className="mt-6 font-medium text-[var(--color-ink)] tracking-[-0.035em] leading-[1.05] text-[44px] sm:text-[60px] lg:text-[72px]">
            {hero.headline.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-7 max-w-2xl text-[18px] sm:text-[20px] leading-[1.5] text-[var(--color-slate)]">
            {hero.sub}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href="#download" className="btn-primary">
              {hero.primaryCta}
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M7 1v9m0 0L3 6.5M7 10l4-3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </a>
            <a href="#how-it-works" className="btn-secondary">
              {hero.secondaryCta}
            </a>
          </div>

          <div className="mt-5 flex items-center gap-4 text-[13px] text-[var(--color-secondary-text)]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
              Free forever
            </span>
            <span aria-hidden="true">·</span>
            <span>Apache 2.0</span>
            <span aria-hidden="true">·</span>
            <span>macOS · Windows · Linux</span>
          </div>
        </div>

        <div className="mt-16 sm:mt-20 max-w-[1100px] mx-auto">
          <DeviceFrame
            src={screenshots.home}
            alt="FFmcp main interface"
            ratio={16 / 10}
            priority
          />
        </div>
      </div>
    </section>
  );
}
