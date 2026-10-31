import React, { useEffect, useState } from 'react'
import DemoRequestModal from './DemoRequestModal.jsx'

const CTABanner = () => {
  const [demoOpen, setDemoOpen] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, { threshold: 0.2 })

    const elements = document.querySelectorAll('.cta-banner .fade-in')
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [])

  const handleRequestDemo = () => {
    setDemoOpen(true)
  }

  return (
    <section className="cta-banner relative overflow-hidden" style={{
      backgroundImage: 'linear-gradient(rgba(5, 5, 45, 0.86), rgba(10, 27, 51, 0.92)), url(/abstract-epcora.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      {/* decorative glows */}
      <div className="absolute -top-32 right-0 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(252,188,69,0.16) 0%, transparent 65%)' }}></div>
      <div className="absolute -bottom-40 left-0 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(35,128,198,0.25) 0%, transparent 65%)' }}></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#FCBC45]"></span>
          <span className="text-xs font-semibold tracking-[0.18em] uppercase text-white/80">Get started today</span>
        </div>
        <h2 className="fade-in font-display text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
          Ready to build <span className="gradient-text-gold">smarter</span>?
        </h2>
        <p className="fade-in text-lg text-white/70 max-w-2xl mx-auto mb-10">
          Join hundreds of EPC teams delivering projects on time and under budget.
          Set up your first project in minutes — no credit card required.
        </p>
        <div className="fade-in flex flex-col sm:flex-row gap-4 justify-center">
          <button className="btn-primary btn-gold text-base px-10 py-4 shadow-2xl" onClick={handleRequestDemo}>
            Request a Demo
          </button>
          <a href="#pricing" className="btn-secondary btn-ghost text-base px-10 py-4 inline-flex items-center justify-center">
            View Pricing
          </a>
        </div>
        <p className="fade-in mt-8 text-sm text-white/45">
          Free 14-day trial &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; Dedicated onboarding
        </p>
      </div>
      <DemoRequestModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  )
}

export default CTABanner
