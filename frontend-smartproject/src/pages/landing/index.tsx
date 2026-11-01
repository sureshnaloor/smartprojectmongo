import React from "react";
import { SharedNavigation } from "@/components/shared-navigation";
// @ts-expect-error - JSX file without type definitions
import Hero from "@/components/Hero.jsx";
// @ts-expect-error - JSX file without type definitions
import Features from "@/components/Features.jsx";
// @ts-expect-error - JSX file without type definitions
import TimelineVisualizer from "@/components/TimelineVisualizer.jsx";
// @ts-expect-error - JSX file without type definitions
import DashboardDemo from "@/components/DashboardDemo.jsx";
// @ts-expect-error - JSX file without type definitions
import ROICalculator from "@/components/ROICalculator.jsx";
// @ts-expect-error - JSX file without type definitions
import Pricing from "@/components/Pricing.jsx";
// @ts-expect-error - JSX file without type definitions
import Footer from "@/components/Footer.jsx";

function Landing() {
  return (
    <div className="app min-h-screen flex flex-col bg-white text-body">
      <SharedNavigation variant="landing" />
      <main className="flex-1">
        <Hero />
        <Features />
        <TimelineVisualizer />
        <DashboardDemo />
        <ROICalculator />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
