import { KanbanSubTab } from "./constants";

interface KanbanPlaceholderTabProps {
  tab: KanbanSubTab;
}

const TAB_COPY: Record<Exclude<KanbanSubTab, "board">, { title: string; description: string }> = {
  activities: {
    title: "Activities Overview",
    description: "Summary list of all activities linked to kanban cards will appear here.",
  },
  versions: {
    title: "Plan Versions",
    description: "Saved board snapshots and versions will be managed from this view.",
  },
  dependencies: {
    title: "Dependencies",
    description: "Activity dependency visualization across the kanban board.",
  },
  backlog: {
    title: "Backlog",
    description: "Full unfiltered backlog list of all wish-column and archived items.",
  },
};

export function KanbanPlaceholderTab({ tab }: KanbanPlaceholderTabProps) {
  if (tab === "board") return null;
  const copy = TAB_COPY[tab];

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className="kanban-heading-lg text-[var(--text-primary)] mb-2">{copy.title}</h2>
        <p className="kanban-body-sm text-[var(--text-secondary)]">{copy.description}</p>
      </div>
    </div>
  );
}
