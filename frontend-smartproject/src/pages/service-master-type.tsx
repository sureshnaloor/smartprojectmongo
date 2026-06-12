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

interface ServiceType {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

async function getTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/service-types");
  if (!res.ok) throw new Error("Failed to fetch service types");
  return res.json();
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

async function createType(data: { name: string; description?: string }): Promise<ServiceType> {
  const res = await fetch("/api/service-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

async function updateType(id: number, data: Partial<{ name: string; description: string }>): Promise<ServiceType> {
  const res = await fetch(`/api/service-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

async function deleteType(id: number): Promise<void> {
  const res = await fetch(`/api/service-types/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export default function ServiceMasterType() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: types = [], isLoading } = useQuery({ queryKey: ["/api/service-types"], queryFn: getTypes });

  const createMutation = useMutation({
    mutationFn: createType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: "Service Type created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast({ title: error.message || "Error creating Service Type", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description: string }> }) => updateType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: "Service Type updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast({ title: error.message || "Error updating Service Type", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: "Service Type deleted successfully" });
    },
    onError: (error: Error) => toast({ title: error.message || "Error deleting Service Type", variant: "destructive" }),
  });

  const resetForm = () => { setFormData({ name: "", description: "" }); setEditingItem(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data: formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (item: ServiceType) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || "" });
    setIsDialogOpen(true);
  };

  const filteredItems = types.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.description && i.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Service Type</h1>
          <p className="text-muted-foreground mt-1">Manage Service Types used in Service Master.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
            <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild><Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" />Add Service Type</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingItem ? "Edit Service Type" : "Add Service Type"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><Label>Name *</Label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingItem ? "Update" : "Create"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? <div className="p-8 text-center">Loading...</div> : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No service types found.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => confirm("Delete?") && deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
