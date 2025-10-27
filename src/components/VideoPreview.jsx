import React, { useRef, useEffect, useState } from 'react';

function VideoPreview({ videoPath, onTimeUpdate, onSeekReady }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
      videoRef.current.src = `file://${videoPath}`;
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
      />

      <div className="video-controls">
        <button
          className="play-pause-button"
          onClick={handlePlayPause}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}

export default VideoPreview;
