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

// Add wavy pattern CSS
const wavedPatternStyle = `
  @keyframes wave {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(10px); }
  }
  
  .wavy-pattern {
    background-image: 
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%' y1='0%' x2='100%' y2='100%'%3E%3Cstop offset='0%' style='stop-color:rgba(255,255,255,0.08);stop-opacity:1' /%3E%3Cstop offset='100%' style='stop-color:rgba(255,255,255,0.03);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,20 Q15,10 30,20 T60,20' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,35 Q15,25 30,35 T60,35' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,50 Q15,40 30,50 T60,50' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: repeat;
  }
`;
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
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";

interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  vendorAddress: string;
  vendorDistrict?: string | null;
  vendorCity: string;
  vendorCountry: string;
  vendorZipCode: string;
  vendorPoBox?: string | null;
  vendorTaxNumber?: string | null;
  vendorCommercialRegistrationNumber?: string | null;
  vendorEmail: string;
  vendorTelephone: string;
  vendorFax?: string;
  createdAt: string;
  updatedAt: string;
}

// API functions
async function getVendors(): Promise<Vendor[]> {
  const response = await fetch("/api/vendor-masters");
  if (!response.ok) throw new Error("Failed to fetch vendors");
  return response.json();
}

async function getCountries() {
  const response = await fetch("/api/countries");
  if (!response.ok) throw new Error("Failed to fetch countries");
  return response.json();
}

async function getCities() {
  const response = await fetch("/api/cities");
  if (!response.ok) throw new Error("Failed to fetch cities");
  return response.json();
}

async function createVendor(data: Omit<Vendor, "id" | "createdAt" | "updatedAt">): Promise<Vendor> {
  const response = await fetch("/api/vendor-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create vendor");
  return response.json();
}

