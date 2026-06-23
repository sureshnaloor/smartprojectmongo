import { Plus, Download, Upload, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GlobalMasterTableHeaderProps {
  title: string;
  count: number;
  addLabel: string;
  onAdd: () => void;
  onDownloadTemplate?: () => void;
  onImportCsv?: () => void;
  onExportAll?: () => void;
}

export function GlobalMasterTableHeader({
  title,
  count,
  addLabel,
  onAdd,
  onDownloadTemplate,
  onImportCsv,
  onExportAll,
}: GlobalMasterTableHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 mb-4">
      <div className="flex items-baseline gap-2">
        <h2 className="cp-display-md text-[var(--copper-500)]">{title}</h2>
        <span className="text-xs text-[var(--text-secondary)]">{count} records</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button className="cp-btn-primary gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add {addLabel}
        </Button>
        {onDownloadTemplate && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onDownloadTemplate}>
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        )}
        {onImportCsv && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onImportCsv}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onExportAll && (
              <DropdownMenuItem onClick={onExportAll}>Export All</DropdownMenuItem>
            )}
            <DropdownMenuItem disabled>Bulk Edit</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive Old</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
