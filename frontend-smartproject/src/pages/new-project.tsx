import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import MasterLayout from "@/layouts/master-layout";
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Loader2,
    Edit2,
    Trash2,
    Info,
    Package,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Project, WbsItem, Dependency, WorkPackage } from "@shared/schema";
import { AddWbsModal } from "@/components/project/add-wbs-modal";
import { EditWbsModal } from "@/components/project/edit-wbs-modal";
import { WbsDetailsSheet } from "@/components/project/wbs-details-sheet";
import { AddWorkPackageModal } from "@/components/project/add-work-package-modal";
import { EditWorkPackageModal } from "@/components/project/edit-work-package-modal";
import { EditAllocationModal } from "@/components/project/edit-allocation-modal";
import { WbsItemWithWorkPackages } from "@/components/project/wbs-item-with-work-packages";
import { ImportWbsModal } from "@/components/project/import-wbs-modal";
import { EditProjectModal } from "@/components/project/edit-project-modal";
import { MAX_WBS_LEVEL } from "@shared/wbs-validation";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ProjectDashboardHeader } from "@/components/project-dashboard/project-dashboard-header";
import { WbsWorkPackagesCard } from "@/components/project-dashboard/wbs-work-packages-card";
import { KpiStatsRow } from "@/components/project-dashboard/kpi-stats-row";
import { RecentActivity } from "@/components/project-dashboard/recent-activity";
import { QuickActions } from "@/components/project-dashboard/quick-actions";
import type { QuickActionItem } from "@/components/project-dashboard/constants";

// Types for the hierarchical WBS tree used in the UI
interface WbsTreeNode extends WbsItem {
    expanded: boolean;
    children: WbsTreeNode[];
    progress?: number;
    budget?: { allocated: number; spent: number };
}

