# FFMCPeg — Product Document

> A delightfully simple desktop video utility, with the power of HandBrake and the ease of an AI assistant.

**Last updated:** 2026-04-25  
**Owner:** @iamvevaar  
**Status:** Phase 1 foundation **largely complete** — Batch, curated presets, filters, and subtitles remain in Phases 2–3.

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
| Aesthetic                    | Native-toolkit dense (GTK / macOS Cocoa)                                                                                     | Meta Store–inspired light theme, frosted glass, motion, generous whitespace                                                            |
| Differentiators they have    | DVD/Blu-ray ripping, anamorphic PAR, x264 expert syntax, mature filters, deep chapter editing                                | —                                                                                                                                      |
| Differentiators we have      | —                                                                                                                            | AI Mode (NL → FFmpeg), live frame-scrub timeline previews, social-platform-tuned presets (next), modern queue UI, future compare preview |
| Codebase                     | C / Objective-C / GTK                                                                                                        | Electron + React + Vite + Zustand                                                                                                   |
| License                      | GPL-2                                                                                                                        | (TBD — likely MIT or Apache-2 to encourage adoption)                                                                                   |

---

## 3. Personas

1. **The Creator (primary)** — Records phone/camera footage, needs to upload to YouTube/Instagram/TikTok. Cares about: file size limits, vertical/square crops, fast exports, "Looks good on my phone".
2. **The Knowledge Worker** — Records Zoom/Loom calls, needs to share via Slack/WhatsApp/email. Cares about: trim, compress, embed audio only.
3. **The Hobbyist Archivist** — Has a media library, wants device-compatible re-encodes (Apple TV, Plex, Roku). Cares about: codec compatibility, batch processing, quality.
4. **The Power User (secondary)** — Currently uses HandBrake or raw ffmpeg. Cares about: codec/encoder choice, hardware acceleration, repeatable presets, CLI parity.

We design for personas 1 & 2 by default; personas 3 & 4 are served by progressive disclosure ("Show advanced settings" + a robust preset system).

---

## 4. What we have today (April 2026)

### Implemented (shipping in app)
- **Shell**: Home (AI / Manual tabs), top bar (queue, settings), no sidebar; `DESIGN.md` light theme; global back affordance; job queue side panel.
- **Manual Mode — operations** (per-tab): **Convert** (MP4 / MKV / WebM, remux; Web-optimized / `-movflags +faststart` for MP4; WebM re-encodes to VP9 + Opus), **Compress** (H.264 / H.265 / AV1 / VP9, hardware when available, CRF or target bitrate or target file size, 5-step encoder speed, framerate, HDR detect + **Preserve HDR** for H.265/AV1 with 10-bit + metadata), **Audio** extract, **Trim**, **Resize** (resolution ladder 4K→480p, custom W×H, don’t-upscale, framerate), **Transform** (rotate 0/90/180/270, flip H/V, **numeric** crop; re-encodes to H.264), **Thumbnail**.
- **AI Mode**: Gemini NL → `operation` + `options`, command JSON preview, run; prompts kept in sync with Manual (container, quality modes, codecs, resize ladder, framerate, transform, HDR, etc.).
- **Infra**: Electron IPC (`ffmpeg:run`, `ffprobe:info`, `ffmpeg:listEncoders`, `ffmpeg:extractFrame` for frames), Zustand job store, output folder + API key in store, encoders probed at startup.
- **UX**: Drag/drop, **YouTube-style timeline scrub** (debounced `extractFrame`), **HDR** read from ffprobe on file select, source FPS/dimensions for helper copy.

### Still missing vs HandBrake casual feature set
- **Preset system** (curated + user-saved) and **multi-file / batch** queue.
- **Visual crop** (drag on live frame) — transform uses numbers only.
- **Video filters** (denoise, deinterlace, sharpen, etc.).
- **Subtitles** (SRT, burn-in) and **multi-track / mixdown** audio.
- **Short encode preview** and **before/after** compare; **raw ffmpeg log** in UI.
- **Chapters** UI; **pause** in queue; **reorder** queue.
- **Watermark** (backend stub exists, no Manual/AI surface).

