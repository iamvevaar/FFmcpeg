import { siteConfig } from '@/config/site';

export function FAQ() {
  return (
    <section id="faq" className="section">
      <div className="container-wide">
        <div className="text-center max-w-2xl mx-auto">
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
            Honest answers.
          </h2>
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          {siteConfig.faq.map((item, i) => (
            <details
              key={item.q}
              className="group border-b border-[var(--color-divider)] py-6 last:border-b-0"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <h3 className="text-[17px] sm:text-[18px] font-semibold tracking-tight text-[var(--color-charcoal)]">
                  {item.q}
                </h3>
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-soft-gray)] flex items-center justify-center text-[var(--color-charcoal)] transition-transform group-open:rotate-45">
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M6 1v10M1 6h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-[15.5px] leading-[1.6] text-[var(--color-slate)] pr-10">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
