import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Building2,
  Factory,
  Landmark,
  Wrench,
  Check,
  ChevronDown,
  ArrowRight,
  Compass,
} from "lucide-react";
import DemoRequestModal from "./DemoRequestModal.jsx";

const industries = [
  {
    icon: Factory,
    title: "EPC, Oil & Gas & Process Plants",
    desc: "Manage multi-discipline work packages, turnarounds, shutdowns, and heavy equipment utilization with strict baseline governance.",
    img: "/resources/project-1.jpg",
  },
  {
    icon: Building2,
    title: "Commercial & High-Rise Construction",
    desc: "Coordinate subcontractors, concrete pours, MEP rough-ins, and procurement milestones across 9 WBS levels.",
    img: "/resources/project-2.jpg",
  },
  {
    icon: Landmark,
    title: "Infrastructure, Rail & Utilities",
    desc: "Track linear schedules, critical-path earthworks, fleet utilization, and public-sector audit compliance.",
    img: "/resources/project-3.jpg",
  },
  {
    icon: Wrench,
    title: "Industrial Manufacturing & Capex",
    desc: "Control plant expansions, tooling installations, vendor service BOQs, and internal engineering hours.",
    img: "/hero-epcora.jpg",
  },
];

const roiStats = [
  {
    metric: "100%",
    label: "Budget Integrity",
    detail:
      "Hard validation prevents work packages and activities from exceeding parent WBS budgets.",
  },
  {
    metric: "25%",
    label: "Higher Resource Utilization",
    detail:
      "Cross-project visibility eliminates idle equipment and duplicate external rentals.",
  },
  {
    metric: "3×",
    label: "Faster Progress Reporting",
    detail:
      "Unified timesheets, Kanban boards, and EVM dashboards replace weekly spreadsheet stitching.",
  },
  {
    metric: "Zero",
    label: "Unapproved Scope Creep",
    detail:
      "Finalized WBS nodes stay locked until a formal Project Amendment is reviewed and approved.",
  },
];

const onboardingSteps = [
  {
    step: "Week 1",
    title: "Master Data & Catalog Setup",
    desc: "Import your Material Master, Service Catalog, Resource roles, and equipment rates via CSV/Excel templates.",
  },
  {
    step: "Week 2",
    title: "WBS & Schedule Migration",
    desc: "Upload existing Primavera P6 XML or Excel schedules into the 9-level WBS and validate Work Package budgets.",
  },
  {
    step: "Week 3",
    title: "Baseline Lock & Role Training",
    desc: "Finalize project baselines, configure user permissions, and train planners, cost engineers, and site leads.",
  },
  {
    step: "Week 4+",
    title: "Live EVM & Portfolio Optimization",
    desc: "Go live with daily timesheets, Kanban execution, automated CPI/SPI tracking, and cross-project resource leveling.",
  },
];

const plans = [
  {
    tag: "Pilot",
    name: "Single Project Sandbox",
    price: "2-Week Guided Pilot",
    desc: "Validate SmartProject on one active project or work package using your own WBS and resource data.",
    features: [
      "Full 9-level WBS & Work Package setup",
      "Import 1 project from Excel / P6 XML",
      "Up to 15 users & 200 tracked resources",
      "Live Gantt, Critical Path & EVM dashboard",
      "Dedicated onboarding engineer",
    ],
    cta: "Start Pilot Trial",
    intent: "trial",
    highlight: false,
  },
  {
    tag: "Most Popular",
    name: "Project Rollout",
    price: "Full Project Controls Suite",
    desc: "For EPC contractors and construction firms running multiple concurrent projects requiring strict cost & schedule control.",
    features: [
      "Unlimited WBS nodes, Work Packages & Activities",
      "Full EVM (PV, EV, AC, CPI, SPI, EAC) & Amendments",
      "Company-wide Resource Utilization & Timesheets",
      "Material Master, Service Catalog & PR/PO Procurement",
      "Integrated Risk, Issue, Lessons Learnt & HSE Hub",
      "Cloud Document Control & Correspondence Log",
    ],
    cta: "Launch Project Testbench",
    intent: "testbench",
    highlight: true,
  },
  {
    tag: "Enterprise",
    name: "Multi-Project Portfolio & Custom",
    price: "Dedicated Cloud or On-Prem",
    desc: "Tailored for large capital program owners and tier-1 contractors needing custom integrations and sovereign hosting.",
    features: [
      "Everything in Project Rollout across unlimited portfolios",
      "Single Sign-On (SSO / OAuth) & granular RBAC",
      "ERP / SAP / Primavera P6 bi-directional sync",
      "Dedicated VPC or on-premise Kubernetes deployment",
      "Custom executive reporting & SLA support",
    ],
    cta: "Talk to Enterprise Solutions",
    intent: "sales",
    highlight: false,
  },
];

