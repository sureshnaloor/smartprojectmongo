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
import { ChevronDown, ChevronRight, HardHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeResourceMapper } from "@/components/project/employee-resource-mapper";
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

type ManpowerAssignment = AssignmentCalendarItem;

interface MappedEmployeeRow {
  employee: {
    id: number;
    employeeNumber: string;
    empFirstName: string;
    empMiddleName: string | null;
    empLastName: string;
    empPosition: string;
  };
  resource: {
    id: number;
    name: string;
    unitOfMeasure: string;
    unitRate: string;
  } | null;
  assignments: ManpowerAssignment[];
}

interface AllocationManpowerResponse {
  mapped: MappedEmployeeRow[];
  unmapped: MappedEmployeeRow["employee"][];
}

function employeeDisplayName(e: MappedEmployeeRow["employee"]): string {
  const mid = e.empMiddleName ? ` ${e.empMiddleName}` : "";
  return `${e.empFirstName}${mid} ${e.empLastName}`.trim();
}

export default function AllocationManpower() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const invalidateAllocation = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/allocation/manpower"] });
  };

  const { data, isLoading, isError, error } = useQuery<AllocationManpowerResponse>({
    queryKey: ["/api/allocation/manpower"],
    queryFn: async () => {
      const res = await fetch("/api/allocation/manpower");
      if (!res.ok) throw new Error("Failed to load manpower allocation");
      return res.json();
    },
  });

  const mapped = data?.mapped ?? [];
  const unmapped = data?.unmapped ?? [];
  const tagLookup = useMemo(
    () =>
      buildAssignmentTagLookup({
        rows: mapped,
        getEntityId: (row) => row.employee.id,
        getResourceId: (row) => row.resource?.id ?? null,
        getAssignments: (row) => row.assignments,
      }),
    [mapped]
  );
  const utilizationRows = useMemo(
    () =>
      mapped.map((row) => ({
        entityId: row.employee.id,
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
    <div className="flex-1 min-w-0">
      <div className="cp-page-title-bar">
        <div className="flex min-w-0 items-center gap-3 text-[var(--text-primary)]">
          <HardHat className="cp-page-title-bar__icon h-6 w-6 shrink-0" />
          <div>
            <h1 className="cp-heading-lg">Manpower allocation</h1>
            <p className="mt-0.5 max-w-2xl kanban-body-sm text-[var(--text-secondary)]">
              Employees mapped to global manpower resources appear with work package assignments across projects.
              Map remaining employees to a manpower resource from the section below.
            </p>
          </div>
        </div>
      </div>

      <div className="cp-page-body">
        <Tabs defaultValue="allocation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="utilization">Resource utilization</TabsTrigger>
          </TabsList>
          <TabsContent value="allocation" className="space-y-8">
        <Card className="border-[var(--border-subtle)] shadow-[var(--shadow-md)]">
          <CardHeader className="pb-3">
            <CardTitle className="cp-heading-md text-[var(--text-primary)]">Mapped to manpower resources</CardTitle>
            <p className="kanban-body-sm font-normal text-[var(--text-secondary)]">
              Assignments come from project resources (manpower) on work packages. Calendar highlights planned
              date ranges.
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
                {error instanceof Error ? error.message : "Could not load manpower allocation."}
              </p>
            )}
            {!isLoading && !isError && (
              <div className="rounded-md border border-zinc-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                      <TableHead className="w-10" />
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Emp #
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 min-w-[160px]">
                        Name
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Position
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 min-w-[140px]">
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
                      const e = row.employee;
                      const hasWp = row.assignments.length > 0;
                      const open = expanded.has(e.id);
                      return (
                        <Fragment key={e.id}>
                          <TableRow className={cn(open && "bg-zinc-50/50")}>
                            <TableCell className="align-middle py-2">
                              {hasWp ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggle(e.id)}
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
                            <TableCell className="font-mono text-xs text-zinc-800">{e.employeeNumber}</TableCell>
                            <TableCell className="text-xs text-zinc-800">{employeeDisplayName(e)}</TableCell>
                            <TableCell className="text-xs text-zinc-600">{e.empPosition}</TableCell>
                            <TableCell className="text-xs text-zinc-700">
                              {row.resource?.name ?? "—"}
                            </TableCell>
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
                              <EmployeeResourceMapper
                                employeeId={e.id}
                                employeeName={employeeDisplayName(e)}
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
                                          <TableHead className="text-[10px] h-8">Activity</TableHead>
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
                                          <TableRow
                                            key={a.projectResourceId}
                                            className={cn(
                                              "border-zinc-100",
                                              a.hasDeficiency && "bg-red-50/80"
                                            )}
                                          >
                                            <TableCell className="text-xs py-1.5 text-zinc-800">
                                              {a.projectName}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 font-mono text-zinc-700">
                                              {a.wpCode}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-zinc-700">{a.wpName}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-zinc-600">
                                              {a.activityName ?? "—"}
                                              {a.hasDeficiency && (
                                                <span className="block text-[10px] text-red-700 font-semibold">
                                                  Short {a.maxShortfall ?? 0}
                                                </span>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-right tabular-nums">
                                              {a.quantity}
                                            </TableCell>
                                            <TableCell className="text-xs py-1.5 text-zinc-700">
                                              {resolveAssignmentTag(tagLookup, row.resource?.id ?? null, e.id, a)}
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
                                    emptyDateHint="No planned start/end dates on work package assignments. Set dates in Project → Resources for this manpower resource on each work package."
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
                  <p className="text-sm text-zinc-500 p-4 text-center">No employees mapped to manpower resources yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border-subtle)] border-dashed shadow-[var(--shadow-md)]">
          <CardHeader className="pb-3">
            <CardTitle className="cp-heading-md text-[var(--text-primary)]">Not mapped to a manpower resource</CardTitle>
            <p className="kanban-body-sm font-normal text-[var(--text-secondary)]">
              Use <span className="font-medium text-[var(--text-primary)]">Map Resource</span> to link an employee to a global
              manpower resource (same as Employee Master).
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
                        Emp #
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">Name</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600">
                        Position
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 text-right">
                        Map to resource
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmapped.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.employeeNumber}</TableCell>
                        <TableCell className="text-xs text-zinc-800">{employeeDisplayName(e)}</TableCell>
                        <TableCell className="text-xs text-zinc-600">{e.empPosition}</TableCell>
                        <TableCell className="text-right">
                          <EmployeeResourceMapper
                            employeeId={e.id}
                            employeeName={employeeDisplayName(e)}
                            onMappingChanged={invalidateAllocation}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {unmapped.length === 0 && (
                  <p className="text-sm text-zinc-500 p-4 text-center">All employees are mapped.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="utilization">
            <ResourceUtilizationPanel
              rows={utilizationRows}
              emptyHint="No mapped manpower resources with assignment data yet."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
