import { useMemo } from "react";
import { GripVertical, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ACTIVITY_SORT_OPTIONS,
  activityCategoryLabel,
  activityStatus,
  type GlobalActivityItem,
  type SortKey,
} from "./constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded px-0.5" style={{ backgroundColor: "var(--copper-400)", color: "inherit" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface ActivitiesListPanelProps {
  items: GlobalActivityItem[];
  totalCount: number;
  search: string;
  categoryFilter: string;
  onCategoryFilter: (v: string) => void;
  onClearSearch?: () => void;
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd?: () => void;
  onDragStart: (e: React.DragEvent, item: GlobalActivityItem) => void;
  allocatedIds: Set<number>;
  loading?: boolean;
  emptyMessage?: string;
}

export function ActivitiesListPanel({
  items,
  totalCount,
  search,
  categoryFilter,
  onCategoryFilter,
  onClearSearch,
  sortKey,
  onSortChange,
  selectedId,
  onSelect,
  onAdd,
  onDragStart,
  allocatedIds,
  loading,
  emptyMessage,
}: ActivitiesListPanelProps) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const cat = activityCategoryLabel(item);
      if (cat.trim()) set.add(cat.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...items];
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description ?? "").toLowerCase().includes(q) ||
          (item.remarks ?? "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "All") {
      list = list.filter((item) => activityCategoryLabel(item) === categoryFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "rate") return Number(b.unitRate) - Number(a.unitRate);
      const da = a.createdAt ?? "";
      const db = b.createdAt ?? "";
      return db.localeCompare(da);
    });
    return list;
  }, [items, search, categoryFilter, sortKey]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="flex items-center gap-2">
          <h2 className="kanban-heading-lg text-[var(--text-primary)]">Activities</h2>
          <span className="kanban-body-sm text-[var(--text-secondary)]">{sorted.length} items</span>
        </div>
        {onAdd && (
          <Button size="sm" className="gap-1" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add Activity
          </Button>
        )}
      </div>

      {categories.length > 1 && (
        <div
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-6 py-3"
          style={{ backgroundColor: "var(--bg-cream)" }}
        >
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryFilter(cat)}
                className={cn(
                  "rounded-full px-3 py-1 kanban-caption font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-[var(--copper-500)] text-white"
                    : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="kanban-body-sm">
                Sort by: {ACTIVITY_SORT_OPTIONS.find((o) => o.value === sortKey)?.label} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ACTIVITY_SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => onSortChange(opt.value)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {categories.length <= 1 && (
        <div className="flex shrink-0 justify-end border-b border-[var(--border-subtle)] px-6 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="kanban-body-sm">
                Sort by: {ACTIVITY_SORT_OPTIONS.find((o) => o.value === sortKey)?.label} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ACTIVITY_SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => onSortChange(opt.value)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-warm-gray)]/30" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Search className="h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="kanban-body-sm text-[var(--text-secondary)]">
              {emptyMessage ?? (search ? "No activities match your search." : "No activities found. Add your first activity to get started.")}
            </p>
            {search && (
              <button
                type="button"
                className="kanban-body-sm text-[var(--copper-500)] underline"
                onClick={() => onClearSearch?.()}
              >
                Clear filters
              </button>
            )}
            {!search && (
              <Button size="sm" className="mt-2 gap-1" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                Add Activity
              </Button>
            )}
          </div>
        ) : (
          sorted.map((item, index) => {
            const status = activityStatus(item.id, allocatedIds);
            const isSelected = selectedId === item.id;
            const category = activityCategoryLabel(item);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "group relative min-h-[64px] cursor-pointer border-b border-[var(--border-subtle)] px-6 py-4 transition-all msr-item-enter",
                  isSelected
                    ? "border-l-[3px] border-l-[var(--copper-500)] bg-[var(--copper-50)] shadow-[var(--shadow-sm)]"
                    : "border-l-[3px] border-l-transparent hover:bg-[rgba(253,246,237,0.4)]"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <GripVertical className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex flex-col gap-2 pl-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="kanban-body-md font-medium text-[var(--text-primary)]">
                      {highlightMatch(item.name, search)}
                    </span>
                    <span className="shrink-0 kanban-body-sm font-mono text-[var(--text-secondary)]">
                      {formatCurrency(Number(item.unitRate || 0))} / {item.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 kanban-caption text-[var(--text-secondary)]"
                      style={{ backgroundColor: "var(--bg-warm-gray)" }}
                    >
                      {category}
                    </span>
                    <span className="flex items-center gap-1.5 kanban-caption text-[var(--text-secondary)]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                      {status.label}
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
          Showing {sorted.length} of {totalCount} activities
        </p>
        <Button variant="ghost" className="mt-2 w-full text-[var(--text-secondary)]" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add Another Activity
        </Button>
      </div>
    </div>
  );
}
