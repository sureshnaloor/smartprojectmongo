import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

interface PurchaseRequisition {
  id: number;
  prNumber: string;
  prDate: string;
  requisitionType: "material" | "service" | "rental_equipment" | "tools";
  requestedBy: string | null;
  remarks: string | null;
  status: "open" | "closed";
  itemCount?: number;
  openItemCount?: number;
}

interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
}

interface MaterialMaster {
  id: number;
  materialCode: string;
  materialDescription: string;
  uom: string;
}

interface ServiceMaster {
  id: number;
  serviceCode: string;
  serviceDescription: string;
  uom: string;
}

interface RentalEquipmentMaster {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  vendorId?: number;
}

interface ToolMasterItem {
  id: number;
  toolNumber: string;
  name: string;
  toolType: string;
}

interface ProjectSummary {
  id: number;
  name: string;
}

interface WorkPackageSummary {
  id: number;
  projectId: number;
  code: string;
  name: string;
}

interface RequisitionItemInput {
  itemCode: string;
  itemDescription: string;
  quantity: string;
  requiredDate: string;
  longDescription: string;
  remarks: string;
  preferredVendorCodes: string[];
  projectId: string;
  wpId: string;
}

interface PurchaseRequisitionsPageProps {
  requisitionType?: "material" | "service" | "rental_equipment" | "tools";
  pageTitle?: string;
  listTitle?: string;
  emptyHint?: string;
}

function resolveRequisitionType(
  location: string,
  override?: PurchaseRequisitionsPageProps["requisitionType"]
): "material" | "service" | "rental_equipment" | "tools" {
  if (override) return override;
  if (location.startsWith("/service-master")) return "service";
  if (
    location.startsWith("/equipment-master/rental-pr") ||
    location.startsWith("/equipment-master/purchase-requisitions")
  ) {
    return "rental_equipment";
  }
  if (
    location.startsWith("/tool-master/purchase-requisitions") ||
    location.startsWith("/tool-master/rental-pr")
  ) {
    return "tools";
  }
  return "material";
}

