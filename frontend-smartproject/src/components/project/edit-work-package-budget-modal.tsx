import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import type { WorkPackage, Project } from "@shared/schema";

interface EditWorkPackageBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workPackage: WorkPackage | null;
  project?: Project | null;
}

export function EditWorkPackageBudgetModal({
  open,
  onOpenChange,
  workPackage,
  project,
}: EditWorkPackageBudgetModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (workPackage) {
      setBudget(workPackage.budgetedCost ? String(workPackage.budgetedCost) : "0");
    }
  }, [workPackage]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!workPackage) return;
      const num = parseFloat(budget);
      if (isNaN(num) || num <= 0) {
        throw new Error("Work package budget must be a positive number");
      }
      const res = await apiRequest("PATCH", `/api/work-packages/${workPackage.id}`, {
        budgetedCost: num.toString(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update work package budget");
      }
      return res.json();
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/work-packages`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/wbs`] });
        queryClient.invalidateQueries({ queryKey: ["work-packages"] });
        if (workPackage?.wbsItemId) {
          queryClient.invalidateQueries({ queryKey: [`/api/wbs/${workPackage.wbsItemId}/work-packages`] });
        }
      }
      toast({ title: "Work package budget updated" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: projectActivities = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${workPackage?.projectId}/activities`],
    enabled: !!workPackage?.projectId && open,
  });

  const wpActs = workPackage ? projectActivities.filter((a: any) => a.wpId === workPackage.id) : [];
  const sumActivities = wpActs.reduce((sum: number, a: any) => {
    const type = a.activityType || "units";
    if (type === "units") {
      const q = Number(a.quantity || 1);
      const r = Number(a.unitRate || 0);
      const t = Number(a.totalBudget || 0);
      return sum + (t > 0 ? t : q * r);
    }
    return sum + Number(a.totalBudget || a.unitRate || 0);
  }, 0);

  const numBudget = Number(budget || 0);
  const slack = numBudget - sumActivities;
  const isNegativeSlack = slack < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            Add/Edit Budget Values
          </DialogTitle>
        </DialogHeader>

        {workPackage && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isNegativeSlack) {
                toast({
                  title: "Invalid Budget Value",
                  description: "Work Package budget cannot be less than the sum of assigned activity budgets (Slack cannot be negative).",
                  variant: "destructive",
                });
                return;
              }
              updateMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{workPackage.code} — {workPackage.name}</p>
              {project && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Project Total Value: <span className="font-medium text-foreground">{formatCurrency(Number(project.budget) || 0, project.currency)}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-budget-input">Work Package Budget ({project?.currency || "INR"}) *</Label>
              <Input
                id="wp-budget-input"
                type="number"
                step="any"
                min="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Enter budgeted cost for this work package"
                required
                className="font-mono text-base"
              />
              <p className="text-xs text-muted-foreground">
                This budget will automatically roll up to all parent WBS levels in the project hierarchy.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border rounded-md p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned Activities ({wpActs.length}):</span>
                <span className="font-mono font-medium">{formatCurrency(sumActivities, project?.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculated Slack Value:</span>
                <span className={cn("font-mono font-bold", isNegativeSlack ? "text-red-600" : "text-emerald-600")}>
                  {formatCurrency(slack, project?.currency)}
                </span>
              </div>
              {isNegativeSlack && (
                <p className="text-[11px] text-red-600 font-medium pt-1">
                  ⚠ Work Package budget cannot be less than assigned activity budgets (Slack must be ≥ 0).
                </p>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || isNegativeSlack}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Budget Value"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
