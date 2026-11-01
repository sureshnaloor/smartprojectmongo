import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Twitter,
  ArrowUp,
} from "lucide-react";

const Footer = () => {
  const [, setLocation] = useLocation();
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      id="contact"
      className="bg-ink text-white/80 pt-16 pb-10 border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3.5 mb-4">
              <div
                className="relative w-14 h-14 shrink-0 flex items-center justify-center"
                style={{ perspective: "500px" }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-1 left-2 right-2 h-2 rounded-full mark-floor-shadow"
                />
                <motion.img
                  src="/smartproject-logo-dark.svg"
                  alt="SmartProject by EPCORA Stack mark"
                  className="w-12 h-12 relative z-10 select-none"
                  style={{
                    transformStyle: "preserve-3d",
                    filter:
                      "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 12px rgba(252, 188, 69, 0.35))",
                  }}
                  animate={{
                    rotateY: [0, 360],
                    rotateX: [4, -4, 4],
                    y: [0, -2, 0],
                  }}
                  transition={{
                    rotateY: {
                      duration: 14,
                      repeat: Infinity,
                      ease: "linear",
                    },
                    rotateX: {
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    y: {
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                />
              </div>
              <div>
                <div className="font-display font-black text-2xl tracking-wider leading-none text-3d-gold">
                  SMARTPROJECT
                </div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mt-1">
                  An EPCORA Stack Product
                </div>
                <div className="text-[11px] text-white/75 font-medium tracking-wide mt-0.5 flex flex-wrap items-center gap-x-1">
                  <span>Engineer · Procure · Construct ·</span>
                  <span className="agentically">agentically</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mb-6 max-w-md">
              Enterprise project controls, 9-level WBS governance, Critical Path
              scheduling, Earned Value Management, and cross-project resource
              optimization for EPC and capital construction programs.
            </p>
            <div className="flex items-center gap-2">
              {[
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Twitter, label: "Twitter" },
                { Icon: Github, label: "GitHub" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#overview"
                  aria-label={label}
                  className="w-9 h-9 rounded-sm bg-white/5 hover:bg-gold hover:text-ink flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-wider text-sm mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Product Overview", href: "#overview" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "21 Core Modules", href: "#features" },
                { label: "Product Showcase", href: "#showcase" },
                { label: "Live Control Demo", href: "#demo" },
                { label: "ROI Calculator", href: "#roi" },
                { label: "Engagement & FAQ", href: "#engagement" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="hover:text-gold transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Core Modules */}
          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-wider text-sm mb-4">
              Core Modules
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setLocation("/newlanding")}
                  className="hover:text-gold transition-colors text-left"
                >
                  9-Level WBS &amp; Work Packages
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLocation("/newlanding")}
                  className="hover:text-gold transition-colors text-left"
                >
                  CPM Gantt &amp; PERT Network
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLocation("/newlanding")}
                  className="hover:text-gold transition-colors text-left"
                >
                  Earned Value (CPI / SPI / EAC)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLocation("/newlanding")}
                  className="hover:text-gold transition-colors text-left"
                >
                  Resource Utilization &amp; Timesheets
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLocation("/newlanding")}
                  className="hover:text-gold transition-colors text-left"
                >
                  PR-to-PO Procurement &amp; Masters
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLocation("/newlanding")}
                  className="hover:text-gold transition-colors text-left"
                >
                  HSE, Risk &amp; Lessons Learnt Wiki
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-white uppercase tracking-wider text-sm mb-4">
              Get In Touch
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold shrink-0 mt-1" />
                <span>
                  Global Delivery · Houston · London · Dubai · Bengaluru
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold shrink-0" />
                <a
                  href="tel:+18005550199"
                  className="hover:text-gold transition-colors"
                >
                  +1 (800) 555-0199
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold shrink-0" />
                <a
                  href="mailto:info@epcorastack.com"
                  className="hover:text-gold transition-colors"
                >
                  info@epcorastack.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div>
            © {new Date().getFullYear()} SmartProject · An EPCORA Stack Product.
            All rights reserved.
          </div>
          <button
            type="button"
            onClick={scrollTop}
            className="inline-flex items-center gap-2 text-white/80 hover:text-gold transition-colors"
          >
            <span>Back to top</span>
            <span className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center">
              <ArrowUp className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
