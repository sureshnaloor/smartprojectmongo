import { useRef, useState } from "react";
import { CloudUpload, FileIcon, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "success" | "error";

interface DocumentUploadAreaProps {
  title: string;
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFileSelect: (file: File) => void;
  namePlaceholder: string;
  accept: string;
  supportedFormats: string;
  uploading: boolean;
  uploadState: UploadState;
  uploadFileName?: string;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function DocumentUploadArea({
  title,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onFileSelect,
  accept,
  supportedFormats,
  namePlaceholder,
  uploading,
  uploadState,
  uploadFileName,
  onCancel,
  onRetry,
}: DocumentUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={cn(
        "doc-upload-drag mb-6 rounded-[var(--radius-md)] border-2 border-dashed bg-[var(--bg-white)] p-8",
        dragOver && "doc-upload-drag-over"
      )}
      style={{ borderColor: "rgba(148, 163, 184, 0.25)" }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <h3 className="kanban-heading-lg text-[var(--text-primary)]">{title}</h3>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          className="w-full lg:w-[300px] h-9"
        />
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Description (Optional)"
          className="w-full lg:w-[300px] h-9"
        />
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          className="gap-1.5 bg-[var(--copper-600)] hover:bg-[var(--copper-400)] shrink-0"
          style={{ boxShadow: "var(--shadow-copper)" }}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          Select File to Upload
        </Button>
      </div>

      <p className="mt-3 flex items-center gap-1.5 kanban-body-sm text-[var(--text-muted)]">
        <FileIcon className="h-3.5 w-3.5" />
        Supported formats: {supportedFormats}
      </p>

      {uploadState === "uploading" && uploadFileName && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="kanban-body-sm text-[var(--text-primary)] mb-1 truncate">{uploadFileName}</p>
            <div className="h-2 rounded-full bg-[var(--bg-warm-gray)] overflow-hidden">
              <div className="h-full w-2/3 rounded-full animate-pulse" style={{ backgroundColor: "var(--copper-500)" }} />
            </div>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {uploadState === "success" && (
        <p className="mt-3 flex items-center gap-1.5 kanban-body-sm" style={{ color: "var(--status-success)" }}>
          <CheckCircle2 className="h-4 w-4" />
          Uploaded
        </p>
      )}

      {uploadState === "error" && (
        <p className="mt-3 flex items-center gap-2 kanban-body-sm" style={{ color: "var(--status-danger)" }}>
          <AlertCircle className="h-4 w-4" />
          Upload failed.
          {onRetry && (
            <button type="button" className="underline" onClick={onRetry}>
              Retry
            </button>
          )}
        </p>
      )}
    </div>
  );
}
