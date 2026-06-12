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
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import EmployeeMasterLayout from "@/layouts/employee-master-layout";
import { RentalManpowerResourceMapper } from "@/components/project/rental-manpower-resource-mapper";

interface RentalManpower {
    id: number;
    employeeNumber: string;
    empFirstName: string;
    empMiddleName?: string;
    empLastName: string;
    empNationalId: string;
    empNationality: string;
    empDob: string;
    empGender: string;
    empPosition: string;
    empTitle: string;
    empTrade: string;
    empGrade: string;
    empCostPerHour: string;
    vendorId: number;
    entryDate?: string;
    exitDate?: string;
    createdAt: string;
    updatedAt: string;
}

interface Vendor {
    id: number;
    vendorName: string;
    vendorCode: string;
}

interface MasterData {
    id: number;
    name: string;
}

// API functions
async function getRentalManpower(): Promise<RentalManpower[]> {
    const response = await fetch("/api/rental-manpower");
    if (!response.ok) throw new Error("Failed to fetch rental manpower");
    return response.json();
}

async function getVendors(): Promise<Vendor[]> {
    const response = await fetch("/api/vendor-masters");
    if (!response.ok) throw new Error("Failed to fetch vendors");
    return response.json();
}

async function getNationalities(): Promise<MasterData[]> {
    const response = await fetch("/api/nationalities");
    return response.json();
}

async function getTitles(): Promise<MasterData[]> {
    const response = await fetch("/api/employee-titles");
    return response.json();
}

async function getPositions(): Promise<MasterData[]> {
    const response = await fetch("/api/employee-positions");
    return response.json();
}

async function getGrades(): Promise<MasterData[]> {
    const response = await fetch("/api/employee-grades");
    return response.json();
}

async function getTrades(): Promise<MasterData[]> {
    const response = await fetch("/api/employee-trades");
    return response.json();
}

async function createRentalManpower(data: any): Promise<RentalManpower> {
    const response = await fetch("/api/rental-manpower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create rental manpower");
    return response.json();
}

