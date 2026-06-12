import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clock3 } from "lucide-react";

type ResourceType = "manpower" | "rental_manpower" | "equipment" | "rental_equipment" | "tools";
type TimesheetStatus = "worked" | "idle_bench" | "leave_off" | "un_utilized" | "weekly_off_rest";

type TimesheetRow = {
  id: number;
  date: string;
  resourceType: ResourceType;
  employeeId: number | null;
  rentalManpowerId: number | null;
  equipmentId: number | null;
  rentalEquipmentId: number | null;
  toolId: number | null;
  status: TimesheetStatus;
  projectId: number | null;
  wpId: number | null;
  enteredBy: string;
  enteredDate: string;
  remarks: string | null;
  projectName?: string | null;
  wpCode?: string | null;
  wpName?: string | null;
  resourceLabel?: string;
};

type ResourceOption = { id: number; label: string };

const statusOptions: Array<{ value: TimesheetStatus; label: string }> = [
  { value: "worked", label: "Worked" },
  { value: "idle_bench", label: "Idle/Bench" },
  { value: "leave_off", label: "Leave/Off" },
  { value: "un_utilized", label: "Un-utilized" },
  { value: "weekly_off_rest", label: "Weekly Off/Rest" },
];

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].replace(/^\uFEFF/, "").split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    const out: Record<string, string> = {};
    headers.forEach((h, idx) => {
      out[h] = vals[idx] ?? "";
    });
    return out;
  });
}

