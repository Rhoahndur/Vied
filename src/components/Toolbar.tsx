import { Download } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState } from "react";

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
}

export function Toolbar({ videoPath, startTime, endTime, duration, clips, disabled }: ToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("mp4");

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

    setIsExporting(true);

    try {
      const outputPath = await window.electron.saveFile(exportFormat);

      if (!outputPath) {
        setIsExporting(false);
        return;
      }

      let result;

      if (clips && clips.length > 0) {
        console.log('Exporting clips:', clips);

        result = await window.electron.exportClips({
          input: videoPath,
          output: outputPath,
          format: exportFormat,
          clips: clips.map(clip => ({
            start: clip.startTime,
            duration: clip.endTime - clip.startTime
          }))
        });
      } else {
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

      {videoPath && (
        <>
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
          </SelectContent>
        </Select>
      </div>

      {!isDefaultTrim && videoPath && (
        <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
          <span>•</span>
          <span>
            Trim: {formatTime(startTime)} → {formatTime(endTime)} ({formatTime(trimDuration)})
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Export Button */}
      <Button
        size="sm"
        className="gap-2"
        onClick={handleExport}
        disabled={disabled || isExporting || !videoPath}
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
    </div>
  );
}
