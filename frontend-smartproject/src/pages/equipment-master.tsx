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
import { EquipmentResourceMapper } from "@/components/project/equipment-resource-mapper";

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
  const categoryVal = e.equipmentType || meta.category || "Heavy";
  const unitVal = e.unit || "Hour";
  return {
    type: "equipment",
    code: e.equipmentNumber || "",
    name: e.equipmentName || "",
    description: e.description ?? "",
    ownershipType: meta.ownershipType ?? "Own",
    category: categoryVal,
    subcategory: meta.subcategory ?? categoryVal,
    unitRate: e.costPerHour || "0",
    unit: unitVal,
    manufacturer: e.manufacturer ?? "",
    modelYear: e.model ? `${e.model}${e.year ? ` - ${e.year}` : ""}` : "",
    capacity: e.capacity ?? "",
    status: e.status?.toLowerCase() === "inactive" ? "inactive" : "active",
    inactiveReason: meta.inactiveReason ?? "maintenance",
    exitDate: meta.exitDate ?? "",
    maintenanceStartDate: meta.maintenanceStartDate ?? "",
    maintenanceEndDate: meta.maintenanceEndDate ?? "",
    mappedResourceId: meta.mappedResourceId ?? "",
    remarks: stripMeta(e.remarks),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const modelYear = String(values.modelYear ?? "");
  const [model, yearPart] = modelYear.split(" - ");
  const categoryVal = String(values.category || "").trim() || "Heavy";
  const unitVal = String(values.unit || "").trim() || "Hour";
  const rateVal = String(values.unitRate || "").trim() || "0";
  const remarks = encodeMeta(String(values.remarks ?? ""), {
    subcategory: String(values.subcategory ?? ""),
    category: categoryVal,
    ownershipType: String(values.ownershipType ?? "Own"),
    inactiveReason: String(values.inactiveReason ?? ""),
    exitDate: String(values.exitDate ?? ""),
    maintenanceStartDate: String(values.maintenanceStartDate ?? ""),
    maintenanceEndDate: String(values.maintenanceEndDate ?? ""),
    mappedResourceId: String(values.mappedResourceId ?? ""),
  });
  return {
    equipmentNumber: String(values.code || "EQP-001").trim(),
    equipmentName: String(values.name || "Equipment").trim(),
    equipmentType: categoryVal,
    description: String(values.description || "") || undefined,
    manufacturer: String(values.manufacturer || "") || undefined,
    model: model?.trim() || undefined,
    year: yearPart && !isNaN(Number(yearPart)) ? Number(yearPart) : undefined,
    capacity: String(values.capacity || "") || undefined,
    unit: unitVal,
    costPerHour: rateVal,
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
    category: (e, c) => (parseMeta(e.remarks).subcategory || e.equipmentType) === c,
    status: (e, s) => (e.status?.toLowerCase() === "inactive" ? "inactive" : "active") === s,
  });

  const createMutation = useMutation({
    mutationFn: async ({ data, rawValues }: { data: ReturnType<typeof formToPayload>; rawValues?: Record<string, unknown> }) => {
      const created = await createEquipment(data);
      if (rawValues?.mappedResourceId && created?.id) {
        try {
          await fetch(`/api/equipment/${created.id}/map-resource`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resourceId: Number(rawValues.mappedResourceId) }),
          });
        } catch { /* skip */ }
      }
      return created;
    },
    onSuccess: (data: Equipment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-masters"] });
      toast.success(`${data.equipmentName} created successfully`);
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, rawValues }: { id: number; data: ReturnType<typeof formToPayload>; rawValues?: Record<string, unknown> }) => {
      const updated = await updateEquipment(id, data);
      if (rawValues?.mappedResourceId) {
        try {
          await fetch(`/api/equipment/${id}/map-resource`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resourceId: Number(rawValues.mappedResourceId) }),
          });
        } catch { /* skip */ }
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-masters"] });
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
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
      key: "equipmentNumber",
      header: "Code",
      width: "110px",
      render: (e) => <span className="font-mono text-xs font-semibold text-zinc-700">{e.equipmentNumber}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (e) => <span className="font-medium">{e.equipmentName}</span>,
    },
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (e) => <TypeBadge label={parseMeta(e.remarks).ownershipType || "Own"} />,
    },
    {
      key: "category",
      header: "Equipment Type / Category",
      width: "160px",
      render: (e) => e.equipmentType || parseMeta(e.remarks).category || "Heavy",
    },
    {
      key: "resourceMapping",
      header: "Mapped Resource Type",
      width: "160px",
      render: (e) => (
        <EquipmentResourceMapper
          equipmentId={e.id}
          equipmentName={e.equipmentName}
        />
      ),
    },
    {
      key: "rate",
      header: "Hourly Rate",
      width: "110px",
      className: "text-right font-mono text-sm",
      render: (e) => `₹${e.costPerHour} / H`,
    },
    {
      key: "status",
      header: "Status & Reason",
      width: "190px",
      render: (e) => {
        const meta = parseMeta(e.remarks);
        const isInactive = e.status?.toLowerCase() === "inactive";
        if (!isInactive) {
          return <StatusBadge status="active" />;
        }
        const reason = meta.inactiveReason;
        if (reason === "exit") {
          const exitStr = meta.exitDate ? ` (${meta.exitDate})` : "";
          return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Inactive (Exit{exitStr})</span>;
        }
        if (reason === "maintenance") {
          const maintStr = meta.maintenanceStartDate ? ` (${meta.maintenanceStartDate} to ${meta.maintenanceEndDate || '?'})` : "";
          return <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Inactive (Maint{maintStr})</span>;
        }
        return <StatusBadge status="inactive" />;
      },
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
            updateMutation.mutate({ id: editing.id, data: payload, rawValues: values });
          } else {
            createMutation.mutate({ data: payload, rawValues: values });
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
