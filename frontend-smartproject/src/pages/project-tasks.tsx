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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";
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

const SPOKEN_FIELD_LABELS: Record<TaskSpeechField, string> = {
  activityId: "Activity",
  name: "Name",
  description: "Description",
  plannedDate: "Due date",
  duration: "Duration",
  priority: "Priority",
  status: "Status",
  assignee: "Assignee",
  remarks: "Remarks",
};

const FIELD_PROMPT_ORDER: TaskSpeechField[] = [
  "activityId",
  "name",
  "description",
  "plannedDate",
  "duration",
  "priority",
  "status",
  "assignee",
  "remarks",
];

type TaskFormState = {
  activityId: string;
  name: string;
  description: string;
  plannedDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  duration: string;
  remarks: string;
};

function blankTaskFields(task: TaskFormState): TaskSpeechField[] {
  return FIELD_PROMPT_ORDER.filter((field) => {
    if (field === "activityId") return !task.activityId;
    if (field === "name") return !task.name.trim();
    if (field === "description") return !task.description.trim();
    if (field === "plannedDate") return !task.plannedDate;
    if (field === "duration") return !task.duration.trim();
    if (field === "priority") return !task.priority;
    if (field === "status") return !task.status;
    if (field === "assignee") return !task.assignee.trim();
    return !task.remarks.trim();
  });
}

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

const TASK_RECORD_LIMIT_SECONDS = 120;

type VoiceListFocus = "catalog" | "all" | "day";

