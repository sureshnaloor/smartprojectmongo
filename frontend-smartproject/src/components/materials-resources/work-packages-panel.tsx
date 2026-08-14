import { useState, useMemo } from "react";
import { ChevronDown, CloudUpload, Hand, Package, Pencil, RefreshCw, Trash2, UserPlus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { resourceTypeLabel, type WorkPackageItem } from "./constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MsAssignmentRow {
  id: number;
  wpId?: number;
  materialCode?: string;
  materialDescription?: string;
  serviceCode?: string;
  serviceDescription?: string;
  uom?: string;
  unitOfMeasure?: string;
  quantity: string;
  baseRate?: string | number;
  unitRate?: string;
  estimatedValue?: string;
}

interface ResourceAssignmentRow {
  id: number;
  wpId: number;
  name: string;
  type: string;
  unitOfMeasure: string;
  unitRate: string;
  quantity: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

type AssignmentRow = MsAssignmentRow | ResourceAssignmentRow;

export interface WbsItemSimple {
  id: number;
  code: string;
  name: string;
  level?: number;
  parentId?: number | null;
}

interface WorkPackagesPanelProps {
  mode: "materials" | "services" | "resources";
  workPackages: WorkPackageItem[];
  wbsItems?: WbsItemSimple[];
  selectedWpId: number | null;
  onSelectWp: (id: number | null) => void;
  assignments: AssignmentRow[];
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
  onDrop: (e: React.DragEvent, wpId: number) => void;
  onEditQty?: (row: MsAssignmentRow) => void;
  onEditResource?: (row: ResourceAssignmentRow) => void;
  onDelete: (id: number) => void;
  onOnboard?: () => void;
  onboarding?: boolean;
  projectId: string;
}

function isResourceRow(row: AssignmentRow): row is ResourceAssignmentRow {
  return "name" in row && !("materialDescription" in row) && !("serviceDescription" in row);
}

export function WorkPackagesPanel({
  mode,
  workPackages,
  wbsItems = [],
  selectedWpId,
  onSelectWp,
  assignments,
  loading,
  error,
  onRetry,
  onDrop,
  onEditQty,
  onEditResource,
  onDelete,
  onOnboard,
  onboarding,
  projectId,
}: WorkPackagesPanelProps) {
  const [showWpList, setShowWpList] = useState(true);
  const [dropActive, setDropActive] = useState(false);
  const [selectedWbsId, setSelectedWbsId] = useState<number | "all">("all");

  const wbsTree = useMemo(() => {
    // Count work packages per WBS item
    const wpCounts = new Map<number, number>();
    for (const wp of workPackages) {
      if (wp.wbsItemId != null) {
        wpCounts.set(wp.wbsItemId, (wpCounts.get(wp.wbsItemId) || 0) + 1);
      }
    }

    if (!wbsItems || wbsItems.length === 0) {
      const map = new Map<number, { id: number; code: string; name: string; level: number; wpCount: number; isLeafHasWp: boolean }>();
      for (const wp of workPackages) {
        if (wp.wbsItemId != null && !map.has(wp.wbsItemId)) {
          map.set(wp.wbsItemId, {
            id: wp.wbsItemId,
            code: `WBS #${wp.wbsItemId}`,
            name: "WBS Branch",
            level: 1,
            wpCount: wpCounts.get(wp.wbsItemId) || 0,
            isLeafHasWp: true,
          });
        }
      }
      return Array.from(map.values());
    }

    const itemMap = new Map<number, WbsItemSimple>();
    const codeMap = new Map<string, WbsItemSimple>();
    for (const w of wbsItems) {
      itemMap.set(w.id, w);
      if (w.code) codeMap.set(w.code.trim(), w);
    }

    // Collect leaf WBS items with WPs + all of their parent/ancestor WBS items
    const includedIds = new Set<number>();
    for (const [wbsId, count] of Array.from(wpCounts.entries())) {
      if (count > 0) {
        let curr: WbsItemSimple | undefined = itemMap.get(wbsId);
        while (curr) {
          includedIds.add(curr.id);
          if (curr.parentId != null) {
            curr = itemMap.get(curr.parentId);
          } else if (curr.code && curr.code.includes(".")) {
            const parentCode = curr.code.substring(0, curr.code.lastIndexOf("."));
            curr = codeMap.get(parentCode);
          } else {
            curr = undefined;
          }
        }
      }
    }

    const items = Array.from(includedIds)
      .map((id) => itemMap.get(id)!)
      .filter(Boolean)
      .sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true }));

