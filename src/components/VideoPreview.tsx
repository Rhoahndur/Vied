import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { useRef, useEffect, useState } from "react";

interface VideoPreviewProps {
  videoPath: string | null;
  onTimeUpdate?: (time: number) => void;
  onSeekReady?: (seekFunction: (time: number) => void) => void;
}

export function VideoPreview({ videoPath, onTimeUpdate, onSeekReady }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);

  // Expose seek function to parent via callback
  useEffect(() => {
    if (onSeekReady && videoRef.current) {
      onSeekReady((time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      });
    }
  }, [onSeekReady]);

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

  if (!videoPath) {
    return (
      <div className="flex items-center justify-center h-full bg-black rounded-lg">
        <p className="text-white/60">No video loaded. Click "Import Video" to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black rounded-lg overflow-hidden">
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
        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-white/10">
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
              className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                if (videoRef.current && duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = clickX / rect.width;
                  const seekTime = percentage * duration;
                  videoRef.current.currentTime = Math.max(0, Math.min(duration, seekTime));
                }
              }}
            >
              <div
                className="h-full bg-blue-500 pointer-events-none"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
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
          </div>
        </div>
      </div>
    </div>
  );
}
