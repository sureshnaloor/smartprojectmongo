import { useMemo } from "react";
import { format, addDays, differenceInDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectActivity {
  id: number;
  name: string;
  description: string | null;
  plannedFromDate: string | null;
  plannedToDate: string | null;
  actualStartDate: string | null;
  actualToDate: string | null;
}

interface PertChartProps {
  activities: ProjectActivity[];
}

export function PertChart({ activities }: PertChartProps) {
  // Calculate the date range for the chart (30-day window: 15 days before and after today)
  const today = startOfDay(new Date());
  const windowStart = addDays(today, -15);
  const windowEnd = addDays(today, 15);

  // Filter activities that have planned dates within the window
  const activitiesWithDates = useMemo(() => {
    return activities.filter((activity) => {
      if (!activity.plannedFromDate || !activity.plannedToDate) return false;
      
      const fromDate = startOfDay(new Date(activity.plannedFromDate));
      const toDate = startOfDay(new Date(activity.plannedToDate));
      
      // Check if activity overlaps with the window
      return (
        (fromDate >= windowStart && fromDate <= windowEnd) ||
        (toDate >= windowStart && toDate <= windowEnd) ||
        (fromDate <= windowStart && toDate >= windowEnd)
      );
    });
  }, [activities, windowStart, windowEnd]);

  // Calculate the total days in the window
  const totalDays = differenceInDays(windowEnd, windowStart) + 1;

  // Generate date headers for the timeline
  const dateHeaders = useMemo(() => {
    const headers: Date[] = [];
    for (let i = 0; i <= totalDays; i += 7) {
      // Show weekly markers
      const date = addDays(windowStart, i);
      if (date <= windowEnd) {
        headers.push(date);
      }
    }
    return headers;
  }, [windowStart, windowEnd, totalDays]);

  // Calculate position and width for each activity bar
  const getActivityPosition = (activity: ProjectActivity) => {
    if (!activity.plannedFromDate || !activity.plannedToDate) {
      return { left: 0, width: 0 };
    }

    const fromDate = startOfDay(new Date(activity.plannedFromDate));
    const toDate = startOfDay(new Date(activity.plannedToDate));

    // Clamp dates to window
    const startDate = fromDate < windowStart ? windowStart : fromDate;
    const endDate = toDate > windowEnd ? windowEnd : toDate;

    const daysFromStart = differenceInDays(startDate, windowStart);
    const duration = differenceInDays(endDate, startDate) + 1;

    const left = (daysFromStart / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left, width };
  };

  if (activitiesWithDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currently Planned Activities (30-Day Window)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No activities planned for the current 30-day window.</p>
            <p className="text-sm mt-2">Activities with planned dates will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currently Planned Activities (30-Day Window)</CardTitle>
        <p className="text-sm text-gray-600">
          Showing activities planned from {format(windowStart, "MMM d")} to {format(windowEnd, "MMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="relative min-h-[400px]">
            {/* Timeline header */}
            <div className="sticky top-0 bg-white z-10 border-b pb-2 mb-4">
              <div className="relative h-8">
                {dateHeaders.map((date, index) => {
                  const daysFromStart = differenceInDays(date, windowStart);
                  const left = (daysFromStart / totalDays) * 100;
                  return (
                    <div
                      key={index}
                      className="absolute border-l border-gray-300 h-full"
                      style={{ left: `${left}%` }}
                    >
                      <div className="absolute -bottom-6 left-0 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                        {format(date, "MMM d")}
                      </div>
                    </div>
                  );
                })}
                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: `${(15 / totalDays) * 100}%` }}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-red-600 whitespace-nowrap">
                    Today
                  </div>
                </div>
              </div>
            </div>

            {/* Activity bars */}
            <div className="space-y-3">
              {activitiesWithDates.map((activity) => {
                const { left, width } = getActivityPosition(activity);
                const hasStarted = activity.actualStartDate !== null;
                const isCompleted = activity.actualToDate !== null;

                return (
                  <div key={activity.id} className="relative h-12">
                    {/* Activity label */}
                    <div className="absolute left-0 w-48 pr-2 text-sm font-medium truncate">
                      {activity.name}
                    </div>

                    {/* Activity bar container */}
                    <div className="ml-48 relative h-full">
                      <div
                        className={`absolute h-8 top-1/2 -translate-y-1/2 rounded ${
                          isCompleted
                            ? "bg-green-500"
                            : hasStarted
                            ? "bg-blue-500"
                            : "bg-gray-400"
                        } opacity-80 hover:opacity-100 transition-opacity`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          minWidth: "2px",
                        }}
                        title={`${activity.name}\nPlanned: ${activity.plannedFromDate ? format(new Date(activity.plannedFromDate), "MMM d") : "N/A"} - ${activity.plannedToDate ? format(new Date(activity.plannedToDate), "MMM d") : "N/A"}`}
                      >
                        {/* Activity name on bar if wide enough */}
                        {width > 10 && (
                          <div className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                            {activity.name}
                          </div>
                        )}
                      </div>

                      {/* Date labels on bar ends if space allows */}
                      {width > 15 && activity.plannedFromDate && (
                        <div
                          className="absolute -top-5 text-xs text-gray-600 whitespace-nowrap"
                          style={{ left: `${left}%` }}
                        >
                          {format(new Date(activity.plannedFromDate), "MMM d")}
                        </div>
                      )}
                      {width > 15 && activity.plannedToDate && (
                        <div
                          className="absolute -top-5 text-xs text-gray-600 whitespace-nowrap"
                          style={{ left: `${left + width}%`, transform: "translateX(-100%)" }}
                        >
                          {format(new Date(activity.plannedToDate), "MMM d")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

