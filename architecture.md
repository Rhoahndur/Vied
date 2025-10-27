# ClipForge Architecture Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[React Application]
        App[App.jsx Main Component]
        Import[ImportButton.jsx]
        Preview[VideoPreview.jsx]
        Timeline[Timeline.jsx]
        Trim[TrimControls.jsx]
        Export[ExportButton.jsx]
    end

    subgraph "IPC Bridge Layer"
        Preload[preload.js Context Bridge]
    end

    subgraph "Main Process Layer"
        Main[index.js Electron Main Process]
        FileHandler[File Dialog Handlers]
        MetadataHandler[Video Metadata Handler]
        ExportHandler[Export Handler]
    end

    subgraph "External Systems"
        FFmpeg[FFmpeg Video Processing]
        FileSystem[macOS File System]
        VideoFile[Video Files MP4/MOV/WebM]
    end

    subgraph "State Management"
        State[React State]
    end

    UI --> App
    App --> Import
    App --> Preview
    App --> Timeline
    App --> Trim
    App --> Export
    App <--> State

    Import -.IPC Call.-> Preload
    Export -.IPC Call.-> Preload
    Preview -.IPC Call.-> Preload

    Preload <-.Secure Bridge.-> Main

    Main --> FileHandler
    Main --> MetadataHandler
    Main --> ExportHandler

    FileHandler <--> FileSystem
    MetadataHandler --> FFmpeg
    ExportHandler --> FFmpeg
    
    FFmpeg <--> VideoFile
    FileSystem <--> VideoFile

    Preview -.Reads.-> VideoFile

    style UI fill:#e1f5ff
    style Main fill:#fff3e0
    style FFmpeg fill:#ffebee
    style State fill:#f3e5f5
    style Preload fill:#e8f5e9
```

## Component Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant Preload as IPC Bridge
    participant Main as Main Process
    participant FFmpeg
    participant FS as File System

    Note over User,FS: Import Video Flow
    User->>UI: Click "Import Video"
    UI->>Preload: window.electron.openFile()
    Preload->>Main: ipcRenderer.invoke('open-file')
    Main->>FS: dialog.showOpenDialog()
    FS-->>Main: filePath
    Main-->>Preload: return filePath
    Preload-->>UI: filePath
    UI->>Preload: window.electron.getVideoMetadata(filePath)
    Preload->>Main: ipcRenderer.invoke('get-video-metadata')
    Main->>FFmpeg: ffmpeg.ffprobe(filePath)
    FFmpeg-->>Main: metadata
    Main-->>Preload: metadata
    Preload-->>UI: metadata
    UI->>UI: Update State & Display Video

    Note over User,FS: Playback Flow
    User->>UI: Click Play
    UI->>UI: videoRef.current.play()
    UI->>UI: Update currentTime via onTimeUpdate
    UI->>UI: Update Timeline Playhead

    Note over User,FS: Trim Flow
    User->>UI: Set IN Point
    UI->>UI: setStartTime(currentTime)
    UI->>UI: Update Timeline Visualization
    User->>UI: Set OUT Point
    UI->>UI: setEndTime(currentTime)
    UI->>UI: Update Timeline Visualization

    Note over User,FS: Export Flow
    User->>UI: Click "Export Video"
    UI->>Preload: window.electron.saveFile()
    Preload->>Main: ipcRenderer.invoke('save-file')
    Main->>FS: dialog.showSaveDialog()
    FS-->>Main: outputPath
    Main-->>Preload: outputPath
    Preload-->>UI: outputPath
    UI->>Preload: window.electron.exportVideo(params)
    Preload->>Main: ipcRenderer.invoke('export-video', params)
    Main->>FFmpeg: ffmpeg process
    FFmpeg->>FS: Write trimmed video
    FFmpeg-->>Main: Export complete
    Main-->>Preload: success
    Preload-->>UI: success
    UI->>User: Show success message
```

## Data Flow

```mermaid
flowchart LR
    subgraph Input
        VideoFile[Video File MP4/MOV/WebM]
    end

    subgraph "React Application"
        Import[Import Component]
        State[App State]
        Preview[Preview Component]
        Timeline[Timeline Component]
        Trim[Trim Controls Component]
        Export[Export Component]
    end

    subgraph "Electron Main"
        IPC[IPC Handlers]
        FFmpegProbe[FFmpeg Probe Get Metadata]
        FFmpegExport[FFmpeg Export Trim and Encode]
    end

    subgraph Output
        TrimmedVideo[Trimmed Video MP4]
    end

    VideoFile -->|File Path| Import
    Import -->|videoPath| State
    State -->|videoPath| Preview
    State -->|duration, currentTime| Timeline
    State -->|startTime, endTime| Trim
    State -->|Export params| Export

    Import -.->|Get Metadata| IPC
    IPC -->|Request| FFmpegProbe
    FFmpegProbe -->|duration, resolution, etc| IPC
    IPC -.->|Metadata| Import
    Import -->|metadata| State

    Export -.->|Export Request| IPC
    IPC -->|Process Video| FFmpegExport
    FFmpegExport -->|Write File| TrimmedVideo
    FFmpegExport -.->|Success| IPC
    IPC -.->|Complete| Export

    Preview -->|User seeks| State
    Timeline -->|Click to seek| State
    Trim -->|Set IN/OUT| State

    style VideoFile fill:#bbdefb
    style TrimmedVideo fill:#c8e6c9
    style State fill:#fff9c4
    style IPC fill:#ffccbc
```

