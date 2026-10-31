import React from 'react'
import { SharedNavigation } from '@/components/shared-navigation'
// @ts-expect-error - JSX file without type definitions
import Hero from '@/components/Hero.jsx'
// @ts-expect-error - JSX file without type definitions
import DashboardDemo from '@/components/DashboardDemo.jsx'
// @ts-expect-error - JSX file without type definitions
import ROICalculator from '@/components/ROICalculator.jsx'
// @ts-expect-error - JSX file without type definitions
import Features from '@/components/Features.jsx'
// @ts-expect-error - JSX file without type definitions
import TimelineVisualizer from '@/components/TimelineVisualizer.jsx'
// @ts-expect-error - JSX file without type definitions
import Testimonials from '@/components/Testimonials.jsx'
// @ts-expect-error - JSX file without type definitions
import Pricing from '@/components/Pricing.jsx'
// @ts-expect-error - JSX file without type definitions
import Footer from '@/components/Footer.jsx'
// @ts-expect-error - JSX file without type definitions
import TrustBar from '@/components/TrustBar.jsx'
// @ts-expect-error - JSX file without type definitions
import CTABanner from '@/components/CTABanner.jsx'

function Landing() {
  return (
    <div className="app">
      <SharedNavigation variant="landing" />
      <Hero />
      <TrustBar />
      <DashboardDemo />
      <ROICalculator />
      <Features />
      <TimelineVisualizer />
      <Testimonials />
      <Pricing />
      <CTABanner />
      <Footer />
    </div>
  )
}

export default Landing
