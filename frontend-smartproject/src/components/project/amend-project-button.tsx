import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface AmendProjectButtonProps {
  projectId: number;
  projectName: string;
  wbsFinalized: boolean;
  createdById?: number | null;
  className?: string;
  size?: "sm" | "default";
}

export function AmendProjectButton({
  projectId,
  projectName,
  wbsFinalized,
  createdById,
  className,
  size = "sm",
}: AmendProjectButtonProps) {
  const [open, setOpen] = useState(false);
  const { user, authenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const isAdmin = user?.role === "admin";
  const isCreator = user != null && createdById != null && user.id === createdById;
  const canAmend = authenticated && (isAdmin || isCreator);

  const amendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/amend`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create project amendment");
      }
      return res.json() as Promise<{ project: { id: number; name: string }; message?: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project amendment created",
        description: data.message || `Created "${data.project.name}". WBS is unlocked on the new copy.`,
      });
      setOpen(false);
      if (data.project?.id != null) {
        setLocation(`/projects/${data.project.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot create amendment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!wbsFinalized || !canAmend) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size={size}
          className={cn("bg-red-600 hover:bg-red-700", className)}
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Create Project Amendment
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700">
            Create a project amendment?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <span className="block rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              Warning: This copies the entire project (&quot;{projectName}&quot;) into a new
              version named with the pattern{" "}
              <span className="font-mono">name_amd_1</span>,{" "}
              <span className="font-mono">name_amd_2</span>, and so on. The original
              finalized WBS stays locked. Only use this when you must revise the WBS
              structure after finalization.
            </span>
            <span className="block text-sm text-muted-foreground">
              The new amendment starts with WBS unlocked so you can edit or delete nodes
              and work packages. This action cannot be undone (the copy remains until
              deleted).
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={amendMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            disabled={amendMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              amendMutation.mutate();
            }}
          >
            {amendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Yes, create amendment"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
