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
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { RentalEquipmentResourceMapper } from "@/components/project/rental-equipment-resource-mapper";

interface RentalEquipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  description?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  year?: number | null;
  capacity?: string | null;
  unit?: string | null;
  costPerHour: string;
  vendorId: number;
  createdAt: string;
  updatedAt: string;
}

interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
}

interface MasterItem {
  id: number;
  name: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2000 }, (_, i) => CURRENT_YEAR - i);

async function getRentalEquipment(): Promise<RentalEquipment[]> {
  const res = await fetch("/api/rental-equipment");
  if (!res.ok) throw new Error("Failed to fetch rental equipment");
  return res.json();
}

async function getVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/vendor-masters");
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

async function getEquipmentTypes(): Promise<MasterItem[]> {
  const res = await fetch("/api/equipment-types");
  if (!res.ok) throw new Error("Failed to fetch equipment types");
  return res.json();
}

async function getManufacturers(): Promise<MasterItem[]> {
  const res = await fetch("/api/equipment-manufacturers");
  if (!res.ok) throw new Error("Failed to fetch manufacturers");
  return res.json();
}

async function createRentalEquipment(data: Record<string, unknown>): Promise<RentalEquipment> {
  const res = await fetch("/api/rental-equipment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateRentalEquipment(
  id: number,
  data: Partial<Record<string, unknown>>
): Promise<RentalEquipment> {
  const res = await fetch(`/api/rental-equipment/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function deleteRentalEquipment(id: number): Promise<void> {
  const res = await fetch(`/api/rental-equipment/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete");
}

async function bulkUploadRentalEquipment(csvData: Record<string, string>[]): Promise<RentalEquipment[]> {
  const res = await fetch("/api/rental-equipment/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : "Failed to upload rental equipment";
    throw new Error(message);
  }
  return res.json();
}

export default function EquipmentMasterRental() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalEquipment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    equipmentNumber: "",
    equipmentName: "",
    equipmentType: "",
    description: "",
    manufacturer: "",
    model: "",
    year: "" as string | number,
    capacity: "",
    unit: "",
    costPerHour: "",
    vendorId: "",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/rental-equipment"],
    queryFn: getRentalEquipment,
  });
  const { data: vendors = [] } = useQuery({ queryKey: ["/api/vendor-masters"], queryFn: getVendors });
  const { data: equipmentTypes = [] } = useQuery({
    queryKey: ["/api/equipment-types"],
    queryFn: getEquipmentTypes,
  });
  const { data: manufacturers = [] } = useQuery({
    queryKey: ["/api/equipment-manufacturers"],
    queryFn: getManufacturers,
  });

  const createMutation = useMutation({
    mutationFn: createRentalEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rental-equipment"] });
      toast({ title: "Rental equipment created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: e.message || "Error creating", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Record<string, unknown>> }) =>
      updateRentalEquipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rental-equipment"] });
      toast({ title: "Rental equipment updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: e.message || "Error updating", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRentalEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rental-equipment"] });
      toast({ title: "Rental equipment deleted successfully" });
    },
    onError: (e: Error) => toast({ title: e.message || "Error deleting", variant: "destructive" }),
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadRentalEquipment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rental-equipment"] });
      toast({ title: `${data.length} record(s) uploaded successfully` });
    },
    onError: (err: Error) => {
      toast({
        title: "Bulk upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          toast({
            title: "CSV must have a header row and at least one data row",
            variant: "destructive",
          });
          return;
        }
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/^\uFEFF/, ""));
        const hasEquipmentId =
          headers.includes("equipmentNumber") || headers.includes("equipmentCode");
        const requiredHeaders = ["equipmentName", "equipmentType", "costPerHour", "vendorCode"];
        const missing = requiredHeaders.filter((h) => !headers.includes(h));
        if (!hasEquipmentId || missing.length > 0) {
          toast({
            title: "CSV missing required columns",
            description: [
              !hasEquipmentId ? "equipmentNumber or equipmentCode" : null,
              ...missing,
            ]
              .filter(Boolean)
              .join(", "),
            variant: "destructive",
          });
          return;
        }
        const csvData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => {
            row[h] = values[i] ?? "";
          });
          return {
            equipmentNumber: row.equipmentNumber || row.equipmentCode || "",
            equipmentName: row.equipmentName,
            equipmentType: row.equipmentType,
            description: row.description || undefined,
            manufacturer: row.manufacturer || undefined,
            model: row.model || undefined,
            year: row.year || undefined,
            capacity: row.capacity || undefined,
            unit: row.unit || undefined,
            costPerHour: row.costPerHour,
            vendorCode: row.vendorCode,
          };
        });
        bulkUploadMutation.mutate(csvData);
      } catch {
        toast({ title: "Error parsing CSV file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetForm = () => {
    setFormData({
      equipmentNumber: "",
      equipmentName: "",
      equipmentType: "",
      description: "",
      manufacturer: "",
      model: "",
      year: "",
      capacity: "",
      unit: "",
      costPerHour: "",
      vendorId: "",
    });
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      vendorId: parseInt(formData.vendorId, 10),
      year: formData.year === "" ? undefined : Number(formData.year),
      description: formData.description || undefined,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      capacity: formData.capacity || undefined,
      unit: formData.unit || undefined,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (item: RentalEquipment) => {
    setEditingItem(item);
    setFormData({
      equipmentNumber: item.equipmentNumber,
      equipmentName: item.equipmentName,
      equipmentType: item.equipmentType,
      description: item.description || "",
      manufacturer: item.manufacturer || "",
      model: item.model || "",
      year: item.year ?? "",
      capacity: item.capacity || "",
      unit: item.unit || "",
      costPerHour: item.costPerHour,
      vendorId: String(item.vendorId),
    });
    setIsDialogOpen(true);
  };

  const filteredItems = items.filter(
    (i) =>
      i.equipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.equipmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Rental Equipment
            </h1>
            <p className="text-muted-foreground mt-1">Manage rental equipment and vendor associations</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by equipment number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rental Equipment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit Rental Equipment" : "Add Rental Equipment"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Equipment Number *</Label>
                        <Input
                          required
                          value={formData.equipmentNumber}
                          onChange={(e) => setFormData({ ...formData, equipmentNumber: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Vendor *</Label>
                        <Select
                          value={formData.vendorId || undefined}
                          onValueChange={(v) => setFormData({ ...formData, vendorId: v })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {v.vendorName} ({v.vendorCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Equipment Name *</Label>
                      <Input
                        required
                        value={formData.equipmentName}
                        onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Equipment Type *</Label>
                        <Select
                          value={formData.equipmentType || undefined}
                          onValueChange={(v) => setFormData({ ...formData, equipmentType: v })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {equipmentTypes.map((t) => (
                              <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Manufacturer / OEM</Label>
                        <Select
                          value={formData.manufacturer || undefined}
                          onValueChange={(v) => setFormData({ ...formData, manufacturer: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Manufacturer" />
                          </SelectTrigger>
                          <SelectContent>
                            {manufacturers.map((m) => (
                              <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Model</Label>
                        <Input
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Year</Label>
                        <Select
                          value={formData.year === "" ? undefined : String(formData.year)}
                          onValueChange={(v) => setFormData({ ...formData, year: v === "" ? "" : Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {YEAR_OPTIONS.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Capacity</Label>
                        <Input
                          type="number"
                          value={formData.capacity}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Cost per Hour *</Label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={formData.costPerHour}
                        onChange={(e) => setFormData({ ...formData, costPerHour: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <label>
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Upload
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                  disabled={bulkUploadMutation.isPending}
                />
              </label>

              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/templates/rental-equipment-template.csv";
                  link.download = "rental-equipment-template.csv";
                  link.click();
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No rental equipment found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equip. #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Cost/Hr</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.equipmentNumber}</TableCell>
                      <TableCell>{item.equipmentName}</TableCell>
                      <TableCell>{item.equipmentType}</TableCell>
                      <TableCell>{vendors.find((v) => v.id === item.vendorId)?.vendorName ?? item.vendorId}</TableCell>
                      <TableCell>{item.model || "—"}</TableCell>
                      <TableCell>{item.year ?? "—"}</TableCell>
                      <TableCell>{parseFloat(item.costPerHour).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center flex-wrap">
                          <RentalEquipmentResourceMapper
                            rentalEquipmentId={item.id}
                            equipmentDisplayName={item.equipmentName}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => confirm("Delete this rental equipment?") && deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
