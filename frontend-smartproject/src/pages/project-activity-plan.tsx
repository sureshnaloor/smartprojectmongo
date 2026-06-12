import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { get, post, put, del } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Network, ArrowLeft, Trash2, AlertTriangle, Check, Calculator } from "lucide-react";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────

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
    // Scheduling fields persisted in DB (day offsets from project start / float)
    earlyStartDay?: number | null;
    earlyFinishDay?: number | null;
    lateStartDay?: number | null;
    lateFinishDay?: number | null;
    totalFloatDays?: number | null;
}

interface ActivityDependency {
    id: number;
    projectId: number;
    predecessorId: number;
    successorId: number;
    type: "FS" | "SS" | "FF" | "SF";
    lag: number;
    createdAt: string;
}

type LinkType = "FS" | "SS" | "FF" | "SF";

interface ScheduleActivity {
    id: number;
    name: string;
    duration: number;
    es: number;
    ef: number;
    ls: number;
    lf: number;
    es_date: string;
    ef_date: string;
    ls_date: string;
    lf_date: string;
    float: number;
    isCritical: boolean;
    plannedFromDate: string;
    plannedToDate: string;
}

interface ScheduleResult {
    projectStartDate: string;
    projectEndDate: string;
    totalDuration: number;
    criticalPath: number[];
    activities: ScheduleActivity[];
}

interface ProjectSummary {
    id: number;
    startDate: string | null;
    planVersion?: number | null;
    sequenceVersion?: number | null;
}

// ─── Constants ───────────────────────────────────────────────────

const LINK_TYPE_LABELS: Record<LinkType, string> = {
    FS: "Finish-to-Start",
    SS: "Start-to-Start",
    FF: "Finish-to-Finish",
    SF: "Start-to-Finish",
};

const LINK_COLORS: Record<LinkType, string> = {
    FS: "#2563eb", // blue
    SS: "#16a34a", // green
    FF: "#f97316", // amber
    SF: "#a855f7", // purple
};

const ACTIVITY_BOX_WIDTH = 220;
const ACTIVITY_BOX_HEIGHT = 52;
const WP_HEADER_HEIGHT = 40;
const WP_PADDING_TOP = 12;
const WP_PADDING_BOTTOM = 16;
const ACTIVITY_GAP = 16;
const HANDLE_RADIUS = 7;
const WP_GAP = 24;
const ACTIVITIES_PER_ROW = 5;
const DIAGRAM_MARGIN_LEFT = 24;
const DIAGRAM_WIDTH =
    DIAGRAM_MARGIN_LEFT + ACTIVITIES_PER_ROW * (ACTIVITY_BOX_WIDTH + ACTIVITY_GAP) - ACTIVITY_GAP + DIAGRAM_MARGIN_LEFT;

// ─── Component ───────────────────────────────────────────────────

