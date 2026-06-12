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
import { Plus, Pencil, Trash2, Upload, Download, Users, HardDrive } from "lucide-react";

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
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgba(20,184,166,0.08);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgba(20,184,166,0.03);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,20 Q15,10 30,20 T60,20' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,35 Q15,25 30,35 T60,35' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,50 Q15,40 30,50 T60,50' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: repeat;
    pointer-events: none;
    z-index: 0;
  }
  .wavy-pattern > * {
    position: relative;
    z-index: 1;
  }
`;

// Resource type definitions
type ResourceType = "manpower" | "equipment" | "rental_manpower" | "rental_equipment" | "tools";

interface Resource {
  id: number;
  type: ResourceType;
  name: string;
  description?: string;
  unitOfMeasure: string;
  unitRate: number | string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// API functions
async function getResources(): Promise<Resource[]> {
  const response = await fetch("/api/resources");
  if (!response.ok) throw new Error("Failed to fetch resources");
  return response.json();
}

async function createResource(data: Omit<Resource, "id" | "createdAt" | "updatedAt">): Promise<Resource> {
  const response = await fetch("/api/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create resource");
  return response.json();
}

async function updateResource(id: number, data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>): Promise<Resource> {
  const response = await fetch(`/api/resources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update resource");
  return response.json();
}

