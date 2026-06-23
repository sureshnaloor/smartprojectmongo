import { useRef, useState } from "react";
import { CheckCircle2, CloudUpload, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "materials" | "services";
  onUpload: (rows: Record<string, string>[]) => Promise<{ created: number; errors?: { row: number; message: string }[] }>;
}

const MATERIAL_FIELDS = ["materialCode", "materialDescription", "uom", "materialType", "materialGroup", "baseRate"];
const SERVICE_FIELDS = ["serviceCode", "serviceDescription", "uom", "serviceType", "serviceGroup", "baseRate"];

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
  return { headers, rows };
}

export function BulkUploadModal({ open, onOpenChange, mode, onUpload }: BulkUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);

  const systemFields = mode === "materials" ? MATERIAL_FIELDS : SERVICE_FIELDS;

  const reset = () => {
    setFileName("");
    setHeaders([]);
    setAllRows([]);
    setPreviewRows([]);
    setMapping({});
    setUploading(false);
    setSuccess(null);
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const { headers: h, rows } = parseCsv(text);
      setHeaders(h);
      setAllRows(rows);
      setPreviewRows(rows.slice(0, 5));
      const auto: Record<string, string> = {};
      systemFields.forEach((field) => {
        const match = h.find((col) => col.toLowerCase().replace(/\s/g, "") === field.toLowerCase());
        if (match) auto[field] = match;
      });
      setMapping(auto);
      setSuccess(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setUploading(true);
    try {
      const objects = allRows.map((row) => {
        const obj: Record<string, string> = {};
        systemFields.forEach((field) => {
          const col = mapping[field];
          if (col) {
            const idx = headers.indexOf(col);
            if (idx >= 0) obj[field] = row[idx] ?? "";
          }
        });
        return obj;
      }).filter((obj) => Object.values(obj).some((v) => v.trim()));
      const result = await onUpload(objects);
      setSuccess(result.created);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const header = systemFields.join(",");
    const sample =
      mode === "materials"
        ? "EPC-MAT-00001,Seamless Pipe SCH-40,ea,Piping,Valves,125.90"
        : "EPC-SVC-00001,Installation Service,hr,Mechanical,Fabrication,500.00";
    const blob = new Blob([`${header}\n${sample}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "materials" ? "materials-template.csv" : "services-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="kanban-heading-lg">
            Bulk Upload {mode === "materials" ? "Materials" : "Services"}
          </DialogTitle>
        </DialogHeader>

        {success != null ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-[var(--status-success)]" />
            <p className="kanban-body-md text-[var(--text-primary)]">
              {success} {mode} imported successfully
            </p>
            <Button onClick={() => onOpenChange(false)}>View {mode === "materials" ? "Materials" : "Services"}</Button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 kanban-body-sm font-medium text-[var(--copper-500)]"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </button>

            <div
              className={cn(
                "flex h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-[3px] border-dashed transition-colors",
                dragOver ? "doc-upload-drag-over" : ""
              )}
              style={{ borderColor: "rgba(107, 114, 128, 0.3)" }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) processFile(file);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />
              <CloudUpload className="mb-2 h-12 w-12 text-[var(--text-muted)]" />
              <p className="kanban-body-md text-[var(--text-secondary)]">Drag &amp; drop your CSV file here</p>
              <p className="kanban-body-sm text-[var(--copper-500)]">or click to browse</p>
              <p className="mt-1 kanban-caption text-[var(--text-muted)]">Supports .csv (max 5MB)</p>
            </div>

            {fileName && (
              <p className="kanban-body-sm text-[var(--text-secondary)]">
                Selected: <span className="font-medium">{fileName}</span>
              </p>
            )}

            {headers.length > 0 && (
              <div className="max-h-48 overflow-auto rounded border border-[var(--border-subtle)]">
                <table className="w-full text-left kanban-caption">
                  <thead className="bg-[var(--bg-cream)]">
                    <tr>
                      {systemFields.map((field) => (
                        <th key={field} className="p-2 font-medium">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--border-subtle)]">
                        {systemFields.map((field) => {
                          const col = mapping[field];
                          const idx = col ? headers.indexOf(col) : -1;
                          return (
                            <td key={field} className="p-2 text-[var(--text-secondary)]">
                              {idx >= 0 ? row[idx] : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {success == null && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!headers.length || uploading}>
              {uploading ? "Importing…" : "Upload & Import"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