function TimesheetManager({ resourceType }: { resourceType: ResourceType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [projectWiseProjectId, setProjectWiseProjectId] = useState<string>("");
  const [form, setForm] = useState({
    date: "",
    status: "worked" as TimesheetStatus,
    resourceId: "",
    projectId: "",
    wpId: "",
    enteredBy: "",
    remarks: "",
  });

  const resourceEndpoint = useMemo(() => {
    if (resourceType === "manpower") return "/api/employee-masters";
    if (resourceType === "rental_manpower") return "/api/rental-manpower";
    if (resourceType === "equipment") return "/api/equipment-masters";
    if (resourceType === "rental_equipment") return "/api/rental-equipment";
    return "/api/tool-masters";
  }, [resourceType]);

  const resourceIdField = useMemo(() => {
    if (resourceType === "manpower") return "employeeId";
    if (resourceType === "rental_manpower") return "rentalManpowerId";
    if (resourceType === "equipment") return "equipmentId";
    if (resourceType === "rental_equipment") return "rentalEquipmentId";
    return "toolId";
  }, [resourceType]);

  const { data: timesheets = [] } = useQuery<TimesheetRow[]>({
    queryKey: ["/api/timesheets", resourceType],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?resourceType=${resourceType}`);
      if (!res.ok) throw new Error("Failed to load timesheets");
      return res.json();
    },
  });

  const { data: resources = [] } = useQuery<ResourceOption[]>({
    queryKey: [resourceEndpoint],
    queryFn: async () => {
      const res = await fetch(resourceEndpoint);
      if (!res.ok) throw new Error("Failed to load resources");
      const data = await res.json();
      return (data as any[]).map((item) => {
        if (resourceType === "manpower" || resourceType === "rental_manpower") {
          return {
            id: item.id,
            label: `${item.employeeNumber} - ${item.empFirstName} ${item.empLastName}`,
          };
        }
        if (resourceType === "equipment" || resourceType === "rental_equipment") {
          return {
            id: item.id,
            label: `${item.equipmentNumber} - ${item.equipmentName}`,
          };
        }
        return { id: item.id, label: `${item.toolNumber} - ${item.name}` };
      });
    },
  });

  const { data: projects = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const { data: workPackages = [] } = useQuery<Array<{ id: number; code: string; name: string }>>({
    queryKey: ["/api/projects", form.projectId, "work-packages"],
    queryFn: async () => {
      if (!form.projectId) return [];
      const res = await fetch(`/api/projects/${form.projectId}/work-packages`);
      if (!res.ok) throw new Error("Failed to load work packages");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        date: form.date,
        resourceType,
        status: form.status,
        projectId: form.projectId ? Number(form.projectId) : null,
        wpId: form.wpId ? Number(form.wpId) : null,
        enteredBy: form.enteredBy,
        remarks: form.remarks || null,
      };
      payload[resourceIdField] = form.resourceId ? Number(form.resourceId) : null;
      const isEdit = editingId != null;
      const url = isEdit ? `/api/timesheets/${editingId}` : "/api/timesheets";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message ?? "Failed to save timesheet");
      }
      return res.status === 204 ? null : res.json();
    },
    onSuccess: () => {
      toast({ title: editingId ? "Timesheet updated" : "Timesheet added" });
      setEditingId(null);
      setForm({
        date: "",
        status: "worked",
        resourceId: "",
        projectId: "",
        wpId: "",
        enteredBy: "",
        remarks: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets", resourceType] });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/timesheets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Timesheet deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets", resourceType] });
    },
  });

  const bulkUpload = async (file: File, mode: "project-wise" | "company-wise") => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) throw new Error("CSV has no data rows");
    const csvData = rows.map((r) => {
      const payload: Record<string, unknown> = {
        date: r.date,
        resourceType,
        status: r.status,
        enteredBy: r.enteredBy,
        remarks: r.remarks || null,
        projectId: r.projectId ? Number(r.projectId) : null,
        wpId: r.wpId ? Number(r.wpId) : null,
      };
      if (r.employeeId) payload.employeeId = Number(r.employeeId);
      if (r.rentalManpowerId) payload.rentalManpowerId = Number(r.rentalManpowerId);
      if (r.equipmentId) payload.equipmentId = Number(r.equipmentId);
      if (r.rentalEquipmentId) payload.rentalEquipmentId = Number(r.rentalEquipmentId);
      if (r.toolId) payload.toolId = Number(r.toolId);
      return payload;
    });
    const body =
      mode === "project-wise"
        ? { projectId: Number(projectWiseProjectId), csvData }
        : { csvData };
    const res = await fetch(`/api/timesheets/bulk-upload/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message ?? "Bulk upload failed");
    }
    queryClient.invalidateQueries({ queryKey: ["/api/timesheets", resourceType] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add / Edit timesheet record</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <select className="h-10 rounded-md border px-3 text-sm" value={form.resourceId} onChange={(e) => setForm((p) => ({ ...p, resourceId: e.target.value }))}>
            <option value="">Select resource</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TimesheetStatus }))}>
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Input placeholder="Entered by" value={form.enteredBy} onChange={(e) => setForm((p) => ({ ...p, enteredBy: e.target.value }))} />
          <select className="h-10 rounded-md border px-3 text-sm" value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value, wpId: "" }))}>
            <option value="">Project (optional unless worked)</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={form.wpId} onChange={(e) => setForm((p) => ({ ...p, wpId: e.target.value }))}>
            <option value="">Work package (optional unless worked)</option>
            {workPackages.map((w) => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
          </select>
          <Input placeholder="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {editingId ? "Update" : "Add"}
            </Button>
            {editingId != null && (
              <Button variant="outline" onClick={() => { setEditingId(null); setForm((p) => ({ ...p, date: "", resourceId: "", projectId: "", wpId: "", enteredBy: "", remarks: "" })); }}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bulk upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-zinc-600">
            CSV fields: <code>date,status,enteredBy,remarks,projectId,wpId,employeeId,rentalManpowerId,equipmentId,rentalEquipmentId,toolId</code>
          </div>
          <div className="flex gap-2">
            <a href="/templates/timesheet-company-wise-template.csv" download>
              <Button type="button" variant="outline" size="sm">Company CSV template</Button>
            </a>
            <a href="/templates/timesheet-project-wise-template.csv" download>
              <Button type="button" variant="outline" size="sm">Project CSV template</Button>
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await bulkUpload(f, "company-wise");
                  toast({ title: "Company-wise upload complete" });
                } catch (err: any) {
                  toast({ title: "Bulk upload failed", description: err.message, variant: "destructive" });
                }
              }}
            />
            <span className="text-xs text-zinc-500">Company-wise</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-10 rounded-md border px-3 text-sm" value={projectWiseProjectId} onChange={(e) => setProjectWiseProjectId(e.target.value)}>
              <option value="">Select project for project-wise upload</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Input
              type="file"
              accept=".csv"
              disabled={!projectWiseProjectId}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await bulkUpload(f, "project-wise");
                  toast({ title: "Project-wise upload complete" });
                } catch (err: any) {
                  toast({ title: "Bulk upload failed", description: err.message, variant: "destructive" });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Timesheet records</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Work package</TableHead>
                  <TableHead>Entered by</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.resourceLabel ?? "—"}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.projectName ?? "—"}</TableCell>
                    <TableCell>{row.wpCode ? `${row.wpCode} - ${row.wpName ?? ""}` : "—"}</TableCell>
                    <TableCell>{row.enteredBy}</TableCell>
                    <TableCell>{row.remarks ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(row.id);
                            const resourceId = row.employeeId ?? row.rentalManpowerId ?? row.equipmentId ?? row.rentalEquipmentId ?? row.toolId;
                            setForm({
                              date: row.date,
                              status: row.status,
                              resourceId: resourceId ? String(resourceId) : "",
                              projectId: row.projectId ? String(row.projectId) : "",
                              wpId: row.wpId ? String(row.wpId) : "",
                              enteredBy: row.enteredBy,
                              remarks: row.remarks ?? "",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(row.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TimesheetsPage() {
  return (
    <div className="flex-1 min-w-0 bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-zinc-900 min-w-0">
          <Clock3 className="h-6 w-6 text-teal-600 shrink-0" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Timesheets</h1>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
              Shared daily timesheets for manpower, rental manpower, equipment, rental equipment, and tools.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1280px] mx-auto">
        <Tabs defaultValue="manpower" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="manpower">Manpower</TabsTrigger>
            <TabsTrigger value="rental_manpower">Rental Manpower</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="rental_equipment">Rental Equipment</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="manpower"><TimesheetManager resourceType="manpower" /></TabsContent>
          <TabsContent value="rental_manpower"><TimesheetManager resourceType="rental_manpower" /></TabsContent>
          <TabsContent value="equipment"><TimesheetManager resourceType="equipment" /></TabsContent>
          <TabsContent value="rental_equipment"><TimesheetManager resourceType="rental_equipment" /></TabsContent>
          <TabsContent value="tools"><TimesheetManager resourceType="tools" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
