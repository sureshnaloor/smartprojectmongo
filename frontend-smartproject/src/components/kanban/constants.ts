export const NONE_WBS = "__none_wbs__";
export const NONE_ACTIVITY = "__none_activity__";
export const NONE_PRIORITY = "__priority_none__" as const;

export const KANBAN_PRIORITY_OPTIONS = [
  { value: "immediate_urgent" as const, label: "Critical", displayLabel: "Critical" },
  { value: "before_end_of_today" as const, label: "before end of today", displayLabel: "High" },
  { value: "normal" as const, label: "normal", displayLabel: "Medium" },
] as const;

export type KanbanPriority = (typeof KANBAN_PRIORITY_OPTIONS)[number]["value"];
export type PriorityFieldValue = KanbanPriority | typeof NONE_PRIORITY;
export type ColumnId = "wish" | "ready" | "doing" | "done";

export const COLUMNS: {
  id: ColumnId;
  title: string;
  hint: string;
  borderColor: string;
  indicatorColor: string;
}[] = [
  {
    id: "wish",
    title: "WISH",
    hint: "Ideas & backlog",
    borderColor: "var(--status-info)",
    indicatorColor: "var(--status-info)",
  },
  {
    id: "ready",
    title: "READY",
    hint: "Queued to start",
    borderColor: "var(--copper-400)",
    indicatorColor: "var(--copper-400)",
  },
  {
    id: "doing",
    title: "DOING",
    hint: "In progress",
    borderColor: "var(--status-warning)",
    indicatorColor: "var(--status-warning)",
  },
  {
    id: "done",
    title: "DONE",
    hint: "Complete — archive",
    borderColor: "var(--status-success)",
    indicatorColor: "var(--status-success)",
  },
];

export const COLUMN_ORDER: ColumnId[] = ["wish", "ready", "doing", "done"];

export const KANBAN_SUB_TABS = [
  { id: "board", label: "Board View" },
  { id: "activities", label: "Activities Overview" },
  { id: "versions", label: "Plan Versions" },
  { id: "dependencies", label: "Dependencies" },
  { id: "backlog", label: "Backlog" },
] as const;

export type KanbanSubTab = (typeof KANBAN_SUB_TABS)[number]["id"];

export const GROUP_BY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "wbs", label: "WBS" },
  { value: "dueDate", label: "Due Date" },
] as const;

export type GroupByValue = (typeof GROUP_BY_OPTIONS)[number]["value"];

export function priorityDotColor(priority: string | null | undefined): string {
  if (priority == null || priority === "") return "var(--status-success)";
  switch (priority) {
    case "immediate_urgent":
      return "var(--status-danger)";
    case "before_end_of_today":
      return "var(--status-warning)";
    case "normal":
      return "var(--copper-400)";
    default:
      return "var(--status-success)";
  }
}

export function priorityDisplayLabel(priority: string | null | undefined): string {
  if (priority == null || priority === "") return "Low";
  const o = KANBAN_PRIORITY_OPTIONS.find((x) => x.value === priority);
  return o?.displayLabel ?? "";
}

export function kanbanPriorityLabel(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const o = KANBAN_PRIORITY_OPTIONS.find((x) => x.value === value);
  return o?.label ?? "";
}

export function activityIdBadge(cardId: string, projectActivityId?: number): string {
  const num = projectActivityId ?? parseInt(cardId, 10);
  return `ACT-${String(num).padStart(3, "0")}`;
}

export function nextColumn(current: ColumnId): ColumnId | null {
  const idx = COLUMN_ORDER.indexOf(current);
  if (idx < 0 || idx >= COLUMN_ORDER.length - 1) return null;
  return COLUMN_ORDER[idx + 1];
}

export function columnTitle(id: ColumnId): string {
  return COLUMNS.find((c) => c.id === id)?.title ?? id.toUpperCase();
}
