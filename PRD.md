# ClipForge MVP - Product Requirements Document

**Version:** 1.0  
**Deadline:** Tuesday, October 28th, 10:59 PM CT  
**Project Start:** Monday, October 27th (morning)  
**Time Available:** ~36 hours

---

## Executive Summary

ClipForge MVP is a minimal desktop video editor that proves core media handling capabilities. The MVP demonstrates you can import video files, display them in a timeline interface, perform basic trimming, and export the result as an MP4 file.

**Success Criteria:** A packaged desktop application that can import, trim, and export a single video clip.

---

## MVP Scope (Hard Requirements)

### 1. Desktop Application Foundation
**Must Have:**
- Native desktop app using Electron OR Tauri
- App launches successfully as a packaged build (not dev mode)
- Cross-platform support (at minimum, works on your development machine)
- Window with minimum viable UI layout

**Acceptance Criteria:**
- Double-click icon launches app in under 5 seconds
- App window displays with clear UI sections
- No crashes on launch

---

### 2. Video Import
**Must Have:**
- Drag & drop video files into app window
- File picker dialog (File → Import or similar)
- Support for MP4 and MOV formats minimum
- Display imported clip(s) in a media library or list

**Acceptance Criteria:**
- User can drag MP4/MOV file onto app and see it appear
- File picker button successfully imports files
- Imported clips show filename and duration
- At least one clip can be imported and tracked

**Out of Scope for MVP:**
- Thumbnail generation
- WebM support
- Detailed metadata display
- Multiple simultaneous imports

---

### 3. Timeline View
**Must Have:**
- Visual representation of imported clips in sequence
- Timeline shows clip duration visually
- Playhead indicator (vertical line showing current position)
- Minimum one video track

**Acceptance Criteria:**
- Imported clip appears on timeline with visible duration
- Timeline shows time markers (0s, 5s, 10s, etc.)
- Playhead is visible and indicates current position
- Timeline is clearly distinguishable from preview area

**Out of Scope for MVP:**
- Multiple tracks
- Drag-to-reorder clips
- Zoom controls
- Snap-to-grid
- Audio waveforms

---

### 4. Video Preview Player
**Must Have:**
- Video player displaying current frame at playhead position
- Play button
- Pause button
- Video displays actual content from imported clip

**Acceptance Criteria:**
- Clicking Play shows video playback
- Clicking Pause stops playback
- Preview window shows correct video content
- Audio plays in sync with video

**Out of Scope for MVP:**
- Scrubbing/seeking controls
- Volume control
- Playback speed options
- Fullscreen mode

---

### 5. Basic Trim Functionality
**Must Have:**
- Ability to set IN point (start time) on a clip
- Ability to set OUT point (end time) on a clip
- Visual indication of trimmed region
- Trim applies to single clip only

**Acceptance Criteria:**
- User can mark a start point on timeline
- User can mark an end point on timeline
- Timeline visually shows trimmed vs. excluded regions
- Export respects trim points

**Implementation Suggestions:**
- Simple approach: Two input fields for start/end time in seconds
- Better UX: Drag handles on clip edges in timeline
- Minimum: Buttons like "Set IN" and "Set OUT" at current playhead position

**Out of Scope for MVP:**
- Multi-clip trimming
- Split functionality
- Ripple edits
- Fine-grained frame-by-frame trimming

---

### 6. Export to MP4
**Must Have:**
- Export button in UI
- Renders trimmed clip to MP4 file
- Saves file to user-selected location
- Completes export without crashing

**Acceptance Criteria:**
- User clicks Export and selects save location
- Progress indication (even just "Exporting..." text)
- Exported MP4 plays in VLC/QuickTime/Windows Media Player
- Exported video matches trim settings
- Export completes for clips up to 2 minutes

**Technical Requirements:**
- Use FFmpeg for encoding
- Output codec: H.264 video, AAC audio
- Maintain source resolution for MVP (no resolution options needed)

**Out of Scope for MVP:**
- Multiple resolution options
- Format options beyond MP4
- Compression settings
- Batch export

---

### 7. Packaged Build
**Must Have:**
- Application packaged as native installer/app bundle
- Can be distributed and run on fresh machine
- Not running in development mode

**Acceptance Criteria:**
- .dmg (Mac), .exe installer (Windows), or .AppImage (Linux)
- App can be installed and launched by non-developer
- All dependencies bundled (especially FFmpeg)

**Technical Notes:**
- Electron: Use electron-builder
- Tauri: Use built-in bundler
- Include FFmpeg binary in package or use bundled version

---

## Non-Functional Requirements

