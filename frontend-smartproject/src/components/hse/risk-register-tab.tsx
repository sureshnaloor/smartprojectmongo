import { useState, useMemo, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Download, Grid3X3, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskFilterBar } from "./risk-filter-bar";
import { RiskStatsRow } from "./risk-stats-row";
import { RiskTable } from "./risk-table";
import { RiskMatrixView, riskInScoreRange } from "./risk-matrix-view";
import { RiskFormDrawer } from "./risk-form-drawer";
import { RiskDetailDrawer } from "./risk-detail-drawer";
import { emptyRiskForm, type RiskEntry, type RiskFormData } from "./types";

function exportCsv(risks: RiskEntry[]) {
  const headers = ["Date", "Title", "Type", "Probability", "Impact", "User", "Status", "Mitigation"];
  const rows = risks.map((r) => [
    r.dateLogged,
    r.risk,
    r.riskType,
    r.probability,
    r.impact,
    r.userLogged,
    r.status,
    r.actionTaken,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "risk-register.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function RiskRegisterTab() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: risks = [], isLoading } = useQuery<RiskEntry[]>({
    queryKey: [`/api/projects/${projectId}/risk-register`],
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterProbability, setFilterProbability] = useState("all");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [scoreRange, setScoreRange] = useState<{ min: number; max: number } | null>(null);
  const [matrixView, setMatrixView] = useState(false);
  const [sortKey, setSortKey] = useState("dateLogged");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskEntry | null>(null);
  const [form, setForm] = useState<RiskFormData>(emptyRiskForm());

  const filtered = useMemo(() => {
    let list = risks.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.risk.toLowerCase().includes(q) ||
        r.userLogged.toLowerCase().includes(q) ||
        r.actionTaken.toLowerCase().includes(q);
      const matchType = filterType === "all" || r.riskType === filterType;
      const matchProb = filterProbability === "all" || r.probability === filterProbability;
      const matchImpact = filterImpact === "all" || r.impact === filterImpact;
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchScore = !scoreRange || riskInScoreRange(r, scoreRange.min, scoreRange.max);
      return matchSearch && matchType && matchProb && matchImpact && matchStatus && matchScore;
    });

    list = [...list].sort((a, b) => {
      const av = (a as Record<string, string>)[sortKey] ?? "";
      const bv = (b as Record<string, string>)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [risks, search, filterType, filterProbability, filterImpact, filterStatus, scoreRange, sortKey, sortDir]);

  const resetForm = useCallback(() => {
    setForm(emptyRiskForm());
    setSelectedRisk(null);
  }, []);

  const validateForm = (): boolean => {
    if (!form.risk.trim()) {
      toast({ title: "Validation", description: "Title is required", variant: "destructive" });
      return false;
    }
    if (!form.riskType) {
      toast({ title: "Validation", description: "Type is required", variant: "destructive" });
      return false;
    }
    if (!form.probability || !form.impact) {
      toast({ title: "Validation", description: "Probability and impact are required", variant: "destructive" });
      return false;
    }
    if (!form.userLogged.trim()) {
      toast({ title: "Validation", description: "Owner is required", variant: "destructive" });
      return false;
    }
    if (!form.actionTaken.trim()) {
      toast({ title: "Validation", description: "Mitigation strategy is required", variant: "destructive" });
      return false;
    }
    return true;
  };

  const payloadFromForm = () => ({
    dateLogged: form.dateLogged,
    risk: form.risk.trim(),
    riskType: form.riskType as "Risk" | "Opportunity",
    probability: form.probability as RiskEntry["probability"],
    impact: form.impact as RiskEntry["impact"],
    userLogged: form.userLogged.trim(),
    actionTaken: form.actionTaken.trim(),
    remarks: form.remarks.trim() || null,
    status: form.status,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/risk-register`, payloadFromForm());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
      toast({ title: "Added", description: "Risk entry created" });
      setAddOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}/risk-register/${id}`, payloadFromForm());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
      toast({ title: "Updated", description: "Risk entry saved" });
      setEditOpen(false);
      setDetailOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/risk-register/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
      toast({ title: "Deleted", description: "Risk entry removed" });
      setDetailOpen(false);
      setSelectedRisk(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (risk: RiskEntry) => {
    setSelectedRisk(risk);
    setForm({
      dateLogged: risk.dateLogged,
      risk: risk.risk,
      riskType: risk.riskType,
      probability: risk.probability,
      impact: risk.impact,
      userLogged: risk.userLogged,
      actionTaken: risk.actionTaken,
      remarks: risk.remarks || "",
      status: risk.status,
    });
    setEditOpen(true);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setFilterProbability("all");
    setFilterImpact("all");
    setFilterStatus("all");
    setScoreRange(null);
  };

  return (
    <div className="hse-tab-fade px-6 pb-8 lg:px-8">
      <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="hse-display-md text-[var(--text-primary)]">Risk Register</h2>
          <p className="kanban-body-md text-[var(--text-secondary)] mt-1">
            Manage project risks and opportunities
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(filtered)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setMatrixView((v) => !v)}
          >
            {matrixView ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            {matrixView ? "Table View" : "Matrix View"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
            style={{ boxShadow: "var(--shadow-copper)" }}
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Risk/Opportunity
          </Button>
        </div>
      </div>

      <RiskFilterBar
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterProbability={filterProbability}
        onFilterProbabilityChange={setFilterProbability}
        filterImpact={filterImpact}
        onFilterImpactChange={setFilterImpact}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        onClear={clearFilters}
      />

      <RiskStatsRow
        totalRisks={risks.filter((r) => r.riskType === "Risk").length}
        opportunities={risks.filter((r) => r.riskType === "Opportunity").length}
        openItems={risks.filter((r) => r.status === "Open" || r.status === "In Progress").length}
        closedItems={risks.filter((r) => r.status === "Closed").length}
      />

      {matrixView && (
        <RiskMatrixView
          risks={filtered}
          onCellClick={(min, max) => setScoreRange({ min, max })}
          onRiskClick={(r) => {
            setSelectedRisk(r);
            setDetailOpen(true);
          }}
        />
      )}

      <RiskTable
        risks={filtered}
        isLoading={isLoading}
        selectedId={selectedRisk?.id ?? null}
        onSelect={(r) => {
          setSelectedRisk(r);
          setDetailOpen(true);
        }}
        onEdit={openEdit}
        onDelete={(id) => {
          if (window.confirm("Delete this risk entry?")) deleteMutation.mutate(id);
        }}
        onAddFirst={() => {
          resetForm();
          setAddOpen(true);
        }}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      <RiskFormDrawer
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) resetForm();
        }}
        title="Add New Risk/Opportunity"
        form={form}
        onChange={setForm}
        onSubmit={() => validateForm() && createMutation.mutate()}
        isPending={createMutation.isPending}
        submitLabel="Add Entry"
      />

      <RiskFormDrawer
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) resetForm();
        }}
        title="Edit Risk/Opportunity"
        form={form}
        onChange={setForm}
        onSubmit={() => selectedRisk && validateForm() && updateMutation.mutate(selectedRisk.id)}
        isPending={updateMutation.isPending}
        submitLabel="Save Changes"
      />

      <RiskDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        risk={selectedRisk}
        onEdit={() => selectedRisk && openEdit(selectedRisk)}
        onDelete={() => selectedRisk && deleteMutation.mutate(selectedRisk.id)}
        onStatusChange={(status) => {
          if (!selectedRisk) return;
          apiRequest("PUT", `/api/projects/${projectId}/risk-register/${selectedRisk.id}`, { status })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
              setSelectedRisk({ ...selectedRisk, status });
            })
            .catch((e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }));
        }}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
