import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectResource } from "@shared/schema";
import { Calendar, Wrench, Users, Truck, Hammer } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ResourceNetworkDiagramProps {
    projectId: number;
    selectedWpId?: number | null;
    projectStartDate?: string | null;
    projectEndDate?: string | null;
}

type TimelineScale = "month" | "quarter" | "year" | "project";

export function ResourceNetworkDiagram({
    projectId,
    selectedWpId,
    projectStartDate,
    projectEndDate,
}: ResourceNetworkDiagramProps) {
    const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");
    const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");

    // Fetch all project resources
    const { data: allResources = [], isLoading: isLoadingAll } = useQuery<ProjectResource[]>({
        queryKey: [`/api/projects/${projectId}/resources`],
        enabled: !!projectId && !selectedWpId,
    });

    // Fetch resources for selected work package
    const { data: wpResources = [], isLoading: isLoadingWp } = useQuery<ProjectResource[]>({
        queryKey: [`/api/work-packages/${selectedWpId}/resources`],
        enabled: !!projectId && !!selectedWpId,
    });

    const allResourcesData = selectedWpId ? wpResources : allResources;
    const isLoading = selectedWpId ? isLoadingWp : isLoadingAll;

    // Filter resources by type
    const resources = useMemo(() => {
        if (resourceTypeFilter === "all") return allResourcesData;
        return allResourcesData.filter((r) => r.type === resourceTypeFilter);
    }, [allResourcesData, resourceTypeFilter]);

    // Calculate timeline range
    const timelineRange = useMemo(() => {
        if (!resources.length) {
            // Use project dates if available
            if (projectStartDate && projectEndDate) {
                return {
                    start: new Date(projectStartDate),
                    end: new Date(projectEndDate),
                };
            }
            // Default to current year
            const now = new Date();
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: new Date(now.getFullYear(), 11, 31),
            };
        }

        // Find min and max dates from resources
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        resources.forEach((resource) => {
            if (resource.plannedStartDate && resource.plannedEndDate) {
                const startDate = new Date(resource.plannedStartDate);
                const endDate = new Date(resource.plannedEndDate);

                if (!minDate || startDate < minDate) minDate = startDate;
                if (!maxDate || endDate > maxDate) maxDate = endDate;
            }
        });

        // Fallback to project dates or current year
        if (!minDate || !maxDate) {
            if (projectStartDate && projectEndDate) {
                return {
                    start: new Date(projectStartDate),
                    end: new Date(projectEndDate),
                };
            }
            const now = new Date();
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: new Date(now.getFullYear(), 11, 31),
            };
        }

        // Add padding (10% on each side)
        const range = maxDate.getTime() - minDate.getTime();
        const padding = range * 0.1;
        return {
            start: new Date(minDate.getTime() - padding),
            end: new Date(maxDate.getTime() + padding),
        };
    }, [resources, projectStartDate, projectEndDate]);

    // Generate timeline ticks based on scale
    const timelineTicks = useMemo(() => {
        const { start, end } = timelineRange;
        const ticks: { date: Date; label: string }[] = [];

        switch (timelineScale) {
            case "month": {
                const current = new Date(start);
                while (current <= end) {
                    ticks.push({
                        date: new Date(current),
                        label: current.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                    });
                    current.setMonth(current.getMonth() + 1);
                }
                break;
            }
            case "quarter": {
                const current = new Date(start);
                while (current <= end) {
                    const quarter = Math.floor(current.getMonth() / 3) + 1;
                    ticks.push({
                        date: new Date(current),
                        label: `Q${quarter} ${current.getFullYear()}`,
                    });
                    current.setMonth(current.getMonth() + 3);
                }
                break;
            }
            case "year": {
                const current = new Date(start);
                while (current <= end) {
                    ticks.push({
                        date: new Date(current),
                        label: current.getFullYear().toString(),
                    });
                    current.setFullYear(current.getFullYear() + 1);
                }
                break;
            }
            case "project": {
                // Show project duration as a single period
                if (projectStartDate && projectEndDate) {
                    ticks.push({
                        date: new Date(projectStartDate),
                        label: "Start",
                    });
                    ticks.push({
                        date: new Date(projectEndDate),
                        label: "End",
                    });
                } else {
                    // Fallback to start and end of range
                    ticks.push({
                        date: start,
                        label: "Start",
                    });
                    ticks.push({
                        date: end,
                        label: "End",
                    });
                }
                break;
            }
        }

        return ticks;
    }, [timelineRange, timelineScale, projectStartDate, projectEndDate]);

    // Calculate position and width for resource bars
    const getResourceBar = (resource: ProjectResource) => {
        if (!resource.plannedStartDate || !resource.plannedEndDate) return null;

        const startDate = new Date(resource.plannedStartDate);
        const endDate = new Date(resource.plannedEndDate);

        // Ensure end date is after start date
        if (endDate < startDate) return null;

        const { start, end } = timelineRange;
        const totalRange = end.getTime() - start.getTime();
        if (totalRange <= 0) return null;

        const left = ((startDate.getTime() - start.getTime()) / totalRange) * 100;
        const width = ((endDate.getTime() - startDate.getTime()) / totalRange) * 100;

        // Clamp values to visible range
        const clampedLeft = Math.max(0, Math.min(100, left));
        const clampedWidth = Math.max(0.5, Math.min(100 - clampedLeft, width));

        return { left: clampedLeft, width: clampedWidth };
    };

    // Get resource type color and icon
    const getResourceTypeStyle = (type: string) => {
        switch (type) {
            case "manpower":
                return {
                    color: "#3B82F6", // Blue
                    icon: Users,
                    label: "Manpower",
                };
            case "equipment":
                return {
                    color: "#10B981", // Green
                    icon: Truck,
                    label: "Equipment",
                };
            case "rental_manpower":
                return {
                    color: "#F59E0B", // Amber
                    icon: Users,
                    label: "Rental Manpower",
                };
            case "rental_equipment":
                return {
                    color: "#EF4444", // Red
                    icon: Truck,
                    label: "Rental Equipment",
                };
            case "tools":
                return {
                    color: "#8B5CF6", // Purple
                    icon: Hammer,
                    label: "Tools",
                };
            default:
                return {
                    color: "#94A3B8", // Gray
                    icon: Wrench,
                    label: "Other",
                };
        }
    };

    // Get unique resource types for filter
    const resourceTypes = useMemo(() => {
        const types = new Set(allResourcesData.map((r) => r.type));
        return Array.from(types).sort();
    }, [allResourcesData]);

    if (isLoading) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-slate-500">Loading resources...</p>
                </div>
            </div>
        );
    }

    if (resources.length === 0) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">
                        {selectedWpId
                            ? "No resources found for this work package"
                            : resourceTypeFilter !== "all"
                            ? `No ${resourceTypeFilter.replace("_", " ")} resources found`
                            : "No resources found for this project"}
                    </p>
                </div>
            </div>
        );
    }

    const containerWidth = 1000; // Base width in pixels

    return (
        <div className="w-full">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-700">Timeline Scale:</label>
                    <Select value={timelineScale} onValueChange={(value) => setTimelineScale(value as TimelineScale)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="quarter">Quarter</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                            <SelectItem value="project">Project Duration</SelectItem>
                        </SelectContent>
                    </Select>
                    <label className="text-sm font-semibold text-slate-700 ml-4">Resource Type:</label>
                    <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {resourceTypes.map((type) => {
                                const style = getResourceTypeStyle(type);
                                return (
                                    <SelectItem key={type} value={type}>
                                        {style.label}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-slate-600">
                    {resources.length} {resources.length === 1 ? "resource" : "resources"}
                    {selectedWpId && " (filtered)"}
                </div>
            </div>

            {/* Diagram Container */}
            <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden">
                {/* Scrollable area */}
                <div className="overflow-x-auto" style={{ maxHeight: "600px", overflowY: "auto" }}>
                    <div style={{ minWidth: `${containerWidth}px`, position: "relative" }}>
                        {/* Timeline Header */}
                        <div
                            className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 flex"
                            style={{ height: "60px" }}
                        >
                            {/* Label area */}
                            <div
                                className="border-r border-slate-200 bg-slate-50"
                                style={{ width: "200px", minWidth: "200px", flexShrink: 0 }}
                            />
                            {/* Timeline area */}
                            <div className="flex-1 relative" style={{ position: "relative" }}>
                                {timelineTicks.map((tick, index) => (
                                    <div
                                        key={index}
                                        className="absolute border-l border-slate-300"
                                        style={{
                                            left: `${(index / Math.max(1, timelineTicks.length - 1)) * 100}%`,
                                            height: "100%",
                                            paddingLeft: "8px",
                                            paddingTop: "8px",
                                        }}
                                    >
                                        <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                            {tick.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Resources */}
                        <div className="relative" style={{ minHeight: `${resources.length * 50}px` }}>
                            {resources.map((resource, index) => {
                                const bar = getResourceBar(resource);
                                const typeStyle = getResourceTypeStyle(resource.type);
                                const Icon = typeStyle.icon;

                                return (
                                    <div
                                        key={resource.id}
                                        className="border-b border-slate-100"
                                        style={{ height: "50px", position: "relative" }}
                                    >
                                        {/* Resource Label */}
                                        <div
                                            className="absolute left-0 top-0 h-full flex items-center px-4 bg-slate-50 border-r border-slate-200 z-20"
                                            style={{ width: "200px", minWidth: "200px" }}
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: typeStyle.color }} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-slate-800 truncate">
                                                        {resource.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                        {typeStyle.label} • Qty: {resource.quantity} {resource.unitOfMeasure}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Area */}
                                        <div
                                            className="absolute left-[200px] right-0 top-0 h-full"
                                            style={{ position: "relative" }}
                                        >
                                            {bar ? (
                                                /* Resource Bar */
                                                <div
                                                    className="absolute top-1/2 -translate-y-1/2 rounded-md shadow-sm z-10 cursor-pointer hover:opacity-80 transition-opacity"
                                                    style={{
                                                        left: `${bar.left}%`,
                                                        width: `${bar.width}%`,
                                                        height: "32px",
                                                        backgroundColor: typeStyle.color,
                                                    }}
                                                    title={`${resource.name} (${typeStyle.label})\n${resource.plannedStartDate || "No start date"} - ${resource.plannedEndDate || "No end date"}\nQuantity: ${resource.quantity} ${resource.unitOfMeasure}`}
                                                >
                                                    <div className="h-full flex items-center px-2">
                                                        <span className="text-[10px] font-semibold text-white truncate">
                                                            {resource.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* No date indicator */
                                                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center">
                                                    <span className="text-[10px] text-slate-400 italic">
                                                        No dates assigned
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs flex-wrap">
                {resourceTypes.map((type) => {
                    const style = getResourceTypeStyle(type);
                    const Icon = style.icon;
                    return (
                        <div key={type} className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded flex items-center justify-center"
                                style={{ backgroundColor: style.color }}
                            >
                                <Icon className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-slate-600">{style.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

