import React, { useEffect } from 'react'

const Pricing = () => {
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
      alert('Free trial signup coming soon! Please contact our sales team for immediate access.')
    } else if (action === 'sales') {
      alert('Sales contact form coming soon! Please call 1-800-CONSTRUCT or email sales@constructpro.com')
    } else {
      alert('Demo request functionality - integrate with your backend')
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
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Choose Your Plan</h2>
          <p className="text-xl text-gray-600">
            Flexible pricing to match your project needs and scale
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card fade-in ${plan.featured ? 'featured' : ''}`}>
              <h3 className="font-semibold text-2xl mb-4">{plan.name}</h3>
              <div className="text-4xl font-bold mb-2">{plan.price}</div>
              <div className="text-gray-500 mb-6">{plan.period}</div>
              <ul className="text-left space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                className={plan.featured ? 'btn-primary w-full' : 'btn-secondary w-full'}
                onClick={() => handleButtonClick(plan.buttonAction)}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Pricing
