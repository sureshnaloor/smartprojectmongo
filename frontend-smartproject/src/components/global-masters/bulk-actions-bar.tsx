import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export function BulkActionsBar({ count, onClear, onDelete, onExport }: BulkActionsBarProps) {
  if (count < 1) return null;

  return (
    <div className="gm-bulk-bar">
      <div className="flex items-center gap-3 text-sm">
        <span>{count} selected</span>
        <button type="button" className="underline opacity-80 hover:opacity-100" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2.5">
        <Button
          variant="outline"
          size="sm"
          className="border-white/40 bg-transparent text-white hover:bg-white/10"
          disabled
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/40 bg-transparent text-white hover:bg-white/10"
          disabled
        >
          Change Status
        </Button>
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="border-white/40 bg-transparent text-white hover:bg-white/10"
            onClick={onExport}
          >
            Export Selected
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="border-[var(--status-danger)] text-[var(--status-danger)] bg-transparent hover:bg-[var(--status-danger)]/10"
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
