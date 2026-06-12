import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkPackageSchema, WorkPackage, WbsItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface EditWorkPackageModalProps {
  workPackageId: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditWorkPackageModal({ workPackageId, isOpen, onOpenChange, onSuccess }: EditWorkPackageModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the Work Package being edited
  const { data: workPackage, isLoading: isLoadingWorkPackage } = useQuery<WorkPackage>({
    queryKey: [`/api/work-packages/${workPackageId}`],
    enabled: isOpen && !!workPackageId,
  });

  // Fetch WBS item to get budget info
  const { data: wbsItem } = useQuery<WbsItem>({
    queryKey: [`/api/wbs/${workPackage?.wbsItemId}`],
    enabled: isOpen && !!workPackage?.wbsItemId,
  });

  // Form definition
  const form = useForm<any>({
    resolver: zodResolver(insertWorkPackageSchema.partial() as any),
    defaultValues: {
      wbsItemId: 0,
      projectId: 0,
      name: "",
      description: "",
      code: "",
      budgetedCost: "0",
    },
  });

  // Initialize form with Work Package data when loaded
  useEffect(() => {
    if (workPackage && isOpen) {
      form.reset({
        wbsItemId: workPackage.wbsItemId,
        projectId: workPackage.projectId,
        name: workPackage.name,
        description: workPackage.description || "",
        code: workPackage.code,
        budgetedCost: workPackage.budgetedCost.toString(),
      });
    }
  }, [workPackage, form, isOpen]);

  // Update Work Package mutation
  const updateWorkPackage = useMutation({
    mutationFn: async (data: Partial<WorkPackage>) => {
      const resp = await apiRequest("PATCH", `/api/work-packages/${workPackageId}`, data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/work-packages/${workPackageId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/wbs/${workPackage?.wbsItemId}/work-packages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${workPackage?.projectId}/wbs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${workPackage?.projectId}/work-packages`] });
      toast({
        title: "Work Package Updated",
        description: "The Work Package has been updated successfully.",
      });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateWorkPackage.mutate(data);
  };

  if (isLoadingWorkPackage && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-[#1a1c20] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-400">Edit Work Package</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1a1c20] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-400">
            Edit Work Package
          </DialogTitle>
          {workPackage && (
            <p className="text-sm text-gray-400">
              {workPackage.code} - {workPackage.name}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
                    Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Work Package name"
                      {...field}
                      className="bg-[#0f1115] border-gray-800 text-white focus:border-blue-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description..."
                      {...field}
                      value={field.value || ""}
                      className="bg-[#0f1115] border-gray-800 text-white focus:border-blue-500/50 min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
                    Budgeted Cost
                    {wbsItem && (
                      <span className="text-gray-500 text-xs ml-2">
                        (Max: {Number(wbsItem.budgetedCost).toLocaleString()})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      className="bg-[#0f1115] border-gray-800 text-white focus:border-blue-500/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateWorkPackage.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {updateWorkPackage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update WP"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

