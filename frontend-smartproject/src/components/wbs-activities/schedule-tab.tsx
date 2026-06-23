import { useLocation } from "wouter";
import { GanttChart, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleTabProps {
  projectId: number;
}

export function ScheduleTab({ projectId }: ScheduleTabProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="wa-tab-content flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-[140px] w-[140px] items-center justify-center rounded-full bg-[var(--bg-warm-gray)]">
        <GanttChart className="h-20 w-20 text-[var(--text-muted)] opacity-30" strokeWidth={1.25} />
      </div>
      <h3 className="kanban-heading-lg text-[var(--text-primary)]">Schedule &amp; Gantt</h3>
      <p className="mt-3 max-w-[420px] kanban-body-sm text-[var(--text-secondary)]">
        View the full project timeline with WBS bars, milestones, dependencies, and today&apos;s progress line in the
        dedicated schedule view.
      </p>
      <Button
        variant="outline"
        className="mt-6 gap-1.5"
        onClick={() => setLocation(`/projects/${projectId}/schedule`)}
      >
        <Calendar className="h-4 w-4" />
        Open Schedule View
      </Button>
    </div>
  );
}
