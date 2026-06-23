export interface DocumentFile {
  fileId: string;
  fileName: string;
  contentLength: number;
  uploadTimestamp: number;
  contentType?: string;
  fileInfo?: Record<string, string | undefined>;
}

export type DocumentViewMode = "grid" | "list";

export type DownloadMode = "fileName" | "fileId";

export interface FileDocumentsConfig {
  tabKey: string;
  apiSegment: string;
  nameFormField: string;
  nameInfoKeys: string[];
  title: string;
  subtitle: string;
  uploadTitle: string;
  namePlaceholder: string;
  accept: string;
  supportedFormats: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyCta: string;
  categoryLabel: string;
  downloadMode: DownloadMode;
  showRevision?: boolean;
}
