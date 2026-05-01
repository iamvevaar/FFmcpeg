import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const runtime = 'edge';
export const alt = siteConfig.ogImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          background:
            'radial-gradient(60% 80% at 20% 0%, rgba(71,165,250,0.35), transparent 60%), radial-gradient(50% 70% at 90% 30%, rgba(0,100,224,0.30), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f1f4f7 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="68" height="68" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#0064E0" />
            <rect x="18" y="14" width="8" height="36" rx="1.5" fill="#fff" />
            <rect x="18" y="14" width="28" height="8" rx="1.5" fill="#fff" />
            <path d="M28 27 L41 33.5 L28 40 Z" fill="#fff" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 600, color: '#1C2B33', letterSpacing: '-0.02em' }}>
            FFmcp
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 'auto' }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#0064E0',
              letterSpacing: '-0.01em',
            }}
          >
            v{siteConfig.version} · for Mac, Windows, and Linux
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 500,
              color: '#1C2B33',
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
            }}
          >
            FFmpeg’s full power.
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 500,
              color: '#1C2B33',
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
            }}
          >
            Without a single command.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
