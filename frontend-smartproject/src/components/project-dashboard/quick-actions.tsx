import { QUICK_ACTIONS, type QuickActionItem } from "./constants";

interface QuickActionsProps {
  onAction: (action: QuickActionItem["action"]) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="pd-bottom-card flex h-full flex-col overflow-hidden rounded-lg border-2 border-amber-700 bg-white shadow-sm">
      <div className="border-b-2 border-amber-700 bg-amber-50 px-4 py-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">Quick Actions</h2>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 p-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.action}
              type="button"
              onClick={() => onAction(action.action)}
              className="pd-action-tile flex flex-col items-center rounded-md border border-amber-200 bg-amber-50/60 p-2.5 transition-colors hover:border-amber-400 hover:bg-amber-50"
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
