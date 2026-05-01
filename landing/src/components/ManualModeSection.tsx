import { siteConfig } from '@/config/site';
import { DeviceFrame } from './DeviceFrame';

export function ManualModeSection() {
  const { manualMode, screenshots } = siteConfig;

  return (
    <section className="section bg-[var(--color-near-black)] text-white">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="lg:order-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white/90 text-[13px] font-medium tracking-tight">
              Manual Mode
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-white">
              {manualMode.heading}
            </h2>
            <p className="mt-5 text-[18px] leading-[1.55] text-white/70 max-w-xl">
              {manualMode.sub}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {manualMode.tabs.map((tab) => (
                <div
                  key={tab.name}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-meta-blue-light)]" />
                    <h3 className="text-[15px] font-semibold tracking-tight text-white">
                      {tab.name}
                    </h3>
                  </div>
                  <p className="text-[13.5px] leading-[1.5] text-white/65">
                    {tab.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:order-1 relative">
            <DeviceFrame src={screenshots.manualMode} alt="FFmcp manual mode tabs" ratio={16 / 10} />
          </div>
        </div>
      </div>
    </section>
  );
}
