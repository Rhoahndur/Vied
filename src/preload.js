// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (format) => ipcRenderer.invoke('save-file', format),

  // Video operations
  exportVideo: (params) => ipcRenderer.invoke('export-video', params),
  exportClips: (params) => ipcRenderer.invoke('export-clips', params),

  // Get video metadata
  getVideoMetadata: (filePath) => ipcRenderer.invoke('get-video-metadata', filePath),

  // Convert .mov to .mp4
  convertMovToMp4: (movFilePath) => ipcRenderer.invoke('convert-mov-to-mp4', movFilePath),

  // Get file path from File object (for drag and drop)
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // Screen recording
  checkScreenPermission: () => ipcRenderer.invoke('check-screen-permission'),
  openSystemPreferences: (type) => ipcRenderer.invoke('open-system-preferences', type),
  getSources: () => ipcRenderer.invoke('get-sources'),
  saveRecording: (buffer) => ipcRenderer.invoke('save-recording', buffer),

  // Camera
  checkCameraPermission: () => ipcRenderer.invoke('check-camera-permission'),
  requestCameraPermission: () => ipcRenderer.invoke('request-camera-permission'),

  // FFmpeg-based camera recording
  getCameraDevices: () => ipcRenderer.invoke('get-camera-devices'),
  startFfmpegRecording: (params) => ipcRenderer.invoke('start-ffmpeg-recording', params),
  stopFfmpegRecording: () => ipcRenderer.invoke('stop-ffmpeg-recording'),

  // Thumbnail generation
  generateThumbnail: (filePath) => ipcRenderer.invoke('generate-thumbnail', filePath),

  // Export progress listener
  onExportProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('export-progress', subscription);
    // Return cleanup function
    return () => ipcRenderer.removeListener('export-progress', subscription);
  },
});
