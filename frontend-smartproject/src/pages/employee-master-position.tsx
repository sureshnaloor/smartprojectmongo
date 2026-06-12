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
import EmployeeMasterLayout from "@/layouts/employee-master-layout";

interface EmployeePosition {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

// API functions
async function getPositions(): Promise<EmployeePosition[]> {
    const response = await fetch("/api/employee-positions");
    if (!response.ok) throw new Error("Failed to fetch positions");
    return response.json();
}

async function createPosition(data: Omit<EmployeePosition, "id" | "createdAt" | "updatedAt">): Promise<EmployeePosition> {
    const response = await fetch("/api/employee-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create position");
    return response.json();
}

async function updatePosition(
    id: number,
    data: Partial<Omit<EmployeePosition, "id" | "createdAt" | "updatedAt">>
): Promise<EmployeePosition> {
    const response = await fetch(`/api/employee-positions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update position");
    return response.json();
}

async function deletePosition(id: number): Promise<void> {
    const response = await fetch(`/api/employee-positions/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete position");
}

export default function EmployeeMasterPosition() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EmployeePosition | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    const { data: positions = [], isLoading } = useQuery({
        queryKey: ["/api/employee-positions"],
        queryFn: getPositions,
    });

    const createMutation = useMutation({
        mutationFn: createPosition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employee-positions"] });
            toast({ title: "Position created successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: "Error creating position", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Omit<EmployeePosition, "id" | "createdAt" | "updatedAt">> }) =>
            updatePosition(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employee-positions"] });
            toast({ title: "Position updated successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: "Error updating position", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePosition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employee-positions"] });
            toast({ title: "Position deleted successfully" });
        },
        onError: () => {
            toast({ title: "Error deleting position", variant: "destructive" });
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

    const handleEdit = (item: EmployeePosition) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || "",
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this position?")) {
            deleteMutation.mutate(id);
        }
    };

    const filteredItems = positions.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <EmployeeMasterLayout>
            <div className="h-full">
                <div className="p-8 min-h-screen" style={{
                    backgroundImage: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 25%, #fff7ed 50%, #fed7aa 75%, #fffbeb 100%)',
                }}>
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-700 to-amber-600 bg-clip-text text-transparent mb-2">Position Master</h1>
                            <p className="text-zinc-600">Define administrative and organizational positions.</p>
                        </div>

                        {/* Actions Bar */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 mb-6 transition-all hover:shadow-xl">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Input
                                        placeholder="Search by position name or description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white border-zinc-200 focus:ring-orange-500 rounded-lg pl-3"
                                    />
                                </div>

                                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                    setIsDialogOpen(open);
                                    if (!open) resetForm();
                                }}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full sm:w-auto bg-orange-700 hover:bg-orange-800 text-white shadow-md transition-all hover:scale-105">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Position
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md overflow-hidden rounded-2xl p-0 border-none shadow-2xl">
                                        <div className="bg-gradient-to-br from-orange-600 to-amber-700 p-6 text-white">
                                            <DialogTitle className="text-2xl font-bold">
                                                {editingItem ? "Edit Position" : "Add New Position"}
                                            </DialogTitle>
                                            <p className="text-orange-100 text-sm mt-1">
                                                {editingItem ? "Modify the existing position title." : "Specify a new position for the hierarchy."}
                                            </p>
                                        </div>

                                        <form onSubmit={handleSubmit} className="p-6 bg-white space-y-5">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-sm font-semibold text-zinc-700">Position Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, name: e.target.value })
                                                    }
                                                    placeholder="e.g. Manager, Engineer, Analyst"
                                                    className="focus:ring-orange-500 border-zinc-200"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="description" className="text-sm font-semibold text-zinc-700">Description</Label>
                                                <Textarea
                                                    id="description"
                                                    value={formData.description}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, description: e.target.value })
                                                    }
                                                    placeholder="Optional details..."
                                                    className="min-h-[100px] focus:ring-orange-500 border-zinc-200"
                                                />
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => setIsDialogOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={createMutation.isPending || updateMutation.isPending}
                                                    className="flex-1 bg-orange-700 hover:bg-orange-800 text-white"
                                                >
                                                    {editingItem ? "Save Changes" : "Create Position"}
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-zinc-200 overflow-hidden transition-all hover:shadow-xl">
                            {isLoading ? (
                                <div className="p-20 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-700 mx-auto"></div>
                                    <p className="mt-4 text-zinc-500 font-medium">Loading positions...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="bg-zinc-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                        <Plus className="h-8 w-8 text-zinc-400" />
                                    </div>
                                    <p className="text-zinc-500 font-medium">No positions found matching your search.</p>
                                    <Button
                                        variant="link"
                                        className="text-orange-700 mt-2"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        Clear search
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/80 border-b border-zinc-200">
                                            <TableHead className="text-zinc-900 font-bold py-4">Position Name</TableHead>
                                            <TableHead className="text-zinc-900 font-bold py-4">Description</TableHead>
                                            <TableHead className="text-zinc-900 font-bold py-4 text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item, index) => (
                                            <TableRow
                                                key={item.id}
                                                className={`group transition-colors duration-200 border-b border-zinc-100 hover:bg-orange-50/50 ${index % 2 === 0 ? "bg-white" : "bg-zinc-50/30"}`}
                                            >
                                                <TableCell className="font-semibold text-orange-800 py-4 capitalize">{item.name}</TableCell>
                                                <TableCell className="py-4 text-zinc-600 max-w-md truncate">
                                                    {item.description || <span className="text-zinc-300 italic">No description provided</span>}
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(item)}
                                                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                                            title="Edit Position"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-100"
                                                            title="Delete Position"
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
            </div>
        </EmployeeMasterLayout>
    );
}
