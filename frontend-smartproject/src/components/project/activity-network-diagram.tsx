import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProjectActivity } from "@shared/schema";
import { Calendar } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ActivityNetworkDiagramProps {
    projectId: number;
    selectedWpId?: number | null;
    projectStartDate?: string | null;
    projectEndDate?: string | null;
}

type TimelineScale = "month" | "quarter" | "year" | "project";

export function ActivityNetworkDiagram({
    projectId,
    selectedWpId,
    projectStartDate,
    projectEndDate,
}: ActivityNetworkDiagramProps) {
    const [timelineScale, setTimelineScale] = useState<TimelineScale>("month");

    // Fetch all project activities
    const { data: allActivities = [], isLoading: isLoadingAll } = useQuery<ProjectActivity[]>({
        queryKey: [`/api/projects/${projectId}/activities`],
        enabled: !!projectId && !selectedWpId,
    });

    // Fetch activities for selected work package
    const { data: wpActivities = [], isLoading: isLoadingWp } = useQuery<ProjectActivity[]>({
        queryKey: [`/api/work-packages/${selectedWpId}/activities`],
        enabled: !!projectId && !!selectedWpId,
    });

    const activities = selectedWpId ? wpActivities : allActivities;
    const isLoading = selectedWpId ? isLoadingWp : isLoadingAll;

    // Calculate timeline range
    const timelineRange = useMemo(() => {
        if (!activities.length) {
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

        // Find min and max dates from activities
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        activities.forEach((activity) => {
            const dates = [
                activity.plannedFromDate,
                activity.plannedToDate,
                activity.estimatedStartDate,
                activity.estimatedEndDate,
                activity.actualStartDate,
                activity.actualToDate,
            ].filter(Boolean) as string[];

            dates.forEach((dateStr) => {
                const date = new Date(dateStr);
                if (!minDate || date < minDate) minDate = date;
                if (!maxDate || date > maxDate) maxDate = date;
            });
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
    }, [activities, projectStartDate, projectEndDate]);

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

    // Calculate position and width for activity bars
    const getActivityBar = (activity: ProjectActivity) => {
        // Prefer actual dates, then estimated, then planned
        const startDateStr =
            activity.actualStartDate ||
            activity.estimatedStartDate ||
            activity.plannedFromDate;
        const endDateStr =
            activity.actualToDate ||
            activity.estimatedEndDate ||
            activity.plannedToDate;

        if (!startDateStr || !endDateStr) return null;

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

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

    // Get activity status color
    const getActivityColor = (activity: ProjectActivity) => {
        if (activity.actualToDate) return "#10B981"; // Completed (green)
        if (activity.actualStartDate) return "#F59E0B"; // In progress (amber)
        if (activity.estimatedStartDate || activity.plannedFromDate) {
            const startDate = new Date(activity.estimatedStartDate || activity.plannedFromDate || "");
            const today = new Date();
            if (startDate <= today) return "#EF4444"; // Overdue (red)
            return "#3B82F6"; // Planned (blue)
        }
        return "#94A3B8"; // Not scheduled (gray)
    };

    if (isLoading) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-slate-500">Loading activities...</p>
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                    <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">
                        {selectedWpId
                            ? "No activities found for this work package"
                            : "No activities found for this project"}
                    </p>
                </div>
            </div>
        );
    }

    const containerWidth = 1000; // Base width in pixels
    const tickWidth = containerWidth / Math.max(1, timelineTicks.length - 1);

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
                </div>
                <div className="text-sm text-slate-600">
                    {activities.length} {activities.length === 1 ? "activity" : "activities"}
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

                        {/* Activities */}
                        <div className="relative" style={{ minHeight: `${activities.length * 50}px` }}>
                            {activities.map((activity, index) => {
                                const bar = getActivityBar(activity);

                                return (
                                    <div
                                        key={activity.id}
                                        className="border-b border-slate-100"
                                        style={{ height: "50px", position: "relative" }}
                                    >
                                        {/* Activity Label */}
                                        <div
                                            className="absolute left-0 top-0 h-full flex items-center px-4 bg-slate-50 border-r border-slate-200 z-20"
                                            style={{ width: "200px", minWidth: "200px" }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-slate-800 truncate">
                                                    {activity.name}
                                                </div>
                                                {activity.description && (
                                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                        {activity.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Timeline Area */}
                                        <div
                                            className="absolute left-[200px] right-0 top-0 h-full"
                                            style={{ position: "relative" }}
                                        >
                                            {bar ? (
                                                /* Activity Bar */
                                                <div
                                                    className="absolute top-1/2 -translate-y-1/2 rounded-md shadow-sm z-10 cursor-pointer hover:opacity-80 transition-opacity"
                                                    style={{
                                                        left: `${bar.left}%`,
                                                        width: `${bar.width}%`,
                                                        height: "32px",
                                                        backgroundColor: getActivityColor(activity),
                                                    }}
                                                    title={`${activity.name}\n${activity.plannedFromDate || activity.estimatedStartDate || activity.actualStartDate || "No start date"} - ${activity.plannedToDate || activity.estimatedEndDate || activity.actualToDate || "No end date"}`}
                                                >
                                                    <div className="h-full flex items-center px-2">
                                                        <span className="text-[10px] font-semibold text-white truncate">
                                                            {activity.name}
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
            <div className="mt-4 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-slate-600">Planned</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500"></div>
                    <span className="text-slate-600">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span className="text-slate-600">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-slate-600">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-400"></div>
                    <span className="text-slate-600">Not Scheduled</span>
                </div>
            </div>
        </div>
    );
}

