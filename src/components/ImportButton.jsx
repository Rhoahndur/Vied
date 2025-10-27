import React, { useState } from 'react';

function ImportButton({ onFileSelected, disabled }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const filePath = await window.electron.openFile();

      if (filePath) {
        console.log('File selected:', filePath);

        // Get video metadata
        const metadata = await window.electron.getVideoMetadata(filePath);
        console.log('Video metadata:', metadata);

        // Pass the data back to parent
        if (onFileSelected) {
          onFileSelected({
            path: filePath,
            metadata: metadata
          });
        }
      } else {
        console.log('No file selected');
      }
    } catch (error) {
      console.error('Error importing file:', error);
      // Pass error to parent component
      if (onFileSelected) {
        onFileSelected({
          path: null,
          metadata: null,
          error: error.message || 'Failed to import video file'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleImport}
      disabled={disabled || isLoading}
      className="import-button"
    >
      {isLoading ? 'Loading...' : 'Import Video'}
    </button>
  );
}

export default ImportButton;
