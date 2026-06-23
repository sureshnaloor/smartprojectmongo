import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DocumentFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  fileType: string;
  onFileTypeChange: (v: string) => void;
  onClear: () => void;
}

export function DocumentFilters({
  search,
  onSearchChange,
  fileType,
  onFileTypeChange,
  onClear,
}: DocumentFiltersProps) {
  const hasActive = search.trim() !== "" || fileType !== "all";

  return (
    <div className="mb-6 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search documents by name, description, or uploader..."
          className="h-10 pl-10"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={fileType} onValueChange={onFileTypeChange}>
          <SelectTrigger className="h-8 w-[140px] bg-[var(--bg-warm-gray)] border-transparent kanban-body-sm">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="cad">DWG / DXF</SelectItem>
            <SelectItem value="doc">DOC</SelectItem>
            <SelectItem value="xls">XLS</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {hasActive && (
          <button
            type="button"
            onClick={onClear}
            className="kanban-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
