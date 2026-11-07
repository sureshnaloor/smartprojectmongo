import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { get } from "@/lib/api-client";
import ReactECharts from "echarts-for-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, addDays, isWithinInterval, parseISO } from "date-fns";
import { Loader2, AlertCircle, TrendingUp, Calendar, Network } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    // Scheduling fields persisted in DB (day offsets from project start / float)
    duration?: number | null;
    earlyStartDay?: number | null;
    earlyFinishDay?: number | null;
    lateStartDay?: number | null;
    lateFinishDay?: number | null;
    totalFloatDays?: number | null;
}

interface Dependency {
    id: number;
    predecessorId: number;
    successorId: number;
    type: string;
    lag: number;
}

interface CPMActivity extends ProjectActivity {
    duration: number;
    es: number;
    ef: number;
    ls: number;
    lf: number;
    slack: number;
    isCritical: boolean;
}

export default function ProjectCharts() {
    const { projectId } = useParams();
    const [dateRange, setDateRange] = useState<DateRange | null>({
        from: parseISO("2026-05-01"),
        to: parseISO("2026-12-31"),
    });

    // Fetch activities for the project
    const { data: activities = [], isLoading: isLoadingActivities } = useQuery<ProjectActivity[]>({
        queryKey: ["project-activities", projectId],
        queryFn: () => get(`/api/projects/${projectId}/activities`),
        enabled: !!projectId,
    });

    // Fetch dependencies for the project
    const { data: dependencies = [], isLoading: isLoadingDeps } = useQuery<Dependency[]>({
        queryKey: ["project-activity-dependencies", projectId],
        queryFn: () => get(`/api/projects/${projectId}/activity-dependencies`),
        enabled: !!projectId,
    });

    const cpmData = useMemo(() => {
        if (!activities.length) return [];

        // 1. Filter activities by date window
        const filteredActivities = activities.filter(activity => {
            if (!activity.plannedFromDate || !activity.plannedToDate) return false;
            if (!dateRange?.from || !dateRange?.to) return true;

            const from = parseISO(activity.plannedFromDate);
            const to = parseISO(activity.plannedToDate);

            // Check if activity overlaps with the window
            return (
                (from >= dateRange.from && from <= dateRange.to) ||
                (to >= dateRange.from && to <= dateRange.to) ||
                (from <= dateRange.from && to >= dateRange.to)
            );
        });

        if (!filteredActivities.length) return [];

        const hasPersistedCpm = filteredActivities.some(a => a.totalFloatDays != null);

        // Prefer persisted CPM fields from the backend so slack/float
        // matches the Activity Plan and database.
        if (hasPersistedCpm) {
            const map = new Map<number, CPMActivity>();
            filteredActivities.forEach(a => {
                const duration =
                    (a.duration != null && a.duration > 0)
                        ? a.duration
                        : a.plannedFromDate && a.plannedToDate
                            ? Math.max(1, differenceInDays(parseISO(a.plannedToDate), parseISO(a.plannedFromDate)) + 1)
                            : 1;

                const es = a.earlyStartDay ?? 0;
                const ls = a.lateStartDay ?? (es + (a.totalFloatDays ?? 0));
                const ef = a.earlyFinishDay ?? (es + duration);
                const lf = a.lateFinishDay ?? (ls + duration);
                const slack = a.totalFloatDays ?? (ls - es);
                const isCritical = slack === 0;

                map.set(a.id, {
                    ...a,
                    duration,
                    es,
                    ef,
                    ls,
                    lf,
                    slack,
                    isCritical,
                });
            });
            return Array.from(map.values());
        }

        // ──────────────────────────────────────────────────────────────
        // Fallback: compute CPM locally if no persisted data exists.
        // ──────────────────────────────────────────────────────────────

        const activityMap = new Map<number, CPMActivity>();
        filteredActivities.forEach(a => {
            const duration = a.plannedFromDate && a.plannedToDate
                ? Math.max(1, differenceInDays(parseISO(a.plannedToDate), parseISO(a.plannedFromDate)) + 1)
                : 1;
            activityMap.set(a.id, {
                ...a,
                duration,
                es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false
            });
        });

        const deps = dependencies.filter(d => activityMap.has(d.predecessorId) && activityMap.has(d.successorId));

        // 3. Forward Pass
        const sortedIds = topologicalSort(Array.from(activityMap.keys()), deps);
        sortedIds.forEach(id => {
            const activity = activityMap.get(id)!;
            const predecessors = deps.filter(d => d.successorId === id);

            if (predecessors.length === 0) {
                activity.es = 0;
            } else {
                let maxES = 0;
                predecessors.forEach(p => {
                    const pred = activityMap.get(p.predecessorId)!;
                    let currentES = 0;

                    switch (p.type) {
                        case 'FS':
                            currentES = pred.ef + (p.lag || 0);
                            break;
                        case 'SS':
                            currentES = pred.es + (p.lag || 0);
                            break;
                        case 'FF':
                            currentES = (pred.ef + (p.lag || 0)) - activity.duration;
                            break;
                        case 'SF':
                            currentES = (pred.es + (p.lag || 0)) - activity.duration;
                            break;
                        default:
                            currentES = pred.ef + (p.lag || 0);
                    }
                    maxES = Math.max(maxES, currentES);
                });
                activity.es = Math.max(0, maxES);
            }
            activity.ef = activity.es + activity.duration;
        });

        // 4. Backward Pass
        const projectFinish = Math.max(...Array.from(activityMap.values()).map(a => a.ef));
        [...sortedIds].reverse().forEach(id => {
            const activity = activityMap.get(id)!;
            const successors = deps.filter(d => d.predecessorId === id);

            if (successors.length === 0) {
                activity.lf = projectFinish;
            } else {
                let minLF = Infinity;
                successors.forEach(s => {
                    const succ = activityMap.get(s.successorId)!;
                    let currentLF = 0;

                    switch (s.type) {
                        case 'FS':
                            currentLF = succ.ls - (s.lag || 0);
                            break;
                        case 'SS':
                            currentLF = succ.ls - (s.lag || 0) + activity.duration;
                            break;
                        case 'FF':
                            currentLF = succ.lf - (s.lag || 0);
                            break;
                        case 'SF':
                            currentLF = succ.lf - (s.lag || 0) + activity.duration;
                            break;
                        default:
                            currentLF = succ.ls - (s.lag || 0);
                    }
                    minLF = Math.min(minLF, currentLF);
                });
                activity.lf = minLF;
            }
            activity.ls = activity.lf - activity.duration;
            activity.slack = activity.ls - activity.es;
            activity.isCritical = Math.abs(activity.slack) < 0.01; // Handle floating point if any, though here it's integers
        });

        return Array.from(activityMap.values());
    }, [activities, dependencies, dateRange]);

    const pertOptions = useMemo(() => {
        if (!cpmData.length) return {};

        const nodes = cpmData.map(a => ({
            id: a.id.toString(),
            name: a.name,
            symbolSize: 40,
            itemStyle: {
                color: a.isCritical ? "#ef4444" : "#3b82f6",
            },
            label: {
                show: true,
                formatter: (params: any) => params.data.name.length > 15 ? params.data.name.substring(0, 12) + "..." : params.data.name,
                position: "bottom",
                fontSize: 10
            },
            tooltip: {
                formatter: `Activity: ${a.name}<br/>Duration: ${a.duration} days<br/>Slack: ${a.slack} days<br/>${a.isCritical ? "<b>Critical</b>" : ""}`
            }
        }));

        const links = dependencies
            .filter(d => cpmData.some(a => a.id === d.predecessorId) && cpmData.some(a => a.id === d.successorId))
            .map(d => {
                const isCritical = cpmData.find(a => a.id === d.predecessorId)?.isCritical &&
                    cpmData.find(a => a.id === d.successorId)?.isCritical;
                return {
                    source: d.predecessorId.toString(),
                    target: d.successorId.toString(),
                    lineStyle: {
                        color: isCritical ? "#ef4444" : "#94a3b8",
                        width: isCritical ? 2 : 1,
                        curveness: 0.1
                    },
                    label: {
                        show: d.lag !== 0,
                        formatter: `Lag: ${d.lag}`,
                        fontSize: 9
                    }
                };
            });

        return {
            tooltip: {},
            series: [{
                type: "graph",
                layout: "force",
                force: {
                    repulsion: 200,
                    edgeLength: 150
                },
                roam: true,
                draggable: true,
                data: nodes,
                links: links,
                edgeSymbol: ["none", "arrow"],
                edgeSymbolSize: 8,
            }]
        };
    }, [cpmData, dependencies]);

    const ganttOptions = useMemo(() => {
        if (!cpmData.length) return {};

        // Sort data for better visualization
        const sortedData = [...cpmData].sort((a, b) => {
            const dateA = a.plannedFromDate ? parseISO(a.plannedFromDate).getTime() : 0;
            const dateB = b.plannedFromDate ? parseISO(b.plannedFromDate).getTime() : 0;
            return dateA - dateB;
        });

        const categories = sortedData.map(a => a.name);

        const seriesData = sortedData.map((a, index) => {
            const start = a.plannedFromDate ? parseISO(a.plannedFromDate) : new Date();
            const end = a.plannedToDate ? parseISO(a.plannedToDate) : new Date();

            return {
                name: a.name,
                value: [
                    index,
                    start.getTime(),
                    end.getTime(),
                    a.duration,
                    a.isCritical
                ],
                itemStyle: {
                    color: a.isCritical ? "#ef4444" : "#3b82f6"
                }
            };
        });

        return {
            tooltip: {
                formatter: (params: any) => {
                    const data = params.data.value;
                    const start = format(new Date(data[1]), "MMM dd, yyyy");
                    const end = format(new Date(data[2]), "MMM dd, yyyy");
                    return `${params.name}<br/>${start} - ${end}<br/>Duration: ${data[3]} days<br/>${data[4] ? "<b>Critical Path</b>" : ""}`;
                }
            },
            grid: {
                left: 150,
                right: 50,
                bottom: 50
            },
            xAxis: {
                type: "time",
                position: "top",
                axisLabel: {
                    formatter: (value: number) => format(new Date(value), "MMM dd")
                }
            },
            yAxis: {
                type: "category",
                data: categories,
                inverse: true,
                axisLabel: {
                    width: 140,
                    overflow: "truncate",
                    interval: 0
                }
            },
            series: [{
                type: "custom",
                renderItem: (params: any, api: any) => {
                    const categoryIndex = api.value(0);
                    const start = api.coord([api.value(1), categoryIndex]);
                    const end = api.coord([api.value(2), categoryIndex]);
                    const height = api.size([0, 1])[1] * 0.6;

                    return {
                        type: "rect",
                        shape: {
                            x: start[0],
                            y: start[1] - height / 2,
                            width: Math.max(5, end[0] - start[0]),
                            height: height
                        },
                        style: api.style()
                    };
                },
                encode: {
                    x: [1, 2],
                    y: 0
                },
                data: seriesData
            }]
        };
    }, [cpmData]);

    if (isLoadingActivities || isLoadingDeps) {
        return (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-violet-700" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-4">
            <section className="flex flex-col gap-3 rounded-lg border-2 border-slate-300 bg-white px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Activity window</p>
                    <p className="mt-0.5 text-xs text-slate-500">Charts include activities that overlap this date range.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <Calendar className="h-4 w-4 text-violet-700" />
                    <DateRangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        placeholder="Filter activities by date"
                    />
                </div>
            </section>

            {cpmData.length === 0 ? (
                <section className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-slate-900">No data found</h2>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                        No activities fall inside the selected date range. Adjust the window above, or add activities to the project.
                    </p>
                </section>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Card className="border-2 border-slate-300 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-slate-500">
                                    <TrendingUp className="h-4 w-4 text-violet-700" /> Total Activities
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{cpmData.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-slate-300 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-slate-500">
                                    <AlertCircle className="h-4 w-4 text-destructive" /> Critical Activities
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">
                                    {cpmData.filter(a => a.isCritical).length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-slate-300 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase text-slate-500">
                                    <Network className="h-4 w-4 text-violet-700" /> Dependencies
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">
                                    {dependencies.filter(d => cpmData.some(a => a.id === d.predecessorId)).length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="gantt" className="w-full rounded-lg border-2 border-slate-300 bg-white p-4 shadow-sm">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
                            <TabsTrigger value="pert">PERT Chart</TabsTrigger>
                        </TabsList>
                        <TabsContent value="gantt" className="mt-4">
                            <Card className="border-slate-200 shadow-none">
                                <CardHeader>
                                    <CardTitle>Gantt Chart (Timeline)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ReactECharts
                                        option={ganttOptions}
                                        style={{ height: `${Math.max(400, cpmData.length * 30 + 100)}px` }}
                                    />
                                    <div className="flex gap-4 mt-4 text-xs">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-[#3b82f6] rounded"></div>
                                            <span>Normal Activity</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-[#ef4444] rounded"></div>
                                            <span>Critical Path Activity</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="pert" className="mt-4">
                            <Card className="border-slate-200 shadow-none">
                                <CardHeader>
                                    <CardTitle>PERT Chart (Network View)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ReactECharts
                                        option={pertOptions}
                                        style={{ height: "600px" }}
                                    />
                                    <div className="flex gap-4 mt-4 text-xs">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-[#3b82f6] rounded-full"></div>
                                            <span>Normal Activity</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
                                            <span>Critical Path</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}

// Utility function for topological sort
function topologicalSort(nodes: number[], links: { predecessorId: number, successorId: number }[]): number[] {
    const result: number[] = [];
    const visited = new Set<number>();
    const visiting = new Set<number>();

    function visit(nodeId: number) {
        if (visiting.has(nodeId)) return; // Simple cycle detection
        if (visited.has(nodeId)) return;

        visiting.add(nodeId);
        const succs = links.filter(l => l.predecessorId === nodeId).map(l => l.successorId);
        succs.forEach(visit);
        visiting.delete(nodeId);
        visited.add(nodeId);
        result.unshift(nodeId);
    }

    nodes.forEach(n => {
        if (!visited.has(n)) visit(n);
    });

    return result.reverse(); // Standard topo sort is reverse order of finished visiting
}
