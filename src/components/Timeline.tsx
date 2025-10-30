import { Film, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState, useEffect } from "react";
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
  onSeek?: (time: number) => void;
  onSetStart?: (time: number) => void;
  onSetEnd?: (time: number) => void;
  onSelectClip?: (clipId: number) => void;
  onReorderClips?: (draggedClipId: number, targetClipId: number) => void;
  onDeleteClip?: (clipId: number) => void;
  onUpdateClip?: (clipId: number, updates: { startTime?: number; endTime?: number }) => void;
}

export function Timeline({
  currentTime,
  duration,
  startTime,
  endTime,
  clips,
  selectedClipId,
  onSeek,
  onSetStart,
  onSetEnd,
  onSelectClip,
  onReorderClips,
  onDeleteClip,
  onUpdateClip
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const trackScrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [draggedClipId, setDraggedClipId] = useState<number | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<number | null>(null);
  const [resizingClip, setResizingClip] = useState<{ clipId: number; edge: 'left' | 'right' } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 2 = 200%, etc.

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
      const time = percentage * duration;

      if (dragging === 'start') {
        const newStartTime = Math.min(time, endTime - 0.1);
        onSetStart?.(Math.max(0, newStartTime));
      } else if (dragging === 'end') {
        const newEndTime = Math.max(time, startTime + 0.1);
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

  return (
    <div className="flex flex-col h-full bg-[#1c1c1e] border-t border-white/10">
      {/* Timeline Header */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#2c2c2e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-white/60" />
          <span className="text-sm text-white/60">Timeline</span>
        </div>
        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Slider
            value={[zoomLevel]}
            onValueChange={(value) => setZoomLevel(value[0])}
            min={0.5}
            max={5}
            step={0.1}
            className="w-24"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.25))}
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-white/40 tabular-nums w-10">{Math.round(zoomLevel * 100)}%</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-white/40 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <div className="w-px h-4 bg-white/20 mx-2" />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Timeline Ruler - Scrollable */}
      <div
        ref={rulerScrollRef}
        className="relative border-b border-white/10 bg-[#2c2c2e] overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex">
          {/* Ruler label spacer */}
          <div className="w-16 flex-shrink-0" />
          {/* Ruler content */}
          <div
            className="cursor-pointer h-8"
            style={{ width: `calc((100% - 4rem) * ${zoomLevel})` }}
            onClick={handleTimelineClick}
          >
          <div className="flex h-full">
            {timeMarkers.map((marker, index) => (
              <div
                key={index}
                className="flex-1 border-l border-white/10 relative first:border-l-0"
              >
                <span className="absolute top-1 left-1 text-xs text-white/40 tabular-nums pointer-events-none">
                  {formatTime(marker.time)}
                </span>
              </div>
            ))}
          </div>
          {/* Playhead on ruler */}
          <div className="absolute top-0 w-0.5 h-full bg-red-500 z-10 pointer-events-none" style={{ left: `${playheadPosition}%` }}>
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
          </div>
          </div>
        </div>
      </div>

      {/* Tracks Container */}
      <div ref={trackScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative w-full h-full">
          {/* Main Track Label */}
          <div className="absolute left-0 top-0 w-16 h-1/2 flex items-center justify-center bg-[#2c2c2e] border-r border-b border-white/10 z-10">
            <div className="flex flex-col items-center gap-1">
              <Film className="h-4 w-4 text-white/60" />
              <span className="text-xs text-white/40">Main</span>
            </div>
          </div>

          {/* Main Track Lane */}
          <div className="absolute top-0 left-16 h-1/2 bg-[#1c1c1e] border-b border-white/5 relative" style={{ width: `calc((100% - 4rem) * ${zoomLevel})` }}>
            {/* Empty state message */}
            {!hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                Load a video to begin editing
              </div>
            )}

            {/* Background ruler marks */}
            <div className="absolute inset-0 flex">
              {timeMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-white/5 first:border-l-0"
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

                  accumulatedDuration += clipDuration;

                  return (
                    <div
                      key={clip.id}
                      draggable={true}
                      className={`timeline-clip absolute top-3 bottom-3 rounded-md cursor-move border-2 transition-all bg-gradient-to-b from-blue-500 to-blue-600 border-blue-300 shadow-md z-10 ${
                        isSelected ? 'ring-2 ring-white shadow-xl scale-105' : 'hover:shadow-lg hover:scale-102'
                      } ${isDraggedOver ? 'ring-2 ring-yellow-400 scale-105' : ''} ${isBeingDragged ? 'opacity-40' : ''}`}
                      style={{
                        left: `${clipStartPos}%`,
                        width: `${clipWidth}%`
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
                      <div className="absolute inset-0 flex items-center px-2 gap-1.5">
                        <div className="text-white/90 flex-shrink-0">
                          <Film className="h-3 w-3" />
                        </div>
                        <span className="text-xs text-white/90 truncate">
                          {formatTime(clip.endTime - clip.startTime)}
                        </span>
                      </div>

                      {/* Resize handles */}
                      {isSelected && (
                        <>
                          {/* Left resize handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 transition-colors border-r border-white/50 flex items-center justify-center"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'left' });
                            }}
                            title="Drag to trim start"
                          >
                            <div className="w-0.5 h-6 bg-white/80 rounded-full" />
                          </div>
                          {/* Right resize handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 transition-colors border-l border-white/50 flex items-center justify-center"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'right' });
                            }}
                            title="Drag to trim end"
                          >
                            <div className="w-0.5 h-6 bg-white/80 rounded-full" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Video block - show full video as a solid bar when no clips exist */}
              {clips && clips.filter(c => c.track === 'main').length === 0 && duration > 0 && (
                <div
                  className="absolute inset-y-2 rounded-md border-2 bg-gradient-to-b from-green-500 to-green-600 border-green-300 shadow-lg cursor-pointer z-10"
                  style={{
                    left: '0%',
                    width: '100%'
                  }}
                  title={`Full Video: ${formatTime(duration)}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">MAIN VIDEO</span>
                  </div>
                </div>
              )}

              {/* Trim region overlay - subtle when clips exist */}
              {clips && clips.filter(c => c.track === 'main').length > 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-blue-500/20 border-l-2 border-r-2 border-blue-400/50 pointer-events-none z-0"
                  style={{
                    left: `${startPosition}%`,
                    width: `${trimWidth}%`
                  }}
                />
              )}

              {/* Start marker (IN point) */}
              {startTime > 0 && (
                <div
                  className={`absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize trim-marker ${dragging === 'start' ? 'z-30' : 'z-20'}`}
                  style={{ left: `${startPosition}%` }}
                  onMouseDown={(e) => handleMarkerMouseDown('start', e)}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded whitespace-nowrap">
                    IN
                  </div>
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-black/60 text-white text-xs rounded tabular-nums whitespace-nowrap">
                    {formatTime(startTime)}
                  </div>
                </div>
              )}

              {/* End marker (OUT point) */}
              {endTime < duration && (
                <div
                  className={`absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize trim-marker ${dragging === 'end' ? 'z-30' : 'z-20'}`}
                  style={{ left: `${endPosition}%` }}
                  onMouseDown={(e) => handleMarkerMouseDown('end', e)}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded whitespace-nowrap">
                    OUT
                  </div>
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-black/60 text-white text-xs rounded tabular-nums whitespace-nowrap">
                    {formatTime(endTime)}
                  </div>
                </div>
              )}

              {/* Playhead */}
              <div
                className="absolute top-0 w-0.5 h-full bg-red-500 z-10 pointer-events-none"
                style={{ left: `${playheadPosition}%` }}
              >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Overlay Track Label */}
          <div className="absolute left-0 bottom-0 w-16 h-1/2 flex items-center justify-center bg-[#2c2c2e] border-r border-b border-white/10 z-10">
            <div className="flex flex-col items-center gap-1">
              <Film className="h-4 w-4 text-white/60" />
              <span className="text-xs text-white/40">PiP</span>
            </div>
          </div>

          {/* Overlay Track Lane */}
          <div className="absolute bottom-0 left-16 h-1/2 bg-[#1c1c1e]/50 border-b border-white/5 relative" style={{ width: `calc((100% - 4rem) * ${zoomLevel})` }}>
            {/* Background ruler marks */}
            <div className="absolute inset-0 flex">
              {timeMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-white/5 first:border-l-0"
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

                  accumulatedDuration += clipDuration;

                  return (
                    <div
                      key={clip.id}
                      draggable={true}
                      className={`timeline-clip absolute top-3 bottom-3 rounded-md cursor-move border-2 transition-all bg-gradient-to-b from-purple-500 to-purple-600 border-purple-300 shadow-md z-10 ${
                        isSelected ? 'ring-2 ring-white shadow-xl scale-105' : 'hover:shadow-lg hover:scale-102'
                      } ${isDraggedOver ? 'ring-2 ring-yellow-400 scale-105' : ''} ${isBeingDragged ? 'opacity-40' : ''}`}
                      style={{
                        left: `${clipStartPos}%`,
                        width: `${clipWidth}%`
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
                      <div className="absolute inset-0 flex items-center px-2 gap-1.5">
                        <div className="text-white/90 flex-shrink-0">
                          <Film className="h-3 w-3" />
                        </div>
                        <span className="text-xs text-white/90 truncate">
                          {formatTime(clip.endTime - clip.startTime)}
                        </span>
                      </div>

                      {/* Resize handles */}
                      {isSelected && (
                        <>
                          {/* Left resize handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 transition-colors border-r border-white/50 flex items-center justify-center"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'left' });
                            }}
                            title="Drag to trim start"
                          >
                            <div className="w-0.5 h-6 bg-white/80 rounded-full" />
                          </div>
                          {/* Right resize handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 transition-colors border-l border-white/50 flex items-center justify-center"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setResizingClip({ clipId: clip.id, edge: 'right' });
                            }}
                            title="Drag to trim end"
                          >
                            <div className="w-0.5 h-6 bg-white/80 rounded-full" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Playhead (overlay track) */}
              <div
                className="absolute top-0 w-0.5 h-full bg-red-500 z-10 pointer-events-none"
                style={{ left: `${playheadPosition}%` }}
              >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Info */}
      <div className="px-4 py-2 bg-[#2c2c2e] border-t border-white/10 flex items-center gap-4 text-xs text-white/60">
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
