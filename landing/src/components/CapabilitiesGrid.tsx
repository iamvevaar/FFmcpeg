import { siteConfig } from '@/config/site';

export function CapabilitiesGrid() {
  const { capabilities, whatsNew } = siteConfig;

  return (
    <section id="capabilities" className="section">
      <div className="container-wide">
        <div className="max-w-2xl">
          <span className="eyebrow">{whatsNew.heading}</span>
          <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
            {whatsNew.sub}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {whatsNew.items.map((item) => (
            <article
              key={item.title}
              className="card group !p-7"
            >
              <h3 className="text-[17px] font-semibold tracking-tight text-[var(--color-charcoal)]">
                {item.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[var(--color-slate)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-24">
          <h3 className="text-[28px] sm:text-[32px] tracking-[-0.025em] font-medium text-[var(--color-ink)] max-w-xl">
            {capabilities.heading}
          </h3>
          <p className="mt-3 text-[16px] text-[var(--color-slate)] max-w-xl">{capabilities.sub}</p>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {capabilities.items.map((c) => (
              <li key={c.name} className="flex items-start gap-3">
                <span className="mt-[3px] inline-flex w-5 h-5 items-center justify-center rounded-full bg-[var(--color-baby-blue)] text-[var(--color-meta-blue)] flex-shrink-0">
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
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
                <div>
                  <div className="text-[14.5px] font-semibold text-[var(--color-charcoal)] tracking-tight">
                    {c.name}
                  </div>
                  <div className="text-[13.5px] text-[var(--color-slate)] leading-[1.5]">
                    {c.body}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
