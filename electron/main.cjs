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
  "operation": one of "convert" | "compress" | "extractAudio" | "trim" | "resize" | "watermark" | "thumbnail",
  "description": "brief human-readable description of what will happen",
  "options": {
    // for convert: { "outputFormat": "mp4" }
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
    //
    // for extractAudio: { "audioFormat": "mp3" }
    // for trim: { "startTime": "00:00:10", "endTime": "00:01:00" }
    // for resize: { "width": 1280, "height": 720 }
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
- Default codec is h264 if unspecified.`
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
