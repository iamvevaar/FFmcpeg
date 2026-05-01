import { siteConfig } from '@/config/site';

const platforms = [
  {
    id: 'mac',
    name: 'macOS',
    accentBg: '#1C1E21',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.91 2.71-3.41 2.71-1.473 0-1.85-.88-3.55-.88-1.732 0-2.305.91-3.67.91-1.535 0-2.555-1.32-3.55-2.71-1.21-1.69-2.16-4.31-2.16-6.79 0-3.97 2.58-6.07 5.12-6.07 1.35 0 2.49.91 3.34.91.81 0 2.08-.97 3.65-.97.6 0 2.74.06 4.13 2.07-.12.07-2.43 1.42-2.4 4.16.04 3.27 2.86 4.36 2.93 4.39z" />
      </svg>
    ),
    items: [
      { label: 'Apple Silicon (M-series)', href: siteConfig.downloads.macAppleSilicon },
      { label: 'Intel', href: siteConfig.downloads.macIntel },
    ],
  },
  {
    id: 'windows',
    name: 'Windows',
    accentBg: '#0064E0',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 5.65L10.18 4.6v6.93H3V5.65zm0 12.7L10.18 19.4v-6.93H3v5.88zM11.18 4.46L21 3v8.53h-9.82V4.46zm0 16.07L21 21v-8.5h-9.82v8.03z" />
      </svg>
    ),
    items: [
      { label: 'Installer (.exe)', href: siteConfig.downloads.windows },
    ],
  },
  {
    id: 'linux',
    name: 'Linux',
    accentBg: '#1C2B33',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2c-2.4 0-4 2-4 4.5 0 1 .3 2 .9 3-.5.4-1 1-1.4 1.7-.8 1.4-1.7 3-2 4.7-.3 1.6-.2 3.4 1 4.6.6.7 1.5 1.1 2.5 1.3 1 .2 2 0 2.9-.4l.1-.1c.6.3 1.4.5 2 .5s1.4-.2 2-.5l.1.1c.9.4 1.9.6 2.9.4 1-.2 1.9-.6 2.5-1.3 1.2-1.2 1.3-3 1-4.6-.3-1.7-1.2-3.3-2-4.7-.4-.7-.9-1.3-1.4-1.7.6-1 .9-2 .9-3C16 4 14.4 2 12 2zm0 2c1 0 2 1 2 2.5 0 .9-.4 1.7-1 2.3-.3.3-.6.5-1 .7-.4-.2-.7-.4-1-.7-.6-.6-1-1.4-1-2.3C10 5 11 4 12 4z" />
      </svg>
    ),
    items: [
      { label: 'AppImage', href: siteConfig.downloads.linuxAppImage },
      { label: 'tar.gz', href: siteConfig.downloads.linuxTarball },
    ],
  },
];

export function DownloadSection() {
  return (
    <section
      id="download"
      className="section bg-gradient-to-b from-white via-[var(--color-baby-blue)]/30 to-white"
    >
      <div className="container-wide">
        <div className="text-center max-w-2xl mx-auto">
          <span className="eyebrow">Download</span>
          <h2 className="mt-4 text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.05] tracking-[-0.03em] font-medium text-[var(--color-ink)]">
            Get FFmcp for your machine.
          </h2>
          <p className="mt-5 text-[18px] leading-[1.55] text-[var(--color-slate)]">
            Free. Open-source. Apache 2.0. Version{' '}
            <strong className="text-[var(--color-charcoal)] font-semibold">
              v{siteConfig.version}
            </strong>{' '}
            — released{' '}
            {new Date(siteConfig.releaseDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            .
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {platforms.map((platform) => (
            <article
              key={platform.id}
              className="card !p-7 bg-white flex flex-col"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5"
                style={{ background: platform.accentBg }}
              >
                {platform.icon}
              </div>
              <h3 className="text-[20px] font-semibold tracking-tight text-[var(--color-charcoal)]">
                {platform.name}
              </h3>
              <div className="mt-5 space-y-2 flex-1">
                {platform.items.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--color-divider)] hover:border-[var(--color-meta-blue)] hover:bg-[var(--color-baby-blue)]/40 transition-colors group"
                  >
                    <span className="text-[14px] text-[var(--color-charcoal)] font-medium">
                      {item.label}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      aria-hidden="true"
                      className="text-[var(--color-secondary-text)] group-hover:text-[var(--color-meta-blue)] transition-colors"
                    >
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
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-[var(--color-secondary-text)]">
          First time on macOS or Windows? See the{' '}
          <a
            href={siteConfig.links.install}
            className="text-[var(--color-meta-blue)] underline-offset-4 hover:underline"
          >
            install guide
          </a>{' '}
          — the unsigned build needs a one-time bypass.
        </p>
      </div>
    </section>
  );
}
