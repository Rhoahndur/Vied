# ClipForge MVP - Task List by PR

**Project:** ClipForge Desktop Video Editor  
**MVP Deadline:** Tuesday, October 28th, 10:59 PM CT  
**Start Date:** Monday, October 27th

---

## Project File Structure

```
clipforge/
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── webpack.config.js           (auto-generated)
├── forge.config.js             (auto-generated)
│
├── src/
│   ├── index.js               # Main process (Electron, Node.js)
│   ├── preload.js             # IPC bridge
│   ├── renderer.js            # React entry point
│   ├── index.html             # HTML shell
│   ├── App.jsx                # Main React component
│   │
│   ├── components/
│   │   ├── ImportButton.jsx   # File import UI
│   │   ├── VideoPreview.jsx   # Video player component
│   │   ├── Timeline.jsx       # Timeline visualization
│   │   ├── TrimControls.jsx   # Trim IN/OUT controls
│   │   └── ExportButton.jsx   # Export functionality
│   │
│   ├── utils/
│   │   └── formatTime.js      # Time formatting helpers
│   │
│   └── styles/
│       └── app.css            # Global styles
│
├── dist/                       # Build output (gitignored)
└── out/                        # Packaged app (gitignored)
```

---

## PR Breakdown

### PR #1: Project Setup & Configuration ⚙️
**Estimated Time:** 1-2 hours  
**Branch:** `feat/project-setup`  
**Goal:** Get Electron + React running with FFmpeg installed

#### Tasks:
- [ ] Install Homebrew (if not already installed)
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

- [ ] Install FFmpeg system-wide
  ```bash
  brew install ffmpeg
  ffmpeg -version  # Verify installation
  ```

- [ ] Create Electron project with React template
  ```bash
  npx create-electron-app clipforge --template=webpack
  cd clipforge
  ```

- [ ] Install dependencies
  ```bash
  npm install react react-dom
  npm install fluent-ffmpeg
  npm install electron-builder --save-dev
  ```

- [ ] Initialize Git repository
  ```bash
  git init
  git add .
  git commit -m "Initial project setup with Electron + React"
  ```

- [ ] Create `.gitignore` file
  **File:** `.gitignore`
  ```
  node_modules/
  dist/
  out/
  .DS_Store
  *.log
  .env
  ```

- [ ] Update `package.json` with build scripts
  **File:** `package.json`
  ```json
  {
    "scripts": {
      "start": "electron-forge start",
      "package": "electron-forge package",
      "make": "electron-forge make",
      "build": "electron-builder --mac"
    },
    "build": {
      "appId": "com.clipforge.app",
      "productName": "ClipForge",
      "mac": {
        "category": "public.app-category.video",
        "target": "dmg"
      }
    }
  }
  ```

- [ ] Create basic README
  **File:** `README.md`
  ```markdown
  # ClipForge MVP
  
  Desktop video editor built with Electron + React
  
  ## Setup
  1. Install FFmpeg: `brew install ffmpeg`
  2. Install dependencies: `npm install`
  3. Run: `npm start`
  ```

- [ ] Test that app launches
  ```bash
  npm start
  ```

- [ ] Verify you see default Electron window

**Files Created/Modified:**
- `package.json` (modified - add build scripts)
- `.gitignore` (created)
- `README.md` (created)

**Commit Message:** `feat: initial project setup with Electron, React, and FFmpeg dependencies`

**PR Merge Checklist:**
- [ ] App launches with `npm start`
- [ ] FFmpeg installed and verified
- [ ] All dependencies in package.json
- [ ] README has setup instructions

---

### PR #2: Basic UI Structure & React Setup 🎨
**Estimated Time:** 1-2 hours  
**Branch:** `feat/basic-ui-setup`  
**Goal:** Create React component structure and basic UI layout

#### Tasks:
- [ ] Create `src/App.jsx` with basic layout
  **File:** `src/App.jsx` (CREATE NEW)
  ```javascript
  import React, { useState } from 'react';
  import './styles/app.css';

  function App() {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ClipForge MVP</h1>
        </header>
        
        <main className="app-main">
          <div className="control-panel">
            <p>Controls will go here</p>
          </div>
          
          <div className="preview-section">
            <p>Video preview will go here</p>
          </div>
          
          <div className="timeline-section">
            <p>Timeline will go here</p>
          </div>
        </main>
      </div>
    );
  }

  export default App;
  ```

- [ ] Update `src/renderer.js` to render React app
  **File:** `src/renderer.js` (MODIFY)
  ```javascript
  import React from 'react';
  import ReactDOM from 'react-dom';
  import App from './App';

  const root = document.getElementById('root');
  ReactDOM.render(<App />, root);
  ```

