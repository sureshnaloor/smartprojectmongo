import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderTree,
  Lock,
  TrendingUp,
  Users,
  CheckCircle2,
  Compass,
  Wrench,
  HardHat,
  Award,
} from "lucide-react";

const lifecyclePhases = [
  {
    id: "baseline",
    code: "PHASE 01",
    title: "WBS Architecture & Baseline Lock",
    duration: "Weeks 1–2",
    icon: Compass,
    progress: 100,
    status: "Baseline Locked",
    summary:
      "Import Primavera P6 XML or Excel schedules, structure up to 9 levels of WBS nodes, define Work Packages, validate child-to-parent budgets, and lock the baseline.",
    deliverables: [
      "9-Level WBS Hierarchy & Work Package Dictionary",
      "Resource, Material & Service Master Rate Tables",
      "Cryptographically Locked Baseline (Amendment-Protected)",
      "Critical Path Method (CPM) Forward/Backward Pass Network",
    ],
    kpis: { cpi: "1.00", spi: "1.00", float: "0d Critical", wbsLocked: "100%" },
  },
  {
    id: "procurement",
    code: "PHASE 02",
    title: "Engineering, Onboarding & PR-to-PO Procurement",
    duration: "Weeks 3–8",
    icon: Wrench,
    progress: 100,
    status: "Completed",
    summary:
      "Map Material take-offs and Service BOQs to Work Packages, issue Purchase Requisitions (PR) & Purchase Orders (PO), and onboard manpower and equipment through the 9-stage pipeline.",
    deliverables: [
      "Work Package Material, Service & Resource Allocations",
      "Approved Purchase Requisitions (PR) & Vendor POs",
      "9-Stage Candidate & Equipment Mobilization Clearances",
      "Cloud Document Control & Revision-Tracked IFC Drawings",
    ],
    kpis: { cpi: "1.03", spi: "1.01", float: "+4d Buffer", wbsLocked: "100%" },
  },
  {
    id: "execution",
    code: "PHASE 03",
    title: "Field Execution, Kanban & Daily Timesheets",
    duration: "Weeks 9–28",
    icon: HardHat,
    progress: 72,
    status: "In Progress",
    summary:
      "Execute field activities across Gantt, PERT Network, Calendar, and Kanban views. Capture daily manpower/equipment timesheets, HSE inspections, and Risk/Issue Wiki logs.",
    deliverables: [
      "Daily Labor & Equipment Timesheets linked to Work Packages",
      "Live Earned Value Metrics (PV, EV, AC, CPI, SPI, EAC)",
      "HSE 5×5 Risk Matrix, Safety Action Plans & NCR Tracking",
      "Real-time Collaboration Hub Threads & Stakeholder Correspondence",
    ],
    kpis: { cpi: "1.05", spi: "0.98", float: "On Critical Path", wbsLocked: "Amendment #2" },
  },
  {
    id: "closeout",
    code: "PHASE 04",
    title: "Mechanical Completion, Audit & Lessons Learnt",
    duration: "Weeks 29–32",
    icon: Award,
    progress: 25,
    status: "Upcoming",
    summary:
      "Verify 100% milestone completion, reconcile final vendor POs and actual resource costs against amended budgets, and archive Lessons Learnt in the Wiki Knowledge Base.",
    deliverables: [
      "Full Baseline-to-Closeout Amendment & Cost Audit Trail",
      "Cross-Project Resource Demobilization & Reallocation",
      "Obsidian-Style Lessons Learnt Wiki & As-Built Dossier",
      "Executive Portfolio Variance & Profitability Closeout Report",
    ],
    kpis: { cpi: "1.04 Est.", spi: "1.00 Est.", float: "On Target", wbsLocked: "Audit Ready" },
  },
];

