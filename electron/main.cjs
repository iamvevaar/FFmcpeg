'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Determine if running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Set up paths
const ffmpegPath = (() => {
  try {
    // Try system ffmpeg first
    const { execSync } = require('child_process');
    const systemPath = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
    if (systemPath && fs.existsSync(systemPath)) {
      console.log('Using system ffmpeg:', systemPath);
      return systemPath;
    }
  } catch (e) {
    // fall through
  }
  // Fallback to bundled ffmpeg-static
  let staticPath = require('ffmpeg-static');
  if (staticPath.includes('app.asar')) {
    staticPath = staticPath.replace('app.asar', 'app.asar.unpacked');
  }
  console.log('Using bundled ffmpeg:', staticPath);
  return staticPath;
})();

const ffprobePath = (() => {
  try {
    const { execSync } = require('child_process');
    const systemPath = execSync('which ffprobe', { encoding: 'utf8' }).trim();
    if (systemPath && fs.existsSync(systemPath)) return systemPath;
  } catch (e) {}
  let staticPath = require('ffprobe-static').path;
  if (staticPath.includes('app.asar')) {
    staticPath = staticPath.replace('app.asar', 'app.asar.unpacked');
  }
  return staticPath;
})();

// Store
let Store;
let store;
async function initStore() {
  if (!Store) {
    const mod = await import('electron-store');
    Store = mod.default;
    store = new Store({
      defaults: {
        outputFolder: app.getPath('downloads'),
        apiKey: '',
        theme: 'dark',
      },
    });
  }
  return store;
}

let mainWindow;

// Cache of ffmpeg-detected encoders, populated once at app startup.
// Used to advertise hardware-accelerated codecs only when they actually exist.
let availableEncoders = [];

function detectEncoders() {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-hide_banner', '-encoders']);
    let out = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { out += d; }); // some builds emit on stderr
    proc.on('error', () => resolve([]));
    proc.on('close', () => {
      const encoders = new Set();
      for (const line of out.split('\n')) {
        // Lines look like:  " V..... libx264              libx264 H.264 / AVC ..."
        // First field is flags starting with V (video) / A (audio) / S (subtitle).
        const m = line.match(/^\s*V[\w.]+\s+(\S+)/);
        if (m) encoders.add(m[1]);
      }
      resolve(Array.from(encoders).sort());
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initStore();
  // Detect available video encoders once; the renderer queries this list
  // to decide which codecs / hardware options to expose in the UI.
  availableEncoders = await detectEncoders();
  console.log(`Detected ${availableEncoders.length} video encoders`);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ─────────────────────────────────────────────────

// Open file dialog
ipcMain.handle('dialog:openFile', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'aac', 'wav', 'flac', 'm4a', 'ogg'] },
    ],
  });
  return result.filePaths[0] || null;
});

// Open folder dialog
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] || null;
});

// Get/Set store values
ipcMain.handle('store:get', async (_, key) => {
  return store.get(key);
});
ipcMain.handle('store:set', async (_, key, value) => {
  store.set(key, value);
  return true;
});
ipcMain.handle('store:getAll', async () => {
  return store.store;
});

