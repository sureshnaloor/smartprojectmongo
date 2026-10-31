import React, { useEffect, useRef, useState } from 'react'
import anime from 'animejs'
import DemoRequestModal from './DemoRequestModal.jsx'

const Hero = () => {
  const heroRef = useRef(null)
  const backgroundRef = useRef(null)
  const [demoOpen, setDemoOpen] = useState(false)

  useEffect(() => {
    // Hero text animation
    anime({
      targets: '.hero-bg h1',
      opacity: [0, 1],
      translateY: [50, 0],
      duration: 1000,
      delay: 400,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.hero-bg .hero-lead',
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      delay: 700,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.hero-bg .hero-eyebrow',
      opacity: [0, 1],
      translateX: [-20, 0],
      duration: 700,
      delay: 250,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.hero-bg .btn-primary, .hero-bg .btn-secondary',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      delay: (el, i) => 1000 + (i * 200),
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.hero-mockup',
      opacity: [0, 1],
      translateY: [60, 0],
      scale: [0.96, 1],
      duration: 1100,
      delay: 600,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.float-card',
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      delay: (el, i) => 1200 + (i * 250),
      easing: 'easeOutQuart'
    })

    // Gentle drift on the background photo
    const kenBurnsAnimation = anime({
      targets: backgroundRef.current,
      scale: [1, 1.08],
      translateX: [0, '2%'],
      duration: 24000,
      easing: 'easeInOutQuad',
      loop: true,
      direction: 'alternate'
    })

    return () => {
      if (kenBurnsAnimation) {
        kenBurnsAnimation.pause()
      }
    }
  }, [])

  const handleRequestDemo = () => {
    setDemoOpen(true)
  }

  const handleViewFeatures = () => {
    const featuresSection = document.querySelector('#features')
    if (featuresSection) {
      const offsetTop = featuresSection.offsetTop - 80
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section ref={heroRef} className="hero-bg relative overflow-hidden">
      {/* Background photo + brand gradients */}
      <div
        ref={backgroundRef}
        className="hero-background-image absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/hero-epcora.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          willChange: 'transform'
        }}
      />
      <div className="hero-overlay absolute inset-0"></div>
      <div className="hero-grid-overlay absolute inset-0 pointer-events-none"></div>

      {/* Gold glow accents */}
      <div className="absolute -top-40 -right-40 w-[540px] h-[540px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(252,188,69,0.14) 0%, transparent 65%)' }}></div>
      <div className="absolute -bottom-56 -left-40 w-[620px] h-[620px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(35,128,198,0.22) 0%, transparent 65%)' }}></div>

      {/* Content — split layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div className="text-left">
            <div className="hero-eyebrow inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-[#FCBC45] animate-pulse"></span>
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-white/85">EPC Project Management Platform</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl xl:text-[4.25rem] font-extrabold text-white leading-[1.06] mb-6 drop-shadow-2xl">
              Transform Your <span className="gradient-text-gold">Construction Projects</span> with Intelligent Management
            </h1>

            <p className="hero-lead text-lg md:text-xl text-white/75 mb-10 max-w-xl leading-relaxed">
              One platform to plan, control cost, allocate resources, and deliver
              complex EPC projects on time — from design to commissioning.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button className="btn-primary btn-gold text-base px-8 py-4 shadow-2xl" onClick={handleRequestDemo}>
                Request Demo
                <svg className="inline-block ml-2 -mt-0.5 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
              <button
                className="btn-secondary btn-ghost text-base px-8 py-4"
                onClick={handleViewFeatures}
              >
                Explore Features
              </button>
            </div>

            {/* Mini proof stats */}
            <div className="flex flex-wrap gap-x-10 gap-y-6">
              {[
                { value: '98%', label: 'On-time delivery' },
                { value: '$4.2B', label: 'Projects managed' },
                { value: '40+', label: 'Countries served' }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="font-display text-3xl font-extrabold text-white">{stat.value}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-white/55 mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: product mockup */}
          <div className="relative hidden lg:block">
            <div className="hero-mockup relative">
              <div className="mockup-frame">
                <div className="mockup-chrome">
                  <span className="w-3 h-3 rounded-full bg-[#FCBC45]"></span>
                  <span className="w-3 h-3 rounded-full bg-white/25"></span>
                  <span className="w-3 h-3 rounded-full bg-white/25"></span>
                  <span className="ml-3 text-[11px] text-white/50 font-mono tracking-wide">app.constructpro.com/dashboard</span>
                </div>
                <img
                  src="/dashboard-preview.png"
                  alt="ConstructPro project dashboard"
                  className="w-full h-auto block"
                />
              </div>

              {/* Floating stat cards */}
              <div className="float-card float-anim-1 absolute -left-10 top-16 bg-white rounded-xl shadow-2xl px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EAF3FB] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#074E84]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0A1B33]">Milestone reached</div>
                  <div className="text-xs text-[#505E6B]">Structure 75% complete</div>
                </div>
              </div>

              <div className="float-card float-anim-2 absolute -right-6 bottom-24 bg-white rounded-xl shadow-2xl px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEF6E4] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#E8A020]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0A1B33]">$1.8M saved</div>
                  <div className="text-xs text-[#505E6B]">Cost variance this quarter</div>
                </div>
              </div>

              <div className="float-card float-anim-3 absolute left-10 -bottom-6 bg-white rounded-xl shadow-2xl px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EAF3FB] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2380C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0A1B33]">142 team members</div>
                  <div className="text-xs text-[#505E6B]">Across 6 subcontractors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #F6F4FF)' }}></div>
      <DemoRequestModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  )
}

export default Hero
