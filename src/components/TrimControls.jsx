import React, { useState, useEffect } from 'react';

function TrimControls({ currentTime, duration, startTime, endTime, onSetStart, onSetEnd, onReset, onSplit }) {
  const [startInput, setStartInput] = useState('0');
  const [endInput, setEndInput] = useState('0');

  // Update input fields when props change
  useEffect(() => {
    setStartInput(formatTimeForInput(startTime));
  }, [startTime]);

  useEffect(() => {
    setEndInput(formatTimeForInput(endTime));
  }, [endTime]);

  const formatTimeForInput = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0';
    return seconds.toFixed(2);
  };

  const formatTimeDisplay = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetStart = () => {
    if (currentTime < endTime) {
      onSetStart(currentTime);
    } else {
      alert('Start time must be before end time');
    }
  };

  const handleSetEnd = () => {
    if (currentTime > startTime) {
      onSetEnd(currentTime);
    } else {
      alert('End time must be after start time');
    }
  };

  const handleStartInputChange = (e) => {
    setStartInput(e.target.value);
  };

  const handleEndInputChange = (e) => {
    setEndInput(e.target.value);
  };

  const handleStartInputSubmit = () => {
    const value = parseFloat(startInput);
    if (isNaN(value)) {
      alert('Please enter a valid number');
      setStartInput(formatTimeForInput(startTime));
      return;
    }

    if (value < 0) {
      alert('Start time cannot be negative');
      setStartInput(formatTimeForInput(startTime));
      return;
    }

    if (value >= endTime) {
      alert('Start time must be before end time');
      setStartInput(formatTimeForInput(startTime));
      return;
    }

    onSetStart(value);
  };

  const handleEndInputSubmit = () => {
    const value = parseFloat(endInput);
    if (isNaN(value)) {
      alert('Please enter a valid number');
      setEndInput(formatTimeForInput(endTime));
      return;
    }

    if (value > duration) {
      alert(`End time cannot exceed video duration (${formatTimeDisplay(duration)})`);
      setEndInput(formatTimeForInput(endTime));
      return;
    }

    if (value <= startTime) {
      alert('End time must be after start time');
      setEndInput(formatTimeForInput(endTime));
      return;
    }

    onSetEnd(value);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  const trimDuration = endTime - startTime;
  const isDefaultTrim = startTime === 0 && endTime === duration;

  if (!duration) {
    return (
      <div className="trim-controls-placeholder">
        <p>Trim controls will be available when video is loaded</p>
      </div>
    );
  }

  return (
    <div className="trim-controls">
      <div className="trim-controls-section">
        <h3>Set Trim Points</h3>
        <div className="trim-buttons">
          <button
            className="trim-button set-in-button"
            onClick={handleSetStart}
            disabled={!duration}
          >
            Set IN (at {formatTimeDisplay(currentTime)})
          </button>
          <button
            className="trim-button set-out-button"
            onClick={handleSetEnd}
            disabled={!duration}
          >
            Set OUT (at {formatTimeDisplay(currentTime)})
          </button>
          <button
            className="trim-button split-button"
            onClick={onSplit}
            disabled={!duration || currentTime <= startTime || currentTime >= endTime}
            title={currentTime <= startTime || currentTime >= endTime ? "Move playhead between IN and OUT points to split" : "Split clip at current time"}
          >
            Split at {formatTimeDisplay(currentTime)}
          </button>
        </div>
      </div>

      <div className="trim-controls-section">
        <h3>Manual Entry (seconds)</h3>
        <div className="trim-inputs">
          <div className="trim-input-group">
            <label>Start Time:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={duration}
              value={startInput}
              onChange={handleStartInputChange}
              onBlur={handleStartInputSubmit}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleStartInputSubmit();
                }
              }}
            />
            <span className="time-display-small">{formatTimeDisplay(startTime)}</span>
          </div>

          <div className="trim-input-group">
            <label>End Time:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={duration}
              value={endInput}
              onChange={handleEndInputChange}
              onBlur={handleEndInputSubmit}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleEndInputSubmit();
                }
              }}
            />
            <span className="time-display-small">{formatTimeDisplay(endTime)}</span>
          </div>
        </div>
      </div>

      <div className="trim-controls-section">
        <div className="trim-info">
          <div>
            <strong>Trim Duration:</strong> {formatTimeDisplay(trimDuration)}
          </div>
          {!isDefaultTrim && (
            <button
              className="reset-button"
              onClick={handleReset}
            >
              Reset to Full Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrimControls;
