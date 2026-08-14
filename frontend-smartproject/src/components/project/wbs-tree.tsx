import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { WbsItem, UpdateWbsProgress, WorkPackage } from "@shared/schema";
import { formatCurrency, formatDate, formatPercent, formatShortDate, buildWbsHierarchy, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, ChevronUp, Edit, Trash2, Plus, Clipboard, PencilIcon, DollarSign, AlertCircle, CheckCircle, Loader2, FileUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddWbsModal } from "./add-wbs-modal";
import { EditWbsModal } from "./edit-wbs-modal";
import { AddWorkPackageModal } from "./add-work-package-modal";
import { EditWorkPackageModal } from "./edit-work-package-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportActivityModal } from "./import-activity-modal";
import { ImportWbsModal } from "./import-wbs-modal";
import { FinalizeWbsButton } from "./finalize-wbs-button";
import { AmendProjectButton } from "./amend-project-button";
import { MAX_WBS_LEVEL } from "@shared/wbs-validation";

interface WbsTreeProps {
  projectId: number;
}

interface TreeItemProps {
  item: WbsItem;
  projectId: number;
  level: number;
  onAddChild: (parentId: number) => void;
  onRefresh: () => void;
  onUpdateProgress: (item: WbsItem) => void;
  onEdit: (item: WbsItem) => void;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  budgetInfo: Record<number, { total: number, used: number, remaining: number }>;
  isBudgetFinalized: boolean;
  loadingItems: Set<number>;
  expandedItems: Record<number, boolean>;
  flashingIds: Set<number>;
  isWbsFinalized: boolean;
  allWbsItems: WbsItem[];
  projectWorkPackages: WorkPackage[];
}

// Interface for Project data
interface ProjectData {
  id: number;
  name: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  budget: number;
  currency: string;
  createdAt?: string | Date;
}

