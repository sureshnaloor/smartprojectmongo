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
import { Monitor, Pencil, Plus, Printer } from "lucide-react";
import { useLocation } from "wouter";
import {
  PurchaseOrderViewDialog,
  type PoViewMode,
} from "@/components/purchase-order-view";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  poDate: string;
  vendor: string;
  remarks: string | null;
  prId?: number | null;
  deliveryTerms?: string | null;
  incoterms?: string | null;
  paymentTerms?: string | null;
  paymentMode?: string | null;
  isDelivered?: boolean;
}

interface PurchaseOrderAttachment {
  id: number;
  poId: number;
  fileName: string;
  originalName: string;
  displayName?: string | null;
  description?: string | null;
}

interface PrSearchResult {
  id: number;
  prNumber: string;
  prDate: string;
  remarks: string | null;
  items: Array<{
    id: number;
    itemCode: string;
    itemDescription: string;
    quantity: string;
    requiredDate: string | null;
    longDescription: string | null;
    projectId: number | null;
    wpId: number | null;
    preferredVendorCodes: string[];
  }>;
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
  baseRate: string | number;
}

interface ServiceMaster {
  id: number;
  serviceCode: string;
  serviceDescription: string;
  uom: string;
  baseRate: string | number;
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

interface Uom {
  id: number;
  name: string;
  description?: string | null;
}

interface ResourceMaster {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  unitOfMeasure: string;
  unitRate: string | number;
}

interface PurchaseOrderItemInput {
  itemType: "material" | "service" | "rental_equipment" | "rental_employee" | "";
  itemDescription: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  totalPrice?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  projectId?: string;
  wpId?: string;
  longDescription?: string;
  prItemId?: number;
}

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  let filterItemType: "material" | "service" | "rental_equipment" | "rental_employee" | null = null;
  if (location.startsWith("/material-master")) {
    filterItemType = "material";
  } else if (location.startsWith("/service-master")) {
    filterItemType = "service";
  } else if (location.startsWith("/equipment-master/rental-po")) {
    filterItemType = "rental_equipment";
  } else if (location.startsWith("/employee-master/rental-po")) {
    filterItemType = "rental_employee";
  }

