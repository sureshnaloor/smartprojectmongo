import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  BarChart3,
  Clock,
  Printer,
  Sparkles,
  Layers,
  AlertCircle,
  Truck,
  Users,
  ArrowRight,
  FolderGit2,
  RefreshCw,
  ArrowLeft,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PredecessorInfo {
  predecessorId: number;
  predecessorCode: string;
  predecessorName: string;
  type: string;
  lag: number;
}

interface ActivityItem {
  id: number;
  code: string;
  name: string;
  workPackageId?: number;
  workPackageName?: string;
  duration: number;
  plannedFromDate?: string;
  plannedToDate?: string;
  earlyStartDay: number;
  earlyFinishDay: number;
  lateStartDay: number;
  lateFinishDay: number;
  totalFloatDays: number;
  isCritical: boolean;
  earlyStartDate: string;
  earlyFinishDate: string;
  lateStartDate: string;
  lateFinishDate: string;
  predecessors: PredecessorInfo[];
}

interface WbsItem {
  id: number;
  code?: string;
  name: string;
  description?: string;
}

interface WorkPackage {
  id: number;
  wbsId?: number;
  wbsItemId?: number;
  code?: string;
  name: string;
  budget?: number | string;
}

interface ProjectResource {
  id: number;
  resourceId?: number;
  resourceName: string;
  resourceType: string;
  quantity?: number;
  unitOfMeasure?: string;
}

interface ResourceDeployment {
  id: number;
  wpId?: number;
  resourceId?: number;
  resourceLabel?: string;
  resourceType?: string;
  entityType?: string;
  assignedDays?: number;
}

interface ReportData {
  project: {
    id: number;
    name: string;
    code: string;
    client: string;
    budget: number;
    startDate: string;
    targetFinishDate: string;
    durationDays: number;
    status: string;
  };
  kpis: {
    totalBudget: number;
    allocatedWpBudget: number;
    unallocatedBudget: number;
    totalWbsItems: number;
    totalWorkPackages: number;
    totalActivities: number;
    criticalActivitiesCount: number;
    projectDurationDays: number;
    startDate: string;
    targetFinishDate: string;
    totalResourcesRequired: number;
    totalActiveDeployments: number;
  };
  wbsTree: WbsItem[];
  workPackages: WorkPackage[];
  activities: ActivityItem[];
  dependencies: any[];
  criticalPath: number[];
  resources: ProjectResource[];
  deployments: ResourceDeployment[];
}

