export type WbsActivitiesRightTab = "diagram" | "budget" | "resources" | "schedule";

export const RIGHT_PANE_TABS: {
  key: WbsActivitiesRightTab;
  label: string;
  countKey?: "resources";
}[] = [
  { key: "diagram", label: "Activity Network Diagram" },
  { key: "budget", label: "Budget Overview" },
  { key: "resources", label: "Resources Assigned", countKey: "resources" },
  { key: "schedule", label: "Schedule" },
];

export const DEFAULT_SPLIT_PERCENT = 40;
export const MIN_LEFT_PX = 320;
export const MAX_LEFT_PX = 520;
