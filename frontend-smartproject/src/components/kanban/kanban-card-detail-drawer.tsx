import { Loader2, Pencil, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  activityIdBadge,
  COLUMNS,
  KANBAN_PRIORITY_OPTIONS,
  NONE_ACTIVITY,
  NONE_PRIORITY,
  NONE_WBS,
  nextColumn,
  columnTitle,
  type ColumnId,
  type PriorityFieldValue,
} from "./constants";
import type { KanbanCardItem } from "./types";
import type { WbsItem } from "@shared/schema";

interface ActivityChoice {
  id: number;
  label: string;
}

interface KanbanCardDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: KanbanCardItem | null;
  laneId: ColumnId | null;
  editing: boolean;
  onToggleEdit: () => void;
  editTitle: string;
  onEditTitleChange: (v: string) => void;
  editDescription: string;
  onEditDescriptionChange: (v: string) => void;
  editPriority: PriorityFieldValue;
  onEditPriorityChange: (v: PriorityFieldValue) => void;
  editWbsId: string;
  onEditWbsIdChange: (v: string) => void;
  editActivityId: string;
  onEditActivityIdChange: (v: string) => void;
  wbsItems: WbsItem[];
  activityChoices: ActivityChoice[];
  activitiesLoading: boolean;
  onSave: () => void;
  onMoveNext: () => void;
  onArchive: () => void;
  isSaving: boolean;
  isArchiving: boolean;
}

export function KanbanCardDetailDrawer({
  open,
  onOpenChange,
  card,
  laneId,
  editing,
  onToggleEdit,
  editTitle,
  onEditTitleChange,
  editDescription,
  onEditDescriptionChange,
  editPriority,
  onEditPriorityChange,
  editWbsId,
  onEditWbsIdChange,
  editActivityId,
  onEditActivityIdChange,
  wbsItems,
  activityChoices,
  activitiesLoading,
  onSave,
  onMoveNext,
  onArchive,
  isSaving,
  isArchiving,
}: KanbanCardDetailDrawerProps) {
  if (!card || !laneId) return null;

  const next = nextColumn(laneId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] overflow-y-auto p-0"
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="border-b px-6 py-5" style={{ borderColor: "var(--border-subtle)" }}>
          <SheetHeader className="space-y-3 text-left">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-2 min-w-0">
                <span
                  className="kanban-caption font-mono inline-block px-2 py-0.5 rounded-full"
                  style={{ color: "var(--copper-600)", backgroundColor: "var(--copper-50)" }}
                >
                  {activityIdBadge(card.id, card.projectActivityId)}
                </span>
                {editing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    className="kanban-heading-lg font-semibold"
                  />
                ) : (
                  <SheetTitle className="kanban-heading-lg text-[var(--text-primary)] text-left">
                    {card.title}
                  </SheetTitle>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 -mt-1"
                onClick={onToggleEdit}
                aria-label="Edit card"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Status flow stepper */}
          <div>
            <Label className="kanban-caption text-[var(--text-muted)] mb-2 block">Status</Label>
            <div className="flex items-center gap-1">
              {COLUMNS.map((col, i) => {
                const active = col.id === laneId;
                const passed = COLUMNS.findIndex((c) => c.id === laneId) > i;
                return (
                  <div key={col.id} className="flex items-center gap-1 flex-1 min-w-0">
                    <div
                      className={cn(
                        "flex-1 text-center py-1.5 px-1 rounded kanban-caption font-semibold truncate",
                        active && "text-white",
                        passed && !active && "text-[var(--copper-600)]",
                        !active && !passed && "text-[var(--text-muted)]"
                      )}
                      style={{
                        backgroundColor: active
                          ? "var(--copper-600)"
                          : passed
                            ? "var(--copper-50)"
                            : "var(--bg-warm-gray)",
                      }}
                    >
                      {col.title}
                    </div>
                    {i < COLUMNS.length - 1 && (
                      <span className="text-[var(--text-muted)] kanban-caption">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Description</Label>
            {editing ? (
              <Textarea
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                className="mt-1 resize-none"
                rows={4}
              />
            ) : (
              <p className="kanban-body-sm text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                {card.description || "No description"}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Assignee</Label>
              <p className="kanban-body-sm text-[var(--text-secondary)] mt-1">Unassigned</p>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Due date</Label>
              <p className="kanban-body-sm text-[var(--text-secondary)] mt-1">—</p>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Priority</Label>
              {editing ? (
                <Select value={editPriority} onValueChange={(v) => onEditPriorityChange(v as PriorityFieldValue)}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_PRIORITY}>No priority</SelectItem>
                    {KANBAN_PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.displayLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="kanban-body-sm text-[var(--text-secondary)] mt-1">
                  {card.priority ? KANBAN_PRIORITY_OPTIONS.find((p) => p.value === card.priority)?.displayLabel : "Low / unset"}
                </p>
              )}
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">WBS link</Label>
              {editing ? (
                <Select
                  value={editWbsId}
                  onValueChange={(v) => {
                    onEditWbsIdChange(v);
                    onEditActivityIdChange(NONE_ACTIVITY);
                  }}
                >
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_WBS}>None</SelectItem>
                    {wbsItems.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.code ? `${w.code} — ${w.name}` : w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="kanban-body-sm text-[var(--text-secondary)] mt-1 truncate">
                  {card.wbsLabel || "—"}
                </p>
              )}
            </div>
          </div>

          {editing && (
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Activity</Label>
              <Select
                value={editActivityId}
                disabled={editWbsId === NONE_WBS}
                onValueChange={onEditActivityIdChange}
              >
                <SelectTrigger className="mt-1 h-8">
                  <SelectValue
                    placeholder={
                      editWbsId === NONE_WBS
                        ? "Select WBS first"
                        : activitiesLoading
                          ? "Loading…"
                          : "None"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_ACTIVITY}>None</SelectItem>
                  {activityChoices.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Checklist placeholder */}
          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Checklist</Label>
            <div
              className="mt-2 rounded-[var(--radius-md)] border border-dashed p-4 text-center kanban-body-sm text-[var(--text-muted)]"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              No sub-tasks yet
            </div>
          </div>

          {/* Comments placeholder */}
          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Comments</Label>
            <div
              className="mt-2 rounded-[var(--radius-md)] border p-3 kanban-body-sm text-[var(--text-muted)]"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              No comments yet
            </div>
          </div>

          {/* Activity log placeholder */}
          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Activity log</Label>
            <p className="kanban-caption text-[var(--text-muted)] mt-2">
              Card in {columnTitle(laneId)} column
            </p>
          </div>
        </div>

        <div
          className="sticky bottom-0 border-t bg-[var(--bg-white)] px-6 py-4 flex flex-wrap gap-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {editing ? (
            <Button
              onClick={onSave}
              disabled={!editTitle.trim() || isSaving}
              className="bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save changes
            </Button>
          ) : (
            <>
              {next && (
                <Button
                  onClick={onMoveNext}
                  className="bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
                >
                  Move to {columnTitle(next)}
                </Button>
              )}
              {laneId === "done" && (
                <Button variant="secondary" onClick={onArchive} disabled={isArchiving}>
                  {isArchiving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                  Archive
                </Button>
              )}
              <Button variant="ghost" className="text-[var(--status-danger)] hover:text-[var(--status-danger)]" disabled>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
