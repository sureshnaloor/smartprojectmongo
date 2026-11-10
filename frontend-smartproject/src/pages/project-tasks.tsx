import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TasksPageHeader } from "@/components/project-tasks/tasks-page-header";
import { TasksListPanel } from "@/components/project-tasks/tasks-list-panel";
import { TasksActivitiesPanel } from "@/components/project-tasks/tasks-activities-panel";
import {
  encodeTaskMeta,
  isSameDay,
  isTaskOverdue,
  parseTaskMeta,
  sortTasks,
  taskAssignee,
  type ProjectActivityRef,
  type ProjectTaskItem,
  type TaskCatalogTab,
  type TaskPriority,
  type TaskSortKey,
  type TaskStatus,
} from "@/components/project-tasks/constants";

type TaskSpeechField =
  | "activityId"
  | "name"
  | "description"
  | "plannedDate"
  | "duration"
  | "priority"
  | "status"
  | "assignee"
  | "remarks";

const TASK_SPEECH_LABELS: Record<TaskSpeechField, string> = {
  activityId: "Activity",
  name: "Name",
  description: "Description",
  plannedDate: "Due date",
  duration: "Duration (min)",
  priority: "Priority",
  status: "Status",
  assignee: "Assignee",
  remarks: "Remarks",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Done",
  blocked: "Blocked",
};

interface TaskDictationResponse {
  transcript: string;
  fields: {
    activityId: number | null;
    activityName: string | null;
    name: string | null;
    description: string | null;
    plannedDate: string | null;
    duration: string | null;
    priority: TaskPriority | null;
    status: TaskStatus | null;
    assignee: string | null;
    remarks: string | null;
  };
  rejected: { field: TaskSpeechField; spoken: string; reason: string }[];
}

