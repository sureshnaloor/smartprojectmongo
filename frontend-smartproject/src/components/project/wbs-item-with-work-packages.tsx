import { useQuery } from "@tanstack/react-query";
import { WorkPackage } from "@shared/schema";
import { Package, Edit2, Trash2, MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WbsItemWithWorkPackagesProps {
    wbsItemId: number;
    level: number;
    isExpanded: boolean;
    onEditWorkPackage: (id: number) => void;
    onDeleteWorkPackage: (id: number) => void;
    onWorkPackageClick?: (wpId: number) => void;
}

export function WbsItemWithWorkPackages({
    wbsItemId,
    level,
    isExpanded,
    onEditWorkPackage,
    onDeleteWorkPackage,
    onWorkPackageClick,
}: WbsItemWithWorkPackagesProps) {
    const { data: workPackages = [] } = useQuery<WorkPackage[]>({
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
        enabled: isExpanded && !!wbsItemId,
    });

    if (workPackages.length === 0) return null;

    return (
        <>
            {workPackages.map((wp) => (
                <div
                    key={wp.id}
                    className={cn(
                        "flex items-center justify-between py-2 px-4 hover:bg-blue-50 border-b border-blue-100 bg-blue-50/30 rounded-md mx-2 my-1",
                        onWorkPackageClick && "cursor-pointer"
                    )}
                    style={{ paddingLeft: `${(level + 1) * 32 + 16}px` }}
                    onClick={onWorkPackageClick ? () => onWorkPackageClick(wp.id) : undefined}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-2 h-2"></div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold uppercase tracking-wider text-gray-800" style={{ letterSpacing: '0.1em' }}>
                                {wp.name.toUpperCase()}
                            </div>
                            {wp.description && (
                                <div className="text-[10px] text-gray-600 mt-0.5">{wp.description}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                            <DropdownMenuContent className="bg-white border-slate-200 shadow-xl min-w-40">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditWorkPackage(wp.id);
                                    }}
                                    className="text-xs font-semibold text-slate-700 focus:bg-slate-50 cursor-pointer px-3 py-2"
                                >
                                    <Edit2 size={14} className="mr-2" />
                                    Edit Work Package
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteWorkPackage(wp.id);
                                    }}
                                    className="text-xs font-semibold text-red-600 focus:bg-red-50 cursor-pointer px-3 py-2"
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete Work Package
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            ))}
        </>
    );
}

