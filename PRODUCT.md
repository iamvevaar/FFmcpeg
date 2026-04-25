# FFMCPeg — Product Document

> A delightfully simple desktop video utility, with the power of HandBrake and the ease of an AI assistant.

**Last updated:** 2026-04-25
**Owner:** @iamvevaar
**Status:** Draft v1 (post-HandBrake competitive review)

---

## 1. Vision

> _"What HandBrake can do, but designed for normal humans — with AI as the easy on-ramp."_

FFMCPeg is a cross-platform desktop app that turns FFmpeg's enormous toolbox into a small set of beautifully designed, opinionated workflows. Two doors in:

- **AI Mode** — Describe what you want in plain English, we generate and run the right command.
- **Manual Mode** — A clean, modern, preset-driven UI for users who want explicit control without remembering CLI flags.

The technical engine (FFmpeg + ffprobe) is the same as HandBrake's. The difference is in the experience: pill buttons, live previews, sane defaults, and one-click presets that match how people actually use video in 2026 (YouTube uploads, IG Reels, WhatsApp shares, podcast extraction, Apple TV plays, etc.).

---

## 2. Positioning

|                              | **HandBrake**                                                                                                                | **FFMCPeg**                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Target user                  | Power users / hobbyists / pros                                                                                               | Creators, knowledge workers, casual users — and power users who want a nicer UI                                                        |
| Surface area                 | ~200 controls visible on a single window                                                                                     | Progressive disclosure: one obvious primary action per screen, advanced controls one click away                                        |
| Default experience           | "Open Source → Pick Preset → Start"                                                                                          | "Drop a file → Tell us what you want → Done"                                                                                           |
| Aesthetic                    | Native-toolkit dense (GTK / macOS Cocoa)                                                                                     | Meta-store inspired light theme, frosted glass, motion, generous whitespace                                                            |
| Differentiators they have    | DVD/Blu-ray ripping, anamorphic PAR, x264 expert syntax, mature filters, deep chapter editing                                | —                                                                                                                                      |
| Differentiators we have      | —                                                                                                                            | AI Mode (NL → FFmpeg), live frame-scrub previews, social-platform-tuned presets, modern queue UI, instant in-app preview & comparison  |
| Codebase                     | C / Objective-C / GTK                                                                                                        | Electron + React 19 + Vite + Zustand                                                                                                   |
| License                      | GPL-2                                                                                                                        | (TBD — likely MIT or Apache-2 to encourage adoption)                                                                                   |

---

## 3. Personas

1. **The Creator (primary)** — Records phone/camera footage, needs to upload to YouTube/Instagram/TikTok. Cares about: file size limits, vertical/square crops, fast exports, "Looks good on my phone".
2. **The Knowledge Worker** — Records Zoom/Loom calls, needs to share via Slack/WhatsApp/email. Cares about: trim, compress, embed audio only.
3. **The Hobbyist Archivist** — Has a media library, wants device-compatible re-encodes (Apple TV, Plex, Roku). Cares about: codec compatibility, batch processing, quality.
4. **The Power User (secondary)** — Currently uses HandBrake or raw ffmpeg. Cares about: codec/encoder choice, hardware acceleration, repeatable presets, CLI parity.

We design for personas 1 & 2 by default; personas 3 & 4 are served by progressive disclosure ("Show advanced settings" + a robust preset system).

---

## 4. What we have today (Feb 2026 baseline)

### Implemented
- **Modes**: Home with AI / Manual switcher; Settings page; Job Queue side panel.
- **Manual Mode operations**: Convert (format only), Compress (CRF slider), Extract Audio, Trim (start/end), Resize (W×H), Thumbnail extraction.
- **AI Mode**: Gemini-powered NL → operation+options translator with command preview.
- **Infra**: Electron `ffmpeg:run` IPC, ffprobe-backed media info, file dialogs, output-folder & API-key store, persistent job queue with progress events, single-frame extraction for timeline scrubbing.
- **UX polish**: Drag/drop input, YouTube-style timeline scrub previews (just shipped), pill-shaped tabs, frosted topbar, animated transitions, focus-visible system.