export default function ProjectTasks() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [catalogTab, setCatalogTab] = useState<TaskCatalogTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatus>>(new Set());
  const [sortKey, setSortKey] = useState<TaskSortKey>("due");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTaskItem | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    plannedDate: "",
    duration: "",
    status: "pending" as TaskStatus,
    priority: "normal" as TaskPriority,
    assignee: "",
    remarks: "",
  });

  useEffect(() => {
    if (!editingTask) return;
    const meta = parseTaskMeta(editingTask.remarks);
    setEditForm({
      name: editingTask.name,
      description: editingTask.description ?? "",
      plannedDate: editingTask.plannedDate ?? "",
      duration: editingTask.duration != null ? String(editingTask.duration) : "",
      status: (editingTask.status as TaskStatus) || "pending",
      priority: meta.priority,
      assignee: meta.assignee,
      remarks: meta.cleanRemarks,
    });
  }, [editingTask]);

  const [newTask, setNewTask] = useState({
    activityId: "",
    name: "",
    description: "",
    plannedDate: format(new Date(), "yyyy-MM-dd"),
    status: "pending" as TaskStatus,
    priority: "normal" as TaskPriority,
    assignee: user?.name ?? "",
    duration: "60",
    remarks: "",
  });
  const [taskRecording, setTaskRecording] = useState(false);
  const [taskDictating, setTaskDictating] = useState(false);
  const [taskRecordSeconds, setTaskRecordSeconds] = useState(0);
  const [taskTranscript, setTaskTranscript] = useState("");
  const [taskSpeechPairs, setTaskSpeechPairs] = useState<{ field: TaskSpeechField; value: string }[]>([]);
  const [taskRejected, setTaskRejected] = useState<TaskDictationResponse["rejected"]>([]);
  const taskRecorderRef = useRef<MediaRecorder | null>(null);
  const taskStreamRef = useRef<MediaStream | null>(null);
  const taskChunksRef = useRef<Blob[]>([]);
  const taskTimerRef = useRef<number | null>(null);
  const taskDiscardRef = useRef(false);
  const taskStoppingRef = useRef(false);
  const taskArmingRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setSearchTerm("");
    setPriorityFilter("all");
    setStatusFilters(new Set());
    setSelectedTaskId(null);
  }, [catalogTab]);

  const { data: project } = useQuery<{ name: string }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const {
    data: allProjectTasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
    isFetching: tasksFetching,
  } = useQuery<ProjectTaskItem[]>({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: projectActivities = [], isLoading: activitiesLoading } = useQuery<ProjectActivityRef[]>({
    queryKey: ["project-activities", projectId],
    queryFn: () => get(`/projects/${projectId}/activities`),
    enabled: !!projectId,
  });

  const activityNameById = useCallback(
    (id: number) => projectActivities.find((a) => a.id === id)?.name ?? "Unknown",
    [projectActivities]
  );

  const myTasks = useMemo(() => {
    if (!user?.name) return [];
    const name = user.name.toLowerCase();
    return allProjectTasks.filter((t) => taskAssignee(t).toLowerCase().includes(name));
  }, [allProjectTasks, user?.name]);

  const pendingTasks = useMemo(
    () => allProjectTasks.filter((t) => t.status === "pending"),
    [allProjectTasks]
  );

  const overdueTasks = useMemo(
    () => allProjectTasks.filter((t) => isTaskOverdue(t)),
    [allProjectTasks]
  );

  const catalogSource = useMemo(() => {
    switch (catalogTab) {
      case "my":
        return myTasks;
      case "pending":
        return pendingTasks;
      case "overdue":
        return overdueTasks;
      default:
        return allProjectTasks;
    }
  }, [catalogTab, allProjectTasks, myTasks, pendingTasks, overdueTasks]);

  const leftPanelTasks = useMemo(() => {
    let list = catalogSource;
    if (catalogTab === "all") {
      const overdue = allProjectTasks.filter((t) => isTaskOverdue(t, selectedDate));
      const dueByDate = allProjectTasks.filter(
        (t) =>
          !isTaskOverdue(t, selectedDate) &&
          (isSameDay(t.plannedDate, selectedDate) ||
            (t.plannedDate && t.plannedDate <= format(selectedDate, "yyyy-MM-dd")))
      );
      const ids = new Set<number>();
      const merged: ProjectTaskItem[] = [];
      [...overdue, ...dueByDate].forEach((t) => {
        if (!ids.has(t.id)) {
          ids.add(t.id);
          merged.push(t);
        }
      });
      list = merged.length > 0 ? merged : catalogSource;
    }
    if (selectedActivityId != null) {
      list = list.filter((t) => t.activityId === selectedActivityId);
    }
    return sortTasks(list, sortKey);
  }, [catalogSource, catalogTab, allProjectTasks, selectedDate, selectedActivityId, sortKey]);

  const rightPanelTasks = useMemo(() => {
    let list = allProjectTasks.filter((t) => isSameDay(t.plannedDate, selectedDate));
    if (selectedActivityId != null) {
      list = list.filter((t) => t.activityId === selectedActivityId);
    }
    return list;
  }, [allProjectTasks, selectedDate, selectedActivityId]);

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    queryClient.invalidateQueries({ queryKey: ["all-open-tasks", projectId] });
  }, [queryClient, projectId]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<ProjectTaskItem>) => post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task created" });
      setAddDialogOpen(false);
      resetNewTask();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectTaskItem> }) =>
      put(`/projects/${projectId}/tasks/${id}`, data),
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task updated" });
      setEditingTask(null);
      setEditDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: (taskId: number) =>
      fetch(`/api/projects/${projectId}/tasks/${taskId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }).then((r) => r.json()),
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task closed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/projects/${projectId}/tasks/${id}`),
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clearTaskSpeech = () => {
    setTaskTranscript("");
    setTaskSpeechPairs([]);
    setTaskRejected([]);
  };

  const resetNewTask = () => {
    setNewTask({
      activityId: selectedActivityId ? String(selectedActivityId) : "",
      name: "",
      description: "",
      plannedDate: format(selectedDate, "yyyy-MM-dd"),
      status: "pending",
      priority: "normal",
      assignee: user?.name ?? "",
      duration: "60",
      remarks: "",
    });
    clearTaskSpeech();
  };

  const releaseTaskMic = () => {
    taskStreamRef.current?.getTracks().forEach((track) => track.stop());
    taskStreamRef.current = null;
    taskRecorderRef.current = null;
  };

  const finishTaskRecording = (discard: boolean) => {
    if (taskTimerRef.current != null) {
      window.clearInterval(taskTimerRef.current);
      taskTimerRef.current = null;
    }
    setTaskRecording(false);
    if (discard) taskDiscardRef.current = true;
    const recorder = taskRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      if (!taskStoppingRef.current) {
        taskStoppingRef.current = true;
        recorder.stop();
      }
      return;
    }
    releaseTaskMic();
  };

  const applyTaskDictation = (result: TaskDictationResponse) => {
    const filled: { field: TaskSpeechField; value: string }[] = [];
    const patch: Partial<typeof newTask> = {};
    if (result.fields.activityId != null) {
      patch.activityId = String(result.fields.activityId);
      filled.push({ field: "activityId", value: result.fields.activityName ?? "" });
    }
    if (result.fields.name) {
      patch.name = result.fields.name;
      filled.push({ field: "name", value: result.fields.name });
    }
    if (result.fields.description) {
      patch.description = result.fields.description;
      filled.push({ field: "description", value: result.fields.description });
    }
    if (result.fields.plannedDate) {
      patch.plannedDate = result.fields.plannedDate;
      filled.push({ field: "plannedDate", value: result.fields.plannedDate });
    }
    if (result.fields.duration) {
      patch.duration = result.fields.duration;
      filled.push({ field: "duration", value: result.fields.duration });
    }
    if (result.fields.priority) {
      patch.priority = result.fields.priority;
      filled.push({ field: "priority", value: PRIORITY_LABELS[result.fields.priority] });
    }
    if (result.fields.status && result.fields.status !== "completed") {
      patch.status = result.fields.status;
      filled.push({ field: "status", value: STATUS_LABELS[result.fields.status] });
    }
    if (result.fields.assignee) {
      patch.assignee = result.fields.assignee;
      filled.push({ field: "assignee", value: result.fields.assignee });
    }
    if (result.fields.remarks) {
      patch.remarks = result.fields.remarks;
      filled.push({ field: "remarks", value: result.fields.remarks });
    }
    setNewTask((prev) => ({ ...prev, ...patch }));
    setTaskSpeechPairs(filled);
    setTaskRejected(result.rejected);
    setTaskTranscript(result.transcript);
  };

  const submitTaskRecording = async (blob: Blob) => {
    setTaskDictating(true);
    try {
      if (blob.size < 800) {
        toast({ title: "Recording was too short", variant: "destructive" });
        return;
      }
      const body = new FormData();
      body.append("audio", blob, blob.type.includes("mp4") ? "dictation.m4a" : "dictation.webm");
      const response = await fetch(`/api/projects/${projectId}/tasks/dictate`, { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = typeof payload?.message === "string" ? payload.message : "Could not transcribe that recording";
        throw new Error(message);
      }
      const result = (await response.json()) as TaskDictationResponse;
      applyTaskDictation(result);
      const filledCount =
        (result.fields.activityId != null ? 1 : 0) +
        [
          result.fields.name,
          result.fields.description,
          result.fields.plannedDate,
          result.fields.duration,
          result.fields.priority,
          result.fields.status,
          result.fields.assignee,
          result.fields.remarks,
        ].filter(Boolean).length;
      toast({
        title: filledCount > 0 ? "Form filled from speech" : "Nothing passed validation",
        description:
          filledCount > 0
            ? "Review the values. Anything that did not validate was left for you to enter."
            : result.transcript || "Name the activity and the task details.",
      });
    } catch (error) {
      toast({
        title: "Dictation failed",
        description: error instanceof Error ? error.message : "Could not transcribe that recording",
        variant: "destructive",
      });
    } finally {
      setTaskDictating(false);
    }
  };

  const startTaskRecording = async () => {
    if (taskRecording || taskDictating || taskArmingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ title: "This browser cannot record audio", variant: "destructive" });
      return;
    }
    taskArmingRef.current = true;
    try {
      taskDiscardRef.current = false;
      taskStoppingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      taskStreamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      taskChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) taskChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(taskChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        taskChunksRef.current = [];
        const discard = taskDiscardRef.current;
        taskDiscardRef.current = false;
        taskStoppingRef.current = false;
        releaseTaskMic();
        if (!discard) void submitTaskRecording(blob);
      };
      taskRecorderRef.current = recorder;
      recorder.start();
      setTaskRecordSeconds(0);
      setTaskRecording(true);
      clearTaskSpeech();
      const startedAt = Date.now();
      taskTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTaskRecordSeconds(elapsed);
        if (elapsed >= 45 && recorder.state === "recording") finishTaskRecording(false);
      }, 250);
    } catch {
      finishTaskRecording(true);
      toast({
        title: "Microphone unavailable",
        description: "Allow microphone access, then try again.",
        variant: "destructive",
      });
    } finally {
      taskArmingRef.current = false;
    }
  };

  useEffect(() => {
    if (!addDialogOpen) finishTaskRecording(true);
    return () => {
      if (taskTimerRef.current != null) window.clearInterval(taskTimerRef.current);
    };
  }, [addDialogOpen]);

  const updateNewTask = <K extends keyof typeof newTask>(field: K, value: (typeof newTask)[K]) => {
    setNewTask((prev) => ({ ...prev, [field]: value }));
    setTaskSpeechPairs((pairs) => pairs.filter((pair) => pair.field !== field));
  };

  const taskSpeechClass = (field: TaskSpeechField) =>
    taskSpeechPairs.some((pair) => pair.field === field) ? "ring-2 ring-amber-400" : "";

  const handleDragStart = (e: React.DragEvent, task: ProjectTaskItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ task }));
  };

  const handleDropOnActivity = (e: React.DragEvent, activityId: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const { task } = JSON.parse(raw) as { task: ProjectTaskItem };
      if (task.activityId === activityId) return;
      updateMutation.mutate(
        { id: task.id, data: { activityId } },
        {
          onSuccess: () => {
            toast({
              title: "Task reassigned",
              description: `Moved to ${activityNameById(activityId)}.`,
            });
          },
        }
      );
    } catch {
      /* ignore */
    }
  };

  const handleToggleStatusFilter = (status: TaskStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const handleCreateTask = () => {
    const activityId = parseInt(newTask.activityId, 10);
    if (!activityId || !newTask.name.trim()) {
      toast({ title: "Activity and name are required", variant: "destructive" });
      return;
    }
    const remarks = encodeTaskMeta(newTask.priority, newTask.assignee, newTask.remarks);
    createMutation.mutate({
      activityId,
      name: newTask.name.trim(),
      description: newTask.description || null,
      duration: parseInt(newTask.duration, 10) || 60,
      status: newTask.status,
      plannedDate: newTask.plannedDate,
      remarks,
      globalTaskId: null,
    });
  };

  const handleRefresh = () => {
    refetchTasks();
  };

  const refreshing = tasksFetching;

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] flex-col overflow-hidden bg-[var(--bg-cream)]">
      <TasksPageHeader
        projectId={projectId ?? ""}
        projectName={project?.name}
        activeTab={catalogTab}
        onTabChange={setCatalogTab}
        allCount={allProjectTasks.length}
        myCount={myTasks.length}
        pendingCount={pendingTasks.length}
        overdueCount={overdueTasks.length}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        onImportCsv={() => setImportDialogOpen(true)}
        onGenerateTasks={() =>
          toast({
            title: "Generate Tasks",
            description: "Auto-generate from WBS/activities — coming soon.",
          })
        }
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 pb-6 lg:grid-cols-[3fr_2fr] lg:overflow-hidden lg:px-8">
        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          <TasksListPanel
            tasks={leftPanelTasks}
            totalCount={catalogSource.length}
            search={debouncedSearch}
            priorityFilter={priorityFilter}
            onPriorityFilter={setPriorityFilter}
            statusFilters={statusFilters}
            onToggleStatusFilter={handleToggleStatusFilter}
            onClearSearch={() => {
              setSearchTerm("");
              setStatusFilters(new Set());
            }}
            sortKey={sortKey}
            onSortChange={setSortKey}
            selectedId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onAdd={() => {
              resetNewTask();
              setAddDialogOpen(true);
            }}
            onDragStart={handleDragStart}
            loading={tasksLoading}
            referenceDate={selectedDate}
          />
        </div>

        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          <TasksActivitiesPanel
            activities={projectActivities}
            selectedActivityId={selectedActivityId}
            onSelectActivity={setSelectedActivityId}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            tasks={rightPanelTasks}
            activityNameById={activityNameById}
            loading={activitiesLoading || tasksLoading}
            onDropOnActivity={handleDropOnActivity}
            onEdit={(task) => {
              setEditingTask(task);
              setEditDialogOpen(true);
            }}
            onClose={(id) => {
              if (confirm("Close this task?")) closeMutation.mutate(id);
            }}
            onDelete={(id) => {
              if (confirm("Delete this task?")) deleteMutation.mutate(id);
            }}
            projectId={projectId ?? ""}
          />
        </div>
      </div>

      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            finishTaskRecording(true);
            clearTaskSpeech();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Speak the activity and the task details. Activity must match the list. A date, duration, priority, or status is filled only when it is valid. Anything else stays for you to enter.
                </p>
                <Button
                  type="button"
                  variant={taskRecording ? "destructive" : "outline"}
                  size="sm"
                  disabled={taskDictating}
                  onClick={() => (taskRecording ? finishTaskRecording(false) : void startTaskRecording())}
                >
                  {taskDictating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : taskRecording ? (
                    <Square className="mr-2 h-4 w-4" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4" />
                  )}
                  {taskDictating ? "Transcribing" : taskRecording ? `Stop ${taskRecordSeconds}s` : "Speak"}
                </Button>
              </div>
              {taskTranscript && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Heard: </span>
                  {taskTranscript}
                </p>
              )}
              {taskSpeechPairs.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {taskSpeechPairs.map((pair) => (
                    <div key={pair.field} className="contents">
                      <dt className="text-muted-foreground">{TASK_SPEECH_LABELS[pair.field]}</dt>
                      <dd className="font-medium">{pair.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {taskRejected.length > 0 && (
                <ul className="space-y-1 text-xs text-amber-700">
                  {taskRejected.map((item) => (
                    <li key={`${item.field}-${item.spoken}`}>
                      {TASK_SPEECH_LABELS[item.field]} “{item.spoken}” {item.reason}.
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <Label>Activity</Label>
              <Select value={newTask.activityId} onValueChange={(v) => updateNewTask("activityId", v)}>
                <SelectTrigger className={`mt-1 ${taskSpeechClass("activityId")}`}>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {projectActivities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                className={`mt-1 ${taskSpeechClass("name")}`}
                value={newTask.name}
                onChange={(e) => updateNewTask("name", e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className={`mt-1 ${taskSpeechClass("description")}`}
                value={newTask.description}
                onChange={(e) => updateNewTask("description", e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  className={`mt-1 ${taskSpeechClass("plannedDate")}`}
                  value={newTask.plannedDate}
                  onChange={(e) => updateNewTask("plannedDate", e.target.value)}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  className={`mt-1 ${taskSpeechClass("duration")}`}
                  min={1}
                  max={10080}
                  value={newTask.duration}
                  onChange={(e) => updateNewTask("duration", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => updateNewTask("priority", v as TaskPriority)}
                >
                  <SelectTrigger className={`mt-1 ${taskSpeechClass("priority")}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(v) => updateNewTask("status", v as TaskStatus)}
                >
                  <SelectTrigger className={`mt-1 ${taskSpeechClass("status")}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Assignee</Label>
              <Input
                className={`mt-1 ${taskSpeechClass("assignee")}`}
                value={newTask.assignee}
                onChange={(e) => updateNewTask("assignee", e.target.value)}
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea
                className={`mt-1 ${taskSpeechClass("remarks")}`}
                value={newTask.remarks}
                onChange={(e) => updateNewTask("remarks", e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={createMutation.isPending}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Name</Label>
                <Input
                  className="mt-1"
                  value={editForm.name}
                  onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1"
                  value={editForm.description}
                  onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={editForm.plannedDate}
                    onChange={(e) => setEditForm((s) => ({ ...s, plannedDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={editForm.duration}
                    onChange={(e) => setEditForm((s) => ({ ...s, duration: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(v) => setEditForm((s) => ({ ...s, priority: v as TaskPriority }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm((s) => ({ ...s, status: v as TaskStatus }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Assignee</Label>
                <Input
                  className="mt-1"
                  value={editForm.assignee}
                  onChange={(e) => setEditForm((s) => ({ ...s, assignee: e.target.value }))}
                />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea
                  className="mt-1"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm((s) => ({ ...s, remarks: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    const remarks = encodeTaskMeta(editForm.priority, editForm.assignee, editForm.remarks);
                    updateMutation.mutate({
                      id: editingTask.id,
                      data: {
                        name: editForm.name,
                        description: editForm.description || null,
                        duration: editForm.duration ? parseInt(editForm.duration, 10) : null,
                        status: editForm.status,
                        plannedDate: editForm.plannedDate || null,
                        remarks,
                      },
                    });
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Tasks</DialogTitle>
          </DialogHeader>
          <p className="kanban-body-sm text-[var(--text-secondary)]">
            CSV import for project tasks is coming soon. Use Task Master to manage global task templates, or add tasks
            individually with &quot;+ Add Task&quot;.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
