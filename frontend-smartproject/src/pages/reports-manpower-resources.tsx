import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  Search,
  Building,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  Info,
  CheckCircle2,
  Briefcase,
  Wrench,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharedNavigation } from "@/components/shared-navigation";

interface MappedEmployee {
  id: number;
  employeeNumber: string;
  empFirstName: string;
  empLastName: string;
  empPosition?: string;
  empTrade?: string;
  status?: string;
  phone?: string;
  email?: string;
}

interface MappedRentalManpower {
  id: number;
  employeeNumber: string;
  empFirstName: string;
  empLastName: string;
  empPosition?: string;
  empTrade?: string;
  vendorName?: string;
  status?: string;
  hourlyRate?: string;
}

interface ManpowerResourceReport {
  id: number;
  name: string;
  code: string;
  type: string;
  trade: string;
  skillLevel: string;
  unitRate: string;
  status: string;
  ownEmployees: MappedEmployee[];
  rentalManpower: MappedRentalManpower[];
  ownCount: number;
  rentalCount: number;
  totalMapped: number;
}

export default function ReportsManpowerResources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("all");
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);

  const { data: reportData = [], isLoading } = useQuery<ManpowerResourceReport[]>({
    queryKey: ["/api/reports/manpower-resources"],
    queryFn: () => fetch("/api/reports/manpower-resources").then((r) => r.json()),
  });

  const safeReport = Array.isArray(reportData) ? reportData : [];

  // Filtered resources
  const filteredResources = safeReport.filter((res) => {
    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.trade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = selectedTrade === "all" || res.trade.toLowerCase() === selectedTrade.toLowerCase();
    return matchesSearch && matchesTrade;
  });

  // Extract unique trades
  const trades = Array.from(new Set(safeReport.map((r) => r.trade).filter(Boolean)));

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
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4" /> Global Reports
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Manpower Resources Mapping Report</h1>
            <p className="text-sm text-zinc-500">
              Overview of all manpower resources and individual Own Employees &amp; Rental Manpower mapped to each resource.
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
                <p className="text-xs font-semibold uppercase text-zinc-500">Total Manpower Resources</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{totalResources}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wrench className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Mapped Own Employees</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{totalOwnMapped}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Mapped Rental Manpower</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{totalRentalMapped}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search resource by name, code, or trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="w-full md:w-56">
            <Select value={selectedTrade} onValueChange={(val) => setSelectedTrade(val)}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="All Trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
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
            <p className="text-sm text-zinc-500">Loading manpower resources report...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Resources List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" /> Manpower Resources ({filteredResources.length})
              </h2>

              <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                {filteredResources.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-400 text-xs">
                    No manpower resources found matching search criteria.
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
                            ? "bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-600"
                            : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-mono font-bold text-blue-700">{res.code}</span>
                            <h3 className="text-sm font-bold text-zinc-900 mt-0.5">{res.name}</h3>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            ₹{res.unitRate} / Hr
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 border-t border-zinc-100 pt-2">
                          <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {res.trade} ({res.skillLevel})
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <Users className="h-3 w-3" /> {res.ownCount} Own
                            </span>
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> {res.rentalCount} Rental
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
                  Select a manpower resource on the left to view mapped employees and rental personnel.
                </div>
              ) : (
                <Card className="border-zinc-200 shadow-sm">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] mb-1">
                          Resource Code: {activeResource.code}
                        </Badge>
                        <CardTitle className="text-xl font-bold text-zinc-900">{activeResource.name}</CardTitle>
                        <CardDescription className="text-xs">
                          Trade: <strong className="text-zinc-700">{activeResource.trade}</strong> | Skill Level:{" "}
                          <strong className="text-zinc-700">{activeResource.skillLevel}</strong> | Rate:{" "}
                          <strong className="text-zinc-700">₹{activeResource.unitRate}/Hr</strong>
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {activeResource.ownCount} Own Mapped
                        </Badge>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                          {activeResource.rentalCount} Rental Mapped
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <Tabs defaultValue="own" className="w-full">
                      <TabsList className="mb-4">
                        <TabsTrigger value="own" className="gap-1.5 text-xs">
                          <Users className="h-3.5 w-3.5" /> Mapped Own Employees ({activeResource.ownCount})
                        </TabsTrigger>
                        <TabsTrigger value="rental" className="gap-1.5 text-xs">
                          <UserCheck className="h-3.5 w-3.5 text-amber-600" /> Mapped Rental Manpower ({activeResource.rentalCount})
                        </TabsTrigger>
                      </TabsList>

                      {/* Own Employees Tab */}
                      <TabsContent value="own">
                        {activeResource.ownEmployees.length === 0 ? (
                          <div className="p-8 text-center bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-500 text-xs space-y-2">
                            <Info className="h-5 w-5 mx-auto text-zinc-400" />
                            <p>No own employees are currently mapped to <strong>{activeResource.name}</strong>.</p>
                            <p className="text-[11px] text-zinc-400">Map employees under Global Tools → Employee Master → Resource Mapping.</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Emp #</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Trade</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeResource.ownEmployees.map((emp) => (
                                <TableRow key={emp.id}>
                                  <TableCell className="font-mono text-xs font-semibold text-blue-700">{emp.employeeNumber}</TableCell>
                                  <TableCell className="font-medium">{emp.empFirstName} {emp.empLastName}</TableCell>
                                  <TableCell>{emp.empPosition || "—"}</TableCell>
                                  <TableCell>{emp.empTrade || activeResource.trade}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={emp.status?.toLowerCase() === "inactive" ? "bg-red-50 text-red-700 border-red-200 text-[10px]" : "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"}>
                                      {emp.status || "Active"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Rental Manpower Tab */}
                      <TabsContent value="rental">
                        {activeResource.rentalManpower.length === 0 ? (
                          <div className="p-8 text-center bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-500 text-xs space-y-2">
                            <Info className="h-5 w-5 mx-auto text-zinc-400" />
                            <p>No rental manpower personnel are currently mapped to <strong>{activeResource.name}</strong>.</p>
                            <p className="text-[11px] text-zinc-400">Map rental personnel under Global Tools → Employee Master → Rental Manpower.</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Emp #</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Agency / Supplier</TableHead>
                                <TableHead>Trade</TableHead>
                                <TableHead>Hourly Rate</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeResource.rentalManpower.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="font-mono text-xs font-semibold text-amber-700">{r.employeeNumber}</TableCell>
                                  <TableCell className="font-medium">{r.empFirstName} {r.empLastName}</TableCell>
                                  <TableCell>{r.vendorName || "Rental Supplier"}</TableCell>
                                  <TableCell>{r.empTrade || activeResource.trade}</TableCell>
                                  <TableCell className="font-mono text-xs">₹{r.hourlyRate || activeResource.unitRate}/Hr</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={r.status?.toLowerCase() === "inactive" ? "bg-red-50 text-red-700 border-red-200 text-[10px]" : "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"}>
                                      {r.status || "Active"}
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
