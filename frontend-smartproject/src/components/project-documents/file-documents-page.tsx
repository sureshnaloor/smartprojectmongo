import { useState, useMemo, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LayoutGrid, List, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { DocumentLayout } from "./document-layout";
import { DocumentCategoryHeader } from "./document-category-header";
import { DocumentUploadArea } from "./document-upload-area";
import { DocumentFilters } from "./document-filters";
import { DocumentGrid, DocumentEmptyState } from "./document-grid";
import { DocumentListView } from "./document-list-view";
import { DocumentPreviewDrawer } from "./document-preview-drawer";
import { getDisplayName, getFileInfoName, isCad, isImage, isPdf } from "./constants";
import type { DocumentFile, DocumentViewMode, FileDocumentsConfig } from "./types";

function matchesFileType(fileName: string, filter: string): boolean {
  if (filter === "all") return true;
  const lower = fileName.toLowerCase();
  switch (filter) {
    case "pdf":
      return isPdf(fileName);
    case "cad":
      return isCad(fileName);
    case "doc":
      return lower.endsWith(".doc") || lower.endsWith(".docx");
    case "xls":
      return lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv");
    case "image":
      return isImage(fileName);
    default:
      return true;
  }
}

export function FileDocumentsPage({ config }: { config: FileDocumentsConfig }) {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMobile();
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadFileName, setUploadFileName] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);

  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("all");
  const [viewMode, setViewMode] = useState<DocumentViewMode>(isMobile ? "list" : "grid");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: project } = useQuery<{ name: string }>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: files = [], isLoading } = useQuery<DocumentFile[]>({
    queryKey: [`/api/projects/${projectId}/${config.apiSegment}`],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      const displayName = getFileInfoName(f, config.nameInfoKeys) || getDisplayName(f.fileName);
      const uploadedBy = f.fileInfo?.uploadedBy || f.fileInfo?.uploadedby || "";
      const desc = f.fileInfo?.description || "";
      const matchSearch =
        !q ||
        displayName.toLowerCase().includes(q) ||
        uploadedBy.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q);
      return matchSearch && matchesFileType(f.fileName, fileType);
    });
  }, [files, search, fileType, config.nameInfoKeys]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(config.nameFormField, name || file.name);
      formData.append("description", description);
      const res = await fetch(`/api/projects/${projectId}/${config.apiSegment}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/${config.apiSegment}`] });
      toast({ title: "Uploaded", description: "Document uploaded successfully" });
      setUploading(false);
      setUploadState("success");
      setName("");
      setDescription("");
      setTimeout(() => setUploadState("idle"), 2000);
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      setUploading(false);
      setUploadState("error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
      const encoded = encodeURIComponent(fileName);
      const res = await apiRequest(
        "DELETE",
        `/api/projects/${projectId}/${config.apiSegment}?fileId=${fileId}&fileName=${encoded}`
      );
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/${config.apiSegment}`] });
      toast({ title: "Deleted", description: "Document removed" });
      setPreviewOpen(false);
      setPreviewFile(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete", variant: "destructive" }),
  });

  const getDownloadUrl = async (file: DocumentFile): Promise<string | null> => {
    if (config.downloadMode === "fileId") {
      return `/api/projects/${projectId}/${config.apiSegment}/download?fileId=${file.fileId}`;
    }
    const encoded = encodeURIComponent(file.fileName);
    const res = await apiRequest(
      "GET",
      `/api/projects/${projectId}/${config.apiSegment}/foo/download?fileName=${encoded}`
    );
    const data = await res.json();
    return data.url ?? null;
  };

  const handleDownload = async (file: DocumentFile) => {
    try {
      const url = await getDownloadUrl(file);
      if (url) window.open(url, "_blank");
    } catch {
      toast({ title: "Error", description: "Failed to download", variant: "destructive" });
    }
  };

  const handlePreview = async (file: DocumentFile) => {
    setPreviewFile(file);
    setSelectedId(file.fileId);
    setPreviewOpen(true);
    if (isPdf(file.fileName) || isImage(file.fileName)) {
      try {
        const url = await getDownloadUrl(file);
        setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileSelect = (file: File) => {
    setLastFile(file);
    setUploadFileName(file.name);
    setUploading(true);
    setUploadState("uploading");
    uploadMutation.mutate(file);
  };

  const scrollToUpload = () => uploadAreaRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <DocumentLayout activeTabKey={config.tabKey}>
      <div className="px-6 pb-8 lg:px-8 pt-6">
        <DocumentCategoryHeader
          title={config.title}
          subtitle={config.subtitle}
          projectName={project?.name}
        />

        <div ref={uploadAreaRef}>
          <DocumentUploadArea
            title={config.uploadTitle}
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onFileSelect={handleFileSelect}
            accept={config.accept}
            supportedFormats={config.supportedFormats}
            namePlaceholder={config.namePlaceholder}
            uploading={uploading}
            uploadState={uploadState}
            uploadFileName={uploadFileName}
            onRetry={() => lastFile && handleFileSelect(lastFile)}
          />
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <DocumentFilters
              search={search}
              onSearchChange={setSearch}
              fileType={fileType}
              onFileTypeChange={setFileType}
              onClear={() => {
                setSearch("");
                setFileType("all");
              }}
            />
          </div>
          {!isMobile && (
            <div className="flex shrink-0 rounded-[var(--radius-md)] border p-0.5" style={{ borderColor: "var(--border-subtle)" }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", viewMode === "grid" && "bg-[var(--bg-warm-gray)]")}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", viewMode === "list" && "bg-[var(--bg-warm-gray)]")}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <DocumentEmptyState
            title={config.emptyTitle}
            description={config.emptyDescription}
            cta={config.emptyCta}
            onUpload={scrollToUpload}
          />
        ) : viewMode === "grid" && !isMobile ? (
          <DocumentGrid
            files={filtered}
            config={config}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={(f) => {
              if (confirm("Delete this document?")) {
                deleteMutation.mutate({ fileId: f.fileId, fileName: f.fileName });
              }
            }}
          />
        ) : (
          <DocumentListView
            files={filtered}
            config={config}
            selectedId={selectedId}
            onSelect={(f) => {
              setSelectedId(f.fileId);
              handlePreview(f);
            }}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={(f) => {
              if (confirm("Delete this document?")) {
                deleteMutation.mutate({ fileId: f.fileId, fileName: f.fileName });
              }
            }}
          />
        )}

        <DocumentPreviewDrawer
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={previewFile}
          previewUrl={previewUrl}
          config={config}
          onDownload={() => previewFile && handleDownload(previewFile)}
          onDelete={() => {
            if (previewFile && confirm("Delete this document?")) {
              deleteMutation.mutate({ fileId: previewFile.fileId, fileName: previewFile.fileName });
            }
          }}
        />
      </div>
    </DocumentLayout>
  );
}
