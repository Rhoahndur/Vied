import React, { useState } from 'react';

function ExportButton({ videoPath, startTime, endTime, duration, clips, disabled }) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    if (!videoPath) {
      alert('No video loaded');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setExportStatus('Selecting save location...');

    try {
      // Open save dialog
      const outputPath = await window.electron.saveFile();

      if (!outputPath) {
        setIsExporting(false);
        setExportStatus('Export cancelled');
        setTimeout(() => setExportStatus(''), 3000);
        return;
      }

      setExportStatus('Exporting video...');

      let result;

      // Check if there are clips to export
      if (clips && clips.length > 0) {
        console.log('Exporting clips:', clips);

        // Export multiple clips in sequence
        result = await window.electron.exportClips({
          input: videoPath,
          output: outputPath,
          clips: clips.map(clip => ({
            start: clip.startTime,
            duration: clip.endTime - clip.startTime
          }))
        });
      } else {
        // Simple trim export
        const trimDuration = endTime - startTime;

        console.log('Export params:', {
          input: videoPath,
          output: outputPath,
          start: startTime,
          duration: trimDuration
        });

        result = await window.electron.exportVideo({
          input: videoPath,
          output: outputPath,
          start: startTime,
          duration: trimDuration
        });
      }

      if (result.success) {
        setProgress(100);
        setExportStatus('✓ Export complete!');
        setTimeout(() => {
          setExportStatus('');
          setProgress(0);
        }, 5000);
      } else {
        setExportStatus('✗ Export failed');
        alert(`Export failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('✗ Export failed');
      alert(`Export error: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const trimDuration = endTime - startTime;
  const isDefaultTrim = startTime === 0 && endTime === duration;

  return (
    <div className="export-container">
      <button
        className="export-button"
        onClick={handleExport}
        disabled={disabled || isExporting || !videoPath}
      >
        {isExporting ? 'Exporting...' : 'Export Video'}
      </button>

      {!isDefaultTrim && (
        <div className="export-info">
          <span>
            Will export: {formatTime(startTime)} → {formatTime(endTime)}
            ({formatTime(trimDuration)})
          </span>
        </div>
      )}

      {exportStatus && (
        <div className={`export-status ${
          exportStatus.includes('✓') ? 'success' :
          exportStatus.includes('✗') ? 'error' :
          'processing'
        }`}>
          {exportStatus}
        </div>
      )}

      {isExporting && progress > 0 && (
        <div className="export-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
