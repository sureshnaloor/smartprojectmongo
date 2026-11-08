import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, WbsItem, WorkPackage } from "@shared/schema";
import { AddWbsModal } from "@/components/project/add-wbs-modal";
import { EditWbsModal } from "@/components/project/edit-wbs-modal";
import { AddWorkPackageModal } from "@/components/project/add-work-package-modal";
import { EditWorkPackageModal } from "@/components/project/edit-work-package-modal";
import { EditWorkPackageBudgetModal } from "@/components/project/edit-work-package-budget-modal";
import { useToast } from "@/hooks/use-toast";
import { WbsTreePanel, type WbsTreeNode } from "@/components/wbs-activities/wbs-tree-panel";
import { Loader2 } from "lucide-react";
import { AmendProjectButton } from "@/components/project/amend-project-button";
import { ImportWbsModal } from "@/components/project/import-wbs-modal";
import { WbsVersionsPanel } from "@/components/wbs-activities/wbs-versions-panel";

export default function ProjectWbsWorkPackages() {
  const { projectId } = useParams();
  const pid = projectId ? parseInt(projectId, 10) : 0;
  const { toast } = useToast();

  const [selectedWbsId, setSelectedWbsId] = useState<number | null>(null);
  const [, setSelectedWpId] = useState<number | null>(null);
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
  const [isImportWbsOpen, setIsImportWbsOpen] = useState(false);
  const [isEditWpBudgetOpen, setIsEditWpBudgetOpen] = useState(false);
  const [selectedWpForBudgetEdit, setSelectedWpForBudgetEdit] = useState<WorkPackage | null>(null);
  const [flashingZeroBudgetWpIds, setFlashingZeroBudgetWpIds] = useState<Set<number>>(new Set());

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${pid}`],
    enabled: !!pid,
  });

  const { data: rawWbs = [], isLoading: loadingWbs } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${pid}/wbs`],
    enabled: !!pid,
  });
  const wbsItems = Array.isArray(rawWbs) ? rawWbs : [];

  const { data: rawWps = [], isLoading: loadingWps } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${pid}/work-packages`],
    enabled: !!pid,
  });
  const workPackages = Array.isArray(rawWps) ? rawWps : [];

  const isWbsFinalized = Boolean((project as Project & { wbsFinalized?: boolean })?.wbsFinalized);
  const isBudgetFinalized = Boolean((project as Project & { budgetFinalized?: boolean })?.budgetFinalized);
  const projectCreatedById = (project as Project & { createdById?: number | null })?.createdById ?? null;

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
    if (isWbsFinalized) {
      toast({
        title: "WBS is finalized",
        description: "Create a project amendment to revise the structure.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("Delete this WBS item and all sub-items?")) deleteWbsMutation.mutate(id);
  };

  const handleDeleteWp = (id: number) => {
    if (isWbsFinalized) {
      toast({
        title: "WBS is finalized",
        description: "Create a project amendment to revise the structure.",
        variant: "destructive",
      });
      return;
    }
    const targetWp = workPackages.find((wp) => wp.id === id);
    if (targetWp) {
      const siblings = workPackages.filter((wp) => wp.wbsItemId === targetWp.wbsItemId);
      if (siblings.length <= 1) {
        toast({
          title: "Cannot Delete Work Package",
          description:
            "Cannot delete lone Work Package. Please delete the parent WBS item instead, or add another sibling Work Package before deleting this one.",
          variant: "destructive",
        });
        return;
      }
    }
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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-0">
      <div className="flex min-h-[560px] w-full flex-1 flex-col">
          <WbsTreePanel
            projectId={pid}
            wbsItems={wbsItems}
            workPackages={workPackages}
            wbsFinalized={isWbsFinalized}
            budgetFinalized={isBudgetFinalized}
            projectCurrency={project?.currency || "USD"}
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
              if (isWbsFinalized) return;
              setSelectedWbsItem(null);
              setIsAddModalOpen(true);
            }}
            onAddChild={(item) => {
              if (isWbsFinalized) return;
              setSelectedWbsItem({ id: item.id, name: item.name, level: item.level });
              setIsAddModalOpen(true);
            }}
            onEdit={(id) => {
              if (isWbsFinalized) {
                toast({
                  title: "WBS is finalized",
                  description: "Create a project amendment to revise the structure.",
                  variant: "destructive",
                });
                return;
              }
              setEditWbsId(id);
              setIsEditModalOpen(true);
            }}
            onDelete={handleDeleteWbs}
            onAddWorkPackage={(wbs) => {
              if (isWbsFinalized) return;
              setSelectedWbsForWp(wbs);
              setIsAddWpOpen(true);
            }}
            onEditWorkPackage={(id) => {
              if (isWbsFinalized) {
                toast({
                  title: "WBS is finalized",
                  description: "Create a project amendment to revise the structure.",
                  variant: "destructive",
                });
                return;
              }
              setSelectedWpEditId(id);
              setIsEditWpOpen(true);
            }}
            onDeleteWorkPackage={handleDeleteWp}
            onEditWorkPackageBudget={(wp) => {
              if (isBudgetFinalized) {
                toast({
                  title: "Budget is finalized",
                  description: "Create a project amendment to edit work package budgets.",
                  variant: "destructive",
                });
                return;
              }
              setFlashingZeroBudgetWpIds((prev) => {
                const next = new Set(prev);
                next.delete(wp.id);
                return next;
              });
              setSelectedWpForBudgetEdit(wp);
              setIsEditWpBudgetOpen(true);
            }}
            onInvalidWbsIds={(ids) => {
              setFlashingWbsIds(new Set(ids));
              setExpandedIds((prev) => new Set([...Array.from(prev), ...ids]));
              setTimeout(() => setFlashingWbsIds(new Set()), 4000);
            }}
            flashingZeroBudgetWpIds={flashingZeroBudgetWpIds}
            onInvalidWpBudgetIds={(wpIds, parentWbsIds) => {
              setFlashingZeroBudgetWpIds(new Set(wpIds));
              if (parentWbsIds.length > 0) {
                setExpandedIds((prev) => new Set([...Array.from(prev), ...parentWbsIds]));
              }
              setTimeout(() => setFlashingZeroBudgetWpIds(new Set()), 4000);
            }}
            amendAction={
              project ? (
                <AmendProjectButton
                  projectId={pid}
                  projectName={project.name}
                  wbsFinalized={isWbsFinalized}
                  budgetFinalized={isBudgetFinalized}
                  createdById={projectCreatedById}
                />
              ) : null
            }
            onImportWbs={() => setIsImportWbsOpen(true)}
          />
      </div>

      {/* WBS Version History — shown below the split view */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-cream)] px-4 py-5">
        <WbsVersionsPanel projectId={pid} />
      </div>

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

      <EditWorkPackageBudgetModal
        open={isEditWpBudgetOpen}
        onOpenChange={setIsEditWpBudgetOpen}
        workPackage={selectedWpForBudgetEdit}
        project={project}
      />

      <ImportWbsModal
        isOpen={isImportWbsOpen}
        onClose={() => setIsImportWbsOpen(false)}
        projectId={pid}
      />
    </div>
  );
}
