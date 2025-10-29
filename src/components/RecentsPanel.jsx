import React from 'react';

function RecentsPanel({ recentFiles, onSelectFile, currentVideoPath }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
  };

  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!recentFiles || recentFiles.length === 0) {
    return null;
  }

  return (
    <div className="recents-panel">
      <h3 className="recents-header">Recently Opened</h3>
      <div className="recents-list">
        {recentFiles.map((file) => {
          const isActive = currentVideoPath === file.path;
          return (
            <div
              key={file.path}
              className={`recent-file-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFile(file.path)}
              title={file.path}
            >
              <div className="recent-file-icon">{isActive ? '▶️' : '🎬'}</div>
              <div className="recent-file-info">
                <div className="recent-file-name">
                  {file.name}
                  {isActive && <span className="active-badge">Now Playing</span>}
                </div>
                <div className="recent-file-meta">
                  <span>{formatDuration(file.duration)}</span>
                  <span className="meta-separator">•</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span className="meta-separator">•</span>
                  <span className="recent-file-time">{formatTimestamp(file.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentsPanel;