const faqs = [
  {
    q: "How deep can the Work Breakdown Structure (WBS) go in SmartProject?",
    a: "SmartProject supports up to 9 hierarchical WBS levels, plus dedicated Work Packages (WPs) and individual Activities beneath them. Budgets and progress roll up automatically from the lowest activity to the top-level project summary.",
  },
  {
    q: "How does SmartProject prevent unauthorized scope or budget changes?",
    a: "First, strict budget validation ensures child WBS nodes and Work Packages can never exceed their parent's allocated budget. Second, once a WBS node is finalized, it is locked. Any subsequent scope or budget change must go through the formal Project Amendment workflow with documented justification and approval.",
  },
  {
    q: "What activity types and scheduling methods are supported?",
    a: "SmartProject supports four industry-standard activity types: Task Milestone, Start Milestone, Finish Milestone, and Level of Effort (LOE). Our scheduling engine calculates the Critical Path Method (CPM) with forward/backward pass, early/late dates, and Total Float.",
  },
  {
    q: "Can site teams use Agile Kanban while planners use Gantt and Critical Path?",
    a: "Yes. Planners and project controls engineers can work in the Interactive Gantt, PERT Network, or Calendar views, while site engineers and discipline leads update the exact same activities on a drag-and-drop Kanban board.",
  },
  {
    q: "How does Earned Value Management (EVM) work in the platform?",
    a: "SmartProject continuously computes Planned Value (PV), Earned Value (EV), and Actual Cost (AC) from live activity progress, resource timesheets, and material/service allocations—giving you real-time CPI, SPI, Cost Variance (CV), Schedule Variance (SV), and Estimate at Completion (EAC).",
  },
  {
    q: "How does cross-project Resource Utilization reduce costs?",
    a: "Every labor role and equipment asset is registered in a central Resource Master. SmartProject tracks active vs. idle time across all projects on a unified timeline, allowing resource managers to spot idle cranes or crews on Project A and reallocate them to Project B instead of paying for external rentals.",
  },
  {
    q: "Does SmartProject handle resource onboarding and rental equipment?",
    a: "Yes. The platform includes a structured 9-stage Resource Onboarding workflow (from Application and Assessment to Verification and Onboarded) and supports internal, contractor, and rental equipment tracking.",
  },
  {
    q: "Can we import our existing schedules from Primavera P6 or Excel?",
    a: "Absolutely. SmartProject provides bulk import and export for Primavera P6 XML, Microsoft Excel (.xlsx), and CSV so you can migrate existing WBS structures, activities, and master catalogs in minutes.",
  },
];

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState(0);
  const [modalIntent, setModalIntent] = useState(null);
  const [, setLocation] = useLocation();

  const handlePlanClick = (intent) => {
    if (intent === "testbench") {
      setLocation("/newlanding");
    } else {
      setModalIntent(intent);
    }
  };

  return (
    <>
      {/* 1. Industries Served */}
      <section
        id="industries"
        className="py-20 lg:py-24 bg-white border-t border-line"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="eyebrow">Industries Served</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
              Purpose-Built for Capital-Intensive Delivery
            </h2>
            <p className="text-body">
              Wherever schedules are complex, resources are shared, and budget
              governance is non-negotiable.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((ind, i) => {
              const Icon = ind.icon;
              return (
                <motion.div
                  key={ind.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white border border-line rounded-md overflow-hidden shadow-card group hover:shadow-cardhover transition-all flex flex-col"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={ind.img}
                      alt={ind.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 w-9 h-9 rounded bg-gold text-ink flex items-center justify-center shadow">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-base text-ink mb-2 group-hover:text-epcPrimary transition-colors">
                      {ind.title}
                    </h3>
                    <p className="text-xs text-body leading-relaxed">
                      {ind.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Denim ROI Band */}
      <section className="py-20 bg-denim text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Measurable Impact
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl mt-2 mb-3">
              Engineered for Margin Protection &amp; Schedule Certainty
            </h2>
            <p className="text-white/80">
              SmartProject pays for itself by stopping a single unapproved scope
              overrun or recovering idle equipment hours across your portfolio.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roiStats.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-md p-6 hover:border-gold transition-colors"
              >
                <div className="font-display font-black text-4xl text-gold mb-1">
                  {r.metric}
                </div>
                <div className="font-display font-bold text-base text-white mb-2">
                  {r.label}
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  {r.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 4-Step Deployment & Onboarding */}
      <section className="py-20 lg:py-24 bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="eyebrow">Rapid Deployment</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
              Live in 2 Weeks—Not 6 Months
            </h2>
            <p className="text-body">
              Bring your existing WBS, Primavera P6 schedules, and Excel master
              catalogs into SmartProject with zero disruption to ongoing site
              work.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {onboardingSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-mist border border-line rounded-md p-6 relative"
              >
                <span className="inline-block font-mono text-xs font-bold uppercase px-2.5 py-1 rounded bg-epcPrimary text-gold mb-3">
                  {s.step}
                </span>
                <h3 className="font-display font-bold text-lg text-ink mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-body leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Engagement Models */}
      <section id="engagement" className="py-20 lg:py-24 bg-mist">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <span className="eyebrow">Engagement Models</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
              Start With a Single Project or Roll Out Portfolio-Wide
            </h2>
            <p className="text-body">
              Flexible licensing designed around active projects and project
              controls teams.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-md p-8 flex flex-col justify-between transition-all ${
                  p.highlight
                    ? "bg-navy text-white border-2 border-gold shadow-cardhover lg:-translate-y-2"
                    : "bg-white text-ink border border-line shadow-card"
                }`}
              >
                <div>
                  <span
                    className={`inline-block text-[11px] font-display font-bold uppercase tracking-widest px-3 py-1 rounded mb-4 ${
                      p.highlight
                        ? "bg-gold text-ink"
                        : "bg-mist text-epcPrimary"
                    }`}
                  >
                    {p.tag}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl mb-1">
                    {p.name}
                  </h3>
                  <div
                    className={`font-display font-bold text-sm mb-4 ${
                      p.highlight ? "text-gold" : "text-epcSecondary"
                    }`}
                  >
                    {p.price}
                  </div>
                  <p
                    className={`text-sm leading-relaxed mb-6 ${
                      p.highlight ? "text-white/80" : "text-body"
                    }`}
                  >
                    {p.desc}
                  </p>

                  <ul className="space-y-3 mb-8">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            p.highlight
                              ? "bg-gold/20 text-gold"
                              : "bg-epcSecondary/15 text-epcSecondary"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                        <span
                          className={
                            p.highlight ? "text-white/90" : "text-body"
                          }
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlanClick(p.intent)}
                  className={
                    p.highlight
                      ? "btn-gold w-full justify-center py-3.5 px-6 rounded-sm font-display text-xs uppercase tracking-wider inline-flex items-center gap-2"
                      : "btn-epc-primary w-full justify-center"
                  }
                >
                  <span>{p.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive FAQ Accordion */}
      <section id="faq" className="py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="eyebrow">Frequently Asked Questions</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2">
              Everything You Need to Know About SmartProject
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="border border-line rounded-md overflow-hidden bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-mist/50 transition-colors"
                  >
                    <span className="font-display font-bold text-ink text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-epcPrimary shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-1 text-sm text-body leading-relaxed border-t border-line/60">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Gold Final CTA Banner */}
      <section className="py-16 bg-gold text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ink/70 mb-1">
              SmartProject · EPCORA Stack
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl leading-tight mb-2">
              Ready to Take Total Command of Your Next Project?
            </h2>
            <p className="text-ink/80 text-sm sm:text-base">
              Launch the interactive Project Testbench now or bring your own WBS
              and schedule for a live walkthrough.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setLocation("/newlanding")}
              className="inline-flex items-center gap-2 bg-ink text-white font-display font-bold text-sm uppercase tracking-wider px-7 py-4 rounded-sm hover:bg-epcPrimary transition-colors shadow-lg"
            >
              <Compass className="w-4 h-4 text-gold" />
              <span>Open Project Testbench</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalIntent("demo")}
              className="inline-flex items-center gap-2 border-2 border-ink text-ink font-display font-bold text-sm uppercase tracking-wider px-6 py-4 rounded-sm hover:bg-ink hover:text-white transition-colors"
            >
              Schedule a Walkthrough
            </button>
          </div>
        </div>
      </section>

      <DemoRequestModal
        open={modalIntent !== null}
        intent={modalIntent}
        onClose={() => setModalIntent(null)}
      />
    </>
  );
};

export default Pricing;
