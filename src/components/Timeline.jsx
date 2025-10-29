import React, { useRef, useState, useEffect } from 'react';

function Timeline({ currentTime, duration, startTime, endTime, clips, selectedClipId, onSeek, onSetStart, onSetEnd, onSelectClip, onReorderClips }) {
  const timelineRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' or 'end' or null
  const [draggedClipId, setDraggedClipId] = useState(null);
  const [dragOverClipId, setDragOverClipId] = useState(null);

  const handleTimelineClick = (e) => {
    // Don't seek when clicking on markers or dragging clips
    if (e.target.closest('.trim-marker')) return;

    // Check if clicking on a clip - if so, don't seek, just select
    const clickedClip = e.target.closest('.timeline-clip');
    if (clickedClip && clips && clips.length > 0) {
      // Clip selection is handled by the clip's onClick
      return;
    }

    if (!timelineRef.current || !duration || !onSeek) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;

    // Ensure seek time is within bounds
    const boundedSeekTime = Math.max(0, Math.min(duration, seekTime));
    onSeek(boundedSeekTime);
  };

  const handleMarkerMouseDown = (markerType, e) => {
    e.stopPropagation();
    setDragging(markerType);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      if (!timelineRef.current || !duration) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
      const time = percentage * duration;

      if (dragging === 'start') {
        // Ensure start doesn't go past end
        const newStartTime = Math.min(time, endTime - 0.1);
        onSetStart?.(Math.max(0, newStartTime));
      } else if (dragging === 'end') {
        // Ensure end doesn't go before start
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

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate positions as percentages
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;
  const startPosition = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPosition = duration > 0 ? (endTime / duration) * 100 : 100;
  const trimWidth = endPosition - startPosition;

  // Generate time markers (every 10 seconds or duration/10, whichever is cleaner)
  const generateTimeMarkers = () => {
    if (!duration) return [];

    const markerCount = 11; // 0%, 10%, 20%, ... 100%
    const markers = [];

    for (let i = 0; i < markerCount; i++) {
      const percentage = (i / (markerCount - 1)) * 100;
      const time = (duration * percentage) / 100;
      markers.push({ percentage, time });
    }

    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  if (!duration) {
    return (
      <div className="timeline-placeholder">
        <p>Timeline will appear when video is loaded</p>
      </div>
    );
  }

  return (
    <div className="timeline-tracks">
      {/* Main Video Track */}
      <div className="timeline">
        <div className="timeline-track-label">Main Video</div>
        <div className="timeline-labels">
          <span className="timeline-label">0:00</span>
          <span className="timeline-label">{formatTime(duration)}</span>
        </div>

        <div
          ref={timelineRef}
          className="timeline-track"
          onClick={handleTimelineClick}
        >
        {/* Clips - show if there are any */}
        {clips && clips.length > 0 && (() => {
          // Calculate total duration of all clips
          const totalClipsDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

          // Position clips sequentially based on array order
          let accumulatedDuration = 0;

          return clips.map((clip, index) => {
            const clipDuration = clip.endTime - clip.startTime;
            const gapWidth = 0.5; // Small gap between clips in percentage
            const clipStartPos = (accumulatedDuration / totalClipsDuration) * 100 + (index * gapWidth);
            const clipWidth = (clipDuration / totalClipsDuration) * 100 - gapWidth;

            const isSelected = clip.id === selectedClipId;
            const isDraggedOver = clip.id === dragOverClipId;
            const isBeingDragged = clip.id === draggedClipId;

            // Update accumulated duration for next clip
            accumulatedDuration += clipDuration;

          return (
            <div
              key={clip.id}
              draggable={true}
              className={`timeline-clip ${isSelected ? 'selected' : ''} ${isDraggedOver ? 'drag-over' : ''} ${isBeingDragged ? 'dragging' : ''}`}
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
                  setDragOverClipId(clip.id);
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
                  onReorderClips(draggedClipId, clip.id);
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
              <div className="clip-label">
                {formatTime(clip.endTime - clip.startTime)}
              </div>
            </div>
          );
        });
        })()}

        {/* Trim region (highlighted area between IN and OUT) - only show if no clips */}
        {(!clips || clips.length === 0) && (
          <div
            className="trim-region"
            style={{
              left: `${startPosition}%`,
              width: `${trimWidth}%`
            }}
          />
        )}

        {/* Start marker (IN point) */}
        {startTime > 0 && (
          <div
            className={`trim-marker trim-marker-start ${dragging === 'start' ? 'dragging' : ''}`}
            style={{ left: `${startPosition}%` }}
            onMouseDown={(e) => handleMarkerMouseDown('start', e)}
          >
            <div className="trim-marker-label">IN</div>
          </div>
        )}

        {/* End marker (OUT point) */}
        {endTime < duration && (
          <div
            className={`trim-marker trim-marker-end ${dragging === 'end' ? 'dragging' : ''}`}
            style={{ left: `${endPosition}%` }}
            onMouseDown={(e) => handleMarkerMouseDown('end', e)}
          >
            <div className="trim-marker-label">OUT</div>
          </div>
        )}

        {/* Playhead */}
        <div
          className="playhead"
          style={{ left: `${playheadPosition}%` }}
        >
          <div className="playhead-line" />
          <div className="playhead-handle" />
        </div>

        {/* Time markers */}
        <div className="time-markers">
          {timeMarkers.map((marker, index) => (
            <div
              key={index}
              className="time-marker"
              style={{ left: `${marker.percentage}%` }}
            />
          ))}
        </div>
      </div>

      <div className="timeline-info">
        <span>Current: {formatTime(currentTime)}</span>
        {(startTime > 0 || endTime < duration) && (
          <span>
            Trim: {formatTime(startTime)} → {formatTime(endTime)}
            ({formatTime(endTime - startTime)})
          </span>
        )}
      </div>
      </div>

      {/* Overlay/PiP Track */}
      <div className="timeline">
        <div className="timeline-track-label">Overlay / PiP</div>
        <div
          className="timeline-track"
          style={{ opacity: 0.6 }}
        >
          {/* Placeholder for overlay/PiP clips */}
          {/* Playhead for overlay track */}
          <div
            className="playhead"
            style={{ left: `${playheadPosition}%` }}
          >
            <div className="playhead-line" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
