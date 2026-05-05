import { Logo } from './Logo';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="bg-[var(--color-near-black)] text-white/80 pt-16 pb-10">
      <div className="container-wide">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <span className="text-white font-semibold text-[20px] tracking-tight">
                FFmcpeg
              </span>
            </div>
            <p className="mt-4 text-[14px] leading-[1.6] text-white/60 max-w-xs">
              {siteConfig.shortDescription}
            </p>
            <p className="mt-6 text-[12px] text-white/40">
              v{siteConfig.version} · {siteConfig.license}
            </p>
          </div>

          {siteConfig.footer.columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[14px] text-white/70 hover:text-white transition-colors"
                      {...(link.href.startsWith('http')
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[12px] text-white/40">
            © {new Date().getFullYear()} {siteConfig.author.name}. Built on FFmpeg, ffprobe, and open-source codecs.
          </p>
          <div className="flex items-center gap-5">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.95 10.95 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
            </a>
            <a
              href={siteConfig.social.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
