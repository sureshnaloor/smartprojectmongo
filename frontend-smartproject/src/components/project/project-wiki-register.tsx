import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Search, Trash2, Edit, type LucideIcon } from "lucide-react";

export interface WikiRecord {
  id: number;
  projectId: number;
  recordDate: string;
  title: string;
  description?: string | null;
  loggedBy: string;
  location?: string | null;
  severity?: "Low" | "Medium" | "High" | "Critical" | null;
  status: "Open" | "In Progress" | "Closed";
  remarks?: string | null;
}

export interface WikiRegisterConfig {
  title: string;
  subtitle: string;
  apiPath: string;
  Icon: LucideIcon;
  titleLabel?: string;
  descriptionLabel?: string;
  showLocation?: boolean;
  showSeverity?: boolean;
}

const emptyForm = () => ({
  recordDate: new Date().toISOString().split("T")[0],
  title: "",
  description: "",
  loggedBy: "",
  location: "",
  severity: "" as "" | "Low" | "Medium" | "High" | "Critical",
  status: "Open" as "Open" | "In Progress" | "Closed",
  remarks: "",
});

export function ProjectWikiRegister({ config }: { config: WikiRegisterConfig }) {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBase = `/api/projects/${projectId}/${config.apiPath}`;

  const { data, isLoading } = useQuery<WikiRecord[]>({
    queryKey: [apiBase],
  });
  const records = Array.isArray(data) ? data : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        recordDate: form.recordDate,
        title: form.title,
        description: form.description || null,
        loggedBy: form.loggedBy,
        location: config.showLocation ? form.location || null : null,
        severity: config.showSeverity && form.severity ? form.severity : null,
        status: form.status,
        remarks: form.remarks || null,
      };
      const res = editingId
        ? await apiRequest("PUT", `${apiBase}/${editingId}`, payload)
        : await apiRequest("POST", apiBase, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase] });
      toast({ title: "Saved", description: "Record saved successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${apiBase}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase] });
      toast({ title: "Deleted", description: "Record removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
    },
  });

  const openEdit = (record: WikiRecord) => {
    setEditingId(record.id);
    setForm({
      recordDate: record.recordDate,
      title: record.title,
      description: record.description || "",
      loggedBy: record.loggedBy,
      location: record.location || "",
      severity: record.severity || "",
      status: record.status,
      remarks: record.remarks || "",
    });
    setDialogOpen(true);
  };

  const filtered = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.loggedBy.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q)
    );
  });

  const Icon = config.Icon;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icon className="h-7 w-7 text-primary" />
            {config.title}
          </h1>
          <p className="text-muted-foreground mt-1">{config.subtitle}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add record
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>{config.titleLabel || "Title"}</TableHead>
                  <TableHead>Logged by</TableHead>
                  {config.showSeverity && <TableHead>Severity</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.recordDate}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {record.title}
                    </TableCell>
                    <TableCell>{record.loggedBy}</TableCell>
                    {config.showSeverity && (
                      <TableCell>
                        {record.severity && (
                          <Badge variant="outline">{record.severity}</Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge>{record.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(record)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this record?")) {
                            deleteMutation.mutate(record.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit record" : "Add record"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.recordDate}
                  onChange={(e) => setForm((f) => ({ ...f, recordDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as typeof form.status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{config.titleLabel || "Title"}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Logged by</Label>
              <Input
                value={form.loggedBy}
                onChange={(e) => setForm((f) => ({ ...f, loggedBy: e.target.value }))}
              />
            </div>
            {config.showLocation && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            )}
            {config.showSeverity && (
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={form.severity || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      severity: v as typeof form.severity,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{config.descriptionLabel || "Description"}</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.title || !form.loggedBy || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
