import { siteConfig } from '@/config/site';

export function ValueProps() {
  return (
    <section className="bg-[var(--color-soft-gray)] section">
      <div className="container-wide">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {siteConfig.valueProps.map((prop) => (
            <article
              key={prop.title}
              className="card !p-6 bg-white"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--color-meta-blue)]" />
                <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-charcoal)]">
                  {prop.title}
                </h3>
              </div>
              <p className="text-[15px] leading-[1.55] text-[var(--color-slate)]">
                {prop.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
