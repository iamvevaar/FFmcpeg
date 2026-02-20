'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ffmcp', {
  // File dialogs
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // FFmpeg operations
  runOperation: (jobId, operation, options) =>
    ipcRenderer.invoke('ffmpeg:run', { jobId, operation, options }),
  onProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('ffmpeg:progress', handler);
    return () => ipcRenderer.removeListener('ffmpeg:progress', handler);
  },
  getFFmpegPath: () => ipcRenderer.invoke('ffmpeg:getPath'),

  // Media info
  getMediaInfo: (filePath) => ipcRenderer.invoke('ffprobe:info', filePath),

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