- [ ] Update `src/index.html` to add root div
  **File:** `src/index.html` (MODIFY)
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>ClipForge MVP</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
  ```

- [ ] Create basic stylesheet
  **File:** `src/styles/app.css` (CREATE NEW - create folder first)
  ```css
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #1e1e1e;
    color: #ffffff;
  }

  .app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    padding: 15px 20px;
    background-color: #252525;
    border-bottom: 1px solid #3a3a3a;
  }

  .app-header h1 {
    font-size: 20px;
    font-weight: 600;
  }

  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: hidden;
  }

  .control-panel {
    padding: 15px;
    background-color: #252525;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .preview-section {
    flex: 1;
    background-color: #252525;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .timeline-section {
    height: 150px;
    background-color: #252525;
    border-radius: 8px;
    padding: 15px;
  }

  button {
    padding: 10px 20px;
    font-size: 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }
  ```

- [ ] Create components directory
  ```bash
  mkdir -p src/components
  mkdir -p src/utils
  mkdir -p src/styles
  ```

- [ ] Test app renders React UI
  ```bash
  npm start
  ```

- [ ] Verify basic layout displays

**Files Created/Modified:**
- `src/App.jsx` (created)
- `src/renderer.js` (modified)
- `src/index.html` (modified)
- `src/styles/app.css` (created)

**Commit Message:** `feat: add React component structure and basic UI layout`

**PR Merge Checklist:**
- [ ] React app renders successfully
- [ ] Basic layout structure visible
- [ ] Styles applied correctly
- [ ] No console errors

---

### PR #3: IPC Communication Setup 🔌
**Estimated Time:** 1 hour  
**Branch:** `feat/ipc-setup`  
**Goal:** Set up communication between main process and renderer

#### Tasks:
- [ ] Create `src/preload.js` with IPC bridge
  **File:** `src/preload.js` (CREATE NEW)
  ```javascript
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
  ```

- [ ] Update `src/index.js` main process
  **File:** `src/index.js` (MODIFY - likely already exists from template)
  ```javascript
  const { app, BrowserWindow, ipcMain, dialog } = require('electron');
  const path = require('path');

  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
      },
      backgroundColor: '#1e1e1e',
      titleBarStyle: 'hiddenInset', // macOS native look
    });

    // Load the index.html
    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools(); // Auto-open DevTools in dev
    } else {
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // IPC Handlers (placeholders for now)
  ipcMain.handle('open-file', async () => {
    console.log('open-file handler called');
    return null; // Will implement in next PR
  });

  ipcMain.handle('save-file', async () => {
    console.log('save-file handler called');
    return null; // Will implement in next PR
  });

  ipcMain.handle('export-video', async (event, params) => {
    console.log('export-video handler called', params);
    return { success: false }; // Will implement in next PR
  });

  ipcMain.handle('get-video-metadata', async (event, filePath) => {
    console.log('get-video-metadata handler called', filePath);
    return null; // Will implement in next PR
  });
  ```

- [ ] Test IPC bridge by adding test button in App.jsx
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  // Add inside App component
  const testIPC = async () => {
    console.log('Testing IPC...');
    const result = await window.electron.openFile();
    console.log('IPC result:', result);
  };

  // Add button in JSX
  <button onClick={testIPC}>Test IPC</button>
  ```

- [ ] Run app and test button
  ```bash
  npm start
  ```

- [ ] Check both browser console and terminal for logs

- [ ] Remove test button after verification

**Files Created/Modified:**
- `src/preload.js` (created)
- `src/index.js` (modified)
- `src/App.jsx` (modified temporarily for testing)

**Commit Message:** `feat: setup IPC communication bridge between main and renderer processes`

**PR Merge Checklist:**
- [ ] Preload script loads correctly
- [ ] window.electron is available in renderer
- [ ] IPC handlers respond (even with placeholder data)
- [ ] No security warnings in console

---

### PR #4: File Import Functionality 📁
**Estimated Time:** 2-3 hours  
**Branch:** `feat/file-import`  
**Goal:** Allow users to import video files

#### Tasks:
- [ ] Create `ImportButton` component
  **File:** `src/components/ImportButton.jsx` (CREATE NEW)
  ```javascript
  import React from 'react';

  function ImportButton({ onImport, disabled }) {
    const handleClick = async () => {
      try {
        const filePath = await window.electron.openFile();
        if (filePath) {
          onImport(filePath);
        }
      } catch (error) {
        console.error('Error importing file:', error);
        alert('Failed to import file');
      }
    };

    return (
      <button 
        onClick={handleClick}
        disabled={disabled}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '12px 24px',
          fontSize: '16px',
        }}
      >
        Import Video
      </button>
    );
  }

  export default ImportButton;
  ```

- [ ] Implement file dialog in main process
  **File:** `src/index.js` (MODIFY - update open-file handler)
  ```javascript
  // Replace the placeholder open-file handler with:
  ipcMain.handle('open-file', async () => {
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
  ```

- [ ] Add video metadata extraction (optional but useful)
  **File:** `src/index.js` (MODIFY - add at top)
  ```javascript
  const ffmpeg = require('fluent-ffmpeg');
  
  // Add this handler implementation
  ipcMain.handle('get-video-metadata', async (event, filePath) => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          resolve({
            duration: metadata.format.duration,
            width: videoStream?.width,
            height: videoStream?.height,
            fps: eval(videoStream?.r_frame_rate), // e.g., "30/1" -> 30
            size: metadata.format.size,
            format: metadata.format.format_name,
          });
        }
      });
    });
  });
  ```

- [ ] Update App.jsx to use ImportButton and store video state
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  import React, { useState } from 'react';
  import ImportButton from './components/ImportButton';
  import './styles/app.css';

  function App() {
    const [videoPath, setVideoPath] = useState(null);
    const [videoMetadata, setVideoMetadata] = useState(null);

    const handleImport = async (filePath) => {
      console.log('Imported file:', filePath);
      setVideoPath(filePath);
      
      // Get metadata
      try {
        const metadata = await window.electron.getVideoMetadata(filePath);
        console.log('Video metadata:', metadata);
        setVideoMetadata(metadata);
      } catch (error) {
        console.error('Error getting metadata:', error);
      }
    };

    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ClipForge MVP</h1>
        </header>
        
        <main className="app-main">
          <div className="control-panel">
            <ImportButton onImport={handleImport} />
            
            {videoPath && (
              <div style={{ marginTop: '15px', fontSize: '14px' }}>
                <p><strong>File:</strong> {videoPath}</p>
                {videoMetadata && (
                  <>
                    <p><strong>Duration:</strong> {videoMetadata.duration.toFixed(2)}s</p>
                    <p><strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="preview-section">
            {videoPath ? (
              <p>Video loaded: {videoPath.split('/').pop()}</p>
            ) : (
              <p>No video imported yet</p>
            )}
          </div>
          
          <div className="timeline-section">
            <p>Timeline will go here</p>
          </div>
        </main>
      </div>
    );
  }

  export default App;
  ```

- [ ] Test file import
  ```bash
  npm start
  ```

- [ ] Click "Import Video" and select an MP4 file
- [ ] Verify file path and metadata display

**Files Created/Modified:**
- `src/components/ImportButton.jsx` (created)
- `src/index.js` (modified - add file dialog + metadata handlers)
- `src/App.jsx` (modified - add import functionality)

**Commit Message:** `feat: implement file import with metadata extraction`

**PR Merge Checklist:**
- [ ] File dialog opens when clicking Import
- [ ] File path displays after selection
- [ ] Video metadata extracted and displayed
- [ ] Supports MP4, MOV, WebM files
- [ ] Error handling for failed imports

---

### PR #5: Video Preview Player 🎬
**Estimated Time:** 2-3 hours  
**Branch:** `feat/video-preview`  
**Goal:** Display and play imported video

#### Tasks:
- [ ] Create `VideoPreview` component
  **File:** `src/components/VideoPreview.jsx` (CREATE NEW)
  ```javascript
  import React, { useRef, useState, useEffect } from 'react';

  function VideoPreview({ videoPath, onTimeUpdate, onLoadedMetadata }) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.load();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }, [videoPath]);

    const handlePlay = () => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        if (onTimeUpdate) {
          onTimeUpdate(time);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        const dur = videoRef.current.duration;
        setDuration(dur);
        if (onLoadedMetadata) {
          onLoadedMetadata(dur);
        }
      }
    };

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!videoPath) {
      return (
        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          padding: '40px' 
        }}>
          <p>Import a video to preview</p>
        </div>
      );
    }

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        width: '100%',
        height: '100%'
      }}>
        <video
          ref={videoRef}
          src={videoPath}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(100% - 80px)',
            backgroundColor: '#000',
            borderRadius: '8px',
          }}
        />
        
        <div style={{ 
          marginTop: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          {!isPlaying ? (
            <button 
              onClick={handlePlay}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
              }}
            >
              ▶ Play
            </button>
          ) : (
            <button 
              onClick={handlePause}
              style={{
                backgroundColor: '#ffc107',
                color: '#000',
              }}
            >
              ⏸ Pause
            </button>
          )}
          
          <span style={{ fontSize: '14px', color: '#999' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }

  export default VideoPreview;
  ```

- [ ] Update App.jsx to include VideoPreview
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  import React, { useState } from 'react';
  import ImportButton from './components/ImportButton';
  import VideoPreview from './components/VideoPreview';
  import './styles/app.css';

  function App() {
    const [videoPath, setVideoPath] = useState(null);
    const [videoMetadata, setVideoMetadata] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const handleImport = async (filePath) => {
      console.log('Imported file:', filePath);
      setVideoPath(filePath);
      
      try {
        const metadata = await window.electron.getVideoMetadata(filePath);
        console.log('Video metadata:', metadata);
        setVideoMetadata(metadata);
      } catch (error) {
        console.error('Error getting metadata:', error);
      }
    };

    const handleTimeUpdate = (time) => {
      setCurrentTime(time);
    };

    const handleLoadedMetadata = (dur) => {
      setDuration(dur);
    };

    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ClipForge MVP</h1>
        </header>
        
        <main className="app-main">
          <div className="control-panel">
            <ImportButton onImport={handleImport} />
            
            {videoPath && videoMetadata && (
              <div style={{ marginTop: '15px', fontSize: '14px' }}>
                <p><strong>File:</strong> {videoPath.split('/').pop()}</p>
                <p><strong>Duration:</strong> {videoMetadata.duration.toFixed(2)}s</p>
                <p><strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}</p>
              </div>
            )}
          </div>
          
          <div className="preview-section">
            <VideoPreview 
              videoPath={videoPath}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          </div>
          
          <div className="timeline-section">
            <p>Current Time: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s</p>
          </div>
        </main>
      </div>
    );
  }

  export default App;
  ```

- [ ] Test video preview
  ```bash
  npm start
  ```

- [ ] Import a video file
- [ ] Verify video displays and plays
- [ ] Test play/pause controls
- [ ] Verify time updates display

**Files Created/Modified:**
- `src/components/VideoPreview.jsx` (created)
- `src/App.jsx` (modified - add video preview)

**Commit Message:** `feat: add video preview player with play/pause controls`

**PR Merge Checklist:**
- [ ] Video displays in preview area
- [ ] Play button starts playback
- [ ] Pause button stops playback
- [ ] Current time updates during playback
- [ ] Duration displays correctly
- [ ] Video loads when new file imported

---

### PR #6: Timeline UI Component 📊
**Estimated Time:** 3-4 hours  
**Branch:** `feat/timeline-ui`  
**Goal:** Create visual timeline with playhead

#### Tasks:
- [ ] Create Timeline component
  **File:** `src/components/Timeline.jsx` (CREATE NEW)
  ```javascript
  import React, { useRef, useEffect } from 'react';

  function Timeline({ 
    duration, 
    currentTime, 
    startTime = 0, 
    endTime = null,
    onSeek 
  }) {
    const timelineRef = useRef(null);
    const actualEndTime = endTime || duration;

    const handleClick = (e) => {
      if (!timelineRef.current || !duration) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      
      if (onSeek) {
        onSeek(newTime);
      }
    };

    const playheadPosition = duration > 0 
      ? (currentTime / duration) * 100 
      : 0;

    const trimStartPercent = duration > 0 
      ? (startTime / duration) * 100 
      : 0;

    const trimEndPercent = duration > 0 
      ? (actualEndTime / duration) * 100 
      : 100;

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Generate time markers
    const generateMarkers = () => {
      if (!duration || duration === 0) return [];
      
      const markers = [];
      const interval = duration > 60 ? 10 : 5; // 10s for long videos, 5s for short
      
      for (let i = 0; i <= duration; i += interval) {
        markers.push(i);
      }
      
      // Always add the last marker
      if (markers[markers.length - 1] !== duration) {
        markers.push(duration);
      }
      
      return markers;
    };

    const markers = generateMarkers();

    if (!duration || duration === 0) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#666' 
        }}>
          <p>Timeline will appear when video is loaded</p>
        </div>
      );
    }

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Time markers */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#999',
          paddingLeft: '10px',
          paddingRight: '10px'
        }}>
          {markers.map((time, idx) => (
            <span key={idx}>{formatTime(time)}</span>
          ))}
        </div>

        {/* Timeline track */}
        <div 
          ref={timelineRef}
          onClick={handleClick}
          style={{
            position: 'relative',
            height: '60px',
            backgroundColor: '#1a1a1a',
            borderRadius: '6px',
            cursor: 'pointer',
            border: '1px solid #3a3a3a',
            overflow: 'hidden'
          }}
        >
          {/* Full clip bar */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '10px',
            height: '40px',
            backgroundColor: '#3a3a3a',
          }} />

          {/* Active (trimmed) region */}
          <div style={{
            position: 'absolute',
            left: `${trimStartPercent}%`,
            width: `${trimEndPercent - trimStartPercent}%`,
            top: '10px',
            height: '40px',
            backgroundColor: '#007bff',
            opacity: 0.6,
          }} />

          {/* Playhead */}
          <div style={{
            position: 'absolute',
            left: `${playheadPosition}%`,
            top: 0,
            width: '2px',
            height: '100%',
            backgroundColor: '#ff4444',
            zIndex: 10,
            transition: 'left 0.1s linear',
          }}>
            {/* Playhead handle */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#ff4444',
              borderRadius: '50%',
              border: '2px solid #fff',
            }} />
          </div>

          {/* Trim handles indicators */}
          {startTime > 0 && (
            <div style={{
              position: 'absolute',
              left: `${trimStartPercent}%`,
              top: '10px',
              width: '3px',
              height: '40px',
              backgroundColor: '#ffc107',
            }} />
          )}

          {endTime && endTime < duration && (
            <div style={{
              position: 'absolute',
              left: `${trimEndPercent}%`,
              top: '10px',
              width: '3px',
              height: '40px',
              backgroundColor: '#ffc107',
            }} />
          )}
        </div>

        {/* Current time display */}
        <div style={{ 
          marginTop: '10px',
          fontSize: '13px',
          color: '#ccc',
          textAlign: 'center'
        }}>
          <span>Current: {formatTime(currentTime)}</span>
          <span style={{ margin: '0 15px', color: '#666' }}>|</span>
          <span>Duration: {formatTime(duration)}</span>
          {(startTime > 0 || (endTime && endTime < duration)) && (
            <>
              <span style={{ margin: '0 15px', color: '#666' }}>|</span>
              <span style={{ color: '#ffc107' }}>
                Trim: {formatTime(startTime)} - {formatTime(actualEndTime)}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  export default Timeline;
  ```

- [ ] Update VideoPreview to support seeking
  **File:** `src/components/VideoPreview.jsx` (MODIFY - add method)
  ```javascript
  // Add this method to VideoPreview component
  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Expose seekTo via ref or prop callback
  useEffect(() => {
    if (props.onSeekReady) {
      props.onSeekReady(seekTo);
    }
  }, []);
  ```

- [ ] Update App.jsx to use Timeline
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  import React, { useState, useRef } from 'react';
  import ImportButton from './components/ImportButton';
  import VideoPreview from './components/VideoPreview';
  import Timeline from './components/Timeline';
  import './styles/app.css';

  function App() {
    const [videoPath, setVideoPath] = useState(null);
    const [videoMetadata, setVideoMetadata] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(null);
    const seekFunctionRef = useRef(null);

    const handleImport = async (filePath) => {
      setVideoPath(filePath);
      setStartTime(0);
      setEndTime(null);
      
      try {
        const metadata = await window.electron.getVideoMetadata(filePath);
        setVideoMetadata(metadata);
      } catch (error) {
        console.error('Error getting metadata:', error);
      }
    };

    const handleTimeUpdate = (time) => {
      setCurrentTime(time);
    };

    const handleLoadedMetadata = (dur) => {
      setDuration(dur);
      setEndTime(dur); // Default end time is full duration
    };

    const handleSeek = (time) => {
      if (seekFunctionRef.current) {
        seekFunctionRef.current(time);
      }
    };

    const handleSeekReady = (seekFunction) => {
      seekFunctionRef.current = seekFunction;
    };

    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ClipForge MVP</h1>
        </header>
        
        <main className="app-main">
          <div className="control-panel">
            <ImportButton onImport={handleImport} />
            
            {videoPath && videoMetadata && (
              <div style={{ marginTop: '15px', fontSize: '14px' }}>
                <p><strong>File:</strong> {videoPath.split('/').pop()}</p>
                <p><strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}</p>
              </div>
            )}
          </div>
          
          <div className="preview-section">
            <VideoPreview 
              videoPath={videoPath}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onSeekReady={handleSeekReady}
            />
          </div>
          
          <div className="timeline-section">
            <Timeline 
              duration={duration}
              currentTime={currentTime}
              startTime={startTime}
              endTime={endTime}
              onSeek={handleSeek}
            />
          </div>
        </main>
      </div>
    );
  }

  export default App;
  ```

- [ ] Update VideoPreview to properly handle seeking
  **File:** `src/components/VideoPreview.jsx` (MODIFY - complete implementation)
  ```javascript
  // Add near the top of component, after other useEffects
  useEffect(() => {
    const seekTo = (time) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    };

    if (onSeekReady) {
      onSeekReady(seekTo);
    }
  }, [onSeekReady]);
  ```

- [ ] Test timeline functionality
  ```bash
  npm start
  ```

- [ ] Import video and verify timeline displays
- [ ] Test playhead moves during playback
- [ ] Test clicking timeline seeks video
- [ ] Verify time markers appear correctly

**Files Created/Modified:**
- `src/components/Timeline.jsx` (created)
- `src/components/VideoPreview.jsx` (modified - add seek support)
- `src/App.jsx` (modified - integrate timeline)

**Commit Message:** `feat: add interactive timeline with playhead and seeking`

**PR Merge Checklist:**
- [ ] Timeline displays when video loaded
- [ ] Playhead moves during playback
- [ ] Clicking timeline seeks to that position
- [ ] Time markers show correct intervals
- [ ] Current time displays accurately

---

### PR #7: Trim Controls ✂️
**Estimated Time:** 2-3 hours  
**Branch:** `feat/trim-controls`  
**Goal:** Allow users to set IN/OUT points for trimming

#### Tasks:
- [ ] Create TrimControls component
  **File:** `src/components/TrimControls.jsx` (CREATE NEW)
  ```javascript
  import React, { useState, useEffect } from 'react';

  function TrimControls({ 
    duration, 
    currentTime,
    startTime, 
    endTime, 
    onStartTimeChange, 
    onEndTimeChange 
  }) {
    const [localStart, setLocalStart] = useState(startTime);
    const [localEnd, setLocalEnd] = useState(endTime);

    useEffect(() => {
      setLocalStart(startTime);
    }, [startTime]);

    useEffect(() => {
      setLocalEnd(endTime);
    }, [endTime]);

    const handleStartChange = (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 0 && value < localEnd) {
        setLocalStart(value);
        onStartTimeChange(value);
      }
    };

    const handleEndChange = (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value > localStart && value <= duration) {
        setLocalEnd(value);
        onEndTimeChange(value);
      }
    };

    const setInPoint = () => {
      if (currentTime < localEnd) {
        setLocalStart(currentTime);
        onStartTimeChange(currentTime);
      }
    };

    const setOutPoint = () => {
      if (currentTime > localStart) {
        setLocalEnd(currentTime);
        onEndTimeChange(currentTime);
      }
    };

    const reset = () => {
      setLocalStart(0);
      setLocalEnd(duration);
      onStartTimeChange(0);
      onEndTimeChange(duration);
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 100);
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const trimDuration = localEnd - localStart;

    if (!duration || duration === 0) {
      return (
        <div style={{ padding: '15px', color: '#666' }}>
          <p>Load a video to set trim points</p>
        </div>
      );
    }

    return (
      <div style={{ 
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Start Time */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontSize: '13px',
              color: '#999'
            }}>
              Start Time (IN Point)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={localStart.toFixed(2)}
                onChange={handleStartChange}
                step="0.1"
                min="0"
                max={localEnd - 0.1}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '14px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
              <button
                onClick={setInPoint}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
                title="Set IN point at current playhead position"
              >
                Set IN
              </button>
            </div>
            <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>
              {formatTime(localStart)}
            </span>
          </div>

          {/* End Time */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontSize: '13px',
              color: '#999'
            }}>
              End Time (OUT Point)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={localEnd.toFixed(2)}
                onChange={handleEndChange}
                step="0.1"
                min={localStart + 0.1}
                max={duration}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '14px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
              <button
                onClick={setOutPoint}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
                title="Set OUT point at current playhead position"
              >
                Set OUT
              </button>
            </div>
            <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>
              {formatTime(localEnd)}
            </span>
          </div>

          {/* Reset button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={reset}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                fontSize: '13px',
              }}
              title="Reset to full duration"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ 
          fontSize: '13px',
          color: '#ccc',
          padding: '10px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            <strong>Trim Duration:</strong> {formatTime(trimDuration)} ({trimDuration.toFixed(2)}s)
          </span>
          <span style={{ color: '#ffc107' }}>
            {((trimDuration / duration) * 100).toFixed(1)}% of original
          </span>
        </div>
      </div>
    );
  }

  export default TrimControls;
  ```

- [ ] Update App.jsx to integrate TrimControls
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  import React, { useState, useRef } from 'react';
  import ImportButton from './components/ImportButton';
  import VideoPreview from './components/VideoPreview';
  import Timeline from './components/Timeline';
  import TrimControls from './components/TrimControls';
  import './styles/app.css';

  function App() {
    const [videoPath, setVideoPath] = useState(null);
    const [videoMetadata, setVideoMetadata] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(null);
    const seekFunctionRef = useRef(null);

    const handleImport = async (filePath) => {
      setVideoPath(filePath);
      setStartTime(0);
      setEndTime(null);
      setCurrentTime(0);
      
      try {
        const metadata = await window.electron.getVideoMetadata(filePath);
        setVideoMetadata(metadata);
      } catch (error) {
        console.error('Error getting metadata:', error);
      }
    };

    const handleTimeUpdate = (time) => {
      setCurrentTime(time);
    };

    const handleLoadedMetadata = (dur) => {
      setDuration(dur);
      setEndTime(dur);
    };

    const handleSeek = (time) => {
      if (seekFunctionRef.current) {
        seekFunctionRef.current(time);
      }
    };

    const handleSeekReady = (seekFunction) => {
      seekFunctionRef.current = seekFunction;
    };

    const handleStartTimeChange = (time) => {
      setStartTime(time);
    };

    const handleEndTimeChange = (time) => {
      setEndTime(time);
    };

    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ClipForge MVP</h1>
        </header>
        
        <main className="app-main">
          <div className="control-panel">
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <ImportButton onImport={handleImport} />
              
              {videoPath && videoMetadata && (
                <div style={{ fontSize: '13px', color: '#999' }}>
                  <p><strong>File:</strong> {videoPath.split('/').pop()}</p>
                  <p><strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}</p>
                </div>
              )}
            </div>

            {videoPath && duration > 0 && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #3a3a3a', paddingTop: '15px' }}>
                <TrimControls
                  duration={duration}
                  currentTime={currentTime}
                  startTime={startTime}
                  endTime={endTime || duration}
                  onStartTimeChange={handleStartTimeChange}
                  onEndTimeChange={handleEndTimeChange}
                />
              </div>
            )}
          </div>
          
          <div className="preview-section">
            <VideoPreview 
              videoPath={videoPath}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onSeekReady={handleSeekReady}
            />
          </div>
          
          <div className="timeline-section">
            <Timeline 
              duration={duration}
              currentTime={currentTime}
              startTime={startTime}
              endTime={endTime || duration}
              onSeek={handleSeek}
            />
          </div>
        </main>
      </div>
    );
  }

  export default App;
  ```

- [ ] Test trim controls
  ```bash
  npm start
  ```

- [ ] Import video
- [ ] Play video and click "Set IN" at various points
- [ ] Click "Set OUT" to mark end point
- [ ] Verify timeline shows trim region highlighted
- [ ] Test manual input of start/end times
- [ ] Test reset button

**Files Created/Modified:**
- `src/components/TrimControls.jsx` (created)
- `src/App.jsx` (modified - add trim controls)

**Commit Message:** `feat: add trim controls with IN/OUT point setting`

**PR Merge Checklist:**
- [ ] Can set start time (IN point)
- [ ] Can set end time (OUT point)
- [ ] "Set IN" button marks current playhead position
- [ ] "Set OUT" button marks current playhead position
- [ ] Manual input fields work correctly
- [ ] Trim duration calculates correctly
- [ ] Timeline visualizes trim region
- [ ] Reset button works

---

### PR #8: FFmpeg Export Functionality 🎥
**Estimated Time:** 3-4 hours  
**Branch:** `feat/ffmpeg-export`  
**Goal:** Export trimmed video using FFmpeg

#### Tasks:
- [ ] Create ExportButton component
  **File:** `src/components/ExportButton.jsx` (CREATE NEW)
  ```javascript
  import React, { useState } from 'react';

  function ExportButton({ 
    videoPath, 
    startTime, 
    endTime, 
    disabled 
  }) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const handleExport = async () => {
      if (!videoPath) {
        alert('No video to export');
        return;
      }

      setIsExporting(true);
      setProgress(0);
      setError(null);

      try {
        // Ask user where to save
        const outputPath = await window.electron.saveFile();
        
        if (!outputPath) {
          setIsExporting(false);
          return; // User cancelled
        }

        // Calculate duration
        const duration = endTime - startTime;

        console.log('Starting export:', {
          input: videoPath,
          output: outputPath,
          start: startTime,
          duration: duration
        });

        // Start export
        const result = await window.electron.exportVideo({
          input: videoPath,
          output: outputPath,
          start: startTime,
          duration: duration
        });

        if (result.success) {
          alert(`Export complete!\n\nSaved to: ${outputPath}`);
          setProgress(100);
        } else {
          throw new Error('Export failed');
        }
      } catch (err) {
        console.error('Export error:', err);
        setError(err.message || 'Export failed');
        alert(`Export failed: ${err.message}`);
      } finally {
        setIsExporting(false);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={handleExport}
          disabled={disabled || isExporting || !videoPath}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            backgroundColor: isExporting ? '#6c757d' : '#007bff',
            color: 'white',
            opacity: (disabled || !videoPath) ? 0.5 : 1,
            cursor: (disabled || isExporting || !videoPath) ? 'not-allowed' : 'pointer',
          }}
        >
          {isExporting ? '⏳ Exporting...' : '💾 Export Video'}
        </button>

        {isExporting && (
          <div style={{ fontSize: '13px', color: '#ccc' }}>
            <p>Please wait while your video is being processed...</p>
            <div style={{
              marginTop: '8px',
              width: '100%',
              height: '6px',
              backgroundColor: '#3a3a3a',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#dc3545', 
            color: 'white',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  export default ExportButton;
  ```

- [ ] Implement FFmpeg export in main process
  **File:** `src/index.js` (MODIFY - update handlers)
  ```javascript
  const { app, BrowserWindow, ipcMain, dialog } = require('electron');
  const ffmpeg = require('fluent-ffmpeg');
  const path = require('path');

  // ... existing code ...

  // Update save-file handler
  ipcMain.handle('save-file', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'clipforge-export.mp4',
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

  // Implement export-video handler
  ipcMain.handle('export-video', async (event, { input, output, start, duration }) => {
    console.log('=== Starting FFmpeg Export ===');
    console.log('Input:', input);
    console.log('Output:', output);
    console.log('Start:', start);
    console.log('Duration:', duration);

    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .setStartTime(start)
        .setDuration(duration)
        .output(output)
        .videoCodec('libx264')          // H.264 codec
        .audioCodec('aac')              // AAC audio codec
        .outputOptions([
          '-preset fast',               // Encoding speed
          '-crf 23',                    // Quality (lower = better, 18-28 is good range)
          '-movflags +faststart'        // Enable streaming
        ])
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('Processing:', JSON.stringify(progress));
          // Note: progress.percent might be undefined, use timemark instead
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('export-progress', progress);
          }
        })
        .on('end', () => {
          console.log('=== FFmpeg Export Complete ===');
          resolve({ success: true, output });
        })
        .on('error', (err, stdout, stderr) => {
          console.error('=== FFmpeg Export Error ===');
          console.error('Error:', err.message);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  });
  ```

- [ ] Update App.jsx to include ExportButton
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  import React, { useState, useRef } from 'react';
  import ImportButton from './components/ImportButton';
  import VideoPreview from './components/VideoPreview';
  import Timeline from './components/Timeline';
  import TrimControls from './components/TrimControls';
  import ExportButton from './components/ExportButton';
  import './styles/app.css';

  function App() {
    const [videoPath, setVideoPath] = useState(null);
    const [videoMetadata, setVideoMetadata] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(null);
    const seekFunctionRef = useRef(null);

    const handleImport = async (filePath) => {
      setVideoPath(filePath);
      setStartTime(0);
      setEndTime(null);
      setCurrentTime(0);
      
      try {
        const metadata = await window.electron.getVideoMetadata(filePath);
        setVideoMetadata(metadata);
      } catch (error) {
        console.error('Error getting metadata:', error);
      }
    };

    const handleTimeUpdate = (time) => {
      setCurrentTime(time);
    };

    const handleLoadedMetadata = (dur) => {
      setDuration(dur);
      setEndTime(dur);
    };

    const handleSeek = (time) => {
      if (seekFunctionRef.current) {
        seekFunctionRef.current(time);
      }
    };

    const handleSeekReady = (seekFunction) => {
      seekFunctionRef.current = seekFunction;
    };

    const handleStartTimeChange = (time) => {
      setStartTime(time);
    };

    const handleEndTimeChange = (time) => {
      setEndTime(time);
    };

    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ClipForge MVP</h1>
        </header>
        
        <main className="app-main">
          <div className="control-panel">
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              marginBottom: '15px'
            }}>
              <ImportButton onImport={handleImport} />
              
              <ExportButton
                videoPath={videoPath}
                startTime={startTime}
                endTime={endTime || duration}
                disabled={!videoPath || duration === 0}
              />
              
              {videoPath && videoMetadata && (
                <div style={{ fontSize: '13px', color: '#999', marginLeft: 'auto' }}>
                  <p><strong>File:</strong> {videoPath.split('/').pop()}</p>
                  <p><strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}</p>
                </div>
              )}
            </div>

            {videoPath && duration > 0 && (
              <div style={{ borderTop: '1px solid #3a3a3a', paddingTop: '15px' }}>
                <TrimControls
                  duration={duration}
                  currentTime={currentTime}
                  startTime={startTime}
                  endTime={endTime || duration}
                  onStartTimeChange={handleStartTimeChange}
                  onEndTimeChange={handleEndTimeChange}
                />
              </div>
            )}
          </div>
          
          <div className="preview-section">
            <VideoPreview 
              videoPath={videoPath}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onSeekReady={handleSeekReady}
            />
          </div>
          
          <div className="timeline-section">
            <Timeline 
              duration={duration}
              currentTime={currentTime}
              startTime={startTime}
              endTime={endTime || duration}
              onSeek={handleSeek}
            />
          </div>
        </main>
      </div>
    );
  }

  export default App;
  ```

- [ ] Test export functionality thoroughly
  ```bash
  npm start
  ```

- [ ] Import a video file
- [ ] Set trim points (e.g., start at 5s, end at 15s)
- [ ] Click "Export Video"
- [ ] Choose save location
- [ ] Wait for export to complete
- [ ] **CRITICAL:** Open exported file in VLC/QuickTime and verify:
  - Video plays correctly
  - Trim points are accurate
  - Audio is in sync
  - No corruption

**Files Created/Modified:**
- `src/components/ExportButton.jsx` (created)
- `src/index.js` (modified - implement FFmpeg export)
- `src/App.jsx` (modified - add export button)

**Commit Message:** `feat: implement FFmpeg video export with trim support`

**PR Merge Checklist:**
- [ ] Export button appears when video loaded
- [ ] Save dialog opens on click
- [ ] FFmpeg processes video without errors
- [ ] Exported file plays in external player
- [ ] Trim times are accurately applied
- [ ] Audio stays in sync
- [ ] Progress indication shows during export
- [ ] Success/error messages display correctly

---

### PR #9: Packaging & Distribution 📦
**Estimated Time:** 2-3 hours  
**Branch:** `feat/packaging`  
**Goal:** Create distributable .dmg for macOS

#### Tasks:
- [ ] Update package.json with proper build configuration
  **File:** `package.json` (MODIFY)
  ```json
  {
    "name": "clipforge",
    "productName": "ClipForge",
    "version": "1.0.0",
    "description": "Desktop video editor for trimming and exporting videos",
    "main": "src/index.js",
    "scripts": {
      "start": "electron-forge start",
      "package": "electron-forge package",
      "make": "electron-forge make",
      "build": "electron-builder",
      "build:mac": "electron-builder --mac",
      "build:mac:dmg": "electron-builder --mac --dmg"
    },
    "build": {
      "appId": "com.clipforge.app",
      "productName": "ClipForge",
      "mac": {
        "category": "public.app-category.video",
        "target": [
          {
            "target": "dmg",
            "arch": ["x64", "arm64"]
          }
        ],
        "icon": "assets/icon.icns"
      },
      "files": [
        "src/**/*",
        "node_modules/**/*",
        "package.json"
      ],
      "extraResources": [
        {
          "from": "assets",
          "to": "assets",
          "filter": ["**/*"]
        }
      ],
      "dmg": {
        "title": "ClipForge Installer",
        "icon": "assets/icon.icns",
        "background": "assets/dmg-background.png",
        "window": {
          "width": 600,
          "height": 400
        },
        "contents": [
          {
            "x": 150,
            "y": 200,
            "type": "file"
          },
          {
            "x": 450,
            "y": 200,
            "type": "link",
            "path": "/Applications"
          }
        ]
      }
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "fluent-ffmpeg": "^2.1.2"
    },
    "devDependencies": {
      "@electron-forge/cli": "^7.0.0",
      "@electron-forge/maker-deb": "^7.0.0",
      "@electron-forge/maker-rpm": "^7.0.0",
      "@electron-forge/maker-squirrel": "^7.0.0",
      "@electron-forge/maker-zip": "^7.0.0",
      "@electron-forge/plugin-webpack": "^7.0.0",
      "electron": "^27.0.0",
      "electron-builder": "^24.6.4"
    }
  }
  ```

- [ ] Create assets directory for app icon
  ```bash
  mkdir -p assets
  ```

- [ ] Create a simple icon (or use placeholder)
  **Note:** For MVP, you can skip custom icon and use default. If time permits:
  - Create 1024x1024 PNG icon
  - Convert to .icns using `iconutil` or online converter
  - Save as `assets/icon.icns`

- [ ] Update README with build instructions
  **File:** `README.md` (MODIFY)
  ```markdown
  # ClipForge MVP

  Desktop video editor built with Electron + React for trimming and exporting videos.

  ## Features

  - Import MP4, MOV, WebM video files
  - Visual timeline with playhead
  - Set IN/OUT trim points
  - Real-time video preview
  - Export trimmed videos using FFmpeg

  ## Prerequisites

  - macOS (for development and building)
  - Node.js 18+ and npm
  - FFmpeg installed via Homebrew

  ## Setup

  1. **Install FFmpeg:**
     ```bash
     brew install ffmpeg
     ```

  2. **Install dependencies:**
     ```bash
     npm install
     ```

  3. **Run in development mode:**
     ```bash
     npm start
     ```

  ## Building

  To create a distributable .dmg for macOS:

  ```bash
  npm run build:mac:dmg
  ```

  The .dmg file will be created in the `dist/` directory.

  ## Usage

  1. Click "Import Video" to select a video file
  2. Video will load in the preview player
  3. Use trim controls to set start/end points:
     - Type values manually in seconds
     - OR play video and click "Set IN" / "Set OUT" buttons
  4. Click "Export Video" to save trimmed version
  5. Choose save location and wait for processing

  ## Tech Stack

  - Electron (desktop framework)
  - React (UI)
  - FFmpeg (video processing)
  - fluent-ffmpeg (Node.js FFmpeg wrapper)

  ## Project Structure

  ```
  clipforge/
  ├── src/
  │   ├── index.js           # Main process
  │   ├── preload.js         # IPC bridge
  │   ├── renderer.js        # React entry
  │   ├── App.jsx            # Main component
  │   └── components/        # React components
  ├── assets/                # App icons and resources
  └── package.json
  ```

  ## Troubleshooting

  **App won't start:**
  - Ensure FFmpeg is installed: `ffmpeg -version`
  - Delete `node_modules` and run `npm install` again

  **Export fails:**
  - Check terminal console for FFmpeg errors
  - Ensure input file is valid video format
  - Try shorter trim duration

  **Build fails:**
  - Ensure you have Xcode Command Line Tools installed
  - Check that electron-builder is in devDependencies
  - Try deleting `dist/` and `out/` folders first

  ## MVP Submission

  - **Deadline:** Tuesday, October 28th, 10:59 PM CT
  - **Version:** 1.0.0
  - **Status:** MVP Complete ✅

  ## License

  MIT
  ```

- [ ] Test build process
  ```bash
  # Clean previous builds
  rm -rf dist/ out/

  # Build for macOS
  npm run build:mac:dmg
  ```

- [ ] Verify .dmg file created in `dist/` directory

- [ ] Install .dmg on your Mac
  - Double-click the .dmg file
  - Drag ClipForge to Applications folder
  - Open ClipForge from Applications
  - **Test the entire workflow:**
    1. Import video
    2. Set trim points
    3. Export video
    4. Verify exported file plays correctly

- [ ] Document any build issues and solutions

- [ ] Create GitHub Release (optional but recommended)
  ```bash
  # Tag the release
  git tag -a v1.0.0 -m "MVP Release"
  git push origin v1.0.0
  ```

**Files Created/Modified:**
- `package.json` (modified - add build config)
- `README.md` (modified - comprehensive documentation)
- `assets/icon.icns` (created - optional)

**Commit Message:** `feat: add packaging configuration for macOS distribution`

**PR Merge Checklist:**
- [ ] `npm run build:mac:dmg` completes without errors
- [ ] .dmg file created in dist/ directory
- [ ] .dmg installs successfully
- [ ] Installed app launches
- [ ] All features work in packaged app
- [ ] FFmpeg works in packaged build
- [ ] README has complete instructions

---

### PR #10: Polish & Bug Fixes 🐛
**Estimated Time:** 2-3 hours  
**Branch:** `feat/polish-and-fixes`  
**Goal:** Final touches, bug fixes, error handling

#### Tasks:
- [ ] Add better error handling throughout app
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  // Add error state
  const [error, setError] = useState(null);

  // Update handleImport with error handling
  const handleImport = async (filePath) => {
    setError(null);
    try {
      setVideoPath(filePath);
      setStartTime(0);
      setEndTime(null);
      setCurrentTime(0);
      
      const metadata = await window.electron.getVideoMetadata(filePath);
      setVideoMetadata(metadata);
    } catch (error) {
      console.error('Error importing file:', error);
      setError(`Failed to import video: ${error.message}`);
      setVideoPath(null);
    }
  };

  // Add error display in JSX
  {error && (
    <div style={{
      padding: '12px',
      backgroundColor: '#dc3545',
      color: 'white',
      borderRadius: '6px',
      marginTop: '15px',
      fontSize: '14px'
    }}>
      ⚠️ {error}
    </div>
  )}
  ```

