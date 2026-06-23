import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MASTER_FILTERS, masterPageTitle } from "@/components/global-masters/constants";
import {
  GlobalMasterFilterBar,
  type FilterState,
} from "@/components/global-masters/global-master-filter-bar";
import { GlobalMasterTableHeader } from "@/components/global-masters/global-master-table-header";
import {
  GlobalMasterDataTable,
  type MasterTableColumn,
} from "@/components/global-masters/global-master-data-table";
import {
  GlobalMasterModal,
  type ModalMode,
} from "@/components/global-masters/global-master-modal";
import { MappedEntitiesPanel } from "@/components/global-masters/mapped-entities-panel";
import {
  encodeMeta,
  parseMeta,
  stripMeta,
  displayStatus,
} from "@/components/global-masters/meta-fields";
import { StatusBadge, TypeBadge, useFilteredRows } from "@/components/global-masters/table-utils";

interface GlobalActivity {
  id: number;
  name: string;
  description?: string | null;
  activityType?: string | null;
  unitOfMeasure?: string | null;
  unitRate?: string | null;
  remarks?: string | null;
}

function activityToForm(a: GlobalActivity): Record<string, unknown> {
  const meta = parseMeta(a.remarks);
  return {
    type: "activities",
    code: meta.code ?? `ACT-${a.id}`,
    name: a.name,
    description: a.description ?? "",
    phase: meta.phase ?? "Construction",
    duration: meta.duration ?? "",
    activityType: meta.activityType ?? "Standard",
    status: displayStatus(meta),
    remarks: stripMeta(a.remarks),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const remarks = encodeMeta(String(values.remarks ?? ""), {
    code: String(values.code ?? ""),
    phase: String(values.phase ?? ""),
    duration: String(values.duration ?? ""),
    activityType: String(values.activityType ?? "Standard"),
    status: String(values.status ?? "active"),
  });
  const isStandard = values.activityType === "Standard";
  return {
    activityType: isStandard ? "units" : "lumpsum",
    name: String(values.name),
    description: String(values.description || "") || null,
    remarks: remarks || null,
    unitOfMeasure: isStandard ? "ea" : null,
    unitRate: isStandard ? "0" : null,
    quantity: null,
    totalBudget: null,
    percentComplete: 0,
    progressState: 0,
    milestones: null,
  };
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function ActivityMaster() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "all",
    category: "all",
    status: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<GlobalActivity | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: activities = [], isLoading } = useQuery<GlobalActivity[]>({
    queryKey: ["/api/activities"],
  });

  const filtered = useFilteredRows(activities, filters, {
    search: (a, q) =>
      a.name.toLowerCase().includes(q) ||
      (a.description?.toLowerCase().includes(q) ?? false) ||
      (parseMeta(a.remarks).code?.toLowerCase().includes(q) ?? false),
    type: (a, t) => parseMeta(a.remarks).activityType === t,
    category: (a, c) => parseMeta(a.remarks).phase === c,
    status: (a, s) => displayStatus(parseMeta(a.remarks)) === s,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/activities"] });

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(values)),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    onSuccess: (data: GlobalActivity) => {
      invalidate();
      toast.success(`${data.name} created successfully`);
      setFlashId(data.id);
      setTimeout(() => setFlashId(null), 2000);
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: Record<string, unknown> }) => {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(values)),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseApiError(res));
    },
    onSuccess: () => {
      invalidate();
      toast.success("Record deleted");
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (csvData: unknown[]) => {
      const res = await fetch("/api/activities/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    onSuccess: (data: GlobalActivity[]) => {
      invalidate();
      toast.success(`${data.length} records imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: MasterTableColumn<GlobalActivity>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (a) => (
        <TypeBadge label={parseMeta(a.remarks).activityType || "Standard"} />
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (a) => <span className="font-medium">{a.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (a) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {a.description || "—"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Default Duration",
      width: "100px",
      className: "text-right font-mono text-sm",
      render: (a) => {
        const d = parseMeta(a.remarks).duration;
        return d ? `${d} days` : "—";
      },
    },
    {
      key: "category",
      header: "Phase",
      width: "120px",
      render: (a) => parseMeta(a.remarks).phase || "—",
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (a) => <StatusBadge status={displayStatus(parseMeta(a.remarks))} />,
    },
  ];

  const selectedActivity = activities.find((a) => a.id === selectedId);

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
          return {
            name: values[headers.indexOf("name")],
            description: values[headers.indexOf("description")] || null,
            activityType: values[headers.indexOf("activityType")] || "units",
            unitOfMeasure: values[headers.indexOf("unitOfMeasure")] || null,
            unitRate: values[headers.indexOf("unitRate")] || null,
            remarks: values[headers.indexOf("remarks")] || null,
          };
        });
        bulkUploadMutation.mutate(csvData);
      } catch {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("activities")}
        count={filtered.length}
        addLabel="Activity"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onDownloadTemplate={() => {
          const link = document.createElement("a");
          link.href = "/templates/activity-master-template.csv";
          link.download = "activity-master-template.csv";
          link.click();
        }}
        onImportCsv={() => fileRef.current?.click()}
        onExportAll={() => toast.success("Export complete")}
      />
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.activities}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((a) => ({
          id: a.id,
          data: a,
          inactive: displayStatus(parseMeta(a.remarks)) !== "active",
          flash: flashId === a.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Activity"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onImport={() => fileRef.current?.click()}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={(a) => {
          setEditing(a);
          setModalMode("edit");
          setModalOpen(true);
        }}
        onDelete={(a) => {
          if (window.confirm(`Delete ${a.name}?`)) deleteMutation.mutate(a.id);
        }}
        onNameClick={(a) => {
          setEditing(a);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Resources Required"
        resourceName={selectedActivity?.name}
        count={0}
        onClose={() => setSelectedId(null)}
      />

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="activities"
        mode={modalMode}
        typeLabel="Activity"
        resourceName={editing?.name}
        initialValues={editing ? activityToForm(editing) : undefined}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          if (editing && modalMode === "edit") {
            updateMutation.mutate({ id: editing.id, values });
          } else {
            createMutation.mutate(values);
          }
        }}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Delete ${editing.name}?`)) {
                  deleteMutation.mutate(editing.id);
                  setModalOpen(false);
                }
              }
            : undefined
        }
      />
    </>
  );
}