  const [creationMode, setCreationMode] = useState<"manual" | "from_pr">("manual");
  const [prSearch, setPrSearch] = useState("");
  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);

  const [header, setHeader] = useState({
    poNumber: "",
    poDate: new Date().toISOString().split("T")[0],
    vendor: "",
    remarks: "",
    deliveryTerms: "",
    incoterms: "",
    paymentTerms: "",
    paymentMode: "",
  });

  const [items, setItems] = useState<PurchaseOrderItemInput[]>([
    {
      itemType: filterItemType ?? "",
      itemDescription: "",
      quantity: "",
      unitOfMeasure: "",
      unitPrice: "",
    },
  ]);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [viewState, setViewState] = useState<{
    orderId: number;
    mode: PoViewMode;
  } | null>(null);

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders", filterItemType ?? "all"],
    queryFn: async () => {
      const url = filterItemType
        ? `/api/purchase-orders?itemType=${encodeURIComponent(filterItemType)}` 
        : "/api/purchase-orders";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load purchase orders");
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
  });

  const { data: services = [] } = useQuery<ServiceMaster[]>({
    queryKey: ["/api/service-masters"],
    queryFn: async () => {
      const res = await fetch("/api/service-masters");
      if (!res.ok) throw new Error("Failed to load services");
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<ProjectSummary[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ["/api/uoms"],
    queryFn: async () => {
      const res = await fetch("/api/uoms");
      if (!res.ok) throw new Error("Failed to load UOMs");
      return res.json();
    },
  });

  const { data: allResources = [] } = useQuery<ResourceMaster[]>({
    queryKey: ["/api/resources"],
    queryFn: async () => {
      const res = await fetch("/api/resources");
      if (!res.ok) throw new Error("Failed to load resources");
      return res.json();
    },
  });

  const rentalEquipmentResources = allResources.filter(
    (r) => (r.type || "").toLowerCase() === "rental_equipment"
  );
  const rentalManpowerResources = allResources.filter(
    (r) => (r.type || "").toLowerCase() === "manpower"
  );

  const [workPackagesByProject, setWorkPackagesByProject] = useState<
    Record<number, WorkPackageSummary[]>
  >({});

  const loadWorkPackagesForProject = async (projectId: number) => {
    if (!projectId || workPackagesByProject[projectId]) return;
    const res = await fetch(`/api/projects/${projectId}/work-packages`);
    if (!res.ok) {
      toast({
        title: "Could not load work packages",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }
    const data = (await res.json()) as WorkPackageSummary[];
    setWorkPackagesByProject((prev) => ({ ...prev, [projectId]: data }));
  };

  const requisitionType =
    filterItemType === "service"
      ? "service"
      : filterItemType === "material"
        ? "material"
        : filterItemType === "rental_equipment"
          ? "rental_equipment"
          : null;

  const { data: prSearchResults = [] } = useQuery<PrSearchResult[]>({
    queryKey: ["/api/purchase-requisitions/search", prSearch, requisitionType],
    queryFn: async () => {
      if (!requisitionType) return [];
      const res = await fetch(
        `/api/purchase-requisitions/search?q=${encodeURIComponent(prSearch)}&requisitionType=${requisitionType}`
      );
      if (!res.ok) throw new Error("Failed to search requisitions");
      return res.json();
    },
    enabled: creationMode === "from_pr" && !!requisitionType && !selectedOrderId,
  });

  const { data: attachments = [], refetch: refetchAttachments } = useQuery<PurchaseOrderAttachment[]>({
    queryKey: ["/api/purchase-orders", selectedOrderId, "attachments"],
    queryFn: async () => {
      if (!selectedOrderId) return [];
      const res = await fetch(`/api/purchase-orders/${selectedOrderId}/attachments`);
      if (!res.ok) throw new Error("Failed to load attachments");
      return res.json();
    },
    enabled: !!selectedOrderId,
  });

  const { data: selectedOrderDetail, isLoading: loadingDetail } = useQuery<{
    order: PurchaseOrder;
    items: Array<{
      id: number;
      lineNumber: number;
      itemType: string;
      itemDescription: string;
      quantity: string;
      unitOfMeasure: string;
      unitPrice: string;
      totalPrice: string;
      estimatedDeliveryDate: string | null;
      actualDeliveryDate: string | null;
      projectId: number | null;
      wpId: number | null;
      longDescription: string | null;
      prItemId: number | null;
    }>;
    attachments?: PurchaseOrderAttachment[];
  } | null>({
    queryKey: ["/api/purchase-orders", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await fetch(`/api/purchase-orders/${selectedOrderId}`);
      if (!res.ok) throw new Error("Failed to load PO");
      return res.json();
    },
    enabled: !!selectedOrderId,
  });

  const isEditMode = !!selectedOrderId && !!selectedOrderDetail;
  const canEditSelected =
    selectedOrderId && selectedOrderDetail && !(orders.find((o) => o.id === selectedOrderId)?.isDelivered);

  const itemTypeOptions = filterItemType
    ? [filterItemType]
    : ["material", "service", "rental_equipment", "rental_employee"];

  const loadOrderForEdit = (po: PurchaseOrder) => {
    setSelectedOrderId(po.id);
  };

  const openPoView = (po: PurchaseOrder, mode: PoViewMode) => {
    setViewState({ orderId: po.id, mode });
  };

  const startNewPo = () => {
    setSelectedOrderId(null);
    setSelectedPrId(null);
    setCreationMode("manual");
    setPrSearch("");
    setHeader({
      poNumber: "",
      poDate: new Date().toISOString().split("T")[0],
      vendor: "",
      remarks: "",
      deliveryTerms: "",
      incoterms: "",
      paymentTerms: "",
      paymentMode: "",
    });
    setItems([
      {
        itemType: filterItemType ?? "",
        itemDescription: "",
        quantity: "",
        unitOfMeasure: "",
        unitPrice: "",
        longDescription: "",
      },
    ]);
  };

  const loadFromPr = (pr: PrSearchResult) => {
    setSelectedPrId(pr.id);
    setHeader((h) => ({
      ...h,
      remarks: pr.remarks ?? h.remarks,
    }));

    const mapped = pr.items.map((line) => {
      let unitOfMeasure = "";
      let unitPrice = "";
      if (filterItemType === "material") {
        const mat = materials.find((m) => m.materialCode === line.itemCode);
        unitOfMeasure = mat?.uom ?? "";
        unitPrice = mat?.baseRate != null ? String(mat.baseRate) : "";
      } else if (filterItemType === "service") {
        const svc = services.find((s) => s.serviceCode === line.itemCode);
        unitOfMeasure = svc?.uom ?? "";
        unitPrice = svc?.baseRate != null ? String(svc.baseRate) : "";
      }

      if (line.projectId) loadWorkPackagesForProject(line.projectId);

      return {
        itemType: (filterItemType ?? "") as PurchaseOrderItemInput["itemType"],
        itemDescription: line.itemDescription,
        quantity: String(line.quantity ?? ""),
        unitOfMeasure,
        unitPrice,
        estimatedDeliveryDate: line.requiredDate ?? undefined,
        projectId: line.projectId != null ? String(line.projectId) : undefined,
        wpId: line.wpId != null ? String(line.wpId) : undefined,
        longDescription: line.longDescription ?? "",
        prItemId: line.id,
      };
    });

    setItems(
      mapped.length > 0
        ? mapped
        : [
            {
              itemType: filterItemType ?? "",
              itemDescription: "",
              quantity: "",
              unitOfMeasure: "",
              unitPrice: "",
              longDescription: "",
            },
          ]
    );

    if (pr.items[0]?.preferredVendorCodes?.length) {
      const prefCode = pr.items[0].preferredVendorCodes[0];
      const vendor = vendors.find((v) => v.vendorCode === prefCode);
      if (vendor) {
        setHeader((h) => ({ ...h, vendor: vendor.vendorName }));
      }
    }

    toast({
      title: "Loaded from requisition",
      description: `${pr.prNumber} — ${pr.items.length} line(s) imported.`,
    });
  };

  const lastSyncedPoIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedOrderId || !selectedOrderDetail || loadingDetail) return;
    if (lastSyncedPoIdRef.current === selectedOrderId) return;
    lastSyncedPoIdRef.current = selectedOrderId;
    const o = selectedOrderDetail.order;
    const its = selectedOrderDetail.items;
    setSelectedPrId(o.prId ?? null);
    setHeader({
      poNumber: o.poNumber,
      poDate: o.poDate ? new Date(o.poDate).toISOString().split("T")[0] : "",
      vendor: o.vendor,
      remarks: o.remarks ?? "",
      deliveryTerms: o.deliveryTerms ?? "",
      incoterms: o.incoterms ?? "",
      paymentTerms: o.paymentTerms ?? "",
      paymentMode: o.paymentMode ?? "",
    });
        setItems(
      its.length > 0
        ? its.map((i) => ({
            itemType: (i.itemType as PurchaseOrderItemInput["itemType"]) || "",
            itemDescription: i.itemDescription ?? "",
            quantity: String(i.quantity ?? ""),
            unitOfMeasure: i.unitOfMeasure ?? "",
            unitPrice: String(i.unitPrice ?? ""),
            totalPrice: String(i.totalPrice ?? ""),
            estimatedDeliveryDate: i.estimatedDeliveryDate ?? undefined,
            actualDeliveryDate: i.actualDeliveryDate ?? undefined,
            projectId: i.projectId != null ? String(i.projectId) : undefined,
            wpId: i.wpId != null ? String(i.wpId) : undefined,
            longDescription: i.longDescription ?? "",
            prItemId: i.prItemId ?? undefined,
          }))
        : [
            {
              itemType: "" as const,
              itemDescription: "",
              quantity: "",
              unitOfMeasure: "",
              unitPrice: "",
            },
          ]
    );
  }, [selectedOrderId, selectedOrderDetail, loadingDetail]);
  useEffect(() => {
    if (!selectedOrderId) lastSyncedPoIdRef.current = null;
  }, [selectedOrderId]);

  const addEmptyItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: filterItemType ?? "",
        itemDescription: "",
        quantity: "",
        unitOfMeasure: "",
        unitPrice: "",
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<PurchaseOrderItemInput>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const parseCsv = (text: string): PurchaseOrderItemInput[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];
    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    const idx = (name: string) => headers.indexOf(name.toLowerCase());

    return rows.map((row) => {
      const cols = row.split(",").map((c) => c.trim());
      const get = (name: string) =>
        idx(name) >= 0 && idx(name) < cols.length ? cols[idx(name)] : "";

        const quantity = get("quantity");
        const unitPrice = get("unitprice") || get("unit_price");
        const totalPrice =
          get("totalprice") ||
          get("total_price") ||
          (quantity && unitPrice
            ? (Number(quantity || 0) * Number(unitPrice || 0)).toString()
            : "");

        return {
        itemType: (get("itemtype") || get("item_type")) as
          | "material"
          | "service"
          | "rental_equipment"
          | "rental_employee"
          | "",
        itemDescription:
          get("itemdescription") || get("item_description") || "",
        quantity,
        unitOfMeasure:
          get("unitofmeasure") || get("unit_of_measure") || get("uom"),
        unitPrice,
        totalPrice,
        estimatedDeliveryDate:
          get("estimateddeliverydate") || get("estimated_delivery_date") || "",
        projectId: get("projectid") || get("project_id") || "",
        wpId: get("wpid") || get("wp_id") || "",
      };
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsedItems = parseCsv(text);
      if (parsedItems.length === 0) {
        toast({
          title: "No items found",
          description:
            "CSV must include at least one data row. Expected headers include: itemType, itemDescription, quantity, unitOfMeasure, unitPrice, totalPrice, estimatedDeliveryDate, actualDeliveryDate, projectId, wpId.",
          variant: "destructive",
        });
        return;
      }
      setItems(parsedItems);
      toast({
        title: "CSV loaded",
        description: `Loaded ${parsedItems.length} line items from CSV.`,
      });
    };
    reader.readAsText(file);
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!header.poNumber || !header.poDate || !header.vendor) {
        throw new Error("PO number, date, and vendor are required.");
      }

      const cleanedItems = items
        .filter((i) => i.itemDescription && i.itemType)
        .map((i, index) => {
          const quantity = Number(i.quantity || 0);
          const unitPrice = Number(i.unitPrice || 0);
          const totalPrice = quantity * unitPrice;

          return {
            lineNumber: index + 1,
            itemType: i.itemType,
            itemDescription: i.itemDescription,
            quantity,
            unitOfMeasure: i.unitOfMeasure,
            unitPrice,
            totalPrice,
            estimatedDeliveryDate: i.estimatedDeliveryDate || undefined,
            projectId: i.projectId ? Number(i.projectId) : undefined,
            wpId: i.wpId ? Number(i.wpId) : undefined,
            longDescription: i.longDescription?.slice(0, 1000) || undefined,
            prItemId: i.prItemId,
          };
        });

      const body = {
        poNumber: header.poNumber,
        poDate: header.poDate,
        vendor: header.vendor,
        remarks: header.remarks || null,
        prId: selectedPrId,
        deliveryTerms: header.deliveryTerms || null,
        incoterms: header.incoterms || null,
        paymentTerms: header.paymentTerms || null,
        paymentMode: header.paymentMode || null,
        items: cleanedItems,
      };

      const res = await apiRequest("POST", "/api/purchase-orders", body);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to create purchase order");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order created",
        description: "The purchase order and its line items have been saved.",
      });
      startNewPo();
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requisitions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Could not save purchase order",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId || !header.poNumber || !header.poDate || !header.vendor) {
        throw new Error("PO number, date, and vendor are required.");
      }
      const cleanedItems = items
        .filter((i) => i.itemDescription && i.itemType)
        .map((i, index) => {
          const quantity = Number(i.quantity || 0);
          const unitPrice = Number(i.unitPrice || 0);
          const totalPrice = quantity * unitPrice;
          return {
            lineNumber: index + 1,
            itemType: i.itemType,
            itemDescription: i.itemDescription,
            quantity,
            unitOfMeasure: i.unitOfMeasure,
            unitPrice,
            totalPrice,
            estimatedDeliveryDate: i.estimatedDeliveryDate || undefined,
            projectId: i.projectId ? Number(i.projectId) : undefined,
            wpId: i.wpId ? Number(i.wpId) : undefined,
            longDescription: i.longDescription?.slice(0, 1000) || undefined,
            prItemId: i.prItemId,
          };
        });
      const res = await apiRequest("PATCH", `/api/purchase-orders/${selectedOrderId}`, {
        poNumber: header.poNumber,
        poDate: header.poDate,
        vendor: header.vendor,
        remarks: header.remarks || null,
        prId: selectedPrId,
        deliveryTerms: header.deliveryTerms || null,
        incoterms: header.incoterms || null,
        paymentTerms: header.paymentTerms || null,
        paymentMode: header.paymentMode || null,
        items: cleanedItems,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to update purchase order");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", selectedOrderId] });
    },
    onError: (error: any) => {
      toast({
        title: "Could not update purchase order",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (selectedOrderId && canEditSelected) {
      updateOrderMutation.mutate();
    } else {
      createOrderMutation.mutate();
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrderId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("displayName", file.name);

    try {
      const res = await fetch(`/api/purchase-orders/${selectedOrderId}/attachments/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Upload failed");
      }
      toast({ title: "Document uploaded" });
      refetchAttachments();
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
    e.target.value = "";
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!selectedOrderId) return;
    try {
      const res = await fetch(
        `/api/purchase-orders/${selectedOrderId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Attachment removed" });
      refetchAttachments();
    } catch {
      toast({ title: "Could not remove attachment", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 h-full min-h-0">
      {/* PO list on top */}
      <Card className="w-full flex-shrink-0 flex flex-col min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-extrabold tracking-tight text-zinc-900">
            Purchase Orders
          </CardTitle>
          <Button variant="outline" size="sm" onClick={startNewPo}>
            <Plus className="h-4 w-4 mr-1" />
            New PO
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="text-sm text-zinc-500">Loading purchase orders…</div>
          ) : orders.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No purchase orders yet. Create one using the form on the right.
            </div>
          ) : (
            <ScrollArea className="h-64 pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((po) => (
                    <TableRow
                      key={po.id}
                      className={
                        selectedOrderId === po.id
                          ? "bg-sky-50"
                          : "hover:bg-zinc-50"
                      }
                    >
                      <TableCell
                        className="font-semibold cursor-pointer"
                        onClick={() => setSelectedOrderId(po.id)}
                      >
                        {po.poNumber}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setSelectedOrderId(po.id)}
                      >
                        {po.poDate
                          ? new Date(po.poDate).toLocaleDateString()
                          : ""}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer truncate max-w-[100px]"
                        onClick={() => setSelectedOrderId(po.id)}
                      >
                        {po.vendor}
                      </TableCell>
                      <TableCell className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openPoView(po, "screen")}
                            title="Screen view"
                            aria-label="Screen view"
                          >
                            <Monitor className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openPoView(po, "print")}
                            title="Print view"
                            aria-label="Print view"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={!!po.isDelivered}
                            onClick={() => loadOrderForEdit(po)}
                            title={po.isDelivered ? "Delivered – cannot edit" : "Edit PO"}
                          >
                            <Pencil className="h-4 w-4" />
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

      {/* PO form below, full width */}
      <Card className="w-full flex flex-col min-w-0 flex-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-extrabold tracking-tight text-emerald-900">
            {isEditMode ? "Edit Purchase Order" : "New Purchase Order"}
          </CardTitle>
          {isEditMode && (
            <Button variant="outline" size="sm" onClick={startNewPo}>
              <Plus className="h-4 w-4 mr-1" />
              New PO
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditMode && requisitionType && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={creationMode === "manual" ? "default" : "outline"}
                  onClick={() => setCreationMode("manual")}
                >
                  Manual PO
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={creationMode === "from_pr" ? "default" : "outline"}
                  onClick={() => setCreationMode("from_pr")}
                >
                  Create from PR
                </Button>
              </div>
              {creationMode === "from_pr" && (
                <div className="space-y-2">
                  <Label>Search requisition (code, description, PR number)</Label>
                  <Input
                    value={prSearch}
                    onChange={(e) => setPrSearch(e.target.value)}
                    placeholder="Type to search open requisitions…"
                  />
                  {prSearchResults.length > 0 && (
                    <ScrollArea className="h-40 border rounded-md bg-white">
                      <div className="p-2 space-y-1">
                        {prSearchResults.map((pr) => (
                          <button
                            key={pr.id}
                            type="button"
                            onClick={() => loadFromPr(pr)}
                            className={`w-full text-left text-sm px-3 py-2 rounded hover:bg-sky-50 border ${
                              selectedPrId === pr.id ? "border-sky-400 bg-sky-50" : "border-transparent"
                            }`}
                          >
                            <span className="font-semibold">{pr.prNumber}</span>
                            <span className="text-zinc-500 ml-2">
                              {pr.items.length} line(s) —{" "}
                              {pr.items.map((i) => i.itemCode).join(", ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {prSearch && prSearchResults.length === 0 && (
                    <p className="text-xs text-zinc-500">No matching open requisitions.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="poNumber">PO Number</Label>
                <Input
                  id="poNumber"
                  value={header.poNumber}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, poNumber: e.target.value }))
                  }
                  placeholder="PO-2026-001"
                />
              </div>
              <div>
                <Label htmlFor="poDate">PO Date</Label>
                <Input
                  id="poDate"
                  type="date"
                  value={header.poDate}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, poDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <select
                  id="vendor"
                  className="w-full border rounded px-2 py-2 text-sm"
                  value={header.vendor}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, vendor: e.target.value }))
                  }
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.vendorName}>
                      {v.vendorCode} — {v.vendorName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={header.remarks}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, remarks: e.target.value }))
                  }
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                <Input
                  id="deliveryTerms"
                  value={header.deliveryTerms}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, deliveryTerms: e.target.value }))
                  }
                  placeholder="e.g. Deliver to site warehouse"
                />
              </div>
              <div>
                <Label htmlFor="incoterms">Incoterms</Label>
                <Input
                  id="incoterms"
                  value={header.incoterms}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, incoterms: e.target.value }))
                  }
                  placeholder="e.g. FOB, CIF, DDP"
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={header.paymentTerms}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, paymentTerms: e.target.value }))
                  }
                  placeholder="e.g. Net 30 days"
                />
              </div>
              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Input
                  id="paymentMode"
                  value={header.paymentMode}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, paymentMode: e.target.value }))
                  }
                  placeholder="e.g. Bank transfer, LC"
                />
              </div>
            </div>
          </div>

          {selectedOrderId && (
            <div className="rounded-md border border-zinc-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-zinc-800">PO Documents</p>
              <p className="text-xs text-zinc-500">
                Upload drawings, terms &amp; conditions, or other supporting documents.
              </p>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg"
                onChange={handleAttachmentUpload}
                className="max-w-sm text-xs"
              />
              {attachments.length > 0 && (
                <ul className="text-sm space-y-1">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{a.displayName || a.originalName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 h-7"
                        onClick={() => handleDeleteAttachment(a.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-800">
                Line Items
              </p>
              <p className="text-xs text-zinc-500">
                Use the table below or upload a CSV to populate items.
              </p>
              <p className="text-[11px] text-zinc-500">
                CSV headers: itemType, itemDescription, quantity, unitOfMeasure,
                unitPrice, totalPrice, estimatedDeliveryDate, projectId, wpId.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="w-40 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmptyItemRow}
              >
                + Add Row
              </Button>
            </div>
          </div>

          {/* Line items as stacked cards, multiple rows per item */}
          <ScrollArea className="h-72 border rounded-md">
            <div className="space-y-4 p-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-zinc-200 bg-white p-3 space-y-3"
                >
                  {/* Row 1: Type, Qty, UOM */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.itemType}
                        onChange={(e) =>
                          updateItem(idx, {
                            itemType: e.target
                              .value as PurchaseOrderItemInput["itemType"],
                          })
                        }
                        disabled={!!filterItemType}
                      >
                        <option value="">Select</option>
                        {itemTypeOptions.includes("material") && (
                          <option value="material">Material</option>
                        )}
                        {itemTypeOptions.includes("service") && (
                          <option value="service">Service</option>
                        )}
                        {itemTypeOptions.includes("rental_equipment") && (
                          <option value="rental_equipment">Rental equipment</option>
                        )}
                        {itemTypeOptions.includes("rental_employee") && (
                          <option value="rental_employee">Rental employee</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, { quantity: e.target.value })
                        }
                        className="text-sm text-right"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">UOM</Label>
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.unitOfMeasure}
                        onChange={(e) =>
                          updateItem(idx, { unitOfMeasure: e.target.value })
                        }
                      >
                        <option value="">Select UOM</option>
                        {uoms.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Unit price, Total, Est. delivery */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, { unitPrice: e.target.value })
                        }
                        className="text-sm text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <Input
                        readOnly
                        className="text-sm text-right bg-zinc-50"
                        value={(() => {
                          const q = Number(item.quantity) || 0;
                          const p = Number(item.unitPrice) || 0;
                          const t = q * p;
                          return t === 0 ? "" : t.toFixed(2);
                        })()}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Est. Delivery</Label>
                      <Input
                        type="date"
                        value={item.estimatedDeliveryDate ?? ""}
                        onChange={(e) =>
                          updateItem(idx, {
                            estimatedDeliveryDate: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 3: Description full width — from material / service / rental_equipment / rental_employee masters */}
                  <div>
                    <Label className="text-xs">
                      {item.itemType === "service"
                        ? "Service Description"
                        : item.itemType === "material"
                          ? "Material Description"
                          : item.itemType === "rental_equipment"
                            ? "Rental Equipment"
                            : item.itemType === "rental_employee"
                              ? "Rental Employee (Manpower)"
                              : "Description"}
                    </Label>
                    {item.itemType === "material" && materials.length > 0 ? (
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.itemDescription}
                        onChange={(e) => {
                          const val = e.target.value;
                          const mat = materials.find(
                            (m) => m.materialDescription === val
                          );
                          updateItem(idx, {
                            itemDescription: val,
                            unitOfMeasure: mat?.uom ?? item.unitOfMeasure,
                            unitPrice:
                              mat?.baseRate !== undefined
                                ? String(mat.baseRate)
                                : item.unitPrice,
                          });
                        }}
                      >
                        <option value="">Select material</option>
                        {materials.map((m) => (
                          <option
                            key={m.id}
                            value={m.materialDescription}
                          >
                            {m.materialCode} — {m.materialDescription}
                          </option>
                        ))}
                      </select>
                    ) : item.itemType === "service" && services.length > 0 ? (
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.itemDescription}
                        onChange={(e) => {
                          const val = e.target.value;
                          const svc = services.find(
                            (s) => s.serviceDescription === val
                          );
                          updateItem(idx, {
                            itemDescription: val,
                            unitOfMeasure: svc?.uom ?? item.unitOfMeasure,
                            unitPrice:
                              svc?.baseRate !== undefined
                                ? String(svc.baseRate)
                                : item.unitPrice,
                          });
                        }}
                      >
                        <option value="">Select service</option>
                        {services.map((s) => (
                          <option
                            key={s.id}
                            value={s.serviceDescription}
                          >
                            {s.serviceCode} — {s.serviceDescription}
                          </option>
                        ))}
                      </select>
                    ) : item.itemType === "rental_equipment" && rentalEquipmentResources.length > 0 ? (
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.itemDescription}
                        onChange={(e) => {
                          const val = e.target.value;
                          const res = rentalEquipmentResources.find(
                            (r) => r.name === val
                          );
                          updateItem(idx, {
                            itemDescription: val,
                            unitOfMeasure: res?.unitOfMeasure ?? item.unitOfMeasure,
                            unitPrice:
                              res?.unitRate !== undefined && res?.unitRate !== null
                                ? String(res.unitRate)
                                : item.unitPrice,
                          });
                        }}
                      >
                        <option value="">Select rental equipment</option>
                        {rentalEquipmentResources.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                            {r.description ? ` — ${r.description}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : item.itemType === "rental_employee" && rentalManpowerResources.length > 0 ? (
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.itemDescription}
                        onChange={(e) => {
                          const val = e.target.value;
                          const res = rentalManpowerResources.find(
                            (r) => r.name === val
                          );
                          updateItem(idx, {
                            itemDescription: val,
                            unitOfMeasure: res?.unitOfMeasure ?? item.unitOfMeasure,
                            unitPrice:
                              res?.unitRate !== undefined && res?.unitRate !== null
                                ? String(res.unitRate)
                                : item.unitPrice,
                          });
                        }}
                      >
                        <option value="">Select rental employee (manpower)</option>
                        {rentalManpowerResources.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                            {r.description ? ` — ${r.description}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={item.itemDescription}
                        onChange={(e) =>
                          updateItem(idx, { itemDescription: e.target.value })
                        }
                        className="text-sm"
                        placeholder="Description"
                      />
                    )}
                  </div>

                  {/* Row 4: Project full width */}
                  <div>
                    <Label className="text-xs">Project</Label>
                    <select
                      className="w-full border rounded px-2 py-2 text-sm"
                      value={item.projectId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateItem(idx, {
                          projectId: val,
                          wpId: "",
                        });
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

                  {/* Row 5: Work package full width */}
                  <div>
                    <Label className="text-xs">Work Package</Label>
                    {item.projectId ? (
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={item.wpId ?? ""}
                        onChange={(e) =>
                          updateItem(idx, { wpId: e.target.value })
                        }
                      >
                        <option value="">—</option>
                        {(workPackagesByProject[
                          Number(item.projectId)
                        ] ?? []
                        ).map((wp) => (
                          <option key={wp.id} value={wp.id}>
                            {wp.code} — {wp.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={item.wpId ?? ""}
                        onChange={(e) =>
                          updateItem(idx, { wpId: e.target.value })
                        }
                        className="text-sm"
                        placeholder="WP ID"
                      />
                    )}
                  </div>

                  {/* Row 6: Long description (from PR, editable up to 1000 chars) */}
                  <div>
                    <Label className="text-xs">Long Description (max 1000)</Label>
                    <Textarea
                      value={item.longDescription ?? ""}
                      onChange={(e) =>
                        updateItem(idx, { longDescription: e.target.value.slice(0, 1000) })
                      }
                      maxLength={1000}
                      rows={3}
                      className="text-sm"
                      placeholder="Detailed specification — pre-filled from PR if applicable"
                    />
                    <p className="text-[10px] text-zinc-400 text-right">
                      {(item.longDescription ?? "").length}/1000
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={
                createOrderMutation.isLoading ||
                updateOrderMutation.isLoading ||
                (isEditMode && !canEditSelected)
              }
            >
              {updateOrderMutation.isLoading
                ? "Updating..."
                : createOrderMutation.isLoading
                  ? "Saving PO..."
                  : isEditMode
                    ? "Update Purchase Order"
                    : "Save Purchase Order"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PurchaseOrderViewDialog
        orderId={viewState?.orderId ?? null}
        mode={viewState?.mode ?? null}
        open={!!viewState}
        onOpenChange={(open) => {
          if (!open) setViewState(null);
        }}
        vendors={vendors}
        projects={projects}
      />
    </div>
  );
}

