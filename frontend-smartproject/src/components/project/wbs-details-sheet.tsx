import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { WbsItem } from "@shared/schema";
import { Loader2, Calendar, DollarSign, Tag, Info, Layers } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface WbsDetailsSheetProps {
    wbsId: number | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WbsDetailsSheet({ wbsId, isOpen, onOpenChange }: WbsDetailsSheetProps) {
    const { data: wbsItem, isLoading } = useQuery<WbsItem>({
        queryKey: [`/api/wbs/${wbsId}`],
        queryFn: async () => {
            if (!wbsId) return null;
            const response = await fetch(`/api/wbs/${wbsId}`);
            if (!response.ok) throw new Error("Failed to fetch WBS item");
            return response.json();
        },
        enabled: !!wbsId && isOpen,
    });

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-2xl font-bold text-white">WBS Details</SheetTitle>
                    <SheetDescription className="text-slate-400">
                        Comprehensive metadata for the selected WBS item.
                    </SheetDescription>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : wbsItem ? (
                    <div className="mt-6 space-y-6">
                        {/* Header Info */}
                        <div>
                            <h3 className="text-lg font-semibold text-blue-400 mb-1">{wbsItem.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Tag size={14} />
                                <span>Code: {wbsItem.code}</span>
                                <Separator orientation="vertical" className="h-4 bg-slate-700" />
                                <Layers size={14} />
                                <span>Level {wbsItem.level}</span>
                            </div>
                        </div>

                        <Separator className="bg-slate-800" />

                        {/* Status & Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Type</span>
                                <div className="flex items-center gap-2 text-slate-200">
                                    <Info size={16} className="text-blue-500" />
                                    <span className="font-medium">{wbsItem.type}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Progress</span>
                                <div className="flex items-center gap-2 text-slate-200">
                                    <div className="w-full bg-slate-800 rounded-full h-2 mr-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${wbsItem.percentComplete}%` }}
                                        />
                                    </div>
                                    <span className="font-medium text-xs">{wbsItem.percentComplete}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Budgeted Cost</span>
                                <div className="flex items-center gap-2 text-green-400">
                                    <DollarSign size={16} />
                                    <span className="font-bold">${Number(wbsItem.budgetedCost).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Actual Cost</span>
                                <div className="flex items-center gap-2 text-slate-200">
                                    <DollarSign size={16} className="text-slate-500" />
                                    <span className="font-medium">${Number(wbsItem.actualCost).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-800" />



                        {/* Description */}
                        <div className="space-y-2">
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Description</span>
                            <p className="text-sm text-slate-400 leading-relaxed italic">
                                {wbsItem.description || "No description provided for this item."}
                            </p>
                        </div>

                        {/* Footer metadata */}
                        <div className="pt-6 border-t border-slate-800">
                            <div className="flex justify-between text-[10px] text-slate-600 uppercase tracking-widest">
                                <span>ID: {wbsItem.id}</span>
                                <span>Created: {format(new Date(wbsItem.createdAt!), "MMM yyyy")}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-12 text-center text-slate-500">
                        No data found for this WBS item.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
