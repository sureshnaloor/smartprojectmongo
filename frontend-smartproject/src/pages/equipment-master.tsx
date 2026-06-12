import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const wavedPatternStyle = `
  @keyframes wave {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
  }
  .wavy-pattern {
    position: relative;
  }
  .wavy-pattern::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgba(107,114,128,0.08);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgba(107,114,128,0.03);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,20 Q15,10 30,20 T60,20' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,35 Q15,25 30,35 T60,35' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,50 Q15,40 30,50 T60,50' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: repeat;
    pointer-events: none;
    z-index: 0;
  }
  .wavy-pattern > * {
    position: relative;
    z-index: 1;
  }
`;

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { EquipmentResourceMapper } from "@/components/project/equipment-resource-mapper";

interface Equipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  year?: number | null;
  capacity?: string;
  unit?: string;
  costPerHour: string;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

interface MasterItem {
  id: number;
  name: string;
  description?: string | null;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2000 }, (_, i) => CURRENT_YEAR - i);

// API functions
async function getEquipment(): Promise<Equipment[]> {
  const response = await fetch("/api/equipment-masters");
  if (!response.ok) throw new Error("Failed to fetch equipment");
  return response.json();
}

async function createEquipment(
  data: Omit<Equipment, "id" | "createdAt" | "updatedAt">
): Promise<Equipment> {
  const response = await fetch("/api/equipment-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create equipment");
  return response.json();
}

