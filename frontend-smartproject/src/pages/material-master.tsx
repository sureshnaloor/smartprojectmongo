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
import { encodeMeta, parseMeta, stripMeta, displayStatus } from "@/components/global-masters/meta-fields";
import { StatusBadge, TypeBadge, useFilteredRows } from "@/components/global-masters/table-utils";

interface Material {
  id: number;
  materialCode: string;
  materialDescription: string;
  uom: string;
  materialType: string;
  materialGroup: string;
  materialClass: string;
  baseRate: number | string;
}

async function getMaterials(): Promise<Material[]> {
  const res = await fetch("/api/material-masters");
  if (!res.ok) throw new Error("Failed to fetch materials");
  return res.json();
}

async function createMaterial(data: Omit<Material, "id">) {
  const res = await fetch("/api/material-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create material");
  return res.json();
}

async function updateMaterial(id: number, data: Partial<Material>) {
  const res = await fetch(`/api/material-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update material");
  return res.json();
}

async function deleteMaterial(id: number) {
  const res = await fetch(`/api/material-masters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete material");
}

function materialToForm(m: Material): Record<string, unknown> {
  const meta = parseMeta(m.materialClass === "common" ? "" : m.materialClass);
  return {
    type: "materials",
    code: m.materialCode,
    name: m.materialDescription,
    description: meta.description ?? "",
    category: m.materialType,
    subcategory: m.materialGroup,
    unitOfMeasure: m.uom,
    unitRate: String(m.baseRate),
    leadTime: meta.leadTime ?? "",
    status: displayStatus(meta),
    remarks: stripMeta(m.materialClass),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const materialClass = encodeMeta(String(values.remarks ?? ""), {
    leadTime: String(values.leadTime ?? ""),
    status: String(values.status ?? "active"),
    description: String(values.description ?? ""),
  });
  return {
    materialCode: String(values.code),
    materialDescription: String(values.name),
    uom: String(values.unitOfMeasure),
    materialType: String(values.category),
    materialGroup: String(values.subcategory),
    materialClass: materialClass || "common",
    baseRate: String(values.unitRate),
  };
}

export default function MaterialMaster() {
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
  const [editing, setEditing] = useState<Material | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["/api/material-masters"],
    queryFn: getMaterials,
  });

  const filtered = useFilteredRows(materials, filters, {
    search: (m, q) =>
      m.materialDescription.toLowerCase().includes(q) ||
      m.materialCode.toLowerCase().includes(q),
    type: (m, t) => m.materialType === t,
    category: (m, c) => m.materialGroup === c,
    status: (m, s) => displayStatus(parseMeta(m.materialClass)) === s,
  });

  const createMutation = useMutation({
    mutationFn: createMaterial,
    onSuccess: (data: Material) => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast.success(`${data.materialDescription} created successfully`);
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnType<typeof formToPayload> }) =>
      updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-masters"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
  });

  const columns: MasterTableColumn<Material>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (m) => <TypeBadge label={m.materialType || "Direct"} />,
    },
    {
      key: "name",
      header: "Name",
      render: (m) => <span className="font-medium">{m.materialDescription}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (m) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {parseMeta(m.materialClass).description || m.materialCode}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Unit Rate",
      width: "100px",
      className: "text-right font-mono text-sm",
      render: (m) => `₹${m.baseRate} / ${m.uom}`,
    },
    {
      key: "category",
      header: "Category",
      width: "120px",
      render: (m) => m.materialGroup,
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (m) => <StatusBadge status={displayStatus(parseMeta(m.materialClass))} />,
    },
  ];

  const selected = materials.find((m) => m.id === selectedId);

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("materials")}
        count={filtered.length}
        addLabel="Material"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onDownloadTemplate={() => {
          const link = document.createElement("a");
          link.href = "/templates/material-master-template.csv";
          link.download = "material-master-template.csv";
          link.click();
        }}
        onImportCsv={() => fileRef.current?.click()}
        onExportAll={() => toast.success("Export complete")}
      />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.materials}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((m) => ({
          id: m.id,
          data: m,
          inactive: displayStatus(parseMeta(m.materialClass)) !== "active",
          flash: flashId === m.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Material"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onImport={() => fileRef.current?.click()}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={(m) => {
          setEditing(m);
          setModalMode("edit");
          setModalOpen(true);
        }}
        onDelete={(m) => {
          if (window.confirm(`Delete ${m.materialDescription}?`)) deleteMutation.mutate(m.id);
        }}
        onNameClick={(m) => {
          setEditing(m);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Suppliers"
        resourceName={selected?.materialDescription}
        count={0}
        onClose={() => setSelectedId(null)}
      />

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="materials"
        mode={modalMode}
        typeLabel="Material"
        resourceName={editing?.materialDescription}
        initialValues={editing ? materialToForm(editing) : undefined}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = formToPayload(values);
          if (editing && modalMode === "edit") {
            updateMutation.mutate({ id: editing.id, data: payload });
          } else {
            createMutation.mutate(payload as Omit<Material, "id">);
          }
        }}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Delete ${editing.materialDescription}?`)) {
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
