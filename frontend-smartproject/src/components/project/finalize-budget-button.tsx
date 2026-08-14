import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface WorkPackageBudgetRef {
  id: number;
  wbsItemId: number;
  name: string;
  budgetedCost?: string | number | null;
}

interface FinalizeBudgetButtonProps {
  projectId: number;
  wbsFinalized?: boolean;
  budgetFinalized?: boolean;
  workPackages?: WorkPackageBudgetRef[];
  onInvalidWpBudgetIds?: (wpIds: number[], parentWbsIds: number[]) => void;
  className?: string;
  size?: "sm" | "default";
}

export function FinalizeBudgetButton({
  projectId,
  wbsFinalized = false,
  budgetFinalized = false,
  workPackages = [],
  onInvalidWpBudgetIds,
  className,
  size = "sm",
}: FinalizeBudgetButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/finalize-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || "Failed to finalize work package budget") as Error & {
          invalidWpIds?: number[];
          invalidWbsIds?: number[];
        };
        err.invalidWpIds = data.invalidWpIds;
        err.invalidWbsIds = data.invalidWbsIds;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onInvalidWpBudgetIds?.([], []);
      toast({
        title: "Work Package Budget Finalized",
        description: "Budget structure is locked and verified. You may now create project amendments.",
      });
      setOpen(false);
    },
    onError: (error: Error & { invalidWpIds?: number[]; invalidWbsIds?: number[] }) => {
      if (error.invalidWpIds?.length) {
        onInvalidWpBudgetIds?.(error.invalidWpIds, error.invalidWbsIds || []);
      }
      let cleanMessage = error.message;
      if (cleanMessage.includes('{')) {
        try {
          const jsonStr = cleanMessage.substring(cleanMessage.indexOf('{'));
          const parsed = JSON.parse(jsonStr);
          if (parsed.message) cleanMessage = parsed.message;
        } catch {
          // Keep original cleanMessage
        }
      }
      toast({
        title: "Cannot Finalize Budget",
        description: cleanMessage,
        variant: "destructive",
      });
    },
  });

  if (budgetFinalized) {
    return (
      <Badge
        variant="outline"
        className={cn("bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold gap-1 py-1 px-3 text-xs shadow-sm", className)}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Budget Finalized
      </Badge>
    );
  }

  const { data: projectActivities = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/activities`],
    enabled: !!projectId,
  });

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!wbsFinalized) {
      e.preventDefault();
      toast({
        title: "Prerequisite Required",
        description: "WBS status must be 'Finalized' before Work Package budget can be finalized.",
        variant: "destructive",
      });
      return;
    }

    const zeroBudgetWps = workPackages.filter(
      (wp) => !wp.budgetedCost || isNaN(Number(wp.budgetedCost)) || Number(wp.budgetedCost) <= 0
    );

    const nilActivityWps = workPackages.filter((wp) => {
      const acts = projectActivities.filter((a: any) => a.wpId === wp.id);
      return acts.length === 0;
    });

    const negativeSlackWps = workPackages.filter((wp) => {
      const acts = projectActivities.filter((a: any) => a.wpId === wp.id);
      const wpBudget = Number(wp.budgetedCost || 0);
      const sumActs = acts.reduce((sum: number, a: any) => {
        const type = a.activityType || "units";
        if (type === "units") {
          const q = Number(a.quantity || 1);
          const r = Number(a.unitRate || 0);
          const t = Number(a.totalBudget || 0);
          return sum + (t > 0 ? t : q * r);
        }
        return sum + Number(a.totalBudget || a.unitRate || 0);
      }, 0);
      return wpBudget - sumActs < 0;
    });

    const allInvalidIds = Array.from(
      new Set([
        ...zeroBudgetWps.map((wp) => wp.id),
        ...nilActivityWps.map((wp) => wp.id),
        ...negativeSlackWps.map((wp) => wp.id),
      ])
    );

    if (allInvalidIds.length > 0) {
      e.preventDefault();
      const invalidWpObjects = workPackages.filter((wp) => allInvalidIds.includes(wp.id));
      const invalidParentWbsIds = Array.from(new Set(invalidWpObjects.map((wp) => wp.wbsItemId)));
      onInvalidWpBudgetIds?.(allInvalidIds, invalidParentWbsIds);

      let desc = "";
      if (zeroBudgetWps.length > 0) {
        desc += `Found ${zeroBudgetWps.length} Work Package(s) with ₹0.00 budget (e.g. "${zeroBudgetWps[0].name}"). `;
      }
      if (nilActivityWps.length > 0) {
        desc += `Found ${nilActivityWps.length} Work Package(s) with NO (NIL) assigned activities (e.g. "${nilActivityWps[0].name}"). `;
      }
      if (negativeSlackWps.length > 0) {
        desc += `Found ${negativeSlackWps.length} Work Package(s) with negative slack (e.g. "${negativeSlackWps[0].name}"). `;
      }

      toast({
        title: "Cannot Finalize Budget",
        description: `${desc.trim()} All work packages must have a non-zero budget, at least 1 assigned activity, and non-negative slack before finalizing.`,
        variant: "destructive",
      });
      return;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={handleTriggerClick}
          className={cn("bg-amber-500 hover:bg-amber-600 text-white font-medium gap-1.5 border-amber-600 shadow-sm", className)}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Finalize Budget
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalize Work Package Budget?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will lock all Work Package budgets for this project. Once finalized:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-foreground/80">
              <li>Individual Work Package budgets cannot be edited without a Project Amendment.</li>
              <li>Project Amendments can be initiated once budget finalization is complete.</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={finalizeMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              finalizeMutation.mutate();
            }}
            disabled={finalizeMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {finalizeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizing…
              </>
            ) : (
              "Yes, Finalize Budget"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
