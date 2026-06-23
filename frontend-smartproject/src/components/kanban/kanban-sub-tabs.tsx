import { cn } from "@/lib/utils";
import { KANBAN_SUB_TABS, type KanbanSubTab } from "./constants";

interface KanbanSubTabsProps {
  active: KanbanSubTab;
  onChange: (tab: KanbanSubTab) => void;
}

export function KanbanSubTabs({ active, onChange }: KanbanSubTabsProps) {
  return (
    <div
      className="sticky top-0 z-30 border-b bg-[var(--bg-white)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <nav className="flex gap-6 overflow-x-auto px-6 sm:px-8">
        {KANBAN_SUB_TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "shrink-0 border-b-2 py-3.5 kanban-body-sm font-semibold transition-colors whitespace-nowrap",
                isActive
                  ? "border-[var(--copper-400)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
