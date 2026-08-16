import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RESOURCE_HOURLY_UOM } from "@/lib/resource-uom";
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
import {
  MappedEntitiesPanel,
  MappedEntityTable,
} from "@/components/global-masters/mapped-entities-panel";
import {
  encodeMeta,
  parseMeta,
  stripMeta,
  displayStatus,
} from "@/components/global-masters/meta-fields";
import { StatusBadge, TypeBadge, useFilteredRows } from "@/components/global-masters/table-utils";

type ResourceType = "manpower" | "equipment" | "rental_manpower" | "rental_equipment" | "tools";

interface Resource {
  id: number;
  type: ResourceType;
  name: string;
  description?: string;
  unitOfMeasure: string;
  unitRate: number | string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

interface MappedEntities {
  resourceType: string;
  ownManpower: Array<{ id: number; employeeNumber: string; empFirstName: string; empLastName: string }>;
  rentalManpower: Array<{ id: number; employeeNumber: string; empFirstName: string; empLastName: string }>;
  ownEquipment: Array<{ id: number; equipmentNumber: string; equipmentName: string }>;
  rentalEquipment: Array<{ id: number; equipmentNumber: string; equipmentName: string }>;
}

async function getResources(): Promise<Resource[]> {
  const response = await fetch("/api/resources");
  if (!response.ok) throw new Error("Failed to fetch resources");
  return response.json();
}

async function createResource(data: Omit<Resource, "id" | "createdAt" | "updatedAt">) {
  const response = await fetch("/api/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create resource");
  return response.json();
}

async function updateResource(
  id: number,
  data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>
) {
  const response = await fetch(`/api/resources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update resource");
  return response.json();
}

async function deleteResource(id: number) {
  const response = await fetch(`/api/resources/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete resource");
}

async function bulkUploadResources(csvData: unknown[]) {
  const response = await fetch("/api/resources/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvData }),
  });
  if (!response.ok) throw new Error("Failed to upload resources");
  return response.json();
}

async function getMappedEntities(resourceId: number): Promise<MappedEntities> {
  const response = await fetch(`/api/resources/${resourceId}/mapped-entities`);
  if (!response.ok) throw new Error("Failed to fetch mapped entities");
  return response.json();
}

function resourceToForm(r: Resource): Record<string, unknown> {
  const meta = parseMeta(r.remarks);
  return {
    type: r.type,
    name: r.name,
    description: r.description ?? "",
    unitRate: String(r.unitRate),
    trade: meta.trade ?? "",
    skillLevel: meta.skillLevel ?? meta.skill ?? "Skilled",
    status: displayStatus(meta),
    inactiveReason: meta.inactiveReason ?? "temporary-leave",
    exitDate: meta.exitDate ?? "",
    leaveStartDate: meta.leaveStartDate ?? "",
    leaveEndDate: meta.leaveEndDate ?? "",
    remarks: stripMeta(r.remarks),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const remarks = encodeMeta(String(values.remarks ?? ""), {
    trade: String(values.trade ?? ""),
    skillLevel: String(values.skillLevel ?? ""),
    status: String(values.status ?? "active"),
    inactiveReason: String(values.inactiveReason ?? ""),
    exitDate: String(values.exitDate ?? ""),
    leaveStartDate: String(values.leaveStartDate ?? ""),
    leaveEndDate: String(values.leaveEndDate ?? ""),
  });
  return {
    type: values.type as ResourceType,
    name: String(values.name),
    description: String(values.description || "") || undefined,
    unitOfMeasure: RESOURCE_HOURLY_UOM,
    unitRate: String(values.unitRate),
    remarks: remarks || undefined,
  };
}

const MANPOWER_TYPES: ResourceType[] = ["manpower", "rental_manpower"];

export default function ResourceMaster() {
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
  const [editing, setEditing] = useState<Resource | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: getResources,
  });

  const manpowerResources = useMemo(
    () => resources.filter((r) => MANPOWER_TYPES.includes(r.type)),
    [resources]
  );

  const filtered = useFilteredRows(manpowerResources, filters, {
    search: (r, q) =>
      r.name.toLowerCase().includes(q) ||
      (r.description?.toLowerCase().includes(q) ?? false),
    type: (r, t) => r.type === t,
    category: (r, c) => parseMeta(r.remarks).trade === c,
    status: (r, s) => displayStatus(parseMeta(r.remarks)) === s,
  });

