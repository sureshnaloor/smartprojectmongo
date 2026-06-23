import { useMemo, useState } from "react";
import { Pencil, Trash2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionsBar } from "./bulk-actions-bar";

export interface MasterTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export interface MasterTableRow<T> {
  id: string | number;
  data: T;
  inactive?: boolean;
  flash?: boolean;
}

interface GlobalMasterDataTableProps<T> {
  columns: MasterTableColumn<T>[];
  rows: MasterTableRow<T>[];
  isLoading?: boolean;
  emptyTypeLabel: string;
  onAdd?: () => void;
  onImport?: () => void;
  selectedId?: string | number | null;
  onSelectRow?: (id: string | number | null, row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onNameClick?: (row: T) => void;
  nameColumnKey?: string;
  enableBulk?: boolean;
  onBulkDelete?: (ids: (string | number)[]) => void;
}

export function GlobalMasterDataTable<T>({
  columns,
  rows,
  isLoading,
  emptyTypeLabel,
  onAdd,
  onImport,
  selectedId,
  onSelectRow,
  onEdit,
  onDelete,
  onNameClick,
  nameColumnKey = "name",
  enableBulk = true,
  onBulkDelete,
}: GlobalMasterDataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) {
      pageRows.forEach((r) => next.delete(r.id));
    } else {
      pageRows.forEach((r) => next.add(r.id));
    }
    setSelected(next);
  };

  const toggleOne = (id: string | number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const bulkIds = useMemo(() => Array.from(selected), [selected]);

  if (isLoading) {
    return (
      <div className="gm-table-card p-12 text-center text-sm text-[var(--text-secondary)]">
        Loading records…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="gm-table-card flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <Table2 className="h-20 w-20 text-[var(--text-muted)] opacity-20 mb-4" />
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          No {emptyTypeLabel.toLowerCase()} records found
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2 mb-6 max-w-sm">
          Add your first {emptyTypeLabel.toLowerCase()} record or import from CSV to get started.
        </p>
        <div className="flex gap-3">
          {onAdd && (
            <Button className="cp-btn-primary" onClick={onAdd}>
              + Add {emptyTypeLabel}
            </Button>
          )}
          {onImport && (
            <Button variant="outline" onClick={onImport}>
              Import CSV
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gm-table-card pb-14">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              {enableBulk && (
                <th style={{ width: 40 }} className="px-4">
                  <Checkbox checked={allPageSelected} onCheckedChange={toggleAll} />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }} className={col.className}>
                  {col.header}
                </th>
              ))}
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const isSelected = selectedId === row.id;
              const isBulk = selected.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer ${isSelected || isBulk ? "gm-row--selected" : ""} ${row.flash ? "gm-row-flash" : ""} ${row.inactive ? "opacity-60 text-[var(--text-muted)]" : ""}`}
                  onClick={() => onSelectRow?.(isSelected ? null : row.id, row.data)}
                >
                  {enableBulk && (
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isBulk}
                        onCheckedChange={() => toggleOne(row.id)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.className}
                      onClick={
                        col.key === nameColumnKey && onNameClick
                          ? (e) => {
                              e.stopPropagation();
                              onNameClick(row.data);
                            }
                          : undefined
                      }
                    >
                      {col.render(row.data)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-[var(--copper-500)]"
                          onClick={() => onEdit(row.data)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-[var(--status-danger)]"
                          onClick={() => onDelete(row.data)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
        <span>
          Showing {start + 1}-{Math.min(start + pageSize, total)} of {total} records
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-2 text-[var(--copper-500)] font-medium">{safePage}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
          <select
            className="ml-2 h-8 rounded border border-[var(--border-subtle)] bg-[var(--bg-warm-gray)] px-2"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {enableBulk && (
        <BulkActionsBar
          count={bulkIds.length}
          onClear={() => setSelected(new Set())}
          onDelete={
            onBulkDelete
              ? () => {
                  if (window.confirm(`Delete ${bulkIds.length} selected records?`)) {
                    onBulkDelete(bulkIds);
                    setSelected(new Set());
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
