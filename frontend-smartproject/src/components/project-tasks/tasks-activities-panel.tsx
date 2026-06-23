import { useState } from "react";
import {
  addDays,
  format,
  subDays,
} from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Hand,
  ListTodo,
  Pencil,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDueDate,
  statusStyle,
  taskAssignee,
  type ProjectActivityRef,
  type ProjectTaskItem,
} from "./constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface TasksActivitiesPanelProps {
  activities: ProjectActivityRef[];
  selectedActivityId: number | null;
  onSelectActivity: (id: number | null) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: ProjectTaskItem[];
  activityNameById: (id: number) => string;
  loading?: boolean;
  onDropOnActivity: (e: React.DragEvent, activityId: number) => void;
  onEdit: (task: ProjectTaskItem) => void;
  onClose: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  projectId: string;
}

export function TasksActivitiesPanel({
  activities,
  selectedActivityId,
  onSelectActivity,
  selectedDate,
  onSelectDate,
  tasks,
  activityNameById,
  loading,
  onDropOnActivity,
  onEdit,
  onClose,
  onDelete,
  projectId,
}: TasksActivitiesPanelProps) {
  const [showActivityList, setShowActivityList] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const dateLabel = format(selectedDate, "EEEE, MMMM d, yyyy");
  const sectionTitle =
    selectedActivityId != null && selectedActivity
      ? `Tasks for ${selectedActivity.name} — ${format(selectedDate, "MMM d")} (${tasks.length})`
      : `All tasks for ${format(selectedDate, "MMM d, yyyy")} (${tasks.length})`;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="kanban-heading-lg text-[var(--text-primary)]">Activities</h2>
            <p className="mt-0.5 kanban-caption text-[var(--text-secondary)]">
              {loading ? "Loading…" : `${activities.length} activities`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSelectDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 kanban-body-sm">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[180px] truncate">{dateLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) {
                        onSelectDate(d);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSelectDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="kanban-caption" onClick={() => onSelectDate(new Date())}>
                Today
              </Button>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 kanban-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setShowActivityList((v) => !v)}
            >
              {showActivityList ? "Hide" : "Show"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", !showActivityList && "-rotate-90")} />
            </button>
          </div>
        </div>

        {!loading && activities.length > 0 && showActivityList && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onSelectActivity(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 kanban-caption font-medium transition-all",
                selectedActivityId === null
                  ? "bg-[var(--copper-500)] text-white"
                  : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              All
            </button>
            {activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => onSelectActivity(activity.id)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDropOnActivity(e, activity.id);
                }}
                onDragOver={handleDragOver}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 kanban-caption font-medium transition-all",
                  selectedActivityId === activity.id
                    ? "bg-[var(--copper-500)] text-white"
                    : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                title={activity.name}
              >
                {activity.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-[var(--bg-warm-gray)]/50" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <ListTodo className="h-12 w-12 text-[var(--text-muted)] opacity-25" />
            <h3 className="kanban-heading-md text-[var(--text-primary)]">No activities defined</h3>
            <p className="max-w-xs kanban-body-sm text-[var(--text-secondary)]">
              Create activities in the Activities tab first.
            </p>
            <button
              type="button"
              className="kanban-body-sm font-medium text-[var(--copper-500)] underline"
              onClick={() => (window.location.href = `/projects/${projectId}/activities`)}
            >
              Go to Activities
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Hand className="h-12 w-12 text-[var(--text-muted)] opacity-25" />
            <div
              className="flex min-h-[120px] w-full max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6"
              style={{ borderColor: "rgba(107, 114, 128, 0.3)" }}
            >
              <p className="kanban-body-md font-medium text-[var(--text-primary)]">No tasks found.</p>
              <p className="mt-1 max-w-[280px] kanban-body-sm text-[var(--text-secondary)]">
                Select an activity or change the date to view tasks.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 kanban-body-sm font-semibold text-[var(--text-primary)]">{sectionTitle}</p>
            <div className="overflow-x-auto rounded-md border border-[var(--border-subtle)]">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-warm-gray)]">
                  <tr className="kanban-caption uppercase tracking-wide text-[var(--text-secondary)]">
                    {selectedActivityId == null && <th className="px-3 py-2.5 font-medium">Activity</th>}
                    <th className="px-3 py-2.5 font-medium">Task</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Due</th>
                    <th className="px-3 py-2.5 font-medium">Assignee</th>
                    <th className="w-24 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((row) => {
                    const sStyle = statusStyle(row.status);
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border-subtle)] hover:bg-[rgba(253,245,232,0.5)]"
                      >
                        {selectedActivityId == null && (
                          <td className="max-w-[120px] truncate px-3 py-2.5 kanban-caption text-[var(--text-secondary)]">
                            {activityNameById(row.activityId)}
                          </td>
                        )}
                        <td className="px-3 py-2.5 kanban-body-sm text-[var(--text-primary)]">{row.name}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-1.5 kanban-caption text-[var(--text-secondary)]">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sStyle.color }} />
                            {sStyle.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 kanban-body-sm text-[var(--text-secondary)]">
                          {formatDueDate(row.plannedDate, selectedDate)}
                        </td>
                        <td className="px-3 py-2.5 kanban-caption text-[var(--text-secondary)]">
                          {taskAssignee(row)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                              <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[var(--status-success)]"
                              onClick={() => onClose(row.id)}
                              title="Close task"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-[var(--status-danger)]"
                              onClick={() => onDelete(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
