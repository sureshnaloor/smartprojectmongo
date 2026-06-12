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
import ToolMasterLayout from "@/layouts/tool-master-layout";

interface Manufacturer {
  id: number;
  name: string;
  description: string | null;
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof (body as { message?: unknown })?.message === "string"
    ? (body as { message: string }).message
    : fallback;
}

async function getManufacturers(): Promise<Manufacturer[]> {
  const res = await fetch("/api/tool-manufacturers");
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to fetch manufacturers"));
  return res.json();
}

export default function ToolMasterManufacturers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Manufacturer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/tool-manufacturers"],
    queryFn: getManufacturers,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tool-manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "Failed to create"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tool-manufacturers"] });
      toast({ title: "Manufacturer created" });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingItem(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) throw new Error("No item selected");
      const res = await fetch(`/api/tool-manufacturers/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await parseApiError(res, "Failed to update"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tool-manufacturers"] });
      toast({ title: "Manufacturer updated" });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingItem(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tool-manufacturers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseApiError(res, "Failed to delete"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tool-manufacturers"] });
      toast({ title: "Manufacturer deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ToolMasterLayout>
      <div className="p-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <Input
            placeholder="Search manufacturers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ name: "", description: "" });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Manufacturer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit" : "Add"} Manufacturer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
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
                <Button
                  onClick={() => (editingItem ? updateMutation.mutate() : createMutation.mutate())}
                  disabled={!formData.name.trim()}
                >
                  {editingItem ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3}>Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No manufacturers yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({
                            name: item.name,
                            description: item.description || "",
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => {
                          if (window.confirm(`Delete "${item.name}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
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
    </ToolMasterLayout>
  );
}
