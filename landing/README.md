# FFmcp landing page

Marketing site for [FFmcp](../). Next.js 15 (App Router) + Tailwind v4 + TypeScript. Deploy target: **ffmcpeg.vevaar.com**.

## Run

```bash
cd landing
npm install
npm run dev      # http://localhost:3001
```

## Build

```bash
npm run build
npm run start
```

## Where to update content

**All copy, version numbers, download URLs, and links** live in one file:

```
src/config/site.ts
```

Update that file when:
- Cutting a new release (bump `version`, `releaseDate`, `whatsNew.items`)
- Replacing per-OS download URLs once you know the exact GitHub Release asset names
- Tweaking hero copy, FAQ, footer links

## Where to drop screenshots

```
public/screenshots/{home,ai-mode,manual-mode,settings}.png
```

See `public/screenshots/README.md` for sizing guidance. Sections fall back to styled placeholders if files are missing.

## SEO notes

- Canonical URL is hard-coded to `https://ffmcpeg.vevaar.com` in `site.ts`.
- `app/sitemap.ts` and `app/robots.ts` autogenerate `/sitemap.xml` and `/robots.txt`.
- OG image is rendered programmatically at `/opengraph-image` via `app/opengraph-image.tsx`.
- JSON-LD `SoftwareApplication` schema is injected in `app/layout.tsx`.

## Deploy

Static-export-friendly. On Vercel, point the project at `landing/` as the root and it just works.
