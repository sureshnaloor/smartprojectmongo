import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Portfolio, formatPortfolioDate } from "@/lib/portfolios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Employee {
  id: number;
  employeeNumber: string;
  empFirstName: string;
  empMiddleName?: string | null;
  empLastName: string;
  empPosition?: string | null;
}

interface ProjectRow {
  id: number;
  name: string;
  projectType: string | null;
  portfolioId?: number | null;
}

interface PortfolioForm {
  name: string;
  managerId: string;
  description: string;
}

const emptyForm: PortfolioForm = { name: "", managerId: "", description: "" };

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "Request failed";
  try {
    const data = JSON.parse(raw);
    return data.message ?? raw;
  } catch {
    return raw || "Request failed";
  }
}

function employeeLabel(employee: Employee): string {
  const middle =
    employee.empMiddleName && !employee.empMiddleName.startsWith("@gm:")
      ? employee.empMiddleName
      : "";
  const name = [employee.empFirstName, middle, employee.empLastName].filter(Boolean).join(" ");
  const position = employee.empPosition ? ` · ${employee.empPosition}` : "";
  return `${name || employee.employeeNumber}${position}`;
}

export default function PortfoliosPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [formData, setFormData] = useState<PortfolioForm>(emptyForm);

  const { data: portfolios = [], isLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employee-masters"],
  });
  const { data: projects = [] } = useQuery<ProjectRow[]>({
    queryKey: ["/api/projects"],
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; managerId: number; description: string }) => {
      const res = await apiRequest("POST", "/api/portfolios", data);
      return res.json();
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Portfolio created" });
      closeDialog();
    },
    onError: (error: unknown) => toast({ title: errorMessage(error), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; managerId: number; description: string } }) => {
      const res = await apiRequest("PATCH", `/api/portfolios/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Portfolio updated" });
      closeDialog();
    },
    onError: (error: unknown) => toast({ title: errorMessage(error), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/portfolios/${id}`);
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Portfolio deleted" });
    },
    onError: (error: unknown) => toast({ title: errorMessage(error), variant: "destructive" }),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditing(null);
    setFormData(emptyForm);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (portfolio: Portfolio) => {
    setEditing(portfolio);
    setFormData({
      name: portfolio.name,
      managerId: portfolio.managerId ? String(portfolio.managerId) : "",
      description: portfolio.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;
    if (!formData.managerId) {
      toast({
        title: employees.length
          ? "Select a portfolio manager"
          : "Add an employee in Employee Master before assigning a portfolio manager",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      name: formData.name.trim(),
      managerId: Number(formData.managerId),
      description: formData.description.trim(),
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const projectsFor = (portfolio: Portfolio) =>
    projects.filter((project) => project.portfolioId === portfolio.id || project.projectType === portfolio.name);

  const filtered = portfolios.filter((portfolio) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      portfolio.name.toLowerCase().includes(needle) ||
      (portfolio.managerName ?? "").toLowerCase().includes(needle) ||
      portfolio.description.toLowerCase().includes(needle)
    );
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <MasterLayout>
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <button
            type="button"
            onClick={() => setLocation("/newlanding")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </button>

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Portfolios</h1>
              <p className="mt-2 max-w-2xl text-slate-500">
                A portfolio is a sector, such as Power, Infrastructure, or Oil &amp; Gas.
                Projects in that sector sit under it and are looked after by a portfolio manager.
              </p>
            </div>
            <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="mr-2 h-4 w-4" />
              Add Portfolio
            </Button>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <Input
              placeholder="Search portfolios, managers, or descriptions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading portfolios...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No portfolios found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Portfolio</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((portfolio) => {
                    const linked = projectsFor(portfolio);
                    return (
                      <TableRow key={portfolio.id}>
                        <TableCell className="font-medium text-slate-900">{portfolio.name}</TableCell>
                        <TableCell>{portfolio.managerName || "Unassigned"}</TableCell>
                        <TableCell className="max-w-xs text-slate-500">
                          <span className="line-clamp-2">{portfolio.description}</span>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-sm text-slate-600">
                          {linked.length === 0 ? (
                            <span className="text-slate-400">No projects yet</span>
                          ) : (
                            <span>
                              <span className="font-medium text-slate-800">{linked.length}</span>
                              {" · "}
                              {linked.slice(0, 3).map((project) => project.name).join(", ")}
                              {linked.length > 3 ? ` +${linked.length - 3}` : ""}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-500">
                          {formatPortfolioDate(portfolio.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-500">
                          {formatPortfolioDate(portfolio.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(portfolio)} aria-label={`Edit ${portfolio.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              aria-label={`Delete ${portfolio.name}`}
                              onClick={() => {
                                if (confirm(`Delete portfolio "${portfolio.name}"?`)) deleteMutation.mutate(portfolio.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Portfolio" : "Add Portfolio"}</DialogTitle>
            <DialogDescription>
              Name the sector, assign the portfolio manager, and describe the work this portfolio covers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio-name">Portfolio name</Label>
              <Input
                id="portfolio-name"
                required
                placeholder="Power"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Portfolio manager</Label>
              <Select
                value={formData.managerId || undefined}
                onValueChange={(value) => setFormData({ ...formData, managerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={employees.length ? "Select a manager" : "No employees yet"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employeeLabel(employee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employees.length === 0 && (
                <p className="text-sm text-slate-500">
                  Add people in Employee Master, then choose one as the portfolio manager.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-description">Long description</Label>
              <Textarea
                id="portfolio-description"
                required
                rows={5}
                placeholder="What kinds of projects belong in this portfolio?"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              />
            </div>
            {editing && (
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                <div>
                  <div className="font-medium text-slate-700">Created</div>
                  {formatPortfolioDate(editing.createdAt)}
                </div>
                <div>
                  <div className="font-medium text-slate-700">Updated</div>
                  {formatPortfolioDate(editing.updatedAt)}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
