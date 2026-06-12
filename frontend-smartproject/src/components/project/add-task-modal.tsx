import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { WbsItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define Task interface
interface Task {
  id?: number;
  activityId: number;
  projectId?: number;
  name: string;
  description?: string;
  percentComplete?: number;
  startDate?: string;
  endDate?: string;
  duration?: number;
  dependencies?: { predecessorId: number; successorId: number; type: string; lag: number }[];
}

// Define props for the AddTaskModal component
interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
  activities: WbsItem[];
  selectedActivityId?: number | null;
}

// Create schema for form validation
const taskFormSchema = z.object({
  activityId: z.string().refine(val => !!val, "Activity is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  percentComplete: z.number().min(0).max(100, "Progress must be between 0 and 100").default(0).optional(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  duration: z.coerce.number().min(0).optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// The AddTaskModal component
export function AddTaskModal({
  isOpen,
  onClose,
  onAdd,
  activities,
  selectedActivityId
}: AddTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize form with react-hook-form and zod validation
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      activityId: selectedActivityId ? String(selectedActivityId) : "",
      name: "",
      description: "",
      percentComplete: 0,
      startDate: undefined,
      endDate: undefined,
      duration: undefined,
    },
  });

  // Update form when selectedActivityId changes
  useEffect(() => {
    if (selectedActivityId) {
      form.setValue("activityId", String(selectedActivityId));
    }
  }, [selectedActivityId, form]);

  // Handle form submission
  const onSubmit = async (values: TaskFormValues) => {
    setIsLoading(true);

    try {
      // Get project ID from selected activity
      const selectedActivity = activities.find(a => a.id === parseInt(values.activityId));
      const projectId = selectedActivity?.projectId;

      if (!projectId) {
        throw new Error("Could not determine project ID from selected activity");
      }

      // Create task object with required fields
      const task: Task = {
        activityId: parseInt(values.activityId),
        projectId: projectId,
        name: values.name,
        description: values.description || "",
        percentComplete: values.percentComplete || 0,
        startDate: values.startDate ? format(values.startDate, "yyyy-MM-dd") : undefined,
        endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : undefined,
        duration: values.duration || undefined,
      };

      console.log("Submitting task:", task);

      // Call the onAdd callback
      onAdd(task);

      // Reset form and close modal
      form.reset();
      onClose();

      // Show success toast
      toast({
        title: "Task Added",
        description: "The task has been added successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error adding task:", error);

      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal close - reset form
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for an activity. Tasks are the smallest unit of work.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={selectedActivityId !== null}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Activity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activities.filter(item => item.type === "Activity").map((activity) => (
                        <SelectItem key={activity.id} value={String(activity.id)}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description"
                      {...field}
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="percentComplete"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker
                      date={field.value || undefined}
                      setDate={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <DatePicker
                      date={field.value || undefined}
                      setDate={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Duration in days"
                      {...field}
                      value={field.value || ""}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 