  const { data: mappedEntities, isLoading: mappedLoading } = useQuery({
    queryKey: ["resources", selectedId, "mapped-entities"],
    queryFn: () => getMappedEntities(selectedId!),
    enabled: selectedId != null,
  });

  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: (data: Resource) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success(`${data.name} created successfully`);
      setFlashId(data.id);
      setTimeout(() => setFlashId(null), 2000);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnType<typeof formToPayload> }) =>
      updateResource(id, data),
    onSuccess: (data: Resource) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Changes saved");
      setFlashId(data.id);
      setTimeout(() => setFlashId(null), 2000);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
    onError: () => toast.error("Failed to delete record"),
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadResources,
    onSuccess: (data: Resource[]) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success(`${data.length} records imported`);
    },
    onError: () => toast.error("Import failed"),
  });

  const columns: MasterTableColumn<Resource>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (r) => <TypeBadge label={parseMeta(r.remarks).skillLevel || r.type} />,
    },
    {
      key: "name",
      header: "Name",
      render: (r) => <span className="font-medium text-[var(--text-primary)]">{r.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (r) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {r.description || "—"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Hourly Rate",
      width: "100px",
      className: "text-right font-mono text-sm",
      render: (r) => `${r.unitRate} / H`,
    },
    {
      key: "category",
      header: "Trade",
      width: "120px",
      render: (r) => parseMeta(r.remarks).trade || "—",
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (r) => {
        const meta = parseMeta(r.remarks);
        const status = displayStatus(meta);
        return <StatusBadge status={status} />;
      },
    },
  ];

  const selectedResource = resources.find((r) => r.id === selectedId);

  const mappedRows = useMemo(() => {
    if (!mappedEntities) return [];
    return [
      ...mappedEntities.ownManpower.map((e) => ({
        id: `emp-${e.id}`,
        cells: [
          e.employeeNumber,
          `${e.empFirstName} ${e.empLastName}`,
          "—",
          <StatusBadge key="s" status="active" />,
        ],
      })),
      ...mappedEntities.rentalManpower.map((e) => ({
        id: `rent-${e.id}`,
        cells: [
          e.employeeNumber,
          `${e.empFirstName} ${e.empLastName}`,
          "Rental",
          <StatusBadge key="s" status="active" />,
        ],
      })),
    ];
  }, [mappedEntities]);

  const openCreate = () => {
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditing(r);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openView = (r: Resource) => {
    setEditing(r);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    const payload = formToPayload(values);
    if (editing && modalMode === "edit") {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
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
          return {
            type: values[headers.indexOf("type")] || "manpower",
            name: values[headers.indexOf("name")],
            description: values[headers.indexOf("description")] || "",
            unitOfMeasure: RESOURCE_HOURLY_UOM,
            unitRate: values[headers.indexOf("unitRate")] || values[headers.indexOf("hourlyRate")] || "0",
            remarks: values[headers.indexOf("remarks")] || "",
          };
        });
        bulkUploadMutation.mutate(csvData);
      } catch {
        toast.error("Error parsing CSV file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("manpower")}
        count={filtered.length}
        addLabel="Manpower"
        onAdd={openCreate}
        onDownloadTemplate={() => {
          const link = document.createElement("a");
          link.href = "/templates/resource-master-template.csv";
          link.download = "resource-master-template.csv";
          link.click();
        }}
        onImportCsv={() => fileRef.current?.click()}
        onExportAll={() => toast.success("Export complete")}
      />
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.manpower}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((r) => ({
          id: r.id,
          data: r,
          inactive: displayStatus(parseMeta(r.remarks)) !== "active",
          flash: flashId === r.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Manpower"
        onAdd={openCreate}
        onImport={() => fileRef.current?.click()}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={openEdit}
        onDelete={(r) => {
          if (window.confirm(`Delete ${r.name}? This action cannot be undone.`)) {
            deleteMutation.mutate(r.id);
          }
        }}
        onNameClick={openView}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Employee Master"
        resourceName={selectedResource?.name}
        count={mappedRows.length}
        loading={mappedLoading}
        onClose={() => setSelectedId(null)}
      >
        <MappedEntityTable
          columns={["Employee Code", "Name", "Designation", "Status"]}
          rows={mappedRows}
        />
      </MappedEntitiesPanel>

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="manpower"
        mode={modalMode}
        typeLabel="Manpower"
        resourceName={editing?.name}
        initialValues={editing ? resourceToForm(editing) : { type: "manpower" }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (
                  window.confirm(
                    `Delete ${editing.name}? This action cannot be undone. All mapped entities will be unlinked.`
                  )
                ) {
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
