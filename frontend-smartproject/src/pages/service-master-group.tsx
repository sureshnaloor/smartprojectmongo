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
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ServiceType {
  id: number;
  name: string;
  description?: string | null;
}

interface ServiceGroup {
  id: number;
  name: string;
  description: string | null;
  serviceTypeId: number;
  createdAt: string;
  updatedAt: string;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

async function getTypes(): Promise<ServiceType[]> {
  const res = await fetch("/api/service-types");
  if (!res.ok) throw new Error("Failed to fetch service types");
  return res.json();
}

async function getGroups(): Promise<ServiceGroup[]> {
  const res = await fetch("/api/service-groups");
  if (!res.ok) throw new Error("Failed to fetch service groups");
  return res.json();
}

async function createGroup(data: {
  name: string;
  description?: string;
  serviceTypeId: number;
}): Promise<ServiceGroup> {
  const res = await fetch("/api/service-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

async function updateGroup(
  id: number,
  data: Partial<{ name: string; description?: string; serviceTypeId: number }>
): Promise<ServiceGroup> {
  const res = await fetch(`/api/service-groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

async function deleteGroup(id: number): Promise<void> {
  const res = await fetch(`/api/service-groups/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export default function ServiceMasterGroup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serviceTypeId: "",
  });

  const { data: types = [] } = useQuery({
    queryKey: ["/api/service-types"],
    queryFn: getTypes,
  });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["/api/service-groups"],
    queryFn: getGroups,
  });

  const typeNameById = new Map(types.map((t) => [t.id, t.name]));

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-groups"] });
      toast({ title: "Service Group created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Error creating Service Group", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description?: string; serviceTypeId: number }> }) =>
      updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-groups"] });
      toast({ title: "Service Group updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Error updating Service Group", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-groups"] });
      toast({ title: "Service Group deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Error deleting Service Group", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", serviceTypeId: "" });
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceTypeId) {
      toast({ title: "Please select a service type", variant: "destructive" });
      return;
    }
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      serviceTypeId: parseInt(formData.serviceTypeId, 10),
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (item: ServiceGroup) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      serviceTypeId: item.serviceTypeId ? String(item.serviceTypeId) : "",
    });
    setIsDialogOpen(true);
  };

  const filteredItems = groups.filter((item) => {
    const typeName = typeNameById.get(item.serviceTypeId) ?? "";
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      typeName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Service Group
          </h1>
          <p className="text-muted-foreground mt-1">Manage service groups under each service type.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by type, name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Dialog
              open={isDialogOpen}
              onOpenChange={(o) => {
                setIsDialogOpen(o);
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={resetForm} disabled={types.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Service Group" : "Add Service Group"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Service Type *</Label>
                    <Select
                      value={formData.serviceTypeId || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, serviceTypeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={String(type.id)}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
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
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No service groups found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{typeNameById.get(item.serviceTypeId) ?? "—"}</TableCell>
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
                          onClick={() =>
                            confirm("Delete this service group?") && deleteMutation.mutate(item.id)
                          }
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
