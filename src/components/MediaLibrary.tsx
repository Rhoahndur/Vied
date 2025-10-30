import { Video, Camera, Clock, FolderOpen, Upload, Square, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useState, useRef, useEffect } from "react";

interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
  duration: number;
  size: number;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
  hasAudio: boolean;
}

interface MediaLibraryProps {
  onFileSelected: (data: { path: string; metadata: VideoMetadata; error?: string }) => void;
  onRecordingComplete: (filePath: string) => void;
  recentFiles: RecentFile[];
  onSelectFile: (filePath: string) => void;
  currentVideoPath: string | null;
}

export function MediaLibrary({
  onFileSelected,
  onRecordingComplete,
  recentFiles,
  onSelectFile,
  currentVideoPath
}: MediaLibraryProps) {
  // Import state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  // Recording state
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'screen' | 'webcam' | 'pip' | null>(null);
  const [error, setError] = useState<{ type: string; message: string; details?: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipAnimationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Import functionality
  const handleImport = async () => {
    setIsLoading(true);
    try {
      const filePath = await window.electron.openFile();

      if (filePath) {
        console.log('File selected:', filePath);

        setLoadingMessage('Loading video...');
        const metadata = await window.electron.getVideoMetadata(filePath);
        console.log('Video metadata:', metadata);

        if (onFileSelected) {
          onFileSelected({
            path: filePath,
            metadata: metadata
          });
        }
      } else {
        console.log('No file selected');
      }
    } catch (error: any) {
      console.error('Error importing file:', error);
      if (onFileSelected) {
        onFileSelected({
          path: '',
          metadata: {} as VideoMetadata,
          error: error.message || 'Failed to import video file'
        });
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('Loading...');
    }
  };

  // Screen recording functionality
  const startScreenRecording = async () => {
    try {
      setError(null);
      setRecordingMode('screen');

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
    } catch (err: any) {
      console.error('Error fetching sources:', err);

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

  // Webcam recording functionality
  const startWebcamRecording = async () => {
    try {
      setError(null);
      setRecordingMode('webcam');

      if (window.electron.checkCameraPermission) {
        const permissionStatus = await window.electron.checkCameraPermission();
        console.log('Camera permission status:', permissionStatus);

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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        } as any,
        audio: true
      });

      streamRef.current = stream;
      console.log('Got webcam stream');

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

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
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

  // PiP recording functionality (screen + webcam)
  const startPiPRecording = async () => {
    try {
      setError(null);
      setRecordingMode('pip');

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
    } catch (err: any) {
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
    const settingsType = (recordingMode === 'webcam' || recordingMode === 'pip') ? 'camera' : 'screen';
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

  const startRecording = async (source: any) => {
    try {
      setError(null);
      setSelectedSource(source);
      setShowSourcePicker(false);

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
        } as any
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
          } as any,
          audio: true
        });

        webcamStreamRef.current = webcamStream;

        // Create canvas for compositing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

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

        await screenVideo.play();
        await webcamVideo.play();

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

          pipAnimationRef.current = requestAnimationFrame(drawFrame);
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

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError({
        type: 'error',
        message: 'Failed to start recording',
        details: err.message || 'Make sure you granted screen recording permissions. You may need to restart the app after granting permission.'
      });
      setSelectedSource(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
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
      const buffer = await blob.arrayBuffer();
      console.log('Converted to buffer, size:', buffer.byteLength, 'bytes');

      const filePath = await window.electron.saveRecording(buffer);

      if (!filePath) {
        console.log('User cancelled save dialog');
        return;
      }

      console.log('Recording saved to:', filePath);

      if (onRecordingComplete) {
        onRecordingComplete(filePath);
      }

    } catch (err: any) {
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
  };

  const formatTimestamp = (timestamp: number) => {
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

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#1c1c1e]">
      {/* Header */}
      <div className="p-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-black/60 dark:text-white/60" />
          <h3 className="text-black/80 dark:text-white/80">Media Library</h3>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="import" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-black/10 dark:border-white/10 bg-transparent h-10 p-0 px-4">
          <TabsTrigger value="import" className="rounded-md" title="Import">
            <Upload className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="record" className="rounded-md" title="Record">
            <Camera className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="recents" className="rounded-md" title="Recents">
            <Clock className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="flex-1 overflow-auto p-4 mt-0 flex items-center justify-center">
          <div className="w-full space-y-4">
            <div className="text-center space-y-2 mb-6">
              <Video className="h-12 w-12 mx-auto text-black/40 dark:text-white/40" />
              <p className="text-sm text-black/60 dark:text-white/60">
                Import a video file to edit
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? loadingMessage : 'Import Video'}
            </Button>
            <p className="text-xs text-center text-black/40 dark:text-white/40">
              Supports MP4, MOV, WebM, AVI, MKV
            </p>
          </div>
        </TabsContent>

        {/* Record Tab */}
        <TabsContent value="record" className="flex-1 overflow-auto p-4 mt-0">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    {error.message}
                  </p>
                  {error.details && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {error.details}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {error.type === 'permission' && (
                  <Button size="sm" variant="outline" onClick={openSystemPreferences} className="text-xs h-7">
                    Open Settings
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setError(null)} className="text-xs h-7">
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!isRecording && !showSourcePicker && (
            <div className="space-y-3">
              <Button
                onClick={startScreenRecording}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <Video className="h-4 w-4" />
                Record Screen
              </Button>
              <Button
                onClick={startWebcamRecording}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <Camera className="h-4 w-4" />
                Record Webcam
              </Button>
              <Button
                onClick={startPiPRecording}
                className="w-full justify-start gap-2"
                variant="outline"
                title="Record screen with webcam overlay (Picture-in-Picture)"
              >
                <Camera className="h-4 w-4" />
                <Video className="h-4 w-4 -ml-3" />
                Screen + Webcam
              </Button>
            </div>
          )}

          {isRecording && (
            <div className="space-y-4">
              {recordingMode === 'webcam' && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                    Recording {
                      recordingMode === 'webcam' ? 'Webcam' :
                      recordingMode === 'pip' ? 'Screen + Webcam' :
                      'Screen'
                    }: {formatTime(recordingTime)}
                  </span>
                </div>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              </div>
            </div>
          )}

          {showSourcePicker && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Select Screen or Window</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowSourcePicker(false)}>
                  Cancel
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    onClick={() => startRecording(source)}
                    className="p-3 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {source.thumbnail && (
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-16 h-12 object-cover rounded border border-black/10 dark:border-white/10"
                        />
                      )}
                      <span className="text-sm text-black/80 dark:text-white/80 flex-1 truncate">
                        {source.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Recents Tab */}
        <TabsContent value="recents" className="flex-1 overflow-auto p-4 mt-0">
          {recentFiles && recentFiles.length > 0 ? (
            <div className="space-y-2">
              {recentFiles.map((file) => {
                const isActive = currentVideoPath === file.path;
                return (
                  <div
                    key={file.path}
                    onClick={() => onSelectFile(file.path)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    title={file.path}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {file.thumbnail ? (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-16 h-12 object-cover rounded border border-black/10 dark:border-white/10"
                          />
                        ) : (
                          <div className="w-16 h-12 flex items-center justify-center rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                            {isActive ? (
                              <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Video className="h-6 w-6 text-black/40 dark:text-white/40" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-black/80 dark:text-white/80 truncate">
                            {file.name}
                          </p>
                          {isActive && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full flex-shrink-0">
                              Now Playing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-black/40 dark:text-white/40">
                          <span>{formatDuration(file.duration)}</span>
                          <span>•</span>
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatTimestamp(file.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Clock className="h-12 w-12 text-black/20 dark:text-white/20 mb-3" />
              <p className="text-sm text-black/40 dark:text-white/40">
                No recent files
              </p>
              <p className="text-xs text-black/30 dark:text-white/30 mt-1">
                Import or record a video to get started
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
