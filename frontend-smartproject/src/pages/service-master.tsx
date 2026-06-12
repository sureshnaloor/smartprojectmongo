import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";

interface Service {
  id: number;
  serviceCode: string;
  serviceDescription: string;
  uom: string;
  serviceType: string;
  serviceGroup: string;
  baseRate: number | string;
  createdAt: string;
  updatedAt: string;
}

interface MasterItem {
  id: number;
  name: string;
  description?: string | null;
  serviceTypeId?: number;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

async function getServices(): Promise<Service[]> {
  const res = await fetch("/api/service-masters");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

async function createService(data: Omit<Service, "id" | "createdAt" | "updatedAt">): Promise<Service> {
  const res = await fetch("/api/service-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

async function updateService(id: number, data: Partial<Omit<Service, "id" | "createdAt" | "updatedAt">>): Promise<Service> {
  const res = await fetch(`/api/service-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

async function deleteService(id: number): Promise<void> {
  const res = await fetch(`/api/service-masters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseApiError(res));
}

async function bulkUploadServices(csvData: any[]): Promise<Service[]> {
  const res = await fetch("/api/service-masters/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export default function ServiceMaster() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    serviceCode: "",
    serviceDescription: "",
    uom: "",
    serviceType: "",
    serviceGroup: "",
    baseRate: "",
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["/api/service-masters"],
    queryFn: getServices,
  });

  const { data: uoms = [] } = useQuery({
    queryKey: ["/api/uoms"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/uoms");
      if (!res.ok) throw new Error("Failed to fetch UOMs");
      return res.json();
    },
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["/api/service-types"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/service-types");
      if (!res.ok) throw new Error("Failed to fetch service types");
      return res.json();
    },
  });

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ["/api/service-groups"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/service-groups");
      if (!res.ok) throw new Error("Failed to fetch service groups");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast({ title: "Service created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast({ title: error.message || "Error creating service", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Service, "id" | "createdAt" | "updatedAt">> }) =>
      updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast({ title: "Service updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast({ title: error.message || "Error updating service", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast({ title: "Service deleted successfully" });
    },
    onError: (error: Error) => toast({ title: error.message || "Error deleting service", variant: "destructive" }),
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadServices,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast({ title: `${data.length} services uploaded successfully` });
    },
    onError: (error: Error) => toast({ title: error.message || "Error uploading services", variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({
      serviceCode: "",
      serviceDescription: "",
      uom: "",
      serviceType: "",
      serviceGroup: "",
      baseRate: "",
    });
    setEditingService(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      serviceCode: service.serviceCode,
      serviceDescription: service.serviceDescription,
      uom: service.uom,
      serviceType: service.serviceType,
      serviceGroup: service.serviceGroup,
      baseRate: service.baseRate !== undefined && service.baseRate !== null ? String(service.baseRate) : "",
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = (event.target?.result as string) || "";
        const lines = csv.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());
        const baseRateIdx = headers.findIndex((h) => h.trim().toLowerCase() === "baserate" || h.trim().toLowerCase() === "base_rate");
        const csvData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          return {
            serviceCode: values[headers.indexOf("serviceCode")],
            serviceDescription: values[headers.indexOf("serviceDescription")],
            uom: values[headers.indexOf("uom")],
            serviceType: values[headers.indexOf("serviceType")],
            serviceGroup: values[headers.indexOf("serviceGroup")],
            ...(baseRateIdx >= 0 && values[baseRateIdx] !== undefined ? { baseRate: values[baseRateIdx] || "0" } : {}),
          };
        });
        bulkUploadMutation.mutate(csvData);
      } catch {
        toast({ title: "Error parsing CSV", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const selectedServiceType = serviceTypes.find((t) => t.name === formData.serviceType);
  const filteredServiceGroups = serviceGroups.filter(
    (g) =>
      !selectedServiceType ||
      g.serviceTypeId === selectedServiceType.id ||
      g.serviceTypeId == null
  );

  const filteredServices = services.filter(
    (s) =>
      s.serviceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Service Master
          </h1>
          <p className="text-muted-foreground mt-1">All services are outsourced. Manage service codes, UOM, type and group.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              placeholder="Search by code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" />Add Service</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Service Code *</Label>
                    <Input
                      required
                      value={formData.serviceCode}
                      onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                      placeholder="e.g. SVC001"
                    />
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      required
                      value={formData.serviceDescription}
                      onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                    />
                  </div>
                    <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>UOM *</Label>
                      <Select value={formData.uom || undefined} onValueChange={(v) => setFormData({ ...formData, uom: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
                        <SelectContent>
                          {[
                            ...uoms,
                            ...(formData.uom && !uoms.some((u) => u.name === formData.uom) ? [{ id: -1, name: formData.uom }] : []),
                          ].map((u) => (
                            <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Service Type *</Label>
                      <Select value={formData.serviceType || undefined} onValueChange={(v) => setFormData({ ...formData, serviceType: v, serviceGroup: "" })} required>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {[
                            ...serviceTypes,
                            ...(formData.serviceType && !serviceTypes.some((t) => t.name === formData.serviceType) ? [{ id: -1, name: formData.serviceType }] : []),
                          ].map((t) => (
                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Service Group *</Label>
                      <Select value={formData.serviceGroup || undefined} onValueChange={(v) => setFormData({ ...formData, serviceGroup: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                        <SelectContent>
                          {[
                            ...filteredServiceGroups,
                            ...(formData.serviceGroup && !filteredServiceGroups.some((g) => g.name === formData.serviceGroup) ? [{ id: -1, name: formData.serviceGroup }] : []),
                          ].map((g) => (
                            <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Base Rate (per UOM) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={formData.baseRate}
                      onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Unit rate for estimating value when added to work packages.</p>
                  </div>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingService ? "Update" : "Create"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = "/templates/service-master-template.csv";
                link.download = "service-master-template.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="mr-2 h-4 w-4" />Download Template
            </Button>
            <label>
              <Button variant="outline" asChild><span><Upload className="mr-2 h-4 w-4" />Import CSV</span></Button>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={bulkUploadMutation.isPending} />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : filteredServices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No services found. Add services or import CSV.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Base Rate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.serviceCode}</TableCell>
                    <TableCell>{s.serviceDescription}</TableCell>
                    <TableCell>{s.uom}</TableCell>
                    <TableCell className="font-mono">
                      {typeof s.baseRate === "number" ? s.baseRate.toFixed(2) : Number(s.baseRate || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{s.serviceType}</TableCell>
                    <TableCell>{s.serviceGroup}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => confirm("Delete this service?") && deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
