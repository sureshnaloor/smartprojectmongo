import { Pencil, Trash2, Link2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MappedEntitiesPanelProps {
  entityLabel: string;
  resourceName?: string;
  count?: number;
  onClose: () => void;
  onAddMapping?: () => void;
  children?: React.ReactNode;
  loading?: boolean;
}

export function MappedEntitiesPanel({
  entityLabel,
  resourceName,
  count = 0,
  onClose,
  onAddMapping,
  children,
  loading,
}: MappedEntitiesPanelProps) {
  if (!resourceName) {
    return (
      <div className="gm-mapped-panel gm-mapped-panel--empty">
        <Link2 className="h-16 w-16 mx-auto text-[var(--text-muted)] opacity-25 mb-4" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Select a resource to view mapped {entityLabel.toLowerCase()}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
          Click a resource row to see its mapped {entityLabel.toLowerCase()} below.
        </p>
      </div>
    );
  }

  return (
    <div className="gm-mapped-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-[var(--text-primary)]">
          Mapped entities for:{" "}
          <strong className="text-[var(--copper-500)]">{resourceName}</strong>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-warm-gray)] text-[var(--text-secondary)]">
            {count} {entityLabel.toLowerCase()}
          </span>
          {onAddMapping && (
            <Button variant="outline" size="sm" className="gap-1" onClick={onAddMapping}>
              <Plus className="h-3.5 w-3.5" />
              Add Mapping
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading mappings…</p>
      ) : (
        children
      )}
    </div>
  );
}

export function MappedEntityTable({
  columns,
  rows,
  onUnlink,
}: {
  columns: string[];
  rows: { id: string | number; cells: React.ReactNode[] }[];
  onUnlink?: (id: string | number) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
        No mapped entities yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-cream)] text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
            {onUnlink && <th className="px-3 py-2 w-16">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-[var(--border-subtle)] hover:bg-[rgba(253,245,232,0.3)]"
            >
              {row.cells.map((cell, i) => (
                <td key={i} className="px-3 py-2.5">
                  {cell}
                </td>
              ))}
              {onUnlink && (
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--status-danger)]"
                    onClick={() => onUnlink(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Pencil };
