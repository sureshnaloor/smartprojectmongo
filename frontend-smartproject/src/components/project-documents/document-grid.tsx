import { Download, Eye, Share2, Trash2, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  getDisplayName,
  getFileInfoName,
  isCad,
  isPdf,
} from "./constants";
import type { DocumentFile, FileDocumentsConfig } from "./types";

interface DocumentGridProps {
  files: DocumentFile[];
  config: FileDocumentsConfig;
  onPreview: (file: DocumentFile) => void;
  onDownload: (file: DocumentFile) => void;
  onDelete: (file: DocumentFile) => void;
}

export function DocumentGrid({ files, config, onPreview, onDownload, onDelete }: DocumentGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map((file, i) => {
        const displayName =
          getFileInfoName(file, config.nameInfoKeys) || getDisplayName(file.fileName);
        const uploadedBy =
          file.fileInfo?.uploadedBy || file.fileInfo?.uploadedby || "Unknown";
        const description = file.fileInfo?.description || "";

        return (
          <div
            key={file.fileId}
            className="doc-card-enter group overflow-hidden rounded-[var(--radius-md)] border bg-[var(--bg-white)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] cursor-pointer"
            style={{ borderColor: "var(--border-subtle)", animationDelay: `${i * 50}ms` }}
            onClick={() => onPreview(file)}
          >
            <div
              className="relative flex h-40 items-center justify-center"
              style={{ backgroundColor: "var(--bg-warm-gray)" }}
            >
              {isPdf(file.fileName) ? (
                <FileText className="h-12 w-12 text-red-500" />
              ) : isCad(file.fileName) ? (
                <FileText className="h-12 w-12 text-blue-600" />
              ) : (
                <FileText className="h-12 w-12 text-[var(--text-muted)]" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(file);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            </div>
            <div className="p-4">
              <p className="kanban-body-md font-medium text-[var(--text-primary)] truncate">{displayName}</p>
              {description && (
                <p className="kanban-body-sm text-[var(--text-secondary)] line-clamp-2 mt-1 min-h-[2.5rem]">
                  {description}
                </p>
              )}
              <p className="kanban-caption text-[var(--text-muted)] mt-2">
                {formatFileSize(file.contentLength)} · {new Date(file.uploadTimestamp).toLocaleDateString()}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 kanban-caption text-[var(--text-muted)]">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--bg-warm-gray)" }}
                  >
                    <User className="h-3 w-3" />
                  </span>
                  {uploadedBy}
                </span>
                <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(file)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-[var(--status-danger)]"
                    onClick={() => onDelete(file)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DocumentEmptyStateProps {
  title: string;
  description: string;
  cta: string;
  onUpload: () => void;
}

export function DocumentEmptyState({ title, description, cta, onUpload }: DocumentEmptyStateProps) {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center rounded-[var(--radius-md)] border bg-[var(--bg-white)] px-6 py-12 text-center"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className="mb-5 flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-dashed"
        style={{ backgroundColor: "var(--bg-warm-gray)", borderColor: "rgba(148, 163, 184, 0.25)" }}
      >
        <FileText className="h-14 w-14 text-[var(--text-muted)] opacity-30" />
      </div>
      <h3 className="kanban-heading-md text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="kanban-body-sm text-[var(--text-secondary)] max-w-md mb-6">{description}</p>
      <Button
        onClick={onUpload}
        className="gap-1.5 bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
        style={{ boxShadow: "var(--shadow-copper)" }}
      >
        {cta}
      </Button>
    </div>
  );
}
