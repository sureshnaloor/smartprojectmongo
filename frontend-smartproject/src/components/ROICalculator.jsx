import React, { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'

const ROICalculator = () => {
  const [budget, setBudget] = useState(25)
  const [duration, setDuration] = useState(24)
  const [team, setTeam] = useState(50)

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

  const calculateSavings = () => {
    const timeSavePercent = Math.min(25, 10 + (budget * 0.3) + (team * 0.1))
    const costSavePercent = Math.min(15, 5 + (budget * 0.2) + (duration * 0.1))
    const efficiencyGainPercent = Math.min(35, 15 + (team * 0.2) + (duration * 0.15))
    const annualSavings = (budget * 1000000) * (costSavePercent / 100) * (12 / duration)

    return {
      timeSave: timeSavePercent.toFixed(0),
      costSave: costSavePercent.toFixed(0),
      efficiency: efficiencyGainPercent.toFixed(0),
      total: (annualSavings / 1000000).toFixed(1)
    }
  }

  const savings = calculateSavings()

  const getChartOption = () => ({
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['50%', '50%'],
      data: [
        { value: parseFloat(savings.timeSave), name: 'Time Savings', itemStyle: { color: '#10B981' } },
        { value: parseFloat(savings.costSave), name: 'Cost Reduction', itemStyle: { color: '#3B82F6' } },
        { value: parseFloat(savings.efficiency), name: 'Efficiency Gain', itemStyle: { color: '#8B5CF6' } }
      ],
      label: {
        show: true,
        formatter: '{b}\n{c}%'
      }
    }]
  })

  return (
    <section className="section-padding bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Calculate Your ROI</h2>
          <p className="text-xl text-gray-600">
            See how much you can save with intelligent project management
          </p>
        </div>
        
        <div className="roi-calculator fade-in">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-xl mb-6">Project Parameters</h3>
              
              <div className="slider-container">
                <label className="block text-sm font-medium mb-2">Project Budget ($ millions)</label>
                <input 
                  type="range" 
                  className="slider" 
                  min="1" 
                  max="100" 
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>$1M</span>
                  <span>${budget}M</span>
                  <span>$100M</span>
                </div>
              </div>
              
              <div className="slider-container">
                <label className="block text-sm font-medium mb-2">Project Duration (months)</label>
                <input 
                  type="range" 
                  className="slider" 
                  min="6" 
                  max="60" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>6 months</span>
                  <span>{duration} months</span>
                  <span>60 months</span>
                </div>
              </div>
              
              <div className="slider-container">
                <label className="block text-sm font-medium mb-2">Team Size</label>
                <input 
                  type="range" 
                  className="slider" 
                  min="10" 
                  max="200" 
                  value={team}
                  onChange={(e) => setTeam(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>10</span>
                  <span>{team} people</span>
                  <span>200</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-xl mb-6">Projected Savings</h3>
              <div className="chart-container">
                <ReactECharts 
                  option={getChartOption()} 
                  style={{ height: '300px' }}
                />
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-medium">Time Savings</span>
                  <span className="font-bold text-green-600">{savings.timeSave}%</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="font-medium">Cost Reduction</span>
                  <span className="font-bold text-blue-600">{savings.costSave}%</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                  <span className="font-medium">Efficiency Gain</span>
                  <span className="font-bold text-purple-600">{savings.efficiency}%</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Annual Savings</div>
                  <div className="text-3xl font-bold text-orange-600">${savings.total}M</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ROICalculator