async function deleteResource(id: number): Promise<void> {
  const response = await fetch(`/api/resources/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete resource");
}

async function bulkUploadResources(csvData: any[]): Promise<Resource[]> {
  const response = await fetch("/api/resources/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) throw new Error("Failed to upload resources");
  return response.json();
}

interface MappedEntities {
  resourceType: string;
  ownManpower: Array<{ id: number; employeeNumber: string; empFirstName: string; empLastName: string }>;
  rentalManpower: any[];
  ownEquipment: Array<{ id: number; equipmentNumber: string; equipmentName: string }>;
  rentalEquipment: any[];
}

async function getMappedEntities(resourceId: number): Promise<MappedEntities> {
  const response = await fetch(`/api/resources/${resourceId}/mapped-entities`);
  if (!response.ok) throw new Error("Failed to fetch mapped entities");
  return response.json();
}

export default function ResourceMaster() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    description: "",
    unitOfMeasure: "",
    unitRate: "",
    remarks: "",
  });

  // Queries and mutations
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: getResources,
  });

  const { data: mappedEntities, isLoading: mappedLoading } = useQuery({
    queryKey: ["resources", selectedResourceId, "mapped-entities"],
    queryFn: () => getMappedEntities(selectedResourceId!),
    enabled: selectedResourceId != null,
  });

  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Success",
        description: "Resource created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create resource",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">> }) => updateResource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Success",
        description: "Resource updated successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update resource",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Success",
        description: "Resource deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive",
      });
    },
  });

  // Bulk upload mutation for CSV imports
  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadResources,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({ title: `${data.length} resources uploaded successfully` });
    },
    onError: () => {
      toast({ title: "Error uploading resources", variant: "destructive" });
    },
  });

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
          return {
            type: values[headers.indexOf("type")],
            name: values[headers.indexOf("name")],
            description: values[headers.indexOf("description")] || "",
            unitOfMeasure: values[headers.indexOf("unitOfMeasure")],
            unitRate: values[headers.indexOf("unitRate")] || "0",
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

  // Form handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      type: formData.type as ResourceType,
      name: formData.name,
      description: formData.description || undefined,
      unitOfMeasure: formData.unitOfMeasure,
      unitRate: formData.unitRate,
      remarks: formData.remarks || undefined,
    };

    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      type: resource.type,
      name: resource.name,
      description: resource.description || "",
      unitOfMeasure: resource.unitOfMeasure,
      unitRate: String(resource.unitRate),
      remarks: resource.remarks || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      deleteMutation.mutate(id);
    }
  };

  const selectedResource = resources.find((r) => r.id === selectedResourceId);

  const resetForm = () => {
    setFormData({
      type: "",
      name: "",
      description: "",
      unitOfMeasure: "",
      unitRate: "",
      remarks: "",
    });
    setEditingResource(null);
  };

  return (
    <>
      <style>{wavedPatternStyle}</style>
      <div className="flex-1 space-y-4 p-8 pt-6 wavy-pattern" style={{
        backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'%3E%3Cstop offset=\'0%\' style=\'stop-color:rgba(107,114,128,0.08);stop-opacity:1\' /%3E%3Cstop offset=\'100%\' style=\'stop-color:rgba(107,114,128,0.03);stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d=\'M0,20 Q15,10 30,20 T60,20\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,35 Q15,25 30,35 T60,35\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,50 Q15,40 30,50 T60,50\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat'
      }}>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Resource Master</h2>
          <div className="flex items-center space-x-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent style={{
                backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(107, 114, 128, 0.3)'
              }}>
                <DialogHeader>
                  <DialogTitle style={{
                    backgroundImage: 'linear-gradient(to right, rgb(107, 114, 128), rgb(148, 163, 184))',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 'bold'
                  }}>
                    {editingResource ? "Edit Resource" : "Create New Resource"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="font-semibold text-gray-700">Resource Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manpower">Manpower</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="rental_manpower">Rental Manpower</SelectItem>
                        <SelectItem value="rental_equipment">Rental Equipment</SelectItem>
                        <SelectItem value="tools">Tools</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold text-gray-700">Resource Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-semibold text-gray-700">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasure" className="font-semibold text-gray-700">Unit of Measure</Label>
                    <Input
                      id="unitOfMeasure"
                      value={formData.unitOfMeasure}
                      onChange={(e) =>
                        setFormData({ ...formData, unitOfMeasure: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitRate" className="font-semibold text-teal-700">Unit Rate</Label>
                    <Input
                      id="unitRate"
                      type="number"
                      step="0.01"
                      value={formData.unitRate}
                      onChange={(e) =>
                        setFormData({ ...formData, unitRate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remarks" className="font-semibold text-teal-700">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={formData.remarks}
                      onChange={(e) =>
                        setFormData({ ...formData, remarks: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingResource ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = "/templates/resource-master-template.csv";
                link.download = "resource-master-template.csv";
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

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Top section: Resources list (scrollable if needed) */}
          <div className="rounded-md border border-gray-200 flex-shrink-0 overflow-hidden" style={{
            boxShadow: '0 4px 6px -1px rgba(107, 114, 128, 0.1), 0 2px 4px -1px rgba(107, 114, 128, 0.06)'
          }}>
            <div className="max-h-[40vh] overflow-y-auto">
              <Table>
                <TableHeader style={{
                  backgroundImage: 'linear-gradient(to right, rgb(243, 244, 246), rgb(229, 231, 235))',
                }}>
                  <TableRow>
                    <TableHead className="font-bold text-gray-900">Type</TableHead>
                    <TableHead className="font-bold text-gray-900">Name</TableHead>
                    <TableHead className="font-bold text-gray-900">Description</TableHead>
                    <TableHead className="font-bold text-gray-900">Unit of Measure</TableHead>
                    <TableHead className="font-bold text-gray-900">Unit Rate</TableHead>
                    <TableHead className="font-bold text-gray-900">Remarks</TableHead>
                    <TableHead className="font-bold text-gray-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource, index) => (
                    <TableRow
                      key={resource.id}
                      className={`${index % 2 === 0 ? "bg-gradient-to-r from-gray-50 to-slate-50" : "bg-gradient-to-r from-slate-50 to-sky-50"} cursor-pointer hover:opacity-90 ${selectedResourceId === resource.id ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
                      style={{ borderColor: "rgba(107, 114, 128, 0.2)", transition: "background-color 0.2s ease" }}
                      onClick={() => setSelectedResourceId(resource.id)}
                    >
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${resource.type === "manpower" ? "bg-blue-100 text-blue-800" : resource.type === "equipment" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                          {resource.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell>{resource.description}</TableCell>
                      <TableCell>{resource.unitOfMeasure}</TableCell>
                      <TableCell>{resource.unitRate}</TableCell>
                      <TableCell>{resource.remarks}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(resource)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(resource.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bottom section: Mapped entities for selected resource */}
          <div className="rounded-md border border-gray-200 flex-1 min-h-[200px] overflow-hidden flex flex-col bg-white" style={{
            boxShadow: '0 4px 6px -1px rgba(107, 114, 128, 0.1), 0 2px 4px -1px rgba(107, 114, 128, 0.06)'
          }}>
            <div className="px-4 py-3 border-b border-gray-200 bg-slate-50 font-semibold text-gray-800">
              {selectedResource ? (
                <>Mapped entities for: <span className="text-primary">{selectedResource.name}</span></>
              ) : (
                "Select a resource above to view mapped manpower and equipment"
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {!selectedResourceId ? (
                <p className="text-sm text-gray-500">Click a resource row to see its mapped employees or equipment below.</p>
              ) : mappedLoading ? (
                <div className="py-6 text-center text-gray-500">Loading mapped entities...</div>
              ) : mappedEntities ? (
                <div className="space-y-4">
                  {mappedEntities.resourceType === "manpower" && (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4" />
                          Own Manpower (Employee Master)
                        </h4>
                        {mappedEntities.ownManpower.length === 0 ? (
                          <p className="text-sm text-gray-500 pl-6">No employees mapped to this resource.</p>
                        ) : (
                          <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
                            {mappedEntities.ownManpower.map((emp: any) => (
                              <li key={emp.id}>
                                {emp.employeeNumber} – {emp.empFirstName} {emp.empLastName}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4" />
                          Rental Manpower
                        </h4>
                        {mappedEntities.rentalManpower.length === 0 ? (
                          <p className="text-sm text-gray-500 pl-6">No rental manpower mapped. (Mapping can be added later.)</p>
                        ) : (
                          <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
                            {mappedEntities.rentalManpower.map((r: any) => (
                              <li key={r.id}>{r.employeeNumber} – {r.empFirstName} {r.empLastName}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                  {mappedEntities.resourceType === "equipment" && (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                          <HardDrive className="h-4 w-4" />
                          Own Equipment (Equipment Master)
                        </h4>
                        {mappedEntities.ownEquipment.length === 0 ? (
                          <p className="text-sm text-gray-500 pl-6">No equipment mapped to this resource.</p>
                        ) : (
                          <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
                            {mappedEntities.ownEquipment.map((eq: any) => (
                              <li key={eq.id}>
                                {eq.equipmentNumber} – {eq.equipmentName}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                          <HardDrive className="h-4 w-4" />
                          Rental Equipment
                        </h4>
                        {mappedEntities.rentalEquipment.length === 0 ? (
                          <p className="text-sm text-gray-500 pl-6">No rental equipment mapped. (Mapping can be added later.)</p>
                        ) : (
                          <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
                            {mappedEntities.rentalEquipment.map((r: any) => (
                              <li key={r.id}>{r.equipmentNumber} – {r.equipmentName}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                  {mappedEntities.resourceType !== "manpower" && mappedEntities.resourceType !== "equipment" && (
                    <p className="text-sm text-gray-500">Mapped entities are shown for manpower and equipment resources only.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 