### Not yet implemented (gaps) — see §8 for phased plan
- Batch, presets, filters, full audio stack, subs, compare preview, chapters, CLI, auto-update, localization.

---

## 5. HandBrake → FFMCPeg feature map

Master parity table. **Status legend:** ✅ shipped · 🟡 partial / follow-up · ⬜ not started · ❌ out of scope.

### 5.1 Source / input
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Open file (video/audio)                     | Drag-drop or file dialog                                                                                  | ✅     |
| Open folder of files (batch)                | "Add files" → batch queue                                                                                 | ⬜     |
| Open DVD / Blu-ray                          | Skip — legal complexity, niche                                                                            | ❌     |
| Title selection (multi-title sources)       | Auto-pick longest title; expose dropdown if >1                                                            | ⬜     |
| Angle selection                             | Skip                                                                                                      | ❌     |
| Range: Chapters / Seconds / Frames          | Trim by seconds; chapter picker TBD                                                                       | 🟡     |

### 5.2 Format / container
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| MP4 / MKV / WebM container                  | **Convert** tab: three containers                                                                         | ✅     |
| Web Optimized (MOOV atom front)             | **Web-optimized** toggle on MP4 (`+faststart`)                                                            | ✅     |
| Align A/V Start                             | Default ON, exposed under "Advanced"                                                                      | ⬜     |
| iPod 5G Compatibility                       | Hide — legacy                                                                                             | ❌     |
| Passthru common metadata                    | Default ON                                                                                                | ⬜     |
| Optimize for streaming                      | Partially covered by faststart; dedicated toggle TBD                                                    | 🟡     |

### 5.3 Presets (the killer feature)
HandBrake ships **~80 built-in presets** organized into folders. We ship a **curated, modernized** set (Phase 2):

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
| Source dimension display                    | Shown in **Resize** / **Transform** / compress helpers (ffprobe)                                         | 🟡     |
| Resolution Limit (4K / 1440p / 1080p / …)  | **Resize** resolution ladder + custom + don’t-upscale (no separate “Auto” label; behavior = clamp to ladder / source) | 🟡     |
| Scaled Size override                        | Custom W × H with lock aspect                                                                               | ✅     |
| Anamorphic / PAR                            | Hidden — keep "Auto" only                                                                                 | ❌     |
| Optimal Size                                | "Don’t upscale" approximates not enlarging small sources                                                                 | 🟡     |
| Allow Upscaling                             | Toggle on **Resize** (allow upscale when off = enforce ladder max without forcing bigger than source when on) | ✅     |
| Cropping (manual)                           | **Transform** — numeric crop (L/T/W/H)                                                                   | 🟡     |
| Cropping (live on frame)                    | Drag handles on `extractFrame` preview                                                                   | ⬜     |
| Flipping (horizontal / vertical)            | **Transform** tab                                                                                       | ✅     |
| Rotation (0/90/180/270°)                    | **Transform** tab                                                                                        | ✅     |
| Borders / Padding (color, size)             | Optional — under Crop advanced                                                                            | ⬜     |
| Modulus                                     | Hidden — even dimensions in UI paths                                                                      | 🟡     |

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
| Video encoder (x264/x265/AV1/VP9/MPEG4)     | H.264, H.265, AV1, VP9 + **hardware** variants when detected                                            | ✅     |
| Quality (CRF / QP)                          | **Compress** quality % → per-encoder CRF/QP                                                                 | ✅     |
| Average bitrate                             | **Compress** target bitrate mode                                                                          | ✅     |
| Target file size                            | **Compress** "fit in __ MB" from duration                                                                 | ✅     |
| Multi-pass                                  | Auto-on for bitrate / file-size modes                                                                     | ⬜     |
| Framerate (Same as source / 24/30/60…)      | **Compress** + **Resize**                                                                                | ✅     |
| FPS mode (CFR / VFR / PFR)                  | Default PFR; CFR option in advanced                                                                       | ⬜     |
| Encoder preset (placebo → ultrafast)        | **5-step encoding speed** (per-encoder mapping)                                                            | ✅     |
| Encoder tune (film, animation, grain…)      | Optional dropdown in advanced                                                                             | ⬜     |
| Encoder profile / level                     | Auto by default, exposed in advanced                                                                      | ⬜     |
| Hardware acceleration (VideoToolbox/NVENC/QSP/AMF) | **listEncoders** at startup; UI toggle on **Compress**                                              | ✅     |
| HDR passthrough                             | **ffprobe** transfer detection; **Preserve HDR** on compress (H.265/AV1, 10-bit + metadata) — *not* stream-copy HDR | 🟡     |
| SDR / HDR tonemapping                        | If user turns **Preserve HDR** off, optional tone-map to SDR (TBD)                                       | ⬜     |
| x264 raw options                            | Hidden                                                                                                    | ❌     |