export default function PurchaseRequisitionsPage({
  requisitionType: requisitionTypeProp,
  pageTitle,
  listTitle,
  emptyHint,
}: PurchaseRequisitionsPageProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  const requisitionType = resolveRequisitionType(location, requisitionTypeProp);

  const [header, setHeader] = useState({
    prNumber: "",
    prDate: new Date().toISOString().split("T")[0],
    requestedBy: "",
    remarks: "",
  });

  const [items, setItems] = useState<RequisitionItemInput[]>([
    {
      itemCode: "",
      itemDescription: "",
      quantity: "",
      requiredDate: "",
      longDescription: "",
      remarks: "",
      preferredVendorCodes: [],
      projectId: "",
      wpId: "",
    },
  ]);

  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);

  const { data: requisitions = [], isLoading } = useQuery<PurchaseRequisition[]>({
    queryKey: ["/api/purchase-requisitions", requisitionType],
    queryFn: async () => {
      const res = await fetch(
        `/api/purchase-requisitions?requisitionType=${encodeURIComponent(requisitionType)}`
      );
      if (!res.ok) throw new Error("Failed to load requisitions");
      return res.json();
    },
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendor-masters"],
    queryFn: async () => {
      const res = await fetch("/api/vendor-masters");
      if (!res.ok) throw new Error("Failed to load vendors");
      return res.json();
    },
  });

  const { data: materials = [] } = useQuery<MaterialMaster[]>({
    queryKey: ["/api/material-masters"],
    queryFn: async () => {
      const res = await fetch("/api/material-masters");
      if (!res.ok) throw new Error("Failed to load materials");
      return res.json();
    },
    enabled: requisitionType === "material",
  });

  const { data: services = [] } = useQuery<ServiceMaster[]>({
    queryKey: ["/api/service-masters"],
    queryFn: async () => {
      const res = await fetch("/api/service-masters");
      if (!res.ok) throw new Error("Failed to load services");
      return res.json();
    },
    enabled: requisitionType === "service",
  });

  const { data: rentalEquipment = [] } = useQuery<RentalEquipmentMaster[]>({
    queryKey: ["/api/rental-equipment"],
    queryFn: async () => {
      const res = await fetch("/api/rental-equipment");
      if (!res.ok) throw new Error("Failed to load rental equipment");
      return res.json();
    },
    enabled: requisitionType === "rental_equipment",
  });

  const { data: toolMasters = [] } = useQuery<ToolMasterItem[]>({
    queryKey: ["/api/tool-masters"],
    queryFn: async () => {
      const res = await fetch("/api/tool-masters");
      if (!res.ok) throw new Error("Failed to load tools");
      return res.json();
    },
    enabled: requisitionType === "tools",
  });

  const { data: projects = [] } = useQuery<ProjectSummary[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const [workPackagesByProject, setWorkPackagesByProject] = useState<
    Record<number, WorkPackageSummary[]>
  >({});

  const loadWorkPackagesForProject = async (projectId: number) => {
    if (!projectId || workPackagesByProject[projectId]) return;
    const res = await fetch(`/api/projects/${projectId}/work-packages`);
    if (!res.ok) {
      toast({ title: "Could not load work packages", variant: "destructive" });
      return;
    }
    const data = (await res.json()) as WorkPackageSummary[];
    setWorkPackagesByProject((prev) => ({ ...prev, [projectId]: data }));
  };

  const { data: selectedPrDetail, isLoading: loadingDetail } = useQuery<{
    requisition: PurchaseRequisition;
    items: Array<{
      id: number;
      lineNumber: number;
      itemCode: string;
      itemDescription: string;
      quantity: string;
      requiredDate: string | null;
      longDescription: string | null;
      remarks: string | null;
      preferredVendorCodes: string[];
      projectId: number | null;
      wpId: number | null;
      status: string;
    }>;
  } | null>({
    queryKey: ["/api/purchase-requisitions", selectedPrId],
    queryFn: async () => {
      if (!selectedPrId) return null;
      const res = await fetch(`/api/purchase-requisitions/${selectedPrId}`);
      if (!res.ok) throw new Error("Failed to load PR");
      return res.json();
    },
    enabled: !!selectedPrId,
  });

  const isEditMode = !!selectedPrId && !!selectedPrDetail;
  const canEdit = selectedPrId && selectedPrDetail?.requisition.status === "open";

  const masters =
    requisitionType === "material"
      ? materials
      : requisitionType === "service"
        ? services
        : requisitionType === "rental_equipment"
          ? rentalEquipment
          : toolMasters;

  const startNewPr = () => {
    setSelectedPrId(null);
    setHeader({
      prNumber: "",
      prDate: new Date().toISOString().split("T")[0],
      requestedBy: "",
      remarks: "",
    });
    setItems([
      {
        itemCode: "",
        itemDescription: "",
        quantity: "",
        requiredDate: "",
        longDescription: "",
        remarks: "",
        preferredVendorCodes: [],
        projectId: "",
        wpId: "",
      },
    ]);
  };

  const lastSyncedPrIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedPrId || !selectedPrDetail || loadingDetail) return;
    if (lastSyncedPrIdRef.current === selectedPrId) return;
    lastSyncedPrIdRef.current = selectedPrId;
    const pr = selectedPrDetail.requisition;
    const its = selectedPrDetail.items;
    setHeader({
      prNumber: pr.prNumber,
      prDate: pr.prDate ? new Date(pr.prDate).toISOString().split("T")[0] : "",
      requestedBy: pr.requestedBy ?? "",
      remarks: pr.remarks ?? "",
    });
    setItems(
      its.length > 0
        ? its.map((i) => ({
            itemCode: i.itemCode ?? "",
            itemDescription: i.itemDescription ?? "",
            quantity: String(i.quantity ?? ""),
            requiredDate: i.requiredDate ?? "",
            longDescription: i.longDescription ?? "",
            remarks: i.remarks ?? "",
            preferredVendorCodes: i.preferredVendorCodes ?? [],
            projectId: i.projectId != null ? String(i.projectId) : "",
            wpId: i.wpId != null ? String(i.wpId) : "",
          }))
        : [
            {
              itemCode: "",
              itemDescription: "",
              quantity: "",
              requiredDate: "",
              longDescription: "",
              remarks: "",
              preferredVendorCodes: [],
              projectId: "",
              wpId: "",
            },
          ]
    );
    for (const i of its) {
      if (i.projectId) loadWorkPackagesForProject(i.projectId);
    }
  }, [selectedPrId, selectedPrDetail, loadingDetail]);

  useEffect(() => {
    if (!selectedPrId) lastSyncedPrIdRef.current = null;
  }, [selectedPrId]);

  const updateItem = (index: number, patch: Partial<RequisitionItemInput>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  const onRentalEquipmentCodeChange = (index: number, code: string) => {
    const eq = rentalEquipment.find(
      (e) => e.equipmentNumber.toLowerCase() === code.toLowerCase()
    );
    const vendor = eq?.vendorId != null ? vendorById.get(eq.vendorId) : undefined;
    updateItem(index, {
      itemCode: code,
      itemDescription: eq?.equipmentName ?? "",
      preferredVendorCodes: vendor ? [vendor.vendorCode] : [],
    });
  };

  const onItemCodeChange = (index: number, code: string) => {
    if (requisitionType === "material") {
      const mat = materials.find(
        (m) => m.materialCode.toLowerCase() === code.toLowerCase()
      );
      updateItem(index, {
        itemCode: code,
        itemDescription: mat?.materialDescription ?? "",
      });
    } else if (requisitionType === "service") {
      const svc = services.find(
        (s) => s.serviceCode.toLowerCase() === code.toLowerCase()
      );
      updateItem(index, {
        itemCode: code,
        itemDescription: svc?.serviceDescription ?? "",
      });
    } else if (requisitionType === "rental_equipment") {
      onRentalEquipmentCodeChange(index, code);
    } else {
      const tool = toolMasters.find(
        (t) => t.toolNumber.toLowerCase() === code.toLowerCase()
      );
      updateItem(index, {
        itemCode: code,
        itemDescription: tool?.name ?? "",
      });
    }
  };

  const togglePreferredVendor = (index: number, vendorCode: string) => {
    setItems((prev) => {
      const next = [...prev];
      const codes = next[index].preferredVendorCodes;
      next[index] = {
        ...next[index],
        preferredVendorCodes: codes.includes(vendorCode)
          ? codes.filter((c) => c !== vendorCode)
          : [...codes, vendorCode],
      };
      return next;
    });
  };

  const addEmptyItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        itemCode: "",
        itemDescription: "",
        quantity: "",
        requiredDate: "",
        longDescription: "",
        remarks: "",
        preferredVendorCodes: [],
        projectId: "",
        wpId: "",
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const buildPayloadItems = () =>
    items
      .filter((i) => i.itemCode && i.quantity)
      .map((i, index) => ({
        lineNumber: index + 1,
        itemCode: i.itemCode,
        itemDescription: i.itemDescription,
        quantity: Number(i.quantity),
        requiredDate: i.requiredDate || undefined,
        longDescription: i.longDescription?.slice(0, 400) || undefined,
        remarks: i.remarks || undefined,
        preferredVendorCodes: i.preferredVendorCodes,
        projectId: i.projectId ? Number(i.projectId) : undefined,
        wpId: i.wpId ? Number(i.wpId) : undefined,
      }));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!header.prNumber || !header.prDate) {
        throw new Error("PR number and date are required.");
      }
      const body = {
        prNumber: header.prNumber,
        prDate: header.prDate,
        requisitionType,
        requestedBy: header.requestedBy || null,
        remarks: header.remarks || null,
        items: buildPayloadItems(),
      };
      const res = await apiRequest("POST", "/api/purchase-requisitions", body);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to create requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase requisition created" });
      startNewPr();
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requisitions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not save requisition", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (prId: number) => {
      const res = await apiRequest("DELETE", `/api/purchase-requisitions/${prId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to delete requisition");
      }
    },
    onSuccess: () => {
      toast({ title: "Purchase requisition deleted" });
      startNewPr();
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requisitions"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete requisition", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrId) throw new Error("No requisition selected");
      const body = {
        prNumber: header.prNumber,
        prDate: header.prDate,
        requestedBy: header.requestedBy || null,
        remarks: header.remarks || null,
        items: buildPayloadItems(),
      };
      const res = await apiRequest("PATCH", `/api/purchase-requisitions/${selectedPrId}`, body);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to update requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase requisition updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requisitions", selectedPrId] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update requisition", description: error.message, variant: "destructive" });
    },
  });

  const codeLabel =
    requisitionType === "material"
      ? "Material Code"
      : requisitionType === "service"
        ? "Service Code"
        : requisitionType === "rental_equipment"
          ? "Rental Equipment Number"
          : "Tool Number";

  const heading =
    pageTitle ??
    (requisitionType === "material"
      ? "Material Purchase Requisitions"
      : requisitionType === "service"
        ? "Service Purchase Requisitions"
        : requisitionType === "rental_equipment"
          ? "Rental Equipment Purchase Requisitions"
          : "Tool Purchase Requisitions");

  const listHeading = listTitle ?? heading;

  const emptyMessage =
    emptyHint ??
    (requisitionType === "rental_equipment"
      ? "No rental equipment requisitions yet. Add rental equipment in the master first, then create a PR."
      : requisitionType === "tools"
        ? "No tool requisitions yet. Add tools in Tool Master first, then create a PR."
        : "No requisitions yet.");

  return (
    <div className="flex flex-col gap-4 p-6 h-full min-h-0">
      <Card className="w-full flex-shrink-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-extrabold tracking-tight text-zinc-900">
            {listHeading}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={startNewPr}>
            <Plus className="h-4 w-4 mr-1" />
            New PR
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-zinc-500">Loading requisitions…</div>
          ) : requisitions.length === 0 ? (
            <div className="text-sm text-zinc-500">{emptyMessage}</div>
          ) : (
            <ScrollArea className="h-48 pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Open Lines</TableHead>
                    <TableHead className="w-[88px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitions.map((pr) => (
                    <TableRow
                      key={pr.id}
                      className={selectedPrId === pr.id ? "bg-sky-50" : "hover:bg-zinc-50"}
                    >
                      <TableCell
                        className="font-semibold cursor-pointer"
                        onClick={() => setSelectedPrId(pr.id)}
                      >
                        {pr.prNumber}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setSelectedPrId(pr.id)}>
                        {pr.prDate ? new Date(pr.prDate).toLocaleDateString() : ""}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setSelectedPrId(pr.id)}>
                        {pr.requestedBy || "—"}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setSelectedPrId(pr.id)}>
                        <span
                          className={
                            pr.status === "open"
                              ? "text-emerald-700 font-medium"
                              : "text-zinc-500"
                          }
                        >
                          {pr.status}
                        </span>
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setSelectedPrId(pr.id)}>
                        {pr.openItemCount ?? 0} / {pr.itemCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={pr.status !== "open"}
                            onClick={() => setSelectedPrId(pr.id)}
                            title="Edit PR"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            disabled={pr.status !== "open" || deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete PR ${pr.prNumber}?`)) {
                                deleteMutation.mutate(pr.id);
                              }
                            }}
                            title="Delete PR"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold tracking-tight text-emerald-900">
            {isEditMode ? `Edit ${heading}` : `New ${heading}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prNumber">PR Number</Label>
              <Input
                id="prNumber"
                value={header.prNumber}
                onChange={(e) => setHeader((h) => ({ ...h, prNumber: e.target.value }))}
                placeholder="PR-2026-001"
              />
            </div>
            <div>
              <Label htmlFor="prDate">PR Date</Label>
              <Input
                id="prDate"
                type="date"
                value={header.prDate}
                onChange={(e) => setHeader((h) => ({ ...h, prDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="requestedBy">Requested By</Label>
              <Input
                id="requestedBy"
                value={header.requestedBy}
                onChange={(e) => setHeader((h) => ({ ...h, requestedBy: e.target.value }))}
                placeholder="Name or department"
              />
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={header.remarks}
                onChange={(e) => setHeader((h) => ({ ...h, remarks: e.target.value }))}
                placeholder="Optional header remarks"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-800">Line Items</p>
            <Button type="button" variant="outline" size="sm" onClick={addEmptyItemRow}>
              + Add Row
            </Button>
          </div>

          <ScrollArea className="h-[28rem] border rounded-md">
            <div className="space-y-4 p-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-zinc-200 bg-white p-3 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500">Line {idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500"
                      onClick={() => removeItemRow(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{codeLabel}</Label>
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.itemCode}
                        onChange={(e) => onItemCodeChange(idx, e.target.value)}
                      >
                        <option value="">Select code</option>
                        {masters.length === 0 &&
                        (requisitionType === "rental_equipment" || requisitionType === "tools") ? (
                          <option value="" disabled>
                            {requisitionType === "tools"
                              ? "No tools — add records in Tool Master first"
                              : "No rental equipment — add records in Rental Equipment tab first"}
                          </option>
                        ) : (
                          masters.map((m) => {
                            const code =
                              requisitionType === "material"
                                ? (m as MaterialMaster).materialCode
                                : requisitionType === "service"
                                  ? (m as ServiceMaster).serviceCode
                                  : requisitionType === "rental_equipment"
                                    ? (m as RentalEquipmentMaster).equipmentNumber
                                    : (m as ToolMasterItem).toolNumber;
                            const desc =
                              requisitionType === "material"
                                ? (m as MaterialMaster).materialDescription
                                : requisitionType === "service"
                                  ? (m as ServiceMaster).serviceDescription
                                  : requisitionType === "rental_equipment"
                                    ? (m as RentalEquipmentMaster).equipmentName
                                    : (m as ToolMasterItem).name;
                            const vendorCode =
                              requisitionType === "rental_equipment"
                                ? vendorById.get((m as RentalEquipmentMaster).vendorId ?? -1)?.vendorCode
                                : undefined;
                            return (
                              <option key={m.id} value={code}>
                                {code} — {desc}
                                {vendorCode ? ` (${vendorCode})` : ""}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input
                        readOnly
                        className="bg-zinc-50 text-sm"
                        value={item.itemDescription}
                        placeholder="Auto-filled from code"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        className="text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Required Date</Label>
                      <Input
                        type="date"
                        value={item.requiredDate}
                        onChange={(e) => updateItem(idx, { requiredDate: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Long Description (max 400)</Label>
                    <Textarea
                      value={item.longDescription}
                      onChange={(e) =>
                        updateItem(idx, { longDescription: e.target.value.slice(0, 400) })
                      }
                      maxLength={400}
                      rows={3}
                      className="text-sm"
                      placeholder="Detailed requirement description"
                    />
                    <p className="text-[10px] text-zinc-400 text-right">
                      {item.longDescription.length}/400
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs">Line Remarks</Label>
                    <Input
                      value={item.remarks}
                      onChange={(e) => updateItem(idx, { remarks: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Preferred Vendors (vendor codes)</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {vendors.map((v) => {
                        const selected = item.preferredVendorCodes.includes(v.vendorCode);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => togglePreferredVendor(idx, v.vendorCode)}
                            className={`text-xs px-2 py-1 rounded border ${
                              selected
                                ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            }`}
                          >
                            {v.vendorCode}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Project</Label>
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.projectId}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateItem(idx, { projectId: val, wpId: "" });
                          if (val) loadWorkPackagesForProject(Number(val));
                        }}
                      >
                        <option value="">—</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Work Package (WBS)</Label>
                      {item.projectId ? (
                        <select
                          className="w-full border rounded px-2 py-2 text-sm"
                          value={item.wpId}
                          onChange={(e) => updateItem(idx, { wpId: e.target.value })}
                        >
                          <option value="">—</option>
                          {(workPackagesByProject[Number(item.projectId)] ?? []).map((wp) => (
                            <option key={wp.id} value={wp.id}>
                              {wp.code} — {wp.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input value="" disabled className="text-sm bg-zinc-50" placeholder="Select project first" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                isEditMode && canEdit ? updateMutation.mutate() : createMutation.mutate()
              }
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (isEditMode && !canEdit)
              }
            >
              {updateMutation.isPending
                ? "Updating..."
                : createMutation.isPending
                  ? "Saving..."
                  : isEditMode
                    ? "Update Requisition"
                    : "Save Requisition"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
