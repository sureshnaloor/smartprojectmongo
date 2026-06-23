import { ChevronRight, FolderOpen, UserPlus, Wallet } from "lucide-react";
import { RECENT_ACTIVITIES } from "./constants";

const ICON_MAP = {
  wbs: { icon: FolderOpen, bg: "var(--copper-50)", color: "var(--copper-500)" },
  member: { icon: UserPlus, bg: "var(--status-success-bg)", color: "var(--status-success)" },
  budget: { icon: Wallet, bg: "var(--status-info-bg)", color: "var(--status-info)" },
} as const;

export function RecentActivity() {
  return (
    <div className="pd-bottom-card flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="kanban-heading-lg text-[var(--text-primary)]">Recent Activity</h2>
        <button type="button" className="kanban-body-sm font-medium text-[var(--copper-500)] hover:underline">
          View All
        </button>
      </div>
      <ul className="flex-1 divide-y divide-[var(--border-subtle)] px-5">
        {RECENT_ACTIVITIES.map((item, i) => {
          const meta = ICON_MAP[item.type];
          const Icon = meta.icon;
          return (
            <li key={i}>
              <button
                type="button"
                className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-[var(--bg-cream)]/50"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Icon className="h-4 w-4" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="kanban-body-md text-[var(--text-primary)]">{item.text}</p>
                  <p className="kanban-body-sm text-[var(--text-secondary)]">{item.time}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
