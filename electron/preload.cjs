'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('ffmcp', {
  // File dialogs
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // Resolve a renderer-side File (drag-drop / <input type="file">) to its
  // absolute filesystem path. Electron 32 removed File.path; the supported
  // replacement is webUtils.getPathForFile, which must be reached through
  // preload because contextIsolation hides the electron module from renderers.
  getPathForFile: (file) => {
    try { return webUtils.getPathForFile(file) || ''; }
    catch { return ''; }
  },

  // FFmpeg operations
  runOperation: (jobId, operation, options) =>
    ipcRenderer.invoke('ffmpeg:run', { jobId, operation, options }),
  onProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('ffmpeg:progress', handler);
    return () => ipcRenderer.removeListener('ffmpeg:progress', handler);
  },
  getFFmpegPath: () => ipcRenderer.invoke('ffmpeg:getPath'),
  listEncoders: () => ipcRenderer.invoke('ffmpeg:listEncoders'),

  // Media info
  getMediaInfo: (filePath) => ipcRenderer.invoke('ffprobe:info', filePath),

  // Extract a single frame as a JPEG data URL (for timeline scrub previews)
  extractFrame: (filePath, timestampSec, width) =>
    ipcRenderer.invoke('ffmpeg:extractFrame', { filePath, timestampSec, width }),

  // AI mode
  sendPrompt: (prompt, filePath) =>
    ipcRenderer.invoke('ai:prompt', { prompt, filePath }),

  // Settings store
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    getAll: () => ipcRenderer.invoke('store:getAll'),
  },

  // Shell utilities
  showInFolder: (filePath) =>
    ipcRenderer.invoke('shell:showItemInFolder', filePath),
});
