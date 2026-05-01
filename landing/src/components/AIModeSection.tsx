import { siteConfig } from '@/config/site';
import { DeviceFrame } from './DeviceFrame';

export function AIModeSection() {
  const { aiMode, screenshots } = siteConfig;

  return (
    <section className="section">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <span className="eyebrow">AI Mode</span>
            <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
              {aiMode.heading}
            </h2>
            <p className="mt-5 text-[18px] leading-[1.55] text-[var(--color-slate)] max-w-xl">
              {aiMode.sub}
            </p>

            <ul className="mt-8 space-y-3">
              {aiMode.examples.map((example) => (
                <li
                  key={example}
                  className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-[var(--color-divider)] bg-white"
                >
                  <span className="mt-[2px] inline-flex w-6 h-6 items-center justify-center rounded-full bg-[var(--color-baby-blue)] text-[var(--color-meta-blue)] flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path
                        d="M2 6.5l3 3 5-7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                  <span className="text-[15px] leading-[1.5] text-[var(--color-charcoal)] font-mono">
                    “{example}”
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[13px] text-[var(--color-secondary-text)]">
              {aiMode.powered}
            </p>
          </div>

          <div className="relative">
            <DeviceFrame src={screenshots.aiMode} alt="FFmcp AI mode chat interface" ratio={16 / 10} />
          </div>
        </div>
      </div>
    </section>
  );
}
