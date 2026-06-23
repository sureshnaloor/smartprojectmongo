import type { ColumnId } from "./constants";

export interface KanbanCardItem {
  id: string;
  title: string;
  description?: string;
  priority?: string | null;
  wbsItemId?: number;
  wbsLabel?: string;
  projectActivityId?: number;
  activityLabel?: string;
}

export interface Lane {
  id: ColumnId;
  title: string;
  cards: KanbanCardItem[];
}

export interface KanbanBoard {
  lanes: Lane[];
}

export interface ColumnLimits {
  wish?: number;
  ready?: number;
  doing?: number;
  done?: number;
}

export interface AutomationRules {
  markActivityCompleteOnDone: boolean;
  moveOverdueToTop: boolean;
  autoCreateCardOnWbsActivity: boolean;
}

export const DEFAULT_AUTOMATION: AutomationRules = {
  markActivityCompleteOnDone: true,
  moveOverdueToTop: false,
  autoCreateCardOnWbsActivity: true,
};
