import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildWbsHierarchy } from "@/lib/utils";
import type { WbsItem } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight, Package, Wrench, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FinalizeWbsButton } from "@/components/project/finalize-wbs-button";
import { WorkPackageActivitiesPanel } from "@/components/project/work-package-activities-panel";
import { cn } from "@/lib/utils";
import { RESOURCE_HOURLY_UOM } from "@/lib/resource-uom";

interface WorkPackage {
  id: number;
  wbsItemId: number;
  projectId: number;
  name: string;
  code: string;
  description: string | null;
  budgetedCost: string;
}

type TabKey = "home" | "activities" | "cost" | "schedule" | "progress";

const TAB_KEYS: TabKey[] = ["home", "activities", "cost", "schedule", "progress"];

function getTabFromHash(): TabKey {
  if (typeof window === "undefined") return "home";
  const h = (window.location.hash || "#home").slice(1).toLowerCase();
  return TAB_KEYS.includes(h as TabKey) ? (h as TabKey) : "home";
}

export default function ProjectWbsWorkPackages() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<TabKey>(getTabFromHash);
  const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
  const [expandedWbs, setExpandedWbs] = useState<Set<number>>(new Set());
  const [flashingWbsIds, setFlashingWbsIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pid = projectId ? parseInt(projectId, 10) : 0;

  const { data: project } = useQuery<{ wbsFinalized?: boolean }>({
    queryKey: [`/api/projects/${pid}`],
    enabled: !!pid,
  });
  const isWbsFinalized = Boolean(project?.wbsFinalized);

  useEffect(() => {
    if (flashingWbsIds.size === 0) return;
    const t = setTimeout(() => setFlashingWbsIds(new Set()), 6000);
    return () => clearTimeout(t);
  }, [flashingWbsIds]);

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    const want = `#${activeTab}`;
    if (typeof window !== "undefined" && (window.location.hash || "#home") !== want) {
      window.history.replaceState(null, "", `${window.location.pathname}${want}`);
    }
  }, [activeTab]);

  const { data: wbsItems = [], isLoading: loadingWbs } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${pid}/wbs`],
    enabled: !!pid,
  });

  const { data: workPackages = [], isLoading: loadingWps } = useQuery<
    WorkPackage[]
  >({
    queryKey: ["work-packages", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/projects/${pid}/work-packages`);
      if (!res.ok) throw new Error("Failed to load work packages");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!pid,
  });

  const wpsByWbs = useMemo(() => {
    const map = new Map<number, WorkPackage[]>();
    for (const wp of workPackages) {
      const list = map.get(wp.wbsItemId) ?? [];
      list.push(wp);
      map.set(wp.wbsItemId, list);
    }
    return map;
  }, [workPackages]);

  const { data: wpMaterials = [] } = useQuery<any[]>({
    queryKey: ["wp-materials", selectedWpId],
    queryFn: async () => {
      if (!selectedWpId) return [];
      const res = await fetch(`/api/work-packages/${selectedWpId}/materials`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedWpId,
  });

  const { data: wpServices = [] } = useQuery<any[]>({
    queryKey: ["wp-services", selectedWpId],
    queryFn: async () => {
      if (!selectedWpId) return [];
      const res = await fetch(`/api/work-packages/${selectedWpId}/services`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedWpId,
  });

  const { data: wpResources = [] } = useQuery<any[]>({
    queryKey: ["wp-resources", selectedWpId],
    queryFn: async () => {
      if (!selectedWpId) return [];
      const res = await fetch(`/api/work-packages/${selectedWpId}/resources`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedWpId,
  });

  const hierarchy = useMemo(
    () => buildWbsHierarchy(wbsItems),
    [wbsItems]
    );

  useEffect(() => {
    if (hierarchy.length > 0) {
      setExpandedWbs((prev) =>
        prev.size === 0 ? new Set(hierarchy.map((r) => r.id)) : prev
      );
    }
  }, [hierarchy]);

  const toggleWbs = (id: number) => {
    setExpandedWbs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedWP = workPackages.find((wp) => wp.id === selectedWpId);
  const isLoading = loadingWbs || loadingWps;

  /** Prefer API `estimatedValue`; else qty × unit rate (camelCase or snake_case). */
  function getResourceEstimatedValue(r: Record<string, unknown>): number {
    const direct = r.estimatedValue ?? r.estimated_value;
    if (direct != null && direct !== "") {
      const v = Number(direct);
      if (Number.isFinite(v)) return v;
    }
    const rate = Number(r.unitRate ?? r.unit_rate ?? 0);
    const qty = Number(r.quantity ?? r.qty ?? 0);
    if (!Number.isFinite(rate) || !Number.isFinite(qty)) return 0;
    return rate * qty;
  }

  function getResourceUnitRate(r: Record<string, unknown>): number {
    const rate = Number(r.unitRate ?? r.unit_rate ?? 0);
    return Number.isFinite(rate) ? rate : 0;
  }

  const { data: plannedCost, isLoading: loadingPlannedCost } = useQuery<any | null>({
    queryKey: ["wp-planned-cost", selectedWpId],
    queryFn: async () => {
      if (!selectedWpId) return null;
      const res = await fetch(`/api/work-packages/${selectedWpId}/planned-cost`);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error("Failed to load planned cost status");
      }
      return res.json();
    },
    enabled: !!selectedWpId,
  });

  const isAlreadyPlanned = !!plannedCost?.isLocked;

  const markPlannedMutation = useMutation({
    mutationFn: async (wpId: number) => {
      const res = await apiRequest("POST", `/api/work-packages/${wpId}/planned-cost`);
      if (!res.ok) {
        let message = "Failed to save planned costs";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: (_data, wpId) => {
      toast({
        title: "Work package planned",
        description: "Planned materials, services and resources have been saved.",
      });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${parseInt(projectId, 10)}/wbs`] });
      }
      queryClient.invalidateQueries({ queryKey: ["wp-planned-cost", wpId] });
    },
    onError: (error: any) => {
      toast({
        title: "Could not save planned costs",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  function renderWbsNode(items: (WbsItem & { children?: WbsItem[] })[], level: number) {
    return items.map((item) => {
      const wps = wpsByWbs.get(item.id) ?? [];
      const hasChildren = (item.children?.length ?? 0) > 0 || wps.length > 0;
      const isExp = expandedWbs.has(item.id);

      return (
        <div key={item.id} className="select-none">
          <div
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded hover:bg-zinc-100 cursor-pointer",
              flashingWbsIds.has(item.id) && "animate-pulse ring-2 ring-red-500 bg-red-50"
            )}
            style={{ paddingLeft: 8 + level * 16 }}
            onClick={() => hasChildren && toggleWbs(item.id)}
          >
            {hasChildren ? (
              <span className="w-4 h-4 flex items-center justify-center">
                {isExp ? (
                  <ChevronRight className="h-4 w-4 rotate-90" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            ) : (
              <span className="w-4" />
            )}
            <span className="text-sm font-medium text-zinc-700">
              {item.code} – {item.name}
            </span>
            {item.type === "Summary" || item.type === "WBS" ? (
              <span className="text-xs text-zinc-400 ml-1">(WBS)</span>
            ) : null}
          </div>
          {isExp &&
            wps.map((wp) => (
              <div
                key={wp.id}
                className={`flex items-center py-1.5 px-2 rounded cursor-pointer ${
                  selectedWpId === wp.id ? "bg-teal-100 text-teal-800" : "hover:bg-zinc-100"
                }`}
                style={{ paddingLeft: 8 + (level + 1) * 16 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWpId(wp.id);
                }}
              >
                <span className="w-4" />
                <span className="text-sm">
                  {wp.code} – {wp.name}
                </span>
                <span className="text-xs text-zinc-400 ml-1">(WP)</span>
              </div>
            ))}
          {isExp &&
            (item as any).children?.length > 0 &&
            renderWbsNode((item as any).children, level + 1)}
        </div>
      );
    });
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-4 p-4 pb-12">
      <Tabs value={activeTab}>
        <TabsContent value="home" className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          <Card className="flex w-full shrink-0 flex-col lg:w-96">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">WBS & Work Packages</CardTitle>
                {pid ? (
                  <FinalizeWbsButton
                    projectId={pid}
                    wbsItems={wbsItems}
                    workPackages={workPackages}
                    wbsFinalized={isWbsFinalized}
                    onInvalidIds={(ids) => {
                      setFlashingWbsIds(new Set(ids));
                      setExpandedWbs((prev) => new Set([...prev, ...ids]));
                    }}
                  />
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">
                Build the tree gradually (up to 9 levels). Lowest-level WBS must end with work packages.{" "}
                <Link href={`/projects/${pid}/wbs`} className="text-teal-600 hover:underline">
                  Full WBS editor
                </Link>
                {" · "}
                <Link href={`/newproject/${pid}`} className="text-teal-600 hover:underline">
                  Project setup
                </Link>
              </p>
            </CardHeader>
            <CardContent className="p-0 px-2 pb-4">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : hierarchy.length === 0 ? (
                <p className="text-sm text-zinc-500 p-4">
                  No WBS items. Import WBS or add from project.
                </p>
              ) : (
                renderWbsNode(hierarchy, 0)
              )}
            </CardContent>
          </Card>

          <Card className="flex min-w-0 w-full flex-1 flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold tracking-tight text-amber-800">
                {selectedWP
                  ? `${selectedWP.code} – ${selectedWP.name}`
                  : "Select a work package"}
              </CardTitle>
              {selectedWP && (
                <p className="text-sm text-zinc-600">
                  Materials, services and resources mapped to this work package
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!selectedWpId ? (
                <div className="flex h-full items-center justify-center text-zinc-500 border-2 border-dashed rounded-lg p-8">
                  <p>Click a work package in the list to view its materials, services and resources.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Materials */}
                  <div className="group rounded-xl border border-zinc-200 bg-white/80 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 p-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-zinc-700">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <Package className="h-4 w-4" />
                      </span>
                      <span className="tracking-wide uppercase text-xs font-semibold text-amber-700">
                        Materials
                      </span>
                    </h4>
                    {wpMaterials.length === 0 ? (
                      <p className="text-sm text-zinc-500">No materials assigned.</p>
                    ) : (
                      <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Code
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Description
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              UOM
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Qty
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Est. Value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wpMaterials.map((r: any) => (
                            <TableRow key={r.id} className="hover:bg-amber-50/40">
                              <TableCell className="font-semibold text-zinc-800">
                                {r.materialCode}
                              </TableCell>
                              <TableCell className="text-zinc-700">
                                {r.materialDescription}
                              </TableCell>
                              <TableCell className="text-zinc-600">
                                {r.uom}
                              </TableCell>
                              <TableCell className="text-right font-mono text-zinc-800">
                                {r.quantity}
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-700">
                                {formatCurrency(Number(r.estimatedValue || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  <div className="group rounded-xl border border-zinc-200 bg-white/80 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 p-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-zinc-700">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <Wrench className="h-4 w-4" />
                      </span>
                      <span className="tracking-wide uppercase text-xs font-semibold text-sky-700">
                        Services
                      </span>
                    </h4>
                    {wpServices.length === 0 ? (
                      <p className="text-sm text-zinc-500">No services assigned.</p>
                    ) : (
                      <div className="w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Code
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Description
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              UOM
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Qty
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Est. Value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wpServices.map((r: any) => (
                            <TableRow key={r.id} className="hover:bg-sky-50/40">
                              <TableCell className="font-semibold text-zinc-800">
                                {r.serviceCode}
                              </TableCell>
                              <TableCell className="text-zinc-700">
                                {r.serviceDescription}
                              </TableCell>
                              <TableCell className="text-zinc-600">
                                {r.uom}
                              </TableCell>
                              <TableCell className="text-right font-mono text-zinc-800">
                                {r.quantity}
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-700">
                                {formatCurrency(Number(r.estimatedValue || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </div>

                  {/* Resources */}
                  <div className="group rounded-xl border border-zinc-200 bg-white/80 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 p-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-zinc-700">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="tracking-wide uppercase text-xs font-semibold text-emerald-700">
                        Resources (Manpower &amp; Equipment)
                      </span>
                    </h4>
                    {wpResources.length === 0 ? (
                      <p className="text-sm text-zinc-500">No resources assigned.</p>
                    ) : (
                      <div className="w-full overflow-x-auto">
                      <Table className="min-w-[640px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Type
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                              Rate UOM
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Hourly rate
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Qty
                            </TableHead>
                            <TableHead className="text-xs font-semibold tracking-wide text-zinc-500 uppercase text-right">
                              Est. Value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wpResources.map((r: any) => (
                            <TableRow key={r.id} className="hover:bg-emerald-50/40">
                              <TableCell className="font-semibold text-zinc-800">
                                {r.name}
                              </TableCell>
                              <TableCell className="text-zinc-700">
                                {r.type}
                              </TableCell>
                              <TableCell className="text-zinc-600">
                                {RESOURCE_HOURLY_UOM}
                              </TableCell>
                              <TableCell className="text-right font-mono text-zinc-800">
                                {formatCurrency(getResourceUnitRate(r))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-zinc-800">
                                {r.quantity}
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-700">
                                {formatCurrency(getResourceEstimatedValue(r))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            {selectedWpId && (
              <div className="px-6 pb-6 pt-2 flex justify-end border-t border-zinc-100">
                {isAlreadyPlanned && !loadingPlannedCost && (
                  <div className="flex flex-col items-end mr-4">
                    <span className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                      Already planned
                    </span>
                  </div>
                )}
                <Button
                  variant="default"
                  disabled={markPlannedMutation.isLoading || isAlreadyPlanned || loadingPlannedCost}
                  onClick={() => markPlannedMutation.mutate(selectedWpId)}
                >
                  {markPlannedMutation.isLoading
                    ? "Saving planned costs..."
                    : isAlreadyPlanned
                      ? "Mark work package as planned"
                      : "Mark work package as planned"}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <WorkPackageActivitiesPanel
            projectId={pid}
            workPackages={workPackages}
            selectedWpId={selectedWpId}
            onSelectWp={setSelectedWpId}
          />
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Performance</CardTitle>
              <p className="text-sm text-zinc-500">
                WP budget spent (%) vs activity completion (%) for each work package.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-zinc-500 border-2 border-dashed rounded-lg">
                Cost performance: % budget spent vs % activity completion — to be developed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Performance</CardTitle>
              <p className="text-sm text-zinc-500">
                % planned to date vs % actually achieved.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-zinc-500 border-2 border-dashed rounded-lg">
                Schedule performance: planned % vs actual % — to be developed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Progress</CardTitle>
              <p className="text-sm text-zinc-500">
                Progress to date for each activity under work packages.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-zinc-500 border-2 border-dashed rounded-lg">
                Activity progress to date — to be developed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
