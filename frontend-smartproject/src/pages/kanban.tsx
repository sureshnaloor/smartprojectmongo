import { useState, useCallback, useMemo, useEffect } from "react";
import { useRoute } from "wouter";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { get, post, patch } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ProjectActivity, WbsItem, WorkPackage } from "@shared/schema";

import { KanbanSubTabs } from "@/components/kanban/kanban-sub-tabs";
import { KanbanToolbar } from "@/components/kanban/kanban-toolbar";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanAddCardModal } from "@/components/kanban/kanban-add-card-modal";
import { KanbanCardDetailDrawer } from "@/components/kanban/kanban-card-detail-drawer";
import { KanbanSettingsDialog } from "@/components/kanban/kanban-settings-dialog";
import { KanbanBatchBar } from "@/components/kanban/kanban-batch-bar";
import { KanbanPlaceholderTab } from "@/components/kanban/kanban-placeholder-tab";
import {
  COLUMNS,
  NONE_ACTIVITY,
  NONE_PRIORITY,
  NONE_WBS,
  type ColumnId,
  type GroupByValue,
  type KanbanPriority,
  type KanbanSubTab,
  type PriorityFieldValue,
} from "@/components/kanban/constants";
import {
  DEFAULT_AUTOMATION,
  type AutomationRules,
  type ColumnLimits,
  type KanbanBoard,
  type KanbanCardItem,
} from "@/components/kanban/types";

function limitsKey(projectId: string) {
  return `kanban-limits-${projectId}`;
}

function automationKey(projectId: string) {
  return `kanban-automation-${projectId}`;
}

