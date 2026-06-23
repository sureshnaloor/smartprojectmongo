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

interface Service {
  id: number;
  serviceCode: string;
  serviceDescription: string;
  uom: string;
  serviceType: string;
  serviceGroup: string;
  baseRate: number | string;
}

async function getServices(): Promise<Service[]> {
  const res = await fetch("/api/service-masters");
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

async function createService(data: Omit<Service, "id">) {
  const res = await fetch("/api/service-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create service");
  return res.json();
}

async function updateService(id: number, data: Partial<Service>) {
  const res = await fetch(`/api/service-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update service");
  return res.json();
}

async function deleteService(id: number) {
  const res = await fetch(`/api/service-masters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete service");
}

function serviceToForm(s: Service): Record<string, unknown> {
  const meta = parseMeta(s.serviceGroup);
  return {
    type: "services",
    name: s.serviceDescription,
    description: meta.description ?? "",
    serviceType: s.serviceType,
    unitRate: String(s.baseRate),
    rateUnit: s.uom,
    validFrom: meta.validFrom ?? "",
    validTo: meta.validTo ?? "",
    status: displayStatus(meta),
    remarks: stripMeta(s.serviceGroup),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const serviceGroup = encodeMeta(String(values.remarks ?? ""), {
    validFrom: String(values.validFrom ?? ""),
    validTo: String(values.validTo ?? ""),
    status: String(values.status ?? "active"),
    description: String(values.description ?? ""),
  });
  return {
    serviceCode: `SRV-${Date.now().toString(36).toUpperCase()}`,
    serviceDescription: String(values.name),
    serviceType: String(values.serviceType),
    serviceGroup: serviceGroup || String(values.serviceType),
    uom: String(values.rateUnit ?? "Hour"),
    baseRate: String(values.unitRate),
  };
}

export default function ServiceMaster() {
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
  const [editing, setEditing] = useState<Service | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["/api/service-masters"],
    queryFn: getServices,
  });

  const filtered = useFilteredRows(services, filters, {
    search: (s, q) =>
      s.serviceDescription.toLowerCase().includes(q) ||
      s.serviceCode.toLowerCase().includes(q),
    type: (s, t) => s.serviceType === t,
    category: (s, c) => s.serviceGroup.includes(c),
    status: (s, st) => displayStatus(parseMeta(s.serviceGroup)) === st,
  });

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: (data: Service) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast.success(`${data.serviceDescription} created successfully`);
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnType<typeof formToPayload> }) =>
      updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-masters"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
  });

  const columns: MasterTableColumn<Service>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (s) => <TypeBadge label={s.serviceType} />,
    },
    {
      key: "name",
      header: "Name",
      render: (s) => <span className="font-medium">{s.serviceDescription}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (s) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {parseMeta(s.serviceGroup).description || s.serviceCode}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Rate",
      width: "100px",
      className: "text-right font-mono text-sm",
      render: (s) => `₹${s.baseRate} / ${s.uom}`,
    },
    {
      key: "category",
      header: "Type",
      width: "120px",
      render: (s) => s.serviceType,
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (s) => <StatusBadge status={displayStatus(parseMeta(s.serviceGroup))} />,
    },
  ];

  const selected = services.find((s) => s.id === selectedId);

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("services")}
        count={filtered.length}
        addLabel="Service"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onImportCsv={() => fileRef.current?.click()}
        onExportAll={() => toast.success("Export complete")}
      />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.services}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((s) => ({
          id: s.id,
          data: s,
          inactive: displayStatus(parseMeta(s.serviceGroup)) !== "active",
          flash: flashId === s.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Service"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={(s) => {
          setEditing(s);
          setModalMode("edit");
          setModalOpen(true);
        }}
        onDelete={(s) => {
          if (window.confirm(`Delete ${s.serviceDescription}?`)) deleteMutation.mutate(s.id);
        }}
        onNameClick={(s) => {
          setEditing(s);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Vendor Rates"
        resourceName={selected?.serviceDescription}
        count={0}
        onClose={() => setSelectedId(null)}
      />

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="services"
        mode={modalMode}
        typeLabel="Service"
        resourceName={editing?.serviceDescription}
        initialValues={editing ? serviceToForm(editing) : undefined}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = formToPayload(values);
          if (editing && modalMode === "edit") {
            updateMutation.mutate({ id: editing.id, data: { ...payload, serviceCode: editing.serviceCode } });
          } else {
            createMutation.mutate(payload as Omit<Service, "id">);
          }
        }}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Delete ${editing.serviceDescription}?`)) {
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
