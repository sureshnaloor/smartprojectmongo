import React, { useState, useEffect } from 'react'
import anime from 'animejs'

const TimelineVisualizer = () => {
  const [activePhase, setActivePhase] = useState('design')

  useEffect(() => {
    // Fade in animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, { threshold: 0.1 })

    const elements = document.querySelectorAll('.fade-in')
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [])

  const phaseData = {
    design: {
      title: 'Design & Engineering Phase',
      activities: [
        'Architectural and structural design',
        'MEP engineering and coordination',
        'Environmental impact assessments',
        'Permit and approval processes',
        'Value engineering optimization'
      ],
      benefits: [
        'BIM integration and clash detection',
        'Automated drawing management',
        'Regulatory compliance tracking',
        'Design change control',
        'Stakeholder collaboration tools'
      ]
    },
    procurement: {
      title: 'Procurement Phase',
      activities: [
        'Vendor evaluation and selection',
        'Material specification and ordering',
        'Contract negotiation and awarding',
        'Logistics and delivery coordination',
        'Quality assurance planning'
      ],
      benefits: [
        'Supplier performance tracking',
        'Automated procurement workflows',
        'Cost comparison and analysis',
        'Delivery schedule optimization',
        'Inventory management integration'
      ]
    },
    construction: {
      title: 'Construction Phase',
      activities: [
        'Site preparation and mobilization',
        'Foundation and structural work',
        'MEP installation and testing',
        'Interior and exterior finishes',
        'Quality control and inspections'
      ],
      benefits: [
        'Real-time progress tracking',
        'Mobile field reporting',
        'Automated quality checks',
        'Resource optimization',
        'Issue and defect management'
      ]
    },
    commissioning: {
      title: 'Commissioning Phase',
      activities: [
        'Systems testing and balancing',
        'Performance verification',
        'Owner training and documentation',
        'Final inspections and approvals',
        'Project handover and closeout'
      ],
      benefits: [
        'Comprehensive testing protocols',
        'Digital handover packages',
        'Warranty tracking system',
        'Performance analytics',
        'Lessons learned capture'
      ]
    }
  }

  const handlePhaseClick = (phase) => {
    const phaseDetails = document.getElementById('phase-content')
    if (phaseDetails) {
      anime({
        targets: phaseDetails,
        opacity: [1, 0],
        duration: 300,
        complete: () => {
          setActivePhase(phase)
          anime({
            targets: phaseDetails,
            opacity: [0, 1],
            duration: 300
          })
        }
      })
    } else {
      setActivePhase(phase)
    }
  }

  const currentPhase = phaseData[activePhase]

  return (
    <section className="section-padding" style={{ background: '#F6F4FF' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <span className="section-eyebrow">How it works</span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6 text-[#0A1B33]">Project Lifecycle Management</h2>
          <p className="text-xl text-[#505E6B]">
            Navigate through every phase of your construction project with precision and control
          </p>
        </div>

        <div className="timeline-container fade-in">
          <div className="timeline-line"></div>
          <div className="flex justify-between">
            {[
              { phase: 'design', title: 'Design & Engineering', description: 'Conceptual design, detailed engineering, and regulatory approvals' },
              { phase: 'procurement', title: 'Procurement', description: 'Vendor selection, material ordering, and logistics coordination' },
              { phase: 'construction', title: 'Construction', description: 'Site preparation, building execution, and quality control' },
              { phase: 'commissioning', title: 'Commissioning', description: 'Testing, handover, and project closeout activities' }
            ].map((item, idx) => (
              <div
                key={item.phase}
                className={`timeline-item ${activePhase === item.phase ? 'active' : ''}`}
                onClick={() => handlePhaseClick(item.phase)}
              >
                <div className="timeline-dot">
                  <span>{idx + 1}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-2 text-[#0A1B33]">{item.title}</h3>
                <p className="text-sm text-[#505E6B]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="phase-details" className="mt-16 bg-white rounded-2xl p-8 md:p-10 fade-in" style={{ boxShadow: '0 20px 60px rgba(10,27,51,0.10)', border: '1px solid #E7E3F5' }}>
          <div id="phase-content">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1.5 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, #FCBC45, #E8A020)' }}></span>
              <h3 className="font-display font-bold text-2xl text-[#0A1B33]">{currentPhase.title}</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-[0.14em] text-[#074E84] mb-4">Key Activities</h4>
                <ul className="space-y-3 text-[#505E6B]">
                  {currentPhase.activities.map((activity, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-[#074E84] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-[0.14em] text-[#E8A020] mb-4">Platform Benefits</h4>
                <ul className="space-y-3 text-[#505E6B]">
                  {currentPhase.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-[#E8A020] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TimelineVisualizer