### 5.7 Audio
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Multi-track audio                           | List of source tracks with checkboxes                                                                     | ⬜     |
| Encoder (AAC/Opus/AC3/MP3/FLAC)             | **Extract** format picker; per-track TBD                                                                 | 🟡     |
| Mixdown (mono/stereo/5.1/7.1)               | Per-track dropdown                                                                                        | ⬜     |
| Bitrate / Quality                           | Per-track                                                                                                 | ⬜     |
| Samplerate                                  | Per-track (default Auto)                                                                                  | ⬜     |
| Gain / DRC                                  | Per-track sliders in advanced                                                                             | ⬜     |
| Track name passthru                         | Default ON                                                                                                | ⬜     |
| Passthru (copy without re-encode)           | "Copy audio (lossless)" toggle                                                                            | ⬜     |
| Audio normalization                         | Toggle (post-process loudnorm)                                                                            | ⬜     |
| Extract audio only                          | **Audio** operation                                                                                        | ✅     |

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
| Add to queue (without starting)             | **Queue** exists                                                                                        | 🟡     |
| Start / pause / cancel jobs                 | Start + cancel; **pause** TBD                                                                            | 🟡     |
| Reorder queue                               | Drag-and-drop                                                                                             | ⬜     |
| Per-job preset                              | Each queued job carries its own preset snapshot                                                           | ⬜     |
| When-done action (sleep, quit, notify)      | Dropdown                                                                                                  | ⬜     |
| Activity log                                | Hidden by default; "Show log" reveals raw ffmpeg output                                                   | ⬜     |
| Reveal in Finder/Explorer                   | If implemented via shell open                                                                               | 🟡     |

### 5.11 Preview
| HandBrake capability                        | FFMCPeg plan                                                                                              | Status |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| Live preview (single frame)                 | `extractFrame` for timeline scrub; **Transform** has no in-app frame crop overlay yet                     | 🟡     |
| Encode short preview (e.g. 30 s)            | "Preview 30 s" button → tiny encode → A/B player                                                          | ⬜     |
| Before / after split slider                 | Drag a divider to compare source vs encoded frame                                                    | ⬜     |
| Timeline scrub thumbnail                    | **Shipped** (trim, thumb, etc.)                                                                            | ✅     |

---

## 6. Information architecture

**Current:** Home → AI / Manual; Settings; queue as overlay; Manual = operation tabs (Convert, Compress, …).

**Target (Phase 2+):** add Presets and Files as first-class concepts.

```
Home  (mode picker: AI / Manual)
├─ AI Mode             — Chat → preview → run (preset-aware in Phase 2)
├─ Manual Mode
│   ├─ File(s) panel   — drag/drop, multi-file, picked file metadata
│   ├─ Preset rail     — collapsed by default; opens to a curated grid
│   └─ Settings panels — Convert · Quality · Dimensions · Filters · Audio · Subtitles · Output
└─ Settings            — output folder, AI key, hardware encoders detected, theme, (later) Whisper model

Persistent across pages:
- Topbar (brand + back + queue + settings)
- Queue side panel
- Toast/notification system (TBD)
```

Each settings panel uses **progressive disclosure**: 2-4 most common controls always visible, an "Advanced" disclosure reveals the long tail.

---

## 7. Design principles

