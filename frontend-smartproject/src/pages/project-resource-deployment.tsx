import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Truck,
  Briefcase,
  Layers,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SideNavigation } from "@/components/project/side-navigation";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: number;
  name: string;
  code?: string;
}

interface WBSItem {
  id: number;
  name: string;
  code?: string;
  parentId?: number | null;
}

interface WorkPackage {
  id: number;
  name: string;
  code?: string;
  wbsItemId?: number;
  durationDays?: number;
}

interface RequiredResource {
  id: number;
  resourceId?: number;
  resourceName?: string;
  resourceType?: string;
  quantity?: number;
  unitRate?: string;
}

interface AvailableEmployee {
  id: number;
  employeeNumber: string;
  empFirstName: string;
  empLastName: string;
  empPosition: string;
  empTrade: string;
  mappedResourceId?: number;
}

interface AvailableRentalManpower {
  id: number;
  employeeNumber: string;
  empFirstName: string;
  empLastName: string;
  empPosition: string;
  empTrade: string;
  mappedResourceId?: number;
}

interface AvailableEquipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  capacity?: string;
  mappedResourceId?: number;
}

interface AvailableRentalEquipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  model?: string;
  mappedResourceId?: number;
}

interface ResourceDeployment {
  id: number;
  projectId: number;
  wbsId: number;
  wpId: number;
  resourceId: number;
  entityType: string;
  entityId: number;
  entityName: string;
  assignedMonth: string;
  assignedHours: number;
  assignedAt: string;
}

interface DeploymentSuggestionsResponse {
  workPackage: WorkPackage;
  requiredResources: RequiredResource[];
  availableEmployees: AvailableEmployee[];
  availableRentalManpower: AvailableRentalManpower[];
  availableEquipment: AvailableEquipment[];
  availableRentalEquipment: AvailableRentalEquipment[];
  currentDeployments: ResourceDeployment[];
}

