import React, { useState } from 'react';

function ImportButton({ onFileSelected, disabled }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const handleImport = async () => {
    setIsLoading(true);
    try {
      let filePath = await window.electron.openFile();

      if (filePath) {
        console.log('File selected:', filePath);

        // Check if it's a .mov file and convert it to .mp4 for better browser compatibility
        if (filePath.toLowerCase().endsWith('.mov')) {
          console.log('Converting .mov file to .mp4 for better compatibility...');
          setLoadingMessage('Converting .mov to .mp4...');
          try {
            filePath = await window.electron.convertMovToMp4(filePath);
            console.log('Conversion complete:', filePath);
          } catch (conversionError) {
            console.error('Conversion failed, trying to use original file:', conversionError);
            // If conversion fails, try to use the original file
          }
        }

        // Get video metadata
        setLoadingMessage('Loading video...');
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
      setLoadingMessage('Loading...');
    }
  };

  return (
    <button
      onClick={handleImport}
      disabled={disabled || isLoading}
      className="import-button"
    >
      {isLoading ? loadingMessage : 'Import Video'}
    </button>
  );
}

export default ImportButton;