1. **Default to delight** — Sensible defaults beat exhaustive options. The user should be able to drop a file, hit a green button, and get a usable result.
2. **One primary action per screen** — Always a single, obvious primary button.
3. **Presets > knobs** — A picked preset overrides individual knobs; the knobs panel becomes a "preset adjustment" rather than a configuration matrix.
4. **Preview-first** — Wherever a setting changes a visible outcome (crop, filter, framerate), show the result on a real frame, not just a number.
5. **Progressive disclosure** — Advanced controls live behind a single click, never on the front page.
6. **Speak human** — Replace `CRF`, `pfr`, `lapsharp` with "Quality", "Auto framerate", "Soft sharpen" — keep the technical name in a tooltip for power users.
7. **Light, calm, Meta–store inspired** — `DESIGN.md` visual language.
8. **Zero terminal** — The user never sees a shell window. Errors are translated to plain English with suggested fixes.

---

## 8. Roadmap (four phases)

Each phase is releasable on its own. **Phase 1** is treated as **done** except where noted (live crop preview, optional "Auto" resolution label, optional tonemap-to-SDR).

### Phase 1 — Foundation **(complete for core encode path)**

**Goal:** Manual mode can handle the majority of everyday transcode + trim + resize + transform + compress scenarios, with AI parity.

- [x] Codec / encoder picker (H.264, H.265, AV1, VP9) with **hardware** variants auto-detected (`ffmpeg -encoders`, UI toggle).
- [x] Quality modes: **CRF** (as quality %) / **target bitrate** / **target file size** (with duration probe).
- [x] **Container** picker: MP4 / MKV / WebM + **Web optimized** (faststart for MP4; VP9+Opus path for WebM remux from non-WebM).
- [x] **Framerate** control (same as source + common rates) on **Compress** and **Resize**.
- [x] **Resolution ladder** (4K, 1440p, 1080p, 720p, 480p, custom) + **don’t upscale** + custom W×H + aspect lock.
- [x] **Transform** operation: **rotate** (0/90/180/270), **flip** H/V, **numeric crop** (W/H from top-left).  
  *Follow-up:* drag crop + rotation on a **live frame** (not only numbers).
- [x] **Encoder speed** (5 steps) mapped per encoder (x264/x265, VP9, AV1, NVENC, VT, QSV, AMF, …).
- [x] **HDR** auto-detection (ffprobe) + **Preserve HDR** on **Compress** for H.265/AV1 (10-bit + color metadata; WebM input → MP4 out when needed).

**Phase 1 follow-ups (optional polish, not blockers)**
- [ ] Live **crop/rotate** preview on extracted frame (HandBrake parity for §5.4 "Cropping (live)").
- [ ] **Auto** as explicit label for "match source / ladder clamp" in Resize if we want copy-paste with docs.
- [ ] **Tonemap HDR → SDR** when Preserve HDR is off (explicit filter chain).
- [ ] **Watermark** surface (wire existing backend to Manual + AI).
- [ ] **Pause** a running job; **reorder** queue (rest overlap Phase 2).

---

### Phase 2 — Presets, batch, workflow **(next major milestone)**

**Goal:** One-tap social/device/archive exports and multi-file workflows.

| Requirement | Notes |
| ----------- | ----- |
| **Built-in JSON presets** | Ship first wave: Quick Export + For Social (§5.3); define schema (container, video, audio, framerate, dimensions, optimize). |
| **User preset storage** | `~/.ffmcp/presets/` (or app userData); name, description, version. |
| **Preset picker UI** | On Home (quick apply) + Manual (rail or drawer); search/filter; preview subtitle. |
| **Multi-file input** | Drop list or "Add files"; each file **or** selection becomes queued jobs. |
| **Per-job options** | Each queue item stores full snapshot (preset + overrides); no shared mutable state. |
| **Queue reorder** | Drag-and-drop; optional **pause** / **remove** (enhance current queue). |
| **When-done** | System notify / play sound / open folder / sleep / quit (platform-appropriate). |
| **Import / export** | Single preset `.json` and preset pack (zip) for share/reddit/wiki. |
| **AI + presets** | NL can say "use Discord 25MB preset" → resolve to stored preset id + file (see open questions). |
| **Metadata passthrough (basic)** | Optional toggle: copy common metadata from source (where remux/encode allows). |
| **Toast / notification layer** | Non-blocking success/error; queue badge updates. |
| **Home refresh** | Surface "Recent preset" and "Last output folder" shortcuts. |

