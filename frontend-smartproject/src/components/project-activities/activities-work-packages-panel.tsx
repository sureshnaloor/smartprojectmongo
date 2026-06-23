import { useState } from "react";
import { ChevronDown, CloudUpload, Hand, Package, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { ProjectActivityAssignment, WorkPackageItem } from "./constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ActivityMappingMode = "duration" | "date-range";

interface ActivitiesWorkPackagesPanelProps {
  workPackages: WorkPackageItem[];
  selectedWpId: number | null;
  onSelectWp: (id: number | null) => void;
  assignments: ProjectActivityAssignment[];
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
  onDrop: (e: React.DragEvent, wpId: number) => void;
  mappingMode: ActivityMappingMode;
  onMappingModeChange: (mode: ActivityMappingMode) => void;
  onEdit: (row: ProjectActivityAssignment) => void;
  onDelete: (id: number) => void;
  projectId: string;
}

export function ActivitiesWorkPackagesPanel({
  workPackages,
  selectedWpId,
  onSelectWp,
  assignments,
  loading,
  error,
  onRetry,
  onDrop,
  mappingMode,
  onMappingModeChange,
  onEdit,
  onDelete,
  projectId,
}: ActivitiesWorkPackagesPanelProps) {
  const [showWpList, setShowWpList] = useState(true);
  const [dropActive, setDropActive] = useState(false);

  const selectedWP = workPackages.find((wp) => wp.id === selectedWpId);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  };

  const handleDragLeave = () => setDropActive(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (selectedWpId != null) onDrop(e, selectedWpId);
  };

  const sectionTitle =
    selectedWpId != null && selectedWP
      ? `Assigned to ${selectedWP.code} — ${selectedWP.name} (${assignments.length})`
      : `All assigned activities (${assignments.length})`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="kanban-heading-lg text-[var(--text-primary)]">Work Packages</h2>
            <p className="mt-0.5 kanban-caption text-[var(--text-secondary)]">
              {loading ? "Loading…" : error ? "Failed to load" : `${workPackages.length} packages`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={mappingMode} onValueChange={(v) => onMappingModeChange(v as ActivityMappingMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="duration" className="px-2 text-xs">
                  Duration
                </TabsTrigger>
                <TabsTrigger value="date-range" className="px-2 text-xs">
                  Date Range
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              type="button"
              className="flex items-center gap-1 kanban-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setShowWpList((v) => !v)}
            >
              {showWpList ? "Hide" : "Show"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", !showWpList && "-rotate-90")} />
            </button>
          </div>
        </div>

        {!loading && !error && workPackages.length > 0 && showWpList && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onSelectWp(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 kanban-caption font-medium transition-all",
                selectedWpId === null
                  ? "bg-[var(--copper-500)] text-white"
                  : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              All
            </button>
            {workPackages.map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => onSelectWp(wp.id)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDrop(e, wp.id);
                }}
                onDragOver={handleDragOver}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 kanban-caption font-medium transition-all",
                  selectedWpId === wp.id
                    ? "bg-[var(--copper-500)] text-white"
                    : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                title={`${wp.code} – ${wp.name}`}
              >
                <span className="font-mono">{wp.code}</span>
                <span className="mx-1 opacity-60">·</span>
                {wp.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-[var(--bg-warm-gray)]/50" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="kanban-body-sm text-[var(--status-danger)]">Could not load work packages</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : workPackages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed"
              style={{ borderColor: "rgba(107, 114, 128, 0.3)" }}
            >
              <Package className="h-8 w-8 text-[var(--text-muted)] opacity-30" />
            </div>
            <h3 className="kanban-heading-md text-[var(--text-primary)]">No work packages found</h3>
            <p className="max-w-xs kanban-body-sm text-[var(--text-secondary)]">
              Import WBS or add work packages to the project.
            </p>
            <button
              type="button"
              className="kanban-body-sm font-medium text-[var(--copper-500)] underline"
              onClick={() => (window.location.href = `/projects/${projectId}#register`)}
            >
              Import WBS
            </button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Hand className="h-12 w-12 text-[var(--text-muted)] opacity-25" />
            <div
              className="flex min-h-[120px] w-full max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6"
              style={{ borderColor: "rgba(107, 114, 128, 0.3)" }}
              onDrop={(e) => {
                if (selectedWpId != null) handleDrop(e);
              }}
              onDragOver={selectedWpId != null ? handleDragOver : undefined}
              onDragLeave={handleDragLeave}
            >
              <p className="kanban-body-md font-medium text-[var(--text-primary)]">
                {selectedWpId != null ? "No activities assigned to this work package yet." : "No activities assigned."}
              </p>
              <p className="mt-1 max-w-[280px] kanban-body-sm text-[var(--text-secondary)]">
                {selectedWpId != null
                  ? "Drag activities from the left list onto this work package or the drop zone below."
                  : "Select a work package above to view or assign activities."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 kanban-body-sm font-semibold text-[var(--text-primary)]">{sectionTitle}</p>
            <div className="overflow-x-auto rounded-md border border-[var(--border-subtle)]">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-warm-gray)]">
                  <tr className="kanban-caption uppercase tracking-wide text-[var(--text-secondary)]">
                    {selectedWpId == null && <th className="px-3 py-2.5 font-medium">Work Package</th>}
                    <th className="px-3 py-2.5 font-medium">Activity</th>
                    <th className="px-3 py-2.5 font-medium text-right">Qty</th>
                    <th className="px-3 py-2.5 font-medium">Unit</th>
                    <th className="px-3 py-2.5 font-medium text-right">Rate</th>
                    <th className="px-3 py-2.5 font-medium text-right">Amount</th>
                    <th className="w-16 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => {
                    const wp = workPackages.find((w) => w.id === row.wpId);
                    const rate = Number(row.unitRate);
                    const amount = rate * Number(row.quantity);
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-subtle)] hover:bg-[rgba(253,245,232,0.5)]"
                      >
                        {selectedWpId == null && (
                          <td className="px-3 py-2.5 kanban-caption text-[var(--text-secondary)]">
                            {wp ? `${wp.code} – ${wp.name}` : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2.5 kanban-body-sm text-[var(--text-primary)]">{row.name}</td>
                        <td className="px-3 py-2.5 text-right kanban-body-sm font-mono">{row.quantity}</td>
                        <td className="px-3 py-2.5 kanban-body-sm text-[var(--text-secondary)]">{row.unitOfMeasure}</td>
                        <td className="px-3 py-2.5 text-right kanban-body-sm font-mono text-[var(--text-secondary)]">
                          {formatCurrency(rate)}
                        </td>
                        <td className="px-3 py-2.5 text-right kanban-body-sm font-mono text-[var(--text-primary)]">
                          {formatCurrency(amount)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                              <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-[var(--status-danger)]"
                              onClick={() => onDelete(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {selectedWpId != null && !loading && !error && workPackages.length > 0 && (
          <div
            className={cn(
              "mt-4 flex h-[88px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all",
              dropActive ? "msr-drop-zone-active" : ""
            )}
            style={{
              borderColor: dropActive ? "var(--copper-500)" : "rgba(212, 144, 61, 0.45)",
              backgroundColor: "rgba(253, 246, 237, 0.35)",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <CloudUpload className="mb-1 h-6 w-6 text-[var(--copper-400)]" />
            <p className="kanban-body-sm text-[var(--text-secondary)]">Drag activities here to assign</p>
          </div>
        )}
      </div>
    </div>
  );
}