async function updateEquipment(
  id: number,
  data: Partial<Omit<Equipment, "id" | "createdAt" | "updatedAt">>
): Promise<Equipment> {
  const response = await fetch(`/api/equipment-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update equipment");
  return response.json();
}

async function deleteEquipment(id: number): Promise<void> {
  const response = await fetch(`/api/equipment-masters/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to delete equipment");
}

async function bulkUploadEquipment(csvData: any[]): Promise<Equipment[]> {
  const response = await fetch("/api/equipment-masters/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) throw new Error("Failed to upload equipment");
  return response.json();
}

export default function EquipmentMasterPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

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
    remarks: "",
  });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: getEquipment,
  });

  const { data: equipmentTypes = [] } = useQuery({
    queryKey: ["/api/equipment-types"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/equipment-types");
      if (!res.ok) throw new Error("Failed to fetch equipment types");
      return res.json();
    },
  });

  const { data: equipmentManufacturers = [] } = useQuery({
    queryKey: ["/api/equipment-manufacturers"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/equipment-manufacturers");
      if (!res.ok) throw new Error("Failed to fetch manufacturers");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      toast({ title: "Equipment created successfully" });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateEquipment(id, data),
    onSuccess: () => {
      toast({ title: "Equipment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      toast({ title: "Equipment deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadEquipment,
    onSuccess: () => {
      toast({ title: "Equipment uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      remarks: "",
    });
    setEditingEquipment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      ...formData,
      year: formData.year === "" ? undefined : Number(formData.year),
    };
    if (editingEquipment) {
      updateMutation.mutate({
        id: editingEquipment.id,
        data: { ...payload, status: editingEquipment.status },
      });
    } else {
      createMutation.mutate(payload as Omit<Equipment, "id" | "createdAt" | "updatedAt">);
    }
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({
      equipmentNumber: eq.equipmentNumber,
      equipmentName: eq.equipmentName,
      equipmentType: eq.equipmentType,
      description: eq.description || "",
      manufacturer: eq.manufacturer || "",
      model: eq.model || "",
      year: eq.year ?? "",
      capacity: eq.capacity || "",
      unit: eq.unit || "",
      costPerHour: eq.costPerHour,
      remarks: eq.remarks || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this equipment?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());

        const csvData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const yearVal = values[headers.indexOf("year")];
          return {
            equipmentNumber: values[headers.indexOf("equipmentNumber")],
            equipmentName: values[headers.indexOf("equipmentName")],
            equipmentType: values[headers.indexOf("equipmentType")],
            description: values[headers.indexOf("description")] || "",
            manufacturer: values[headers.indexOf("manufacturer")] || "",
            model: values[headers.indexOf("model")] || "",
            year: yearVal ? parseInt(yearVal, 10) : undefined,
            capacity: values[headers.indexOf("capacity")] || "",
            unit: values[headers.indexOf("unit")] || "",
            costPerHour: values[headers.indexOf("costPerHour")],
            status: values[headers.indexOf("status")] || "Active",
            remarks: values[headers.indexOf("remarks")] || "",
          };
        });

        bulkUploadMutation.mutate(csvData);
      } catch (error) {
        toast({ title: "Error parsing CSV file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const filteredEquipment = equipment.filter((eq) =>
    eq.equipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipmentType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <style>{wavedPatternStyle}</style>
      <div className="w-full">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Equipment Master
            </h1>
            <p className="text-muted-foreground mt-2">Manage your equipment inventory and resources</p>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by equipment number, name, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Equipment
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingEquipment ? "Edit Equipment" : "Add New Equipment"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="equipmentNumber" className="font-semibold text-stone-700">
                      Equipment Number *
                    </Label>
                    <Input
                      id="equipmentNumber"
                      required
                      value={formData.equipmentNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, equipmentNumber: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="equipmentName" className="font-semibold text-stone-700">
                        Equipment Name *
                      </Label>
                      <Input
                        id="equipmentName"
                        required
                        value={formData.equipmentName}
                        onChange={(e) =>
                          setFormData({ ...formData, equipmentName: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="equipmentType" className="font-semibold text-stone-700">
                        Equipment Type *
                      </Label>
                      <Select
                        value={formData.equipmentType || undefined}
                        onValueChange={(v) => setFormData({ ...formData, equipmentType: v })}
                        required
                      >
                        <SelectTrigger id="equipmentType">
                          <SelectValue placeholder="Select type (add in Equipment Type tab)" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            ...equipmentTypes,
                            ...(formData.equipmentType && !equipmentTypes.some((t) => t.name === formData.equipmentType)
                              ? [{ id: -1, name: formData.equipmentType }]
                              : []),
                          ].map((t) => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="font-semibold text-stone-700">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="manufacturer" className="font-semibold text-stone-700">
                        Manufacturer / OEM
                      </Label>
                      <Select
                        value={formData.manufacturer || undefined}
                        onValueChange={(v) => setFormData({ ...formData, manufacturer: v })}
                      >
                        <SelectTrigger id="manufacturer">
                          <SelectValue placeholder="Select manufacturer (add in Manufacturer tab)" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            ...equipmentManufacturers,
                            ...(formData.manufacturer && !equipmentManufacturers.some((m) => m.name === formData.manufacturer)
                              ? [{ id: -1, name: formData.manufacturer }]
                              : []),
                          ].map((m) => (
                            <SelectItem key={m.id} value={m.name}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="model" className="font-semibold text-stone-700">
                        Model
                      </Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="year" className="font-semibold text-stone-700">
                      Year
                    </Label>
                    <Select
                      value={formData.year === "" ? undefined : String(formData.year)}
                      onValueChange={(v) => setFormData({ ...formData, year: v === "" ? "" : Number(v) })}
                    >
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Select year (2001 onwards)" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="capacity" className="font-semibold text-stone-700">
                        Capacity
                      </Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) =>
                          setFormData({ ...formData, capacity: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="unit" className="font-semibold text-stone-700">
                        Unit
                      </Label>
                      <Input
                        id="unit"
                        value={formData.unit}
                        onChange={(e) =>
                          setFormData({ ...formData, unit: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="costPerHour" className="font-semibold text-stone-700">
                      Cost per Hour *
                    </Label>
                    <Input
                      id="costPerHour"
                      required
                      type="number"
                      step="0.01"
                      value={formData.costPerHour}
                      onChange={(e) =>
                        setFormData({ ...formData, costPerHour: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="remarks" className="font-semibold text-stone-700">
                      Remarks
                    </Label>
                    <Input
                      id="remarks"
                      value={formData.remarks}
                      onChange={(e) =>
                        setFormData({ ...formData, remarks: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : "Save Equipment"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = "/templates/equipment-master-template.csv";
                link.download = "equipment-master-template.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="gap-2"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            <label>
              <Button variant="outline" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </span>
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={bulkUploadMutation.isPending}
              />
            </label>
          </div>

          {/* Table */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)",
              background: "#ffffff",
              border: "1px solid rgba(120, 113, 108, 0.3)",
            }}
          >
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No equipment found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-100 to-slate-100 border-b-2 border-gray-200">
                      <TableHead className="text-gray-900 font-bold">Equip. #</TableHead>
                      <TableHead className="text-gray-900 font-bold">Name</TableHead>
                      <TableHead className="text-gray-900 font-bold">Type</TableHead>
                      <TableHead className="text-gray-900 font-bold">Manufacturer</TableHead>
                      <TableHead className="text-gray-900 font-bold">Model</TableHead>
                      <TableHead className="text-gray-900 font-bold">Year</TableHead>
                      <TableHead className="text-gray-900 font-bold">Cost/Hour</TableHead>
                      <TableHead className="text-gray-900 font-bold">Status</TableHead>
                      <TableHead className="text-gray-900 font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.map((eq, index) => (
                      <TableRow
                        key={eq.id}
                        className={`transition-colors duration-200 border-b border-gray-200 hover:shadow-sm ${index % 2 === 0
                            ? "bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100"
                            : "bg-gradient-to-r from-slate-50 to-sky-50 hover:from-slate-100 hover:to-sky-100"
                          }`}
                      >
                        <TableCell className="font-medium">{eq.equipmentNumber}</TableCell>
                        <TableCell>{eq.equipmentName}</TableCell>
                        <TableCell>{eq.equipmentType}</TableCell>
                        <TableCell>{eq.manufacturer || "-"}</TableCell>
                        <TableCell>{eq.model || "-"}</TableCell>
                        <TableCell>{eq.year ?? "-"}</TableCell>
                        <TableCell>{parseFloat(eq.costPerHour).toFixed(2)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-medium ${eq.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {eq.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EquipmentResourceMapper
                              equipmentId={eq.id}
                              equipmentName={eq.equipmentName}
                            />
                            <button
                              onClick={() => handleEdit(eq)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(eq.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
