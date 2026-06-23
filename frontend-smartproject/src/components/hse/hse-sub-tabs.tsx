import { cn } from "@/lib/utils";
import { HSE_TABS, type HseTabId } from "./constants";

interface HseSubTabsProps {
  active: HseTabId;
  onChange: (tab: HseTabId) => void;
  badges?: Partial<Record<"risks" | "openSafety", number>>;
  safetyPulse?: boolean;
  collapsed?: boolean;
}

export function HseSubTabs({ active, onChange, badges, safetyPulse, collapsed }: HseSubTabsProps) {
  if (collapsed) {
    return (
      <div className="sticky top-0 z-30 bg-[var(--bg-cream)] px-6 py-3 lg:px-8">
        <select
          value={active}
          onChange={(e) => onChange(e.target.value as HseTabId)}
          className="h-9 w-full max-w-xs rounded-[var(--radius-md)] border bg-[var(--bg-white)] px-3 kanban-body-sm"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {HSE_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 bg-[var(--bg-cream)] px-6 py-3 lg:px-8">
      <div
        className="inline-flex flex-wrap gap-1 rounded-full p-1"
        style={{ backgroundColor: "var(--bg-white)" }}
      >
        {HSE_TABS.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.Icon;
          const count =
            tab.badgeKey === "risks"
              ? badges?.risks
              : tab.badgeKey === "openSafety"
                ? badges?.openSafety
                : undefined;
          const showPulse = tab.id === "safety" && safetyPulse;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3.5 py-2 kanban-body-sm font-medium transition-all",
                isActive
                  ? "bg-[var(--bg-white)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              {count != null && count > 0 && (
                <span
                  className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 kanban-caption font-semibold"
                  style={{
                    backgroundColor: tab.id === "safety" ? "var(--status-danger)" : "var(--bg-warm-gray)",
                    color: tab.id === "safety" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {count}
                </span>
              )}
              {showPulse && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full hse-severity-pulse"
                  style={{ backgroundColor: "var(--status-danger)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
