import { useState } from "react";
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
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Grid3X3,
  List,
  FileText,
  Link,
  User,
  CalendarDays,
  AlertCircle,
  Lightbulb,
  Award
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

interface LessonLearntEntry {
  id: number;
  projectId: number;
  category: 'Design' | 'Engineering' | 'Construction' | 'Installation' | 'Testing' | 'Pre-commissioning' | 'Commissioning' | 'Procurement' | 'Subcontracts' | 'Quality' | 'Safety' | 'Others';
  lesson: string;
  type: 'Risk' | 'Opportunity';
  dateLogged: string;
  loggedBy: string;
  documents: string[];
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  description: string;
  recommendations: string;
  actionsTaken: string;
  createdAt: string;
  updatedAt: string;
}

export default function LessonLearntRegister() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lessonLearntEntries = [], isLoading } = useQuery<LessonLearntEntry[]>({
    queryKey: [`/api/projects/${projectId}/lesson-learnt-register`],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LessonLearntEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Form state for Add/Edit Lesson Learnt modal
  const [formData, setFormData] = useState({
    category: "" as "" | "Design" | "Engineering" | "Construction" | "Installation" | "Testing" | "Pre-commissioning" | "Commissioning" | "Procurement" | "Subcontracts" | "Quality" | "Safety" | "Others",
    lesson: "",
    type: "" as "" | "Risk" | "Opportunity",
    dateLogged: new Date().toISOString().split('T')[0],
    loggedBy: "",
    documents: [] as string[],
    status: "Open" as "Open" | "In Progress" | "Resolved" | "Closed",
    impact: "" as "" | "Low" | "Medium" | "High" | "Critical",
    priority: "" as "" | "Low" | "Medium" | "High" | "Urgent",
    description: "",
    recommendations: "",
    actionsTaken: "",
    documentInput: "", // Temporary input for adding documents
  });

  // Filter entries based on search and filters
  const filteredEntries = lessonLearntEntries.filter(entry => {
    const matchesSearch = entry.lesson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.loggedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || entry.category === filterCategory;
    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesStatus = filterStatus === "all" || entry.status === filterStatus;
    const matchesImpact = filterImpact === "all" || entry.impact === filterImpact;
    
    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesImpact;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'bg-green-100 text-green-800';
      case 'Resolved': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-orange-100 text-orange-800';
      case 'Open': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Risk': return 'bg-red-100 text-red-800';
      case 'Opportunity': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Create lesson learnt mutation
  const createLessonLearntMutation = useMutation({
    mutationFn: async (data: Omit<LessonLearntEntry, "id" | "projectId" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/lesson-learnt-register`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lesson-learnt-register`] });
      toast({
        title: "Success",
        description: "Lesson learnt created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lesson learnt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update lesson learnt mutation
  const updateLessonLearntMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<LessonLearntEntry, "id" | "projectId" | "createdAt" | "updatedAt">> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/lesson-learnt-register/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lesson-learnt-register`] });
      toast({
        title: "Success",
        description: "Lesson learnt updated successfully",
      });
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lesson learnt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete lesson learnt mutation
  const deleteLessonLearntMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/lesson-learnt-register/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lesson-learnt-register`] });
      toast({
        title: "Success",
        description: "Lesson learnt deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lesson learnt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "" as "" | "Design" | "Engineering" | "Construction" | "Installation" | "Testing" | "Pre-commissioning" | "Commissioning" | "Procurement" | "Subcontracts" | "Quality" | "Safety" | "Others",
      lesson: "",
      type: "" as "" | "Risk" | "Opportunity",
      dateLogged: new Date().toISOString().split('T')[0],
      loggedBy: "",
      documents: [],
      status: "Open" as "Open" | "In Progress" | "Resolved" | "Closed",
      impact: "" as "" | "Low" | "Medium" | "High" | "Critical",
      priority: "" as "" | "Low" | "Medium" | "High" | "Urgent",
      description: "",
      recommendations: "",
      actionsTaken: "",
      documentInput: "",
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.lesson.trim()) {
      toast({
        title: "Validation Error",
        description: "Lesson learnt is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.type) {
      toast({
        title: "Validation Error",
        description: "Type is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.loggedBy.trim()) {
      toast({
        title: "Validation Error",
        description: "Logged by is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.impact) {
      toast({
        title: "Validation Error",
        description: "Impact is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.priority) {
      toast({
        title: "Validation Error",
        description: "Priority is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.recommendations.trim()) {
      toast({
        title: "Validation Error",
        description: "Recommendations are required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.actionsTaken.trim()) {
      toast({
        title: "Validation Error",
        description: "Actions taken is required",
        variant: "destructive",
      });
      return;
    }

    const lessonLearntData = {
      category: formData.category,
      lesson: formData.lesson,
      type: formData.type,
      dateLogged: formData.dateLogged,
      loggedBy: formData.loggedBy,
      documents: formData.documents,
      status: formData.status,
      impact: formData.impact,
      priority: formData.priority,
      description: formData.description,
      recommendations: formData.recommendations,
      actionsTaken: formData.actionsTaken,
    };

    if (selectedEntry) {
      updateLessonLearntMutation.mutate({ id: selectedEntry.id, data: lessonLearntData });
    } else {
      createLessonLearntMutation.mutate(lessonLearntData);
    }
  };

  const handleEdit = (entry: LessonLearntEntry) => {
    setSelectedEntry(entry);
    setFormData({
      category: entry.category,
      lesson: entry.lesson,
      type: entry.type,
      dateLogged: entry.dateLogged,
      loggedBy: entry.loggedBy,
      documents: entry.documents || [],
      status: entry.status,
      impact: entry.impact,
      priority: entry.priority,
      description: entry.description,
      recommendations: entry.recommendations,
      actionsTaken: entry.actionsTaken,
      documentInput: "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this lesson learnt?")) {
      deleteLessonLearntMutation.mutate(id);
    }
  };

  const addDocument = () => {
    if (formData.documentInput.trim()) {
      setFormData({
        ...formData,
        documents: [...formData.documents, formData.documentInput.trim()],
        documentInput: "",
      });
    }
  };

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lesson Learnt Register</h1>
          <p className="text-gray-600">Capture and manage lessons learnt from project experiences</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          >
            {viewMode === 'cards' ? <List className="h-4 w-4 mr-2" /> : <Grid3X3 className="h-4 w-4 mr-2" />}
            {viewMode === 'cards' ? 'List View' : 'Card View'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson Learnt
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search lessons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Installation">Installation</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                  <SelectItem value="Pre-commissioning">Pre-commissioning</SelectItem>
                  <SelectItem value="Commissioning">Commissioning</SelectItem>
                  <SelectItem value="Procurement">Procurement</SelectItem>
                  <SelectItem value="Subcontracts">Subcontracts</SelectItem>
                  <SelectItem value="Quality">Quality</SelectItem>
                  <SelectItem value="Safety">Safety</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Risk">Risk</SelectItem>
                  <SelectItem value="Opportunity">Opportunity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="impact">Impact</Label>
              <Select value={filterImpact} onValueChange={setFilterImpact}>
                <SelectTrigger>
                  <SelectValue placeholder="All Impact Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Impact Levels</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                  setFilterType("all");
                  setFilterStatus("all");
                  setFilterImpact("all");
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
              <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Lessons</p>
                <p className="text-2xl font-bold">{lessonLearntEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Risks</p>
                <p className="text-2xl font-bold">{lessonLearntEntries.filter(l => l.type === 'Risk').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Opportunities</p>
                <p className="text-2xl font-bold">{lessonLearntEntries.filter(l => l.type === 'Opportunity').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold">{lessonLearntEntries.filter(l => l.status === 'Resolved' || l.status === 'Closed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lesson Learnt Entries */}
      {viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle>Lesson Learnt Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Category</TableHead>
                      <TableHead className="w-32">Lesson</TableHead>
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead className="w-20">Date</TableHead>
                      <TableHead className="w-20">Logged By</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-16">Impact</TableHead>
                      <TableHead className="w-20">Documents</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No lesson learnt entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Badge className="text-xs">
                              {entry.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-32">
                              <p className="font-medium truncate text-xs">{entry.lesson}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getTypeColor(entry.type)} text-xs`}>
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(entry.dateLogged)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.loggedBy}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(entry.status)} text-xs`}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getImpactColor(entry.impact)} text-xs`}>
                              {entry.impact}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {entry.documents && entry.documents.length > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  title={`${entry.documents.length} document(s)`}
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => handleDelete(entry.id)}
                                disabled={deleteLessonLearntMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{entry.lesson}</CardTitle>
                    <p className="text-sm text-gray-600">{entry.category}</p>
                  </div>
                  <Badge className={getTypeColor(entry.type)}>
                    {entry.type}
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(entry.dateLogged)} • {entry.loggedBy}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Status</Label>
                    <Badge className={`${getStatusColor(entry.status)} text-xs`}>
                      {entry.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Impact</Label>
                    <Badge className={`${getImpactColor(entry.impact)} text-xs`}>
                      {entry.impact}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm text-gray-600 truncate">{entry.description}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {entry.documents.length > 0 ? (
                      <span className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {entry.documents.length} doc(s)
                      </span>
                    ) : (
                      <span>No documents</span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleteLessonLearntMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Lesson Learnt Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedEntry(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lesson Learnt</DialogTitle>
            <DialogDescription>
              Capture a lesson learnt from project experience.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Installation">Installation</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Pre-commissioning">Pre-commissioning</SelectItem>
                    <SelectItem value="Commissioning">Commissioning</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                    <SelectItem value="Subcontracts">Subcontracts</SelectItem>
                    <SelectItem value="Quality">Quality</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "Risk" | "Opportunity") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Risk">Risk</SelectItem>
                    <SelectItem value="Opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateLogged">Date Logged *</Label>
                <Input
                  id="dateLogged"
                  type="date"
                  value={formData.dateLogged}
                  onChange={(e) => setFormData({ ...formData, dateLogged: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="loggedBy">Logged By *</Label>
                <Input
                  id="loggedBy"
                  value={formData.loggedBy}
                  onChange={(e) => setFormData({ ...formData, loggedBy: e.target.value })}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="impact">Impact *</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value: "Low" | "Medium" | "High" | "Critical") => setFormData({ ...formData, impact: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "Low" | "Medium" | "High" | "Urgent") => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "Open" | "In Progress" | "Resolved" | "Closed") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="lesson">Lesson Learnt *</Label>
                <Input
                  id="lesson"
                  value={formData.lesson}
                  onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                  placeholder="Brief description of the lesson learnt"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed description of the lesson learnt..."
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="recommendations">Recommendations *</Label>
                <Textarea
                  id="recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  placeholder="What should be done differently in the future?"
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="actionsTaken">Actions Taken *</Label>
                <Textarea
                  id="actionsTaken"
                  value={formData.actionsTaken}
                  onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                  placeholder="What actions were taken to address this lesson?"
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="documents">Related Documents</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="documents"
                    value={formData.documentInput}
                    onChange={(e) => setFormData({ ...formData, documentInput: e.target.value })}
                    placeholder="Document name or link"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDocument();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addDocument}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                {formData.documents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{doc}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Link to documents in Project Documents section
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createLessonLearntMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createLessonLearntMutation.isPending}
              >
                {createLessonLearntMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Lesson Learnt"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Learnt Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedEntry(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lesson Learnt</DialogTitle>
            <DialogDescription>
              Update lesson learnt information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Installation">Installation</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Pre-commissioning">Pre-commissioning</SelectItem>
                    <SelectItem value="Commissioning">Commissioning</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                    <SelectItem value="Subcontracts">Subcontracts</SelectItem>
                    <SelectItem value="Quality">Quality</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "Risk" | "Opportunity") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Risk">Risk</SelectItem>
                    <SelectItem value="Opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-dateLogged">Date Logged *</Label>
                <Input
                  id="edit-dateLogged"
                  type="date"
                  value={formData.dateLogged}
                  onChange={(e) => setFormData({ ...formData, dateLogged: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-loggedBy">Logged By *</Label>
                <Input
                  id="edit-loggedBy"
                  value={formData.loggedBy}
                  onChange={(e) => setFormData({ ...formData, loggedBy: e.target.value })}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-impact">Impact *</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value: "Low" | "Medium" | "High" | "Critical") => setFormData({ ...formData, impact: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "Low" | "Medium" | "High" | "Urgent") => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "Open" | "In Progress" | "Resolved" | "Closed") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-lesson">Lesson Learnt *</Label>
                <Input
                  id="edit-lesson"
                  value={formData.lesson}
                  onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                  placeholder="Brief description of the lesson learnt"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-description">Detailed Description *</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed description of the lesson learnt..."
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-recommendations">Recommendations *</Label>
                <Textarea
                  id="edit-recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  placeholder="What should be done differently in the future?"
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-actionsTaken">Actions Taken *</Label>
                <Textarea
                  id="edit-actionsTaken"
                  value={formData.actionsTaken}
                  onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                  placeholder="What actions were taken to address this lesson?"
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-documents">Related Documents</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="edit-documents"
                    value={formData.documentInput}
                    onChange={(e) => setFormData({ ...formData, documentInput: e.target.value })}
                    placeholder="Document name or link"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDocument();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addDocument}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                {formData.documents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{doc}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Link to documents in Project Documents section
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateLessonLearntMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateLessonLearntMutation.isPending}
              >
                {updateLessonLearntMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Lesson Learnt"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Entry Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Learnt Details</DialogTitle>
            <DialogDescription>
              View detailed information about this lesson learnt.
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Category</Label>
                  <Badge className="mt-1">{selectedEntry.category}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Type</Label>
                  <Badge className={`${getTypeColor(selectedEntry.type)} mt-1`}>
                    {selectedEntry.type}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date Logged</Label>
                  <p className="text-sm mt-1">{formatDate(selectedEntry.dateLogged)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Logged By</Label>
                  <p className="text-sm mt-1">{selectedEntry.loggedBy}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={`${getStatusColor(selectedEntry.status)} mt-1`}>
                    {selectedEntry.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Impact</Label>
                  <Badge className={`${getImpactColor(selectedEntry.impact)} mt-1`}>
                    {selectedEntry.impact}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Priority</Label>
                  <Badge className={`${getPriorityColor(selectedEntry.priority)} mt-1`}>
                    {selectedEntry.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm mt-1">{formatDate(selectedEntry.updatedAt)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Lesson Learnt</Label>
                <p className="text-sm font-medium mt-1">{selectedEntry.lesson}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="text-sm mt-1">{selectedEntry.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Recommendations</Label>
                <p className="text-sm mt-1">{selectedEntry.recommendations}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Actions Taken</Label>
                <p className="text-sm mt-1">{selectedEntry.actionsTaken}</p>
              </div>

              {selectedEntry.documents && selectedEntry.documents.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Related Documents</Label>
                  <div className="mt-2 space-y-2">
                    {selectedEntry.documents.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{doc}</span>
                        <Button variant="ghost" size="sm">
                          <Link className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedEntry) {
                handleEdit(selectedEntry);
                setIsViewDialogOpen(false);
              }
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 