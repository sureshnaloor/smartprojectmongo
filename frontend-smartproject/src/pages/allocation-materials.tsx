import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialAllocationRow {
  allocationId: number;
  projectId: number;
  projectName: string;
  wpId: number;
  wpCode: string;
  wpName: string;
  quantity: number;
}

interface PoLineDetail {
  id: number;
  lineNumber: number;
  itemDescription: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  totalPrice: string;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  projectId: number | null;
  wpId: number | null;
}

interface MaterialPurchaseOrder {
  poId: number;
  poNumber: string;
  poDate: string;
  vendor: string;
  remarks: string | null;
  lines: PoLineDetail[];
}

interface MaterialWithAllocation {
  id: number;
  materialCode: string;
  materialDescription: string;
  uom: string;
  materialType: string;
  materialGroup: string;
  materialClass: string;
  baseRate: string | number;
  totalQuantityRequired: number;
  allocations: MaterialAllocationRow[];
  purchaseOrders?: MaterialPurchaseOrder[];
}

interface AllocationMaterialsResponse {
  materials: MaterialWithAllocation[];
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const s = n.toFixed(2).replace(/\.?0+$/, "");
  return s === "" ? "0" : s;
}

export default function AllocationMaterials() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [excludeNotRequired, setExcludeNotRequired] = useState(false);
  const [poModalMaterial, setPoModalMaterial] = useState<MaterialWithAllocation | null>(null);

  const { data, isLoading, isError, error } = useQuery<AllocationMaterialsResponse>({
    queryKey: ["/api/allocation/materials"],
    queryFn: async () => {
      const res = await fetch("/api/allocation/materials");
      if (!res.ok) throw new Error("Failed to load allocation data");
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const projectNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  const materialsAll = data?.materials ?? [];
  const materials = useMemo(() => {
    if (!excludeNotRequired) return materialsAll;
    return materialsAll.filter(
      (m) => m.allocations.length > 0 && m.totalQuantityRequired > 0
    );
  }, [materialsAll, excludeNotRequired]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 min-w-0 bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2 text-zinc-900 min-w-0">
            <Package className="h-6 w-6 text-teal-600 shrink-0" />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">Materials allocation</h1>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
                Every material from the global master, with total quantity required across all work packages and a
                breakdown by project and work package.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <Label
              htmlFor="exclude-not-required"
              className="text-xs font-medium text-zinc-600 cursor-pointer whitespace-nowrap"
            >
              Exclude materials not required
            </Label>
            <Switch
              id="exclude-not-required"
              checked={excludeNotRequired}
              onCheckedChange={setExcludeNotRequired}
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-zinc-800">Material requirements</CardTitle>
            {excludeNotRequired && !isLoading && (
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                Showing {materials.length} of {materialsAll.length}
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {isError && (
              <p className="text-sm text-red-600">
                {error instanceof Error ? error.message : "Could not load materials allocation."}
              </p>
            )}
            {!isLoading && !isError && (
              <div className="rounded-md border border-zinc-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                      <TableHead className="w-10" />
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Code
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 min-w-[180px]">
                        Description
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        UOM
                      </TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Total qty required
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 text-center">
                        WPs
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 text-center w-[72px]">
                        PO
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m) => {
                      const hasWp = m.allocations.length > 0;
                      const open = expanded.has(m.id);
                      return (
                        <Fragment key={m.id}>
                          <TableRow className={cn(open && "bg-zinc-50/50")}>
                            <TableCell className="align-middle py-2">
                              {hasWp ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggle(m.id)}
                                  aria-expanded={open}
                                >
                                  {open ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <span className="inline-block w-8" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-800">{m.materialCode}</TableCell>
                            <TableCell className="text-xs text-zinc-700 max-w-md">{m.materialDescription}</TableCell>
                            <TableCell className="text-xs text-zinc-600">{m.uom}</TableCell>
                            <TableCell className="text-right text-xs font-semibold tabular-nums text-zinc-900">
                              {formatQty(m.totalQuantityRequired)}
                            </TableCell>
                            <TableCell className="text-center text-xs text-zinc-600 tabular-nums">
                              {m.allocations.length}
                            </TableCell>
                            <TableCell className="text-center py-1">
                              {(m.purchaseOrders?.length ?? 0) > 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[10px] font-semibold gap-1"
                                  onClick={() => setPoModalMaterial(m)}
                                  title="View purchase orders"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  PO
                                </Button>
                              ) : (
                                <span className="text-zinc-300 text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {open && hasWp && (
                            <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
                              <TableCell colSpan={7} className="p-0 border-t border-zinc-100">
                                <div className="px-4 py-3 pl-12">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                                    Work package breakdown
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent border-zinc-200">
                                        <TableHead className="text-[10px] h-8">Project</TableHead>
                                        <TableHead className="text-[10px] h-8">WP code</TableHead>
                                        <TableHead className="text-[10px] h-8">Work package</TableHead>
                                        <TableHead className="text-right text-[10px] h-8">Quantity</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {m.allocations.map((a) => (
                                        <TableRow key={a.allocationId} className="border-zinc-100">
                                          <TableCell className="text-xs py-1.5 text-zinc-800">
                                            {a.projectName}
                                          </TableCell>
                                          <TableCell className="text-xs py-1.5 font-mono text-zinc-700">
                                            {a.wpCode}
                                          </TableCell>
                                          <TableCell className="text-xs py-1.5 text-zinc-700">{a.wpName}</TableCell>
                                          <TableCell className="text-xs py-1.5 text-right font-medium tabular-nums">
                                            {formatQty(a.quantity)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                {materials.length === 0 && (
                  <p className="text-sm text-zinc-500 p-4 text-center">
                    {excludeNotRequired && materialsAll.length > 0
                      ? "No materials match the current filter (all are unallocated or zero quantity)."
                      : "No materials in master."}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!poModalMaterial} onOpenChange={(open) => !open && setPoModalMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 pr-14">
            <DialogTitle className="text-base">Purchase orders</DialogTitle>
            {poModalMaterial && (
              <p className="text-xs text-zinc-500 font-normal pt-1">
                <span className="font-mono text-zinc-700">{poModalMaterial.materialCode}</span>
                {" — "}
                {poModalMaterial.materialDescription}
              </p>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[calc(85vh-8rem)] px-6 pb-6">
            {poModalMaterial?.purchaseOrders?.map((po) => (
              <div
                key={po.poId}
                className="mb-6 last:mb-0 rounded-lg border border-zinc-200 bg-white overflow-hidden"
              >
                <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="font-bold text-zinc-900">{po.poNumber}</span>
                  <span className="text-zinc-600">Date: {po.poDate}</span>
                  <span className="text-zinc-600">Vendor: {po.vendor}</span>
                </div>
                {po.remarks ? (
                  <p className="text-[11px] text-zinc-500 px-3 py-1 border-b border-zinc-100">
                    Remarks: {po.remarks}
                  </p>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] h-8 w-10">#</TableHead>
                      <TableHead className="text-[10px] h-8">Description</TableHead>
                      <TableHead className="text-[10px] h-8 text-right">Qty</TableHead>
                      <TableHead className="text-[10px] h-8">UOM</TableHead>
                      <TableHead className="text-[10px] h-8 text-right">Unit</TableHead>
                      <TableHead className="text-[10px] h-8 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs py-1.5 tabular-nums">{line.lineNumber}</TableCell>
                        <TableCell className="text-xs py-1.5 text-zinc-700 max-w-[200px]">
                          {line.itemDescription}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-xs py-1.5">{line.unitOfMeasure}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums">{line.unitPrice}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right font-medium tabular-nums">
                          {line.totalPrice}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {po.lines.some((l) => l.projectId != null || l.wpId != null) ? (
                  <div className="px-3 py-2 bg-zinc-50/80 border-t border-zinc-100 text-[10px] text-zinc-600 space-y-1">
                    <p className="font-semibold text-zinc-700 uppercase tracking-wide">Project / WP on line</p>
                    {po.lines
                      .filter((line) => line.projectId != null || line.wpId != null)
                      .map((line) => (
                        <div key={`meta-${line.id}`} className="flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="text-zinc-500">Line {line.lineNumber}:</span>
                          {line.projectId != null && (
                            <span>
                              Project: {projectNameById.get(line.projectId) ?? `#${line.projectId}`}
                            </span>
                          )}
                          {line.wpId != null && <span>WP id: {line.wpId}</span>}
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
