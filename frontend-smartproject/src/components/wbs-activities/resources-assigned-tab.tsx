import { useLocation } from "wouter";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceNetworkDiagram } from "@/components/project/resource-network-diagram";

interface ResourcesAssignedTabProps {
  projectId: number;
  selectedWpId: number | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  resourceCount: number;
  isLoading?: boolean;
}

export function ResourcesAssignedTab({
  projectId,
  selectedWpId,
  projectStartDate,
  projectEndDate,
  resourceCount,
  isLoading,
}: ResourcesAssignedTabProps) {
  const [, setLocation] = useLocation();

  if (!isLoading && resourceCount === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Users className="mb-6 h-[100px] w-[100px] text-[var(--text-muted)] opacity-25" strokeWidth={1} />
        <h3 className="kanban-heading-lg text-[var(--text-primary)]">No resources assigned</h3>
        <p className="mt-3 max-w-[400px] kanban-body-sm text-[var(--text-secondary)]">
          Assign resources to work packages to see allocation charts and utilization metrics.
        </p>
        <Button
          className="mt-6 gap-1.5 bg-[var(--copper-500)] shadow-[var(--shadow-copper)] hover:bg-[var(--copper-600)]"
          onClick={() => setLocation(`/projects/${projectId}/materials-services/resources`)}
        >
          <Plus className="h-4 w-4" />
          Assign Resources
        </Button>
      </div>
    );
  }

  return (
    <div className="wa-tab-content flex-1 overflow-auto p-6">
      <ResourceNetworkDiagram
        projectId={projectId}
        selectedWpId={selectedWpId}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
      />
    </div>
  );
}
