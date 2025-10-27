# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vied is a desktop video editor MVP built with Electron + React that enables users to import video files, trim them using a visual timeline, and export the results as MP4 files. The core video processing is handled by FFmpeg.

**Tech Stack:**
- Electron (desktop framework)
- React 18 (UI)
- FFmpeg via fluent-ffmpeg (video processing)
- electron-builder (packaging)

**Target Platform:** macOS (primary), with cross-platform potential

## Key Commands

### Development
```bash
npm start                # Launch app in development mode
npm run package          # Package app without creating installer
npm run make             # Create distributable using electron-forge
```

### Building & Distribution
```bash
npm run build            # Build for current platform
npm run build:mac        # Build macOS version
npm run build:mac:dmg    # Build macOS .dmg installer
```

### Prerequisites
FFmpeg must be installed system-wide:
```bash
brew install ffmpeg
ffmpeg -version          # Verify installation
```

## Architecture Overview

Vied uses a **two-process architecture** typical of Electron applications:

### Main Process (`src/index.js`)
- Node.js environment with full system access
- Handles file system operations, dialogs
- **FFmpeg video processing lives here**
- IPC handlers for communication with renderer
- Critical: All FFmpeg operations must run in main process, not renderer

### Renderer Process (`src/App.jsx` + components)
- Browser-like environment running React
- No direct Node.js access (security)
- Communicates with main via IPC bridge
- Handles UI state and user interactions

### IPC Bridge (`src/preload.js`)
- Security layer between main and renderer
- Exposes limited API via `contextBridge`
- All main process calls must go through this bridge
- Uses `contextIsolation: true` for security

**Important Security Settings:**
- `nodeIntegration: false` - Renderer cannot access Node.js
- `contextIsolation: true` - Renderer isolated from main
- `enableRemoteModule: false` - Remote module disabled

## State Management

All application state is managed in `src/App.jsx` using React hooks:

**Key State Variables:**
- `videoPath` - Absolute path to imported video file
- `videoMetadata` - FFmpeg metadata (duration, resolution, fps, etc.)
- `currentTime` - Playhead position in seconds
- `duration` - Total video duration
- `startTime` - Trim IN point (seconds)
- `endTime` - Trim OUT point (seconds)
- `seekFunctionRef` - Ref to video seek function passed up from VideoPreview

**State Flow:**
1. User imports file → `videoPath` set → metadata fetched → `videoMetadata` populated
2. Video loads → `duration` set → `endTime` initialized to full duration
3. User plays video → `currentTime` updates via `onTimeUpdate` events
4. User sets trim → `startTime`/`endTime` updated → Timeline UI reflects changes
5. User exports → FFmpeg uses `startTime` and `duration` (endTime - startTime)

## Component Structure

```
src/App.jsx                    # Main component, owns all state
├── ImportButton.jsx           # File import dialog
├── VideoPreview.jsx           # HTML5 video player with controls
├── Timeline.jsx               # Visual timeline with playhead & trim regions
├── TrimControls.jsx           # IN/OUT point controls
└── ExportButton.jsx           # FFmpeg export trigger
```

**Component Communication Pattern:**
- Props flow down from App.jsx
- Events flow up via callbacks
- VideoPreview exposes seek function via `onSeekReady` callback (ref pattern)
- Timeline sends seek requests via `onSeek` callback
- All components are controlled (no local state for shared data)

## FFmpeg Integration

### Metadata Extraction
```javascript
// src/index.js - get-video-metadata handler
ffmpeg.ffprobe(filePath, (err, metadata) => {
  const videoStream = metadata.streams.find(s => s.codec_type === 'video');
  return {
    duration: metadata.format.duration,
    width: videoStream?.width,
    height: videoStream?.height,
    fps: eval(videoStream?.r_frame_rate),
    size: metadata.format.size
  };
});
```

### Video Export
```javascript
// src/index.js - export-video handler
ffmpeg(input)
  .setStartTime(start)              // Trim start (seconds)
  .setDuration(duration)            // NOT end time - duration!
  .output(output)
  .videoCodec('libx264')            // H.264
  .audioCodec('aac')                // AAC audio
  .outputOptions([
    '-preset fast',
    '-crf 23',                      // Quality (18-28 range)
    '-movflags +faststart'          // Enable streaming
  ])
  .on('start', cmd => console.log('FFmpeg:', cmd))
  .on('progress', progress => console.log('Progress:', progress))
  .on('end', () => resolve({ success: true }))
  .on('error', err => reject(err))
  .run();
```

**Critical FFmpeg Concepts:**
- `setStartTime(seconds)` - Where to start trimming
- `setDuration(seconds)` - How long the output should be (**NOT end time!**)
- Duration is calculated as: `endTime - startTime`
- Export always uses H.264/AAC for maximum compatibility

## IPC API Reference

**Exposed Methods (via `window.electron`):**

```javascript
// File operations
window.electron.openFile()                    // Returns: filePath | null
window.electron.saveFile()                    // Returns: filePath | null

// Video operations
window.electron.exportVideo({                 // Returns: { success: boolean }
  input,        // string - source video path
  output,       // string - destination path
  start,        // number - start time in seconds
  duration      // number - duration in seconds (NOT end time)
})

window.electron.getVideoMetadata(filePath)    // Returns: metadata object
```

## Common Development Patterns

### Adding a New Component
1. Create in `src/components/ComponentName.jsx`
2. Import in `src/App.jsx`
3. Add state if needed in App.jsx
4. Pass props down from App.jsx
5. Use callbacks for events that need to update App state