### Performance
- App launches in under 5 seconds
- No crashes during basic import → trim → export workflow
- Timeline remains responsive with 1-3 clips

### Usability
- Clear labels on all buttons
- Obvious workflow: Import → Preview → Trim → Export
- Error messages if operations fail

### Technical Constraints
- Must work offline (no cloud dependencies for core features)
- File I/O uses native desktop APIs
- FFmpeg must be accessible to app

---

## User Flow (MVP)

```
1. Launch app
2. Click "Import" or drag video file into window
3. Clip appears in timeline
4. Click Play to preview
5. Set IN and OUT points to trim clip
6. Click "Export"
7. Choose save location
8. Wait for export to complete
9. Exported MP4 saved to disk
```

---

## Technical Architecture (Recommended Stack for Your Situation)

### Desktop Framework: **ELECTRON + REACT**
**Why Electron for you:**
- Much more documentation and tutorials available
- Easier learning curve (uses Node.js, which you may know)
- Better error messages and debugging experience
- More StackOverflow answers when you get stuck
- Tauri requires Rust knowledge, which adds complexity you don't need

**Platform:** macOS (developing and packaging for .dmg initially)

### Key Libraries (Specific Recommendations)
- **FFmpeg:** `fluent-ffmpeg` npm package (Node.js wrapper)
  - Install FFmpeg binary via Homebrew: `brew install ffmpeg`
  - This is the EASIEST approach - FFmpeg runs as system command
- **Timeline:** Start with simple HTML/CSS (divs with flexbox)
  - Don't use Canvas for MVP - too complex
  - Use styled divs that you can click/drag later
- **Video Player:** HTML5 `<video>` element (built into browser)
  - This is native, requires zero setup
  - Just `<video src={filePath} controls />`

### File Structure
```
clipforge/
├── package.json
├── main.js                 (Electron main process)
├── preload.js             (Bridge between main and renderer)
└── src/
    ├── App.jsx            (Main React component)
    ├── components/
    │   ├── ImportButton.jsx
    │   ├── Timeline.jsx
    │   ├── VideoPreview.jsx
    │   └── ExportButton.jsx
    └── index.html
```

### Critical Setup Steps (Do These First)

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install FFmpeg**:
   ```bash
   brew install ffmpeg
   ```
   Verify: `ffmpeg -version` should show version info

3. **Scaffold Electron + React Project**:
   ```bash
   npx create-electron-app clipforge --template=webpack
   cd clipforge
   npm install react react-dom
   npm install fluent-ffmpeg
   npm install electron-builder --save-dev
   ```

### FFmpeg Integration Guide (For Beginners)

Since you haven't used FFmpeg before, here's the exact pattern:

**Trim and Export a Video (main.js):**
```javascript
const ffmpeg = require('fluent-ffmpeg');
const { ipcMain } = require('electron');

ipcMain.handle('export-video', async (event, { inputPath, outputPath, startTime, endTime }) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)  // e.g., '00:00:05' or 5 (seconds)
      .setDuration(endTime - startTime)
      .output(outputPath)
      .on('end', () => resolve({ success: true }))
      .on('error', (err) => reject(err))
      .run();
  });
});
```

**Call from React (App.jsx):**
```javascript
const handleExport = async () => {
  const result = await window.electron.exportVideo({
    inputPath: '/path/to/input.mp4',
    outputPath: '/path/to/output.mp4',
    startTime: 5,   // seconds
    endTime: 15     // seconds
  });
};
```

**Key FFmpeg Concepts:**
- `setStartTime()` - where to start trimming
- `setDuration()` - how long the output should be (NOT end time!)
- `.output()` - where to save the result
- `.on('end')` - callback when export finishes
- `.on('progress')` - callback for progress updates (bonus)

You don't need to understand video codecs or encoding details for MVP. Just use the pattern above.

---

## Development Milestones (Revised for Your Stack)

### Phase 1: Setup & Hello World (Hours 0-4) - Monday afternoon
**Goal:** Get Electron + React running with FFmpeg installed

- [ ] Install Homebrew and FFmpeg (`brew install ffmpeg`)
- [ ] Scaffold Electron project with React template
- [ ] Verify app launches in dev mode (`npm start`)
- [ ] Add a button that logs to console when clicked (test React works)
- [ ] Test FFmpeg from Node: create a test script that runs `ffmpeg -version`

**Success:** You can launch the app and see a React UI

---

### Phase 2: File Import (Hours 4-10) - Monday evening
**Goal:** Get a video file into your app

