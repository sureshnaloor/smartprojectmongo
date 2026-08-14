import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WbsItem } from "@shared/schema";
import { validateWbsStructure } from "@shared/wbs-validation";

interface WorkPackageRef {
  id: number;
  wbsItemId: number;
}

interface FinalizeWbsButtonProps {
  projectId: number;
  wbsItems: WbsItem[];
  workPackages: WorkPackageRef[];
  wbsFinalized?: boolean;
  onInvalidIds?: (ids: number[]) => void;
  size?: "sm" | "default";
  className?: string;
}

export function FinalizeWbsButton({
  projectId,
  wbsItems,
  workPackages,
  wbsFinalized = false,
  onInvalidIds,
  size = "sm",
  className,
}: FinalizeWbsButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/wbs/finalize`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.message || "Failed to finalize WBS") as Error & {
          invalidWbsIds?: number[];
        };
        err.invalidWbsIds = data.invalidWbsIds;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      toast({
        title: "WBS finalized",
        description:
          "Structure is locked. To revise WBS later, create a project amendment (admin or creator only).",
      });
      onInvalidIds?.([]);
    },
    onError: (error: Error & { invalidWbsIds?: number[] }) => {
      if (error.invalidWbsIds?.length) {
        onInvalidIds?.(error.invalidWbsIds);
      }
      toast({
        title: "Complete the WBS structure completely",
        description: error.message || "Fix highlighted WBS items before finalizing.",
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    setIsValidating(true);
    const preview = validateWbsStructure(wbsItems, workPackages);
    setIsValidating(false);

    if (!preview.valid) {
      onInvalidIds?.(preview.invalidWbsIds);
      toast({
        title: "Complete the WBS structure completely",
        description:
          preview.issues[0]?.reason ??
          "Every lowest-level WBS needs work packages. WBS and WP cannot be siblings.",
        variant: "destructive",
      });
      return;
    }

    finalizeMutation.mutate();
  };

  if (wbsFinalized) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium",
          className
        )}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        WBS Finalized
      </span>
    );
  }

  const busy = isValidating || finalizeMutation.isPending;

  return (
    <Button
      type="button"
      variant="default"
      size={size}
      className={cn("bg-teal-600 hover:bg-teal-700", className)}
      onClick={handleClick}
      disabled={busy || wbsItems.length === 0}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Layers className="h-3.5 w-3.5 mr-1" />
      )}
      Finalize WBS
    </Button>
  );
}
