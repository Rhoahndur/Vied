import { Download, Film, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { useState, useEffect } from "react";

interface Clip {
  id: number;
  startTime: number;
  endTime: number;
  videoPath: string;
}

interface ToolbarProps {
  videoPath: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  clips: Clip[];
  disabled: boolean;
  editorMode: boolean;
  onToggleEditorMode: () => void;
}

export function Toolbar({ videoPath, startTime, endTime, duration, clips, disabled, editorMode, onToggleEditorMode }: ToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportProgress, setExportProgress] = useState(0);

  // Funny progress messages
  const getProgressMessage = (percent: number) => {
    if (percent < 10) return "Warming up the pixel forge...";
    if (percent < 20) return "Rounding up some digital elves...";
    if (percent < 30) return "Polishing the frames...";
    if (percent < 40) return "Teaching pixels to dance...";
    if (percent < 50) return "Oooh this is a big 'un, onboarding some elves to help...";
    if (percent < 60) return "Convincing the codec gremlins...";
    if (percent < 70) return "Wrangling stubborn megabytes...";
    if (percent < 80) return "Almost there, just trimming the excess...";
    if (percent < 90) return "Wrapping it up with a bow...";
    if (percent < 100) return "Final touches, making it shine...";
    return "Done! The elves have clocked out.";
  };

  // Listen for export progress updates
  useEffect(() => {
    const cleanup = window.electron.onExportProgress((data: { percent: number }) => {
      setExportProgress(data.percent);
    });

    return cleanup;
  }, []);

  const formatTime = (seconds: number) => {
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

    console.log('[Toolbar] handleExport called, exportFormat:', exportFormat);
    setIsExporting(true);
    setExportProgress(0);

    try {
      console.log('[Toolbar] Calling saveFile with format:', exportFormat);
      const outputPath = await window.electron.saveFile(exportFormat);

      if (!outputPath) {
        setIsExporting(false);
        return;
      }

      let result;

      // Advanced: Export multiple clips if they exist
      if (clips && clips.length > 0) {
        console.log('Exporting clips:', clips);

        result = await window.electron.exportClips({
          output: outputPath,
          format: exportFormat,
          clips: clips.map(clip => ({
            input: clip.videoPath,  // Each clip has its own source video
            start: 0,  // Always start from beginning of each clip's video
            duration: clip.endTime - clip.startTime  // Duration of the clip on timeline
          }))
        });
      } else {
        // Simple trim export
        const trimDuration = endTime - startTime;

        console.log('Export params:', {
          input: videoPath,
          output: outputPath,
          format: exportFormat,
          start: startTime,
          duration: trimDuration
        });

        result = await window.electron.exportVideo({
          input: videoPath,
          output: outputPath,
          format: exportFormat,
          start: startTime,
          duration: trimDuration
        });
      }

      if (result.success) {
        alert('✓ Export complete!');
      } else {
        alert(`Export failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Export error: ${error.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const trimDuration = endTime - startTime;
  const isDefaultTrim = startTime === 0 && endTime === duration;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] dark:bg-[#1c1c1e] border-b border-black/10 dark:border-white/10">
      {/* Branding */}
      <div className="flex items-center gap-2 mr-4">
        <h1 className="text-lg font-semibold">Vied</h1>
        <span className="text-xs text-black/40 dark:text-white/40">v1.0.0</span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Welcome Message when no video loaded */}
      {!videoPath && (
        <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
          <span>👋</span>
          <span>Record your screen, import a video, or drag & drop a file to get started</span>
          <span className="text-xs text-black/40 dark:text-white/40 ml-2">
            (Trim: <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-xs">I</kbd> = IN • <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-xs">O</kbd> = OUT)
          </span>
        </div>
      )}

      {!isDefaultTrim && videoPath && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
            <span>•</span>
            <span>
              Trim: {formatTime(startTime)} → {formatTime(endTime)} ({formatTime(trimDuration)})
            </span>
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Mode Toggle - QuickTime style */}
      {videoPath && (
        <>
          <Button
            size="sm"
            variant={editorMode ? "default" : "outline"}
            className="gap-2"
            onClick={onToggleEditorMode}
            title={editorMode ? "Switch to Viewer Mode" : "Switch to Editor Mode"}
          >
            {editorMode ? (
              <>
                <Film className="h-4 w-4" />
                Editor
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Viewer
              </>
            )}
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Format Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/60 dark:text-white/60">Format:</span>
        <Select value={exportFormat} onValueChange={setExportFormat} disabled={isExporting}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4</SelectItem>
            <SelectItem value="mov">MOV</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
            <SelectItem value="gif">GIF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Export Button */}
      <div className="flex flex-col gap-1.5">
        <Button
          size="sm"
          className="gap-2"
          onClick={handleExport}
          disabled={disabled || isExporting || !videoPath}
        >
          <Download className="h-4 w-4" />
          {isExporting ? `${exportProgress}%` : 'Export'}
        </Button>
        {isExporting && exportProgress > 0 && (
          <>
            <Progress value={exportProgress} className="w-full h-1.5" />
            <div className="text-xs text-black/60 dark:text-white/60 italic text-center px-2">
              {getProgressMessage(exportProgress)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
