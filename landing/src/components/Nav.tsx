import { Logo } from './Logo';
import { siteConfig } from '@/config/site';

export function Nav() {
  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="container-wide flex items-center justify-between h-16">
        <a href="#top" className="flex items-center" aria-label={`${siteConfig.name} home`}>
          <Logo size={28} withWordmark />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-[15px] text-[var(--color-charcoal)]">
          <a href="#capabilities" className="hover:text-[var(--color-meta-blue)] transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[var(--color-meta-blue)] transition-colors">
            How it works
          </a>
          <a href="#faq" className="hover:text-[var(--color-meta-blue)] transition-colors">
            FAQ
          </a>
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-meta-blue)] transition-colors"
          >
            GitHub
          </a>
        </nav>

        <a href="#download" className="btn-primary !py-2.5 !px-5 !text-sm">
          Download
        </a>
      </div>
    </header>
  );
}
