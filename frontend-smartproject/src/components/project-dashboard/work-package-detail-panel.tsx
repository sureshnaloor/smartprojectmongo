import { useQuery } from "@tanstack/react-query";
import { FileText, Package, Wrench, Users, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WorkPackage } from "@shared/schema";

interface WorkPackageDetailPanelProps {
  selectedWpId: number | null;
  workPackages: WorkPackage[];
  currency: string;
}

export function WorkPackageDetailPanel({ selectedWpId, workPackages, currency }: WorkPackageDetailPanelProps) {
  const selectedWP = workPackages.find((wp) => wp.id === selectedWpId);

  const { data: materials = [], isLoading: loadingM } = useQuery<any[]>({
    queryKey: ["wp-materials", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/materials`);
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedWpId,
  });

  const { data: services = [], isLoading: loadingS } = useQuery<any[]>({
    queryKey: ["wp-services", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/services`);
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedWpId,
  });

  const { data: resources = [], isLoading: loadingR } = useQuery<any[]>({
    queryKey: ["wp-resources", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/resources`);
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedWpId,
  });

  if (!selectedWpId || !selectedWP) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[rgba(148,163,184,0.3)]">
          <FileText className="h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.25} />
        </div>
        <h3 className="kanban-heading-lg text-[var(--text-primary)]">Select a work package</h3>
        <p className="mt-2 max-w-[280px] kanban-body-sm text-[var(--text-secondary)]">
          Click a work package in the list to view its materials, services and resources.
        </p>
      </div>
    );
  }

  const loading = loadingM || loadingS || loadingR;
  const budget = Number(selectedWP.budgetedCost || 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--copper-50)]">
          <Package className="h-5 w-5 text-[var(--copper-500)]" />
        </div>
        <div className="min-w-0">
          <p className="kanban-caption font-mono text-[var(--text-muted)]">{selectedWP.code}</p>
          <h3 className="kanban-heading-lg text-[var(--text-primary)]">{selectedWP.name}</h3>
          {selectedWP.description && (
            <p className="mt-1 kanban-body-sm text-[var(--text-secondary)]">{selectedWP.description}</p>
          )}
          <p className="mt-2 kanban-body-sm font-mono text-[var(--text-secondary)]">
            Budget: {formatCurrency(budget, currency)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--copper-500)]" />
        </div>
      ) : (
        <div className="space-y-4">
          <DetailSection icon={Package} label="Materials" count={materials.length} />
          <DetailSection icon={Wrench} label="Services" count={services.length} />
          <DetailSection icon={Users} label="Resources" count={resources.length} />
        </div>
      )}
    </div>
  );
}

function DetailSection({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Package;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-cream)] px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--copper-500)]" />
        <span className="kanban-body-md font-medium text-[var(--text-primary)]">{label}</span>
        <span className="ml-auto rounded-full bg-[var(--bg-warm-gray)] px-2 py-0.5 kanban-caption font-semibold text-[var(--text-secondary)]">
          {count}
        </span>
      </div>
    </div>
  );
}