// Reveal file in finder
ipcMain.handle('shell:showItemInFolder', (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// Get ffmpeg path
ipcMain.handle('ffmpeg:getPath', () => ffmpegPath);

// Return the list of video encoders ffmpeg knows about. Used by the UI to
// decide whether to show "Hardware acceleration (Apple GPU / NVENC / QSV)".
ipcMain.handle('ffmpeg:listEncoders', () => availableEncoders);

// ─── FFmpeg Operations ─────────────────────────────────────────────

function sendProgress(jobId, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ffmpeg:progress', { jobId, ...data });
  }
}

ipcMain.handle('ffmpeg:run', async (_, { jobId, operation, options }) => {
  return new Promise((resolve, reject) => {
    try {
      const ffmpegService = require('./ffmpeg-service.cjs');
      ffmpegService.runOperation({
        jobId,
        operation,
        options,
        ffmpegPath,
        ffprobePath,
        availableEncoders,
        outputFolder: store.get('outputFolder'),
        onProgress: (data) => sendProgress(jobId, data),
        onComplete: (result) => resolve(result),
        onError: (err) => reject(new Error(err)),
      });
    } catch (err) {
      reject(err);
    }
  });
});

// ─── AI / MCP Integration ─────────────────────────────────────────

ipcMain.handle('ai:prompt', async (_, { prompt, filePath }) => {
  const apiKey = store.get('apiKey');
  if (!apiKey) {
    throw new Error('No API key configured. Please add your Gemini API key in Settings.');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an FFmpeg expert assistant. The user wants to process a media file.
User prompt: "${prompt}"
File: "${filePath || 'not specified'}"

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{
  "operation": one of "convert" | "compress" | "extractAudio" | "trim" | "resize" | "transform" | "watermark" | "thumbnail",
  "description": "brief human-readable description of what will happen",
  "options": {
    // for convert: { "outputFormat": "mp4" | "mkv" | "webm", "webOptimized": true }
    //   webOptimized: MP4 only — -movflags +faststart. Omit or false = standard MP4. Ignored for mkv/webm.
    //
    // for compress & resize (re-encode operations only):
    //   "outputFps": "source" | "23.976" | "24" | "25" | "29.97" | "30" | "50" | "60" | "120"
    //   Omit or "source" = keep input frame rate. Otherwise output is forced to that fps.
    //
    // for compress: choose ONE of three quality modes, and OPTIONALLY pick a codec:
    //   Codec (optional, default "h264"):
    //     "codec": "h264" | "h265" | "av1" | "vp9"
    //     "useHardware": true   // optional, true = use Apple/NVIDIA/Intel GPU encoder if available
    //
    //   1) Quality (CRF) — best for "high quality / good quality / small file":
    //      { "qualityMode": "crf", "quality": 28 }   // 18=high, 51=lowest
    //   2) Target bitrate — best for "at X Mbps / X kbps bitrate":
    //      { "qualityMode": "bitrate", "bitrateKbps": 5000 }   // kbps
    //   3) Target file size — best for "fit in X MB / under X MB / for Discord/WhatsApp":
    //      { "qualityMode": "filesize", "targetSizeMB": 25 }
    //   "encoderSpeed": 1 | 2 | 3 | 4 | 5  // 1=fastest encode, 5=slowest (smaller on average). Default 3.
    //   "preserveHdr": true   // if input is HDR, keep 10-bit + metadata (H.265 or AV1). Omit false.
    //   (optional, filled by app when known) "colorTransfer", "colorPrimaries", "colorSpace", "pixFmtIn"
    //
    // for extractAudio: { "audioFormat": "mp3" }
    // for trim: { "startTime": "00:00:10", "endTime": "00:01:00" }
    // for transform: {
    //   "rotate": 0 | 90 | 180 | 270,   // degrees clockwise; 0 = no rotation
    //   "flipH": true, "flipV": true,  // optional horizontal / vertical flips
    //   "cropW": 0, "cropH": 0, "cropX": 0, "cropY": 0
    // }   // crop in pixels; use cropW=0 and cropH=0 to mean no crop. At least one of rotate, flip, or non-zero crop must be set.
    // for resize: { "width": 1280, "height": 720 }
    //   Common presets (assume 16:9 landscape unless user mentions vertical/portrait):
    //     "4K"     → width=3840, height=2160
    //     "1440p"  → width=2560, height=1440
    //     "1080p"  → width=1920, height=1080
    //     "720p"   → width=1280, height=720
    //     "480p"   → width=854,  height=480
    //   For vertical/portrait (Reels, TikTok, Stories), swap width/height:
    //     "1080p vertical" → width=1080, height=1920
    // for thumbnail: { "timestamp": "00:00:05" }
  }
}

Parse the user's intent carefully.
Compress hints:
- "compress by 50%" / "50% quality"  → qualityMode=crf, quality≈32
- "high quality" / "lossless-ish"     → qualityMode=crf, quality 18-22
- "small file" / "very compressed"    → qualityMode=crf, quality 35-40
- "fit in 25 MB" / "under 16 MB"      → qualityMode=filesize, targetSizeMB=<the number>
- "for Discord"                       → qualityMode=filesize, targetSizeMB=25
- "for WhatsApp"                      → qualityMode=filesize, targetSizeMB=16
- "at 5 Mbps" / "5000 kbps"           → qualityMode=bitrate, bitrateKbps=<computed in kbps>
- If user says only "compress" without specifics, default to qualityMode=crf, quality=28.

Codec hints:
- "use H.265" / "HEVC"                 → codec="h265"
- "use AV1"                            → codec="av1"
- "use VP9" / "for the web"            → codec="vp9"
- "use my GPU" / "hardware accel"      → useHardware=true
- Default codec is h264 if unspecified.

HDR (compress, optional):
- "keep hdr" / "preserve hdr" / "don't tonemap"  → preserveHdr=true, codec h265 or av1
- H.264 / VP9 cannot preserve HDR in this app — use H.265 or AV1

Encoder speed (compress only, optional, default 3):
- "fast as possible" / "quickest encode" → encoderSpeed=1
- "fast encoding" / "don't wait"        → encoderSpeed=2
- "best compression" / "smallest file" / "take your time" → encoderSpeed=4 or 5
- "balanced" / omit                    → encoderSpeed=3

Framerate hints (compress / resize only — not convert with stream copy):
- "24 fps" / "film frame rate"           → outputFps="24"
- "30 fps" / "YouTube standard"         → outputFps="30"
- "25 fps" / "PAL"                      → outputFps="25"
- "60 fps"                              → outputFps="60"
- "keep original frame rate"            → outputFps="source"

Convert hints:
- "remux to mkv" / "put in Matroska"     → outputFormat=mkv
- "as webm" / "to WebM"                 → outputFormat=webm
- "mp4" / "convert to MP4"             → outputFormat=mp4 (omit webOptimized or true for -movflags +faststart)
- "for YouTube" / "streaming" / "progressive" → outputFormat=mp4, webOptimized=true
- "raw mp4" / "no fast start"          → outputFormat=mp4, webOptimized=false

Transform hints:
- "rotate 90" / "turn sideways"     → transform, rotate=90
- "rotate 180" / "upside down"     → transform, rotate=180
- "flip horizontally" / "mirror"  → transform, flipH=true
- "flip vertical"                   → transform, flipV=true
- "crop to 1280x720" (numeric box)  → transform, cropW=1280, cropH=720, cropX, cropY as needed

Resize hints:
- "make it 720p" / "downscale to 720p" → resize, width=1280, height=720
- "convert to 1080p"                    → resize, width=1920, height=1080
- "4K" / "upscale to 4K"                → resize, width=3840, height=2160
- "for Instagram Reels (vertical 1080p)" → resize, width=1080, height=1920
- "shrink to half"                      → use Convert/Compress; resize requires explicit dims.`
            }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Clean JSON from possible markdown code blocks
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return parsed;
  } catch (err) {
    throw new Error(`AI parsing failed: ${err.message}`);
  }
});

// Extract a single frame at a given timestamp as a JPEG data URL
// Used for YouTube-style timeline scrubbing previews.
ipcMain.handle('ffmpeg:extractFrame', async (_, { filePath, timestampSec, width = 240 }) => {
  return new Promise((resolve, reject) => {
    if (!filePath) return reject(new Error('filePath required'));
    const ts = Math.max(0, Number(timestampSec) || 0);
    const args = [
      // Fast seek before -i for speed; accurate enough for previews
      '-ss', String(ts),
      '-i', filePath,
      '-frames:v', '1',
      '-vf', `scale=${width}:-2`,
      '-f', 'image2',
      '-vcodec', 'mjpeg',
      '-q:v', '5',
      '-loglevel', 'error',
      'pipe:1',
    ];
    const proc = spawn(ffmpegPath, args);
    const chunks = [];
    let stderrBuf = '';
    proc.stdout.on('data', d => chunks.push(d));
    proc.stderr.on('data', d => { stderrBuf += d; });
    proc.on('error', reject);
    proc.on('close', code => {
      if (code === 0 && chunks.length > 0) {
        const buf = Buffer.concat(chunks);
        resolve(`data:image/jpeg;base64,${buf.toString('base64')}`);
      } else {
        reject(new Error(stderrBuf.trim() || 'ffmpeg frame extraction failed'));
      }
    });
  });
});

// Get media file info via ffprobe
ipcMain.handle('ffprobe:info', async (_, filePath) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];
    const proc = spawn(ffprobePath, args);
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (code === 0) {
        try { resolve(JSON.parse(out)); }
        catch(e) { reject(new Error('Failed to parse media info')); }
      } else {
        reject(new Error(err || 'ffprobe failed'));
      }
    });
  });
});
