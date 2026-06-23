import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileImage,
  FileSpreadsheet,
  FileText,
  Package,
  Mail,
  ClipboardCheck,
  FileCheck,
  FolderOpen,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  HardHat,
  Leaf,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimpleProjectHeaderProps {
  projectId: number;
  pageTitle: string;
  pageIcon?: React.ReactNode;
  onClose?: () => void;
}

const documentTabsConfig = (projectId: number) => [
  { key: "drawings", label: "Project Drawings", match: "/project-docs/ProjectDrawings", href: `/projects/${projectId}/project-docs/ProjectDrawings`, Icon: FileImage },
  { key: "boq", label: "Project BOQ", match: "/project-docs/ProjectBOQ", href: `/projects/${projectId}/project-docs/ProjectBOQ`, Icon: FileSpreadsheet },
  { key: "scope", label: "Scope Doc (PTS)", match: "/project-docs/ProjectScope", href: `/projects/${projectId}/project-docs/ProjectScope`, Icon: FileText },
  { key: "equipment", label: "Equipment Catalogue", match: "/project-docs/EquipmentCatalogue", href: `/projects/${projectId}/project-docs/EquipmentCatalogue`, Icon: Package },
  { key: "client", label: "Client Correspondence", match: "/project-docs/ClientCorrespondence", href: `/projects/${projectId}/project-docs/ClientCorrespondence`, Icon: Mail },
  { key: "supplier", label: "Supplier Correspondence", match: "/project-docs/SupplierCorrespondence", href: `/projects/${projectId}/project-docs/SupplierCorrespondence`, Icon: Mail },
  { key: "subcontract", label: "Subcontract Correspondence", match: "/project-docs/SubcontractCorrespondence", href: `/projects/${projectId}/project-docs/SubcontractCorrespondence`, Icon: Mail },
  { key: "internal", label: "Internal Correspondence", match: "/project-docs/InternalCorrespondence", href: `/projects/${projectId}/project-docs/InternalCorrespondence`, Icon: Users },
  { key: "rfi", label: "Request for Inspection", match: "/project-docs/RequestForInspection", href: `/projects/${projectId}/project-docs/RequestForInspection`, Icon: ClipboardCheck },
  { key: "itp", label: "ITP & Reports", match: "/project-docs/ITPAndReports", href: `/projects/${projectId}/project-docs/ITPAndReports`, Icon: FileCheck },
  { key: "others", label: "Other Documents", match: "/project-docs/OtherDocuments", href: `/projects/${projectId}/project-docs/OtherDocuments`, Icon: FolderOpen },
];

const wikiTabsConfig = (projectId: number) => [
  { key: "risk", label: "Risk Register", match: "/risk-register", href: `/projects/${projectId}/risk-register`, Icon: AlertTriangle },
  { key: "lesson", label: "Lesson Learnt", match: "/lesson-learnt-register", href: `/projects/${projectId}/lesson-learnt-register`, Icon: Lightbulb },
  { key: "safety", label: "Safety Incidents", match: "/safety-incidents", href: `/projects/${projectId}/safety-incidents`, Icon: ShieldAlert },
  { key: "toolbox", label: "Safety Toolbox Talk", match: "/safety-toolbox-talk", href: `/projects/${projectId}/safety-toolbox-talk`, Icon: HardHat },
  { key: "environmental", label: "Environmental Incidents", match: "/environmental-incidents", href: `/projects/${projectId}/environmental-incidents`, Icon: Leaf },
  { key: "others", label: "Others", match: "/wiki-others", href: `/projects/${projectId}/wiki-others`, Icon: FolderOpen },
];

export function SimpleProjectHeader({ projectId, pageTitle, pageIcon, onClose }: SimpleProjectHeaderProps) {
  const [location, setLocation] = useLocation();

  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  if (isLoadingProject) {
    return (
      <div className="cp-inline-page-header animate-pulse">
        <div className="cp-inline-page-header__body space-y-2">
          <div className="cp-skeleton h-7 w-1/3" />
          <div className="cp-skeleton h-4 w-1/2" />
        </div>
        <div className="cp-inline-page-header__tabs">
          <div className="cp-skeleton h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="cp-inline-page-header">
        <div className="cp-inline-page-header__body">
          <div className="text-[var(--status-danger)] kanban-body-md">Project not found</div>
        </div>
      </div>
    );
  }

  const documentTabs = documentTabsConfig(projectId);
  const wikiTabs = wikiTabsConfig(projectId);

  const isDocumentsRoute = typeof location === "string" && documentTabs.some((tab) => location.includes(tab.match));
  const isWikiRoute = typeof location === "string" && wikiTabs.some((tab) => location.includes(tab.match));
  const isHseHub = typeof location === "string" && location.includes("/risk-register");
  const isDocumentsHub = isDocumentsRoute;

  const tabClass = (active: boolean) =>
    cn(
      "cp-tab-underline inline-flex shrink-0 items-center gap-1.5 !py-2.5 !px-3",
      active && "cp-tab-underline--active"
    );

  return (
    <div className="cp-inline-page-header">
      <div className="cp-inline-page-header__body">
        <div className="flex min-w-0 items-center justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 items-center gap-3">
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="mr-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:inline-block">Back to Projects</span>
                </Button>
              )}
              <h1 className={cn("cp-display-md truncate", (isHseHub || isDocumentsHub) && "!text-[2rem]")}>
                {project.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 kanban-body-sm text-[var(--text-secondary)]">
              <span className="font-mono">Budget: {formatCurrency(Number(project.budget), project.currency || "USD")}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
              <span>
                Timeline: {formatDate(project.startDate ?? undefined)} — {formatDate(project.endDate ?? undefined)}
              </span>
              {isHseHub ? (
                <span className="cp-badge cp-badge--warning">Risk Register</span>
              ) : isDocumentsHub ? (
                <span className="cp-badge cp-badge--info">Project Documents</span>
              ) : pageIcon ? (
                <span className="flex items-center gap-1.5">
                  {pageIcon}
                  <span className="font-medium">{pageTitle}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isDocumentsRoute && !isDocumentsHub && (
        <div className="cp-inline-page-header__tabs">
          <nav className="cp-tabs-underline flex flex-wrap gap-x-1 overflow-x-auto py-1">
            {documentTabs.map((tab) => {
              const active = typeof location === "string" && location.includes(tab.match);
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLocation(tab.href)}
                  className={tabClass(active)}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden max-w-[5rem] text-left leading-tight sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {isWikiRoute && !isHseHub && (
        <div className="cp-inline-page-header__tabs">
          <nav className="cp-tabs-underline flex flex-wrap gap-x-1 overflow-x-auto py-1">
            {wikiTabs.map((tab) => {
              const active = typeof location === "string" && location.includes(tab.match);
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLocation(tab.href)}
                  className={tabClass(active)}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden max-w-[5rem] text-left leading-tight sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
