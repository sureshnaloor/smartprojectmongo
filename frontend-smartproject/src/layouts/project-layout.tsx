import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SideNavigation } from "@/components/project/side-navigation";
import { ProjectHeader } from "@/components/project/project-header";
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

  // Validate the projectId if provided
  useEffect(() => {
    if (projectId && (isNaN(projectId) || projectId <= 0)) {
      setLocation("/");
    }
  }, [projectId, setLocation]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Check if current page is a wiki or document page
  // Note: collab is excluded from isWikiPage so it can use ProjectHeader with tabs
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

  // Determine page title and icon
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
    if (location.includes('/project-docs/RiskRegister')) {
      return { title: 'Risk Register', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ProjectDailyProgress')) {
      return { title: 'Project Daily Progress', icon: <Calendar className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ProjectDailyResourceDeployed')) {
      return { title: 'Project Daily Resource Deployed', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/LessonLearntRegister')) {
      return { title: 'Lesson Learnt Register', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/DirectManpowerList')) {
      return { title: 'Direct Manpower List', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/IndirectManpowerList')) {
      return { title: 'Indirect Manpower List', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/DailyActivityTasksPlanned')) {
      return { title: 'Daily Activity/Tasks Planned', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/OtherWiki')) {
      return { title: 'Other Wiki', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ProjectDrawings')) {
      return { title: 'Project Drawings', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ProjectBOQ')) {
      return { title: 'Project BOQ', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ProjectScope')) {
      return { title: 'Project Scope Document (PTS)', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/EquipmentCatalogue')) {
      return { title: 'Equipment Catalogue', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ClientCorrespondence')) {
      return { title: 'Client Correspondence', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/SupplierCorrespondence')) {
      return { title: 'Supplier Correspondence', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/SubcontractCorrespondence')) {
      return { title: 'Subcontract Correspondence', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/InternalCorrespondence')) {
      return { title: 'Internal Project Correspondence', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/RequestForInspection')) {
      return { title: 'Request for Inspection', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/ITPAndReports')) {
      return { title: 'ITP and Reports', icon: <FolderOpen className="h-4 w-4" /> };
    }
    if (location.includes('/project-docs/OtherDocuments')) {
      return { title: 'Other Documents', icon: <FolderOpen className="h-4 w-4" /> };
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      {/* Top Navigation - Fixed */}
      <SharedNavigation variant="app" />

      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 4rem)', paddingTop: '4rem' }}>
        <div className="flex flex-1">
          {/* Left Sidebar Navigation */}
          <SideNavigation currentProjectId={projectId} />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col">
            {/* Project Header & Tabs */}
            {projectId && (
              isWikiPage || isDocumentPage ? (
                <SimpleProjectHeader
                  projectId={projectId}
                  pageTitle={pageInfo.title}
                  pageIcon={pageInfo.icon}
                />
              ) : (
                <ProjectHeader
                  projectId={projectId}
                  onToggleSidebar={toggleSidebar}
                />
              )
            )}

            <div className="flex-1">
              {children}
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-gray-100/90 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <img src="/smartproject.png" alt="ConstructPro Logo" className="h-4 w-auto" />
          <span>© {new Date().getFullYear()} ConstructPro. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
