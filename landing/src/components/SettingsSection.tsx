import { siteConfig } from '@/config/site';
import { DeviceFrame } from './DeviceFrame';

export function SettingsSection() {
  const { settings, screenshots } = siteConfig;

  return (
    <section className="section">
      <div className="container-wide">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-20 items-center">
          <div>
            <span className="eyebrow">Privacy</span>
            <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
              {settings.heading}
            </h2>
            <p className="mt-5 text-[18px] leading-[1.55] text-[var(--color-slate)] max-w-xl">
              {settings.sub}
            </p>

            <ul className="mt-8 space-y-4">
              {settings.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-[5px] inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-meta-blue)] flex-shrink-0" />
                  <span className="text-[15.5px] leading-[1.55] text-[var(--color-charcoal)]">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <DeviceFrame src={screenshots.settings} alt="FFmcp settings panel" ratio={16 / 11} />
        </div>
      </div>
    </section>
  );
}
