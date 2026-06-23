import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Project, WbsItem } from "@shared/schema";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
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

    if (location.includes("/kanban")) {
      return "kanban";
    }

    if (location.includes("/materials-services")) {
      return "materials-services";
    }

    // Default to 'resources' if no match found
    return 'resources';
  };

  const routeContext = getRouteContext();
  const isMaterialsServicesRoute = location.includes("/materials-services");
  const isResourcesRoute =
    (location.includes("/resources") && !location.includes("/materials-services")) ||
    location.includes("/materials-services/resources");
  const showMaterialsServicesTabs = isResourcesRoute && !location.includes("/materials-services");

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

  const tabLinkClass = (active: boolean) =>
    cn("cp-tab-underline inline-flex shrink-0 items-center gap-2", active && "cp-tab-underline--active");

  return (
    <div className="cp-inline-page-header">
      <div className="cp-inline-page-header__body">
        <div className="flex items-center justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-3">
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
              <h1 className="cp-display-md truncate">{project.name}</h1>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsEditModalOpen(true)}
              >
                <PencilIcon className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="sr-only">Edit</span>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 kanban-body-sm text-[var(--text-secondary)]">
              <span className="font-mono">
                Budget: {formatCurrency(Number(project.budget), project.currency || "USD")}
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
              <span>
                Timeline: {formatDate(project.startDate ?? undefined)} — {formatDate(project.endDate ?? undefined)}
              </span>
              <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
              <span
                className={cn(
                  "cp-badge inline-flex items-center gap-1.5",
                  status.status === "On Track"
                    ? "cp-badge--success"
                    : status.status === "Behind Schedule"
                      ? "cp-badge--warning"
                      : "cp-badge--danger"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", status.color)} />
                {status.status}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              Import WBS
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5 text-[var(--text-secondary)]" />
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

      <div className="cp-inline-page-header__tabs">
        <nav className="cp-tabs-underline flex gap-1 overflow-x-auto">
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
                  className={tabLinkClass(activeWbsTab === tab.key)}
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
                  className={tabLinkClass(
                    location.includes("/materials-services/materials") ||
                      (location.includes("/materials-services") &&
                        !location.includes("/materials-services/services") &&
                        !location.includes("/materials-services/manpower") &&
                        !location.includes("/materials-services/equipment"))
                  )}
                >
                  <Package className="h-4 w-4" />
                  Materials
                </a>
              </Link>
              <Link href={`/projects/${projectId}/materials-services/services`}>
                <a className={tabLinkClass(location.includes("/materials-services/services"))}>
                  <Wrench className="h-4 w-4" />
                  Services
                </a>
              </Link>
              <Link href={`/projects/${projectId}/materials-services/resources`}>
                <a className={tabLinkClass(location.includes("/materials-services/resources") || isResourcesRoute)}>
                  <Users className="h-4 w-4" />
                  Manpower &amp; Equipment
                </a>
              </Link>
            </>
          ) : routeContext === "collab" ? (
            <span className={cn(tabLinkClass(true), "cursor-default")}>Collaboration Hub</span>
          ) : routeContext === "kanban" ? (
            <span className={cn(tabLinkClass(true), "cursor-default")}>Kanban</span>
          ) : routeContext === "materials-services" ? (
            <span className={cn(tabLinkClass(true), "cursor-default")}>Materials &amp; Resources</span>
          ) : (
            <>
              <Link href={`/projects/${projectId}/${routeContext}/${routeContext === "activities" ? "activity-plan" : "page1"}`}>
                <a
                  className={tabLinkClass(
                    location === `/projects/${projectId}/${routeContext}/${routeContext === "activities" ? "activity-plan" : "page1"}`
                  )}
                >
                  {routeContext === "activities" ? "Activity Plan" : "Tab1"}
                </a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page2`}>
                <a className={tabLinkClass(location === `/projects/${projectId}/${routeContext}/page2`)}>
                  Activities Overview
                </a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page3`}>
                <a className={tabLinkClass(location === `/projects/${projectId}/${routeContext}/page3`)}>Plan Versions</a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page4`}>
                <a className={tabLinkClass(location === `/projects/${projectId}/${routeContext}/page4`)}>Dependencies</a>
              </Link>
              <Link href={`/projects/${projectId}/${routeContext}/page5`}>
                <a className={tabLinkClass(location === `/projects/${projectId}/${routeContext}/page5`)}>Activities</a>
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
