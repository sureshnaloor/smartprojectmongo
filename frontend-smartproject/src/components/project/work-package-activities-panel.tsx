import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  ACTIVITY_TYPE_LABELS,
  computeActivityBudget,
  computeEarnedValue,
  type ProjectActivityType,
  type ActivityMilestone,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, ListTodo } from "lucide-react";
import {
  ActivityFormDialog,
  type ProjectActivityFormValues,
} from "@/components/project/activity-form-dialog";

interface WorkPackage {
  id: number;
  name: string;
  code: string;
  budgetedCost: string;
}

export interface WpProjectActivity {
  id: number;
  projectId: number;
  wpId: number;
  activityType?: ProjectActivityType | string | null;
  name: string;
  description?: string | null;
  unitOfMeasure?: string | null;
  unitRate?: string | null;
  quantity?: string | null;
  totalBudget?: string | null;
  percentComplete?: number | null;
  progressState?: number | null;
  milestones?: ActivityMilestone[] | null;
  finalized?: boolean;
  remarks?: string | null;
}

interface WorkPackageActivitiesPanelProps {
  projectId: number;
  workPackages: WorkPackage[];
  selectedWpId: number | null;
  onSelectWp: (wpId: number) => void;
}

function activityToFormValues(a: WpProjectActivity): ProjectActivityFormValues {
  return {
    id: a.id,
    activityType: (a.activityType ?? "units") as ProjectActivityType,
    name: a.name,
    description: a.description ?? "",
    remarks: a.remarks ?? "",
    unitOfMeasure: a.unitOfMeasure ?? "",
    unitRate: a.unitRate ?? "0",
    quantity: a.quantity ?? "1",
    totalBudget: a.totalBudget ?? "0",
    percentComplete: a.percentComplete ?? 0,
    progressState: (a.progressState ?? 0) as 0 | 50 | 100,
    milestones: a.milestones ?? [],
  };
}

function formatActivityDetail(a: WpProjectActivity): string {
  const type = (a.activityType ?? "units") as ProjectActivityType;
  if (type === "units") {
    return `${a.quantity} ${a.unitOfMeasure} @ ${a.unitRate}`;
  }
  if (type === "milestone") {
    const count = a.milestones?.length ?? 0;
    return `${count} milestone${count === 1 ? "" : "s"}`;
  }
  if (type === "lumpsum") return "Lump sum";
  if (type === "progress_0_50_100") return "0/50/100";
  return "";
}

export function WorkPackageActivitiesPanel({
  projectId,
  workPackages,
  selectedWpId,
  onSelectWp,
}: WorkPackageActivitiesPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WpProjectActivity | null>(null);

  const selectedWp = workPackages.find((wp) => wp.id === selectedWpId) ?? null;
  const wpBudget = Number(selectedWp?.budgetedCost ?? 0);

  const { data: activities = [], isLoading } = useQuery<WpProjectActivity[]>({
    queryKey: ["wp-activities", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/activities`);
      if (!res.ok) throw new Error("Failed to load activities");
      return res.json();
    },
    enabled: !!selectedWpId,
  });

  const budgetSummary = useMemo(() => {
    const allocated = activities.reduce((s, a) => s + computeActivityBudget(a), 0);
    const earned = activities.reduce((s, a) => s + computeEarnedValue(a), 0);
    return { allocated, earned, remaining: wpBudget - allocated };
  }, [activities, wpBudget]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wp-activities", selectedWpId] });
    queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: ProjectActivityFormValues) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/activities`, {
        wpId: selectedWpId,
        activityType: values.activityType,
        name: values.name,
        description: values.description || null,
        remarks: values.remarks || null,
        unitOfMeasure: values.activityType === "units" ? values.unitOfMeasure : null,
        unitRate: values.activityType === "units" ? values.unitRate : null,
        quantity: values.activityType === "units" ? values.quantity : null,
        totalBudget:
          values.activityType !== "units" ? values.totalBudget : null,
        percentComplete: values.percentComplete,
        progressState: values.progressState,
        milestones: values.activityType === "milestone" ? values.milestones : null,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to create activity");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Activity created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: ProjectActivityFormValues;
    }) => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}/activities/${id}`, {
        wpId: selectedWpId,
        activityType: values.activityType,
        name: values.name,
        description: values.description || null,
        remarks: values.remarks || null,
        unitOfMeasure: values.activityType === "units" ? values.unitOfMeasure : null,
        unitRate: values.activityType === "units" ? values.unitRate : null,
        quantity: values.activityType === "units" ? values.quantity : null,
        totalBudget:
          values.activityType !== "units" ? values.totalBudget : null,
        percentComplete: values.percentComplete,
        progressState: values.progressState,
        milestones: values.activityType === "milestone" ? values.milestones : null,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to update activity");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Activity updated" });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/activities/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to delete activity");
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Activity deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (values: ProjectActivityFormValues) => {
    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Card className="lg:w-72 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Work Packages</CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-[420px] overflow-y-auto">
          {workPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6">No work packages yet.</p>
          ) : (
            <ul>
              {workPackages.map((wp) => (
                <li key={wp.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-100 border-b border-zinc-100 ${
                      selectedWpId === wp.id ? "bg-teal-50 text-teal-900 font-medium" : ""
                    }`}
                    onClick={() => onSelectWp(wp.id)}
                  >
                    <span className="font-mono text-xs text-zinc-500">{wp.code}</span>
                    <div>{wp.name}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 min-w-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              {selectedWp ? `${selectedWp.code} – ${selectedWp.name}` : "Activities"}
            </CardTitle>
            {selectedWp && (
              <p className="text-sm text-muted-foreground mt-1">
                WP budget {formatCurrency(wpBudget)} · Allocated{" "}
                {formatCurrency(budgetSummary.allocated)} · Remaining{" "}
                <span
                  className={
                    budgetSummary.remaining < 0 ? "text-red-600 font-medium" : ""
                  }
                >
                  {formatCurrency(budgetSummary.remaining)}
                </span>
              </p>
            )}
          </div>
          {selectedWpId && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Activity
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!selectedWpId ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
              Select a work package to manage its activities.
            </div>
          ) : isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg gap-2">
              <p>No activities yet for this work package.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add first activity
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((a) => {
                  const type = (a.activityType ?? "units") as ProjectActivityType;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ACTIVITY_TYPE_LABELS[type]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatActivityDetail(a)}
                        {type === "milestone" && a.milestones?.length ? (
                          <div className="text-xs mt-1">
                            {a.milestones.map((m, i) => (
                              <span key={i} className="mr-2">
                                {m.name} ({m.weightPercent}%)
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(computeActivityBudget(a))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(computeEarnedValue(a))}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={a.finalized}
                            onClick={() => {
                              setEditing(a);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={a.finalized || deleteMutation.isLoading}
                            onClick={() => {
                              if (confirm(`Delete activity "${a.name}"?`)) {
                                deleteMutation.mutate(a.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing ? activityToFormValues(editing) : null}
        wpBudget={wpBudget}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
