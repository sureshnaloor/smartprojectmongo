import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Task, InsertTask, Activity } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const wavedPatternStyle = `
  @keyframes wave {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
  }
  .wavy-pattern {
    position: relative;
  }
  .wavy-pattern::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgba(107,114,128,0.08);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgba(107,114,128,0.03);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,20 Q15,10 30,20 T60,20' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,35 Q15,25 30,35 T60,35' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,50 Q15,40 30,50 T60,50' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: repeat;
    pointer-events: none;
    z-index: 0;
  }
  .wavy-pattern > * {
    position: relative;
    z-index: 1;
  }
`;

// API functions
async function getTasks(): Promise<Task[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}

async function getActivities(): Promise<Activity[]> {
  const response = await fetch("/api/activities");
  if (!response.ok) throw new Error("Failed to fetch activities");
  return response.json();
}

async function createTask(data: InsertTask): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
}

async function updateTask(id: number, data: InsertTask): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update task");
  return response.json();
}

async function deleteTask(id: number): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete task");
}

export default function TaskMaster() {
  const [location, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: getTasks,
  });

  // Fetch activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    queryFn: getActivities,
  });

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsDialogOpen(false);
      toast.success("Task created successfully");
      setLocation("/task-master");
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsertTask }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingTask(null);
      toast.success("Task updated successfully");
      setLocation("/task-master");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast.success("Task deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      activityId: parseInt(formData.get("activityId") as string),
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate(id);
    }
  };

  const getActivityName = (activityId: number) => {
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.name : `Activity ${activityId}`;
  };

  const getActivityUom = (activityId: number | null) => {
    if (!activityId) return "—";
    const activity = activities.find(a => a.id === activityId);
    return activity?.unitOfMeasure ?? "—";
  };

  return (
    <>
      <style>{wavedPatternStyle}</style>
      <div className="flex-1 space-y-4 p-8 pt-6 wavy-pattern" style={{
        backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'%3E%3Cstop offset=\'0%\' style=\'stop-color:rgba(107,114,128,0.08);stop-opacity:1\' /%3E%3Cstop offset=\'100%\' style=\'stop-color:rgba(107,114,128,0.03);stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d=\'M0,20 Q15,10 30,20 T60,20\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,35 Q15,25 30,35 T60,35\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,50 Q15,40 30,50 T60,50\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat'
      }}>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Task Master</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent style={{
            backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(107, 114, 128, 0.3)'
          }}>
            <DialogHeader>
              <DialogTitle style={{
                backgroundImage: 'linear-gradient(to right, rgb(107, 114, 128), rgb(148, 163, 184))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
              }}>
                {editingTask ? "Edit Task" : "Create New Task"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold text-gray-700">Task Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTask?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold text-gray-700">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingTask?.description || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityId" className="font-semibold text-gray-700">Activity</Label>
                <Select name="activityId" defaultValue={editingTask?.activityId?.toString()}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id.toString()}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {isLoadingTasks || isLoadingActivities ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="rounded-md border border-gray-300" style={{
            boxShadow: '0 4px 6px -1px rgba(107, 114, 128, 0.1), 0 2px 4px -1px rgba(107, 114, 128, 0.06)'
          }}>
            <Table>
              <TableHeader style={{
                backgroundImage: 'linear-gradient(to right, rgb(243, 244, 246), rgb(229, 231, 235))',
              }}>
                <TableRow>
                  <TableHead className="font-bold text-gray-900">Name</TableHead>
                  <TableHead className="font-bold text-gray-900">Description</TableHead>
                  <TableHead className="font-bold text-gray-900">Activity</TableHead>
                  <TableHead className="font-bold text-gray-900">UOM</TableHead>
                  <TableHead className="font-bold text-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task, index) => (
                  <TableRow key={task.id} className={index % 2 === 0 ? "bg-gradient-to-r from-gray-50 to-slate-50" : "bg-gradient-to-r from-slate-50 to-sky-50"} style={{
                    borderColor: 'rgba(107, 114, 128, 0.2)',
                    transition: 'background-color 0.2s ease'
                  }}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.description}</TableCell>
                    <TableCell>{task.activityId ? getActivityName(task.activityId) : "None"}</TableCell>
                    <TableCell>{getActivityUom(task.activityId ?? null)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(task)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
} 