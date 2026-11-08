import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Project, WbsItem, WorkPackage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditAllocationModalProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When true, allocation is already done (e.g. version 0); show read-only view with no Allocate button */
  readOnly?: boolean;
}

type BudgetState = {
  wbs: Record<number, string>;
  wp: Record<number, string>;
};

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EditAllocationModal({
  projectId,
  isOpen,
  onOpenChange,
  onSuccess,
  readOnly = false,
}: EditAllocationModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [budget, setBudget] = useState<BudgetState>({ wbs: {}, wp: {} });
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const expandedReady = useRef(false);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isOpen && !!projectId,
  });

  const { data: flatWbsItems = [] } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
    enabled: isOpen && !!projectId,
  });

  const { data: projectWorkPackages = [] } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${projectId}/work-packages`],
    enabled: isOpen && !!projectId,
  });

  const projectBudget = project ? Number(project.budget) || 0 : 0;
  const currency = project?.currency ?? "USD";

  // Initialize budget state from server when data loads
  useEffect(() => {
    if (!isOpen || !flatWbsItems.length) return;
    const wbs: Record<number, string> = {};
    const wp: Record<number, string> = {};
    flatWbsItems.forEach((w) => {
      wbs[w.id] = String(w.budgetedCost ?? "0");
    });
    projectWorkPackages.forEach((p) => {
      wp[p.id] = String(p.budgetedCost ?? "0");
    });
    setBudget({ wbs, wp });
  }, [isOpen, flatWbsItems, projectWorkPackages]);

  useEffect(() => {
    if (!isOpen) {
      expandedReady.current = false;
      setExpandedIds(new Set());
      setConfirmOpen(false);
      return;
    }
    if (!flatWbsItems.length || expandedReady.current) return;
    expandedReady.current = true;
    setExpandedIds(new Set(flatWbsItems.filter((item) => !item.parentId).map((item) => item.id)));
  }, [isOpen, flatWbsItems]);

  // Tree helpers: children WBS and WPs per WBS
  const childWbs = useMemo(() => {
    const map = new Map<number, WbsItem[]>();
    flatWbsItems.forEach((w) => {
      const pid = w.parentId ?? 0;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(w);
    });
    return map;
  }, [flatWbsItems]);
  const wpsByWbsId = useMemo(() => {
    const map = new Map<number, WorkPackage[]>();
    projectWorkPackages.forEach((wp) => {
      if (!map.has(wp.wbsItemId)) map.set(wp.wbsItemId, []);
      map.get(wp.wbsItemId)!.push(wp);
    });
    return map;
  }, [projectWorkPackages]);

  const topLevelWbs = useMemo(
    () => flatWbsItems.filter((w) => !w.parentId || w.isTopLevel),
    [flatWbsItems]
  );

  const getWbsBudget = (wbsId: number) => parseNum(budget.wbs[wbsId] ?? "0");
  const getWpBudget = (wpId: number) => parseNum(budget.wp[wpId] ?? "0");

  // Sum of children (child WBS or WPs) for a WBS
  const sumChildren = (wbsId: number): number => {
    const children = childWbs.get(wbsId) ?? [];
    const wps = wpsByWbsId.get(wbsId) ?? [];
    if (children.length) {
      return children.reduce((s, c) => s + getWbsBudget(c.id), 0);
    }
    return wps.reduce((s, p) => s + getWpBudget(p.id), 0);
  };

  const sumTopLevel = useMemo(
    () => topLevelWbs.reduce((s, w) => s + getWbsBudget(w.id), 0),
    [topLevelWbs, budget.wbs]
  );

  const projectBuffer = projectBudget - sumTopLevel;
  const projectError = projectBuffer < 0;

  const setWbsBudget = (id: number, value: string) => {
    setBudget((prev) => ({ ...prev, wbs: { ...prev.wbs, [id]: value } }));
  };
  const setWpBudget = (id: number, value: string) => {
    setBudget((prev) => ({ ...prev, wp: { ...prev.wp, [id]: value } }));
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const wpFilled = (wpId: number) => {
    const v = budget.wp[wpId];
    if (v === undefined || String(v).trim() === "") return false;
    return parseNum(v) > 0;
  };

  // Allocate stays disabled until every work package has a budget above zero and no WBS buffer is negative.
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (projectError) {
      errors.push(`Sum of top-level WBS (${formatMoney(sumTopLevel, currency)}) exceeds project budget (${formatMoney(projectBudget, currency)}).`);
    }
    flatWbsItems.forEach((w) => {
      const wbsVal = getWbsBudget(w.id);
      const hasChildren = (childWbs.get(w.id)?.length ?? 0) > 0 || (wpsByWbsId.get(w.id)?.length ?? 0) > 0;
      const allocated = sumChildren(w.id);
      if (wbsVal < 0) {
        errors.push(`"${w.name}" (${w.code}): budget cannot be negative.`);
      } else if (hasChildren && allocated > wbsVal) {
        errors.push(`"${w.name}" (${w.code}): allocated ${formatMoney(allocated, currency)} exceeds budget ${formatMoney(wbsVal, currency)}.`);
      }
    });
    const unfilled = projectWorkPackages.filter((wp) => !wpFilled(wp.id));
    if (projectWorkPackages.length === 0) {
      errors.push("Add a budget greater than zero on every work package before allocating.");
    } else if (unfilled.length > 0) {
      errors.push(
        unfilled.length === 1
          ? `"${unfilled[0].name}" needs a budget greater than zero.`
          : `${unfilled.length} work packages still need a budget greater than zero.`
      );
    }
    return errors;
  }, [flatWbsItems, projectWorkPackages, budget, projectError, sumTopLevel, projectBudget, currency, childWbs, wpsByWbsId]);

  const hasErrors = validationErrors.length > 0;
  const canAllocate = !hasErrors && !readOnly;

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const unchanged = (next: number, previous: string | number | null | undefined) =>
        Math.abs(next - Number(previous || 0)) < 0.0001;

      // Raise parent budgets before children, then lower children before parents, so the saved tree never has a negative buffer.
      const increasingWbs = [...flatWbsItems]
        .filter((w) => budget.wbs[w.id] !== undefined && !unchanged(parseNum(budget.wbs[w.id]), w.budgetedCost))
        .filter((w) => parseNum(budget.wbs[w.id]) >= Number(w.budgetedCost || 0))
        .sort((a, b) => a.level - b.level);
      const decreasingWbs = [...flatWbsItems]
        .filter((w) => budget.wbs[w.id] !== undefined && parseNum(budget.wbs[w.id]) < Number(w.budgetedCost || 0))
        .sort((a, b) => b.level - a.level);

      const patchWbs = (w: WbsItem) =>
        apiRequest("PATCH", `/api/wbs/${w.id}`, { budgetedCost: String(parseNum(budget.wbs[w.id])) });
      for (const w of increasingWbs) await patchWbs(w);

      const wpChanges = projectWorkPackages
        .filter((wp) => budget.wp[wp.id] !== undefined && !unchanged(parseNum(budget.wp[wp.id]), wp.budgetedCost))
        .sort((a, b) => parseNum(budget.wp[a.id]) - Number(a.budgetedCost || 0) - (parseNum(budget.wp[b.id]) - Number(b.budgetedCost || 0)));
      for (const wp of wpChanges) {
        await apiRequest("PATCH", `/api/work-packages/${wp.id}`, {
          budgetedCost: String(parseNum(budget.wp[wp.id])),
        });
      }

      for (const w of decreasingWbs) await patchWbs(w);

      await apiRequest("PATCH", `/api/projects/${projectId}`, {
        allocationVersion: 0,
        budgetFinalized: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
      toast({
        title: "Budget finalized",
        description: "The amounts are saved and locked. They can be changed only by a revision of the project budget.",
      });
      setConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      let description = err.message;
      const jsonStart = description.indexOf("{");
      if (jsonStart >= 0) {
        try {
          const parsed = JSON.parse(description.slice(jsonStart));
          if (parsed?.message) description = parsed.message;
        } catch {
          // Keep the original message when the body is not JSON.
        }
      }
      toast({
        title: "Budget was not finalized",
        description,
        variant: "destructive",
      });
    },
  });

  function renderWbsRow(wbs: WbsItem, level: number) {
    const children = childWbs.get(wbs.id) ?? [];
    const wps = wpsByWbsId.get(wbs.id) ?? [];
    const allocated = sumChildren(wbs.id);
    const wbsVal = getWbsBudget(wbs.id);
    const buffer = wbsVal - allocated;
    const hasChildren = children.length > 0 || wps.length > 0;
    const expanded = expandedIds.has(wbs.id);
    const rowError = hasChildren && allocated > wbsVal;

    return (
      <>
        <TableRow key={`wbs-${wbs.id}`} className={rowError ? "bg-red-50 dark:bg-red-950/30" : ""}>
          <TableCell style={{ paddingLeft: 8 + level * 20 }} className="font-medium">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 ${hasChildren ? "hover:bg-slate-100" : "invisible"}`}
                aria-label={expanded ? `Collapse ${wbs.name}` : `Expand ${wbs.name}`}
                aria-expanded={hasChildren ? expanded : undefined}
                disabled={!hasChildren}
                onClick={() => hasChildren && toggleExpanded(wbs.id)}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              <span className="min-w-0">
                <span className="text-slate-700">{wbs.code}</span>
                <span className="ml-2 text-slate-900">{wbs.name}</span>
              </span>
            </div>
          </TableCell>
          <TableCell className="text-slate-500">WBS</TableCell>
          <TableCell className="w-40">
            <Input
              type="text"
              inputMode="decimal"
              className="h-9 text-right tabular-nums"
              value={budget.wbs[wbs.id] ?? ""}
              onChange={(e) => setWbsBudget(wbs.id, e.target.value)}
              placeholder="0"
              readOnly={readOnly}
              disabled={readOnly}
            />
          </TableCell>
          <TableCell className="text-right tabular-nums text-slate-600 w-32">
            {hasChildren ? formatMoney(allocated, currency) : "—"}
          </TableCell>
          <TableCell className={`text-right tabular-nums w-32 ${buffer >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {hasChildren ? formatMoney(buffer, currency) : "—"}
          </TableCell>
        </TableRow>
        {expanded && children.map((c) => renderWbsRow(c, level + 1))}
        {expanded && wps.map((wp) => (
          <TableRow key={`wp-${wp.id}`}>
            <TableCell style={{ paddingLeft: 12 + (level + 1) * 24 }} className="font-normal">
              <span className="text-slate-500 text-xs">{wp.code}</span>
              <span className="ml-2 text-slate-700">{wp.name}</span>
            </TableCell>
            <TableCell className="text-slate-500">WP</TableCell>
            <TableCell className="w-40">
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 text-right tabular-nums"
                value={budget.wp[wp.id] ?? ""}
                onChange={(e) => setWpBudget(wp.id, e.target.value)}
                placeholder="0"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </TableCell>
            <TableCell className="text-right text-slate-400">—</TableCell>
            <TableCell className="text-right text-slate-400">—</TableCell>
          </TableRow>
        ))}
      </>
    );
  }

  if (!project) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && (confirmOpen || allocateMutation.isPending)) return;
        if (!open) setConfirmOpen(false);
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-4 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>{readOnly ? "View Budget Allocation" : "Edit Budget Allocation"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Current budget allocation (version 0). Amendments will be available in a future version."
              : "Set a budget greater than zero on every work package. Use the arrows to open or close each level. Allocate stays off while any work package is empty or any WBS buffer is negative."}
          </DialogDescription>
        </DialogHeader>

        {hasErrors && (
          <div className="mx-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-[320px] px-6 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-20">Type</TableHead>
                <TableHead className="w-40">Budget</TableHead>
                <TableHead className="w-32 text-right">Allocated</TableHead>
                <TableHead className="w-32 text-right">Buffer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-slate-50 font-medium">
                <TableCell>Project total</TableCell>
                <TableCell className="text-slate-500">—</TableCell>
                <TableCell className="text-slate-600">{formatMoney(projectBudget, currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(sumTopLevel, currency)}</TableCell>
                <TableCell className={`text-right tabular-nums ${projectBuffer >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatMoney(projectBuffer, currency)}
                </TableCell>
              </TableRow>
              {topLevelWbs.map((w) => renderWbsRow(w, 0))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t flex-row justify-between sm:justify-between">
          <span className="text-xs text-slate-500">Allocation version: 0</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canAllocate || allocateMutation.isPending}
              >
                {allocateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Allocating…
                  </>
                ) : (
                  "Allocate"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !allocateMutation.isPending && setConfirmOpen(open)}>
        <AlertDialogContent className="z-[60]">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this budget?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>This cannot be undone. Check every amount carefully before you continue.</p>
                <ul className="list-disc space-y-1.5 pl-5 text-left">
                  <li>The WBS and work package budgets shown here will be saved.</li>
                  <li>After this, those amounts can be changed only by a revision of the project budget.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={allocateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                allocateMutation.mutate();
              }}
              disabled={allocateMutation.isPending}
            >
              {allocateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing…
                </>
              ) : (
                "Yes, finalize budget"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
