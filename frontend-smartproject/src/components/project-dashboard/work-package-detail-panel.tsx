import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Package, Wrench, Users, Loader2, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WorkPackage } from "@shared/schema";

interface WorkPackageDetailPanelProps {
  selectedWpId: number | null;
  workPackages: WorkPackage[];
  currency: string;
}

export function WorkPackageDetailPanel({ selectedWpId, workPackages, currency }: WorkPackageDetailPanelProps) {
  const selectedWP = workPackages.find((wp) => wp.id === selectedWpId);

  const { data: materials = [], isLoading: loadingM } = useQuery<any[]>({
    queryKey: ["wp-materials", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/materials`);
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedWpId,
  });

  const { data: services = [], isLoading: loadingS } = useQuery<any[]>({
    queryKey: ["wp-services", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/services`);
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedWpId,
  });

  const { data: resources = [], isLoading: loadingR } = useQuery<any[]>({
    queryKey: ["wp-resources", selectedWpId],
    queryFn: async () => {
      const res = await fetch(`/api/work-packages/${selectedWpId}/resources`);
      return res.ok ? res.json() : [];
    },
    enabled: !!selectedWpId,
  });

  if (!selectedWpId || !selectedWP) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[rgba(148,163,184,0.3)]">
          <FileText className="h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.25} />
        </div>
        <h3 className="kanban-heading-lg text-[var(--text-primary)]">Select a work package</h3>
        <p className="mt-2 max-w-[280px] kanban-body-sm text-[var(--text-secondary)]">
          Click a work package in the list to view its materials, services and resources.
        </p>
      </div>
    );
  }

  const loading = loadingM || loadingS || loadingR;
  const budget = Number(selectedWP.budgetedCost || selectedWP.budget || 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 space-y-4">
      <div className="mb-2 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--copper-50)]">
          <Package className="h-5 w-5 text-[var(--copper-500)]" />
        </div>
        <div className="min-w-0">
          <p className="kanban-caption font-mono text-[var(--text-muted)]">{selectedWP.code}</p>
          <h3 className="kanban-heading-lg text-[var(--text-primary)]">{selectedWP.name}</h3>
          {selectedWP.description && (
            <p className="mt-1 kanban-body-sm text-[var(--text-secondary)]">{selectedWP.description}</p>
          )}
          <p className="mt-2 kanban-body-sm font-mono text-[var(--text-secondary)]">
            Budget / Estimated Cost: <strong>{formatCurrency(budget, currency)}</strong>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--copper-500)]" />
        </div>
      ) : (
        <div className="space-y-3">
          <DetailSection
            icon={Package}
            label="Materials"
            count={materials.length}
            items={materials}
            type="materials"
          />
          <DetailSection
            icon={Wrench}
            label="Services"
            count={services.length}
            items={services}
            type="services"
          />
          <DetailSection
            icon={Users}
            label="Resources"
            count={resources.length}
            items={resources}
            type="resources"
          />
        </div>
      )}
    </div>
  );
}

function DetailSection({
  icon: Icon,
  label,
  count,
  items,
  type,
}: {
  icon: typeof Package;
  label: string;
  count: number;
  items: any[];
  type: "materials" | "services" | "resources";
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white shadow-sm overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-cream)] hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-[var(--copper-500)]" />
          <span className="kanban-body-md font-bold text-[var(--text-primary)]">{label}</span>
          <span className="rounded-full bg-[var(--bg-warm-gray)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
            {count}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--copper-600)]">
          <span>{isOpen ? "Hide Details" : "Show Details"}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-[var(--border-subtle)] bg-white space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 text-center">
              No {label.toLowerCase()} assigned to this work package.
            </p>
          ) : (
            <div className="space-y-2">
              {type === "materials" &&
                items.map((m, idx) => (
                  <div key={m.id || idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-amber-700 block">{m.materialCode || m.code || `MAT-${idx + 1}`}</span>
                      <span className="font-semibold text-slate-800">{m.materialDescription || m.name || m.description || "Material Item"}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="block font-bold text-slate-900">{m.quantity || 1} {m.unit || "Units"}</span>
                      {m.unitRate && <span className="text-[10px] text-slate-500">@ ₹{m.unitRate}/{m.unit || "Unit"}</span>}
                    </div>
                  </div>
                ))}

              {type === "services" &&
                items.map((s, idx) => (
                  <div key={s.id || idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-indigo-700 block">{s.serviceCode || s.code || `SRV-${idx + 1}`}</span>
                      <span className="font-semibold text-slate-800">{s.serviceDescription || s.name || s.description || "Service Item"}</span>
                      {s.vendorName && <span className="block text-[10px] text-slate-500">Vendor: {s.vendorName}</span>}
                    </div>
                    <div className="text-right font-mono">
                      <span className="block font-bold text-slate-900">{s.quantity || s.hours || 1} {s.unit || "Hrs"}</span>
                      {s.unitRate && <span className="text-[10px] text-slate-500">@ ₹{s.unitRate}</span>}
                    </div>
                  </div>
                ))}

              {type === "resources" &&
                items.map((r, idx) => (
                  <div key={r.id || idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-emerald-700 block uppercase">{r.type || r.resourceType || "Resource"}</span>
                      <span className="font-semibold text-slate-800">{r.name || r.resourceName || `Resource #${r.id}`}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="block font-bold text-slate-900">{r.quantity || 1} {r.unitOfMeasure || "Units"}</span>
                      {r.unitRate && <span className="text-[10px] text-slate-500">₹{r.unitRate}</span>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
