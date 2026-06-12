import { useState, useCallback } from "react";
import { useRoute } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { get, post, patch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Plus, Archive, Loader2, GripVertical, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProjectActivity, WbsItem, WorkPackage } from "@shared/schema";

const NONE_WBS = "__none_wbs__";
const NONE_ACTIVITY = "__none_activity__";
const NONE_PRIORITY = "__priority_none__" as const;

const KANBAN_PRIORITY_OPTIONS = [
  { value: "immediate_urgent" as const, label: "immediate- urgent" },
  { value: "before_end_of_today" as const, label: "before end of today" },
  { value: "normal" as const, label: "normal" },
] as const;

type KanbanPriority = (typeof KANBAN_PRIORITY_OPTIONS)[number]["value"];
type PriorityFieldValue = KanbanPriority | typeof NONE_PRIORITY;

const COLUMNS = [
  { id: "wish" as const, title: "Wish" },
  { id: "ready" as const, title: "Ready" },
  { id: "doing" as const, title: "Doing" },
  { id: "done" as const, title: "Done" },
];

// 3D column styles: light bg + shadow/depth per lane (outer frame)
const LANE_STYLES: Record<ColumnId, string> = {
  wish: "bg-sky-50/95 border-sky-200/80 shadow-[0_4px_0_0_rgba(14,165,233,0.2),0_8px_16px_-4px_rgba(14,165,233,0.15)]",
  ready: "bg-amber-50/95 border-amber-200/80 shadow-[0_4px_0_0_rgba(245,158,11,0.2),0_8px_16px_-4px_rgba(245,158,11,0.15)]",
  doing: "bg-emerald-50/95 border-emerald-200/80 shadow-[0_4px_0_0_rgba(16,185,129,0.2),0_8px_16px_-4px_rgba(16,185,129,0.15)]",
  done: "bg-violet-50/95 border-violet-200/80 shadow-[0_4px_0_0_rgba(139,92,246,0.2),0_8px_16px_-4px_rgba(139,92,246,0.15)]",
};

// Lane titles: same hue as column but darker text; divider matches lane hue
const LANE_TITLE_CLASS: Record<ColumnId, string> = {
  wish: "text-sky-900",
  ready: "text-amber-900",
  doing: "text-emerald-900",
  done: "text-violet-900",
};

const LANE_HEADER_BORDER: Record<ColumnId, string> = {
  wish: "border-sky-200/90",
  ready: "border-amber-200/90",
  doing: "border-emerald-200/90",
  done: "border-violet-200/90",
};

// Light task card fills (sticky body; tape + fold applied separately)
const TASK_CARD_COLORS = [
  "bg-rose-50/95 border-rose-200/80",
  "bg-cyan-50/95 border-cyan-200/80",
  "bg-lime-50/95 border-lime-200/80",
  "bg-amber-50/95 border-amber-200/80",
  "bg-sky-50/95 border-sky-200/80",
  "bg-fuchsia-50/95 border-fuchsia-200/80",
  "bg-teal-50/95 border-teal-200/80",
  "bg-orange-50/95 border-orange-200/80",
];

// Sticky-note geometry: asymmetric rounded corners + slight inward tilt on inner wrapper (DnD transforms stay on outer)
const STICKY_NOTE_SHAPES = [
  "rounded-tl-xl rounded-tr-md rounded-bl-md rounded-br-[2rem]",
  "rounded-tr-xl rounded-tl-md rounded-br-md rounded-bl-[2rem]",
  "rounded-xl rounded-br-[6px]",
  "rounded-xl rounded-bl-[6px]",
];

const stickyNoteTiltClass = (i: number) =>
  i % 2 === 0 ? "-rotate-[0.55deg]" : "rotate-[0.65deg]";

function kanbanPriorityLabel(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const v = value as KanbanPriority;
  const o = KANBAN_PRIORITY_OPTIONS.find((x) => x.value === v);
  return o?.label ?? "";
}

