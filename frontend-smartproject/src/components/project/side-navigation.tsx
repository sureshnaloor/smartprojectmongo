import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { AddProjectModal } from "./add-project-modal";

interface SideNavigationProps {
  currentProjectId?: number;
}

export function SideNavigation({ currentProjectId }: SideNavigationProps) {
  const [location, setLocation] = useLocation();
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  // Toggle sidebar when mobile state changes
  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Get the current project
  const currentProject = projects.find(project => project.id === currentProjectId);

  // Check if a path is active
  const isActive = (path: string) => {
    return location.includes(path);
  };

  // Treat any of the project document routes as \"Project Documents\" active
  const isDocumentsRoute = [
    '/project-docs/ProjectDrawings',
    '/project-docs/ProjectBOQ',
    '/project-docs/ProjectScope',
    '/project-docs/EquipmentCatalogue',
    '/project-docs/ClientCorrespondence',
    '/project-docs/SupplierCorrespondence',
    '/project-docs/SubcontractCorrespondence',
    '/project-docs/InternalCorrespondence',
    '/project-docs/RequestForInspection',
    '/project-docs/ITPAndReports',
    '/project-docs/OtherDocuments',
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
        onClick={() => setIsOpen(true)}
        className="fixed top-16 left-0 z-20 p-2 bg-white rounded-r-md shadow-md text-gray-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="menu">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <aside className={cn(
        "bg-slate-900/95 border-r border-slate-800 flex-shrink-0 transition-all duration-300 app-shell-sidebar z-30 shadow-lg text-slate-100",
        isOpen ? "w-56 left-0" : "-left-full md:left-0 md:w-0"
      )}>
        <div className="h-full flex flex-col">
          <div className="px-4 py-4 border-b border-slate-800 bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-100 uppercase tracking-widest" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', letterSpacing: '0.2em' }}>PROJECTS</h2>
              <button
                className="text-primary-600 hover:text-primary-800 transition-all hover:scale-110"
                onClick={() => setIsAddProjectModalOpen(true)}
              >
                <Plus size={16} />
              </button>

              {isMobile && (
                <button
                  className="ml-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="x">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 bg-slate-900/60 backdrop-blur-sm">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <>
                <ul className="py-2">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <Link href={`/projects/${project.id}`} className={cn(
                          "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                          currentProjectId === project.id && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                        )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: currentProjectId === project.id ? 600 : 500, letterSpacing: '0.12em' }}>
                          {currentProjectId === project.id ? (
                            <Building2 className="mr-3 h-4 w-4" />
                          ) : (
                            <Building className="mr-3 h-4 w-4" />
                          )}
                          <span className="truncate">{project.name}</span>
                        </Link>
                    </li>
                  ))}
                </ul>

                {/* Project-specific tools, only shown when a project is selected */}
                {currentProjectId && (
                  <>
                    <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/95">
                      <h2 className="text-xs font-extrabold text-emerald-300 uppercase tracking-widest" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', letterSpacing: '0.2em' }}>
                        Project Tools
                      </h2>
                    </div>
                    <ul className="py-1">
                      <li>
                        <Link href={`/newproject/${currentProjectId}`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            isActive(`/newproject/${currentProjectId}`) && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: isActive(`/newproject/${currentProjectId}`) ? 600 : 500, letterSpacing: '0.12em' }}>
                            <Briefcase className="mr-3 h-4 w-4" />
                            <span>{currentProject?.name}</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            location === `/projects/${currentProjectId}` && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: location === `/projects/${currentProjectId}` ? 600 : 500, letterSpacing: '0.12em' }}>
                            <LayoutDashboard className="mr-3 h-4 w-4" />
                            <span>WBS and work packages</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}/collab`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            location.includes(`/projects/${currentProjectId}/collab`) && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: location.includes(`/projects/${currentProjectId}/collab`) ? 600 : 500, letterSpacing: '0.12em' }}>
                            <MessageSquareTextIcon className="mr-3 h-4 w-4" />
                            <span>Collaboration Hub</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}/activities/page5`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            isActive('/activities') && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: isActive('/activities') ? 600 : 500, letterSpacing: '0.12em' }}>
                            <Activity className="mr-3 h-4 w-4" />
                            <span>Activities</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}/tasks`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            isActive('/tasks') && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: isActive('/tasks') ? 600 : 500, letterSpacing: '0.12em' }}>
                            <ListTodo className="mr-3 h-4 w-4" />
                            <span>Tasks</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}/kanban`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            isActive('/kanban') && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: isActive('/kanban') ? 600 : 500, letterSpacing: '0.12em' }}>
                            <LayoutGrid className="mr-3 h-4 w-4" />
                            <span>Kanban</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}/charts`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            isActive('/charts') && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: isActive('/charts') ? 600 : 500, letterSpacing: '0.12em' }}>
                            <PieChart className="mr-3 h-4 w-4" />
                            <span>PERT & Gantt Charts</span>
                          </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${currentProjectId}/materials-services/materials`} className={cn(
                            "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                            isActive('/materials-services') && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                          )} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '0.65rem', fontWeight: isActive('/materials-services') ? 600 : 500, letterSpacing: '0.12em' }}>
                            <Package className="mr-3 h-4 w-4" />
                            <span>Materials, Services &amp; Resources</span>
                          </Link>
                      </li>

                      {/* Project Documents Section - single entry, details handled via tabs on page */}
                      <li>
                        <Link href={`/projects/${currentProjectId}/project-docs/ProjectDrawings`} className={cn(
                              "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                              isDocumentsRoute && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                            )}
                            style={{
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              fontSize: "0.65rem",
                              fontWeight: isDocumentsRoute ? 600 : 500,
                              letterSpacing: "0.12em",
                            }}
                          >
                            <FolderOpen className="mr-3 h-4 w-4" />
                            <span>Project Documents</span>
                          </Link>
                      </li>

                      {/* Project Wiki - single link; tabs in page header */}
                      <li>
                        <Link href={`/projects/${currentProjectId}/risk-register`} className={cn(
                              "flex items-center px-4 py-2.5 text-slate-100 hover:bg-slate-800/80 hover:text-white transition-colors duration-200 uppercase",
                              isWikiRoute && "text-teal-300 font-semibold bg-slate-800 border-r-2 border-teal-400"
                            )}
                            style={{
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              fontSize: "0.65rem",
                              fontWeight: isWikiRoute ? 600 : 500,
                              letterSpacing: "0.12em",
                            }}
                          >
                            <BookOpen className="mr-3 h-4 w-4" />
                            <span>Project Wiki</span>
                          </Link>
                      </li>
                    </ul>
                  </>
                )}
              </>
            )}
          </div>

          {currentProject && (
            <div className="p-3 border-t border-gray-300">
              <div className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-blue-600 rounded-xl p-4 shadow-2xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(20,184,166,0.4)] animate-pulse-slow" style={{
                boxShadow: '0 10px 30px rgba(20, 184, 166, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transform: 'perspective(1000px) rotateX(2deg)',
              }}>
                {/* Shine effect overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>

                {/* Alert pulse ring */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-blue-500 rounded-xl opacity-75 blur animate-pulse"></div>

                <div className="relative z-10">
                  <div className="text-xs font-bold text-white/90 uppercase tracking-wide mb-2 flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Current Project
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-white truncate drop-shadow-lg">{currentProject.name}</div>
                    <div className="flex space-x-2">
                      <button className="text-white/80 hover:text-white hover:scale-110 transition-all duration-200 p-1 rounded-lg hover:bg-white/20" title="Project Settings">
                        <Settings size={16} />
                      </button>
                      <button className="text-white/80 hover:text-white hover:scale-110 transition-all duration-200 p-1 rounded-lg hover:bg-white/20" title="Export Data">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
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
          setLocation(`/projects/${projectId}`);
        }}
      />

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}