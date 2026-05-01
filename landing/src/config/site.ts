/**
 * Single source of truth for the FFmcp landing page.
 * Update this file when shipping a new release — copy, downloads, version, links.
 */

export const siteConfig = {
  name: 'FFmcpeg',
  legalName: 'FFmcpeg',
  tagline: 'FFmpeg’s full power. Without a single command.',
  description:
    'FFmcpeg is a free, open-source video encoder for Mac, Windows, and Linux. Type what you want in plain English with AI Mode, or dial in every codec, container, and bitrate in Manual Mode. Zero terminal.',
  shortDescription:
    'A free, open-source video encoder for Mac, Windows, and Linux — AI-powered or fully manual. Zero terminal.',

  url: 'https://ffmcpeg.vevaar.com',
  ogImageAlt: 'FFmcpeg — pro-grade video encoding made for humans',

  // Bump these on every release.
  version: '1.0.5',
  releaseDate: '2026-04-25',
  releaseName: 'Phase 1 — Foundation',
  license: 'Apache-2.0',

  /**
   * Download URLs. Replace these with the exact GitHub Release asset URLs
   * after each tag publishes (workflow auto-uploads .dmg / .zip / .exe / .AppImage).
   *
   * Tip: pointing at /releases/latest/download/<filename> means you only update
   * filenames here when they change — GitHub auto-redirects to the latest tag.
   */
  downloads: {
    macAppleSilicon: 'https://github.com/iamvevaar/FFmcpeg/releases/download/v1.0.4/FFmcp-1.0.5-arm64.dmg',
    macIntel: 'https://github.com/iamvevaar/FFmcpeg/releases/download/v1.0.4/FFmcp-1.0.5-arm64.dmg',
    windows: 'https://github.com/iamvevaar/FFmcpeg/releases/download/v1.0.4/FFmcp-Setup-1.0.5.exe',
    linuxAppImage: 'https://github.com/iamvevaar/FFmcpeg/releases/download/v1.0.4/FFmcp-1.0.5.AppImage',
    linuxTarball: 'https://github.com/iamvevaar/FFmcpeg/releases/download/v1.0.4/ffmcp-1.0.5.tar.gz',
  },

  links: {
    github: 'https://github.com/iamvevaar/FFmcpeg',
    releases: 'https://github.com/iamvevaar/FFmcpeg/releases',
    latestRelease: 'https://github.com/iamvevaar/FFmcpeg/releases/latest',
    issues: 'https://github.com/iamvevaar/FFmcpeg/issues',
    discussions: 'https://github.com/iamvevaar/FFmcpeg/discussions',
    install: 'https://github.com/iamvevaar/FFmcpeg/blob/main/INSTALL.md',
    product: 'https://github.com/iamvevaar/FFmcpeg/blob/main/PRODUCT.md',
  },

  social: {
    x: 'https://x.com/iamvevaar',
    xHandle: '@iamvevaar',
  },

  author: {
    name: 'Gautam Vevaar',
    url: 'https://vevaar.com',
  },

  // Hero section
  hero: {
    eyebrow: `v1.0.5 · ${new Date('2026-04-25').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    headline: ['FFmpeg’s full power.', 'Without a single command.'],
    sub:
      'FFmcpeg is a free, open-source video encoder for Mac, Windows, and Linux. Type what you want in plain English — or dial in every codec, container, and bitrate. Zero terminal.',
    primaryCta: 'Download free',
    secondaryCta: 'See how it works',
  },

  // Maker walkthrough video. Update this block per release if you re-record.
  video: {
    id: 'Be9bmZHEjhw',
    url: 'https://youtu.be/Be9bmZHEjhw',
    title: 'FFmcpeg walkthrough — AI Mode, Manual Mode, every operation',
    description:
      'A guided walkthrough of FFmcpeg by the developer who built it. Covers AI Mode, Manual Mode tabs, every encode operation, HDR handling, and the job queue.',
    heading: 'See it work, end to end.',
    sub: 'A guided walkthrough — every mode, every operation, explained by the person who built it.',
    // Approximate upload date for VideoObject JSON-LD; update if needed.
    uploadDate: '2026-04-25',
  },

  // Top-of-page value props
  valueProps: [
    {
      title: 'AI Mode',
      body: 'Type a sentence. Get an encode. “Compress this to 25 MB for Discord” — done.',
    },
    {
      title: 'Manual Mode',
      body: 'Every codec, every knob, no jargon. CRF, bitrate, or target file size — your choice.',
    },
    {
      title: 'HDR-aware',
      body: 'Auto-detects HDR10 transfer at file pick. Preserves color metadata on H.265 / AV1.',
    },
    {
      title: 'Hardware-accelerated',
      body: 'NVENC, VideoToolbox, QSV, AMF — auto-detected and ready when your machine supports them.',
    },
  ],

  // What's new in this release (Phase 1)
  whatsNew: {
    heading: 'What’s in v1.0.5',
    sub: 'Phase 1 lands the foundation — every encode path that 90% of users need, with AI parity.',
    items: [
      {
        title: 'Four modern codecs',
        body: 'H.264, H.265, AV1, and VP9 — with hardware variants auto-detected on your machine.',
      },
      {
        title: 'Three quality modes',
        body: 'CRF as a quality slider, target bitrate, or “fit in N megabytes” target file size.',
      },
      {
        title: 'Smart containers',
        body: 'MP4 with web-optimized faststart, MKV, or WebM (with VP9 + Opus on remux).',
      },
      {
        title: 'HDR detection + preservation',
        body: 'ffprobe reads transfer at file pick. Preserve HDR keeps 10-bit + color metadata on H.265 / AV1.',
      },
      {
        title: 'Resolution ladder',
        body: '4K → 1440p → 1080p → 720p → 480p, plus custom W×H with aspect lock and don’t-upscale.',
      },
      {
        title: 'Transform suite',
        body: 'Rotate 0/90/180/270, flip H/V, numeric crop — re-encodes cleanly to H.264.',
      },
      {
        title: '5-step encoder speed',
        body: 'A single human dial mapped per encoder (x264, x265, VP9, AV1, NVENC, VideoToolbox, QSV, AMF).',
      },
      {
        title: 'YouTube-style timeline scrub',
        body: 'Debounced frame extraction lets you scrub Trim and Thumbnail like a player, not a form.',
      },
    ],
  },

  aiMode: {
    heading: 'Talk to it like a person.',
    sub:
      'Drop a file. Type what you want. FFmcp turns your sentence into a precise FFmpeg job — preview the JSON, hit run, done.',
    examples: [
      'Compress this to under 25 MB for Discord',
      'Make a 720p version, but keep the HDR',
      'Trim from 0:14 to 1:32 and convert to MP4',
      'Pull a thumbnail at the 30 second mark',
    ],
    powered: 'Powered by Gemini. Your video never leaves your machine — only the prompt text.',
  },

  manualMode: {
    heading: 'Or dial in every detail.',
    sub:
      'Seven operations, each as deep as you need them to be. Defaults that work, and an Advanced drawer when you want more.',
    tabs: [
      { name: 'Convert', body: 'MP4, MKV, or WebM. Web-optimized faststart toggle on MP4. Remux when possible.' },
      { name: 'Compress', body: 'H.264 / H.265 / AV1 / VP9. CRF, target bitrate, or target file size.' },
      { name: 'Audio', body: 'Extract clean audio tracks in MP3, AAC, or WAV.' },
      { name: 'Trim', body: 'Scrubbable timeline preview. Drop in/out points like a video editor.' },
      { name: 'Resize', body: '4K → 480p ladder, custom W×H with aspect lock, don’t-upscale guard.' },
      { name: 'Transform', body: 'Rotate, flip, numeric crop. Quick fixes without a separate tool.' },
      { name: 'Thumbnail', body: 'Pull a still frame at any timestamp. Perfect for poster images.' },
    ],
  },

  capabilities: {
    heading: 'Built for everything you encode.',
    sub: 'A pragmatic feature set focused on what casual users and creators actually need.',
    items: [
      { name: 'H.264 / H.265 / AV1 / VP9', body: 'Modern codecs with software and hardware paths.' },
      { name: 'Hardware acceleration', body: 'NVENC, VideoToolbox, QSV, AMF — probed at startup.' },
      { name: 'Web-optimized MP4', body: '+faststart for instant playback.' },
      { name: 'Preserve HDR', body: '10-bit + color metadata on H.265 / AV1.' },
      { name: 'Resolution ladder', body: '4K to 480p, custom dimensions, aspect lock.' },
      { name: 'Custom framerate', body: 'Match source or pick from common rates.' },
      { name: 'Numeric crop + rotate + flip', body: 'Quick geometry fixes built in.' },
      { name: 'Drag and drop', body: 'Drop a file from anywhere on your desktop.' },
      { name: 'Live job queue', body: 'Real-time progress, cancel any time.' },
    ],
  },

  howItWorks: {
    heading: 'Three steps. That’s the whole flow.',
    steps: [
      {
        title: 'Drop your file',
        body: 'Drag it into FFmcp or click to browse. We read it with ffprobe and surface every detail.',
      },
      {
        title: 'Pick your path',
        body: 'AI Mode for plain-English instructions. Manual Mode for fine control. Switch any time.',
      },
      {
        title: 'Hit encode',
        body: 'Watch progress in the queue. Files land in your output folder, ready to use.',
      },
    ],
  },

  settings: {
    heading: 'Local-first. Always.',
    sub:
      'Your videos never leave your machine. AI Mode sends the prompt text to Gemini, and nothing else. Output folder, API key, and detected encoders all live in a local store you control.',
    bullets: [
      'No telemetry, no analytics, no account.',
      'System FFmpeg used when present, bundled binary as fallback.',
      'Hardware encoders auto-detected at startup.',
      'Open source under Apache 2.0 — read the source, build it yourself.',
    ],
  },

  faq: [
    {
      q: 'Is FFmcp really free?',
      a: 'Yes. FFmcp is open source under Apache 2.0. There’s no premium tier, no ads, no telemetry.',
    },
    {
      q: 'Why does macOS warn me on first launch?',
      a: 'We haven’t enrolled in the Apple Developer Program yet, so the build is unsigned. The first launch needs a one-time bypass — see the install guide for steps.',
    },
    {
      q: 'Does AI Mode upload my videos?',
      a: 'No. Only the prompt text is sent to Gemini. Your video file stays on your machine and is processed locally by FFmpeg.',
    },
    {
      q: 'Can I batch-encode multiple files?',
      a: 'Multi-file batch and a curated preset library are the focus of Phase 2. Today, FFmcp processes one file at a time.',
    },
    {
      q: 'Can I save my own presets?',
      a: 'User-saved presets ship in Phase 2 alongside the curated set (Quick Export, For Social, For Devices, For Editing).',
    },
    {
      q: 'Where does FFmpeg come from?',
      a: 'A bundled FFmpeg + ffprobe binary ships with the app. If a system FFmpeg is on your PATH, FFmcp uses that instead.',
    },
  ],

  footer: {
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Download', href: '#download' },
          { label: 'Features', href: '#capabilities' },
          { label: 'Roadmap', href: 'https://github.com/iamvevaar/FFmcpeg/blob/main/PRODUCT.md' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'Install guide', href: 'https://github.com/iamvevaar/FFmcpeg/blob/main/INSTALL.md' },
          { label: 'Releases', href: 'https://github.com/iamvevaar/FFmcpeg/releases' },
          { label: 'Report a bug', href: 'https://github.com/iamvevaar/FFmcpeg/issues' },
        ],
      },
      {
        title: 'Project',
        links: [
          { label: 'GitHub', href: 'https://github.com/iamvevaar/FFmcpeg' },
          { label: 'Discussions', href: 'https://github.com/iamvevaar/FFmcpeg/discussions' },
          { label: 'License', href: 'https://github.com/iamvevaar/FFmcpeg/blob/main/LICENSE' },
        ],
      },
    ],
  },

  // Screenshot slots — drop matching files in /public/screenshots/
  screenshots: {
    home: '/screenshots/home.png',
    aiMode: '/screenshots/ai-mode.png',
    manualMode: '/screenshots/manual-mode.png',
    settings: '/screenshots/settings.png',
  },
} as const;

export type SiteConfig = typeof siteConfig;
