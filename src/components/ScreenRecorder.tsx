import React, { useState, useRef, useEffect } from 'react';

function ScreenRecorder({ onRecordingComplete }) {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [recordingMode, setRecordingMode] = useState(null); // 'screen', 'webcam', or 'pip'
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const pipAnimationRef = useRef(null);

  // Start screen recording - fetch available screens/windows
  const startScreenRecording = async () => {
    try {
      setError(null);
      setRecordingMode('screen');

      // Attempt to get sources - this will trigger macOS permission prompt on first try
      const availableSources = await window.electron.getSources();
      console.log('Available sources:', availableSources);

      // If we got sources successfully, show the picker
      if (availableSources && availableSources.length > 0) {
        setSources(availableSources);
        setShowSourcePicker(true);
      } else {
        // No sources available
        setError({
          type: 'error',
          message: 'No screens or windows available',
          details: 'Could not find any screens or windows to record.'
        });
      }
    } catch (err) {
      console.error('Error fetching sources:', err);

      // Check if this is a permission error
      const errorMessage = err.message || '';
      const isPermissionError = errorMessage.includes('screen recording permission') ||
                                errorMessage.includes('Failed to get sources') ||
                                errorMessage.includes('denied');

      if (isPermissionError) {
        setError({
          type: 'permission',
          message: 'Screen recording permission denied',
          details: 'macOS blocked screen recording access. Click "Open Settings" below, then look for "Vied" in Privacy & Security → Screen Recording and toggle it ON. After enabling, quit and restart Vied.'
        });
      } else {
        setError({
          type: 'error',
          message: 'Failed to get screen sources',
          details: err.message || 'Please try again.'
        });
      }
    }
  };

  // Start webcam recording
  const startWebcamRecording = async () => {
    try {
      setError(null);
      setRecordingMode('webcam');

      // Check camera permission on macOS first
      if (window.electron.checkCameraPermission) {
        const permissionStatus = await window.electron.checkCameraPermission();
        console.log('Camera permission status:', permissionStatus);

        // If permission is not granted on macOS, request it
        if (permissionStatus.platform === 'darwin' && !permissionStatus.hasPermission) {
          console.log('Requesting camera permission...');
          const permissionResult = await window.electron.requestCameraPermission();

          if (!permissionResult.hasPermission) {
            setError({
              type: 'permission',
              message: 'Camera permission denied',
              details: 'Vied needs permission to access your camera. Click "Open Settings" to grant camera access in System Settings → Privacy & Security → Camera.'
            });
            return;
          }
        }
      }

      // Get webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: true
      });

      streamRef.current = stream;
      console.log('Got webcam stream, stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());

      // Start recording immediately with webcam
      const options = { mimeType: 'video/webm; codecs=vp9' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      // Start with timeslice to collect data periodically (every 1 second)
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting webcam recording:', err);

      const errorMessage = err.message || '';
      const errorName = err.name || '';

      if (errorMessage.includes('Permission denied') ||
          errorMessage.includes('NotAllowedError') ||
          errorName === 'NotAllowedError') {
        setError({
          type: 'permission',
          message: 'Camera permission denied',
          details: 'Vied needs permission to access your camera. Click "Open Settings" to grant camera access in System Settings → Privacy & Security → Camera.'
        });
      } else if (errorMessage.includes('NotFoundError') ||
                 errorMessage.includes('not found') ||
                 errorName === 'NotFoundError') {
        setError({
          type: 'error',
          message: 'No camera found',
          details: 'Could not detect a camera. Please connect a webcam and try again.'
        });
      } else {
        setError({
          type: 'error',
          message: 'Failed to start webcam',
          details: err.message || 'Please try again.'
        });
      }
    }
  };

  // Start picture-in-picture recording (screen + webcam)
  const startPiPRecording = async () => {
    try {
      setError(null);
      setRecordingMode('pip');

      // Attempt to get screen sources first
      const availableSources = await window.electron.getSources();
      console.log('Available sources:', availableSources);

      if (availableSources && availableSources.length > 0) {
        setSources(availableSources);
        setShowSourcePicker(true);
      } else {
        setError({
          type: 'error',
          message: 'No screens or windows available',
          details: 'Could not find any screens or windows to record.'
        });
      }
    } catch (err) {
      console.error('Error fetching sources for PiP:', err);
      const errorMessage = err.message || '';
      const isPermissionError = errorMessage.includes('screen recording permission') ||
                                errorMessage.includes('Failed to get sources') ||
                                errorMessage.includes('denied');

      if (isPermissionError) {
        setError({
          type: 'permission',
          message: 'Screen recording permission denied',
          details: 'macOS blocked screen recording access. Click "Open Settings" below, then look for "Vied" in Privacy & Security → Screen Recording and toggle it ON. After enabling, quit and restart Vied.'
        });
      } else {
        setError({
          type: 'error',
          message: 'Failed to get screen sources',
          details: err.message || 'Please try again.'
        });
      }
    }
  };

  const openSystemPreferences = async () => {
    // Determine which settings to open based on current recording mode
    const settingsType = (recordingMode === 'webcam') ? 'camera' : 'screen';
    await window.electron.openSystemPreferences(settingsType);

    if (settingsType === 'camera') {
      setError({
        type: 'permission',
        message: 'System Settings opened',
        details: 'Look for "Electron" (dev mode) or "Vied" (packaged app) in the Camera list and toggle it ON. Then quit and restart the app for changes to take effect.'
      });
    } else {
      setError({
        type: 'permission',
        message: 'System Settings opened',
        details: 'Look for "Electron" (dev mode) or "Vied" (packaged app) in the Screen Recording list and toggle it ON. Then quit and restart the app for changes to take effect.'
      });
    }
  };

  // Start recording with selected source
  const startRecording = async (source) => {
    try {
      setError(null);
      setSelectedSource(source);
      setShowSourcePicker(false);

      // Get the video stream from the selected source
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        }
      });

      streamRef.current = screenStream;

      // If in PiP mode, also get webcam stream and composite
      if (recordingMode === 'pip') {
        // Check camera permission first
        if (window.electron.checkCameraPermission) {
          const permissionStatus = await window.electron.checkCameraPermission();
          if (permissionStatus.platform === 'darwin' && !permissionStatus.hasPermission) {
            const permissionResult = await window.electron.requestCameraPermission();
            if (!permissionResult.hasPermission) {
              setError({
                type: 'permission',
                message: 'Camera permission denied',
                details: 'PiP mode needs camera access. Please grant permission and try again.'
              });
              screenStream.getTracks().forEach(track => track.stop());
              return;
            }
          }
        }

        // Get webcam stream
        const webcamStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          },
          audio: true
        });

        webcamStreamRef.current = webcamStream;

        // Create canvas for compositing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get screen video track settings to determine canvas size
        const screenTrack = screenStream.getVideoTracks()[0];
        const screenSettings = screenTrack.getSettings();
        canvas.width = screenSettings.width || 1920;
        canvas.height = screenSettings.height || 1080;

        canvasRef.current = canvas;

        // Create video elements for rendering
        const screenVideo = document.createElement('video');
        const webcamVideo = document.createElement('video');

        screenVideo.srcObject = screenStream;
        webcamVideo.srcObject = webcamStream;
        screenVideo.play();
        webcamVideo.play();

        // PiP position and size (bottom-right corner)
        const pipWidth = canvas.width * 0.25; // 25% of screen width
        const pipHeight = (pipWidth / 4) * 3; // 4:3 aspect ratio
        const pipX = canvas.width - pipWidth - 20; // 20px padding
        const pipY = canvas.height - pipHeight - 20;

        // Composite function
        const drawFrame = () => {
          if (!canvasRef.current) return; // Stop if canvas is destroyed

          // Draw screen (full canvas)
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

          // Draw webcam PiP with border
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 4;
          ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4);

          ctx.drawImage(webcamVideo, pipX, pipY, pipWidth, pipHeight);

          if (isRecording) {
            pipAnimationRef.current = requestAnimationFrame(drawFrame);
          }
        };

        // Start compositing
        drawFrame();

        // Get canvas stream
        const compositeStream = canvas.captureStream(30); // 30 FPS

        // Add audio from webcam
        if (webcamStream.getAudioTracks().length > 0) {
          const audioTrack = webcamStream.getAudioTracks()[0];
          compositeStream.addTrack(audioTrack);
        }

        // Create MediaRecorder from composite stream
        const options = { mimeType: 'video/webm; codecs=vp9' };
        const mediaRecorder = new MediaRecorder(compositeStream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = handleRecordingStop;

        mediaRecorder.start(1000);
        setIsRecording(true);
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

      } else {
        // Normal screen recording (no webcam)
        const options = { mimeType: 'video/webm; codecs=vp9' };
        const mediaRecorder = new MediaRecorder(screenStream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = handleRecordingStop;

        mediaRecorder.start(1000);
        setIsRecording(true);
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      }

    } catch (err) {
      console.error('Error starting recording:', err);
      setError({
        type: 'error',
        message: 'Failed to start recording',
        details: err.message || 'Make sure you granted screen recording permissions. You may need to restart the app after granting permission.'
      });
      setSelectedSource(null);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Request any remaining data before stopping
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
    }

    // Stop screen stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Stop webcam stream (for PiP mode)
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }

    // Cancel animation frame (for PiP mode)
    if (pipAnimationRef.current) {
      cancelAnimationFrame(pipAnimationRef.current);
      pipAnimationRef.current = null;
    }

    // Clear canvas reference
    if (canvasRef.current) {
      canvasRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
  };

  // Handle recording stop - save file
  const handleRecordingStop = async () => {
    console.log('handleRecordingStop called, chunks:', recordedChunksRef.current.length);

    if (recordedChunksRef.current.length === 0) {
      console.error('No recorded data available');
      setError({
        type: 'error',
        message: 'Recording failed',
        details: 'No video data was captured. Please try again.'
      });
      return;
    }

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    console.log('Created blob, size:', blob.size, 'bytes');

    if (blob.size === 0) {
      console.error('Blob is empty');
      setError({
        type: 'error',
        message: 'Recording failed',
        details: 'The recorded video is empty. Please try again.'
      });
      return;
    }

    try {
      // Convert blob to buffer
      const buffer = await blob.arrayBuffer();
      console.log('Converted to buffer, size:', buffer.byteLength, 'bytes');

      // Save the file using IPC
      const filePath = await window.electron.saveRecording(buffer);

      if (!filePath) {
        console.log('User cancelled save dialog');
        return;
      }

      console.log('Recording saved to:', filePath);

      // If parent wants to load the recording, notify them
      if (onRecordingComplete) {
        onRecordingComplete(filePath);
      }

    } catch (err) {
      console.error('Error saving recording:', err);
      setError({
        type: 'error',
        message: 'Failed to save recording',
        details: err.message || 'Please try again.'
      });
    }
  };

  // Update video preview when stream changes
  useEffect(() => {
    if (streamRef.current && videoPreviewRef.current && isRecording && recordingMode === 'webcam') {
      console.log('Attaching stream to video preview element');
      videoPreviewRef.current.srcObject = streamRef.current;
      videoPreviewRef.current.play().catch(err => {
        console.error('Error playing preview:', err);
      });
    }
  }, [isRecording, recordingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="screen-recorder">
      {error && (
        <div className="recorder-error">
          <div className="error-content">
            <p className="error-title">{typeof error === 'string' ? error : error.message}</p>
            {error.details && <p className="error-details">{error.details}</p>}
          </div>
          <div className="error-actions">
            {error.type === 'permission' && (
              <button onClick={openSystemPreferences} className="open-settings-button">
                Open Settings
              </button>
            )}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {!isRecording && !showSourcePicker && (
        <div className="record-buttons">
          <button
            className="record-screen-button"
            onClick={startScreenRecording}
          >
            🖥️ Record Screen
          </button>
          <button
            className="record-webcam-button"
            onClick={startWebcamRecording}
          >
            📹 Record Webcam
          </button>
          <button
            className="record-pip-button"
            onClick={startPiPRecording}
            title="Record screen with webcam overlay (Picture-in-Picture)"
          >
            🎥 Screen + Webcam
          </button>
        </div>
      )}

      {isRecording && (
        <div className="recording-controls">
          {recordingMode === 'webcam' && (
            <div className="webcam-preview-container">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="webcam-preview"
              />
            </div>
          )}
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span>
              Recording {
                recordingMode === 'webcam' ? '📹 Webcam' :
                recordingMode === 'pip' ? '🎥 Screen + Webcam' :
                '🖥️ Screen'
              }: {formatTime(recordingTime)}
            </span>
          </div>
          <button
            className="stop-recording-button"
            onClick={stopRecording}
          >
            Stop Recording
          </button>
        </div>
      )}

      {showSourcePicker && (
        <div className="source-picker-overlay">
          <div className="source-picker-modal">
            <div className="source-picker-header">
              <h3>Select Screen or Window to Record</h3>
              <button
                className="close-picker-button"
                onClick={() => setShowSourcePicker(false)}
              >
                ✕
              </button>
            </div>

            <div className="source-list">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="source-item"
                  onClick={() => startRecording(source)}
                >
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="source-thumbnail"
                  />
                  <div className="source-name">{source.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreenRecorder;
