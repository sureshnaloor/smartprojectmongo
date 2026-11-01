import React from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  TrendingDown,
  Users,
  GitBranch,
  Lock,
  Play,
  Activity,
  ShieldCheck,
  Check,
  Network,
  CalendarClock,
  DollarSign,
  Cpu,
  ShoppingCart,
  ShieldAlert,
  FolderKanban,
  MessageSquare,
} from "lucide-react";

const problems = [
  {
    icon: FileSpreadsheet,
    title: "Fragmented Spreadsheets",
    desc: "Schedules live in P6 or MS Project, budgets in Excel, and site updates on WhatsApp—creating dangerous blind spots across work packages.",
  },
  {
    icon: TrendingDown,
    title: "Silent Scope & Budget Creep",
    desc: "Uncontrolled WBS edits and untracked field changes erode project margins long before monthly finance reports catch them.",
  },
  {
    icon: Users,
    title: "Idle & Overbooked Resources",
    desc: "Specialized engineers, crews, and heavy equipment sit idle on one project while another pays emergency rental premiums.",
  },
];

const painMatrix = [
  [
    "Unapproved WBS / scope additions",
    "5–12% unrecovered cost overruns",
  ],
  [
    "Delayed CPI / SPI visibility (monthly lag)",
    "Late corrective action on critical path",
  ],
  [
    "Idle heavy equipment & specialist crews",
    "15–25% wasted resource expenditure",
  ],
  [
    "Disconnected timesheets & progress logs",
    "Billing disputes & audit non-compliance",
  ],
];

const steps = [
  {
    step: "01",
    icon: GitBranch,
    title: "Architect the 9-Level WBS",
    desc: "Build your project hierarchy up to 9 levels deep—or bulk-import directly from Primavera P6 XML, Excel, or CSV—and define granular Work Packages.",
  },
  {
    step: "02",
    icon: Lock,
    title: "Allocate & Lock Baseline",
    desc: "Assign budgets, materials, services, equipment, and manpower. Finalize and lock the WBS baseline so scope changes require formal Project Amendments.",
  },
  {
    step: "03",
    icon: Play,
    title: "Execute & Log Real-Time Progress",
    desc: "Teams execute via Interactive Gantt, Critical Path views, and Kanban boards while logging daily labor and equipment timesheets.",
  },
  {
    step: "04",
    icon: Activity,
    title: "Monitor EVM & Optimize",
    desc: "Track live Planned Value (PV), Earned Value (EV), Actual Cost (AC), CPI, SPI, and EAC—and reallocate idle resources across projects.",
  },
];

const governancePoints = [
  {
    title: "Lock-on-Finalize",
    desc: "Once a WBS node is finalized, budget and scope fields are cryptographically locked against casual edits.",
  },
  {
    title: "Project Amendments",
    desc: "Scope or budget changes after finalization require a formal Amendment workflow with justification and approval.",
  },
  {
    title: "Controlled Access",
    desc: "Role-based permissions separate planners, cost controllers, site engineers, and executive approvers.",
  },
  {
    title: "Audit-Proof History",
    desc: "Every baseline revision, amendment, procurement PO, and timesheet entry is timestamped for owner/client audits.",
  },
];

