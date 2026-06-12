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
  Users,
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
  Award,
  GripVertical,
  Settings,
  Save,
  RotateCcw,
  Percent
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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface IndirectManpowerPosition {
  id: number;
  projectId: number;
  positionId: string;
  name: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IndirectManpowerEntry {
  id: number;
  projectId: number;
  date: string;
  positions: { [positionId: string]: number }; // Percentage values (0-100)
  totalOverhead: number;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Default positions to initialize if none exist
const defaultIndirectPositions = [
  { positionId: "project_manager", name: "Project Manager", order: 1, isActive: true },
  { positionId: "project_engineer", name: "Project Engineer", order: 2, isActive: true },
  { positionId: "planner", name: "Planner", order: 3, isActive: true },
  { positionId: "admin_staff", name: "Admin Staff", order: 4, isActive: true },
  { positionId: "purchasing_engineer", name: "Purchasing Engineer", order: 5, isActive: true },
  { positionId: "supply_chain_staff", name: "Supply Chain Staff", order: 6, isActive: true },
  { positionId: "hr_staff", name: "HR Staff", order: 7, isActive: true },
  { positionId: "it_staff", name: "IT Staff", order: 8, isActive: true },
  { positionId: "portfolio_manager", name: "Portfolio Manager", order: 9, isActive: true },
  { positionId: "quality_manager", name: "Quality Manager", order: 10, isActive: true },
  { positionId: "safety_manager", name: "Safety Manager", order: 11, isActive: true },
  { positionId: "finance_staff", name: "Finance Staff", order: 12, isActive: true },
  { positionId: "legal_staff", name: "Legal Staff", order: 13, isActive: false },
  { positionId: "marketing_staff", name: "Marketing Staff", order: 14, isActive: false },
  { positionId: "business_analyst", name: "Business Analyst", order: 15, isActive: false },
  { positionId: "contract_manager", name: "Contract Manager", order: 16, isActive: false },
];

export default function IndirectManpowerList() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch positions
  const { data: positionsData = [], isLoading: positionsLoading } = useQuery<IndirectManpowerPosition[]>({
    queryKey: [`/api/projects/${projectId}/indirect-manpower-positions`],
  });

  // Fetch entries
  const { data: indirectManpowerEntries = [], isLoading: entriesLoading } = useQuery<IndirectManpowerEntry[]>({
    queryKey: [`/api/projects/${projectId}/indirect-manpower-entries`],
  });

  const [positions, setPositions] = useState<IndirectManpowerPosition[]>(positionsData);
  useEffect(() => {
    setPositions(positionsData);
  }, [positionsData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<IndirectManpowerEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    createdBy: "",
    remarks: "",
    positions: {} as { [positionId: string]: number },
  });

  // Mutations
  const updatePositionsMutation = useMutation({
    mutationFn: async (positionsData: Omit<IndirectManpowerPosition, "id" | "projectId" | "createdAt" | "updatedAt">[]) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/indirect-manpower-positions`, positionsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/indirect-manpower-positions`] });
      toast({
        title: "Success",
        description: "Position settings saved successfully",
      });
      setIsColumnSettingsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save position settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize positions if empty (after mutation is defined)
  useEffect(() => {
    if (!positionsLoading && positionsData.length === 0 && projectId) {
      const initPositions = defaultIndirectPositions.map(p => ({
        ...p,
        projectId: parseInt(projectId),
      }));
      updatePositionsMutation.mutate(initPositions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsData.length, positionsLoading, projectId]);

  // Entry Mutations
  const createEntryMutation = useMutation({
    mutationFn: async (data: Omit<IndirectManpowerEntry, "id" | "projectId" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/indirect-manpower-entries`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/indirect-manpower-entries`] });
      toast({
        title: "Success",
        description: "Overhead entry created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create overhead entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<IndirectManpowerEntry, "id" | "projectId" | "createdAt" | "updatedAt">> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/indirect-manpower-entries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/indirect-manpower-entries`] });
      toast({
        title: "Success",
        description: "Overhead entry updated successfully",
      });
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update overhead entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/indirect-manpower-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/indirect-manpower-entries`] });
      toast({
        title: "Success",
        description: "Overhead entry deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete overhead entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      createdBy: "",
      remarks: "",
      positions: {},
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.createdBy.trim()) {
      toast({
        title: "Validation Error",
        description: "Created by is required",
        variant: "destructive",
      });
      return;
    }

    // Calculate total overhead (sum of percentages)
    const totalOverhead = Object.values(formData.positions).reduce((sum, percent) => sum + (percent || 0), 0);

    const entryData = {
      date: formData.date,
      positions: formData.positions,
      totalOverhead: totalOverhead,
      remarks: formData.remarks || null,
      createdBy: formData.createdBy,
    };

    if (selectedEntry) {
      updateEntryMutation.mutate({ id: selectedEntry.id, data: entryData });
    } else {
      createEntryMutation.mutate(entryData);
    }
  };

  const handleEdit = (entry: IndirectManpowerEntry) => {
    setSelectedEntry(entry);
    setFormData({
      date: entry.date,
      createdBy: entry.createdBy,
      remarks: entry.remarks || "",
      positions: entry.positions || {},
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this overhead entry?")) {
      deleteEntryMutation.mutate(id);
    }
  };

  const handleSavePositions = () => {
    const positionsData = positions.map(p => ({
      positionId: p.positionId,
      name: p.name,
      order: p.order,
      isActive: p.isActive,
    }));
    updatePositionsMutation.mutate(positionsData);
  };

  // Get active positions sorted by order
  const activePositions = positions.filter(p => p.isActive).sort((a, b) => a.order - b.order);

  // Filter entries based on search
  const filteredEntries = indirectManpowerEntries.filter(entry => {
    const matchesSearch = entry.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate totals for each position
  const getPositionTotal = (positionId: string) => {
    return indirectManpowerEntries.reduce((total, entry) => total + (entry.positions?.[positionId] || 0), 0);
  };

  // Calculate overall total
  const getOverallTotal = () => {
    return indirectManpowerEntries.reduce((total, entry) => total + entry.totalOverhead, 0);
  };

  // Handle column drag and drop
  const handleColumnDragStart = (e: React.DragEvent, positionId: string) => {
    setDraggedColumn(positionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', positionId);
  };

  const handleColumnDragOver = (e: React.DragEvent, positionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(positionId);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetPositionId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetPositionId) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const draggedPos = positions.find(p => p.positionId === draggedColumn);
    const targetPos = positions.find(p => p.positionId === targetPositionId);
    
    if (draggedPos && targetPos) {
      // Create new positions array with updated order
      const newPositions = positions.map(p => {
        if (p.positionId === draggedColumn) {
          return { ...p, order: targetPos.order };
        } else if (p.positionId === targetPositionId) {
          return { ...p, order: draggedPos.order };
        }
        return p;
      });
      
      // Reorder all positions to ensure sequential ordering
      const reorderedPositions = newPositions
        .sort((a, b) => a.order - b.order)
        .map((p, index) => ({
          ...p,
          order: index + 1
        }));
      
      setPositions(reorderedPositions);
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const togglePositionVisibility = (positionId: string) => {
    setPositions(prev => prev.map(p => 
      p.positionId === positionId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indirect Manpower List</h1>
          <p className="text-gray-600">Manage daily overhead allocation by position (percentage-based)</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsColumnSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Column Settings
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Overhead Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search remarks or created by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
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
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Days</p>
                <p className="text-2xl font-bold">{indirectManpowerEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Overhead</p>
                <p className="text-2xl font-bold">{getOverallTotal()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Positions</p>
                <p className="text-2xl font-bold">{activePositions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Daily</p>
                <p className="text-2xl font-bold">
                  {indirectManpowerEntries.length > 0 ? Math.round(getOverallTotal() / indirectManpowerEntries.length) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indirect Manpower Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Overhead Allocation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(positionsLoading || entriesLoading) ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
          <div className="w-full overflow-x-auto" style={{ maxWidth: 'calc(100vw - 300px)' }}>
            <div className="min-w-max" style={{ minWidth: `${(activePositions.length + 5) * 112 + 96}px` }}>
              <div className="overflow-hidden border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24 sticky left-0 bg-white z-10 border-r">
                        <div className="text-xs font-medium">Date</div>
                      </TableHead>
                      {activePositions.map((position) => (
                        <TableHead 
                          key={position.id}
                          className={`w-28 cursor-move border-r ${
                            draggedColumn === position.positionId ? 'bg-blue-100' : ''
                          } ${
                            dragOverColumn === position.positionId ? 'bg-green-100' : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleColumnDragStart(e, position.positionId)}
                          onDragOver={(e) => handleColumnDragOver(e, position.positionId)}
                          onDragLeave={handleColumnDragLeave}
                          onDrop={(e) => handleColumnDrop(e, position.positionId)}
                        >
                          <div className="flex items-center justify-between p-1">
                            <span className="text-xs font-medium leading-tight break-words min-w-0 flex-1">
                              {position.name}
                            </span>
                            <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0 ml-1" />
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-28 border-r">
                        <div className="text-xs font-medium">Total</div>
                      </TableHead>
                      <TableHead className="w-32 border-r">
                        <div className="text-xs font-medium">Remarks</div>
                      </TableHead>
                      <TableHead className="w-28 border-r">
                        <div className="text-xs font-medium">Created By</div>
                      </TableHead>
                      <TableHead className="w-20">
                        <div className="text-xs font-medium">Actions</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="sticky left-0 bg-white z-10 border-r">
                          <div className="text-xs font-medium">
                            {formatDate(entry.date)}
                          </div>
                        </TableCell>
                        {activePositions.map((position) => (
                          <TableCell key={position.id} className="text-center border-r w-28">
                            <div className="text-xs font-medium">
                              {formatPercentage(entry.positions?.[position.positionId] || 0)}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="text-center border-r w-28">
                          <div className="text-xs font-bold text-blue-600">
                            {formatPercentage(entry.totalOverhead)}
                          </div>
                        </TableCell>
                        <TableCell className="border-r w-32">
                          <div className="max-w-32">
                            <p className="text-xs text-gray-600 truncate">
                              {entry.remarks || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs border-r w-28">
                          {entry.createdBy}
                        </TableCell>
                        <TableCell className="w-20">
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
                              disabled={deleteEntryMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-gray-50">
                      <TableCell className="sticky left-0 bg-gray-50 z-10 border-r">
                        <div className="text-xs font-bold">TOTAL</div>
                      </TableCell>
                      {activePositions.map((position) => (
                        <TableCell key={position.id} className="text-center border-r w-28">
                          <div className="text-xs font-bold text-green-600">
                            {formatPercentage(getPositionTotal(position.positionId))}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center border-r w-28">
                        <div className="text-xs font-bold text-blue-600">
                          {formatPercentage(getOverallTotal())}
                        </div>
                      </TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Add Overhead Entry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedEntry(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Overhead Entry</DialogTitle>
            <DialogDescription>
              Add daily overhead allocation for all positions (percentage-based).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
              />
            </div>
            
            <div>
                <Label htmlFor="createdBy">Created By *</Label>
              <Input
                id="createdBy"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                placeholder="Enter your name"
                  required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Enter any remarks or notes..."
                rows={2}
              />
            </div>

            {/* Position inputs */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Overhead Allocation (%)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {activePositions.map((position) => (
                  <div key={position.id}>
                      <Label htmlFor={`pos-${position.positionId}`} className="text-xs">
                      {position.name}
                    </Label>
                    <Input
                        id={`pos-${position.positionId}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                        value={formData.positions[position.positionId] || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          positions: {
                            ...formData.positions,
                            [position.positionId]: parseFloat(e.target.value) || 0
                          }
                        })}
                      placeholder="0"
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
                <div className="mt-2 text-sm font-semibold text-blue-600">
                  Total: {Object.values(formData.positions).reduce((sum, percent) => sum + (percent || 0), 0).toFixed(1)}%
              </div>
            </div>
          </div>
          <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createEntryMutation.isPending}
              >
              Cancel
            </Button>
              <Button 
                type="submit"
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Entry"
                )}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Overhead Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedEntry(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Overhead Entry</DialogTitle>
            <DialogDescription>
              Update daily overhead allocation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-createdBy">Created By *</Label>
                <Input
                  id="edit-createdBy"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-remarks">Remarks</Label>
                <Textarea
                  id="edit-remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Enter any remarks or notes..."
                  rows={2}
                />
              </div>

              {/* Position inputs */}
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">Overhead Allocation (%)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {activePositions.map((position) => (
                    <div key={position.id}>
                      <Label htmlFor={`edit-pos-${position.positionId}`} className="text-xs">
                        {position.name}
                      </Label>
                      <Input
                        id={`edit-pos-${position.positionId}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.positions[position.positionId] || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          positions: {
                            ...formData.positions,
                            [position.positionId]: parseFloat(e.target.value) || 0
                          }
                        })}
                        placeholder="0"
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm font-semibold text-blue-600">
                  Total: {Object.values(formData.positions).reduce((sum, percent) => sum + (percent || 0), 0).toFixed(1)}%
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateEntryMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateEntryMutation.isPending}
              >
                {updateEntryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Entry Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Overhead Entry Details</DialogTitle>
            <DialogDescription>
              View detailed information about this overhead entry.
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedEntry.date)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created By</Label>
                  <p className="text-sm">{selectedEntry.createdBy}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Overhead</Label>
                  <p className="text-sm font-bold text-blue-600">{formatPercentage(selectedEntry.totalOverhead)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm">{formatDate(selectedEntry.updatedAt)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Overhead Allocation</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {activePositions.map((position) => (
                    <div key={position.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{position.name}</span>
                      <span className="text-sm font-bold text-blue-600">
                        {formatPercentage(selectedEntry.positions?.[position.positionId] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Remarks</Label>
                <p className="text-sm mt-1">{selectedEntry.remarks}</p>
              </div>
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

      {/* Column Settings Dialog */}
      <Dialog open={isColumnSettingsOpen} onOpenChange={setIsColumnSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Column Settings</DialogTitle>
            <DialogDescription>
              Manage which position columns are visible and their order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={position.isActive}
                      onChange={() => togglePositionVisibility(position.positionId)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">{position.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Order: {position.order}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsColumnSettingsOpen(false)}
              disabled={updatePositionsMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePositions}
              disabled={updatePositionsMutation.isPending}
            >
              {updatePositionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 