export function WbsTree({ projectId }: WbsTreeProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportWbsModalOpen, setIsImportWbsModalOpen] = useState(false);
  const [isImportActivityModalOpen, setIsImportActivityModalOpen] = useState(false);
  const [selectedWbsItem, setSelectedWbsItem] = useState<WbsItem | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [loadingItems, setLoadingItems] = useState<Set<number>>(new Set());
  const [isFinalizingBudget, setIsFinalizingBudget] = useState(false);
  const [flashingWbsIds, setFlashingWbsIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projectWorkPackages = [] } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${projectId}/work-packages`],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (flashingWbsIds.size === 0) return;
    const t = setTimeout(() => setFlashingWbsIds(new Set()), 6000);
    return () => clearTimeout(t);
  }, [flashingWbsIds]);

  // Fetch project details to get total budget
  const { data: project } = useQuery<ProjectData>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const isWbsFinalized = Boolean((project as ProjectData & { wbsFinalized?: boolean })?.wbsFinalized);

  // Get the project currency or default to USD if not available
  const projectCurrency = project?.currency || "USD";

  // Fetch WBS items for the project
  const { 
    data: wbsItems = [], 
    isLoading,
    refetch
  } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
  });

  // Calculate total project budget usage
  const calculateProjectBudgetUsage = () => {
    // Default values if project is undefined
    if (!project) return { 
      projectBudget: 0, 
      topLevelAllocated: 0, 
      workPackageTotal: 0, 
      unallocated: 0, 
      percentAllocated: 0 
    };
    
    // Get all top-level summary items
    const topLevelItems = wbsItems.filter(item => item.isTopLevel && item.type === "Summary");
    
    // Sum up all top-level budgets
    const totalAllocated = topLevelItems.reduce((total, item) => {
      return total + Number(item.budgetedCost || 0);
    }, 0);
    
    // Get all work packages
    const workPackages = wbsItems.filter(item => item.type === "WorkPackage");
    
    // Sum up all work package budgets
    const totalWorkPackageBudget = workPackages.reduce((total, wp) => {
      return total + Number(wp.budgetedCost || 0);
    }, 0);
    
    const projectBudget = typeof project.budget === 'number' ? project.budget : 
                          typeof project.budget === 'string' ? parseFloat(project.budget) : 0;
    
    return {
      projectBudget,
      topLevelAllocated: totalAllocated,
      workPackageTotal: totalWorkPackageBudget,
      unallocated: projectBudget - totalAllocated,
      percentAllocated: projectBudget ? (totalAllocated / projectBudget) * 100 : 0
    };
  };
  
  const budgetUsage = project ? calculateProjectBudgetUsage() : { 
    projectBudget: 0, 
    topLevelAllocated: 0, 
    workPackageTotal: 0, 
    unallocated: 0, 
    percentAllocated: 0 
  };

  // Build WBS hierarchy
  const rootItems = buildWbsHierarchy(wbsItems);

  // Calculate remaining budget for each summary item
  const calculateBudgets = () => {
    const budgetInfo: Record<number, { total: number, used: number, remaining: number }> = {};
    
    // Group items by parent
    const itemsByParent: Record<string, WbsItem[]> = {};
    wbsItems.forEach(item => {
      const parentKey = item.parentId === null ? 'root' : item.parentId.toString();
      if (!itemsByParent[parentKey]) {
        itemsByParent[parentKey] = [];
      }
      itemsByParent[parentKey].push(item);
    });
    
    // Process each summary item
    wbsItems
      .filter(item => item.type === "Summary" || item.type === "WBS")
      .forEach(summaryItem => {
        const childKey = summaryItem.id.toString();
        const children = itemsByParent[childKey] || [];
        const workPackageChildren = children.filter(child => child.type === "WorkPackage");
        
        // Calculate used budget (sum of work package budgets)
        const usedBudget = workPackageChildren.reduce((total, wp) => {
          return total + Number(wp.budgetedCost || 0);
        }, 0);
        
        // Calculate total and remaining budgets
        const totalBudget = Number(summaryItem.budgetedCost || 0);
        const remainingBudget = totalBudget - usedBudget;
        
        budgetInfo[summaryItem.id] = {
          total: totalBudget,
          used: usedBudget,
          remaining: remainingBudget
        };
      });
    
    return budgetInfo;
  };
  
  const budgetInfo = calculateBudgets();

  // Finalize budget mutation
  const finalizeBudget = useMutation({
    mutationFn: async () => {
      setIsFinalizingBudget(true);
      
      // Step 1: Organize items by their hierarchy
      const itemsByParent: Record<string, WbsItem[]> = {};
      wbsItems.forEach(item => {
        const parentKey = item.parentId === null ? 'root' : item.parentId.toString();
        if (!itemsByParent[parentKey]) {
          itemsByParent[parentKey] = [];
        }
        itemsByParent[parentKey].push(item);
      });
      
      // Check for summary items without work package children
      const summaryItemsWithoutWorkPackages: WbsItem[] = [];
      const summaryItems = wbsItems.filter(item => item.type === "Summary" || item.type === "WBS");
      
      for (const summaryItem of summaryItems) {
        const childKey = summaryItem.id.toString();
        const children = itemsByParent[childKey] || [];
        const workPackageChildren = children.filter(child => child.type === "WorkPackage");
        
        if (workPackageChildren.length === 0) {
          summaryItemsWithoutWorkPackages.push(summaryItem);
        }
      }
      
      // If there are summary items without work packages, throw an error
      if (summaryItemsWithoutWorkPackages.length > 0) {
        const summaryNames = summaryItemsWithoutWorkPackages.map(item => item.name).join(", ");
        setIsFinalizingBudget(false);
        throw new Error(`The summary WBS "${summaryNames}" do not have any child work package WBS. Include work package WBS or delete the summary WBS.`);
      }
      
      // Step 2: Calculate budgets from bottom up (WorkPackage level only)
      const summarizedBudgets: Record<number, number> = {};
      
      // For each summary item, calculate the total budget of its WorkPackage children
      for (const summaryItem of summaryItems) {
        const childKey = summaryItem.id.toString();
        const children = itemsByParent[childKey] || [];
        const workPackageChildren = children.filter(child => child.type === "WorkPackage");
        
        // Sum up only work package budgets
        const totalBudget = workPackageChildren.reduce((total, wp) => {
          return total + Number(wp.budgetedCost || 0);
        }, 0);
        
        summarizedBudgets[summaryItem.id] = totalBudget;
        
        // Update the summary item with the calculated budget
        await apiRequest("PATCH", `/api/wbs/${summaryItem.id}`, {
          budgetedCost: totalBudget
        });
      }
      
      // Refresh data
      await refetch();
      
      setIsFinalizingBudget(false);
      return summarizedBudgets;
    },
    onSuccess: () => {
      toast({
        title: "Budget Finalized",
        description: "Work package budgets have been summarized to parent items successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      setIsFinalizingBudget(false);
      toast({
        title: "Cannot finalize budget",
        description: error.message || "Failed to finalize budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleExpand = (itemId: number) => {
    // If we're expanding, show the loading state
    if (!expandedItems[itemId]) {
      // First set expanded state immediately for responsiveness
      setExpandedItems(prev => ({
        ...prev,
        [itemId]: true
      }));
      
      // Then add this item to loading set
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.add(itemId);
        return newSet;
      });
      
      // Adaptive loading time based on number of children
      const item = wbsItems.find(wi => wi.id === itemId);
      const childCount = item ? wbsItems.filter(child => child.parentId === itemId).length : 0;
      const loadingTime = Math.min(200 + childCount * 20, 500); // Base 200ms + 20ms per child, max 500ms
      
      // Simulate loading time
      setTimeout(() => {
        setLoadingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, loadingTime);
    } else {
      // If collapsing, no need for loading state - just collapse immediately
      setExpandedItems(prev => ({
        ...prev,
        [itemId]: false
      }));
    }
  };

  const handleAddChild = (parentId: number) => {
    if (isWbsFinalized) {
      toast({
        title: "WBS is finalized",
        description: "Cannot add WBS items after the structure is finalized.",
        variant: "destructive",
      });
      return;
    }
    // Skip if budget is finalized
    if (isBudgetFinalized) {
      toast({
        title: "Budget is finalized",
        description: "Cannot add new items when budget is finalized.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedParentId(parentId);
    setIsAddModalOpen(true);
  };

  const handleAddTopLevel = () => {
    if (isWbsFinalized) {
      toast({
        title: "WBS is finalized",
        description: "Create a project amendment to revise the structure.",
        variant: "destructive",
      });
      return;
    }
    setSelectedParentId(null);
    setIsAddModalOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleUpdateProgress = (item: WbsItem) => {
    // Skip if budget is finalized
    if (isBudgetFinalized) {
      toast({
        title: "Budget is finalized",
        description: "Cannot update progress for items when budget is finalized.",
        variant: "destructive",
      });
      return;
    }
    
    // Set the selected WBS item and open the Edit modal
    setSelectedWbsItem(item);
    // Logic to update progress (implemented in the TreeItem component)
  };

  const handleEditWbsItem = (item: WbsItem) => {
    if (isWbsFinalized) {
      toast({
        title: "WBS is finalized",
        description: "Create a project amendment to revise the structure.",
        variant: "destructive",
      });
      return;
    }
    // Skip if budget is finalized
    if (isBudgetFinalized) {
      toast({
        title: "Budget is finalized",
        description: "Cannot edit items when budget is finalized.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedWbsItem(item);
    setIsEditModalOpen(true);
  };

  // Expand all WBS items recursively
  const expandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    
    // Recursively collect all WBS item IDs
    const collectAllIds = (items: WbsItem[]) => {
      items.forEach(item => {
        allExpanded[item.id] = true;
        const children = wbsItems.filter(child => child.parentId === item.id);
        if (children.length > 0) {
          collectAllIds(children);
        }
      });
    };
    
    collectAllIds(rootItems);
    setExpandedItems(allExpanded);
  };

  // Collapse all WBS items
  const collapseAll = () => {
    setExpandedItems({});
  };

  // Add a check to determine if budget is finalized
  const isBudgetFinalized = Math.abs(budgetUsage.workPackageTotal - budgetUsage.topLevelAllocated) < 0.01 && 
                          budgetUsage.workPackageTotal > 0;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-8 w-full max-w-lg" />
        <Skeleton className="h-8 w-full max-w-sm" />
      </div>
    );
  }

  const renderTree = (items: WbsItem[], level = 0, budgetInfo: Record<number, { total: number, used: number, remaining: number }> = {}) => {
    return items.map(item => (
      <TreeItem
        key={item.id}
        item={item}
        projectId={projectId}
        level={level}
        onAddChild={handleAddChild}
        onRefresh={handleRefresh}
        onUpdateProgress={handleUpdateProgress}
        onEdit={handleEditWbsItem}
        isExpanded={!!expandedItems[item.id]}
        onToggleExpand={toggleExpand}
        budgetInfo={budgetInfo}
        isBudgetFinalized={isBudgetFinalized}
        loadingItems={loadingItems}
        expandedItems={expandedItems}
        flashingIds={flashingWbsIds}
        isWbsFinalized={isWbsFinalized}
        allWbsItems={wbsItems}
        projectWorkPackages={projectWorkPackages}
      />
    ));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">Work Breakdown Structure</h2>
          {isBudgetFinalized && (
            <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Budget Finalized
            </span>
          )}
          {isWbsFinalized && (
            <span className="ml-3 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full flex items-center">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              WBS Finalized
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          <FinalizeWbsButton
            projectId={projectId}
            wbsItems={wbsItems}
            workPackages={projectWorkPackages}
            wbsFinalized={isWbsFinalized}
            onInvalidIds={(ids) => {
              setFlashingWbsIds(new Set(ids));
              ids.forEach((id) => {
                setExpandedItems((prev) => ({ ...prev, [id]: true }));
              });
            }}
          />
          {project && (
            <AmendProjectButton
              projectId={projectId}
              projectName={(project as ProjectData).name}
              wbsFinalized={isWbsFinalized}
              createdById={(project as ProjectData & { createdById?: number | null }).createdById}
            />
          )}
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 h-7"
            onClick={expandAll}
            disabled={isLoading || wbsItems.length === 0}
          >
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Expand All
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 h-7"
            onClick={collapseAll}
            disabled={isLoading || Object.keys(expandedItems).length === 0}
          >
            <ChevronUp className="h-3.5 w-3.5 mr-1" />
            Collapse All
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 h-7"
            onClick={handleAddTopLevel}
            disabled={isLoading || isBudgetFinalized || isWbsFinalized}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Top-Level
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 h-7"
            onClick={() => setIsImportWbsModalOpen(true)}
            disabled={isLoading || isBudgetFinalized || isWbsFinalized}
          >
            <FileUp className="h-3.5 w-3.5 mr-1" />
            Import WBS
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 h-7"
            onClick={() => {
              // Open the global import activities modal
              setSelectedWorkPackageId(null);
              setIsImportActivityModalOpen(true);
            }}
            disabled={isLoading}
          >
            <FileUp className="h-3.5 w-3.5 mr-1" />
            Import Activities
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-1 h-7"
            onClick={() => setIsFinalizingBudget(true)}
            disabled={isLoading || isBudgetFinalized || wbsItems.length === 0}
          >
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Finalize Budget
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="overflow-auto flex-1 border border-gray-200 rounded-md">
          {project && (
            <div className="p-3 mb-2 bg-gray-50 border-b border-gray-200">
              <h4 className="text-xs font-semibold mb-1">Project Budget Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Total Project Budget</div>
                  <div className="text-sm font-bold">{formatCurrency(budgetUsage.projectBudget, projectCurrency)}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">Allocated to WBS</div>
                  <div className="text-sm font-bold">
                    {formatCurrency(budgetUsage.topLevelAllocated, projectCurrency)}
                    <span className="text-xs ml-1 font-normal">
                      ({formatPercent(budgetUsage.percentAllocated)})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {budgetUsage.unallocated > 0 ? 
                      `Unallocated: ${formatCurrency(budgetUsage.unallocated, projectCurrency)}` : 
                      <span className="text-amber-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Over-allocated by {formatCurrency(Math.abs(budgetUsage.unallocated), projectCurrency)}
                      </span>
                    }
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">Work Package Budget Total</div>
                  <div className="text-sm font-bold">{formatCurrency(budgetUsage.workPackageTotal, projectCurrency)}</div>
                  {budgetUsage.workPackageTotal !== budgetUsage.topLevelAllocated && !isBudgetFinalized && (
                    <div className="text-xs text-amber-600 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {budgetUsage.workPackageTotal > budgetUsage.topLevelAllocated ? 
                        "Work packages exceed summary allocation" : 
                        "Use Finalize Budget to update summaries"
                      }
                    </div>
                  )}
                  {isBudgetFinalized && (
                    <div className="text-xs text-green-600 flex items-center font-medium">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Budget finalized
                    </div>
                  )}
                </div>
              </div>
              {/* Budget Usage Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className={`h-2 rounded-full ${
                      budgetUsage.percentAllocated > 100 ? 'bg-red-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, budgetUsage.percentAllocated)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4">
            {rootItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No WBS items found. Create a top-level item to get started.
              </div>
            ) : (
              <div className="space-y-0">
                {/* Table Headers */}
                <div className="grid grid-cols-[minmax(250px,_1fr)_repeat(6,_minmax(100px,_1fr))] px-4 py-2 font-medium text-sm bg-gray-100 border-b border-gray-200 sticky top-0">
                  <div>Name</div>
                  <div>Code</div>
                  <div>Type</div>
                  <div>Budget</div>
                  <div>Actual Cost</div>
                  <div>Progress</div>
                  <div>Actions</div>
                </div>
                {/* Tree Items */}
                <div className="space-y-0">
                  {renderTree(rootItems, 0, budgetInfo)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add WBS Modal */}
      <AddWbsModal
        projectId={projectId}
        parentId={selectedParentId}
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsAddModalOpen(false);
        }}
      />

      {/* Edit WBS Modal */}
      {selectedWbsItem && (
        <EditWbsModal
          wbsItemId={selectedWbsItem.id}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            refetch();
            setIsEditModalOpen(false);
          }}
        />
      )}

      {/* Import WBS Modal */}
      <ImportWbsModal
        isOpen={isImportWbsModalOpen}
        onClose={() => setIsImportWbsModalOpen(false)}
        projectId={projectId}
      />

      {/* Import Activity Modal (global) */}
      <ImportActivityModal
        isOpen={isImportActivityModalOpen}
        onClose={() => setIsImportActivityModalOpen(false)}
        projectId={projectId}
        workPackageId={selectedWorkPackageId}
      />

      {/* Finalize Budget Dialog */}
      <Dialog open={isFinalizingBudget} onOpenChange={setIsFinalizingBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Project Budget Allocation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>This will automatically adjust summary-level budget allocations to match work package totals.</p>
            
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
              <h4 className="font-semibold text-amber-700">Before update:</h4>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div className="text-gray-500">Project budget:</div>
                <div className="font-medium">{formatCurrency(budgetUsage.projectBudget, projectCurrency)}</div>
                
                <div className="text-gray-500">Summary allocations:</div>
                <div className="font-medium">{formatCurrency(budgetUsage.topLevelAllocated, projectCurrency)}</div>
                
                <div className="text-gray-500">Work package total:</div>
                <div className="font-medium">{formatCurrency(budgetUsage.workPackageTotal, projectCurrency)}</div>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <h4 className="font-semibold text-blue-700">Note:</h4>
              <p className="mt-1 text-blue-700">
                After finalization, you won't be able to add new top-level WBS items. 
                The "Add Top-Level" and "Finalize Budget" buttons will be disabled.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalizingBudget(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                finalizeBudget.mutate(undefined, {
                  onSuccess: () => {
                    toast({
                      title: "Budget allocation updated",
                      description: "Summary budgets have been adjusted to match work package totals",
                    });
                    setIsFinalizingBudget(false);
                    refetch();
                  },
                  onError: (error) => {
                    toast({
                      title: "Cannot finalize budget",
                      description: error.message || "Failed to finalize budget. Please try again.",
                      variant: "destructive",
                    });
                    // Make sure dialog is closed on error
                    setIsFinalizingBudget(false);
                  }
                });
              }}
              disabled={finalizeBudget.isPending}
            >
              {finalizeBudget.isPending ? "Updating..." : "Update Allocations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TreeItem({ 
  item, 
  projectId, 
  level, 
  onAddChild, 
  onRefresh, 
  onUpdateProgress, 
  onEdit,
  isExpanded,
  onToggleExpand,
  budgetInfo,
  isBudgetFinalized,
  loadingItems,
  expandedItems,
  flashingIds,
  isWbsFinalized,
  allWbsItems,
  projectWorkPackages,
}: TreeItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isImportActivityModalOpen, setIsImportActivityModalOpen] = useState(false);
  const [isAddWorkPackageModalOpen, setIsAddWorkPackageModalOpen] = useState(false);
  const [isEditWorkPackageModalOpen, setIsEditWorkPackageModalOpen] = useState(false);
  const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<number | null>(null);
  const [progress, setProgress] = useState(Number(item.percentComplete) || 0);
  const [actualCost, setActualCost] = useState(Number(item.actualCost) || 0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    item.actualEndDate ? new Date(item.actualEndDate) : undefined
  );
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isLoading = loadingItems.has(item.id);

  // Fetch project data to get the currency
  const { data: project } = useQuery<ProjectData>({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Get the project currency or default to USD if not available
  const projectCurrency = project?.currency || "USD";

  // Fetch child WBS items
  const { data: childItems = [] } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs/children/${item.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/wbs`);
      if (!response.ok) throw new Error("Failed to fetch WBS items");
      const allItems = await response.json();
      return allItems.filter(
        (wbs: WbsItem) =>
          wbs.parentId === item.id && (wbs.type === "Summary" || wbs.type === "WBS")
      );
    },
    enabled: isExpanded,
  });

  const { data: workPackages = [] } = useQuery<WorkPackage[]>({
    queryKey: [`/api/wbs/${item.id}/work-packages`],
    queryFn: async () => {
      const response = await fetch(`/api/wbs/${item.id}/work-packages`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isExpanded && !item.isTopLevel,
  });

  const childWbsCount = allWbsItems.filter(
    (w) => w.parentId === item.id && (w.type === "Summary" || w.type === "WBS")
  ).length;
  const wpCountOnItem = projectWorkPackages.filter((wp) => wp.wbsItemId === item.id).length;
  const hasWorkPackages = wpCountOnItem > 0;
  const hasChildWbs = childWbsCount > 0;
  const hasExpandableContent = hasChildWbs || wpCountOnItem > 0;

  // Delete WBS item mutation
  const deleteWbsItem = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/wbs/${item.id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      toast({
        title: "WBS Item Deleted",
        description: "The WBS item has been deleted successfully.",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete WBS item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update progress mutation
  const updateProgress = useMutation({
    mutationFn: async (data: UpdateWbsProgress) => {
      const response = await apiRequest("PATCH", `/api/wbs/${item.id}/progress`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      toast({
        title: "Progress Updated",
        description: "The progress has been updated successfully.",
        variant: "default",
      });
      setIsProgressDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProgressSubmit = () => {
    // Only allow setting actual dates for Activity type
    if (item.type !== "Activity" && (selectedDate)) {
      toast({
        title: "Validation Error",
        description: "Only Activity items can have actual end dates.",
        variant: "destructive",
      });
      return;
    }

    updateProgress.mutate({
      id: item.id,
      percentComplete: progress,
      actualEndDate: selectedDate,
    });
  };

  const toggleExpand = () => {
    onToggleExpand(item.id);
  };

  const formatIndent = (level: number) => {
    return Array(level).fill('—').join('');
  };

  const canHaveChildren =
    item.type !== "Activity" &&
    item.level < MAX_WBS_LEVEL &&
    !isWbsFinalized &&
    !hasWorkPackages;
  const canAddWorkPackage = !item.isTopLevel && !isWbsFinalized && !hasChildWbs;
  
  // Get budget info for Summary or for parent of WorkPackage
  const getBudgetDisplay = () => {
    if (item.type === "Summary" || item.type === "WBS") {
      const info = budgetInfo[item.id];
      if (info) {
        return (
          <div>
            <div>{formatCurrency(item.budgetedCost, projectCurrency)}</div>
            <div className="text-xs text-gray-500">
              {`Allocated: ${formatCurrency(info.used, projectCurrency)} | Balance: `}
              <span className={info.remaining < 0 ? "text-red-500 font-semibold" : "text-green-600"}>
                {formatCurrency(info.remaining, projectCurrency)}
              </span>
            </div>
          </div>
        );
      }
      return formatCurrency(item.budgetedCost, projectCurrency);
    } 
    else if (item.type === "WorkPackage" && item.parentId) {
      const parentInfo = budgetInfo[item.parentId];
      if (parentInfo) {
        return (
          <div>
            <div>{formatCurrency(item.budgetedCost, projectCurrency)}</div>
            <div className="text-xs text-gray-500">
              {`Available: `}
              <span className={parentInfo.remaining < 0 ? "text-red-500 font-semibold" : "text-green-600"}>
                {formatCurrency(parentInfo.remaining + Number(item.budgetedCost), projectCurrency)}
              </span>
            </div>
          </div>
        );
      }
      return formatCurrency(item.budgetedCost, projectCurrency);
    } 
    else if (item.type === "Activity") {
      return "N/A";
    }
    
    return formatCurrency(item.budgetedCost, projectCurrency);
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[minmax(250px,_1fr)_repeat(6,_minmax(100px,_1fr))] px-4 py-2 hover:bg-gray-50 border-b border-gray-100 transition-colors",
          flashingIds.has(item.id) && "animate-pulse ring-2 ring-red-500 ring-inset bg-red-50"
        )}
      >
        <div className="flex items-center">
          {(item.type === "Summary" || item.type === "WBS") && (
            <button
              type="button"
              className="mr-1 h-5 w-5 flex items-center justify-center"
              onClick={toggleExpand}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : hasExpandableContent || wpCountOnItem > 0 ? (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-300" />
              )}
            </button>
          )}
          {item.type !== "Summary" && item.type !== "WBS" && (
            <div className="mr-1 h-5 w-5"></div>
          )}
          
          <div className="ml-1" style={{ marginLeft: `${level * 16}px` }}>
            <div className={`font-medium text-sm ${
              item.type === "WorkPackage" ? "text-purple-800" : ""
            }`}>{item.name}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
        </div>
        
        <div className="text-sm">
          {item.code}
        </div>
        
        <div className="text-sm">
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            item.type === "Summary" || item.type === "WBS"
              ? "bg-blue-100 text-blue-800" 
              : item.type === "WorkPackage" 
                ? "bg-purple-100 text-purple-800" 
                : "bg-green-100 text-green-800"
          }`}>
            {item.type === "Summary" ? "SUMMARY" : item.type === "WBS" ? "WBS" : item.type === "WorkPackage" ? "WORKPACKAGE" : item.type}
          </span>
        </div>
        
        <div className="text-sm">
          {item.type !== "Activity" ? getBudgetDisplay() : "N/A"}
        </div>
        
        <div className="text-sm">
          {item.type !== "Activity" && formatCurrency(item.actualCost, projectCurrency)}
          {item.type === "Activity" && "N/A"}
        </div>
        
        <div className="text-sm">
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(100, Number(item.percentComplete))}%` }}
              ></div>
            </div>
            <span className="whitespace-nowrap">{formatPercent(item.percentComplete)}</span>
          </div>
          {item.type === "Activity" && item.actualStartDate && (
            <div className="text-xs text-gray-500 mt-0.5">
              Started: {formatShortDate(item.actualStartDate)}
            </div>
          )}
        </div>
        
        <div className="flex space-x-1">
          {/* Import Activities button - always visible for WorkPackage items */}
          {item.type === "WorkPackage" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsImportActivityModalOpen(true)}
                  >
                    <FileUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import Activities</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {isBudgetFinalized || isWbsFinalized ? (
            <span>
              {/* Keep space for layout consistency — structure locked */}
            </span>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(item)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Item</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {canHaveChildren && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onAddChild(item.id)}
                        disabled={hasWorkPackages}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {hasWorkPackages
                          ? "Remove work packages before adding child WBS"
                          : `Add Child WBS (max ${MAX_WBS_LEVEL} levels)`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {canAddWorkPackage && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsAddWorkPackageModalOpen(true)}
                        disabled={hasChildWbs}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {hasChildWbs
                          ? "Remove child WBS before adding work packages"
                          : "Add Work Package"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {!item.isTopLevel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={deleteWbsItem.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Item</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Child items with smooth transitions */}
      {isExpanded && (
        <div className="transition-all duration-300 ease-in-out overflow-hidden"
             style={{ 
               opacity: isLoading ? 0 : 1,
               maxHeight: isLoading ? '80px' : '2000px', // Allow space for skeleton while loading
               transform: isLoading ? 'translateY(-8px)' : 'translateY(0)'
             }}>
          {isLoading ? (
            <div className="py-2 ml-8 animate-pulse">
              <div className="grid grid-cols-[minmax(250px,_1fr)_repeat(6,_minmax(100px,_1fr))] px-4 py-2 border-b border-gray-100">
                <Skeleton className="h-6 w-full ml-4" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="grid grid-cols-[minmax(250px,_1fr)_repeat(6,_minmax(100px,_1fr))] px-4 py-2 border-b border-gray-100">
                <Skeleton className="h-6 w-full ml-4" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {/* Work Packages Display - Show FIRST, directly under parent WBS */}
              {workPackages.length > 0 && (
                <div className="space-y-1">
                  {workPackages.map((wp) => (
                    <WorkPackageItem
                      key={wp.id}
                      workPackage={wp}
                      projectId={projectId}
                      level={level + 1}
                      projectCurrency={projectCurrency}
                      onEdit={() => {
                        setSelectedWorkPackageId(wp.id);
                        setIsEditWorkPackageModalOpen(true);
                      }}
                      onDelete={async () => {
                        try {
                          await apiRequest("DELETE", `/api/work-packages/${wp.id}`);
                          queryClient.invalidateQueries({ queryKey: [`/api/wbs/${item.id}/work-packages`] });
                          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
                          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
                          toast({
                            title: "Work Package Deleted",
                            description: "The work package has been deleted successfully.",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to delete work package.",
                            variant: "destructive",
                          });
                        }
                      }}
                      isBudgetFinalized={isBudgetFinalized || isWbsFinalized}
                    />
                  ))}
                </div>
              )}
              
              {/* Child WBS Items - Show AFTER work packages */}
              {childItems.length > 0 && (
                childItems.map(childItem => (
                  <TreeItem
                    key={childItem.id}
                    item={childItem}
                    projectId={projectId}
                    level={level + 1}
                    onAddChild={onAddChild}
                    onRefresh={onRefresh}
                    onUpdateProgress={onUpdateProgress}
                    onEdit={onEdit}
                    isExpanded={isExpanded && !!expandedItems?.[childItem.id]}
                    onToggleExpand={onToggleExpand}
                    budgetInfo={budgetInfo}
                    isBudgetFinalized={isBudgetFinalized}
                    loadingItems={loadingItems}
                    expandedItems={expandedItems}
                    flashingIds={flashingIds}
                    isWbsFinalized={isWbsFinalized}
                    allWbsItems={allWbsItems}
                    projectWorkPackages={projectWorkPackages}
                  />
                ))
              )}
              
              {/* Show message only if no children and no work packages */}
              {childItems.length === 0 && workPackages.length === 0 && (
                <div className="text-sm text-gray-500 py-2 px-4 pl-12" style={{ paddingLeft: `${(level + 2) * 16 + 24}px` }}>
                  No child items found. Click the + button to add one.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the WBS item "{item.name}" and all its children. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteWbsItem.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteWbsItem.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="progress">Progress Percentage</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            </div>
            
            {/* Only show date fields for Activity items */}
            {item.type === "Activity" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="actual-end-date">Actual End Date</Label>
                  <DatePicker
                    date={selectedDate}
                    setDate={(date) => setSelectedDate(date ? date : undefined)}
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsProgressDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleProgressSubmit}
              disabled={updateProgress.isPending}
            >
              {updateProgress.isPending && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Activity Modal */}
      <ImportActivityModal
        isOpen={isImportActivityModalOpen}
        onClose={() => setIsImportActivityModalOpen(false)}
        projectId={projectId}
        workPackageId={item.id}
      />

      {/* Add Work Package Modal */}
      <AddWorkPackageModal
        isOpen={isAddWorkPackageModalOpen}
        onClose={() => setIsAddWorkPackageModalOpen(false)}
        projectId={projectId}
        wbsItemId={item.id}
        wbsItemName={item.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/wbs/${item.id}/work-packages`] });
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
          onRefresh();
        }}
      />

      {/* Edit Work Package Modal */}
      <EditWorkPackageModal
        workPackageId={selectedWorkPackageId}
        isOpen={isEditWorkPackageModalOpen}
        onOpenChange={(open) => {
          setIsEditWorkPackageModalOpen(open);
          if (!open) setSelectedWorkPackageId(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/wbs/${item.id}/work-packages`] });
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
          onRefresh();
        }}
      />
    </>
  );
}

// Work Package Item Component
interface WorkPackageItemProps {
  workPackage: WorkPackage;
  projectId: number;
  level: number;
  projectCurrency: string;
  onEdit: () => void;
  onDelete: () => void;
  isBudgetFinalized: boolean;
}

function WorkPackageItem({
  workPackage,
  projectId,
  level,
  projectCurrency,
  onEdit,
  onDelete,
  isBudgetFinalized
}: WorkPackageItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-[minmax(250px,_1fr)_repeat(6,_minmax(100px,_1fr))] px-4 py-2 hover:bg-blue-100/50 border-b border-gray-200 bg-blue-50/50 rounded-md mx-2 my-1 shadow-sm">
        <div className="flex items-center">
          <div className="ml-1" style={{ marginLeft: `${level * 16}px` }}>
            <div className="font-semibold text-xs uppercase tracking-wider text-gray-800" style={{ letterSpacing: '0.1em' }}>
              {workPackage.name.toUpperCase()}
            </div>
            {workPackage.description && (
              <div className="text-xs text-gray-600 mt-0.5">{workPackage.description}</div>
            )}
          </div>
        </div>
        
        <div className="text-xs">
          {workPackage.code}
        </div>
        
        <div className="text-xs">
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 uppercase">
            WP
          </span>
        </div>
        
        <div className="text-xs">
          {formatCurrency(workPackage.budgetedCost, projectCurrency)}
        </div>
        
        <div className="text-xs">
          {formatCurrency(workPackage.actualCost, projectCurrency)}
        </div>
        
        <div className="text-xs">
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, Number(workPackage.percentComplete))}%` }}
              ></div>
            </div>
            <span className="whitespace-nowrap text-xs">{formatPercent(workPackage.percentComplete)}</span>
          </div>
        </div>
        
        <div className="flex space-x-1">
          {!isBudgetFinalized && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onEdit}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Work Package</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-600"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete Work Package</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Work Package "{workPackage.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete();
                setIsDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