export default function NewProject() {
    const { projectId } = useParams<{ projectId: string }>();
    const [, setLocation] = useLocation();
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const initializedRef = useRef<boolean>(false);
    const { toast } = useToast();

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportWbsOpen, setIsImportWbsOpen] = useState(false);
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [selectedWbsItem, setSelectedWbsItem] = useState<{ id: number; name: string; level: number } | null>(null);
    const [editWbsId, setEditWbsId] = useState<number | null>(null);
    const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
    const [detailsWbsId, setDetailsWbsId] = useState<number | null>(null);
    const [isAddWorkPackageModalOpen, setIsAddWorkPackageModalOpen] = useState(false);
    const [isEditWorkPackageModalOpen, setIsEditWorkPackageModalOpen] = useState(false);
    const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<number | null>(null);
    const [selectedWbsForWorkPackage, setSelectedWbsForWorkPackage] = useState<{ id: number; name: string } | null>(null);
    const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
    const [selectedWbsId, setSelectedWbsId] = useState<number | null>(null);
    const [isEditAllocationOpen, setIsEditAllocationOpen] = useState(false);
    const [flashingWbsIds, setFlashingWbsIds] = useState<Set<number>>(new Set());

    // Fetch Project Details
    const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
        queryKey: [`/api/projects/${projectId}`],
        enabled: !!projectId,
    });

    // Fetch WBS Items
    const { data: flatWbsItems = [], isLoading: isWbsLoading } = useQuery<WbsItem[]>({
        queryKey: [`/api/projects/${projectId}/wbs`],
        enabled: !!projectId,
    });

    // Fetch Dependencies
    const { data: apiDependencies = [], isLoading: isDepsLoading } = useQuery<Dependency[]>({
        queryKey: [`/api/projects/${projectId}/dependencies`],
        enabled: !!projectId,
    });

    // Fetch all work packages for the project (for WBS completion check)
    const { data: projectWorkPackages = [] } = useQuery<WorkPackage[]>({
        queryKey: [`/api/projects/${projectId}/work-packages`],
        enabled: !!projectId,
    });

    const { data: projectResources = [] } = useQuery<unknown[]>({
        queryKey: [`/api/projects/${projectId}/resources`],
        enabled: !!projectId,
    });

    // WBS is complete when every leaf WBS has at least one work package (table) OR is a WorkPackage-type
    // wbs_item (CSV import creates those as leaves; they don't have work_packages table rows).
    const isWbsComplete = useMemo(() => {
        if (!flatWbsItems.length) return false;
        const parentIds = new Set(flatWbsItems.map((i) => i.parentId).filter((id): id is number => id != null));
        const leafWbsItems = flatWbsItems.filter((w) => !parentIds.has(w.id));
        const wpCountByWbsId = projectWorkPackages.reduce<Record<number, number>>((acc, wp) => {
            acc[wp.wbsItemId] = (acc[wp.wbsItemId] ?? 0) + 1;
            return acc;
        }, {});
        return leafWbsItems.every(
            (leaf) =>
                leaf.type === "WorkPackage" || (wpCountByWbsId[leaf.id] ?? 0) >= 1
        );
    }, [flatWbsItems, projectWorkPackages]);

    // Project root + direct phase WBS for budget allocation overview
    const topLevelWbsItems = useMemo(
        () => flatWbsItems.filter((w) => !w.parentId),
        [flatWbsItems]
    );
    const allocatedToWbs = useMemo(
        () => topLevelWbsItems.reduce((sum, w) => sum + Number(w.budgetedCost || 0), 0),
        [topLevelWbsItems]
    );
    const projectBudgetNum = Number(project?.budget) || 0;
    // Version 0 is complete only when user has successfully clicked Allocate (stored on project)
    const allocationComplete = project != null && project.allocationVersion != null;
    const isWbsFinalized = Boolean((project as Project & { wbsFinalized?: boolean })?.wbsFinalized);

    useEffect(() => {
        if (flashingWbsIds.size === 0) return;
        const t = setTimeout(() => setFlashingWbsIds(new Set()), 6000);
        return () => clearTimeout(t);
    }, [flashingWbsIds]);
    const projectBuffer = projectBudgetNum - allocatedToWbs;
    const usedBudgetForDisplay = allocationComplete ? allocatedToWbs : flatWbsItems.reduce((acc, i) => acc + Number(i.actualCost || 0), 0);
    const remainingForDisplay = allocationComplete ? projectBuffer : (projectBudgetNum - flatWbsItems.reduce((acc, i) => acc + Number(i.actualCost || 0), 0));
    const usagePercent = projectBudgetNum ? Math.round((usedBudgetForDisplay / projectBudgetNum) * 100) : 0;

    const wbsWpCount = useMemo(() => {
        const map = new Map<number, number>();
        for (const wp of projectWorkPackages) {
            map.set(wp.wbsItemId, (map.get(wp.wbsItemId) ?? 0) + 1);
        }
        return map;
    }, [projectWorkPackages]);

    const childWbsCountByParent = useMemo(() => {
        const map = new Map<number, number>();
        for (const w of flatWbsItems) {
            if (w.parentId != null && (w.type === "Summary" || w.type === "WBS")) {
                map.set(w.parentId, (map.get(w.parentId) ?? 0) + 1);
            }
        }
        return map;
    }, [flatWbsItems]);

    const WbsItemActions = ({ item, level }: { item: WbsTreeNode; level: number }) => {
        const wpCount = wbsWpCount.get(item.id) ?? 0;
        const childWbsCount = childWbsCountByParent.get(item.id) ?? 0;
        const hasWorkPackages = wpCount > 0;
        const hasChildWbs = childWbsCount > 0;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-all text-slate-400 hover:text-blue-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="6" cy="4" r="1.2" fill="currentColor" />
                            <circle cx="6" cy="8" r="1.2" fill="currentColor" />
                        </svg>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-slate-200 shadow-xl min-w-40">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2">Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setDetailsWbsId(item.id);
                            setIsDetailsSheetOpen(true);
                        }}
                        className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer px-3 py-2"
                    >
                        <Info size={14} className="mr-2" />
                        View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWbsItem({ id: item.id, name: item.name, level: item.level });
                            setIsAddModalOpen(true);
                        }}
                        disabled={isWbsFinalized || item.level >= MAX_WBS_LEVEL || hasWorkPackages}
                        className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={14} className="mr-2" />
                        {hasWorkPackages ? "Add Child WBS (has WPs)" : "Add Child WBS"}
                    </DropdownMenuItem>
                    {!item.isTopLevel && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWbsForWorkPackage({ id: item.id, name: item.name });
                                setIsAddWorkPackageModalOpen(true);
                            }}
                            disabled={hasChildWbs}
                            className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Package size={14} className="mr-2" />
                            {hasChildWbs ? "Add Work Package (has child WBS)" : "Add Work Package"}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditWbsId(item.id);
                            setIsEditModalOpen(true);
                        }}
                        className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer px-3 py-2"
                    >
                        <Edit2 size={14} className="mr-2" />
                        Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWbs(item.id);
                        }}
                        className="text-xs font-semibold text-red-600 focus:bg-red-50 cursor-pointer px-3 py-2"
                    >
                        <Trash2 size={14} className="mr-2" />
                        Delete Item
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    // Reset initialization when project changes
    useEffect(() => {
        setExpandedIds(new Set());
        initializedRef.current = false;
    }, [projectId]);

    // Initialize expanded state with top-level items
    useEffect(() => {
        if (flatWbsItems.length > 0 && !initializedRef.current) {
            const idsToExpand = flatWbsItems
                .filter((item) => item.level <= 2)
                .map((item) => item.id);
            setExpandedIds(new Set(idsToExpand));
            initializedRef.current = true;
        }
    }, [flatWbsItems]);

    // Transform flat WBS into tree structure
    const wbsTree = useMemo(() => {
        const itemMap = new Map<number, WbsTreeNode>();
        const roots: WbsTreeNode[] = [];

        // First pass: Create nodes and map by ID
        flatWbsItems.forEach(item => {
            itemMap.set(item.id, {
                ...item,
                // Ensure top-level items are not forced expanded, effectively allowing toggle
                expanded: expandedIds.has(item.id),
                children: [],
                progress: Number(item.percentComplete || 0),
                budget: {
                    allocated: Number(item.budgetedCost || 0),
                    spent: Number(item.actualCost || 0)
                }
            });
        });

        // Second pass: Build hierarchy
        flatWbsItems.forEach(item => {
            const node = itemMap.get(item.id)!;
            if (item.parentId && itemMap.has(item.parentId)) {
                itemMap.get(item.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }, [flatWbsItems, expandedIds]);

    const leafWbsCount = useMemo(() => {
        const parentIds = new Set(flatWbsItems.map((i) => i.parentId).filter((id): id is number => id != null));
        return flatWbsItems.filter((w) => !parentIds.has(w.id)).length;
    }, [flatWbsItems]);

    const timelineMetrics = useMemo(() => {
        const start = project?.startDate ? new Date(project.startDate) : null;
        const end = project?.endDate ? new Date(project.endDate) : null;
        const now = new Date();
        const msDay = 1000 * 60 * 60 * 24;
        const totalDays = start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msDay)) : 180;
        const elapsed = start ? Math.max(0, Math.ceil((now.getTime() - start.getTime()) / msDay)) : 0;
        const avgProgress =
            flatWbsItems.length > 0
                ? flatWbsItems.reduce((acc, item) => acc + Number(item.percentComplete || 0), 0) / flatWbsItems.length
                : 0;
        const expectedProgress = totalDays ? (elapsed / totalDays) * 100 : 0;
        const scheduleStatus: "on-track" | "behind" | "ahead" =
            avgProgress + 5 < expectedProgress ? "behind" : avgProgress > expectedProgress + 5 ? "ahead" : "on-track";
        return { totalDays, elapsed: Math.min(elapsed, totalDays), scheduleStatus };
    }, [project?.startDate, project?.endDate, flatWbsItems]);

    const handleQuickAction = (action: QuickActionItem["action"]) => {
        if (!project) return;
        switch (action) {
            case "import-wbs":
                setIsImportWbsOpen(true);
                break;
            case "team":
                setLocation(`/projects/${project.id}/resources`);
                break;
            case "budget":
                setIsEditAllocationOpen(true);
                break;
            case "schedule":
                setLocation(`/projects/${project.id}/schedule`);
                break;
            case "add-wp": {
                const wbsId = selectedWbsId ?? flatWbsItems.find((w) => w.type === "WBS" && !w.isTopLevel)?.id;
                const wbs = flatWbsItems.find((w) => w.id === wbsId);
                if (wbs) {
                    setSelectedWbsForWorkPackage({ id: wbs.id, name: wbs.name });
                    setIsAddWorkPackageModalOpen(true);
                } else {
                    toast({
                        title: "Select a WBS item",
                        description: "Choose a WBS node in the tree before adding a work package.",
                    });
                }
                break;
            }
            case "settings":
                setIsEditProjectOpen(true);
                break;
        }
    };

    const toggleWbs = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const deleteWbsMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/wbs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
            toast({
                title: "Deleted",
                description: "WBS item and its children removed",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete item",
                variant: "destructive",
            });
        }
    });

    const handleDeleteWbs = (id: number) => {
        if (confirm("Are you sure you want to delete this WBS item and all its sub-items?")) {
            deleteWbsMutation.mutate(id);
        }
    };

    // Delete Work Package mutation
    const deleteWorkPackageMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/work-packages/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
            toast({
                title: "Deleted",
                description: "Work Package removed",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete work package",
                variant: "destructive",
            });
        }
    });

    const handleDeleteWorkPackage = (id: number) => {
        if (confirm("Are you sure you want to delete this Work Package?")) {
            deleteWorkPackageMutation.mutate(id);
        }
    };

    const renderWbsTree = (items: WbsTreeNode[], level = 0) => {
        return items.map(item => {
            const wpCount = wbsWpCount.get(item.id) ?? 0;
            const childWbsCount = childWbsCountByParent.get(item.id) ?? 0;
            const canExpand = (item.children?.length ?? 0) > 0 || wpCount > 0;
            const isSelected = selectedWbsId === item.id;

            return (
            <div key={item.id}>
                <div
                    className={cn(
                        "group flex items-center justify-between border-b border-[var(--border-subtle)] py-2.5 pr-2 transition-colors duration-100",
                        isSelected
                            ? "border-l-[3px] border-l-[var(--copper-500)] bg-[var(--copper-50)]"
                            : "border-l-[3px] border-l-transparent hover:bg-[rgba(253,246,237,0.5)]",
                        flashingWbsIds.has(item.id) && "animate-pulse ring-2 ring-red-500 bg-red-50"
                    )}
                    style={{ paddingLeft: `${level * 20 + 12}px` }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedWbsId(item.id);
                    }}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                            className={cn(
                                "flex h-3 w-3 shrink-0 items-center justify-center",
                                canExpand ? "cursor-pointer text-[var(--text-muted)]" : "text-transparent"
                            )}
                            onClick={() => canExpand && toggleWbs(item.id)}
                        >
                            {canExpand ? (item.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
                        </span>
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--bg-warm-gray)] kanban-caption font-semibold text-[var(--text-secondary)]">
                            {item.level}
                        </span>
                        <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => setSelectedWbsId(item.id)}
                        >
                            <div className={cn(
                                "kanban-body-md flex items-center gap-2",
                                level === 0 ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                            )}>
                                <span className="truncate">
                                    {item.code ? `${item.code} — ` : ""}{item.name}
                                </span>
                                {(item.type === "WBS" || item.type === "Summary") && (
                                    <span className="shrink-0 kanban-caption text-[var(--text-muted)]">(WBS)</span>
                                )}
                                {wpCount > 0 && (
                                    <span className="shrink-0 rounded bg-[var(--copper-50)] px-1.5 py-0.5 kanban-caption font-semibold text-[var(--copper-600)]">
                                        {wpCount} WP
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <WbsItemActions item={item} level={level} />
                    </div>
                </div>
                {item.expanded && (
                    <>
                        {item.children && renderWbsTree(item.children, level + 1)}
                        {!item.isTopLevel && (
                            <WbsItemWithWorkPackages
                                wbsItemId={item.id}
                                level={level}
                                isExpanded={item.expanded}
                                onEditWorkPackage={(id) => {
                                    setSelectedWorkPackageId(id);
                                    setIsEditWorkPackageModalOpen(true);
                                }}
                                onDeleteWorkPackage={handleDeleteWorkPackage}
                                onWorkPackageClick={(wpId) => setSelectedWpId(wpId)}
                            />
                        )}
                    </>
                )}
            </div>
        );
        });
    };

    if (isProjectLoading || isWbsLoading || isDepsLoading) {
        return (
            <MasterLayout projectId={projectId ? parseInt(projectId) : undefined}>
                <div className="min-h-screen flex items-center justify-center bg-[var(--bg-cream)]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-[var(--copper-500)] mx-auto mb-4" />
                        <h2 className="kanban-heading-lg text-[var(--text-primary)]">Loading Project Data...</h2>
                    </div>
                </div>
            </MasterLayout>
        );
    }

    if (!project) {
        return (
            <MasterLayout projectId={projectId ? parseInt(projectId) : undefined}>
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <div className="text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900">Project Not Found</h2>
                        <button
                            onClick={() => setLocation('/newlanding')}
                            className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold"
                        >
                            Return to Portfolio
                        </button>
                    </div>
                </div>
            </MasterLayout>
        );
    }

    return (
        <MasterLayout projectId={project.id}>
            <div className="min-h-screen bg-[var(--bg-cream)]">
                <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                    <ProjectDashboardHeader
                        project={project}
                        activeTab="home"
                        onImportWbs={() => setIsImportWbsOpen(true)}
                        scheduleStatus={timelineMetrics.scheduleStatus}
                    />

                    <WbsWorkPackagesCard
                        projectId={project.id}
                        currency={project.currency ?? "INR"}
                        wbsItems={flatWbsItems}
                        workPackages={projectWorkPackages}
                        wbsFinalized={isWbsFinalized}
                        selectedWpId={selectedWpId}
                        onInvalidWbsIds={(ids) => {
                            setFlashingWbsIds(new Set(ids));
                            setExpandedIds((prev) => new Set([...prev, ...ids]));
                        }}
                        tree={flatWbsItems.length > 0 ? renderWbsTree(wbsTree) : (
                            <p className="py-8 text-center kanban-body-sm text-[var(--text-muted)]">
                                No WBS items yet. Import a WBS or add your first item.
                            </p>
                        )}
                    />

                    <KpiStatsRow
                        currency={project.currency ?? "INR"}
                        budgetUsed={usedBudgetForDisplay}
                        budgetTotal={projectBudgetNum}
                        dayCurrent={timelineMetrics.elapsed}
                        dayTotal={timelineMetrics.totalDays}
                        wpCreated={projectWorkPackages.length}
                        wpTotal={Math.max(leafWbsCount, projectWorkPackages.length, 1)}
                        teamCount={projectResources.length}
                    />

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
                        <QuickActions onAction={handleQuickAction} />
                        <RecentActivity />
                    </div>
                </div>
            </div>

            <ImportWbsModal
                isOpen={isImportWbsOpen}
                onClose={() => setIsImportWbsOpen(false)}
                projectId={project.id}
            />

            <EditProjectModal
                projectId={project.id}
                isOpen={isEditProjectOpen}
                onClose={() => setIsEditProjectOpen(false)}
            />

            <AddWbsModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                projectId={project.id}
                parentId={selectedWbsItem?.id}
                parentName={selectedWbsItem?.name}
                parentLevel={selectedWbsItem?.level}
            />

            {editWbsId && (
                <EditWbsModal
                    isOpen={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    wbsId={editWbsId}
                />
            )}

            <WbsDetailsSheet
                isOpen={isDetailsSheetOpen}
                onOpenChange={setIsDetailsSheetOpen}
                wbsId={detailsWbsId}
            />

            <EditAllocationModal
                projectId={projectId!}
                isOpen={isEditAllocationOpen}
                onOpenChange={setIsEditAllocationOpen}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
                }}
                readOnly={allocationComplete}
            />

            {selectedWbsForWorkPackage && (
                <AddWorkPackageModal
                    isOpen={isAddWorkPackageModalOpen}
                    onClose={() => {
                        setIsAddWorkPackageModalOpen(false);
                        setSelectedWbsForWorkPackage(null);
                    }}
                    projectId={project.id}
                    wbsItemId={selectedWbsForWorkPackage.id}
                    wbsItemName={selectedWbsForWorkPackage.name}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
                        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
                    }}
                />
            )}

            <EditWorkPackageModal
                workPackageId={selectedWorkPackageId}
                isOpen={isEditWorkPackageModalOpen}
                onOpenChange={(open) => {
                    setIsEditWorkPackageModalOpen(open);
                    if (!open) setSelectedWorkPackageId(null);
                }}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
                }}
            />
        </MasterLayout>
    );
}
