import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Add wavy pattern CSS
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

interface Material {
  id: number;
  materialCode: string;
  materialDescription: string;
  uom: string;
  materialType: string;
  materialGroup: string;
  materialClass: string;
  baseRate: number | string;
  createdAt: string;
  updatedAt: string;
}

interface MasterItem {
  id: number;
  name: string;
  description?: string | null;
}

// API functions
async function getMaterials(): Promise<Material[]> {
  const response = await fetch("/api/material-masters");
  if (!response.ok) throw new Error("Failed to fetch materials");
  return response.json();
}

async function createMaterial(data: Omit<Material, "id" | "createdAt" | "updatedAt">): Promise<Material> {
  const response = await fetch("/api/material-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create material");
  return response.json();
}

async function updateMaterial(
  id: number,
  data: Partial<Omit<Material, "id" | "createdAt" | "updatedAt">>
): Promise<Material> {
  const response = await fetch(`/api/material-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update material");
  return response.json();
}

async function deleteMaterial(id: number): Promise<void> {
  const response = await fetch(`/api/material-masters/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete material");
}

async function bulkUploadMaterials(csvData: any[]): Promise<Material[]> {
  const response = await fetch("/api/material-masters/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) throw new Error("Failed to upload materials");
  return response.json();
}

export default function MaterialMaster() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    materialCode: "",
    materialDescription: "",
    uom: "",
    materialType: "",
    materialGroup: "",
    materialClass: "common",
    baseRate: "",
  });

  // Fetch materials
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/material-masters"],
    queryFn: getMaterials,
  });

  // Fetch UOMs, material types, material groups for dropdowns
  const { data: uoms = [] } = useQuery({
    queryKey: ["/api/uoms"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/uoms");
      if (!res.ok) throw new Error("Failed to fetch UOMs");
      return res.json();
    },
  });

  const { data: materialTypes = [] } = useQuery({
    queryKey: ["/api/material-types"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/material-types");
      if (!res.ok) throw new Error("Failed to fetch material types");
      return res.json();
    },
  });

  const { data: materialGroups = [] } = useQuery({
    queryKey: ["/api/material-groups"],
    queryFn: async (): Promise<MasterItem[]> => {
      const res = await fetch("/api/material-groups");
      if (!res.ok) throw new Error("Failed to fetch material groups");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: "Material created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error creating material", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Material, "id" | "createdAt" | "updatedAt">> }) =>
      updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: "Material updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error updating material", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: "Material deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting material", variant: "destructive" });
    },
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadMaterials,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast({ title: `${data.length} materials uploaded successfully` });
    },
    onError: () => {
      toast({ title: "Error uploading materials", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      materialCode: "",
      materialDescription: "",
      uom: "",
      materialType: "",
      materialGroup: "",
      materialClass: "common",
      baseRate: "",
    });
    setEditingMaterial(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      materialCode: material.materialCode,
      materialDescription: material.materialDescription,
      uom: material.uom,
      materialType: material.materialType,
      materialGroup: material.materialGroup,
      materialClass: material.materialClass,
      baseRate: material.baseRate !== undefined && material.baseRate !== null ? String(material.baseRate) : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this material?")) {
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
          const baseRateIdx = headers.findIndex((h) => h.trim().toLowerCase() === "baserate" || h.trim().toLowerCase() === "base_rate");
          return {
            materialCode: values[headers.indexOf("materialCode")],
            materialDescription: values[headers.indexOf("materialDescription")],
            uom: values[headers.indexOf("uom")],
            materialType: values[headers.indexOf("materialType")],
            materialGroup: values[headers.indexOf("materialGroup")],
            materialClass: values[headers.indexOf("materialClass")] || "common",
            ...(baseRateIdx >= 0 && values[baseRateIdx] !== undefined ? { baseRate: values[baseRateIdx] || "0" } : {}),
          };
        });

        bulkUploadMutation.mutate(csvData);
      } catch (error) {
        toast({ title: "Error parsing CSV file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const filteredMaterials = materials.filter((material) =>
    material.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.materialDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full">
      <style>{wavedPatternStyle}</style>
      <div className="p-8 min-h-screen wavy-pattern" style={{
        backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'%3E%3Cstop offset=\'0%\' style=\'stop-color:rgba(107,114,128,0.08);stop-opacity:1\' /%3E%3Cstop offset=\'100%\' style=\'stop-color:rgba(107,114,128,0.03);stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d=\'M0,20 Q15,10 30,20 T60,20\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,35 Q15,25 30,35 T60,35\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,50 Q15,40 30,50 T60,50\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat'
      }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Material Master</h1>
            <p className="text-gray-600">Manage material codes, types, and classifications</p>
          </div>

          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl"
                  style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-green-700 to-blue-600 bg-clip-text text-transparent">
                      {editingMaterial ? "Edit Material" : "Add New Material"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="materialCode" className="font-semibold text-green-700">Material Code *</Label>
                      <Input
                        id="materialCode"
                        required
                        value={formData.materialCode}
                        onChange={(e) =>
                          setFormData({ ...formData, materialCode: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="materialDescription" className="font-semibold text-green-700">Description *</Label>
                      <Textarea
                        id="materialDescription"
                        required
                        value={formData.materialDescription}
                        onChange={(e) =>
                          setFormData({ ...formData, materialDescription: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="uom" className="font-semibold text-green-700">Unit of Measure *</Label>
                        <Select
                          value={formData.uom || undefined}
                          onValueChange={(v) => setFormData({ ...formData, uom: v })}
                          required
                        >
                          <SelectTrigger id="uom">
                            <SelectValue placeholder="Select UOM (add in UOM tab)" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              ...uoms,
                              ...(formData.uom && !uoms.some((u) => u.name === formData.uom)
                                ? [{ id: -1, name: formData.uom }]
                                : []),
                            ].map((u) => (
                              <SelectItem key={u.id} value={u.name}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="materialType" className="font-semibold text-green-700">Material Type *</Label>
                        <Select
                          value={formData.materialType || undefined}
                          onValueChange={(v) => setFormData({ ...formData, materialType: v })}
                          required
                        >
                          <SelectTrigger id="materialType">
                            <SelectValue placeholder="Select type (add in Material Type tab)" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              ...materialTypes,
                              ...(formData.materialType && !materialTypes.some((t) => t.name === formData.materialType)
                                ? [{ id: -1, name: formData.materialType }]
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="materialGroup" className="font-semibold text-green-700">Material Group *</Label>
                        <Select
                          value={formData.materialGroup || undefined}
                          onValueChange={(v) => setFormData({ ...formData, materialGroup: v })}
                          required
                        >
                          <SelectTrigger id="materialGroup">
                            <SelectValue placeholder="Select group (add in Material Group tab)" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              ...materialGroups,
                              ...(formData.materialGroup && !materialGroups.some((g) => g.name === formData.materialGroup)
                                ? [{ id: -1, name: formData.materialGroup }]
                                : []),
                            ].map((g) => (
                              <SelectItem key={g.id} value={g.name}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="materialClass">Material Class *</Label>
                        <Select value={formData.materialClass} onValueChange={(value) =>
                          setFormData({ ...formData, materialClass: value })
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mrp">MRP</SelectItem>
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="baseRate" className="font-semibold text-green-700">Base Rate (per UOM) *</Label>
                      <Input
                        id="baseRate"
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
                      {editingMaterial ? "Update" : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/templates/material-master-template.csv";
                  link.download = "material-master-template.csv";
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
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden" style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
            background: '#ffffff',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No materials found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-100 to-slate-100 border-b-2 border-gray-200">
                    <TableHead className="text-gray-900 font-bold">Code</TableHead>
                    <TableHead className="text-gray-900 font-bold">Description</TableHead>
                    <TableHead className="text-gray-900 font-bold">UOM</TableHead>
                    <TableHead className="text-gray-900 font-bold">Base Rate</TableHead>
                    <TableHead className="text-gray-900 font-bold">Type</TableHead>
                    <TableHead className="text-gray-900 font-bold">Group</TableHead>
                    <TableHead className="text-gray-900 font-bold">Class</TableHead>
                    <TableHead className="text-gray-900 font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material, index) => (
                    <TableRow
                      key={material.id}
                      className={`transition-colors duration-200 border-b border-gray-100 hover:shadow-sm ${index % 2 === 0
                        ? "bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100"
                        : "bg-gradient-to-r from-slate-50 to-sky-50 hover:from-slate-100 hover:to-sky-100"
                        }`}
                    >
                      <TableCell className="font-medium">{material.materialCode}</TableCell>
                      <TableCell>{material.materialDescription}</TableCell>
                      <TableCell>{material.uom}</TableCell>
                      <TableCell className="font-mono">
                        {typeof material.baseRate === "number"
                          ? material.baseRate.toFixed(2)
                          : Number(material.baseRate || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{material.materialType}</TableCell>
                      <TableCell>{material.materialGroup}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${material.materialClass === "mrp"
                            ? "bg-blue-100 text-blue-800"
                            : material.materialClass === "common"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                            }`}
                        >
                          {material.materialClass.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(material)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
