import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  pulse?: boolean;
  delay?: number;
}

function StatCard({ icon, iconBg, value, label, pulse, delay = 0 }: StatCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    const duration = 600;
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, delay]);

  return (
    <div
      className="flex items-center gap-4 rounded-[var(--radius-md)] border bg-[var(--bg-white)] p-5"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          pulse && value > 0 && "hse-stat-pulse"
        )}
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div>
        <p className="kanban-heading-lg font-bold font-mono text-[var(--text-primary)]">{display}</p>
        <p className="kanban-body-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

interface RiskStatsRowProps {
  totalRisks: number;
  opportunities: number;
  openItems: number;
  closedItems: number;
}

export function RiskStatsRow({ totalRisks, opportunities, openItems, closedItems }: RiskStatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" style={{ color: "var(--status-warning)" }} />}
        iconBg="var(--status-warning-bg)"
        value={totalRisks}
        label="Total Risks"
        pulse
        delay={0}
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
        iconBg="var(--status-success-bg)"
        value={opportunities}
        label="Opportunities"
        delay={50}
      />
      <StatCard
        icon={<Clock className="h-5 w-5" style={{ color: "var(--status-info)" }} />}
        iconBg="var(--status-info-bg)"
        value={openItems}
        label="Open Items"
        pulse
        delay={100}
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5 text-[var(--text-secondary)]" />}
        iconBg="var(--bg-warm-gray)"
        value={closedItems}
        label="Closed Items"
        delay={150}
      />
    </div>
  );
}
