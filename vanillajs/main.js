// ConstructPro - Main JavaScript File
// Dashboard and Project Management Functionality

// Global state management
const AppState = {
    projects: [],
    filteredProjects: [],
    currentFilter: 'all',
    currentSort: 'date',
    searchQuery: '',
    budgetChart: null
};

// Sample project data
const sampleProjects = [
    {
        id: 1,
        name: "Highway Extension Project",
        status: "active",
        progress: 65,
        budget: { allocated: 2500000, spent: 1800000 },
        startDate: "2024-04-15",
        endDate: "2025-04-15",
        image: "./resources/project-1.jpg",
        description: "Major highway extension connecting urban areas",
        wbsCount: 4,
        taskCount: 47,
        manager: "Sarah Johnson",
        location: "Downtown District"
    },
    {
        id: 2,
        name: "Office Complex Construction",
        status: "active",
        progress: 40,
        budget: { allocated: 5200000, spent: 2100000 },
        startDate: "2024-05-01",
        endDate: "2025-11-01",
        image: "./resources/project-2.jpg",
        description: "Modern office complex with sustainable design",
        wbsCount: 8,
        taskCount: 89,
        manager: "Michael Chen",
        location: "Business District"
    },
    {
        id: 3,
        name: "Residential Development",
        status: "planning",
        progress: 15,
        budget: { allocated: 8100000, spent: 1200000 },
        startDate: "2024-06-01",
        endDate: "2026-06-01",
        image: "./resources/project-3.jpg",
        description: "Multi-unit residential development project",
        wbsCount: 6,
        taskCount: 156,
        manager: "Emily Rodriguez",
        location: "Suburban Area"
    },
    {
        id: 4,
        name: "Bridge Rehabilitation",
        status: "active",
        progress: 80,
        budget: { allocated: 1800000, spent: 1500000 },
        startDate: "2024-06-15",
        endDate: "2025-02-15",
        image: "./resources/project-1.jpg",
        description: "Structural rehabilitation of aging bridge infrastructure",
        wbsCount: 3,
        taskCount: 34,
        manager: "David Thompson",
        location: "River Crossing"
    },
    {
        id: 5,
        name: "School Campus Renovation",
        status: "planning",
        progress: 5,
        budget: { allocated: 3200000, spent: 160000 },
        startDate: "2024-08-01",
        endDate: "2025-08-01",
        image: "./resources/project-2.jpg",
        description: "Complete renovation of educational facilities",
        wbsCount: 7,
        taskCount: 78,
        manager: "Lisa Wang",
        location: "Educational District"
    },
    {
        id: 6,
        name: "Industrial Warehouse",
        status: "completed",
        progress: 100,
        budget: { allocated: 1900000, spent: 1850000 },
        startDate: "2024-01-01",
        endDate: "2024-10-31",
        image: "./resources/project-3.jpg",
        description: "Large-scale industrial warehouse construction",
        wbsCount: 5,
        taskCount: 67,
        manager: "Robert Kim",
        location: "Industrial Zone"
    }
];

// Recent activity data
const recentActivity = [
    {
        id: 1,
        project: "Highway Extension Project",
        action: "Completed Task",
        description: "Finished rough grading for north section",
        timestamp: "2 hours ago",
        type: "task",
        user: "John Smith"
    },
    {
        id: 2,
        project: "Office Complex Construction",
        action: "Budget Update",
        description: "Added $150K for additional steel reinforcement",
        timestamp: "4 hours ago",
        type: "budget",
        user: "Michael Chen"
    },
    {
        id: 3,
        project: "Bridge Rehabilitation",
        action: "Milestone Reached",
        description: "Completed structural assessment phase",
        timestamp: "6 hours ago",
        type: "milestone",
        user: "Sarah Johnson"
    },
    {
        id: 4,
        project: "Residential Development",
        action: "New WBS Added",
        description: "Created infrastructure work package",
        timestamp: "1 day ago",
        type: "wbs",
        user: "Emily Rodriguez"
    },
    {
        id: 5,
        project: "School Campus Renovation",
        action: "Task Assignment",
        description: "Assigned electrical planning to contractor team",
        timestamp: "1 day ago",
        type: "assignment",
        user: "Lisa Wang"
    }
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    AppState.projects = [...sampleProjects];
    AppState.filteredProjects = [...sampleProjects];
    
    // Initialize components
    initializeAnimations();
    initializeMetrics();
    initializeProjectGrid();
    initializeBudgetChart();
    initializeRecentActivity();
    initializeEventListeners();
    
    // Start particle background animation
    initializeParticleBackground();
    
    console.log('ConstructPro Dashboard initialized successfully');
}

