import { useMemo } from "react";
import { GripVertical, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  materialCategoryLabel,
  materialStatus,
  type MaterialItem,
  type ServiceItem,
  type SortKey,
  SORT_OPTIONS,
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

interface MaterialsListPanelProps {
  mode: "materials" | "services";
  items: MaterialItem[] | ServiceItem[];
  search: string;
  categoryFilter: string;
  onCategoryFilter: (v: string) => void;
  onClearSearch?: () => void;
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onDragStart: (e: React.DragEvent, item: MaterialItem | ServiceItem) => void;
  allocatedIds: Set<number>;
  loading?: boolean;
}

export function MaterialsListPanel({
  mode,
  items,
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
}: MaterialsListPanelProps) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const type =
        mode === "materials"
          ? (item as MaterialItem).materialType
          : (item as ServiceItem).serviceType;
      if (type?.trim()) set.add(type.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [items, mode]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...items];
    if (q) {
      list = list.filter((item) => {
        const code = mode === "materials" ? (item as MaterialItem).materialCode : (item as ServiceItem).serviceCode;
        const desc =
          mode === "materials"
            ? (item as MaterialItem).materialDescription
            : (item as ServiceItem).serviceDescription;
        return code.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      });
    }
    if (categoryFilter !== "All") {
      list = list.filter((item) => {
        const type =
          mode === "materials"
            ? (item as MaterialItem).materialType
            : (item as ServiceItem).serviceType;
        return type === categoryFilter;
      });
    }
    list.sort((a, b) => {
      if (sortKey === "name") {
        const na =
          mode === "materials" ? (a as MaterialItem).materialDescription : (a as ServiceItem).serviceDescription;
        const nb =
          mode === "materials" ? (b as MaterialItem).materialDescription : (b as ServiceItem).serviceDescription;
        return na.localeCompare(nb);
      }
      if (sortKey === "code") {
        const ca = mode === "materials" ? (a as MaterialItem).materialCode : (a as ServiceItem).serviceCode;
        const cb = mode === "materials" ? (b as MaterialItem).materialCode : (b as ServiceItem).serviceCode;
        return ca.localeCompare(cb);
      }
      if (sortKey === "rate") {
        return Number(b.baseRate) - Number(a.baseRate);
      }
      const da = (a as MaterialItem).createdAt ?? "";
      const db = (b as MaterialItem).createdAt ?? "";
      return db.localeCompare(da);
    });
    return list;
  }, [items, search, categoryFilter, sortKey, mode]);

  const label = mode === "materials" ? "Materials" : "Services";

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="flex items-center gap-2">
          <h2 className="msr-panel-title text-[var(--text-primary)]">{label}</h2>
          <span className="msr-meta text-[var(--text-secondary)]">{sorted.length} items</span>
        </div>
        <Button size="sm" className="gap-1" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add {mode === "materials" ? "Material" : "Service"}
        </Button>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-6 py-3"
        style={{ backgroundColor: "var(--bg-cream)" }}
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 msr-badge font-medium transition-colors",
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
            <Button variant="ghost" size="sm" className="msr-meta">
              Sort by: {SORT_OPTIONS.find((o) => o.value === sortKey)?.label} ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((opt) => (
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
            <p className="msr-meta text-[var(--text-secondary)]">
              No {mode} match your search
            </p>
            {search && (
              <button
                type="button"
                className="msr-meta text-[var(--copper-500)] underline"
                onClick={() => onClearSearch?.()}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          sorted.map((item, index) => {
            const id = item.id;
            const code =
              mode === "materials" ? (item as MaterialItem).materialCode : (item as ServiceItem).serviceCode;
            const name =
              mode === "materials"
                ? (item as MaterialItem).materialDescription
                : (item as ServiceItem).serviceDescription;
            const category =
              mode === "materials"
                ? materialCategoryLabel(item as MaterialItem)
                : `${(item as ServiceItem).serviceType ?? ""}${(item as ServiceItem).serviceGroup ? ` / ${(item as ServiceItem).serviceGroup}` : ""}`;
            const status = materialStatus(id, allocatedIds);
            const isSelected = selectedId === id;

            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onSelect(id)}
                className={cn(
                  "group relative cursor-pointer border-b border-[var(--border-subtle)] px-6 py-4 transition-all msr-item-enter",
                  isSelected
                    ? "border-l-[3px] border-l-[var(--copper-500)] bg-[var(--copper-50)] shadow-[var(--shadow-sm)] scale-[1.005]"
                    : "border-l-[3px] border-l-transparent hover:bg-[rgba(253,246,237,0.4)]"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <GripVertical className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex flex-col gap-2 pl-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="msr-item-desc font-mono text-[var(--copper-600)]">
                        {highlightMatch(code, search)}
                      </span>
                      <span className="mx-2 text-[var(--text-muted)]">·</span>
                      <span className="msr-item-title">
                        {highlightMatch(name, search)}
                      </span>
                    </div>
                    <span className="shrink-0 msr-item-desc font-mono text-[var(--text-secondary)]">
                      {(item as MaterialItem).uom} · Base: {formatCurrency(Number(item.baseRate || 0))}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 msr-badge text-[var(--text-secondary)]"
                      style={{ backgroundColor: "var(--bg-warm-gray)" }}
                    >
                      {category || "General"}
                    </span>
                    <span className="flex items-center gap-1.5 msr-badge text-[var(--text-secondary)]">
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

      <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--bg-white)] px-6 py-3">
        <p className="msr-meta text-[var(--text-muted)]">
          Showing {sorted.length} of {items.length} {mode}
        </p>
        <Button variant="ghost" className="mt-2 w-full text-[var(--text-secondary)]" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add Another {mode === "materials" ? "Material" : "Service"}
        </Button>
      </div>
    </div>
  );
}
