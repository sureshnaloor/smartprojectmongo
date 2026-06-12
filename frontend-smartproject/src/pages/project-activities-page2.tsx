import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PertChart } from "@/components/project/pert-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Calendar, PlayCircle, Clock, CheckCircle2 } from "lucide-react";

interface ProjectActivity {
  id: number;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  unitRate: string;
  quantity: string;
  plannedFromDate: string | null;
  plannedToDate: string | null;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  actualStartDate: string | null;
  actualToDate: string | null;
  remarks: string | null;
}

interface CategorizedActivities {
  currentlyPlanned: ProjectActivity[];
  inProgress: ProjectActivity[];
  pending: ProjectActivity[];
  completed: ProjectActivity[];
}

export default function ProjectActivitiesPage2() {
  const { projectId } = useParams();

  const { data, isLoading, error } = useQuery<CategorizedActivities>({
    queryKey: ["project-activities-categorized", projectId],
    queryFn: () => get(`/projects/${projectId}/activities/categorized`),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading activities: {error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    currentlyPlanned = [],
    inProgress = [],
    pending = [],
    completed = [],
  } = data || {};

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Activities Overview</h1>
        <p className="text-gray-600 mt-1">View all activities organized by status and timeline</p>
      </div>

      {/* Section 1: Currently Planned Activities (PERT Chart) */}
      <div>
        <PertChart activities={currentlyPlanned} />
      </div>

      {/* Section 2: Activities In Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-blue-500" />
            <CardTitle>Activities In Progress</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {inProgress.length}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Activities that have started but are not yet completed
          </p>
        </CardHeader>
        <CardContent>
          {inProgress.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <PlayCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No activities in progress at this time.</p>
              <p className="text-sm mt-2">Activities with actual start dates will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Planned Dates</TableHead>
                  <TableHead>Actual Start</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inProgress.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {activity.description || "-"}
                    </TableCell>
                    <TableCell>
                      {activity.plannedFromDate && activity.plannedToDate ? (
                        <div className="text-sm">
                          <div>{format(new Date(activity.plannedFromDate), "MMM d, yyyy")}</div>
                          <div className="text-gray-500">to</div>
                          <div>{format(new Date(activity.plannedToDate), "MMM d, yyyy")}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not planned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.actualStartDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>{format(new Date(activity.actualStartDate), "MMM d, yyyy")}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.quantity} {activity.unitOfMeasure}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-blue-500">
                        In Progress
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Pending Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <CardTitle>Pending Activities</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {pending.length}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Activities that were planned to start but have not yet begun
          </p>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No pending activities.</p>
              <p className="text-sm mt-2">Activities past their planned start date will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Planned Start</TableHead>
                  <TableHead>Planned End</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((activity) => {
                  const daysOverdue = activity.plannedFromDate
                    ? Math.max(0, Math.floor((new Date().getTime() - new Date(activity.plannedFromDate).getTime()) / (1000 * 60 * 60 * 24)))
                    : 0;

                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {activity.description || "-"}
                      </TableCell>
                      <TableCell>
                        {activity.plannedFromDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <span>{format(new Date(activity.plannedFromDate), "MMM d, yyyy")}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.plannedToDate ? (
                          format(new Date(activity.plannedToDate), "MMM d, yyyy")
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysOverdue > 7 ? "destructive" : "secondary"}>
                          {daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activity.quantity} {activity.unitOfMeasure}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Completed Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle>Completed Activities</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {completed.length}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Activities that have been completed
          </p>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No completed activities yet.</p>
              <p className="text-sm mt-2">Activities with completion dates will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Planned Dates</TableHead>
                  <TableHead>Actual Dates</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completed.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {activity.description || "-"}
                    </TableCell>
                    <TableCell>
                      {activity.plannedFromDate && activity.plannedToDate ? (
                        <div className="text-sm">
                          <div>{format(new Date(activity.plannedFromDate), "MMM d, yyyy")}</div>
                          <div className="text-gray-500">to</div>
                          <div>{format(new Date(activity.plannedToDate), "MMM d, yyyy")}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not planned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.actualStartDate && activity.actualToDate ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-green-500" />
                            <span>{format(new Date(activity.actualStartDate), "MMM d, yyyy")}</span>
                          </div>
                          <div className="text-gray-500">to</div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-green-500" />
                            <span>{format(new Date(activity.actualToDate), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.quantity} {activity.unitOfMeasure}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
