import { CalendarClock, Plus, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityNetworkDiagram } from "@/components/project/activity-network-diagram";
import { cn } from "@/lib/utils";

interface ActivityNetworkTabProps {
  projectId: number;
  selectedWpId: number | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  hasActivities: boolean;
  isLoading?: boolean;
  onCreateActivity: () => void;
}

export function ActivityNetworkTab({
  projectId,
  selectedWpId,
  projectStartDate,
  projectEndDate,
  hasActivities,
  isLoading,
  onCreateActivity,
}: ActivityNetworkTabProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--copper-500)]" />
        <p className="mt-3 kanban-body-sm text-[var(--text-secondary)]">Loading activities…</p>
      </div>
    );
  }

  if (!hasActivities) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-[140px] w-[140px] items-center justify-center rounded-full bg-[var(--bg-warm-gray)]">
          <CalendarClock className="h-[100px] w-[100px] text-[var(--text-muted)] opacity-25" strokeWidth={1} />
        </div>
        <h3 className="kanban-heading-lg text-[var(--text-primary)]">No activities found for this project</h3>
        <p className="mt-3 max-w-[400px] kanban-body-sm text-[var(--text-secondary)]">
          Activities will appear here once you add tasks to your work packages. Start by creating work packages in the
          WBS tree, then add activities to see the network diagram.
        </p>
        <Button className="mt-6 gap-1.5 bg-[var(--copper-500)] shadow-[var(--shadow-copper)] hover:bg-[var(--copper-600)]" onClick={onCreateActivity}>
          <Plus className="h-4 w-4" />
          Create First Activity
        </Button>
        <a
          href="https://docs.constructpro.app/activity-planning"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 kanban-body-sm text-[var(--copper-500)] hover:underline"
        >
          Learn about activity planning
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn("wa-tab-content min-h-[320px] overflow-auto p-6")}>
      <ActivityNetworkDiagram
        projectId={projectId}
        selectedWpId={selectedWpId}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
      />
    </div>
  );
}
