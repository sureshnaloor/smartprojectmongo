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

interface Uom {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

// API functions
async function getUoms(): Promise<Uom[]> {
    const response = await fetch("/api/uoms");
    if (!response.ok) throw new Error("Failed to fetch UOMs");
    return response.json();
}

async function createUom(data: Omit<Uom, "id" | "createdAt" | "updatedAt">): Promise<Uom> {
    const response = await fetch("/api/uoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create UOM");
    return response.json();
}

async function updateUom(
    id: number,
    data: Partial<Omit<Uom, "id" | "createdAt" | "updatedAt">>
): Promise<Uom> {
    const response = await fetch(`/api/uoms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update UOM");
    return response.json();
}

async function deleteUom(id: number): Promise<void> {
    const response = await fetch(`/api/uoms/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete UOM");
}

export default function MaterialMasterUom() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Uom | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    const { data: uoms = [], isLoading } = useQuery({
        queryKey: ["/api/uoms"],
        queryFn: getUoms,
    });

    const createMutation = useMutation({
        mutationFn: createUom,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/uoms"] });
            toast({ title: "UOM created successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: "Error creating UOM", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Uom, "id" | "createdAt" | "updatedAt">> }) =>
            updateUom(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/uoms"] });
            toast({ title: "UOM updated successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: "Error updating UOM", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteUom,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/uoms"] });
            toast({ title: "UOM deleted successfully" });
        },
        onError: () => {
            toast({ title: "Error deleting UOM", variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({ name: "", description: "" });
        setEditingItem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (item: Uom) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this UOM?")) {
            deleteMutation.mutate(id);
        }
    };

    const filteredItems = uoms.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-full">
            <div className="p-8 min-h-screen" style={{
                backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%)',
            }}>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Unit of Measure</h1>
                        <p className="text-gray-600">Manage Units of Measure (UOM) used in Material Master.</p>
                    </div>

                    {/* Actions Bar */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Search by name or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1"
                            />

                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => resetForm()}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add UOM
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md"
                                    style={{
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
                                        background: 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 100%)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)'
                                    }}
                                >
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-green-700 to-blue-600 bg-clip-text text-transparent">
                                            {editingItem ? "Edit UOM" : "Add New UOM"}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Label htmlFor="name" className="font-semibold text-green-700">Name *</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                                placeholder="e.g. KG, L, M"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="description" className="font-semibold text-green-700">Description</Label>
                                            <Textarea
                                                id="description"
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, description: e.target.value })
                                                }
                                                placeholder="Optional details"
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                                                {editingItem ? "Update UOM" : "Create UOM"}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
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
                        ) : filteredItems.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No UOMs found
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-gray-100 to-slate-100 border-b-2 border-gray-200">
                                        <TableHead className="text-gray-900 font-bold w-1/3">Name</TableHead>
                                        <TableHead className="text-gray-900 font-bold">Description</TableHead>
                                        <TableHead className="text-gray-900 font-bold w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item, index) => (
                                        <TableRow
                                            key={item.id}
                                            className={`transition-colors duration-200 border-b border-gray-100 hover:shadow-sm ${index % 2 === 0
                                                ? "bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100"
                                                : "bg-gradient-to-r from-slate-50 to-sky-50 hover:from-slate-100 hover:to-sky-100"
                                                }`}
                                        >
                                            <TableCell className="font-medium text-blue-700">{item.name}</TableCell>
                                            <TableCell>{item.description || <span className="text-gray-400 italic">No description</span>}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 transition-colors"
                                                        title="Delete"
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
