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
import {
  MappedEntitiesPanel,
  MappedEntityTable,
} from "@/components/global-masters/mapped-entities-panel";
import { parseMeta, encodeMeta, stripMeta } from "@/components/global-masters/meta-fields";
import { StatusBadge, TypeBadge, useFilteredRows } from "@/components/global-masters/table-utils";

interface Equipment {
  id: number;
  equipmentNumber: string;
  equipmentName: string;
  equipmentType: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  year?: number | null;
  capacity?: string;
  unit?: string;
  costPerHour: string;
  status: string;
  remarks?: string;
}

async function getEquipment(): Promise<Equipment[]> {
  const res = await fetch("/api/equipment-masters");
  if (!res.ok) throw new Error("Failed to fetch equipment");
  return res.json();
}

async function createEquipment(data: Omit<Equipment, "id">) {
  const res = await fetch("/api/equipment-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create equipment");
  return res.json();
}

async function updateEquipment(id: number, data: Partial<Equipment>) {
  const res = await fetch(`/api/equipment-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update equipment");
  return res.json();
}

async function deleteEquipment(id: number) {
  const res = await fetch(`/api/equipment-masters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete equipment");
}

function equipToForm(e: Equipment): Record<string, unknown> {
  const meta = parseMeta(e.remarks);
  return {
    type: "equipment",
    code: e.equipmentNumber,
    name: e.equipmentName,
    description: e.description ?? "",
    category: e.equipmentType || meta.category || "Heavy",
    subcategory: meta.subcategory ?? "Earthmoving",
    unitRate: e.costPerHour,
    unit: e.unit ?? "Hour",
    manufacturer: e.manufacturer ?? "",
    modelYear: e.model ? `${e.model}${e.year ? ` - ${e.year}` : ""}` : "",
    capacity: e.capacity ?? "",
    status: e.status?.toLowerCase() === "inactive" ? "inactive" : "active",
    remarks: stripMeta(e.remarks),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const modelYear = String(values.modelYear ?? "");
  const [model, yearPart] = modelYear.split(" - ");
  const remarks = encodeMeta(String(values.remarks ?? ""), {
    subcategory: String(values.subcategory ?? ""),
    category: String(values.category ?? ""),
  });
  return {
    equipmentNumber: String(values.code),
    equipmentName: String(values.name),
    equipmentType: String(values.category),
    description: String(values.description || "") || undefined,
    manufacturer: String(values.manufacturer || "") || undefined,
    model: model?.trim() || undefined,
    year: yearPart ? Number(yearPart) : undefined,
    capacity: String(values.capacity || "") || undefined,
    unit: String(values.unit ?? "Hour"),
    costPerHour: String(values.unitRate),
    status: values.status === "inactive" ? "Inactive" : "Active",
    remarks: remarks || undefined,
  };
}

export default function EquipmentMaster() {
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
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["/api/equipment-masters"],
    queryFn: getEquipment,
  });

  const filtered = useFilteredRows(equipment, filters, {
    search: (e, q) =>
      e.equipmentName.toLowerCase().includes(q) ||
      e.equipmentNumber.toLowerCase().includes(q),
    type: (e, t) => e.equipmentType === t,
    category: (e, c) => parseMeta(e.remarks).subcategory === c,
    status: (e, s) =>
      (s === "active" ? e.status !== "Inactive" : e.status === "Inactive"),
  });

  const createMutation = useMutation({
    mutationFn: createEquipment,
    onSuccess: (data: Equipment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-masters"] });
      toast.success(`${data.equipmentName} created successfully`);
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnType<typeof formToPayload> }) =>
      updateEquipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-masters"] });
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-masters"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
  });

  const columns: MasterTableColumn<Equipment>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (e) => <TypeBadge label={e.equipmentType || "Heavy"} />,
    },
    {
      key: "name",
      header: "Name",
      render: (e) => <span className="font-medium">{e.equipmentName}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (e) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {e.description || "—"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Hourly Rate",
      width: "100px",
      className: "text-right font-mono text-sm",
      render: (e) => `₹${e.costPerHour} / H`,
    },
    {
      key: "category",
      header: "Category",
      width: "120px",
      render: (e) => parseMeta(e.remarks).subcategory || e.equipmentType,
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (e) => (
        <StatusBadge status={e.status === "Inactive" ? "inactive" : "active"} />
      ),
    },
  ];

  const selected = equipment.find((e) => e.id === selectedId);

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("equipment")}
        count={filtered.length}
        addLabel="Equipment"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onImportCsv={() => fileRef.current?.click()}
        onExportAll={() => toast.success("Export complete")}
      />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.equipment}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((e) => ({
          id: e.id,
          data: e,
          inactive: e.status === "Inactive",
          flash: flashId === e.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Equipment"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={(e) => {
          setEditing(e);
          setModalMode("edit");
          setModalOpen(true);
        }}
        onDelete={(e) => {
          if (window.confirm(`Delete ${e.equipmentName}?`)) deleteMutation.mutate(e.id);
        }}
        onNameClick={(e) => {
          setEditing(e);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Equipment Units"
        resourceName={selected?.equipmentName}
        count={0}
        onClose={() => setSelectedId(null)}
      >
        <MappedEntityTable columns={["Unit ID", "Location", "Condition", "Status"]} rows={[]} />
      </MappedEntitiesPanel>

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="equipment"
        mode={modalMode}
        typeLabel="Equipment"
        resourceName={editing?.equipmentName}
        initialValues={editing ? equipToForm(editing) : undefined}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = formToPayload(values);
          if (editing && modalMode === "edit") {
            updateMutation.mutate({ id: editing.id, data: payload });
          } else {
            createMutation.mutate(payload as Omit<Equipment, "id">);
          }
        }}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Delete ${editing.equipmentName}?`)) {
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
