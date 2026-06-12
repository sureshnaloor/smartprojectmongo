import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
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
import { Trash2, GripVertical, Search, X, Calendar, Pencil, FileUp } from "lucide-react";
import { SelectValue } from "@/components/ui/select";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ImportProjectActivitiesModal } from "@/components/project/import-project-activities-modal";

interface Activity {
    id: number;
    name: string;
    description: string | null;
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

interface ProjectActivity {
    id: number;
    projectId: number;
    wpId: number;
    globalActivityId: number | null;
    name: string;
    description: string | null;
    unitOfMeasure: string;
    unitRate: string;
    quantity: string;
    remarks: string | null;
    plannedFromDate: string | null;
    plannedToDate: string | null;
    duration: number | null;
    estimatedStartDate: string | null;
    estimatedEndDate: string | null;
    actualStartDate: string | null;
    actualToDate: string | null;
}

export default function ProjectActivities() {
    const { projectId } = useParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
    const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [quantity, setQuantity] = useState<string>("1");
    const [duration, setDuration] = useState<string>("0");
    const [mappingMode, setMappingMode] = useState<"duration" | "date-range">("duration");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Fetch global activities
    const { data: globalActivities = [] } = useQuery<Activity[]>({
        queryKey: ["activities"],
        queryFn: () => get("/activities"),
    });

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

    // Fetch activities for selected work package
    const { data: wpActivities = [] } = useQuery<ProjectActivity[]>({
        queryKey: ["wp-activities", selectedWpId],
        queryFn: async () => {
            const response = await fetch(`/api/work-packages/${selectedWpId}/activities`);
            if (!response.ok) throw new Error("Failed to fetch activities");
            return response.json();
        },
        enabled: !!selectedWpId && !!projectId,
    });

    // Create project activity mutation
    const createMutation = useMutation({
        mutationFn: (data: Partial<ProjectActivity>) =>
            post(`/projects/${projectId}/activities`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wp-activities", selectedWpId] });
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Success", description: "Activity added to work package" });
            setDraggedActivity(null);
            setDateRange(null);
            setShowDatePicker(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Update project activity mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ProjectActivity> }) =>
            put(`/projects/${projectId}/activities/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wp-activities", selectedWpId] });
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Success", description: "Activity updated" });
            setEditingActivity(null);
            setIsDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Delete project activity mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => del(`/api/projects/${projectId}/activities/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wp-activities", selectedWpId] });
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Success", description: "Activity removed from work package" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleDragStart = (e: React.DragEvent, activity: Activity) => {
        e.dataTransfer.setData("activity", JSON.stringify(activity));
        setDraggedActivity(activity);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();

        if (!selectedWpId) {
            toast({
                title: "Warning",
                description: "Please select a work package first",
                variant: "destructive"
            });
            return;
        }

        const activityData = e.dataTransfer.getData("activity");
        if (activityData) {
            const activity: Activity = JSON.parse(activityData);

            // Check if already exists in this WP
            const exists = wpActivities.some(
                pa => pa.globalActivityId === activity.id && pa.wpId === selectedWpId
            );
            if (exists) {
                toast({
                    title: "Warning",
                    description: "Activity already exists in this work package",
                    variant: "destructive"
                });
                return;
            }

            // Show date picker
            setDraggedActivity(activity);
            setShowDatePicker(true);
        }
    };

    const handleDateRangeConfirm = () => {
        if (!draggedActivity || !selectedWpId) {
            toast({
                title: "Error",
                description: "Drag an activity first",
                variant: "destructive"
            });
            return;
        }

        if (mappingMode === "date-range" && (!dateRange?.from || !dateRange?.to)) {
            toast({
                title: "Error",
                description: "Please select both start and end dates",
                variant: "destructive"
            });
            return;
        }

        if (mappingMode === "duration" && (!duration || parseInt(duration) <= 0)) {
            toast({
                title: "Error",
                description: "Please enter a valid duration",
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
            globalActivityId: draggedActivity.id,
            name: draggedActivity.name,
            description: draggedActivity.description,
            unitOfMeasure: draggedActivity.unitOfMeasure,
            unitRate: draggedActivity.unitRate,
            quantity: quantity,
            remarks: draggedActivity.remarks,
            plannedFromDate: mappingMode === "date-range" ? format(dateRange!.from!, "yyyy-MM-dd") : null,
            plannedToDate: mappingMode === "date-range" ? format(dateRange!.to!, "yyyy-MM-dd") : null,
            duration: mappingMode === "duration" ? parseInt(duration) : null,
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const filteredGlobalActivities = globalActivities.filter(activity =>
        activity.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedWorkPackage = workPackages.find(wp => wp.id === selectedWpId);

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
            {/* Left Sidebar - Global Activities */}
            <Card className="w-80 flex flex-col">
                <CardHeader>
                    <CardTitle>Global Activities</CardTitle>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search activities..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                        <div className="space-y-2">
                            {filteredGlobalActivities.map((activity) => (
                                <div
                                    key={activity.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, activity)}
                                    className="flex items-center gap-2 rounded-lg border p-3 cursor-move hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-medium truncate">{activity.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {activity.unitRate} / {activity.unitOfMeasure}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Right Side - Work Packages and Activities */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Work Packages List */}
                <Card className="flex-shrink-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <CardTitle>Work Packages</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={() => setIsImportModalOpen(true)}
                            >
                                <FileUp className="h-4 w-4 mr-1" />
                                Import CSV
                            </Button>
                        </div>
                        <Tabs value={mappingMode} onValueChange={(val) => setMappingMode(val as any)}>
                            <TabsList>
                                <TabsTrigger value="duration" className="text-xs">Duration</TabsTrigger>
                                <TabsTrigger value="date-range" className="text-xs">Date Range</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-32">
                            <div className="flex flex-wrap gap-2">
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

                {/* Selected WP Activities Window */}
                <Card
                    className="flex-1 flex flex-col"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                            {selectedWorkPackage
                                ? `${selectedWorkPackage.code} - ${selectedWorkPackage.name}`
                                : "Select a Work Package"}
                        </CardTitle>
                        {selectedWpId && (
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
                        {!selectedWpId ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <div className="text-center">
                                    <p>No work package selected.</p>
                                    <p className="text-sm">Select a work package above to assign activities</p>
                                </div>
                            </div>
                        ) : showDatePicker && draggedActivity ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                                <div className="text-center">
                                    <p className="font-semibold mb-2">Assign Activity: {draggedActivity.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {draggedActivity.unitOfMeasure ? `Unit: ${draggedActivity.unitOfMeasure}` : ""}
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
                                            Rate: {draggedActivity.unitRate} / {draggedActivity.unitOfMeasure}
                                        </p>
                                    </div>
                                    {mappingMode === "duration" ? (
                                        <div>
                                            <Label className="text-sm font-semibold mb-2 block">Duration (Days) *</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                placeholder="Enter duration"
                                                className="w-full"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label className="text-sm font-semibold mb-2 block">Date Range *</Label>
                                            <DateRangePicker
                                                value={dateRange || undefined}
                                                onChange={setDateRange}
                                                placeholder="Select date range"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleDateRangeConfirm}
                                        disabled={(mappingMode === "date-range" && (!dateRange?.from || !dateRange?.to)) || (mappingMode === "duration" && !duration) || !quantity || createMutation.isPending}
                                    >
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Confirm Assignment
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowDatePicker(false);
                                            setDraggedActivity(null);
                                            setDateRange(null);
                                            setQuantity("1");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : wpActivities.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <div className="text-center">
                                    <p>No activities assigned yet.</p>
                                    <p className="text-sm">Drag activities from the sidebar to assign them</p>
                                </div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Planned Dates</TableHead>
                                        <TableHead className="text-right">Dur (Days)</TableHead>
                                        <TableHead>Remarks</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wpActivities.map((activity) => (
                                        <TableRow key={activity.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    {activity.name}
                                                    {activity.description && (
                                                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{activity.unitOfMeasure}</TableCell>
                                            <TableCell className="text-right">{activity.unitRate}</TableCell>
                                            <TableCell className="text-right">{activity.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                {(parseFloat(activity.unitRate) * parseFloat(activity.quantity)).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                {activity.plannedFromDate && activity.plannedToDate ? (
                                                    <span className="text-xs">
                                                        {format(new Date(activity.plannedFromDate), "MMM dd, yyyy")} - {format(new Date(activity.plannedToDate), "MMM dd, yyyy")}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Not set</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {activity.duration ? `${activity.duration}` : "-"}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={activity.remarks || ""}>
                                                {activity.remarks}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingActivity(activity);
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
                                                            if (confirm("Are you sure you want to delete this activity?")) {
                                                                deleteMutation.mutate(activity.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Activity Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Activity</DialogTitle>
                    </DialogHeader>
                    {editingActivity && (
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
                                    duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : null,
                                    plannedFromDate: editingActivity.plannedFromDate,
                                    plannedToDate: editingActivity.plannedToDate,
                                };
                                updateMutation.mutate({ id: editingActivity.id, data });
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={editingActivity.name}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={editingActivity.description || ""}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="unitOfMeasure">Unit</Label>
                                    <Input
                                        id="unitOfMeasure"
                                        name="unitOfMeasure"
                                        defaultValue={editingActivity.unitOfMeasure}
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
                                        defaultValue={editingActivity.unitRate}
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
                                    defaultValue={editingActivity.quantity}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Planned Date Range</Label>
                                    <DateRangePicker
                                        value={{
                                            from: editingActivity.plannedFromDate ? new Date(editingActivity.plannedFromDate) : undefined,
                                            to: editingActivity.plannedToDate ? new Date(editingActivity.plannedToDate) : undefined,
                                        }}
                                        onChange={(range) => {
                                            setEditingActivity({
                                                ...editingActivity,
                                                plannedFromDate: range?.from ? format(range.from, "yyyy-MM-dd") : null,
                                                plannedToDate: range?.to ? format(range.to, "yyyy-MM-dd") : null,
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-duration">Duration (Days)</Label>
                                    <Input
                                        id="edit-duration"
                                        name="duration"
                                        type="number"
                                        defaultValue={editingActivity.duration || 0}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Textarea
                                    id="remarks"
                                    name="remarks"
                                    defaultValue={editingActivity.remarks || ""}
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

            <ImportProjectActivitiesModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                projectId={Number(projectId)}
            />
        </div>
    );
}
