import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Compass,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import DemoRequestModal from "./DemoRequestModal.jsx";

const flipWords = [
  "Schedules",
  "Budgets",
  "Crews",
  "Equipment",
  "Risks",
  "Procurement",
];

const ganttRows = [
  {
    wbs: "1.0",
    name: "Engineering & Design",
    start: 0,
    len: 35,
    crit: false,
    prog: 100,
    type: "L1",
  },
  {
    wbs: "1.1",
    name: "Process Flow Diagrams",
    start: 0,
    len: 15,
    crit: true,
    prog: 100,
    type: "WP",
  },
  {
    wbs: "1.2",
    name: "3D Piping Model Review",
    start: 15,
    len: 20,
    crit: true,
    prog: 100,
    type: "WP",
  },
  {
    wbs: "2.0",
    name: "Civil & Structural",
    start: 20,
    len: 45,
    crit: false,
    prog: 65,
    type: "L1",
  },
  {
    wbs: "2.1",
    name: "Foundation Piling (Critical)",
    start: 20,
    len: 25,
    crit: true,
    prog: 80,
    type: "WP",
  },
  {
    wbs: "2.2",
    name: "Steel Structure Erection",
    start: 45,
    len: 20,
    crit: true,
    prog: 40,
    type: "WP",
  },
  {
    wbs: "3.0",
    name: "Mechanical & Piping",
    start: 50,
    len: 50,
    crit: false,
    prog: 15,
    type: "L1",
  },
  {
    wbs: "3.1",
    name: "Heavy Vessel Lift (Milestone)",
    start: 65,
    len: 5,
    crit: true,
    prog: 0,
    type: "MS",
  },
];

const marqueeItems = [
  "9-Level WBS Hierarchy",
  "Primavera P6 XML & Excel Import",
  "Critical Path Method (CPM)",
  "Earned Value Management (CPI / SPI)",
  "Strict Lock-on-Finalize Baseline",
  "Auditable Project Amendments",
  "Cross-Project Resource Utilization",
  "9-Stage Resource Onboarding Engine",
  "PR-to-PO Procurement Tracking",
  "Integrated HSE, Risk & Lessons Learnt Wiki",
  "Cloud Document & Correspondence Control",
  "Real-Time Collaboration Hub & Kanban",
];

