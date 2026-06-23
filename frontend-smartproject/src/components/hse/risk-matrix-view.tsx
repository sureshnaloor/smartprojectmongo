import { cn } from "@/lib/utils";
import { riskScore } from "./constants";
import type { RiskEntry } from "./types";

interface RiskMatrixViewProps {
  risks: RiskEntry[];
  onCellClick?: (minScore: number, maxScore: number) => void;
  onRiskClick?: (risk: RiskEntry) => void;
}

const CELL_RANGES: { min: number; max: number; bg: string }[] = [
  { min: 1, max: 4, bg: "var(--status-success-bg)" },
  { min: 5, max: 9, bg: "var(--status-warning-bg)" },
  { min: 10, max: 16, bg: "rgba(220, 38, 38, 0.15)" },
  { min: 17, max: 25, bg: "var(--status-danger)" },
];

function cellBg(score: number): string {
  const cell = CELL_RANGES.find((c) => score >= c.min && score <= c.max);
  return cell?.bg ?? "var(--bg-warm-gray)";
}

export function RiskMatrixView({ risks, onCellClick, onRiskClick }: RiskMatrixViewProps) {
  const impactLabels = ["Negligible", "Low", "Medium", "High", "Critical"];
  const probLabels = ["Very High", "High", "Medium", "Low", "Very Low"];

  const risksByCell = (probLevel: number, impactLevel: number) =>
    risks.filter((r) => {
      const p = probLevel;
      const i = impactLevel;
      const fromApi = (val: string) => (val === "Low" ? 2 : val === "Moderate" ? 3 : 5);
      return fromApi(r.probability) === p && fromApi(r.impact) === i;
    });

  return (
    <div className="mb-6 rounded-[var(--radius-md)] border bg-[var(--bg-white)] p-6" style={{ borderColor: "var(--border-subtle)" }}>
      <h3 className="kanban-body-md font-semibold text-[var(--text-primary)] mb-4">Risk Matrix View</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-[480px]">
          <div className="flex">
            <div className="w-24 shrink-0" />
            <div className="flex-1 grid grid-cols-5 gap-1 mb-1">
              {impactLabels.map((l) => (
                <div key={l} className="kanban-caption text-center text-[var(--text-muted)]">{l}</div>
              ))}
            </div>
          </div>
          {probLabels.map((probLabel, rowIdx) => {
            const probLevel = 5 - rowIdx;
            return (
              <div key={probLabel} className="flex items-stretch gap-1 mb-1">
                <div className="w-24 shrink-0 flex items-center kanban-caption text-[var(--text-muted)] pr-2">
                  {probLabel}
                </div>
                <div className="flex-1 grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((impactLevel) => {
                    const score = probLevel * impactLevel;
                    const cellRisks = risksByCell(probLevel, impactLevel);
                    const range = CELL_RANGES.find((c) => score >= c.min && score <= c.max);
                    return (
                      <button
                        key={impactLevel}
                        type="button"
                        title={`Score ${score}: ${range ? (score <= 4 ? "Low" : score <= 9 ? "Medium" : score <= 16 ? "High" : "Critical") : ""} Risk`}
                        onClick={() => range && onCellClick?.(range.min, range.max)}
                        className={cn(
                          "relative min-h-[56px] rounded p-1 transition-opacity hover:opacity-90",
                          score >= 17 && "text-white"
                        )}
                        style={{ backgroundColor: cellBg(score) }}
                      >
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {cellRisks.map((r, i) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRiskClick?.(r);
                              }}
                              className="hse-matrix-dot flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-white)] kanban-caption font-semibold text-[var(--text-primary)] shadow-sm"
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              {r.id}
                            </button>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-4 kanban-caption text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ backgroundColor: "var(--status-success-bg)" }} /> Low (1–4)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ backgroundColor: "var(--status-warning-bg)" }} /> Medium (5–9)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ backgroundColor: "rgba(220,38,38,0.15)" }} /> High (10–16)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ backgroundColor: "var(--status-danger)" }} /> Critical (17–25)</span>
      </div>
    </div>
  );
}

export function riskInScoreRange(risk: RiskEntry, min: number, max: number): boolean {
  const s = riskScore(risk.probability, risk.impact);
  return s >= min && s <= max;
}
