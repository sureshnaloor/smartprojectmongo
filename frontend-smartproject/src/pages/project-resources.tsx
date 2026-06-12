import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, GripVertical, Pencil, Search, X, Calendar as CalendarIcon, Layers, Truck, Users, Hammer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface Resource {
    id: number;
    name: string;
    description: string | null;
    type: "manpower" | "equipment" | "rental_manpower" | "rental_equipment" | "tools";
    unitOfMeasure: string;
    unitRate: string;
    remarks: string | null;
}

interface WorkPackage {
    id: number;
    wbsItemId: number;
    projectId: number;
    name: string;
    code: string;
    description: string | null;
    budgetedCost: string;
}

interface ProjectResource {
    id: number;
    projectId: number;
    wpId: number;
    globalResourceId: number | null;
    name: string;
    description: string | null;
    type: "manpower" | "equipment" | "rental_manpower" | "rental_equipment" | "tools";
    unitOfMeasure: string;
    unitRate: string;
    quantity: string;
    remarks: string | null;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
}

export default function ProjectResources() {
    const { projectId, type } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string | null>(type || "all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
    const [draggedResource, setDraggedResource] = useState<Resource | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [quantity, setQuantity] = useState<string>("1");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<ProjectResource | null>(null);

    // Fetch global resources (filtered to exclude material type)
    const { data: allGlobalResources = [] } = useQuery<Resource[]>({
        queryKey: ["resources"],
        queryFn: () => get("/resources"),
    });

    const globalResources = allGlobalResources.filter(
        r => r.type !== "material" // Exclude material type
    );

    // Fetch work packages for the project
    const { data: workPackages = [] } = useQuery<WorkPackage[]>({
        queryKey: ["work-packages", projectId],
        queryFn: async () => {
            if (!projectId) return [];
            // Fetch all WBS items and then get their work packages
            const wbsResponse = await get(`/projects/${projectId}/wbs`);
            const allWps: WorkPackage[] = [];
            
            for (const wbs of wbsResponse) {
                try {
                    const wpResponse = await fetch(`/api/wbs/${wbs.id}/work-packages`).then(r => r.json());
                    if (Array.isArray(wpResponse)) {
                        allWps.push(...wpResponse);
                    }
                } catch (error) {
                    // Skip if no work packages found
                }
            }
            
            return allWps;
        },
        enabled: !!projectId,
    });

    // Fetch resources for selected work package or all resources
    const { data: wpResources = [] } = useQuery<ProjectResource[]>({
        queryKey: selectedWpId === null ? ["all-project-resources", projectId] : ["wp-resources", selectedWpId],
        queryFn: async () => {
            if (selectedWpId === null) {
                // Fetch all resources for the project
                const response = await fetch(`/api/projects/${projectId}/resources`);
                if (!response.ok) throw new Error("Failed to fetch resources");
                return response.json();
            } else {
                // Fetch resources for specific work package
                const response = await fetch(`/api/work-packages/${selectedWpId}/resources`);
                if (!response.ok) throw new Error("Failed to fetch resources");
                return response.json();
            }
        },
        enabled: projectId !== undefined && (selectedWpId !== undefined),
    });

    // Create project resource mutation
    const createMutation = useMutation({
        mutationFn: (data: Partial<ProjectResource>) =>
            post(`/projects/${projectId}/resources`, data),
        onSuccess: () => {
            // Invalidate both specific WP resources and all project resources
            if (selectedWpId !== null) {
                queryClient.invalidateQueries({ queryKey: ["wp-resources", selectedWpId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-project-resources", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-resources", projectId] });
            toast({ title: "Success", description: "Resource added to work package" });
            setDraggedResource(null);
            setDateRange(null);
            setQuantity("1");
            setShowDatePicker(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update project resource mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ProjectResource> }) =>
            put(`/projects/${projectId}/resources/${id}`, data),
        onSuccess: () => {
            // Invalidate both specific WP resources and all project resources
            if (selectedWpId !== null) {
                queryClient.invalidateQueries({ queryKey: ["wp-resources", selectedWpId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-project-resources", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-resources", projectId] });
            toast({ title: "Success", description: "Resource updated" });
            setEditingResource(null);
            setIsDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete project resource mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => del(`/projects/${projectId}/resources/${id}`),
        onSuccess: () => {
            // Invalidate both specific WP resources and all project resources
            if (selectedWpId !== null) {
                queryClient.invalidateQueries({ queryKey: ["wp-resources", selectedWpId] });
            }
            queryClient.invalidateQueries({ queryKey: ["all-project-resources", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-resources", projectId] });
            toast({ title: "Success", description: "Resource removed from work package" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleDragStart = (e: React.DragEvent, resource: Resource) => {
        e.dataTransfer.setData("resource", JSON.stringify(resource));
        setDraggedResource(resource);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        
        // If "All" is selected, we need to prompt user to select a specific WP
        if (selectedWpId === null) {
            toast({ 
                title: "Info", 
                description: "Please select a specific work package to assign the resource to", 
            });
            return;
        }

        const resourceData = e.dataTransfer.getData("resource");
        if (resourceData) {
            const resource: Resource = JSON.parse(resourceData);

            // Check if already exists in this WP
            const exists = wpResources.some(
                pr => pr.globalResourceId === resource.id && pr.wpId === selectedWpId
            );
            if (exists) {
                toast({ 
                    title: "Warning", 
                    description: "Resource already exists in this work package", 
                    variant: "destructive" 
                });
                return;
            }

            // Show date picker for all resource types
            setDraggedResource(resource);
            setShowDatePicker(true);
        }
    };

    const handleDateRangeConfirm = () => {
        if (!draggedResource || !selectedWpId) {
            return;
        }

        // All resource types require dates
        if (!dateRange?.from || !dateRange?.to) {
            toast({ 
                title: "Error", 
                description: "Please select both start and end dates", 
                variant: "destructive" 
            });
            return;
        }

        if (!quantity || parseFloat(quantity) <= 0) {
            toast({ 
                title: "Error", 
                description: "Please enter a valid quantity", 
                variant: "destructive" 
            });
            return;
        }

        createMutation.mutate({
            wpId: selectedWpId,
            globalResourceId: draggedResource.id,
            name: draggedResource.name,
            description: draggedResource.description,
            type: draggedResource.type as "manpower" | "equipment" | "rental_manpower" | "rental_equipment" | "tools",
            unitOfMeasure: draggedResource.unitOfMeasure,
            unitRate: draggedResource.unitRate,
            quantity: quantity,
            remarks: draggedResource.remarks,
            plannedStartDate: format(dateRange.from, "yyyy-MM-dd"),
            plannedEndDate: format(dateRange.to, "yyyy-MM-dd"),
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const filteredGlobalResources = globalResources.filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (activeTab === "all" || activeTab === null ? true : resource.type === activeTab)
    );

    const selectedWorkPackage = workPackages.find(wp => wp.id === selectedWpId);

    useEffect(() => {
        // sync activeTab with URL param changes
        setActiveTab(type || "all");
    }, [type]);

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
            {/* Left Sidebar - Global Resources */}
            <Card className="w-80 flex flex-col">
                <CardHeader>
                    <CardTitle>Global Resources</CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: 'All', icon: Layers },
                            { key: 'equipment', label: 'Equipment', icon: Truck },
                            { key: 'manpower', label: 'Manpower', icon: Users },
                            { key: 'tools', label: 'Tools', icon: Hammer },
                            { key: 'rental_manpower', label: 'Rental Manpower', icon: Users },
                            { key: 'rental_equipment', label: 'Rental Equipment', icon: Truck },
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    title={tab.label}
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        if (projectId) setLocation(`/projects/${projectId}/resources/${tab.key}`);
                                    }}
                                    className={`flex items-center justify-center h-8 w-8 rounded-md border ${activeTab === tab.key ? 'bg-primary text-white border-transparent' : 'bg-white'} hover:bg-primary/10`}
                                >
                                    <Icon className="h-4 w-4" />
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">Manpower, Equipment, Rental & Tools</p>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search resources..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                        <div className="space-y-2">
                            {filteredGlobalResources.map((resource) => (
                                <div
                                    key={resource.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, resource)}
                                    className="flex items-center gap-2 rounded-lg border p-3 cursor-move hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-medium truncate">{resource.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">
                                            {resource.type.replace("_", " ")} • {resource.unitRate} / {resource.unitOfMeasure}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Right Side - Work Packages and Resources */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Work Packages List */}
                <Card className="flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Work Packages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-32">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={selectedWpId === null ? "default" : "outline"}
                                    onClick={() => setSelectedWpId(null)}
                                    className="text-xs font-semibold"
                                >
                                    All
                                </Button>
                                {workPackages.map((wp) => (
                                    <Button
                                        key={wp.id}
                                        variant={selectedWpId === wp.id ? "default" : "outline"}
                                        onClick={() => setSelectedWpId(wp.id)}
                                        className="text-xs"
                                    >
                                        {wp.code} - {wp.name}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Selected WP Resources Window */}
                <Card 
                    className="flex-1 flex flex-col" 
                    onDrop={handleDrop} 
                    onDragOver={handleDragOver}
                >
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                            {selectedWpId === null 
                                ? "All Resources"
                                : selectedWorkPackage 
                                    ? `${selectedWorkPackage.code} - ${selectedWorkPackage.name}`
                                    : "Select a Work Package"}
                        </CardTitle>
                        {selectedWpId !== null && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSelectedWpId(null);
                                    setShowDatePicker(false);
                                    setDateRange(null);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {selectedWpId === undefined ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <div className="text-center">
                                    <p>No work package selected.</p>
                                    <p className="text-sm">Select a work package above to assign resources</p>
                                </div>
                            </div>
                        ) : showDatePicker && draggedResource ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                                <div className="text-center">
                                    <p className="font-semibold mb-2">Assign Resource: {draggedResource.name}</p>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        Type: {draggedResource.type.replace("_", " ")}
                                    </p>
                                </div>
                                <div className="w-full max-w-md space-y-6">
                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block">Quantity *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="Enter quantity"
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Rate: {draggedResource.unitRate} / {draggedResource.unitOfMeasure}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-semibold mb-2 block">Date Range *</Label>
                                        <DateRangePicker
                                            value={dateRange || undefined}
                                            onChange={setDateRange}
                                            placeholder="Select date range"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleDateRangeConfirm}
                                        disabled={!dateRange?.from || !dateRange?.to || !quantity || createMutation.isPending}
                                    >
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        Confirm Assignment
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowDatePicker(false);
                                            setDraggedResource(null);
                                            setDateRange(null);
                                            setQuantity("1");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : wpResources.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <div className="text-center">
                                    <p>
                                        {selectedWpId === null 
                                            ? "No resources found for this project." 
                                            : "No resources assigned yet."}
                                    </p>
                                    {selectedWpId !== null && (
                                        <p className="text-sm">Drag resources from the sidebar to assign them</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {selectedWpId === null && <TableHead>Work Package</TableHead>}
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Planned Dates</TableHead>
                                        <TableHead>Remarks</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wpResources.map((resource) => {
                                        const resourceWP = workPackages.find(wp => wp.id === resource.wpId);
                                        return (
                                        <TableRow key={resource.id}>
                                            {selectedWpId === null && (
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {resourceWP ? `${resourceWP.code} - ${resourceWP.name}` : "Unknown"}
                                                </TableCell>
                                            )}
                                            <TableCell className="font-medium">
                                                <div>
                                                    {resource.name}
                                                    {resource.description && (
                                                        <p className="text-xs text-muted-foreground">{resource.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {resource.type.replace("_", " ")}
                                            </TableCell>
                                            <TableCell>{resource.unitOfMeasure}</TableCell>
                                            <TableCell className="text-right">{resource.unitRate}</TableCell>
                                            <TableCell className="text-right">{resource.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                {(parseFloat(resource.unitRate) * parseFloat(resource.quantity)).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                {resource.plannedStartDate && resource.plannedEndDate ? (
                                                    <span className="text-xs">
                                                        {format(new Date(resource.plannedStartDate), "MMM dd, yyyy")} - {format(new Date(resource.plannedEndDate), "MMM dd, yyyy")}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Not set</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={resource.remarks || ""}>
                                                {resource.remarks}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingResource(resource);
                                                            setIsDialogOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to delete this resource?")) {
                                                                deleteMutation.mutate(resource.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Resource Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Resource</DialogTitle>
                    </DialogHeader>
                    {editingResource && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const data = {
                                    name: formData.get("name") as string,
                                    description: formData.get("description") as string,
                                    unitOfMeasure: formData.get("unitOfMeasure") as string,
                                    unitRate: formData.get("unitRate") as string,
                                    quantity: formData.get("quantity") as string,
                                    remarks: formData.get("remarks") as string,
                                    plannedStartDate: formData.get("plannedStartDate") ? (formData.get("plannedStartDate") as string) : null,
                                    plannedEndDate: formData.get("plannedEndDate") ? (formData.get("plannedEndDate") as string) : null,
                                };
                                updateMutation.mutate({ id: editingResource.id, data });
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={editingResource.name}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={editingResource.description || ""}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="unitOfMeasure">Unit</Label>
                                    <Input
                                        id="unitOfMeasure"
                                        name="unitOfMeasure"
                                        defaultValue={editingResource.unitOfMeasure}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unitRate">Rate</Label>
                                    <Input
                                        id="unitRate"
                                        name="unitRate"
                                        type="number"
                                        step="0.01"
                                        defaultValue={editingResource.unitRate}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    name="quantity"
                                    type="number"
                                    step="0.01"
                                    defaultValue={editingResource.quantity}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="plannedStartDate">Planned Start Date</Label>
                                    <Input
                                        id="plannedStartDate"
                                        name="plannedStartDate"
                                        type="date"
                                        defaultValue={editingResource.plannedStartDate || ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plannedEndDate">Planned End Date</Label>
                                    <Input
                                        id="plannedEndDate"
                                        name="plannedEndDate"
                                        type="date"
                                        defaultValue={editingResource.plannedEndDate || ""}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Textarea
                                    id="remarks"
                                    name="remarks"
                                    defaultValue={editingResource.remarks || ""}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Update
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
