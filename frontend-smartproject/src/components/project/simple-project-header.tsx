import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  FolderOpen,
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
      <div className="bg-zinc-100 border-b border-zinc-200 animate-pulse w-full min-w-0">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="h-6 bg-zinc-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-zinc-200 rounded w-1/2" />
        </div>
        <div className="h-12 px-4 bg-zinc-50/50" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-zinc-100 border-b border-zinc-200 w-full min-w-0">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-red-500">Project not found</div>
        </div>
      </div>
    );
  }

  const documentTabs = documentTabsConfig(projectId);
  const wikiTabs = wikiTabsConfig(projectId);

  const isDocumentsRoute = typeof location === "string" && documentTabs.some((tab) => location.includes(tab.match));
  const isWikiRoute = typeof location === "string" && wikiTabs.some((tab) => location.includes(tab.match));

  const tabClass = (active: boolean) =>
    `shrink-0 border-b-2 py-2 px-1.5 text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 min-w-0 ${
      active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
    }`;

  return (
    <div className="bg-zinc-100 border-b border-zinc-200 shadow-sm w-full min-w-0">
      {/* Header: project name, budget, timeline */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-w-0">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="mr-2 text-zinc-500 hover:text-zinc-700">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="sr-only md:not-sr-only md:inline-block">Back to Projects</span>
                </Button>
              )}
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 truncate">{project.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-sky-800">Budget:</span>
                {formatCurrency(Number(project.budget), project.currency || "USD")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-sky-800">Timeline:</span>
                {formatDate(project.startDate ?? undefined)} — {formatDate(project.endDate ?? undefined)}
              </span>
              {pageIcon && (
                <span className="flex items-center gap-1.5 text-zinc-600">
                  {pageIcon}
                  <span className="font-medium">{pageTitle}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document tabs: fit width; very small = icons only; wider = icon + small text (wraps) */}
      {isDocumentsRoute && (
        <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 bg-zinc-50/50">
          <nav className="-mb-px flex flex-wrap gap-x-2 gap-y-1 py-2">
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
                  <span className="hidden sm:inline text-left leading-tight max-w-[4.5rem] sm:max-w-[5rem] break-words">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Wiki tabs: same responsive behavior */}
      {isWikiRoute && (
        <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 bg-zinc-50/50">
          <nav className="-mb-px flex flex-wrap gap-x-2 gap-y-1 py-2">
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
                  <span className="hidden sm:inline text-left leading-tight max-w-[4.5rem] sm:max-w-[5rem] break-words">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