- [ ] Create `ImportButton` component with file input
- [ ] Set up IPC communication (main ↔ renderer)
- [ ] Use Electron's `dialog.showOpenDialog()` to pick MP4/MOV files
- [ ] Store imported file path in React state
- [ ] Display filename and file path in UI

**Success:** You click "Import," select a video, and see the filename displayed

**Code hint for main.js:**
```javascript
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov'] }]
  });
  return result.filePaths[0];
});
```

---

### Phase 3: Video Preview (Hours 10-16) - Monday night/Tuesday morning
**Goal:** Display and play the imported video

- [ ] Create `VideoPreview` component with HTML5 `<video>` tag
- [ ] Pass imported file path to video player
- [ ] Add Play and Pause buttons
- [ ] Verify video plays with audio

**Success:** You can import a video and watch it play in your app

**Code hint for VideoPreview.jsx:**
```javascript
function VideoPreview({ videoPath }) {
  const videoRef = useRef(null);
  
  const handlePlay = () => videoRef.current.play();
  const handlePause = () => videoRef.current.pause();
  
  return (
    <div>
      <video ref={videoRef} src={videoPath} />
      <button onClick={handlePlay}>Play</button>
      <button onClick={handlePause}>Pause</button>
    </div>
  );
}
```

---

### Phase 4: Simple Timeline UI (Hours 16-22) - Tuesday morning/afternoon
**Goal:** Show clip on a timeline with playhead

