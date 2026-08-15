import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { get, post, put, patch, del } from "@/lib/api-client";
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
import { Pencil, Network, ArrowLeft, Trash2, AlertTriangle, Check, Calculator, Calendar, Download, RotateCcw } from "lucide-react";
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
    earlyStartDay?: number | null;
    earlyFinishDay?: number | null;
    lateStartDay?: number | null;
    lateFinishDay?: number | null;
    totalFloatDays?: number | null;
    isPseudo?: boolean | null;
    pseudoType?: "START" | "FINISH" | null;
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
    isPseudo?: boolean | null;
    pseudoType?: "START" | "FINISH" | null;
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
    name?: string;
    startDate: string | null;
    endDate?: string | null;
    planVersion?: number | null;
    sequenceVersion?: number | null;
    activitiesFinalized?: boolean | null;
}

// ─── Constants ───────────────────────────────────────────────────

const LINK_TYPE_LABELS: Record<LinkType, string> = {
    FS: "Finish-to-Start",
    SS: "Start-to-Start",
    FF: "Finish-to-Finish",
    SF: "Start-to-Finish",
};

const LINK_COLORS: Record<LinkType, string> = {
    FS: "#3b82f6", // blue
    SS: "#10b981", // emerald green
    FF: "#f59e0b", // amber
    SF: "#8b5cf6", // purple
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const COLUMN_SPACING = 270;
const ROW_SPACING = 110;
const HANDLE_RADIUS = 6;

// ─── Component ───────────────────────────────────────────────────

export default function ProjectActivityPlan() {
    const { projectId } = useParams();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [mode, setMode] = useState<"planning" | "sequence">("planning");
    const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [projectStartDateInput, setProjectStartDateInput] = useState<string>("");

    // Sequence mode drag state
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
    const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
    const [activeWpFilter, setActiveWpFilter] = useState<number | null>(null);

    // Persistent custom drag position offsets for sequence network diagram
    const [nodeCustomPos, setNodeCustomPos] = useState<Map<number, { x: number; y: number }>>(() => {
        if (typeof window === "undefined") return new Map();
        try {
            const key = `network-layout-${projectId ?? "unknown"}`;
            const raw = window.localStorage.getItem(key);
            if (!raw) return new Map();
            const entries: [number, { x: number; y: number }][] = JSON.parse(raw);
            return new Map(entries);
        } catch {
            return new Map();
        }
    });

    const saveNodePositions = useCallback((map: Map<number, { x: number; y: number }>) => {
        if (typeof window !== "undefined") {
            try {
                const key = `network-layout-${projectId ?? "unknown"}`;
                const array = Array.from(map.entries());
                window.localStorage.setItem(key, JSON.stringify(array));
            } catch { /* ignore */ }
        }
    }, [projectId]);

    const handleResetLayout = () => {
        setNodeCustomPos(new Map());
        if (typeof window !== "undefined") {
            try {
                const key = `network-layout-${projectId ?? "unknown"}`;
                window.localStorage.removeItem(key);
            } catch { /* ignore */ }
        }
        toast({ title: "Layout Reset", description: "Node positions reset to automatic topological column layout" });
    };

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

    useEffect(() => {
        if (project?.startDate) {
            setProjectStartDateInput(project.startDate.split("T")[0]);
        } else {
            setProjectStartDateInput(new Date().toISOString().split("T")[0]);
        }
    }, [project?.startDate]);

    // ─── Mutations ──────────────────────────────────────────────────

    const updateProjectMutation = useMutation({
        mutationFn: (data: Partial<ProjectSummary>) => patch(`/projects/${projectId}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            toast({ title: "Success", description: "Project start date updated" });
            scheduleMutation.mutate();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateActivityMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ProjectActivity> }) =>
            put(`/projects/${projectId}/activities/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Success", description: "Activity updated" });
            setEditingActivity(null);
            setIsEditDialogOpen(false);
            scheduleMutation.mutate();
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
            scheduleMutation.mutate();
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
            scheduleMutation.mutate();
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
            toast({ title: "Schedule Recalculated", description: "CPM ES, EF, LS, LF & Float updated successfully." });
        },
        onError: (error: Error) => {
            toast({ title: "Scheduling Error", description: error.message, variant: "destructive" });
        },
    });

    const autoLinkOrphansMutation = useMutation({
        mutationFn: () => post(`/projects/${projectId}/auto-link-orphans`),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["activity-dependencies", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Success", description: data.message ?? "Orphans auto-linked to START/FINISH" });
            scheduleMutation.mutate();
        },
        onError: (error: Error) => {
            toast({ title: "Auto-link Error", description: error.message, variant: "destructive" });
        },
    });

    const finalizeActivitiesMutation = useMutation({
        mutationFn: () => post(`/projects/${projectId}/finalize-activities`),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
            toast({ title: "Activities Finalized", description: "Baseline CPM schedule path locked successfully." });
        },
        onError: (error: Error) => {
            toast({ title: "Finalization Error", description: error.message, variant: "destructive" });
        },
    });

    // ─── Grouped Activities ─────────────────────────────────────────

    const activitiesByWp = useMemo(() => {
        const map = new Map<number, ProjectActivity[]>();
        for (const act of allActivities) {
            if (act.isPseudo) continue;
            const list = map.get(act.wpId) || [];
            list.push(act);
            map.set(act.wpId, list);
        }
        return map;
    }, [allActivities]);

    const linkedActivityIds = useMemo(() => {
        const ids = new Set<number>();
        for (const dep of dependencies) {
            ids.add(dep.predecessorId);
            ids.add(dep.successorId);
        }
        return ids;
    }, [dependencies]);

    const orphanActivities = useMemo(
        () => allActivities.filter((a) => !a.isPseudo && !linkedActivityIds.has(a.id)),
        [allActivities, linkedActivityIds]
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

    // ─── Topological Layering Network Layout Generator ─────────────

    const { networkNodes, nodePositions, diagramWidth, diagramHeight, inPortsMap, outPortsMap } = useMemo(() => {
        const startAnchor = allActivities.find((a) => a.isPseudo && a.pseudoType === "START");
        const finishAnchor = allActivities.find((a) => a.isPseudo && a.pseudoType === "FINISH");

        const normalActs = allActivities.filter((a) => !a.isPseudo);

        const predMap = new Map<number, number[]>();
        const succMap = new Map<number, number[]>();

        normalActs.forEach((a) => {
            predMap.set(a.id, []);
            succMap.set(a.id, []);
        });

        dependencies.forEach((dep) => {
            if (predMap.has(dep.successorId)) predMap.get(dep.successorId)!.push(dep.predecessorId);
            if (succMap.has(dep.predecessorId)) succMap.get(dep.predecessorId)!.push(dep.successorId);
        });

        // Compute Topological Rank for each normal activity
        const ranks = new Map<number, number>();

        const getRank = (id: number, visited = new Set<number>()): number => {
            if (ranks.has(id)) return ranks.get(id)!;
            if (visited.has(id)) return 1;
            visited.add(id);

            const preds = predMap.get(id) || [];
            let maxPredRank = 0;
            for (const pId of preds) {
                if (startAnchor && pId === startAnchor.id) continue;
                if (predMap.has(pId)) {
                    maxPredRank = Math.max(maxPredRank, getRank(pId, new Set(visited)));
                }
            }
            const r = maxPredRank + 1;
            ranks.set(id, r);
            return r;
        };

        normalActs.forEach((a) => getRank(a.id));

        // Group into columns by rank
        const maxRank = Math.max(1, ...Array.from(ranks.values()));
        const columns = new Map<number, number[]>();

        for (let r = 1; r <= maxRank; r++) {
            columns.set(r, []);
        }

        normalActs.forEach((a) => {
            const r = ranks.get(a.id) || 1;
            columns.get(r)?.push(a.id);
        });

        const positions = new Map<number, { x: number; y: number }>();

        // Place START Anchor at Column 0
        const startId = startAnchor ? startAnchor.id : -100;
        positions.set(startId, { x: 50, y: 120 });

        // Place Ranked Columns (Column 1 .. maxRank)
        let maxColumnRows = 1;
        columns.forEach((actIds, rank) => {
            maxColumnRows = Math.max(maxColumnRows, actIds.length);
            actIds.forEach((actId, rowIdx) => {
                const x = 50 + rank * COLUMN_SPACING;
                const y = 60 + rowIdx * ROW_SPACING;
                positions.set(actId, { x, y });
            });
        });

        // Place FINISH Anchor at Column maxRank + 1
        const finishId = finishAnchor ? finishAnchor.id : -200;
        const finishX = 50 + (maxRank + 1) * COLUMN_SPACING;
        positions.set(finishId, { x: finishX, y: 120 });

        // Apply saved custom drag overrides
        nodeCustomPos.forEach((customPos, id) => {
            positions.set(id, customPos);
        });

        // Compute Port Allocations for incoming and outgoing edges per node
        const inPorts = new Map<number, Map<number, number>>();
        const outPorts = new Map<number, Map<number, number>>();

        const incomingDeps = new Map<number, ActivityDependency[]>();
        const outgoingDeps = new Map<number, ActivityDependency[]>();

        dependencies.forEach((dep) => {
            const inList = incomingDeps.get(dep.successorId) || [];
            inList.push(dep);
            incomingDeps.set(dep.successorId, inList);

            const outList = outgoingDeps.get(dep.predecessorId) || [];
            outList.push(dep);
            outgoingDeps.set(dep.predecessorId, outList);
        });

        incomingDeps.forEach((depsList, nodeId) => {
            const portMap = new Map<number, number>();
            depsList.forEach((dep, idx) => {
                const yOffset = ((idx + 1) / (depsList.length + 1)) * NODE_HEIGHT;
                portMap.set(dep.id, yOffset);
            });
            inPorts.set(nodeId, portMap);
        });

        outgoingDeps.forEach((depsList, nodeId) => {
            const portMap = new Map<number, number>();
            depsList.forEach((dep, idx) => {
                const yOffset = ((idx + 1) / (depsList.length + 1)) * NODE_HEIGHT;
                portMap.set(dep.id, yOffset);
            });
            outPorts.set(nodeId, portMap);
        });

        const totalW = Math.max(1200, 50 + (maxRank + 2) * COLUMN_SPACING + 100);
        const totalH = Math.max(650, 60 + maxColumnRows * ROW_SPACING + 120);

        return {
            networkNodes: [
                ...(startAnchor ? [startAnchor] : []),
                ...normalActs,
                ...(finishAnchor ? [finishAnchor] : []),
            ],
            nodePositions: positions,
            diagramWidth: totalW,
            diagramHeight: totalH,
            inPortsMap: inPorts,
            outPortsMap: outPorts,
        };
    }, [allActivities, dependencies, nodeCustomPos]);

    // ─── Dragging Nodes in Network View ─────────────────────────────

    const handleNodeDragStart = (e: React.MouseEvent, nodeId: number) => {
        e.stopPropagation();
        e.preventDefault();
        setDraggedNodeId(nodeId);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (draggingFrom) {
            setMousePos({ x: mouseX, y: mouseY });
            return;
        }

        if (draggedNodeId != null) {
            setNodeCustomPos((prev) => {
                const next = new Map(prev);
                next.set(draggedNodeId, { x: Math.max(10, mouseX - NODE_WIDTH / 2), y: Math.max(10, mouseY - NODE_HEIGHT / 2) });
                saveNodePositions(next);
                return next;
            });
        }
    };

    const handleMouseUp = (targetActivityId: number, targetSide: "start" | "finish") => {
        if (!draggingFrom || draggingFrom.activityId === targetActivityId) {
            setDraggingFrom(null);
            setMousePos(null);
            return;
        }

        let linkType: LinkType = "FS";
        if (draggingFrom.side === "finish" && targetSide === "start") linkType = "FS";
        else if (draggingFrom.side === "start" && targetSide === "start") linkType = "SS";
        else if (draggingFrom.side === "finish" && targetSide === "finish") linkType = "FF";
        else linkType = "SF";

        setLinkDialog({
            predecessorId: draggingFrom.activityId,
            successorId: targetActivityId,
            type: linkType,
        });

        setDraggingFrom(null);
        setMousePos(null);
    };

    const handleGlobalMouseUp = () => {
        if (draggingFrom) {
            setDraggingFrom(null);
            setMousePos(null);
        }
        if (draggedNodeId != null) {
            setDraggedNodeId(null);
        }
    };

    // ─── Export Sequence Network Diagram as Multi-Page PDF ─────────────

    const handleExportPDF = () => {
        if (!svgRef.current) return;
        const svgElement = svgRef.current;
        const svgWidth = diagramWidth;
        const svgHeight = diagramHeight;

        // Standard A4 landscape dimensions (approx 1100px width per page section)
        const pageWidth = 1100;
        const pagesX = Math.ceil(svgWidth / pageWidth);
        const pagesY = Math.ceil(svgHeight / 700);
        const totalPages = pagesX * pagesY;

        let pagesHtml = "";
        let pageCount = 1;

        for (let py = 0; py < pagesY; py++) {
            for (let px = 0; px < pagesX; px++) {
                const viewBoxX = px * pageWidth;
                const viewBoxY = py * 700;

                pagesHtml += `
                    <div class="pdf-page" style="page-break-after: always; padding: 20px; box-sizing: border-box; width: 100%; height: 95vh; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px;">
                            <div>
                                <h1 style="font-size: 16px; margin: 0; font-weight: bold; color: #0f172a;">${project?.name || "Project"} — Sequence Network Diagram</h1>
                                <p style="font-size: 11px; margin: 2px 0 0 0; color: #475569;">
                                    Start Date: ${projectStartDateInput} | Total Duration: ${scheduleResult?.totalDuration ?? '—'} days | Export Date: ${new Date().toLocaleDateString()}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <span style="font-size: 11px; font-weight: bold; color: #1d4ed8; background: #eff6ff; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">
                                    Page ${pageCount} of ${totalPages}
                                </span>
                            </div>
                        </div>

                        <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fafafa;">
                            <svg viewBox="${viewBoxX} ${viewBoxY} ${pageWidth} 700" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                ${svgElement.innerHTML}
                            </svg>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cbd5e1; margin-top: 8px; padding-top: 6px; font-size: 10px; color: #64748b;">
                            <span>Legend: <strong style="color:#3b82f6">FS (Finish-Start)</strong> | <strong style="color:#10b981">SS (Start-Start)</strong> | <strong style="color:#f59e0b">FF (Finish-Finish)</strong> | <strong style="color:#ef4444">Critical Path</strong></span>
                            <span>SmartProject CPM Engine</span>
                        </div>
                    </div>
                `;
                pageCount++;
            }
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast({ title: "Pop-up Blocked", description: "Please allow pop-ups to export PDF", variant: "destructive" });
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${project?.name || "Project"}_Sequence_Network.pdf</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #fff; }
                        .pdf-page { page-break-after: always; height: 95vh; }
                        .pdf-page:last-child { page-break-after: avoid; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    ${pagesHtml}
                    <script>
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // ─── Render Planning Mode ───────────────────────────────────────

    const renderPlanningMode = () => (
        <div className="flex gap-6 h-[calc(100vh-12rem)] p-4">
            {/* Left: Work Packages Column */}
            <Card className="w-72 flex-shrink-0 flex flex-col shadow-sm">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-bold text-zinc-800">Work Packages</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 py-3">
                        <div className="space-y-2">
                            {workPackages.map((wp) => {
                                const wpActs = activitiesByWp.get(wp.id) || [];
                                return (
                                    <div
                                        key={wp.id}
                                        className="rounded-lg border p-3 bg-white shadow-xs hover:border-indigo-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: wpColors.get(wp.id) }}
                                            />
                                            <span className="font-semibold text-sm truncate text-zinc-800">
                                                {wp.code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{wp.name}</p>
                                        <Badge variant="secondary" className="mt-1 text-xs font-mono">
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

            {/* Right: Activities Grouped by Work Package */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-zinc-800">Activity Plan & Schedule</h2>
                            {project?.activitiesFinalized ? (
                                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1">
                                    <Check className="h-3.5 w-3.5 mr-1" /> Baseline Finalized
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50 px-3 py-1">
                                    Draft Schedule (Editable)
                                </Badge>
                            )}
                        </div>

                        {/* Top Action Controls & Start Date Simulation */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-xs">
                                <Calendar className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-zinc-600 whitespace-nowrap">Project Start Date:</span>
                                <Input
                                    type="date"
                                    value={projectStartDateInput}
                                    onChange={(e) => {
                                        setProjectStartDateInput(e.target.value);
                                        if (e.target.value) {
                                            updateProjectMutation.mutate({ startDate: e.target.value });
                                        }
                                    }}
                                    disabled={project?.activitiesFinalized}
                                    className="h-7 w-36 text-xs font-mono border-zinc-200 focus:border-indigo-500"
                                />
                            </div>

                            {orphanActivities.length > 0 && (
                                <Button
                                    onClick={() => autoLinkOrphansMutation.mutate()}
                                    disabled={autoLinkOrphansMutation.isPending}
                                    variant="outline"
                                    className="gap-1.5 border-amber-500 text-amber-700 hover:bg-amber-50"
                                >
                                    <Network className="h-4 w-4" />
                                    Auto-Link Orphans ({orphanActivities.length})
                                </Button>
                            )}

                            <Button
                                onClick={() => scheduleMutation.mutate()}
                                disabled={allActivities.length === 0 || scheduleMutation.isPending}
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                            >
                                <Calculator className={`h-4 w-4 ${scheduleMutation.isPending ? "animate-spin" : ""}`} />
                                Re-Calculate CPM Schedule
                            </Button>

                            <Button
                                onClick={() => setMode("sequence")}
                                disabled={allActivities.length < 2}
                                variant="outline"
                                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                                <Network className="h-4 w-4" />
                                Sequence Network View
                            </Button>

                            {!project?.activitiesFinalized && (
                                <Button
                                    onClick={() => {
                                        if (orphanActivities.length > 0) {
                                            toast({
                                                title: "Cannot Finalize Activities",
                                                description: `There are ${orphanActivities.length} orphan activities. Click 'Auto-Link Orphans' first.`,
                                                variant: "destructive",
                                            });
                                            return;
                                        }
                                        if (confirm("Finalize Project Activities and lock baseline CPM schedule path?")) {
                                            finalizeActivitiesMutation.mutate();
                                        }
                                    }}
                                    disabled={allActivities.length === 0 || orphanActivities.length > 0 || finalizeActivitiesMutation.isPending}
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                >
                                    <Check className="h-4 w-4" />
                                    Finalize Activities
                                </Button>
                            )}
                        </div>
                    </div>

                    {orphanActivities.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                <span>
                                    <strong>{orphanActivities.length} Unlinked Activities:</strong> All activities must connect between <strong>START</strong> and <strong>FINISH</strong> anchors before finalization.
                                </span>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => autoLinkOrphansMutation.mutate()}
                                disabled={autoLinkOrphansMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                Auto-Link to START/FINISH
                            </Button>
                        </div>
                    )}
                </div>

                {/* Table view of Work Packages */}
                <ScrollArea className="flex-1">
                    <div className="space-y-6 pr-4">
                        {workPackages.map((wp) => {
                            const wpActs = activitiesByWp.get(wp.id) || [];
                            if (wpActs.length === 0) return null;
                            return (
                                <Card key={wp.id} className="shadow-xs border-zinc-200 overflow-hidden">
                                    <CardHeader className="py-2.5 px-4 bg-zinc-50/80 border-b">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: wpColors.get(wp.id) }}
                                            />
                                            <CardTitle className="text-sm font-bold text-zinc-800">
                                                {wp.code} — {wp.name}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead>
                                                    <tr className="border-b bg-zinc-100/50 text-zinc-600 font-semibold text-xs">
                                                        <th className="py-2.5 px-4">Activity Name</th>
                                                        <th className="py-2.5 px-3 text-center w-24">Duration</th>
                                                        <th className="py-2.5 px-3 text-center w-28">ES</th>
                                                        <th className="py-2.5 px-3 text-center w-28">EF</th>
                                                        <th className="py-2.5 px-3 text-center w-28">LS</th>
                                                        <th className="py-2.5 px-3 text-center w-28">LF</th>
                                                        <th className="py-2.5 px-3 text-center w-24">TF (Days)</th>
                                                        <th className="py-2.5 px-3 text-center w-16">Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {wpActs.map((act) => {
                                                        const isCritical = scheduleResult?.criticalPath.includes(act.id);
                                                        const sched = scheduleResult?.activities.find((s) => s.id === act.id);

                                                        return (
                                                            <tr
                                                                key={act.id}
                                                                className={`border-b last:border-0 hover:bg-zinc-50/70 transition-colors ${
                                                                    isCritical ? "border-l-4 border-l-red-500 bg-red-50/20" : ""
                                                                }`}
                                                            >
                                                                <td className="py-2.5 px-4">
                                                                    <span className="font-semibold text-zinc-900">{act.name}</span>
                                                                    {act.description && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                                                                            {act.description}
                                                                        </p>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <Badge variant="outline" className="font-mono bg-white font-bold text-zinc-800">
                                                                        {act.duration != null ? `${act.duration}d` : "—"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs font-mono">
                                                                    {sched?.es_date ? format(new Date(sched.es_date), "dd MMM yyyy") : act.plannedFromDate ? format(new Date(act.plannedFromDate), "dd MMM yyyy") : "—"}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs font-mono">
                                                                    {sched?.ef_date ? format(new Date(sched.ef_date), "dd MMM yyyy") : act.plannedToDate ? format(new Date(act.plannedToDate), "dd MMM yyyy") : "—"}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs font-mono">
                                                                    {sched?.ls_date ? format(new Date(sched.ls_date), "dd MMM yyyy") : "—"}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs font-mono">
                                                                    {sched?.lf_date ? format(new Date(sched.lf_date), "dd MMM yyyy") : "—"}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center text-xs font-mono">
                                                                    <Badge
                                                                        variant={isCritical ? "destructive" : "secondary"}
                                                                        className="font-mono text-xs"
                                                                    >
                                                                        {sched?.float ?? act.totalFloatDays ?? 0}d
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-zinc-600 hover:text-zinc-900"
                                                                        onClick={() => {
                                                                            setEditingActivity(act);
                                                                            setIsEditDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {allActivities.length === 0 && (
                            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg bg-zinc-50/50">
                                <div className="text-center text-muted-foreground">
                                    <p className="font-medium text-zinc-700">No activities assigned yet</p>
                                    <p className="text-sm mt-1">Assign activities to work packages to generate project schedule</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );

    // ─── Render Aesthetic Sequence Network View ──────────────────────

    const renderSequenceMode = () => {
        return (
            <div className="flex flex-col h-[calc(100vh-12rem)] p-4 gap-3 bg-zinc-50">
                {/* Sequence Header Bar */}
                <div className="flex items-center justify-between flex-shrink-0 bg-white p-3 rounded-xl border shadow-xs flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setMode("planning")} className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Planning Table
                        </Button>
                        <h2 className="text-base font-bold text-zinc-800">Sequence Network Diagram</h2>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1 rounded-md border text-xs">
                            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                            <span className="font-semibold text-zinc-600">Start Date:</span>
                            <Input
                                type="date"
                                value={projectStartDateInput}
                                onChange={(e) => {
                                    setProjectStartDateInput(e.target.value);
                                    if (e.target.value) updateProjectMutation.mutate({ startDate: e.target.value });
                                }}
                                disabled={project?.activitiesFinalized}
                                className="h-6 w-32 text-xs font-mono p-1 border-zinc-200"
                            />
                        </div>

                        <Button
                            size="sm"
                            onClick={() => scheduleMutation.mutate()}
                            disabled={scheduleMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
                        >
                            <Calculator className={`h-3.5 w-3.5 ${scheduleMutation.isPending ? "animate-spin" : ""}`} />
                            Re-Calculate CPM
                        </Button>

                        {/* Reset Custom Node Positions Layout */}
                        {nodeCustomPos.size > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleResetLayout}
                                className="gap-1.5 border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset Auto Layout
                            </Button>
                        )}

                        {/* Multi-Page PDF Export Button */}
                        <Button
                            size="sm"
                            onClick={handleExportPDF}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export Network PDF
                        </Button>

                        {orphanActivities.length > 0 ? (
                            <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {orphanActivities.length} Unlinked
                            </Badge>
                        ) : (
                            <Badge variant="default" className="gap-1.5 py-1 px-3 bg-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                                All Linked
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Legend Bar */}
                <div className="flex items-center justify-between text-xs text-zinc-600 flex-shrink-0 px-2">
                    <div className="flex items-center gap-4">
                        <span className="font-medium text-zinc-700">● Drag nodes to re-arrange (positions saved automatically across refresh) | Drag handles to connect links</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono font-bold">
                        {(["FS", "SS", "FF", "SF"] as const).map((t) => (
                            <span key={t} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LINK_COLORS[t] }} />
                                {t}: {LINK_TYPE_LABELS[t]}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Main Diagram Area */}
                <div className="flex-1 min-w-0 border rounded-xl bg-white shadow-inner overflow-auto relative">
                    <svg
                        ref={svgRef}
                        width={diagramWidth}
                        height={diagramHeight}
                        className="select-none block bg-slate-50/50"
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleGlobalMouseUp}
                        onMouseLeave={handleGlobalMouseUp}
                    >
                        <defs>
                            {/* Standard arrowheads for each relationship type */}
                            {(["FS", "SS", "FF", "SF"] as const).map((t) => (
                                <marker
                                    key={t}
                                    id={`arrowhead-${t}`}
                                    viewBox="0 0 10 7"
                                    refX="9"
                                    refY="3.5"
                                    markerWidth="7"
                                    markerHeight="5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill={LINK_COLORS[t]} />
                                </marker>
                            ))}
                            <marker
                                id="arrowhead-critical"
                                viewBox="0 0 10 7"
                                refX="9"
                                refY="3.5"
                                markerWidth="8"
                                markerHeight="6"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                            </marker>
                        </defs>

                        {/* Render Existing Dependency Links */}
                        {dependencies.map((dep) => {
                            const predPos = nodePositions.get(dep.predecessorId);
                            const succPos = nodePositions.get(dep.successorId);
                            if (!predPos || !succPos) return null;

                            const outPortOffset = outPortsMap.get(dep.predecessorId)?.get(dep.id) ?? (NODE_HEIGHT / 2);
                            const inPortOffset = inPortsMap.get(dep.successorId)?.get(dep.id) ?? (NODE_HEIGHT / 2);

                            const startX = dep.type === "FS" || dep.type === "FF" ? predPos.x + NODE_WIDTH : predPos.x;
                            const startY = predPos.y + outPortOffset;

                            const endX = dep.type === "FS" || dep.type === "SS" ? succPos.x : succPos.x + NODE_WIDTH;
                            const endY = succPos.y + inPortOffset;

                            const isCriticalLink =
                                scheduleResult?.criticalPath.includes(dep.predecessorId) &&
                                scheduleResult?.criticalPath.includes(dep.successorId);

                            const controlOffset = Math.min(100, Math.abs(endX - startX) * 0.5);
                            const cp1X = dep.type === "FS" || dep.type === "FF" ? startX + controlOffset : startX - controlOffset;
                            const cp2X = dep.type === "FS" || dep.type === "SS" ? endX - controlOffset : endX + controlOffset;

                            const path = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;
                            const midX = (startX + endX) / 2;
                            const midY = (startY + endY) / 2;

                            const lagText = dep.lag > 0 ? `+${dep.lag}d` : dep.lag < 0 ? `${dep.lag}d` : "";

                            return (
                                <g
                                    key={dep.id}
                                    className="group cursor-pointer"
                                    onClick={() => {
                                        if (confirm(`Delete ${dep.type} link (lag/lead: ${dep.lag} days)?`)) {
                                            deleteDependencyMutation.mutate(dep.id);
                                        }
                                    }}
                                >
                                    <title>{`${dep.type} (${LINK_TYPE_LABELS[dep.type]}) • Lag/Lead: ${dep.lag} days. Click to remove.`}</title>
                                    <path d={path} fill="none" stroke="transparent" strokeWidth={12} />

                                    <path
                                        d={path}
                                        fill="none"
                                        stroke={isCriticalLink ? "#ef4444" : LINK_COLORS[dep.type]}
                                        strokeWidth={isCriticalLink ? 3 : 2}
                                        strokeDasharray={dep.type === "SS" ? "6,3" : dep.type === "FF" ? "3,3" : undefined}
                                        markerEnd={isCriticalLink ? "url(#arrowhead-critical)" : `url(#arrowhead-${dep.type})`}
                                        className="transition-all group-hover:stroke-width-3"
                                    />

                                    <g transform={`translate(${midX}, ${midY})`}>
                                        <rect
                                            x={-24}
                                            y={-10}
                                            width={48}
                                            height={20}
                                            rx={10}
                                            fill="#ffffff"
                                            stroke={LINK_COLORS[dep.type]}
                                            strokeWidth={1}
                                            className="shadow-xs"
                                        />
                                        <text
                                            x={0}
                                            y={3}
                                            textAnchor="middle"
                                            fontSize={10}
                                            fontWeight="bold"
                                            fill={LINK_COLORS[dep.type]}
                                        >
                                            {dep.type} {lagText}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}

                        {/* Interactive Dragging Line */}
                        {draggingFrom && mousePos && (
                            <line
                                x1={draggingFrom.x}
                                y1={draggingFrom.y}
                                x2={mousePos.x}
                                y2={mousePos.y}
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="5,5"
                                className="pointer-events-none"
                            />
                        )}

                        {/* Render Network Nodes */}
                        {networkNodes.map((act) => {
                            const pos = nodePositions.get(act.id);
                            if (!pos) return null;

                            const isPseudoNode = act.isPseudo;
                            const isStart = act.pseudoType === "START";
                            const isFinish = act.pseudoType === "FINISH";
                            const isCritical = scheduleResult?.criticalPath.includes(act.id);
                            const isOrphan = !isPseudoNode && !linkedActivityIds.has(act.id);
                            const wpColor = isPseudoNode ? "#64748b" : (wpColors.get(act.wpId) || "#3b82f6");
                            const sched = scheduleResult?.activities.find((s) => s.id === act.id);

                            if (isPseudoNode) {
                                return (
                                    <g key={act.id} transform={`translate(${pos.x}, ${pos.y})`}>
                                        <rect
                                            width={140}
                                            height={NODE_HEIGHT}
                                            rx={12}
                                            fill={isStart ? "#ecfdf5" : "#fef2f2"}
                                            stroke={isStart ? "#10b981" : "#ef4444"}
                                            strokeWidth={2}
                                            className="shadow-xs cursor-grab active:cursor-grabbing"
                                            onMouseDown={(e) => handleNodeDragStart(e, act.id)}
                                        />
                                        <text x={70} y={26} textAnchor="middle" fontSize={13} fontWeight="bold" fill={isStart ? "#047857" : "#b91c1c"}>
                                            {isStart ? "► START" : "🏁 FINISH"}
                                        </text>
                                        <text x={70} y={42} textAnchor="middle" fontSize={10} fill="#64748b" className="font-mono">
                                            Anchor Milestone
                                        </text>

                                        {/* Right handle for START */}
                                        {isStart && (
                                            <circle
                                                cx={140}
                                                cy={NODE_HEIGHT / 2}
                                                r={HANDLE_RADIUS}
                                                fill="#10b981"
                                                stroke="#fff"
                                                strokeWidth={2}
                                                className="cursor-crosshair"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setDraggingFrom({ activityId: act.id, side: "finish", x: pos.x + 140, y: pos.y + NODE_HEIGHT / 2 });
                                                    setMousePos({ x: pos.x + 140, y: pos.y + NODE_HEIGHT / 2 });
                                                }}
                                            />
                                        )}

                                        {/* Left handle for FINISH */}
                                        {isFinish && (
                                            <circle
                                                cx={0}
                                                cy={NODE_HEIGHT / 2}
                                                r={HANDLE_RADIUS}
                                                fill="#ef4444"
                                                stroke="#fff"
                                                strokeWidth={2}
                                                className="cursor-crosshair"
                                                onMouseUp={(e) => {
                                                    e.stopPropagation();
                                                    handleMouseUp(act.id, "start");
                                                }}
                                            />
                                        )}
                                    </g>
                                );
                            }

                            return (
                                <g
                                    key={act.id}
                                    transform={`translate(${pos.x}, ${pos.y})`}
                                    onMouseDown={(e) => handleNodeDragStart(e, act.id)}
                                    className="cursor-grab active:cursor-grabbing"
                                >
                                    {/* Card Container */}
                                    <rect
                                        width={NODE_WIDTH}
                                        height={NODE_HEIGHT}
                                        rx={8}
                                        fill={isOrphan ? "#fffbeb" : isCritical ? "#fef2f2" : "#ffffff"}
                                        stroke={isOrphan ? "#f59e0b" : isCritical ? "#ef4444" : "#e4e4e7"}
                                        strokeWidth={isCritical || isOrphan ? 2 : 1}
                                        className="shadow-sm transition-shadow hover:shadow-md"
                                    />

                                    {/* Left Work Package Accent Bar */}
                                    <rect
                                        width={5}
                                        height={NODE_HEIGHT}
                                        rx={2}
                                        fill={wpColor}
                                    />

                                    {/* Activity Name */}
                                    <text
                                        x={14}
                                        y={22}
                                        fontSize={12}
                                        fontWeight="bold"
                                        fill="#18181b"
                                        className="pointer-events-none"
                                    >
                                        {act.name.length > 22 ? act.name.slice(0, 20) + "…" : act.name}
                                    </text>

                                    {/* Schedule Details Footer */}
                                    <text x={14} y={42} fontSize={10} fill="#64748b" className="pointer-events-none font-mono">
                                        Dur: {act.duration != null ? `${act.duration}d` : "—"} • TF: {sched?.float ?? act.totalFloatDays ?? 0}d
                                    </text>

                                    {/* Left Handle (Start Connection) */}
                                    <circle
                                        cx={0}
                                        cy={NODE_HEIGHT / 2}
                                        r={HANDLE_RADIUS}
                                        fill={draggingFrom?.activityId === act.id && draggingFrom?.side === "start" ? "#3b82f6" : "#94a3b8"}
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                        className="cursor-crosshair hover:r-7 transition-all"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDraggingFrom({ activityId: act.id, side: "start", x: pos.x, y: pos.y + NODE_HEIGHT / 2 });
                                            setMousePos({ x: pos.x, y: pos.y + NODE_HEIGHT / 2 });
                                        }}
                                        onMouseUp={(e) => {
                                            e.stopPropagation();
                                            handleMouseUp(act.id, "start");
                                        }}
                                    />

                                    {/* Right Handle (Finish Connection) */}
                                    <circle
                                        cx={NODE_WIDTH}
                                        cy={NODE_HEIGHT / 2}
                                        r={HANDLE_RADIUS}
                                        fill={draggingFrom?.activityId === act.id && draggingFrom?.side === "finish" ? "#3b82f6" : "#94a3b8"}
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                        className="cursor-crosshair hover:r-7 transition-all"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDraggingFrom({ activityId: act.id, side: "finish", x: pos.x + NODE_WIDTH, y: pos.y + NODE_HEIGHT / 2 });
                                            setMousePos({ x: pos.x + NODE_WIDTH, y: pos.y + NODE_HEIGHT / 2 });
                                        }}
                                        onMouseUp={(e) => {
                                            e.stopPropagation();
                                            handleMouseUp(act.id, "finish");
                                        }}
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        );
    };

    // ─── Render Page ────────────────────────────────────────────────

    return (
        <div className="h-full">
            {mode === "planning" ? renderPlanningMode() : renderSequenceMode()}

            {/* Edit Activity Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Activity Details & Duration</DialogTitle>
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
                                <Label className="text-sm font-semibold text-zinc-900">{editingActivity.name}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {editingActivity.unitOfMeasure} · Rate: {editingActivity.unitRate}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration" className="font-semibold">Duration (Days)</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    type="number"
                                    min="1"
                                    defaultValue={editingActivity.duration || ""}
                                    placeholder="Enter duration in days"
                                    className="font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="plannedFromDate" className="text-xs font-semibold">Planned Start Date</Label>
                                    <Input
                                        id="plannedFromDate"
                                        name="plannedFromDate"
                                        type="date"
                                        defaultValue={editingActivity.plannedFromDate || ""}
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plannedToDate" className="text-xs font-semibold">Planned End Date</Label>
                                    <Input
                                        id="plannedToDate"
                                        name="plannedToDate"
                                        type="date"
                                        defaultValue={editingActivity.plannedToDate || ""}
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateActivityMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    Save & Recalculate
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
                            <div className="space-y-1 text-sm bg-zinc-50 p-2.5 rounded-md border">
                                <p>
                                    <span className="font-semibold text-zinc-600">Predecessor:</span>{" "}
                                    <strong className="text-zinc-900">{allActivities.find((a) => a.id === linkDialog.predecessorId)?.name}</strong>
                                </p>
                                <p>
                                    <span className="font-semibold text-zinc-600">Successor:</span>{" "}
                                    <strong className="text-zinc-900">{allActivities.find((a) => a.id === linkDialog.successorId)?.name}</strong>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-xs">Link Type</Label>
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
                                                <span className="font-mono font-bold">{t}</span> — {LINK_TYPE_LABELS[t]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-xs">Lag / Lead Offset (Days)</Label>
                                <Input
                                    type="number"
                                    value={lagInput}
                                    onChange={(e) => setLagInput(e.target.value)}
                                    placeholder="0 = no lag. Positive = lag, negative = lead"
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Positive value = Lag (delay), Negative value = Lead (overlap)
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
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
