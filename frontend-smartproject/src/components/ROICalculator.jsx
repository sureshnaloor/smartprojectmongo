import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Calculator, TrendingUp, Clock, DollarSign, ShieldCheck } from "lucide-react";

const ROICalculator = () => {
  const [projectCount, setProjectCount] = useState(12);
  const [avgProjectValue, setAvgProjectValue] = useState(5000000);
  const [teamSize, setTeamSize] = useState(40);
  const [delayPercentage, setDelayPercentage] = useState(18);
  const [results, setResults] = useState({
    annualSavings: 0,
    timeSaved: 0,
    roiPercentage: 0,
    paybackMonths: 0,
  });

  useEffect(() => {
    const totalAnnualValue = projectCount * avgProjectValue;
    const delayCost =
      totalAnnualValue * (delayPercentage / 100) * 0.08;
    const resourceOptimizationSavings = teamSize * 2500 * 12 * 0.14;
    const totalAnnualSavings = delayCost * 0.42 + resourceOptimizationSavings;

    const smartProjectCost = teamSize * 89 * 12;
    const netSavings = totalAnnualSavings - smartProjectCost;
    const roi = (netSavings / smartProjectCost) * 100;
    const payback = smartProjectCost / (totalAnnualSavings / 12);

    setResults({
      annualSavings: Math.round(totalAnnualSavings),
      timeSaved: Math.round(projectCount * delayPercentage * 0.4 * 2.2),
      roiPercentage: Math.max(120, Math.round(roi)),
      paybackMonths: Math.max(0.8, Math.round(payback * 10) / 10),
    });
  }, [projectCount, avgProjectValue, teamSize, delayPercentage]);

  const getChartOption = () => ({
    title: {
      text: "Projected Annual Value Recovery Breakdown",
      textStyle: {
        color: "#05052D",
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "Heebo, sans-serif",
      },
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: ${c} ({d}%)",
    },
    series: [
      {
        name: "Savings Breakdown",
        type: "pie",
        radius: ["42%", "72%"],
        center: ["50%", "56%"],
        data: [
          {
            value: Math.round(results.annualSavings * 0.45),
            name: "WBS Scope & Budget Creep Prevention",
            itemStyle: { color: "#074E84" },
          },
          {
            value: Math.round(results.annualSavings * 0.35),
            name: "Idle Resource & Equipment Reallocation",
            itemStyle: { color: "#2380C6" },
          },
          {
            value: Math.round(results.annualSavings * 0.2),
            name: "Critical Path Delay Mitigation",
            itemStyle: { color: "#FCBC45" },
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

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <section id="roi" className="py-20 lg:py-24 bg-mist border-t border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="eyebrow">Measurable Financial Impact</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink mt-2 mb-3">
            Calculate Your SmartProject ROI
          </h2>
          <p className="text-body">
            Estimate how much margin your organization recovers by locking WBS
            baselines, preventing critical-path slippages, and reallocating idle
            resources across projects.
          </p>
        </div>

        <div className="bg-white border border-line rounded-md shadow-card p-6 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Sliders */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-line">
                <Calculator className="w-5 h-5 text-epcPrimary" />
                <h3 className="font-display font-extrabold text-xl text-ink">
                  Portfolio Parameters
                </h3>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-ink">
                    Active Capital / EPC Projects per Year
                  </label>
                  <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-mist text-epcPrimary border border-line">
                    {projectCount} Projects
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={projectCount}
                  onChange={(e) => setProjectCount(parseInt(e.target.value))}
                  className="slider"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-ink">
                    Average Contract Value per Project
                  </label>
                  <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-mist text-epcPrimary border border-line">
                    {formatCurrency(avgProjectValue)}
                  </span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="50000000"
                  step="500000"
                  value={avgProjectValue}
                  onChange={(e) => setAvgProjectValue(parseInt(e.target.value))}
                  className="slider"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-ink">
                    Planners, Engineers &amp; Site Leads
                  </label>
                  <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-mist text-epcPrimary border border-line">
                    {teamSize} Users
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="250"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="slider"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-ink">
                    Current Schedule / Cost Variance Exposure
                  </label>
                  <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-gold/25 text-ink border border-gold/50">
                    {delayPercentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={delayPercentage}
                  onChange={(e) => setDelayPercentage(parseInt(e.target.value))}
                  className="slider"
                />
              </div>
            </div>

            {/* Results & Pie Chart */}
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-navy text-white p-4 rounded-md border border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                    <span>Projected Annual Savings</span>
                    <DollarSign className="w-4 h-4 text-gold" />
                  </div>
                  <div className="font-display font-black text-2xl sm:text-3xl text-gold">
                    {formatCurrency(results.annualSavings)}
                  </div>
                </div>

                <div className="bg-mist p-4 rounded-md border border-line">
                  <div className="flex items-center justify-between text-xs text-body mb-1">
                    <span>Schedule Days Recovered</span>
                    <Clock className="w-4 h-4 text-epcPrimary" />
                  </div>
                  <div className="font-display font-black text-2xl sm:text-3xl text-epcPrimary">
                    {results.timeSaved}d
                  </div>
                </div>

                <div className="bg-mist p-4 rounded-md border border-line">
                  <div className="flex items-center justify-between text-xs text-body mb-1">
                    <span>Estimated Annual ROI</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-display font-black text-2xl sm:text-3xl text-emerald-600">
                    {results.roiPercentage}%
                  </div>
                </div>

                <div className="bg-mist p-4 rounded-md border border-line">
                  <div className="flex items-center justify-between text-xs text-body mb-1">
                    <span>Payback Period</span>
                    <ShieldCheck className="w-4 h-4 text-epcSecondary" />
                  </div>
                  <div className="font-display font-black text-2xl sm:text-3xl text-ink">
                    {results.paybackMonths} mo
                  </div>
                </div>
              </div>

              <div className="h-[250px] bg-[#FAF9FE] border border-line rounded-md p-2">
                <ReactECharts
                  option={getChartOption()}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
