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
      quote: "SmartProject reduced our project delays by 40% and improved cost control significantly. The real-time insights are invaluable for decision-making.",
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
          <span className="section-eyebrow">Testimonials</span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6 text-[#0A1B33]">Trusted by Industry Leaders</h2>
          <p className="text-xl text-[#505E6B]">
            See what our clients say about transforming their construction projects
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card fade-in">
              <svg className="w-8 h-8 mx-auto mb-4 text-[#FCBC45]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/>
              </svg>
              <div className="flex justify-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-[#FCBC45]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-[#505E6B] mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center font-display font-bold text-white text-lg"
                style={{ background: 'linear-gradient(135deg, #074E84, #2380C6)' }}>
                {testimonial.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="font-bold text-[#0A1B33]">{testimonial.author}</div>
              <div className="text-sm text-[#505E6B]">{testimonial.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
