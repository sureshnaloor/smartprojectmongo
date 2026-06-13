import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import {
  ACTIVITY_TYPE_LABELS,
  computeActivityBudget,
  type ProjectActivityType,
} from "@shared/activity-types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, List, Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkPackage {
  id: number;
  wbsItemId: number;
  projectId: number;
  name: string;
  code: string;
  description: string | null;
  budgetedCost: string;
}

interface ProjectActivityRow {
  id: number;
  wpId: number;
  name: string;
  activityType?: ProjectActivityType | string | null;
  unitOfMeasure?: string | null;
  unitRate?: string | null;
  quantity?: string | null;
  totalBudget?: string | null;
  percentComplete?: number | null;
  progressState?: number | null;
}

interface ActivityCostRollup {
  activityId: number;
  wpId: number;
  activityName: string;
  materialsCost: number;
  resourcesCost: number;
  servicesCost: number;
  totalCost: number;
}

interface WorkPackageActivitiesRegisterProps {
  projectId: number;
}

type ViewMode = "cards" | "list";

function sortByWpCode(a: WorkPackage, b: WorkPackage): number {
  return `${a.code}`.localeCompare(`${b.code}`, undefined, { numeric: true });
}

function activityBudgetLabel(a: ProjectActivityRow): string {
  const type = (a.activityType ?? "units") as ProjectActivityType;
  if (type === "units") {
    return `${a.quantity ?? "—"} ${a.unitOfMeasure ?? ""} @ ${a.unitRate ?? "0"}`.trim();
  }
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

export function WorkPackageActivitiesRegister({ projectId }: WorkPackageActivitiesRegisterProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");

  const { data: workPackages = [], isLoading: loadingWps } = useQuery<WorkPackage[]>({
    queryKey: ["work-packages", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/work-packages`);
      if (!res.ok) throw new Error("Failed to load work packages");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!projectId,
  });

  const { data: activities = [], isLoading: loadingActs } = useQuery<ProjectActivityRow[]>({
    queryKey: ["project-activities", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activities`);
      if (!res.ok) throw new Error("Failed to load activities");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: costRollups = [], isLoading: loadingRollups } = useQuery<ActivityCostRollup[]>({
    queryKey: ["activity-cost-rollups", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activity-cost-rollups`);
      if (!res.ok) throw new Error("Failed to load activity cost rollups");
      return res.json();
    },
    enabled: !!projectId,
  });

  const costByActivityId = useMemo(
    () => new Map(costRollups.map((r) => [r.activityId, r])),
    [costRollups]
  );

  function activityEstimatedCost(act: ProjectActivityRow): number {
    const rollup = costByActivityId.get(act.id);
    if (rollup && rollup.totalCost > 0) return rollup.totalCost;
    return computeActivityBudget(act);
  }

  const wpGroups = useMemo(() => {
    const actsByWp = new Map<number, ProjectActivityRow[]>();
    for (const act of activities) {
      const list = actsByWp.get(act.wpId) ?? [];
      list.push(act);
      actsByWp.set(act.wpId, list);
    }

    const q = search.trim().toLowerCase();
    return [...workPackages]
      .sort(sortByWpCode)
      .map((wp) => {
        const wpActs = (actsByWp.get(wp.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
        const allocated = wpActs.reduce((s, a) => s + activityEstimatedCost(a), 0);
        const wpBudget = Number(wp.budgetedCost || 0);
        const rollupTotals = wpActs.reduce(
          (acc, a) => {
            const r = costByActivityId.get(a.id);
            if (r) {
              acc.materials += r.materialsCost;
              acc.resources += r.resourcesCost;
              acc.services += r.servicesCost;
            }
            return acc;
          },
          { materials: 0, resources: 0, services: 0 }
        );
        return {
          wp,
          activities: wpActs,
          allocated,
          wpBudget,
          buffer: wpBudget - allocated,
          materialsCost: rollupTotals.materials,
          resourcesCost: rollupTotals.resources,
          servicesCost: rollupTotals.services,
        };
      })
      .filter((g) => {
        if (!q) return true;
        const hay = `${g.wp.code} ${g.wp.name} ${g.activities.map((a) => a.name).join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
  }, [workPackages, activities, search, costByActivityId]);

  const totals = useMemo(() => {
    const wpBudget = wpGroups.reduce((s, g) => s + g.wpBudget, 0);
    const allocated = wpGroups.reduce((s, g) => s + g.allocated, 0);
    const actCount = wpGroups.reduce((s, g) => s + g.activities.length, 0);
    return { wpBudget, allocated, actCount, wpCount: wpGroups.length };
  }, [wpGroups]);

  const listRows = useMemo(() => {
    const rows: Array<{
      key: string;
      wp: WorkPackage;
      activity: ProjectActivityRow | null;
      activityBudget: number;
      materialsCost: number;
      resourcesCost: number;
      servicesCost: number;
      wpBudget: number;
      wpAllocated: number;
      isFirstInGroup: boolean;
      groupSize: number;
    }> = [];

    for (const g of wpGroups) {
      if (g.activities.length === 0) {
        rows.push({
          key: `wp-${g.wp.id}-empty`,
          wp: g.wp,
          activity: null,
          activityBudget: 0,
          materialsCost: 0,
          resourcesCost: 0,
          servicesCost: 0,
          wpBudget: g.wpBudget,
          wpAllocated: 0,
          isFirstInGroup: true,
          groupSize: 1,
        });
        continue;
      }
      g.activities.forEach((act, idx) => {
        const rollup = costByActivityId.get(act.id);
        rows.push({
          key: `wp-${g.wp.id}-act-${act.id}`,
          wp: g.wp,
          activity: act,
          activityBudget: activityEstimatedCost(act),
          materialsCost: rollup?.materialsCost ?? 0,
          resourcesCost: rollup?.resourcesCost ?? 0,
          servicesCost: rollup?.servicesCost ?? 0,
          wpBudget: g.wpBudget,
          wpAllocated: g.allocated,
          isFirstInGroup: idx === 0,
          groupSize: g.activities.length,
        });
      });
    }
    return rows;
  }, [wpGroups, costByActivityId]);

  const isLoading = loadingWps || loadingActs || loadingRollups;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Work packages &amp; activities</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totals.wpCount} work packages · {totals.actCount} activities ·{" "}
            {formatCurrency(totals.allocated)} estimated (materials + resources + services) of{" "}
            {formatCurrency(totals.wpBudget)} WP budget
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WP or activity…"
              className="pl-8 w-56"
            />
          </div>
          <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-white">
            <Button
              type="button"
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Cards
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1.5" />
              List
            </Button>
          </div>
        </div>
      </div>

      {wpGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "No work packages match your search." : "No work packages in this project yet."}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {wpGroups.map((g) => (
            <Card
              key={g.wp.id}
              className="overflow-hidden border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2 bg-gradient-to-br from-teal-50/80 to-white border-b border-zinc-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                      {g.wp.code}
                    </p>
                    <CardTitle className="text-base leading-snug mt-0.5 truncate">
                      {g.wp.name}
                    </CardTitle>
                  </div>
                  <Package className="h-5 w-5 shrink-0 text-teal-600/70" />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    WP budget {formatCurrency(g.wpBudget)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-xs",
                      g.buffer < 0 ? "border-red-300 text-red-700 bg-red-50" : "border-emerald-300 text-emerald-800 bg-emerald-50"
                    )}
                  >
                    Est. {formatCurrency(g.allocated)}
                  </Badge>
                  {(g.materialsCost > 0 || g.resourcesCost > 0 || g.servicesCost > 0) && (
                    <Badge variant="outline" className="font-mono text-[10px] text-amber-800 border-amber-200">
                      Mat {formatCurrency(g.materialsCost)}
                    </Badge>
                  )}
                  {(g.materialsCost > 0 || g.resourcesCost > 0 || g.servicesCost > 0) && (
                    <Badge variant="outline" className="font-mono text-[10px] text-emerald-800 border-emerald-200">
                      Res {formatCurrency(g.resourcesCost)}
                    </Badge>
                  )}
                  {(g.materialsCost > 0 || g.resourcesCost > 0 || g.servicesCost > 0) && (
                    <Badge variant="outline" className="font-mono text-[10px] text-sky-800 border-sky-200">
                      Svc {formatCurrency(g.servicesCost)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-4">
                {g.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    No activities assigned
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {g.activities.map((act) => {
                      const budget = activityEstimatedCost(act);
                      const rollup = costByActivityId.get(act.id);
                      const type = (act.activityType ?? "units") as ProjectActivityType;
                      return (
                        <li
                          key={act.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2">
                              {act.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {ACTIVITY_TYPE_LABELS[type]} · {activityBudgetLabel(act)}
                            </p>
                            {rollup &&
                              (rollup.materialsCost > 0 ||
                                rollup.resourcesCost > 0 ||
                                rollup.servicesCost > 0) && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                Mat {formatCurrency(rollup.materialsCost)} + Res{" "}
                                {formatCurrency(rollup.resourcesCost)}
                                {rollup.servicesCost > 0
                                  ? ` + Svc ${formatCurrency(rollup.servicesCost)}`
                                  : ""}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-semibold font-mono text-emerald-700">
                            {formatCurrency(budget)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {g.activities.length} activit{g.activities.length === 1 ? "y" : "ies"}
                  </span>
                  <span className="font-semibold text-zinc-700">
                    Buffer {formatCurrency(g.buffer)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="font-semibold">WP Code</TableHead>
                  <TableHead className="font-semibold">Work Package</TableHead>
                  <TableHead className="font-semibold text-right">WP Budget</TableHead>
                  <TableHead className="font-semibold text-right">WP Est.</TableHead>
                  <TableHead className="font-semibold">Activity</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Basis</TableHead>
                  <TableHead className="font-semibold text-right">Materials</TableHead>
                  <TableHead className="font-semibold text-right">Resources</TableHead>
                  <TableHead className="font-semibold text-right">Services</TableHead>
                  <TableHead className="font-semibold text-right">Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listRows.map((row) => {
                  const type = row.activity
                    ? ((row.activity.activityType ?? "units") as ProjectActivityType)
                    : null;
                  return (
                    <TableRow key={row.key} className="hover:bg-zinc-50/80">
                      <TableCell className="font-mono text-sm font-medium text-teal-800 whitespace-nowrap">
                        {row.isFirstInGroup ? row.wp.code : ""}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {row.isFirstInGroup ? (
                          <span className="font-medium text-zinc-900">{row.wp.name}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {row.isFirstInGroup ? formatCurrency(row.wpBudget) : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap text-emerald-700">
                        {row.isFirstInGroup ? formatCurrency(row.wpAllocated) : ""}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {row.activity ? (
                          <span className="text-sm text-zinc-800">{row.activity.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No activities</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {type ? (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            {ACTIVITY_TYPE_LABELS[type]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {row.activity ? activityBudgetLabel(row.activity) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-800 whitespace-nowrap">
                        {row.activity && row.materialsCost > 0
                          ? formatCurrency(row.materialsCost)
                          : row.activity
                            ? "—"
                            : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-800 whitespace-nowrap">
                        {row.activity && row.resourcesCost > 0
                          ? formatCurrency(row.resourcesCost)
                          : row.activity
                            ? "—"
                            : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sky-800 whitespace-nowrap">
                        {row.activity && row.servicesCost > 0
                          ? formatCurrency(row.servicesCost)
                          : row.activity
                            ? "—"
                            : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {row.activity ? formatCurrency(row.activityBudget) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
