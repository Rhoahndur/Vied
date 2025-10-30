const { app, BrowserWindow, ipcMain, dialog, desktopCapturer, shell, systemPreferences, protocol } = require('electron');
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

// Register custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vied-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Vied',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Allow loading local files
    },
    backgroundColor: '#1e1e1e',
  });

  // Load the index.html of the app (handled by electron-forge webpack)
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Set CSP to allow custom protocol for media
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; media-src 'self' vied-media: file: data: blob:; img-src 'self' data: blob:; connect-src 'self' ws: wss:;"
        ]
      }
    });
  });

  // Open the DevTools (temporarily enabled for debugging)
  mainWindow.webContents.openDevTools();
};

// Register custom protocol to serve local video files
app.whenReady().then(() => {
  // Register protocol for serving local media files
  protocol.registerFileProtocol('vied-media', (request, callback) => {
    const url = request.url.replace('vied-media://', '');
    const decodedPath = decodeURIComponent(url);

    try {
      return callback({ path: decodedPath });
    } catch (error) {
      console.error('Error serving media file:', error);
      return callback({ error: -2 }); // net::FAILED
    }
  });

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

ipcMain.handle('save-file', async (event, format = 'mp4') => {
  console.log('save-file handler called with format:', format);
  try {
    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFilename = `vied-export-${timestamp}.${format}`;

    // Set up filters based on format
    const filters = {
      mp4: [{ name: 'MP4 Video', extensions: ['mp4'] }],
      mov: [{ name: 'MOV Video', extensions: ['mov'] }],
      webm: [{ name: 'WebM Video', extensions: ['webm'] }]
    };

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFilename,
      filters: filters[format] || filters.mp4,
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

// Convert .mov to .mp4 for better browser compatibility
ipcMain.handle('convert-mov-to-mp4', async (event, movFilePath) => {
  console.log('convert-mov-to-mp4 handler called', movFilePath);

  return new Promise((resolve, reject) => {
    // Create output path in temp directory with a simple name to avoid path issues
    const tempDir = require('os').tmpdir();
    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `vied-converted-${timestamp}.mp4`);

    console.log('Converting', movFilePath, 'to', outputPath);

    ffmpeg(movFilePath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset ultrafast',  // Faster conversion
        '-crf 23',
        '-movflags +faststart'
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Conversion progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        console.log('Conversion complete:', outputPath);
        // Verify file exists
        if (fs.existsSync(outputPath)) {
          console.log('Verified converted file exists');
          resolve(outputPath);
        } else {
          reject(new Error('Converted file was not created'));
        }
      })
      .on('error', (err) => {
        console.error('Conversion error:', err);
        reject(new Error(`Failed to convert .mov file: ${err.message}`));
      })
      .run();
  });
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
  const { input, output, start, duration, format = 'mp4' } = params;

  // Safety check: prevent overwriting input file
  if (path.resolve(input) === path.resolve(output)) {
    throw new Error('Cannot export to the same file as the input. Please choose a different output filename.');
  }

  // Configure codecs and options based on format
  let videoCodec, audioCodec, outputOptions;

  switch (format) {
    case 'webm':
      videoCodec = 'libvpx-vp9';
      audioCodec = 'libopus';
      outputOptions = [
        '-crf 30',           // Quality for VP9 (15-35 range, 30 is good default)
        '-b:v 0',            // Use constant quality mode
        '-deadline good',    // Encoding speed (best, good, realtime)
        '-cpu-used 2'        // CPU usage (0-5, lower is slower but better quality)
      ];
      break;

    case 'mov':
      videoCodec = 'libx264';
      audioCodec = 'aac';
      outputOptions = [
        '-preset fast',
        '-crf 23',
        '-movflags +faststart'
      ];
      break;

    case 'mp4':
    default:
      videoCodec = 'libx264';
      audioCodec = 'aac';
      outputOptions = [
        '-preset fast',
        '-crf 23',
        '-movflags +faststart'
      ];
      break;
  }

  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)  // Where to start trimming (in seconds)
      .setDuration(duration) // How long the output should be (NOT end time!)
      .output(output)
      .videoCodec(videoCodec)
      .audioCodec(audioCodec)
      .outputOptions(outputOptions)
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

// Export multiple clips handler (concatenate clips in sequence)
ipcMain.handle('export-clips', async (event, params) => {
  console.log('export-clips handler called', params);
  const { input, output, clips, format = 'mp4' } = params;

  // Safety check: prevent overwriting input file
  if (path.resolve(input) === path.resolve(output)) {
    throw new Error('Cannot export to the same file as the input. Please choose a different output filename.');
  }

  // Configure codecs and options based on format
  let videoCodec, audioCodec, outputOptions;

  switch (format) {
    case 'webm':
      videoCodec = 'libvpx-vp9';
      audioCodec = 'libopus';
      outputOptions = [
        '-crf 30',
        '-b:v 0',
        '-deadline good',
        '-cpu-used 2'
      ];
      break;

    case 'mov':
      videoCodec = 'libx264';
      audioCodec = 'aac';
      outputOptions = [
        '-preset fast',
        '-crf 23',
        '-movflags +faststart'
      ];
      break;

    case 'mp4':
    default:
      videoCodec = 'libx264';
      audioCodec = 'aac';
      outputOptions = [
        '-preset fast',
        '-crf 23'
      ];
      break;
  }

  return new Promise(async (resolve, reject) => {
    try {
      const tempDir = app.getPath('temp');
      const timestamp = Date.now();
      const tempClipFiles = [];
      const concatListPath = path.join(tempDir, `vied-concat-list-${timestamp}.txt`);

      // Step 1: Extract each clip to a temporary file
      console.log(`Extracting ${clips.length} clips...`);

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const tempClipPath = path.join(tempDir, `vied-clip-${timestamp}-${i}.${format}`);
        tempClipFiles.push(tempClipPath);

        await new Promise((resolveClip, rejectClip) => {
          ffmpeg(input)
            .setStartTime(clip.start)
            .setDuration(clip.duration)
            .output(tempClipPath)
            .videoCodec(videoCodec)
            .audioCodec(audioCodec)
            .outputOptions(outputOptions)
            .on('start', (commandLine) => {
              console.log(`Extracting clip ${i + 1}/${clips.length}:`, commandLine);
            })
            .on('end', () => {
              console.log(`Clip ${i + 1}/${clips.length} extracted`);
              resolveClip();
            })
            .on('error', (err) => {
              console.error(`Error extracting clip ${i + 1}:`, err);
              rejectClip(err);
            })
            .run();
        });
      }

      // Step 2: Create concat list file
      const concatList = tempClipFiles.map(f => `file '${f}'`).join('\n');
      fs.writeFileSync(concatListPath, concatList);
      console.log('Concat list created:', concatListPath);

      // Step 3: Concatenate clips
      console.log('Concatenating clips...');
      await new Promise((resolveConcat, rejectConcat) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions([
            '-c copy',  // Copy streams without re-encoding for speed
            '-movflags +faststart'
          ])
          .output(output)
          .on('start', (commandLine) => {
            console.log('FFmpeg concat command:', commandLine);
          })
          .on('end', () => {
            console.log('Concatenation complete');
            resolveConcat();
          })
          .on('error', (err) => {
            console.error('Concatenation error:', err);
            rejectConcat(err);
          })
          .run();
      });

      // Step 4: Clean up temporary files
      console.log('Cleaning up temporary files...');
      for (const tempFile of tempClipFiles) {
        try {
          fs.unlinkSync(tempFile);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      }
      try {
        fs.unlinkSync(concatListPath);
      } catch (err) {
        console.error('Error deleting concat list:', err);
      }

      console.log('Export complete!');
      resolve({ success: true });
    } catch (error) {
      console.error('Export clips error:', error);
      reject(new Error(error.message));
    }
  });
});

// Screen recording - check permission status
ipcMain.handle('check-screen-permission', async () => {
  console.log('check-screen-permission handler called');

  if (process.platform !== 'darwin') {
    // Non-macOS platforms don't need permission
    return { hasPermission: true, platform: process.platform };
  }

  try {
    // On macOS, check screen capture access
    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log('Screen recording permission status:', status);

    return {
      hasPermission: status === 'granted',
      status: status,
      platform: 'darwin'
    };
  } catch (error) {
    console.error('Error checking screen permission:', error);
    return { hasPermission: false, error: error.message };
  }
});

// Screen recording - open system preferences
ipcMain.handle('open-system-preferences', async (event, type = 'screen') => {
  console.log('open-system-preferences handler called for:', type);

  if (process.platform === 'darwin') {
    if (type === 'camera') {
      // Open Camera section in System Settings
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera');
    } else {
      // Open Screen Recording section in System Settings
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
  }
});

// Camera - check permission status
ipcMain.handle('check-camera-permission', async () => {
  console.log('check-camera-permission handler called');

  if (process.platform !== 'darwin') {
    // Non-macOS platforms don't need permission check via this API
    return { hasPermission: true, platform: process.platform };
  }

  try {
    // On macOS, check camera access
    const status = systemPreferences.getMediaAccessStatus('camera');
    console.log('Camera permission status:', status);

    return {
      hasPermission: status === 'granted',
      status: status,
      platform: 'darwin'
    };
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return { hasPermission: false, error: error.message };
  }
});

// Camera - request permission
ipcMain.handle('request-camera-permission', async () => {
  console.log('request-camera-permission handler called');

  if (process.platform !== 'darwin') {
    return { hasPermission: true, platform: process.platform };
  }

  try {
    // This will trigger the permission prompt if not already granted
    const granted = await systemPreferences.askForMediaAccess('camera');
    console.log('Camera permission granted:', granted);

    return {
      hasPermission: granted,
      platform: 'darwin'
    };
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return { hasPermission: false, error: error.message };
  }
});

// Screen recording - get available sources
ipcMain.handle('get-sources', async () => {
  console.log('get-sources handler called');
  try {
    // Check screen recording permission on macOS
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen');
      console.log('Screen recording permission status:', status);

      if (status === 'denied') {
        throw new Error('Screen recording permission denied. Please enable it in System Settings > Privacy & Security > Screen Recording.');
      }

      if (status === 'not-determined') {
        // First time - this will trigger the system permission dialog
        console.log('Screen recording permission not determined, will be requested on first capture');
      }
    }

    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 }
    });

    console.log(`Found ${sources.length} screen sources`);

    // Convert thumbnail to data URL for renderer process
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      display_id: source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    // Provide more helpful error message
    if (error.message === 'Failed to get sources.') {
      throw new Error('Screen recording permission denied. Please enable screen recording permission in System Settings > Privacy & Security > Screen Recording, then quit and restart Vied.');
    }
    throw error;
  }
});

