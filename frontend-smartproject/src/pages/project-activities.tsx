import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ImportProjectActivitiesModal } from "@/components/project/import-project-activities-modal";
import {
  ActivityFormDialog,
  type ProjectActivityFormValues,
} from "@/components/project/activity-form-dialog";
import { ActivitiesPageHeader } from "@/components/project-activities/activities-page-header";
import { ActivitiesListPanel } from "@/components/project-activities/activities-list-panel";
import {
  ActivitiesWorkPackagesPanel,
  type ActivityMappingMode,
  type WbsItemSimple,
} from "@/components/project-activities/activities-work-packages-panel";
import {
  fetchProjectWorkPackages,
  type ActivityCatalogTab,
  type GlobalActivityItem,
  type ProjectActivityAssignment,
  type SortKey,
} from "@/components/project-activities/constants";
import { type ActivityMilestone, validateMilestones } from "@shared/activity-types";

function formToGlobalPayload(values: ProjectActivityFormValues) {
  return {
    activityType: values.activityType,
    name: values.name,
    description: values.description || null,
    remarks: values.remarks || null,
    unitOfMeasure: values.activityType === "units" ? values.unitOfMeasure : "ea",
    unitRate: values.activityType === "units" ? values.unitRate : "0",
  };
}

const defaultAssignMilestones = (): ActivityMilestone[] => [
  { name: "Milestone 1", weightPercent: 25 },
  { name: "Milestone 2", weightPercent: 25 },
  { name: "Milestone 3", weightPercent: 25 },
  { name: "Milestone 4", weightPercent: 25 },
];

