import React, { useRef, useEffect, useState } from 'react';

function VideoPreview({ videoPath, onTimeUpdate, onSeekReady }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Expose seek function to parent via callback
  useEffect(() => {
    if (onSeekReady && videoRef.current) {
      onSeekReady((time) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      });
    }
  }, [onSeekReady]);

  // Update video source when videoPath changes
  useEffect(() => {
    if (videoRef.current && videoPath) {
      // Use file:// protocol for loading local files
      // Normalize the path for cross-platform compatibility
      const normalizedPath = videoPath.replace(/\\/g, '/');
      const mediaUrl = `file://${normalizedPath}`;
      console.log('Loading video from:', mediaUrl);
      videoRef.current.src = mediaUrl;
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [videoPath]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
      setDuration(videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleError = (e) => {
    console.error('Video error:', e);
    if (videoRef.current && videoRef.current.error) {
      console.error('Video error code:', videoRef.current.error.code);
      console.error('Video error message:', videoRef.current.error.message);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      videoRef.current.muted = newMutedState;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoPath) {
    return (
      <div className="video-preview-placeholder">
        <p>No video loaded. Click "Import Video" to get started.</p>
      </div>
    );
  }

  return (
    <div className="video-preview">
      <video
        ref={videoRef}
        className="video-element"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />

      <div className="video-controls">
        <button
          className="control-button play-pause-button"
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="5" y="3" width="3" height="14" rx="1"/>
              <rect x="12" y="3" width="3" height="14" rx="1"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 3l12 7-12 7z"/>
            </svg>
          )}
        </button>

        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div className="volume-controls">
          <button
            className="control-button mute-button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 4L6 8H3v4h3l4 4V4z"/>
                <line x1="14" y1="8" x2="18" y2="12" stroke="currentColor" strokeWidth="2"/>
                <line x1="18" y1="8" x2="14" y2="12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 4L6 8H3v4h3l4 4V4z"/>
                <path d="M14 7c1 1 1.5 2 1.5 3s-0.5 2-1.5 3"/>
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
}

export default VideoPreview;