function initializeAnimations() {
    // Initialize Splitting.js for text animations
    Splitting();
    
    // Animate hero text
    const heroTitle = document.querySelector('[data-splitting]');
    if (heroTitle) {
        const chars = heroTitle.querySelectorAll('.char');
        anime({
            targets: chars,
            opacity: [0, 1],
            translateY: [50, 0],
            delay: anime.stagger(50),
            duration: 800,
            easing: 'easeOutExpo'
        });
    }
    
    // Animate metric cards on scroll
    const metricCards = document.querySelectorAll('.metric-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                anime({
                    targets: entry.target,
                    opacity: [0, 1],
                    translateY: [30, 0],
                    delay: index * 100,
                    duration: 600,
                    easing: 'easeOutExpo'
                });
            }
        });
    });
    
    metricCards.forEach(card => observer.observe(card));
}

function initializeMetrics() {
    // Animate metric counters
    animateCounter('activeProjects', 12, 2000);
    animateCounter('totalBudget', 24.7, 2500, 'M', '$');
    animateCounter('completionRate', 68, 2000, '%');
    animateCounter('activeTasks', 247, 2200);
    
    // Initialize typed.js for dynamic text
    const typedElement = document.querySelector('.typing-text');
    if (typedElement) {
        new Typed('.typing-text', {
            strings: ['Dashboard', 'Analytics', 'Management', 'Planning'],
            typeSpeed: 100,
            backSpeed: 50,
            backDelay: 2000,
            loop: true
        });
    }
}

