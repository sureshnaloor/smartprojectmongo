import { format, isBefore, parseISO, startOfDay } from "date-fns";
import type { SortKey } from "@/components/materials-resources/constants";

export type TaskCatalogTab = "all" | "my" | "pending" | "overdue";

export const TASK_CATALOG_TABS: { key: TaskCatalogTab; label: string }[] = [
  { key: "all", label: "All Tasks" },
  { key: "my", label: "My Tasks" },
  { key: "pending", label: "Pending" },
  { key: "overdue", label: "Overdue" },
];

export type TaskPriority = "critical" | "high" | "normal" | "low";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

export const PRIORITY_FILTERS: { key: TaskPriority | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "normal", label: "Normal" },
  { key: "low", label: "Low" },
];

export const STATUS_FILTERS: { key: TaskStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Done" },
  { key: "blocked", label: "Blocked" },
];

export type TaskSortKey = SortKey | "due" | "priority" | "status" | "assignee";

export const TASK_SORT_OPTIONS: { value: TaskSortKey; label: string }[] = [
  { value: "due", label: "Due Date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "name", label: "Name" },
  { value: "assignee", label: "Assignee" },
];

export interface ProjectActivityRef {
  id: number;
  name: string;
  wpId: number;
}

export interface ProjectTaskItem {
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

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const META_PREFIX = /^@priority=(\w+)\|@assignee=([^|]*)\|/;

export function encodeTaskMeta(
  priority: TaskPriority,
  assignee: string,
  remarks: string
): string {
  const clean = remarks.replace(META_PREFIX, "").trim();
  return `@priority=${priority}|@assignee=${assignee}|${clean}`;
}

export function parseTaskMeta(remarks: string | null): {
  priority: TaskPriority;
  assignee: string;
  cleanRemarks: string;
} {
  if (!remarks) return { priority: "normal", assignee: "", cleanRemarks: "" };
  const match = remarks.match(META_PREFIX);
  if (!match) return { priority: inferPriorityFromDuration(null), assignee: "", cleanRemarks: remarks };
  const priority = (match[1] as TaskPriority) || "normal";
  return {
    priority: PRIORITY_ORDER[priority] !== undefined ? priority : "normal",
    assignee: match[2] ?? "",
    cleanRemarks: remarks.replace(META_PREFIX, "").trim(),
  };
}

export function inferPriorityFromDuration(duration: number | null): TaskPriority {
  if (duration == null) return "normal";
  if (duration >= 480) return "critical";
  if (duration >= 240) return "high";
  if (duration >= 60) return "normal";
  return "low";
}

export function taskPriority(task: ProjectTaskItem): TaskPriority {
  const parsed = parseTaskMeta(task.remarks);
  if (parsed.priority !== "normal" || task.remarks?.includes("@priority=")) return parsed.priority;
  return inferPriorityFromDuration(task.duration);
}

export function taskAssignee(task: ProjectTaskItem): string {
  const parsed = parseTaskMeta(task.remarks);
  return parsed.assignee || "Unassigned";
}

export function taskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Done",
    blocked: "Blocked",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

export function priorityStyle(priority: TaskPriority): { label: string; color: string; bg: string } {
  switch (priority) {
    case "critical":
      return { label: "Critical", color: "var(--status-danger)", bg: "var(--status-danger-bg)" };
    case "high":
      return { label: "High", color: "var(--status-warning)", bg: "var(--status-warning-bg)" };
    case "low":
      return { label: "Low", color: "var(--text-muted)", bg: "var(--bg-warm-gray)" };
    default:
      return { label: "Normal", color: "var(--status-success)", bg: "var(--status-success-bg)" };
  }
}

export function statusStyle(status: string): { label: string; color: string } {
  switch (status) {
    case "in_progress":
      return { label: "In Progress", color: "var(--status-info)" };
    case "completed":
      return { label: "Done", color: "var(--status-success)" };
    case "blocked":
      return { label: "Blocked", color: "var(--status-danger)" };
    default:
      return { label: "Pending", color: "var(--status-warning)" };
  }
}

export function isTaskOverdue(task: ProjectTaskItem, refDate: Date = new Date()): boolean {
  if (!task.plannedDate || task.status === "completed") return false;
  const due = startOfDay(parseISO(task.plannedDate));
  return isBefore(due, startOfDay(refDate));
}

export function formatDueDate(plannedDate: string | null, refDate: Date = new Date()): string {
  if (!plannedDate) return "—";
  const due = parseISO(plannedDate);
  const today = startOfDay(refDate);
  const dueDay = startOfDay(due);
  if (dueDay.getTime() === today.getTime()) return "Today";
  return format(due, "MMM d");
}

export function isSameDay(dateStr: string | null, ref: Date): boolean {
  if (!dateStr) return false;
  return startOfDay(parseISO(dateStr)).getTime() === startOfDay(ref).getTime();
}

export function sortTasks(tasks: ProjectTaskItem[], sortKey: TaskSortKey): ProjectTaskItem[] {
  const list = [...tasks];
  list.sort((a, b) => {
    if (sortKey === "due") {
      const da = a.plannedDate ?? "9999-12-31";
      const db = b.plannedDate ?? "9999-12-31";
      return da.localeCompare(db);
    }
    if (sortKey === "priority") {
      return PRIORITY_ORDER[taskPriority(a)] - PRIORITY_ORDER[taskPriority(b)];
    }
    if (sortKey === "status") {
      return a.status.localeCompare(b.status);
    }
    if (sortKey === "assignee") {
      return taskAssignee(a).localeCompare(taskAssignee(b));
    }
    return a.name.localeCompare(b.name);
  });
  return list;
}
