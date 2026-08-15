import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn, formatCurrency } from "@/lib/utils";
import { MsrPageHeader } from "@/components/materials-resources/msr-page-header";
import { MaterialsListPanel } from "@/components/materials-resources/materials-list-panel";
import { ResourcesListPanel } from "@/components/materials-resources/resources-list-panel";
import { WorkPackagesPanel } from "@/components/materials-resources/work-packages-panel";
import { MaterialFormDrawer } from "@/components/materials-resources/material-form-drawer";
import { MaterialDetailPanel } from "@/components/materials-resources/material-detail-panel";
import { BulkUploadModal } from "@/components/materials-resources/bulk-upload-modal";
import type {
  MaterialItem,
  ServiceItem,
  WorkPackageItem,
  GlobalResourceItem,
  ProjectResourceAssignment,
  SortKey,
  MsrTabKey,
  ResourceType,
} from "@/components/materials-resources/constants";
import { fetchProjectWorkPackages } from "@/components/materials-resources/constants";

type TabKey = "materials" | "services" | "resources";

export default function ProjectMaterialsServices() {
  const { projectId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("materials");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const pendingDropRef = useRef<{
    type: string;
    item: MaterialItem | ServiceItem;
    wpId: number;
    baseRate: number;
  } | null>(null);

  const [resourceAssignOpen, setResourceAssignOpen] = useState(false);
  const [pendingResource, setPendingResource] = useState<GlobalResourceItem | null>(null);
  const [pendingResourceWpId, setPendingResourceWpId] = useState<number | null>(null);
  const [resourceDateRange, setResourceDateRange] = useState<DateRange | null>(null);
  const [resourceQuantity, setResourceQuantity] = useState("1");
  const [editingResource, setEditingResource] = useState<ProjectResourceAssignment | null>(null);
  const [resourceEditOpen, setResourceEditOpen] = useState(false);

  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
  const [materialDrawerMode, setMaterialDrawerMode] = useState<"add" | "edit">("add");
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<{
    type: "material" | "service";
    id: number;
    quantity: string;
    baseRate: number;
  } | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const match = location.match(/\/projects\/\d+\/materials-services(?:\/(materials|services|resources))?/);
    const tab = (match && match[1]) as TabKey | undefined;
    if (tab === "materials" || tab === "services" || tab === "resources") {
      setActiveTab(tab);
    } else if (match && projectId) {
      setLocation(`/projects/${projectId}/materials-services/materials`);
    }
  }, [location, projectId, setLocation]);

  useEffect(() => {
    setSearchTerm("");
    setCategoryFilter("All");
    setResourceTypeFilter("all");
    setSelectedItemId(null);
  }, [activeTab]);

  const { data: project } = useQuery<{ name: string }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const {
    data: workPackages = [],
    isLoading: workPackagesLoading,
    isError: workPackagesError,
    refetch: refetchWorkPackages,
    isFetching: workPackagesFetching,
  } = useQuery<WorkPackageItem[]>({
    queryKey: ["work-packages", projectId],
    queryFn: () => fetchProjectWorkPackages(projectId ?? ""),
    enabled: !!projectId,
    retry: 2,
  });

  const { data: wbsItems = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", projectId, "wbs"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/wbs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: materialsList = [], isLoading: materialsLoading, refetch: refetchMaterials, isFetching: materialsFetching } =
    useQuery<MaterialItem[]>({
      queryKey: ["/api/material-masters"],
      queryFn: async () => {
        const res = await fetch("/api/material-masters");
        if (!res.ok) throw new Error("Failed to fetch materials");
        return res.json();
      },
      enabled: !!projectId && activeTab === "materials",
    });

  const { data: servicesList = [], isLoading: servicesLoading, refetch: refetchServices, isFetching: servicesFetching } =
    useQuery<ServiceItem[]>({
      queryKey: ["/api/service-masters"],
      queryFn: async () => {
        const res = await fetch("/api/service-masters");
        if (!res.ok) throw new Error("Failed to fetch services");
        return res.json();
      },
      enabled: !!projectId && activeTab === "services",
    });

  const { data: globalResources = [], isLoading: resourcesLoading, isFetching: resourcesFetching } = useQuery<
    GlobalResourceItem[]
  >({
    queryKey: ["resources"],
    queryFn: () => get("/resources"),
    enabled: !!projectId && activeTab === "resources",
    select: (data) => data.filter((r) => r.type !== ("material" as ResourceType)),
  });

  const { data: wpMaterials = [] } = useQuery<any[]>({
    queryKey: selectedWpId ? ["wp-materials", selectedWpId] : ["project-wp-materials", projectId],
    queryFn: async () => {
      if (selectedWpId) {
        const res = await fetch(`/api/work-packages/${selectedWpId}/materials`);
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }
      const res = await fetch(`/api/projects/${projectId}/work-package-materials`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: wpServices = [] } = useQuery<any[]>({
    queryKey: selectedWpId ? ["wp-services", selectedWpId] : ["project-wp-services", projectId],
    queryFn: async () => {
      if (selectedWpId) {
        const res = await fetch(`/api/work-packages/${selectedWpId}/services`);
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }
      const res = await fetch(`/api/projects/${projectId}/work-package-services`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: wpResources = [] } = useQuery<ProjectResourceAssignment[]>({
    queryKey: selectedWpId === null ? ["all-project-resources", projectId] : ["wp-resources", selectedWpId],
    queryFn: async () => {
      if (selectedWpId === null) {
        const response = await fetch(`/api/projects/${projectId}/resources`);
        if (!response.ok) throw new Error("Failed to fetch resources");
        return response.json();
      }
      const response = await fetch(`/api/work-packages/${selectedWpId}/resources`);
      if (!response.ok) throw new Error("Failed to fetch resources");
      return response.json();
    },
    enabled: !!projectId,
  });

  const displayedMaterials = useMemo(
    () => wpMaterials.filter((r) => selectedWpId == null || r.wpId === selectedWpId),
    [wpMaterials, selectedWpId]
  );
  const displayedServices = useMemo(
    () => wpServices.filter((r) => selectedWpId == null || r.wpId === selectedWpId),
    [wpServices, selectedWpId]
  );
  const displayedResources = useMemo(
    () => wpResources.filter((r) => selectedWpId == null || r.wpId === selectedWpId),
    [wpResources, selectedWpId]
  );

  const allocatedMaterialIds = useMemo(() => {
    const ids = new Set<number>();
    wpMaterials.forEach((r) => { if (r.materialId) ids.add(r.materialId); });
    return ids;
  }, [wpMaterials]);

  const allocatedServiceIds = useMemo(() => {
    const ids = new Set<number>();
    wpServices.forEach((r) => { if (r.serviceId) ids.add(r.serviceId); });
    return ids;
  }, [wpServices]);

  const allocatedResourceIds = useMemo(() => {
    const ids = new Set<number>();
    wpResources.forEach((r) => { if (r.globalResourceId) ids.add(r.globalResourceId); });
    return ids;
  }, [wpResources]);

  const invalidateMaterials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["wp-materials", selectedWpId] });
    queryClient.invalidateQueries({ queryKey: ["project-wp-materials", projectId] });
  }, [queryClient, selectedWpId, projectId]);

  const invalidateServices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["wp-services", selectedWpId] });
    queryClient.invalidateQueries({ queryKey: ["project-wp-services", projectId] });
  }, [queryClient, selectedWpId, projectId]);

  const invalidateProjectResources = useCallback(() => {
    if (selectedWpId !== null) {
      queryClient.invalidateQueries({ queryKey: ["wp-resources", selectedWpId] });
    }
    queryClient.invalidateQueries({ queryKey: ["all-project-resources", projectId] });
  }, [queryClient, selectedWpId, projectId]);

  const addMaterialMutation = useMutation({
    mutationFn: async (data: { wpId: number; materialId: number; quantity: string; estimatedValue: string }) =>
      apiRequest("POST", `/api/projects/${projectId}/work-package-materials`, data),
    onSuccess: () => {
      invalidateMaterials();
      toast({ title: "Material added", description: "Estimated value consumes from work package budget." });
      setIsQuantityDialogOpen(false);
      pendingDropRef.current = null;
      setQuantity("1");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: { wpId: number; serviceId: number; quantity: string; estimatedValue: string }) =>
      apiRequest("POST", `/api/projects/${projectId}/work-package-services`, data),
    onSuccess: () => {
      invalidateServices();
      toast({ title: "Service added", description: "Estimated value consumes from work package budget." });
      setIsQuantityDialogOpen(false);
      pendingDropRef.current = null;
      setQuantity("1");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/work-package-materials/${id}`),
    onSuccess: () => { invalidateMaterials(); toast({ title: "Material removed" }); },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/work-package-services/${id}`),
    onSuccess: () => { invalidateServices(); toast({ title: "Service removed" }); },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, quantity, estimatedValue }: { id: number; quantity: string; estimatedValue: string }) =>
      apiRequest("PATCH", `/api/work-package-materials/${id}`, { quantity, estimatedValue }),
    onSuccess: () => {
      invalidateMaterials();
      toast({ title: "Material updated" });
      setEditDialogOpen(false);
      setEditingRow(null);
    },
    onError: (e: Error) => toast({ title: "Error updating material", description: e.message, variant: "destructive" }),
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, quantity, estimatedValue }: { id: number; quantity: string; estimatedValue: string }) =>
      apiRequest("PATCH", `/api/work-package-services/${id}`, { quantity, estimatedValue }),
    onSuccess: () => {
      invalidateServices();
      toast({ title: "Service updated" });
      setEditDialogOpen(false);
      setEditingRow(null);
    },
    onError: (e: Error) => toast({ title: "Error updating service", description: e.message, variant: "destructive" }),
  });

  const createResourceMutation = useMutation({
    mutationFn: (data: Partial<ProjectResourceAssignment>) => post(`/projects/${projectId}/resources`, data),
    onSuccess: () => {
      invalidateProjectResources();
      toast({ title: "Resource assigned to work package" });
      setResourceAssignOpen(false);
      setPendingResource(null);
      setPendingResourceWpId(null);
      setResourceDateRange(null);
      setResourceQuantity("1");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectResourceAssignment> }) =>
      put(`/projects/${projectId}/resources/${id}`, data),
    onSuccess: () => {
      invalidateProjectResources();
      toast({ title: "Resource updated" });
      setResourceEditOpen(false);
      setEditingResource(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => del(`/projects/${projectId}/resources/${id}`),
    onSuccess: () => {
      invalidateProjectResources();
      toast({ title: "Resource removed from work package" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/onboard-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearExisting: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Onboarding failed");
      }
      return res.json();
    },
    onSuccess: (result: { assignmentsCreated: number; resourcesProcessed: number; deficiencies?: unknown[] }) => {
      invalidateProjectResources();
      toast({
        title: "Resources onboarded",
        description: `${result.assignmentsCreated} daily assignments across ${result.resourcesProcessed} planned lines.`,
      });
    },
    onError: (e: Error) => toast({ title: "Onboarding failed", description: e.message, variant: "destructive" }),
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => apiRequest("POST", "/api/material-masters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: "Material created" });
      setMaterialDrawerOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMaterialMasterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, string> }) =>
      apiRequest("PATCH", `/api/material-masters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: "Material updated" });
      setMaterialDrawerOpen(false);
      setDetailPanelOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMaterialMasterMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/material-masters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: "Material deleted" });
      setMaterialDrawerOpen(false);
      setDetailPanelOpen(false);
      setSelectedItemId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleDragStart = (e: React.DragEvent, item: MaterialItem | ServiceItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ item, tab: activeTab }));
  };

  const handleResourceDragStart = (e: React.DragEvent, item: GlobalResourceItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ item, tab: "resources" }));
  };

  const handleDrop = (e: React.DragEvent, wpId: number) => {
    e.preventDefault();
    setSelectedWpId(wpId);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const { item, tab } = JSON.parse(raw);
      if (tab === "resources") {
        const resource = item as GlobalResourceItem;
        const exists = wpResources.some((r) => r.globalResourceId === resource.id && r.wpId === wpId);
        if (exists) {
          toast({ title: "Already assigned", description: "This resource is already on this work package.", variant: "destructive" });
          return;
        }
        setPendingResource(resource);
        setPendingResourceWpId(wpId);
        setResourceQuantity("1");
        setResourceDateRange(null);
        setResourceAssignOpen(true);
        return;
      }
      const baseRate = Number(item.baseRate ?? 0);
      pendingDropRef.current = {
        type: tab,
        item,
        wpId,
        baseRate,
      };
      setQuantity("1");
      setIsQuantityDialogOpen(true);
    } catch {
      /* ignore */
    }
  };

  const handleQuantityConfirm = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const pending = pendingDropRef.current;
    if (!pending) return;
    const est = (qty * pending.baseRate).toFixed(2);
    if (pending.type === "material" || pending.type === "materials") {
      addMaterialMutation.mutate({
        wpId: pending.wpId,
        materialId: pending.item.id,
        quantity: String(qty),
        estimatedValue: est,
      });
    } else {
      addServiceMutation.mutate({
        wpId: pending.wpId,
        serviceId: pending.item.id,
        quantity: String(qty),
        estimatedValue: est,
      });
    }
  };

  const isManpowerType = (type?: string | null): boolean => {
    if (!type) return false;
    const t = type.toLowerCase();
    return t === "manpower" || t === "rental_manpower" || t.includes("manpower");
  };

  const isEquipmentType = (type?: string | null): boolean => {
    if (!type) return false;
    const t = type.toLowerCase();
    return t === "equipment" || t === "rental_equipment" || t === "tools" || t.includes("equipment");
  };

  const isValidManpowerHours = (qty: number): boolean => {
    if (isNaN(qty) || qty <= 0) return false;
    return qty % 8 === 0 || qty % 10 === 0 || qty % 12 === 0;
  };

  const handleResourceAssignConfirm = () => {
    if (!pendingResource || pendingResourceWpId == null) return;
    if (!resourceDateRange?.from || !resourceDateRange?.to) {
      toast({ title: "Dates required", description: "Select planned start and end dates.", variant: "destructive" });
      return;
    }
    const qty = parseFloat(resourceQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }

    if (isManpowerType(pendingResource.type) && !isValidManpowerHours(qty)) {
      toast({
        title: "Invalid Manpower Shift Hours",
        description: "Manpower quantity must be in shift multiples of 8, 10, or 12 hours (e.g. 8, 10, 12, 16, 20, 24, 30, 32, 40, 48 hrs).",
        variant: "destructive",
      });
      return;
    }

    createResourceMutation.mutate({
      wpId: pendingResourceWpId,
      globalResourceId: pendingResource.id,
      name: pendingResource.name,
      description: pendingResource.description,
      type: pendingResource.type,
      unitOfMeasure: pendingResource.unitOfMeasure,
      unitRate: pendingResource.unitRate,
      quantity: resourceQuantity,
      remarks: pendingResource.remarks,
      plannedStartDate: format(resourceDateRange.from, "yyyy-MM-dd"),
      plannedEndDate: format(resourceDateRange.to, "yyyy-MM-dd"),
    });
  };

  const handleOpenEdit = (type: "material" | "service", r: { id: number; quantity: string; baseRate?: string | number }) => {
    setEditingRow({ type, id: r.id, quantity: String(r.quantity), baseRate: Number(r.baseRate ?? 0) });
    setEditQuantity(String(r.quantity));
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editingRow) return;
    const qty = parseFloat(editQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const estimatedValue = (qty * editingRow.baseRate).toFixed(2);
    if (editingRow.type === "material") {
      updateMaterialMutation.mutate({ id: editingRow.id, quantity: editQuantity, estimatedValue });
    } else {
      updateServiceMutation.mutate({ id: editingRow.id, quantity: editQuantity, estimatedValue });
    }
  };

  const handleRefresh = () => {
    refetchWorkPackages();
    if (activeTab === "materials") refetchMaterials();
    else if (activeTab === "services") refetchServices();
  };

  const handleBulkUpload = async (rows: Record<string, string>[]) => {
    const endpoint =
      activeTab === "materials" ? "/api/material-masters/bulk-upload" : "/api/service-masters/bulk-upload";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvData: rows }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Bulk upload failed");
    }
    const data = await res.json();
    queryClient.invalidateQueries({
      queryKey: activeTab === "materials" ? ["/api/material-masters"] : ["/api/service-masters"],
    });
    return { created: data.created ?? rows.length, errors: data.errors };
  };

  const selectedMaterial = materialsList.find((m) => m.id === selectedItemId) ?? null;

  const materialAssignments = useMemo(() => {
    if (!selectedMaterial) return [];
    return wpMaterials
      .filter((r) => r.materialId === selectedMaterial.id)
      .map((r) => {
        const wp = workPackages.find((w) => w.id === r.wpId);
        return { wpName: wp?.name ?? `WP ${r.wpId}`, quantity: r.quantity, amount: r.estimatedValue };
      });
  }, [selectedMaterial, wpMaterials, workPackages]);

  const allocatedQtyForSelected = materialAssignments.reduce((s, a) => s + Number(a.quantity), 0);
  const msrTab: MsrTabKey = activeTab;

  const panelAssignments =
    activeTab === "materials" ? displayedMaterials : activeTab === "services" ? displayedServices : displayedResources;

  const refreshing =
    workPackagesFetching ||
    (activeTab === "materials" && materialsFetching) ||
    (activeTab === "services" && servicesFetching) ||
    (activeTab === "resources" && resourcesFetching);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] flex-col overflow-hidden bg-[var(--bg-cream)]">
      <MsrPageHeader
        projectId={projectId ?? ""}
        projectName={project?.name}
        activeTab={msrTab}
        materialsCount={materialsList.length}
        servicesCount={servicesList.length}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        onBulkUpload={() => setBulkModalOpen(true)}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        hideBulkUpload={activeTab === "resources"}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 pb-6 lg:grid-cols-2 lg:overflow-hidden lg:px-8">
        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          {activeTab === "resources" ? (
            <ResourcesListPanel
              items={globalResources}
              search={debouncedSearch}
              typeFilter={resourceTypeFilter}
              onTypeFilter={setResourceTypeFilter}
              sortKey={sortKey}
              onSortChange={setSortKey}
              selectedId={selectedItemId}
              onSelect={setSelectedItemId}
              onDragStart={handleResourceDragStart}
              allocatedIds={allocatedResourceIds}
              loading={resourcesLoading}
            />
          ) : (
            <MaterialsListPanel
              mode={activeTab}
              items={activeTab === "materials" ? materialsList : servicesList}
              search={debouncedSearch}
              categoryFilter={categoryFilter}
              onCategoryFilter={setCategoryFilter}
              onClearSearch={() => setSearchTerm("")}
              sortKey={sortKey}
              onSortChange={setSortKey}
              selectedId={selectedItemId}
              onSelect={(id) => {
                setSelectedItemId(id);
                if (activeTab === "materials") setDetailPanelOpen(true);
              }}
              onAdd={() => {
                if (activeTab === "materials") {
                  setMaterialDrawerMode("add");
                  setMaterialDrawerOpen(true);
                }
              }}
              onDragStart={handleDragStart}
              allocatedIds={activeTab === "materials" ? allocatedMaterialIds : allocatedServiceIds}
              loading={activeTab === "materials" ? materialsLoading : servicesLoading}
            />
          )}
        </div>

        <div className="flex min-h-[360px] min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
          <WorkPackagesPanel
            mode={activeTab}
            workPackages={workPackages}
            wbsItems={wbsItems}
            selectedWpId={selectedWpId}
            onSelectWp={setSelectedWpId}
            assignments={panelAssignments}
            wpMaterials={wpMaterials}
            wpServices={wpServices}
            wpResources={wpResources}
            loading={workPackagesLoading}
            error={workPackagesError}
            onRetry={() => refetchWorkPackages()}
            onDrop={handleDrop}
            onEditQty={(r) => handleOpenEdit(activeTab === "materials" ? "material" : "service", r)}
            onEditResource={(r) => {
              setEditingResource(r as any);
              setResourceEditOpen(true);
            }}
            onDelete={(id) => {
              if (activeTab === "materials") deleteMaterialMutation.mutate(id);
              else if (activeTab === "services") deleteServiceMutation.mutate(id);
              else deleteResourceMutation.mutate(id);
            }}
            onOnboard={activeTab === "resources" ? () => onboardMutation.mutate() : undefined}
            onboarding={onboardMutation.isPending}
            projectId={projectId ?? ""}
          />
        </div>
      </div>

      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            {pendingDropRef.current && (
              <p className="kanban-body-sm text-[var(--text-secondary)]">
                Estimated value = {quantity || "0"} × {formatCurrency(pendingDropRef.current.baseRate)} (consumes WP budget).
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleQuantityConfirm}
                disabled={!quantity || parseFloat(quantity) <= 0 || addMaterialMutation.isPending || addServiceMutation.isPending}
              >
                Add
              </Button>
              <Button variant="outline" onClick={() => { setIsQuantityDialogOpen(false); pendingDropRef.current = null; }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resourceAssignOpen} onOpenChange={setResourceAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign resource to work package</DialogTitle>
          </DialogHeader>
          {pendingResource && (
            <div className="space-y-4 py-4">
              <p className="kanban-body-md font-medium">{pendingResource.name}</p>
              <p className="kanban-body-sm capitalize text-[var(--text-secondary)]">
                {pendingResource.type.replace(/_/g, " ")} · {formatCurrency(Number(pendingResource.unitRate))} / {pendingResource.unitOfMeasure}
              </p>
              <div>
                <Label>Quantity ({pendingResource.unitOfMeasure || "Hours"})</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={resourceQuantity}
                  onChange={(e) => setResourceQuantity(e.target.value)}
                  className="mt-1"
                />
                {isManpowerType(pendingResource.type) && (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[11px] font-medium text-[var(--text-secondary)]">Shift hour presets (multiples of 8, 10, or 12 hrs):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[8, 10, 12, 16, 20, 24, 30, 32, 40, 48].map((h) => (
                        <button
                          key={h}
                          type="button"
                          className={cn(
                            "px-2 py-1 text-xs font-mono rounded border transition-colors",
                            Number(resourceQuantity) === h
                              ? "bg-[var(--copper-500)] text-white border-[var(--copper-600)] font-bold"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                          )}
                          onClick={() => setResourceQuantity(String(h))}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isEquipmentType(pendingResource.type) && Number(resourceQuantity) > 0 && Number(resourceQuantity) < 8 && (
                  <div className="mt-2.5 rounded-md border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                      <span>⚠️</span> Short Duration Equipment Notice (&lt; 8 hours)
                    </div>
                    <p>
                      Assigning less than 8 hours. Please verify equipment can be mobilized for short durations and confirm whether assigned hours include mob/demob and setup time.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label>Planned date range</Label>
                <DateRangePicker
                  value={resourceDateRange ?? undefined}
                  onChange={setResourceDateRange}
                  placeholder="Select start and end dates"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleResourceAssignConfirm}
                  disabled={!resourceDateRange?.from || !resourceDateRange?.to || createResourceMutation.isPending}
                >
                  Confirm assignment
                </Button>
                <Button variant="outline" onClick={() => setResourceAssignOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={resourceEditOpen} onOpenChange={(open) => { setResourceEditOpen(open); if (!open) setEditingResource(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit resource assignment</DialogTitle>
          </DialogHeader>
          {editingResource && (
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const qtyStr = fd.get("quantity") as string;
                const qty = parseFloat(qtyStr);
                if (isManpowerType(editingResource.type) && !isValidManpowerHours(qty)) {
                  toast({
                    title: "Invalid Manpower Shift Hours",
                    description: "Manpower quantity must be in shift multiples of 8, 10, or 12 hours (e.g. 8, 10, 12, 16, 20, 24, 30, 32, 40, 48 hrs).",
                    variant: "destructive",
                  });
                  return;
                }
                updateResourceMutation.mutate({
                  id: editingResource.id,
                  data: {
                    quantity: qtyStr,
                    plannedStartDate: (fd.get("plannedStartDate") as string) || null,
                    plannedEndDate: (fd.get("plannedEndDate") as string) || null,
                    remarks: (fd.get("remarks") as string) || null,
                  },
                });
              }}
            >
              <p className="kanban-body-sm font-medium">{editingResource.name}</p>
              <div>
                <Label htmlFor="quantity">Quantity ({editingResource.unitOfMeasure || "Hours"})</Label>
                <Input id="quantity" name="quantity" type="number" step="0.01" defaultValue={editingResource.quantity} required />
                {isManpowerType(editingResource.type) && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Must be in shift multiples of 8, 10, or 12 hours (e.g. 8, 10, 12, 16, 20, 24, 32, 40, 48 hrs).
                  </p>
                )}
                {isEquipmentType(editingResource.type) && Number(editingResource.quantity) < 8 && (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900 space-y-0.5">
                    <div className="font-semibold text-amber-800">⚠️ Short Duration Equipment Notice (&lt; 8 hours)</div>
                    <p>Confirm equipment mobilization capability and mob/demob & setup hour inclusion.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="plannedStartDate">Start date</Label>
                  <Input id="plannedStartDate" name="plannedStartDate" type="date" defaultValue={editingResource.plannedStartDate ?? ""} />
                </div>
                <div>
                  <Label htmlFor="plannedEndDate">End date</Label>
                  <Input id="plannedEndDate" name="plannedEndDate" type="date" defaultValue={editingResource.plannedEndDate ?? ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" name="remarks" defaultValue={editingResource.remarks ?? ""} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateResourceMutation.isPending}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setResourceEditOpen(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingRow(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="0.01" step="0.01" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
            </div>
            {editingRow && (
              <p className="kanban-body-sm text-[var(--text-secondary)]">
                Estimated value = quantity × {formatCurrency(editingRow.baseRate)}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleEditSave}
                disabled={!editQuantity || parseFloat(editQuantity) <= 0 || updateMaterialMutation.isPending || updateServiceMutation.isPending}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingRow(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MaterialFormDrawer
        open={materialDrawerOpen}
        onOpenChange={setMaterialDrawerOpen}
        mode={materialDrawerMode}
        material={materialDrawerMode === "edit" ? selectedMaterial : null}
        existingCodes={materialsList.map((m) => m.materialCode)}
        saving={createMaterialMutation.isPending || updateMaterialMasterMutation.isPending}
        onSubmit={(data) => {
          if (materialDrawerMode === "add") createMaterialMutation.mutate(data);
          else if (selectedMaterial) updateMaterialMasterMutation.mutate({ id: selectedMaterial.id, data });
        }}
        onDelete={
          materialDrawerMode === "edit" && selectedMaterial
            ? () => deleteMaterialMasterMutation.mutate(selectedMaterial.id)
            : undefined
        }
      />

      <MaterialDetailPanel
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        material={selectedMaterial}
        allocatedQty={allocatedQtyForSelected}
        assignments={materialAssignments}
        onEdit={() => {
          setMaterialDrawerMode("edit");
          setMaterialDrawerOpen(true);
        }}
      />

      {activeTab !== "resources" && (
        <BulkUploadModal
          open={bulkModalOpen}
          onOpenChange={setBulkModalOpen}
          mode={activeTab}
          onUpload={handleBulkUpload}
        />
      )}
    </div>
  );
}
