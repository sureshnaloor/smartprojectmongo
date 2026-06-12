import React, { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/contexts/auth-context'
import { UserProfile } from '@/components/user-profile'
import { Button } from '@/components/ui/button'
import { ArrowUpRight } from 'lucide-react'
import { AppWorkbenchNav, AppWorkbenchNavMobile } from '@/components/app-workbench-nav'

interface SharedNavigationProps {
  variant?: 'landing' | 'app'
}

export const SharedNavigation: React.FC<SharedNavigationProps> = ({ variant = 'app' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [location, setLocation] = useLocation()
  const { authenticated, user, login } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      const compact = window.scrollY > 40
      setIsScrolled(compact)

      const root = document.documentElement
      if (compact) {
        root.classList.add('header-compact')
      } else {
        root.classList.remove('header-compact')
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    // Only use smooth scroll on landing page
    if (variant === 'landing' && location === '/') {
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
  }

  const handleNavClick = (path: string) => {
    setLocation(path)
    setMobileMenuOpen(false)
  }

  const isLanding = variant === 'landing'
  const testbenchHref = authenticated ? '/newlanding' : '/login'
  const navBgClass = isLanding
    ? 'bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100'
    : 'bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100'
  const navElevationClass = isScrolled ? 'shadow-md' : 'shadow-sm'
  const navHeightClass = isScrolled ? 'h-12' : 'h-16'
  const brandTextSizeClass = isScrolled ? 'text-xl' : 'text-2xl'
  const logoSizeClass = isScrolled ? 'h-7' : 'h-8'

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${navBgClass} ${navElevationClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center gap-2 ${navHeightClass} transition-all duration-300`}>
          <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
            <div
              className={`font-display font-bold gradient-text cursor-pointer flex items-center gap-2 transition-all duration-300 shrink-0 ${brandTextSizeClass}`}
              onClick={() => handleNavClick('/')}
            >
              {!isLanding && (
                <img
                  src="/smartproject.png"
                  alt="ConstructPro Logo"
                  className={`${logoSizeClass} w-auto mr-2 transition-all duration-300`}
                />
              )}
              <span>ConstructPro</span>
            </div>
            {!isLanding && (
              <AppWorkbenchNav className="hidden md:flex" />
            )}
          </div>

          <div className="hidden md:flex items-center space-x-4 lg:space-x-6 shrink-0">
            {/* Navigation Links */}
            {isLanding ? (
              <>
                <a
                  href="#features"
                  className="nav-link text-slate-100 hover:text-slate-50"
                  onClick={(e) => handleSmoothScroll(e, '#features')}
                >
                  Features
                </a>
                <a
                  href="#demo"
                  className="nav-link text-slate-100 hover:text-slate-50"
                  onClick={(e) => handleSmoothScroll(e, '#demo')}
                >
                  Demo
                </a>
                <a
                  href="#pricing"
                  className="nav-link text-slate-100 hover:text-slate-50"
                  onClick={(e) => handleSmoothScroll(e, '#pricing')}
                >
                  Pricing
                </a>
                <a
                  href="#contact"
                  className="nav-link text-slate-100 hover:text-slate-50"
                  onClick={(e) => handleSmoothScroll(e, '#contact')}
                >
                  Contact
                </a>
                <a
                  href={testbenchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link flex items-center gap-1.5 text-teal-300 hover:text-teal-200 font-semibold"
                >
                  <span>Project testbench</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <>
                <a
                  href={testbenchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link flex items-center gap-1.5 text-teal-300 hover:text-teal-200 font-semibold"
                >
                  <span>Project testbench</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                {/* {authenticated && (
                  <>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/activity-master')}
                    >
                      Activity Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/task-master')}
                    >
                      Task Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/resource-master')}
                    >
                      Resource Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/material-master')}
                    >
                      Material Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/service-master')}
                    >
                      Service Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/vendor-master')}
                    >
                      Vendor Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/employee-master')}
                    >
                      Employee Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/equipment-master')}
                    >
                      Equipment Master
                    </button>
                    <button 
                      className="nav-link border-none bg-transparent p-0"
                      onClick={() => handleNavClick('/collab')}
                    >
                      Collaboration
                    </button>
                  </>
                )} */}
              </>
            )}

            {/* Auth Section */}
            {authenticated ? (
              <div className="flex items-center gap-4 pl-4 border-l border-slate-700 text-slate-100">
                <UserProfile />
              </div>
            ) : (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700 text-slate-100">
                <Button
                  variant="outline"
                  onClick={() => handleNavClick('/login')}
                  className="border-slate-600 text-slate-100 hover:bg-slate-800/60"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => login('google')}
                  variant="default"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4">
          <div className="space-y-3">
            {isLanding ? (
              <>
                <a
                  href="#features"
                  className="block py-2 text-gray-700 hover:text-orange-600"
                  onClick={(e) => handleSmoothScroll(e, '#features')}
                >
                  Features
                </a>
                <a
                  href="#demo"
                  className="block py-2 text-gray-700 hover:text-orange-600"
                  onClick={(e) => handleSmoothScroll(e, '#demo')}
                >
                  Demo
                </a>
                <a
                  href="#pricing"
                  className="block py-2 text-gray-700 hover:text-orange-600"
                  onClick={(e) => handleSmoothScroll(e, '#pricing')}
                >
                  Pricing
                </a>
                <a
                  href="#contact"
                  className="block py-2 text-gray-700 hover:text-orange-600"
                  onClick={(e) => handleSmoothScroll(e, '#contact')}
                >
                  Contact
                </a>
                <a
                  href={testbenchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-teal-600 font-semibold flex items-center gap-1.5"
                >
                  <span>Project testbench</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <>
                <a
                  href={testbenchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-left py-2 text-teal-600 font-semibold flex items-center gap-1.5"
                >
                  <span>Project testbench</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <div className="rounded-lg bg-slate-900 p-3 -mx-1">
                  <AppWorkbenchNavMobile />
                </div>
              </>
            )}

            {/* Mobile Auth Section */}
            <div className="pt-4 border-t border-gray-200">
              {authenticated ? (
                <div className="flex items-center gap-2">
                  <UserProfile />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleNavClick('/login')}
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => login('google')}
                    variant="default"
                    className="w-full"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

