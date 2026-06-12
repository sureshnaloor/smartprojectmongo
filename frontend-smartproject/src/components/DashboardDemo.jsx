import React, { useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import anime from 'animejs'

const DashboardDemo = () => {
  const [activeView, setActiveView] = useState('overview')
  const dashboardContentRef = useRef(null)

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

  const handleViewChange = (view) => {
    anime({
      targets: dashboardContentRef.current,
      opacity: [1, 0],
      duration: 300,
      complete: () => {
        setActiveView(view)
        anime({
          targets: dashboardContentRef.current,
          opacity: [0, 1],
          duration: 300
        })
      }
    })
  }

  const getGanttOption = () => ({
    title: {
      text: 'Project Timeline',
      left: 'center',
      textStyle: {
        color: '#2C3E50',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const data = params[0]
        return `${data.name}<br/>Start: ${new Date(data.value[1]).toLocaleDateString()}<br/>End: ${new Date(data.value[2]).toLocaleDateString()}<br/>Progress: ${data.value[3]}%`
      }
    },
    grid: {
      left: '15%',
      right: '10%',
      bottom: '15%',
      top: '20%'
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value) => {
          const date = new Date(value)
          return (date.getMonth() + 1) + '/' + date.getDate()
        }
      }
    },
    yAxis: {
      type: 'category',
      data: ['Foundation', 'Structure', 'MEP', 'Finishes', 'Landscaping']
    },
    series: [{
      type: 'custom',
      renderItem: (params, api) => {
        const categoryIndex = api.value(0)
        const start = api.coord([api.value(1), categoryIndex])
        const end = api.coord([api.value(2), categoryIndex])
        const height = api.size([0, 1])[1] * 0.6
        
        const progress = api.value(3) / 100
        const progressWidth = (end[0] - start[0]) * progress
        
        return {
          type: 'group',
          children: [{
            type: 'rect',
            shape: {
              x: start[0],
              y: start[1] - height / 2,
              width: end[0] - start[0],
              height: height
            },
            style: {
              fill: '#B87333',
              opacity: 0.3
            }
          }, {
            type: 'rect',
            shape: {
              x: start[0],
              y: start[1] - height / 2,
              width: progressWidth,
              height: height
            },
            style: {
              fill: '#B87333'
            }
          }]
        }
      },
      encode: {
        x: [1, 2],
        y: 0
      },
      data: [
        [0, new Date('2024-01-01').getTime(), new Date('2024-02-15').getTime(), 100],
        [1, new Date('2024-02-01').getTime(), new Date('2024-05-30').getTime(), 75],
        [2, new Date('2024-04-01').getTime(), new Date('2024-07-15').getTime(), 50],
        [3, new Date('2024-06-01').getTime(), new Date('2024-08-30').getTime(), 25],
        [4, new Date('2024-08-01').getTime(), new Date('2024-09-15').getTime(), 0]
      ]
    }]
  })

  const getTimelineOption = () => ({
    title: {
      text: 'Task Completion Timeline',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6']
    },
    yAxis: {
      type: 'value',
      name: 'Tasks Completed'
    },
    series: [{
      data: [8, 12, 15, 18, 22, 24],
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#B87333',
        width: 3
      },
      itemStyle: {
        color: '#B87333'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(184, 115, 51, 0.3)'
          }, {
            offset: 1, color: 'rgba(184, 115, 51, 0.1)'
          }]
        }
      }
    }]
  })

  const getBudgetOption = () => ({
    title: {
      text: 'Budget vs Actual Spend',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: 68, name: 'Spent', itemStyle: { color: '#B87333' } },
        { value: 32, name: 'Remaining', itemStyle: { color: '#7D8471' } }
      ],
      label: {
        show: true,
        formatter: '{b}: {c}%'
      }
    }]
  })

  const getResourceOption = () => ({
    title: {
      text: 'Resource Utilization',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['Engineering', 'Construction', 'Project Mgmt', 'Quality Control']
    },
    yAxis: {
      type: 'value',
      name: 'Utilization %'
    },
    series: [{
      data: [85, 92, 78, 88],
      type: 'bar',
      itemStyle: {
        color: (params) => {
          const colors = ['#B87333', '#7D8471', '#8B4513', '#2C3E50']
          return colors[params.dataIndex]
        }
      }
    }]
  })

  const renderDashboardContent = () => {
    switch(activeView) {
      case 'overview':
        return (
          <div className="gantt-container">
            <ReactECharts option={getGanttOption()} style={{ height: '400px' }} />
          </div>
        )
      case 'timeline':
        return (
          <>
            <div className="chart-container">
              <ReactECharts option={getTimelineOption()} style={{ height: '300px' }} />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">24</div>
                <div className="text-sm text-gray-600">Active Tasks</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">18</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">6</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </>
        )
      case 'budget':
        return (
          <>
            <div className="chart-container">
              <ReactECharts option={getBudgetOption()} style={{ height: '300px' }} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Budget Utilization</div>
                <div className="text-2xl font-bold text-green-600">68%</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Forecast Variance</div>
                <div className="text-2xl font-bold text-blue-600">+2.3%</div>
              </div>
            </div>
          </>
        )
      case 'resources':
        return (
          <>
            <div className="chart-container">
              <ReactECharts option={getResourceOption()} style={{ height: '300px' }} />
            </div>
            <div className="mt-6">
              <h4 className="font-semibold mb-4">Team Allocation</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Engineering</span>
                  <span className="font-mono">12 (27%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Construction</span>
                  <span className="font-mono">20 (44%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Project Management</span>
                  <span className="font-mono">8 (18%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Quality Control</span>
                  <span className="font-mono">5 (11%)</span>
                </div>
              </div>
            </div>
          </>
        )
      case 'risks':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <h4 className="font-semibold text-red-800">Critical Risk</h4>
              <p className="text-red-700">Weather delays expected next month</p>
              <div className="text-sm text-red-600 mt-2">Probability: 85% | Impact: High</div>
            </div>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <h4 className="font-semibold text-orange-800">Medium Risk</h4>
              <p className="text-orange-700">Material delivery delays</p>
              <div className="text-sm text-orange-600 mt-2">Probability: 45% | Impact: Medium</div>
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h4 className="font-semibold text-yellow-800">Low Risk</h4>
              <p className="text-yellow-700">Minor design changes requested</p>
              <div className="text-sm text-yellow-600 mt-2">Probability: 30% | Impact: Low</div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <section id="demo" className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Experience the Platform</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how our intelligent dashboard transforms complex construction projects into manageable, 
            profitable operations with real-time insights and collaborative tools.
          </p>
        </div>
        
        <div className="dashboard-grid fade-in">
          <div className="sidebar">
            <h3 className="font-semibold text-lg mb-4">Project Navigation</h3>
            <div className="space-y-2">
              {[
                { view: 'overview', icon: '📊', label: 'Overview' },
                { view: 'timeline', icon: '📅', label: 'Timeline' },
                { view: 'budget', icon: '💰', label: 'Budget' },
                { view: 'resources', icon: '👥', label: 'Resources' },
                { view: 'risks', icon: '⚠️', label: 'Risks' }
              ].map((item) => (
                <div
                  key={item.view}
                  className={`nav-item ${activeView === item.view ? 'active' : ''}`}
                  onClick={() => handleViewChange(item.view)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="main-content">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-xl">Downtown Office Complex</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">On Track</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">75% Complete</span>
              </div>
            </div>
            
            <div ref={dashboardContentRef} id="dashboard-content">
              {renderDashboardContent()}
            </div>
          </div>
          
          <div className="metrics-panel">
            <h3 className="font-semibold text-lg mb-4">Project Metrics</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Budget</div>
                <div className="text-2xl font-bold text-green-600">$12.5M</div>
                <div className="text-xs text-gray-500">+2.3% from plan</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Timeline</div>
                <div className="text-2xl font-bold text-blue-600">18 months</div>
                <div className="text-xs text-gray-500">On schedule</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Team Size</div>
                <div className="text-2xl font-bold text-purple-600">45 members</div>
                <div className="text-xs text-gray-500">+5 contractors</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Risk Level</div>
                <div className="text-2xl font-bold text-orange-600">Medium</div>
                <div className="text-xs text-gray-500">3 active risks</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DashboardDemo
