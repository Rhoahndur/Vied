import { useState, useRef, useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { VideoPreview } from "./components/VideoPreview";
import { Timeline } from "./components/Timeline";
import { MediaLibrary } from "./components/MediaLibrary";
import { InspectorPanel } from "./components/InspectorPanel";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";

// Type definitions
interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
  hasAudio: boolean;
}

interface Clip {
  id: number;
  startTime: number;
  endTime: number;
  videoPath: string;
  track: 'main' | 'overlay';
}

interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
  duration: number;
  size: number;
  thumbnail?: string;
}

// Extend Window interface for electron APIs
declare global {
  interface Window {
    electron: {
      openFile: () => Promise<string>;
      saveFile: (format?: string) => Promise<string>;
      exportVideo: (params: any) => Promise<any>;
      exportClips: (params: any) => Promise<any>;
      getVideoMetadata: (filePath: string) => Promise<VideoMetadata>;
      convertMovToMp4: (movFilePath: string) => Promise<string>;
      getPathForFile: (file: File) => string;
      checkScreenPermission: () => Promise<any>;
      openSystemPreferences: (type: string) => Promise<void>;
      getSources: () => Promise<any>;
      saveRecording: (buffer: ArrayBuffer) => Promise<string>;
      checkCameraPermission: () => Promise<any>;
      requestCameraPermission: () => Promise<any>;
      generateThumbnail: (filePath: string) => Promise<string>;
    };
  }
}

