import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertWbsItemSchema, WbsItem, Project } from "@/types";
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

interface AddWbsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  parentId?: number | null;
  parentName?: string;
  parentLevel?: number;
}

export function AddWbsModal({
  isOpen,
  onClose,
  projectId,
  parentId = null,
  parentName,
  parentLevel = 0
}: AddWbsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form definition
  const form = useForm({
    resolver: zodResolver(insertWbsItemSchema as any),
    defaultValues: {
      projectId: projectId,
      parentId: parentId as number | null,
      name: "",
      description: "",
      level: (parentLevel || 0) + 1,
      code: "", // Backend will generate this
      type: parentId ? "WBS" : "Summary",
      budgetedCost: "0",
      isTopLevel: !parentId,
    },
  });

  // Reset form when modal opens or parent changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        projectId: projectId,
        parentId: parentId || null,
        name: "",
        description: "",
        level: (parentLevel || 0) + 1,
        code: "",
        type: parentId ? "WBS" : "Summary",
        budgetedCost: "0",
        isTopLevel: !parentId,
      });
    }
  }, [isOpen, parentId, projectId, parentLevel, form]);

  // Create WBS item mutation
  const createWbsItem = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/wbs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      toast({
        title: "Success",
        description: "WBS item created successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create WBS item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createWbsItem.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#1a1c20] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-400">
            {parentId ? `Add Child to ${parentName}` : "Add New Root Summary"}
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
                      placeholder="Enter WBS name"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budgetedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
                      Budgeted Cost
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        className="bg-[#0f1115] border-gray-800 text-white focus:border-blue-500/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="text-gray-400 uppercase text-xs font-semibold tracking-wider">
                  Type
                </FormLabel>
                <FormControl>
                  <Input
                    value={parentId ? "WBS" : "Summary"}
                    readOnly
                    className="bg-[#0f1115]/50 border-gray-800 text-gray-400 cursor-not-allowed"
                  />
                </FormControl>
              </FormItem>
            </div>



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
                disabled={createWbsItem.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {createWbsItem.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create WBS"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
