import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Task, InsertTask, Activity } from "@shared/schema";
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
import {
  encodeMeta,
  parseMeta,
  stripMeta,
  displayStatus,
} from "@/components/global-masters/meta-fields";
import { StatusBadge, TypeBadge, useFilteredRows } from "@/components/global-masters/table-utils";

async function getTasks(): Promise<Task[]> {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}

async function getActivities(): Promise<Activity[]> {
  const response = await fetch("/api/activities");
  if (!response.ok) throw new Error("Failed to fetch activities");
  return response.json();
}

async function createTask(data: InsertTask) {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
}

async function updateTask(id: number, data: InsertTask) {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update task");
  return response.json();
}

async function deleteTask(id: number) {
  const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete task");
}

function taskToForm(t: Task): Record<string, unknown> {
  const meta = parseMeta(t.description);
  return {
    type: "tasks",
    code: meta.code ?? `TSK-${t.id}`,
    name: t.name,
    description: stripMeta(t.description),
    taskType: meta.taskType ?? "Template",
    category: meta.category ?? "Planning",
    duration: t.duration != null ? String(t.duration) : "",
    status: displayStatus(meta),
    remarks: meta.remarks ?? "",
  };
}

function formToPayload(values: Record<string, unknown>): InsertTask {
  const description = encodeMeta(String(values.remarks ?? ""), {
    code: String(values.code ?? ""),
    taskType: String(values.taskType ?? ""),
    category: String(values.category ?? ""),
    status: String(values.status ?? "active"),
    remarks: String(values.remarks ?? ""),
  });
  const body = stripMeta(description) || encodeMeta("", {
    code: String(values.code ?? ""),
    taskType: String(values.taskType ?? ""),
    category: String(values.category ?? ""),
    status: String(values.status ?? "active"),
  });
  return {
    name: String(values.name),
    description: body,
    duration: values.duration ? Number(values.duration) : null,
    activityId: null,
  } as InsertTask;
}

export default function TaskMaster() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "all",
    category: "all",
    status: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<Task | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: getTasks,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: getActivities,
  });

  const filtered = useFilteredRows(tasks, filters, {
    search: (t, q) =>
      t.name.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false),
    type: (t, type) => parseMeta(t.description).taskType === type,
    category: (t, c) => parseMeta(t.description).category === c,
    status: (t, s) => displayStatus(parseMeta(t.description)) === s,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast.success(`${data.name} created successfully`);
      setFlashId(data.id);
      setTimeout(() => setFlashId(null), 2000);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsertTask }) => updateTask(id, data),
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast.success("Changes saved");
      setFlashId(data.id);
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast.success("Record deleted");
      setSelectedId(null);
    },
    onError: () => toast.error("Failed to delete record"),
  });

  const columns: MasterTableColumn<Task>[] = [
    {
      key: "type",
      header: "Type",
      width: "90px",
      render: (t) => <TypeBadge label={parseMeta(t.description).taskType || "Template"} />,
    },
    {
      key: "name",
      header: "Name",
      render: (t) => <span className="font-medium">{t.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (t) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">
          {stripMeta(t.description) || "—"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Est. Duration",
      width: "100px",
      className: "text-right font-mono text-sm",
      render: (t) => (t.duration != null ? `${t.duration} days` : "—"),
    },
    {
      key: "category",
      header: "Type",
      width: "120px",
      render: (t) => parseMeta(t.description).category || "—",
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (t) => <StatusBadge status={displayStatus(parseMeta(t.description))} />,
    },
  ];

  const selectedTask = tasks.find((t) => t.id === selectedId);
  const linkedActivity = activities.find((a) => a.id === selectedTask?.activityId);

  const mappedRows = linkedActivity
    ? [
        {
          id: linkedActivity.id,
          cells: [
            `ACT-${linkedActivity.id}`,
            linkedActivity.name,
            "—",
            "—",
          ],
        },
      ]
    : [];

  return (
    <>
      <GlobalMasterTableHeader
        title={masterPageTitle("tasks")}
        count={filtered.length}
        addLabel="Task"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        onExportAll={() => toast.success("Export complete")}
      />

      <GlobalMasterFilterBar
        filters={MASTER_FILTERS.tasks}
        value={filters}
        onChange={setFilters}
      />

      <GlobalMasterDataTable
        columns={columns}
        rows={filtered.map((t) => ({
          id: t.id,
          data: t,
          inactive: displayStatus(parseMeta(t.description)) !== "active",
          flash: flashId === t.id,
        }))}
        isLoading={isLoading}
        emptyTypeLabel="Task"
        onAdd={() => {
          setEditing(null);
          setModalMode("create");
          setModalOpen(true);
        }}
        selectedId={selectedId}
        onSelectRow={(id) => setSelectedId(id as number | null)}
        onEdit={(t) => {
          setEditing(t);
          setModalMode("edit");
          setModalOpen(true);
        }}
        onDelete={(t) => {
          if (window.confirm(`Delete ${t.name}?`)) deleteMutation.mutate(t.id);
        }}
        onNameClick={(t) => {
          setEditing(t);
          setModalMode("view");
          setModalOpen(true);
        }}
        onBulkDelete={(ids) => ids.forEach((id) => deleteMutation.mutate(id as number))}
      />

      <MappedEntitiesPanel
        entityLabel="Activity Links"
        resourceName={selectedTask?.name}
        count={mappedRows.length}
        onClose={() => setSelectedId(null)}
      >
        <MappedEntityTable
          columns={["Activity Code", "Activity Name", "WBS", "Duration"]}
          rows={mappedRows}
        />
      </MappedEntitiesPanel>

      <GlobalMasterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        masterKey="tasks"
        mode={modalMode}
        typeLabel="Task"
        resourceName={editing?.name}
        initialValues={editing ? taskToForm(editing) : undefined}
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