function CountUp({ to = 100, suffix = "", duration = 1.6 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const stepTime = 16;
    const totalSteps = Math.max(1, Math.floor((duration * 1000) / stepTime));
    const inc = to / totalSteps;
    const id = setInterval(() => {
      start += inc;
      if (start >= to) {
        setVal(to);
        clearInterval(id);
      } else {
        setVal(Math.floor(start));
      }
    }, stepTime);
    return () => clearInterval(id);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

const Hero = () => {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % flipWords.length),
      2200
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="overview"
      className="relative bg-denim text-white overflow-hidden"
    >
      {/* Decorative glows & blueprint grid */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-epcSecondary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gold/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {/* Breadcrumb */}
        <div className="text-xs text-white/70 mb-6 flex items-center gap-2">
          <span className="hover:text-gold transition-colors">EPCORA Stack</span>
          <span>/</span>
          <span className="text-white/80">Products</span>
          <span>/</span>
          <span className="text-gold font-semibold">SmartProject</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 mb-5">
              <span className="w-2 h-2 rounded-full bg-gold pulse-dot" />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Epcora Product · Project Controls
              </span>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <img
                src="/smartproject-logo-dark.svg"
                alt="SmartProject Mark"
                className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 drop-shadow-lg"
              />
              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] bordered-heading">
                SmartProject
              </h1>
            </div>

            <div className="font-display font-bold text-xl sm:text-2xl text-gold mb-4">
              Every Package. Every Dollar. Every Hour.
            </div>

            {/* Rotating flip-word subline */}
            <div className="font-display text-base sm:text-lg text-white/90 mb-5 flex flex-wrap items-center gap-2">
              <span>Built to command your</span>
              <span className="relative inline-flex items-center justify-center px-3 py-0.5 rounded bg-gold text-ink font-extrabold min-w-[140px] h-8 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={flipWords[idx]}
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -18, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="absolute"
                  >
                    {flipWords[idx]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span>in real time.</span>
            </div>

            <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-8">
              An enterprise-grade project controls and resource optimization
              platform built for high-stakes capital projects. Unify{" "}
              <strong className="text-white">9-level WBS hierarchies</strong>,{" "}
              <strong className="text-white">Critical Path scheduling</strong>,{" "}
              <strong className="text-white">Earned Value Management</strong>,
              and{" "}
              <strong className="text-white">
                cross-project resource utilization
              </strong>{" "}
              into one auditable command center.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap gap-3 mb-10">
              <button
                type="button"
                onClick={() => setLocation("/newlanding")}
                className="btn-gold px-6 py-3.5 rounded-sm font-display text-sm uppercase tracking-wider inline-flex items-center gap-2 shadow-lg"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Project Testbench</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="btn-epc-outline"
              >
                Request Live Demo
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider text-gold hover:text-white px-3 py-2 transition-colors"
              >
                Explore 21 Modules →
              </a>
            </div>

            {/* Animated Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/15">
              {[
                { val: 9, suf: "", lbl: "WBS Levels Deep" },
                { val: 0, suf: "", lbl: "Budget Leakages" },
                { val: 21, suf: "+", lbl: "Integrated Modules" },
                { val: 100, suf: "%", lbl: "Audit-Proof History" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded p-3 backdrop-blur-sm"
                >
                  <div className="font-display font-black text-2xl text-gold leading-none">
                    <CountUp to={s.val} suffix={s.suf} />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-white/75 mt-1">
                    {s.lbl}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Interactive Gantt & Critical Path Engine Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-6 relative"
          >
            <div className="bg-ink/90 border border-white/15 rounded-md shadow-2xl overflow-hidden backdrop-blur">
              {/* Browser top bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  <span className="ml-2 text-[11px] text-white/60 font-mono">
                    smartproject.epcorastack.com — Refinery Expansion Ph-2
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 font-semibold">
                  Baseline Locked
                </span>
              </div>

              {/* Toolbar */}
              <div className="px-4 py-2 bg-navy/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="text-white/90 font-semibold">
                    View:{" "}
                    <span className="text-gold">Gantt &amp; Critical Path</span>
                  </span>
                  <span className="text-white/30">|</span>
                  <span className="text-white/70">WBS Depth: All 9 Levels</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{" "}
                    Critical Path
                  </span>
                  <span className="flex items-center gap-1 text-epcSecondary">
                    <span className="w-2 h-2 rounded-full bg-epcSecondary" />{" "}
                    Standard Task
                  </span>
                </div>
              </div>

              {/* Gantt Grid */}
              <div className="p-4 bg-[#071120]">
                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-white/40 pb-2 border-b border-white/10 font-mono">
                  <div className="col-span-5">WBS / Activity Name</div>
                  <div className="col-span-7 grid grid-cols-4 text-center">
                    <span>Q1</span>
                    <span>Q2</span>
                    <span>Q3</span>
                    <span>Q4</span>
                  </div>
                </div>

                <div className="divide-y divide-white/5 mt-1">
                  {ganttRows.map((r, i) => (
                    <motion.div
                      key={r.wbs}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      className={`grid grid-cols-12 gap-2 py-2 items-center text-xs ${
                        r.type === "L1"
                          ? "bg-white/[0.03] font-semibold text-white"
                          : "text-white/80"
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-1.5 truncate pr-2">
                        <span
                          className={`font-mono text-[10px] px-1 rounded ${
                            r.type === "L1"
                              ? "bg-epcPrimary text-gold"
                              : "text-white/50 pl-2"
                          }`}
                        >
                          {r.wbs}
                        </span>
                        <span className="truncate text-[11px]">{r.name}</span>
                      </div>
                      <div className="col-span-7 relative h-5 bg-white/[0.02] rounded overflow-hidden flex items-center">
                        <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                          <div className="border-r border-white/5" />
                          <div className="border-r border-white/5" />
                          <div className="border-r border-white/5" />
                          <div />
                        </div>

                        {r.type === "MS" ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1, type: "spring" }}
                            style={{ left: `${r.start}%` }}
                            className="absolute w-3 h-3 bg-gold rotate-45 -ml-1.5 border border-ink shadow-[0_0_8px_#FCBC45]"
                          />
                        ) : (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${r.len}%` }}
                            transition={{
                              duration: 1,
                              delay: 0.4 + i * 0.1,
                              ease: "easeOut",
                            }}
                            style={{ left: `${r.start}%` }}
                            className={`absolute h-3 rounded-sm overflow-hidden ${
                              r.type === "L1"
                                ? "bg-white/30 h-2"
                                : r.crit
                                ? "bg-red-500/40 border border-red-500"
                                : "bg-epcSecondary/40 border border-epcSecondary"
                            }`}
                          >
                            <div
                              style={{ width: `${r.prog}%` }}
                              className={`h-full ${
                                r.type === "L1"
                                  ? "bg-white"
                                  : r.crit
                                  ? "bg-red-500"
                                  : "bg-epcSecondary"
                              }`}
                            />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom EVM Status Bar */}
              <div className="px-4 py-3 bg-navy border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                {[
                  {
                    k: "CPI (Cost Index)",
                    v: "1.04 (Under Budget)",
                    c: "text-emerald-400",
                  },
                  {
                    k: "SPI (Schedule Index)",
                    v: "0.98 (On Track)",
                    c: "text-gold",
                  },
                  {
                    k: "Active Resources",
                    v: "142 / 150 (94.6% Util.)",
                    c: "text-white",
                  },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="bg-white/5 rounded py-1.5 px-2 border border-white/5"
                  >
                    <div className="font-display font-bold text-xs">{m.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60">
                      {m.k}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Live EVM Alert Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="hidden sm:flex absolute -bottom-5 -left-6 bg-white text-ink p-3.5 rounded shadow-cardhover border-l-4 border-gold items-center gap-3 max-w-xs float-soft"
            >
              <div className="w-9 h-9 rounded bg-gold/20 text-ink flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-golddeep" />
              </div>
              <div>
                <div className="font-display font-bold text-xs">
                  Cost Performance Alert (CPI: 0.94)
                </div>
                <div className="text-[11px] text-body">
                  WP 2.1 Foundation Piling trending +$42k over BAC. View EAC
                  forecast.
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scrolling Marquee Strip */}
      <div className="bg-ink text-white border-y border-white/10 overflow-hidden py-3">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 text-xs uppercase tracking-[0.18em] text-white/80 whitespace-nowrap font-display font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <DemoRequestModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
};

export default Hero;
