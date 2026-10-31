import React, { useEffect } from 'react'

const CheckIcon = () => (
  <svg className="w-4 h-4 text-[#E8A020] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const Features = () => {
  useEffect(() => {
    // Fade in animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          // Stagger animation for multiple elements
          const siblings = entry.target.parentElement.querySelectorAll('.fade-in')
          siblings.forEach((sibling, index) => {
            setTimeout(() => {
              sibling.classList.add('visible')
            }, index * 100)
          })
        }
      })
    }, { threshold: 0.1 })

    const elements = document.querySelectorAll('.fade-in')
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [])

  const features = [
    {
      icon: '📋',
      title: 'Project Planning & Scheduling',
      description: 'Advanced Gantt charts, critical path analysis, and resource optimization tools to keep your projects on schedule.',
      items: [
        'Dynamic scheduling algorithms',
        'Resource leveling and smoothing',
        'Milestone tracking',
        'Dependency management'
      ],
      chip: 'chip-blue'
    },
    {
      icon: '💰',
      title: 'Cost Control & Budget Management',
      description: 'Real-time budget tracking, cost forecasting, and variance analysis to maintain financial control throughout the project lifecycle.',
      items: [
        'Earned value management',
        'Cost variance analysis',
        'Change order tracking',
        'Cash flow projections'
      ],
      chip: 'chip-gold'
    },
    {
      icon: '👥',
      title: 'Resource Allocation & Optimization',
      description: 'Intelligent resource management ensuring optimal utilization of personnel, equipment, and materials across all project phases.',
      items: [
        'Skills-based assignment',
        'Equipment utilization tracking',
        'Material procurement planning',
        'Capacity planning'
      ],
      chip: 'chip-navy'
    },
    {
      icon: '🤝',
      title: 'Real-time Collaboration',
      description: 'Seamless communication and document sharing across all stakeholders, from field workers to executives.',
      items: [
        'Unified communication hub',
        'Document version control',
        'Mobile field reporting',
        'Stakeholder portals'
      ],
      chip: 'chip-navy'
    },
    {
      icon: '⚠️',
      title: 'Risk Management & Analytics',
      description: 'Proactive risk identification, assessment, and mitigation strategies powered by predictive analytics and machine learning.',
      items: [
        'Risk probability analysis',
        'Impact assessment matrices',
        'Mitigation planning',
        'Performance dashboards'
      ],
      chip: 'chip-blue'
    },
    {
      icon: '📱',
      title: 'Mobile Field Management',
      description: 'Empower your field teams with mobile tools for real-time data collection, progress tracking, and issue reporting.',
      items: [
        'Offline data collection',
        'GPS-based location tracking',
        'Photo documentation',
        'Digital forms and checklists'
      ],
      chip: 'chip-gold'
    }
  ]

  return (
    <section id="features" className="section-padding relative" style={{ background: 'linear-gradient(180deg, #F6F4FF 0%, #ffffff 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <span className="section-eyebrow">Capabilities</span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6 text-[#0A1B33]">Powerful Features</h2>
          <p className="text-xl text-[#505E6B] max-w-3xl mx-auto">
            Everything you need to manage complex construction projects from conception to completion
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="feature-card fade-in">
              <div className={`icon-chip ${feature.chip}`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="font-display font-bold text-xl mb-3 text-[#0A1B33]">{feature.title}</h3>
              <p className="text-[#505E6B] mb-5 leading-relaxed">
                {feature.description}
              </p>
              <ul className="text-sm text-[#505E6B] space-y-2">
                {feature.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2">
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
