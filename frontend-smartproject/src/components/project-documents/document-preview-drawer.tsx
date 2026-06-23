import { Download, Share2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatFileSize,
  fileTypeLabel,
  getDisplayName,
  getFileInfoName,
  isCad,
  isImage,
  isPdf,
} from "./constants";
import type { DocumentFile, FileDocumentsConfig } from "./types";

interface DocumentPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: DocumentFile | null;
  previewUrl: string | null;
  config: FileDocumentsConfig;
  onDownload: () => void;
  onDelete: () => void;
}

export function DocumentPreviewDrawer({
  open,
  onOpenChange,
  file,
  previewUrl,
  config,
  onDownload,
  onDelete,
}: DocumentPreviewDrawerProps) {
  if (!file) return null;

  const displayName =
    getFileInfoName(file, config.nameInfoKeys) || getDisplayName(file.fileName);
  const uploadedBy = file.fileInfo?.uploadedBy || file.fileInfo?.uploadedby || "Unknown";
  const description = file.fileInfo?.description || "—";
  const type = fileTypeLabel(file.fileName);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto p-0">
        <SheetHeader className="border-b px-6 py-5 text-left" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-start gap-3 pr-8">
            <SheetTitle className="kanban-heading-lg flex-1 truncate">{displayName}</SheetTitle>
            <Badge variant="secondary">{type}</Badge>
          </div>
        </SheetHeader>

        <div
          className="flex items-center justify-center"
          style={{ height: "calc(100vh - 280px)", backgroundColor: "var(--bg-warm-gray)" }}
        >
          {previewUrl && isPdf(file.fileName) && (
            <iframe src={previewUrl} className="h-full w-full border-0" title="PDF Preview" />
          )}
          {previewUrl && isImage(file.fileName) && (
            <img src={previewUrl} alt={displayName} className="max-h-full max-w-full object-contain" />
          )}
          {isCad(file.fileName) && (
            <div className="text-center p-8">
              <p className="kanban-body-md text-[var(--text-secondary)] mb-4">
                CAD files require a desktop viewer. Download to open in your CAD application.
              </p>
              <Button variant="outline" onClick={onDownload}>
                Open in CAD viewer (download)
              </Button>
            </div>
          )}
          {!previewUrl && !isCad(file.fileName) && (
            <p className="kanban-body-sm text-[var(--text-muted)]">Preview not available for this file type</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          {[
            { label: "Uploaded by", value: uploadedBy },
            { label: "Date", value: new Date(file.uploadTimestamp).toLocaleString() },
            { label: "Size", value: formatFileSize(file.contentLength) },
            { label: "Version", value: "v1" },
            { label: "Category", value: config.categoryLabel },
            { label: "Description", value: description },
          ].map((item) => (
            <div key={item.label}>
              <Label className="kanban-caption text-[var(--text-muted)]">{item.label}</Label>
              <p className="kanban-body-sm text-[var(--text-primary)] mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        <div
          className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-[var(--bg-white)] px-6 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Button variant="outline" className="gap-1" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" className="gap-1" disabled>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" className="gap-1" disabled>
            <Upload className="h-4 w-4" />
            Replace
          </Button>
          <Button
            variant="ghost"
            className="gap-1 text-[var(--status-danger)] hover:text-[var(--status-danger)]"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
