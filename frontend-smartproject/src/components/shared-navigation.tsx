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

  return (
    <nav className="cp-topnav">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-5">
          <button
            type="button"
            className="cp-topnav-brand flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent"
            onClick={() => handleNavClick('/')}
          >
            {!isLanding && (
              <img src="/smartproject.png" alt="" className="h-7 w-auto" />
            )}
            <span>ConstructPro</span>
          </button>
          {!isLanding && <AppWorkbenchNav className="hidden md:flex" />}
        </div>

        <div className="hidden shrink-0 items-center gap-4 md:flex">
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
                  className="cp-topnav-link flex items-center gap-1.5 font-semibold text-[var(--copper-400)] hover:text-[var(--copper-400)]"
                >
                  <span>Project testbench</span>
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </a>
              </>
            ) : (
              <>
                <a
                  href={testbenchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cp-topnav-link flex items-center gap-1.5 font-semibold text-[var(--copper-400)] hover:text-[var(--copper-400)]"
                >
                  <span>Project testbench</span>
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
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
              <div className="flex items-center gap-4 border-l border-[var(--border-dark)] pl-4">
                <UserProfile />
              </div>
            ) : (
              <div className="flex items-center gap-3 border-l border-[var(--border-dark)] pl-4">
                <Button
                  variant="outline"
                  onClick={() => handleNavClick('/login')}
                  className="border-[var(--navy-700)] bg-transparent text-[var(--text-on-dark)] hover:bg-[var(--navy-800)]"
                >
                  Sign In
                </Button>
                <Button onClick={() => login('google')} variant="default">
                  Sign Up
                </Button>
              </div>
            )}
        </div>

        <div className="md:hidden">
          <button
            type="button"
            className="text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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