### Not yet implemented (gaps)
- No preset system (only ad-hoc tabs).
- No batch input (one file at a time).
- No codec / encoder selection.
- No hardware acceleration.
- No filters (denoise, deinterlace, sharpen, grayscale).
- No subtitle handling.
- No multi-track audio.
- No crop / rotate / flip.
- No bitrate or target-file-size controls.
- No watermark UI (service exists, no UI).
- No comparison preview (before/after).

---

## 5. HandBrake → FFMCPeg feature map

This is the master parity table. Each row is also a backlog item. **Status legend:** ✅ shipped · 🟡 partial · ⬜ not started · ❌ explicitly out of scope.

### 5.1 Source / input
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Open file (video/audio)                     | Drag-drop or file dialog                                                                                  | ✅     |
| Open folder of files (batch)                | "Add files" → batch queue                                                                                 | ⬜     |
| Open DVD / Blu-ray                          | Skip — legal complexity, niche                                                                            | ❌     |
| Title selection (multi-title sources)       | Auto-pick longest title; expose dropdown if >1                                                            | ⬜     |
| Angle selection                             | Skip                                                                                                      | ❌     |
| Range: Chapters / Seconds / Frames          | Trim slider already covers seconds; expose chapter picker if file has them                                | 🟡     |

### 5.2 Format / container
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| MP4 / MKV / WebM container                  | Container picker in Convert tab                                                                           | 🟡 (mp4 only well-tested) |
| Web Optimized (MOOV atom front)             | Toggle in Convert advanced section                                                                        | ⬜     |
| Align A/V Start                             | Default ON, exposed under "Advanced"                                                                      | ⬜     |
| iPod 5G Compatibility                       | Hide — legacy                                                                                             | ❌     |
| Passthru common metadata                    | Default ON                                                                                                | ⬜     |
| Optimize for streaming                      | Toggle                                                                                                    | ⬜     |

### 5.3 Presets (the killer feature)
HandBrake ships **~80 built-in presets** organized into folders: General, Web, Devices, Matroska, Hardware, Production. We will ship a curated, **modernized** set:

| FFMCPeg Preset Group       | Examples                                                                                                                                                          | Status |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Quick Export**           | Fast 1080p · Fast 720p · Balanced 1080p (default) · HQ 1080p · HQ 4K                                                                                              | ⬜     |
| **For Social**             | YouTube 1080p · YouTube 4K · Instagram Reel (9:16, ≤90s) · Instagram Square (1:1) · TikTok Vertical · X/Twitter ≤140s · WhatsApp Status (≤16 MB) · Discord 25 MB | ⬜     |
| **For Devices**            | Apple iPhone · Apple TV 4K · Android phone · Roku · Chromecast · PS5 / Xbox                                                                                       | ⬜     |
| **For Editing / Archive**  | H.265 MKV 1080p · H.265 MKV 4K · ProRes Proxy (Apple Silicon) · Lossless                                                                                          | ⬜     |
| **Audio Only**             | MP3 high quality · AAC for podcasts · WAV uncompressed · M4A for Apple                                                                                            | 🟡     |
| **Custom**                 | Save current settings as preset, import/export `.json`                                                                                                            | ⬜     |

A preset stores: container, codec(s), bitrate/CRF, framerate, target dimensions, audio settings, filters, optimize flags.

### 5.4 Dimensions
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Source dimension display                    | Show in file info panel                                                                                   | 🟡     |
| Resolution Limit (Auto/720p/1080p/4K…)      | Dropdown in Resize/preset                                                                                 | ⬜     |
| Scaled Size override                        | Width × Height inputs                                                                                     | ✅     |
| Anamorphic / PAR                            | Hidden — keep "Auto" only                                                                                 | ❌     |
| Optimal Size                                | Default ON                                                                                                | ⬜     |
| Allow Upscaling                             | Toggle                                                                                                    | ⬜     |
| Cropping (Auto / Manual / Loose)            | "Crop" tab with auto-detect-bars + drag handles on a live preview frame                                   | ⬜     |
| Flipping (horizontal / vertical)            | Buttons in Crop/Rotate tab                                                                                | ⬜     |
| Rotation (0/90/180/270°)                    | Buttons in Crop/Rotate tab                                                                                | ⬜     |
| Borders / Padding (color, size)             | Optional — under Crop advanced                                                                            | ⬜     |
| Modulus                                     | Hidden — auto                                                                                             | ❌     |

