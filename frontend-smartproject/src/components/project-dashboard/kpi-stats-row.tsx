import { useEffect, useRef, useState } from "react";
import { Wallet, CalendarClock, PackageCheck, Users } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface KpiStatsRowProps {
  currency: string;
  budgetUsed: number;
  budgetTotal: number;
  dayCurrent: number;
  dayTotal: number;
  wpCreated: number;
  wpTotal: number;
  teamCount: number;
}

function useCountUp(target: number, duration = 600, enabled = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let frame: number;
    const step = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled]);
  return value;
}

function ProgressBar({ percent, delay = 0 }: { percent: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 200 + delay);
    return () => clearTimeout(t);
  }, [percent, delay]);
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-warm-gray)]">
      <div
        className="pd-progress-bar h-full rounded-full bg-[var(--copper-500)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  percent?: number;
  stagger?: number;
  className?: string;
}

function StatCard({ icon, value, label, percent, stagger = 0, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "pd-kpi-card rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]",
        className
      )}
      style={{ animationDelay: `${stagger}ms` }}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="kanban-heading-lg font-mono text-[var(--text-primary)]">{value}</div>
          <p className="mt-0.5 kanban-body-sm text-[var(--text-secondary)]">{label}</p>
          {percent != null && <ProgressBar percent={percent} delay={stagger} />}
        </div>
      </div>
    </div>
  );
}

export function KpiStatsRow({
  currency,
  budgetUsed,
  budgetTotal,
  dayCurrent,
  dayTotal,
  wpCreated,
  wpTotal,
  teamCount,
}: KpiStatsRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const budgetPct = budgetTotal ? (budgetUsed / budgetTotal) * 100 : 0;
  const dayPct = dayTotal ? (dayCurrent / dayTotal) * 100 : 0;
  const wpPct = wpTotal ? (wpCreated / wpTotal) * 100 : 0;

  const budgetAnim = useCountUp(budgetUsed, 600, inView);
  const dayAnim = useCountUp(dayCurrent, 600, inView);
  const wpAnim = useCountUp(wpCreated, 600, inView);
  const teamAnim = useCountUp(teamCount, 600, inView);

  return (
    <div ref={ref} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        stagger={0}
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--copper-50)]">
            <Wallet className="h-5 w-5 text-[var(--copper-500)]" />
          </div>
        }
        value={formatCurrency(budgetAnim, currency)}
        label={`of ${formatCurrency(budgetTotal, currency)}`}
        percent={budgetPct}
      />
      <StatCard
        stagger={150}
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-info-bg)]">
            <CalendarClock className="h-5 w-5 text-[var(--status-info)]" />
          </div>
        }
        value={`Day ${dayAnim}`}
        label={`of ${dayTotal} days`}
        percent={dayPct}
      />
      <StatCard
        stagger={300}
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
            <PackageCheck className="h-5 w-5 text-[var(--status-success)]" />
          </div>
        }
        value={`${wpAnim} of ${wpTotal}`}
        label="WPs created"
        percent={wpPct}
      />
      <StatCard
        stagger={450}
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-warm-gray)]">
            <Users className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
        }
        value={teamAnim}
        label="members"
      />
    </div>
  );
}
