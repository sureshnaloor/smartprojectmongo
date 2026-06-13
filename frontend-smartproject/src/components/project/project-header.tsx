import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project, WbsItem } from "@shared/schema";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { FileSpreadsheet, ChartLine, GanttChart, Menu, MoreHorizontal, BarChart2, PencilIcon, ArrowLeft, DollarSign, Package, Wrench, Users, LayoutDashboard, Activity, Calendar, TrendingUp, Pin, AlertTriangle, Award, Info, Megaphone, ClipboardCheck, HardHat, Laugh, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportWbsModal } from "./import-wbs-modal";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { EditProjectModal } from "./edit-project-modal";
import { useMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectHeaderProps {
  projectId: number;
  onToggleSidebar?: () => void;
  onClose?: () => void;
}

export function ProjectHeader({ projectId, onToggleSidebar, onClose }: ProjectHeaderProps) {
  const [location, setLocation] = useLocation();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isMobile = useMobile();

  // Detect the current route context (activities, tasks, resources, collab)
  // Extract the base path from the current location
  const getRouteContext = () => {
    // Check if we're on a page route (e.g., /activities/page1, /tasks/page2, /resources/page3, /collab/page1)
    const pageMatch = location.match(/\/projects\/\d+\/(activities|tasks|resources|collab)\/(page\d+|activity-plan)/);
    if (pageMatch) {
      return pageMatch[1]; // Return 'activities', 'tasks', 'resources', or 'collab'
    }

    // Check if we're on the base route (e.g., /activities, /tasks, /resources, /collab)
    const baseMatch = location.match(/\/projects\/\d+\/(activities|tasks|resources|collab)(?:\/|$)/);
    if (baseMatch) {
      return baseMatch[1]; // Return 'activities', 'tasks', 'resources', or 'collab'
    }

    // Default to 'resources' if no match found
    return 'resources';
  };

  const routeContext = getRouteContext();
  const isMaterialsServicesRoute = location.includes("/materials-services");
  const isResourcesRoute = location.includes("/resources") && !location.includes("/materials-services");
  const showMaterialsServicesTabs = isMaterialsServicesRoute || isResourcesRoute;

  const isProjectRoot = typeof location === "string" && new RegExp(`^/projects/${projectId}$`).test(location);
  const [wbsTabHash, setWbsTabHash] = useState("");
  const [collabTabHash, setCollabTabHash] = useState("");
  useEffect(() => {
    if (!isProjectRoot) return;
    const hash = (window.location.hash || "#home").slice(1);
    setWbsTabHash(hash || "home");
    const onHashChange = () => setWbsTabHash((window.location.hash || "#home").slice(1));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [isProjectRoot, projectId]);
  useEffect(() => {
    if (routeContext !== "collab") return;
    const hash = (typeof window !== "undefined" && (window.location.hash || "#all").slice(1)) || "all";
    setCollabTabHash(hash);
    const onHashChange = () => setCollabTabHash((window.location.hash || "#all").slice(1) || "all");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [routeContext]);
  const activeWbsTab = (wbsTabHash || "home") as string;

  // Fetch project data
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Fetch WBS items to calculate status
  const { data: wbsItems = [] } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
  });

  if (isLoadingProject) {
    return (
      <div className="bg-white border-b border-gray-200 animate-pulse">
        <div className="px-4 py-4 sm:px-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="border-b border-gray-200">
          <div className="h-10 px-4 bg-gray-50"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <div className="text-red-500">Project not found</div>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  const totalBudget = wbsItems.reduce((sum, item) => sum + Number(item.budgetedCost), 0);
  const completedValue = wbsItems.reduce((sum, item) => sum + (Number(item.budgetedCost) * Number(item.percentComplete) / 100), 0);
  const overallProgress = totalBudget > 0 ? (completedValue / totalBudget) * 100 : 0;
  const expectedProgress = 45; // This would normally be calculated based on current date vs. schedule

  // Get status color
  const status = getStatusColor(expectedProgress, overallProgress);

  // Handle successful project deletion
  const handleProjectDeleted = () => {
    setLocation("/");
  };

  return (
    <div className="bg-zinc-100 border-b border-zinc-200 shadow-sm">
      {/* Project Basic Information */}
      <div className="px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="mr-2 text-zinc-500 hover:text-zinc-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="sr-only md:not-sr-only md:inline-block">Back to Projects</span>
                </Button>
              )}
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
                {project.name}
              </h1>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-zinc-300 hover:bg-zinc-200"
                onClick={() => setIsEditModalOpen(true)}
              >
                <PencilIcon className="h-4 w-4 text-zinc-600" />
                <span className="sr-only">Edit</span>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-sky-800">Budget:</span>
                {formatCurrency(Number(project.budget), project.currency || "USD")}
              </span>
              <span className="flex items-center gap-1.5 text-balance">
                <span className="font-semibold text-sky-800">Timeline:</span>
                {formatDate(project.startDate ?? undefined)} — {formatDate(project.endDate ?? undefined)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${status.color.replace('bg-', 'bg-opacity-20 ')} ${status.textColor}`}>
                <span
                  className={`w-2 h-2 mr-2 rounded-full ${status.color}`}
                ></span>
                {status.status}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-sky-100 border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm font-semibold"
              onClick={() => setIsImportModalOpen(true)}
            >
              Import WBS
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-zinc-200">
                  <MoreHorizontal className="h-5 w-5 text-zinc-600" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  Edit project details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500 focus:bg-red-50"
                  onSelect={(e) => e.preventDefault()}
                >
                  <DeleteProjectDialog
                    projectId={project.id}
                    projectName={project.name}
                    onSuccess={handleProjectDeleted}
                    trigger={<div className="flex items-center w-full">Delete project</div>}
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Project root = Home|Activities|Cost|Schedule|Progress; Materials & Services = Materials|Services|Manpower; Collab = same light strip with icons + underline; else Tab1–Tab5 */}
      <div className="px-6 sm:px-8 border-t border-zinc-200 bg-zinc-50/50">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {isProjectRoot ? (
            <>
              {(
                [
                  { key: "home", label: "Home", Icon: LayoutDashboard },
                  { key: "activities", label: "Activities", Icon: Activity },
                  { key: "register", label: "WP & Activities", Icon: ListTree },
                  { key: "cost", label: "Cost", Icon: DollarSign },
                  { key: "schedule", label: "Schedule", Icon: Calendar },
                  { key: "progress", label: "Progress", Icon: TrendingUp },
                ] as const
              ).map((tab) => (
                <a
                  key={tab.key}
                  href={`/projects/${projectId}#${tab.key}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = tab.key;
                    setWbsTabHash(tab.key);
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                  }}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all flex items-center gap-2 ${activeWbsTab === tab.key
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  <tab.Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </a>
              ))}
            </>
          ) : showMaterialsServicesTabs ? (
            <>
              <Link href={`/projects/${projectId}/materials-services/materials`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all flex items-center gap-2 ${location.includes("/materials-services/materials") || (location.includes("/materials-services") && !location.includes("/materials-services/services") && !location.includes("/materials-services/manpower") && !location.includes("/materials-services/equipment"))
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  <Package className="h-4 w-4" />
                  Materials
                </a>
              </Link>
              <Link href={`/projects/${projectId}/materials-services/services`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all flex items-center gap-2 ${location.includes("/materials-services/services")
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  <Wrench className="h-4 w-4" />
                  Services
                </a>
              </Link>
              <Link href={`/projects/${projectId}/resources`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all flex items-center gap-2 ${isResourcesRoute
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  <Users className="h-4 w-4" />
                  Manpower &amp; Equipment
                </a>
              </Link>
            </>
          ) : routeContext === "collab" ? (
            <>
              {[
                { key: "all", hash: "all", label: "All Chats", Icon: LayoutDashboard },
                { key: "pinned", hash: "pinned", label: "Pinned", Icon: Pin },
                { key: "quality", hash: "quality", label: "Quality", Icon: ClipboardCheck },
                { key: "safety", hash: "safety", label: "Safety", Icon: HardHat },
                { key: "issues", hash: "issues", label: "Issues", Icon: AlertTriangle },
                { key: "casual", hash: "casual", label: "Casual", Icon: Laugh },
                { key: "info", hash: "info", label: "Info", Icon: Info },
              ].map((tab) => {
                const active = (collabTabHash || "all") === tab.hash;
                const Icon = tab.Icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      window.location.hash = tab.hash;
                      setCollabTabHash(tab.hash);
                      window.dispatchEvent(new HashChangeEvent("hashchange"));
                    }}
                    className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all flex items-center gap-2 ${active
                        ? "border-zinc-900 text-zinc-900"
                        : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                      }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <Link href={`/projects/${projectId}/${routeContext}/${routeContext === 'activities' ? 'activity-plan' : 'page1'}`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all ${location === `/projects/${projectId}/${routeContext}/${routeContext === 'activities' ? 'activity-plan' : 'page1'}`
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  {routeContext === 'activities' ? 'Activity Plan' : 'Tab1'}
                </a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page2`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all ${location === `/projects/${projectId}/${routeContext}/page2`
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  Activities Overview
                </a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page3`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all ${location === `/projects/${projectId}/${routeContext}/page3`
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  Plan Versions
                </a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page4`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all ${location === `/projects/${projectId}/${routeContext}/page4`
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  Dependencies
                </a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page5`}>
                <a
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-all ${location === `/projects/${projectId}/${routeContext}/page5`
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                >
                  Activities
                </a>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Import WBS Modal */}
      <ImportWbsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={project.id}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        projectId={project.id}
      />
    </div>
  );
}
