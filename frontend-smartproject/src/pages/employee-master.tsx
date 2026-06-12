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
import { EmployeeResourceMapper } from "@/components/project/employee-resource-mapper";

// Add wavy pattern CSS
const wavedPatternStyle = `
  @keyframes wave {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
  }
  .wavy-pattern {
    position: relative;
  }
  .wavy-pattern::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgba(107,114,128,0.08);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgba(107,114,128,0.03);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,20 Q15,10 30,20 T60,20' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,35 Q15,25 30,35 T60,35' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3Cpath d='M0,50 Q15,40 30,50 T60,50' stroke='url(%23grad)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: repeat;
    pointer-events: none;
    z-index: 0;
  }
  .wavy-pattern > * {
    position: relative;
    z-index: 1;
  }
`;

interface Employee {
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
  entryDate?: string;
  exitDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface MasterData {
  id: number;
  name: string;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

// API functions
async function getEmployees(): Promise<Employee[]> {
  const response = await fetch("/api/employee-masters");
  if (!response.ok) throw new Error("Failed to fetch employees");
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

async function createEmployee(data: any): Promise<Employee> {
  const response = await fetch("/api/employee-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function updateEmployee(
  id: number,
  data: any
): Promise<Employee> {
  const response = await fetch(`/api/employee-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

async function deleteEmployee(id: number): Promise<void> {
  const response = await fetch(`/api/employee-masters/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

async function bulkUploadEmployees(csvData: any[]): Promise<Employee[]> {
  const response = await fetch("/api/employee-masters/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  return response.json();
}

export default function EmployeeMaster() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
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
    entryDate: "",
  });

  // Fetch data
  const { data: employees = [], isLoading } = useQuery({ queryKey: ["/api/employee-masters"], queryFn: getEmployees });
  const { data: nationalities = [] } = useQuery({ queryKey: ["/api/nationalities"], queryFn: getNationalities });
  const { data: titles = [] } = useQuery({ queryKey: ["/api/employee-titles"], queryFn: getTitles });
  const { data: positions = [] } = useQuery({ queryKey: ["/api/employee-positions"], queryFn: getPositions });
  const { data: grades = [] } = useQuery({ queryKey: ["/api/employee-grades"], queryFn: getGrades });
  const { data: trades = [] } = useQuery({ queryKey: ["/api/employee-trades"], queryFn: getTrades });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast({ title: "Employee created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast({ title: "Employee updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast({ title: "Employee deleted successfully" });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadEmployees,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast({ title: `${data.length} employees uploaded successfully` });
    },
    onError: () => {
      toast({ title: "Error uploading employees", variant: "destructive" });
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
        const headers = lines[0].split(",").map((h) => h.trim());
        const requiredHeaders = ["employeeNumber", "empFirstName", "empLastName", "empNationalId", "empNationality", "empDob", "empGender", "empPosition", "empTitle", "empTrade", "empGrade", "empCostPerHour"];
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
      entryDate: "",
    });
    setEditingEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      empMiddleName: formData.empMiddleName || undefined,
      entryDate: formData.entryDate || undefined,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeNumber: employee.employeeNumber,
      empFirstName: employee.empFirstName,
      empMiddleName: employee.empMiddleName || "",
      empLastName: employee.empLastName,
      empNationalId: employee.empNationalId,
      empNationality: employee.empNationality,
      empDob: employee.empDob,
      empGender: employee.empGender || "",
      empPosition: employee.empPosition,
      empTitle: employee.empTitle,
      empTrade: employee.empTrade,
      empGrade: employee.empGrade,
      empCostPerHour: employee.empCostPerHour,
      entryDate: employee.entryDate || "",
    });
    setIsDialogOpen(true);
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.empFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.empLastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full">
      <style>{wavedPatternStyle}</style>
      <div className="p-8 min-h-screen wavy-pattern" style={{
        backgroundImage: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 25%, #f0f9ff 50%, #e0e7ff 75%, #f3f4f6 100%), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'%3E%3Cstop offset=\'0%\' style=\'stop-color:rgba(107,114,128,0.08);stop-opacity:1\' /%3E%3Cstop offset=\'100%\' style=\'stop-color:rgba(107,114,128,0.03);stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d=\'M0,20 Q15,10 30,20 T60,20\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,35 Q15,25 30,35 T60,35\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3Cpath d=\'M0,50 Q15,40 30,50 T60,50\' stroke=\'url(%23grad)\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat'
      }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">Employee Master</h1>
            <p className="text-muted-foreground">Manage employee information and details</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by number, first name or last name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Employee Number *</Label>
                      <Input required value={formData.employeeNumber} onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>First Name *</Label>
                        <Input required value={formData.empFirstName} onChange={e => setFormData({ ...formData, empFirstName: e.target.value })} />
                      </div>
                      <div>
                        <Label>Middle Name</Label>
                        <Input value={formData.empMiddleName} onChange={e => setFormData({ ...formData, empMiddleName: e.target.value })} />
                      </div>
                      <div>
                        <Label>Last Name *</Label>
                        <Input required value={formData.empLastName} onChange={e => setFormData({ ...formData, empLastName: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>National ID *</Label>
                        <Input required value={formData.empNationalId} onChange={e => setFormData({ ...formData, empNationalId: e.target.value })} />
                      </div>
                      <div>
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
                      <div>
                        <Label>Date of Birth *</Label>
                        <Input required type="date" value={formData.empDob} onChange={e => setFormData({ ...formData, empDob: e.target.value })} />
                      </div>
                      <div>
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
                      <div>
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
                      <div>
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
                      <div>
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
                      <div>
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
                      <div>
                        <Label>Cost Per Hour *</Label>
                        <Input required type="number" step="0.01" value={formData.empCostPerHour} onChange={e => setFormData({ ...formData, empCostPerHour: e.target.value })} />
                      </div>
                      <div>
                        <Label>Entry Date</Label>
                        <Input type="date" value={formData.entryDate} onChange={e => setFormData({ ...formData, entryDate: e.target.value })} />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingEmployee ? "Update" : "Create"}
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
                  link.href = "/templates/employee-master-template.csv";
                  link.download = "employee-master-template.csv";
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
                  <TableHead>Position</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Cost/Hr</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">No employees found</TableCell></TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employeeNumber}</TableCell>
                      <TableCell>{`${employee.empFirstName} ${employee.empLastName}`}</TableCell>
                      <TableCell>{employee.empPosition}</TableCell>
                      <TableCell>{employee.empGrade}</TableCell>
                      <TableCell>{parseFloat(employee.empCostPerHour).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <EmployeeResourceMapper employeeId={employee.id} employeeName={`${employee.empFirstName} ${employee.empLastName}`} />
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Confirm delete?")) deleteMutation.mutate(employee.id) }}><Trash2 className="h-4 w-4" /></Button>
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
