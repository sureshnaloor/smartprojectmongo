import React, { useEffect } from 'react'

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
      gradient: 'from-blue-500 to-blue-600'
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
      gradient: 'from-green-500 to-green-600'
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
      gradient: 'from-purple-500 to-purple-600'
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
      gradient: 'from-orange-500 to-orange-600'
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
      gradient: 'from-red-500 to-red-600'
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
      gradient: 'from-teal-500 to-teal-600'
    }
  ]

  return (
    <section id="features" className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Powerful Features</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to manage complex construction projects from conception to completion
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="feature-card fade-in">
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center mb-6`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="font-semibold text-xl mb-4">{feature.title}</h3>
              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                {feature.items.map((item, itemIndex) => (
                  <li key={itemIndex}>• {item}</li>
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
