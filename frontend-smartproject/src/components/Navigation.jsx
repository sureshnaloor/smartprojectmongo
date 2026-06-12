import React, { useState, useEffect } from 'react'
import anime from 'animejs'

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Add scroll effect to header
    const handleScroll = () => {
      const header = document.querySelector('nav')
      if (window.scrollY > 100) {
        header.style.boxShadow = '0 4px 20px rgba(44, 62, 80, 0.1)'
      } else {
        header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault()
    const targetElement = document.querySelector(targetId)
    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 80
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
    }
    setMobileMenuOpen(false)
  }

  const handleRequestDemo = () => {
    // This will be handled by a modal component or navigation
    alert('Demo request functionality - integrate with your backend')
  }

  return (
    <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="font-display text-2xl font-bold gradient-text">ConstructPro</div>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="nav-link text-sm flex items-center gap-2" onClick={(e) => handleSmoothScroll(e, '#features')}>
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l.518 1.597a1 1 0 00.95.69h1.68c.969 0 1.371 1.24.588 1.81l-1.36.987a1 1 0 00-.364 1.118l.518 1.597c.3.921-.755 1.688-1.54 1.118l-1.36-.987a1 1 0 00-1.176 0l-1.36.987c-.784.57-1.84-.197-1.54-1.118l.518-1.597a1 1 0 00-.364-1.118L2.233 7.024c-.783-.57-.38-1.81.588-1.81h1.68a1 1 0 00.95-.69l.518-1.597z" />
              </svg>
              <span>Features</span>
            </a>
            <a href="#demo" className="nav-link text-sm flex items-center gap-2" onClick={(e) => handleSmoothScroll(e, '#demo')}>
              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M4.018 14L14.41 9 4.018 4z" />
              </svg>
              <span>Demo</span>
            </a>
            <a href="#pricing" className="nav-link text-sm flex items-center gap-2" onClick={(e) => handleSmoothScroll(e, '#pricing')}>
              <svg className="w-4 h-4 text-sky-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M11 17a1 1 0 01-1 1H6a2 2 0 01-2-2v-5a1 1 0 011-1h5a2 2 0 012 2v5z" />
                <path d="M15 7a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Pricing</span>
            </a>
            <a href="#contact" className="nav-link text-sm flex items-center gap-2" onClick={(e) => handleSmoothScroll(e, '#contact')}>
              <svg className="w-4 h-4 text-rose-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M2.94 6.94a10 10 0 1114.12 0L10 13.99 2.94 6.94z" />
              </svg>
              <span>Contact</span>
            </a>
            <button className="btn-primary text-sm px-3 py-1.5" onClick={handleRequestDemo}>
              Request Demo
            </button>
          </div>
          <div className="md:hidden">
            <button 
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-2">
          <div className="space-y-2">
            <a 
              href="#features" 
              className="block py-2 text-gray-700 hover:text-orange-600 flex items-center gap-2 text-sm"
              onClick={(e) => handleSmoothScroll(e, '#features')}
            >
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l.518 1.597a1 1 0 00.95.69h1.68c.969 0 1.371 1.24.588 1.81l-1.36.987a1 1 0 00-.364 1.118l.518 1.597c.3.921-.755 1.688-1.54 1.118l-1.36-.987a1 1 0 00-1.176 0l-1.36.987c-.784.57-1.84-.197-1.54-1.118l.518-1.597a1 1 0 00-.364-1.118L2.233 7.024c-.783-.57-.38-1.81.588-1.81h1.68a1 1 0 00.95-.69l.518-1.597z" />
              </svg>
              <span>Features</span>
            </a>
            <a 
              href="#demo" 
              className="block py-2 text-gray-700 hover:text-orange-600 flex items-center gap-2 text-sm"
              onClick={(e) => handleSmoothScroll(e, '#demo')}
            >
              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M4.018 14L14.41 9 4.018 4z" />
              </svg>
              <span>Demo</span>
            </a>
            <a 
              href="#pricing" 
              className="block py-2 text-gray-700 hover:text-orange-600 flex items-center gap-2 text-sm"
              onClick={(e) => handleSmoothScroll(e, '#pricing')}
            >
              <svg className="w-4 h-4 text-sky-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M11 17a1 1 0 01-1 1H6a2 2 0 01-2-2v-5a1 1 0 011-1h5a2 2 0 012 2v5z" />
                <path d="M15 7a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Pricing</span>
            </a>
            <a 
              href="#contact" 
              className="block py-2 text-gray-700 hover:text-orange-600 flex items-center gap-2 text-sm"
              onClick={(e) => handleSmoothScroll(e, '#contact')}
            >
              <svg className="w-4 h-4 text-rose-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M2.94 6.94a10 10 0 1114.12 0L10 13.99 2.94 6.94z" />
              </svg>
              <span>Contact</span>
            </a>
            <button className="btn-primary w-full mt-4" onClick={handleRequestDemo}>
              Request Demo
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navigation