    return items.map((w) => {
      const count = wpCounts.get(w.id) || 0;
      const level = w.level ?? (w.code ? w.code.split(".").length : 1);
      return {
        id: w.id,
        code: w.code || `WBS #${w.id}`,
        name: w.name || "WBS Item",
        level,
        wpCount: count,
        isLeafHasWp: count > 0,
      };
    });
  }, [workPackages, wbsItems]);

  const displayedWorkPackages = useMemo(() => {
    if (selectedWbsId === "all") return workPackages;
    return workPackages.filter((wp) => wp.wbsItemId === selectedWbsId);
  }, [workPackages, selectedWbsId]);

  const selectedWP = workPackages.find((wp) => wp.id === selectedWpId);
  const budget = Number(selectedWP?.budgetedCost ?? 0);

  const allocated = assignments.reduce((sum, r) => {
    if (mode === "resources" && isResourceRow(r)) {
      return sum + Number(r.unitRate) * Number(r.quantity);
    }
    const ms = r as MsAssignmentRow;
    return sum + Number(ms.estimatedValue ?? 0);
  }, 0);

  const pct = budget > 0 && selectedWpId != null ? Math.min(100, (allocated / budget) * 100) : 0;

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

  const dropLabel = mode === "resources" ? "resources" : mode;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      {/* Card header */}
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="kanban-heading-lg text-[var(--text-primary)]">Work Packages</h2>
            <p className="kanban-caption text-[var(--text-secondary)] mt-0.5">
              {loading
                ? "Loading…"
                : error
                  ? "Failed to load"
                  : `${workPackages.length} package${workPackages.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode === "resources" && onOnboard && (
              <Button size="sm" className="gap-1.5" disabled={onboarding || loading} onClick={onOnboard}>
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">{onboarding ? "Onboarding…" : "Onboard"}</span>
              </Button>
            )}
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

        {/* WBS filter & WP pills */}
        {!loading && !error && workPackages.length > 0 && showWpList && (
          <div className="mt-3 space-y-2.5">
            {wbsTree.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="kanban-caption font-semibold text-[var(--text-secondary)] shrink-0">
                  WBS Branch:
                </span>
                <Select
                  value={selectedWbsId === "all" ? "all" : String(selectedWbsId)}
                  onValueChange={(val) => {
                    if (val === "all") {
                      setSelectedWbsId("all");
                      onSelectWp(null);
                    } else {
                      const id = Number(val);
                      setSelectedWbsId(id);
                      const firstWp = workPackages.find((wp) => wp.wbsItemId === id);
                      if (firstWp) onSelectWp(firstWp.id);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-[var(--bg-cream)] border-[var(--border-subtle)] font-medium">
                    <SelectValue placeholder="Select WBS Item" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[350px]">
                    <SelectItem value="all" className="font-medium text-xs">
                      All WBS Branches ({workPackages.length} Work Packages)
                    </SelectItem>
                    {wbsTree.map((wbs) => {
                      const isParent = !wbs.isLeafHasWp;
                      return (
                        <SelectItem
                          key={wbs.id}
                          value={String(wbs.id)}
                          disabled={isParent}
                          className={cn(
                            "text-xs transition-colors py-1.5",
                            isParent
                              ? "opacity-60 text-muted-foreground font-normal bg-muted/10 cursor-default select-none pointer-events-none"
                              : "font-semibold text-amber-950 cursor-pointer"
                          )}
                        >
                          <div
                            className="flex items-center gap-1.5 truncate"
                            style={{ paddingLeft: `${(wbs.level - 1) * 14}px` }}
                          >
                            <span className={cn("font-mono text-[11px]", isParent ? "text-muted-foreground" : "text-amber-800 font-bold")}>
                              {wbs.code}
                            </span>
                            <span className="opacity-40">•</span>
                            <span className="truncate">{wbs.name}</span>
                            {wbs.isLeafHasWp && (
                              <span className="ml-auto text-[10px] font-normal text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded shrink-0">
                                {wbs.wpCount} WP
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
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
                All WP ({displayedWorkPackages.length})
              </button>
              {displayedWorkPackages.map((wp) => (
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
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-[var(--bg-warm-gray)]/50" />
            ))}
            <p className="text-center kanban-body-sm text-[var(--text-muted)]">Loading work packages…</p>
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
            <p className="kanban-body-sm text-[var(--text-secondary)] max-w-xs">
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
        ) : selectedWpId == null && assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Hand className="h-12 w-12 text-[var(--text-muted)] opacity-25" />
            <p className="max-w-[320px] kanban-body-sm text-[var(--text-secondary)]">
              Select a work package above, then drag {dropLabel} from the left list onto a work package pill or the
              drop zone below.
            </p>
          </div>
        ) : selectedWpId != null && assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="kanban-body-md font-medium text-[var(--text-primary)]">
              {selectedWP?.code} – {selectedWP?.name}
            </p>
            {mode !== "resources" && budget > 0 && (
              <p className="kanban-caption text-[var(--text-secondary)]">
                Budget: {formatCurrency(budget)} · {formatCurrency(0)} allocated
              </p>
            )}
            <div
              className="flex h-[100px] w-full items-center justify-center rounded-md border-2 border-dashed kanban-body-sm text-[var(--text-muted)]"
              style={{ borderColor: "rgba(107, 114, 128, 0.3)" }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              Drop {dropLabel} here
            </div>
          </div>
        ) : (
          <>
            {selectedWpId != null && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="kanban-body-md font-medium text-[var(--text-primary)]">
                    {selectedWP?.code} – {selectedWP?.name}
                  </p>
                  {mode !== "resources" && (
                    <span className="kanban-caption text-[var(--text-secondary)]">
                      {formatCurrency(allocated)} / {formatCurrency(budget)}
                    </span>
                  )}
                </div>
                {mode !== "resources" && (
                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-warm-gray)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: "var(--copper-500)" }}
                    />
                  </div>
                )}
              </div>
            )}

            {selectedWpId == null && (
              <p className="mb-3 kanban-body-sm text-[var(--text-secondary)]">
                All assigned {dropLabel} ({assignments.length})
              </p>
            )}

            <div className="overflow-x-auto rounded-md border border-[var(--border-subtle)]">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-cream)]">
                  <tr className="kanban-caption text-[var(--text-secondary)]">
                    {selectedWpId == null && <th className="px-3 py-2 font-medium">Work Package</th>}
                    <th className="px-3 py-2 font-medium">
                      {mode === "materials" ? "Material" : mode === "services" ? "Service" : "Resource"}
                    </th>
                    {mode === "resources" && <th className="px-3 py-2 font-medium">Type</th>}
                    <th className="px-3 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium text-right">Rate</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                    {mode === "resources" && <th className="px-3 py-2 font-medium">Dates</th>}
                    <th className="px-3 py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((r) => {
                    const wp = workPackages.find((w) => w.id === (r.wpId ?? selectedWpId));
                    let label = "";
                    let uom = "";
                    let rate = 0;
                    let amount = 0;

                    if (mode === "resources" && isResourceRow(r)) {
                      label = r.name;
                      uom = r.unitOfMeasure;
                      rate = Number(r.unitRate);
                      amount = rate * Number(r.quantity);
                    } else {
                      const ms = r as MsAssignmentRow;
                      label =
                        mode === "materials"
                          ? ms.materialDescription ?? ms.materialCode ?? ""
                          : ms.serviceDescription ?? ms.serviceCode ?? "";
                      uom = ms.uom ?? ms.unitOfMeasure ?? "";
                      rate = Number(ms.baseRate ?? ms.unitRate ?? 0);
                      amount = Number(ms.estimatedValue ?? rate * Number(ms.quantity));
                    }

                    return (
                      <tr key={r.id} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-cream)]/60">
                        {selectedWpId == null && (
                          <td className="px-3 py-2 kanban-caption text-[var(--text-secondary)]">
                            {wp ? `${wp.code} – ${wp.name}` : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2 kanban-body-sm text-[var(--text-primary)]">{label}</td>
                        {mode === "resources" && isResourceRow(r) && (
                          <td className="px-3 py-2 kanban-caption capitalize text-[var(--text-secondary)]">
                            {resourceTypeLabel(r.type)}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="kanban-body-sm font-mono hover:underline"
                            onClick={() => {
                              if (mode === "resources" && isResourceRow(r)) onEditResource?.(r);
                              else onEditQty?.(r as MsAssignmentRow);
                            }}
                          >
                            {r.quantity}
                          </button>
                        </td>
                        <td className="px-3 py-2 kanban-body-sm text-[var(--text-secondary)]">{uom}</td>
                        <td className="px-3 py-2 text-right kanban-body-sm font-mono text-[var(--text-secondary)]">
                          {formatCurrency(rate)}
                        </td>
                        <td className="px-3 py-2 text-right kanban-body-sm font-mono text-[var(--text-primary)]">
                          {formatCurrency(amount)}
                        </td>
                        {mode === "resources" && isResourceRow(r) && (
                          <td className="px-3 py-2 kanban-caption text-[var(--text-secondary)]">
                            {r.plannedStartDate && r.plannedEndDate ? (
                              <>
                                {format(new Date(r.plannedStartDate), "MMM d")} –{" "}
                                {format(new Date(r.plannedEndDate), "MMM d, yyyy")}
                              </>
                            ) : (
                              <span className="text-[var(--text-muted)]">Not set</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                if (mode === "resources" && isResourceRow(r)) onEditResource?.(r);
                                else onEditQty?.(r as MsAssignmentRow);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-[var(--status-danger)]"
                              onClick={() => onDelete(r.id)}
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

            {selectedWpId != null && (
              <div className="mt-3 text-right">
                <span className="kanban-body-sm font-semibold text-[var(--text-primary)]">
                  Total: {formatCurrency(allocated)}
                </span>
              </div>
            )}
          </>
        )}

        {/* Drop zone — always at bottom when a WP is selected */}
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
            <p className="kanban-body-sm text-[var(--text-secondary)]">Drag {dropLabel} here to assign</p>
          </div>
        )}
      </div>
    </div>
  );
}