### Adding a New IPC Handler
1. Define handler in `src/index.js`:
   ```javascript
   ipcMain.handle('handler-name', async (event, params) => {
     // Implementation
   });
   ```
2. Expose in `src/preload.js`:
   ```javascript
   contextBridge.exposeInMainWorld('electron', {
     methodName: (params) => ipcRenderer.invoke('handler-name', params)
   });
   ```
3. Call from React:
   ```javascript
   const result = await window.electron.methodName(params);
   ```

### Video Element Integration
The HTML5 `<video>` element is used directly (no custom player library):
- Use `ref` to access video element methods
- Listen to `onTimeUpdate` for playhead position
- Listen to `onLoadedMetadata` for duration
- Control playback via `videoRef.current.play()` / `pause()`
- Seek via `videoRef.current.currentTime = seconds`

## Packaging Considerations

When building distributable apps:

1. **FFmpeg Location**: The current implementation expects FFmpeg in system PATH. For production:
   - Option A: Bundle FFmpeg binary with app (increases size ~100MB)
   - Option B: Require users to install FFmpeg separately (current approach)

2. **File Paths**: Always use absolute paths, never relative. Packaged apps have different working directories.

3. **DevTools**: `mainWindow.webContents.openDevTools()` auto-opens in dev mode but is commented out in production builds.

4. **Build Artifacts**:
   - `dist/` - electron-builder output
   - `out/` - electron-forge output
   - Both should be gitignored

## Debugging

**Two Consoles to Monitor:**
1. **Browser DevTools** (View → Toggle Developer Tools): React errors, UI logs
2. **Terminal Console** (where `npm start` runs): Main process errors, FFmpeg logs

**Common Issues:**

- **"window.electron is undefined"**: Preload script not loading correctly. Check `webPreferences.preload` path in index.js.

- **FFmpeg not found**: FFmpeg not in PATH. Verify with `ffmpeg -version` in terminal.

- **Video won't play**: Check file path is absolute. Check console for CORS/security errors. Ensure file format is supported (MP4/MOV/WebM).

- **Export fails silently**: Check main process console for FFmpeg errors. Common causes: invalid trim times, unsupported codec, disk space.

- **IPC timeout**: Large video processing can take time. Don't set aggressive timeouts on export operations.

## Development Workflow

The project is designed to be built incrementally via PRs:

1. **Setup & Configuration** - Project scaffolding, dependencies
2. **UI Structure** - React components, basic layout
3. **IPC Setup** - Communication bridge
4. **File Import** - Dialog handling, metadata extraction
5. **Video Preview** - HTML5 player integration
6. **Timeline** - Visual representation, seeking
7. **Trim Controls** - IN/OUT point setting
8. **FFmpeg Export** - Core video processing
9. **Packaging** - Distribution build
10. **Polish** - Error handling, UX improvements

Each feature should be tested in development mode before packaging.

## Testing Checklist

Before submitting builds:

- [ ] Import MP4, MOV, and WebM files successfully
- [ ] Video plays with audio in sync
- [ ] Timeline playhead updates during playback
- [ ] Clicking timeline seeks to correct position
- [ ] Set IN/OUT points manually (input fields)
- [ ] Set IN/OUT points via buttons at playhead position
- [ ] Export creates valid MP4 file
- [ ] Exported video matches trim settings exactly
- [ ] Test with short video (< 10s)
- [ ] Test with longer video (> 1 minute)
- [ ] Test with different resolutions (720p, 1080p, 4K)
- [ ] Test with video that has no audio track
- [ ] Build and test packaged .dmg on clean macOS install

## Critical Constraints

**MVP Requirements (Must Have):**
- Single video import (no multi-clip timeline)
- Basic trim (IN/OUT points only)
- MP4 export with H.264/AAC
- Works offline (no cloud dependencies)
- Packaged as macOS .dmg

**Explicitly Out of Scope:**
- Screen/webcam recording
- Multiple clips on timeline
- Clip reordering
- Splitting clips
- Multiple tracks
- Audio level controls
- Text overlays or effects
- Transitions
- Undo/redo
- Auto-save

## Performance Notes

- HTML5 video element handles playback natively - no custom decoding needed
- FFmpeg export is CPU-intensive; expect 30s-2min for a 1-minute trim
- Timeline rendering is CSS-based (divs), not Canvas - simpler but less flexible
- State updates on every `onTimeUpdate` event (~30-60 FPS) - React handles this efficiently
- Metadata fetching via ffprobe is fast (< 1s for most files)

## File Format Support

**Tested & Supported:**
- MP4 (H.264 video, AAC audio)
- MOV (QuickTime)
- WebM

**Export Format:**
- MP4 only (H.264 video, AAC audio, CRF 23, fast preset)

**Audio:**
- Videos with audio: Audio is preserved in export
- Videos without audio: Export succeeds (video-only MP4)

## Security Model

The app uses Electron security best practices:

- Renderer process is sandboxed (no Node.js access)
- Context isolation prevents prototype pollution
- No remote module (all IPC is explicit)
- Preload script whitelist pattern (only expose needed APIs)
- User-selected file paths only (no arbitrary file access from UI)

## Project Goals

This is an **MVP** (Minimum Viable Product) with a tight deadline. The goal is to prove core functionality:
1. Import video files
2. Display in timeline
3. Basic trimming
4. Export as MP4

**Philosophy:** Ship a working product with limited features rather than an incomplete product with many features. Every feature must work reliably end-to-end.
