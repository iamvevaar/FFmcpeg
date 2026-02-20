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
  const staticPath = require('ffmpeg-static');
  console.log('Using bundled ffmpeg:', staticPath);
  return staticPath;
})();

const ffprobePath = (() => {
  try {
    const { execSync } = require('child_process');
    const systemPath = execSync('which ffprobe', { encoding: 'utf8' }).trim();
    if (systemPath && fs.existsSync(systemPath)) return systemPath;
  } catch (e) {}
  return require('ffprobe-static').path;
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
    // for compress: { "quality": 28 } (CRF value 18=high quality, 51=lowest)
    // for extractAudio: { "audioFormat": "mp3" }
    // for trim: { "startTime": "00:00:10", "endTime": "00:01:00" }
    // for resize: { "width": 1280, "height": 720 }
    // for thumbnail: { "timestamp": "00:00:05" }
  }
}

Parse the user's intent carefully. For "compress by 50%" use CRF around 32. For "high quality" use CRF 18-22. For "small file" use CRF 35-40.`
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
