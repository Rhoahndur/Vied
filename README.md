# Vied

A desktop video editor built with Electron + React for trimming and exporting videos.

## Features

✅ Import MP4, MOV, WebM video files
✅ Visual timeline with playhead
✅ Set IN/OUT trim points
✅ Real-time video preview with controls
✅ Export trimmed videos using FFmpeg
✅ Keyboard shortcuts (I = IN, O = OUT)
✅ Comprehensive error handling
✅ Smooth animations and transitions

## Prerequisites

- **macOS** (for development and building)
- **Node.js 18+** and npm
- **FFmpeg** installed system-wide

## Quick Start

### 1. Install FFmpeg

```bash
brew install ffmpeg
# Verify installation
ffmpeg -version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

```bash
npm start
```

The app will launch in development mode with hot reloading enabled.

## Building for Distribution

### Create Distributable Package

```bash
npm run make
```

This will create:
- **Packaged app**: `out/Vied-darwin-arm64/Vied.app`
- **Zip file**: `out/make/zip/darwin/arm64/Vied-darwin-arm64-1.0.0.zip`

### Launch Packaged App

```bash
open out/Vied-darwin-arm64/Vied.app
```

Or double-click `Vied.app` in Finder.

## Usage Guide

1. **Import Video**
   - Click "Import Video" button
   - Select an MP4, MOV, or WebM file
   - Video metadata will display (duration, resolution, codec, etc.)

2. **Preview & Playback**
   - Use Play/Pause button to control playback
   - Current time and duration display below video

3. **Set Trim Points**
   - **Method 1**: Click "Set IN" and "Set OUT" buttons at desired positions
   - **Method 2**: Type start/end times manually (in seconds)
   - **Keyboard**: Press **I** for IN point, **O** for OUT point
   - Timeline shows trim region in blue with markers

4. **Export Trimmed Video**
   - Click "Export Video" button
   - Choose save location
   - Wait for processing to complete
   - Success message will appear when done

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **I** | Set IN point at current playhead position |
| **O** | Set OUT point at current playhead position |

## Tech Stack

- **Electron** 38.4.0 - Desktop framework
- **React** 19.2.0 - UI library
- **FFmpeg** via fluent-ffmpeg - Video processing
- **Electron Forge** - Build tooling
- **Webpack** - Module bundler

## Project Structure

```
vied/
├── src/
│   ├── main.js                  # Main process (Electron + IPC)
│   ├── preload.js              # Security bridge
│   ├── renderer.js             # React entry point
│   ├── App.jsx                 # Main React component
│   ├── index.html              # HTML shell
│   ├── components/
│   │   ├── ImportButton.jsx    # File import
│   │   ├── VideoPreview.jsx    # Video player
│   │   ├── Timeline.jsx        # Timeline visualization
│   │   ├── TrimControls.jsx    # Trim controls
│   │   └── ExportButton.jsx    # Export functionality
│   └── styles/
│       └── app.css             # Global styles
├── out/                         # Build output (gitignored)
├── .webpack/                    # Webpack output (gitignored)
├── package.json
└── forge.config.js
```

## Development

### Available Scripts

```bash
npm start          # Launch development server
npm run package    # Package app without creating installer
npm run make       # Create distributable package
```

### File Watching

The development server watches for changes and hot-reloads automatically.

## Troubleshooting

### App Won't Start

**Issue**: App crashes or won't launch

**Solutions**:
- Verify FFmpeg is installed: `ffmpeg -version`
- Delete `node_modules/` and reinstall: `rm -rf node_modules && npm install`
- Clear webpack cache: `rm -rf .webpack`

### Export Fails

**Issue**: Export button doesn't work or fails silently

**Solutions**:
- Check terminal console for FFmpeg errors
- Ensure input file is a valid video format (MP4, MOV, WebM)
- Try exporting a shorter clip
- Verify FFmpeg is in your system PATH

### Build Fails

**Issue**: `npm run make` throws errors

**Solutions**:
- Install Xcode Command Line Tools: `xcode-select --install`
- Delete build artifacts: `rm -rf out dist .webpack`
- Verify all devDependencies are installed: `npm install`
- Check disk space availability

### Video Won't Play

**Issue**: Video imports but won't play in preview

**Solutions**:
- Check if file path is valid (use absolute paths)
- Try a different video file
- Verify codec is supported (H.264 recommended)
- Open browser DevTools (View → Toggle Developer Tools) to check for errors

## System Requirements

**Minimum**:
- macOS 10.13 or later
- 4GB RAM
- 500MB free disk space
- FFmpeg installed

**Recommended**:
- macOS 11 or later (Big Sur+)
- 8GB RAM
- 1GB+ free disk space for exports

## Supported Formats

**Input**: MP4, MOV, WebM, AVI, MKV
**Output**: MP4 (H.264 video, AAC audio)

## Contributing

This is an MVP project. For bugs or feature requests, please open an issue on GitHub.

## License

MIT

## Version

**Current Version**: 1.0.0
**Release Date**: October 2024
