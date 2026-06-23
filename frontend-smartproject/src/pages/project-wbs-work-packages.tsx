import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, WbsItem, WorkPackage, ProjectActivity } from "@shared/schema";
import { AddWbsModal } from "@/components/project/add-wbs-modal";
import { EditWbsModal } from "@/components/project/edit-wbs-modal";
import { AddWorkPackageModal } from "@/components/project/add-work-package-modal";
import { EditWorkPackageModal } from "@/components/project/edit-work-package-modal";
import { EditAllocationModal } from "@/components/project/edit-allocation-modal";
import { useToast } from "@/hooks/use-toast";
import { WbsActivitiesSplitView } from "@/components/wbs-activities/wbs-activities-split-view";
import { WbsTreePanel, type WbsTreeNode } from "@/components/wbs-activities/wbs-tree-panel";
import { RightPaneTabs } from "@/components/wbs-activities/right-pane-tabs";
import { ActivityNetworkTab } from "@/components/wbs-activities/activity-network-tab";
import { BudgetOverviewTab } from "@/components/wbs-activities/budget-overview-tab";
import { ResourcesAssignedTab } from "@/components/wbs-activities/resources-assigned-tab";
import { ScheduleTab } from "@/components/wbs-activities/schedule-tab";
import type { WbsActivitiesRightTab } from "@/components/wbs-activities/constants";
import { Loader2 } from "lucide-react";