async function updateRentalManpower(id: number, data: any): Promise<RentalManpower> {
    const response = await fetch(`/api/rental-manpower/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update rental manpower");
    return response.json();
}

async function bulkUploadRentalManpower(csvData: any[]): Promise<RentalManpower[]> {
    const response = await fetch("/api/rental-manpower/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData }),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message =
            typeof (body as { message?: unknown }).message === "string"
                ? (body as { message: string }).message
                : "Failed to upload rental manpower";
        throw new Error(message);
    }
    return response.json();
}

async function deleteRentalManpower(id: number): Promise<void> {
    const response = await fetch(`/api/rental-manpower/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete rental manpower");
}

export default function EmployeeMasterRental() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RentalManpower | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        employeeNumber: "",
        empFirstName: "",
        empMiddleName: "",
        empLastName: "",
        empNationalId: "",
        empNationality: "",
        empDob: "",
        empGender: "",
        empPosition: "",
        empTitle: "",
        empTrade: "",
        empGrade: "",
        empCostPerHour: "",
        vendorId: "",
        entryDate: "",
    });

    const { data: rentals = [], isLoading } = useQuery({
        queryKey: ["/api/rental-manpower"],
        queryFn: getRentalManpower,
    });

    const { data: vendors = [] } = useQuery({
        queryKey: ["/api/vendor-masters"],
        queryFn: getVendors,
    });

    const { data: nationalities = [] } = useQuery({ queryKey: ["/api/nationalities"], queryFn: getNationalities });
    const { data: titles = [] } = useQuery({ queryKey: ["/api/employee-titles"], queryFn: getTitles });
    const { data: positions = [] } = useQuery({ queryKey: ["/api/employee-positions"], queryFn: getPositions });
    const { data: grades = [] } = useQuery({ queryKey: ["/api/employee-grades"], queryFn: getGrades });
    const { data: trades = [] } = useQuery({ queryKey: ["/api/employee-trades"], queryFn: getTrades });

    const createMutation = useMutation({
        mutationFn: createRentalManpower,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/rental-manpower"] });
            toast({ title: "Rental manpower created successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateRentalManpower(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/rental-manpower"] });
            toast({ title: "Rental manpower updated successfully" });
            setIsDialogOpen(false);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRentalManpower,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/rental-manpower"] });
            toast({ title: "Rental manpower deleted successfully" });
        },
    });

    const bulkUploadMutation = useMutation({
        mutationFn: bulkUploadRentalManpower,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/rental-manpower"] });
            toast({ title: `${data.length} records uploaded successfully` });
        },
        onError: (err: Error) => {
            toast({
                title: "Bulk upload failed",
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target?.result as string;
                const lines = csv.split("\n").filter((line) => line.trim());
                if (lines.length < 2) {
                    toast({ title: "CSV must have a header row and at least one data row", variant: "destructive" });
                    return;
                }
                const headers = lines[0]
                    .split(",")
                    .map((h) => h.trim().replace(/^\uFEFF/, ""));
                const requiredHeaders = ["employeeNumber", "empFirstName", "empLastName", "empNationalId", "empNationality", "empDob", "empGender", "empPosition", "empTitle", "empTrade", "empGrade", "empCostPerHour", "vendorCode"];
                const missing = requiredHeaders.filter((h) => !headers.includes(h));
                if (missing.length > 0) {
                    toast({ title: `CSV missing required columns: ${missing.join(", ")}`, variant: "destructive" });
                    return;
                }
                const csvData = lines.slice(1).map((line) => {
                    const values = line.split(",").map((v) => v.trim());
                    const row: Record<string, string> = {};
                    headers.forEach((h, i) => {
                        row[h] = values[i] ?? "";
                    });
                    return {
                        employeeNumber: row.employeeNumber,
                        empFirstName: row.empFirstName,
                        empMiddleName: row.empMiddleName || undefined,
                        empLastName: row.empLastName,
                        empNationalId: row.empNationalId,
                        empNationality: row.empNationality,
                        empDob: row.empDob,
                        empGender: row.empGender,
                        empPosition: row.empPosition,
                        empTitle: row.empTitle,
                        empTrade: row.empTrade,
                        empGrade: row.empGrade,
                        empCostPerHour: row.empCostPerHour,
                        vendorCode: row.vendorCode,
                        entryDate: row.entryDate || undefined,
                        exitDate: row.exitDate || undefined,
                    };
                });
                bulkUploadMutation.mutate(csvData);
            } catch (err) {
                toast({ title: "Error parsing CSV file", variant: "destructive" });
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const resetForm = () => {
        setFormData({
            employeeNumber: "",
            empFirstName: "",
            empMiddleName: "",
            empLastName: "",
            empNationalId: "",
            empNationality: "",
            empDob: "",
            empGender: "",
            empPosition: "",
            empTitle: "",
            empTrade: "",
            empGrade: "",
            empCostPerHour: "",
            vendorId: "",
            entryDate: "",
        });
        setEditingItem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            vendorId: parseInt(formData.vendorId),
            empMiddleName: formData.empMiddleName || undefined,
            entryDate: formData.entryDate || undefined,
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleEdit = (item: RentalManpower) => {
        setEditingItem(item);
        setFormData({
            employeeNumber: item.employeeNumber,
            empFirstName: item.empFirstName,
            empMiddleName: item.empMiddleName || "",
            empLastName: item.empLastName,
            empNationalId: item.empNationalId,
            empNationality: item.empNationality,
            empDob: item.empDob,
            empGender: item.empGender,
            empPosition: item.empPosition,
            empTitle: item.empTitle,
            empTrade: item.empTrade,
            empGrade: item.empGrade,
            empCostPerHour: item.empCostPerHour,
            vendorId: item.vendorId.toString(),
            entryDate: item.entryDate || "",
        });
        setIsDialogOpen(true);
    };

    const filteredItems = rentals.filter((item) =>
        item.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empLastName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full">
            <div className="p-8 min-h-screen" style={{
                backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%)',
            }}>
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Rental Manpower</h1>
                        <p className="text-muted-foreground">Manage rental manpower and vendor associations</p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Search by number or name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1"
                            />

                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => resetForm()}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Rental Manpower
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>{editingItem ? "Edit Rental Manpower" : "Add Rental Manpower"}</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Employee Number *</Label>
                                                <Input required value={formData.employeeNumber} onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Vendor *</Label>
                                                <Select value={formData.vendorId} onValueChange={val => setFormData({ ...formData, vendorId: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Vendor" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {vendors.map(v => (
                                                            <SelectItem key={v.id} value={v.id.toString()}>{v.vendorName} ({v.vendorCode})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>First Name *</Label>
                                                <Input required value={formData.empFirstName} onChange={e => setFormData({ ...formData, empFirstName: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Middle Name</Label>
                                                <Input value={formData.empMiddleName} onChange={e => setFormData({ ...formData, empMiddleName: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Last Name *</Label>
                                                <Input required value={formData.empLastName} onChange={e => setFormData({ ...formData, empLastName: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>National ID *</Label>
                                                <Input required value={formData.empNationalId} onChange={e => setFormData({ ...formData, empNationalId: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Gender *</Label>
                                                <Select value={formData.empGender} onValueChange={val => setFormData({ ...formData, empGender: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="M">Male</SelectItem>
                                                        <SelectItem value="F">Female</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Date of Birth *</Label>
                                                <Input required type="date" value={formData.empDob} onChange={e => setFormData({ ...formData, empDob: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Nationality *</Label>
                                                <Select value={formData.empNationality} onValueChange={val => setFormData({ ...formData, empNationality: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Nationality" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {nationalities.map(n => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Position *</Label>
                                                <Select value={formData.empPosition} onValueChange={val => setFormData({ ...formData, empPosition: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Position" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {positions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Title *</Label>
                                                <Select value={formData.empTitle} onValueChange={val => setFormData({ ...formData, empTitle: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Title" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {titles.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Trade *</Label>
                                                <Select value={formData.empTrade} onValueChange={val => setFormData({ ...formData, empTrade: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Trade" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {trades.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Grade *</Label>
                                                <Select value={formData.empGrade} onValueChange={val => setFormData({ ...formData, empGrade: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Grade" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {grades.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Cost Per Hour *</Label>
                                                <Input required type="number" step="0.01" value={formData.empCostPerHour} onChange={e => setFormData({ ...formData, empCostPerHour: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Entry Date</Label>
                                                <Input type="date" value={formData.entryDate} onChange={e => setFormData({ ...formData, entryDate: e.target.value })} />
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                            {editingItem ? "Update" : "Create"}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <label>
                                <Button variant="outline" asChild>
                                    <span>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Bulk Upload
                                    </span>
                                </Button>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleBulkUpload}
                                    className="hidden"
                                    disabled={bulkUploadMutation.isPending}
                                />
                            </label>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    const link = document.createElement("a");
                                    link.href = "/templates/rental-manpower-template.csv";
                                    link.download = "rental-manpower-template.csv";
                                    link.click();
                                }}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Template
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Emp #</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Trade</TableHead>
                                    <TableHead>Cost/Hr</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-4">Loading...</TableCell></TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-4">No records found</TableCell></TableRow>
                                ) : (
                                    filteredItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.employeeNumber}</TableCell>
                                            <TableCell>{`${item.empFirstName} ${item.empLastName}`}</TableCell>
                                            <TableCell>{vendors.find(v => v.id === item.vendorId)?.vendorName || item.vendorId}</TableCell>
                                            <TableCell>{item.empPosition}</TableCell>
                                            <TableCell>{item.empTrade}</TableCell>
                                            <TableCell>{parseFloat(item.empCostPerHour).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <RentalManpowerResourceMapper
                                                        rentalManpowerId={item.id}
                                                        employeeDisplayName={`${item.empFirstName} ${item.empLastName}`}
                                                    />
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Confirm delete?")) deleteMutation.mutate(item.id) }}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
