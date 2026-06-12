import { useState, useRef } from "react";
import { useParams } from "wouter";
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
  List
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import * as XLSX from 'xlsx';

interface DailyProgressEntry {
  id: number;
  date: string;
  mainCategory: 'Design' | 'Construction' | 'Installation' | 'Testing' | 'Pre-commissioning' | 'Commissioning';
  subCategory: string;
  activity: string;
  task: string;
  taskCompletion: number;
  activityCompletion: number;
  resourcesDeployed: string[];
  obstruction: 'Headwind' | 'Tailwind' | 'None';
  remarks: string;
  status: 'In Progress' | 'Completed' | 'On Hold';
}

export default function ProjectDailyProgress() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<DailyProgressEntry[]>({
    queryKey: [`/api/projects/${projectId}/daily-progress`],
  });
  const progressEntries = Array.isArray(data) ? data : [];
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterObstruction, setFilterObstruction] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntry, setSelectedEntry] = useState<DailyProgressEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<DailyProgressEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const createEntryMutation = useMutation({
    mutationFn: async (newEntry: Omit<DailyProgressEntry, "id">) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/daily-progress`, newEntry);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-progress`] });
      toast({
        title: "Success",
        description: "Daily progress entry added successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DailyProgressEntry> }) => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}/daily-progress/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-progress`] });
      toast({
        title: "Success",
        description: "Entry updated successfully",
      });
      setIsAddDialogOpen(false);
      setEditingEntry(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/daily-progress/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-progress`] });
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createBulkMutation = useMutation({
    mutationFn: async (entries: Omit<DailyProgressEntry, "id">[]) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/daily-progress/bulk`, entries);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-progress`] });
      toast({
        title: "Success",
        description: `${data.length} entries uploaded successfully`,
      });
      setIsBulkDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to upload entries: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const resourcesStr = formData.get("resourcesDeployed") as string;

    const entryData = {
      date: formData.get("date") as string,
      mainCategory: formData.get("mainCategory") as any,
      subCategory: formData.get("subCategory") as string,
      activity: formData.get("activity") as string,
      task: formData.get("task") as string,
      taskCompletion: parseInt(formData.get("taskCompletion") as string),
      activityCompletion: parseInt(formData.get("activityCompletion") as string),
      resourcesDeployed: resourcesStr.split(',').map(s => s.trim()).filter(Boolean),
      obstruction: formData.get("obstruction") as any,
      remarks: formData.get("remarks") as string,
      status: formData.get("status") as any,
    };

    if (editingEntry) {
      updateEntryMutation.mutate({ id: editingEntry.id, data: entryData });
    } else {
      createEntryMutation.mutate(entryData);
    }
  };

  const handleEditClick = (entry: DailyProgressEntry) => {
    setEditingEntry(entry);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteEntryMutation.mutate(id);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        date: "2024-01-01",
        mainCategory: "Design",
        subCategory: "Civil",
        activity: "Foundation Design",
        task: "Review",
        taskCompletion: 50,
        activityCompletion: 30,
        resourcesDeployed: "Engineer, CAD",
        obstruction: "None",
        remarks: "Started",
        status: "In Progress"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "daily_progress_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const excelDateToJSDate = (serial: any) => {
          if (!serial) return new Date().toISOString().split('T')[0];
          if (typeof serial === 'string') return serial;
          // Excel serial date to JS Date
          // 25569 is offset for 1970-01-01
          const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
          return date.toISOString().split('T')[0];
        };

        const formattedData = data.map((row: any) => ({
          date: excelDateToJSDate(row.date), // Ensure format YYYY-MM-DD
          mainCategory: row.mainCategory,
          subCategory: row.subCategory,
          activity: row.activity,
          task: row.task,
          taskCompletion: Number(row.taskCompletion),
          activityCompletion: Number(row.activityCompletion),
          resourcesDeployed: typeof row.resourcesDeployed === 'string'
            ? row.resourcesDeployed.split(',').map((s: string) => s.trim())
            : [],
          obstruction: row.obstruction || "None",
          remarks: row.remarks || "",
          status: row.status || "In Progress"
        }));

        createBulkMutation.mutate(formattedData);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "Error",
          description: "Failed to parse file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter entries based on search and filters
  const filteredEntries = progressEntries.filter(entry => {
    const matchesSearch = entry.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.mainCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || entry.mainCategory === filterCategory;
    const matchesStatus = filterStatus === "all" || entry.status === filterStatus;
    const matchesObstruction = filterObstruction === "all" || entry.obstruction === filterObstruction;

    return matchesSearch && matchesCategory && matchesStatus && matchesObstruction;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getObstructionColor = (obstruction: string) => {
    switch (obstruction) {
      case 'Headwind': return 'bg-red-100 text-red-800';
      case 'Tailwind': return 'bg-green-100 text-green-800';
      case 'None': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 p-6 font-sans">
      {/* Header */}
      <div className="flex justify-center items-center mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Project Daily Progress</h1>
          <p className="text-gray-600 mt-2">Track daily progress of project activities and tasks</p>
        </div>
      </div>

      <div className="flex justify-end items-center mb-6 space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
        >
          {viewMode === 'cards' ? <List className="h-4 w-4 mr-2" /> : <Grid3X3 className="h-4 w-4 mr-2" />}
          {viewMode === 'cards' ? 'List View' : 'Card View'}
        </Button>
        <Button variant={"outline"} onClick={() => setIsBulkDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Progress Entry
        </Button>
      </div>


      <div className="border rounded-lg p-6 bg-white shadow-sm">

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Main Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Installation">Installation</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Pre-commissioning">Pre-commissioning</SelectItem>
                    <SelectItem value="Commissioning">Commissioning</SelectItem>
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
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="obstruction">Obstruction</Label>
                <Select value={filterObstruction} onValueChange={setFilterObstruction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Headwind">Headwind</SelectItem>
                    <SelectItem value="Tailwind">Tailwind</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategory("all");
                    setFilterStatus("all");
                    setFilterObstruction("all");
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
                <Clock className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold">{progressEntries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold">{progressEntries.filter(e => e.status === 'In Progress').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{progressEntries.filter(e => e.status === 'Completed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">On Hold</p>
                  <p className="text-2xl font-bold">{progressEntries.filter(e => e.status === 'On Hold').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Entries */}
        {viewMode === 'table' ? (
          <Card>
            <CardHeader>
              <CardTitle>Progress Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Date</TableHead>
                      <TableHead className="w-24">Main Category</TableHead>
                      <TableHead className="w-24">Sub Category</TableHead>
                      <TableHead className="w-32">Activity</TableHead>
                      <TableHead className="w-32">Task</TableHead>
                      <TableHead className="w-20">Task %</TableHead>
                      <TableHead className="w-20">Activity %</TableHead>
                      <TableHead className="w-28">Resources</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-20">Obstruction</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium text-xs">
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">{entry.mainCategory}</TableCell>
                        <TableCell className="text-xs">{entry.subCategory}</TableCell>
                        <TableCell>
                          <div className="max-w-28">
                            <p className="font-medium truncate text-xs">{entry.activity}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-28">
                            <p className="truncate text-xs">{entry.task}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${getProgressColor(entry.taskCompletion)}`}
                                style={{ width: `${entry.taskCompletion}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{entry.taskCompletion}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${getProgressColor(entry.activityCompletion)}`}
                                style={{ width: `${entry.activityCompletion}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{entry.activityCompletion}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-24">
                            {entry.resourcesDeployed.slice(0, 1).map((resource, index) => (
                              <Badge key={index} variant="secondary" className="text-xs mr-1 mb-1">
                                {resource}
                              </Badge>
                            ))}
                            {entry.resourcesDeployed.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                +{entry.resourcesDeployed.length - 1}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(entry.status)} text-xs`}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getObstructionColor(entry.obstruction)} text-xs`}>
                            {entry.obstruction}
                          </Badge>
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
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditClick(entry)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteClick(entry.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{entry.activity}</CardTitle>
                      <p className="text-sm text-gray-600">{entry.task}</p>
                    </div>
                    <Badge className={getStatusColor(entry.status)}>
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Main Category</Label>
                      <p className="text-sm font-medium">{entry.mainCategory}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Sub Category</Label>
                      <p className="text-sm font-medium">{entry.subCategory}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-500">Task Progress</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={entry.taskCompletion} className="flex-1" />
                      <span className="text-sm font-medium">{entry.taskCompletion}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-500">Activity Progress</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={entry.activityCompletion} className="flex-1" />
                      <span className="text-sm font-medium">{entry.activityCompletion}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-500">Resources Deployed</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.resourcesDeployed.map((resource, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className={getObstructionColor(entry.obstruction)}>
                      {entry.obstruction}
                    </Badge>
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
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(entry)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Progress Entry Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingEntry(null);
        }}>
          <DialogContent className="max-w-4xl">
            <form onSubmit={handleAddEntry} key={editingEntry ? editingEntry.id : 'new'}>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">{editingEntry ? 'Edit Progress Entry' : 'Add New Progress Entry'}</DialogTitle>
                <DialogDescription>
                  {editingEntry ? 'Update the details of the daily progress entry.' : 'Log daily progress for project activities and tasks.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={editingEntry ? new Date(editingEntry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="mainCategory">Main Category</Label>
                  <Select name="mainCategory" required defaultValue={editingEntry?.mainCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Construction">Construction</SelectItem>
                      <SelectItem value="Installation">Installation</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="Pre-commissioning">Pre-commissioning</SelectItem>
                      <SelectItem value="Commissioning">Commissioning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subCategory">Sub Category</Label>
                  <Select name="subCategory" required defaultValue={editingEntry?.subCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Civil">Civil</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Mechanical">Mechanical</SelectItem>
                      <SelectItem value="Instrumentation">Instrumentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="activity">Activity</Label>
                  <Select name="activity" required defaultValue={editingEntry?.activity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Foundation Design">Foundation Design</SelectItem>
                      <SelectItem value="Electrical Installation">Electrical Installation</SelectItem>
                      <SelectItem value="Pump Installation">Pump Installation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="task">Task</Label>
                  <Select name="task" required defaultValue={editingEntry?.task}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soil Investigation Report Review">Soil Investigation Report Review</SelectItem>
                      <SelectItem value="Cable Tray Installation">Cable Tray Installation</SelectItem>
                      <SelectItem value="Base Plate Alignment">Base Plate Alignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="taskCompletion">Task Completion (%)</Label>
                  <Input
                    id="taskCompletion"
                    name="taskCompletion"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    required
                    defaultValue={editingEntry?.taskCompletion}
                  />
                </div>

                <div>
                  <Label htmlFor="activityCompletion">Activity Completion (%)</Label>
                  <Input
                    id="activityCompletion"
                    name="activityCompletion"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    required
                    defaultValue={editingEntry?.activityCompletion}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" required defaultValue={editingEntry?.status}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="obstruction">Obstruction</Label>
                  <Select name="obstruction" required defaultValue={editingEntry?.obstruction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select obstruction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Headwind">Headwind</SelectItem>
                      <SelectItem value="Tailwind">Tailwind</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="resourcesDeployed">Resources Deployed</Label>
                  <Textarea
                    id="resourcesDeployed"
                    name="resourcesDeployed"
                    placeholder="Enter resources deployed (comma separated)"
                    rows={2}
                    required
                    defaultValue={editingEntry?.resourcesDeployed.join(', ')}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    placeholder="Enter any remarks or notes..."
                    rows={3}
                    defaultValue={editingEntry?.remarks}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createEntryMutation.isPending || updateEntryMutation.isPending}>
                  {(createEntryMutation.isPending || updateEntryMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingEntry ? 'Update Entry' : 'Save Entry'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bulk Upload Progress</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file containing daily progress entries.
                <br />
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-primary"
                  onClick={handleDownloadTemplate}
                >
                  Download Template
                </Button>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  disabled={createBulkMutation.isPending}
                />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {createBulkMutation.isPending ? "Uploading..." : "Drag and drop your file here, or click to select"}
                </p>
                {createBulkMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2" />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Entry Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Progress Entry Details</DialogTitle>
              <DialogDescription>
                View detailed information about this progress entry.
              </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Date</Label>
                    <p className="text-sm">{new Date(selectedEntry.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge className={getStatusColor(selectedEntry.status)}>
                      {selectedEntry.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Main Category</Label>
                    <p className="text-sm">{selectedEntry.mainCategory}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Sub Category</Label>
                    <p className="text-sm">{selectedEntry.subCategory}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Task Completion</Label>
                    <div className="flex items-center space-x-2">
                      <Progress value={selectedEntry.taskCompletion} className="flex-1" />
                      <span className="text-sm">{selectedEntry.taskCompletion}%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Activity Completion</Label>
                    <div className="flex items-center space-x-2">
                      <Progress value={selectedEntry.activityCompletion} className="flex-1" />
                      <span className="text-sm">{selectedEntry.activityCompletion}%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Obstruction</Label>
                    <Badge className={getObstructionColor(selectedEntry.obstruction)}>
                      {selectedEntry.obstruction}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Activity</Label>
                  <p className="text-sm font-medium">{selectedEntry.activity}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Task</Label>
                  <p className="text-sm font-medium">{selectedEntry.task}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Resources Deployed</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedEntry.resourcesDeployed.map((resource, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {resource}
                      </Badge>
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
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  );
} 