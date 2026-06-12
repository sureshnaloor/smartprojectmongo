import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertWbsItemSchema, WbsItem } from "@/types";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

interface EditWbsModalProps {
  wbsId: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWbsModal({ wbsId, isOpen, onOpenChange }: EditWbsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the WBS item being edited
  const { data: wbsItem, isLoading: isLoadingWbsItem } = useQuery<WbsItem>({
    queryKey: [`/api/wbs/${wbsId}`],
    enabled: isOpen && !!wbsId,
  });

  // Form definition
  const form = useForm<any>({
    resolver: zodResolver(insertWbsItemSchema as any),
    defaultValues: {
      projectId: 0,
      parentId: null as number | null,
      name: "",
      description: "",
      level: 1,
      code: "",
      type: "Summary",
      budgetedCost: "0",
      isTopLevel: false,
    },
  });

  // Initialize form with WBS item data when loaded
  useEffect(() => {
    if (wbsItem && isOpen) {
      form.reset({
        projectId: wbsItem.projectId,
        parentId: wbsItem.parentId,
        name: wbsItem.name,
        description: wbsItem.description || "",
        level: wbsItem.level,
        code: wbsItem.code,
        type: wbsItem.type as any,
        budgetedCost: wbsItem.budgetedCost.toString(),
        isTopLevel: !!wbsItem.isTopLevel,
      });
    }
  }, [wbsItem, form, isOpen]);

  // Update WBS item mutation
  const updateWbsItem = useMutation({
    mutationFn: async (data: Partial<WbsItem>) => {
      const resp = await apiRequest("PATCH", `/api/wbs/${wbsId}`, data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs"] });
      // Also invalidate the project details to update budget sums if needed
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "WBS Updated",
        description: "The WBS item has been updated successfully.",
      });
      onOpenChange(false);
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
    updateWbsItem.mutate(data);
  };

  if (isLoadingWbsItem && isOpen) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Edit WBS Item</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-white">Edit WBS Item</SheetTitle>
          <SheetDescription className="text-slate-400">
            {wbsItem?.code} - {wbsItem?.name}
          </SheetDescription>
        </SheetHeader>

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
                    value={wbsItem?.type || ""}
                    readOnly
                    className="bg-[#0f1115]/50 border-gray-800 text-gray-400 cursor-not-allowed"
                  />
                </FormControl>
              </FormItem>
            </div>

            {/* Date fields - removed per user request */}



            <SheetFooter className="pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateWbsItem.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {updateWbsItem.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update WBS"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet >
  );
}
