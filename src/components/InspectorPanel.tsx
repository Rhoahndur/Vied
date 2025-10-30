import { Settings2, Scissors, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, useEffect } from "react";

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
  hasAudio: boolean;
}

interface InspectorPanelProps {
  videoMetadata: VideoMetadata | null;
  videoPath: string | null;
  currentTime: number;
  duration: number;
  startTime: number;
  endTime: number;
  onSetStart: (time: number) => void;
  onSetEnd: (time: number) => void;
  onReset: () => void;
  onSplit: () => void;
}

export function InspectorPanel({
  videoMetadata,
  videoPath,
  currentTime,
  duration,
  startTime,
  endTime,
  onSetStart,
  onSetEnd,
  onReset,
  onSplit
}: InspectorPanelProps) {
  const [startInput, setStartInput] = useState('0');
  const [endInput, setEndInput] = useState('0');

  useEffect(() => {
    setStartInput(formatTimeForInput(startTime));
  }, [startTime]);

  useEffect(() => {
    setEndInput(formatTimeForInput(endTime));
  }, [endTime]);

  const formatTimeForInput = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0';
    return seconds.toFixed(2);
  };

  const formatTimeDisplay = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const handleSetStart = () => {
    if (currentTime < endTime) {
      onSetStart(currentTime);
    }
  };

  const handleSetEnd = () => {
    if (currentTime > startTime) {
      onSetEnd(currentTime);
    }
  };

  const handleStartInputSubmit = () => {
    const value = parseFloat(startInput);
    if (isNaN(value) || value < 0 || value >= endTime) {
      setStartInput(formatTimeForInput(startTime));
      return;
    }
    onSetStart(value);
  };

  const handleEndInputSubmit = () => {
    const value = parseFloat(endInput);
    if (isNaN(value) || value > duration || value <= startTime) {
      setEndInput(formatTimeForInput(endTime));
      return;
    }
    onSetEnd(value);
  };

  const trimDuration = endTime - startTime;
  const isDefaultTrim = startTime === 0 && endTime === duration;

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#1c1c1e] border-l border-black/10 dark:border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-black/60 dark:text-white/60" />
          <h3 className="text-black/80 dark:text-white/80">Inspector</h3>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="properties" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-black/10 dark:border-white/10 bg-transparent h-10 p-0 px-4">
          <TabsTrigger value="properties" className="rounded-md text-xs">
            Properties
          </TabsTrigger>
          <TabsTrigger value="trim" className="rounded-md text-xs">
            Trim
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="flex-1 overflow-auto p-4 space-y-6 mt-0">
          {videoMetadata ? (
            <div className="space-y-4">
              <h4 className="text-sm text-black/60 dark:text-white/60 font-medium">Video Properties</h4>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">File</span>
                  <span className="text-black/80 dark:text-white/80 font-mono text-xs truncate max-w-[60%]">
                    {videoPath?.split('/').pop()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">Duration</span>
                  <span className="text-black/80 dark:text-white/80 tabular-nums">
                    {formatDuration(videoMetadata.duration)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">Resolution</span>
                  <span className="text-black/80 dark:text-white/80 tabular-nums">
                    {videoMetadata.width}x{videoMetadata.height}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">FPS</span>
                  <span className="text-black/80 dark:text-white/80 tabular-nums">
                    {videoMetadata.fps.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">Codec</span>
                  <span className="text-black/80 dark:text-white/80 font-mono text-xs">
                    {videoMetadata.codec}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">Size</span>
                  <span className="text-black/80 dark:text-white/80 tabular-nums">
                    {formatFileSize(videoMetadata.size)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-black/60 dark:text-white/60">Audio</span>
                  <span className="text-black/80 dark:text-white/80">
                    {videoMetadata.hasAudio ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-black/40 dark:text-white/40 text-sm">
              No video loaded
            </div>
          )}
        </TabsContent>

        <TabsContent value="trim" className="flex-1 overflow-auto p-4 space-y-6 mt-0">
          {duration ? (
            <>
              {/* Set Trim Points */}
              <div className="space-y-4">
                <h4 className="text-sm text-black/60 dark:text-white/60 font-medium">Set Trim Points</h4>

                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleSetStart}
                    disabled={!duration}
                  >
                    Set IN (at {formatTimeDisplay(currentTime)})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleSetEnd}
                    disabled={!duration}
                  >
                    Set OUT (at {formatTimeDisplay(currentTime)})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={onSplit}
                    disabled={!duration || currentTime <= startTime || currentTime >= endTime}
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Split at {formatTimeDisplay(currentTime)}
                  </Button>
                </div>
              </div>

              {/* Manual Entry */}
              <div className="space-y-4">
                <h4 className="text-sm text-black/60 dark:text-white/60 font-medium">Manual Entry (seconds)</h4>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Start Time</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={duration}
                        value={startInput}
                        onChange={(e) => setStartInput(e.target.value)}
                        onBlur={handleStartInputSubmit}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleStartInputSubmit();
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs text-black/40 dark:text-white/40 tabular-nums min-w-[3rem]">
                        {formatTimeDisplay(startTime)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">End Time</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={duration}
                        value={endInput}
                        onChange={(e) => setEndInput(e.target.value)}
                        onBlur={handleEndInputSubmit}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEndInputSubmit();
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs text-black/40 dark:text-white/40 tabular-nums min-w-[3rem]">
                        {formatTimeDisplay(endTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trim Info */}
              <div className="space-y-4">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-black/60 dark:text-white/60">Trim Duration</span>
                    <span className="text-black/80 dark:text-white/80 font-semibold tabular-nums">
                      {formatTimeDisplay(trimDuration)}
                    </span>
                  </div>

                  {!isDefaultTrim && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={onReset}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Full Video
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-black/40 dark:text-white/40 text-sm">
              Load a video to use trim controls
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