- [ ] Create `Timeline` component with a div representing the clip
- [ ] Show clip duration (get from video element's `duration` property)
- [ ] Add playhead (vertical line) that syncs with video `currentTime`
- [ ] Update playhead position as video plays

**Success:** Timeline shows clip as a bar, playhead moves during playback

**Code hint:**
```javascript
function Timeline({ videoDuration, currentTime }) {
  const playheadPosition = (currentTime / videoDuration) * 100; // percentage
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '60px', background: '#333' }}>
      <div style={{ width: '100%', height: '40px', background: '#555' }}>
        {/* This represents your video clip */}
      </div>
      <div style={{ 
        position: 'absolute', 
        left: `${playheadPosition}%`, 
        top: 0, 
        width: '2px', 
        height: '100%', 
        background: 'red' 
      }} />
    </div>
  );
}
```

---

### Phase 5: Trim Functionality (Hours 22-28) - Tuesday afternoon
**Goal:** Let user set IN and OUT points

- [ ] Add two text inputs for start time (IN) and end time (OUT) in seconds
- [ ] Store trim values in React state
- [ ] Visually indicate trimmed region on timeline (darken excluded parts)
- [ ] Update preview to only play trimmed section (set video currentTime)

**Success:** User types "5" and "15" and timeline shows that 5-15 second region

**Simple approach for MVP:**
- Just use two input boxes: "Start (seconds)" and "End (seconds)"
- Don't worry about dragging handles yet
- Visual feedback can be as simple as changing the clip div's width/position

---

### Phase 6: FFmpeg Export (Hours 28-32) - Tuesday late afternoon
**Goal:** Export trimmed video to MP4

- [ ] Create `ExportButton` component
- [ ] Set up IPC handler in main.js that calls FFmpeg
- [ ] Use `fluent-ffmpeg` to trim video (setStartTime, setDuration)
- [ ] Show "Exporting..." message during render
- [ ] Save output to user-selected location (use `dialog.showSaveDialog`)

**Success:** Click Export, FFmpeg runs, output MP4 plays correctly

**Code hint for main.js:**
```javascript
const ffmpeg = require('fluent-ffmpeg');

ipcMain.handle('export-video', async (event, { inputPath, outputPath, startTime, duration }) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve({ success: true }))
      .on('error', (err) => reject(err))
      .run();
  });
});
```

---

### Phase 7: Package & Test (Hours 32-36) - Tuesday evening
**Goal:** Create distributable .dmg for macOS

- [ ] Install electron-builder: `npm install electron-builder --save-dev`
- [ ] Add build script to package.json
- [ ] Run `npm run build` to create .dmg
- [ ] Test packaged app on your Mac (not dev mode)
- [ ] Verify import → preview → trim → export works in packaged build

**Success:** You have a .dmg file that installs and runs the complete workflow

**Add to package.json:**
```json
{
  "scripts": {
    "build": "electron-builder --mac"
  },
  "build": {
    "appId": "com.clipforge.app",
    "mac": {
      "category": "public.app-category.video",
      "target": "dmg"
    }
  }
}
```

---

### Buffer Time (Hours 36+) - Tuesday night before deadline
- Fix bugs discovered during packaging
- Add basic error handling (what if FFmpeg fails?)
- Clean up UI (make buttons obvious)
- Write README with setup instructions
- Submit before 10:59 PM CT

---

## MVP Success Metrics

**Passing Grade:**
- ✅ App launches from packaged build
- ✅ Imports at least one MP4 or MOV file
- ✅ Shows clip on timeline
- ✅ Video plays in preview
- ✅ Can trim clip (set start/end)
- ✅ Exports trimmed clip to MP4
- ✅ Exported file plays correctly

**Does NOT Need:**
- ❌ Multi-clip support
- ❌ Recording features
- ❌ Text overlays
- ❌ Transitions
- ❌ Multiple tracks
- ❌ Polish/animations
- ❌ Cloud upload

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| FFmpeg integration issues | Test export with single clip by hour 20 |
| Packaging fails at last minute | Create packaged build by hour 28, leave buffer for fixes |
| Timeline complexity delays progress | Use simplest possible UI (even just a progress bar representation) |
| Video playback bugs | Use standard HTML5 video element, avoid custom players |

---

## Out of Scope (Save for Full Submission)

The following are explicitly NOT required for MVP:
- Screen recording
- Webcam recording
- Multiple clips on timeline
- Clip reordering/arrangement
- Splitting clips
- Multiple tracks
- Audio controls
- Text/effects/transitions
- Keyboard shortcuts
- Undo/redo
- Auto-save

---

## Your Stack (Decided)

✅ **Framework:** Electron + React  
✅ **Platform:** macOS (will create .dmg for distribution)  
✅ **FFmpeg:** fluent-ffmpeg with system FFmpeg (via Homebrew)  
✅ **Timeline UI:** Simple HTML/CSS divs (no Canvas complexity)  
✅ **Video Player:** HTML5 `<video>` element

**Why this stack makes sense for you:**
- Electron is easier to learn than Tauri (no Rust required)
- React gives you component structure without complexity
- System FFmpeg is simpler than bundled WASM versions
- HTML5 video player works out of the box
- macOS-only for MVP reduces testing complexity

---

## Submission Checklist (Tuesday 10:59 PM CT)

- [ ] Packaged app builds successfully
- [ ] App launches on clean machine (or can demo on your machine)
- [ ] Can import MP4/MOV file
- [ ] Timeline displays imported clip
- [ ] Video preview plays clip
- [ ] Can set trim IN/OUT points
- [ ] Export creates playable MP4 file
- [ ] GitHub repo has basic README with run instructions
- [ ] Submit before deadline

---

## Complete Beginner's Quickstart

Since you haven't used Electron or FFmpeg before, here's everything you need to know:

### Understanding Electron Basics

**Electron has TWO processes:**
1. **Main Process** - Runs Node.js, has access to file system and FFmpeg
2. **Renderer Process** - Your React UI, runs in a browser-like environment

**They talk via IPC (Inter-Process Communication):**
- Your React code calls: `window.electron.doSomething()`
- Main process handles it: `ipcMain.handle('do-something', async () => {...})`

**Critical rule:** FFmpeg must run in the Main process, not in React.

### Step-by-Step First-Time Setup

**1. Install Prerequisites (15 minutes)**
```bash
# Install Homebrew (package manager for macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg

# Verify it works
ffmpeg -version
```

**2. Create Your Project (10 minutes)**
```bash
# Create Electron app with React template
npx create-electron-app clipforge --template=webpack
cd clipforge

# Install React and other dependencies
npm install react react-dom
npm install fluent-ffmpeg
npm install electron-builder --save-dev

# Test that it works
npm start
```

You should see a window open. That's Electron!

**3. Understanding the File Structure**
```
clipforge/
├── src/
│   ├── index.js       ← Main Process (Node.js, handles FFmpeg)
│   ├── preload.js     ← Bridge between main and renderer
│   ├── renderer.js    ← Entry point for React
│   ├── App.jsx        ← Your React components (CREATE THIS)
│   └── index.html     ← HTML shell
└── package.json
```

### Minimum Viable Code (Copy-Paste Starter)

This is the absolute minimum code to get import, preview, trim, and export working:

**src/App.jsx** (Your entire UI):
```javascript
import React, { useState, useRef } from 'react';

function App() {
  const [videoPath, setVideoPath] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const videoRef = useRef(null);

  const handleImport = async () => {
    const path = await window.electron.openFile();
    if (path) setVideoPath(path);
  };

  const handleExport = async () => {
    const output = await window.electron.saveFile();
    if (output) {
      await window.electron.exportVideo({
        input: videoPath,
        output: output,
        start: startTime,
        duration: endTime - startTime
      });
      alert('Export complete!');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>ClipForge MVP</h1>
      
      <button onClick={handleImport} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Import Video
      </button>
      
      {videoPath && (
        <div style={{ marginTop: '20px' }}>
          <video 
            ref={videoRef} 
            src={videoPath} 
            controls 
            width="640"
            style={{ display: 'block', marginBottom: '20px' }}
          />
          
          <div style={{ marginBottom: '20px' }}>
            <label>
              Start Time (seconds): 
              <input 
                type="number" 
                value={startTime} 
                onChange={(e) => setStartTime(Number(e.target.value))}
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
            <br/>
            <label>
              End Time (seconds): 
              <input 
                type="number" 
                value={endTime} 
                onChange={(e) => setEndTime(Number(e.target.value))}
                style={{ marginLeft: '10px', padding: '5px', marginTop: '10px' }}
              />
            </label>
          </div>
          
          <button 
            onClick={handleExport}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Export Trimmed Video
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
```

**src/renderer.js** (React entry point):
```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

**src/index.html** (add a root div):
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>ClipForge</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**src/preload.js** (IPC bridge):
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: () => ipcRenderer.invoke('save-file'),
  exportVideo: (params) => ipcRenderer.invoke('export-video', params)
});
```

**src/index.js** (Main Process - FFmpeg lives here):
```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load your app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile('index.html');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'webm'] }
    ]
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('save-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'output.mp4',
    filters: [
      { name: 'Video', extensions: ['mp4'] }
    ]
  });
  
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('export-video', async (event, { input, output, start, duration }) => {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)
      .setDuration(duration)
      .output(output)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('start', (cmd) => {
        console.log('FFmpeg started:', cmd);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
      })
      .on('end', () => {
        console.log('FFmpeg finished');
        resolve({ success: true });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
});
```

### How to Run and Test

```bash
# Start in development mode
npm start

# This opens your app - now test:
# 1. Click "Import Video"
# 2. Select an MP4 file
# 3. Video should play in preview
# 4. Change start/end times
# 5. Click "Export Trimmed Video"
# 6. Choose where to save
# 7. Wait for "Export complete!" alert
# 8. Play the exported file in VLC/QuickTime
```

### How to Package for Distribution

Add to your `package.json`:
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
    },
    "files": [
      "dist/**/*",
      "src/**/*",
      "package.json"
    ]
  }
}
```

Then build:
```bash
npm run build
```

This creates a `.dmg` file in the `dist/` folder.

### Common Issues and Solutions

**Problem:** Video won't play  
**Solution:** Check the file path is correct. Open DevTools (View → Toggle Developer Tools) and look for errors.

**Problem:** FFmpeg not found  
**Solution:** Make sure you ran `brew install ffmpeg`. Test with `ffmpeg -version` in terminal.

**Problem:** Export fails silently  
**Solution:** Check the Electron console (not browser DevTools - the terminal where you ran `npm start`). FFmpeg errors appear there.

**Problem:** "window.electron is not defined"  
**Solution:** Make sure your `preload.js` is correctly set in `webPreferences` and is exposing the functions via `contextBridge`.

**Problem:** Packaged app crashes but dev mode works  
**Solution:** FFmpeg path might be wrong. Make sure FFmpeg is in your system PATH or bundle it with your app.

### Debugging Tips

1. **Use console.log() everywhere** - Log file paths, state values, everything
2. **Check both consoles** - React errors in browser DevTools, Node/FFmpeg errors in terminal
3. **Test one thing at a time** - Get import working before moving to preview
4. **Simplify when stuck** - If something complex breaks, try the simplest version

### Timeline Milestones Reminder

- **Hours 0-4:** Get app running, install FFmpeg, scaffold project
- **Hours 4-10:** File import working
- **Hours 10-16:** Video preview playing
- **Hours 16-22:** Basic timeline UI (can be simple divs)
- **Hours 22-28:** Trim functionality (just number inputs for MVP)
- **Hours 28-32:** FFmpeg export working
- **Hours 32-36:** Package as .dmg and test

---

## Remember: Ship the MVP

You have ~36 hours. The code above is your MVP - it's literally 100 lines total. Everything else is improvements.

Don't add features until this basic flow works:
1. Import video ✓
2. Play video ✓
3. Set trim points ✓
4. Export trimmed video ✓

Once that works end-to-end, THEN add timeline visualization, better UI, etc.

**Most important:** Submit something that works, even if it's simple. A working 100-line app beats a broken 1000-line app.

Good luck! 🚀
