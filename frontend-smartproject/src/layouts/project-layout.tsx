import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SideNavigation } from "@/components/project/side-navigation";
import { ProjectHeader } from "@/components/project/project-header";
import { ProjectRootHeader } from "@/components/project/project-root-header";
import { SimpleProjectHeader } from "@/components/project/simple-project-header";
import { useMobile } from "@/hooks/use-mobile";
import { Toaster } from "sonner";
import { AlertTriangle, FolderOpen, Lightbulb, MessageSquareText, PieChart, ShieldAlert, HardHat, Leaf } from "lucide-react";
import { SharedNavigation } from "@/components/shared-navigation";

interface ProjectLayoutProps {
  children: React.ReactNode;
  projectId?: number;
}

export default function ProjectLayout({ children, projectId }: ProjectLayoutProps) {
  const isMobile = useMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (projectId && (isNaN(projectId) || projectId <= 0)) {
      setLocation("/");
    }
  }, [projectId, setLocation]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isWikiPage =
    location.includes('/risk-register') ||
    location.includes('/lesson-learnt-register') ||
    location.includes('/safety-incidents') ||
    location.includes('/safety-toolbox-talk') ||
    location.includes('/environmental-incidents') ||
    location.includes('/wiki-others');

  const isDocumentPage = location.includes('/project-docs/ProjectDrawings') ||
    location.includes('/project-docs/ProjectBOQ') ||
    location.includes('/project-docs/ProjectScope') ||
    location.includes('/project-docs/EquipmentCatalogue') ||
    location.includes('/project-docs/ClientCorrespondence') ||
    location.includes('/project-docs/SupplierCorrespondence') ||
    location.includes('/project-docs/SubcontractCorrespondence') ||
    location.includes('/project-docs/InternalCorrespondence') ||
    location.includes('/project-docs/RequestForInspection') ||
    location.includes('/project-docs/ITPAndReports') ||
    location.includes('/project-docs/OtherDocuments');

  const getPageInfo = () => {
    if (location.includes('/collab')) {
      return { title: 'Collaboration Hub', icon: <MessageSquareText className="h-4 w-4" /> };
    }
    if (location.includes('/risk-register')) {
      return { title: 'Risk Register', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/lesson-learnt-register')) {
      return { title: 'Lesson Learnt Register', icon: <Lightbulb className="h-4 w-4" /> };
    }
    if (location.includes('/safety-incidents')) {
      return { title: 'Safety Incidents Record', icon: <ShieldAlert className="h-4 w-4" /> };
    }
    if (location.includes('/safety-toolbox-talk')) {
      return { title: 'Daily Safety Toolbox Talk', icon: <HardHat className="h-4 w-4" /> };
    }
    if (location.includes('/environmental-incidents')) {
      return { title: 'Environmental Incidents Record', icon: <Leaf className="h-4 w-4" /> };
    }
    if (location.includes('/wiki-others')) {
      return { title: 'Others', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/charts')) {
      return { title: 'PERT & Gantt Charts', icon: <PieChart className="h-4 w-4" /> };
    }
    if (isWikiPage) {
      return { title: 'Project Wiki', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (isDocumentPage) {
      return { title: 'Project Documents', icon: <FolderOpen className="h-4 w-4" /> };
    }
    return { title: '', icon: null };
  };

  const pageInfo = getPageInfo();
  const isProjectRoot =
    !!projectId && typeof location === "string" && new RegExp(`^/projects/${projectId}$`).test(location);

  const isFullBleedPage =
    isProjectRoot ||
    location.includes("/materials-services") ||
    location.includes("/collab") ||
    (typeof location === "string" &&
      !!projectId &&
      (new RegExp(`^/projects/${projectId}/activities/?$`).test(location) ||
        new RegExp(`^/projects/${projectId}/activities/page5/?$`).test(location) ||
        new RegExp(`^/projects/${projectId}/tasks/?$`).test(location) ||
        new RegExp(`^/projects/${projectId}/tasks/page1/?$`).test(location)));

  return (
    <div className="cp-app-shell">
      <Toaster position="top-right" />
      <SharedNavigation variant="app" />

      <div className="cp-app-main">
        <div className="flex min-h-0 min-w-0 flex-1">
          <SideNavigation currentProjectId={projectId} />

          <div className="cp-app-content">
            {projectId && (
              isWikiPage || isDocumentPage ? (
                <SimpleProjectHeader
                  projectId={projectId}
                  pageTitle={pageInfo.title}
                  pageIcon={pageInfo.icon}
                />
              ) : isProjectRoot ? (
                <ProjectRootHeader projectId={projectId} activeTab="activities" />
              ) : (
                <ProjectHeader
                  projectId={projectId}
                  onToggleSidebar={toggleSidebar}
                />
              )
            )}

            <div className={isFullBleedPage ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "cp-app-content__inner cp-page-enter"}>
              {children}
            </div>
          </div>
        </div>
      </div>

      <footer className="cp-app-footer">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-3">
          <img src="/smartproject.png" alt="ConstructPro Logo" className="h-4 w-auto opacity-70" />
          <span>© {new Date().getFullYear()} ConstructPro. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
