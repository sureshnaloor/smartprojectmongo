import { useMemo, useState, type ReactNode } from "react";
import {
  Network,
  Plus,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  FileUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FinalizeWbsButton } from "@/components/project/finalize-wbs-button";
import { FinalizeBudgetButton } from "@/components/project/finalize-budget-button";
import { WbsItemWithWorkPackages } from "@/components/project/wbs-item-with-work-packages";
import { cn, formatCurrency } from "@/lib/utils";
import type { WbsItem, WorkPackage } from "@shared/schema";
import { MAX_WBS_LEVEL } from "@shared/wbs-validation";
export interface WbsTreeNode extends WbsItem {
  expanded: boolean;
  children: WbsTreeNode[];
}

interface WbsTreePanelProps {
  projectId: number;
  wbsItems: WbsItem[];
  workPackages: WorkPackage[];
  wbsFinalized: boolean;
  budgetFinalized?: boolean;
  projectCurrency?: string;
  flashingZeroBudgetWpIds?: Set<number>;
  tree: WbsTreeNode[];
  isLoading?: boolean;
  selectedWbsId: number | null;
  flashingWbsIds: Set<number>;
  expandedIds: Set<number>;
  wbsWpCount: Map<number, number>;
  childWbsCountByParent: Map<number, number>;
  onToggleExpand: (id: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectWbs: (id: number) => void;
  onSelectWp: (id: number) => void;
  onAddRoot: () => void;
  onAddChild: (item: WbsItem) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onAddWorkPackage: (wbs: { id: number; name: string }) => void;
  onEditWorkPackage: (id: number) => void;
  onDeleteWorkPackage: (id: number) => void;
  onEditWorkPackageBudget?: (wp: WorkPackage) => void;
  onInvalidWbsIds: (ids: number[]) => void;
  onInvalidWpBudgetIds?: (wpIds: number[], parentWbsIds: number[]) => void;
  /** Optional action shown next to Finalize (e.g. amend button) */
  amendAction?: ReactNode;
  onImportWbs?: () => void;
}

function nodeTypeColor(type: string) {
  if (type === "Summary") return "bg-[var(--status-info)]";
  if (type === "WorkPackage") return "bg-[var(--copper-500)]";
  if (type === "Milestone") return "bg-[var(--status-success)]";
  return "bg-[var(--copper-500)]";
}

function statusDot(percent: number | string | null | undefined) {
  const p = Number(percent || 0);
  if (p >= 100) return "bg-[var(--status-success)]";
  if (p > 0) return "bg-[var(--status-warning)]";
  return "bg-[var(--text-muted)] opacity-40";
}

export function WbsTreePanel({
  projectId,
  wbsItems,
  workPackages,
  wbsFinalized,
  budgetFinalized = false,
  projectCurrency = "INR",
  flashingZeroBudgetWpIds,
  tree,
  isLoading,
  selectedWbsId,
  flashingWbsIds,
  expandedIds,
  wbsWpCount,
  childWbsCountByParent,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onSelectWbs,
  onSelectWp,
  onAddRoot,
  onAddChild,
  onEdit,
  onDelete,
  onAddWorkPackage,
  onEditWorkPackage,
  onDeleteWorkPackage,
  onEditWorkPackageBudget,
  onInvalidWbsIds,
  onInvalidWpBudgetIds,
  amendAction,
  onImportWbs,
}: WbsTreePanelProps) {
  const [search, setSearch] = useState("");
  const allExpanded = expandedIds.size > 0;

  const wbsBudgetMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of wbsItems) {
      const descendantIds = new Set<number>([item.id]);
      let added = true;
      while (added) {
        added = false;
        for (const w of wbsItems) {
          if (w.parentId != null && descendantIds.has(w.parentId) && !descendantIds.has(w.id)) {
            descendantIds.add(w.id);
            added = true;
          }
        }
      }
      let sum = 0;
      for (const wp of workPackages) {
        if (wp.wbsItemId != null && descendantIds.has(wp.wbsItemId)) {
          sum += Number(wp.budgetedCost || 0);
        }
      }
      map.set(item.id, sum);
    }
    return map;
  }, [wbsItems, workPackages]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    const filterNodes = (nodes: WbsTreeNode[]): WbsTreeNode[] =>
      nodes
        .map((n) => {
          const matchSelf = n.name.toLowerCase().includes(q) || (n.code?.toLowerCase() || "").includes(q);
          const filteredChildren = filterNodes(n.children);
          if (matchSelf || filteredChildren.length > 0) {
            return { ...n, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean) as WbsTreeNode[];
    return filterNodes(tree);
  }, [tree, search]);

  const renderNode = (nodes: WbsTreeNode[], level = 0) =>
    nodes.map((item) => {
      const isSelected = selectedWbsId === item.id;
      const isFlashing = flashingWbsIds.has(item.id);
      const childCount = (wbsWpCount.get(item.id) ?? 0) + (childWbsCountByParent.get(item.id) ?? 0);
      const canExpand = item.children.length > 0 || (wbsWpCount.get(item.id) ?? 0) > 0;
      const hasWorkPackages = (wbsWpCount.get(item.id) ?? 0) > 0;
      const rolledUpBudget = wbsBudgetMap.get(item.id) || 0;

      return (
        <div key={item.id} className="select-none">
          <div
            className={cn(
              "group relative flex items-center gap-1.5 py-1.5 pr-2 transition-colors hover:bg-[var(--bg-warm-gray)]",
              isSelected && "bg-[rgba(253,245,232,0.8)] font-medium text-[var(--copper-500)]",
              isFlashing && "animate-pulse bg-emerald-100 dark:bg-emerald-950/40"
            )}
            style={{ paddingLeft: 16 + level * 20 }}
          >
            <GripVertical className="absolute left-0.5 h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-60" />
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-muted)]"
              onClick={() => canExpand && onToggleExpand(item.id)}
            >
              {canExpand ? (
                item.expanded ? (
                  <ChevronDown className="h-3 w-3 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="h-3 w-3 transition-transform duration-200" />
                )
              ) : (
                <span className="w-3" />
              )}
            </button>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", nodeTypeColor(item.type))} />
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left kanban-body-md text-[var(--text-primary)]"
              onClick={() => onSelectWbs(item.id)}
            >
              <span className="font-mono text-[var(--text-secondary)]">{item.code}</span>{" "}
              <span>{item.name}</span>
              {(item.type === "WBS" || item.type === "Summary") && (
                <span className="ml-1 kanban-caption text-[var(--text-muted)]">(WBS)</span>
              )}
            </button>
            {rolledUpBudget > 0 && (
              <span className="shrink-0 text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                {formatCurrency(rolledUpBudget, projectCurrency)}
              </span>
            )}
            {childCount > 0 && (
              <span className="shrink-0 rounded-full bg-[var(--bg-warm-gray)] px-1.5 py-0.5 kanban-caption text-[var(--text-secondary)]">
                {childCount}
              </span>
            )}
            <span className={cn("mx-1 h-2 w-2 shrink-0 rounded-full", statusDot(item.percentComplete))} />
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={wbsFinalized}
                title={wbsFinalized ? "WBS is finalized — create an amendment to edit" : "Edit"}
                onClick={() => onEdit(item.id)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={wbsFinalized || item.level >= MAX_WBS_LEVEL || hasWorkPackages}
                onClick={() => onAddChild(item)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--status-danger)]"
                disabled={wbsFinalized}
                title={wbsFinalized ? "WBS is finalized — create an amendment to delete" : "Delete"}
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {item.expanded && (
            <>
              {renderNode(item.children, level + 1)}
              {!item.isTopLevel && (
                <WbsItemWithWorkPackages
                  wbsItemId={item.id}
                  level={level}
                  isExpanded={item.expanded}
                  wbsFinalized={wbsFinalized}
                  budgetFinalized={budgetFinalized}
                  projectWorkPackages={workPackages}
                  projectCurrency={projectCurrency}
                  flashingZeroBudgetWpIds={flashingZeroBudgetWpIds}
                  onEditWorkPackage={onEditWorkPackage}
                  onDeleteWorkPackage={onDeleteWorkPackage}
                  onEditWorkPackageBudget={onEditWorkPackageBudget}
                  onWorkPackageClick={onSelectWp}
                />
              )}
            </>
          )}
        </div>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-[5] flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-white)] px-4 py-3">
        <h2 className="flex items-center gap-2 kanban-heading-md normal-case tracking-normal text-[var(--text-primary)]">
          <Network className="h-[18px] w-[18px] text-[var(--copper-500)]" />
          Work Breakdown Structure
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <FinalizeWbsButton
            projectId={projectId}
            wbsItems={wbsItems}
            workPackages={workPackages}
            wbsFinalized={wbsFinalized}
            onInvalidIds={onInvalidWbsIds}
            size="sm"
            className="bg-[var(--copper-500)] shadow-[var(--shadow-copper)] hover:bg-[var(--copper-600)]"
          />
          <FinalizeBudgetButton
            projectId={projectId}
            wbsFinalized={wbsFinalized}
            budgetFinalized={budgetFinalized}
            workPackages={workPackages}
            onInvalidWpBudgetIds={onInvalidWpBudgetIds}
            size="sm"
          />
          {amendAction}
          {onImportWbs && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onImportWbs}
              disabled={wbsFinalized}
              title={wbsFinalized ? "WBS is finalized — create an amendment to import" : "Import WBS from CSV or Excel"}
            >
              <FileUp className="h-3.5 w-3.5" />
              Import
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onAddRoot} disabled={wbsFinalized}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={allExpanded ? "Collapse all" : "Expand all"}
            onClick={allExpanded ? onCollapseAll : onExpandAll}
          >
            {allExpanded ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </Button>
          <div className="relative hidden sm:block">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WBS..."
              className="h-8 w-[180px] pl-8 kanban-body-sm"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--copper-500)]" />
          </div>
        ) : filteredTree.length === 0 ? (
          <p className="py-8 text-center kanban-body-sm text-[var(--text-muted)]">No WBS items. Import or add a root node.</p>
        ) : (
          renderNode(filteredTree)
        )}
      </div>
    </div>
  );
}
