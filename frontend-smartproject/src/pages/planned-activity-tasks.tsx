import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { 
  Plus, 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Eye,
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Task {
  id: number;
  activityId: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  startDate: string;
  endDate: string;
  progress: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: number;
  projectId: number;
  name: string;
  category: 'backlog' | 'planned' | 'advanced';
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  progress: number;
  assignedTo: string;
  remarks: string | null;
  tasks: Task[];
  isExpanded?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get 2-week rolling window dates
const getTwoWeekWindow = () => {
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);
  return {
    startDate: today.toISOString().split('T')[0],
    endDate: twoWeeksLater.toISOString().split('T')[0],
  };
};

export default function PlannedActivityTasks() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate 2-week rolling window
  const { startDate, endDate } = getTwoWeekWindow();

  // Fetch activities with 2-week window
  const { data: activitiesData = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: [`/api/projects/${projectId}/planned-activities`, startDate, endDate],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/planned-activities?startDate=${startDate}&endDate=${endDate}`);
      return response.json();
    },
  });

  const [activities, setActivities] = useState<Activity[]>(activitiesData);
  useEffect(() => {
    setActivities(activitiesData.map(a => ({ ...a, isExpanded: false })));
  }, [activitiesData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state for activity
  const [activityFormData, setActivityFormData] = useState({
    name: "",
    category: "planned" as 'backlog' | 'planned' | 'advanced',
    status: "not_started" as 'not_started' | 'in_progress' | 'completed' | 'on_hold',
    priority: "medium" as 'low' | 'medium' | 'high' | 'critical',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 0,
    assignedTo: "",
    remarks: "",
  });

  // Filter activities based on search and filters
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.remarks.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || activity.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || activity.status === selectedStatus;
    const matchesPriority = selectedPriority === "all" || activity.priority === selectedPriority;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Group activities by category
  const backlogActivities = filteredActivities.filter(a => a.category === 'backlog');
  const plannedActivities = filteredActivities.filter(a => a.category === 'planned');
  const advancedActivities = filteredActivities.filter(a => a.category === 'advanced');

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'backlog': return 'bg-red-100 text-red-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Mutations
  const createActivityMutation = useMutation({
    mutationFn: async (data: Omit<Activity, "id" | "projectId" | "tasks" | "isExpanded" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/planned-activities`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/planned-activities`] });
      toast({
        title: "Success",
        description: "Activity created successfully",
      });
      resetActivityForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<Activity, "id" | "projectId" | "tasks" | "isExpanded" | "createdAt" | "updatedAt">> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/planned-activities/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/planned-activities`] });
      toast({
        title: "Success",
        description: "Activity updated successfully",
      });
      resetActivityForm();
      setIsEditDialogOpen(false);
      setSelectedActivity(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/planned-activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/planned-activities`] });
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ activityId, data }: { activityId: number; data: {
      name: string;
      status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
      priority: 'low' | 'medium' | 'high' | 'critical';
      assignedTo: string;
      startDate: string;
      endDate: string;
      progress: number;
      remarks: string | null;
    } }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/planned-activities/${activityId}/tasks`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/planned-activities`] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ activityId, id, data }: { activityId: number; id: number; data: Partial<{
      name: string;
      status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
      priority: 'low' | 'medium' | 'high' | 'critical';
      assignedTo: string;
      startDate: string;
      endDate: string;
      progress: number;
      remarks: string | null;
    }> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/planned-activities/${activityId}/tasks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/planned-activities`] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ activityId, id }: { activityId: number; id: number }) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/planned-activities/${activityId}/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/planned-activities`] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetActivityForm = () => {
    setActivityFormData({
      name: "",
      category: "planned",
      status: "not_started",
      priority: "medium",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      assignedTo: "",
      remarks: "",
    });
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activityFormData.name.trim() || !activityFormData.assignedTo.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and Assigned To are required",
        variant: "destructive",
      });
      return;
    }

    const activityData = {
      name: activityFormData.name,
      category: activityFormData.category,
      status: activityFormData.status,
      priority: activityFormData.priority,
      startDate: activityFormData.startDate,
      endDate: activityFormData.endDate,
      progress: activityFormData.progress,
      assignedTo: activityFormData.assignedTo,
      remarks: activityFormData.remarks || null,
    };

    if (selectedActivity) {
      updateActivityMutation.mutate({ id: selectedActivity.id, data: activityData });
    } else {
      createActivityMutation.mutate(activityData);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityFormData({
      name: activity.name,
      category: activity.category,
      status: activity.status,
      priority: activity.priority,
      startDate: activity.startDate,
      endDate: activity.endDate,
      progress: activity.progress,
      assignedTo: activity.assignedTo,
      remarks: activity.remarks || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteActivity = (id: number) => {
    if (window.confirm("Are you sure you want to delete this activity? All associated tasks will also be deleted.")) {
      deleteActivityMutation.mutate(id);
    }
  };

  const toggleActivityExpansion = (activityId: number) => {
    setActivities(prev => prev.map(activity => 
      activity.id === activityId 
        ? { ...activity, isExpanded: !activity.isExpanded }
        : activity
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'on_hold': return <Pause className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'backlog': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'planned': return <Target className="h-4 w-4 text-blue-600" />;
      case 'advanced': return <TrendingUp className="h-4 w-4 text-green-600" />;
      default: return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planned Activity/Tasks</h1>
          <p className="text-gray-600">Next 2 weeks activity and task planning with backlog, planned, and advanced categories</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {activitiesLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-600 mt-4">Loading activities...</p>
          </CardContent>
        </Card>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
            <p className="text-gray-600">No activities found for the next 2 weeks. Click "Add Activity" to create one.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search activities, tasks, or remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setSelectedPriority("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Backlog Activities</p>
                <p className="text-2xl font-bold text-red-600">{backlogActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Planned Activities</p>
                <p className="text-2xl font-bold text-blue-600">{plannedActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Advanced Activities</p>
                <p className="text-2xl font-bold text-green-600">{advancedActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">
                  {filteredActivities.reduce((total, activity) => total + activity.tasks.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities by Category */}
      <div className="space-y-6">
        {/* Backlog Activities */}
        {backlogActivities.length > 0 && (
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Backlog Activities ({backlogActivities.length})
                <Badge variant="destructive" className="ml-2">Overdue</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-64">Activity</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Priority</TableHead>
                    <TableHead className="w-32">Assigned To</TableHead>
                    <TableHead className="w-24">Start Date</TableHead>
                    <TableHead className="w-24">End Date</TableHead>
                    <TableHead className="w-24">Progress</TableHead>
                    <TableHead className="w-32">Tasks</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlogActivities.map((activity) => (
                    <>
                      <TableRow key={activity.id} className="bg-red-50/30">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActivityExpansion(activity.id)}
                          >
                            {activity.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(activity.category)}
                            <span className="font-medium">{activity.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(activity.status)}>
                            {getStatusIcon(activity.status)}
                            <span className="ml-1">{activity.status.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(activity.priority)}>
                            {activity.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.assignedTo}</TableCell>
                        <TableCell>{formatDate(activity.startDate)}</TableCell>
                        <TableCell>{formatDate(activity.endDate)}</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${activity.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{activity.progress}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.tasks.length} tasks</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedActivity(activity);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditActivity(activity)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={deleteActivityMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {activity.isExpanded && activity.tasks.map((task) => (
                        <TableRow key={task.id} className="bg-gray-50">
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <div className="flex items-center space-x-2">
                              <Minus className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{task.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{task.status.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{task.assignedTo}</TableCell>
                          <TableCell className="text-sm">{formatDate(task.startDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(task.endDate)}</TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Planned Activities */}
        {plannedActivities.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center text-blue-800">
                <Target className="h-5 w-5 mr-2" />
                Planned Activities ({plannedActivities.length})
                <Badge variant="secondary" className="ml-2">On Schedule</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-64">Activity</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Priority</TableHead>
                    <TableHead className="w-32">Assigned To</TableHead>
                    <TableHead className="w-24">Start Date</TableHead>
                    <TableHead className="w-24">End Date</TableHead>
                    <TableHead className="w-24">Progress</TableHead>
                    <TableHead className="w-32">Tasks</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plannedActivities.map((activity) => (
                    <>
                      <TableRow key={activity.id} className="bg-blue-50/30">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActivityExpansion(activity.id)}
                          >
                            {activity.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(activity.category)}
                            <span className="font-medium">{activity.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(activity.status)}>
                            {getStatusIcon(activity.status)}
                            <span className="ml-1">{activity.status.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(activity.priority)}>
                            {activity.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.assignedTo}</TableCell>
                        <TableCell>{formatDate(activity.startDate)}</TableCell>
                        <TableCell>{formatDate(activity.endDate)}</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${activity.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{activity.progress}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.tasks.length} tasks</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedActivity(activity);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditActivity(activity)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={deleteActivityMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {activity.isExpanded && activity.tasks.map((task) => (
                        <TableRow key={task.id} className="bg-gray-50">
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <div className="flex items-center space-x-2">
                              <Minus className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{task.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{task.status.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{task.assignedTo}</TableCell>
                          <TableCell className="text-sm">{formatDate(task.startDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(task.endDate)}</TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Advanced Activities */}
        {advancedActivities.length > 0 && (
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center text-green-800">
                <TrendingUp className="h-5 w-5 mr-2" />
                Advanced Activities ({advancedActivities.length})
                <Badge variant="secondary" className="ml-2">Ahead of Schedule</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-64">Activity</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Priority</TableHead>
                    <TableHead className="w-32">Assigned To</TableHead>
                    <TableHead className="w-24">Start Date</TableHead>
                    <TableHead className="w-24">End Date</TableHead>
                    <TableHead className="w-24">Progress</TableHead>
                    <TableHead className="w-32">Tasks</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advancedActivities.map((activity) => (
                    <>
                      <TableRow key={activity.id} className="bg-green-50/30">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActivityExpansion(activity.id)}
                          >
                            {activity.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(activity.category)}
                            <span className="font-medium">{activity.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(activity.status)}>
                            {getStatusIcon(activity.status)}
                            <span className="ml-1">{activity.status.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(activity.priority)}>
                            {activity.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.assignedTo}</TableCell>
                        <TableCell>{formatDate(activity.startDate)}</TableCell>
                        <TableCell>{formatDate(activity.endDate)}</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${activity.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{activity.progress}%</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.tasks.length} tasks</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedActivity(activity);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditActivity(activity)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={deleteActivityMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {activity.isExpanded && activity.tasks.map((task) => (
                        <TableRow key={task.id} className="bg-gray-50">
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <div className="flex items-center space-x-2">
                              <Minus className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{task.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{task.status.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{task.assignedTo}</TableCell>
                          <TableCell className="text-sm">{formatDate(task.startDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(task.endDate)}</TableCell>
                          <TableCell>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetActivityForm();
          setSelectedActivity(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
            <DialogDescription>
              Create a new activity for the next 2 weeks planning window.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActivitySubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Activity Name *</Label>
                <Input
                  id="name"
                  value={activityFormData.name}
                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                  placeholder="Enter activity name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={activityFormData.category}
                  onValueChange={(value: 'backlog' | 'planned' | 'advanced') => 
                    setActivityFormData({ ...activityFormData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={activityFormData.status}
                  onValueChange={(value: 'not_started' | 'in_progress' | 'completed' | 'on_hold') => 
                    setActivityFormData({ ...activityFormData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={activityFormData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                    setActivityFormData({ ...activityFormData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={activityFormData.startDate}
                  onChange={(e) => setActivityFormData({ ...activityFormData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={activityFormData.endDate}
                  onChange={(e) => setActivityFormData({ ...activityFormData, endDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={activityFormData.progress}
                  onChange={(e) => setActivityFormData({ ...activityFormData, progress: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="assignedTo">Assigned To *</Label>
                <Input
                  id="assignedTo"
                  value={activityFormData.assignedTo}
                  onChange={(e) => setActivityFormData({ ...activityFormData, assignedTo: e.target.value })}
                  placeholder="Enter assignee name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={activityFormData.remarks}
                  onChange={(e) => setActivityFormData({ ...activityFormData, remarks: e.target.value })}
                  placeholder="Enter any remarks or notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createActivityMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createActivityMutation.isPending}
              >
                {createActivityMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Activity"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetActivityForm();
          setSelectedActivity(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Update activity details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActivitySubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="edit-name">Activity Name *</Label>
                <Input
                  id="edit-name"
                  value={activityFormData.name}
                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                  placeholder="Enter activity name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={activityFormData.category}
                  onValueChange={(value: 'backlog' | 'planned' | 'advanced') => 
                    setActivityFormData({ ...activityFormData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={activityFormData.status}
                  onValueChange={(value: 'not_started' | 'in_progress' | 'completed' | 'on_hold') => 
                    setActivityFormData({ ...activityFormData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-priority">Priority *</Label>
                <Select
                  value={activityFormData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                    setActivityFormData({ ...activityFormData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-startDate">Start Date *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={activityFormData.startDate}
                  onChange={(e) => setActivityFormData({ ...activityFormData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-endDate">End Date *</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={activityFormData.endDate}
                  onChange={(e) => setActivityFormData({ ...activityFormData, endDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={activityFormData.progress}
                  onChange={(e) => setActivityFormData({ ...activityFormData, progress: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="edit-assignedTo">Assigned To *</Label>
                <Input
                  id="edit-assignedTo"
                  value={activityFormData.assignedTo}
                  onChange={(e) => setActivityFormData({ ...activityFormData, assignedTo: e.target.value })}
                  placeholder="Enter assignee name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-remarks">Remarks</Label>
                <Textarea
                  id="edit-remarks"
                  value={activityFormData.remarks}
                  onChange={(e) => setActivityFormData({ ...activityFormData, remarks: e.target.value })}
                  placeholder="Enter any remarks or notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateActivityMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateActivityMutation.isPending}
              >
                {updateActivityMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Activity"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 