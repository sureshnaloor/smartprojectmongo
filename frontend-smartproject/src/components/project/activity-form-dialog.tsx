import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROJECT_ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_DESCRIPTIONS,
  type ProjectActivityType,
  type ActivityMilestone,
  computeActivityBudget,
  validateMilestones,
} from "@shared/activity-types";

export interface ProjectActivityFormValues {
  id?: number;
  activityType: ProjectActivityType;
  categoryTag?: string;
  name: string;
  description: string;
  remarks: string;
  unitOfMeasure: string;
  unitRate: string;
  quantity: string;
  duration?: number;
  totalBudget: string;
  percentComplete: number;
  progressState: 0 | 50 | 100;
  milestones: ActivityMilestone[];
}

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ProjectActivityFormValues> | null;
  /** Work package budget cap — only used when mode is workPackage */
  wpBudget?: number;
  mode?: "global" | "workPackage";
  onSubmit: (values: ProjectActivityFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const emptyMilestone = (): ActivityMilestone => ({ name: "", weightPercent: 0 });

const defaultValues = (): ProjectActivityFormValues => ({
  activityType: "units",
  categoryTag: "resource-heavy",
  name: "",
  description: "",
  remarks: "",
  unitOfMeasure: "",
  unitRate: "0",
  quantity: "1",
  duration: 1,
  totalBudget: "0",
  percentComplete: 0,
  progressState: 0,
  milestones: [
    { name: "Milestone 1", weightPercent: 25 },
    { name: "Milestone 2", weightPercent: 25 },
    { name: "Milestone 3", weightPercent: 25 },
    { name: "Milestone 4", weightPercent: 25 },
  ],
});

export function ActivityFormDialog({
  open,
  onOpenChange,
  initial,
  wpBudget = 0,
  mode = "workPackage",
  onSubmit,
  isSubmitting,
}: ActivityFormDialogProps) {
  const isGlobal = mode === "global";
  const [form, setForm] = useState<ProjectActivityFormValues>(defaultValues);
  const [error, setError] = useState<string | null>(null);

  const { data: uoms = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/uoms"],
    queryFn: async () => {
      const res = await fetch("/api/uoms");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      const initialType = (initial.activityType as ProjectActivityType) ?? "units";
      setForm({
        ...defaultValues(),
        ...initial,
        activityType: initialType,
        unitOfMeasure: initialType === "lumpsum" ? "LOT" : (initial.unitOfMeasure ?? ""),
        quantity: initialType === "lumpsum" ? "1" : (initial.quantity ?? "1"),
        duration: initial.duration ?? 1,
        milestones: initial.milestones?.length
          ? initial.milestones.map((m) => ({ ...m }))
          : defaultValues().milestones,
      });
    } else {
      setForm(defaultValues());
    }
  }, [open, initial]);

  const computedBudget = useMemo(() => computeActivityBudget(form), [form]);

  const milestoneSum = useMemo(
    () => form.milestones.reduce((s, m) => s + Number(m.weightPercent || 0), 0),
    [form.milestones]
  );

  const update = <K extends keyof ProjectActivityFormValues>(
    key: K,
    value: ProjectActivityFormValues[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleTypeChange = (type: ProjectActivityType) => {
    setForm((prev) => ({
      ...prev,
      activityType: type,
      unitOfMeasure: type === "lumpsum" ? "LOT" : type === "units" ? prev.unitOfMeasure : "",
      quantity: type === "lumpsum" ? "1" : type === "units" ? prev.quantity : "",
      duration: (type === "milestone" || type === "progress_0_50_100") ? (prev.duration || 1) : prev.duration,
      milestones:
        type === "milestone" && prev.milestones.length === 0
          ? defaultValues().milestones
          : prev.milestones,
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Activity name is required");
      return;
    }

    if (form.activityType === "lumpsum") {
      form.unitOfMeasure = "LOT";
      form.quantity = "1";
    } else if (form.activityType === "units") {
      if (!form.unitOfMeasure.trim()) {
        setError("Unit of measure is required — select from UOM master");
        return;
      }
      if (uoms.length > 0 && !uoms.some((u) => u.name === form.unitOfMeasure)) {
        setError("Unit of measure must be selected from the UOM master");
        return;
      }
      if (!isGlobal && Number(form.quantity) <= 0) {
        setError("Quantity must be greater than zero");
        return;
      }
    } else if (form.activityType === "milestone" || form.activityType === "progress_0_50_100") {
      if (!form.duration || Number(form.duration) <= 0) {
        setError("Duration (number of days) is mandatory");
        return;
      }
    }

    if (form.activityType === "milestone") {
      const milestoneError = validateMilestones(form.milestones);
      if (milestoneError) {
        setError(milestoneError);
        return;
      }
      if (!isGlobal && Number(form.totalBudget) <= 0) {
        setError("Total budget is required");
        return;
      }
    }

    if (
      !isGlobal &&
      (form.activityType === "lumpsum" || form.activityType === "progress_0_50_100") &&
      Number(form.totalBudget) <= 0
    ) {
      setError("Total budget is required");
      return;
    }
    if (!isGlobal && computedBudget > wpBudget) {
      setError(`Activity budget (${computedBudget.toFixed(2)}) exceeds work package budget (${wpBudget.toFixed(2)})`);
      return;
    }

    const isEdit = Boolean(initial?.id);
    const submitValues: ProjectActivityFormValues = {
      ...form,
      totalBudget: isGlobal ? "" : form.totalBudget,
      quantity: form.activityType === "lumpsum" ? "1" : isGlobal ? "1" : form.quantity,
      unitOfMeasure: form.activityType === "lumpsum" ? "LOT" : form.unitOfMeasure,
      duration: (form.activityType === "milestone" || form.activityType === "progress_0_50_100") ? Number(form.duration || 1) : form.duration,
      // Progress is never set at create/edit time — only via separate progress logging later
      percentComplete: isEdit ? (initial?.percentComplete ?? 0) : 0,
      progressState: isEdit ? ((initial?.progressState ?? 0) as 0 | 50 | 100) : 0,
    };

    try {
      await onSubmit(submitValues);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save activity");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial?.id
              ? isGlobal
                ? "Edit Global Activity"
                : "Edit Activity"
              : isGlobal
                ? "Add Global Activity"
                : "Add Activity"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!initial?.id && (
            <div className="space-y-2">
              <Label>Activity Type *</Label>
              <Select
                value={form.activityType}
                onValueChange={(v) => handleTypeChange(v as ProjectActivityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACTIVITY_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ACTIVITY_TYPE_DESCRIPTIONS[form.activityType]}
              </p>
            </div>
          )}

          {initial?.id && (
            <div className="text-sm">
              <span className="text-muted-foreground">Type: </span>
              <span className="font-medium">{ACTIVITY_TYPE_LABELS[form.activityType]}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Excavation, DCS commissioning"
            />
          </div>

          <div className="space-y-2">
            <Label>Activity Tag / Cost Category *</Label>
            <Select
              value={form.categoryTag || "resource-heavy"}
              onValueChange={(v) => update("categoryTag", v)}
            >
              <SelectTrigger>
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
                  🚜 Resource Heavy (Normal installation, manpower, tools & equipment)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
            />
          </div>

          {form.activityType === "lumpsum" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Unit of Measure</Label>
                  <Input value="LOT" disabled className="bg-muted text-muted-foreground font-medium" />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input value="1" disabled className="bg-muted text-muted-foreground font-medium" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                For Lump Sum activities, Unit of Measure is fixed to <strong>LOT</strong> and Quantity is fixed to <strong>1</strong>.
              </p>
              {!isGlobal ? (
                <div className="space-y-2">
                  <Label>Total Budget (lump sum) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.totalBudget}
                    onChange={(e) => update("totalBudget", e.target.value)}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Lump-sum scope template. Budget is set per project when assigned to a work package.
                </p>
              )}
            </>
          )}

          {form.activityType === "units" && (
            <>
              <div className="space-y-2">
                <Label>Unit of Measure *</Label>
                <Select
                  value={form.unitOfMeasure || undefined}
                  onValueChange={(v) => update("unitOfMeasure", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UOM from master" />
                  </SelectTrigger>
                  <SelectContent>
                    {uoms.map((u) => (
                      <SelectItem key={u.id} value={u.name}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {uoms.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No UOMs defined. Add units under Activity Master → UOM first.
                  </p>
                )}
              </div>
              <div className={cn("grid gap-3", isGlobal ? "grid-cols-1" : "grid-cols-2")}>
                {!isGlobal && (
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={form.quantity}
                      onChange={(e) => update("quantity", e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{isGlobal ? "Reference Unit Rate *" : "Unit Rate *"}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.unitRate}
                    onChange={(e) => update("unitRate", e.target.value)}
                  />
                </div>
              </div>
              {!isGlobal && (
                <p className="text-xs text-muted-foreground">
                  Budget = {computedBudget.toFixed(2)} (quantity × unit rate)
                </p>
              )}
            </>
          )}

          {(form.activityType === "milestone" || form.activityType === "progress_0_50_100") && (
            <>
              <div className="space-y-2">
                <Label>Duration (number of days) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.duration ?? 1}
                  onChange={(e) => update("duration", Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="Enter duration in days"
                />
              </div>

              {!isGlobal && (
                <div className="space-y-2">
                  <Label>Total Budget *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.totalBudget}
                    onChange={(e) => update("totalBudget", e.target.value)}
                  />
                </div>
              )}

              {form.activityType === "milestone" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Milestones (weights must total 100%)</Label>
                    <span
                      className={`text-xs font-medium ${
                        Math.abs(milestoneSum - 100) < 0.01 ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      Total: {milestoneSum.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {form.milestones.map((m, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          className="flex-1"
                          placeholder="Milestone name"
                          value={m.name}
                          onChange={(e) => {
                            const next = [...form.milestones];
                            next[idx] = { ...next[idx], name: e.target.value };
                            update("milestones", next);
                          }}
                        />
                        <Input
                          type="number"
                          className="w-20"
                          min="0"
                          max="100"
                          value={m.weightPercent}
                          onChange={(e) => {
                            const next = [...form.milestones];
                            next[idx] = {
                              ...next[idx],
                              weightPercent: Number(e.target.value),
                            };
                            update("milestones", next);
                          }}
                        />
                        <span className="text-xs text-muted-foreground w-4">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={form.milestones.length <= 1}
                          onClick={() =>
                            update(
                              "milestones",
                              form.milestones.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => update("milestones", [...form.milestones, emptyMilestone()])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial?.id ? "Save Changes" : "Create Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