- [ ] Add loading states
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async (filePath) => {
    setError(null);
    setIsLoading(true);
    try {
      // ... existing import code ...
    } catch (error) {
      // ... error handling ...
    } finally {
      setIsLoading(false);
    }
  };
  ```

- [ ] Add keyboard shortcuts
  **File:** `src/App.jsx` (MODIFY)
  ```javascript
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Space bar = play/pause
      if (e.code === 'Space' && videoPath) {
        e.preventDefault();
        // Trigger play/pause (you'll need to expose this from VideoPreview)
      }
      
      // I key = set IN point
      if (e.code === 'KeyI' && videoPath && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleStartTimeChange(currentTime);
      }
      
      // O key = set OUT point
      if (e.code === 'KeyO' && videoPath && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleEndTimeChange(currentTime);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [videoPath, currentTime]);
  ```

- [ ] Update styles for better appearance
  **File:** `src/styles/app.css` (MODIFY - add these improvements)
  ```css
  /* Add smooth transitions */
  button {
    transition: all 0.2s ease;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Improve input fields */
  input[type="number"] {
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  }

  input[type="number"]:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  /* Add subtle animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .control-panel > div {
    animation: fadeIn 0.3s ease;
  }
  ```

- [ ] Add app version to UI
  **File:** `src/App.jsx` (MODIFY - add to header)
  ```javascript
  <header className="app-header">
    <h1>ClipForge MVP</h1>
    <span style={{ 
      fontSize: '11px', 
      color: '#666',
      marginLeft: '10px' 
    }}>
      v1.0.0
    </span>
  </header>
  ```

- [ ] Add helpful tooltips/hints
  **File:** `src/App.jsx` (MODIFY - add help text)
  ```javascript
  {!videoPath && (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      color: '#666',
      fontSize: '14px'
    }}>
      <p style={{ marginBottom: '10px' }}>
        👋 Welcome to ClipForge!
      </p>
      <p>
        Click "Import Video" to get started
      </p>
      <p style={{ fontSize: '12px', marginTop: '15px', color: '#555' }}>
        Keyboard shortcuts: I = Set IN, O = Set OUT, Space = Play/Pause
      </p>
    </div>
  )}
  ```

- [ ] Test all edge cases:
  - [ ] Import extremely short video (< 1 second)
  - [ ] Import very long video (> 1 hour)
  - [ ] Try to export with IN > OUT
  - [ ] Cancel file dialogs
  - [ ] Try unsupported file formats
  - [ ] Test with video that has no audio
  - [ ] Test with different resolutions (4K, 720p, etc.)

- [ ] Fix any bugs discovered during testing

- [ ] Update .gitignore if needed
  **File:** `.gitignore` (VERIFY)
  ```
  node_modules/
  dist/
  out/
  .DS_Store
  *.log
  .env
  .vscode/
  .idea/
  *.dmg
  *.zip
  ```

- [ ] Final build test
  ```bash
  npm run build:mac:dmg
  ```

- [ ] Install and test packaged app thoroughly

**Files Created/Modified:**
- `src/App.jsx` (modified - error handling, loading states, keyboard shortcuts)
- `src/styles/app.css` (modified - polish)
- `.gitignore` (verified/updated)

**Commit Message:** `feat: add error handling, keyboard shortcuts, and UI polish`

**PR Merge Checklist:**
- [ ] Error messages display for failures
- [ ] Loading states show during operations
- [ ] Keyboard shortcuts work (I, O, Space)
- [ ] All edge cases handled gracefully
- [ ] UI looks polished and professional
- [ ] No console errors in normal operation
- [ ] Packaged app works flawlessly

---

## Final Submission Checklist ✅

Before submitting on Tuesday at 10:59 PM CT:

### Code Quality
- [ ] All PRs merged to main branch
- [ ] No console errors in development
- [ ] No console errors in packaged app
- [ ] Code is reasonably clean and commented

### Functionality
- [ ] Can import MP4/MOV files
- [ ] Video plays in preview
- [ ] Timeline shows clip and playhead
- [ ] Can set trim IN/OUT points
- [ ] Export creates valid MP4 file
- [ ] Exported video matches trim settings

### Distribution
- [ ] .dmg file builds successfully
- [ ] .dmg installs on macOS
- [ ] Packaged app runs without issues
- [ ] All features work in packaged version

### Documentation
- [ ] README has setup instructions
- [ ] README has build instructions
- [ ] README explains how to use the app
- [ ] Git history is clean and organized

### Submission Materials
- [ ] GitHub repository is public or accessible
- [ ] README.md is complete
- [ ] .dmg file uploaded to GitHub Releases or Drive
- [ ] Demo video recorded (if required)
- [ ] All required files committed

---

## Time Tracking

| PR | Estimated Time | Task |
|----|----------------|------|
| #1 | 1-2h | Project setup |
| #2 | 1-2h | Basic UI structure |
| #3 | 1h | IPC communication |
| #4 | 2-3h | File import |
| #5 | 2-3h | Video preview |
| #6 | 3-4h | Timeline UI |
| #7 | 2-3h | Trim controls |
| #8 | 3-4h | FFmpeg export |
| #9 | 2-3h | Packaging |
| #10 | 2-3h | Polish & fixes |
| **Total** | **19-30h** | **Full MVP** |

---

## Git Workflow

For each PR:

```bash
# Create feature branch
git checkout -b feat/branch-name

# Make changes and commit frequently
git add .
git commit -m "descriptive message"

# Push to GitHub
git push origin feat/branch-name

# Create PR on GitHub
# Merge PR after verification

# Switch back to main and pull
git checkout main
git pull origin main

# Repeat for next PR
```

---

## Emergency Shortcuts

If you're running behind schedule:

**Priority 1 (Must Have):**
- PR #1, #3, #4, #5, #8, #9
- Skip: Timeline visualization, trim controls UI
- Use simple text inputs for start/end times

**Priority 2 (Nice to Have):**
- PR #2, #6, #7, #10
- These improve UX but aren't critical

**Absolute Minimum (Last Resort):**
- Import file
- Type start/end times in text boxes
- Export with FFmpeg
- Package as .dmg

**The code in PR #8 (FFmpeg Export) is literally 80% of the grade.**
Everything else is UI. Focus on getting export working first!

---

## Quick Reference - Files by Purpose

**Main Process (Node.js):**
- `src/index.js` - Electron main, IPC handlers, FFmpeg

**React UI:**
- `src/App.jsx` - Main component, state management
- `src/renderer.js` - React entry point

**Components:**
- `src/components/ImportButton.jsx` - File import UI
- `src/components/VideoPreview.jsx` - Video player
- `src/components/Timeline.jsx` - Timeline visualization
- `src/components/TrimControls.jsx` - Trim IN/OUT controls
- `src/components/ExportButton.jsx` - Export UI

**Bridge:**
- `src/preload.js` - IPC security bridge

**Config:**
- `package.json` - Dependencies and build config
- `src/index.html` - HTML shell
- `src/styles/app.css` - Global styles

Good luck! 🚀 Remember: **ship the MVP, don't chase perfection!**