async function updateVendor(
  id: number,
  data: Partial<Omit<Vendor, "id" | "createdAt" | "updatedAt">>
): Promise<Vendor> {
  const response = await fetch(`/api/vendor-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update vendor");
  return response.json();
}

async function deleteVendor(id: number): Promise<void> {
  const response = await fetch(`/api/vendor-masters/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete vendor");
}

async function bulkUploadVendors(csvData: any[]): Promise<Vendor[]> {
  const response = await fetch("/api/vendor-masters/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) throw new Error("Failed to upload vendors");
  return response.json();
}

export default function VendorMaster() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Inject styles
  const styleSheet = typeof window !== 'undefined' ? (() => {
    const style = document.createElement('style');
    style.textContent = wavedPatternStyle;
    document.head.appendChild(style);
    return style;
  })() : null;

  // Form state
  const [formData, setFormData] = useState({
    vendorCode: "",
    vendorName: "",
    vendorAddress: "",
    vendorDistrict: "",
    vendorCity: "",
    vendorCountry: "",
    vendorZipCode: "",
    vendorPoBox: "",
    vendorTaxNumber: "",
    vendorCommercialRegistrationNumber: "",
    vendorEmail: "",
    vendorTelephone: "",
    vendorFax: "",
  });

  // Fetch vendors
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendor-masters"],
    queryFn: getVendors,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: getCountries,
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: getCities,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast({ title: "Vendor created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error creating vendor", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Vendor, "id" | "createdAt" | "updatedAt">> }) =>
      updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast({ title: "Vendor updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error updating vendor", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast({ title: "Vendor deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting vendor", variant: "destructive" });
    },
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadVendors,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast({ title: `${data.length} vendors uploaded successfully` });
    },
    onError: () => {
      toast({ title: "Error uploading vendors", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      vendorCode: "",
      vendorName: "",
      vendorAddress: "",
      vendorDistrict: "",
      vendorCity: "",
      vendorCountry: "",
      vendorZipCode: "",
      vendorPoBox: "",
      vendorTaxNumber: "",
      vendorCommercialRegistrationNumber: "",
      vendorEmail: "",
      vendorTelephone: "",
      vendorFax: "",
    });
    setEditingVendor(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorCountry || !formData.vendorCity) {
      toast({ title: "Validation Error", description: "Country and City are required.", variant: "destructive" });
      return;
    }
    const submitData = {
      ...formData,
      vendorDistrict: formData.vendorDistrict || undefined,
      vendorPoBox: formData.vendorPoBox || undefined,
      vendorTaxNumber: formData.vendorTaxNumber || undefined,
      vendorCommercialRegistrationNumber: formData.vendorCommercialRegistrationNumber || undefined,
      vendorFax: formData.vendorFax || undefined,
    };

    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendorCode: vendor.vendorCode,
      vendorName: vendor.vendorName,
      vendorAddress: vendor.vendorAddress,
      vendorDistrict: vendor.vendorDistrict || "",
      vendorCity: vendor.vendorCity,
      vendorCountry: vendor.vendorCountry,
      vendorZipCode: vendor.vendorZipCode,
      vendorPoBox: vendor.vendorPoBox || "",
      vendorTaxNumber: vendor.vendorTaxNumber || "",
      vendorCommercialRegistrationNumber: vendor.vendorCommercialRegistrationNumber || "",
      vendorEmail: vendor.vendorEmail,
      vendorTelephone: vendor.vendorTelephone,
      vendorFax: vendor.vendorFax || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());

        const csvData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const idx = (col: string) => headers.indexOf(col);
          return {
            vendorCode: values[idx("vendorCode")],
            vendorName: values[idx("vendorName")],
            vendorAddress: values[idx("vendorAddress")],
            vendorDistrict: values[idx("vendorDistrict")] || undefined,
            vendorCity: values[idx("vendorCity")],
            vendorCountry: values[idx("vendorCountry")],
            vendorZipCode: values[idx("vendorZipCode")],
            vendorPoBox: values[idx("vendorPoBox")] || undefined,
            vendorTaxNumber: values[idx("vendorTaxNumber")] || undefined,
            vendorCommercialRegistrationNumber: values[idx("vendorCommercialRegistrationNumber")] || undefined,
            vendorEmail: values[idx("vendorEmail")],
            vendorTelephone: values[idx("vendorTelephone")],
            vendorFax: values[idx("vendorFax")] || undefined,
          };
        });

        bulkUploadMutation.mutate(csvData);
      } catch (error) {
        toast({ title: "Error parsing CSV file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter cities based on selected country
  const availableCities = cities.filter((city: any) => {
    if (!formData.vendorCountry) return true; // Show all if no country selected, or you could return false to hide
    const selectedCountry = countries.find((c: any) => c.name === formData.vendorCountry);
    return selectedCountry ? city.countryId === selectedCountry.id : true;
  });

  return (
    <>
      <style>{wavedPatternStyle}</style>
      <div className="p-8 min-h-screen wavy-pattern" style={{
        backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'%3E%3Cstop offset=\'0%\' style=\'stop-color:rgba(107,114,128,0.08);stop-opacity:1\' /%3E%3Cstop offset=\'100%\' style=\'stop-color:rgba(107,114,128,0.03);stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d=\'M0,20 Q15,10 30,20 T60,20\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,35 Q15,25 30,35 T60,35\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,50 Q15,40 30,50 T60,50\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat'
      }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Vendor Master</h1>
            <p className="text-muted-foreground">Manage vendor information and contact details</p>
          </div>

          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-2xl"
                  style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    border: '1px solid rgba(107, 114, 128, 0.3)'
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent">
                      {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <Label
                        htmlFor="vendorCode"
                        className="font-semibold text-gray-700"
                      >
                        Vendor Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="vendorCode"
                        required
                        value={formData.vendorCode}
                        onChange={(e) =>
                          setFormData({ ...formData, vendorCode: e.target.value })
                        }
                        className="mt-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-teal-50 transition-all duration-200"
                        style={{
                          background: '#ffffff',
                          border: '2px solid #ccf0ee',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#f0fdfa';
                          e.target.style.borderColor = '#2dd4bf';
                          e.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#ccf0ee';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="vendorName"
                        className="font-semibold text-teal-700"
                      >
                        Vendor Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="vendorName"
                        required
                        value={formData.vendorName}
                        onChange={(e) =>
                          setFormData({ ...formData, vendorName: e.target.value })
                        }
                        className="mt-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-teal-50 transition-all duration-200"
                        style={{
                          background: '#ffffff',
                          border: '2px solid #ccf0ee',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#f0fdfa';
                          e.target.style.borderColor = '#2dd4bf';
                          e.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#ccf0ee';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="vendorAddress"
                        className="font-semibold text-teal-700"
                      >
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="vendorAddress"
                        required
                        value={formData.vendorAddress}
                        onChange={(e) =>
                          setFormData({ ...formData, vendorAddress: e.target.value })
                        }
                        className="mt-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-teal-50 transition-all duration-200"
                        style={{
                          background: '#ffffff',
                          border: '2px solid #ccf0ee',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#f0fdfa';
                          e.target.style.borderColor = '#2dd4bf';
                          e.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#ccf0ee';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="vendorDistrict" className="font-semibold text-teal-700">
                        District
                      </Label>
                      <Input
                        id="vendorDistrict"
                        value={formData.vendorDistrict}
                        onChange={(e) =>
                          setFormData({ ...formData, vendorDistrict: e.target.value })
                        }
                        className="mt-2 bg-white border-2 border-[#ccf0ee]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="vendorCountry"
                          className="font-semibold text-teal-700"
                        >
                          Country <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.vendorCountry || undefined}
                          onValueChange={(val) => setFormData({ ...formData, vendorCountry: val, vendorCity: "" })}
                        >
                          <SelectTrigger className="mt-2 bg-white border-2 border-[#ccf0ee] focus:ring-2 focus:ring-teal-500 transition-all duration-200">
                            <SelectValue placeholder="Select Country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.filter((c: any) => c.id != null).map((c: any) => (
                              <SelectItem key={c.id ?? c.name} value={c.name}>
                                {c.name} {c.code ? `(${c.code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="vendorCity"
                          className="font-semibold text-teal-700"
                        >
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.vendorCity || undefined}
                          onValueChange={(val) => setFormData({ ...formData, vendorCity: val })}
                          disabled={!formData.vendorCountry}
                        >
                          <SelectTrigger className="mt-2 bg-white border-2 border-[#ccf0ee] focus:ring-2 focus:ring-teal-500 transition-all duration-200 disabled:opacity-50">
                            <SelectValue placeholder={formData.vendorCountry ? "Select City" : "Select Country First"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCities.filter((c: any) => c.id != null).map((c: any) => (
                              <SelectItem key={c.id ?? c.name} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendorZipCode" className="font-semibold text-teal-700">
                          Zip Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="vendorZipCode"
                          required
                          value={formData.vendorZipCode}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorZipCode: e.target.value })
                          }
                          className="mt-2 bg-white border-2 border-[#ccf0ee]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vendorPoBox" className="font-semibold text-teal-700">
                          PO Box
                        </Label>
                        <Input
                          id="vendorPoBox"
                          value={formData.vendorPoBox}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorPoBox: e.target.value })
                          }
                          className="mt-2 bg-white border-2 border-[#ccf0ee]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendorTaxNumber" className="font-semibold text-teal-700">
                          Tax Number
                        </Label>
                        <Input
                          id="vendorTaxNumber"
                          value={formData.vendorTaxNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorTaxNumber: e.target.value })
                          }
                          className="mt-2 bg-white border-2 border-[#ccf0ee]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vendorCommercialRegistrationNumber" className="font-semibold text-teal-700">
                          Commercial Registration No.
                        </Label>
                        <Input
                          id="vendorCommercialRegistrationNumber"
                          value={formData.vendorCommercialRegistrationNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorCommercialRegistrationNumber: e.target.value })
                          }
                          className="mt-2 bg-white border-2 border-[#ccf0ee]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="vendorEmail"
                          className="font-semibold text-teal-700"
                        >
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="vendorEmail"
                          required
                          type="email"
                          value={formData.vendorEmail}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorEmail: e.target.value })
                          }
                          className="mt-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-teal-50 transition-all duration-200"
                          style={{
                            background: '#ffffff',
                            border: '2px solid #ccf0ee',
                          }}
                          onFocus={(e) => {
                            e.target.style.background = '#f0fdfa';
                            e.target.style.borderColor = '#2dd4bf';
                            e.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          }}
                          onBlur={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.borderColor = '#ccf0ee';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="vendorTelephone"
                          className="font-semibold text-teal-700"
                        >
                          Telephone <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="vendorTelephone"
                          required
                          value={formData.vendorTelephone}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorTelephone: e.target.value })
                          }
                          className="mt-2 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-teal-50 transition-all duration-200"
                          style={{
                            background: '#ffffff',
                            border: '2px solid #ccf0ee',
                          }}
                          onFocus={(e) => {
                            e.target.style.background = '#f0fdfa';
                            e.target.style.borderColor = '#2dd4bf';
                            e.target.style.boxShadow = '0 0 0 3px rgba(45, 212, 191, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          }}
                          onBlur={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.borderColor = '#ccf0ee';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="vendorFax"
                        className="font-semibold text-slate-600"
                      >
                        Fax <span className="text-slate-400 text-sm">(Optional)</span>
                      </Label>
                      <Input
                        id="vendorFax"
                        value={formData.vendorFax}
                        onChange={(e) =>
                          setFormData({ ...formData, vendorFax: e.target.value })
                        }
                        className="mt-2 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 transition-all duration-200"
                        style={{
                          background: '#ffffff',
                          border: '2px solid #dcdce0',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#fafbfc';
                          e.target.style.borderColor = '#9ca3af';
                          e.target.style.boxShadow = '0 0 0 3px rgba(156, 163, 175, 0.1), inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#dcdce0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingVendor ? "Update" : "Create"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/templates/vendor-master-template.csv";
                  link.download = "vendor-master-template.csv";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="gap-2"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>

              <label>
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={bulkUploadMutation.isPending}
                />
              </label>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden" style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
            background: '#ffffff',
            border: '1px solid rgba(13, 148, 136, 0.3)'
          }}>
            {vendorsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No vendors found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-100 to-slate-100 border-b-2 border-gray-200">
                      <TableHead className="text-gray-900 font-bold">Code</TableHead>
                      <TableHead className="text-gray-900 font-bold">Name</TableHead>
                      <TableHead className="text-gray-900 font-bold">Address</TableHead>
                      <TableHead className="text-gray-900 font-bold">District</TableHead>
                      <TableHead className="text-gray-900 font-bold">City</TableHead>
                      <TableHead className="text-gray-900 font-bold">Country</TableHead>
                      <TableHead className="text-gray-900 font-bold">Zip</TableHead>
                      <TableHead className="text-gray-900 font-bold">PO Box</TableHead>
                      <TableHead className="text-gray-900 font-bold">Tax No.</TableHead>
                      <TableHead className="text-gray-900 font-bold">CR No.</TableHead>
                      <TableHead className="text-gray-900 font-bold">Email</TableHead>
                      <TableHead className="text-gray-900 font-bold">Phone</TableHead>
                      <TableHead className="text-gray-900 font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor, index) => (
                      <TableRow
                        key={vendor.id}
                        className={`transition-colors duration-200 border-b border-gray-200 hover:shadow-sm ${index % 2 === 0
                          ? "bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100"
                          : "bg-gradient-to-r from-slate-50 to-sky-50 hover:from-slate-100 hover:to-sky-100"
                          }`}
                      >
                        <TableCell className="font-medium">{vendor.vendorCode}</TableCell>
                        <TableCell>{vendor.vendorName}</TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={vendor.vendorAddress}>{vendor.vendorAddress}</TableCell>
                        <TableCell>{vendor.vendorDistrict || "—"}</TableCell>
                        <TableCell>{vendor.vendorCity}</TableCell>
                        <TableCell>{vendor.vendorCountry}</TableCell>
                        <TableCell>{vendor.vendorZipCode}</TableCell>
                        <TableCell>{vendor.vendorPoBox || "—"}</TableCell>
                        <TableCell>{vendor.vendorTaxNumber || "—"}</TableCell>
                        <TableCell>{vendor.vendorCommercialRegistrationNumber || "—"}</TableCell>
                        <TableCell className="text-sm">{vendor.vendorEmail}</TableCell>
                        <TableCell className="text-sm">{vendor.vendorTelephone}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(vendor)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(vendor.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