const features = [
  {
    icon: Network,
    tag: "Core Engine",
    title: "9-Level WBS & Work Package Governance",
    desc: "Structure massive EPC and capital programs with infinite clarity, strict baseline locking, and seamless Primavera P6 / Excel / CSV import-export.",
    bullets: [
      "Up to 9 hierarchical WBS levels with automatic budget roll-ups",
      "Granular Work Packages (WPs) bridging WBS nodes and executable activities",
      "Strict Lock-on-Finalize workflow with formal Project Amendments",
      "Bulk import/export for Primavera P6 XML, Excel (.xlsx), and CSV",
    ],
  },
  {
    icon: CalendarClock,
    tag: "Scheduling",
    title: "CPM Scheduling & 4 Activity Types",
    desc: "Run true Critical Path Method (CPM) forward/backward pass calculations directly in the browser with rich multi-view visualization.",
    bullets: [
      "4 specialized activity types: Task Milestone, Start Milestone, Finish Milestone, Level of Effort (LOE)",
      "Full dependency logic (FS, SS, FF, SF) with lead/lag and Total Float calculation",
      "Interactive Gantt chart, PERT Network diagram, and Calendar views",
      "Instant critical path highlighting and schedule compression analysis",
    ],
  },
  {
    icon: DollarSign,
    tag: "Financials",
    title: "Work Package Budgeting & Earned Value (EVM)",
    desc: "Eliminate end-of-month financial surprises with live Earned Value Management and multi-currency cost control.",
    bullets: [
      "Strict budget validation ensuring child WBS and WP budgets never exceed parent caps",
      "Real-time PV, EV, AC, Cost Variance (CV), and Schedule Variance (SV)",
      "Automated CPI, SPI, Estimate at Completion (EAC), and VAC forecasting",
      "Direct cost linkage from resource timesheets, service BOQs, and material POs",
    ],
  },
  {
    icon: Cpu,
    tag: "Resource Engine",
    title: "Enterprise Resource Master & Cross-Project Utilization",
    desc: "Maximize return on your most expensive assets—engineers, crews, and heavy machinery—across your entire project portfolio.",
    bullets: [
      "Unified Resource Master for Manpower (roles/skills) and Equipment (rates/specs)",
      "9-Stage Resource Onboarding Engine (Apply → Assessment → Mobilization)",
      "Company-wide Active vs. Idle timeline tracking across all concurrent projects",
      "Integrated daily/weekly Timesheets feeding actual hours directly into EVM",
    ],
  },
  {
    icon: ShoppingCart,
    tag: "Supply Chain",
    title: "Material Master, Service Catalog & PR-to-PO Procurement",
    desc: "Connect engineering material take-offs and service BOQs directly to Work Package budgets and procurement execution.",
    bullets: [
      "Centralized Material Master (UOM, unit rates, categories) and Service Catalog",
      "Drag-and-drop mapping of Materials, Services, and Resources onto Work Packages",
      "Purchase Requisition (PR) to Purchase Order (PO) lifecycle tracking",
      "Vendor Master directory with committed cost vs. approved budget checks",
    ],
  },
  {
    icon: ShieldAlert,
    tag: "Governance & Risk",
    title: "Integrated HSE, Risk, Issues & Lessons Learnt Wiki",
    desc: "Embed field safety, risk mitigation, and institutional knowledge directly into daily project execution.",
    bullets: [
      "HSE Hub with 5×5 severity/likelihood Risk Matrix, NCRs, and Safety Action Plans",
      "Project Risk Register and Issue Tracker linked to WBS Work Packages",
      "Obsidian-style Wiki Knowledge Base (`[[wiki-links]]` & `#tags`) for Registers",
      "Enterprise Lessons Learnt Register to prevent recurring execution pitfalls",
    ],
  },
  {
    icon: FolderKanban,
    tag: "Document Control",
    title: "Cloud Document Control & Correspondence Tracking",
    desc: "Maintain a single, revision-controlled repository for drawings, contracts, RFIs, and official stakeholder letters.",
    bullets: [
      "Google Cloud Storage backed Document Repository with version history",
      "Status workflows (Draft, Under Review, Approved, Superseded) & tagging",
      "Formal Project Correspondence Log for client/contractor letters and transmittals",
      "Direct attachment of engineering specs and certificates to deliverables",
    ],
  },
  {
    icon: MessageSquare,
    tag: "Execution & Collab",
    title: "Agile Kanban, Collaboration Hub & Executive Analytics",
    desc: "Bridge the gap between the planning office and the construction site with real-time team communication and visual task boards.",
    bullets: [
      "Drag-and-drop Kanban boards for field engineers and discipline leads",
      "Built-in Collaboration Hub with threaded discussions, @mentions, and file sharing",
      "Daily Progress Tracking with physical % complete verification",
      "Portfolio & Project Dashboards with S-curves, variance charts, and PDF/CSV exports",
    ],
  },
];

