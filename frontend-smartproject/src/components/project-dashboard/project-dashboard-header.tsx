import { useState } from "react";
import { useLocation } from "wouter";
import { Pencil, Upload, MoreHorizontal, Copy, Archive, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Project } from "@shared/schema";
import { DASHBOARD_TABS, type DashboardTabKey } from "./constants";
import { EditProjectModal } from "@/components/project/edit-project-modal";
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectDashboardHeaderProps {
  project: Project;
  activeTab?: DashboardTabKey;
  onImportWbs: () => void;
  scheduleStatus?: "on-track" | "behind" | "ahead";
  wbsFinalized?: boolean;
}

export function ProjectDashboardHeader({
  project,
  activeTab = "home",
  onImportWbs,
  scheduleStatus = "behind",
  wbsFinalized = false,
}: ProjectDashboardHeaderProps) {
  const [, setLocation] = useLocation();
  const [editOpen, setEditOpen] = useState(false);
  const [nameHover, setNameHover] = useState(false);

  const budgetLabel = formatCurrency(Number(project.budget) || 0, project.currency ?? "INR");
  const timelineLabel = `${project.startDate ? formatDate(project.startDate) : "—"} — ${project.endDate ? formatDate(project.endDate) : "—"}`;

  const statusBadge =
    scheduleStatus === "behind"
      ? { label: "Behind Schedule", className: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]" }
      : scheduleStatus === "ahead"
        ? { label: "Ahead of Schedule", className: "bg-[var(--status-success-bg)] text-[var(--status-success)]" }
        : { label: "On Track", className: "bg-[var(--status-info-bg)] text-[var(--status-info)]" };

  return (
    <>
      <header className="cp-card cp-card--compact pd-header-enter !p-5 !shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div
              className="group flex items-center gap-2"
              onMouseEnter={() => setNameHover(true)}
              onMouseLeave={() => setNameHover(false)}
            >
              <h1 className="cp-display-lg truncate" style={{ fontSize: "2rem" }}>
                {project.name}
              </h1>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={cn(
                  "rounded p-1 text-[var(--text-muted)] transition-opacity hover:text-[var(--text-secondary)]",
                  nameHover ? "opacity-100" : "opacity-0"
                )}
                title="Edit project"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 kanban-body-sm text-[var(--text-secondary)]">
              <span className="font-mono">Budget: {budgetLabel}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
              <span>Timeline: {timelineLabel}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
              <span className={cn("rounded-full px-2.5 py-0.5 kanban-caption font-semibold", statusBadge.className)}>
                {statusBadge.label}
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 kanban-caption font-semibold border",
                  (project as any).projectVersion === "estimation"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : (project as any).projectVersion === "planning"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}
              >
                {((project as any).projectVersion || "execution").toUpperCase()} VERSION
              </span>
            </div>
            {((project as any).mappedEstimationProjectId || (project as any).mappedPlanningProjectId) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-secondary)]">Mapped Versions:</span>
                {(project as any).mappedEstimationProjectId && (
                  <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 font-medium text-purple-700 border border-purple-100">
                    Estimation Project #{(project as any).mappedEstimationProjectId}
                  </span>
                )}
                {(project as any).mappedPlanningProjectId && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-100">
                    Planning Project #{(project as any).mappedPlanningProjectId}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onImportWbs}
              disabled={wbsFinalized}
              title={wbsFinalized ? "WBS is finalized — create an amendment to import" : "Import WBS from CSV or Excel"}
            >
              <Upload className="h-4 w-4" />
              Import WBS
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem className="gap-2 kanban-body-md">
                  <FileDown className="h-4 w-4" />
                  Export Report
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 kanban-body-md">
                  <Copy className="h-4 w-4" />
                  Duplicate Project
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 kanban-body-md">
                  <Archive className="h-4 w-4" />
                  Archive Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="p-0 text-[var(--status-danger)] focus:text-[var(--status-danger)]"
                  onSelect={(e) => e.preventDefault()}
                >
                  <DeleteProjectDialog
                    projectId={project.id}
                    projectName={project.name}
                    onSuccess={() => setLocation("/newlanding")}
                    trigger={
                      <div className="flex w-full items-center gap-2 px-2 py-1.5 kanban-body-md">
                        <Trash2 className="h-4 w-4" />
                        Delete Project
                      </div>
                    }
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav className="mt-5 cp-tabs-underline overflow-x-auto">
          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setLocation(tab.href(String(project.id)))}
                className={cn("cp-tab-underline shrink-0", isActive && "cp-tab-underline--active")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <EditProjectModal projectId={project.id} isOpen={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
