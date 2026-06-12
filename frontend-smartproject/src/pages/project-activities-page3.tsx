import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Calendar, GitCompare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlanVersionSummary {
  id: number;
  version: number;
  createdAt: string | null;
  activityCount: number;
  dependencyCount: number;
  startDate: string | null;
  endDate: string | null;
}

interface PlanVersionActivity {
  id: number;
  name: string;
  duration: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  float: number;
  es_date: string | null;
  ef_date: string | null;
  ls_date: string | null;
  lf_date: string | null;
  isCritical: boolean;
}

interface PlanVersionDependency {
  id?: number;
  projectId: number;
  predecessorId: number;
  successorId: number;
  type: string;
  lag: number;
}

interface PlanVersionDetail {
  id: number;
  projectId: number;
  version: number;
  createdAt: string | null;
  activities: PlanVersionActivity[];
  dependencies: PlanVersionDependency[];
}

export default function ProjectActivitiesPage3() {
  const { projectId } = useParams();
  const [primaryVersion, setPrimaryVersion] = useState<number | null>(null);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);

  const {
    data: versions,
    isLoading: isLoadingVersions,
    error: versionsError,
  } = useQuery<PlanVersionSummary[]>({
    queryKey: ["project-plan-versions", projectId],
    queryFn: () => get(`/projects/${projectId}/plan-versions`),
    enabled: !!projectId,
  });

  const {
    data: primaryDetail,
    isLoading: isLoadingPrimary,
  } = useQuery<PlanVersionDetail | null>({
    queryKey: ["project-plan-version-detail", projectId, primaryVersion],
    queryFn: () =>
      primaryVersion != null
        ? get(`/projects/${projectId}/plan-versions/${primaryVersion}`)
        : null,
    enabled: !!projectId && primaryVersion != null,
  });

  const {
    data: compareDetail,
    isLoading: isLoadingCompare,
  } = useQuery<PlanVersionDetail | null>({
    queryKey: ["project-plan-version-detail", projectId, compareVersion],
    queryFn: () =>
      compareVersion != null
        ? get(`/projects/${projectId}/plan-versions/${compareVersion}`)
        : null,
    enabled: !!projectId && compareVersion != null,
  });

  const handleSelectPrimary = (value: string) => {
    const v = parseInt(value, 10);
    setPrimaryVersion(Number.isNaN(v) ? null : v);
  };

  const handleSelectCompare = (value: string) => {
    const v = parseInt(value, 10);
    setCompareVersion(Number.isNaN(v) ? null : v);
  };

  if (isLoadingVersions) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (versionsError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>
                Error loading plan versions:{" "}
                {versionsError instanceof Error ? versionsError.message : "Unknown error"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const versionList = versions || [];

  if (versionList.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Plan Versions</h1>
          <p className="text-gray-600 mt-1">
            Once you run the plan for this project, each version of the schedule will appear here.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-8">
            <div className="flex flex-col items-center text-gray-500">
              <Calendar className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-base font-medium mb-1">No plan versions yet</p>
              <p className="text-sm text-center max-w-md">
                Use the Activity Plan tab to calculate the schedule. Each time you run it,
                a new plan version is stored and can be reviewed here without altering the baseline.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    try {
      return format(new Date(value), "MMM d, yyyy");
    } catch {
      return value;
    }
  };

  const computeComparisonSummary = () => {
    if (!primaryDetail || !compareDetail) return null;

    const aActs = new Map(primaryDetail.activities.map(a => [a.id, a]));
    const bActs = new Map(compareDetail.activities.map(a => [a.id, a]));

    let changedActivities = 0;
    for (const [id, a] of aActs) {
      const b = bActs.get(id);
      if (!b) continue;
      if (
        a.es !== b.es ||
        a.ef !== b.ef ||
        a.ls !== b.ls ||
        a.lf !== b.lf ||
        a.float !== b.float
      ) {
        changedActivities += 1;
      }
    }

    return {
      changedActivities,
      activitiesA: primaryDetail.activities.length,
      activitiesB: compareDetail.activities.length,
      depsA: primaryDetail.dependencies.length,
      depsB: compareDetail.dependencies.length,
    };
  };

  const comparison = computeComparisonSummary();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Plan Versions</h1>
        <p className="text-gray-600">
          View and compare saved schedule versions. Baseline dates stay in the activities table;
          each run of the planner creates a new version here.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80 pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionList.map(v => (
                    <TableRow
                      key={v.id}
                      className={
                        primaryVersion === v.version
                          ? "bg-indigo-50 cursor-pointer"
                          : "cursor-pointer"
                      }
                      onClick={() => setPrimaryVersion(v.version)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">V{v.version}</span>
                          {v.createdAt && (
                            <span className="text-xs text-gray-500">
                              {formatDate(v.createdAt)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600">
                          {v.startDate && v.endDate ? (
                            <>
                              {formatDate(v.startDate)} - {formatDate(v.endDate)}
                            </>
                          ) : (
                            "-"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-gray-600">
                          <span>{v.activityCount} activities</span>
                          <span>{v.dependencyCount} links</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Primary version</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={primaryVersion != null ? String(primaryVersion) : undefined}
                  onValueChange={handleSelectPrimary}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionList.map(v => (
                      <SelectItem key={v.id} value={String(v.version)}>
                        V{v.version} ({v.activityCount} activities)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingPrimary && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading version details...
                  </div>
                )}
                {primaryDetail && (
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline">Version V{primaryDetail.version}</Badge>
                      {primaryDetail.createdAt && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(primaryDetail.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      <span>{primaryDetail.activities.length} activities</span>
                      <span>{primaryDetail.dependencies.length} links</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4" />
                  Compare with
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={compareVersion != null ? String(compareVersion) : undefined}
                  onValueChange={handleSelectCompare}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional: select version to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionList.map(v => (
                      <SelectItem key={v.id} value={String(v.version)}>
                        V{v.version} ({v.activityCount} activities)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingCompare && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading comparison version...
                  </div>
                )}
                {primaryDetail && compareDetail && comparison && (
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant="outline">Primary V{primaryDetail.version}</Badge>
                      <Badge variant="outline">Compare V{compareDetail.version}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      <div>
                        <div className="text-[11px] uppercase text-gray-500">Activities</div>
                        <div>
                          {comparison.activitiesA} → {comparison.activitiesB}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-gray-500">Dependencies</div>
                        <div>
                          {comparison.depsA} → {comparison.depsB}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-gray-500">
                          Activities with timing changes
                        </div>
                        <div>{comparison.changedActivities}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {primaryDetail && (
            <Card>
              <CardHeader>
                <CardTitle>Activities in version V{primaryDetail.version}</CardTitle>
              </CardHeader>
              <CardContent>
                {primaryDetail.activities.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">
                    No activities stored for this version.
                  </div>
                ) : (
                  <ScrollArea className="h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>ES / EF</TableHead>
                          <TableHead>LS / LF</TableHead>
                          <TableHead>Float</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Critical</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {primaryDetail.activities.map(a => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{a.name}</span>
                                <span className="text-[11px] text-gray-500">ID {a.id}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              ES {a.es}, EF {a.ef}
                            </TableCell>
                            <TableCell className="text-xs">
                              LS {a.ls}, LF {a.lf}
                            </TableCell>
                            <TableCell className="text-xs">{a.float}</TableCell>
                            <TableCell className="text-xs">
                              {a.es_date && a.ef_date ? (
                                <>
                                  {formatDate(a.es_date)} - {formatDate(a.ef_date)}
                                </>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {a.isCritical ? (
                                <Badge variant="outline" className="border-red-400 text-red-600">
                                  Critical
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-gray-300 text-gray-600">
                                  Non-critical
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
