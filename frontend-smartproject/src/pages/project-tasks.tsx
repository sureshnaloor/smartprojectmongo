import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, GripVertical, Pencil, Search, X, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Task {
    id: number;
    name: string;
    description: string | null;
    duration: number;
    status: string;
}

interface ProjectActivity {
    id: number;
    projectId: number;
    wpId: number;
    name: string;
    description: string | null;
    unitOfMeasure: string;
    unitRate: string;
    quantity: string;
}

interface ProjectTask {
    id: number;
    projectId: number;
    activityId: number;
    globalTaskId: number | null;
    name: string;
    description: string | null;
    duration: number | null;
    status: string;
    remarks: string | null;
    plannedDate: string | null;
    closedDate: string | null;
}

export default function ProjectTasks() {
    const { projectId } = useParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [showRemarksDialog, setShowRemarksDialog] = useState(false);
    const [remarks, setRemarks] = useState("");

    // Get today's date
    const today = new Date();
    const todayFormatted = format(today, "EEEE, MMMM d, yyyy");

    // Fetch global tasks
    const { data: globalTasks = [] } = useQuery<Task[]>({
        queryKey: ["tasks"],
        queryFn: () => get("/tasks"),
    });

    // Fetch all project activities
    const { data: projectActivities = [] } = useQuery<ProjectActivity[]>({
        queryKey: ["project-activities", projectId],
        queryFn: () => get(`/projects/${projectId}/activities`),
        enabled: !!projectId,
    });

    // Fetch open tasks for selected activity or all tasks
    const { data: activityTasks = [] } = useQuery<ProjectTask[]>({
        queryKey: selectedActivityId === null ? ["all-open-tasks", projectId] : ["activity-tasks", selectedActivityId],
        queryFn: async () => {
            if (selectedActivityId === null) {
                // Fetch all open tasks for the project
                const response = await fetch(`/api/projects/${projectId}/tasks/open`);
                if (!response.ok) throw new Error("Failed to fetch tasks");
                return response.json();
            } else {
                // Fetch tasks for specific activity
                const response = await fetch(`/api/activities/${selectedActivityId}/tasks`);
                if (!response.ok) throw new Error("Failed to fetch tasks");
                return response.json();
            }
        },
        enabled: projectId !== undefined && (selectedActivityId !== undefined),
    });

    // Create project task mutation
    const createMutation = useMutation({
        mutationFn: (data: Partial<ProjectTask>) =>
            post(`/projects/${projectId}/tasks`, data),
        onSuccess: () => {
            // Invalidate both specific activity tasks and all open tasks
            if (selectedActivityId !== null) {
                queryClient.invalidateQueries({ queryKey: ["activity-tasks", selectedActivityId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-open-tasks", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
            toast({ title: "Success", description: "Task added to activity" });
            // Reset dragged task state
            setDraggedTask(null);
            setRemarks("");
            setShowRemarksDialog(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update project task mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ProjectTask> }) =>
            put(`/projects/${projectId}/tasks/${id}`, data),
        onSuccess: () => {
            // Invalidate both specific activity tasks and all open tasks
            if (selectedActivityId !== null) {
                queryClient.invalidateQueries({ queryKey: ["activity-tasks", selectedActivityId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-open-tasks", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
            toast({ title: "Success", description: "Task updated" });
            setEditingTask(null);
            setIsDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Close task mutation
    const closeTaskMutation = useMutation({
        mutationFn: (taskId: number) =>
            fetch(`/api/projects/${projectId}/tasks/${taskId}/close`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            }).then(r => r.json()),
        onSuccess: () => {
            // Invalidate both specific activity tasks and all open tasks
            if (selectedActivityId !== null) {
                queryClient.invalidateQueries({ queryKey: ["activity-tasks", selectedActivityId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-open-tasks", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
            toast({ title: "Success", description: "Task closed successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete project task mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => del(`/projects/${projectId}/tasks/${id}`),
        onSuccess: () => {
            // Invalidate both specific activity tasks and all open tasks
            if (selectedActivityId !== null) {
                queryClient.invalidateQueries({ queryKey: ["activity-tasks", selectedActivityId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-open-tasks", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
            toast({ title: "Success", description: "Task removed from activity" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData("task", JSON.stringify(task));
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();

        const taskData = e.dataTransfer.getData("task");
        if (taskData) {
            const task: Task = JSON.parse(taskData);

            // If "All" is selected, we need to show activity selection dialog first
            if (selectedActivityId === null) {
                toast({
                    title: "Info",
                    description: "Please select a specific activity to assign the task to",
                });
                return;
            }

            // Check if already exists in this activity
            const exists = activityTasks.some(
                pt => pt.globalTaskId === task.id && pt.activityId === selectedActivityId
            );
            if (exists) {
                toast({
                    title: "Warning",
                    description: "Task already exists in this activity",
                    variant: "destructive"
                });
                return;
            }

            // Show remarks dialog instead of creating immediately
            setDraggedTask(task);
            setRemarks("");
            setShowRemarksDialog(true);
        }
    };

    const handleConfirmTaskWithRemarks = () => {
        if (!draggedTask || !selectedActivityId) {
            return;
        }

        // Create task with today's date as planned date and remarks
        createMutation.mutate({
            activityId: selectedActivityId,
            globalTaskId: draggedTask.id,
            name: draggedTask.name,
            description: draggedTask.description,
            duration: draggedTask.duration,
            status: "pending",
            plannedDate: format(today, "yyyy-MM-dd"),
            remarks: remarks || null,
        });

        // Reset state
        setDraggedTask(null);
        setRemarks("");
        setShowRemarksDialog(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const filteredGlobalTasks = globalTasks.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedActivity = projectActivities.find(activity => activity.id === selectedActivityId);

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-6 p-6">
            {/* Left Sidebar - Global Tasks */}
            <Card className="w-80 flex flex-col bg-stone-50 border-stone-200 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-stone-900">Global Tasks</CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-stone-400" />
                        <Input
                            placeholder="Search tasks..."
                            className="pl-8 bg-white border-stone-200 focus:ring-stone-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                        <div className="space-y-3">
                            {filteredGlobalTasks.map((task) => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-4 cursor-move hover:bg-stone-100 hover:border-stone-300 transition-all shadow-sm group"
                                >
                                    <GripVertical className="h-4 w-4 text-stone-300 group-hover:text-stone-500" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold text-stone-800 group-hover:text-stone-900 truncate">
                                            {task.name}
                                        </p>
                                        <p className="text-xs font-medium text-stone-500">
                                            {task.duration} min
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Right Side - Activities and Tasks */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Today's Date and Activities List */}
                <Card className="flex-shrink-0">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-bold text-zinc-900">Activities</CardTitle>
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full transition-colors">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{todayFormatted}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-32">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={selectedActivityId === null ? "default" : "outline"}
                                    onClick={() => setSelectedActivityId(null)}
                                    className="text-xs font-semibold"
                                >
                                    All
                                </Button>
                                {projectActivities.map((activity) => (
                                    <Button
                                        key={activity.id}
                                        variant={selectedActivityId === activity.id ? "default" : "outline"}
                                        onClick={() => setSelectedActivityId(activity.id)}
                                        className="text-xs"
                                    >
                                        {activity.name}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Selected Activity Tasks Window */}
                <Card
                    className="flex-1 flex flex-col"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-bold text-zinc-900">
                            {selectedActivityId === null
                                ? "All Tasks"
                                : selectedActivity
                                    ? selectedActivity.name
                                    : "Select an Activity"}
                        </CardTitle>
                        {selectedActivityId !== null && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSelectedActivityId(null);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {selectedActivityId === undefined ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <div className="text-center">
                                    <p>No activity selected.</p>
                                    <p className="text-sm">Select an activity above to assign tasks</p>
                                </div>
                            </div>
                        ) : activityTasks.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <div className="text-center">
                                    <p>
                                        {selectedActivityId === null
                                            ? "No open tasks found for today."
                                            : "No open tasks assigned yet."}
                                    </p>
                                    {selectedActivityId !== null && (
                                        <p className="text-sm">Drag tasks from the sidebar to assign them</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {selectedActivityId === null && <TableHead>Activity</TableHead>}
                                        <TableHead>Name</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Planned Date</TableHead>
                                        <TableHead>Remarks</TableHead>
                                        <TableHead className="w-[150px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activityTasks.map((task) => {
                                        const taskActivity = projectActivities.find(a => a.id === task.activityId);
                                        return (
                                            <TableRow key={task.id}>
                                                {selectedActivityId === null && (
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {taskActivity?.name || "Unknown"}
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-medium">
                                                    <div>
                                                        {task.name}
                                                        {task.description && (
                                                            <p className="text-xs text-muted-foreground">{task.description}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{task.duration ? `${task.duration} min` : "-"}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${task.status === "completed" ? "bg-green-100 text-green-700" :
                                                        task.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                                                            "bg-zinc-100 text-zinc-700"
                                                        }`}>
                                                        {task.status.replace("_", " ")}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {task.plannedDate ? (
                                                        <span className="text-xs">
                                                            {format(new Date(task.plannedDate), "MMM dd, yyyy")}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Not set</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={task.remarks || ""}>
                                                    {task.remarks}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setEditingTask(task);
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                if (confirm("Are you sure you want to close this task?")) {
                                                                    closeTaskMutation.mutate(task.id);
                                                                }
                                                            }}
                                                            className="text-green-600 hover:text-green-700"
                                                            title="Close Task"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (confirm("Are you sure you want to delete this task?")) {
                                                                    deleteMutation.mutate(task.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Remarks Dialog for New Task */}
            <Dialog open={showRemarksDialog} onOpenChange={setShowRemarksDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Task: {draggedTask?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="remarks">Remarks</Label>
                            <Textarea
                                id="remarks"
                                placeholder="Enter quantity, type, or other information about this task..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                You can enter quantity, type of task, or any other relevant information
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowRemarksDialog(false);
                                    setDraggedTask(null);
                                    setRemarks("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirmTaskWithRemarks}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? "Adding..." : "Confirm & Add Task"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    {editingTask && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const data = {
                                    name: formData.get("name") as string,
                                    description: formData.get("description") as string,
                                    duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : null,
                                    status: formData.get("status") as string,
                                    remarks: formData.get("remarks") as string,
                                };
                                updateMutation.mutate({ id: editingTask.id, data });
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={editingTask.name}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={editingTask.description || ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (minutes)</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    type="number"
                                    defaultValue={editingTask.duration || ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select name="status" defaultValue={editingTask.status}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Textarea
                                    id="remarks"
                                    name="remarks"
                                    defaultValue={editingTask.remarks || ""}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Update
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
