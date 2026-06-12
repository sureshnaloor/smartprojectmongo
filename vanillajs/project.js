// Project Detail Page JavaScript
// WBS Management, Network Diagram, and Interactive Components

// Project-specific data structure
const ProjectData = {
    currentProject: null,
    wbsData: [],
    activities: [],
    tasks: [],
    dependencies: [],
    networkChart: null,
    ganttChart: null
};

// Sample WBS data for Highway Extension Project
const sampleWBSData = [
    {
        id: 'wbs-1',
        name: 'Site Preparation',
        type: 'wbs',
        level: 0,
        expanded: true,
        children: [
            {
                id: 'wp-1-1',
                name: 'Land Clearing',
                type: 'workpackage',
                level: 1,
                budget: { allocated: 150000, spent: 120000 },
                progress: 80,
                children: [
                    {
                        id: 'act-1-1-1',
                        name: 'Tree Removal',
                        type: 'activity',
                        level: 2,
                        duration: 5,
                        startDate: '2024-04-15',
                        endDate: '2024-04-20',
                        status: 'completed',
                        progress: 100,
                        children: [
                            {
                                id: 'task-1-1-1-1',
                                name: 'Clear north section',
                                type: 'task',
                                level: 3,
                                status: 'completed',
                                assignee: 'John Smith',
                                effort: 16
                            },
                            {
                                id: 'task-1-1-1-2',
                                name: 'Clear south section',
                                type: 'task',
                                level: 3,
                                status: 'completed',
                                assignee: 'Mike Johnson',
                                effort: 20
                            }
                        ]
                    },
                    {
                        id: 'act-1-1-2',
                        name: 'Grading',
                        type: 'activity',
                        level: 2,
                        duration: 8,
                        startDate: '2024-04-21',
                        endDate: '2024-04-29',
                        status: 'in-progress',
                        progress: 60,
                        children: [
                            {
                                id: 'task-1-1-2-1',
                                name: 'Rough grading',
                                type: 'task',
                                level: 3,
                                status: 'completed',
                                assignee: 'Sarah Wilson',
                                effort: 32
                            },
                            {
                                id: 'task-1-1-2-2',
                                name: 'Fine grading',
                                type: 'task',
                                level: 3,
                                status: 'in-progress',
                                assignee: 'Tom Brown',
                                effort: 24
                            }
                        ]
                    }
                ]
            },
            {
                id: 'wp-1-2',
                name: 'Utility Relocation',
                type: 'workpackage',
                level: 1,
                budget: { allocated: 200000, spent: 180000 },
                progress: 90,
                children: [
                    {
                        id: 'act-1-2-1',
                        name: 'Water Lines',
                        type: 'activity',
                        level: 2,
                        duration: 6,
                        startDate: '2024-04-25',
                        endDate: '2024-05-01',
                        status: 'completed',
                        progress: 100,
                        children: [
                            {
                                id: 'task-1-2-1-1',
                                name: 'Relocate main water line',
                                type: 'task',
                                level: 3,
                                status: 'completed',
                                assignee: 'Water Dept',
                                effort: 40
                            }
                        ]
                    },
                    {
                        id: 'act-1-2-2',
                        name: 'Electrical',
                        type: 'activity',
                        level: 2,
                        duration: 4,
                        startDate: '2024-04-28',
                        endDate: '2024-05-02',
                        status: 'in-progress',
                        progress: 75,
                        children: [
                            {
                                id: 'task-1-2-2-1',
                                name: 'Underground electrical work',
                                type: 'task',
                                level: 3,
                                status: 'in-progress',
                                assignee: 'Electric Co',
                                effort: 32
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'wbs-2',
        name: 'Foundation',
        type: 'wbs',
        level: 0,
        expanded: false,
        children: [
            {
                id: 'wp-2-1',
                name: 'Excavation',
                type: 'workpackage',
                level: 1,
                budget: { allocated: 300000, spent: 150000 },
                progress: 50,
                children: [
                    {
                        id: 'act-2-1-1',
                        name: 'Site Excavation',
                        type: 'activity',
                        level: 2,
                        duration: 10,
                        startDate: '2024-05-03',
                        endDate: '2024-05-13',
                        status: 'in-progress',
                        progress: 50,
                        children: [
                            {
                                id: 'task-2-1-1-1',
                                name: 'Excavate main roadway',
                                type: 'task',
                                level: 3,
                                status: 'in-progress',
                                assignee: 'Excavation Team',
                                effort: 80
                            }
                        ]
                    }
                ]
            },
            {
                id: 'wp-2-2',
                name: 'Base Layer',
                type: 'workpackage',
                level: 1,
                budget: { allocated: 400000, spent: 0 },
                progress: 0,
                children: [
                    {
                        id: 'act-2-2-1',
                        name: 'Aggregate Base',
                        type: 'activity',
                        level: 2,
                        duration: 12,
                        startDate: '2024-05-14',
                        endDate: '2024-05-26',
                        status: 'not-started',
                        progress: 0,
                        children: [
                            {
                                id: 'task-2-2-1-1',
                                name: 'Install aggregate base',
                                type: 'task',
                                level: 3,
                                status: 'not-started',
                                assignee: 'TBD',
                                effort: 96
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'wbs-3',
        name: 'Pavement',
        type: 'wbs',
        level: 0,
        expanded: false,
        children: [
            {
                id: 'wp-3-1',
                name: 'Asphalt Base',
                type: 'workpackage',
                level: 1,
                budget: { allocated: 800000, spent: 0 },
                progress: 0,
                children: [
                    {
                        id: 'act-3-1-1',
                        name: 'Asphalt Installation',
                        type: 'activity',
                        level: 2,
                        duration: 15,
                        startDate: '2024-05-27',
                        endDate: '2024-06-11',
                        status: 'not-started',
                        progress: 0,
                        children: []
                    }
                ]
            }
        ]
    },
    {
        id: 'wbs-4',
        name: 'Signage',
        type: 'wbs',
        level: 0,
        expanded: false,
        children: [
            {
                id: 'wp-4-1',
                name: 'Regulatory Signs',
                type: 'workpackage',
                level: 1,
                budget: { allocated: 50000, spent: 0 },
                progress: 0,
                children: [
                    {
                        id: 'act-4-1-1',
                        name: 'Sign Installation',
                        type: 'activity',
                        level: 2,
                        duration: 5,
                        startDate: '2024-06-10',
                        endDate: '2024-06-15',
                        status: 'not-started',
                        progress: 0,
                        children: []
                    }
                ]
            }
        ]
    }
];

// Activity dependencies
const activityDependencies = [
    { from: 'act-1-1-1', to: 'act-1-1-2', type: 'finish-to-start' },
    { from: 'act-1-1-2', to: 'act-2-1-1', type: 'finish-to-start' },
    { from: 'act-1-2-1', to: 'act-2-1-1', type: 'finish-to-start' },
    { from: 'act-1-2-2', to: 'act-2-1-1', type: 'finish-to-start' },
    { from: 'act-2-1-1', to: 'act-2-2-1', type: 'finish-to-start' },
    { from: 'act-2-2-1', to: 'act-3-1-1', type: 'finish-to-start' },
    { from: 'act-3-1-1', to: 'act-4-1-1', type: 'finish-to-start' }
];

// Initialize project detail page
document.addEventListener('DOMContentLoaded', function() {
    initializeProjectPage();
});

function initializeProjectPage() {
    // Load project data
    loadProjectData();
    
    // Initialize components
    initializeWBSTree();
    initializeNetworkDiagram();
    initializeGanttChart();
    initializeEventListeners();
    initializeModals();
    
    // Animate page elements
    animatePageLoad();
    
    console.log('Project detail page initialized successfully');
}

function loadProjectData() {
    // Get project ID from localStorage (set from dashboard)
    const projectId = localStorage.getItem('selectedProjectId') || '1';
    
    // Load sample project data
    ProjectData.wbsData = [...sampleWBSData];
    ProjectData.dependencies = [...activityDependencies];
    
    // Update project header information
    updateProjectHeader();
}

function updateProjectHeader() {
    // Update with sample project data
    document.getElementById('projectTitle').textContent = 'Highway Extension Project';
    document.getElementById('projectStatus').textContent = 'Active';
    document.getElementById('projectStatus').className = 'px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium';
    document.getElementById('projectDates').textContent = 'Apr 15, 2024 - Apr 15, 2025';
    document.getElementById('projectLocation').textContent = 'Downtown District';
    document.getElementById('projectManager').textContent = 'Sarah Johnson';
    document.getElementById('overallProgress').textContent = '65%';
    document.getElementById('totalBudget').textContent = '$2.5M';
    document.getElementById('tasksCompleted').textContent = '34/47';
}

function initializeWBSTree() {
    const treeContainer = document.getElementById('wbsTree');
    if (!treeContainer) return;
    
    treeContainer.innerHTML = '';
    
    // Render top-level WBS items
    ProjectData.wbsData.forEach((wbsItem, index) => {
        const wbsElement = createWBSElement(wbsItem, index);
        treeContainer.appendChild(wbsElement);
    });
}

function createWBSElement(item, index) {
    const element = document.createElement('div');
    element.className = `wbs-item wbs-level-${item.level} border-b border-gray-100`;
    
    const hasChildren = item.children && item.children.length > 0;
    const expandIcon = hasChildren ? (item.expanded ? '▼' : '▶') : '';
    const expandedClass = item.expanded ? 'expanded' : '';
    
    // Get budget information
    const budgetInfo = getBudgetInfo(item);
    const progressInfo = getProgressInfo(item);
    
    element.innerHTML = `
        <div class="flex items-center justify-between py-3 px-2 hover:bg-gray-50 cursor-pointer ${expandedClass}" 
             onclick="toggleWBSItem('${item.id}')">
            <div class="flex items-center space-x-3">
                <span class="expand-icon text-gray-400 text-sm w-4">${expandIcon}</span>
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full ${getTypeColor(item.type)}"></div>
                    <span class="font-medium text-gray-900">${item.name}</span>
                    <span class="text-xs text-gray-500">${getTypeLabel(item.type)}</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                ${budgetInfo ? `
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-900">${budgetInfo.spent}</div>
                        <div class="text-xs text-gray-500">of ${budgetInfo.allocated}</div>
                    </div>
                ` : ''}
                ${progressInfo ? `
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-900">${progressInfo.percentage}%</div>
                        <div class="w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                                 style="width: ${progressInfo.percentage}%"></div>
                        </div>
                    </div>
                ` : ''}
                <button onclick="event.stopPropagation(); editItem('${item.id}')" 
                        class="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
            </div>
        </div>
        ${hasChildren && item.expanded ? `
            <div class="children-container">
                ${item.children.map((child, childIndex) => 
                    createWBSElement(child, `${index}-${childIndex}`).outerHTML
                ).join('')}
            </div>
        ` : ''}
    `;
    
    return element;
}

function getTypeColor(type) {
    const colors = {
        wbs: 'bg-blue-500',
        workpackage: 'bg-amber-500',
        activity: 'bg-green-500',
        task: 'bg-purple-500'
    };
    return colors[type] || 'bg-gray-500';
}

function getTypeLabel(type) {
    const labels = {
        wbs: 'WBS',
        workpackage: 'WP',
        activity: 'ACT',
        task: 'TASK'
    };
    return labels[type] || type.toUpperCase();
}

function getBudgetInfo(item) {
    if (item.budget) {
        return {
            allocated: formatCurrency(item.budget.allocated),
            spent: formatCurrency(item.budget.spent)
        };
    }
    return null;
}

function getProgressInfo(item) {
    if (typeof item.progress === 'number') {
        return {
            percentage: item.progress
        };
    }
    return null;
}

function toggleWBSItem(itemId) {
    const item = findWBSItem(ProjectData.wbsData, itemId);
    if (item && item.children && item.children.length > 0) {
        item.expanded = !item.expanded;
        initializeWBSTree();
        
        // Animate the change
        anime({
            targets: '.wbs-item',
            opacity: [0.5, 1],
            duration: 300,
            easing: 'easeOutExpo'
        });
    }
}

function findWBSItem(items, itemId) {
    for (const item of items) {
        if (item.id === itemId) {
            return item;
        }
        if (item.children) {
            const found = findWBSItem(item.children, itemId);
            if (found) return found;
        }
    }
    return null;
}

function initializeNetworkDiagram() {
    const diagramElement = document.getElementById('networkDiagram');
    if (!diagramElement) return;
    
    ProjectData.networkChart = echarts.init(diagramElement);
    
    // Prepare network data
    const nodes = [];
    const links = [];
    
    // Extract activities from WBS
    const activities = extractActivities(ProjectData.wbsData);
    
    // Create nodes
    activities.forEach((activity, index) => {
        nodes.push({
            id: activity.id,
            name: activity.name,
            x: 100 + (index % 4) * 150,
            y: 50 + Math.floor(index / 4) * 80,
            symbolSize: 40,
            itemStyle: {
                color: getStatusColor(activity.status)
            },
            label: {
                show: true,
                position: 'bottom',
                fontSize: 10
            }
        });
    });
    
    // Create links based on dependencies
    ProjectData.dependencies.forEach(dep => {
        const isCritical = isCriticalPath(dep.from, dep.to);
        links.push({
            source: dep.from,
            target: dep.to,
            lineStyle: {
                color: isCritical ? '#EA580C' : '#475569',
                width: isCritical ? 3 : 2,
                type: 'dashed'
            },
            symbol: ['none', 'arrow'],
            symbolSize: 8
        });
    });
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.dataType === 'node') {
                    const activity = activities.find(a => a.id === params.data.id);
                    return `
                        <strong>${activity.name}</strong><br/>
                        Status: ${activity.status}<br/>
                        Progress: ${activity.progress}%<br/>
                        Duration: ${activity.duration} days
                    `;
                } else {
                    return `${params.data.source} → ${params.data.target}`;
                }
            }
        },
        series: [{
            type: 'graph',
            layout: 'none',
            data: nodes,
            links: links,
            roam: true,
            focusNodeAdjacency: true,
            lineStyle: {
                curveness: 0.1
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: {
                    width: 4
                }
            }
        }]
    };
    
    ProjectData.networkChart.setOption(option);
    
    // Handle resize
    window.addEventListener('resize', () => {
        if (ProjectData.networkChart) {
            ProjectData.networkChart.resize();
        }
    });
}

function extractActivities(wbsData) {
    const activities = [];
    
    function traverse(items) {
        items.forEach(item => {
            if (item.type === 'activity') {
                activities.push(item);
            }
            if (item.children) {
                traverse(item.children);
            }
        });
    }
    
    traverse(wbsData);
    return activities;
}

function getStatusColor(status) {
    const colors = {
        'not-started': '#9CA3AF',
        'in-progress': '#F59E0B',
        'completed': '#10B981',
        'blocked': '#EF4444'
    };
    return colors[status] || '#6B7280';
}

function isCriticalPath(fromId, toId) {
    // Simple critical path detection - in real app, this would be calculated
    const criticalPaths = [
        ['act-1-1-1', 'act-1-1-2'],
        ['act-1-1-2', 'act-2-1-1'],
        ['act-2-1-1', 'act-2-2-1'],
        ['act-2-2-1', 'act-3-1-1']
    ];
    
    return criticalPaths.some(path => path[0] === fromId && path[1] === toId);
}

function initializeGanttChart() {
    const chartElement = document.getElementById('ganttChart');
    if (!chartElement) return;
    
    ProjectData.ganttChart = echarts.init(chartElement);
    
    // Prepare Gantt data
    const activities = extractActivities(ProjectData.wbsData);
    const categories = activities.map(act => act.name);
    const data = [];
    
    activities.forEach((activity, index) => {
        const startDate = new Date(activity.startDate);
        const endDate = new Date(activity.endDate);
        const duration = (endDate - startDate) / (1000 * 60 * 60 * 24);
        
        data.push({
            name: activity.name,
            value: [
                index,
                startDate.getTime(),
                endDate.getTime(),
                duration
            ],
            itemStyle: {
                color: getStatusColor(activity.status)
            }
        });
    });
    
    const option = {
        tooltip: {
            formatter: function(params) {
                const startDate = new Date(params.value[1]);
                const endDate = new Date(params.value[2]);
                return `
                    <strong>${params.name}</strong><br/>
                    Start: ${startDate.toLocaleDateString()}<br/>
                    End: ${endDate.toLocaleDateString()}<br/>
                    Duration: ${params.value[3]} days
                `;
            }
        },
        grid: {
            left: '15%',
            right: '10%',
            top: '10%',
            bottom: '15%'
        },
        xAxis: {
            type: 'time',
            axisLabel: {
                formatter: function(value) {
                    return new Date(value).toLocaleDateString();
                }
            }
        },
        yAxis: {
            type: 'category',
            data: categories,
            axisLabel: {
                fontSize: 10
            }
        },
        series: [{
            type: 'custom',
            renderItem: function(params, api) {
                const categoryIndex = api.value(0);
                const start = api.coord([api.value(1), categoryIndex]);
                const end = api.coord([api.value(2), categoryIndex]);
                const height = api.size([0, 1])[1] * 0.6;
                
                return {
                    type: 'rect',
                    shape: {
                        x: start[0],
                        y: start[1] - height / 2,
                        width: end[0] - start[0],
                        height: height
                    },
                    style: api.style()
                };
            },
            encode: {
                x: [1, 2],
                y: 0
            },
            data: data
        }]
    };
    
    ProjectData.ganttChart.setOption(option);
    
    // Handle resize
    window.addEventListener('resize', () => {
        if (ProjectData.ganttChart) {
            ProjectData.ganttChart.resize();
        }
    });
}

function initializeEventListeners() {
    // Expand/Collapse All buttons
    document.getElementById('expandAll')?.addEventListener('click', () => {
        toggleAllWBS(true);
    });
    
    document.getElementById('collapseAll')?.addEventListener('click', () => {
        toggleAllWBS(false);
    });
    
    // Add WBS button
    document.getElementById('addWBS')?.addEventListener('click', () => {
        showAddWBSModal();
    });
    
    // Quick action buttons
    document.getElementById('addTask')?.addEventListener('click', () => {
        showTaskModal();
    });
    
    document.getElementById('addDependency')?.addEventListener('click', () => {
        showDependencyModal();
    });
    
    document.getElementById('generateReport')?.addEventListener('click', () => {
        generateProjectReport();
    });
    
    document.getElementById('exportData')?.addEventListener('click', () => {
        exportProjectData();
    });
}

function toggleAllWBS(expand) {
    function setExpanded(items) {
        items.forEach(item => {
            if (item.children && item.children.length > 0) {
                item.expanded = expand;
                setExpanded(item.children);
            }
        });
    }
    
    setExpanded(ProjectData.wbsData);
    initializeWBSTree();
}

function initializeModals() {
    // Budget Modal
    const budgetModal = document.getElementById('budgetModal');
    const editBudgetBtn = document.getElementById('editBudget');
    const closeBudgetModal = document.getElementById('closeBudgetModal');
    const cancelBudgetEdit = document.getElementById('cancelBudgetEdit');
    const saveBudgetEdit = document.getElementById('saveBudgetEdit');
    
    editBudgetBtn?.addEventListener('click', () => {
        budgetModal.classList.add('active');
    });
    
    closeBudgetModal?.addEventListener('click', () => {
        budgetModal.classList.remove('active');
    });
    
    cancelBudgetEdit?.addEventListener('click', () => {
        budgetModal.classList.remove('active');
    });
    
    saveBudgetEdit?.addEventListener('click', () => {
        saveBudgetChanges();
        budgetModal.classList.remove('active');
    });
    
    // Task Modal
    const taskModal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTask');
    const closeTaskModal = document.getElementById('closeTaskModal');
    const cancelTask = document.getElementById('cancelTask');
    const taskForm = document.getElementById('taskForm');
    
    addTaskBtn?.addEventListener('click', () => {
        taskModal.classList.add('active');
    });
    
    closeTaskModal?.addEventListener('click', () => {
        taskModal.classList.remove('active');
    });
    
    cancelTask?.addEventListener('click', () => {
        taskModal.classList.remove('active');
    });
    
    taskForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
        taskModal.classList.remove('active');
    });
}

function saveBudgetChanges() {
    const totalBudget = document.getElementById('totalBudgetInput').value;
    const spentBudget = document.getElementById('spentBudgetInput').value;
    
    // Update budget display
    document.getElementById('budgetAllocated').textContent = formatCurrency(totalBudget);
    document.getElementById('budgetSpent').textContent = formatCurrency(spentBudget);
    document.getElementById('budgetRemaining').textContent = formatCurrency(totalBudget - spentBudget);
    
    const utilization = ((spentBudget / totalBudget) * 100).toFixed(0);
    document.getElementById('budgetUtilization').textContent = utilization + '%';
    document.getElementById('budgetProgressBar').style.width = utilization + '%';
    
    // Show success message
    showNotification('Budget updated successfully!', 'success');
}

function saveTask() {
    const taskName = document.getElementById('taskName').value;
    const taskDescription = document.getElementById('taskDescription').value;
    const taskAssignee = document.getElementById('taskAssignee').value;
    
    // Add task logic here
    showNotification(`Task "${taskName}" added successfully!`, 'success');
    
    // Reset form
    document.getElementById('taskForm').reset();
}

function showAddWBSModal() {
    showNotification('Add WBS functionality - Coming soon!', 'info');
}

function showDependencyModal() {
    showNotification('Add Dependency functionality - Coming soon!', 'info');
}

function generateProjectReport() {
    showNotification('Generating project report...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showNotification('Project report generated successfully!', 'success');
    }, 2000);
}

function exportProjectData() {
    showNotification('Exporting project data...', 'info');
    
    // Simulate data export
    setTimeout(() => {
        showNotification('Project data exported successfully!', 'success');
    }, 1500);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${getNotificationColor(type)}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    anime({
        targets: notification,
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutExpo'
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        anime({
            targets: notification,
            translateX: [0, 300],
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInExpo',
            complete: () => {
                document.body.removeChild(notification);
            }
        });
    }, 3000);
}

function getNotificationColor(type) {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-500'
    };
    return colors[type] || colors.info;
}

function animatePageLoad() {
    // Animate main sections
    anime({
        targets: '.budget-card',
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutExpo'
    });
    
    // Animate progress bars
    setTimeout(() => {
        anime({
            targets: '.progress-bar, .budget-progress',
            width: function(el) {
                return el.style.width || '0%';
            },
            duration: 1000,
            easing: 'easeOutExpo'
        });
    }, 500);
}

function goBack() {
    window.location.href = 'index.html';
}

function editItem(itemId) {
    showNotification(`Edit functionality for ${itemId} - Coming soon!`, 'info');
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

// Export for use in other files
window.ProjectDetail = {
    ProjectData,
    toggleWBSItem,
    editItem,
    goBack
};