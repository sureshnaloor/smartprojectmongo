import { Download, Eye, MoreHorizontal, Trash2, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  fileTypeLabel,
  getDisplayName,
  getFileInfoName,
} from "./constants";
import type { DocumentFile, FileDocumentsConfig } from "./types";

interface DocumentListViewProps {
  files: DocumentFile[];
  config: FileDocumentsConfig;
  selectedId: string | null;
  onSelect: (file: DocumentFile) => void;
  onPreview: (file: DocumentFile) => void;
  onDownload: (file: DocumentFile) => void;
  onDelete: (file: DocumentFile) => void;
}

export function DocumentListView({
  files,
  config,
  selectedId,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
}: DocumentListViewProps) {
  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-md)] border bg-[var(--bg-white)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <Table>
        <TableHeader>
          <TableRow style={{ backgroundColor: "var(--bg-warm-gray)" }}>
            <TableHead className="kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Name</TableHead>
            <TableHead className="w-[120px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Category</TableHead>
            <TableHead className="w-[100px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Size</TableHead>
            <TableHead className="w-[160px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Uploaded</TableHead>
            {config.showRevision && (
              <TableHead className="w-[80px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Version</TableHead>
            )}
            <TableHead className="w-[120px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const displayName =
              getFileInfoName(file, config.nameInfoKeys) || getDisplayName(file.fileName);
            const uploadedBy =
              file.fileInfo?.uploadedBy || file.fileInfo?.uploadedby || "Unknown";
            const description = file.fileInfo?.description || "";
            const selected = selectedId === file.fileId;

            return (
              <TableRow
                key={file.fileId}
                className={cn("h-16 cursor-pointer", selected && "border-l-[3px]")}
                style={{
                  backgroundColor: selected ? "var(--copper-50)" : undefined,
                  borderLeftColor: selected ? "var(--copper-500)" : undefined,
                }}
                onClick={() => onSelect(file)}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "rgba(253, 246, 237, 0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "";
                }}
              >
                <TableCell>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                    <div className="min-w-0">
                      <p className="kanban-body-md text-[var(--text-primary)] truncate">{displayName}</p>
                      {description && (
                        <p className="kanban-body-sm text-[var(--text-secondary)] truncate">{description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="kanban-caption">
                    {config.categoryLabel}
                  </Badge>
                </TableCell>
                <TableCell className="kanban-body-sm font-mono text-[var(--text-secondary)]">
                  {formatFileSize(file.contentLength)}
                </TableCell>
                <TableCell>
                  <p className="kanban-body-sm text-[var(--text-secondary)]">
                    {new Date(file.uploadTimestamp).toLocaleDateString()}
                  </p>
                  <span className="flex items-center gap-1 kanban-caption text-[var(--text-muted)]">
                    <User className="h-3 w-3" />
                    {uploadedBy}
                  </span>
                </TableCell>
                {config.showRevision && (
                  <TableCell className="kanban-body-sm font-mono text-[var(--text-secondary)]">v1</TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(file)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(file)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                      <MoreHorizontal className="h-3.5 w-3.5" />
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
