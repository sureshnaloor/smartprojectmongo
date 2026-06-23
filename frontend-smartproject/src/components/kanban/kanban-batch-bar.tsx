import { Archive, ArrowRight, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLUMNS, KANBAN_PRIORITY_OPTIONS, type ColumnId } from "./constants";

interface KanbanBatchBarProps {
  count: number;
  onMoveTo: (column: ColumnId) => void;
  onSetPriority: (priority: string) => void;
  onArchive: () => void;
  onClear: () => void;
}

export function KanbanBatchBar({
  count,
  onMoveTo,
  onSetPriority,
  onArchive,
  onClear,
}: KanbanBatchBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 kanban-batch-bar">
      <div
        className="flex flex-wrap items-center gap-3 rounded-full px-6 py-3 shadow-[var(--shadow-xl)]"
        style={{ backgroundColor: "var(--navy-900)" }}
      >
        <span className="kanban-body-sm font-medium text-white whitespace-nowrap">
          {count} card{count === 1 ? "" : "s"} selected
        </span>
        <span className="h-5 w-px bg-white/20" />

        <Select onValueChange={(v) => onMoveTo(v as ColumnId)}>
          <SelectTrigger className="h-8 w-[140px] border-white/20 bg-white/10 text-white text-xs">
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Move to…" />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={onSetPriority}>
          <SelectTrigger className="h-8 w-[130px] border-white/20 bg-white/10 text-white text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {KANBAN_PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.displayLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-white hover:bg-white/10 gap-1"
          disabled
        >
          <User className="h-3.5 w-3.5" />
          Assign
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-white hover:bg-white/10 gap-1"
          onClick={onArchive}
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-red-300 hover:bg-white/10 gap-1"
          disabled
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
