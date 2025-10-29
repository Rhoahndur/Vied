import React, { useState, useRef, useEffect } from 'react';
import './styles/app.css';
import ImportButton from './components/ImportButton';
import VideoPreview from './components/VideoPreview';
import Timeline from './components/Timeline';
import TrimControls from './components/TrimControls';
import ExportButton from './components/ExportButton';
import ScreenRecorder from './components/ScreenRecorder';
import RecentsPanel from './components/RecentsPanel';

function App() {
  const [videoPath, setVideoPath] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const seekFunctionRef = useRef(null);

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
  const addToRecentFiles = (filePath, metadata) => {
    const newRecent = {
      path: filePath,
      name: filePath.split('/').pop(),
      timestamp: Date.now(),
      duration: metadata.duration,
      size: metadata.size
    };

    // Remove duplicates and add to front, keep last 10
    const filtered = recentFiles.filter(f => f.path !== filePath);
    const updated = [newRecent, ...filtered].slice(0, 10);

    setRecentFiles(updated);
    localStorage.setItem('vied-recent-files', JSON.stringify(updated));
  };

  const handleFileSelected = (data) => {
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

      // Add to recent files
      addToRecentFiles(data.path, data.metadata);
    } else {
      setError('Failed to load video metadata. Please try a different file.');
    }
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleSeekReady = (seekFunction) => {
    seekFunctionRef.current = seekFunction;
  };

  const handleSeek = (time) => {
    if (seekFunctionRef.current) {
      seekFunctionRef.current(time);
    }
  };

  const handleSetStart = (time) => {
    setStartTime(time);
  };

  const handleSetEnd = (time) => {
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

    // Create two new clips from the current one
    const newClips = [
      {
        id: Date.now(),
        startTime: startTime,
        endTime: currentTime,
        videoPath: videoPath
      },
      {
        id: Date.now() + 1,
        startTime: currentTime,
        endTime: endTime,
        videoPath: videoPath
      }
    ];

    setClips(prevClips => {
      if (prevClips.length === 0) {
        // First split - create two clips from the main video
        return newClips;
      } else {
        // Find and replace the selected clip with two new clips
        const clipIndex = prevClips.findIndex(c => c.id === selectedClipId);
        if (clipIndex === -1) return prevClips;

        const newClipsList = [...prevClips];
        newClipsList.splice(clipIndex, 1, ...newClips);
        return newClipsList;
      }
    });

    // Select the first of the two new clips
    setSelectedClipId(newClips[0].id);

    // Update trim points to match the new clip
    setStartTime(newClips[0].startTime);
    setEndTime(newClips[0].endTime);
  };

  const handleSelectClip = (clipId) => {
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      setSelectedClipId(clipId);
      setStartTime(clip.startTime);
      setEndTime(clip.endTime);
    }
  };

  const handleReorderClips = (draggedClipId, targetClipId) => {
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

  // Centralized video loading function that handles .mov conversion
  const loadVideoFile = async (filePath) => {
    let processedPath = filePath;

    // Check if it's a .mov file and convert it to .mp4 for better browser compatibility
    if (filePath.toLowerCase().endsWith('.mov')) {
      console.log('Converting .mov file to .mp4 for better compatibility...');
      try {
        processedPath = await window.electron.convertMovToMp4(filePath);
        console.log('Conversion complete:', processedPath);
      } catch (conversionError) {
        console.error('Conversion failed, trying to use original file:', conversionError);
        // If conversion fails, try to use the original file
      }
    }

    // Get video metadata
    const metadata = await window.electron.getVideoMetadata(processedPath);
    console.log('Video metadata:', metadata);

    return {
      path: processedPath,
      metadata: metadata
    };
  };

  const handleRecordingComplete = async (filePath) => {
    console.log('Recording completed:', filePath);
    // Load the recorded video like we do with imported files
    try {
      const videoData = await loadVideoFile(filePath);
      handleFileSelected(videoData);
    } catch (error) {
      console.error('Error loading recorded video:', error);
      setError('Failed to load recorded video');
    }
  };

  const handleLoadRecentFile = async (filePath) => {
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
    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // I key = set IN point
      if ((e.key === 'i' || e.key === 'I') && videoPath && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (currentTime < endTime) {
          setStartTime(currentTime);
        }
      }

      // O key = set OUT point
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
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];

    try {
      // Use Electron's webUtils to get the file path securely
      const filePath = window.electron.getPathForFile(file);

      if (!filePath) {
        console.error('File path not available:', file);
        setError('Could not access file path. Please use the Import button instead.');
        return;
      }

      // Check if it's a video file
      const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
      const fileExtension = filePath.toLowerCase();
      const isValidVideo = validExtensions.some(ext =>
        fileExtension.endsWith(ext)
      );

      if (!isValidVideo) {
        setError('Please drop a valid video file (MP4, MOV, WebM, AVI, MKV)');
        return;
      }

      // Process the file using centralized loading (handles .mov conversion)
      setIsLoading(true);
      setError(null);

      const videoData = await loadVideoFile(filePath);
      handleFileSelected(videoData);
    } catch (error) {
      console.error('Error processing dropped file:', error);
      setError(error.message || 'Failed to load video file');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  return (
    <div
      className={`app-container ${isDragging ? 'dragging-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="app-header">
        <h1>Vied</h1>
        <span style={{ fontSize: '11px', color: '#666', marginLeft: '10px' }}>
          v1.0.0
        </span>
      </header>

      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-message">
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📹</div>
            <h2>Drop video here</h2>
            <p>MP4, MOV, WebM, AVI, or MKV</p>
          </div>
        </div>
      )}

      <main className="app-main">
        {!videoPath && !error && (
          <div className="welcome-message">
            <h2 style={{ marginBottom: '15px', fontWeight: '500' }}>👋 Welcome to Vied</h2>
            <p style={{ marginBottom: '10px', color: '#999' }}>
              Record your screen, import a video, or drag & drop a file to get started
            </p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
              <strong>Keyboard shortcuts:</strong> <kbd>I</kbd> = Set IN • <kbd>O</kbd> = Set OUT
            </p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</span>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              style={{
                marginTop: '15px',
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="control-panel">
          <div style={{ marginBottom: '20px' }}>
            <ScreenRecorder onRecordingComplete={handleRecordingComplete} />

            <div style={{
              margin: '20px 0',
              borderBottom: '1px solid #3a3a3a',
              textAlign: 'center',
              position: 'relative',
              height: '1px'
            }}>
              <span style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#252525',
                padding: '0 10px',
                color: '#666',
                fontSize: '12px',
                fontWeight: '600'
              }}>OR</span>
            </div>

            <ImportButton onFileSelected={handleFileSelected} />

            {videoMetadata && (
              <div style={{ marginTop: '15px', fontSize: '14px' }}>
                <div style={{ marginBottom: '5px' }}>
                  <strong>File:</strong> {videoPath?.split('/').pop()}
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Duration:</strong> {formatDuration(videoMetadata.duration)}
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>FPS:</strong> {videoMetadata.fps.toFixed(2)}
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Codec:</strong> {videoMetadata.codec}
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Size:</strong> {formatFileSize(videoMetadata.size)}
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Audio:</strong> {videoMetadata.hasAudio ? 'Yes' : 'No'}
                </div>
              </div>
            )}
          </div>

          <RecentsPanel
            recentFiles={recentFiles}
            onSelectFile={handleLoadRecentFile}
            currentVideoPath={videoPath}
          />
        </div>

        <div className="preview-timeline-container">
          <div className="preview-section">
            <VideoPreview
              videoPath={videoPath}
              onTimeUpdate={handleTimeUpdate}
              onSeekReady={handleSeekReady}
            />
          </div>

          <div className="timeline-section">
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
            />

            <TrimControls
              currentTime={currentTime}
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              onSetStart={handleSetStart}
              onSetEnd={handleSetEnd}
              onReset={handleResetTrim}
              onSplit={handleSplitClip}
            />

            {videoPath && (
              <ExportButton
                videoPath={videoPath}
                startTime={startTime}
                endTime={endTime}
                duration={duration}
                clips={clips}
                disabled={!videoPath}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
