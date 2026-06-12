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
  RotateCcw
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

interface ManpowerPosition {
  id: number;
  projectId: number;
  positionId: string;
  name: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ManpowerEntry {
  id: number;
  projectId: number;
  date: string;
  positions: { [positionId: string]: number };
  totalManpower: number;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Default positions to initialize if none exist
const defaultPositions = [
  { positionId: "mason", name: "Mason", order: 1, isActive: true },
  { positionId: "carpenter", name: "Carpenter", order: 2, isActive: true },
  { positionId: "helper", name: "Helper", order: 3, isActive: true },
  { positionId: "electrical_technician", name: "Electrical Technician", order: 4, isActive: true },
  { positionId: "instrument_technician", name: "Instrument Technician", order: 5, isActive: true },
  { positionId: "hvac_technician", name: "HVAC Technician", order: 6, isActive: true },
  { positionId: "plumber", name: "Plumber", order: 7, isActive: true },
  { positionId: "welder", name: "Welder", order: 8, isActive: true },
  { positionId: "painter", name: "Painter", order: 9, isActive: true },
  { positionId: "operator", name: "Equipment Operator", order: 10, isActive: true },
  { positionId: "supervisor", name: "Supervisor", order: 11, isActive: true },
  { positionId: "foreman", name: "Foreman", order: 12, isActive: true },
  { positionId: "engineer", name: "Engineer", order: 13, isActive: false },
  { positionId: "architect", name: "Architect", order: 14, isActive: false },
  { positionId: "surveyor", name: "Surveyor", order: 15, isActive: false },
  { positionId: "safety_officer", name: "Safety Officer", order: 16, isActive: false },
  { positionId: "quality_controller", name: "Quality Controller", order: 17, isActive: false },
];

export default function DirectManpowerList() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch positions
  const { data: positionsData = [], isLoading: positionsLoading } = useQuery<ManpowerPosition[]>({
    queryKey: [`/api/projects/${projectId}/direct-manpower-positions`],
  });

  // Fetch entries
  const { data: manpowerEntries = [], isLoading: entriesLoading } = useQuery<ManpowerEntry[]>({
    queryKey: [`/api/projects/${projectId}/direct-manpower-entries`],
  });


  const [positions, setPositions] = useState<ManpowerPosition[]>(positionsData);
  useEffect(() => {
    setPositions(positionsData);
  }, [positionsData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ManpowerEntry | null>(null);
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

  // Entry Mutations
  const createEntryMutation = useMutation({
    mutationFn: async (data: Omit<ManpowerEntry, "id" | "projectId" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/direct-manpower-entries`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/direct-manpower-entries`] });
      toast({
        title: "Success",
        description: "Manpower entry created successfully",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create manpower entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<ManpowerEntry, "id" | "projectId" | "createdAt" | "updatedAt">> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/direct-manpower-entries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/direct-manpower-entries`] });
      toast({
        title: "Success",
        description: "Manpower entry updated successfully",
      });
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update manpower entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/direct-manpower-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/direct-manpower-entries`] });
      toast({
        title: "Success",
        description: "Manpower entry deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete manpower entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePositionsMutation = useMutation({
    mutationFn: async (positionsData: Omit<ManpowerPosition, "id" | "projectId" | "createdAt" | "updatedAt">[]) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/direct-manpower-positions`, positionsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/direct-manpower-positions`] });
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
      const initPositions = defaultPositions.map(p => ({
        ...p,
        projectId: parseInt(projectId),
      }));
      updatePositionsMutation.mutate(initPositions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsData.length, positionsLoading, projectId]);

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

    // Calculate total manpower
    const totalManpower = Object.values(formData.positions).reduce((sum, count) => sum + (count || 0), 0);

    const entryData = {
      date: formData.date,
      positions: formData.positions,
      totalManpower: totalManpower,
      remarks: formData.remarks || null,
      createdBy: formData.createdBy,
    };

    if (selectedEntry) {
      updateEntryMutation.mutate({ id: selectedEntry.id, data: entryData });
    } else {
      createEntryMutation.mutate(entryData);
    }
  };

  const handleEdit = (entry: ManpowerEntry) => {
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
    if (window.confirm("Are you sure you want to delete this manpower entry?")) {
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
  const filteredEntries = manpowerEntries.filter(entry => {
    const matchesSearch = entry.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate totals for each position
  const getPositionTotal = (positionId: string) => {
    return manpowerEntries.reduce((total, entry) => total + (entry.positions?.[positionId] || 0), 0);
  };

  // Calculate overall total
  const getOverallTotal = () => {
    return manpowerEntries.reduce((total, entry) => total + entry.totalManpower, 0);
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

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Direct Manpower List</h1>
          <p className="text-gray-600">Manage daily manpower allocation by position</p>
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
            Add Manpower Entry
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
                <p className="text-2xl font-bold">{manpowerEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Manpower</p>
                <p className="text-2xl font-bold">{getOverallTotal()}</p>
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
                  {manpowerEntries.length > 0 ? Math.round(getOverallTotal() / manpowerEntries.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manpower Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Manpower Allocation</CardTitle>
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
                              {entry.positions?.[position.positionId] || 0}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="text-center border-r w-28">
                          <div className="text-xs font-bold text-blue-600">
                            {entry.totalManpower}
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
                            {getPositionTotal(position.positionId)}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center border-r w-28">
                        <div className="text-xs font-bold text-blue-600">
                          {getOverallTotal()}
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

      {/* Add Manpower Entry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedEntry(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Manpower Entry</DialogTitle>
            <DialogDescription>
              Add daily manpower allocation for all positions.
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
              <Label className="text-sm font-medium">Manpower Allocation</Label>
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
                        value={formData.positions[position.positionId] || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          positions: {
                            ...formData.positions,
                            [position.positionId]: parseInt(e.target.value) || 0
                          }
                        })}
                      placeholder="0"
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
                <div className="mt-2 text-sm font-semibold text-blue-600">
                  Total: {Object.values(formData.positions).reduce((sum, count) => sum + (count || 0), 0)}
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

      {/* Edit Manpower Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedEntry(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Manpower Entry</DialogTitle>
            <DialogDescription>
              Update daily manpower allocation.
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
                <Label className="text-sm font-medium">Manpower Allocation</Label>
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
                        value={formData.positions[position.positionId] || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          positions: {
                            ...formData.positions,
                            [position.positionId]: parseInt(e.target.value) || 0
                          }
                        })}
                        placeholder="0"
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm font-semibold text-blue-600">
                  Total: {Object.values(formData.positions).reduce((sum, count) => sum + (count || 0), 0)}
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
            <DialogTitle>Manpower Entry Details</DialogTitle>
            <DialogDescription>
              View detailed information about this manpower entry.
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
                  <Label className="text-sm font-medium text-gray-500">Total Manpower</Label>
                  <p className="text-sm font-bold text-blue-600">{selectedEntry.totalManpower}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm">{formatDate(selectedEntry.updatedAt)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Manpower Allocation</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {activePositions.map((position) => (
                    <div key={position.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{position.name}</span>
                      <span className="text-sm font-bold text-blue-600">
                        {selectedEntry.positions?.[position.positionId] || 0}
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