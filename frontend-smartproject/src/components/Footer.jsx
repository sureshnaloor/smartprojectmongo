import React from 'react'

const Footer = () => {
  return (
    <footer id="contact" className="relative overflow-hidden text-white" style={{ background: '#05052D' }}>
      {/* subtle top gold line */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #FCBC45, #2380C6, transparent)' }}></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid md:grid-cols-12 gap-10 mb-14">
          {/* Brand column */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #074E84, #2380C6)' }}>
                <svg className="w-5 h-5 text-[#FCBC45]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8v-5h4v5" />
                </svg>
              </div>
              <span className="font-display text-2xl font-extrabold tracking-tight">Construct<span className="text-[#FCBC45]">Pro</span></span>
            </div>
            <p className="text-white/55 mb-6 leading-relaxed max-w-sm">
              Transforming construction project management through intelligent technology and innovative solutions.
            </p>
            <div className="flex gap-3">
              {[
                { label: 'LinkedIn', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z' },
                { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'YouTube', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' }
              ].map((social, i) => (
                <a key={i} href="#" aria-label={social.label} className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/60 hover:text-[#FCBC45] hover:border-[#FCBC45]/50 transition-colors duration-300">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={social.path} /></svg>
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-display font-bold text-sm uppercase tracking-[0.14em] text-white/90 mb-5">Product</h4>
            <ul className="space-y-3 text-white/55 text-sm">
              <li><a href="#features" className="hover:text-[#FCBC45] transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-[#FCBC45] transition-colors">Pricing</a></li>
              <li><a href="#demo" className="hover:text-[#FCBC45] transition-colors">Demo</a></li>
              <li><a href="#" className="hover:text-[#FCBC45] transition-colors">Integrations</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-display font-bold text-sm uppercase tracking-[0.14em] text-white/90 mb-5">Company</h4>
            <ul className="space-y-3 text-white/55 text-sm">
              <li><a href="#" className="hover:text-[#FCBC45] transition-colors">About</a></li>
              <li><a href="#" className="hover:text-[#FCBC45] transition-colors">Careers</a></li>
              <li><a href="#contact" className="hover:text-[#FCBC45] transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-[#FCBC45] transition-colors">Blog</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="font-display font-bold text-sm uppercase tracking-[0.14em] text-white/90 mb-5">Stay in the loop</h4>
            <p className="text-white/55 text-sm mb-4">Product updates and EPC insights, once a month. No spam.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Work email"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FCBC45]/60 focus:bg-white/10 transition-colors"
              />
              <button type="submit" className="btn-primary btn-gold px-5 py-2.5 text-sm whitespace-nowrap">Subscribe</button>
            </form>
            <div className="mt-6 flex items-center gap-2 text-white/45 text-xs">
              <svg className="w-4 h-4 text-[#2380C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              sales@constructpro.com
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-white/40">
          <p>&copy; 2024 ConstructPro. All rights reserved. Built with precision for the construction industry.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/70 transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
