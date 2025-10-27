const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const ffmpeg = require('fluent-ffmpeg');

// Configure FFmpeg paths for packaged app
// Check common installation locations
const possiblePaths = [
  '/opt/homebrew/bin/ffmpeg',  // Apple Silicon Homebrew
  '/usr/local/bin/ffmpeg',     // Intel Homebrew
  '/usr/bin/ffmpeg'            // System installation
];

const possibleProbePaths = [
  '/opt/homebrew/bin/ffprobe',  // Apple Silicon Homebrew
  '/usr/local/bin/ffprobe',     // Intel Homebrew
  '/usr/bin/ffprobe'            // System installation
];

// Find and set FFmpeg path
for (const ffmpegPath of possiblePaths) {
  if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('Found ffmpeg at:', ffmpegPath);
    break;
  }
}

// Find and set FFprobe path
for (const ffprobePath of possibleProbePaths) {
  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('Found ffprobe at:', ffprobePath);
    break;
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    backgroundColor: '#1e1e1e',
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools (temporarily enabled for debugging)
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// ===== IPC Handlers =====

// File dialog handlers
ipcMain.handle('open-file', async () => {
  console.log('open-file handler called');
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        {
          name: 'Videos',
          extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv']
        }
      ],
      title: 'Select a video file'
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    console.error('Error in open-file handler:', error);
    throw error;
  }
});

ipcMain.handle('save-file', async () => {
  console.log('save-file handler called');
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'vied-export.mp4',
      filters: [
        { name: 'Video', extensions: ['mp4'] }
      ],
      title: 'Save Exported Video'
    });

    if (result.canceled) {
      return null;
    }

    return result.filePath;
  } catch (error) {
    console.error('Error in save-file handler:', error);
    throw error;
  }
});

// Video metadata handler
ipcMain.handle('get-video-metadata', async (event, filePath) => {
  console.log('get-video-metadata handler called', filePath);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err);
        reject(err);
        return;
      }

      // Extract video stream information
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      if (!videoStream) {
        reject(new Error('No video stream found in file'));
        return;
      }

      // Calculate frame rate
      let fps = 0;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        fps = den ? num / den : 0;
      }

      const result = {
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: fps,
        codec: videoStream.codec_name || 'unknown',
        size: metadata.format.size || 0,
        bitrate: metadata.format.bit_rate || 0,
        hasAudio: !!audioStream,
        format: metadata.format.format_name || 'unknown',
      };

      console.log('Extracted metadata:', result);
      resolve(result);
    });
  });
});

// Video export handler
ipcMain.handle('export-video', async (event, params) => {
  console.log('export-video handler called', params);
  const { input, output, start, duration } = params;

  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)  // Where to start trimming (in seconds)
      .setDuration(duration) // How long the output should be (NOT end time!)
      .output(output)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',      // Encoding speed preset
        '-crf 23',           // Quality (18-28 range, 23 is good default)
        '-movflags +faststart' // Enable streaming/progressive download
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing:', progress);
        // progress.percent would be available here for progress bar
        // Could send to renderer via mainWindow.webContents.send() if needed
      })
      .on('end', () => {
        console.log('Export complete');
        resolve({ success: true });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(new Error(err.message));
      })
      .run();
  });
});
