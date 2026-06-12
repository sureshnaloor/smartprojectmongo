import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkPackageSchema, WorkPackage, WbsItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

import { Loader2 } from "lucide-react";

interface AddWorkPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  wbsItemId: number;
  wbsItemName?: string;
  onSuccess?: () => void;
}

export function AddWorkPackageModal({
  isOpen,
  onClose,
  projectId,
  wbsItemId,
  wbsItemName,
  onSuccess
}: AddWorkPackageModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch WBS item to get budget info
  const { data: wbsItem } = useQuery<WbsItem>({
    queryKey: [`/api/wbs/${wbsItemId}`],
    enabled: isOpen && !!wbsItemId,
  });

  // Form definition
  const form = useForm({
    resolver: zodResolver(insertWorkPackageSchema as any),
    defaultValues: {
      wbsItemId: wbsItemId,
      projectId: projectId,
      name: "",
      description: "",
      code: "", // Backend will generate this
      budgetedCost: "0",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        wbsItemId: wbsItemId,
        projectId: projectId,
        name: "",
        description: "",
        code: "",
        budgetedCost: "0",
      });
    }
  }, [isOpen, wbsItemId, projectId, form]);

  // Create Work Package mutation
  const createWorkPackage = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/work-packages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs/${wbsItemId}/work-packages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
      toast({
        title: "Success",
        description: "Work Package created successfully",
      });
      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Work Package",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createWorkPackage.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#1a1c20] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-400">
            Add Work Package {wbsItemName && `to ${wbsItemName}`}
          </DialogTitle>
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
                onClick={onClose}
                className="border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWorkPackage.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {createWorkPackage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create WP"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

