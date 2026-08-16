import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Building,
  Building2,
  Settings,
  Download,
  Plus,
  Activity,
  ListTodo,
  PieChart,
  FolderOpen,
  MessageSquareText as MessageSquareTextIcon,
  LayoutDashboard,
  Briefcase,
  Package,
  LayoutGrid,
  BookOpen,
  UserCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { AddProjectModal } from "./add-project-modal";

interface SideNavigationProps {
  currentProjectId?: number;
}

function SidebarLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn("cp-sidebar-link", active && "cp-sidebar-link--active")}>
      <Icon className="cp-sidebar-link__icon" strokeWidth={1.5} />
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function SideNavigation({ currentProjectId }: SideNavigationProps) {
  const [location, setLocation] = useLocation();
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const currentProject = projects.find((project) => project.id === currentProjectId);

  const isActive = (path: string) => location.includes(path);

  const isDocumentsRoute = [
    "/project-docs/ProjectDrawings",
    "/project-docs/ProjectBOQ",
    "/project-docs/ProjectScope",
    "/project-docs/EquipmentCatalogue",
    "/project-docs/ClientCorrespondence",
    "/project-docs/SupplierCorrespondence",
    "/project-docs/SubcontractCorrespondence",
    "/project-docs/InternalCorrespondence",
    "/project-docs/RequestForInspection",
    "/project-docs/ITPAndReports",
    "/project-docs/OtherDocuments",
  ].some((p) => location.includes(p));

  const isWikiRoute = [
    "/risk-register",
    "/lesson-learnt-register",
    "/safety-incidents",
    "/safety-toolbox-talk",
    "/environmental-incidents",
    "/wiki-others",
  ].some((p) => location.includes(p));

  if (isMobile && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cp-focus-ring fixed left-0 top-14 z-20 rounded-r-md border border-[var(--border-dark)] bg-[var(--navy-800)] p-2 text-[var(--text-on-dark)] shadow-[var(--shadow-md)]"
        aria-label="Open sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <aside
        className={cn(
          "cp-sidebar transition-all duration-300",
          isOpen ? "w-[var(--cp-sidebar-width)]" : "-left-full md:left-0 md:w-0 md:overflow-hidden"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border-dark)] px-5 py-4">
            <p className="cp-sidebar-section-label">Projects</p>
            <button
              type="button"
              className="cp-focus-ring rounded p-1 text-[var(--copper-400)] hover:bg-[var(--navy-800)]"
              onClick={() => setIsAddProjectModalOpen(true)}
              aria-label="Add project"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
            {isMobile && (
              <button type="button" className="ml-1 text-[var(--text-on-dark-muted)]" onClick={() => setIsOpen(false)} aria-label="Close sidebar">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="space-y-2 px-4 py-2">
                <div className="cp-skeleton h-9 w-full" />
                <div className="cp-skeleton h-9 w-full" />
                <div className="cp-skeleton h-9 w-3/4" />
              </div>
            ) : (
              <>
                <ul className="space-y-0.5">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <SidebarLink
                        href={`/newproject/${project.id}`}
                        active={currentProjectId === project.id && location.includes(`/newproject/${project.id}`)}
                        icon={currentProjectId === project.id ? Building2 : Building}
                      >
                        {project.name}
                      </SidebarLink>
                    </li>
                  ))}
                </ul>

                {currentProjectId && (
                  <>
                    <div className="mt-6 border-t border-[var(--border-dark)] pt-4">
                      <p className="cp-sidebar-section-label mb-2">Project Tools</p>
                    </div>
                    <ul className="space-y-0.5">
                      <li>
                        <SidebarLink href={`/newproject/${currentProjectId}`} active={isActive(`/newproject/${currentProjectId}`)} icon={Briefcase}>
                          {currentProject?.name ?? "Dashboard"}
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}`} active={location === `/projects/${currentProjectId}`} icon={LayoutDashboard}>
                          WBS &amp; Activities
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/collab`} active={isActive("/collab")} icon={MessageSquareTextIcon}>
                          Collaboration Hub
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/activities/page5`} active={isActive("/activities")} icon={Activity}>
                          Activities
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/tasks`} active={isActive("/tasks")} icon={ListTodo}>
                          Tasks
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/kanban`} active={isActive("/kanban")} icon={LayoutGrid}>
                          Kanban
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/charts`} active={isActive("/charts")} icon={PieChart}>
                          PERT &amp; Gantt Charts
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/materials-services/materials`} active={isActive("/materials-services")} icon={Package}>
                          Materials &amp; Resources
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/resource-deployment`} active={isActive("/resource-deployment")} icon={UserCheck}>
                          Resource Deployment
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/consolidated-report`} active={isActive("/consolidated-report")} icon={FileText}>
                          Overall Project Report
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/project-docs/ProjectDrawings`} active={isDocumentsRoute} icon={FolderOpen}>
                          Project Documents
                        </SidebarLink>
                      </li>
                      <li>
                        <SidebarLink href={`/projects/${currentProjectId}/risk-register`} active={isWikiRoute} icon={BookOpen}>
                          Project Wiki
                        </SidebarLink>
                      </li>
                    </ul>
                  </>
                )}
              </>
            )}
          </div>

          {currentProject && (
            <div className="cp-sidebar-current-project">
              <p className="cp-caption mb-1.5 uppercase tracking-wider text-[var(--text-on-dark-muted)]">Current Project</p>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate cp-body-md font-medium text-[var(--text-on-dark)]">{currentProject.name}</p>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="rounded p-1 text-[var(--text-on-dark-muted)] hover:bg-[var(--navy-700)] hover:text-[var(--text-on-dark)]" title="Project Settings">
                    <Settings size={14} strokeWidth={1.5} />
                  </button>
                  <button type="button" className="rounded p-1 text-[var(--text-on-dark-muted)] hover:bg-[var(--navy-700)] hover:text-[var(--text-on-dark)]" title="Export Data">
                    <Download size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <AddProjectModal
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        onSuccess={(projectId) => {
          setIsAddProjectModalOpen(false);
          setLocation(`/newproject/${projectId}`);
        }}
      />

      {isMobile && isOpen && (
        <div className="fixed inset-0 z-20 bg-[rgba(15,23,41,0.4)] backdrop-blur-[2px]" onClick={() => setIsOpen(false)} aria-hidden />
      )}
    </>
  );
}