export default function ProjectConsolidatedReport() {
  const { projectId } = useParams<{ projectId: string }>();
  const pId = parseInt(projectId || "0", 10);
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: report,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<ReportData>({
    queryKey: [`/api/projects/${pId}/consolidated-report`],
    queryFn: () => fetch(`/api/projects/${pId}/consolidated-report`).then((r) => r.json()),
    enabled: !!pId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="animate-spin text-amber-600 mx-auto w-10 h-10 border-4 border-current border-t-transparent rounded-full" />
          <h2 className="text-lg font-bold text-zinc-800">Generating Master Project Report...</h2>
          <p className="text-xs text-zinc-500">Calculating CPM Early/Late dates, Float, WBS Hierarchy, and Resource Rollups.</p>
        </div>
      </div>
    );
  }

  if (!report || !report.project) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm text-center max-w-md space-y-4">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-900">Project Report Not Found</h2>
          <p className="text-xs text-zinc-500">Unable to load report metrics for Project #{pId}.</p>
          <Link href={`/projects/${pId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Project
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { project, kpis, wbsTree, workPackages, activities, resources, deployments } = report;

  // Render Sub-components for Clean Separation between Screen & Print
  const RenderExecutiveOverview = () => (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
        <BarChart3 className="h-4 w-4 text-amber-600" /> Executive Project Indicators
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">WBS Allocated Budget</p>
            <p className="text-lg font-bold text-zinc-900 mt-0.5">
              ₹{kpis.allocatedWpBudget.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Unallocated: ₹{kpis.unallocatedBudget.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Schedule Start Date</p>
            <p className="text-lg font-bold text-zinc-900 mt-0.5">{kpis.startDate}</p>
            <p className="text-[11px] text-zinc-400 mt-1">Target Finish: {kpis.targetFinishDate}</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total Activities</p>
            <p className="text-lg font-bold text-zinc-900 mt-0.5">{kpis.totalActivities}</p>
            <p className="text-[11px] text-red-600 font-semibold mt-1">
              {kpis.criticalActivitiesCount} Critical Path Activities
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Resource Deployments</p>
            <p className="text-lg font-bold text-zinc-900 mt-0.5">{kpis.totalActiveDeployments}</p>
            <p className="text-[11px] text-zinc-400 mt-1">Required Types: {kpis.totalResourcesRequired}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const RenderWbsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-600" /> Work Breakdown Structure (WBS &rarr; Work Package)
        </h2>
        <Badge variant="outline" className="text-xs">
          {wbsTree.length} WBS Items | {workPackages.length} Work Packages
        </Badge>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="w-16">Code</TableHead>
              <TableHead>WBS Item / Work Package Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Activities</TableHead>
              <TableHead>Allocated Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wbsTree.map((wbs) => {
              const childWps = workPackages.filter((wp) => wp.wbsId === wbs.id || wp.wbsItemId === wbs.id);
              return (
                <div key={`wbs-group-${wbs.id}`} className="contents">
                  <TableRow className="bg-amber-50/50 font-semibold">
                    <TableCell className="font-mono text-xs text-amber-800">{wbs.code || `WBS-${wbs.id}`}</TableCell>
                    <TableCell className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4 text-amber-600" /> {wbs.name}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">WBS Level 1</Badge>
                    </TableCell>
                    <TableCell>
                      {activities.filter((a) => childWps.some((w) => w.id === (a.workPackageId || a.wpId))).length} Acts
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-zinc-800">
                      ₹
                      {childWps
                        .reduce((acc, w) => acc + Number(w.budget || 0), 0)
                        .toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>

                  {childWps.map((wp) => {
                    const wpActs = activities.filter((a) => (a.workPackageId || a.wpId) === wp.id);
                    return (
                      <TableRow key={`wp-${wp.id}`} className="hover:bg-zinc-50">
                        <TableCell className="font-mono text-xs text-zinc-500 pl-6">{wp.code || `WP-${wp.id}`}</TableCell>
                        <TableCell className="pl-8 text-xs font-medium text-zinc-800 flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-zinc-400" /> {wp.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">Work Package</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{wpActs.length} Activities</TableCell>
                        <TableCell className="font-mono text-xs">
                          ₹{Number(wp.budget || 0).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </div>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const RenderCpmSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" /> CPM Activity Schedule Matrix (ES, EF, LS, LF, Float)
        </h2>
        <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
          {kpis.criticalActivitiesCount} Critical Path Activities
        </Badge>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="w-16">Act #</TableHead>
              <TableHead>Activity Name</TableHead>
              <TableHead>Work Package</TableHead>
              <TableHead>Predecessors</TableHead>
              <TableHead className="text-center">Dur (Days)</TableHead>
              <TableHead className="text-center">ES Date</TableHead>
              <TableHead className="text-center">EF Date</TableHead>
              <TableHead className="text-center">LS Date</TableHead>
              <TableHead className="text-center">LF Date</TableHead>
              <TableHead className="text-center">Total Float</TableHead>
              <TableHead className="text-center">Path Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((act) => (
              <TableRow
                key={`act-${act.id}`}
                className={act.isCritical ? "bg-red-50/40 hover:bg-red-50/70 font-semibold" : "hover:bg-zinc-50"}
              >
                <TableCell className="font-mono text-xs font-bold text-zinc-700">{act.code || `ACT-${act.id}`}</TableCell>
                <TableCell className="text-xs font-bold text-zinc-900">{act.name}</TableCell>
                <TableCell className="text-xs text-zinc-600">{act.workPackageName}</TableCell>
                <TableCell className="text-xs font-mono">
                  {act.predecessors.length === 0 ? (
                    <span className="text-zinc-400">&mdash;</span>
                  ) : (
                    act.predecessors.map((p) => `${p.predecessorCode} (${p.type})`).join(", ")
                  )}
                </TableCell>
                <TableCell className="text-center font-bold text-xs">{act.duration}</TableCell>
                <TableCell className="text-center font-mono text-[11px]">{act.earlyStartDate}</TableCell>
                <TableCell className="text-center font-mono text-[11px]">{act.earlyFinishDate}</TableCell>
                <TableCell className="text-center font-mono text-[11px] text-zinc-500">{act.lateStartDate}</TableCell>
                <TableCell className="text-center font-mono text-[11px] text-zinc-500">{act.lateFinishDate}</TableCell>
                <TableCell className="text-center font-mono text-xs font-bold">
                  {act.totalFloatDays}d
                </TableCell>
                <TableCell className="text-center">
                  {act.isCritical ? (
                    <Badge className="bg-red-600 text-white font-bold text-[10px] uppercase shadow-sm">
                      CRITICAL
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-zinc-600 bg-zinc-50">
                      Non-Critical
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const RenderPertSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
          <FolderGit2 className="h-4 w-4 text-amber-600" /> Activity Network Diagram (PERT / CPM Flow Chart)
        </h2>
        <p className="text-xs text-zinc-500">Visual sequence node chart showing early/late schedules and critical path links.</p>
      </div>

      <Card className="border-zinc-200 shadow-sm p-6 bg-zinc-900 text-white overflow-x-auto print:bg-white print:text-zinc-900 print:border-zinc-300">
        <div className="flex flex-col gap-6 min-w-[800px]">
          {activities.map((act) => (
            <div
              key={`pert-${act.id}`}
              className={`p-4 rounded-xl border transition-all ${
                act.isCritical
                  ? "bg-red-950/80 border-red-500 ring-2 ring-red-500 print:bg-red-50 print:border-red-600"
                  : "bg-zinc-800/80 border-zinc-700 print:bg-zinc-50 print:border-zinc-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 print:border-zinc-200 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={act.isCritical ? "bg-red-600 text-white font-bold" : "bg-zinc-700 text-zinc-200 print:bg-zinc-200 print:text-zinc-800"}>
                    {act.code || `ACT-${act.id}`}
                  </Badge>
                  <h4 className="text-sm font-bold text-white print:text-zinc-900">{act.name}</h4>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-amber-400 font-bold print:text-amber-800">Duration: {act.duration} Days</span>
                  <span className="text-zinc-400 print:text-zinc-600">Total Float: {act.totalFloatDays}d</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-black/40 print:bg-white p-2.5 rounded-lg border border-white/5 print:border-zinc-200">
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Early Start (ES)</span>
                  <span className="text-emerald-400 print:text-emerald-700 font-bold">{act.earlyStartDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Early Finish (EF)</span>
                  <span className="text-emerald-400 print:text-emerald-700 font-bold">{act.earlyFinishDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Late Start (LS)</span>
                  <span className="text-amber-300 print:text-amber-700 font-bold">{act.lateStartDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase block">Late Finish (LF)</span>
                  <span className="text-amber-300 print:text-amber-700 font-bold">{act.lateFinishDate}</span>
                </div>
              </div>

              {act.predecessors.length > 0 && (
                <div className="mt-3 text-xs text-zinc-400 print:text-zinc-700 flex items-center gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Predecessors: </span>
                  <div className="flex flex-wrap gap-1">
                    {act.predecessors.map((p) => (
                      <span key={p.predecessorId} className="bg-zinc-700 text-zinc-200 print:bg-zinc-200 print:text-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono">
                        {p.predecessorCode} ({p.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const RenderResourceDeploymentsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-600" /> Project Resource Allocation &amp; Active Deployments
        </h2>
        <Badge variant="outline" className="text-xs">
          {resources.length} Required Resource Types | {deployments.length} Active Personnel/Equipment Deployments
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 pb-3 border-b border-zinc-200">
            <CardTitle className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" /> Required Project Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {resources.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No required resources mapped to project activities.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resItem) => (
                    <TableRow key={`res-${resItem.id}`}>
                      <TableCell className="font-bold text-xs">{resItem.resourceName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {resItem.resourceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {resItem.quantity || 1} {resItem.unitOfMeasure || "Units"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 pb-3 border-b border-zinc-200">
            <CardTitle className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-600" /> Active Monthly Deployments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {deployments.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No active manpower or equipment currently deployed to work packages.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deployed Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Work Package</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((dep) => {
                    const wp = workPackages.find((w) => w.id === dep.wpId);
                    return (
                      <TableRow key={`dep-${dep.id}`}>
                        <TableCell className="font-bold text-xs">{dep.resourceLabel || `Deployment #${dep.id}`}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] capitalize">
                            {dep.entityType || "Resource"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{wp?.name || `Work Package #${dep.wpId}`}</TableCell>
                        <TableCell className="font-mono text-xs">{dep.assignedDays || 30} Days</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Screen Header Bar - Hidden in Print */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${pId}`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-zinc-600">
                <ArrowLeft className="h-4 w-4" /> Project Dashboard
              </Button>
            </Link>
            <div className="h-4 w-px bg-zinc-200" />
            <div>
              <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase font-mono">
                {project.code || `PRJ-${project.id}`}
              </span>
              <h1 className="text-base font-bold text-zinc-900 leading-tight">{project.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>

            <Button
              size="sm"
              className="gap-2 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print / Export PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Screen Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 print:hidden">
        {/* Cover / Executive Title Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-amber-950 text-white p-6 sm:p-8 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="h-4 w-4" /> Master Project Intelligence Report
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
            <p className="text-xs text-zinc-300 max-w-2xl">
              Client: <strong className="text-white">{project.client}</strong> | Project Code:{" "}
              <span className="font-mono text-amber-300 font-bold">{project.code}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 text-xs">
            <div>
              <p className="text-[10px] uppercase text-zinc-400 font-medium">Total Project Budget</p>
              <p className="text-xl font-extrabold text-amber-400">
                ₹{kpis.totalBudget.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[10px] uppercase text-zinc-400 font-medium">Critical Path Duration</p>
              <p className="text-xl font-extrabold text-emerald-400">{kpis.projectDurationDays} Days</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white p-1 rounded-xl border border-zinc-200 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-1.5 text-xs py-2">
                <BarChart3 className="h-3.5 w-3.5" /> Executive Overview
              </TabsTrigger>
              <TabsTrigger value="wbs" className="gap-1.5 text-xs py-2">
                <Layers className="h-3.5 w-3.5" /> WBS &amp; Work Packages
              </TabsTrigger>
              <TabsTrigger value="cpm" className="gap-1.5 text-xs py-2">
                <Clock className="h-3.5 w-3.5" /> CPM Schedule Matrix
              </TabsTrigger>
              <TabsTrigger value="pert" className="gap-1.5 text-xs py-2">
                <FolderGit2 className="h-3.5 w-3.5" /> Network Diagram (PERT)
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-1.5 text-xs py-2">
                <Users className="h-3.5 w-3.5" /> Resource Deployments
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Active Screen Tab View */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <RenderExecutiveOverview />
            <RenderWbsSection />
          </div>
        )}
        {activeTab === "wbs" && <RenderWbsSection />}
        {activeTab === "cpm" && <RenderCpmSection />}
        {activeTab === "pert" && <RenderPertSection />}
        {activeTab === "resources" && <RenderResourceDeploymentsSection />}
      </main>

      {/* DEDICATED PRINT CONTAINER (Triggers on window.print()) */}
      <div className="hidden print:block p-8 space-y-8 bg-white text-zinc-900">
        <div className="border-b-2 border-zinc-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-amber-700">Master Project Intelligence Report</p>
              <h1 className="text-3xl font-extrabold text-zinc-900 mt-1">{project.name}</h1>
              <p className="text-xs text-zinc-600 mt-1">
                Client: <strong>{project.client}</strong> | Project Code: <strong>{project.code || `PRJ-${project.id}`}</strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Report Date: {new Date().toLocaleDateString("en-IN")}</p>
              <p className="text-lg font-bold text-amber-700 mt-1">₹{kpis.totalBudget.toLocaleString("en-IN")}</p>
              <p className="text-xs text-emerald-700 font-bold">{kpis.projectDurationDays} Days Duration</p>
            </div>
          </div>
        </div>

        {/* Page 1: Executive Indicators & Overview */}
        <section className="space-y-6">
          <RenderExecutiveOverview />
        </section>

        {/* Page 2: WBS Breakdown */}
        <section className="pt-6 border-t border-zinc-200 page-break-before">
          <RenderWbsSection />
        </section>

        {/* Page 3: CPM Matrix */}
        <section className="pt-6 border-t border-zinc-200 page-break-before">
          <RenderCpmSection />
        </section>

        {/* Page 4: PERT Network Diagram */}
        <section className="pt-6 border-t border-zinc-200 page-break-before">
          <RenderPertSection />
        </section>

        {/* Page 5: Resource Deployments */}
        <section className="pt-6 border-t border-zinc-200 page-break-before">
          <RenderResourceDeploymentsSection />
        </section>
      </div>

      {/* Global Print CSS Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          header, nav, footer, .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          div, main, table, tr, td, th {
            overflow: visible !important;
          }
          .shadow-sm, .shadow-md, .shadow-lg {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
