import { useState, useEffect, useMemo } from "react";
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
import { Loader2, AlertCircle } from "lucide-react";

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

  // Validation: collect errors per node
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (projectError) {
      errors.push(`Sum of top-level WBS (${formatMoney(sumTopLevel, currency)}) exceeds project budget (${formatMoney(projectBudget, currency)}).`);
    }
    flatWbsItems.forEach((w) => {
      const wbsVal = getWbsBudget(w.id);
      const allocated = sumChildren(w.id);
      if (allocated > wbsVal && (childWbs.get(w.id)?.length || wpsByWbsId.get(w.id)?.length)) {
        errors.push(`"${w.name}" (${w.code}): allocated ${formatMoney(allocated, currency)} exceeds budget ${formatMoney(wbsVal, currency)}.`);
      }
    });
    return errors;
  }, [flatWbsItems, budget, projectError, sumTopLevel, projectBudget, currency, childWbs, wpsByWbsId]);

  const hasErrors = validationErrors.length > 0;

  // Allocate only when all work packages have a value filled in and there are no validation errors
  const allWpFilled = useMemo(() => {
    return projectWorkPackages.every((wp) => {
      const v = budget.wp[wp.id];
      if (v === undefined || String(v).trim() === "") return false;
      return Number.isFinite(parseNum(v));
    });
  }, [projectWorkPackages, budget.wp]);
  const canAllocate = !hasErrors && allWpFilled && !readOnly;

  const allocateMutation = useMutation({
    mutationFn: async () => {
      // Update WBS from root to leaves so when we PATCH a child, its parent already has the new budget in the DB.
      // Then update work packages so their parent WBS budgets are already in the DB.
      const wbsByLevelAsc = [...flatWbsItems].sort((a, b) => a.level - b.level);
      for (const w of wbsByLevelAsc) {
        const val = budget.wbs[w.id];
        if (val === undefined) continue;
        await apiRequest("PATCH", `/api/wbs/${w.id}`, {
          budgetedCost: String(parseNum(val)),
        });
      }
      await Promise.all(
        projectWorkPackages.map((wp) => {
          const val = budget.wp[wp.id];
          if (val === undefined) return Promise.resolve();
          return apiRequest("PATCH", `/api/work-packages/${wp.id}`, {
            budgetedCost: String(parseNum(val)),
          });
        })
      );
      // Mark version 0 allocation as complete so the UI shows "View Allocation" and read-only modal
      await apiRequest("PATCH", `/api/projects/${projectId}`, { allocationVersion: 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
      toast({
        title: "Allocation saved",
        description: "Budget allocation completed (Version 0).",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({
        title: "Allocation failed",
        description: err.message,
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
    const rowError = hasChildren && allocated > wbsVal;

    return (
      <>
        <TableRow key={`wbs-${wbs.id}`} className={rowError ? "bg-red-50 dark:bg-red-950/30" : ""}>
          <TableCell style={{ paddingLeft: 12 + level * 24 }} className="font-medium">
            <span className="text-slate-700">{wbs.code}</span>
            <span className="ml-2 text-slate-900">{wbs.name}</span>
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
        {children.map((c) => renderWbsRow(c, level + 1))}
        {wps.map((wp) => (
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-4 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>{readOnly ? "View Budget Allocation" : "Edit Budget Allocation"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Current budget allocation (version 0). Amendments will be available in a future version."
              : "Set budget for each WBS and Work Package. Top-level WBS must not exceed project budget. Child allocations must not exceed their parent. Buffer is shown at each level. Fill all work package budgets to enable Allocate."}
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
                onClick={() => allocateMutation.mutate()}
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
    </Dialog>
  );
}
