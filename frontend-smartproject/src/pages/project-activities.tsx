import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "lucide-react";
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
} from "@/components/project-activities/activities-work-packages-panel";
import {
  fetchProjectWorkPackages,
  type ActivityCatalogTab,
  type GlobalActivityItem,
  type ProjectActivityAssignment,
  type SortKey,
} from "@/components/project-activities/constants";

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

  const { data: project } = useQuery<{ name: string; currency?: string }>({
    queryKey: [`/api/projects/${projectId}`],
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
    const ids = new Set<number>();
    allProjectActivities.forEach((a) => {
      if (a.globalActivityId) ids.add(a.globalActivityId);
    });
    return ids;
  }, [allProjectActivities]);

  const projectCatalog = useMemo(
    () => globalActivities.filter((a) => allocatedGlobalIds.has(a.id)),
    [globalActivities, allocatedGlobalIds]
  );

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
        activityType: "units",
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to create activity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({ title: "Activity created" });
      setAddActivityOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectActivityAssignment> }) =>
      put(`/projects/${projectId}/activities/${id}`, data),
    onSuccess: () => {
      invalidateAssignments();
      toast({ title: "Activity updated" });
      setEditingActivity(null);
      setIsEditDialogOpen(false);
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
  };

  const handleDragStart = (e: React.DragEvent, activity: GlobalActivityItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ activity, catalogTab }));
    setDraggedActivity(activity);
  };

  const beginAssign = (activity: GlobalActivityItem, wpId: number) => {
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

    setSelectedWpId(wpId);
    setDraggedActivity(activity);
    setPendingWpId(wpId);
    setQuantity("1");
    setDuration("1");
    setShowAssignDialog(true);
  };

  const handleDrop = (e: React.DragEvent, wpId: number) => {
    e.preventDefault();
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
    if (!draggedActivity || pendingWpId == null) return;

    if (mappingMode === "date-range" && (!dateRange?.from || !dateRange?.to)) {
      toast({ title: "Error", description: "Please select both start and end dates", variant: "destructive" });
      return;
    }
    if (mappingMode === "duration" && (!duration || parseInt(duration, 10) <= 0)) {
      toast({ title: "Error", description: "Please enter a valid duration", variant: "destructive" });
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast({ title: "Error", description: "Please enter a valid quantity", variant: "destructive" });
      return;
    }

    const isCustom = catalogTab === "custom";
    createMutation.mutate({
      wpId: pendingWpId,
      globalActivityId: isCustom ? null : draggedActivity.id,
      name: draggedActivity.name,
      description: draggedActivity.description,
      unitOfMeasure: draggedActivity.unitOfMeasure,
      unitRate: draggedActivity.unitRate,
      quantity,
      remarks: draggedActivity.remarks,
      plannedFromDate: mappingMode === "date-range" ? format(dateRange!.from!, "yyyy-MM-dd") : null,
      plannedToDate: mappingMode === "date-range" ? format(dateRange!.to!, "yyyy-MM-dd") : null,
      duration: mappingMode === "duration" ? parseInt(duration, 10) : null,
    });
  };

  const handleRefresh = () => {
    refetchWorkPackages();
    refetchGlobal();
    refetchProjectActivities();
  };

  const handleDelete = (id: number) => {
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
        onImportCsv={() => setIsImportModalOpen(true)}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

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
            onAdd={() => setAddActivityOpen(true)}
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
              setEditingActivity(row);
              setIsEditDialogOpen(true);
            }}
            onDelete={handleDelete}
            projectId={projectId ?? ""}
          />
        </div>
      </div>

      <Dialog open={showAssignDialog} onOpenChange={(open) => !open && resetAssignState()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign activity</DialogTitle>
          </DialogHeader>
          {draggedActivity && (
            <div className="space-y-4 py-2">
              <div>
                <p className="kanban-body-md font-medium text-[var(--text-primary)]">{draggedActivity.name}</p>
                <p className="kanban-body-sm text-[var(--text-secondary)]">
                  {draggedActivity.unitRate} / {draggedActivity.unitOfMeasure}
                </p>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>
              {mappingMode === "duration" ? (
                <div>
                  <Label>Duration (days)</Label>
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
              <div className="flex gap-2">
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
