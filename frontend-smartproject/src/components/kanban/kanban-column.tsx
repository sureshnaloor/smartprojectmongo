import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { KanbanInlineAdd } from "./kanban-inline-add";
import type { ColumnId } from "./constants";
import type { KanbanCardItem } from "./types";

interface KanbanColumnProps {
  id: ColumnId;
  title: string;
  hint: string;
  borderColor: string;
  indicatorColor: string;
  cards: KanbanCardItem[];
  limit?: number;
  collapsed?: boolean;
  columnIndex: number;
  selectedIds: Set<string>;
  onCardClick: (card: KanbanCardItem) => void;
  onCardSelect: (cardId: string, e: React.MouseEvent) => void;
  onInlineAdd: (title: string, column: ColumnId) => void;
  isAdding: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
}

export function KanbanColumn({
  id,
  title,
  hint,
  borderColor,
  indicatorColor,
  cards,
  limit,
  collapsed = false,
  columnIndex,
  selectedIds,
  onCardClick,
  onCardSelect,
  onInlineAdd,
  isAdding,
  onStartAdd,
  onCancelAdd,
}: KanbanColumnProps) {
  const overLimit = limit != null && limit > 0 && cards.length > limit;

  return (
    <div
      className="kanban-column-enter flex min-w-[260px] flex-1 flex-col xl:min-w-[280px]"
      style={{ animationDelay: `${columnIndex * 100}ms` }}
    >
      <div
        className={cn(
          "sticky top-0 z-[2] rounded-t-[var(--radius-md)] border-l-[3px] bg-[var(--bg-white)] px-4 py-3.5",
          overLimit && "kanban-limit-warning"
        )}
        style={{ borderLeftColor: borderColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-4 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: indicatorColor }}
            />
            <span className="kanban-heading-md text-[var(--text-primary)]">{title}</span>
            <span
              className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-full kanban-body-sm text-[var(--text-secondary)] tabular-nums px-1.5",
                overLimit && "kanban-badge-pulse text-[var(--status-warning)] font-semibold"
              )}
              style={{ backgroundColor: "var(--bg-warm-gray)" }}
            >
              {limit != null && limit > 0 ? `${cards.length}/${limit}` : cards.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--text-secondary)]"
              onClick={onStartAdd}
              aria-label={`Add card to ${title}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="kanban-caption text-[var(--text-muted)] mt-1 pl-3">{hint}</p>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-b-[var(--radius-md)] p-3 min-h-[calc(100vh-320px)] transition-colors",
              snapshot.isDraggingOver && "bg-[var(--copper-50)]"
            )}
            style={{ backgroundColor: "var(--bg-cream)" }}
          >
            {isAdding && (
              <KanbanInlineAdd
                onSubmit={(title) => onInlineAdd(title, id)}
                onCancel={onCancelAdd}
              />
            )}

            {cards.length === 0 && !snapshot.isDraggingOver && !isAdding && (
              <div
                className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed px-4 py-8 text-center"
                style={{ borderColor: "rgba(148, 163, 184, 0.25)" }}
              >
                <p className="kanban-body-sm text-[var(--text-muted)]">
                  Drop cards here or use Add card
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-[var(--text-secondary)]"
                  onClick={onStartAdd}
                >
                  <Plus className="h-4 w-4" />
                  Add card
                </Button>
              </div>
            )}

            {cards.map((card, index) => (
              <KanbanCard
                key={card.id}
                card={card}
                index={index}
                laneId={id}
                collapsed={collapsed}
                selected={selectedIds.has(card.id)}
                onClick={onCardClick}
                onSelect={onCardSelect}
                staggerDelay={columnIndex * 100 + index * 50}
              />
            ))}

            {snapshot.isDraggingOver && (
              <div
                className="mb-2.5 h-20 rounded-[var(--radius-md)] border-2 border-dashed"
                style={{
                  borderColor: "var(--copper-400)",
                  backgroundColor: "var(--copper-50)",
                }}
              />
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