function kanbanPriorityTapeClasses(value: string | null | undefined): string {
  if (value == null || value === "") return "font-normal text-slate-500";
  switch (value) {
    case "immediate_urgent":
      return "font-semibold text-red-700";
    case "before_end_of_today":
      return "font-semibold text-amber-800";
    default:
      return "font-medium text-slate-700";
  }
}

type ColumnId = "wish" | "ready" | "doing" | "done";

interface KanbanCardItem {
  id: string;
  title: string;
  description?: string;
  priority?: KanbanPriority | string | null;
  wbsItemId?: number;
  wbsLabel?: string;
  projectActivityId?: number;
  activityLabel?: string;
}

interface Lane {
  id: ColumnId;
  title: string;
  cards: KanbanCardItem[];
}

interface KanbanBoard {
  lanes: Lane[];
}

export default function KanbanPage() {
  const [, params] = useRoute<{ projectId: string }>("/projects/:projectId/kanban");
  const projectId = params?.projectId ?? "";
  const projectIdNum = parseInt(projectId, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<PriorityFieldValue>(NONE_PRIORITY);
  const [addWbsId, setAddWbsId] = useState<string>(NONE_WBS);
  const [addActivityId, setAddActivityId] = useState<string>(NONE_ACTIVITY);

  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<PriorityFieldValue>(NONE_PRIORITY);
  const [editWbsId, setEditWbsId] = useState<string>(NONE_WBS);
  const [editActivityId, setEditActivityId] = useState<string>(NONE_ACTIVITY);

  const metaDialogOpen = addOpen || editCardId !== null;

  /** WBS used to load activity options while add/edit dialog is open */
  const linkingWbsId = editCardId !== null ? editWbsId : addWbsId;

  const resetAddForm = useCallback(() => {
    setNewTitle("");
    setNewDescription("");
    setNewPriority(NONE_PRIORITY);
    setAddWbsId(NONE_WBS);
    setAddActivityId(NONE_ACTIVITY);
  }, []);

  const resetEditForm = useCallback(() => {
    setEditCardId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPriority(NONE_PRIORITY);
    setEditWbsId(NONE_WBS);
    setEditActivityId(NONE_ACTIVITY);
  }, []);

  const { data, isLoading } = useQuery<KanbanBoard>({
    queryKey: [`/api/projects/${projectId}/kanban`],
    queryFn: () => get(`/projects/${projectId}/kanban`),
    enabled: !!projectId,
  });

  const { data: wbsItems = [] } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
    queryFn: () => get(`/projects/${projectId}/wbs`),
    enabled: !!projectId && !Number.isNaN(projectIdNum),
  });

  const activeWbsId = linkingWbsId !== NONE_WBS ? linkingWbsId : "";

  const { data: wpsUnderWbs = [] } = useQuery<WorkPackage[]>({
    queryKey: [`/api/wbs/${activeWbsId}/work-packages`],
    queryFn: () => get(`/wbs/${activeWbsId}/work-packages`),
    enabled: !!activeWbsId && metaDialogOpen && !Number.isNaN(projectIdNum),
  });

  const wpActivityQueries = useQueries({
    queries: (wpsUnderWbs ?? []).map((wp) => ({
      queryKey: [`/api/work-packages/${wp.id}/activities`],
      queryFn: () => get(`/work-packages/${wp.id}/activities`) as Promise<ProjectActivity[]>,
      enabled:
        !!(wpsUnderWbs?.length) &&
        metaDialogOpen &&
        linkingWbsId !== NONE_WBS &&
        activeWbsId !== "",
    })),
  });

  const activityChoices = (() => {
    const list: { id: number; label: string }[] = [];
    (wpsUnderWbs ?? []).forEach((wp, i) => {
      const acts = (wpActivityQueries[i]?.data ?? []) as ProjectActivity[];
      for (const a of acts) {
        list.push({
          id: a.id,
          label: wp.code ? `${wp.code} · ${a.name}` : a.name,
        });
      }
    });
    list.sort((a, b) => a.label.localeCompare(b.label) || a.id - b.id);
    return list;
  })();

  const moveMutation = useMutation({
    mutationFn: ({
      cardId,
      column,
      position,
    }: {
      cardId: number;
      column: ColumnId;
      position: number;
    }) =>
      patch(`/projects/${projectId}/kanban/cards/${cardId}`, { column, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/kanban`] });
    },
    onError: (err: Error) => {
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => post(`/projects/${projectId}/kanban/cards`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/kanban`] });
      setAddOpen(false);
      resetAddForm();
      toast({ title: "Card added", description: "New card added to Wish." });
    },
    onError: (err: Error) => {
      toast({ title: "Add failed", description: err.message, variant: "destructive" });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      patch(`/projects/${projectId}/kanban/cards/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/kanban`] });
      resetEditForm();
      toast({ title: "Card updated", description: "Changes saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (cardId: number) =>
      post(`/projects/${projectId}/kanban/cards/${cardId}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/kanban`] });
      toast({ title: "Card archived", description: "Card removed from board." });
    },
    onError: (err: Error) => {
      toast({ title: "Archive failed", description: err.message, variant: "destructive" });
    },
  });

  const lanes = data?.lanes ?? COLUMNS.map((c) => ({ ...c, cards: [] as KanbanCardItem[] }));

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const cardId = parseInt(result.draggableId, 10);
    if (isNaN(cardId)) return;
    const position = result.destination.index;
    moveMutation.mutate({
      cardId,
      column: result.destination.droppableId as ColumnId,
      position,
    });
  };

  const openEditCard = (card: KanbanCardItem) => {
    const idNum = Number.parseInt(card.id, 10);
    if (!Number.isFinite(idNum)) return;
    setEditCardId(idNum);
    setEditTitle(card.title);
    setEditDescription(card.description ?? "");
    const p = card.priority;
    const isKnown =
      p != null &&
      p !== "" &&
      KANBAN_PRIORITY_OPTIONS.some((o) => o.value === p);
    setEditPriority(isKnown ? (p as KanbanPriority) : NONE_PRIORITY);
    setEditWbsId(card.wbsItemId != null ? String(card.wbsItemId) : NONE_WBS);
    setEditActivityId(card.projectActivityId != null ? String(card.projectActivityId) : NONE_ACTIVITY);
  };

  const handleSaveEdit = () => {
    if (editCardId == null || !editTitle.trim()) return;
    const body: Record<string, unknown> = {
      title: editTitle.trim(),
      description: editDescription.trim() ? editDescription.trim() : null,
      priority: editPriority === NONE_PRIORITY ? null : editPriority,
      wbsItemId: editWbsId === NONE_WBS ? null : parseInt(editWbsId, 10),
      projectActivityId: editActivityId === NONE_ACTIVITY ? null : parseInt(editActivityId, 10),
    };
    updateCardMutation.mutate({ id: editCardId, body });
  };

  const handleAddCard = () => {
    if (!newTitle.trim()) return;

    const body: Record<string, unknown> = {
      title: newTitle.trim(),
      description: newDescription.trim() ? newDescription.trim() : undefined,
      priority: newPriority === NONE_PRIORITY ? null : newPriority,
      wbsItemId: addWbsId === NONE_WBS ? null : parseInt(addWbsId, 10),
      projectActivityId: addActivityId === NONE_ACTIVITY ? null : parseInt(addActivityId, 10),
    };

    createMutation.mutate(body);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Kanban</h1>
        <Button
          onClick={() => {
            resetAddForm();
            setAddOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add card
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lanes.map((lane) => (
            <Droppable key={lane.id} droppableId={lane.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[320px] flex flex-col rounded-xl overflow-hidden border-2 transition-all duration-200 ${LANE_STYLES[lane.id]} ${
                    snapshot.isDraggingOver
                      ? "scale-[1.02] shadow-[0_6px_0_0_currentColor,0_12px_24px_-4px_rgba(0,0,0,0.12)] ring-2 ring-teal-400/50"
                      : ""
                  }`}
                >
                  <div
                    className={`shrink-0 bg-white px-4 py-3 border-b-[3px] ${LANE_HEADER_BORDER[lane.id]}`}
                  >
                    <p
                      className={`font-extrabold uppercase tracking-[0.18em] text-xs sm:text-sm ${LANE_TITLE_CLASS[lane.id]}`}
                    >
                      {lane.title}
                    </p>
                  </div>

                  {/* Colored gutter (lane bg) + inset white tray for cards */}
                  <div className="flex-1 flex flex-col min-h-0 p-3 md:p-4 pt-3">
                    <div className="flex-1 min-h-[220px] rounded-lg bg-white p-3 md:p-4 shadow-[inset_0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-black/[0.06] overflow-y-auto overflow-x-hidden">
                    {lane.cards.map((card, index) => {
                      const colorClass = TASK_CARD_COLORS[index % TASK_CARD_COLORS.length];
                      const stickyShape = STICKY_NOTE_SHAPES[index % STICKY_NOTE_SHAPES.length];
                      const tiltClass = stickyNoteTiltClass(index);
                      const restingShadow =
                        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_1px_2px_rgba(15,23,42,0.06),0_4px_8px_-2px_rgba(15,23,42,0.08),0_10px_24px_-6px_rgba(15,23,42,0.12)]";
                      const draggingShadow =
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_16px_-4px_rgba(15,23,42,0.12),0_20px_40px_-8px_rgba(15,23,42,0.22)]";
                      return (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`mb-4 ${
                              snapshot.isDragging
                                ? "z-20 transition-none"
                                : "transition-[transform] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform motion-reduce:transition-none"
                            }`}
                          >
                            <div
                              className={`relative ${tiltClass} motion-reduce:rotate-0`}
                            >
                              {/* Sticky-note tape strip shows priority */}
                              <div
                                className="pointer-events-none absolute left-[7%] right-[7%] top-3 z-[1] flex min-h-[1.35rem] items-center justify-center rounded-[2px] bg-gradient-to-b from-white/[0.97] via-white/[0.72] to-white/[0.38] px-1 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.1]"
                                title={
                                  card.priority != null && String(card.priority) !== ""
                                    ? kanbanPriorityLabel(card.priority)
                                    : ""
                                }
                              >
                                <span
                                  className={`line-clamp-2 text-center text-[10px] leading-snug ${kanbanPriorityTapeClasses(card.priority)}`}
                                >
                                  {card.priority != null && String(card.priority) !== ""
                                    ? kanbanPriorityLabel(card.priority)
                                    : "No priority"}
                                </span>
                              </div>
                              <div
                                className={`relative border-2 border-b-[3px] px-4 pt-[2rem] pb-3 ${stickyShape} ${colorClass} ${
                                  snapshot.isDragging
                                    ? `${draggingShadow} ring-2 ring-teal-400/60 ring-offset-1 ring-offset-white/95`
                                    : restingShadow
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-0.5 text-muted-foreground cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-sm text-gray-900 truncate min-w-0">
                                        {card.title}
                                      </p>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 -mr-2 -mt-0.5 text-muted-foreground hover:text-gray-900"
                                        aria-label={`Edit ${card.title}`}
                                        disabled={snapshot.isDragging}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditCard(card);
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    {card.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {card.description}
                                      </p>
                                    )}
                                    {(card.wbsLabel ?? card.activityLabel) ? (
                                      <div className="mt-2 space-y-1 rounded-md border border-black/[0.1] bg-white/70 px-2 py-1.5 text-[10px] text-gray-800">
                                        {card.wbsLabel ? (
                                          <p className="leading-snug">
                                            <span className="font-semibold uppercase tracking-wide text-gray-600">
                                              WBS
                                            </span>{" "}
                                            <span className="text-gray-900">{card.wbsLabel}</span>
                                          </p>
                                        ) : null}
                                        {card.activityLabel ? (
                                          <p className="leading-snug">
                                            <span className="font-semibold uppercase tracking-wide text-gray-600">
                                              Activity
                                            </span>{" "}
                                            <span className="text-gray-900">{card.activityLabel}</span>
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    {lane.id === "done" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                        onClick={() =>
                                          archiveMutation.mutate(parseInt(card.id, 10))
                                        }
                                        disabled={archiveMutation.isPending}
                                      >
                                        <Archive className="h-3 w-3 mr-1" />
                                        Archive
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    </div>
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Input
                id="desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={newPriority}
                onValueChange={(v) => setNewPriority(v as PriorityFieldValue)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Priority (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PRIORITY}>No priority (unset)</SelectItem>
                  {KANBAN_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>WBS number (optional)</Label>
              <Select
                value={addWbsId}
                onValueChange={(v) => {
                  setAddWbsId(v);
                  setAddActivityId(NONE_ACTIVITY);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No WBS — task without parent activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_WBS}>No WBS (standalone task)</SelectItem>
                  {wbsItems
                    .slice()
                    .sort((a, b) =>
                      `${a.code}`.localeCompare(`${b.code}`, undefined, {
                        numeric: true,
                      })
                    )
                    .map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.code ? `${w.code} — ${w.name}` : w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Optionally link to schedule: choose WBS, then activity under its work packages. Leave both unset for a
                task with no parent activity.
              </p>
            </div>
            <div>
              <Label>Activity (optional, by WBS)</Label>
              <Select
                value={addActivityId}
                disabled={addWbsId === NONE_WBS}
                onValueChange={(v) => setAddActivityId(v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      addWbsId === NONE_WBS
                        ? "Select WBS first"
                        : wpActivityQueries.some((q) => q.isLoading)
                          ? "Loading activities…"
                          : "No linked activity unless selected"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_ACTIVITY}>No linked activity</SelectItem>
                  {activityChoices.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCard}
              disabled={!newTitle.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add to Wish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCardId !== null}
        onOpenChange={(open) => {
          if (!open) resetEditForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Task title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={editPriority}
                onValueChange={(v) => setEditPriority(v as PriorityFieldValue)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Priority (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PRIORITY}>No priority (unset)</SelectItem>
                  {KANBAN_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>WBS number (optional)</Label>
              <Select
                value={editWbsId}
                onValueChange={(v) => {
                  setEditWbsId(v);
                  setEditActivityId(NONE_ACTIVITY);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No WBS — task without parent activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_WBS}>No WBS (standalone task)</SelectItem>
                  {wbsItems
                    .slice()
                    .sort((a, b) =>
                      `${a.code}`.localeCompare(`${b.code}`, undefined, {
                        numeric: true,
                      })
                    )
                    .map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.code ? `${w.code} — ${w.name}` : w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Clear priority, WBS, and activity to leave them unset on the board.
              </p>
            </div>
            <div>
              <Label>Activity (optional, by WBS)</Label>
              <Select
                value={editActivityId}
                disabled={editWbsId === NONE_WBS}
                onValueChange={(v) => setEditActivityId(v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      editWbsId === NONE_WBS
                        ? "Select WBS first"
                        : wpActivityQueries.some((q) => q.isLoading)
                          ? "Loading activities…"
                          : "No linked activity unless selected"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_ACTIVITY}>No linked activity</SelectItem>
                  {activityChoices.map((a) => (
                    <SelectItem key={`edit-${a.id}`} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetEditForm()}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || updateCardMutation.isPending}
            >
              {updateCardMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