### 5.5 Filters
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Detelecine                                  | Smart auto, hidden toggle in advanced                                                                     | ⬜     |
| Interlace Detection + Deinterlace (Decomb)  | "Fix interlacing" toggle (on/off/auto) — preset = Decomb default                                          | ⬜     |
| Deblock                                     | Slider 0–10 in advanced filters                                                                           | ⬜     |
| Denoise (NLMeans / hqdn3d)                  | Three-step: Off / Light / Strong (advanced: full HandBrake presets)                                       | ⬜     |
| Chroma Smooth                               | Off / Light / Strong                                                                                      | ⬜     |
| Sharpen (unsharp / lapsharp)                | Off / Light / Strong                                                                                      | ⬜     |
| Colorspace conversion                       | Auto / sRGB / Rec.709 / Rec.2020                                                                          | ⬜     |
| Grayscale                                   | Toggle                                                                                                    | ⬜     |

### 5.6 Video
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Video encoder (x264/x265/AV1/VP9/MPEG4)     | Encoder picker (curated): H.264, H.265 (HEVC), AV1, VP9 — with hardware variants auto-detected           | ⬜     |
| Quality (CRF / QP)                          | Already have CRF; rename UI to "Quality" with descriptive ladder                                          | ✅     |
| Average bitrate                             | Alternative quality mode: "Target bitrate" slider                                                         | ⬜     |
| Target file size                            | "Fit in __ MB" — compute bitrate from duration                                                            | ⬜     |
| Multi-pass                                  | Auto-on for bitrate / file-size modes                                                                     | ⬜     |
| Framerate (Same as source / 24/30/60…)      | Dropdown                                                                                                  | ⬜     |
| FPS mode (CFR / VFR / PFR)                  | Default PFR; CFR option in advanced                                                                       | ⬜     |
| Encoder preset (placebo → ultrafast)        | "Speed vs Quality" 5-step slider mapped to preset                                                         | ⬜     |
| Encoder tune (film, animation, grain…)      | Optional dropdown in advanced                                                                             | ⬜     |
| Encoder profile / level                     | Auto by default, exposed in advanced                                                                      | ⬜     |
| Hardware acceleration (VideoToolbox/NVENC/QSV/VCN/MF) | Auto-detect available hardware on launch; expose in encoder picker as "H.264 (Apple GPU)" etc.   | ⬜     |
| HDR passthrough                             | Auto-on for HDR sources                                                                                   | ⬜     |
| x264 raw options                            | Hidden                                                                                                    | ❌     |

### 5.7 Audio
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Multi-track audio                           | List of source tracks with checkboxes                                                                     | ⬜     |
| Encoder (AAC/Opus/AC3/MP3/FLAC)             | Per-track dropdown                                                                                        | 🟡     |
| Mixdown (mono/stereo/5.1/7.1)               | Per-track dropdown                                                                                        | ⬜     |
| Bitrate / Quality                           | Per-track                                                                                                 | ⬜     |
| Samplerate                                  | Per-track (default Auto)                                                                                  | ⬜     |
| Gain / DRC                                  | Per-track sliders in advanced                                                                             | ⬜     |
| Track name passthru                         | Default ON                                                                                                | ⬜     |
| Passthru (copy without re-encode)           | "Copy audio (lossless)" toggle                                                                            | ⬜     |
| Audio normalization                         | Toggle (post-process loudnorm)                                                                            | ⬜     |
| Extract audio only                          | Existing operation; wired to preset group                                                                 | ✅     |

