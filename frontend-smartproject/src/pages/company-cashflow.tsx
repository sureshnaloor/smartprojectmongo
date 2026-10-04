import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { monthLabel, type CompanyFlowPoint, type CompanyFlowTotals } from "@shared/cashflow";

interface IncludedProject {
  id: number;
  name: string;
  currency: string;
  inflow: number;
  outflow: number;
  net: number;
  startMonth: string;
  endMonth: string;
}

interface ExcludedProject {
  id: number;
  name: string;
  reason: string;
}

interface CompanyResponse {
  currency: string;
  companyName: string | null;
  mixedCurrencies?: boolean;
  error: string | null;
  included: IncludedProject[];
  excluded: ExcludedProject[];
  series: CompanyFlowPoint[];
  totals: CompanyFlowTotals | null;
  overhead: {
    saved: boolean;
    startMonth: string;
    endMonth: string;
    openingBalance: number;
    total: number;
    categories: { key: string; name: string; total: number }[];
  } | null;
}

function errorText(err: unknown): string {
  if (!(err instanceof Error)) return "Could not load company cash flow";
  return err.message;
}

export default function CompanyCashflow() {
  const { data, isLoading, isError, error } = useQuery<CompanyResponse>({
    queryKey: ["/api/cashflow/company"],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="cp-skeleton h-10 w-72" />
        <div className="cp-skeleton h-40 w-full" />
        <div className="cp-skeleton h-72 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="cp-card max-w-xl">
        <p className="cp-heading-md">Company cash flow could not be loaded</p>
        <p className="cp-body-md mt-2 text-[var(--text-secondary)]">{errorText(error)}</p>
      </div>
    );
  }

  const currency = data.currency || "USD";
  const totals = data.totals;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--copper-500)]" strokeWidth={1.5} />
          <h2 className="cp-heading-md text-xl">Company cash flow</h2>
        </div>
        <p className="cp-body-md mt-1 max-w-2xl text-[var(--text-secondary)]">
          {data.companyName ? `${data.companyName}: ` : ""}
          every project that has a planned cash flow estimate, with company overhead laid on top. A project joins this total as soon as its monthly amounts are saved.
        </p>
      </div>

      {data.mixedCurrencies && (
        <div className="cp-card border-[var(--status-warning)] bg-[var(--status-warning-bg)]">
          <p className="cp-body-md">Included projects use more than one currency. Their amounts are added together as entered.</p>
        </div>
      )}

      {data.error && (
        <div className="cp-card border-[var(--status-warning)] bg-[var(--status-warning-bg)]">
          <p className="cp-body-md">{data.error}</p>
        </div>
      )}

      {totals && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Project inflow" value={formatCurrency(totals.projectInflow, currency)} hint={`${data.included.length} project${data.included.length === 1 ? "" : "s"}`} />
          <Summary label="Project outflow" value={formatCurrency(totals.projectOutflow, currency)} hint="From the included estimates" />
          <Summary label="Company overhead" value={formatCurrency(totals.overhead, currency)} hint={data.overhead?.saved ? "Salaries, maintenance, and other overhead" : "No overhead saved yet"} />
          <Summary label="Position at period end" value={formatCurrency(totals.positionAtEnd, currency)} hint={totals.openingBalance ? `Opens at ${formatCurrency(totals.openingBalance, currency)}` : "Opening cash is zero"} tone={totals.positionAtEnd} />
        </section>
      )}

      <section className="cp-card overflow-hidden p-0">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <p className="cp-heading-md">Projects included</p>
          <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">Only projects with a saved estimate and at least one non-zero month, in {currency}.</p>
        </div>
        {data.included.length === 0 ? (
          <p className="px-4 py-6 cp-body-md text-[var(--text-secondary)]">No project cash flow has been filled in yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="cp-table-header">
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Window</th>
                  <th className="px-4 py-3 text-right">Inflow</th>
                  <th className="px-4 py-3 text-right">Outflow</th>
                  <th className="px-4 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.included.map((project) => (
                  <tr key={project.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}/cashflow`} className="font-medium text-[var(--copper-600)] hover:underline">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {monthLabel(project.startMonth)} – {monthLabel(project.endMonth)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(project.inflow, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(project.outflow, currency)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(project.net, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.series.length > 0 && (
        <section className="cp-card">
          <p className="cp-heading-md">Company position</p>
          <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">
            Project inflow and outflow are added across the included projects. Company overhead is subtracted on the same months. Each point is the cash position at month-end.
          </p>
          <div className="mt-4 h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.series} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  interval={data.series.length > 18 ? Math.ceil(data.series.length / 12) - 1 : 0}
                  angle={data.series.length > 14 ? -40 : 0}
                  textAnchor={data.series.length > 14 ? "end" : "middle"}
                  height={data.series.length > 14 ? 64 : 32}
                />
                <YAxis
                  width={84}
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("en-IN", { notation: "compact", style: "currency", currency, maximumFractionDigits: 1 }).format(value)
                  }
                />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0), currency), name]} contentStyle={{ borderRadius: 8, borderColor: "var(--border-subtle)", fontSize: 12 }} />
                <Legend />
                <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="position" name="Cash position" stroke="#0F1729" fill="#0F1729" fillOpacity={0.08} strokeWidth={2.5} />
                <Line type="monotone" dataKey="projectInflow" name="Project inflow" stroke="#15803d" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="projectOutflow" name="Project outflow" stroke="#b91c1c" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="overhead" name="Company overhead" stroke="#C17817" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {data.excluded.length > 0 && (
        <section className="cp-card">
          <p className="cp-heading-md">Not included</p>
          <ul className="mt-3 space-y-2">
            {data.excluded.map((project) => (
              <li key={project.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 last:border-0">
                <Link href={`/projects/${project.id}/cashflow`} className="cp-body-md font-medium text-[var(--text-primary)] hover:underline">
                  {project.name}
                </Link>
                <span className="cp-body-sm text-[var(--text-secondary)]">{project.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Summary({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: number }) {
  const toneClass = tone == null ? "text-[var(--text-primary)]" : tone > 0 ? "text-[var(--status-success)]" : tone < 0 ? "text-[var(--status-danger)]" : "text-[var(--text-secondary)]";
  return (
    <div className="cp-card cp-card--compact">
      <p className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
      <p className={`mt-2 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
      <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">{hint}</p>
    </div>
  );
}
