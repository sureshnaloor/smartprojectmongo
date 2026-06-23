import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  Eye
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RiskEntry {
  id: number;
  projectId: number;
  dateLogged: string;
  risk: string;
  riskType: 'Risk' | 'Opportunity';
  probability: 'High' | 'Moderate' | 'Low';
  impact: 'High' | 'Moderate' | 'Low';
  userLogged: string;
  actionTaken: string;
  remarks: string | null;
  status: 'Open' | 'In Progress' | 'Closed';
  createdAt: string;
  updatedAt: string;
}

export default function RiskRegister() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: risks = [], isLoading } = useQuery<RiskEntry[]>({
    queryKey: [`/api/projects/${projectId}/risk-register`],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProbability, setFilterProbability] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state for Add/Edit Risk modal
  const [formData, setFormData] = useState({
    dateLogged: new Date().toISOString().split('T')[0],
    risk: "",
    riskType: "" as "" | "Risk" | "Opportunity",
    probability: "" as "" | "High" | "Moderate" | "Low",
    impact: "" as "" | "High" | "Moderate" | "Low",
    userLogged: "",
    actionTaken: "",
    remarks: "",
    status: "Open" as "Open" | "In Progress" | "Closed",
  });

  // Filter risks based on search and filters
  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.risk.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         risk.userLogged.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || risk.riskType === filterType;
    const matchesProbability = filterProbability === "all" || risk.probability === filterProbability;
    const matchesImpact = filterImpact === "all" || risk.impact === filterImpact;
    const matchesStatus = filterStatus === "all" || risk.status === filterStatus;
    
    return matchesSearch && matchesType && matchesProbability && matchesImpact && matchesStatus;
  });

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-orange-100 text-orange-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskTypeColor = (type: string) => {
    return type === 'Risk' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  // Create risk mutation
  const createRiskMutation = useMutation({
    mutationFn: async (data: Omit<RiskEntry, "id" | "projectId" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/risk-register`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
      toast({
        title: "Success",
        description: "Risk/Opportunity created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create risk/opportunity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update risk mutation
  const updateRiskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<RiskEntry, "id" | "projectId" | "createdAt" | "updatedAt">> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/risk-register/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
      toast({
        title: "Success",
        description: "Risk/Opportunity updated successfully",
      });
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedRisk(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update risk/opportunity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete risk mutation
  const deleteRiskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/risk-register/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risk-register`] });
      toast({
        title: "Success",
        description: "Risk/Opportunity deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete risk/opportunity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      dateLogged: new Date().toISOString().split('T')[0],
      risk: "",
      riskType: "" as "" | "Risk" | "Opportunity",
      probability: "" as "" | "High" | "Moderate" | "Low",
      impact: "" as "" | "High" | "Moderate" | "Low",
      userLogged: "",
      actionTaken: "",
      remarks: "",
      status: "Open" as "Open" | "In Progress" | "Closed",
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.risk.trim()) {
      toast({
        title: "Validation Error",
        description: "Risk/Opportunity description is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.riskType) {
      toast({
        title: "Validation Error",
        description: "Type is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.probability) {
      toast({
        title: "Validation Error",
        description: "Probability is required",
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
    if (!formData.userLogged.trim()) {
      toast({
        title: "Validation Error",
        description: "User logged is required",
        variant: "destructive",
      });
      return;
    }
    if (!formData.actionTaken.trim()) {
      toast({
        title: "Validation Error",
        description: "Action taken is required",
        variant: "destructive",
      });
      return;
    }

    const riskData = {
      dateLogged: formData.dateLogged,
      risk: formData.risk,
      riskType: formData.riskType,
      probability: formData.probability,
      impact: formData.impact,
      userLogged: formData.userLogged,
      actionTaken: formData.actionTaken,
      remarks: formData.remarks || null,
      status: formData.status,
    };

    if (selectedRisk) {
      updateRiskMutation.mutate({ id: selectedRisk.id, data: riskData });
    } else {
      createRiskMutation.mutate(riskData);
    }
  };

  const handleEdit = (risk: RiskEntry) => {
    setSelectedRisk(risk);
    setFormData({
      dateLogged: risk.dateLogged,
      risk: risk.risk,
      riskType: risk.riskType,
      probability: risk.probability,
      impact: risk.impact,
      userLogged: risk.userLogged,
      actionTaken: risk.actionTaken,
      remarks: risk.remarks || "",
      status: risk.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this risk/opportunity?")) {
      deleteRiskMutation.mutate(id);
    }
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Register</h1>
          <p className="text-gray-600">Manage project risks and opportunities</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Risk/Opportunity
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
                  placeholder="Search risks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
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
              <Label htmlFor="probability">Probability</Label>
              <Select value={filterProbability} onValueChange={setFilterProbability}>
                <SelectTrigger>
                  <SelectValue placeholder="All Probabilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Probabilities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="impact">Impact</Label>
              <Select value={filterImpact} onValueChange={setFilterImpact}>
                <SelectTrigger>
                  <SelectValue placeholder="All Impacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Impacts</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
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
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterProbability("all");
                  setFilterImpact("all");
                  setFilterStatus("all");
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
                <p className="text-sm text-gray-600">Total Risks</p>
                <p className="text-2xl font-bold">{risks.filter(r => r.riskType === 'Risk').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Opportunities</p>
                <p className="text-2xl font-bold">{risks.filter(r => r.riskType === 'Opportunity').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Open Items</p>
                <p className="text-2xl font-bold">{risks.filter(r => r.status === 'Open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Closed Items</p>
                <p className="text-2xl font-bold">{risks.filter(r => r.status === 'Closed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Register Entries</CardTitle>
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
                    <TableHead>Date Logged</TableHead>
                    <TableHead>Risk/Opportunity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No risks/opportunities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRisks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">
                          {new Date(risk.dateLogged).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{risk.risk}</p>
                            <p className="text-sm text-gray-500 truncate">{risk.actionTaken}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskTypeColor(risk.riskType)}>
                            {risk.riskType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getProbabilityColor(risk.probability)}>
                            {risk.probability}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getImpactColor(risk.impact)}>
                            {risk.impact}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-400" />
                            {risk.userLogged}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(risk.status)}>
                            {risk.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRisk(risk);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(risk)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(risk.id)}
                              disabled={deleteRiskMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Add Risk Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedRisk(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Risk/Opportunity</DialogTitle>
            <DialogDescription>
              Log a new risk or opportunity for the project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="riskType">Type *</Label>
                <Select
                  value={formData.riskType}
                  onValueChange={(value: "Risk" | "Opportunity") => 
                    setFormData({ ...formData, riskType: value })
                  }
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

              <div className="md:col-span-2">
                <Label htmlFor="risk">Risk/Opportunity Description *</Label>
                <Textarea
                  id="risk"
                  value={formData.risk}
                  onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
                  placeholder="Describe the risk or opportunity..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="probability">Probability *</Label>
                <Select
                  value={formData.probability}
                  onValueChange={(value: "High" | "Moderate" | "Low") => 
                    setFormData({ ...formData, probability: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="impact">Impact *</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value: "High" | "Moderate" | "Low") => 
                    setFormData({ ...formData, impact: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="userLogged">User Logged *</Label>
                <Input
                  id="userLogged"
                  value={formData.userLogged}
                  onChange={(e) => setFormData({ ...formData, userLogged: e.target.value })}
                  placeholder="Enter user name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "Open" | "In Progress" | "Closed") => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="actionTaken">Action Taken *</Label>
                <Textarea
                  id="actionTaken"
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  placeholder="Describe actions taken or planned..."
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional remarks or notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createRiskMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createRiskMutation.isPending}
              >
                {createRiskMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Risk/Opportunity"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Risk Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedRisk(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Risk/Opportunity</DialogTitle>
            <DialogDescription>
              Update risk or opportunity information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="edit-riskType">Type *</Label>
                <Select
                  value={formData.riskType}
                  onValueChange={(value: "Risk" | "Opportunity") => 
                    setFormData({ ...formData, riskType: value })
                  }
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

              <div className="md:col-span-2">
                <Label htmlFor="edit-risk">Risk/Opportunity Description *</Label>
                <Textarea
                  id="edit-risk"
                  value={formData.risk}
                  onChange={(e) => setFormData({ ...formData, risk: e.target.value })}
                  placeholder="Describe the risk or opportunity..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-probability">Probability *</Label>
                <Select
                  value={formData.probability}
                  onValueChange={(value: "High" | "Moderate" | "Low") => 
                    setFormData({ ...formData, probability: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-impact">Impact *</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value: "High" | "Moderate" | "Low") => 
                    setFormData({ ...formData, impact: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-userLogged">User Logged *</Label>
                <Input
                  id="edit-userLogged"
                  value={formData.userLogged}
                  onChange={(e) => setFormData({ ...formData, userLogged: e.target.value })}
                  placeholder="Enter user name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "Open" | "In Progress" | "Closed") => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-actionTaken">Action Taken *</Label>
                <Textarea
                  id="edit-actionTaken"
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  placeholder="Describe actions taken or planned..."
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-remarks">Remarks</Label>
                <Textarea
                  id="edit-remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional remarks or notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateRiskMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateRiskMutation.isPending}
              >
                {updateRiskMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Risk/Opportunity"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Risk Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Risk/Opportunity Details</DialogTitle>
            <DialogDescription>
              View detailed information about this risk or opportunity.
            </DialogDescription>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date Logged</Label>
                  <p className="text-sm">{new Date(selectedRisk.dateLogged).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Type</Label>
                  <Badge className={getRiskTypeColor(selectedRisk.riskType)}>
                    {selectedRisk.riskType}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Probability</Label>
                  <Badge className={getProbabilityColor(selectedRisk.probability)}>
                    {selectedRisk.probability}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Impact</Label>
                  <Badge className={getImpactColor(selectedRisk.impact)}>
                    {selectedRisk.impact}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">User Logged</Label>
                  <p className="text-sm">{selectedRisk.userLogged}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={getStatusColor(selectedRisk.status)}>
                    {selectedRisk.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm">{new Date(selectedRisk.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Risk/Opportunity</Label>
                <p className="text-sm mt-1">{selectedRisk.risk}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Action Taken</Label>
                <p className="text-sm mt-1">{selectedRisk.actionTaken}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Remarks</Label>
                <p className="text-sm mt-1">{selectedRisk.remarks}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedRisk) {
                handleEdit(selectedRisk);
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