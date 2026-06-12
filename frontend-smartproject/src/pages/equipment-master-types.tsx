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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import EquipmentMasterLayout from "@/layouts/equipment-master-layout";

interface EquipmentType {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

async function getEquipmentTypes(): Promise<EquipmentType[]> {
  const res = await fetch("/api/equipment-types");
  if (!res.ok) throw new Error("Failed to fetch equipment types");
  return res.json();
}

async function createEquipmentType(data: { name: string; description?: string }): Promise<EquipmentType> {
  const res = await fetch("/api/equipment-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create");
  return res.json();
}

async function updateEquipmentType(
  id: number,
  data: Partial<{ name: string; description: string }>
): Promise<EquipmentType> {
  const res = await fetch(`/api/equipment-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function deleteEquipmentType(id: number): Promise<void> {
  const res = await fetch(`/api/equipment-types/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete");
}

export default function EquipmentMasterTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/equipment-types"],
    queryFn: getEquipmentTypes,
  });

  const createMutation = useMutation({
    mutationFn: createEquipmentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-types"] });
      toast({ title: "Equipment type created successfully" });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingItem(null);
    },
    onError: () => toast({ title: "Error creating equipment type", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description: string }> }) =>
      updateEquipmentType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-types"] });
      toast({ title: "Equipment type updated successfully" });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingItem(null);
    },
    onError: () => toast({ title: "Error updating equipment type", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipmentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-types"] });
      toast({ title: "Equipment type deleted successfully" });
    },
    onError: () => toast({ title: "Error deleting equipment type", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: EquipmentType) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || "" });
    setIsDialogOpen(true);
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.description && i.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <EquipmentMasterLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Equipment Type
            </h1>
            <p className="text-muted-foreground mt-1">Manage equipment types and categories</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) { setEditingItem(null); setFormData({ name: "", description: "" }); } }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setFormData({ name: "", description: "" })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Equipment Type
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit Equipment Type" : "Add Equipment Type"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Excavator, Crane, Loader"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional"
                        className="min-h-[80px]"
                      />
                    </div>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No equipment types found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => confirm("Delete this equipment type?") && deleteMutation.mutate(item.id)}
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
    </EquipmentMasterLayout>
  );
}
