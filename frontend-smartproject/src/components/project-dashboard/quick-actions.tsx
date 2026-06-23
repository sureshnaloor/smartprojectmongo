import { QUICK_ACTIONS, type QuickActionItem } from "./constants";

interface QuickActionsProps {
  onAction: (action: QuickActionItem["action"]) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="pd-bottom-card flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="kanban-heading-lg text-[var(--text-primary)]">Quick Actions</h2>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 p-5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.action}
              type="button"
              onClick={() => onAction(action.action)}
              className="pd-action-tile flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-cream)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(212,144,61,0.3)] hover:bg-[var(--copper-50)] hover:shadow-[var(--shadow-sm)]"
            >
              <Icon className="h-6 w-6 text-[var(--copper-500)]" />
              <span className="mt-2 kanban-body-sm font-medium text-[var(--text-primary)]">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
