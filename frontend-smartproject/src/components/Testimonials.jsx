import React, { useEffect } from 'react'

const Testimonials = () => {
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

  const testimonials = [
    {
      quote: "ConstructPro reduced our project delays by 40% and improved cost control significantly. The real-time insights are invaluable for decision-making.",
      author: "Sarah Johnson",
      role: "Project Director, SkyBuild Construction"
    },
    {
      quote: "The platform's collaboration features have transformed how our teams work together. Communication gaps are virtually eliminated.",
      author: "Michael Chen",
      role: "Operations Manager, Urban Developers"
    },
    {
      quote: "ROI was evident within the first quarter. The risk management tools alone saved us from potential delays worth millions.",
      author: "Emily Rodriguez",
      role: "VP of Construction, Metro Infrastructure"
    }
  ]

  return (
    <section className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Trusted by Industry Leaders</h2>
          <p className="text-xl text-gray-600">
            See what our clients say about transforming their construction projects
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card fade-in">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <blockquote className="text-gray-600 mb-4">
                "{testimonial.quote}"
              </blockquote>
              <div className="font-semibold">{testimonial.author}</div>
              <div className="text-sm text-gray-500">{testimonial.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
