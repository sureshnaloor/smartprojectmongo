import {
  ClipboardCheck,
  FileBarChart,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Mail,
  MessageSquare,
  Settings2,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FileDocumentsConfig } from "./types";

export interface DocumentTabDef {
  key: string;
  label: string;
  subtitle: string;
  match: string;
  href: (projectId: number) => string;
  Icon: LucideIcon;
}

export const DOCUMENT_TABS: DocumentTabDef[] = [
  { key: "drawings", label: "Drawings", subtitle: "CAD & PDF files", match: "/project-docs/ProjectDrawings", href: (id) => `/projects/${id}/project-docs/ProjectDrawings`, Icon: FileImage },
  { key: "boq", label: "BOQ", subtitle: "Bill of quantities", match: "/project-docs/ProjectBOQ", href: (id) => `/projects/${id}/project-docs/ProjectBOQ`, Icon: FileSpreadsheet },
  { key: "scope", label: "Scope Doc", subtitle: "Project scope", match: "/project-docs/ProjectScope", href: (id) => `/projects/${id}/project-docs/ProjectScope`, Icon: FileText },
  { key: "equipment", label: "Equipment", subtitle: "Equipment list", match: "/project-docs/EquipmentCatalogue", href: (id) => `/projects/${id}/project-docs/EquipmentCatalogue`, Icon: Settings2 },
  { key: "client", label: "Client", subtitle: "Incoming/outgoing", match: "/project-docs/ClientCorrespondence", href: (id) => `/projects/${id}/project-docs/ClientCorrespondence`, Icon: Mail },
  { key: "supplier", label: "Supplier", subtitle: "Vendor comms", match: "/project-docs/SupplierCorrespondence", href: (id) => `/projects/${id}/project-docs/SupplierCorrespondence`, Icon: Truck },
  { key: "subcontract", label: "Subcontract", subtitle: "Subcontractor", match: "/project-docs/SubcontractCorrespondence", href: (id) => `/projects/${id}/project-docs/SubcontractCorrespondence`, Icon: Users },
  { key: "internal", label: "Internal", subtitle: "Team comms", match: "/project-docs/InternalCorrespondence", href: (id) => `/projects/${id}/project-docs/InternalCorrespondence`, Icon: MessageSquare },
  { key: "rfi", label: "RFI", subtitle: "Inspection requests", match: "/project-docs/RequestForInspection", href: (id) => `/projects/${id}/project-docs/RequestForInspection`, Icon: ClipboardCheck },
  { key: "itp", label: "ITP", subtitle: "Test plans & reports", match: "/project-docs/ITPAndReports", href: (id) => `/projects/${id}/project-docs/ITPAndReports`, Icon: FileBarChart },
  { key: "others", label: "Others", subtitle: "Misc files", match: "/project-docs/OtherDocuments", href: (id) => `/projects/${id}/project-docs/OtherDocuments`, Icon: FolderOpen },
];

export const DRAWINGS_CONFIG: FileDocumentsConfig = {
  tabKey: "drawings",
  apiSegment: "drawings",
  nameFormField: "drawingName",
  nameInfoKeys: ["drawingName", "drawingname"],
  title: "Project Drawings",
  subtitle: "Manage and view your project CAD and PDF files",
  uploadTitle: "Upload New Drawing",
  namePlaceholder: "Drawing Name (e.g., Ground Floor Plan)",
  accept: ".pdf,.dwg,.dxf",
  supportedFormats: "PDF, DWG, DXF",
  emptyTitle: "No drawings uploaded yet",
  emptyDescription: "Upload a PDF or CAD file to get started. Drag and drop files directly or use the upload form above.",
  emptyCta: "Upload First Drawing",
  categoryLabel: "Drawing",
  downloadMode: "fileName",
};

export const BOQ_CONFIG: FileDocumentsConfig = {
  ...DRAWINGS_CONFIG,
  tabKey: "boq",
  apiSegment: "boq",
  nameFormField: "boqName",
  nameInfoKeys: ["boqName", "boqname"],
  title: "Project BOQ",
  subtitle: "Manage bill of quantities documents and revisions",
  uploadTitle: "Upload New BOQ",
  namePlaceholder: "BOQ Name (e.g., Main Contract BOQ Rev A)",
  accept: ".pdf,.xls,.xlsx,.csv",
  supportedFormats: "PDF, XLS, XLSX, CSV",
  emptyTitle: "No BOQ documents yet",
  emptyDescription: "Upload your bill of quantities to track revisions and versions.",
  emptyCta: "Upload First BOQ",
  categoryLabel: "BOQ",
  showRevision: true,
};

