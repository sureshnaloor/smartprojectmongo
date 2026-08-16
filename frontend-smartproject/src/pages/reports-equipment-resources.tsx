import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Search,
  Printer,
  Info,
  Briefcase,
  Wrench,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharedNavigation } from "@/components/shared-navigation";

interface MappedOwnEquipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType?: string;
  manufacturer?: string;
  modelYear?: string;
  capacity?: string;
  status?: string;
  unitRate?: string;
}

interface MappedRentalEquipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType?: string;
  manufacturer?: string;
  model?: string;
  capacity?: string;
  vendorName?: string;
  status?: string;
  hourlyRate?: string;
}

interface EquipmentResourceReport {
  id: number;
  name: string;
  code: string;
  type: string;
  category: string;
  unitRate: string;
  unit: string;
  status: string;
  ownEquipment: MappedOwnEquipment[];
  rentalEquipment: MappedRentalEquipment[];
  ownCount: number;
  rentalCount: number;
  totalMapped: number;
}

export default function ReportsEquipmentResources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);

  const { data: reportData = [], isLoading } = useQuery<EquipmentResourceReport[]>({
    queryKey: ["/api/reports/equipment-resources"],
    queryFn: () => fetch("/api/reports/equipment-resources").then((r) => r.json()),
  });

  const safeReport = Array.isArray(reportData) ? reportData : [];

  // Filtered resources
  const filteredResources = safeReport.filter((res) => {
    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || res.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  // Extract unique categories
  const categories = Array.from(new Set(safeReport.map((r) => r.category).filter(Boolean)));

  // Selected resource object
  const activeResource =
    safeReport.find((r) => r.id === selectedResourceId) || filteredResources[0] || null;

  // Summary Metrics
  const totalResources = safeReport.length;
  const totalOwnMapped = safeReport.reduce((acc, r) => acc + r.ownCount, 0);
  const totalRentalMapped = safeReport.reduce((acc, r) => acc + r.rentalCount, 0);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <SharedNavigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4" /> Global Reports
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Equipment Resources Mapping Report</h1>
            <p className="text-sm text-zinc-500">
              Overview of all global equipment resources and mapped Own Equipment &amp; Rental Equipment fleet.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print / Export PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Equipment Resources</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{totalResources}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Mapped Own Fleet</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{totalOwnMapped}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wrench className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Mapped Rental Fleet</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{totalRentalMapped}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search equipment resource by name, code, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="w-full md:w-56">
            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val)}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content: Split View */}
        {isLoading ? (
          <div className="bg-white p-12 rounded-xl border border-zinc-200 text-center space-y-2">
            <div className="animate-spin text-primary mx-auto w-8 h-8 border-2 border-current border-t-transparent rounded-full" />
            <p className="text-sm text-zinc-500">Loading equipment resources report...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Resources List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-600" /> Equipment Resources ({filteredResources.length})
              </h2>

              <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                {filteredResources.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-400 text-xs">
                    No equipment resources found matching search criteria.
                  </div>
                ) : (
                  filteredResources.map((res) => {
                    const isSelected = activeResource?.id === res.id;
                    return (
                      <div
                        key={res.id}
                        onClick={() => setSelectedResourceId(res.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-amber-50/80 border-amber-600 shadow-sm ring-1 ring-amber-600"
                            : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-mono font-bold text-amber-700">{res.code}</span>
                            <h3 className="text-sm font-bold text-zinc-900 mt-0.5">{res.name}</h3>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            ₹{res.unitRate} / {res.unit || "Hr"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 border-t border-zinc-100 pt-2">
                          <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {res.category}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> {res.ownCount} Own
                            </span>
                            <span className="text-indigo-700 font-semibold flex items-center gap-1">
                              <Truck className="h-3 w-3" /> {res.rentalCount} Rental
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Resource Mapped Detail View (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {!activeResource ? (
                <div className="bg-white p-12 rounded-xl border border-dashed border-zinc-300 text-center text-zinc-500 text-xs">
                  Select an equipment resource on the left to view mapped own and rental equipment units.
                </div>
              ) : (
                <Card className="border-zinc-200 shadow-sm">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] mb-1">
                          Resource Code: {activeResource.code}
                        </Badge>
                        <CardTitle className="text-xl font-bold text-zinc-900">{activeResource.name}</CardTitle>
                        <CardDescription className="text-xs">
                          Category: <strong className="text-zinc-700">{activeResource.category}</strong> | Rate:{" "}
                          <strong className="text-zinc-700">₹{activeResource.unitRate}/{activeResource.unit || "Hr"}</strong>
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {activeResource.ownCount} Own Fleet
                        </Badge>
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {activeResource.rentalCount} Rental Fleet
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <Tabs defaultValue="own" className="w-full">
                      <TabsList className="mb-4">
                        <TabsTrigger value="own" className="gap-1.5 text-xs">
                          <Wrench className="h-3.5 w-3.5 text-emerald-600" /> Mapped Own Equipment ({activeResource.ownCount})
                        </TabsTrigger>
                        <TabsTrigger value="rental" className="gap-1.5 text-xs">
                          <Truck className="h-3.5 w-3.5 text-indigo-600" /> Mapped Rental Equipment ({activeResource.rentalCount})
                        </TabsTrigger>
                      </TabsList>

                      {/* Own Equipment Tab */}
                      <TabsContent value="own">
                        {activeResource.ownEquipment.length === 0 ? (
                          <div className="p-8 text-center bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-500 text-xs space-y-2">
                            <Info className="h-5 w-5 mx-auto text-zinc-400" />
                            <p>No own equipment units are currently mapped to <strong>{activeResource.name}</strong>.</p>
                            <p className="text-[11px] text-zinc-400">Map equipment under Global Tools → Equipment Master → Resource Mapping.</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Equip Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type / Category</TableHead>
                                <TableHead>Capacity / Specs</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeResource.ownEquipment.map((eq) => (
                                <TableRow key={eq.id}>
                                  <TableCell className="font-mono text-xs font-semibold text-emerald-700">{eq.equipmentNumber}</TableCell>
                                  <TableCell className="font-medium">{eq.equipmentName}</TableCell>
                                  <TableCell>{eq.equipmentType || activeResource.category}</TableCell>
                                  <TableCell>{eq.capacity || eq.modelYear || "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={eq.status?.toLowerCase() === "inactive" ? "bg-red-50 text-red-700 border-red-200 text-[10px]" : "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"}>
                                      {eq.status || "Active"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Rental Equipment Tab */}
                      <TabsContent value="rental">
                        {activeResource.rentalEquipment.length === 0 ? (
                          <div className="p-8 text-center bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-500 text-xs space-y-2">
                            <Info className="h-5 w-5 mx-auto text-zinc-400" />
                            <p>No rental equipment units are currently mapped to <strong>{activeResource.name}</strong>.</p>
                            <p className="text-[11px] text-zinc-400">Map rental equipment under Global Tools → Equipment Master → Rental Equipment.</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Equip Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Supplier / Vendor</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Hourly Rate</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeResource.rentalEquipment.map((req) => (
                                <TableRow key={req.id}>
                                  <TableCell className="font-mono text-xs font-semibold text-indigo-700">{req.equipmentNumber}</TableCell>
                                  <TableCell className="font-medium">{req.equipmentName}</TableCell>
                                  <TableCell>{req.vendorName || "Rental Supplier"}</TableCell>
                                  <TableCell>{req.equipmentType || activeResource.category}</TableCell>
                                  <TableCell className="font-mono text-xs">₹{req.hourlyRate || activeResource.unitRate}/Hr</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={req.status?.toLowerCase() === "inactive" ? "bg-red-50 text-red-700 border-red-200 text-[10px]" : "bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]"}>
                                      {req.status || "Active"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
