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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Country {
    id: number;
    name: string;
    code?: string;
}

interface City {
    id: number;
    name: string;
    countryId: number;
    countryName?: string; // from the join
    createdAt: string;
    updatedAt: string;
}

// API functions
async function getCities(): Promise<City[]> {
    const response = await fetch("/api/cities");
    if (!response.ok) throw new Error("Failed to fetch cities");
    return response.json();
}

async function getCountries(): Promise<Country[]> {
    const response = await fetch("/api/countries");
    if (!response.ok) throw new Error("Failed to fetch countries");
    return response.json();
}

async function createCity(data: Partial<City>) {
    const response = await fetch("/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create city");
    return response.json();
}

async function updateCity({ id, ...data }: Partial<City> & { id: number }) {
    const response = await fetch(`/api/cities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update city");
    return response.json();
}

async function deleteCity(id: number) {
    const response = await fetch(`/api/cities/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete city");
}

export default function VendorMasterCity() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({ name: "", countryId: 0 });

    // Queries
    const { data: cities = [], isLoading: citiesLoading, isError: citiesError, error: citiesQueryError } = useQuery({
        queryKey: ["cities"],
        queryFn: getCities,
    });

    const { data: countries = [], isLoading: countriesLoading } = useQuery({
        queryKey: ["countries"],
        queryFn: getCountries,
    });

    const countriesWithId = countries.filter((c): c is Country & { id: number } => c.id != null);

    // Mutations
    const createMutation = useMutation({
        mutationFn: createCity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cities"] });
            toast({ title: "Success", description: "City created successfully" });
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
        mutationFn: updateCity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cities"] });
            toast({ title: "Success", description: "City updated successfully" });
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
        mutationFn: deleteCity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cities"] });
            toast({ title: "Success", description: "City deleted successfully" });
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
        if (formData.countryId === 0) {
            toast({ title: "Error", description: "Please select a country", variant: "destructive" });
            return;
        }

        if (editingCity) {
            updateMutation.mutate({ id: editingCity.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (city: City) => {
        setEditingCity(city);
        setFormData({ name: city.name, countryId: city.countryId });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this city?")) {
            deleteMutation.mutate(id);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", countryId: 0 });
        setEditingCity(null);
    };

    const filteredCities = cities.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.countryName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Vendors - Cities</h1>
                    <p className="text-muted-foreground">Manage city records dependent on Countries.</p>
                </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder="Search by city or country..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add City
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingCity ? "Edit City" : "Add New City"}
                                    </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">City Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="countryId">Country <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={formData.countryId > 0 ? String(formData.countryId) : undefined}
                                            onValueChange={(val) => setFormData({ ...formData, countryId: parseInt(val, 10) })}
                                            disabled={countriesLoading || countriesWithId.length === 0}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder={countriesWithId.length === 0 ? "Add a country first" : "Select Country"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countriesWithId.map((c) => (
                                                    <SelectItem key={c.id} value={String(c.id)}>
                                                        {c.name} {c.code ? `(${c.code})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                                        {editingCity ? "Update" : "Create"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    {citiesError ? (
                        <div className="p-8 text-center text-destructive">
                            {(citiesQueryError as Error)?.message || "Failed to load cities"}
                        </div>
                    ) : citiesLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading cities...</div>
                    ) : filteredCities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No cities found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>City Name</TableHead>
                                    <TableHead>Country Name</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCities.map((city) => (
                                    <TableRow key={city.id ?? `${city.name}-${city.countryId}`}>
                                        <TableCell className="font-medium">{city.name}</TableCell>
                                        <TableCell>{city.countryName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(city)}
                                                    className="p-1 hover:bg-muted rounded"
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(city.id)}
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
