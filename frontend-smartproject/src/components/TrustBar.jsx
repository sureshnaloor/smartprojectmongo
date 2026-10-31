import React, { useEffect } from 'react'

const TrustBar = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, { threshold: 0.2 })

    const elements = document.querySelectorAll('.trustbar .fade-in')
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [])

  const stats = [
    { value: '500+', label: 'Projects Delivered' },
    { value: '$4.2B', label: 'Total Value Managed' },
    { value: '98%', label: 'On-time Completion' },
    { value: '35%', label: 'Avg. Cost Reduction' }
  ]

  const clients = [
    'SKYBUILD', 'MERIDIAN EPC', 'ATLAS INFRA', 'VERTEX GROUP', 'NORTHGATE', 'HELIX ENGINEERING'
  ]

  return (
    <section className="trustbar relative bg-white border-b border-[#E7E3F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="fade-in text-center lg:text-left lg:flex lg:items-center lg:gap-4">
              <div className="font-display text-4xl lg:text-5xl font-extrabold text-[#074E84]">{stat.value}</div>
              <div className="text-xs uppercase tracking-[0.14em] text-[#505E6B] mt-1 lg:mt-0 lg:max-w-[120px]">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="fade-in">
          <p className="text-center text-xs uppercase tracking-[0.22em] text-[#505E6B]/70 mb-8">
            Trusted by leading EPC &amp; construction firms worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
            {clients.map((client, i) => (
              <span key={i} className="font-display text-lg font-bold tracking-[0.12em] text-[#0A1B33]/30 hover:text-[#0A1B33]/60 transition-colors duration-300 cursor-default">
                {client}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TrustBar
