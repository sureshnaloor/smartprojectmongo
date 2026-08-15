import { useMemo } from "react";
import { GripVertical, Search, Hammer, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  RESOURCE_TYPE_FILTERS,
  resourceTypeLabel,
  type GlobalResourceItem,
  type ResourceType,
  type SortKey,
  SORT_OPTIONS,
} from "./constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_ICONS: Record<string, typeof Users> = {
  manpower: Users,
  rental_manpower: Users,
  equipment: Truck,
  rental_equipment: Truck,
  tools: Hammer,
};

interface ResourcesListPanelProps {
  items: GlobalResourceItem[];
  search: string;
  typeFilter: ResourceType | "all";
  onTypeFilter: (v: ResourceType | "all") => void;
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDragStart: (e: React.DragEvent, item: GlobalResourceItem) => void;
  allocatedIds: Set<number>;
  loading?: boolean;
}

export function ResourcesListPanel({
  items,
  search,
  typeFilter,
  onTypeFilter,
  sortKey,
  onSortChange,
  selectedId,
  onSelect,
  onDragStart,
  allocatedIds,
  loading,
}: ResourcesListPanelProps) {
  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((r) => r.type !== "material" as never);
    if (typeFilter !== "all") {
      list = list.filter((r) => r.type === typeFilter);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          resourceTypeLabel(r.type).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "rate") return Number(b.unitRate) - Number(a.unitRate);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [items, search, typeFilter, sortKey]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="flex items-center gap-2">
          <h2 className="msr-panel-title text-[var(--text-primary)]">Resources</h2>
          <span className="msr-meta text-[var(--text-secondary)]">{sorted.length} items</span>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-6 py-3"
        style={{ backgroundColor: "var(--bg-cream)" }}
      >
        <div className="flex flex-wrap gap-2">
          {RESOURCE_TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onTypeFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 msr-badge font-medium transition-colors",
                typeFilter === f.key
                  ? "bg-[var(--copper-500)] text-white"
                  : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="msr-meta">
              Sort by: {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Name"} ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.filter((o) => o.value !== "code").map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => onSortChange(opt.value)}>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-warm-gray)]/30" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Search className="h-10 w-10 text-[var(--text-muted)] opacity-40" />
            <p className="msr-meta text-[var(--text-secondary)]">No resources match your filters</p>
          </div>
        ) : (
          sorted.map((item, index) => {
            const Icon = TYPE_ICONS[item.type] ?? Users;
            const isSelected = selectedId === item.id;
            const isAllocated = allocatedIds.has(item.id);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "group relative cursor-pointer border-b border-[var(--border-subtle)] px-6 py-4 transition-all msr-item-enter",
                  isSelected
                    ? "border-l-[3px] border-l-[var(--copper-500)] bg-[var(--copper-50)] shadow-[var(--shadow-sm)]"
                    : "border-l-[3px] border-l-transparent hover:bg-[rgba(253,246,237,0.4)]"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <GripVertical className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex flex-col gap-2 pl-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--copper-500)]" />
                      <div className="min-w-0">
                        <span className="msr-item-title">{item.name}</span>
                        {item.description && (
                          <p className="msr-item-desc truncate">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 msr-item-desc font-mono text-[var(--text-secondary)]">
                      {formatCurrency(Number(item.unitRate))} / {item.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    <span
                      className="rounded-full px-2 py-0.5 msr-badge capitalize text-[var(--text-secondary)]"
                      style={{ backgroundColor: "var(--bg-warm-gray)" }}
                    >
                      {resourceTypeLabel(item.type)}
                    </span>
                    <span className="flex items-center gap-1.5 msr-badge text-[var(--text-secondary)]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: isAllocated ? "var(--status-info)" : "var(--status-success)" }}
                      />
                      {isAllocated ? "Allocated" : "Available"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--bg-white)] px-6 py-3">
        <p className="msr-meta text-[var(--text-muted)]">
          Showing {sorted.length} of {items.length} resources · drag to a work package to assign
        </p>
      </div>
    </div>
  );
}
