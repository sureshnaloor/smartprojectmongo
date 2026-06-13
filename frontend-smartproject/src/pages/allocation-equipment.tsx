import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { EquipmentResourceMapper } from "@/components/project/equipment-resource-mapper";
import {
  AssignmentMonthCalendar,
  type AssignmentCalendarItem,
} from "@/components/allocation/assignment-month-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildAssignmentTagLookup,
  resolveAssignmentTag,
} from "@/components/allocation/allocation-tagging";
import { ResourceUtilizationPanel } from "@/components/allocation/resource-utilization-panel";

interface MappedRow {
  equipment: {
    id: number;
    equipmentNumber: string;
    equipmentName: string;
    equipmentType: string;
  };
  resource: {
    id: number;
    name: string;
    unitOfMeasure: string;
    unitRate: string;
  } | null;
  assignments: AssignmentCalendarItem[];
}

interface AllocationEquipmentResponse {
  mapped: MappedRow[];
  unmapped: MappedRow["equipment"][];
}

export default function AllocationEquipment() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const invalidateAllocation = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/allocation/equipment"] });
  };

  const { data, isLoading, isError, error } = useQuery<AllocationEquipmentResponse>({
    queryKey: ["/api/allocation/equipment"],
    queryFn: async () => {
      const res = await fetch("/api/allocation/equipment");
      if (!res.ok) throw new Error("Failed to load equipment allocation");
      return res.json();
    },
  });

  const mapped = data?.mapped ?? [];
  const unmapped = data?.unmapped ?? [];
  const tagLookup = useMemo(
    () =>
      buildAssignmentTagLookup({
        rows: mapped,
        getEntityId: (row) => row.equipment.id,
        getResourceId: (row) => row.resource?.id ?? null,
        getAssignments: (row) => row.assignments,
      }),
    [mapped]
  );
  const utilizationRows = useMemo(
    () =>
      mapped.map((row) => ({
        entityId: row.equipment.id,
        resourceId: row.resource?.id ?? null,
        resourceName: row.resource?.name ?? "Unknown",
        assignments: row.assignments,
      })),
    [mapped]
  );

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
        <div className="flex items-center gap-2 text-zinc-900 min-w-0">
          <Wrench className="h-6 w-6 text-teal-600 shrink-0" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Equipment allocation</h1>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
              Owned equipment mapped to global equipment resources, with work package assignments. Map remaining
              items below.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <Tabs defaultValue="allocation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="utilization">Resource utilization</TabsTrigger>
          </TabsList>
          <TabsContent value="allocation" className="space-y-8">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-zinc-800">Mapped to equipment resources</CardTitle>
            <p className="text-xs text-zinc-500 font-normal">
              Assignments come from project resources (equipment) on work packages.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {isError && (
              <p className="text-sm text-red-600">
                {error instanceof Error ? error.message : "Could not load equipment allocation."}
              </p>
            )}
            {!isLoading && !isError && (
              <div className="rounded-md border border-zinc-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                      <TableHead className="w-10" />
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Equip #
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 min-w-[140px]">
                        Name
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">Type</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 min-w-[120px]">
                        Resource
                      </TableHead>
                      <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        WPs
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 w-[120px]">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 w-[100px]">
                        Map
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapped.map((row) => {
                      const eq = row.equipment;
                      const hasWp = row.assignments.length > 0;
                      const open = expanded.has(eq.id);
                      return (
                        <Fragment key={eq.id}>
                          <TableRow className={cn(open && "bg-zinc-50/50")}>
                            <TableCell className="align-middle py-2">
                              {hasWp ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggle(eq.id)}
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
                            <TableCell className="font-mono text-xs text-zinc-800">{eq.equipmentNumber}</TableCell>
                            <TableCell className="text-xs text-zinc-800">{eq.equipmentName}</TableCell>
                            <TableCell className="text-xs text-zinc-600">{eq.equipmentType}</TableCell>
                            <TableCell className="text-xs text-zinc-700">{row.resource?.name ?? "—"}</TableCell>
                            <TableCell className="text-center text-xs tabular-nums text-zinc-600">
                              {row.assignments.length}
                            </TableCell>
                            <TableCell className="py-1">
                              {!hasWp ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-semibold border-amber-300 text-amber-800 bg-amber-50/80 pointer-events-none"
                                  disabled
                                >
                                  Unassigned
                                </Button>
                              ) : (
                                <span className="text-[10px] text-teal-700 font-medium">Assigned</span>
                              )}
                            </TableCell>
                            <TableCell className="py-1">
                              <EquipmentResourceMapper
                                equipmentId={eq.id}
                                equipmentName={eq.equipmentName}
                                onMappingChanged={invalidateAllocation}
                              />
                            </TableCell>
                          </TableRow>
                          {open && hasWp && (
                            <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
                              <TableCell colSpan={8} className="p-0 border-t border-zinc-100">
                                <div className="px-4 py-4 pl-12 space-y-4">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                                      Work packages &amp; dates
                                    </p>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent border-zinc-200">
                                          <TableHead className="text-[10px] h-8">Project</TableHead>
                                          <TableHead className="text-[10px] h-8">WP code</TableHead>
                                          <TableHead className="text-[10px] h-8">Work package</TableHead>
                                          <TableHead className="text-[10px] h-8 text-right">Qty</TableHead>
                                          <TableHead className="text-[10px] h-8">Tag</TableHead>
                                          <TableHead className="text-[10px] h-8">Start</TableHead>
                                          <TableHead className="text-[10px] h-8">End</TableHead>
                                          <TableHead className="text-[10px] h-8 text-right">Work days</TableHead>
                                          <TableHead className="text-[10px] h-8 text-right">Res-hrs</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {row.assignments.map((a) => (
                                          <TableRow key={a.projectResourceId} className="border-zinc-100">
                                            <TableCell className="text-xs py-1.5 text-zinc-800">{a.projectName}</TableCell>
                                            <TableCell className="text-xs py-1.5 font-mono text-zinc-700">
                                              {a.wpCode}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-zinc-700">{a.wpName}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-right tabular-nums">
                                              {a.quantity}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-zinc-700">
                                              {resolveAssignmentTag(tagLookup, row.resource?.id ?? null, eq.id, a)}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 tabular-nums">
                                              {a.plannedStartDate ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 tabular-nums">
                                              {a.plannedEndDate ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-right tabular-nums">
                                              {a.durationDays ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-right tabular-nums">
                                              {a.totalResourceHours ?? "—"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                  <AssignmentMonthCalendar
                                    assignments={row.assignments}
                                    emptyDateHint="No planned start/end dates on work package assignments. Set dates in Project → Resources for this equipment resource on each work package."
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                {mapped.length === 0 && (
                  <p className="text-sm text-zinc-500 p-4 text-center">
                    No equipment mapped to equipment resources yet.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-zinc-800">Not mapped to an equipment resource</CardTitle>
            <p className="text-xs text-zinc-500 font-normal">
              Use <span className="font-medium text-zinc-700">Map Resource</span> (same as Equipment Master).
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {!isLoading && !isError && (
              <div className="rounded-md border border-zinc-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Equip #
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">Name</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">Type</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 text-right">
                        Map to resource
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmapped.map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-mono text-xs">{eq.equipmentNumber}</TableCell>
                        <TableCell className="text-xs text-zinc-800">{eq.equipmentName}</TableCell>
                        <TableCell className="text-xs text-zinc-600">{eq.equipmentType}</TableCell>
                        <TableCell className="text-right">
                          <EquipmentResourceMapper
                            equipmentId={eq.id}
                            equipmentName={eq.equipmentName}
                            onMappingChanged={invalidateAllocation}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {unmapped.length === 0 && (
                  <p className="text-sm text-zinc-500 p-4 text-center">All equipment is mapped.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="utilization">
            <ResourceUtilizationPanel
              rows={utilizationRows}
              emptyHint="No mapped equipment resources with assignment data yet."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
