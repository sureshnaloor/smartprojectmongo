import { useQuery } from "@tanstack/react-query";
import { WorkPackage } from "@shared/schema";
import { Edit2, Trash2, MoreVertical, DollarSign } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";

interface WbsItemWithWorkPackagesProps {
    wbsItemId: number;
    level: number;
    isExpanded: boolean;
    wbsFinalized?: boolean;
    budgetFinalized?: boolean;
    projectWorkPackages?: WorkPackage[];
    projectCurrency?: string;
    flashingZeroBudgetWpIds?: Set<number>;
    onEditWorkPackage: (id: number) => void;
    onDeleteWorkPackage: (id: number) => void;
    onEditWorkPackageBudget?: (wp: WorkPackage) => void;
    onWorkPackageClick?: (wpId: number) => void;
}

export function WbsItemWithWorkPackages({
    wbsItemId,
    level,
    isExpanded,
    wbsFinalized = false,
    budgetFinalized = false,
    projectWorkPackages,
    projectCurrency = "INR",
    flashingZeroBudgetWpIds,
    onEditWorkPackage,
    onDeleteWorkPackage,
    onEditWorkPackageBudget,
    onWorkPackageClick,
}: WbsItemWithWorkPackagesProps) {
    const { data: fetchedWorkPackages = [] } = useQuery<WorkPackage[]>({
        queryKey: [`/api/wbs/${wbsItemId}/work-packages`],
        queryFn: async () => {
            try {
                const response = await fetch(`/api/wbs/${wbsItemId}/work-packages`);
                if (!response.ok) return [];
                return await response.json();
            } catch (error) {
                console.error('Error fetching work packages:', error);
                return [];
            }
        },
        enabled: !projectWorkPackages && isExpanded && !!wbsItemId,
    });

    const workPackages = projectWorkPackages
        ? projectWorkPackages.filter((wp) => wp.wbsItemId === wbsItemId)
        : fetchedWorkPackages;

    const projectId = workPackages[0]?.projectId;

    const { data: projectActivities = [] } = useQuery<any[]>({
        queryKey: [`/api/projects/${projectId}/activities`],
        enabled: !!projectId && isExpanded,
    });

    if (workPackages.length === 0) return null;

    return (
        <>
            {workPackages.map((wp) => {
                const isZeroBudgetFlashing = flashingZeroBudgetWpIds?.has(wp.id);

                const wpBudget = Number(wp.budgetedCost || 0);
                const wpActs = projectActivities.filter((a: any) => a.wpId === wp.id);
                const actBudgetSum = wpActs.reduce((sum: number, a: any) => {
                    const type = a.activityType || "units";
                    if (type === "units") {
                        const q = Number(a.quantity || 1);
                        const r = Number(a.unitRate || 0);
                        const t = Number(a.totalBudget || 0);
                        return sum + (t > 0 ? t : q * r);
                    }
                    return sum + Number(a.totalBudget || a.unitRate || 0);
                }, 0);

                const slack = wpBudget - actBudgetSum;
                const isNilActivity = wpActs.length === 0;
                const isNegativeSlack = slack < 0;
                const isZeroBudget = wpBudget <= 0;

                return (
                <div
                    key={wp.id}
                    className={cn(
                        "flex items-center justify-between py-2 px-4 border-b rounded-md mx-2 my-1 transition-all duration-300",
                        isZeroBudgetFlashing
                            ? "border-2 border-red-500 bg-red-100/90 dark:bg-red-950/60 ring-2 ring-red-400 animate-pulse shadow-md"
                            : "hover:bg-blue-50 border-blue-100 bg-blue-50/30",
                        onWorkPackageClick && "cursor-pointer"
                    )}
                    style={{ paddingLeft: `${(level + 1) * 32 + 16}px` }}
                    onClick={onWorkPackageClick ? () => onWorkPackageClick(wp.id) : undefined}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-2 h-2"></div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold uppercase tracking-wider text-gray-800 flex items-center gap-2 flex-wrap" style={{ letterSpacing: '0.1em' }}>
                                <span>{wp.name.toUpperCase()}</span>
                                {isZeroBudgetFlashing && (
                                    <span className="text-[10px] normal-case font-bold text-red-700 bg-red-200 border border-red-400 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                        {isZeroBudget ? "⚠ Budget > ₹0 Required" : isNilActivity ? "⚠ 0 Activities (NIL)" : "⚠ Negative Slack"}
                                    </span>
                                )}
                            </div>
                            {wp.description && (
                                <div className="text-[10px] text-gray-600 mt-0.5">{wp.description}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            title={`Budget: ${formatCurrency(wpBudget, projectCurrency)} | Activities: ${formatCurrency(actBudgetSum, projectCurrency)} | Slack: ${formatCurrency(slack, projectCurrency)}`}
                            className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded font-mono border",
                                isZeroBudget
                                    ? "text-red-700 bg-red-100 border-red-300"
                                    : isNilActivity
                                    ? "text-amber-800 bg-amber-100 border-amber-300"
                                    : isNegativeSlack
                                    ? "text-red-800 bg-red-200 border-red-400 font-bold"
                                    : "text-blue-700 bg-blue-50 border-blue-200"
                            )}
                        >
                            Slack: {formatCurrency(slack, projectCurrency)}
                        </span>
                        <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded font-mono border",
                            isZeroBudgetFlashing
                                ? "text-red-700 bg-red-200 border-red-400 font-bold"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200"
                        )}>
                            {formatCurrency(wpBudget, projectCurrency)}
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase">WP</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-all text-slate-400 hover:text-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical size={12} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border-slate-200 shadow-xl min-w-44">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={budgetFinalized}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!budgetFinalized && onEditWorkPackageBudget) {
                                            onEditWorkPackageBudget(wp);
                                        }
                                    }}
                                    className={cn(
                                        "text-xs font-semibold text-amber-800 focus:bg-amber-50 cursor-pointer px-3 py-2",
                                        budgetFinalized && "opacity-40 cursor-not-allowed text-slate-400"
                                    )}
                                >
                                    <DollarSign size={14} className="mr-2 text-amber-600" />
                                    Add/Edit Budget Values
                                </DropdownMenuItem>
                                {!wbsFinalized && (
                                    <>
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditWorkPackage(wp.id);
                                            }}
                                            className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer px-3 py-2"
                                        >
                                            <Edit2 size={14} className="mr-2" />
                                            Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteWorkPackage(wp.id);
                                            }}
                                            className="text-xs font-semibold text-red-600 focus:bg-red-50 cursor-pointer px-3 py-2"
                                        >
                                            <Trash2 size={14} className="mr-2" />
                                            Delete Item
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                );
            })}
        </>
    );
}
