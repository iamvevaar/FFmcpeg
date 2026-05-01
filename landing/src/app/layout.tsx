import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { siteConfig } from '@/config/site';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0064E0',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.author.name,
  generator: 'Next.js',
  keywords: [
    'video encoder',
    'ffmpeg gui',
    'handbrake alternative',
    'video compression',
    'video conversion',
    'mp4 converter',
    'h.265 encoder',
    'av1 encoder',
    'hdr video',
    'electron app',
    'open source video tool',
    'mac video converter',
    'windows video converter',
    'linux video converter',
  ],
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: siteConfig.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    images: ['/opengraph-image'],
    creator: siteConfig.social.xHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  category: 'technology',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'macOS, Windows, Linux',
  description: siteConfig.description,
  url: siteConfig.url,
  softwareVersion: siteConfig.version,
  releaseNotes: siteConfig.links.releases,
  downloadUrl: siteConfig.links.latestRelease,
  license: `https://spdx.org/licenses/${siteConfig.license}.html`,
  author: {
    '@type': 'Person',
    name: siteConfig.author.name,
    url: siteConfig.author.url,
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: undefined, // wire up once we have real reviews
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
