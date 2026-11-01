import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import { Calendar, DollarSign, Users, Compass, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const DashboardDemo = () => {
  const [activeView, setActiveView] = useState("gantt");
  const [selectedTask, setSelectedTask] = useState(null);
  const [, setLocation] = useLocation();

  const ganttData = [
    {
      name: "WP-101 Foundation & Piling",
      start: 0,
      duration: 15,
      progress: 100,
      status: "completed",
      wbs: "1.1.1",
    },
    {
      name: "WP-102 Structural Steel Framing",
      start: 12,
      duration: 20,
      progress: 85,
      status: "in-progress",
      wbs: "1.2.1",
    },
    {
      name: "WP-103 High-Voltage Electrical",
      start: 25,
      duration: 15,
      progress: 60,
      status: "in-progress",
      wbs: "1.3.1",
    },
    {
      name: "WP-104 Process Piping & Valves",
      start: 28,
      duration: 12,
      progress: 40,
      status: "in-progress",
      wbs: "1.3.2",
    },
    {
      name: "WP-105 HVAC & Instrumentation",
      start: 35,
      duration: 18,
      progress: 20,
      status: "planned",
      wbs: "1.4.1",
    },
    {
      name: "WP-106 Cladding & Fireproofing",
      start: 40,
      duration: 10,
      progress: 0,
      status: "planned",
      wbs: "1.5.1",
    },
    {
      name: "WP-107 Pre-Commissioning & Punch",
      start: 48,
      duration: 25,
      progress: 0,
      status: "planned",
      wbs: "1.6.1",
    },
  ];

  const getGanttOption = () => ({
    title: {
      text: "WBS Work Package Timeline & Critical Path Progress",
      textStyle: {
        color: "#05052D",
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "Heebo, sans-serif",
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const task = ganttData[params[0].dataIndex];
        return `
          <div style="padding: 8px; font-family: Inter, sans-serif;">
            <strong>${task.wbs} — ${task.name}</strong><br/>
            Duration: ${task.duration} days<br/>
            Physical Progress: ${task.progress}%<br/>
            Status: ${task.status.replace("-", " ").toUpperCase()}
          </div>
        `;
      },
    },
    grid: {
      left: "28%",
      right: "8%",
      top: "16%",
      bottom: "14%",
    },
    xAxis: {
      type: "value",
      name: "Timeline (Project Days)",
      min: 0,
      max: 80,
      axisLabel: {
        formatter: "D{value}",
        color: "#505E6B",
      },
    },
    yAxis: {
      type: "category",
      data: ganttData.map((item) => item.name),
      axisLabel: {
        fontSize: 11,
        color: "#05052D",
        fontWeight: 600,
      },
    },
    series: [
      {
        name: "Planned Duration",
        type: "bar",
        data: ganttData.map((item) => ({
          value: [item.start, item.duration],
          itemStyle: {
            color:
              item.status === "completed"
                ? "#074E84"
                : item.status === "in-progress"
                ? "#2380C6"
                : "#CBD5E1",
            borderRadius: [3, 3, 3, 3],
          },
        })),
        barWidth: 18,
      },
      {
        name: "Earned Progress",
        type: "bar",
        data: ganttData.map((item) => ({
          value: [item.start, (item.duration * item.progress) / 100],
          itemStyle: {
            color: "#FCBC45",
            borderRadius: [3, 3, 3, 3],
          },
        })),
        barWidth: 9,
      },
    ],
  });

  const getBudgetOption = () => ({
    title: {
      text: "Work Package Cost Control — Baseline Budget vs. Actual Cost",
      textStyle: {
        color: "#05052D",
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "Heebo, sans-serif",
      },
    },
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: ${c}K ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: "middle",
      textStyle: { color: "#05052D" },
    },
    series: [
      {
        name: "Budget Allocation",
        type: "pie",
        radius: ["42%", "72%"],
        center: ["62%", "52%"],
        data: [
          {
            value: 850,
            name: "Manpower & Crews",
            itemStyle: { color: "#074E84" },
          },
          {
            value: 620,
            name: "Materials & BOQ",
            itemStyle: { color: "#2380C6" },
          },
          {
            value: 380,
            name: "Heavy Equipment",
            itemStyle: { color: "#FCBC45" },
          },
          {
            value: 150,
            name: "Subcontract Services",
            itemStyle: { color: "#0A1B33" },
          },
          {
            value: 200,
            name: "Management Reserve",
            itemStyle: { color: "#94A3B8" },
          },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(7, 78, 132, 0.35)",
          },
        },
      },
    ],
  });

  const getResourceOption = () => ({
    title: {
      text: "Cross-Project Resource Utilization & Capacity",
      textStyle: {
        color: "#05052D",
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "Heebo, sans-serif",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["Active Allocated", "Available Capacity"],
      top: "8%",
    },
    grid: {
      left: "6%",
      right: "6%",
      bottom: "8%",
      top: "22%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: [
        "Civil Crews",
        "Structural Steel",
        "Electrical & I&C",
        "Piping Welders",
        "Heavy Cranes",
        "QA / HSE",
      ],
      axisLabel: { color: "#05052D", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "Units / Headcount",
    },
    series: [
      {
        name: "Active Allocated",
        type: "bar",
        stack: "total",
        data: [14, 18, 9, 16, 7, 11],
        itemStyle: { color: "#074E84" },
      },
      {
        name: "Available Capacity",
        type: "bar",
        stack: "total",
        data: [4, 2, 3, 2, 1, 3],
        itemStyle: { color: "#FCBC45" },
      },
    ],
  });

  const metrics = {
    gantt: [
      {
        label: "Schedule Performance (SPI)",
        value: "0.98",
        change: "+0.03 vs last week",
      },
      {
        label: "Critical Path Tasks",
        value: "5 Active",
        change: "Zero unmitigated delays",
      },
      {
        label: "WBS Baseline Status",
        value: "Locked",
        change: "Amendment #2 active",
      },
    ],
    budget: [
      {
        label: "Baseline Budget (BAC)",
        value: "$2.20M",
        change: "100% allocated to WPs",
      },
      {
        label: "Earned Value (EV)",
        value: "$1.62M",
        change: "73.6% physical progress",
      },
      {
        label: "Cost Performance (CPI)",
        value: "1.04",
        change: "$68K under budget",
      },
    ],
    resources: [
      {
        label: "Active Workforce",
        value: "75 / 88",
        change: "85.2% utilization rate",
      },
      {
        label: "Onboarding Pipeline",
        value: "14 Ready",
        change: "9-stage verified",
      },
      {
        label: "Idle Equipment Alert",
        value: "1 Crane",
        change: "Reallocating to WP-104",
      },
    ],
  };

  return (
    <section id="demo" className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="eyebrow">Interactive Control Room</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
            Experience SmartProject Live Telemetry
          </h2>
          <p className="text-body">
            Switch between the WBS Gantt Schedule, Work Package Earned Value
            Budget, and Cross-Project Resource Allocation views below—or open
            the full Project Testbench.
          </p>
        </div>

        <div className="bg-white border border-line rounded-md shadow-cardhover overflow-hidden">
          {/* Top Header Bar */}
          <div className="bg-ink text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img
                src="/smartproject-logo-dark.svg"
                alt="SmartProject"
                className="w-7 h-7"
              />
              <div>
                <div className="font-display font-bold text-sm text-white">
                  SmartProject Control Room — Refinery Expansion Package A
                </div>
                <div className="text-[11px] text-white/60 font-mono">
                  WBS Depth: 9 Levels · CPM Engine: Active · Currency: USD
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/newlanding")}
              className="btn-gold !py-2 !px-4 !text-xs inline-flex items-center gap-2 rounded-sm font-display uppercase tracking-wider"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Open Full Project Testbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid lg:grid-cols-12 min-h-[480px]">
            {/* Left Sidebar Controls */}
            <div className="lg:col-span-3 bg-mist p-6 border-b lg:border-b-0 lg:border-r border-line flex flex-col justify-between">
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-widest text-epcPrimary mb-3">
                  Select Control View
                </div>
                <div className="space-y-2">
                  {[
                    {
                      id: "gantt",
                      label: "WBS & Gantt Schedule",
                      icon: Calendar,
                    },
                    {
                      id: "budget",
                      label: "WP Budget & EVM",
                      icon: DollarSign,
                    },
                    {
                      id: "resources",
                      label: "Resource Utilization",
                      icon: Users,
                    },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveView(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left font-display font-bold text-sm transition-all ${
                          active
                            ? "bg-epcPrimary text-white shadow-sm"
                            : "bg-white text-ink hover:bg-epcPrimary/10 border border-line"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            active ? "text-gold" : "text-epcPrimary"
                          }`}
                        />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-line">
                <div className="text-xs font-display font-bold uppercase tracking-wider text-ink mb-2">
                  Overall Physical Progress
                </div>
                <div className="w-full bg-white border border-line rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    className="bg-epcPrimary h-full rounded-full transition-all duration-500"
                    style={{ width: "74%" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-body font-mono">
                  <span>74% Complete</span>
                  <span className="text-emerald-600 font-bold">CPI: 1.04</span>
                </div>
              </div>
            </div>

            {/* Center ECharts Canvas */}
            <div className="lg:col-span-6 p-6 bg-white flex flex-col justify-center">
              <div className="w-full h-[360px]">
                {activeView === "gantt" && (
                  <ReactECharts
                    option={getGanttOption()}
                    style={{ height: "100%", width: "100%" }}
                    onEvents={{
                      click: (params) => {
                        if (params.dataIndex !== undefined) {
                          setSelectedTask(ganttData[params.dataIndex]);
                        }
                      },
                    }}
                  />
                )}
                {activeView === "budget" && (
                  <ReactECharts
                    option={getBudgetOption()}
                    style={{ height: "100%", width: "100%" }}
                  />
                )}
                {activeView === "resources" && (
                  <ReactECharts
                    option={getResourceOption()}
                    style={{ height: "100%", width: "100%" }}
                  />
                )}
              </div>

              {selectedTask && activeView === "gantt" && (
                <div className="mt-3 p-3.5 bg-mist rounded border border-line flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-epcPrimary mr-2">
                      [{selectedTask.wbs}]
                    </span>
                    <strong className="text-ink">{selectedTask.name}</strong>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span>Duration: {selectedTask.duration}d</span>
                    <span className="text-epcSecondary font-bold">
                      Progress: {selectedTask.progress}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right KPI Telemetry Panel */}
            <div className="lg:col-span-3 bg-mist p-6 border-t lg:border-t-0 lg:border-l border-line flex flex-col justify-between">
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-widest text-epcPrimary mb-3">
                  Live Control Metrics
                </div>
                <div className="space-y-3">
                  {metrics[activeView].map((metric, index) => (
                    <div
                      key={index}
                      className="bg-white p-3.5 rounded border border-line shadow-sm"
                    >
                      <div className="text-xs text-body">{metric.label}</div>
                      <div className="text-2xl font-display font-black text-ink mt-0.5">
                        {metric.value}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-3.5 bg-navy text-white rounded border border-white/10 text-xs">
                <div className="font-display font-bold text-gold mb-1">
                  Audit-Ready Baseline
                </div>
                <p className="text-white/75 leading-relaxed">
                  All changes to finalized WBS budgets are logged via Project
                  Amendments with full user attribution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardDemo;
