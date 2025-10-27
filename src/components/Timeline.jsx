import React, { useRef, useState, useEffect } from 'react';

function Timeline({ currentTime, duration, startTime, endTime, onSeek, onSetStart, onSetEnd }) {
  const timelineRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' or 'end' or null

  const handleTimelineClick = (e) => {
    // Don't seek when clicking on markers
    if (e.target.closest('.trim-marker')) return;

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
    <div className="timeline">
      <div className="timeline-labels">
        <span className="timeline-label">0:00</span>
        <span className="timeline-label">{formatTime(duration)}</span>
      </div>

      <div
        ref={timelineRef}
        className="timeline-track"
        onClick={handleTimelineClick}
      >
        {/* Trim region (highlighted area between IN and OUT) */}
        <div
          className="trim-region"
          style={{
            left: `${startPosition}%`,
            width: `${trimWidth}%`
          }}
        />

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
  );
}

export default Timeline;