## File Structure

```mermaid
graph TD
    subgraph "Project Root"
        Package[package.json]
        README[README.md]
        GitIgnore[.gitignore]
    end

    subgraph "src/"
        IndexJS[index.js]
        PreloadJS[preload.js]
        RendererJS[renderer.js]
        IndexHTML[index.html]
        AppJSX[App.jsx]
    end

    subgraph "src/components/"
        ImportBtn[ImportButton.jsx]
        VideoPreview[VideoPreview.jsx]
        TimelineComp[Timeline.jsx]
        TrimControls[TrimControls.jsx]
        ExportBtn[ExportButton.jsx]
    end

    subgraph "src/styles/"
        AppCSS[app.css]
    end

    subgraph "Build Output"
        Dist[dist/]
    end

    Package -.defines.-> IndexJS
    IndexJS --> PreloadJS
    IndexHTML --> RendererJS
    RendererJS --> AppJSX
    AppJSX --> ImportBtn
    AppJSX --> VideoPreview
    AppJSX --> TimelineComp
    AppJSX --> TrimControls
    AppJSX --> ExportBtn
    AppJSX --> AppCSS
    Package -.builds to.-> Dist

    style IndexJS fill:#ffccbc
    style AppJSX fill:#bbdefb
    style Dist fill:#c8e6c9
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> NoVideo
    
    NoVideo --> VideoLoaded: Import Video
    
    state VideoLoaded {
        [*] --> Stopped
        Stopped --> Playing: Play
        Playing --> Stopped: Pause
        Playing --> Playing: Time Update
        Stopped --> Stopped: Seek
        Playing --> Stopped: Seek
    }
    
    VideoLoaded --> TrimSet: Set IN/OUT Points
    
    state TrimSet {
        [*] --> InPointSet
        InPointSet --> BothPointsSet: Set OUT
        BothPointsSet --> InPointSet: Adjust IN
        BothPointsSet --> BothPointsSet: Adjust OUT
    }
    
    TrimSet --> Exporting: Click Export
    
    state Exporting {
        [*] --> Processing
        Processing --> Complete: Success
        Processing --> Error: Failure
        Complete --> [*]
        Error --> [*]
    }
    
    Exporting --> VideoLoaded: Continue Editing
    VideoLoaded --> NoVideo: Import New Video
```

## IPC Communication

```mermaid
graph TB
    subgraph "Renderer Process"
        ReactApp[React Components]
        WindowElectron[window.electron API]
    end

    subgraph "Preload Script"
        ContextBridge[contextBridge API]
        IPCRenderer[ipcRenderer.invoke]
    end

    subgraph "Main Process"
        IPCMain[ipcMain.handle]
        Handlers[Handler Functions]
    end

    subgraph "APIs Exposed"
        API1[openFile]
        API2[saveFile]
        API3[exportVideo]
        API4[getVideoMetadata]
    end

    ReactApp -->|calls| WindowElectron
    WindowElectron -->|uses| ContextBridge
    ContextBridge -->|exposes| API1
    ContextBridge -->|exposes| API2
    ContextBridge -->|exposes| API3
    ContextBridge -->|exposes| API4
    
    API1 -->|triggers| IPCRenderer
    API2 -->|triggers| IPCRenderer
    API3 -->|triggers| IPCRenderer
    API4 -->|triggers| IPCRenderer
    
    IPCRenderer -->|invokes| IPCMain
    IPCMain -->|routes to| Handlers
    
    Handlers -->|returns via| IPCMain
    IPCMain -->|sends to| IPCRenderer
    IPCRenderer -->|resolves to| WindowElectron
    WindowElectron -->|returns to| ReactApp

    style ReactApp fill:#e1f5ff
    style ContextBridge fill:#e8f5e9
    style Handlers fill:#fff3e0
```

## FFmpeg Processing Pipeline