export default function ProjectResourceDeployment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedWbsId, setSelectedWbsId] = useState<string>("all");
  const [selectedWpId, setSelectedWpId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Fetch Projects
  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  // Fetch WBS Items for selected project
  const { data: wbsData } = useQuery<WBSItem[]>({
    queryKey: [`/api/projects/${selectedProjectId}/wbs`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${selectedProjectId}/wbs`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !!selectedProjectId,
  });
  const wbsItems = Array.isArray(wbsData) ? wbsData : [];

  // Fetch Work Packages for selected project
  const { data: wpData } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${selectedProjectId}/work-packages`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${selectedProjectId}/work-packages`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !!selectedProjectId,
  });
  const workPackages = Array.isArray(wpData) ? wpData : [];

  // Filter Work Packages by WBS item
  const filteredWorkPackages = workPackages.filter((wp) => {
    if (selectedWbsId === "all") return true;
    return wp.wbsItemId === Number(selectedWbsId);
  });

  // Fetch Suggestions and Deployments for selected Work Package & Month
  const { data: suggestions, isLoading: isLoadingSuggestions } = useQuery<DeploymentSuggestionsResponse>({
    queryKey: [`/api/work-packages/${selectedWpId}/deployment-suggestions`, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/deployment-suggestions?month=${selectedMonth}`);
      if (!res.ok) throw new Error("Failed to load deployment suggestions");
      return res.json();
    },
    enabled: !!selectedWpId,
  });

  // Mutation to deploy resource
  const deployMutation = useMutation({
    mutationFn: async (payload: {
      projectId: number;
      wbsId: number;
      wpId: number;
      resourceId: number;
      entityType: string;
      entityId: number;
      entityName: string;
      assignedMonth: string;
      assignedHours: number;
    }) => {
      const res = await fetch(`/api/work-packages/${payload.wpId}/deploy-resource`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to deploy resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/work-packages/${selectedWpId}/deployment-suggestions`],
      });
      toast({
        title: "Resource Deployed",
        description: "Resource deployed to work package successfully!",
      });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  // Mutation to remove deployment
  const removeMutation = useMutation({
    mutationFn: async (deploymentId: number) => {
      const res = await fetch(`/api/resource-deployments/${deploymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove deployment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/work-packages/${selectedWpId}/deployment-suggestions`],
      });
      toast({
        title: "Deployment Removed",
        description: "Resource unassigned from work package.",
      });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const activeWp = workPackages.find((wp) => wp.id === Number(selectedWpId));

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      <SideNavigation currentProjectId={selectedProjectId ? Number(selectedProjectId) : undefined} />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
                <Sparkles className="h-4 w-4" /> System-Suggested Deployment
              </div>
              <h1 className="text-2xl font-bold text-zinc-900">Project Resource Deployment</h1>
              <p className="text-sm text-zinc-500">
                Deploy active, unassigned Manpower and Equipment to Work Packages for the current month.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-700">Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Selection Controls: Project -> WBS -> Work Package */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-600" /> 1. Select Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedProjectId} onValueChange={(val) => {
                  setSelectedProjectId(val);
                  setSelectedWbsId("all");
                  setSelectedWpId("");
                }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-600" /> 2. Filter WBS Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  disabled={!selectedProjectId}
                  value={selectedWbsId}
                  onValueChange={(val) => {
                    setSelectedWbsId(val);
                    setSelectedWpId("");
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All WBS items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All WBS Items</SelectItem>
                    {wbsItems.map((wbs) => (
                      <SelectItem key={wbs.id} value={String(wbs.id)}>
                        {wbs.code ? `${wbs.code} - ` : ""}{wbs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 3. Select Work Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  disabled={!selectedProjectId || filteredWorkPackages.length === 0}
                  value={selectedWpId}
                  onValueChange={(val) => setSelectedWpId(val)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={filteredWorkPackages.length === 0 ? "No Work Packages" : "Choose Work Package..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWorkPackages.map((wp) => (
                      <SelectItem key={wp.id} value={String(wp.id)}>
                        {wp.code ? `${wp.code}: ` : ""}{wp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* If no work package selected */}
          {!selectedWpId ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-zinc-300 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-800">Select a Work Package to View Available Resources</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Pick a Project, WBS, and Work Package from the controls above. The system will calculate required resource hours and recommend available, unassigned employees and equipment for deployment.
              </p>
            </div>
          ) : isLoadingSuggestions ? (
            <div className="bg-white p-12 rounded-xl border border-zinc-200 text-center space-y-2">
              <div className="animate-spin text-primary mx-auto w-8 h-8 border-2 border-current border-t-transparent rounded-full" />
              <p className="text-sm text-zinc-500">Calculating system resource availability for {selectedMonth}...</p>
            </div>
          ) : suggestions ? (
            <div className="space-y-6">
              {/* Active Work Package Info Card */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30 mb-2">
                    Active Work Package
                  </Badge>
                  <h2 className="text-xl font-bold">{suggestions.workPackage.name}</h2>
                  <p className="text-xs text-blue-200 mt-1">
                    Code: {suggestions.workPackage.code || "WP-" + suggestions.workPackage.id} | Duration: {suggestions.workPackage.durationDays || 30} Days | Assigned Month: {selectedMonth}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                  <div className="text-center px-2">
                    <p className="text-xs text-blue-200 uppercase font-semibold">Required Types</p>
                    <p className="text-lg font-bold">{suggestions.requiredResources.length}</p>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center px-2">
                    <p className="text-xs text-blue-200 uppercase font-semibold">Available Suggestions</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {suggestions.availableEmployees.length +
                        suggestions.availableRentalManpower.length +
                        suggestions.availableEquipment.length +
                        suggestions.availableRentalEquipment.length}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center px-2">
                    <p className="text-xs text-blue-200 uppercase font-semibold">Current Deployments</p>
                    <p className="text-lg font-bold text-amber-300">{suggestions.currentDeployments.length}</p>
                  </div>
                </div>
              </div>

              {/* Required Resources Summary */}
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" /> Required Work Package Resources
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Global resource types and quantities configured for this work package.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {suggestions.requiredResources.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      No resources currently mapped to this Work Package. Add resources in Project → Work Packages to see suggestions.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {suggestions.requiredResources.map((res) => (
                        <div key={res.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-zinc-800">{res.resourceName || (res as any).name || `Resource #${res.resourceId || res.id}`}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">{(res.resourceType || (res as any).type || "Resource").replace("_", " ")}</Badge>
                          </div>
                          <p className="text-sm font-mono font-bold text-blue-700 mt-1">
                            {res.quantity || 160} Hours / Days
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggestions Tabs: Employees & Equipment */}
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" /> System Recommendations (Active & Available for {selectedMonth})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Filtered automatically: Shows active employees and equipment mapped to required global resource types who are not deployed to other projects this month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="own-emp" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="own-emp" className="gap-1.5 text-xs">
                        <Users className="h-3.5 w-3.5" /> Own Employees ({suggestions.availableEmployees.length})
                      </TabsTrigger>
                      <TabsTrigger value="rental-emp" className="gap-1.5 text-xs">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" /> Rental Manpower ({suggestions.availableRentalManpower.length})
                      </TabsTrigger>
                      <TabsTrigger value="own-equip" className="gap-1.5 text-xs">
                        <Truck className="h-3.5 w-3.5 text-amber-600" /> Own Equipment ({suggestions.availableEquipment.length})
                      </TabsTrigger>
                      <TabsTrigger value="rental-equip" className="gap-1.5 text-xs">
                        <Truck className="h-3.5 w-3.5 text-indigo-600" /> Rental Equipment ({suggestions.availableRentalEquipment.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Own Employees Content */}
                    <TabsContent value="own-emp">
                      {suggestions.availableEmployees.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-6 text-center">No unassigned active own employees available for the required resource types in {selectedMonth}.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Emp #</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Designation</TableHead>
                              <TableHead>Trade</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {suggestions.availableEmployees.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell className="font-mono text-xs font-semibold">{emp.employeeNumber}</TableCell>
                                <TableCell className="font-medium">{emp.empFirstName} {emp.empLastName}</TableCell>
                                <TableCell>{emp.empPosition}</TableCell>
                                <TableCell>{emp.empTrade}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                    <ShieldCheck className="h-3 w-3 mr-1" /> Available
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={deployMutation.isPending}
                                    onClick={() =>
                                      deployMutation.mutate({
                                        projectId: Number(selectedProjectId),
                                        wbsId: Number(selectedWbsId === "all" ? 0 : selectedWbsId),
                                        wpId: Number(selectedWpId),
                                        resourceId: Number(emp.mappedResourceId || 0),
                                        entityType: "employee",
                                        entityId: emp.id,
                                        entityName: `${emp.empFirstName} ${emp.empLastName} (${emp.employeeNumber})`,
                                        assignedMonth: selectedMonth,
                                        assignedHours: 160,
                                      })
                                    }
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Deploy
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    {/* Rental Manpower Content */}
                    <TabsContent value="rental-emp">
                      {suggestions.availableRentalManpower.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-6 text-center">No unassigned active rental manpower available for {selectedMonth}.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Emp #</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Trade</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {suggestions.availableRentalManpower.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell className="font-mono text-xs font-semibold">{emp.employeeNumber}</TableCell>
                                <TableCell className="font-medium">{emp.empFirstName} {emp.empLastName}</TableCell>
                                <TableCell>{emp.empPosition}</TableCell>
                                <TableCell>{emp.empTrade}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                    <ShieldCheck className="h-3 w-3 mr-1" /> Rental Available
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={deployMutation.isPending}
                                    onClick={() =>
                                      deployMutation.mutate({
                                        projectId: Number(selectedProjectId),
                                        wbsId: Number(selectedWbsId === "all" ? 0 : selectedWbsId),
                                        wpId: Number(selectedWpId),
                                        resourceId: Number(emp.mappedResourceId || 0),
                                        entityType: "rental_manpower",
                                        entityId: emp.id,
                                        entityName: `${emp.empFirstName} ${emp.empLastName} (${emp.employeeNumber})`,
                                        assignedMonth: selectedMonth,
                                        assignedHours: 160,
                                      })
                                    }
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Deploy
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    {/* Own Equipment Content */}
                    <TabsContent value="own-equip">
                      {suggestions.availableEquipment.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-6 text-center">No unassigned active own equipment available for {selectedMonth}.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Capacity</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {suggestions.availableEquipment.map((eq) => (
                              <TableRow key={eq.id}>
                                <TableCell className="font-mono text-xs font-semibold">{eq.equipmentNumber}</TableCell>
                                <TableCell className="font-medium">{eq.equipmentName}</TableCell>
                                <TableCell>{eq.equipmentType}</TableCell>
                                <TableCell>{eq.capacity || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                    <ShieldCheck className="h-3 w-3 mr-1" /> Available
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                    disabled={deployMutation.isPending}
                                    onClick={() =>
                                      deployMutation.mutate({
                                        projectId: Number(selectedProjectId),
                                        wbsId: Number(selectedWbsId === "all" ? 0 : selectedWbsId),
                                        wpId: Number(selectedWpId),
                                        resourceId: Number(eq.mappedResourceId || 0),
                                        entityType: "equipment",
                                        entityId: eq.id,
                                        entityName: `${eq.equipmentName} (${eq.equipmentNumber})`,
                                        assignedMonth: selectedMonth,
                                        assignedHours: 160,
                                      })
                                    }
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Deploy
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    {/* Rental Equipment Content */}
                    <TabsContent value="rental-equip">
                      {suggestions.availableRentalEquipment.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-6 text-center">No unassigned active rental equipment available for {selectedMonth}.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Model</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {suggestions.availableRentalEquipment.map((req) => (
                              <TableRow key={req.id}>
                                <TableCell className="font-mono text-xs font-semibold">{req.equipmentNumber}</TableCell>
                                <TableCell className="font-medium">{req.equipmentName}</TableCell>
                                <TableCell>{req.equipmentType}</TableCell>
                                <TableCell>{req.model || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                                    <ShieldCheck className="h-3 w-3 mr-1" /> Rental Available
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                    disabled={deployMutation.isPending}
                                    onClick={() =>
                                      deployMutation.mutate({
                                        projectId: Number(selectedProjectId),
                                        wbsId: Number(selectedWbsId === "all" ? 0 : selectedWbsId),
                                        wpId: Number(selectedWpId),
                                        resourceId: Number(req.mappedResourceId || 0),
                                        entityType: "rental_equipment",
                                        entityId: req.id,
                                        entityName: `${req.equipmentName} (${req.equipmentNumber})`,
                                        assignedMonth: selectedMonth,
                                        assignedHours: 160,
                                      })
                                    }
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Deploy
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Current Month Deployed Resources Table */}
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-zinc-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Active Deployments on Work Package ({selectedMonth})
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                      {suggestions.currentDeployments.length} Deployed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suggestions.currentDeployments.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs">
                      No resources currently deployed to this Work Package for {selectedMonth}. Click "Deploy" above to assign available resources.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Assigned Month</TableHead>
                          <TableHead>Assigned Hours</TableHead>
                          <TableHead>Date Assigned</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestions.currentDeployments.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium text-zinc-900">{d.entityName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {d.entityType.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{d.assignedMonth}</TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-blue-700">{d.assignedHours} Hrs</TableCell>
                            <TableCell className="text-xs text-zinc-500">{new Date(d.assignedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={removeMutation.isPending}
                                onClick={() => removeMutation.mutate(d.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Unassign
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