export default function ProjectActivities() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [catalogTab, setCatalogTab] = useState<ActivityCatalogTab>("global");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [mappingMode, setMappingMode] = useState<ActivityMappingMode>("duration");

  const [draggedActivity, setDraggedActivity] = useState<GlobalActivityItem | null>(null);
  const [pendingWpId, setPendingWpId] = useState<number | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [duration, setDuration] = useState("1");
  const [totalBudget, setTotalBudget] = useState("0");
  const [categoryTag, setCategoryTag] = useState<string>("resource-heavy");
  const [assignMilestones, setAssignMilestones] = useState<ActivityMilestone[]>(defaultAssignMilestones());

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ProjectActivityAssignment | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setSearchTerm("");
    setCategoryFilter("All");
    setSelectedActivityId(null);
  }, [catalogTab]);

  const { data: project } = useQuery<{ name: string; currency?: string; budgetFinalized?: boolean; wbsFinalized?: boolean }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  const isBudgetFinalized = Boolean(project?.budgetFinalized);

  const { data: wbsItems = [] } = useQuery<WbsItemSimple[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
    enabled: !!projectId,
  });

  const {
    data: globalActivities = [],
    isLoading: globalLoading,
    refetch: refetchGlobal,
    isFetching: globalFetching,
  } = useQuery<GlobalActivityItem[]>({
    queryKey: ["activities"],
    queryFn: () => get("/activities"),
    enabled: !!projectId,
  });

  const {
    data: workPackages = [],
    isLoading: workPackagesLoading,
    isError: workPackagesError,
    refetch: refetchWorkPackages,
    isFetching: workPackagesFetching,
  } = useQuery({
    queryKey: ["work-packages", projectId],
    queryFn: () => fetchProjectWorkPackages(projectId ?? ""),
    enabled: !!projectId,
    retry: 2,
  });

  const { data: allProjectActivities = [], refetch: refetchProjectActivities } = useQuery<
    ProjectActivityAssignment[]
  >({
    queryKey: ["project-activities", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activities`);
      if (!res.ok) throw new Error("Failed to fetch project activities");
      return res.json();
    },
    enabled: !!projectId,
  });

  const allocatedGlobalIds = useMemo(() => {
    const set = new Set<number>();
    allProjectActivities.forEach((a) => {
      if (a.globalActivityId != null) set.add(a.globalActivityId);
    });
    return set;
  }, [allProjectActivities]);

  const projectCatalog = useMemo(() => {
    const map = new Map<string, GlobalActivityItem>();
    for (const pa of allProjectActivities) {
      if (!map.has(pa.name)) {
        map.set(pa.name, {
          id: pa.globalActivityId ?? pa.id,
          name: pa.name,
          description: pa.description,
          unitOfMeasure: pa.unitOfMeasure,
          unitRate: pa.unitRate,
          remarks: pa.remarks,
          activityType: pa.activityType ?? "units",
        });
      }
    }
    return Array.from(map.values());
  }, [allProjectActivities]);

  const customCatalog = useMemo(() => {
    const seen = new Set<string>();
    const items: GlobalActivityItem[] = [];
    for (const pa of allProjectActivities) {
      if (pa.globalActivityId != null) continue;
      const key = pa.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: pa.id,
        name: pa.name,
        description: pa.description,
        unitOfMeasure: pa.unitOfMeasure,
        unitRate: pa.unitRate,
        remarks: pa.remarks,
        activityType: pa.activityType ?? "units",
      });
    }
    return items;
  }, [allProjectActivities]);

  const catalogItems = useMemo(() => {
    if (catalogTab === "project") return projectCatalog;
    if (catalogTab === "custom") return customCatalog;
    return globalActivities;
  }, [catalogTab, globalActivities, projectCatalog, customCatalog]);

  const displayedAssignments = useMemo(
    () => allProjectActivities.filter((a) => selectedWpId == null || a.wpId === selectedWpId),
    [allProjectActivities, selectedWpId]
  );

  const invalidateAssignments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
    if (selectedWpId != null) {
      queryClient.invalidateQueries({ queryKey: ["wp-activities", selectedWpId] });
    }
  }, [queryClient, projectId, selectedWpId]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<ProjectActivityAssignment>) =>
      post(`/projects/${projectId}/activities`, data),
    onSuccess: () => {
      invalidateAssignments();
      toast({ title: "Activity assigned", description: "Activity added to work package." });
      resetAssignState();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createGlobalMutation = useMutation({
    mutationFn: async (values: ProjectActivityFormValues) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToGlobalPayload(values)),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? "Failed to create activity");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchGlobal();
      toast({ title: "Global activity created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectActivityAssignment> }) =>
      put(`/projects/${projectId}/activities/${id}`, data),
    onSuccess: () => {
      invalidateAssignments();
      toast({ title: "Activity updated" });
      setIsEditDialogOpen(false);
      setEditingActivity(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/api/projects/${projectId}/activities/${id}`),
    onSuccess: () => {
      invalidateAssignments();
      toast({ title: "Activity removed from work package" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetAssignState = () => {
    setDraggedActivity(null);
    setPendingWpId(null);
    setShowAssignDialog(false);
    setDateRange(null);
    setQuantity("1");
    setDuration("1");
    setTotalBudget("0");
    setCategoryTag("resource-heavy");
    setAssignMilestones(defaultAssignMilestones());
  };

  const handleDragStart = (e: React.DragEvent, activity: GlobalActivityItem) => {
    if (isBudgetFinalized) {
      toast({
        title: "Budget Finalized",
        description: "Work package budget is finalized. No further activities can be assigned to work packages.",
        variant: "destructive",
      });
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify({ activity, catalogTab }));
    setDraggedActivity(activity);
  };

  const beginAssign = (activity: GlobalActivityItem, wpId: number) => {
    if (isBudgetFinalized) {
      toast({
        title: "Budget Finalized",
        description: "Work package budget is finalized. No further activities can be assigned to work packages.",
        variant: "destructive",
      });
      return;
    }

    const exists = allProjectActivities.some(
      (pa) => pa.globalActivityId === activity.id && pa.wpId === wpId && catalogTab !== "custom"
    );
    if (exists && catalogTab !== "custom") {
      toast({
        title: "Already assigned",
        description: "This activity is already on this work package.",
        variant: "destructive",
      });
      return;
    }

    const type = activity.activityType ?? "units";
    setSelectedWpId(wpId);
    setDraggedActivity(activity);
    setPendingWpId(wpId);
    setQuantity("1");
    setDuration("1");
    setTotalBudget(activity.unitRate ? String(activity.unitRate) : "0");
    setCategoryTag(activity.categoryTag ?? "resource-heavy");
    setAssignMilestones(defaultAssignMilestones());
    setShowAssignDialog(true);
  };

  const handleDrop = (e: React.DragEvent, wpId: number) => {
    e.preventDefault();
    if (isBudgetFinalized) {
      toast({
        title: "Budget Finalized",
        description: "Work package budget is finalized. No further activities can be assigned to work packages.",
        variant: "destructive",
      });
      return;
    }
    const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("activity");
    if (!raw) {
      if (draggedActivity) beginAssign(draggedActivity, wpId);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const activity: GlobalActivityItem = parsed.activity ?? parsed;
      beginAssign(activity, wpId);
    } catch {
      /* ignore */
    }
  };

  const handleAssignConfirm = () => {
    if (isBudgetFinalized) {
      toast({
        title: "Budget Finalized",
        description: "Work package budget is finalized. No further activities can be assigned to work packages.",
        variant: "destructive",
      });
      return;
    }
    if (!draggedActivity || pendingWpId == null) return;
    const type = draggedActivity.activityType ?? "units";

    if (mappingMode === "date-range" && (!dateRange?.from || !dateRange?.to)) {
      toast({ title: "Error", description: "Please select both start and end dates", variant: "destructive" });
      return;
    }
    if ((type === "milestone" || type === "progress_0_50_100" || mappingMode === "duration") && (!duration || parseInt(duration, 10) <= 0)) {
      toast({ title: "Error", description: "Duration (number of days) is mandatory", variant: "destructive" });
      return;
    }
    if (type === "units" && (!quantity || parseFloat(quantity) <= 0)) {
      toast({ title: "Error", description: "Please enter a valid quantity", variant: "destructive" });
      return;
    }
    if ((type === "milestone" || type === "lumpsum" || type === "progress_0_50_100") && (!totalBudget || parseFloat(totalBudget) <= 0)) {
      toast({ title: "Error", description: "Estimated cost / budget value is mandatory", variant: "destructive" });
      return;
    }

    if (type === "milestone") {
      const milestoneErr = validateMilestones(assignMilestones);
      if (milestoneErr) {
        toast({ title: "Milestone Error", description: milestoneErr, variant: "destructive" });
        return;
      }
    }

    const isCustom = catalogTab === "custom";
    const finalUom = type === "lumpsum" ? "LOT" : (draggedActivity.unitOfMeasure || "ea");
    const finalQty = type === "units" ? quantity : "1";
    const calculatedBudget = type === "units"
      ? (parseFloat(quantity || "1") * parseFloat(draggedActivity.unitRate || "0")).toString()
      : totalBudget;
    const calculatedRate = type === "units" ? (draggedActivity.unitRate || "0") : totalBudget;

    createMutation.mutate({
      wpId: pendingWpId,
      globalActivityId: isCustom ? null : draggedActivity.id,
      activityType: type,
      categoryTag: categoryTag || "resource-heavy",
      name: draggedActivity.name,
      description: draggedActivity.description,
      unitOfMeasure: finalUom,
      unitRate: calculatedRate,
      quantity: finalQty,
      totalBudget: calculatedBudget,
      milestones: type === "milestone" ? assignMilestones : null,
      remarks: draggedActivity.remarks,
      plannedFromDate: mappingMode === "date-range" ? format(dateRange!.from!, "yyyy-MM-dd") : null,
      plannedToDate: mappingMode === "date-range" ? format(dateRange!.to!, "yyyy-MM-dd") : null,
      duration: (type === "milestone" || type === "progress_0_50_100" || mappingMode === "duration") ? parseInt(duration, 10) : null,
    } as any);
  };

  const handleRefresh = () => {
    refetchWorkPackages();
    refetchGlobal();
    refetchProjectActivities();
  };

  const handleDelete = (id: number) => {
    if (isBudgetFinalized) {
      toast({
        title: "Budget Finalized",
        description: "Work package budget is finalized. Assigned activities cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("Remove this activity from the work package?")) {
      deleteMutation.mutate(id);
    }
  };

  const refreshing = globalFetching || workPackagesFetching;

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] flex-col overflow-hidden bg-[var(--bg-cream)]">
      <ActivitiesPageHeader
        projectId={projectId ?? ""}
        projectName={project?.name}
        activeTab={catalogTab}
        onTabChange={setCatalogTab}
        globalCount={globalActivities.length}
        projectCount={projectCatalog.length}
        customCount={customCatalog.length}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        onImportCsv={() => {
          if (isBudgetFinalized) {
            toast({
              title: "Budget Finalized",
              description: "Work package budget is finalized. No further activities can be imported or assigned.",
              variant: "destructive",
            });
            return;
          }
          setIsImportModalOpen(true);
        }}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {isBudgetFinalized && (
        <div className="mx-6 lg:mx-8 mb-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-amber-800 dark:text-amber-300 font-medium text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔒</span>
            <span>Work package budget for this project is <strong>Finalized</strong>. Activity assignments and budgets are locked and read-only.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] uppercase font-bold tracking-wider shrink-0">Locked</span>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 pb-6 lg:grid-cols-[3fr_2fr] lg:overflow-hidden lg:px-8">
        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          <ActivitiesListPanel
            items={catalogItems}
            totalCount={catalogItems.length}
            search={debouncedSearch}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            onClearSearch={() => setSearchTerm("")}
            sortKey={sortKey}
            onSortChange={setSortKey}
            selectedId={selectedActivityId}
            onSelect={setSelectedActivityId}
            onAdd={catalogTab === "custom" ? () => {
              if (isBudgetFinalized) {
                toast({
                  title: "Budget Finalized",
                  description: "Work package budget is finalized. No further activities can be created or assigned.",
                  variant: "destructive",
                });
                return;
              }
              setAddActivityOpen(true);
            } : undefined}
            onDragStart={handleDragStart}
            allocatedIds={allocatedGlobalIds}
            loading={globalLoading && catalogTab === "global"}
            emptyMessage={
              catalogTab === "project"
                ? "No project activities yet. Assign global activities to work packages."
                : catalogTab === "custom"
                  ? "No custom activities yet."
                  : undefined
            }
          />
        </div>

        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          <ActivitiesWorkPackagesPanel
            workPackages={workPackages}
            wbsItems={wbsItems}
            selectedWpId={selectedWpId}
            onSelectWp={setSelectedWpId}
            assignments={displayedAssignments}
            loading={workPackagesLoading}
            error={workPackagesError}
            onRetry={() => refetchWorkPackages()}
            onDrop={handleDrop}
            mappingMode={mappingMode}
            onMappingModeChange={setMappingMode}
            onEdit={(row) => {
              if (isBudgetFinalized) {
                toast({
                  title: "Budget Finalized",
                  description: "Work package budget is finalized. Assigned activities cannot be edited.",
                  variant: "destructive",
                });
                return;
              }
              setEditingActivity(row);
              setIsEditDialogOpen(true);
            }}
            onDelete={handleDelete}
            projectId={projectId ?? ""}
          />
        </div>
      </div>

      <Dialog open={showAssignDialog} onOpenChange={(open) => !open && resetAssignState()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign activity</DialogTitle>
          </DialogHeader>
          {draggedActivity && (
            <div className="space-y-4 py-2">
              <div>
                <p className="kanban-body-md font-medium text-[var(--text-primary)]">{draggedActivity.name}</p>
                <p className="kanban-body-sm text-[var(--text-secondary)]">
                  Type: <span className="font-semibold">{draggedActivity.activityType ?? "units"}</span>
                  {draggedActivity.activityType === "lumpsum" ? " (LOT)" : draggedActivity.unitOfMeasure ? ` · ${draggedActivity.unitOfMeasure}` : ""}
                </p>
              </div>

              {draggedActivity.activityType === "lumpsum" ? (
                <div className="rounded-md border p-3 bg-muted/40 text-xs text-muted-foreground">
                  For Lump Sum activities, Unit of Measure is fixed to <strong>LOT</strong> and Quantity is fixed to <strong>1</strong>.
                </div>
              ) : draggedActivity.activityType === "units" ? (
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : null}

              {(draggedActivity.activityType === "milestone" || draggedActivity.activityType === "lumpsum" || draggedActivity.activityType === "progress_0_50_100") && (
                <div>
                  <Label>Estimated Budget / Value *</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0.01"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="Enter budget value"
                    className="mt-1"
                  />
                </div>
              )}

              {draggedActivity.activityType === "milestone" && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Milestones (weights must total 100%) *</Label>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        Math.abs(assignMilestones.reduce((s, m) => s + Number(m.weightPercent || 0), 0) - 100) < 0.01
                          ? "text-emerald-600 font-bold"
                          : "text-amber-600 font-bold"
                      )}
                    >
                      Total: {assignMilestones.reduce((s, m) => s + Number(m.weightPercent || 0), 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {assignMilestones.map((m, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          className="flex-1 h-8 text-xs"
                          placeholder="Milestone name"
                          value={m.name}
                          onChange={(e) => {
                            const next = [...assignMilestones];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setAssignMilestones(next);
                          }}
                        />
                        <Input
                          type="number"
                          className="w-16 h-8 text-xs text-right font-mono"
                          min="0"
                          max="100"
                          value={m.weightPercent}
                          onChange={(e) => {
                            const next = [...assignMilestones];
                            next[idx] = {
                              ...next[idx],
                              weightPercent: Number(e.target.value),
                            };
                            setAssignMilestones(next);
                          }}
                        />
                        <span className="text-xs text-muted-foreground w-3">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={assignMilestones.length <= 1}
                          onClick={() => setAssignMilestones(assignMilestones.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs mt-1"
                    onClick={() => setAssignMilestones([...assignMilestones, { name: "", weightPercent: 0 }])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Milestone
                  </Button>
                </div>
              )}

              <div>
                <Label>Activity Tag / Cost Category *</Label>
                <Select value={categoryTag} onValueChange={setCategoryTag}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Category Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="materials-heavy">
                      📦 Materials Heavy (High-value equipment like Compressor, Motors, SCADA)
                    </SelectItem>
                    <SelectItem value="subcontract-heavy">
                      🤝 Subcontract Heavy (External services & subcontracts)
                    </SelectItem>
                    <SelectItem value="resource-heavy">
                      🚜 Resource Heavy (Normal installation, manpower, tools)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(draggedActivity.activityType === "milestone" || draggedActivity.activityType === "progress_0_50_100" || mappingMode === "duration") ? (
                <div>
                  <Label>Duration (number of days) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label>Date range</Label>
                  <DateRangePicker
                    value={dateRange ?? undefined}
                    onChange={setDateRange}
                    placeholder="Select date range"
                    className="mt-1"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAssignConfirm} disabled={createMutation.isPending}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
                <Button variant="outline" onClick={resetAssignState}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit assignment</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: editingActivity.id,
                  data: {
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    unitOfMeasure: formData.get("unitOfMeasure") as string,
                    unitRate: formData.get("unitRate") as string,
                    quantity: formData.get("quantity") as string,
                    categoryTag: (formData.get("categoryTag") as string) || "resource-heavy",
                    remarks: formData.get("remarks") as string,
                    duration: formData.get("duration") ? parseInt(formData.get("duration") as string, 10) : null,
                    plannedFromDate: editingActivity.plannedFromDate,
                    plannedToDate: editingActivity.plannedToDate,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editingActivity.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryTag">Activity Tag / Cost Category *</Label>
                <Select name="categoryTag" defaultValue={editingActivity.categoryTag || "resource-heavy"}>
                  <SelectTrigger id="categoryTag" className="mt-1">
                    <SelectValue placeholder="Select Category Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="materials-heavy">
                      📦 Materials Heavy (High-value equipment & materials)
                    </SelectItem>
                    <SelectItem value="subcontract-heavy">
                      🤝 Subcontract Heavy (External services & subcontracts)
                    </SelectItem>
                    <SelectItem value="resource-heavy">
                      🚜 Resource Heavy (Normal installation, manpower, tools)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editingActivity.description || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitOfMeasure">Unit</Label>
                  <Input id="unitOfMeasure" name="unitOfMeasure" defaultValue={editingActivity.unitOfMeasure} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitRate">Rate</Label>
                  <Input
                    id="unitRate"
                    name="unitRate"
                    type="number"
                    step="0.01"
                    defaultValue={editingActivity.unitRate}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  defaultValue={editingActivity.quantity}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Planned date range</Label>
                  <DateRangePicker
                    value={{
                      from: editingActivity.plannedFromDate ? new Date(editingActivity.plannedFromDate) : undefined,
                      to: editingActivity.plannedToDate ? new Date(editingActivity.plannedToDate) : undefined,
                    }}
                    onChange={(range) => {
                      setEditingActivity({
                        ...editingActivity,
                        plannedFromDate: range?.from ? format(range.from, "yyyy-MM-dd") : null,
                        plannedToDate: range?.to ? format(range.to, "yyyy-MM-dd") : null,
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duration (days)</Label>
                  <Input
                    id="edit-duration"
                    name="duration"
                    type="number"
                    defaultValue={editingActivity.duration || 0}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" name="remarks" defaultValue={editingActivity.remarks || ""} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  Update
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ActivityFormDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
        mode="global"
        onSubmit={async (values) => {
          await createGlobalMutation.mutateAsync(values);
        }}
        isSubmitting={createGlobalMutation.isPending}
      />

      <ImportProjectActivitiesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={Number(projectId)}
      />
    </div>
  );
}