const TimelineVisualizer = () => {
  const [selectedPhaseId, setSelectedPhaseId] = useState("execution");
  const activePhase =
    lifecyclePhases.find((p) => p.id === selectedPhaseId) || lifecyclePhases[2];

  return (
    <section
      id="showcase"
      className="py-20 lg:py-24 bg-mist border-y border-line"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <span className="eyebrow">See It In Action</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
            Structure. Measure. Utilize.
          </h2>
          <p className="text-body">
            A closer look at how SmartProject connects deep WBS hierarchies,
            Earned Value Management, and cross-project resource utilization.
          </p>
        </motion.div>

        {/* Three EPCORA Product Showcase Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {/* Card 1: 9-Level WBS Tree */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-line rounded-md shadow-card overflow-hidden flex flex-col"
          >
            <div className="bg-ink text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <FolderTree className="w-4 h-4 text-gold" />
                <span>9-Level WBS &amp; Work Packages</span>
              </div>
              <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded font-mono flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> FINALIZED
              </span>
            </div>
            <div className="p-5 text-xs font-mono space-y-2 flex-1 bg-[#FAF9FE]">
              <div className="p-2 rounded bg-white border border-line flex justify-between items-center">
                <span className="font-bold text-ink">
                  1.0 Refinery Expansion Project
                </span>
                <span className="text-epcPrimary font-bold">$12.50M</span>
              </div>
              <div className="pl-4 space-y-2 border-l-2 border-epcPrimary/30 ml-2">
                <div className="p-2 rounded bg-white border border-line flex justify-between items-center">
                  <span className="text-ink font-semibold">
                    1.1 Civil &amp; Structural Works
                  </span>
                  <span className="text-epcPrimary font-semibold">$4.20M</span>
                </div>
                <div className="pl-4 space-y-2 border-l-2 border-epcSecondary/30 ml-2">
                  <div className="p-2 rounded bg-white border border-line flex justify-between items-center">
                    <span className="text-body">
                      1.1.1 Tank Farm Foundations
                    </span>
                    <span className="text-ink">$1.85M</span>
                  </div>
                  <div className="pl-4 space-y-1.5 border-l-2 border-gold ml-2">
                    <div className="p-2 rounded bg-gold/15 border border-gold/40 flex justify-between items-center">
                      <span className="text-ink font-semibold">
                        WP-104: Pile Cap Concrete Pour
                      </span>
                      <span className="text-ink font-bold">$640K</span>
                    </div>
                    <div className="text-[11px] text-body pl-2 flex items-center justify-between">
                      <span>↳ Act 104.1: Rebar Cage Fixing</span>
                      <span className="text-emerald-600 font-bold">100%</span>
                    </div>
                    <div className="text-[11px] text-body pl-2 flex items-center justify-between">
                      <span>↳ Act 104.2: M40 Concrete Pour</span>
                      <span className="text-epcSecondary font-bold">65%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-white border-t border-line text-xs text-body">
              Budgets roll up automatically from activities → work packages → 9
              WBS levels.
            </div>
          </motion.div>

          {/* Card 2: Earned Value Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-line rounded-md shadow-card overflow-hidden flex flex-col"
          >
            <div className="bg-ink text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <TrendingUp className="w-4 h-4 text-gold" />
                <span>Live Earned Value (EVM)</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                CPI 1.05
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between bg-[#FAF9FE]">
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[
                  {
                    k: "BAC",
                    v: "$12.50M",
                    sub: "Baseline Budget",
                    c: "text-ink",
                  },
                  {
                    k: "EV",
                    v: "$7.45M",
                    sub: "Earned Value",
                    c: "text-epcPrimary",
                  },
                  {
                    k: "AC",
                    v: "$7.10M",
                    sub: "Actual Cost",
                    c: "text-emerald-600",
                  },
                ].map((m) => (
                  <div
                    key={m.k}
                    className="bg-white border border-line rounded p-2.5"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-body font-semibold">
                      {m.k}
                    </div>
                    <div
                      className={`font-display font-black text-base ${m.c} mt-0.5`}
                    >
                      {m.v}
                    </div>
                    <div className="text-[10px] text-body/70">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Progress Bars */}
              <div className="space-y-3 bg-white p-3.5 rounded border border-line">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-ink">
                      Planned Value (PV)
                    </span>
                    <span className="font-mono text-body">$7.60M (60.8%)</span>
                  </div>
                  <div className="h-2 bg-mist rounded overflow-hidden">
                    <div
                      className="h-full bg-ink/40"
                      style={{ width: "61%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-ink">
                      Earned Value (EV)
                    </span>
                    <span className="font-mono text-epcPrimary font-bold">
                      $7.45M (59.6%)
                    </span>
                  </div>
                  <div className="h-2 bg-mist rounded overflow-hidden">
                    <div
                      className="h-full bg-epcPrimary"
                      style={{ width: "60%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-ink">
                      Actual Cost (AC)
                    </span>
                    <span className="font-mono text-emerald-600 font-bold">
                      $7.10M (56.8%)
                    </span>
                  </div>
                  <div className="h-2 bg-mist rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: "57%" }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 rounded px-3 py-2 text-emerald-900">
                <span className="font-semibold">
                  Forecast EAC: <strong>$11.90M</strong>
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  +$600K Savings
                </span>
              </div>
            </div>
            <div className="px-5 py-3 bg-white border-t border-line text-xs text-body">
              Instant CPI, SPI, CV, SV, and Estimate at Completion (EAC) at any
              WBS node.
            </div>
          </motion.div>

          {/* Card 3: Cross-Project Resource Utilization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-line rounded-md shadow-card overflow-hidden flex flex-col"
          >
            <div className="bg-ink text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <Users className="w-4 h-4 text-gold" />
                <span>Resource Utilization</span>
              </div>
              <span className="text-[10px] bg-epcSecondary/30 text-white px-2 py-0.5 rounded font-mono">
                COMPANY-WIDE
              </span>
            </div>
            <div className="p-5 flex-1 space-y-3 bg-[#FAF9FE] text-xs">
              {[
                {
                  name: "Crane 250T-01",
                  role: "Heavy Equipment",
                  active: 88,
                  idle: 12,
                  proj: "Refinery Ph-2",
                },
                {
                  name: "Welding Crew A",
                  role: "12 Certified Welders",
                  active: 95,
                  idle: 5,
                  proj: "Pipeline Sec-4",
                },
                {
                  name: "Sr. Piping Eng.",
                  role: "Lead Discipline",
                  active: 72,
                  idle: 28,
                  proj: "Shared (2 Projects)",
                },
                {
                  name: "Excavator CAT-4",
                  role: "Earthmoving",
                  active: 45,
                  idle: 55,
                  proj: "Idle Alert — Reallocate",
                },
              ].map((r) => (
                <div
                  key={r.name}
                  className="bg-white border border-line rounded p-2.5"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="font-display font-bold text-ink">
                        {r.name}
                      </span>
                      <span className="text-[10px] text-body ml-1.5">
                        ({r.role})
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        r.idle > 30 ? "text-red-600" : "text-epcPrimary"
                      }`}
                    >
                      {r.active}% Active
                    </span>
                  </div>
                  <div className="h-2 w-full bg-amber-200/70 rounded overflow-hidden flex">
                    <div
                      className="h-full bg-epcPrimary"
                      style={{ width: `${r.active}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-body mt-1">
                    <span>{r.proj}</span>
                    <span>Idle: {r.idle}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-white border-t border-line text-xs text-body">
              Spot idle machinery and crews across projects and reallocate
              before renting.
            </div>
          </motion.div>
        </div>

        {/* Interactive 4-Phase EPC Execution Lifecycle Explorer */}
        <div className="bg-white border border-line rounded-md shadow-card p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-line">
            <div>
              <span className="eyebrow">End-to-End Execution Lifecycle</span>
              <h3 className="font-display font-extrabold text-2xl text-ink mt-1">
                Interactive Project Controls Lifecycle
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {lifecyclePhases.map((phase) => {
                const Icon = phase.icon;
                const isSelected = phase.id === selectedPhaseId;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setSelectedPhaseId(phase.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-display font-bold uppercase tracking-wider transition-all ${
                      isSelected
                        ? "bg-epcPrimary text-white shadow-sm"
                        : "bg-mist text-ink hover:bg-epcPrimary/10 border border-line"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{phase.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 pt-6 items-center">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-gold/25 text-ink">
                  {activePhase.code} · {activePhase.duration}
                </span>
                <span className="text-xs font-display font-bold text-epcSecondary">
                  Status: {activePhase.status} ({activePhase.progress}%)
                </span>
              </div>
              <h4 className="font-display font-extrabold text-xl sm:text-2xl text-ink mb-3">
                {activePhase.title}
              </h4>
              <p className="text-sm text-body leading-relaxed mb-5">
                {activePhase.summary}
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {activePhase.deliverables.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-mist/70 border border-line rounded p-2.5 text-xs text-ink font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-epcSecondary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-navy text-white rounded-md p-6 border border-white/10">
              <div className="text-xs font-display font-bold uppercase tracking-widest text-gold mb-4">
                Live Phase Control Telemetry
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white/5 border border-white/10 rounded p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/60">
                    Cost Index (CPI)
                  </div>
                  <div className="font-display font-black text-xl text-emerald-400 mt-0.5">
                    {activePhase.kpis.cpi}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/60">
                    Schedule Index (SPI)
                  </div>
                  <div className="font-display font-black text-xl text-gold mt-0.5">
                    {activePhase.kpis.spi}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/60">
                    Critical Path Float
                  </div>
                  <div className="font-display font-bold text-sm text-white mt-1">
                    {activePhase.kpis.float}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/60">
                    Baseline State
                  </div>
                  <div className="font-display font-bold text-sm text-epcSecondary mt-1">
                    {activePhase.kpis.wbsLocked}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/75">Phase Physical Progress</span>
                  <span className="font-mono font-bold text-gold">
                    {activePhase.progress}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all duration-500"
                    style={{ width: `${activePhase.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineVisualizer;