function animateCounter(elementId, targetValue, duration, suffix = '', prefix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (targetValue - startValue) * easeOut;
        
        if (suffix === 'M') {
            element.textContent = prefix + currentValue.toFixed(1) + suffix;
        } else if (suffix === '%') {
            element.textContent = Math.round(currentValue) + suffix;
        } else {
            element.textContent = prefix + Math.round(currentValue) + suffix;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

function initializeProjectGrid() {
    renderProjectGrid();
}

function renderProjectGrid() {
    const grid = document.getElementById('projectGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    AppState.filteredProjects.forEach((project, index) => {
        const projectCard = createProjectCard(project);
        grid.appendChild(projectCard);
        
        // Animate card entrance
        anime({
            targets: projectCard,
            opacity: [0, 1],
            translateY: [30, 0],
            delay: index * 100,
            duration: 600,
            easing: 'easeOutExpo'
        });
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card card-hover rounded-xl overflow-hidden cursor-pointer';
    card.onclick = () => navigateToProject(project.id);
    
    const budgetUtilization = ((project.budget.spent / project.budget.allocated) * 100).toFixed(0);
    const statusClass = `status-${project.status}`;
    const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);
    
    card.innerHTML = `
        <div class="relative">
            <img src="${project.image}" alt="${project.name}" class="w-full h-48 object-cover">
            <div class="absolute top-4 right-4">
                <span class="status-indicator ${statusClass}"></span>
                <span class="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                    ${statusText}
                </span>
            </div>
            <div class="absolute bottom-4 left-4 right-4">
                <div class="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-600">Progress</span>
                        <span class="text-sm font-bold text-gray-900">${project.progress}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="progress-bar h-2 rounded-full" style="width: ${project.progress}%"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2" style="font-family: 'Poppins', sans-serif;">${project.name}</h3>
            <p class="text-gray-600 text-sm mb-4 line-clamp-2">${project.description}</p>
            
            <div class="space-y-3 mb-4">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-500">Budget Utilization</span>
                    <span class="text-sm font-semibold text-gray-900">${budgetUtilization}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="budget-progress h-2 rounded-full" style="width: ${budgetUtilization}%"></div>
                </div>
                <div class="flex justify-between text-sm text-gray-500">
                    <span>$${(project.budget.spent / 1000000).toFixed(1)}M spent</span>
                    <span>$${(project.budget.allocated / 1000000).toFixed(1)}M total</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center text-sm text-gray-500">
                <span>${project.wbsCount} WBS • ${project.taskCount} Tasks</span>
                <span>${project.location}</span>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500">Manager: ${project.manager}</span>
                    <button class="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        View Details →
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

function initializeBudgetChart() {
    const chartElement = document.getElementById('budgetChart');
    if (!chartElement) return;
    
    AppState.budgetChart = echarts.init(chartElement);
    
    const budgetData = [
        { name: 'Highway Projects', value: 4.3, color: '#475569' },
        { name: 'Commercial Buildings', value: 5.2, color: '#F59E0B' },
        { name: 'Residential', value: 8.1, color: '#10B981' },
        { name: 'Infrastructure', value: 3.6, color: '#EA580C' },
        { name: 'Industrial', value: 2.8, color: '#3B82F6' },
        { name: 'Educational', value: 0.7, color: '#8B5CF6' }
    ];
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: ${c}M ({d}%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E5E7EB',
            textStyle: { color: '#374151' }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: { color: '#6B7280' }
        },
        series: [
            {
                name: 'Budget Allocation',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['60%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '18',
                        fontWeight: 'bold',
                        formatter: '{b}\n${c}M'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                labelLine: {
                    show: false
                },
                data: budgetData.map(item => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: { color: item.color }
                }))
            }
        ]
    };
    
    AppState.budgetChart.setOption(option);
    
    // Make chart responsive
    window.addEventListener('resize', () => {
        if (AppState.budgetChart) {
            AppState.budgetChart.resize();
        }
    });
}

function initializeRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    activityContainer.innerHTML = '';
    
    recentActivity.forEach((activity, index) => {
        const activityItem = createActivityItem(activity);
        activityContainer.appendChild(activityItem);
        
        // Animate activity items
        anime({
            targets: activityItem,
            opacity: [0, 1],
            translateX: [-30, 0],
            delay: index * 150,
            duration: 600,
            easing: 'easeOutExpo'
        });
    });
}

function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer';
    
    const iconMap = {
        task: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        budget: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
        milestone: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        wbs: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
        assignment: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
    };
    
    const colorMap = {
        task: 'text-green-600 bg-green-100',
        budget: 'text-amber-600 bg-amber-100',
        milestone: 'text-blue-600 bg-blue-100',
        wbs: 'text-purple-600 bg-purple-100',
        assignment: 'text-gray-600 bg-gray-100'
    };
    
    item.innerHTML = `
        <div class="flex-shrink-0">
            <div class="w-10 h-10 ${colorMap[activity.type]} rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconMap[activity.type]}"></path>
                </svg>
            </div>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-semibold text-gray-900 truncate">${activity.project}</h4>
                <span class="text-xs text-gray-500">${activity.timestamp}</span>
            </div>
            <p class="text-sm font-medium text-gray-700 mb-1">${activity.action}</p>
            <p class="text-sm text-gray-600">${activity.description}</p>
            <p class="text-xs text-gray-500 mt-2">by ${activity.user}</p>
        </div>
    `;
    
    return item;
}

function initializeEventListeners() {
    // Project filter
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', handleProjectFilter);
    }
    
    // Project search
    const projectSearch = document.getElementById('projectSearch');
    if (projectSearch) {
        projectSearch.addEventListener('input', handleProjectSearch);
    }
    
    // Sort projects
    const sortProjects = document.getElementById('sortProjects');
    if (sortProjects) {
        sortProjects.addEventListener('click', handleProjectSort);
    }
}

function handleProjectFilter(event) {
    AppState.currentFilter = event.target.value;
    filterProjects();
}

function handleProjectSearch(event) {
    AppState.searchQuery = event.target.value.toLowerCase();
    filterProjects();
}

function handleProjectSort() {
    AppState.currentSort = AppState.currentSort === 'date' ? 'budget' : 'date';
    sortProjects();
    
    // Update button text
    const sortButton = document.getElementById('sortProjects');
    if (sortButton) {
        sortButton.textContent = AppState.currentSort === 'date' ? 'Sort by Budget' : 'Sort by Date';
    }
}

function filterProjects() {
    AppState.filteredProjects = AppState.projects.filter(project => {
        // Filter by status
        const statusMatch = AppState.currentFilter === 'all' || project.status === AppState.currentFilter;
        
        // Filter by search query
        const searchMatch = AppState.searchQuery === '' || 
            project.name.toLowerCase().includes(AppState.searchQuery) ||
            project.description.toLowerCase().includes(AppState.searchQuery) ||
            project.manager.toLowerCase().includes(AppState.searchQuery);
        
        return statusMatch && searchMatch;
    });
    
    sortProjects();
    renderProjectGrid();
}

function sortProjects() {
    AppState.filteredProjects.sort((a, b) => {
        if (AppState.currentSort === 'date') {
            return new Date(b.startDate) - new Date(a.startDate);
        } else {
            return b.budget.allocated - a.budget.allocated;
        }
    });
}

function navigateToProject(projectId) {
    // Store project ID in localStorage for project detail page
    localStorage.setItem('selectedProjectId', projectId);
    
    // Navigate to project detail page
    window.location.href = 'project.html';
}

function initializeParticleBackground() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    // Create canvas element
    const canvasElement = document.createElement('canvas');
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
    canvas.appendChild(canvasElement);
    
    const ctx = canvasElement.getContext('2d');
    const particles = [];
    
    // Create particles
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvasElement.width,
            y: Math.random() * canvasElement.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = canvasElement.width;
            if (particle.x > canvasElement.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvasElement.height;
            if (particle.y > canvasElement.height) particle.y = 0;
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
    
    // Handle resize
    window.addEventListener('resize', () => {
        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;
    });
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getStatusColor(status) {
    const colors = {
        active: '#10B981',
        planning: '#F59E0B',
        completed: '#475569',
        hold: '#EF4444'
    };
    return colors[status] || '#6B7280';
}

// Export for use in other files
window.ConstructPro = {
    AppState,
    sampleProjects,
    navigateToProject,
    formatCurrency,
    formatDate,
    getStatusColor
};