// Screen recording - save recorded video
ipcMain.handle('save-recording', async (event, buffer) => {
  console.log('save-recording handler called');
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'screen-recording.mp4',
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'WebM Video', extensions: ['webm'] }
      ],
      title: 'Save Screen Recording'
    });

    if (result.canceled) {
      return null;
    }

    const filePath = result.filePath;
    const isMP4 = filePath.toLowerCase().endsWith('.mp4');

    // Write the buffer to a temporary webm file first
    const tempWebmPath = path.join(app.getPath('temp'), `temp-recording-${Date.now()}.webm`);
    await fs.promises.writeFile(tempWebmPath, Buffer.from(buffer));

    // If user wants MP4, convert it; otherwise just rename the temp file
    if (isMP4) {
      console.log('Converting WebM to MP4...');
      await new Promise((resolve, reject) => {
        ffmpeg(tempWebmPath)
          .output(filePath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset fast',
            '-crf 23',
            '-movflags +faststart'
          ])
          .on('start', (commandLine) => {
            console.log('FFmpeg conversion command:', commandLine);
          })
          .on('end', () => {
            console.log('Conversion complete');
            // Clean up temp file
            fs.unlink(tempWebmPath, (err) => {
              if (err) console.error('Error deleting temp file:', err);
            });
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg conversion error:', err);
            // Clean up temp file
            fs.unlink(tempWebmPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            });
            reject(new Error(err.message));
          })
          .run();
      });
    } else {
      // Just move the webm file
      await fs.promises.rename(tempWebmPath, filePath);
    }

    console.log('Recording saved to:', filePath);
    return filePath;
  } catch (error) {
    console.error('Error saving recording:', error);
    throw error;
  }
});

// Generate video thumbnail
ipcMain.handle('generate-thumbnail', async (event, filePath) => {
  console.log('generate-thumbnail handler called', filePath);

  return new Promise((resolve, reject) => {
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const thumbnailPath = path.join(tempDir, `vied-thumbnail-${timestamp}.jpg`);

    ffmpeg(filePath)
      .screenshots({
        count: 1,
        folder: tempDir,
        filename: `vied-thumbnail-${timestamp}.jpg`,
        size: '320x180',
        timemarks: ['5%']  // Take screenshot at 5% into the video
      })
      .on('end', () => {
        console.log('Thumbnail generated:', thumbnailPath);
        // Read the thumbnail and convert to base64
        try {
          const thumbnailData = fs.readFileSync(thumbnailPath);
          const base64Thumbnail = `data:image/jpeg;base64,${thumbnailData.toString('base64')}`;
          // Clean up the temp file
          fs.unlinkSync(thumbnailPath);
          resolve(base64Thumbnail);
        } catch (err) {
          console.error('Error reading thumbnail:', err);
          reject(err);
        }
      })
      .on('error', (err) => {
        console.error('Error generating thumbnail:', err);
        reject(err);
      });
  });
});
