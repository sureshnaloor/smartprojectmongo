import React, { useEffect, useRef } from 'react'
import anime from 'animejs'

const Hero = () => {
  const heroRef = useRef(null)
  const backgroundRef = useRef(null)

  useEffect(() => {
    // Hero text animation
    anime({
      targets: '.hero-bg h1',
      opacity: [0, 1],
      translateY: [50, 0],
      duration: 1000,
      delay: 500,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.hero-bg p',
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      delay: 800,
      easing: 'easeOutQuart'
    })

    anime({
      targets: '.hero-bg .btn-primary, .hero-bg .btn-secondary',
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      delay: (el, i) => 1200 + (i * 200),
      easing: 'easeOutQuart'
    })

    // Ken Burns effect - slow zoom and pan on background
    const kenBurnsAnimation = anime({
      targets: backgroundRef.current,
      scale: [1, 1.15],
      translateX: [0, '5%'],
      translateY: [0, '5%'],
      duration: 20000,
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
    alert('Demo request functionality - integrate with your backend')
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
    <section ref={heroRef} className="hero-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Image */}
      <div 
        ref={backgroundRef}
        className="hero-background-image absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/hero-construction.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          willChange: 'transform'
        }}
      />
      
      {/* Animated Overlay Gradient */}
      <div className="hero-overlay absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/50"></div>
      <div className="hero-overlay-secondary absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/20"></div>
      
      {/* Animated Light Rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="light-ray light-ray-1"></div>
        <div className="light-ray light-ray-2"></div>
        <div className="light-ray light-ray-3"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 fade-in drop-shadow-2xl">
          Transform Your <span className="gradient-text">Construction Projects</span>
        </h1>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mb-8 fade-in drop-shadow-xl">
          with Intelligent Management
        </h2>
        <p className="text-xl md:text-2xl text-white/95 mb-12 max-w-3xl mx-auto fade-in drop-shadow-lg">
          Comprehensive EPC project management platform designed for construction industry leaders. 
          Streamline operations, control costs, and deliver projects on time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in">
          <button className="btn-primary text-lg px-8 py-4 shadow-2xl" onClick={handleRequestDemo}>
            Request Demo
          </button>
          <button 
            className="btn-secondary text-lg px-8 py-4 bg-white/10 border-white text-white hover:bg-white hover:text-gray-900 shadow-xl backdrop-blur-sm"
            onClick={handleViewFeatures}
          >
            View Features
          </button>
        </div>
      </div>
      
      {/* Enhanced Floating Elements with Animation */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/5 rounded-full floating-element-1 backdrop-blur-sm"></div>
      <div className="absolute bottom-20 right-10 w-16 h-16 bg-white/5 rounded-full floating-element-2 backdrop-blur-sm"></div>
      <div className="absolute top-1/2 left-20 w-12 h-12 bg-white/5 rounded-full floating-element-3 backdrop-blur-sm"></div>
      <div className="absolute top-1/3 right-1/4 w-14 h-14 bg-white/5 rounded-full floating-element-4 backdrop-blur-sm"></div>
      
      {/* Subtle Particle Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="particle"
            style={{
              left: `${20 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${15 + i * 2}s`
            }}
          />
        ))}
      </div>
    </section>
  )
}

export default Hero