export default function App() {
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const seekFunctionRef = useRef<((time: number) => void) | null>(null);

  // Load recent files from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('vied-recent-files');
    if (stored) {
      try {
        setRecentFiles(JSON.parse(stored));
      } catch (err) {
        console.error('Error loading recent files:', err);
      }
    }
  }, []);

  // Save to recent files
  const addToRecentFiles = async (filePath: string, metadata: VideoMetadata) => {
    try {
      // Generate thumbnail
      const thumbnail = await window.electron.generateThumbnail(filePath);

      const newRecent: RecentFile = {
        path: filePath,
        name: filePath.split('/').pop() || 'Unknown',
        timestamp: Date.now(),
        duration: metadata.duration,
        size: metadata.size,
        thumbnail: thumbnail
      };

      const filtered = recentFiles.filter(f => f.path !== filePath);
      const updated = [newRecent, ...filtered].slice(0, 10);

      setRecentFiles(updated);
      localStorage.setItem('vied-recent-files', JSON.stringify(updated));
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      // Still add file without thumbnail
      const newRecent: RecentFile = {
        path: filePath,
        name: filePath.split('/').pop() || 'Unknown',
        timestamp: Date.now(),
        duration: metadata.duration,
        size: metadata.size
      };

      const filtered = recentFiles.filter(f => f.path !== filePath);
      const updated = [newRecent, ...filtered].slice(0, 10);

      setRecentFiles(updated);
      localStorage.setItem('vied-recent-files', JSON.stringify(updated));
    }
  };

  const handleFileSelected = (data: { path: string; metadata: VideoMetadata; error?: string }) => {
    console.log('File selected in App:', data);
    setError(null);

    if (data.error) {
      setError(data.error);
      return;
    }

    if (data.metadata) {
      setVideoPath(data.path);
      setVideoMetadata(data.metadata);
      const dur = data.metadata.duration || 0;
      setDuration(dur);
      setCurrentTime(0);
      setStartTime(0);
      setEndTime(dur);

      setClips([]);
      setSelectedClipId(null);

      addToRecentFiles(data.path, data.metadata);
    } else {
      setError('Failed to load video metadata. Please try a different file.');
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeekReady = (seekFunction: (time: number) => void) => {
    seekFunctionRef.current = seekFunction;
  };

  const handleSeek = (time: number) => {
    if (seekFunctionRef.current) {
      seekFunctionRef.current(time);
    }
  };

  const handleSetStart = (time: number) => {
    setStartTime(time);
  };

  const handleSetEnd = (time: number) => {
    setEndTime(time);
  };

  const handleResetTrim = () => {
    setStartTime(0);
    setEndTime(duration);
  };

  const handleSplitClip = () => {
    if (!videoPath || currentTime <= startTime || currentTime >= endTime) {
      return;
    }

    const newClips: Clip[] = [
      {
        id: Date.now(),
        startTime: startTime,
        endTime: currentTime,
        videoPath: videoPath,
        track: 'main'
      },
      {
        id: Date.now() + 1,
        startTime: currentTime,
        endTime: endTime,
        videoPath: videoPath,
        track: 'main'
      }
    ];

    setClips(prevClips => {
      if (prevClips.length === 0) {
        return newClips;
      } else {
        const clipIndex = prevClips.findIndex(c => c.id === selectedClipId);
        if (clipIndex === -1) return prevClips;

        const newClipsList = [...prevClips];
        newClipsList.splice(clipIndex, 1, ...newClips);
        return newClipsList;
      }
    });

    setSelectedClipId(newClips[0].id);
    setStartTime(newClips[0].startTime);
    setEndTime(newClips[0].endTime);
  };

  const handleSelectClip = (clipId: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      setSelectedClipId(clipId);
      setStartTime(clip.startTime);
      setEndTime(clip.endTime);
    }
  };

  const handleReorderClips = (draggedClipId: number, targetClipId: number) => {
    const draggedIndex = clips.findIndex(c => c.id === draggedClipId);
    const targetIndex = clips.findIndex(c => c.id === targetClipId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }

    const newClips = [...clips];
    const [draggedClip] = newClips.splice(draggedIndex, 1);
    newClips.splice(targetIndex, 0, draggedClip);

    setClips(newClips);
  };

  const handleDeleteClip = (clipId: number) => {
    const newClips = clips.filter(c => c.id !== clipId);
    setClips(newClips);

    // If deleted clip was selected, clear selection
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
      // Reset trim to full video
      setStartTime(0);
      setEndTime(duration);
    }
  };

  const handleUpdateClip = (clipId: number, updates: { startTime?: number; endTime?: number }) => {
    setClips(prevClips =>
      prevClips.map(clip =>
        clip.id === clipId
          ? { ...clip, ...updates }
          : clip
      )
    );
  };

  const loadVideoFile = async (filePath: string) => {
    const metadata = await window.electron.getVideoMetadata(filePath);
    console.log('Video metadata:', metadata);

    return {
      path: filePath,
      metadata: metadata
    };
  };

  const handleRecordingComplete = async (filePath: string) => {
    console.log('Recording completed:', filePath);
    try {
      const videoData = await loadVideoFile(filePath);
      handleFileSelected(videoData);
    } catch (error) {
      console.error('Error loading recorded video:', error);
      setError('Failed to load recorded video');
    }
  };

  const handleLoadRecentFile = async (filePath: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const videoData = await loadVideoFile(filePath);
      handleFileSelected(videoData);
    } catch (error) {
      console.error('Error loading recent file:', error);
      setError(`Failed to load "${filePath.split('/').pop()}". The file may have been moved or deleted.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === 'i' || e.key === 'I') && videoPath && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (currentTime < endTime) {
          setStartTime(currentTime);
        }
      }

      if ((e.key === 'o' || e.key === 'O') && videoPath && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (currentTime > startTime) {
          setEndTime(currentTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [videoPath, currentTime, startTime, endTime]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];

    try {
      const filePath = window.electron.getPathForFile(file);

      if (!filePath) {
        console.error('File path not available:', file);
        setError('Could not access file path. Please use the Import button instead.');
        return;
      }

      const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
      const fileExtension = filePath.toLowerCase();
      const isValidVideo = validExtensions.some(ext => fileExtension.endsWith(ext));

      if (!isValidVideo) {
        setError('Please drop a valid video file (MP4, MOV, WebM, AVI, MKV)');
        return;
      }

      setIsLoading(true);
      setError(null);

      const videoData = await loadVideoFile(filePath);
      handleFileSelected(videoData);
    } catch (error: any) {
      console.error('Error processing dropped file:', error);
      setError(error.message || 'Failed to load video file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`h-screen flex flex-col bg-background ${isDragging ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg p-8 shadow-2xl border-2 border-blue-500 border-dashed">
            <div className="text-6xl mb-4 text-center">📹</div>
            <h2 className="text-2xl font-semibold mb-2 text-center">Drop video here</h2>
            <p className="text-black/60 dark:text-white/60 text-center">MP4, MOV, WebM, AVI, or MKV</p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-8 shadow-xl backdrop-blur-sm pointer-events-auto">
            <span className="text-4xl block mb-4 text-center">⚠️</span>
            <p className="text-red-900 dark:text-red-100 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <Toolbar
        videoPath={videoPath}
        startTime={startTime}
        endTime={endTime}
        duration={duration}
        clips={clips}
        disabled={!videoPath}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar - Media Library */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <MediaLibrary
              onFileSelected={handleFileSelected}
              onRecordingComplete={handleRecordingComplete}
              recentFiles={recentFiles}
              onSelectFile={handleLoadRecentFile}
              currentVideoPath={videoPath}
            />
          </ResizablePanel>

          {/* Center Content */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <ResizablePanelGroup direction="vertical">
              {/* Video Preview */}
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full p-6 bg-[#e5e5e7] dark:bg-[#000000]">
                  <VideoPreview
                    videoPath={videoPath}
                    onTimeUpdate={handleTimeUpdate}
                    onSeekReady={handleSeekReady}
                  />
                </div>
              </ResizablePanel>

              {/* Timeline */}
              <ResizablePanel defaultSize={30} minSize={25}>
                <Timeline
                  currentTime={currentTime}
                  duration={duration}
                  startTime={startTime}
                  endTime={endTime}
                  clips={clips}
                  selectedClipId={selectedClipId}
                  onSeek={handleSeek}
                  onSetStart={handleSetStart}
                  onSetEnd={handleSetEnd}
                  onSelectClip={handleSelectClip}
                  onReorderClips={handleReorderClips}
                  onDeleteClip={handleDeleteClip}
                  onUpdateClip={handleUpdateClip}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Right Sidebar - Inspector */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <InspectorPanel
              videoMetadata={videoMetadata}
              videoPath={videoPath}
              currentTime={currentTime}
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              onSetStart={handleSetStart}
              onSetEnd={handleSetEnd}
              onReset={handleResetTrim}
              onSplit={handleSplitClip}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