const Features = () => {
  return (
    <>
      {/* 1. The Problem & Financial Impact */}
      <section className="py-20 lg:py-24 bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5"
            >
              <span className="eyebrow">The Challenge</span>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-4 bordered-heading">
                Why Complex Capital Projects Bleed Margin
              </h2>
              <p className="text-body leading-relaxed mb-6">
                On multi-million-dollar EPC and construction programs, a 2-week
                delay in spotting a critical-path slip or an unapproved WBS edit
                can wipe out quarter-end profitability.
              </p>

              {/* Financial Impact Table */}
              <div className="bg-mist border border-line rounded-md overflow-hidden">
                <div className="bg-ink text-white px-4 py-2.5 font-display font-bold text-xs uppercase tracking-wider flex justify-between">
                  <span>Operational Blind Spot</span>
                  <span className="text-gold">Typical Margin Impact</span>
                </div>
                <div className="divide-y divide-line text-xs">
                  {painMatrix.map(([pain, impact], i) => (
                    <div
                      key={i}
                      className="px-4 py-3 flex items-center justify-between gap-4"
                    >
                      <span className="text-ink font-medium">{pain}</span>
                      <span className="font-display font-bold text-red-600 shrink-0">
                        {impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-7 grid sm:grid-cols-3 gap-5">
              {problems.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="service-card group border-t-4 border-t-epcPrimary"
                  >
                    <div className="w-12 h-12 rounded-md bg-mist text-epcPrimary flex items-center justify-center mb-4 group-hover:bg-epcPrimary group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-ink mb-2">
                      {p.title}
                    </h3>
                    <p className="text-sm text-body leading-relaxed">
                      {p.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. How It Works + WBS Governance Callout */}
      <section
        id="how-it-works"
        className="py-20 lg:py-24 bg-mist relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="eyebrow">How SmartProject Works</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
              Structure. Baseline. Execute. Control.
            </h2>
            <p className="text-body">
              A closed-loop project controls workflow that locks your baseline
              and connects every field hour and purchase order back to the WBS.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white border border-line rounded-md p-6 shadow-card relative group hover:border-epcSecondary transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-md bg-mist text-epcPrimary flex items-center justify-center group-hover:bg-epcPrimary group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-display font-black text-3xl text-epcPrimary/15 group-hover:text-gold transition-colors">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-ink mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-body leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Dark Navy Governance Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-navy text-white rounded-md p-8 lg:p-10 border border-white/10 shadow-cardhover"
          >
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5">
                <div className="inline-flex items-center gap-2 text-gold text-xs font-display font-bold uppercase tracking-widest mb-2">
                  <ShieldCheck className="w-4 h-4" /> Built-In Financial
                  Discipline
                </div>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl mb-3 bordered-heading">
                  Strict WBS Governance That Stops Scope Creep Cold
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Unlike generic task trackers where anyone can alter dates or
                  budgets, SmartProject enforces enterprise project controls
                  discipline from Day 1.
                </p>
              </div>
              <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
                {governancePoints.map((g) => (
                  <div
                    key={g.title}
                    className="bg-white/5 border border-white/10 rounded p-4"
                  >
                    <div className="font-display font-bold text-gold text-sm mb-1">
                      {g.title}
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed">
                      {g.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Eight Core Capabilities Grid */}
      <section id="features" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="eyebrow">Platform Capabilities</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-4">
              21 Integrated Modules. One Unified Command Center.
            </h2>
            <p className="text-body">
              Built from the ground up for project directors, planning
              engineers, cost controllers, procurement leads, and resource
              managers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
                  className="service-card group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-md bg-mist text-epcPrimary flex items-center justify-center group-hover:bg-epcPrimary group-hover:text-white transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-display font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-mist text-epcPrimary border border-line">
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-ink mb-2 group-hover:text-epcPrimary transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-body leading-relaxed mb-5">
                      {f.desc}
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-4 border-t border-line">
                    {f.bullets.map((b, idx) => (
                      <li key={idx} className="check-item">
                        <span className="check-badge">
                          <Check className="w-3 h-3" />
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default Features;