### 5.8 Subtitles
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Add/remove subtitle tracks (incl. external SRT) | Subtitle tab, list of tracks + "Add SRT" button                                                       | ⬜     |
| Burn-in to video                            | Per-track toggle (most-requested casual feature)                                                          | ⬜     |
| Foreign Audio Search                        | Optional, for power users                                                                                 | ⬜     |
| Closed Captions                             | Toggle                                                                                                    | ⬜     |
| Auto-transcribe (NEW, AI-powered)           | Whisper-based local transcription → editable SRT → optional burn-in                                       | ⬜     |

### 5.9 Chapters
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Chapter markers (read/write)                | Pass through if present; allow rename                                                                     | ⬜     |
| Add/remove chapters manually                | Click on timeline                                                                                         | ⬜     |

### 5.10 Queue / Workflow
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Add to queue (without starting)             | Existing queue                                                                                            | ✅     |
| Start / pause / cancel jobs                 | Existing                                                                                                  | 🟡 (pause not yet) |
| Reorder queue                               | Drag-and-drop                                                                                             | ⬜     |
| Per-job preset                              | Each queued job carries its own preset snapshot                                                           | ⬜     |
| When-done action (sleep, quit, notify)      | Dropdown                                                                                                  | ⬜     |
| Activity log                                | Hidden by default; "Show log" reveals raw ffmpeg output                                                   | ⬜     |
| Reveal in Finder/Explorer                   | Existing                                                                                                  | ✅     |

### 5.11 Preview
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Live preview (single frame)                 | Existing `extractFrame` IPC; show frame for current settings                                              | ✅     |
| Encode short preview (e.g. 30 s)            | "Preview 30 s" button → tiny encode → A/B player                                                          | ⬜     |
| Before / after split slider                 | New: drag a divider to compare source vs encoded frame                                                    | ⬜     |
| Timeline scrub thumbnail                    | Just shipped                                                                                              | ✅     |

---

## 6. Information architecture

Today's IA stays mostly intact; we add Presets and Files as first-class concepts.

```
Home  (mode picker: AI / Manual)
├─ AI Mode             — Chat → preview → run
├─ Manual Mode
│   ├─ File(s) panel   — drag/drop, multi-file, picked file metadata
│   ├─ Preset rail     — collapsed by default; opens to a curated grid
│   └─ Settings panels — Convert · Quality · Dimensions · Filters · Audio · Subtitles · Output
└─ Settings            — output folder, AI key, hardware encoders detected, theme

Persistent across pages:
- Topbar (brand + back + queue + settings)
- Queue side panel
- Toast/notification system
```

Each settings panel uses **progressive disclosure**: 2-4 most common controls always visible, an "Advanced" disclosure reveals the long tail.

---

## 7. Design principles

1. **Default to delight** — Sensible defaults beat exhaustive options. The user should be able to drop a file, hit a green button, and get a usable result.
2. **One primary action per screen** — Always a single, obvious blue pill button.
3. **Presets > knobs** — A picked preset overrides individual knobs; the knobs panel becomes a "preset adjustment" rather than a configuration matrix.
4. **Preview-first** — Wherever a setting changes a visible outcome (crop, filter, framerate), show the result on a real frame, not just a number.
5. **Progressive disclosure** — Advanced controls live behind a single click, never on the front page.
6. **Speak human** — Replace `CRF`, `pfr`, `lapsharp` with "Quality", "Auto framerate", "Soft sharpen" — but keep the technical name in a tooltip for power users.
7. **Light, calm, Meta-store inspired** — Existing visual language (DESIGN.md) stays.
8. **Zero terminal** — The user never sees a shell window. Errors are translated to plain English with suggested fixes.

---

## 8. Roadmap

We deliver the HandBrake-parity feature set in **four phases**, each releasable on its own.

### Phase 1 — Foundation (next 2-3 sprints)
**Goal:** Make the manual mode robust enough to handle 80 % of HandBrake use cases.
- [ ] Codec / encoder picker (H.264, H.265, AV1, VP9) with hardware variants auto-detected.
- [ ] Quality modes: CRF / target bitrate / target file size.
- [ ] Container picker (MP4 / MKV / WebM) + Web Optimized toggle.
- [ ] Framerate dropdown (Same as source, 24, 25, 30, 50, 60, …).
- [ ] Resolution-limit ladder (Auto, 4K, 1440p, 1080p, 720p, 480p) added to Resize.
- [ ] Crop / Rotate / Flip operation with live frame preview.
- [ ] Encoder speed slider (5 steps).
- [ ] HDR passthrough auto-detection.