export default function ProjectActivityPlan() {
    const { projectId } = useParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [mode, setMode] = useState<"planning" | "sequence">("planning");
    const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Sequence mode state
    const [draggingFrom, setDraggingFrom] = useState<{
        activityId: number;
        side: "start" | "finish";
        x: number;
        y: number;
    } | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [linkDialog, setLinkDialog] = useState<{
        predecessorId: number;
        successorId: number;
        type: LinkType;
    } | null>(null);
    const [lagInput, setLagInput] = useState("0");
    const svgRef = useRef<SVGSVGElement>(null);
    const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
    const [draggedActivityId, setDraggedActivityId] = useState<number | null>(null);
    const [activeWpFilter, setActiveWpFilter] = useState<number | null>(null);
    const [activityLayoutOverrides, setActivityLayoutOverrides] = useState<
        Map<number, { col: number; row: number }>
    >(() => {
        if (typeof window === "undefined") return new Map();
        try {
            const key = `activity-layout-${projectId ?? "unknown"}`;
            const raw = window.sessionStorage.getItem(key);
            if (!raw) return new Map();
            const obj = JSON.parse(raw) as Record<string, { col: number; row: number }>;
            const map = new Map<number, { col: number; row: number }>();
            Object.entries(obj).forEach(([id, value]) => {
                map.set(Number(id), value);
            });
            return map;
        } catch {
            return new Map();
        }
    });

    // ─── Data Fetching ──────────────────────────────────────────────

    const { data: workPackages = [] } = useQuery<WorkPackage[]>({
        queryKey: ["work-packages", projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const wbsResponse = await get(`/projects/${projectId}/wbs`);
            const allWps: WorkPackage[] = [];
            for (const wbs of wbsResponse) {
                try {
                    const wpResponse = await fetch(`/api/wbs/${wbs.id}/work-packages`).then((r) => r.json());
                    if (Array.isArray(wpResponse)) {
                        allWps.push(...wpResponse);
                    }
                } catch { /* skip */ }
            }
            return allWps;
        },
        enabled: !!projectId,
    });

    const { data: allActivities = [] } = useQuery<ProjectActivity[]>({
        queryKey: ["project-activities", projectId],
        queryFn: () => get(`/projects/${projectId}/activities`),
        enabled: !!projectId,
    });

    const { data: dependencies = [] } = useQuery<ActivityDependency[]>({
        queryKey: ["activity-dependencies", projectId],
        queryFn: () => get(`/projects/${projectId}/activity-dependencies`),
        enabled: !!projectId,
    });

    const { data: project } = useQuery<ProjectSummary>({
        queryKey: ["project", projectId],
        queryFn: () => get(`/projects/${projectId}`),
        enabled: !!projectId,
    });

    // ─── Mutations ──────────────────────────────────────────────────

    const updateActivityMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ProjectActivity> }) =>
            put(`/projects/${projectId}/activities/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Success", description: "Activity updated" });
            setEditingActivity(null);
            setIsEditDialogOpen(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const createDependencyMutation = useMutation({
        mutationFn: (data: { predecessorId: number; successorId: number; type: LinkType; lag: number }) =>
            post(`/projects/${projectId}/activity-dependencies`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activity-dependencies", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-activity-dependencies", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            toast({ title: "Success", description: "Link created" });
            setLinkDialog(null);
            setLagInput("0");
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteDependencyMutation = useMutation({
        mutationFn: (id: number) => del(`/projects/${projectId}/activity-dependencies/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activity-dependencies", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-activity-dependencies", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            toast({ title: "Success", description: "Link removed" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const scheduleMutation = useMutation({
        mutationFn: () => post(`/projects/${projectId}/schedule`),
        onSuccess: (data) => {
            setScheduleResult(data as ScheduleResult);
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            toast({ title: "Success", description: "Project schedule updated successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Scheduling Error", description: error.message, variant: "destructive" });
        },
    });

    // ─── Grouped Activities ─────────────────────────────────────────

    const activitiesByWp = useMemo(() => {
        const map = new Map<number, ProjectActivity[]>();
        for (const act of allActivities) {
            const list = map.get(act.wpId) || [];
            list.push(act);
            map.set(act.wpId, list);
        }
        return map;
    }, [allActivities]);

    // ─── Orphan Validation ──────────────────────────────────────────

    const linkedActivityIds = useMemo(() => {
        const ids = new Set<number>();
        for (const dep of dependencies) {
            ids.add(dep.predecessorId);
            ids.add(dep.successorId);
        }
        return ids;
    }, [dependencies]);

    const orphanActivities = useMemo(
        () => allActivities.filter((a) => !linkedActivityIds.has(a.id)),
        [allActivities, linkedActivityIds]
    );

    // When a WP is selected, show only its activities plus directly linked neighbours
    const visibleActivityIds = useMemo(() => {
        if (!activeWpFilter) return null;
        const selectedActs = activitiesByWp.get(activeWpFilter) || [];
        const ids = new Set<number>(selectedActs.map((a) => a.id));

        if (ids.size === 0) return null;

        for (const dep of dependencies) {
            if (ids.has(dep.predecessorId) || ids.has(dep.successorId)) {
                ids.add(dep.predecessorId);
                ids.add(dep.successorId);
            }
        }

        return ids;
    }, [activeWpFilter, activitiesByWp, dependencies]);

    // ─── Sequence Layout Positions (horizontal grid: 5 per row, wrap) ─

    const { activityPositions, wpLayout, svgHeight } = useMemo(() => {
        const positions = new Map<number, { x: number; y: number; wpId: number }>();
        const layout = new Map<number, { groupY: number; groupHeight: number; rows: number }>();
        let currentY = 20;

        for (const wp of workPackages) {
            const wpActivities = activitiesByWp.get(wp.id) || [];
            if (wpActivities.length === 0) continue;

            let maxRow = 0;
            const groupY = currentY;

            for (let i = 0; i < wpActivities.length; i++) {
                const act = wpActivities[i];
                const baseCol = i % ACTIVITIES_PER_ROW;
                const baseRow = Math.floor(i / ACTIVITIES_PER_ROW);
                const override = activityLayoutOverrides.get(act.id);
                const col = override?.col ?? baseCol;
                const row = override?.row ?? baseRow;
                if (row > maxRow) maxRow = row;
                positions.set(act.id, {
                    x: DIAGRAM_MARGIN_LEFT + col * (ACTIVITY_BOX_WIDTH + ACTIVITY_GAP),
                    y: groupY + WP_HEADER_HEIGHT + WP_PADDING_TOP + row * (ACTIVITY_BOX_HEIGHT + ACTIVITY_GAP),
                    wpId: wp.id,
                });
            }

            const rows = maxRow + 1;
            const groupHeight =
                WP_HEADER_HEIGHT + WP_PADDING_TOP + rows * (ACTIVITY_BOX_HEIGHT + ACTIVITY_GAP) + WP_PADDING_BOTTOM;

            layout.set(wp.id, { groupY, groupHeight, rows });

            currentY += groupHeight + WP_GAP;
        }

        let maxY = Math.max(currentY + 40, 200);
        return {
            activityPositions: positions,
            wpLayout: layout,
            svgHeight: maxY,
        };
    }, [workPackages, activitiesByWp, activityLayoutOverrides]);

    // ─── Drag-to-Link Handlers ──────────────────────────────────────

    const getHandlePos = useCallback(
        (activityId: number, side: "start" | "finish") => {
            const pos = activityPositions.get(activityId);
            if (!pos) return { x: 0, y: 0 };
            return {
                x: side === "start" ? pos.x : pos.x + ACTIVITY_BOX_WIDTH,
                y: pos.y + ACTIVITY_BOX_HEIGHT / 2,
            };
        },
        [activityPositions]
    );

    const handleMouseDown = useCallback(
        (activityId: number, side: "start" | "finish") => {
            const pos = getHandlePos(activityId, side);
            setDraggingFrom({ activityId, side, x: pos.x, y: pos.y });
            setMousePos(pos);
        },
        [getHandlePos]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<SVGSVGElement>) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            // Active link drag
            if (draggingFrom) {
                setMousePos(point);
                return;
            }

            // Active activity drag (reposition within its WP grid)
            if (draggedActivityId != null) {
                const pos = activityPositions.get(draggedActivityId);
                if (!pos) return;
                const wpInfo = wpLayout.get(pos.wpId);
                if (!wpInfo) return;

                const { groupY } = wpInfo;

                const colFloat =
                    (point.x - DIAGRAM_MARGIN_LEFT) / (ACTIVITY_BOX_WIDTH + ACTIVITY_GAP);
                let col = Math.round(colFloat);
                col = Math.max(0, Math.min(ACTIVITIES_PER_ROW - 1, col));

                const rowFloat =
                    (point.y - (groupY + WP_HEADER_HEIGHT + WP_PADDING_TOP)) /
                    (ACTIVITY_BOX_HEIGHT + ACTIVITY_GAP);
                let row = Math.round(rowFloat);
                row = Math.max(0, row);

                setActivityLayoutOverrides((prev) => {
                    const next = new Map(prev);
                    next.set(draggedActivityId, { col, row });

                    // Persist layout in this browser session
                    if (typeof window !== "undefined") {
                        try {
                            const key = `activity-layout-${projectId ?? "unknown"}`;
                            const obj: Record<string, { col: number; row: number }> = {};
                            next.forEach((value, id) => {
                                obj[String(id)] = value;
                            });
                            window.sessionStorage.setItem(key, JSON.stringify(obj));
                        } catch {
                            // ignore
                        }
                    }

                    return next;
                });
                return;
            }
        },
        [draggingFrom, draggedActivityId, activityPositions, wpLayout]
    );

    const handleMouseUp = useCallback(
        (targetActivityId: number, targetSide: "start" | "finish") => {
            if (!draggingFrom || draggingFrom.activityId === targetActivityId) {
                setDraggingFrom(null);
                setMousePos(null);
                return;
            }

            // Determine link type based on source side → target side
            let linkType: LinkType;
            if (draggingFrom.side === "finish" && targetSide === "start") {
                linkType = "FS";
            } else if (draggingFrom.side === "start" && targetSide === "start") {
                linkType = "SS";
            } else if (draggingFrom.side === "finish" && targetSide === "finish") {
                linkType = "FF";
            } else {
                linkType = "SF";
            }

            setLinkDialog({
                predecessorId: draggingFrom.activityId,
                successorId: targetActivityId,
                type: linkType,
            });

            setDraggingFrom(null);
            setMousePos(null);
        },
        [draggingFrom]
    );

    const handleGlobalMouseUp = useCallback(() => {
        if (draggingFrom) {
            setDraggingFrom(null);
            setMousePos(null);
        }
        if (draggedActivityId != null) {
            setDraggedActivityId(null);
        }
    }, [draggingFrom, draggedActivityId]);

    const handleActivityDragStart = useCallback(
        (e: React.MouseEvent<SVGRectElement>, activityId: number) => {
            // Avoid interfering with link-handle drags
            e.stopPropagation();
            e.preventDefault();
            setDraggedActivityId(activityId);
        },
        []
    );

    // ─── WP Color Palette ──────────────────────────────────────────

    const wpColors = useMemo(() => {
        const palette = [
            "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
            "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
        ];
        const map = new Map<number, string>();
        workPackages.forEach((wp, i) => map.set(wp.id, palette[i % palette.length]));
        return map;
    }, [workPackages]);

    // ─── Render: Planning Mode ──────────────────────────────────────

    const renderPlanningMode = () => (
        <div className="flex gap-6 h-[calc(100vh-12rem)] p-4">
            {/* Left: Work Packages */}
            <Card className="w-72 flex-shrink-0 flex flex-col">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Work Packages</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                        <div className="space-y-2">
                            {workPackages.map((wp) => {
                                const wpActs = activitiesByWp.get(wp.id) || [];
                                return (
                                    <div
                                        key={wp.id}
                                        className="rounded-lg border p-3 bg-white shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: wpColors.get(wp.id) }}
                                            />
                                            <span className="font-semibold text-sm truncate">
                                                {wp.code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{wp.name}</p>
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                            {wpActs.length} activities
                                        </Badge>
                                    </div>
                                );
                            })}
                            {workPackages.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No work packages found
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Right: Activities grouped by WP */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-zinc-800">Activity Plan</h2>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => scheduleMutation.mutate()}
                                disabled={allActivities.length === 0 || orphanActivities.length > 0 || scheduleMutation.isPending}
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Calculator className="h-4 w-4" />
                                {(project?.planVersion ?? 0) >= 1 ? "Revise Plan" : "Plan"}
                            </Button>
                            <Button
                                onClick={() => setMode("sequence")}
                                disabled={allActivities.length < 2}
                                variant="outline"
                                className="gap-2"
                            >
                                <Network className="h-4 w-4" />
                                {(project?.sequenceVersion ?? 0) >= 1 || dependencies.length > 0 ? "Revise Sequence" : "Sequence"}
                            </Button>
                        </div>
                    </div>
                    {((project?.planVersion ?? 0) >= 1 || (project?.sequenceVersion ?? 0) >= 1) && (
                        <p className="text-sm text-muted-foreground">
                            {(project?.planVersion ?? 0) >= 1 && (
                                <span>Plan version {(project?.planVersion ?? 0)} already completed.</span>
                            )}
                            {(project?.planVersion ?? 0) >= 1 && (project?.sequenceVersion ?? 0) >= 1 && " "}
                            {(project?.sequenceVersion ?? 0) >= 1 && (
                                <span>Sequence version {(project?.sequenceVersion ?? 0)}.</span>
                            )}
                        </p>
                    )}
                </div>

                <ScrollArea className="flex-1">
                    <div className="space-y-6 pr-4">
                        {workPackages.map((wp) => {
                            const wpActs = activitiesByWp.get(wp.id) || [];
                            if (wpActs.length === 0) return null;
                            return (
                                <Card key={wp.id} className="shadow-sm">
                                    <CardHeader className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: wpColors.get(wp.id) }}
                                            />
                                            <CardTitle className="text-sm font-semibold">
                                                {wp.code} — {wp.name}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-3 pt-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-2 pr-3 font-semibold text-zinc-600 whitespace-nowrap">Activity</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-zinc-600 whitespace-nowrap w-24">Duration (Days)</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-zinc-600 whitespace-nowrap w-32">ES</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-zinc-600 whitespace-nowrap w-32">EF</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-zinc-600 whitespace-nowrap w-32">LS</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-zinc-600 whitespace-nowrap w-32">LF</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-zinc-600 whitespace-nowrap w-24">TF (Days)</th>
                                                        <th className="text-center py-2 pl-3 font-semibold text-zinc-600 w-16">Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {wpActs.map((act) => {
                                                        const isCritical = scheduleResult?.criticalPath.includes(act.id);
                                                        return (
                                                            <tr key={act.id} className={`border-b last:border-0 hover:bg-zinc-50/60 transition-colors ${isCritical ? "border-l-4 border-l-red-500 bg-red-50/20" : ""}`}>
                                                                <td className="py-2.5 pr-3">
                                                                    <span className="font-medium text-zinc-800">{act.name}</span>
                                                                    {act.description && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{act.description}</p>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    {act.duration ? (
                                                                        <Badge variant="outline" className="font-mono">{act.duration}</Badge>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs">
                                                                    {act.plannedFromDate
                                                                        ? format(new Date(act.plannedFromDate), "dd MMM yyyy")
                                                                        : <span className="text-muted-foreground">—</span>}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs">
                                                                    {act.plannedToDate
                                                                        ? format(new Date(act.plannedToDate), "dd MMM yyyy")
                                                                        : <span className="text-muted-foreground">—</span>}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs">
                                                                    {(() => {
                                                                        const s = scheduleResult?.activities.find(a => a.id === act.id);
                                                                        let date: Date | null = null;

                                                                        if (s && s.ls_date) {
                                                                            date = new Date(s.ls_date);
                                                                        } else if (project?.startDate && act.lateStartDay != null) {
                                                                            const d = new Date(project.startDate);
                                                                            d.setDate(d.getDate() + act.lateStartDay);
                                                                            date = d;
                                                                        }

                                                                        return date
                                                                            ? format(date, "dd MMM yyyy")
                                                                            : <span className="text-muted-foreground">—</span>;
                                                                    })()}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs">
                                                                    {(() => {
                                                                        const s = scheduleResult?.activities.find(a => a.id === act.id);
                                                                        let date: Date | null = null;

                                                                        if (s && s.lf_date) {
                                                                            date = new Date(s.lf_date);
                                                                        } else if (project?.startDate && act.lateFinishDay != null) {
                                                                            const d = new Date(project.startDate);
                                                                            d.setDate(d.getDate() + act.lateFinishDay);
                                                                            date = d;
                                                                        }

                                                                        return date
                                                                            ? format(date, "dd MMM yyyy")
                                                                            : <span className="text-muted-foreground">—</span>;
                                                                    })()}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs">
                                                                    {(() => {
                                                                        const s = scheduleResult?.activities.find(a => a.id === act.id);
                                                                        const float = s?.float ?? act.totalFloatDays;
                                                                        return float != null
                                                                            ? float
                                                                            : <span className="text-muted-foreground">—</span>;
                                                                    })()}
                                                                </td>
                                                                <td className="py-2.5 pl-3 text-center">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() => {
                                                                            setEditingActivity(act);
                                                                            setIsEditDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {allActivities.length === 0 && (
                            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                <div className="text-center text-muted-foreground">
                                    <p className="font-medium">No activities assigned yet</p>
                                    <p className="text-sm mt-1">Go to the main Activities page to assign activities to work packages first</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );

    // ─── Orthogonal path for dependency links (straight + 90° rounded) ─

    const getOrthogonalPath = useCallback(
        (from: { x: number; y: number }, to: { x: number; y: number }, laneOffset: number): string => {
            // Build a polyline that:
            // - starts at the handle centre,
            // - steps vertically to just below the activity box,
            // - runs through a lane-specific horizontal corridor,
            // - and comes back in to the target handle.
            //
            // laneOffset shifts the whole corridor so parallel links between the
            // same activities appear side‑by‑side with a visible gap.

            const baseFromX = from.x;
            const baseToX = to.x;

            // Always route below the activity boxes so we don't overlap straight
            // mid‑height links between activities on the same row.
            const direction = 1;
            const edgeOffset = ACTIVITY_BOX_HEIGHT / 2 + 6;
            const fromAnchorY = from.y + direction * edgeOffset;
            const toAnchorY = to.y + direction * edgeOffset;

            // How far away from the handle we step before entering the shared lane.
            const stubFactor = 0.35;
            const fromStubX = baseFromX + laneOffset * stubFactor;
            const toStubX = baseToX + laneOffset * stubFactor;

            // Lane corridor in the middle
            const baseMidX = (baseFromX + baseToX) / 2;
            const midX = baseMidX + laneOffset;

            return [
                `M ${baseFromX} ${from.y}`,
                `L ${baseFromX} ${fromAnchorY}`,
                `L ${fromStubX} ${fromAnchorY}`,
                `L ${midX} ${fromAnchorY}`,
                `L ${midX} ${toAnchorY}`,
                `L ${toStubX} ${toAnchorY}`,
                `L ${baseToX} ${toAnchorY}`,
                `L ${baseToX} ${to.y}`,
            ].join(" ");
        },
        []
    );

    // ─── Render: Sequence Mode ──────────────────────────────────────

    const renderSequenceMode = () => {
        return (
            <div className="flex flex-col h-[calc(100vh-12rem)] p-4 gap-4">
                {/* Header bar */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setMode("planning")} className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Planning
                        </Button>
                        <h2 className="text-lg font-bold text-zinc-800">Sequence Activities</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {orphanActivities.length > 0 ? (
                            <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {orphanActivities.length} unlinked activit{orphanActivities.length === 1 ? "y" : "ies"}
                            </Badge>
                        ) : allActivities.length > 0 ? (
                            <Badge variant="default" className="gap-1.5 py-1 px-3 bg-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                                All activities linked
                            </Badge>
                        ) : null}
                        <Badge variant="secondary" className="py-1 px-3">
                            {dependencies.length} link{dependencies.length !== 1 ? "s" : ""}
                        </Badge>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0 px-1">
                    <span>Drag from a handle (● left = Start, ● right = Finish) to another activity&apos;s handle to create a link. Hover links for details.</span>
                    <span className="border-l pl-4 flex gap-3">
                        {(["FS", "SS", "FF", "SF"] as const).map((t) => (
                            <span key={t} className="font-mono font-bold">{t} = {LINK_TYPE_LABELS[t]}</span>
                        ))}
                    </span>
                </div>

                {/* Two columns: left WP list (~20%), right diagram (~80%) */}
                <div className="flex flex-1 gap-4 min-h-0">
                    {/* Left: Work packages column (click to filter) */}
                    <Card className="w-64 flex-shrink-0 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Work Packages</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <ScrollArea className="h-full px-4 pb-4">
                                <div className="space-y-2">
                                    {/* All work packages pill */}
                                    <div
                                        className={`rounded-lg border p-3 shadow-sm cursor-pointer transition-colors ${
                                            activeWpFilter == null
                                                ? "bg-indigo-50 border-indigo-400"
                                                : "bg-white hover:bg-zinc-50"
                                        }`}
                                        onClick={() => setActiveWpFilter(null)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-slate-400 flex-shrink-0" />
                                            <span className="font-semibold text-sm truncate">
                                                All
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Show all work packages
                                        </p>
                                    </div>
                                    {workPackages.map((wp) => {
                                        const wpActs = activitiesByWp.get(wp.id) || [];
                                        if (wpActs.length === 0) return null;
                                        const isActive = activeWpFilter === wp.id;
                                        return (
                                            <div
                                                key={wp.id}
                                                className={`rounded-lg border p-3 shadow-sm cursor-pointer transition-colors ${
                                                    isActive ? "bg-indigo-50 border-indigo-400" : "bg-white hover:bg-zinc-50"
                                                }`}
                                                onClick={() =>
                                                    setActiveWpFilter((prev) =>
                                                        prev === wp.id ? null : wp.id
                                                    )
                                                }
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: wpColors.get(wp.id) }}
                                                    />
                                                    <span className="font-semibold text-sm truncate">
                                                        {wp.code}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{wp.name}</p>
                                                <Badge variant="secondary" className="mt-1 text-xs">
                                                    {wpActs.length} activities
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Right: Diagram (~80%) */}
                    <div className="flex-1 min-w-0 overflow-auto border rounded-lg bg-white shadow-inner">
                        <svg
                            ref={svgRef}
                            width={DIAGRAM_WIDTH}
                            height={svgHeight}
                            className="select-none block"
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleGlobalMouseUp}
                            onMouseLeave={handleGlobalMouseUp}
                        >
                            <defs>
                                <marker
                                    id="arrowhead"
                                    viewBox="0 0 10 7"
                                    refX="10"
                                    refY="3.5"
                                    markerWidth="8"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                                </marker>
                            </defs>

                            {/* Render WP groups */}
                                    {workPackages.map((wp) => {
                                const allActsForWp = activitiesByWp.get(wp.id) || [];
                                const wpActs =
                                    visibleActivityIds == null
                                        ? allActsForWp
                                        : allActsForWp.filter((act) =>
                                              visibleActivityIds.has(act.id)
                                          );
                                const layout = wpLayout.get(wp.id);
                                if (wpActs.length === 0 || !layout) return null;

                                const { groupY, groupHeight } = layout;
                                const color = wpColors.get(wp.id) || "#6b7280";
                                const groupWidth = ACTIVITIES_PER_ROW * (ACTIVITY_BOX_WIDTH + ACTIVITY_GAP) - ACTIVITY_GAP;

                                return (
                                    <g key={wp.id}>
                                        {/* WP background */}
                                        <rect
                                            x={DIAGRAM_MARGIN_LEFT}
                                            y={groupY}
                                            width={groupWidth}
                                            height={groupHeight}
                                            rx={8}
                                            fill={`${color}10`}
                                            stroke={`${color}40`}
                                            strokeWidth={1}
                                        />
                                        {/* WP label (small) */}
                                        <text
                                            x={DIAGRAM_MARGIN_LEFT + 10}
                                            y={groupY + 26}
                                            fontSize={12}
                                            fontWeight="bold"
                                            fill={color}
                                        >
                                            {wp.code}
                                        </text>

                                    {/* Activity boxes */}
                                    {wpActs.map((act, i) => {
                                        const pos = activityPositions.get(act.id);
                                        if (!pos) return null;
                                        const isOrphan = !linkedActivityIds.has(act.id);

                                        return (
                                            <g key={act.id}>
                                                {/* Activity box */}
                                                <rect
                                                    x={pos.x}
                                                    y={pos.y}
                                                    width={ACTIVITY_BOX_WIDTH}
                                                    height={ACTIVITY_BOX_HEIGHT}
                                                    rx={6}
                                                    fill={isOrphan ? "#fef3c7" : scheduleResult?.criticalPath.includes(act.id) ? "#fef2f2" : "#fff"}
                                                    stroke={isOrphan ? "#f59e0b" : scheduleResult?.criticalPath.includes(act.id) ? "#ef4444" : "#d4d4d8"}
                                                    strokeWidth={isOrphan || scheduleResult?.criticalPath.includes(act.id) ? 2 : 1}
                                                    className="cursor-move"
                                                    onMouseDown={(e) => handleActivityDragStart(e, act.id)}
                                                />
                                                {/* Activity name */}
                                                <text
                                                    x={pos.x + 12}
                                                    y={pos.y + 20}
                                                    fontSize={12}
                                                    fontWeight="600"
                                                    fill="#18181b"
                                                    className="pointer-events-none"
                                                >
                                                    {act.name.length > 24 ? act.name.slice(0, 22) + "…" : act.name}
                                                </text>
                                                {/* Duration label */}
                                                <text
                                                    x={pos.x + 12}
                                                    y={pos.y + 38}
                                                    fontSize={10}
                                                    fill="#71717a"
                                                    className="pointer-events-none"
                                                >
                                                    {act.duration ? `${act.duration}d` : "no duration"}
                                                    {scheduleResult && ` • TF: ${scheduleResult.activities.find(a => a.id === act.id)?.float ?? '-'}`}
                                                </text>

                                                {/* Left handle (Start) */}
                                                <circle
                                                    cx={pos.x}
                                                    cy={pos.y + ACTIVITY_BOX_HEIGHT / 2}
                                                    r={HANDLE_RADIUS}
                                                    fill={draggingFrom?.activityId === act.id && draggingFrom?.side === "start" ? "#3b82f6" : "#94a3b8"}
                                                    stroke="#fff"
                                                    strokeWidth={2}
                                                    className="cursor-crosshair"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        handleMouseDown(act.id, "start");
                                                    }}
                                                    onMouseUp={(e) => {
                                                        e.stopPropagation();
                                                        handleMouseUp(act.id, "start");
                                                    }}
                                                />

                                                {/* Right handle (Finish) */}
                                                <circle
                                                    cx={pos.x + ACTIVITY_BOX_WIDTH}
                                                    cy={pos.y + ACTIVITY_BOX_HEIGHT / 2}
                                                    r={HANDLE_RADIUS}
                                                    fill={draggingFrom?.activityId === act.id && draggingFrom?.side === "finish" ? "#3b82f6" : "#94a3b8"}
                                                    stroke="#fff"
                                                    strokeWidth={2}
                                                    className="cursor-crosshair"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        handleMouseDown(act.id, "finish");
                                                    }}
                                                    onMouseUp={(e) => {
                                                        e.stopPropagation();
                                                        handleMouseUp(act.id, "finish");
                                                    }}
                                                />
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                            {/* Render existing dependency links (colored, hover for details) */}
                            {(() => {
                                const visibleDeps =
                                    visibleActivityIds == null
                                        ? dependencies
                                        : dependencies.filter(
                                              (dep) =>
                                                  visibleActivityIds.has(dep.predecessorId) &&
                                                  visibleActivityIds.has(dep.successorId)
                                          );

                                const laneSpacing = 18;
                                const laneCenter = (visibleDeps.length - 1) / 2;

                                return visibleDeps.map((dep, index) => {
                                    const predSide = dep.type === "FS" || dep.type === "FF" ? "finish" : "start";
                                    const succSide = dep.type === "FS" || dep.type === "SS" ? "start" : "finish";
                                    const from = getHandlePos(dep.predecessorId, predSide);
                                    const to = getHandlePos(dep.successorId, succSide);
                                    if (!from || !to) return null;

                                    const laneOffset = (index - laneCenter) * laneSpacing;

                                    // If activities are on roughly the same row, draw a simple straight line
                                    const sameRow =
                                        Math.abs(from.y - to.y) < ACTIVITY_BOX_HEIGHT / 2 &&
                                        Math.abs(from.y - to.y) < 12;
                                    const path = sameRow
                                        ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
                                        : getOrthogonalPath(from, to, laneOffset);

                                    const predAct = allActivities.find((a) => a.id === dep.predecessorId);
                                    const succAct = allActivities.find((a) => a.id === dep.successorId);
                                    const predDuration = predAct?.duration ?? null;
                                    const succDuration = succAct?.duration ?? null;
                                    const lagLabel =
                                        dep.lag > 0 ? `+${dep.lag}d` : dep.lag < 0 ? `${dep.lag}d` : "0d";
                                    const hoverParts: string[] = [];
                                    // Relationship / type
                                    hoverParts.push(`${dep.type} — ${LINK_TYPE_LABELS[dep.type]}`);
                                    // Durations
                                    if (predDuration != null || succDuration != null) {
                                        const durLabel = [
                                            predDuration != null ? `Pred: ${predDuration}d` : null,
                                            succDuration != null ? `Succ: ${succDuration}d` : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" | ");
                                        hoverParts.push(durLabel);
                                    }
                                    // Lag / lead
                                    hoverParts.push(`Lag/Lead: ${lagLabel}`);

                                    const hoverTitle = hoverParts.join(" • ");

                                    return (
                                        <g
                                            key={dep.id}
                                            className="group cursor-pointer"
                                            onClick={() => {
                                                if (confirm(`Delete ${dep.type} link (lag: ${dep.lag} days)?`)) {
                                                    deleteDependencyMutation.mutate(dep.id);
                                                }
                                            }}
                                        >
                                            <title>{hoverTitle}</title>
                                            {/* Invisible wider hitbox for hover/click */}
                                            <path
                                                d={path}
                                                fill="none"
                                                stroke="transparent"
                                                strokeWidth={14}
                                                title={hoverTitle}
                                            />
                                            {/* Visible line, colored by type */}
                                            <path
                                                d={path}
                                                fill="none"
                                                stroke={LINK_COLORS[dep.type]}
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeDasharray={
                                                    dep.type === "SS"
                                                        ? "6,3"
                                                        : dep.type === "FF"
                                                        ? "2,3"
                                                        : undefined
                                                }
                                                markerEnd="url(#arrowhead)"
                                                className="transition-colors pointer-events-none group-hover:opacity-80"
                                            />
                                        </g>
                                    );
                                });
                            })()}

                            {/* Current drag line */}
                            {draggingFrom && mousePos && (
                                <line
                                    x1={draggingFrom.x}
                                    y1={draggingFrom.y}
                                    x2={mousePos.x}
                                    y2={mousePos.y}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="6,3"
                                    className="pointer-events-none"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* Orphan list */}
                {orphanActivities.length > 0 && (
                    <div className="flex-shrink-0 border rounded-lg p-3 bg-amber-50">
                        <p className="text-sm font-semibold text-amber-800 mb-1">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Unlinked Activities ({orphanActivities.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {orphanActivities.map((act) => (
                                <Badge key={act.id} variant="outline" className="bg-white border-amber-300 text-amber-800">
                                    {act.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ─── Render ─────────────────────────────────────────────────────

    return (
        <div className="h-full">
            {mode === "planning" ? renderPlanningMode() : renderSequenceMode()}

            {/* Edit Activity Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Activity</DialogTitle>
                    </DialogHeader>
                    {editingActivity && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const data: Partial<ProjectActivity> = {
                                    name: editingActivity.name,
                                    description: editingActivity.description,
                                    unitOfMeasure: editingActivity.unitOfMeasure,
                                    unitRate: editingActivity.unitRate,
                                    quantity: editingActivity.quantity,
                                    remarks: editingActivity.remarks,
                                    wpId: editingActivity.wpId,
                                    duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : null,
                                    plannedFromDate: (formData.get("plannedFromDate") as string) || null,
                                    plannedToDate: (formData.get("plannedToDate") as string) || null,
                                };
                                updateActivityMutation.mutate({ id: editingActivity.id, data });
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <Label className="text-sm font-medium">{editingActivity.name}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {editingActivity.unitOfMeasure} · Rate: {editingActivity.unitRate}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (Days)</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    type="number"
                                    min="1"
                                    defaultValue={editingActivity.duration || ""}
                                    placeholder="Enter duration in days"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="plannedFromDate">Planned Start</Label>
                                    <Input
                                        id="plannedFromDate"
                                        name="plannedFromDate"
                                        type="date"
                                        defaultValue={editingActivity.plannedFromDate || ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plannedToDate">Planned End</Label>
                                    <Input
                                        id="plannedToDate"
                                        name="plannedToDate"
                                        type="date"
                                        defaultValue={editingActivity.plannedToDate || ""}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateActivityMutation.isPending}>
                                    Save
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Link Creation Dialog */}
            <Dialog open={!!linkDialog} onOpenChange={(open) => !open && setLinkDialog(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Create Activity Link</DialogTitle>
                    </DialogHeader>
                    {linkDialog && (
                        <div className="space-y-4">
                            <div className="space-y-1 text-sm">
                                <p>
                                    <span className="font-semibold">From:</span>{" "}
                                    {allActivities.find((a) => a.id === linkDialog.predecessorId)?.name}
                                </p>
                                <p>
                                    <span className="font-semibold">To:</span>{" "}
                                    {allActivities.find((a) => a.id === linkDialog.successorId)?.name}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Link Type</Label>
                                <Select
                                    value={linkDialog.type}
                                    onValueChange={(v) => setLinkDialog({ ...linkDialog, type: v as LinkType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(["FS", "SS", "FF", "SF"] as const).map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t} — {LINK_TYPE_LABELS[t]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Lag / Lead (days)</Label>
                                <Input
                                    type="number"
                                    value={lagInput}
                                    onChange={(e) => setLagInput(e.target.value)}
                                    placeholder="0 = no lag. Positive = lag, negative = lead"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Positive = lag (delay), Negative = lead (overlap)
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setLinkDialog(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        createDependencyMutation.mutate({
                                            predecessorId: linkDialog.predecessorId,
                                            successorId: linkDialog.successorId,
                                            type: linkDialog.type,
                                            lag: parseInt(lagInput) || 0,
                                        });
                                    }}
                                    disabled={createDependencyMutation.isPending}
                                >
                                    Create Link
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