interface TaskCommandResponse extends TaskDictationResponse {
  intent: "create" | "show_all" | "show_day" | "search" | "edit" | "delete" | "unknown";
  date: string | null;
  taskId: number | null;
  taskMatch: "none" | "one" | "many" | "unspecified";
  matchingTaskNames?: string[];
  searchParams?: {
    nameLike?: string | null;
    activity: string | null;
    remarks: string | null;
    status: string | null;
    dueDate: string | null;
    fromDate: string | null;
    toDate: string | null;
    query: string | null;
  };
}

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
  const [voiceListFocus, setVoiceListFocus] = useState<VoiceListFocus>("catalog");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: string | null; to: string | null } | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTaskItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<ProjectTaskItem | null>(null);
  const deletePromptRef = useRef<ProjectTaskItem | null>(null);
  if (taskToDelete) deletePromptRef.current = taskToDelete;
  const deletePrompt = taskToDelete ?? deletePromptRef.current;
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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
  const taskFormRef = useRef(newTask);
  const addDialogOpenRef = useRef(false);
  const promptTokenRef = useRef(0);
  const listenTokenRef = useRef(0);
  const answeringFieldRef = useRef<TaskSpeechField | null>(null);
  const skippedFieldsRef = useRef<Set<TaskSpeechField>>(new Set());
  const fieldRetryRef = useRef<TaskSpeechField | null>(null);
  const taskRecordLimitRef = useRef(TASK_RECORD_LIMIT_SECONDS);
  const taskLiveRef = useRef(false);
  const taskDictatingRef = useRef(false);
  const askNextEmptyFieldRef = useRef<(leadIn?: string) => Promise<void>>(async () => {});
  const [fieldPrompt, setFieldPrompt] = useState("");
  const [promptedField, setPromptedField] = useState<TaskSpeechField | null>(null);
  taskFormRef.current = newTask;
  addDialogOpenRef.current = addDialogOpen;
  const [pageRecording, setPageRecording] = useState(false);
  const [pageDictating, setPageDictating] = useState(false);
  const [pageRecordSeconds, setPageRecordSeconds] = useState(0);
  const [pageVoiceNote, setPageVoiceNote] = useState("");
  const pageRecorderRef = useRef<MediaRecorder | null>(null);
  const pageStreamRef = useRef<MediaStream | null>(null);
  const pageChunksRef = useRef<Blob[]>([]);
  const pageTimerRef = useRef<number | null>(null);
  const pageDiscardRef = useRef(false);
  const pageStoppingRef = useRef(false);
  const pageArmingRef = useRef(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceDoneRef = useRef<(() => void) | null>(null);
  const pendingAnnouncement = useRef<string | null>(null);
  const keepAnnouncementRef = useRef(false);
  const formSpokenRef = useRef(false);

  const playSpoken = useCallback((text: string) => {
    const spoken = text.trim();
    if (!spoken) return Promise.resolve();
    return new Promise<void>((resolve) => {
      voiceDoneRef.current?.();
      voiceDoneRef.current = resolve;
      void (async () => {
        try {
          const response = await fetch("/api/voice-agent/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ text: spoken }),
          });
          if (!response.ok || voiceDoneRef.current !== resolve) {
            if (voiceDoneRef.current === resolve) voiceDoneRef.current = null;
            resolve();
            return;
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const previous = voiceAudioRef.current;
          if (previous) {
            previous.pause();
            if (previous.src) URL.revokeObjectURL(previous.src);
          }
          const audio = new Audio(url);
          voiceAudioRef.current = audio;
          const finish = () => {
            URL.revokeObjectURL(url);
            if (voiceAudioRef.current === audio) voiceAudioRef.current = null;
            if (voiceDoneRef.current === resolve) voiceDoneRef.current = null;
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          await audio.play();
        } catch {
          if (voiceDoneRef.current === resolve) voiceDoneRef.current = null;
          resolve();
        }
      })();
    });
  }, []);

  const speakAnnouncement = useCallback(
    (text: string) => {
      const spoken = text.trim();
      if (!spoken) return;
      setPageVoiceNote(spoken);
      void playSpoken(spoken);
    },
    [playSpoken]
  );

  const releaseSpokenLine = () => {
    const line = pendingAnnouncement.current;
    pendingAnnouncement.current = null;
    if (line) speakAnnouncement(line);
  };

  const failSpokenLine = (fallback: string) => {
    if (!pendingAnnouncement.current) return;
    pendingAnnouncement.current = null;
    speakAnnouncement(fallback);
  };

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const act = params.get("activity");
    const status = params.get("status");
    const remarks = params.get("remarks");
    const q = params.get("search") || params.get("q");
    const due = params.get("dueDate");
    const from = params.get("fromDate") || params.get("startDate");
    const to = params.get("toDate") || params.get("endDate");

    if (act && projectActivities.length > 0) {
      const match = projectActivities.find(
        (a) => String(a.id) === act || a.name.toLowerCase().includes(act.toLowerCase())
      );
      if (match) setSelectedActivityId(match.id);
      else setSearchTerm(act);
    }
    if (status) {
      const normalized = status === "done" ? "completed" : status;
      if (["pending", "in_progress", "completed", "blocked"].includes(normalized)) {
        setStatusFilters(new Set([normalized as TaskStatus]));
      }
    }
    if (remarks) {
      setSearchTerm(remarks);
    } else if (q) {
      setSearchTerm(q);
    }
    if (from || to) {
      setDateRangeFilter({ from, to });
      setVoiceListFocus("all");
    } else if (due) {
      setSelectedDate(dateFromYmd(due));
      setVoiceListFocus("day");
    }
  }, [projectActivities]);

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
    if (dateRangeFilter?.from || dateRangeFilter?.to) {
      list = list.filter((t) => {
        if (!t.plannedDate) return false;
        if (dateRangeFilter.from && t.plannedDate < dateRangeFilter.from) return false;
        if (dateRangeFilter.to && t.plannedDate > dateRangeFilter.to) return false;
        return true;
      });
    } else if (voiceListFocus === "day") {
      list = list.filter((t) => isSameDay(t.plannedDate, selectedDate));
    } else if (voiceListFocus !== "all" && catalogTab === "all") {
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
  }, [catalogSource, catalogTab, allProjectTasks, selectedDate, selectedActivityId, sortKey, voiceListFocus, dateRangeFilter]);

  const rightPanelTasks = useMemo(() => {
    let list =
      voiceListFocus === "all" || dateRangeFilter != null
        ? [...allProjectTasks]
        : allProjectTasks.filter((t) => isSameDay(t.plannedDate, selectedDate));
    if (dateRangeFilter?.from || dateRangeFilter?.to) {
      list = list.filter((t) => {
        if (!t.plannedDate) return false;
        if (dateRangeFilter.from && t.plannedDate < dateRangeFilter.from) return false;
        if (dateRangeFilter.to && t.plannedDate > dateRangeFilter.to) return false;
        return true;
      });
    }
    if (selectedActivityId != null) {
      list = list.filter((t) => t.activityId === selectedActivityId);
    }
    return list;
  }, [allProjectTasks, selectedDate, selectedActivityId, voiceListFocus, dateRangeFilter]);

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
      setEditingTask(null);
      resetNewTask();
      releaseSpokenLine();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      failSpokenLine("I could not create that task.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectTaskItem> }) =>
      put(`/projects/${projectId}/tasks/${id}`, data),
    onSuccess: (_data, { id }) => {
      invalidateTasks();
      toast({ title: "Task updated" });
      if (editingTask?.id === id) {
        setEditingTask(null);
        setAddDialogOpen(false);
        clearTaskSpeech();
      }
      releaseSpokenLine();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      failSpokenLine("I could not save that change.");
    },
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
      releaseSpokenLine();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      failSpokenLine("I could not delete that task.");
    },
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
    taskLiveRef.current = false;
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
    setNewTask((prev) => {
      const next = { ...prev, ...patch };
      taskFormRef.current = next;
      return next;
    });
    setTaskSpeechPairs(filled);
    setTaskRejected(result.rejected);
    setTaskTranscript(result.transcript);
  };

  const submitTaskRecording = async (blob: Blob) => {
    const answeringField = answeringFieldRef.current;
    taskDictatingRef.current = true;
    setTaskDictating(true);
    try {
      if (blob.size < 800) {
        toast({ title: "Recording was too short", variant: "destructive" });
        if (answeringField) {
          const label = SPOKEN_FIELD_LABELS[answeringField];
          if (fieldRetryRef.current === answeringField) {
            skippedFieldsRef.current.add(answeringField);
            fieldRetryRef.current = null;
            void askNextEmptyFieldRef.current(`I didn't catch a value for ${label}. You can type it. `);
          } else {
            fieldRetryRef.current = answeringField;
            void askNextEmptyFieldRef.current(`I didn't hear a value for ${label}. `);
          }
        }
        return;
      }
      const body = new FormData();
      body.append("audio", blob, blob.type.includes("mp4") ? "dictation.m4a" : "dictation.webm");
      if (answeringField) {
        body.append("field", answeringField);
        const response = await fetch(`/api/projects/${projectId}/tasks/dictate-field`, { method: "POST", body });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = typeof payload?.message === "string" ? payload.message : "Could not transcribe that recording";
          throw new Error(message);
        }
        const result = (await response.json()) as {
          transcript: string;
          action: "value" | "skip" | "unclear";
          stored: string | null;
          display: string | null;
          reason: string | null;
        };
        setTaskTranscript(result.transcript);
        const label = SPOKEN_FIELD_LABELS[answeringField];
        if (result.action === "value" && result.stored) {
          const next = { ...taskFormRef.current, [answeringField]: result.stored };
          taskFormRef.current = next;
          setNewTask(next);
          setTaskSpeechPairs((pairs) => [
            ...pairs.filter((pair) => pair.field !== answeringField),
            { field: answeringField, value: result.display || result.stored || "" },
          ]);
          fieldRetryRef.current = null;
          skippedFieldsRef.current.delete(answeringField);
          void askNextEmptyFieldRef.current(`${label} is set to ${result.display || result.stored}. `);
          return;
        }
        if (result.action === "skip") {
          skippedFieldsRef.current.add(answeringField);
          fieldRetryRef.current = null;
          void askNextEmptyFieldRef.current(`I'll leave ${label} empty. `);
          return;
        }
        if (fieldRetryRef.current !== answeringField) {
          fieldRetryRef.current = answeringField;
          const why = result.reason ? `${label} ${result.reason}. ` : `I didn't hear a value for ${label}. `;
          void askNextEmptyFieldRef.current(why);
          return;
        }
        skippedFieldsRef.current.add(answeringField);
        fieldRetryRef.current = null;
        void askNextEmptyFieldRef.current(`I didn't catch a value for ${label}. You can type it. `);
        return;
      }
      const response = await fetch(`/api/projects/${projectId}/tasks/dictate`, { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = typeof payload?.message === "string" ? payload.message : "Could not transcribe that recording";
        throw new Error(message);
      }
      const result = (await response.json()) as TaskDictationResponse;
      formSpokenRef.current = true;
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
      void askNextEmptyFieldRef.current();
    } catch (error) {
      toast({
        title: "Dictation failed",
        description: error instanceof Error ? error.message : "Could not transcribe that recording",
        variant: "destructive",
      });
    } finally {
      taskDictatingRef.current = false;
      setTaskDictating(false);
    }
  };

  const startTaskRecording = async (forField = false) => {
    if (taskLiveRef.current || taskDictatingRef.current || taskArmingRef.current) return;
    if (pageRecording || pageDictating) {
      toast({ title: "Finish the page recording first" });
      return;
    }
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
      taskLiveRef.current = true;
      setTaskRecordSeconds(0);
      setTaskRecording(true);
      if (!forField) {
        answeringFieldRef.current = null;
        clearTaskSpeech();
      }
      taskRecordLimitRef.current = forField ? 25 : TASK_RECORD_LIMIT_SECONDS;
      const startedAt = Date.now();
      taskTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTaskRecordSeconds(elapsed);
        if (elapsed >= taskRecordLimitRef.current && recorder.state === "recording") finishTaskRecording(false);
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

  const askNextEmptyField = async (leadIn = "") => {
    const token = ++promptTokenRef.current;
    if (!addDialogOpenRef.current || taskLiveRef.current) return;
    const field = blankTaskFields(taskFormRef.current).find((item) => !skippedFieldsRef.current.has(item));
    if (!field) {
      answeringFieldRef.current = null;
      setPromptedField(null);
      if (leadIn.trim()) {
        setFieldPrompt(leadIn.trim());
        await playSpoken(leadIn.trim());
      } else {
        setFieldPrompt("");
      }
      return;
    }
    if (fieldRetryRef.current && fieldRetryRef.current !== field) fieldRetryRef.current = null;
    answeringFieldRef.current = field;
    setPromptedField(field);
    const label = SPOKEN_FIELD_LABELS[field];
    const question = `You have not filled the field ${label}. Should it be filled? Please give the value.`;
    setFieldPrompt(question);
    const listen = listenTokenRef.current;
    await playSpoken(`${leadIn}${question}`);
    if (token !== promptTokenRef.current || listen !== listenTokenRef.current || !addDialogOpenRef.current) return;
    if (answeringFieldRef.current !== field) return;
    if (!blankTaskFields(taskFormRef.current).includes(field)) {
      void askNextEmptyFieldRef.current();
      return;
    }
    await startTaskRecording(true);
  };
  askNextEmptyFieldRef.current = askNextEmptyField;

  const releasePageMic = () => {
    pageStreamRef.current?.getTracks().forEach((track) => track.stop());
    pageStreamRef.current = null;
    pageRecorderRef.current = null;
  };

  const finishPageRecording = (discard: boolean) => {
    if (pageTimerRef.current != null) {
      window.clearInterval(pageTimerRef.current);
      pageTimerRef.current = null;
    }
    setPageRecording(false);
    if (discard) pageDiscardRef.current = true;
    const recorder = pageRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      if (!pageStoppingRef.current) {
        pageStoppingRef.current = true;
        recorder.stop();
      }
      return;
    }
    releasePageMic();
  };

  const dateFromYmd = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const applyPageCommand = (result: TaskCommandResponse) => {
    formSpokenRef.current = false;
    setPageVoiceNote(result.transcript ? `Heard: ${result.transcript}` : "");
    const rejectedNote = result.rejected[0]
      ? `${TASK_SPEECH_LABELS[result.rejected[0].field]} “${result.rejected[0].spoken}” ${result.rejected[0].reason}.`
      : "";

    if (result.intent === "show_all") {
      setCatalogTab("all");
      setSearchTerm("");
      setPriorityFilter("all");
      setStatusFilters(new Set());
      setSelectedActivityId(null);
      setDateRangeFilter(null);
      setVoiceListFocus("all");
      toast({ title: "Showing all tasks", description: `${allProjectTasks.length} tasks` });
      speakAnnouncement(`Showing all ${allProjectTasks.length} tasks.`);
      return;
    }

    if (result.intent === "search") {
      const sp = result.searchParams;
      setCatalogTab("all");
      setPriorityFilter("all");
      setVoiceListFocus("all");

      // Check if this is a name-like search: e.g. "display or show tasks which have name like 'task'"
      const nameQuery = sp?.nameLike || sp?.query;
      if (nameQuery) {
        const q = nameQuery.trim().toLowerCase();
        const nameMatches = allProjectTasks.filter((t) => t.name.toLowerCase().includes(q));
        setSearchTerm(nameQuery);
        setSelectedActivityId(null);
        setDateRangeFilter(null);

        if (nameMatches.length === 0) {
          toast({
            title: "No tasks found",
            description: `No tasks have a name like “${nameQuery}”.`,
            variant: "destructive",
          });
          speakAnnouncement(`No tasks found with a name like ${nameQuery}.`);
          return;
        }

        if (nameMatches.length === 1) {
          const soleTask = nameMatches[0];
          setSelectedTaskId(soleTask.id);
          openEditTask(soleTask);
          toast({
            title: `Opened “${soleTask.name}”`,
            description: "Opening in edit modal.",
          });
          speakAnnouncement(`Found 1 task: ${soleTask.name}. Opening it for editing.`);
          return;
        }

        const taskNamesList = nameMatches.map((t) => t.name);
        const spokenNames = taskNamesList.slice(0, 5).join(", ");
        toast({
          title: `${nameMatches.length} tasks match “${nameQuery}”`,
          description: `Tasks: ${taskNamesList.join(", ")}. Only one can be opened at a time.`,
        });
        speakAnnouncement(
          `There are ${nameMatches.length} tasks: ${spokenNames}. Which one would you like to open? Only one can be opened at a time.`
        );
        return;
      }

      const announcedFilters: string[] = [];

      // 1. Activity filter
      if (sp?.activity) {
        const queryAct = sp.activity.trim().toLowerCase();
        const matchedAct = projectActivities.find((a) =>
          a.name.toLowerCase().includes(queryAct)
        );
        if (matchedAct) {
          setSelectedActivityId(matchedAct.id);
          announcedFilters.push(`activity is ${matchedAct.name}`);
        } else {
          setSearchTerm(sp.activity);
          announcedFilters.push(`activity matches ${sp.activity}`);
        }
      } else {
        setSelectedActivityId(null);
      }

      // 2. Remarks filter
      if (sp?.remarks) {
        setSearchTerm(sp.remarks);
        announcedFilters.push(`remarks contain “${sp.remarks}”`);
      } else if (!sp?.activity) {
        setSearchTerm("");
      }

      // 3. Status filter
      if (sp?.status) {
        const normalized = (sp.status === "done" ? "completed" : sp.status) as TaskStatus;
        setStatusFilters(new Set([normalized]));
        announcedFilters.push(`status is ${STATUS_LABELS[normalized] ?? normalized}`);
      } else {
        setStatusFilters(new Set());
      }

      // 4. Date range or single date
      if (sp?.fromDate && sp?.toDate) {
        setDateRangeFilter({ from: sp.fromDate, to: sp.toDate });
        announcedFilters.push(`due dates between ${sp.fromDate} and ${sp.toDate}`);
      } else if (sp?.dueDate) {
        const day = dateFromYmd(sp.dueDate);
        setSelectedDate(day);
        setVoiceListFocus("day");
        setDateRangeFilter(null);
        announcedFilters.push(`due on ${format(day, "d MMMM yyyy")}`);
      } else {
        setDateRangeFilter(null);
      }

      const matchingTasks = allProjectTasks.filter((t) => {
        if (sp?.activity) {
          const actName = activityNameById(t.activityId).toLowerCase();
          if (!actName.includes(sp.activity.toLowerCase())) return false;
        }
        if (sp?.remarks) {
          const meta = parseTaskMeta(t.remarks);
          if (!meta.cleanRemarks.toLowerCase().includes(sp.remarks.toLowerCase())) return false;
        }
        if (sp?.status) {
          const norm = sp.status === "done" ? "completed" : sp.status;
          if (t.status !== norm) return false;
        }
        if (sp?.fromDate && sp?.toDate) {
          if (!t.plannedDate || t.plannedDate < sp.fromDate || t.plannedDate > sp.toDate) return false;
        } else if (sp?.dueDate) {
          if (t.plannedDate !== sp.dueDate) return false;
        }
        return true;
      });

      const count = matchingTasks.length;
      const filterSummary = announcedFilters.length > 0 ? announcedFilters.join(", ") : "your criteria";
      toast({
        title: `Search: ${count} task${count === 1 ? "" : "s"} found`,
        description: `Showing tasks where ${filterSummary}.`,
      });
      speakAnnouncement(`Found ${count} task${count === 1 ? "" : "s"} where ${filterSummary}.`);
      return;
    }

    if (result.intent === "show_day") {
      if (!result.date) {
        toast({
          title: "Say which day",
          description: rejectedNote || "Try today, tomorrow, or 14 December 2026.",
          variant: "destructive",
        });
        speakAnnouncement("Say which day, such as today, tomorrow, or the fourteenth of December.");
        return;
      }
      const day = dateFromYmd(result.date);
      setCatalogTab("all");
      setSearchTerm("");
      setPriorityFilter("all");
      setStatusFilters(new Set());
      setSelectedActivityId(null);
      setSelectedDate(day);
      setVoiceListFocus("day");
      toast({ title: `Tasks for ${format(day, "d MMMM yyyy")}` });
      speakAnnouncement(`Showing tasks for ${format(day, "d MMMM yyyy")}.`);
      return;
    }

    if (result.intent === "create") {
      if (result.fields.activityId != null && result.fields.name) {
        createMutation.mutate({
          activityId: result.fields.activityId,
          name: result.fields.name.trim(),
          description: result.fields.description || null,
          duration: parseInt(result.fields.duration ?? "", 10) || 60,
          status: result.fields.status && result.fields.status !== "completed" ? result.fields.status : "pending",
          plannedDate: result.fields.plannedDate || format(selectedDate, "yyyy-MM-dd"),
          remarks: encodeTaskMeta(
            result.fields.priority ?? "normal",
            result.fields.assignee || user?.name || "",
            result.fields.remarks ?? ""
          ),
          globalTaskId: null,
        });
        pendingAnnouncement.current = `A new task named ${result.fields.name.trim()} was created.`;
        setPageVoiceNote(`Creating “${result.fields.name}”.`);
        return;
      }
      resetNewTask();
      applyTaskDictation(result);
      setAddDialogOpen(true);
      toast({
        title: "New task needs a matching activity and a name",
        description: rejectedNote || result.transcript || "The form is open with whatever could be filled.",
      });
      return;
    }

    const namedTask = result.taskId != null ? allProjectTasks.find((task) => task.id === result.taskId) : undefined;
    if (result.intent === "edit" || result.intent === "delete") {
      if (result.taskMatch === "many") {
        const matchingNames =
          result.matchingTaskNames && result.matchingTaskNames.length > 0
            ? result.matchingTaskNames
            : allProjectTasks
                .filter((t) => result.taskName && t.name.toLowerCase().includes(result.taskName.toLowerCase()))
                .map((t) => t.name);
        if (result.taskName) setSearchTerm(result.taskName);
        const spokenNames = matchingNames.slice(0, 5).join(", ");
        toast({
          title: `More than one task matches “${result.taskName || "that name"}”`,
          description: `Tasks: ${matchingNames.join(", ")}. Only one can be opened at a time.`,
          variant: "destructive",
        });
        speakAnnouncement(
          `There are ${matchingNames.length} tasks: ${spokenNames}. Which one would you like to open? Only one can be opened at a time.`
        );
        return;
      }
      if (result.taskMatch === "none" || !namedTask) {
        const line = result.taskMatch === "none" ? "No task matched that name." : "Open a task first, or say its name.";
        toast({ title: line, variant: "destructive" });
        speakAnnouncement(line);
        return;
      }
      setSelectedTaskId(namedTask.id);

      if (result.intent === "delete") {
        pendingAnnouncement.current = `The task named ${namedTask.name} was deleted.`;
        setTaskToDelete(namedTask);
        setPageVoiceNote(`Confirm delete for ${namedTask.name}.`);
        speakAnnouncement(`Delete ${namedTask.name}? Confirm on the screen and I will remove it.`);
        return;
      }

      const meta = parseTaskMeta(namedTask.remarks);
      const data: Partial<ProjectTaskItem> = {};
      const changed: string[] = [];
      if (result.fields.name) {
        data.name = result.fields.name;
        changed.push("name");
      }
      if (result.fields.description) {
        data.description = result.fields.description;
        changed.push("description");
      }
      if (result.fields.plannedDate) {
        data.plannedDate = result.fields.plannedDate;
        changed.push("due date");
      }
      if (result.fields.duration) {
        data.duration = parseInt(result.fields.duration, 10);
        changed.push("duration");
      }
      if (result.fields.status) {
        data.status = result.fields.status;
        changed.push("status");
      }
      if (result.fields.activityId != null) {
        data.activityId = result.fields.activityId;
        changed.push("activity");
      }
      if (result.fields.priority || result.fields.assignee || result.fields.remarks) {
        data.remarks = encodeTaskMeta(
          result.fields.priority ?? meta.priority,
          result.fields.assignee ?? meta.assignee,
          result.fields.remarks ?? meta.cleanRemarks
        );
        if (result.fields.priority) changed.push("priority");
        if (result.fields.assignee) changed.push("assignee");
        if (result.fields.remarks) changed.push("remarks");
      }
      if (changed.length === 0) {
        openEditTask(namedTask);
        toast({
          title: `Editing “${namedTask.name}”`,
          description: "Opened in edit modal.",
        });
        speakAnnouncement(`Opened task ${namedTask.name} for editing.`);
        return;
      }
      updateMutation.mutate({ id: namedTask.id, data });
      pendingAnnouncement.current = `The task named ${result.fields.name || namedTask.name} was edited. I changed ${changed.join(", ")}.`;
      setPageVoiceNote(`Updating ${namedTask.name}: ${changed.join(", ")}.`);
      return;
    }

    toast({
      title: "Command not recognized",
      description: result.transcript || "Say create a task, show all tasks, show tasks on a day, edit this task, or delete this task.",
    });
    speakAnnouncement("I did not catch a task command. Try create, show, edit, or delete.");
  };

  const submitPageRecording = async (blob: Blob) => {
    setPageDictating(true);
    try {
      if (blob.size < 800) {
        toast({ title: "Recording was too short", variant: "destructive" });
        return;
      }
      const body = new FormData();
      body.append("audio", blob, blob.type.includes("mp4") ? "dictation.m4a" : "dictation.webm");
      const openTaskId = editingTask?.id ?? selectedTaskId;
      if (openTaskId != null) body.append("openTaskId", String(openTaskId));
      const response = await fetch(`/api/projects/${projectId}/tasks/command`, { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = typeof payload?.message === "string" ? payload.message : "Could not transcribe that recording";
        throw new Error(message);
      }
      applyPageCommand((await response.json()) as TaskCommandResponse);
    } catch (error) {
      toast({
        title: "Dictation failed",
        description: error instanceof Error ? error.message : "Could not transcribe that recording",
        variant: "destructive",
      });
    } finally {
      setPageDictating(false);
    }
  };

  const startPageRecording = async () => {
    if (pageRecording || pageDictating || pageArmingRef.current) return;
    if (taskRecording || taskDictating) {
      toast({ title: "Finish the form recording first" });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ title: "This browser cannot record audio", variant: "destructive" });
      return;
    }
    pageArmingRef.current = true;
    try {
      pageDiscardRef.current = false;
      pageStoppingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pageStreamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      pageChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) pageChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(pageChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        pageChunksRef.current = [];
        const discard = pageDiscardRef.current;
        pageDiscardRef.current = false;
        pageStoppingRef.current = false;
        releasePageMic();
        if (!discard) void submitPageRecording(blob);
      };
      pageRecorderRef.current = recorder;
      recorder.start();
      setPageRecordSeconds(0);
      setPageRecording(true);
      setPageVoiceNote("");
      const startedAt = Date.now();
      pageTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setPageRecordSeconds(elapsed);
        if (elapsed >= TASK_RECORD_LIMIT_SECONDS && recorder.state === "recording") finishPageRecording(false);
      }, 250);
    } catch {
      finishPageRecording(true);
      toast({
        title: "Microphone unavailable",
        description: "Allow microphone access, then try again.",
        variant: "destructive",
      });
    } finally {
      pageArmingRef.current = false;
    }
  };

  useEffect(() => {
    if (!addDialogOpen) {
      promptTokenRef.current += 1;
      listenTokenRef.current += 1;
      voiceAudioRef.current?.pause();
      voiceDoneRef.current?.();
      voiceDoneRef.current = null;
      answeringFieldRef.current = null;
      skippedFieldsRef.current = new Set();
      fieldRetryRef.current = null;
      setFieldPrompt("");
      setPromptedField(null);
      finishTaskRecording(true);
      return;
    }
    skippedFieldsRef.current = new Set();
    fieldRetryRef.current = null;
    const timer = window.setTimeout(() => {
      void askNextEmptyFieldRef.current();
    }, 700);
    return () => {
      window.clearTimeout(timer);
      if (taskTimerRef.current != null) window.clearInterval(taskTimerRef.current);
    };
  }, [addDialogOpen]);

  useEffect(() => {
    return () => {
      if (pageTimerRef.current != null) window.clearInterval(pageTimerRef.current);
      pageStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const updateNewTask = <K extends keyof typeof newTask>(field: K, value: (typeof newTask)[K]) => {
    setNewTask((prev) => ({ ...prev, [field]: value }));
    setTaskSpeechPairs((pairs) => pairs.filter((pair) => pair.field !== field));
  };

  const taskSpeechClass = (field: TaskSpeechField) => {
    if (promptedField === field) return "ring-2 ring-sky-400";
    return taskSpeechPairs.some((pair) => pair.field === field) ? "ring-2 ring-amber-400" : "";
  };

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

  const formFromTask = (task: ProjectTaskItem) => {
    const meta = parseTaskMeta(task.remarks);
    return {
      activityId: String(task.activityId),
      name: task.name,
      description: task.description ?? "",
      plannedDate: task.plannedDate ?? "",
      status: ((task.status as TaskStatus) || "pending") as TaskStatus,
      priority: meta.priority,
      assignee: meta.assignee,
      duration: task.duration != null ? String(task.duration) : "",
      remarks: meta.cleanRemarks,
    };
  };

  const openAddTask = () => {
    setEditingTask(null);
    resetNewTask();
    setAddDialogOpen(true);
  };

  const openEditTask = (task: ProjectTaskItem) => {
    setSelectedTaskId(task.id);
    setEditingTask(task);
    setNewTask(formFromTask(task));
    clearTaskSpeech();
    setAddDialogOpen(true);
  };

  const handleCreateTask = () => {
    const activityId = parseInt(newTask.activityId, 10);
    if (!activityId || !newTask.name.trim()) {
      toast({ title: "Activity and name are required", variant: "destructive" });
      return;
    }
    const remarks = encodeTaskMeta(newTask.priority, newTask.assignee, newTask.remarks);
    const payload = {
      activityId,
      name: newTask.name.trim(),
      description: newTask.description || null,
      duration: newTask.duration ? parseInt(newTask.duration, 10) : null,
      status: newTask.status,
      plannedDate: newTask.plannedDate || null,
      remarks,
    };
    if (formSpokenRef.current) {
      formSpokenRef.current = false;
      pendingAnnouncement.current = editingTask
        ? `The task named ${newTask.name.trim()} was edited.`
        : `A new task named ${newTask.name.trim()} was created.`;
    }
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: payload });
      return;
    }
    createMutation.mutate({ ...payload, duration: payload.duration || 60, globalTaskId: null });
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
        voice={{
          recording: pageRecording,
          busy: pageDictating,
          seconds: pageRecordSeconds,
          limit: TASK_RECORD_LIMIT_SECONDS,
          note: pageVoiceNote,
          onToggle: () => (pageRecording ? finishPageRecording(false) : void startPageRecording()),
        }}
      />

      {(dateRangeFilter || selectedActivityId != null) && (
        <div className="flex items-center justify-between border-b border-orange-200 bg-orange-50/80 px-6 py-2 kanban-caption text-orange-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Active filter:</span>
            {selectedActivityId != null && (
              <span className="rounded bg-orange-100 px-2 py-0.5 font-medium">
                Activity: {activityNameById(selectedActivityId)}
              </span>
            )}
            {dateRangeFilter && (
              <span className="rounded bg-orange-100 px-2 py-0.5 font-medium">
                Due: {dateRangeFilter.from ?? "any"} to {dateRangeFilter.to ?? "any"}
              </span>
            )}
          </div>
          <button
            type="button"
            className="font-medium text-orange-700 underline hover:text-orange-900"
            onClick={() => {
              setSelectedActivityId(null);
              setDateRangeFilter(null);
            }}
          >
            Reset filter
          </button>
        </div>
      )}

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
              setSelectedActivityId(null);
              setDateRangeFilter(null);
            }}
            sortKey={sortKey}
            onSortChange={setSortKey}
            selectedId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onAdd={openAddTask}
            onEdit={openEditTask}
            onDelete={(task) => {
              pendingAnnouncement.current = null;
              setTaskToDelete(task);
            }}
            onDragStart={handleDragStart}
            loading={tasksLoading}
            referenceDate={selectedDate}
            activityNameById={activityNameById}
          />
        </div>

        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          <TasksActivitiesPanel
            activities={projectActivities}
            selectedActivityId={selectedActivityId}
            onSelectActivity={setSelectedActivityId}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setVoiceListFocus((current) => (current === "all" ? "day" : current));
            }}
            tasks={rightPanelTasks}
            activityNameById={activityNameById}
            loading={activitiesLoading || tasksLoading}
            onDropOnActivity={handleDropOnActivity}
            onEdit={openEditTask}
            onClose={(id) => {
              if (confirm("Close this task?")) closeMutation.mutate(id);
            }}
            onDelete={(id) => {
              const task = allProjectTasks.find((item) => item.id === id);
              if (task) {
                pendingAnnouncement.current = null;
                setTaskToDelete(task);
              }
            }}
            projectId={projectId ?? ""}
            sectionTitleOverride={
              voiceListFocus === "all" ? `Every task (${rightPanelTasks.length})` : undefined
            }
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
            setEditingTask(null);
            formSpokenRef.current = false;
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-xs ${fieldPrompt ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {fieldPrompt ||
                    "Speak for up to 2 minutes. Name the activity and the task details. A date, duration, priority, or status is filled only when it is valid."}
                </p>
                <Button
                  type="button"
                  variant={taskRecording ? "destructive" : "outline"}
                  size="sm"
                  disabled={taskDictating}
                  className={cn(
                    "font-bold transition-all shadow-sm",
                    taskRecording
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "border-orange-500 text-orange-600 hover:text-orange-700 hover:bg-orange-50 bg-white"
                  )}
                  onClick={() => {
                    if (taskRecording) {
                      finishTaskRecording(false);
                      return;
                    }
                    if (answeringFieldRef.current) {
                      listenTokenRef.current += 1;
                      voiceAudioRef.current?.pause();
                      voiceDoneRef.current?.();
                      voiceDoneRef.current = null;
                      void startTaskRecording(true);
                      return;
                    }
                    void startTaskRecording(false);
                  }}
                >
                  {taskDictating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : taskRecording ? (
                    <Square className="mr-2 h-4 w-4" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4 text-orange-600" />
                  )}
                  {taskDictating
                    ? "Transcribing"
                    : taskRecording
                      ? `Stop ${taskRecordSeconds}s`
                      : fieldPrompt
                        ? "Answer Kyla"
                        : "Speak to Kyla"}
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
                    <SelectItem value="completed">Done</SelectItem>
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
              <Button onClick={handleCreateTask} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={taskToDelete != null}
        onOpenChange={(open) => {
          if (open) return;
          if (!keepAnnouncementRef.current) pendingAnnouncement.current = null;
          keepAnnouncementRef.current = false;
          setTaskToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deletePrompt?.name}? This removes the task from the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!taskToDelete) return;
                keepAnnouncementRef.current = true;
                if (editingTask?.id === taskToDelete.id) {
                  setAddDialogOpen(false);
                  setEditingTask(null);
                }
                deleteMutation.mutate(taskToDelete.id);
                setTaskToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
