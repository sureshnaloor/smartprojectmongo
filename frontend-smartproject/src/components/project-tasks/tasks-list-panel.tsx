import { useMemo } from "react";
import { GripVertical, Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRIORITY_FILTERS,
  STATUS_FILTERS,
  TASK_SORT_OPTIONS,
  formatDueDate,
  isTaskOverdue,
  priorityStyle,
  statusStyle,
  taskAssignee,
  taskPriority,
  type ProjectTaskItem,
  type TaskPriority,
  type TaskSortKey,
  type TaskStatus,
} from "./constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TasksListPanelProps {
  tasks: ProjectTaskItem[];
  totalCount: number;
  search: string;
  priorityFilter: TaskPriority | "all";
  onPriorityFilter: (v: TaskPriority | "all") => void;
  statusFilters: Set<TaskStatus>;
  onToggleStatusFilter: (status: TaskStatus) => void;
  onClearSearch?: () => void;
  sortKey: TaskSortKey;
  onSortChange: (v: TaskSortKey) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onDragStart: (e: React.DragEvent, task: ProjectTaskItem) => void;
  loading?: boolean;
  referenceDate?: Date;
}

export function TasksListPanel({
  tasks,
  totalCount,
  search,
  priorityFilter,
  onPriorityFilter,
  statusFilters,
  onToggleStatusFilter,
  onClearSearch,
  sortKey,
  onSortChange,
  selectedId,
  onSelect,
  onAdd,
  onDragStart,
  loading,
  referenceDate = new Date(),
}: TasksListPanelProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...tasks];
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q) ||
          taskAssignee(t).toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== "all") {
      list = list.filter((t) => taskPriority(t) === priorityFilter);
    }
    if (statusFilters.size > 0) {
      list = list.filter((t) => statusFilters.has(t.status as TaskStatus));
    }
    return list;
  }, [tasks, search, priorityFilter, statusFilters]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="flex items-center gap-2">
          <h2 className="kanban-heading-lg text-[var(--text-primary)]">Tasks</h2>
          <span className="kanban-body-sm text-[var(--text-secondary)]">{filtered.length} tasks</span>
        </div>
        <Button size="sm" className="gap-1" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div
        className="shrink-0 space-y-2 border-b border-[var(--border-subtle)] px-6 py-3"
        style={{ backgroundColor: "var(--bg-cream)" }}
      >
        <div className="flex flex-wrap gap-2">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onPriorityFilter(p.key)}
              className={cn(
                "rounded-full px-3 py-1 kanban-caption font-medium transition-colors",
                priorityFilter === p.key
                  ? "bg-[var(--copper-500)] text-white"
                  : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => {
              const active = statusFilters.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onToggleStatusFilter(s.key)}
                  className={cn(
                    "rounded-full px-3 py-1 kanban-caption font-medium transition-colors",
                    active
                      ? "bg-[var(--copper-500)] text-white"
                      : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="kanban-body-sm">
                Sort by: {TASK_SORT_OPTIONS.find((o) => o.value === sortKey)?.label} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TASK_SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => onSortChange(opt.value)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-warm-gray)]/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Search className="h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="kanban-body-sm text-[var(--text-secondary)]">
              {search || priorityFilter !== "all" || statusFilters.size > 0
                ? "No tasks match your search."
                : "No tasks found. Add your first task to get started."}
            </p>
            {(search || priorityFilter !== "all" || statusFilters.size > 0) && (
              <button
                type="button"
                className="kanban-body-sm text-[var(--copper-500)] underline"
                onClick={() => {
                  onClearSearch?.();
                  onPriorityFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
            {!search && priorityFilter === "all" && statusFilters.size === 0 && (
              <Button size="sm" className="mt-2 gap-1" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            )}
          </div>
        ) : (
          filtered.map((task, index) => {
            const priority = taskPriority(task);
            const pStyle = priorityStyle(priority);
            const sStyle = statusStyle(task.status);
            const overdue = isTaskOverdue(task, referenceDate);
            const assignee = taskAssignee(task);
            const isSelected = selectedId === task.id;

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => onDragStart(e, task)}
                onClick={() => onSelect(task.id)}
                className={cn(
                  "group relative min-h-[72px] cursor-pointer border-b border-[var(--border-subtle)] px-6 py-4 transition-all msr-item-enter",
                  isSelected
                    ? "border-l-[3px] border-l-[var(--copper-500)] bg-[var(--copper-50)] shadow-[var(--shadow-sm)]"
                    : "border-l-[3px] border-l-transparent hover:bg-[rgba(253,246,237,0.4)]",
                  overdue && "bg-[rgba(254,226,226,0.15)]"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <GripVertical className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex flex-col gap-2 pl-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="kanban-body-md font-medium text-[var(--text-primary)]">{task.name}</span>
                    <span
                      className={cn(
                        "shrink-0 kanban-body-sm",
                        overdue ? "font-semibold text-[var(--status-danger)]" : "text-[var(--text-secondary)]"
                      )}
                    >
                      {formatDueDate(task.plannedDate, referenceDate)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 kanban-caption font-semibold"
                      style={{ backgroundColor: pStyle.bg, color: pStyle.color }}
                    >
                      {pStyle.label}
                    </span>
                    <span className="flex items-center gap-1.5 kanban-caption text-[var(--text-secondary)]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sStyle.color }} />
                      {sStyle.label}
                    </span>
                    <span className="flex items-center gap-1 kanban-caption text-[var(--text-secondary)]">
                      <User className="h-3 w-3" />
                      {assignee}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-white)] px-6 py-3">
        <p className="kanban-body-sm text-[var(--text-muted)]">
          Showing {filtered.length} of {totalCount} tasks
        </p>
        <Button variant="ghost" className="mt-2 w-full text-[var(--text-secondary)]" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add Another Task
        </Button>
      </div>
    </div>
  );
}
