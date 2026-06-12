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

interface EmployeeGrade {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

// API functions
async function getGrades(): Promise<EmployeeGrade[]> {
    const response = await fetch("/api/employee-grades");
    if (!response.ok) throw new Error("Failed to fetch grades");
    return response.json();
}

async function createGrade(data: Omit<EmployeeGrade, "id" | "createdAt" | "updatedAt">): Promise<EmployeeGrade> {
    const response = await fetch("/api/employee-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create grade");
    return response.json();
}

async function updateGrade(
    id: number,
    data: Partial<Omit<EmployeeGrade, "id" | "createdAt" | "updatedAt">>
): Promise<EmployeeGrade> {
    const response = await fetch(`/api/employee-grades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update grade");
    return response.json();
}

async function deleteGrade(id: number): Promise<void> {
    const response = await fetch(`/api/employee-grades/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete grade");
}

export default function EmployeeMasterGrade() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EmployeeGrade | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    const { data: grades = [], isLoading } = useQuery({
        queryKey: ["/api/employee-grades"],
        queryFn: getGrades,
    });

    const createMutation = useMutation({
        mutationFn: createGrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employee-grades"] });
            toast({ title: "Grade created successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: "Error creating grade", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Omit<EmployeeGrade, "id" | "createdAt" | "updatedAt">> }) =>
            updateGrade(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employee-grades"] });
            toast({ title: "Grade updated successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: () => {
            toast({ title: "Error updating grade", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteGrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employee-grades"] });
            toast({ title: "Grade deleted successfully" });
        },
        onError: () => {
            toast({ title: "Error deleting grade", variant: "destructive" });
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

    const handleEdit = (item: EmployeeGrade) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || "",
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this grade?")) {
            deleteMutation.mutate(id);
        }
    };

    const filteredItems = grades.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <EmployeeMasterLayout>
            <div className="h-full">
                <div className="p-8 min-h-screen" style={{
                    backgroundImage: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 25%, #f5f3ff 50%, #ede9fe 75%, #fdf4ff 100%)',
                }}>
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent mb-2">Grade Master</h1>
                            <p className="text-zinc-600">Manage employee salary and performance grades.</p>
                        </div>

                        {/* Actions Bar */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 mb-6 transition-all hover:shadow-xl">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Input
                                        placeholder="Search by grade name or description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white border-zinc-200 focus:ring-purple-500 rounded-lg pl-3"
                                    />
                                </div>

                                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                    setIsDialogOpen(open);
                                    if (!open) resetForm();
                                }}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white shadow-md transition-all hover:scale-105">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Grade
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md overflow-hidden rounded-2xl p-0 border-none shadow-2xl">
                                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white">
                                            <DialogTitle className="text-2xl font-bold">
                                                {editingItem ? "Edit Grade" : "Add New Grade"}
                                            </DialogTitle>
                                            <p className="text-purple-100 text-sm mt-1">
                                                {editingItem ? "Modify the existing grade classification." : "Define a new performance or pay grade."}
                                            </p>
                                        </div>

                                        <form onSubmit={handleSubmit} className="p-6 bg-white space-y-5">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-sm font-semibold text-zinc-700">Grade Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, name: e.target.value })
                                                    }
                                                    placeholder="e.g. A1, Level 10, Senior"
                                                    className="focus:ring-purple-500 border-zinc-200"
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
                                                    className="min-h-[100px] focus:ring-purple-500 border-zinc-200"
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
                                                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white"
                                                >
                                                    {editingItem ? "Save Changes" : "Create Grade"}
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
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto"></div>
                                    <p className="mt-4 text-zinc-500 font-medium">Loading grades...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="bg-zinc-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                        <Plus className="h-8 w-8 text-zinc-400" />
                                    </div>
                                    <p className="text-zinc-500 font-medium">No grades found matching your search.</p>
                                    <Button
                                        variant="link"
                                        className="text-purple-700 mt-2"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        Clear search
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/80 border-b border-zinc-200">
                                            <TableHead className="text-zinc-900 font-bold py-4">Grade Name</TableHead>
                                            <TableHead className="text-zinc-900 font-bold py-4">Description</TableHead>
                                            <TableHead className="text-zinc-900 font-bold py-4 text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item, index) => (
                                            <TableRow
                                                key={item.id}
                                                className={`group transition-colors duration-200 border-b border-zinc-100 hover:bg-purple-50/50 ${index % 2 === 0 ? "bg-white" : "bg-zinc-50/30"}`}
                                            >
                                                <TableCell className="font-semibold text-purple-800 py-4 capitalize">{item.name}</TableCell>
                                                <TableCell className="py-4 text-zinc-600 max-w-md truncate">
                                                    {item.description || <span className="text-zinc-300 italic">No description provided</span>}
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(item)}
                                                            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                                            title="Edit Grade"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-100"
                                                            title="Delete Grade"
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
