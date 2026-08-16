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
import { EmployeeResourceMapper } from "@/components/project/employee-resource-mapper";

interface Employee {
  id: number;
  employeeNumber: string;
  empFirstName: string;
  empMiddleName?: string;
  empLastName: string;
  empNationalId: string;
  empNationality: string;
  empDob: string;
  empGender: string;
  empPosition: string;
  empTitle: string;
  empTrade: string;
  empGrade: string;
  empCostPerHour: string;
  entryDate?: string;
}

async function getEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/employee-masters");
  if (!res.ok) throw new Error("Failed to fetch employees");
  return res.json();
}

async function createEmployee(data: Record<string, unknown>) {
  const res = await fetch("/api/employee-masters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create employee");
  return res.json();
}

async function updateEmployee(id: number, data: Record<string, unknown>) {
  const res = await fetch(`/api/employee-masters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update employee");
  return res.json();
}

async function deleteEmployee(id: number) {
  const res = await fetch(`/api/employee-masters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete employee");
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function employeeToForm(e: Employee): Record<string, unknown> {
  const meta = parseMeta(e.empMiddleName);
  return {
    type: "employees",
    employeeNumber: e.employeeNumber,
    fullName: `${e.empFirstName} ${e.empLastName}`.trim(),
    empPosition: e.empPosition,
    department: meta.department ?? e.empTrade,
    employmentType: meta.employmentType ?? "Own",
    phone: meta.phone ?? "",
    email: meta.email ?? "",
    entryDate: e.entryDate ?? "",
    status: displayStatus(meta),
    inactiveReason: meta.inactiveReason ?? "exit",
    exitDate: e.exitDate || meta.exitDate || "",
    leaveStartDate: meta.leaveStartDate ?? "",
    leaveEndDate: meta.leaveEndDate ?? "",
    mappedResourceId: meta.mappedResourceId ?? "",
    remarks: stripMeta(e.empMiddleName),
  };
}

function formToPayload(values: Record<string, unknown>) {
  const { first, last } = splitName(String(values.fullName ?? ""));
  const middleName = encodeMeta(String(values.remarks ?? ""), {
    department: String(values.department ?? ""),
    employmentType: String(values.employmentType ?? "Own"),
    phone: String(values.phone ?? ""),
    email: String(values.email ?? ""),
    status: String(values.status ?? "active"),
    inactiveReason: String(values.inactiveReason ?? ""),
    exitDate: String(values.exitDate ?? ""),
    leaveStartDate: String(values.leaveStartDate ?? ""),
    leaveEndDate: String(values.leaveEndDate ?? ""),
    mappedResourceId: String(values.mappedResourceId ?? ""),
  });
  return {
    employeeNumber: String(values.employeeNumber),
    empFirstName: first,
    empMiddleName: middleName || undefined,
    empLastName: last,
    empNationalId: String(values.employeeNumber),
    empNationality: "India",
    empDob: "1990-01-01",
    empGender: "Male",
    empPosition: String(values.empPosition),
    empTitle: String(values.empPosition),
    empTrade: String(values.department ?? "General"),
    empGrade: "A",
    empCostPerHour: "0",
    entryDate: String(values.entryDate || "") || undefined,
    exitDate: values.status === "inactive" && values.inactiveReason === "exit" && values.exitDate ? String(values.exitDate) : undefined,
  };
}

export default function EmployeeMaster() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "all",
    category: "all",
    status: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employee-masters"],
    queryFn: getEmployees,
  });

  const filtered = useFilteredRows(employees, filters, {
    search: (e, q) =>
      `${e.empFirstName} ${e.empLastName}`.toLowerCase().includes(q) ||
      e.employeeNumber.toLowerCase().includes(q),
    type: (e, t) => parseMeta(e.empMiddleName).employmentType === t,
    category: (e, c) => (parseMeta(e.empMiddleName).department ?? e.empTrade) === c,
    status: (e, s) => displayStatus(parseMeta(e.empMiddleName)) === s,
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (data: Employee) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast.success(`${data.empFirstName} ${data.empLastName} created successfully`);
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnType<typeof formToPayload> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast.success("Changes saved");
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-masters"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
  });

  const columns: MasterTableColumn<Employee>[] = [
    {
      key: "employeeNumber",
      header: "Code",
      width: "110px",
      render: (e) => <span className="font-mono text-xs font-semibold text-zinc-700">{e.employeeNumber}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (e) => (
        <span className="font-medium">
          {e.empFirstName} {e.empLastName}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: "100px",
      render: (e) => (
        <TypeBadge label={parseMeta(e.empMiddleName).employmentType || "Own"} />
      ),
    },
    {
      key: "description",
      header: "Designation",
      render: (e) => (
        <span className="text-sm text-[var(--text-secondary)]">{e.empPosition}</span>
      ),
    },
    {
      key: "category",
      header: "Department",
      width: "120px",
      render: (e) => parseMeta(e.empMiddleName).department ?? e.empTrade,
    },
    {
      key: "resourceMapping",
      header: "Mapped Resource Type",
      width: "160px",
      render: (e) => (
        <EmployeeResourceMapper
          employeeId={e.id}
          employeeName={`${e.empFirstName} ${e.empLastName}`}
        />
      ),
    },
    {
      key: "entryDate",
      header: "Joining Date",
      width: "110px",
      render: (e) => <span className="text-xs font-mono text-zinc-600">{e.entryDate || "—"}</span>,
    },
    {
      key: "status",
      header: "Status & Reason",
      width: "180px",
      render: (e) => {
        const meta = parseMeta(e.empMiddleName);
        const status = displayStatus(meta);
        if (status === "active") {
          return <StatusBadge status="active" />;
        }
        const reason = meta.inactiveReason;
        if (reason === "exit") {
          const exitStr = e.exitDate || meta.exitDate ? ` (Exit: ${e.exitDate || meta.exitDate})` : " (Exit)";
          return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Inactive{exitStr}</span>;
        }
        if (reason === "temporary-leave") {
          const leaveStr = meta.leaveStartDate ? ` (${meta.leaveStartDate} to ${meta.leaveEndDate || '?'})` : " (Leave)";
          return <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Inactive{leaveStr}</span>;
        }
        return <StatusBadge status="inactive" />;
      },
    },
  ];

  const selected = employees.find((e) => e.id === selectedId);

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("employees")}
        count={filtered.length}
        addLabel="Employee"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onExportAll={() => toast.success("Export complete")}
      />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.employees}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((e) => ({
          id: e.id,
          data: e,
          inactive: displayStatus(parseMeta(e.empMiddleName)) !== "active",
          flash: flashId === e.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Employee"
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
          if (window.confirm(`Delete ${e.empFirstName} ${e.empLastName}?`)) {
            deleteMutation.mutate(e.id);
          }
        }}
        onNameClick={(e) => {
          setEditing(e);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Manpower Roles"
        resourceName={selected ? `${selected.empFirstName} ${selected.empLastName}` : undefined}
        count={0}
        onClose={() => setSelectedId(null)}
      />

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="employees"
        mode={modalMode}
        typeLabel="Employee"
        resourceName={editing ? `${editing.empFirstName} ${editing.empLastName}` : undefined}
        initialValues={editing ? employeeToForm(editing) : undefined}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = formToPayload(values);
          if (editing && modalMode === "edit") {
            updateMutation.mutate({ id: editing.id, data: payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
        onRequestEdit={() => setModalMode("edit")}
        onDelete={
          editing
            ? () => {
                if (window.confirm(`Delete ${editing.empFirstName} ${editing.empLastName}?`)) {
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
