import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { ProjectDashboardHeader } from "@/components/project-dashboard/project-dashboard-header";
import { ImportWbsModal } from "@/components/project/import-wbs-modal";
import type { DashboardTabKey } from "@/components/project-dashboard/constants";

interface ProjectRootHeaderProps {
  projectId: number;
  activeTab?: DashboardTabKey;
}

export function ProjectRootHeader({ projectId, activeTab = "activities" }: ProjectRootHeaderProps) {
  const [importOpen, setImportOpen] = useState(false);
  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  if (isLoading || !project) {
    return (
      <div className="animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-white)] px-6 py-8">
        <div className="h-8 w-1/3 rounded bg-[var(--bg-warm-gray)]" />
        <div className="mt-3 h-4 w-1/2 rounded bg-[var(--bg-warm-gray)]" />
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-cream)] px-4 py-4 sm:px-6 lg:px-8">
      <ProjectDashboardHeader
        project={project}
        activeTab={activeTab}
        onImportWbs={() => setImportOpen(true)}
        wbsFinalized={Boolean((project as Project & { wbsFinalized?: boolean }).wbsFinalized)}
      />
      <ImportWbsModal isOpen={importOpen} onClose={() => setImportOpen(false)} projectId={project.id} />
    </div>
  );
}
