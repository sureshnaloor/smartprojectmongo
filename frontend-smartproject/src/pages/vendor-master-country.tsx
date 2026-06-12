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
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Country {
    id: number;
    name: string;
    code: string;
    createdAt: string;
    updatedAt: string;
}

// API functions
async function getCountries(): Promise<Country[]> {
    const response = await fetch("/api/countries");
    if (!response.ok) throw new Error("Failed to fetch countries");
    return response.json();
}

async function createCountry(data: Partial<Country>) {
    const response = await fetch("/api/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create country");
    return response.json();
}

async function updateCountry({ id, ...data }: Partial<Country> & { id: number }) {
    const response = await fetch(`/api/countries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update country");
    return response.json();
}

async function deleteCountry(id: number) {
    const response = await fetch(`/api/countries/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete country");
}

export default function VendorMasterCountry() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState<Country | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({ name: "", code: "" });

    // Queries
    const { data: countries = [], isLoading } = useQuery({
        queryKey: ["countries"],
        queryFn: getCountries,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createCountry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["countries"] });
            toast({ title: "Success", description: "Country created successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateCountry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["countries"] });
            toast({ title: "Success", description: "Country updated successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCountry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["countries"] });
            toast({ title: "Success", description: "Country deleted successfully" });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCountry) {
            updateMutation.mutate({ id: editingCountry.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (country: Country) => {
        setEditingCountry(country);
        setFormData({ name: country.name, code: country.code || "" });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this country?")) {
            deleteMutation.mutate(id);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", code: "" });
        setEditingCountry(null);
    };

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Vendors - Countries</h1>
                    <p className="text-muted-foreground">Manage country records used for Vendor profiles.</p>
                </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder="Search by country name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Country
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingCountry ? "Edit Country" : "Add New Country"}
                                    </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Country Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="code">Country Code (e.g. US, IN)</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            className="mt-1"
                                            maxLength={3}
                                        />
                                    </div>
                                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                                        {editingCountry ? "Update" : "Create"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading countries...</div>
                    ) : filteredCountries.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No countries found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCountries.map((country) => (
                                    <TableRow key={country.id ?? country.name}>
                                        <TableCell className="font-medium">{country.name}</TableCell>
                                        <TableCell>{country.code}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(country)}
                                                    className="p-1 hover:bg-muted rounded"
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(country.id)}
                                                    className="p-1 hover:bg-destructive/10 rounded"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
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
    );
}