```mermaid
flowchart TB
    subgraph Input
        SourceVideo[Source Video File]
    end

    subgraph "FFmpeg Processing"
        FFmpegCmd[FFmpeg Command]
        SetStart[setStartTime]
        SetDuration[setDuration]
        VideoCodec[videoCodec libx264]
        AudioCodec[audioCodec aac]
        OutputOpts[outputOptions]
    end

    subgraph Events
        Start[on start]
        Progress[on progress]
        End[on end]
        Error[on error]
    end

    subgraph Output
        TrimmedFile[Trimmed MP4 File]
    end

    SourceVideo --> FFmpegCmd
    FFmpegCmd --> SetStart
    SetStart --> SetDuration
    SetDuration --> VideoCodec
    VideoCodec --> AudioCodec
    AudioCodec --> OutputOpts
    OutputOpts --> Start
    Start --> Progress
    Progress --> End
    Progress --> Error
    End --> TrimmedFile

    style SourceVideo fill:#bbdefb
    style FFmpegCmd fill:#fff3e0
    style TrimmedFile fill:#c8e6c9
    style Error fill:#ffcdd2
```

## Component Hierarchy

```mermaid
graph TD
    Root[renderer.js]
    Root --> App[App.jsx]
    
    App --> ControlPanel[Control Panel]
    App --> PreviewSection[Preview Section]
    App --> TimelineSection[Timeline Section]
    
    ControlPanel --> ImportButton[ImportButton.jsx]
    ControlPanel --> ExportButton[ExportButton.jsx]
    ControlPanel --> FileInfo[File Info]
    ControlPanel --> TrimControls[TrimControls.jsx]
    
    PreviewSection --> VideoPreview[VideoPreview.jsx]
    VideoPreview --> VideoElement[Video Element]
    VideoPreview --> PlayControls[Play/Pause]
    VideoPreview --> TimeDisplay[Time Display]
    
    TimelineSection --> Timeline[Timeline.jsx]
    Timeline --> Track[Timeline Track]
    Timeline --> Playhead[Playhead]
    Timeline --> TrimRegion[Trim Region]
    Timeline --> TimeMarkers[Time Markers]
    
    App -.state.-> State[React State]
    
    ImportButton -.reads.-> State
    ExportButton -.reads.-> State
    TrimControls -.reads/writes.-> State
    VideoPreview -.reads/writes.-> State
    Timeline -.reads/writes.-> State

    style App fill:#bbdefb
    style State fill:#fff9c4
    style VideoElement fill:#c8e6c9
```

## Security Model

```mermaid
graph LR
    subgraph "Renderer"
        React[React App]
    end

    subgraph "Preload"
        Bridge[contextBridge]
    end

    subgraph "Main"
        Main[Node.js APIs]
    end

    React -->|Limited API| Bridge
    Bridge -->|Secure IPC| Main
    React -.X Blocked.-> Main
    
    Note1[nodeIntegration false]
    Note2[contextIsolation true]
    Note3[enableRemoteModule false]
    
    Note1 -.-> React
    Note2 -.-> Bridge
    Note3 -.-> Main

    style React fill:#ffcdd2
    style Bridge fill:#c8e6c9
    style Main fill:#fff9c4
```

## Build and Distribution

```mermaid
flowchart TD
    Source[Source Code]
    
    subgraph "Development"
        DevServer[Webpack Dev Server]
        HMR[Hot Module Reload]
    end
    
    subgraph "Build Process"
        ElectronBuilder[electron-builder]
        Webpack[Webpack Bundle]
        Package[Package App]
        Sign[Code Signing]
    end
    
    subgraph "Output"
        DMG[ClipForge.dmg]
        AppBundle[ClipForge.app]
    end
    
    Source --> DevServer
    DevServer --> HMR
    HMR -.->|Changes| DevServer
    
    Source --> ElectronBuilder
    ElectronBuilder --> Webpack
    Webpack --> Package
    Package --> Sign
    Sign --> DMG
    DMG --> AppBundle
    
    style DevServer fill:#e1f5ff
    style DMG fill:#c8e6c9
    style AppBundle fill:#c8e6c9
```

## Technology Stack

```mermaid
graph TB
    subgraph "User Interface"
        React[React 18]
        CSS[CSS3]
        HTML5[HTML5 Video]
    end

    subgraph "Desktop Framework"
        Electron[Electron]
        IPC[IPC Communication]
    end

    subgraph "Build Tools"
        Webpack[Webpack]
        Builder[electron-builder]
    end

    subgraph "Video Processing"
        FFmpeg[FFmpeg]
        FluentFFmpeg[fluent-ffmpeg]
    end

    subgraph "System"
        NodeJS[Node.js]
        macOS[macOS]
    end

    React --> Electron
    CSS --> React
    HTML5 --> React
    
    Electron --> IPC
    Electron --> NodeJS
    
    Webpack --> React
    Builder --> Electron
    
    FluentFFmpeg --> FFmpeg
    FluentFFmpeg --> NodeJS
    
    NodeJS --> macOS
    FFmpeg --> macOS

    style React fill:#61dafb
    style Electron fill:#47848f
    style FFmpeg fill:#5cb85c
    style macOS fill:#999999
```
