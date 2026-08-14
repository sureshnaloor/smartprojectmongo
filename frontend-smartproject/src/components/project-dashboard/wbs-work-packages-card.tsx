import { FolderTree } from "lucide-react";
import { FinalizeWbsButton } from "@/components/project/finalize-wbs-button";
import { AmendProjectButton } from "@/components/project/amend-project-button";
import type { WbsItem, WorkPackage } from "@shared/schema";
import { WorkPackageDetailPanel } from "./work-package-detail-panel";

interface WbsWorkPackagesCardProps {
  projectId: number;
  projectName: string;
  currency: string;
  wbsItems: WbsItem[];
  workPackages: WorkPackage[];
  wbsFinalized: boolean;
  createdById?: number | null;
  selectedWpId: number | null;
  onInvalidWbsIds: (ids: number[]) => void;
  tree: React.ReactNode;
}

export function WbsWorkPackagesCard({
  projectId,
  projectName,
  currency,
  wbsItems,
  workPackages,
  wbsFinalized,
  createdById,
  selectedWpId,
  onInvalidWbsIds,
  tree,
}: WbsWorkPackagesCardProps) {
  return (
    <section className="pd-wbs-card overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4 pb-4">
        <h2 className="flex items-center gap-2.5 kanban-heading-lg text-[var(--text-primary)]">
          <FolderTree className="h-5 w-5 text-[var(--copper-500)]" />
          WBS &amp; Work Packages
          {wbsFinalized && (
            <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 kanban-caption font-semibold text-[var(--status-success)]">
              Finalized
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <FinalizeWbsButton
            projectId={projectId}
            wbsItems={wbsItems}
            workPackages={workPackages}
            wbsFinalized={wbsFinalized}
            onInvalidIds={onInvalidWbsIds}
            size="default"
            className="gap-1.5 bg-[var(--copper-500)] shadow-[var(--shadow-copper)] hover:bg-[var(--copper-600)]"
          />
          <AmendProjectButton
            projectId={projectId}
            projectName={projectName}
            wbsFinalized={wbsFinalized}
            createdById={createdById}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr]">
        <div className="border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
          <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-cream)] p-4">
            <p className="mb-3 kanban-body-sm italic text-[var(--text-secondary)]">
              Build the tree gradually (up to 9 levels). Lowest-level WBS must end with work packages. Full WBS
              editor — Project Setup
            </p>
            <div className="max-h-[420px] overflow-y-auto">{tree}</div>
            <div className="mt-3 flex h-12 items-center justify-center rounded-[6px] border-2 border-dashed border-[rgba(148,163,184,0.3)]">
              <span className="kanban-body-sm text-[var(--text-muted)]">Drag to reorder</span>
            </div>
          </div>
        </div>
        <div className="min-h-[280px]">
          <WorkPackageDetailPanel
            selectedWpId={selectedWpId}
            workPackages={workPackages}
            currency={currency}
          />
        </div>
      </div>
    </section>
  );
}
