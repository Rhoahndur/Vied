// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: () => ipcRenderer.invoke('save-file'),

  // Video operations
  exportVideo: (params) => ipcRenderer.invoke('export-video', params),

  // Get video metadata
  getVideoMetadata: (filePath) => ipcRenderer.invoke('get-video-metadata', filePath),
});