function filterCard(
  card: KanbanCardItem,
  search: string,
  priorityFilter: string
): boolean {
  const q = search.trim().toLowerCase();
  if (q) {
    const hay = [card.title, card.description, card.wbsLabel, card.activityLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (priorityFilter !== "all") {
    if (priorityFilter === "unset") {
      if (card.priority != null && card.priority !== "") return false;
    } else if (card.priority !== priorityFilter) {
      return false;
    }
  }
  return true;
}

function groupCards(cards: KanbanCardItem[], groupBy: GroupByValue): KanbanCardItem[] {
  if (groupBy === "none") return cards;
  const sorted = [...cards];
  sorted.sort((a, b) => {
    switch (groupBy) {
      case "priority":
        return (a.priority ?? "zzz").localeCompare(b.priority ?? "zzz");
      case "wbs":
        return (a.wbsLabel ?? "zzz").localeCompare(b.wbsLabel ?? "zzz");
      default:
        return 0;
    }
  });
  return sorted;
}

export default function KanbanPage() {
  const [, params] = useRoute<{ projectId: string }>("/projects/:projectId/kanban");
  const projectId = params?.projectId ?? "";
  const projectIdNum = parseInt(projectId, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [activeTab, setActiveTab] = useState<KanbanSubTab>("board");
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByValue>("none");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [columnsCollapsed, setColumnsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [inlineAddColumn, setInlineAddColumn] = useState<ColumnId | null>(null);
  const [mobileColumn, setMobileColumn] = useState<ColumnId>("wish");

  const [limits, setLimits] = useState<ColumnLimits>({});
  const [automation, setAutomation] = useState<AutomationRules>(DEFAULT_AUTOMATION);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<KanbanCardItem | null>(null);
  const [detailLaneId, setDetailLaneId] = useState<ColumnId | null>(null);
  const [drawerEditing, setDrawerEditing] = useState(false);

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

  const metaDialogOpen = addOpen || editCardId !== null || drawerEditing;
  const linkingWbsId = editCardId !== null || drawerEditing ? editWbsId : addWbsId;

  useEffect(() => {
    if (!projectId) return;
    try {
      const storedLimits = localStorage.getItem(limitsKey(projectId));
      if (storedLimits) setLimits(JSON.parse(storedLimits));
      const storedAuto = localStorage.getItem(automationKey(projectId));
      if (storedAuto) setAutomation(JSON.parse(storedAuto));
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(limitsKey(projectId), JSON.stringify(limits));
  }, [limits, projectId]);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(automationKey(projectId), JSON.stringify(automation));
  }, [automation, projectId]);

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
    setDrawerEditing(false);
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

  const activityChoices = useMemo(() => {
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
  }, [wpsUnderWbs, wpActivityQueries]);

  const activitiesLoading = wpActivityQueries.some((q) => q.isLoading);

  const moveMutation = useMutation({
    mutationFn: ({
      cardId,
      column,
      position,
    }: {
      cardId: number;
      column: ColumnId;
      position: number;
    }) => patch(`/projects/${projectId}/kanban/cards/${cardId}`, { column, position }),
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
      setInlineAddColumn(null);
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
      setDetailOpen(false);
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
      setDetailOpen(false);
      toast({ title: "Card archived", description: "Card removed from board." });
    },
    onError: (err: Error) => {
      toast({ title: "Archive failed", description: err.message, variant: "destructive" });
    },
  });

  const rawLanes = data?.lanes ?? COLUMNS.map((c) => ({ id: c.id, title: c.title, cards: [] as KanbanCardItem[] }));

  const lanes = useMemo(
    () =>
      rawLanes.map((lane) => ({
        ...lane,
        cards: groupCards(
          lane.cards.filter((c) => filterCard(c, search, priorityFilter)),
          groupBy
        ),
      })),
    [rawLanes, search, priorityFilter, groupBy]
  );

  const totalCards = rawLanes.reduce((n, lane) => n + lane.cards.length, 0);
  const collapsedView = columnsCollapsed || isNarrow;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const cardId = parseInt(result.draggableId, 10);
    if (isNaN(cardId)) return;
    moveMutation.mutate({
      cardId,
      column: result.destination.droppableId as ColumnId,
      position: result.destination.index,
    });
  };

  const openCardDetail = (card: KanbanCardItem, laneId: ColumnId) => {
    setDetailCard(card);
    setDetailLaneId(laneId);
    setDrawerEditing(false);
    const idNum = Number.parseInt(card.id, 10);
    if (Number.isFinite(idNum)) {
      setEditCardId(idNum);
      setEditTitle(card.title);
      setEditDescription(card.description ?? "");
      const p = card.priority;
      const isKnown = p != null && p !== "" && ["immediate_urgent", "before_end_of_today", "normal"].includes(p);
      setEditPriority(isKnown ? (p as KanbanPriority) : NONE_PRIORITY);
      setEditWbsId(card.wbsItemId != null ? String(card.wbsItemId) : NONE_WBS);
      setEditActivityId(card.projectActivityId != null ? String(card.projectActivityId) : NONE_ACTIVITY);
    }
    setDetailOpen(true);
  };

  const handleSaveEdit = () => {
    if (editCardId == null || !editTitle.trim()) return;
    updateCardMutation.mutate({
      id: editCardId,
      body: {
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        priority: editPriority === NONE_PRIORITY ? null : editPriority,
        wbsItemId: editWbsId === NONE_WBS ? null : parseInt(editWbsId, 10),
        projectActivityId: editActivityId === NONE_ACTIVITY ? null : parseInt(editActivityId, 10),
      },
    });
  };

  const handleAddCard = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() ? newDescription.trim() : undefined,
      priority: newPriority === NONE_PRIORITY ? null : newPriority,
      wbsItemId: addWbsId === NONE_WBS ? null : parseInt(addWbsId, 10),
      projectActivityId: addActivityId === NONE_ACTIVITY ? null : parseInt(addActivityId, 10),
    });
  };

  const handleInlineAdd = async (title: string, column: ColumnId) => {
    try {
      const created = await post<{ id: number }>(`/projects/${projectId}/kanban/cards`, { title });
      if (column !== "wish" && created?.id) {
        const destLane = rawLanes.find((l) => l.id === column);
        await patch(`/projects/${projectId}/kanban/cards/${created.id}`, {
          column,
          position: destLane?.cards.length ?? 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/kanban`] });
      setInlineAddColumn(null);
      toast({ title: "Card added", description: `New card added to ${column.toUpperCase()}.` });
    } catch (err) {
      toast({
        title: "Add failed",
        description: err instanceof Error ? err.message : "Could not add card",
        variant: "destructive",
      });
    }
  };

  const handleCardSelect = (cardId: string, e: React.MouseEvent, laneCards: KanbanCardItem[]) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) return;
    e.preventDefault();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedId) {
        const ids = laneCards.map((c) => c.id);
        const start = ids.indexOf(lastSelectedId);
        const end = ids.indexOf(cardId);
        if (start >= 0 && end >= 0) {
          const [lo, hi] = start < end ? [start, end] : [end, start];
          ids.slice(lo, hi + 1).forEach((id) => next.add(id));
        }
      } else if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
    setLastSelectedId(cardId);
  };

  const handleMoveNext = () => {
    if (!detailCard || !detailLaneId || editCardId == null) return;
    const order: ColumnId[] = ["wish", "ready", "doing", "done"];
    const idx = order.indexOf(detailLaneId);
    if (idx < 0 || idx >= order.length - 1) return;
    const nextCol = order[idx + 1];
    const destLane = rawLanes.find((l) => l.id === nextCol);
    moveMutation.mutate({
      cardId: editCardId,
      column: nextCol,
      position: destLane?.cards.length ?? 0,
    });
    setDetailLaneId(nextCol);
  };

  const handleBatchMove = (column: ColumnId) => {
    const destLane = rawLanes.find((l) => l.id === column);
    let pos = destLane?.cards.length ?? 0;
    selectedIds.forEach((id) => {
      const cardId = parseInt(id, 10);
      if (!isNaN(cardId)) {
        moveMutation.mutate({ cardId, column, position: pos });
        pos += 1;
      }
    });
    setSelectedIds(new Set());
  };

  const handleBatchArchive = () => {
    selectedIds.forEach((id) => {
      const cardId = parseInt(id, 10);
      if (!isNaN(cardId)) archiveMutation.mutate(cardId);
    });
    setSelectedIds(new Set());
  };

  const visibleColumns = isMobile
    ? COLUMNS.filter((c) => c.id === mobileColumn)
    : COLUMNS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[var(--bg-cream)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[var(--bg-cream)]">
      <KanbanSubTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "board" ? (
        <>
          <KanbanToolbar
            totalCards={totalCards}
            search={search}
            onSearchChange={setSearch}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            onAddCard={() => {
              resetAddForm();
              setAddOpen(true);
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            columnsCollapsed={columnsCollapsed}
            onToggleColumns={() => setColumnsCollapsed((v) => !v)}
          />

          {isMobile && (
            <div
              className="flex gap-1 overflow-x-auto border-b px-4 py-2 bg-[var(--bg-white)]"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {COLUMNS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileColumn(col.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 kanban-caption font-semibold transition-colors",
                    mobileColumn === col.id
                      ? "text-white"
                      : "text-[var(--text-secondary)]"
                  )}
                  style={{
                    backgroundColor:
                      mobileColumn === col.id ? "var(--copper-600)" : "var(--bg-warm-gray)",
                  }}
                >
                  {col.title}
                </button>
              ))}
            </div>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 overflow-x-auto p-6 lg:p-8 flex-1">
              {visibleColumns.map((colDef, columnIndex) => {
                const lane = lanes.find((l) => l.id === colDef.id) ?? {
                  id: colDef.id,
                  title: colDef.title,
                  cards: [],
                };
                return (
                  <KanbanColumn
                    key={colDef.id}
                    id={colDef.id}
                    title={colDef.title}
                    hint={colDef.hint}
                    borderColor={colDef.borderColor}
                    indicatorColor={colDef.indicatorColor}
                    cards={lane.cards}
                    limit={limits[colDef.id]}
                    collapsed={collapsedView}
                    columnIndex={columnIndex}
                    selectedIds={selectedIds}
                    onCardClick={(card) => openCardDetail(card, colDef.id)}
                    onCardSelect={(cardId, e) => handleCardSelect(cardId, e, lane.cards)}
                    onInlineAdd={handleInlineAdd}
                    isAdding={inlineAddColumn === colDef.id}
                    onStartAdd={() => setInlineAddColumn(colDef.id)}
                    onCancelAdd={() => setInlineAddColumn(null)}
                  />
                );
              })}
            </div>
          </DragDropContext>

          <KanbanBatchBar
            count={selectedIds.size}
            onMoveTo={handleBatchMove}
            onSetPriority={() => {}}
            onArchive={handleBatchArchive}
            onClear={() => setSelectedIds(new Set())}
          />
        </>
      ) : (
        <KanbanPlaceholderTab tab={activeTab} />
      )}

      <KanbanAddCardModal
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
        title={newTitle}
        onTitleChange={setNewTitle}
        description={newDescription}
        onDescriptionChange={setNewDescription}
        priority={newPriority}
        onPriorityChange={setNewPriority}
        wbsId={addWbsId}
        onWbsIdChange={setAddWbsId}
        activityId={addActivityId}
        onActivityIdChange={setAddActivityId}
        wbsItems={wbsItems}
        activityChoices={activityChoices}
        activitiesLoading={activitiesLoading}
        onSubmit={handleAddCard}
        isPending={createMutation.isPending}
      />

      <KanbanCardDetailDrawer
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) resetEditForm();
        }}
        card={detailCard}
        laneId={detailLaneId}
        editing={drawerEditing}
        onToggleEdit={() => setDrawerEditing((v) => !v)}
        editTitle={editTitle}
        onEditTitleChange={setEditTitle}
        editDescription={editDescription}
        onEditDescriptionChange={setEditDescription}
        editPriority={editPriority}
        onEditPriorityChange={setEditPriority}
        editWbsId={editWbsId}
        onEditWbsIdChange={setEditWbsId}
        editActivityId={editActivityId}
        onEditActivityIdChange={setEditActivityId}
        wbsItems={wbsItems}
        activityChoices={activityChoices}
        activitiesLoading={activitiesLoading}
        onSave={handleSaveEdit}
        onMoveNext={handleMoveNext}
        onArchive={() => editCardId != null && archiveMutation.mutate(editCardId)}
        isSaving={updateCardMutation.isPending}
        isArchiving={archiveMutation.isPending}
      />

      <KanbanSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        limits={limits}
        onLimitsChange={setLimits}
        automation={automation}
        onAutomationChange={setAutomation}
      />
    </div>
  );
}