export const SCOPE_CONFIG: FileDocumentsConfig = {
  ...DRAWINGS_CONFIG,
  tabKey: "scope",
  apiSegment: "scope",
  nameFormField: "scopeName",
  nameInfoKeys: ["scopeName", "scopename"],
  title: "Scope Doc (PTS)",
  subtitle: "Project technical specification and scope documents",
  uploadTitle: "Upload Scope Document",
  namePlaceholder: "Document Name (e.g., PTS Rev 1)",
  accept: ".pdf,.doc,.docx",
  supportedFormats: "PDF, DOC, DOCX",
  emptyTitle: "No scope documents yet",
  emptyDescription: "Upload project scope or PTS documents to share with the team.",
  emptyCta: "Upload First Document",
  categoryLabel: "Scope",
};

export const EQUIPMENT_CONFIG: FileDocumentsConfig = {
  ...DRAWINGS_CONFIG,
  tabKey: "equipment",
  apiSegment: "equipment-catalogue",
  nameFormField: "docName",
  nameInfoKeys: ["docName", "docname"],
  title: "Equipment Catalogue",
  subtitle: "Equipment lists, datasheets, and catalogue files",
  uploadTitle: "Upload Equipment Document",
  namePlaceholder: "Document Name (e.g., Pump Schedule)",
  accept: ".pdf,.xls,.xlsx,.doc,.docx",
  supportedFormats: "PDF, XLS, XLSX, DOC",
  emptyTitle: "No equipment documents yet",
  emptyDescription: "Upload equipment catalogues and datasheets for the project.",
  emptyCta: "Upload First Document",
  categoryLabel: "Equipment",
  downloadMode: "fileId",
};

export const RFI_CONFIG: FileDocumentsConfig = {
  ...DRAWINGS_CONFIG,
  tabKey: "rfi",
  apiSegment: "request-for-inspection",
  nameFormField: "rfiName",
  nameInfoKeys: ["rfiName", "rfiname"],
  title: "Request for Inspection",
  subtitle: "Inspection requests and approval documentation",
  uploadTitle: "Upload RFI Document",
  namePlaceholder: "RFI Reference (e.g., RFI-001 Foundation)",
  accept: ".pdf,.doc,.docx,.xls,.xlsx",
  supportedFormats: "PDF, DOC, XLS",
  emptyTitle: "No RFI documents yet",
  emptyDescription: "Upload inspection requests and related documentation.",
  emptyCta: "Upload First RFI",
  categoryLabel: "RFI",
  downloadMode: "fileId",
};

export const ITP_CONFIG: FileDocumentsConfig = {
  ...DRAWINGS_CONFIG,
  tabKey: "itp",
  apiSegment: "itp-and-reports",
  nameFormField: "docName",
  nameInfoKeys: ["docName", "docname"],
  title: "ITP & Reports",
  subtitle: "Inspection test plans and test reports",
  uploadTitle: "Upload ITP / Report",
  namePlaceholder: "Document Name (e.g., Concrete ITP)",
  accept: ".pdf,.doc,.docx,.xls,.xlsx",
  supportedFormats: "PDF, DOC, XLS",
  emptyTitle: "No ITP or reports yet",
  emptyDescription: "Upload inspection test plans and test result reports.",
  emptyCta: "Upload First Document",
  categoryLabel: "ITP",
  downloadMode: "fileId",
};

export const OTHER_DOCS_CONFIG: FileDocumentsConfig = {
  ...DRAWINGS_CONFIG,
  tabKey: "others",
  apiSegment: "other-documents",
  nameFormField: "docName",
  nameInfoKeys: ["docName", "docname"],
  title: "Other Documents",
  subtitle: "Miscellaneous project files and references",
  uploadTitle: "Upload Document",
  namePlaceholder: "Document Name",
  accept: ".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg",
  supportedFormats: "PDF, Office, CAD, Images",
  emptyTitle: "No documents uploaded yet",
  emptyDescription: "Upload any other project-related files here.",
  emptyCta: "Upload First Document",
  categoryLabel: "Other",
  downloadMode: "fileId",
};

export function getDisplayName(fullPath: string): string {
  const parts = fullPath.split("/");
  const fileNameWithTimestamp = parts[parts.length - 1];
  return fileNameWithTimestamp.replace(/^\d+_/, "");
}

export function getFileInfoName(file: { fileInfo?: Record<string, string | undefined> }, keys: string[]): string {
  if (!file.fileInfo) return "";
  for (const k of keys) {
    const v = file.fileInfo[k];
    if (v) return v;
  }
  return "";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

export function isCad(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".dwg") || lower.endsWith(".dxf");
}

export function isImage(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => lower.endsWith(ext));
}

export function fileTypeLabel(fileName: string): string {
  if (isPdf(fileName)) return "PDF";
  if (isCad(fileName)) return "CAD";
  if (isImage(fileName)) return "Image";
  const ext = fileName.split(".").pop()?.toUpperCase();
  return ext || "File";
}