---

### Phase 3 — Filters, audio, subtitles

**Goal:** Parity for **casual** HandBrake users who need cleanup, language, and sound control — without a full DAW.

| Area | Requirements |
| ---- | ------------ |
| **Filters tab (Manual + AI)** | Deinterlace (on/auto/off + **Decomb**-style default); denoise (Off / Light / Strong); chroma smooth; sharpen; grayscale; deblock (slider optional). Expose 3-step where possible; "Advanced" for NLMeans / full presets later. **Colorspace** (Auto, Rec.709, Rec.2020, sRGB) for edge cases. |
| **Interlace / detelecine** | Optional auto-detect; detelecine simple mode first. |
| **Audio (multi-track)** | List source audio streams; per-track: **on/off**, **codec** (AAC/Opus/AC-3/MP3/FLAC), **mixdown** (stereo / 5.1 / passthru), **bitrate/quality**, **sample rate (Auto)**. |
| **Loudness** | Optional **loudnorm**-style pass (target LUFS) with sensible default. |
| **Subtitles** | Add external **SRT**; list embedded subs; **burn-in** per track; language labels when present. |
| **AI speech → SRT** | Local **Whisper** (or on-demand model download) → editable SRT in UI → optional burn-in. **Settings:** model size, device (CPU/GPU). |
| **Filter preview** | Single-frame preview with current filter graph where feasible (`extractFrame` + same vf chain sample). |

---

### Phase 4 — Power, polish, parity

**Goal:** Retain pro users and **compare** to HandBrake for depth.

| Requirement | Notes |
| ----------- | ----- |
| **Chapters** | Read chapter markers; edit list; pass-through to container when supported. |
| **Short encode preview** | e.g. 10–30 s encode at current settings; temp file; optional A/B. |
| **Before/after** | Split or side-by-side **frame** compare (and sync slider with timeline). |
| **Activity / debug** | "Show log" with **full ffmpeg command line** + stderr tail; copy to clipboard. |
| **CLI** | `ffmcp export --preset "YouTube 1080p" input.mov` (exact UX TBD). |
| **Auto-update** | Electron updater channel; release notes. |
| **Localization** | i18n scaffolding; extract strings; community translations later. |
| **Queue pause/cancel** | Full job control; **retry failed** with same options. |
| **Batch from folder** | Optional "include subfolders" and pattern filter. |
| **Export settings profile** | Backup entire `~/.ffmcp` or sync (optional, later). |
| **Performance** | Profile large files; avoid blocking UI; optional **hardware** decode for preview. |

---

## 9. Out of scope (we are NOT building)

- DVD / Blu-ray / disc ripping (legal, niche).
- Anamorphic / advanced PAR controls.
- Raw `x264-options=` style strings.
- Detelecine custom 9-value filter strings in the main UI.
- Dolby Vision **authoring** (metadata passthru in encode only, if at all).
- A non-linear editor (cuts/effects/composition) beyond trim + static crop.
- Cloud/SaaS encoding. **Local-first** only.

---

## 10. Success metrics

| Metric                                              | Target (90 days post–Phase 2) |
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

1. **Hardware-encoder UX:** Shipped as a **checkbox** on codec with detection — revisit if we split rows per platform.
2. **Preset language:** "YouTube 1080p" vs descriptive subtitle — use **both** in Phase 2.
3. **Whisper** — bundled tiny vs. on-demand download; **Settings** model picker.
4. **AI + full preset library** — Yes in Phase 2 (resolve preset id from NL).
5. **License** — MIT vs Apache-2 vs GPL-3: TBD.

---

## 12. References

- HandBrake repo: reference only; do not ship HandBrake binaries.
- HandBrake built-in presets: `preset_builtin.json` (~80 presets).
- Visual design: `DESIGN.md`.
- IPC: `electron/preload.cjs`.
- Operations: `electron/ffmpeg-service.cjs`.
