import React, { useEffect, useState } from 'react'
import DemoRequestModal from './DemoRequestModal.jsx'

const Pricing = () => {
  const [modalIntent, setModalIntent] = useState(null) // null | 'trial' | 'sales'
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

  const handleButtonClick = (action) => {
    if (action === 'trial') {
      setModalIntent('trial')
    } else if (action === 'sales') {
      setModalIntent('sales')
    } else {
      setModalIntent(null)
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: '$299',
      period: 'per project/month',
      features: [
        'Up to 5 projects',
        'Basic project management',
        'Team collaboration',
        'Mobile app access',
        'Email support'
      ],
      buttonText: 'Start Free Trial',
      buttonAction: 'trial',
      featured: false
    },
    {
      name: 'Professional',
      price: '$899',
      period: 'per project/month',
      features: [
        'Unlimited projects',
        'Advanced analytics',
        'Risk management tools',
        'API integrations',
        'Priority support'
      ],
      buttonText: 'Start Free Trial',
      buttonAction: 'trial',
      featured: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'tailored pricing',
      features: [
        'Everything in Professional',
        'Custom integrations',
        'Dedicated support',
        'Advanced security',
        'Training & onboarding'
      ],
      buttonText: 'Contact Sales',
      buttonAction: 'sales',
      featured: false
    }
  ]

  return (
    <section id="pricing" className="section-padding bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <span className="section-eyebrow">Pricing</span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6 text-[#0A1B33]">Choose Your Plan</h2>
          <p className="text-xl text-[#505E6B]">
            Flexible pricing to match your project needs and scale
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card fade-in ${plan.featured ? 'featured' : ''}`}>
              {plan.featured && (
                <span className="featured-badge">Most Popular</span>
              )}
              <h3 className="font-display font-bold text-2xl mb-4">{plan.name}</h3>
              <div className="text-5xl font-display font-extrabold mb-2">{plan.price}</div>
              <div className={`mb-8 text-sm uppercase tracking-wide ${plan.featured ? 'text-white/60' : 'text-[#505E6B]'}`}>{plan.period}</div>
              <ul className="text-left space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2.5">
                    <svg className={`w-4 h-4 flex-shrink-0 ${plan.featured ? 'text-[#FCBC45]' : 'text-[#074E84]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={plan.featured ? 'btn-primary btn-gold w-full' : 'btn-secondary w-full'}
                onClick={() => handleButtonClick(plan.buttonAction)}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
      <DemoRequestModal open={modalIntent !== null} intent={modalIntent} onClose={() => setModalIntent(null)} />
    </section>
  )
}

export default Pricing
