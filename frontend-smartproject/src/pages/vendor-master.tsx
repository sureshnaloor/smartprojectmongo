import { useState } from "react";
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

interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  vendorAddress: string;
  vendorDistrict?: string | null;
  vendorCity: string;
  vendorCountry: string;
  vendorZipCode: string;
  vendorEmail: string;
  vendorTelephone: string;
  vendorTaxNumber?: string | null;
}

async function getVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/vendor-masters");
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

async function createVendor(data: Omit<Vendor, "id">) {
  const res = await fetch("/api/vendor-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create vendor");
  return res.json();
}

async function updateVendor(id: number, data: Partial<Vendor>) {
  const res = await fetch(`/api/vendor-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update vendor");
  return res.json();
}

async function deleteVendor(id: number) {
  const res = await fetch(`/api/vendor-masters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete vendor");
}

function vendorToForm(v: Vendor): Record<string, unknown> {
  const meta = parseMeta(v.vendorDistrict);
  return {
    type: "vendors",
    vendorCode: v.vendorCode,
    vendorName: v.vendorName,
    vendorType: meta.vendorType ?? "Supplier",
    contactPerson: meta.contactPerson ?? "",
    vendorEmail: v.vendorEmail,
    vendorTelephone: v.vendorTelephone,
    vendorAddress: v.vendorAddress,
    vendorCity: v.vendorCity,
    vendorCountry: v.vendorCountry,
    vendorTaxNumber: v.vendorTaxNumber ?? "",
    status: displayStatus(meta),
    remarks: stripMeta(v.vendorDistrict),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const district = encodeMeta(String(values.remarks ?? ""), {
    vendorType: String(values.vendorType ?? "Supplier"),
    contactPerson: String(values.contactPerson ?? ""),
    status: String(values.status ?? "active"),
  });
  const cityState = String(values.vendorCity ?? "");
  const [city, countryFallback] = cityState.includes(",")
    ? cityState.split(",").map((s) => s.trim())
    : [cityState, String(values.vendorCountry ?? "India")];
  return {
    vendorCode: String(values.vendorCode),
    vendorName: String(values.vendorName),
    vendorAddress: String(values.vendorAddress || "—"),
    vendorDistrict: district || undefined,
    vendorCity: city || "—",
    vendorCountry: String(values.vendorCountry || countryFallback || "India"),
    vendorZipCode: "000000",
    vendorEmail: String(values.vendorEmail),
    vendorTelephone: String(values.vendorTelephone),
    vendorTaxNumber: String(values.vendorTaxNumber || "") || undefined,
  };
}

export default function VendorMaster() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "all",
    category: "all",
    status: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["/api/vendor-masters"],
    queryFn: getVendors,
  });

  const filtered = useFilteredRows(vendors, filters, {
    search: (v, q) =>
      v.vendorName.toLowerCase().includes(q) || v.vendorCode.toLowerCase().includes(q),
    type: (v, t) => parseMeta(v.vendorDistrict).vendorType === t,
    category: (v, c) => v.vendorCountry.toLowerCase().includes(c.toLowerCase()),
    status: (v, s) => displayStatus(parseMeta(v.vendorDistrict)) === s,
  });

  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (data: Vendor) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast.success(`${data.vendorName} created successfully`);
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnType<typeof formToPayload> }) =>
      updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-masters"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
  });

  const columns: MasterTableColumn<Vendor>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (v) => (
        <TypeBadge label={parseMeta(v.vendorDistrict).vendorType || "Supplier"} />
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (v) => <span className="font-medium">{v.vendorName}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (v) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {v.vendorAddress}
        </span>
      ),
    },
    {
      key: "category",
      header: "Vendor Type",
      width: "120px",
      render: (v) => parseMeta(v.vendorDistrict).vendorType || "Supplier",
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (v) => <StatusBadge status={displayStatus(parseMeta(v.vendorDistrict))} />,
    },
  ];

  const selected = vendors.find((v) => v.id === selectedId);

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("vendors")}
        count={filtered.length}
        addLabel="Vendor"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onExportAll={() => toast.success("Export complete")}
      />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.vendors}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns.filter((c) => c.key !== "rate")}
        rows={filtered.map((v) => ({
          id: v.id,
          data: v,
          inactive: displayStatus(parseMeta(v.vendorDistrict)) !== "active",
          flash: flashId === v.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Vendor"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={(v) => {
          setEditing(v);
          setModalMode("edit");
          setModalOpen(true);
        }}
        onDelete={(v) => {
          if (window.confirm(`Delete ${v.vendorName}?`)) deleteMutation.mutate(v.id);
        }}
        onNameClick={(v) => {
          setEditing(v);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Supplied Materials"
        resourceName={selected?.vendorName}
        count={0}
        onClose={() => setSelectedId(null)}
      />

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="vendors"
        mode={modalMode}
        typeLabel="Vendor"
        resourceName={editing?.vendorName}
        initialValues={editing ? vendorToForm(editing) : undefined}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = formToPayload(values);
          if (editing && modalMode === "edit") {
            updateMutation.mutate({ id: editing.id, data: payload });
          } else {
            createMutation.mutate(payload as Omit<Vendor, "id">);
          }
        }}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Delete ${editing.vendorName}?`)) {
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
