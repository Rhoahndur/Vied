import { Film, ZoomIn, ZoomOut, X } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";

interface Clip {
  id: number;
  startTime: number;
  endTime: number;
  videoPath: string;
  track: 'main' | 'overlay';
}

interface TimelineProps {
  currentTime: number;
  duration: number;
  startTime: number;
  endTime: number;
  clips: Clip[];
  selectedClipId: number | null;
  editorMode: boolean;
  onSeek?: (time: number) => void;
  onSetStart?: (time: number) => void;
  onSetEnd?: (time: number) => void;
  onSelectClip?: (clipId: number) => void;
  onReorderClips?: (draggedClipId: number, targetClipId: number) => void;
  onDeleteClip?: (clipId: number) => void;
  onUpdateClip?: (clipId: number, updates: { startTime?: number; endTime?: number }) => void;
  onDropVideoFile?: (filePath: string, insertIndex: number) => void;
}

export function Timeline({
  currentTime,
  duration,
  startTime,
  endTime,
  clips,
  selectedClipId,
  editorMode,
  onSeek,
  onSetStart,
  onSetEnd,
  onSelectClip,
  onReorderClips,
  onDeleteClip,
  onUpdateClip,
  onDropVideoFile
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const trackScrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [draggedClipId, setDraggedClipId] = useState<number | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<number | null>(null);
  const [resizingClip, setResizingClip] = useState<{ clipId: number; edge: 'left' | 'right' } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 2 = 200%, etc.
  const [externalFileDropIndex, setExternalFileDropIndex] = useState<number | null>(null);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('.trim-marker')) return;

    const clickedClip = e.target instanceof Element && e.target.closest('.timeline-clip');
    if (clickedClip && clips && clips.length > 0) {
      return;
    }

    if (!duration || !onSeek) return;

    // Get the bounds of the clicked element (could be ruler or track)
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;

    const boundedSeekTime = Math.max(0, Math.min(duration, seekTime));
    onSeek(boundedSeekTime);
  };

  const handleMarkerMouseDown = (markerType: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(markerType);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !duration) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      let time = percentage * duration;

      // Snap to 0.1 second increments for smoother control
      time = Math.round(time * 10) / 10;

      if (dragging === 'start') {
        // Minimum clip duration: 1 second (prevents accidental collapse)
        const minDuration = 1.0;
        const newStartTime = Math.min(time, endTime - minDuration);
        onSetStart?.(Math.max(0, newStartTime));
      } else if (dragging === 'end') {
        // Minimum clip duration: 1 second
        const minDuration = 1.0;
        const newEndTime = Math.max(time, startTime + minDuration);
        onSetEnd?.(Math.min(duration, newEndTime));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, duration, startTime, endTime, onSetStart, onSetEnd]);

  // Handle Delete/Backspace keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId !== null && onDeleteClip) {
        e.preventDefault();
        onDeleteClip(selectedClipId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onDeleteClip]);

  // Handle clip resizing
  useEffect(() => {
    if (!resizingClip || !onUpdateClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const clip = clips.find(c => c.id === resizingClip.clipId);
      if (!clip) return;

      // Calculate total clips duration
      const totalClipsDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));

      // Convert percentage to actual video time based on clip position
      const clipDuration = clip.endTime - clip.startTime;
      const clipIndex = clips.findIndex(c => c.id === clip.id);
      const previousClipsDuration = clips.slice(0, clipIndex).reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

      // Calculate time offset relative to the video
      const timeInClipSpace = (percentage * totalClipsDuration) - previousClipsDuration;
      const newTime = clip.startTime + timeInClipSpace;

      if (resizingClip.edge === 'left') {
        // Dragging left edge - update startTime with snap-to-grid
        const rawStartTime = Math.max(0, Math.min(newTime, clip.endTime - 0.5));
        const snappedStartTime = snapToNearestMarker(rawStartTime);
        onUpdateClip(clip.id, { startTime: snappedStartTime });
      } else {
        // Dragging right edge - update endTime with snap-to-grid
        const rawEndTime = Math.max(clip.startTime + 0.5, newTime);
        const snappedEndTime = snapToNearestMarker(rawEndTime);
        onUpdateClip(clip.id, { endTime: snappedEndTime });
      }
    };

    const handleMouseUp = () => {
      setResizingClip(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingClip, clips, onUpdateClip]);

  // Handle mousewheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if mouse is over the timeline
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const isOverTimeline = e.clientX >= rect.left && e.clientX <= rect.right &&
                            e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (!isOverTimeline) return;

      // Prevent page scroll
      e.preventDefault();

      // Zoom in/out with Ctrl/Cmd + wheel or just wheel
      const delta = e.deltaY;
      const zoomSpeed = 0.001;
      const newZoom = Math.max(0.5, Math.min(5, zoomLevel - delta * zoomSpeed));

      setZoomLevel(newZoom);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoomLevel]);

  // Synchronize scroll between ruler and track
  useEffect(() => {
    const rulerEl = rulerScrollRef.current;
    const trackEl = trackScrollRef.current;

    if (!rulerEl || !trackEl) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => (e: Event) => {
      target.scrollLeft = source.scrollLeft;
    };

    const rulerHandler = syncScroll(rulerEl, trackEl);
    const trackHandler = syncScroll(trackEl, rulerEl);

    rulerEl.addEventListener('scroll', rulerHandler);
    trackEl.addEventListener('scroll', trackHandler);

    return () => {
      rulerEl.removeEventListener('scroll', rulerHandler);
      trackEl.removeEventListener('scroll', trackHandler);
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;
  const startPosition = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPosition = duration > 0 ? (endTime / duration) * 100 : 100;
  const trimWidth = endPosition - startPosition;

  const generateTimeMarkers = () => {
    if (!duration) return [];

    const markerCount = 11;
    const markers = [];

    for (let i = 0; i < markerCount; i++) {
      const percentage = (i / (markerCount - 1)) * 100;
      const time = (duration * percentage) / 100;
      markers.push({ percentage, time });
    }

    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  // Always show timeline, even without video
  const hasVideo = duration > 0;

  // Snap-to-grid helper function
  const snapToNearestMarker = (time: number): number => {
    if (!duration || timeMarkers.length === 0) return time;

    const snapThreshold = duration * 0.02; // 2% of duration as snap threshold

    // Find the nearest time marker
    let nearestMarker = timeMarkers[0].time;
    let minDistance = Math.abs(time - nearestMarker);

    for (const marker of timeMarkers) {
      const distance = Math.abs(time - marker.time);
      if (distance < minDistance) {
        minDistance = distance;
        nearestMarker = marker.time;
      }
    }

    // Snap if within threshold, otherwise return original time
    return minDistance <= snapThreshold ? nearestMarker : time;
  };

  // Hide timeline completely when no video is loaded
  if (!duration || duration === 0) {
    return null;
  }

  // QuickTime-style: Hide timeline in viewer mode, only show in editor mode
  if (!editorMode) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-[#1c1c1e] border-t border-white/10 min-h-[400px]">
      {/* Timeline Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#2c2c2e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Film className="h-3.5 w-3.5 text-white/60" />
          <span className="text-xs text-white/60">Timeline</span>
        </div>
        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Slider
            value={[zoomLevel]}
            onValueChange={(value) => setZoomLevel(value[0])}
            min={0.5}
            max={5}
            step={0.1}
            className="w-20"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.25))}
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-white/40 tabular-nums w-8">{Math.round(zoomLevel * 100)}%</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-white/40 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <div className="w-px h-3 bg-white/20 mx-1.5" />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Timeline Ruler - Scrollable */}
      <div
        ref={rulerScrollRef}
        className="relative border-b-2 border-white/20 bg-[#2c2c2e] overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex">
          {/* Ruler label spacer */}
          <div className="w-12 flex-shrink-0" />
          {/* Ruler content */}
          <div
            className="cursor-pointer h-8"
            style={{ width: `calc((100% - 3rem) * ${zoomLevel})` }}
            onClick={handleTimelineClick}
          >
          <div className="flex h-full">
            {timeMarkers.map((marker, index) => (
              <div
                key={index}
                className="flex-1 border-l-2 border-white/20 relative first:border-l-0"
              >
                <span className="absolute top-1 left-1 text-xs text-white/60 tabular-nums pointer-events-none font-medium">
                  {formatTime(marker.time)}
                </span>
              </div>
            ))}
          </div>
          {/* Playhead on ruler */}
          <div className="absolute top-0 w-1 h-full bg-red-500 z-10 pointer-events-none" style={{ left: `${playheadPosition}%` }}>
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
          </div>
          </div>
        </div>
      </div>

      {/* Tracks Container */}
      <div ref={trackScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden" style={{ height: '200px' }}>
        <div className="relative w-full" style={{ height: '200px' }}>
          {/* Main Track Label */}
          <div className="absolute left-0 top-0 w-12 flex items-center justify-center bg-[#2c2c2e] border-r-2 border-b-2 border-white/20 z-10" style={{ height: '100px' }}>
            <div className="flex flex-col items-center gap-1">
              <Film className="h-5 w-5 text-white/80" />
              <span className="text-sm text-white/60 font-medium">Main</span>
            </div>
          </div>

          {/* Main Track Lane */}
          <div
            className="absolute top-0 left-12 relative border-b-4"
            style={{
              height: '100px',
              width: `calc((100% - 3rem) * ${zoomLevel})`,
              backgroundColor: duration > 0 ? '#1a472a' : '#2c2c2e',
              borderColor: duration > 0 ? '#facc15' : '#ffffff33'
            }}
            onDragOver={(e) => {
              // Check if dragging external file (not an existing clip)
              const types = e.dataTransfer.types;
              if (types.includes('Files') && !draggedClipId) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';

                // Calculate which clip index to insert at based on cursor position
                if (!clips || clips.length === 0) {
                  setExternalFileDropIndex(0);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const percentage = mouseX / rect.width;

                  // Find the insertion point based on accumulated clip widths
                  const mainClips = clips.filter(c => c.track === 'main');
                  const totalClipsDuration = mainClips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
                  let accumulatedPercentage = 0;
                  let insertIndex = mainClips.length;

                  for (let i = 0; i < mainClips.length; i++) {
                    const clipDuration = mainClips[i].endTime - mainClips[i].startTime;
                    const clipPercentage = (clipDuration / totalClipsDuration);
                    accumulatedPercentage += clipPercentage;

                    if (percentage < accumulatedPercentage) {
                      // Insert before this clip
                      insertIndex = i;
                      break;
                    }
                  }

                  setExternalFileDropIndex(insertIndex);
                }
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExternalFileDropIndex(null);
            }}
            onDrop={async (e) => {
              const types = e.dataTransfer.types;
              if (types.includes('Files') && !draggedClipId && onDropVideoFile) {
                e.preventDefault();
                e.stopPropagation();

                const files = Array.from(e.dataTransfer.files);
                const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];

                // Filter for video files only
                const videoFiles = files.filter(file => {
                  const fileName = file.name.toLowerCase();
                  return validExtensions.some(ext => fileName.endsWith(ext));
                });

                if (videoFiles.length > 0 && externalFileDropIndex !== null) {
                  // Process each video file sequentially
                  for (let i = 0; i < videoFiles.length; i++) {
                    const file = videoFiles[i];
                    const filePath = (window as any).electron?.getPathForFile(file);

                    if (filePath) {
                      // Insert each file at the appropriate index
                      // Each subsequent file goes after the previous one
                      await onDropVideoFile(filePath, externalFileDropIndex + i);
                    }
                  }
                }

                setExternalFileDropIndex(null);
              }
            }}
          >
            {/* Track label - only show when video is loaded */}
            {duration > 0 && (
              <div className="absolute top-2 left-4 text-white text-xl font-black z-50 bg-black/50 px-3 py-1 rounded">
                MAIN TRACK (drag clips here)
              </div>
            )}

            {/* Empty state message */}
            {!hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold z-40">
                Load a video to begin editing
              </div>
            )}

            {/* Background ruler marks */}
            <div className="absolute inset-0 flex z-0">
              {timeMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="flex-1 border-l-2 border-white/40 first:border-l-0"
                />
              ))}
            </div>

            {/* Main track - clickable area */}
            <div
              ref={timelineRef}
              className="absolute inset-0 cursor-pointer"
              onClick={handleTimelineClick}
            >
              {/* Main Track Clips - show only clips with track === 'main' */}
              {clips && clips.length > 0 && (() => {
                const mainClips = clips.filter(c => c.track === 'main');
                if (mainClips.length === 0) return null;

                const totalClipsDuration = mainClips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
                let accumulatedDuration = 0;

                return mainClips.map((clip, index) => {
                  const clipDuration = clip.endTime - clip.startTime;
                  const gapWidth = 0.5;
                  const clipStartPos = (accumulatedDuration / totalClipsDuration) * 100 + (index * gapWidth);
                  const clipWidth = (clipDuration / totalClipsDuration) * 100 - gapWidth;

                  const isSelected = clip.id === selectedClipId;
                  const isDraggedOver = clip.id === dragOverClipId;
                  const isBeingDragged = clip.id === draggedClipId;

                  // Determine if dragging from left to right or right to left
                  const draggedIndex = mainClips.findIndex(c => c.id === draggedClipId);
                  const targetIndex = index;
                  const isDraggingLeftToRight = draggedIndex !== -1 && draggedIndex < targetIndex;

                  accumulatedDuration += clipDuration;

                  return (
                    <React.Fragment key={clip.id}>
                      {/* Insertion indicator for external file drops */}
                      {externalFileDropIndex === index && (
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none z-80"
                          style={{
                            left: `${clipStartPos}%`,
                            width: '4px',
                            backgroundColor: '#22c55e',
                            boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.5)',
                          }}
                        >
                          {/* Green triangle indicator at top */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '8px solid transparent',
                              borderRight: '8px solid transparent',
                              borderTop: '12px solid #22c55e',
                              filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.8))'
                            }}
                          />
                          {/* "Insert Here" label */}
                          <div
                            className="absolute bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-bold"
                            style={{
                              top: '50%',
                              left: '8px',
                              transform: 'translateY(-50%)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          >
                            Insert Here
                          </div>
                        </div>
                      )}

                      <div
                        draggable={true}
                        className={`timeline-clip absolute rounded-lg cursor-move transition-all ${
                        isSelected ? 'scale-105' : 'hover:scale-102'
                      } ${isDraggedOver ? 'scale-105' : ''} ${isBeingDragged ? 'opacity-40' : ''}`}
                      style={{
                        left: `${clipStartPos}%`,
                        width: `${clipWidth}%`,
                        top: '20px',
                        bottom: '20px',
                        backgroundColor: isSelected ? '#60a5fa' : '#3b82f6',
                        border: isSelected ? '8px solid #fbbf24' : '6px solid #60a5fa',
                        boxShadow: isSelected
                          ? '0 0 40px rgba(251, 191, 36, 1), 0 0 60px rgba(251, 191, 36, 0.6), inset 0 0 20px rgba(255,255,255,0.3)'
                          : '0 0 30px rgba(59, 130, 246, 0.8), inset 0 0 15px rgba(255,255,255,0.2)',
                        zIndex: isSelected ? 70 : 60,
                        outline: isSelected ? '4px solid #fbbf24' : 'none',
                        outlineOffset: isSelected ? '4px' : '0'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectClip) {
                          onSelectClip(clip.id);
                        }
                      }}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedClipId(clip.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        if (draggedClipId && draggedClipId !== clip.id) {
                          // Only show drop indicator if same track
                          const draggedClip = clips.find(c => c.id === draggedClipId);
                          const targetClip = clips.find(c => c.id === clip.id);
                          if (draggedClip && targetClip && draggedClip.track === targetClip.track) {
                            setDragOverClipId(clip.id);
                          }
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragOverClipId === clip.id) {
                          setDragOverClipId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedClipId && draggedClipId !== clip.id && onReorderClips) {
                          // Only allow reordering within the same track
                          const draggedClip = clips.find(c => c.id === draggedClipId);
                          const targetClip = clips.find(c => c.id === clip.id);
                          if (draggedClip && targetClip && draggedClip.track === targetClip.track) {
                            onReorderClips(draggedClipId, clip.id);
                          }
                        }
                        setDraggedClipId(null);
                        setDragOverClipId(null);
                      }}
                      onDragEnd={(e) => {
                        e.preventDefault();
                        setDraggedClipId(null);
                        setDragOverClipId(null);
                      }}
                      title={`Clip: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
                    >
                      {/* Drop insertion indicator - large wedge pointing down */}
                      {isDraggedOver && (
                        <>
                          {/* Vertical insertion line */}
                          <div className={`absolute top-0 bottom-0 w-2 bg-gradient-to-r from-yellow-400 to-yellow-300 shadow-lg ${isDraggingLeftToRight ? '-right-3' : '-left-3'}`} style={{
                            boxShadow: '0 0 30px rgba(251, 191, 36, 1), -6px 0 30px rgba(251, 191, 36, 0.8)',
                            zIndex: 100
                          }} />
                          {/* Large wedge arrow pointing down */}
                          <div className={`absolute -top-8 -translate-x-1/2 ${isDraggingLeftToRight ? '-right-3' : '-left-3'}`}>
                            <div style={{
                              width: 0,
                              height: 0,
                              borderLeft: '20px solid transparent',
                              borderRight: '20px solid transparent',
                              borderTop: '24px solid #fbbf24',
                              filter: 'drop-shadow(0 4px 12px rgba(251, 191, 36, 0.9))'
                            }} />
                          </div>
                          {/* Label */}
                          <div className={`absolute -top-14 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full whitespace-nowrap ${isDraggingLeftToRight ? '-right-3' : '-left-3'}`} style={{
                            boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)'
                          }}>
                            DROP HERE
                          </div>
                        </>
                      )}

                      <div className="absolute inset-0 flex items-center justify-between px-2 gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="text-white/90 flex-shrink-0">
                            <Film className="h-3 w-3" />
                          </div>
                          <span className="text-xs text-white/90 truncate">
                            {formatTime(clip.endTime - clip.startTime)}
                          </span>
                        </div>
                        {/* Delete button */}
                        {isSelected && onDeleteClip && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClip(clip.id);
                            }}
                            className="p-0.5 bg-red-500 hover:bg-red-600 rounded-sm transition-colors flex-shrink-0"
                            title="Delete clip"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        )}
                      </div>

                      {/* Resize handles - QuickTime-style circular handles (SAME as unsplit video) */}
                      {isSelected && (
                        <>
                          {/* Left resize handle - IN point - QuickTime style */}
                          <div
                            className="absolute top-0 bottom-0 cursor-ew-resize"
                            style={{
                              left: '0px',
                              width: '6px',
                              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                              boxShadow: '0 0 15px rgba(251, 191, 36, 0.8), inset 0 0 8px rgba(255,255,255,0.4)',
                              borderRadius: '3px',
                              zIndex: 999
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'left' });
                            }}
                            title="◀ Drag to trim IN point"
                          >
                            {/* Circular handle - solid gray, stays within bounds */}
                            <div className="absolute -top-3 w-10 h-10 border-2 border-white rounded-full shadow-xl" style={{
                              left: '15px',
                              backgroundColor: '#9ca3af',
                              boxShadow: '0 0 20px rgba(156, 163, 175, 0.9)'
                            }} />
                            {/* Time label - only show when resizing this edge */}
                            {resizingClip?.clipId === clip.id && resizingClip?.edge === 'left' && (
                              <div className="absolute top-10 px-2 py-1 text-black text-xs font-bold rounded shadow-lg whitespace-nowrap" style={{
                                left: '15px',
                                backgroundColor: '#9ca3af'
                              }}>
                                {formatTime(clip.startTime)}
                              </div>
                            )}
                          </div>
                          {/* Right resize handle - OUT point - QuickTime style */}
                          <div
                            className="absolute top-0 bottom-0 cursor-ew-resize"
                            style={{
                              right: '0px',
                              width: '6px',
                              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                              boxShadow: '0 0 15px rgba(251, 191, 36, 0.8), inset 0 0 8px rgba(255,255,255,0.4)',
                              borderRadius: '3px',
                              zIndex: 999
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'right' });
                            }}
                            title="Drag to trim OUT point ▶"
                          >
                            {/* Circular handle - solid gray, stays within bounds */}
                            <div className="absolute -top-3 w-10 h-10 border-2 border-white rounded-full shadow-xl" style={{
                              right: '15px',
                              backgroundColor: '#9ca3af',
                              boxShadow: '0 0 20px rgba(156, 163, 175, 0.9)'
                            }} />
                            {/* Time label - only show when resizing this edge */}
                            {resizingClip?.clipId === clip.id && resizingClip?.edge === 'right' && (
                              <div className="absolute top-10 px-2 py-1 text-black text-xs font-bold rounded shadow-lg whitespace-nowrap" style={{
                                right: '15px',
                                backgroundColor: '#9ca3af'
                              }}>
                                {formatTime(clip.endTime)}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    </React.Fragment>
                  );
                });
              })()}

              {/* Insertion indicator at the end (for appending new clips) */}
              {externalFileDropIndex !== null && clips && clips.filter(c => c.track === 'main').length > 0 && externalFileDropIndex >= clips.filter(c => c.track === 'main').length && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-80"
                  style={{
                    right: '0%',
                    width: '4px',
                    backgroundColor: '#22c55e',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.5)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: '12px solid #22c55e',
                      filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.8))'
                    }}
                  />
                  <div
                    className="absolute bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-bold"
                    style={{
                      top: '50%',
                      left: '8px',
                      transform: 'translateY(-50%)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    Append Here
                  </div>
                </div>
              )}

              {/* Playhead */}
              <div
                className="absolute top-0 h-full pointer-events-none"
                style={{
                  left: `${playheadPosition}%`,
                  width: '4px',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.9)',
                  zIndex: 100
                }}
              >
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-xl" />
              </div>
            </div>
          </div>

          {/* Overlay Track Label */}
          <div className="absolute left-0 w-12 flex items-center justify-center bg-[#2c2c2e] border-r-2 border-b-2 border-white/20 z-10" style={{ top: '100px', height: '100px' }}>
            <div className="flex flex-col items-center gap-1">
              <Film className="h-5 w-5 text-white/80" />
              <span className="text-sm text-white/60 font-medium">PiP</span>
            </div>
          </div>

          {/* Overlay Track Lane */}
          <div className="absolute left-12 relative border-b-4" style={{
            top: '100px',
            height: '100px',
            width: `calc((100% - 3rem) * ${zoomLevel})`,
            backgroundColor: duration > 0 ? '#2d1b4e' : '#2c2c2e',
            borderColor: duration > 0 ? '#c084fc' : '#ffffff33'
          }}>
            {/* Track label - only show when video is loaded */}
            {duration > 0 && (
              <div className="absolute top-2 left-4 text-white text-xl font-black z-50 bg-black/50 px-3 py-1 rounded">
                PIP TRACK (overlay videos)
              </div>
            )}

            {/* Background ruler marks */}
            <div className="absolute inset-0 flex z-0">
              {timeMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="flex-1 border-l-2 border-white/40 first:border-l-0"
                />
              ))}
            </div>

            {/* Overlay track - clickable area */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={handleTimelineClick}
            >
              {/* Overlay Track Clips - show only clips with track === 'overlay' */}
              {clips && clips.length > 0 && (() => {
                const overlayClips = clips.filter(c => c.track === 'overlay');
                if (overlayClips.length === 0) return null;

                const totalClipsDuration = overlayClips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
                let accumulatedDuration = 0;

                return overlayClips.map((clip, index) => {
                  const clipDuration = clip.endTime - clip.startTime;
                  const gapWidth = 0.5;
                  const clipStartPos = (accumulatedDuration / totalClipsDuration) * 100 + (index * gapWidth);
                  const clipWidth = (clipDuration / totalClipsDuration) * 100 - gapWidth;

                  const isSelected = clip.id === selectedClipId;
                  const isDraggedOver = clip.id === dragOverClipId;
                  const isBeingDragged = clip.id === draggedClipId;

                  // Determine if dragging from left to right or right to left
                  const draggedIndex = overlayClips.findIndex(c => c.id === draggedClipId);
                  const targetIndex = index;
                  const isDraggingLeftToRight = draggedIndex !== -1 && draggedIndex < targetIndex;

                  accumulatedDuration += clipDuration;

                  return (
                    <div
                      key={clip.id}
                      draggable={true}
                      className={`timeline-clip absolute rounded-lg cursor-move transition-all ${
                        isSelected ? 'scale-105' : 'hover:scale-102'
                      } ${isDraggedOver ? 'scale-105' : ''} ${isBeingDragged ? 'opacity-40' : ''}`}
                      style={{
                        left: `${clipStartPos}%`,
                        width: `${clipWidth}%`,
                        top: '20px',
                        bottom: '20px',
                        backgroundColor: isSelected ? '#c084fc' : '#a855f7',
                        border: isSelected ? '8px solid #fbbf24' : '6px solid #c084fc',
                        boxShadow: isSelected
                          ? '0 0 40px rgba(251, 191, 36, 1), 0 0 60px rgba(251, 191, 36, 0.6), inset 0 0 20px rgba(255,255,255,0.3)'
                          : '0 0 30px rgba(168, 85, 247, 0.8), inset 0 0 15px rgba(255,255,255,0.2)',
                        zIndex: isSelected ? 70 : 60,
                        outline: isSelected ? '4px solid #fbbf24' : 'none',
                        outlineOffset: isSelected ? '4px' : '0'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectClip) {
                          onSelectClip(clip.id);
                        }
                      }}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedClipId(clip.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        if (draggedClipId && draggedClipId !== clip.id) {
                          // Only show drop indicator if same track
                          const draggedClip = clips.find(c => c.id === draggedClipId);
                          const targetClip = clips.find(c => c.id === clip.id);
                          if (draggedClip && targetClip && draggedClip.track === targetClip.track) {
                            setDragOverClipId(clip.id);
                          }
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragOverClipId === clip.id) {
                          setDragOverClipId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedClipId && draggedClipId !== clip.id && onReorderClips) {
                          // Only allow reordering within the same track
                          const draggedClip = clips.find(c => c.id === draggedClipId);
                          const targetClip = clips.find(c => c.id === clip.id);
                          if (draggedClip && targetClip && draggedClip.track === targetClip.track) {
                            onReorderClips(draggedClipId, clip.id);
                          }
                        }
                        setDraggedClipId(null);
                        setDragOverClipId(null);
                      }}
                      onDragEnd={(e) => {
                        e.preventDefault();
                        setDraggedClipId(null);
                        setDragOverClipId(null);
                      }}
                      title={`PiP Clip: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
                    >
                      {/* Drop insertion indicator - large wedge pointing down */}
                      {isDraggedOver && (
                        <>
                          {/* Vertical insertion line */}
                          <div className={`absolute top-0 bottom-0 w-2 bg-gradient-to-r from-yellow-400 to-yellow-300 shadow-lg ${isDraggingLeftToRight ? '-right-3' : '-left-3'}`} style={{
                            boxShadow: '0 0 30px rgba(251, 191, 36, 1), -6px 0 30px rgba(251, 191, 36, 0.8)',
                            zIndex: 100
                          }} />
                          {/* Large wedge arrow pointing down */}
                          <div className={`absolute -top-8 -translate-x-1/2 ${isDraggingLeftToRight ? '-right-3' : '-left-3'}`}>
                            <div style={{
                              width: 0,
                              height: 0,
                              borderLeft: '20px solid transparent',
                              borderRight: '20px solid transparent',
                              borderTop: '24px solid #fbbf24',
                              filter: 'drop-shadow(0 4px 12px rgba(251, 191, 36, 0.9))'
                            }} />
                          </div>
                          {/* Label */}
                          <div className={`absolute -top-14 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full whitespace-nowrap ${isDraggingLeftToRight ? '-right-3' : '-left-3'}`} style={{
                            boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)'
                          }}>
                            DROP HERE
                          </div>
                        </>
                      )}

                      <div className="absolute inset-0 flex items-center justify-between px-2 gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="text-white/90 flex-shrink-0">
                            <Film className="h-3 w-3" />
                          </div>
                          <span className="text-xs text-white/90 truncate">
                            {formatTime(clip.endTime - clip.startTime)}
                          </span>
                        </div>
                        {/* Delete button */}
                        {isSelected && onDeleteClip && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClip(clip.id);
                            }}
                            className="p-0.5 bg-red-500 hover:bg-red-600 rounded-sm transition-colors flex-shrink-0"
                            title="Delete clip"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        )}
                      </div>

                      {/* Resize handles - QuickTime-style circular handles (SAME as unsplit video) */}
                      {isSelected && (
                        <>
                          {/* Left resize handle - IN point - QuickTime style */}
                          <div
                            className="absolute top-0 bottom-0 cursor-ew-resize"
                            style={{
                              left: '0px',
                              width: '6px',
                              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                              boxShadow: '0 0 15px rgba(251, 191, 36, 0.8), inset 0 0 8px rgba(255,255,255,0.4)',
                              borderRadius: '3px',
                              zIndex: 999
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'left' });
                            }}
                            title="◀ Drag to trim IN point"
                          >
                            {/* Circular handle - solid gray, stays within bounds */}
                            <div className="absolute -top-3 w-10 h-10 border-2 border-white rounded-full shadow-xl" style={{
                              left: '15px',
                              backgroundColor: '#9ca3af',
                              boxShadow: '0 0 20px rgba(156, 163, 175, 0.9)'
                            }} />
                            {/* Time label - only show when resizing this edge */}
                            {resizingClip?.clipId === clip.id && resizingClip?.edge === 'left' && (
                              <div className="absolute top-10 px-2 py-1 text-black text-xs font-bold rounded shadow-lg whitespace-nowrap" style={{
                                left: '15px',
                                backgroundColor: '#9ca3af'
                              }}>
                                {formatTime(clip.startTime)}
                              </div>
                            )}
                          </div>
                          {/* Right resize handle - OUT point - QuickTime style */}
                          <div
                            className="absolute top-0 bottom-0 cursor-ew-resize"
                            style={{
                              right: '0px',
                              width: '6px',
                              background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                              boxShadow: '0 0 15px rgba(251, 191, 36, 0.8), inset 0 0 8px rgba(255,255,255,0.4)',
                              borderRadius: '3px',
                              zIndex: 999
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'right' });
                            }}
                            title="Drag to trim OUT point ▶"
                          >
                            {/* Circular handle - solid gray, stays within bounds */}
                            <div className="absolute -top-3 w-10 h-10 border-2 border-white rounded-full shadow-xl" style={{
                              right: '15px',
                              backgroundColor: '#9ca3af',
                              boxShadow: '0 0 20px rgba(156, 163, 175, 0.9)'
                            }} />
                            {/* Time label - only show when resizing this edge */}
                            {resizingClip?.clipId === clip.id && resizingClip?.edge === 'right' && (
                              <div className="absolute top-10 px-2 py-1 text-black text-xs font-bold rounded shadow-lg whitespace-nowrap" style={{
                                right: '15px',
                                backgroundColor: '#9ca3af'
                              }}>
                                {formatTime(clip.endTime)}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Playhead (overlay track) */}
              <div
                className="absolute top-0 h-full pointer-events-none"
                style={{
                  left: `${playheadPosition}%`,
                  width: '4px',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.9)',
                  zIndex: 100
                }}
              >
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Info */}
      <div className="px-4 py-2 bg-[#2c2c2e] border-t-2 border-white/20 flex items-center gap-4 text-sm text-white/80 font-medium">
        <span className="tabular-nums">Current: {formatTime(currentTime)}</span>
        {(startTime > 0 || endTime < duration) && (
          <>
            <span>•</span>
            <span className="tabular-nums">
              Trim: {formatTime(startTime)} → {formatTime(endTime)} ({formatTime(endTime - startTime)})
            </span>
          </>
        )}
      </div>
    </div>
  );
}
