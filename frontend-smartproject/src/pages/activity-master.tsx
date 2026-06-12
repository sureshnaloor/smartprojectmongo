import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Upload, Download, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ACTIVITY_TYPE_LABELS,
  type ProjectActivityType,
  type ActivityMilestone,
} from "@shared/activity-types";
import {
  ActivityFormDialog,
  type ProjectActivityFormValues,
} from "@/components/project/activity-form-dialog";

interface GlobalActivity {
  id: number;
  name: string;
  description?: string | null;
  activityType?: ProjectActivityType | string | null;
  unitOfMeasure?: string | null;
  unitRate?: string | null;
  quantity?: string | null;
  totalBudget?: string | null;
  percentComplete?: number | null;
  progressState?: number | null;
  milestones?: ActivityMilestone[] | null;
  remarks?: string | null;
}

function activityToForm(a: GlobalActivity): ProjectActivityFormValues {
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

function formToPayload(values: ProjectActivityFormValues) {
  return {
    activityType: values.activityType,
    name: values.name,
    description: values.description || null,
    remarks: values.remarks || null,
    unitOfMeasure: values.activityType === "units" ? values.unitOfMeasure : null,
    unitRate: values.activityType === "units" ? values.unitRate : null,
    quantity: null,
    totalBudget: null,
    percentComplete: 0,
    progressState: 0,
    milestones: values.activityType === "milestone" ? values.milestones : null,
  };
}

function formatDetail(a: GlobalActivity): string {
  const type = (a.activityType ?? "units") as ProjectActivityType;
  if (type === "units") {
    return `${a.unitOfMeasure ?? "—"} @ ${a.unitRate ?? "0"}`;
  }
  if (type === "milestone") {
    return `${a.milestones?.length ?? 0} milestones`;
  }
  if (type === "lumpsum") return "Scope template";
  if (type === "progress_0_50_100") return "0/50/100 template";
  return "";
}

function formatRefValue(a: GlobalActivity): string {
  const type = (a.activityType ?? "units") as ProjectActivityType;
  if (type === "units") {
    return a.unitRate ?? "—";
  }
  return "—";
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function ActivityMaster() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalActivity | null>(null);
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery<GlobalActivity[]>({
    queryKey: ["/api/activities"],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/activities"] });

  const createMutation = useMutation({
    mutationFn: async (values: ProjectActivityFormValues) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(values)),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Activity created");
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ProjectActivityFormValues }) => {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(values)),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Activity updated");
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseApiError(res));
    },
    onSuccess: () => {
      invalidate();
      toast.success("Activity deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (csvData: unknown[]) => {
      const res = await fetch("/api/activities/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    onSuccess: (data: GlobalActivity[]) => {
      invalidate();
      toast.success(`${data.length} activities imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.unitOfMeasure ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activities, searchQuery]
  );

  const handleSubmit = async (values: ProjectActivityFormValues) => {
    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());
        const csvData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          return {
            name: values[headers.indexOf("name")],
            description: values[headers.indexOf("description")] || null,
            activityType: values[headers.indexOf("activityType")] || "units",
            unitOfMeasure: values[headers.indexOf("unitOfMeasure")] || null,
            unitRate: values[headers.indexOf("unitRate")] || null,
            totalBudget: values[headers.indexOf("totalBudget")] || null,
            remarks: values[headers.indexOf("remarks")] || null,
          };
        });
        bulkUploadMutation.mutate(csvData);
      } catch {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1 space-y-4 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            Activity Master
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Company-wide activity library. Units activities carry a reference rate and UOM; milestone, lump-sum, and 0/50/100 templates define scope only — budget is set per project when assigned to a work package. UOMs must come from the{" "}
            <Link href="/activity-master/uom" className="text-teal-600 hover:underline">
              UOM master
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[220px] sm:w-[280px]"
            />
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Activity
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/templates/activity-master-template.csv";
              link.download = "activity-master-template.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Template
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={bulkUploadMutation.isPending}
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading activities…</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No activities yet. Add UOMs first, then create your global activity catalog.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Ref. unit rate</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const type = (activity.activityType ?? "units") as ProjectActivityType;
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="font-medium">{activity.name}</div>
                      {activity.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{activity.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ACTIVITY_TYPE_LABELS[type]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDetail(activity)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatRefValue(activity)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(activity);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Delete "${activity.name}"?`)) {
                              deleteMutation.mutate(activity.id);
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
      </div>

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing ? activityToForm(editing) : null}
        mode="global"
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
