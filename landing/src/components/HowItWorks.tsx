import { siteConfig } from '@/config/site';

export function HowItWorks() {
  const { howItWorks } = siteConfig;

  return (
    <section id="how-it-works" className="section bg-[var(--color-soft-gray)]">
      <div className="container-wide">
        <div className="max-w-2xl">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
            {howItWorks.heading}
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {howItWorks.steps.map((step, i) => (
            <li
              key={step.title}
              className="card !p-7 bg-white relative"
            >
              <div className="text-[64px] leading-none font-medium text-[var(--color-meta-blue)]/20 tracking-tighter -mt-2 mb-2 select-none">
                0{i + 1}
              </div>
              <h3 className="text-[18px] font-semibold tracking-tight text-[var(--color-charcoal)]">
                {step.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[var(--color-slate)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
