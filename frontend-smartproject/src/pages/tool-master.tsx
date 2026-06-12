import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Upload, Download, Hammer } from "lucide-react";
import { ToolResourceMapper } from "@/components/project/tool-resource-mapper";
import { RESOURCE_HOURLY_UOM } from "@/lib/resource-uom";
interface Tool {
  id: number;
  toolNumber: string;
  name: string;
  toolType: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  unitOfMeasure: string;
  accessories?: string | null;
  unitRate: string;
  createdAt: string;
  updatedAt: string;
}

interface MasterItem {
  id: number;
  name: string;
}

interface ToolModelItem {
  id: number;
  name: string;
  manufacturer: string;
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof (body as { message?: unknown })?.message === "string"
    ? (body as { message: string }).message
    : fallback;
}

async function getTools(): Promise<Tool[]> {
  const response = await fetch("/api/tool-masters");
  if (!response.ok) throw new Error(await parseApiError(response, "Failed to fetch tools"));
  return response.json();
}

async function createTool(data: Omit<Tool, "id" | "createdAt" | "updatedAt">): Promise<Tool> {
  const response = await fetch("/api/tool-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Failed to create tool"));
  return response.json();
}

async function updateTool(
  id: number,
  data: Partial<Omit<Tool, "id" | "createdAt" | "updatedAt">>
): Promise<Tool> {
  const response = await fetch(`/api/tool-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Failed to update tool"));
  return response.json();
}

async function deleteTool(id: number): Promise<void> {
  const response = await fetch(`/api/tool-masters/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Failed to delete tool"));
}

async function bulkUploadTools(csvData: any[]): Promise<Tool[]> {
  const response = await fetch("/api/tool-masters/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.message === "string" ? body.message : "Failed to upload tools");
  }
  return response.json();
}

export default function ToolMasterPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const [formData, setFormData] = useState({
    toolNumber: "",
    name: "",
    toolType: "",
    description: "",
    brand: "",
    model: "",
    accessories: "",
    unitRate: "",
  });

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["/api/tool-masters"],
    queryFn: getTools,
  });

  const { data: toolTypes = [] } = useQuery({
    queryKey: ["/api/tool-types"],
    queryFn: async () => {
      const res = await fetch("/api/tool-types");
      if (!res.ok) throw new Error("Failed to load tool types");
      return res.json() as Promise<MasterItem[]>;
    },
  });

  const { data: manufacturers = [] } = useQuery({
    queryKey: ["/api/tool-manufacturers"],
    queryFn: async () => {
      const res = await fetch("/api/tool-manufacturers");
      if (!res.ok) throw new Error("Failed to load manufacturers");
      return res.json() as Promise<MasterItem[]>;
    },
  });

  const { data: toolModels = [] } = useQuery({
    queryKey: ["/api/tool-models"],
    queryFn: async () => {
      const res = await fetch("/api/tool-models");
      if (!res.ok) throw new Error("Failed to load models");
      return res.json() as Promise<ToolModelItem[]>;
    },
  });

  const modelsForBrand = formData.brand
    ? toolModels.filter((m) => m.manufacturer.toLowerCase() === formData.brand.toLowerCase())
    : [];

  const createMutation = useMutation({
    mutationFn: createTool,
    onSuccess: () => {
      toast({ title: "Tool created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tool-masters"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTool(id, data),
    onSuccess: () => {
      toast({ title: "Tool updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tool-masters"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Could not save tool", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTool,
    onSuccess: () => {
      toast({ title: "Tool deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tool-masters"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadTools,
    onSuccess: (rows) => {
      toast({ title: `${rows.length} tool(s) uploaded successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/tool-masters"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      toolNumber: "",
      name: "",
      toolType: "",
      description: "",
      brand: "",
      model: "",
      accessories: "",
      unitRate: "",
    });
    setEditingTool(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      unitOfMeasure: RESOURCE_HOURLY_UOM,
      description: formData.description || undefined,
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      accessories: formData.accessories || undefined,
    };
    if (editingTool) updateMutation.mutate({ id: editingTool.id, data: payload });
    else createMutation.mutate(payload as any);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      toolNumber: tool.toolNumber,
      name: tool.name,
      toolType: tool.toolType || "",
      description: tool.description || "",
      brand: tool.brand || "",
      model: tool.model || "",
      accessories: tool.accessories || "",
      unitRate: tool.unitRate,
    });
    setIsDialogOpen(true);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          toast({ title: "CSV must have data rows", variant: "destructive" });
          return;
        }
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/^\uFEFF/, ""));
        const required = ["toolNumber", "name", "toolType", "unitRate"];
        const missing = required.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          toast({ title: `CSV missing: ${missing.join(", ")}`, variant: "destructive" });
          return;
        }
        const csvData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => (row[h] = values[i] ?? ""));
          return {
            toolNumber: row.toolNumber || row.toolCode || "",
            name: row.name,
            toolType: row.toolType,
            description: row.description || undefined,
            brand: row.brand || undefined,
            model: row.model || undefined,
            unitOfMeasure: RESOURCE_HOURLY_UOM,
            accessories: row.accessories || undefined,
            unitRate: row.unitRate,
          };
        });
        bulkUploadMutation.mutate(csvData);
      } catch {
        toast({ title: "Error parsing CSV", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = tools.filter((t) =>
    [t.toolNumber, t.name, t.toolType ?? "", t.brand ?? "", t.model ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              placeholder="Search by tool number, name, brand, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tool
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTool ? "Edit Tool" : "Add Tool"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tool Number *</Label>
                      <Input required value={formData.toolNumber} onChange={(e) => setFormData({ ...formData, toolNumber: e.target.value })} />
                    </div>
                    <div>
                      <Label>Name *</Label>
                      <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Tool Type *</Label>
                    <select
                      className="w-full border rounded px-2 py-2 text-sm"
                      required
                      value={formData.toolType}
                      onChange={(e) => setFormData({ ...formData, toolType: e.target.value })}
                    >
                      <option value="">Select type</option>
                      {toolTypes.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Manufacturer</Label>
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData({ ...formData, brand: e.target.value, model: "" })
                        }
                      >
                        <option value="">—</option>
                        {manufacturers.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Model</Label>
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={formData.model}
                        disabled={!formData.brand}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      >
                        <option value="">—</option>
                        {modelsForBrand.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Hourly Rate ({RESOURCE_HOURLY_UOM}) *</Label>
                    <Input type="number" required step="0.01" value={formData.unitRate} onChange={(e) => setFormData({ ...formData, unitRate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Accessories</Label>
                    <Input value={formData.accessories} onChange={(e) => setFormData({ ...formData, accessories: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTool ? "Update" : "Create"}
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
              <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} disabled={bulkUploadMutation.isPending} />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = "/templates/tool-master-template.csv";
                link.download = "tool-master-template.csv";
                link.click();
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Accessories</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No tools found</TableCell></TableRow>
              ) : (
                filtered.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-mono text-xs">{tool.toolNumber}</TableCell>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{tool.toolType || "—"}</TableCell>
                    <TableCell>{tool.brand || "—"}</TableCell>
                    <TableCell>{tool.model || "—"}</TableCell>
                    <TableCell>{tool.unitRate} / {RESOURCE_HOURLY_UOM}</TableCell>
                    <TableCell>{tool.accessories || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ToolResourceMapper
                          toolId={tool.id}
                          toolName={tool.name}
                          onMappingChanged={() => queryClient.invalidateQueries({ queryKey: ["/api/allocation/tools"] })}
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(tool)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => confirm("Delete this tool?") && deleteMutation.mutate(tool.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
          <Hammer className="h-3.5 w-3.5" />
          Set up Manufacturer, Models, and Tool Type tabs first, then map each tool to a global tools resource.
        </p>
      </div>
  );
}
