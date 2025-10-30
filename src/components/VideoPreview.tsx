import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { useRef, useEffect, useState } from "react";

interface Clip {
  id: number;
  startTime: number;
  endTime: number;
  videoPath: string;
  track: 'main' | 'overlay';
}

interface VideoPreviewProps {
  videoPath: string | null;
  onTimeUpdate?: (time: number) => void;
  onSeekReady?: (seekFunction: (time: number) => void) => void;
  clipCount?: number;
  clips?: Clip[];
}

export function VideoPreview({ videoPath, onTimeUpdate, onSeekReady, clipCount = 1, clips = [] }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [loadedVideoPath, setLoadedVideoPath] = useState<string | null>(null);
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose seek function to parent via callback
  useEffect(() => {
    if (onSeekReady && videoRef.current) {
      onSeekReady((timelineTime: number) => {
        if (!videoRef.current) return;

        // If we have clips, find which clip this time falls in
        if (clips.length > 0) {
          const clipIndex = clips.findIndex(
            clip => timelineTime >= clip.startTime && timelineTime < clip.endTime
          );

          if (clipIndex !== -1) {
            const clip = clips[clipIndex];
            const videoSeekTime = timelineTime - clip.startTime;

            // If we need to switch clips, load the new video
            if (clip.videoPath !== loadedVideoPath) {
              const normalizedPath = clip.videoPath.replace(/\\\\/g, '/');
              const mediaUrl = `vied-media://${normalizedPath}`;
              videoRef.current.src = mediaUrl;
              videoRef.current.load();
              setLoadedVideoPath(clip.videoPath);
              setCurrentClipIndex(clipIndex);

              // Seek after metadata loads
              videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                  videoRef.current.currentTime = videoSeekTime;
                }
              };
            } else {
              // Same clip, just seek
              videoRef.current.currentTime = videoSeekTime;
            }
          }
        } else {
          // No clips, use old behavior
          videoRef.current.currentTime = timelineTime;
        }
      });
    }
  }, [onSeekReady, clips, loadedVideoPath]);

  // Update video source when videoPath changes
  useEffect(() => {
    if (videoRef.current && videoPath) {
      const normalizedPath = videoPath.replace(/\\/g, '/');
      const mediaUrl = `vied-media://${normalizedPath}`;
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
      const videoTime = videoRef.current.currentTime;
      setCurrentTime(videoTime);

      // Convert video time to timeline time if we have clips
      if (clips.length > 0 && currentClipIndex < clips.length) {
        const currentClip = clips[currentClipIndex];
        const timelineTime = currentClip.startTime + videoTime;

        if (onTimeUpdate) {
          onTimeUpdate(timelineTime);
        }

        // Check if we've reached the end of the current clip
        if (isPlaying && videoTime >= (currentClip.endTime - currentClip.startTime)) {
          // Move to next clip if available
          if (currentClipIndex < clips.length - 1) {
            const nextClip = clips[currentClipIndex + 1];
            const normalizedPath = nextClip.videoPath.replace(/\\\\/g, '/');
            const mediaUrl = `vied-media://${normalizedPath}`;

            if (videoRef.current) {
              videoRef.current.src = mediaUrl;
              videoRef.current.load();
              setLoadedVideoPath(nextClip.videoPath);
              setCurrentClipIndex(currentClipIndex + 1);

              videoRef.current.onloadedmetadata = () => {
                if (videoRef.current && isPlaying) {
                  videoRef.current.play();
                }
              };
            }
          } else {
            // Last clip ended
            setIsPlaying(false);
          }
        }
      } else {
        // No clips, use old behavior
        if (onTimeUpdate) {
          onTimeUpdate(videoTime);
        }
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

  const handleError = (e: any) => {
    console.error('Video error:', e);
    if (videoRef.current && videoRef.current.error) {
      console.error('Video error code:', videoRef.current.error.code);
      console.error('Video error message:', videoRef.current.error.message);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume([newVolume]);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
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

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle timeline dragging
  useEffect(() => {
    if (!isDraggingTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      const timelineEl = document.getElementById('video-timeline');
      if (timelineEl && videoRef.current && duration > 0) {
        const rect = timelineEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
        const seekTime = percentage * duration;
        videoRef.current.currentTime = seekTime;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTimeline(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTimeline, duration]);

  // Auto-hide controls after inactivity (QuickTime style)
  const resetHideControlsTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000); // Hide after 3 seconds of inactivity
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  // Show controls when video is paused
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    } else {
      resetHideControlsTimer();
    }
  }, [isPlaying]);

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!videoPath) {
    return (
      <div className="flex items-center justify-center h-full bg-black rounded-lg">
        <p className="text-white/60">No video loaded. Click "Import Video" to get started.</p>
      </div>
    );
  }

  // Show "Untitled" when multiple clips exist, otherwise show filename
  const videoFileName = clipCount > 1 ? 'Untitled' : (videoPath ? videoPath.split('/').pop() || 'Unknown' : '');

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-black rounded-lg overflow-hidden"
      onMouseMove={resetHideControlsTimer}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video Name Header */}
      <div
        className={`bg-black/80 backdrop-blur-md px-4 py-2 border-b border-white/10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="text-white text-sm font-medium truncate">{videoFileName}</p>
      </div>

      {/* Video Display Area */}
      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="max-w-full max-h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
        />

        {/* Overlay Controls */}
        <div className={`absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-white/10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div
              id="video-timeline"
              className="flex-1 h-3 bg-white/30 rounded-full cursor-pointer relative transition-all hover:h-4 hover:bg-white/40"
              onClick={(e) => {
                if (videoRef.current && duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = clickX / rect.width;
                  const seekTime = percentage * duration;
                  videoRef.current.currentTime = Math.max(0, Math.min(duration, seekTime));
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingTimeline(true);
              }}
              onMouseMove={(e) => {
                if (duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
                  const time = percentage * duration;
                  setHoverTime(time);
                }
              }}
              onMouseLeave={() => {
                setHoverTime(null);
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full pointer-events-none transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              {/* Playhead indicator - rounded triangle pointing down */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all hover:scale-110"
                style={{
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  transform: 'translateX(-50%) translateY(-50%)',
                  cursor: isDraggingTimeline ? 'grabbing' : 'grab'
                }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '12px solid #3b82f6',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    borderRadius: '2px'
                  }}
                />
              </div>
              {/* Hover time tooltip - aligned with playhead height */}
              {hoverTime !== null && !isDraggingTimeline && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap"
                  style={{ left: `${(hoverTime / duration) * 100}%`, transform: 'translateX(-50%) translateY(-50%)', marginLeft: '20px' }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            <span className="text-white text-sm tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted || volume[0] === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
              />
            </div>

            {/* Fullscreen button */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
