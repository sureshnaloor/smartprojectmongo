import { Draggable } from "@hello-pangea/dnd";
import { Calendar, Link2, MessageSquare, Paperclip, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  activityIdBadge,
  priorityDisplayLabel,
  priorityDotColor,
  type ColumnId,
} from "./constants";
import type { KanbanCardItem } from "./types";

interface KanbanCardProps {
  card: KanbanCardItem;
  index: number;
  laneId: ColumnId;
  collapsed?: boolean;
  selected?: boolean;
  onClick: (card: KanbanCardItem) => void;
  onSelect: (cardId: string, e: React.MouseEvent) => void;
  staggerDelay?: number;
}

export function KanbanCard({
  card,
  index,
  laneId,
  collapsed = false,
  selected = false,
  onClick,
  onSelect,
  staggerDelay = 0,
}: KanbanCardProps) {
  const hasLink = !!(card.wbsLabel || card.activityLabel || card.projectActivityId);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "kanban-card-enter mb-2.5",
            snapshot.isDragging && "z-50"
          )}
          style={{
            ...provided.draggableProps.style,
            animationDelay: `${staggerDelay}ms`,
          }}
          onClick={(e) => {
            onSelect(card.id, e);
            if (!e.defaultPrevented) onClick(card);
          }}
        >
          <div
            className={cn(
              "rounded-[var(--radius-md)] border bg-[var(--bg-white)] p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200",
              selected && "ring-2 ring-[var(--copper-400)] ring-offset-1",
              snapshot.isDragging
                ? "scale-[1.04] rotate-[2deg] opacity-85 shadow-[var(--shadow-xl)]"
                : "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px hover:border-[rgba(193,120,23,0.2)]"
            )}
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {!collapsed && (
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className="kanban-caption font-mono px-2 py-0.5 rounded-full"
                  style={{
                    color: "var(--copper-600)",
                    backgroundColor: "var(--copper-50)",
                  }}
                >
                  {activityIdBadge(card.id, card.projectActivityId)}
                </span>
                {card.priority != null && String(card.priority) !== "" && (
                  <span className="flex items-center gap-1 shrink-0">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: priorityDotColor(card.priority) }}
                    />
                    <span className="kanban-caption text-[var(--text-muted)]">
                      {priorityDisplayLabel(card.priority)}
                    </span>
                  </span>
                )}
              </div>
            )}

            <p
              className={cn(
                "kanban-body-md font-medium text-[var(--text-primary)] line-clamp-2",
                collapsed && "text-sm"
              )}
            >
              {card.title}
            </p>

            {!collapsed && card.description && (
              <p className="kanban-body-sm text-[var(--text-secondary)] line-clamp-2 mt-2">
                {card.description}
              </p>
            )}

            {!collapsed && card.wbsLabel && (
              <span
                className="inline-block mt-2 kanban-caption px-2 py-0.5 rounded-full text-[var(--text-secondary)]"
                style={{ backgroundColor: "var(--bg-warm-gray)" }}
              >
                {card.wbsLabel}
              </span>
            )}

            <div className="flex items-center justify-between mt-2 pt-1">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--bg-warm-gray)" }}
                >
                  <User className="h-3 w-3 text-[var(--text-muted)]" />
                </span>
                {!collapsed && (
                  <span className="flex items-center gap-1 kanban-caption text-[var(--text-muted)]">
                    <Calendar className="h-3 w-3" />
                    —
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
                  {hasLink && <Link2 className="h-3.5 w-3.5" />}
                  <span className="flex items-center gap-0.5 kanban-caption">
                    <MessageSquare className="h-3.5 w-3.5" />
                    0
                  </span>
                  <span className="flex items-center gap-0.5 kanban-caption">
                    <Paperclip className="h-3.5 w-3.5" />
                    0
                  </span>
                </div>
              )}
            </div>

            {laneId === "done" && !collapsed && !snapshot.isDragging && (
              <p className="kanban-caption text-[var(--text-muted)] mt-2 italic">
                Open card to archive
              </p>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