### Phase 2 — Presets & Batch
**Goal:** Make the app feel "magical" via curated presets and multi-file flows.
- [ ] Preset system (built-in JSON + user `~/.ffmcp/presets/`).
- [ ] Preset picker UI on Home + on Manual mode top.
- [ ] All preset groups in §5.3 shipped.
- [ ] Multi-file drop zone → queue.
- [ ] Per-job preset snapshot + drag-reorder queue.
- [ ] When-done actions.
- [ ] Save / import / export user presets.

### Phase 3 — Filters, Audio, Subtitles
**Goal:** Reach feature parity for the rest of HandBrake's casual features.
- [ ] Filters tab: Denoise / Sharpen / Chroma smooth / Grayscale / Deinterlace (3-step controls each).
- [ ] Multi-track audio with per-track encoder/mixdown/bitrate.
- [ ] Audio loudness normalization.
- [ ] Subtitle tab with SRT import + burn-in toggle.
- [ ] AI auto-transcription → SRT (Whisper local).

### Phase 4 — Power, polish, parity
**Goal:** Win over HandBrake power users.
- [ ] Chapter editing UI.
- [ ] Encode-30-s preview + before/after split slider.
- [ ] Activity log with raw ffmpeg command shown.
- [ ] CLI option: launch ffmcp from terminal with a preset name.
- [ ] Auto-update.
- [ ] Localization scaffolding.

---

## 9. Out of scope (we are NOT building)

- DVD / Blu-ray / disc ripping (legal, niche).
- Anamorphic / advanced PAR controls.
- Raw `x264-options=` style strings.
- Detelecine custom 9-value filter strings.
- Dolby Vision authoring (parsing only via passthru).
- A non-linear editor (cuts/effects/composition). HandBrake doesn't either.
- Cloud/SaaS encoding. Strictly local-first.

---

## 10. Success metrics

| Metric                                              | Target (90 days post-Phase 2) |
| --------------------------------------------------- | ----------------------------- |
| Time from app launch → first export                 | < 30 s                        |
| Time from drop → preview frame                      | < 1 s                         |
| % of exports that use a preset (vs. manual knobs)   | > 70 %                        |
| % of exports completed without opening "Advanced"   | > 60 %                        |
| Task success rate in usability tests (5 personas)   | > 90 %                        |
| Crash-free sessions                                 | > 99.5 %                      |
| Bundle size (macOS arm64 dmg)                       | < 180 MB                      |

---

## 11. Open questions

1. **Hardware-encoder UX:** Show as separate encoder rows ("H.264 (Apple GPU)") or as a checkbox modifier on the existing rows? — Leaning separate.
2. **Preset language:** "YouTube 1080p" implies ToS positioning — do we name presets after platforms, or describe the output ("Vertical 1080×1920 ≤90s")? — Probably both: friendly name + descriptive subtitle.
3. **Local Whisper model size** — bundled 75 MB tiny vs. on-demand download? — Probably download on first use, with a "model" picker in Settings.
4. **Should AI Mode have access to the full preset library** (so it can say "I'll apply the YouTube 1080p preset")? — Yes, ship in Phase 2.
5. **License** — MIT vs Apache-2 vs GPL-3 (matching HandBrake's GPL-2 ancestry)? — TBD with maintainer.

---

## 12. References

- HandBrake repo: `./HandBrake` (vendored for reference; do not link binaries).
- HandBrake built-in presets: `./HandBrake/preset/preset_builtin.json` (~80 presets across 6 folders).
- Visual design system: `./DESIGN.md`.
- Existing IPC surface: `./electron/preload.cjs`.
- Existing operations service: `./electron/ffmpeg-service.cjs`.
