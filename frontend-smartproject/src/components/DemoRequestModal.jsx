import React, { useEffect, useRef, useState } from 'react'

const TEAM_SIZES = ['1–10', '11–50', '51–200', '201–1,000', '1,000+']

const inputCls =
  'w-full rounded-lg border border-[#E7E3F5] bg-[#F6F4FF] px-4 py-3 text-sm text-[#0A1B33] placeholder-[#505E6B]/50 outline-none transition focus:border-[#2380C6] focus:bg-white focus:ring-2 focus:ring-[#2380C6]/20'

const labelCls = 'block text-xs font-semibold uppercase tracking-[0.12em] text-[#505E6B] mb-2'

const INTENT_COPY = {
  trial: {
    subtitle: "Start your free 14-day trial — we'll have you set up in minutes.",
    note: "Interest: Free trial signup",
  },
  sales: {
    subtitle: "Talk to our sales team about tailored Enterprise pricing.",
    note: "Interest: Enterprise / sales contact",
  },
}

const DemoRequestModal = ({ open, onClose, intent = null }) => {
  const [form, setForm] = useState({ name: '', email: '', company: '', teamSize: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const firstInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setStatus('idle')
    setErrors({})
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    setTimeout(() => firstInputRef.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please enter your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = 'Please enter a valid work email'
    if (!form.company.trim()) errs.company = 'Please enter your company'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          teamSize: form.teamSize,
          interest: intent || 'demo',
          message: [INTENT_COPY[intent]?.note, form.message.trim()].filter(Boolean).join('\n\n'),
        }),
      })
      if (!res.ok) throw new Error('request failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const field = (key) =>
    errors[key] ? <p className="mt-1.5 text-xs font-medium text-red-500">{errors[key]}</p> : null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request a demo"
    >
      <div className="absolute inset-0 bg-[#05052D]/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-[modalIn_.25s_ease-out]">
        {/* header */}
        <div className="relative px-7 pt-7 pb-6" style={{ background: 'linear-gradient(135deg, #074E84 0%, #2380C6 100%)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(252,188,69,0.25) 0%, transparent 65%)' }} />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
          <h3 className="font-display text-2xl font-extrabold text-white">Request a Demo</h3>
          <p className="mt-1 text-sm text-white/70">
            {INTENT_COPY[intent]?.subtitle || 'See ConstructPro in action with your own projects.'}
          </p>
        </div>

        {/* body */}
        <div className="px-7 py-6 max-h-[62vh] overflow-y-auto">
          {status === 'success' ? (
            <div className="text-center py-6">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(252,188,69,0.15)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#E8A020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h4 className="font-display text-xl font-bold text-[#0A1B33]">Request received!</h4>
              <p className="mt-2 text-sm text-[#505E6B] leading-relaxed">
                Thanks{form.name ? `, ${form.name.split(' ')[0]}` : ''} — our team will reach out to
                <span className="font-semibold text-[#0A1B33]"> {form.email} </span>
                within one business day to schedule your demo.
              </p>
              <button
                onClick={onClose}
                className="mt-6 btn-primary btn-gold px-8 py-3 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label htmlFor="demo-name" className={labelCls}>Full name</label>
                <input id="demo-name" ref={firstInputRef} type="text" className={inputCls} placeholder="Jane Contractor" value={form.name} onChange={set('name')} />
                {field('name')}
              </div>
              <div className="mb-4">
                <label htmlFor="demo-email" className={labelCls}>Work email</label>
                <input id="demo-email" type="email" className={inputCls} placeholder="jane@yourcompany.com" value={form.email} onChange={set('email')} />
                {field('email')}
              </div>
              <div className="mb-4">
                <label htmlFor="demo-company" className={labelCls}>Company</label>
                <input id="demo-company" type="text" className={inputCls} placeholder="Acme EPC Ltd." value={form.company} onChange={set('company')} />
                {field('company')}
              </div>
              <div className="mb-4">
                <label htmlFor="demo-team" className={labelCls}>Team size <span className="normal-case font-normal text-[#505E6B]/60">(optional)</span></label>
                <select id="demo-team" className={inputCls} value={form.teamSize} onChange={set('teamSize')}>
                  <option value="">Select team size</option>
                  {TEAM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mb-5">
                <label htmlFor="demo-message" className={labelCls}>What are you working on? <span className="normal-case font-normal text-[#505E6B]/60">(optional)</span></label>
                <textarea id="demo-message" rows={3} className={inputCls + ' resize-none'} placeholder="Tell us about your projects…" value={form.message} onChange={set('message')} />
              </div>

              {status === 'error' && (
                <p className="mb-4 text-sm font-medium text-red-500">
                  Something went wrong saving your request — please try again in a moment.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full btn-primary btn-gold py-3.5 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? 'Sending…' : 'Request Demo'}
              </button>
              <p className="mt-3 text-center text-xs text-[#505E6B]/60">
                We respond within one business day. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default DemoRequestModal