export default function ProjectWbsWorkPackages() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const pid = projectId ? parseInt(projectId, 10) : 0;
  const { toast } = useToast();

  const [rightTab, setRightTab] = useState<WbsActivitiesRightTab>("diagram");
  const [selectedWbsId, setSelectedWbsId] = useState<number | null>(null);
  const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [flashingWbsIds, setFlashingWbsIds] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWbsItem, setSelectedWbsItem] = useState<{ id: number; name: string; level: number } | null>(null);
  const [editWbsId, setEditWbsId] = useState<number | null>(null);
  const [isAddWpOpen, setIsAddWpOpen] = useState(false);
  const [isEditWpOpen, setIsEditWpOpen] = useState(false);
  const [selectedWpEditId, setSelectedWpEditId] = useState<number | null>(null);
  const [selectedWbsForWp, setSelectedWbsForWp] = useState<{ id: number; name: string } | null>(null);
  const [isEditAllocationOpen, setIsEditAllocationOpen] = useState(false);

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${pid}`],
    enabled: !!pid,
  });

  const { data: wbsItems = [], isLoading: loadingWbs } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${pid}/wbs`],
    enabled: !!pid,
  });

  const { data: workPackages = [], isLoading: loadingWps } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${pid}/work-packages`],
    enabled: !!pid,
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery<ProjectActivity[]>({
    queryKey: [`/api/projects/${pid}/activities`],
    enabled: !!pid,
  });

  const { data: projectResources = [] } = useQuery<unknown[]>({
    queryKey: [`/api/projects/${pid}/resources`],
    enabled: !!pid,
  });

  const isWbsFinalized = Boolean((project as Project & { wbsFinalized?: boolean })?.wbsFinalized);
  const projectBudgetNum = Number(project?.budget) || 0;
  const topLevelWbs = useMemo(() => wbsItems.filter((w) => !w.parentId), [wbsItems]);
  const allocatedToWbs = useMemo(
    () => topLevelWbs.reduce((sum, w) => sum + Number(w.budgetedCost || 0), 0),
    [topLevelWbs]
  );
  const allocationComplete = project != null && project.allocationVersion != null;
  const usedBudget = allocationComplete
    ? allocatedToWbs
    : wbsItems.reduce((acc, i) => acc + Number(i.actualCost || 0), 0);
  const remainingBudget = allocationComplete
    ? projectBudgetNum - allocatedToWbs
    : projectBudgetNum - usedBudget;
  const usagePercent = projectBudgetNum ? Math.round((usedBudget / projectBudgetNum) * 100) : 0;

  const wbsWpCount = useMemo(() => {
    const map = new Map<number, number>();
    for (const wp of workPackages) map.set(wp.wbsItemId, (map.get(wp.wbsItemId) ?? 0) + 1);
    return map;
  }, [workPackages]);

  const childWbsCountByParent = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of wbsItems) {
      if (w.parentId != null && (w.type === "Summary" || w.type === "WBS")) {
        map.set(w.parentId, (map.get(w.parentId) ?? 0) + 1);
      }
    }
    return map;
  }, [wbsItems]);

  useEffect(() => {
    setExpandedIds(new Set());
    initializedRef.current = false;
  }, [pid]);

  useEffect(() => {
    if (wbsItems.length > 0 && !initializedRef.current) {
      setExpandedIds(new Set(wbsItems.filter((i) => i.level <= 2).map((i) => i.id)));
      initializedRef.current = true;
    }
  }, [wbsItems]);

  useEffect(() => {
    if (flashingWbsIds.size === 0) return;
    const t = setTimeout(() => setFlashingWbsIds(new Set()), 6000);
    return () => clearTimeout(t);
  }, [flashingWbsIds]);

  const wbsTree = useMemo(() => {
    const itemMap = new Map<number, WbsTreeNode>();
    const roots: WbsTreeNode[] = [];
    wbsItems.forEach((item) => {
      itemMap.set(item.id, { ...item, expanded: expandedIds.has(item.id), children: [] });
    });
    wbsItems.forEach((item) => {
      const node = itemMap.get(item.id)!;
      if (item.parentId && itemMap.has(item.parentId)) itemMap.get(item.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  }, [wbsItems, expandedIds]);

  const toggleWbs = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteWbsMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/wbs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/wbs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/work-packages`] });
      toast({ title: "Deleted", description: "WBS item removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteWpMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/work-packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/work-packages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/wbs`] });
      toast({ title: "Deleted", description: "Work package removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleDeleteWbs = (id: number) => {
    if (confirm("Delete this WBS item and all sub-items?")) deleteWbsMutation.mutate(id);
  };

  const handleDeleteWp = (id: number) => {
    if (confirm("Delete this work package?")) deleteWpMutation.mutate(id);
  };

  const isLoading = loadingProject || loadingWbs || loadingWps;

  if (isLoading && !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-[var(--bg-cream)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--copper-500)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WbsActivitiesSplitView
        left={
          <WbsTreePanel
            projectId={pid}
            wbsItems={wbsItems}
            workPackages={workPackages}
            wbsFinalized={isWbsFinalized}
            tree={wbsTree}
            isLoading={loadingWbs}
            selectedWbsId={selectedWbsId}
            flashingWbsIds={flashingWbsIds}
            expandedIds={expandedIds}
            wbsWpCount={wbsWpCount}
            childWbsCountByParent={childWbsCountByParent}
            onToggleExpand={toggleWbs}
            onExpandAll={() => setExpandedIds(new Set(wbsItems.map((i) => i.id)))}
            onCollapseAll={() => setExpandedIds(new Set())}
            onSelectWbs={setSelectedWbsId}
            onSelectWp={setSelectedWpId}
            onAddRoot={() => {
              setSelectedWbsItem(null);
              setIsAddModalOpen(true);
            }}
            onAddChild={(item) => {
              setSelectedWbsItem({ id: item.id, name: item.name, level: item.level });
              setIsAddModalOpen(true);
            }}
            onEdit={(id) => {
              setEditWbsId(id);
              setIsEditModalOpen(true);
            }}
            onDelete={handleDeleteWbs}
            onAddWorkPackage={(wbs) => {
              setSelectedWbsForWp(wbs);
              setIsAddWpOpen(true);
            }}
            onEditWorkPackage={(id) => {
              setSelectedWpEditId(id);
              setIsEditWpOpen(true);
            }}
            onDeleteWorkPackage={handleDeleteWp}
            onInvalidWbsIds={(ids) => {
              setFlashingWbsIds(new Set(ids));
              setExpandedIds((prev) => new Set([...prev, ...ids]));
            }}
          />
        }
        right={
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RightPaneTabs
              activeTab={rightTab}
              onTabChange={setRightTab}
              resourceCount={projectResources.length}
            />
            <div className="min-h-0 flex-1 overflow-auto">
              {rightTab === "diagram" && (
                <ActivityNetworkTab
                  projectId={pid}
                  selectedWpId={selectedWpId}
                  projectStartDate={project?.startDate}
                  projectEndDate={project?.endDate}
                  hasActivities={activities.length > 0}
                  isLoading={loadingActivities}
                  onCreateActivity={() => setLocation(`/projects/${pid}/activities/activity-plan`)}
                />
              )}
              {rightTab === "budget" && project && (
                <BudgetOverviewTab
                  projectId={pid}
                  currency={project.currency ?? "INR"}
                  projectBudget={projectBudgetNum}
                  usedBudget={usedBudget}
                  remainingBudget={remainingBudget}
                  usagePercent={usagePercent}
                  allocationComplete={allocationComplete}
                  wbsItems={wbsItems}
                  onEditAllocation={() => setIsEditAllocationOpen(true)}
                />
              )}
              {rightTab === "resources" && (
                <ResourcesAssignedTab
                  projectId={pid}
                  selectedWpId={selectedWpId}
                  projectStartDate={project?.startDate}
                  projectEndDate={project?.endDate}
                  resourceCount={projectResources.length}
                />
              )}
              {rightTab === "schedule" && <ScheduleTab projectId={pid} />}
            </div>
          </div>
        }
      />

      <AddWbsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectId={pid}
        parentId={selectedWbsItem?.id}
        parentName={selectedWbsItem?.name}
        parentLevel={selectedWbsItem?.level}
      />

      {editWbsId != null && (
        <EditWbsModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} wbsId={editWbsId} />
      )}

      {selectedWbsForWp && (
        <AddWorkPackageModal
          isOpen={isAddWpOpen}
          onClose={() => {
            setIsAddWpOpen(false);
            setSelectedWbsForWp(null);
          }}
          projectId={pid}
          wbsItemId={selectedWbsForWp.id}
          wbsItemName={selectedWbsForWp.name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/work-packages`] });
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/wbs`] });
          }}
        />
      )}

      <EditWorkPackageModal
        workPackageId={selectedWpEditId}
        isOpen={isEditWpOpen}
        onOpenChange={(open) => {
          setIsEditWpOpen(open);
          if (!open) setSelectedWpEditId(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/work-packages`] });
        }}
      />

      <EditAllocationModal
        projectId={String(pid)}
        isOpen={isEditAllocationOpen}
        onOpenChange={setIsEditAllocationOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/wbs`] });
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${pid}/work-packages`] });
        }}
        readOnly={allocationComplete}
      />
    </div>
  );
}
