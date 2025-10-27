import React, { useState, useRef, useEffect } from 'react';
import './styles/app.css';
import ImportButton from './components/ImportButton';
import VideoPreview from './components/VideoPreview';
import Timeline from './components/Timeline';
import TrimControls from './components/TrimControls';
import ExportButton from './components/ExportButton';

function App() {
  const [videoPath, setVideoPath] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const seekFunctionRef = useRef(null);

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
    <div className="app-container">
      <header className="app-header">
        <h1>Vied</h1>
        <span style={{ fontSize: '11px', color: '#666', marginLeft: '10px' }}>
          v1.0.0
        </span>
      </header>

      <main className="app-main">
        {!videoPath && !error && (
          <div className="welcome-message">
            <h2 style={{ marginBottom: '15px', fontWeight: '500' }}>👋 Welcome to Vied</h2>
            <p style={{ marginBottom: '10px', color: '#999' }}>
              Click "Import Video" to get started
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

          <TrimControls
            currentTime={currentTime}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            onSetStart={handleSetStart}
            onSetEnd={handleSetEnd}
            onReset={handleResetTrim}
          />

          {videoPath && (
            <ExportButton
              videoPath={videoPath}
              startTime={startTime}
              endTime={endTime}
              duration={duration}
              disabled={!videoPath}
            />
          )}
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
              onSeek={handleSeek}
              onSetStart={handleSetStart}
              onSetEnd={handleSetEnd}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
