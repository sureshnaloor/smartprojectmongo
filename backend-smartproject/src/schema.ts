import { z } from 'zod';
import { projectCurrencySchema } from "./currencies";

// Helper functions for date parsing (copied from original schema.ts)
const parseDateInput = (val: Date | string | number): Date | null => {
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null;
    // Excel serial date support (days since 1899-12-30)
    if (val >= 1 && val <= 60000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const dateFromSerial = new Date(excelEpoch + Math.trunc(val) * 86400000);
      return Number.isNaN(dateFromSerial.getTime()) ? null : dateFromSerial;
    }
    // Unix timestamp support (seconds or milliseconds)
    const timestampMs = val < 1e12 ? val * 1000 : val;
    const dateFromTimestamp = new Date(timestampMs);
    return Number.isNaN(dateFromTimestamp.getTime()) ? null : dateFromTimestamp;
  }

  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, MM-DD-YYYY
  const slashOrDashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashOrDashMatch) {
    const first = Number(slashOrDashMatch[1]);
    const second = Number(slashOrDashMatch[2]);
    const year = Number(slashOrDashMatch[3]);
    const dayFirst = first > 12;
    const month = dayFirst ? second : first;
    const day = dayFirst ? first : second;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDateString = (val: Date | string | number, fieldName: string, ctx: z.RefinementCtx): string => {
  const parsedDate = parseDateInput(val);
  if (!parsedDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
        message: `Invalid ${fieldName}`,
    });
    return z.NEVER;
  }
  return parsedDate.toISOString().split('T')[0];
};

// --- Users ---
export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  picture: z.string().optional().nullable(),
  provider: z.enum(['google', 'linkedin', 'email']),
  providerId: z.string(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: number; createdAt: Date; updatedAt: Date };

// --- Projects ---
export const insertProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  budget: z.string().or(z.number()).transform(val => val.toString()),
  currency: projectCurrencySchema,
  projectType: z.enum(['Highway', 'Infrastructure', 'Power', 'Commercial', 'Petrochem', 'Oil&Gas']).optional().nullable(),
  status: z.enum(['concept', 'planning', 'active', 'in progress', 'aborted', 'on-hold', 'completed']).optional().nullable(),
  startDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }).optional().nullable(),
  endDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }).optional().nullable(),
  allocationVersion: z.number().optional().nullable(),
  wbsFinalized: z.boolean().optional().default(false),
  planVersion: z.number().default(0),
  sequenceVersion: z.number().default(0),
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = InsertProject & { id: number; createdAt: Date };

export const extendedInsertProjectSchema = insertProjectSchema.extend({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  budget: z.string().or(z.number()).transform(val => val.toString()),
  startDate: z.coerce.date().transform(val => val.toISOString().split('T')[0]),
  endDate: z.coerce.date().transform(val => val.toISOString().split('T')[0]),
  currency: projectCurrencySchema.describe('Project currency'),
});

// --- WBS Items ---
export const baseWbsSchema = z.object({
  projectId: z.number(),
  parentId: z.number().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  level: z.number().optional(),
  code: z.string().optional(),
  type: z.enum(['Summary', 'WorkPackage', 'WBS', 'Activity']),
  budgetedCost: z.string().or(z.number()).transform(val => val.toString()),
  isTopLevel: z.boolean().optional(),
});
export const insertWbsItemSchema = baseWbsSchema
  .refine(
    (data) => {
      if (data.type === 'Summary' || data.type === 'WorkPackage' || data.type === 'WBS') {
        return data.budgetedCost !== undefined && parseFloat(data.budgetedCost) >= 0;
      }
      return true;
    },
    {
      message: 'Summary and WorkPackage types must have a budget',
      path: ['budgetedCost'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'Activity') {
        return parseFloat(data.budgetedCost) === 0;
      }
      return true;
    },
    {
      message: 'Activity types cannot have a budget',
      path: ['budgetedCost'],
    }
  );
export type InsertWbsItem = z.infer<typeof insertWbsItemSchema>;
export type WbsItem = InsertWbsItem & { id: number; actualCost: string | null; percentComplete: string | null; createdAt: Date };

export const extendedInsertWbsItemSchema = baseWbsSchema.extend({
  name: z.string().min(3, 'WBS item name must be at least 3 characters'),
});

export const updateWbsProgressSchema = z.object({
  id: z.number(),
  percentComplete: z.string().or(z.number()).transform(val => val.toString()),
});
export type UpdateWbsProgress = z.infer<typeof updateWbsProgressSchema>;

// --- Dependencies ---
export const insertDependencySchema = z.object({
  predecessorId: z.number(),
  successorId: z.number(),
  type: z.string(),
  lag: z.number().default(0),
});
export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type Dependency = InsertDependency & { id: number; createdAt: Date };

// --- Cost Entries ---
export const insertCostEntrySchema = z.object({
  wbsItemId: z.number(),
  amount: z.string().or(z.number()).transform(val => val.toString()),
  description: z.string().optional().nullable(),
  entryDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') {
      return new Date(val).toISOString().split('T')[0];
    }
    return val.toISOString().split('T')[0];
  }),
});
export type InsertCostEntry = z.infer<typeof insertCostEntrySchema>;
export type CostEntry = InsertCostEntry & { id: number; createdAt: Date };

export const importCostsSchema = z.object({
  wbsItemId: z.number(),
  amount: z.string().or(z.number()).transform(val => val.toString()),
  description: z.string().optional(),
  entryDate: z.date(),
});
export type ImportCosts = z.infer<typeof importCostsSchema>;

export const csvImportSchema = z.array(
  z.object({
    wbsCode: z.string().min(1, 'WBS code is required'),
    amount: z.string().or(z.number()).transform(val => val.toString()),
    description: z.string().optional(),
    entryDate: z.string().transform((val) => new Date(val).toISOString().split('T')[0]),
  })
);
export type CsvImportData = z.infer<typeof csvImportSchema>;

// --- Work Packages ---
export const insertWorkPackageSchema = z.object({
  wbsItemId: z.number(),
  projectId: z.number(),
  name: z.string().min(1, 'Work package name is required'),
  description: z.string().nullable().optional(),
  code: z.string().optional(),
  budgetedCost: z.string().or(z.number()).transform(val => val.toString()),
});
export type InsertWorkPackage = z.infer<typeof insertWorkPackageSchema>;
export type WorkPackage = InsertWorkPackage & { id: number; actualCost: string | null; percentComplete: string | null; createdAt: Date };

// --- Planned Cost per Work Package ---
export const insertPlannedCostWorkpackageSchema = z.object({
  projectId: z.number(),
  wpId: z.number(),
  materialsPlannedValue: z.string().or(z.number()).transform(val => val.toString()),
  servicesPlannedValue: z.string().or(z.number()).transform(val => val.toString()),
  resourcesPlannedValue: z.string().or(z.number()).transform(val => val.toString()),
  totalPlannedValue: z.string().or(z.number()).transform(val => val.toString()),
  isLocked: z.boolean().default(true),
});
export type InsertPlannedCostWorkpackage = z.infer<typeof insertPlannedCostWorkpackageSchema>;
export type PlannedCostWorkpackage = InsertPlannedCostWorkpackage & { id: number; createdAt: Date; updatedAt: Date };

export const projectActivityTypeEnum = z.enum([
  "units",
  "milestone",
  "lumpsum",
  "progress_0_50_100",
]);

export const activityMilestoneSchema = z.object({
  name: z.string().min(1),
  weightPercent: z.number().min(0).max(100),
  achieved: z.boolean().optional(),
});

// --- Activities (global activity master) ---
export const insertActivitySchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  activityType: projectActivityTypeEnum.default("units"),
  unitOfMeasure: z.string().optional().nullable(),
  unitRate: z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .transform((val) => (val == null || val === "" ? null : val.toString())),
  quantity: z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .transform((val) => (val == null || val === "" ? null : val.toString())),
  totalBudget: z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .transform((val) => (val == null || val === "" ? null : val.toString())),
  percentComplete: z.number().min(0).max(100).optional().default(0),
  progressState: z.union([z.literal(0), z.literal(50), z.literal(100)]).optional().default(0),
  milestones: z.array(activityMilestoneSchema).optional().nullable(),
  remarks: z.string().optional().nullable(),
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = InsertActivity & { id: number; createdAt: Date; updatedAt: Date };

// --- Resources ---
export const insertResourceSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.enum(['manpower', 'equipment', 'rental_manpower', 'rental_equipment', 'tools']),
  unitOfMeasure: z.string(),
  unitRate: z.string().or(z.number()).transform(val => val.toString()),
  remarks: z.string().optional().nullable(),
});
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = InsertResource & { id: number; createdAt: Date; updatedAt: Date };

// --- Tasks ---
export const insertTaskSchema = z.object({
  activityId: z.number().optional().nullable(),
  name: z.string(),
  description: z.string().optional().nullable(),
  duration: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val).optional().nullable(),
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = InsertTask & { id: number; createdAt: Date; updatedAt: Date };

// --- Resource Plans ---
export const insertResourcePlanSchema = z.object({
  projectId: z.number(),
  resourceName: z.string(),
  resourceType: z.enum(['Manpower', 'Equipment', 'Material']),
  startDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  endDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  quantity: z.string().or(z.number()).transform(val => val.toString()),
  unit: z.string(),
  costPerUnit: z.string().or(z.number()).transform(val => val.toString()),
  totalCost: z.string().or(z.number()).transform(val => val.toString()),
  status: z.enum(['Planned', 'Allocated', 'In Use', 'Completed']).default('Planned'),
  remarks: z.string().optional().nullable(),
  createdBy: z.string().default('System'),
});
export type InsertResourcePlan = z.infer<typeof insertResourcePlanSchema>;
export type ResourcePlan = InsertResourcePlan & { id: number; createdAt: Date; updatedAt: Date };

// --- Task Resources ---
export const insertTaskResourceSchema = z.object({
  taskId: z.number(),
  resourceId: z.number(),
  quantity: z.string().or(z.number()).transform(val => val.toString()),
});
export type InsertTaskResource = z.infer<typeof insertTaskResourceSchema>;
export type TaskResource = InsertTaskResource & { id: number; createdAt: Date; updatedAt: Date };

// --- Project Activities ---
export const insertProjectActivitySchema = z.object({
  projectId: z.number(),
  wpId: z.number(),
  globalActivityId: z.number().optional().nullable(),
  activityType: projectActivityTypeEnum.default("units"),
  name: z.string(),
  description: z.string().optional().nullable(),
  unitOfMeasure: z.string().optional().nullable(),
  unitRate: z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .transform((val) => (val == null || val === "" ? null : val.toString())),
  quantity: z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .transform((val) => (val == null || val === "" ? null : val.toString())),
  totalBudget: z
    .string()
    .or(z.number())
    .optional()
    .nullable()
    .transform((val) => (val == null || val === "" ? null : val.toString())),
  percentComplete: z.number().min(0).max(100).optional().default(0),
  progressState: z.union([z.literal(0), z.literal(50), z.literal(100)]).optional().default(0),
  milestones: z.array(activityMilestoneSchema).optional().nullable(),
  finalized: z.boolean().optional().default(false),
  remarks: z.string().optional().nullable(),
  plannedFromDate: z.string().optional().nullable(),
  plannedToDate: z.string().optional().nullable(),
  estimatedStartDate: z.string().optional().nullable(),
  estimatedEndDate: z.string().optional().nullable(),
  actualStartDate: z.string().optional().nullable(),
  actualToDate: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  earlyStartDay: z.number().optional().nullable(),
  earlyFinishDay: z.number().optional().nullable(),
  lateStartDay: z.number().optional().nullable(),
  lateFinishDay: z.number().optional().nullable(),
  totalFloatDays: z.number().optional().nullable(),
});
export type InsertProjectActivity = z.infer<typeof insertProjectActivitySchema>;
export type ProjectActivity = InsertProjectActivity & { id: number; createdAt: Date; updatedAt: Date };

// --- Collaboration (chat trails) ---
export const collabCategoryEnum = z.enum([
  // Project-level categories
  'quality',
  'safety',
  'evacuation',
  'policy',
  'casual',
  'issue',
  'info',
  'announcement',
  'awards',
  'general',
  // Company-wide (global) categories
  'information',
  'company_policies',
  'company_procedures',
  'events',
  'others',
]);
export const collabCriticalityEnum = z.enum(['low', 'medium', 'high', 'critical']);

export const collabMentionSchema = z.object({
  userId: z.number(),
  userName: z.string(),
});

export const collabReadReceiptSchema = z.object({
  userId: z.number(),
  readAt: z.string(),
});

export const insertCollaborationThreadSchema = z.object({
  title: z.string(),
  subject: z.string().optional(),
  type: collabCategoryEnum.optional(),
  category: collabCategoryEnum.optional(),
  criticality: collabCriticalityEnum.default('medium'),
  projectId: z.number().optional().nullable(),
  createdById: z.string(),
  createdByName: z.string(),
  isClosed: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  expiryDays: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});
export type InsertCollaborationThread = z.infer<typeof insertCollaborationThreadSchema>;
export type CollaborationThread = InsertCollaborationThread & {
  id: number;
  expiresAt?: Date | string | null;
  pinnedAt?: Date | string | null;
  lastMessagePreview?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const insertCollaborationMessageSchema = z.object({
  threadId: z.number(),
  content: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  mentions: z.array(collabMentionSchema).optional().default([]),
});
export type InsertCollaborationMessage = z.infer<typeof insertCollaborationMessageSchema>;
export type CollaborationMessage = InsertCollaborationMessage & {
  id: number;
  readBy?: { userId: number; readAt: string }[];
  createdAt: Date;
};

export const insertProjectCollaborationThreadSchema = insertCollaborationThreadSchema.extend({
  projectId: z.number(),
});
export type InsertProjectCollaborationThread = z.infer<typeof insertProjectCollaborationThreadSchema>;
export type ProjectCollaborationThread = CollaborationThread & { projectId: number };

export const insertProjectCollaborationMessageSchema = insertCollaborationMessageSchema;
export type InsertProjectCollaborationMessage = z.infer<typeof insertProjectCollaborationMessageSchema>;
export type ProjectCollaborationMessage = CollaborationMessage;

export const insertCollabNotificationSchema = z.object({
  userId: z.number(),
  projectId: z.number().nullable().optional(),
  threadId: z.number(),
  messageId: z.number(),
  type: z.enum(['mention']),
  title: z.string(),
  body: z.string(),
  read: z.boolean().default(false),
});
export type InsertCollabNotification = z.infer<typeof insertCollabNotificationSchema>;
export type CollabNotification = InsertCollabNotification & { id: number; createdAt: Date };

// --- Project Tasks ---
export const insertProjectTaskSchema = z.object({
  projectId: z.number(),
  activityId: z.number(),
  globalTaskId: z.number().optional().nullable(),
  name: z.string(),
  description: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  status: z.string().default('pending'),
  remarks: z.string().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
  closedDate: z.string().optional().nullable(),
});
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = InsertProjectTask & { id: number; createdAt: Date; updatedAt: Date };

// --- Project Resources ---
export const insertProjectResourceSchema = z.object({
  projectId: z.number(),
  wpId: z.number(),
  projectActivityId: z.number().optional().nullable(),
  globalResourceId: z.number().optional().nullable(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.string(),
  unitOfMeasure: z.string(),
  unitRate: z.string().or(z.number()).transform(val => val.toString()),
  quantity: z.string().or(z.number()).transform(val => val.toString()),
  remarks: z.string().optional().nullable(),
  plannedStartDate: z.string().optional().nullable(),
  plannedEndDate: z.string().optional().nullable(),
});
export type InsertProjectResource = z.infer<typeof insertProjectResourceSchema>;
export type ProjectResource = InsertProjectResource & { id: number; createdAt: Date; updatedAt: Date };

// --- Daily Progress ---
export const insertDailyProgressSchema = z.object({
  projectId: z.number(),
  date: z.string().or(z.date()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  mainCategory: z.enum(['Design', 'Construction', 'Installation', 'Testing', 'Pre-commissioning', 'Commissioning']),
  subCategory: z.string(),
  activity: z.string(),
  task: z.string(),
  taskCompletion: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val),
  activityCompletion: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val),
  resourcesDeployed: z.array(z.string()).or(z.string().transform(val => val.split(',').map(s => s.trim()))),
  obstruction: z.enum(['Headwind', 'Tailwind', 'None']),
  remarks: z.string().optional().nullable(),
  status: z.enum(['In Progress', 'Completed', 'On Hold']),
});
export type InsertDailyProgress = z.infer<typeof insertDailyProgressSchema>;
export type DailyProgress = InsertDailyProgress & { id: number; createdAt: Date };

// --- Risk Register ---
export const insertRiskRegisterSchema = z.object({
  projectId: z.number(),
  dateLogged: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  risk: z.string(),
  riskType: z.enum(['Risk', 'Opportunity']),
  probability: z.enum(['High', 'Moderate', 'Low']),
  impact: z.enum(['High', 'Moderate', 'Low']),
  userLogged: z.string(),
  actionTaken: z.string(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['Open', 'In Progress', 'Closed']).default('Open'),
});
export type InsertRiskRegister = z.infer<typeof insertRiskRegisterSchema>;
export type RiskRegister = InsertRiskRegister & { id: number; createdAt: Date; updatedAt: Date };

// --- Direct Manpower Positions ---
export const insertDirectManpowerPositionSchema = z.object({
  projectId: z.number(),
  positionId: z.string(),
  name: z.string(),
  order: z.number(),
  isActive: z.boolean().default(true),
});
export type InsertDirectManpowerPosition = z.infer<typeof insertDirectManpowerPositionSchema>;
export type DirectManpowerPosition = InsertDirectManpowerPosition & { id: number; createdAt: Date; updatedAt: Date };

// --- Direct Manpower Entries ---
export const insertDirectManpowerEntrySchema = z.object({
  projectId: z.number(),
  date: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  positions: z.record(z.string(), z.number()).or(z.string()).transform(val => {
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  }),
  totalManpower: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val),
  remarks: z.string().optional().nullable(),
  createdBy: z.string(),
});
export type InsertDirectManpowerEntry = z.infer<typeof insertDirectManpowerEntrySchema>;
export type DirectManpowerEntry = InsertDirectManpowerEntry & { id: number; createdAt: Date; updatedAt: Date };

// --- Lesson Learnt Register ---
export const insertLessonLearntRegisterSchema = z.object({
  projectId: z.number(),
  category: z.enum(['Design', 'Engineering', 'Construction', 'Installation', 'Testing', 'Pre-commissioning', 'Commissioning', 'Procurement', 'Subcontracts', 'Quality', 'Safety', 'Others']),
  lesson: z.string(),
  type: z.enum(['Risk', 'Opportunity']),
  dateLogged: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  loggedBy: z.string(),
  documents: z.array(z.string()).default([]),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).default('Open'),
  impact: z.enum(['Low', 'Medium', 'High', 'Critical']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  description: z.string(),
  recommendations: z.string(),
  actionsTaken: z.string(),
});
export type InsertLessonLearntRegister = z.infer<typeof insertLessonLearntRegisterSchema>;
export type LessonLearntRegister = InsertLessonLearntRegister & { id: number; createdAt: Date; updatedAt: Date };

// --- Indirect Manpower Positions ---
export const insertIndirectManpowerPositionSchema = z.object({
  projectId: z.number(),
  positionId: z.string(),
  name: z.string(),
  order: z.number(),
  isActive: z.boolean().default(true),
});
export type InsertIndirectManpowerPosition = z.infer<typeof insertIndirectManpowerPositionSchema>;
export type IndirectManpowerPosition = InsertIndirectManpowerPosition & { id: number; createdAt: Date; updatedAt: Date };

// --- Indirect Manpower Entries ---
export const insertIndirectManpowerEntrySchema = z.object({
  projectId: z.number(),
  date: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  positions: z.record(z.string(), z.number()).or(z.string()).transform(val => {
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  }),
  totalOverhead: z.string().or(z.number()).transform(val => val.toString()),
  remarks: z.string().optional().nullable(),
  createdBy: z.string(),
});
export type InsertIndirectManpowerEntry = z.infer<typeof insertIndirectManpowerEntrySchema>;
export type IndirectManpowerEntry = InsertIndirectManpowerEntry & { id: number; createdAt: Date; updatedAt: Date };

// --- Planned Activities ---
export const insertPlannedActivitySchema = z.object({
  projectId: z.number(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  priority: z.string(),
  startDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  endDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  progress: z.string().or(z.number()).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    return Math.max(0, Math.min(100, num || 0));
  }),
  assignedTo: z.string(),
  remarks: z.string().optional().nullable(),
});
export type InsertPlannedActivity = z.infer<typeof insertPlannedActivitySchema>;
export type PlannedActivity = InsertPlannedActivity & { id: number; createdAt: Date; updatedAt: Date };

// --- Planned Activity Tasks ---
export const insertPlannedActivityTaskSchema = z.object({
  activityId: z.number(),
  name: z.string(),
  status: z.string(),
  priority: z.string(),
  assignedTo: z.string(),
  startDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  endDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  progress: z.string().or(z.number()).transform(val => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    return Math.max(0, Math.min(100, num || 0));
  }),
  remarks: z.string().optional().nullable(),
});
export type InsertPlannedActivityTask = z.infer<typeof insertPlannedActivityTaskSchema>;
export type PlannedActivityTask = InsertPlannedActivityTask & { id: number; createdAt: Date; updatedAt: Date };

// --- Material Master ---
export const insertMaterialMasterSchema = z.object({
  materialCode: z.string().min(1),
  materialDescription: z.string().min(1),
  uom: z.string().min(1),
  materialType: z.string().min(1),
  materialGroup: z.string().min(1),
  materialClass: z.enum(['mrp', 'common', 'project']).default('common'),
  baseRate: z.union([z.string(), z.number()]).optional().transform((v) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? String(Number(v)) : '0')),
});
export type InsertMaterialMaster = z.infer<typeof insertMaterialMasterSchema>;
export type MaterialMaster = InsertMaterialMaster & { id: number; createdAt: Date; updatedAt: Date };

// --- Service Types/Groups ---
export const insertServiceTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
});
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;
export type ServiceType = InsertServiceType & { id: number; createdAt: Date; updatedAt: Date };

export const insertServiceGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  serviceTypeId: z.number(),
});
export type InsertServiceGroup = z.infer<typeof insertServiceGroupSchema>;
export type ServiceGroup = InsertServiceGroup & { id: number; createdAt: Date; updatedAt: Date };

// --- Service Master ---
export const insertServiceMasterSchema = z.object({
  serviceCode: z.string(),
  serviceDescription: z.string(),
  uom: z.string(),
  serviceType: z.string(),
  serviceGroup: z.string(),
  baseRate: z.union([z.string(), z.number()]).optional().transform((v) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? String(Number(v)) : '0')),
});
export type InsertServiceMaster = z.infer<typeof insertServiceMasterSchema>;
export type ServiceMaster = InsertServiceMaster & { id: number; createdAt: Date; updatedAt: Date };

// --- Work Package Materials/Services ---
export const insertWorkPackageMaterialSchema = z.object({
  projectId: z.number(),
  wpId: z.number(),
  projectActivityId: z.number().optional().nullable(),
  materialId: z.number(),
  quantity: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'number' ? String(v) : v)),
  estimatedValue: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'number' ? String(v) : v)),
});
export type InsertWorkPackageMaterial = z.infer<typeof insertWorkPackageMaterialSchema>;
export type WorkPackageMaterial = InsertWorkPackageMaterial & { id: number; createdAt: Date; updatedAt: Date };

export const insertWorkPackageServiceSchema = z.object({
  projectId: z.number(),
  wpId: z.number(),
  projectActivityId: z.number().optional().nullable(),
  serviceId: z.number(),
  quantity: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'number' ? String(v) : v)),
  estimatedValue: z.union([z.string(), z.number()]).transform((v) => (typeof v === 'number' ? String(v) : v)),
});
export type InsertWorkPackageService = z.infer<typeof insertWorkPackageServiceSchema>;
export type WorkPackageService = InsertWorkPackageService & { id: number; createdAt: Date; updatedAt: Date };

// --- Purchase Requisitions ---
export const insertPurchaseRequisitionSchema = z.object({
  prNumber: z.string(),
  prDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  requisitionType: z.enum(['material', 'service', 'rental_equipment', 'tools']),
  requestedBy: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['open', 'closed']).optional().default('open'),
});
export type InsertPurchaseRequisition = z.infer<typeof insertPurchaseRequisitionSchema>;
export type PurchaseRequisition = InsertPurchaseRequisition & { id: number; createdAt: Date; updatedAt: Date };

export const insertPurchaseRequisitionItemSchema = z.object({
  prId: z.number(),
  lineNumber: z.number().int().min(1),
  itemCode: z.string(),
  itemDescription: z.string(),
  quantity: z.union([z.string(), z.number()]).transform(v => (typeof v === 'number' ? String(v) : v)),
  requiredDate: z.string().optional().nullable(),
  longDescription: z.string().max(400).optional().nullable(),
  remarks: z.string().optional().nullable(),
  preferredVendorCodes: z.array(z.string()).optional().default([]),
  projectId: z.number().optional().nullable(),
  wpId: z.number().optional().nullable(),
  status: z.enum(['open', 'converted']).optional().default('open'),
  convertedPoId: z.number().optional().nullable(),
});
export type InsertPurchaseRequisitionItem = z.infer<typeof insertPurchaseRequisitionItemSchema>;
export type PurchaseRequisitionItem = InsertPurchaseRequisitionItem & { id: number; createdAt: Date; updatedAt: Date };

// --- Purchase Orders ---
export const insertPurchaseOrderSchema = z.object({
  poNumber: z.string(),
  poDate: z.date().or(z.string()).transform(val => {
    if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }),
  vendor: z.string(),
  remarks: z.string().optional().nullable(),
  prId: z.number().optional().nullable(),
  deliveryTerms: z.string().optional().nullable(),
  incoterms: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
});
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = InsertPurchaseOrder & { id: number; createdAt: Date; updatedAt: Date };

export const insertPurchaseOrderItemSchema = z.object({
  poId: z.number(),
  lineNumber: z.number().int().min(1),
  itemType: z.string(),
  itemDescription: z.string(),
  quantity: z.union([z.string(), z.number()]).transform(v => (typeof v === 'number' ? String(v) : v)),
  unitOfMeasure: z.string(),
  unitPrice: z.union([z.string(), z.number()]).transform(v => (typeof v === 'number' ? String(v) : v)),
  totalPrice: z.union([z.string(), z.number()]).transform(v => (typeof v === 'number' ? String(v) : v)),
  estimatedDeliveryDate: z.string().optional().nullable(),
  actualDeliveryDate: z.string().optional().nullable(),
  projectId: z.number().optional().nullable(),
  wpId: z.number().optional().nullable(),
  longDescription: z.string().max(1000).optional().nullable(),
  prItemId: z.number().optional().nullable(),
});
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = InsertPurchaseOrderItem & { id: number; createdAt: Date; updatedAt: Date };

export const insertPurchaseOrderAttachmentSchema = z.object({
  poId: z.number(),
  fileName: z.string(),
  originalName: z.string(),
  displayName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  contentType: z.string().optional().nullable(),
  b2FileId: z.string().optional().nullable(),
});
export type InsertPurchaseOrderAttachment = z.infer<typeof insertPurchaseOrderAttachmentSchema>;
export type PurchaseOrderAttachment = InsertPurchaseOrderAttachment & { id: number; createdAt: Date; updatedAt: Date };

// --- Vendor Master ---
export const insertVendorMasterSchema = z.object({
  vendorCode: z.string(),
  vendorName: z.string(),
  vendorAddress: z.string(),
  vendorDistrict: z.string().optional().nullable(),
  vendorCity: z.string(),
  vendorCountry: z.string(),
  vendorZipCode: z.string(),
  vendorPoBox: z.string().optional().nullable(),
  vendorTaxNumber: z.string().optional().nullable(),
  vendorCommercialRegistrationNumber: z.string().optional().nullable(),
  vendorEmail: z.string(),
  vendorTelephone: z.string(),
  vendorFax: z.string().optional().nullable(),
});
export type InsertVendorMaster = z.infer<typeof insertVendorMasterSchema>;
export type VendorMaster = InsertVendorMaster & { id: number; createdAt: Date; updatedAt: Date };

// --- Employee Master ---
export const insertEmployeeMasterSchema = z.object({
  employeeNumber: z.string(),
  empFirstName: z.string(),
  empMiddleName: z.string().optional().nullable(),
  empLastName: z.string(),
  empNationalId: z.string(),
  empNationality: z.string(),
  empDob: z.union([z.date(), z.string(), z.number()]).transform((val, ctx) => toIsoDateString(val, 'empDob', ctx)),
  empPosition: z.string(),
  empTitle: z.string(),
  empTrade: z.string(),
  empGrade: z.string(),
  empGender: z.enum(['M', 'F']),
  entryDate: z.union([z.date(), z.string(), z.number()]).optional().nullable().transform((val, ctx) => val ? toIsoDateString(val, 'entryDate', ctx) : new Date().toISOString().split('T')[0]),
  exitDate: z.union([z.date(), z.string(), z.number()]).optional().nullable().transform((val, ctx) => val ? toIsoDateString(val, 'exitDate', ctx) : null),
  empCostPerHour: z.string().or(z.number()).transform(val => val.toString()),
});
export type InsertEmployeeMaster = z.infer<typeof insertEmployeeMasterSchema>;
export type EmployeeMaster = InsertEmployeeMaster & { id: number; createdAt: Date; updatedAt: Date };

// --- Rental Manpower ---
export const insertRentalManpowerSchema = z.object({
  employeeNumber: z.string(),
  empFirstName: z.string(),
  empMiddleName: z.string().optional().nullable(),
  empLastName: z.string(),
  empNationalId: z.string(),
  empNationality: z.string(),
  empDob: z.union([z.date(), z.string(), z.number()]).transform((val, ctx) => toIsoDateString(val, 'empDob', ctx)),
  empPosition: z.string(),
  empTitle: z.string(),
  empTrade: z.string(),
  empGrade: z.string(),
  empGender: z.enum(['M', 'F']),
  entryDate: z.union([z.date(), z.string(), z.number()]).optional().nullable().transform((val, ctx) => val ? toIsoDateString(val, 'entryDate', ctx) : new Date().toISOString().split('T')[0]),
  exitDate: z.union([z.date(), z.string(), z.number()]).optional().nullable().transform((val, ctx) => val ? toIsoDateString(val, 'exitDate', ctx) : null),
  vendorId: z.number(),
  empCostPerHour: z.string().or(z.number()).transform(val => val.toString()),
});
export type InsertRentalManpower = z.infer<typeof insertRentalManpowerSchema>;
export type RentalManpower = InsertRentalManpower & { id: number; createdAt: Date; updatedAt: Date };

// --- Resource Mappings ---
export const insertEmployeeResourceMappingSchema = z.object({ employeeId: z.number(), resourceId: z.number() });
export type InsertEmployeeResourceMapping = z.infer<typeof insertEmployeeResourceMappingSchema>;
export type EmployeeResourceMapping = InsertEmployeeResourceMapping & { id: number; createdAt: Date; updatedAt: Date };

export const insertRentalManpowerResourceMappingSchema = z.object({ rentalManpowerId: z.number(), resourceId: z.number() });
export type InsertRentalManpowerResourceMapping = z.infer<typeof insertRentalManpowerResourceMappingSchema>;
export type RentalManpowerResourceMapping = InsertRentalManpowerResourceMapping & { id: number; createdAt: Date; updatedAt: Date };

// --- Equipment ---
export const insertEquipmentManufacturerSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertEquipmentManufacturer = z.infer<typeof insertEquipmentManufacturerSchema>;
export type EquipmentManufacturer = InsertEquipmentManufacturer & { id: number; createdAt: Date; updatedAt: Date };

export const insertEquipmentTypeSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertEquipmentType = z.infer<typeof insertEquipmentTypeSchema>;
export type EquipmentType = InsertEquipmentType & { id: number; createdAt: Date; updatedAt: Date };

export const insertEquipmentMasterSchema = z.object({
  equipmentNumber: z.string(),
  equipmentName: z.string(),
  equipmentType: z.string(),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  year: z.number().optional().nullable(),
  capacity: z.string().or(z.number()).transform(val => val.toString()).optional().nullable(),
  unit: z.string().optional().nullable(),
  costPerHour: z.string().or(z.number()).transform(val => val.toString()),
  status: z.string().default('Active'),
  remarks: z.string().optional().nullable(),
});
export type InsertEquipmentMaster = z.infer<typeof insertEquipmentMasterSchema>;
export type EquipmentMaster = InsertEquipmentMaster & { id: number; createdAt: Date; updatedAt: Date };

export const insertRentalEquipmentSchema = z.object({
  equipmentNumber: z.string(),
  equipmentName: z.string(),
  equipmentType: z.string(),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  year: z.number().optional().nullable(),
  capacity: z.string().or(z.number()).transform(val => val.toString()).optional().nullable(),
  unit: z.string().optional().nullable(),
  costPerHour: z.string().or(z.number()).transform(val => val.toString()),
  vendorId: z.number(),
});
export type InsertRentalEquipment = z.infer<typeof insertRentalEquipmentSchema>;
export type RentalEquipment = InsertRentalEquipment & { id: number; createdAt: Date; updatedAt: Date };

export const insertRentalEquipmentResourceMappingSchema = z.object({ rentalEquipmentId: z.number(), resourceId: z.number() });
export type InsertRentalEquipmentResourceMapping = z.infer<typeof insertRentalEquipmentResourceMappingSchema>;
export type RentalEquipmentResourceMapping = InsertRentalEquipmentResourceMapping & { id: number; createdAt: Date; updatedAt: Date };

export const insertEquipmentResourceMappingSchema = z.object({ equipmentId: z.number(), resourceId: z.number() });
export type InsertEquipmentResourceMapping = z.infer<typeof insertEquipmentResourceMappingSchema>;
export type EquipmentResourceMapping = InsertEquipmentResourceMapping & { id: number; createdAt: Date; updatedAt: Date };

// --- Tools ---
export const insertToolManufacturerSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertToolManufacturer = z.infer<typeof insertToolManufacturerSchema>;
export type ToolManufacturer = InsertToolManufacturer & { id: number; createdAt: Date; updatedAt: Date };

export const insertToolTypeSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertToolType = z.infer<typeof insertToolTypeSchema>;
export type ToolType = InsertToolType & { id: number; createdAt: Date; updatedAt: Date };

export const insertToolModelSchema = z.object({
  name: z.string(),
  manufacturer: z.string(),
  description: z.string().optional().nullable(),
});
export type InsertToolModel = z.infer<typeof insertToolModelSchema>;
export type ToolModel = InsertToolModel & { id: number; createdAt: Date; updatedAt: Date };

export const insertToolMasterSchema = z.object({
  toolNumber: z.string(),
  name: z.string(),
  toolType: z.string(),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  unitOfMeasure: z.string().optional().default("H"),
  accessories: z.string().optional().nullable(),
  unitRate: z.string().or(z.number()).transform(val => val.toString()),
}).transform((data) => ({ ...data, unitOfMeasure: "H" }));
export type InsertToolMaster = z.infer<typeof insertToolMasterSchema>;
export type ToolMaster = InsertToolMaster & { id: number; createdAt: Date; updatedAt: Date };

export const insertToolResourceMappingSchema = z.object({ toolId: z.number(), resourceId: z.number() });
export type InsertToolResourceMapping = z.infer<typeof insertToolResourceMappingSchema>;
export type ToolResourceMapping = InsertToolResourceMapping & { id: number; createdAt: Date; updatedAt: Date };

// --- Timesheets ---
export const insertResourceTimesheetSchema = z.object({
  date: z.string(),
  resourceType: z.enum(['manpower', 'rental_manpower', 'equipment', 'rental_equipment', 'tools']),
  employeeId: z.number().optional().nullable(),
  rentalManpowerId: z.number().optional().nullable(),
  equipmentId: z.number().optional().nullable(),
  rentalEquipmentId: z.number().optional().nullable(),
  toolId: z.number().optional().nullable(),
  status: z.enum(['worked', 'idle_bench', 'leave_off', 'un_utilized', 'weekly_off_rest']),
  projectId: z.number().optional().nullable(),
  wpId: z.number().optional().nullable(),
  enteredBy: z.string(),
  remarks: z.string().optional().nullable(),
});
export type InsertResourceTimesheet = z.infer<typeof insertResourceTimesheetSchema>;
export type ResourceTimesheet = InsertResourceTimesheet & { id: number; enteredDate: Date; createdAt: Date; updatedAt: Date };

// --- File Uploads ---
export const insertFileUploadSchema = z.object({
  projectId: z.number(),
  category: z.string(),
  fileName: z.string(),
  originalName: z.string(),
  displayName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  contentType: z.string().optional().nullable(),
  b2FileId: z.string().optional().nullable(),
  uploadedById: z.number().optional().nullable(),
  uploadedByName: z.string(),
  uploadedByEmail: z.string().optional().nullable(),
});
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = InsertFileUpload & { id: number; createdAt: Date; updatedAt: Date };

// --- UOM, Material Types, Groups ---
export const insertUomSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertUom = z.infer<typeof insertUomSchema>;
export type Uom = InsertUom & { id: number; createdAt: Date; updatedAt: Date };

export const insertMaterialTypeSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertMaterialType = z.infer<typeof insertMaterialTypeSchema>;
export type MaterialType = InsertMaterialType & { id: number; createdAt: Date; updatedAt: Date };

export const insertMaterialGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  materialTypeId: z.number(),
});
export type InsertMaterialGroup = z.infer<typeof insertMaterialGroupSchema>;
export type MaterialGroup = InsertMaterialGroup & { id: number; createdAt: Date; updatedAt: Date };

// --- Locations ---
export const insertCountrySchema = z.object({ name: z.string(), code: z.string().optional().nullable() });
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = InsertCountry & { id: number; createdAt: Date; updatedAt: Date };

export const insertCitySchema = z.object({ name: z.string(), countryId: z.number() });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = InsertCity & { id: number; createdAt: Date; updatedAt: Date };

// --- Global defaults (singleton: base currency, default country, company profile) ---
export const updateGlobalDefaultsSchema = z.object({
  defaultCountryId: z.number().nullable().optional(),
  defaultCurrencyCode: projectCurrencySchema.optional(),
  companyName: z.string().max(200).nullable().optional(),
  companyAddress: z.string().max(2000).nullable().optional(),
});
export type UpdateGlobalDefaults = z.infer<typeof updateGlobalDefaultsSchema>;
export type GlobalDefaults = {
  id: number;
  defaultCountryId: number | null;
  defaultCurrencyCode: string;
  companyName: string | null;
  companyAddress: string | null;
  companyLogoFileName: string | null;
  companyLogoB2FileId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// --- Default work calendar (singleton) ---
export const weekendPatternEnum = z.enum(["fri_sat", "sat_sun", "sun_only", "fri_only", "custom"]);
export type WeekendPattern = z.infer<typeof weekendPatternEnum>;

export const calendarPartialDaySchema = z.object({
  date: z.string().min(10),
  hours: z.number().min(0).max(24),
  note: z.string().optional().nullable(),
});

export const updateDefaultCalendarSchema = z.object({
  weekendPattern: weekendPatternEnum.optional(),
  customWeekendDays: z.array(z.number().int().min(0).max(6)).optional(),
  standardHoursPerDay: z.number().min(0).max(24).optional(),
  partialDays: z.array(calendarPartialDaySchema).optional(),
});
export type UpdateDefaultCalendar = z.infer<typeof updateDefaultCalendarSchema>;
export type DefaultCalendar = {
  id: number;
  weekendPattern: WeekendPattern;
  customWeekendDays: number[];
  standardHoursPerDay: number;
  partialDays: Array<{ date: string; hours: number; note?: string | null }>;
  createdAt: Date;
  updatedAt: Date;
};

export const insertCalendarHolidaySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  date: z.string().min(10),
  name: z.string().min(1),
  holidayType: z.enum(["national", "common", "religious", "other"]).default("national"),
});
export type InsertCalendarHoliday = z.infer<typeof insertCalendarHolidaySchema>;
export type CalendarHoliday = InsertCalendarHoliday & { id: number; createdAt: Date; updatedAt: Date };

// --- Employee master details ---
export const insertNationalitySchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertNationality = z.infer<typeof insertNationalitySchema>;
export type Nationality = InsertNationality & { id: number; createdAt: Date; updatedAt: Date };

export const insertEmployeeTitleSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertEmployeeTitle = z.infer<typeof insertEmployeeTitleSchema>;
export type EmployeeTitle = InsertEmployeeTitle & { id: number; createdAt: Date; updatedAt: Date };

export const insertEmployeePositionSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertEmployeePosition = z.infer<typeof insertEmployeePositionSchema>;
export type EmployeePosition = InsertEmployeePosition & { id: number; createdAt: Date; updatedAt: Date };

export const insertEmployeeGradeSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertEmployeeGrade = z.infer<typeof insertEmployeeGradeSchema>;
export type EmployeeGrade = InsertEmployeeGrade & { id: number; createdAt: Date; updatedAt: Date };

export const insertEmployeeTradeSchema = z.object({ name: z.string(), description: z.string().optional().nullable() });
export type InsertEmployeeTrade = z.infer<typeof insertEmployeeTradeSchema>;
export type EmployeeTrade = InsertEmployeeTrade & { id: number; createdAt: Date; updatedAt: Date };

// --- Kanban Cards ---
export const insertKanbanCardSchema = z.object({
  projectId: z.number(),
  title: z.string(),
  description: z.string().optional().nullable(),
  column: z.enum(['wish', 'ready', 'doing', 'done']).default('wish'),
  position: z.number().int().min(0).default(0),
  priority: z.enum(['immediate_urgent', 'before_end_of_today', 'normal']).nullable().optional(),
  wbsItemId: z.number().int().nullable().optional(),
  projectActivityId: z.number().int().nullable().optional(),
  archivedAt: z.date().optional().nullable(),
});
export type InsertKanbanCard = z.infer<typeof insertKanbanCardSchema>;
export type KanbanCard = InsertKanbanCard & { id: number; createdAt: Date; updatedAt: Date };

// --- Project Activity Dependencies ---
export const insertProjectActivityDependencySchema = z.object({
  projectId: z.number(),
  predecessorId: z.number(),
  successorId: z.number(),
  type: z.enum(['FS', 'SS', 'FF', 'SF']),
  lag: z.number().int().default(0),
});
export type InsertProjectActivityDependency = z.infer<typeof insertProjectActivityDependencySchema>;
export type ProjectActivityDependency = InsertProjectActivityDependency & { id: number; createdAt: Date };

// --- Project Activity Plan Versions ---
export const insertProjectActivityPlanVersionSchema = z.object({
  projectId: z.number(),
  version: z.number(),
  activitiesJson: z.string(),
  dependenciesJson: z.string(),
});
export type InsertProjectActivityPlanVersion = z.infer<typeof insertProjectActivityPlanVersionSchema>;
export type ProjectActivityPlanVersion = InsertProjectActivityPlanVersion & { id: number; createdAt: Date };

// Dummy table objects for compatibility
export const users = 'users';
export const projects = 'projects';
export const wbsItems = 'wbs_items';
export const dependencies = 'dependencies';
export const costEntries = 'cost_entries';
export const workPackages = 'work_packages';
export const plannedCostWorkpackages = 'planned_cost_workpackages';
export const activities = 'activities';
export const resources = 'resources';
export const tasks = 'tasks';
export const resourcePlans = 'resource_plans';
export const taskResources = 'task_resources';
export const projectActivities = 'project_activities';
export const collaborationThreads = 'collaboration_threads';
export const collaborationMessages = 'collaboration_messages';
export const projectCollaborationThreads = 'project_collaboration_threads';
export const projectCollaborationMessages = 'project_collaboration_messages';
export const collabNotifications = 'collab_notifications';
export const projectTasks = 'project_tasks';
export const projectResources = 'project_resources';
export const dailyProgress = 'daily_progress';
export const riskRegister = 'risk_register';
export const directManpowerPositions = 'direct_manpower_positions';
export const directManpowerEntries = 'direct_manpower_entries';
export const lessonLearntRegister = 'lesson_learnt_register';
export const indirectManpowerPositions = 'indirect_manpower_positions';
export const indirectManpowerEntries = 'indirect_manpower_entries';
export const plannedActivities = 'planned_activities';
export const plannedActivityTasks = 'planned_activity_tasks';
export const materialMaster = 'material_master';
export const serviceTypes = 'service_types';
export const serviceGroups = 'service_groups';
export const serviceMaster = 'service_master';
export const workPackageMaterials = 'work_package_materials';
export const workPackageServices = 'work_package_services';
export const purchaseRequisitions = 'purchase_requisitions';
export const purchaseRequisitionItems = 'purchase_requisition_items';
export const purchaseOrders = 'purchase_orders';
export const purchaseOrderItems = 'purchase_order_items';
export const purchaseOrderAttachments = 'purchase_order_attachments';
export const vendorMaster = 'vendor_master';
export const employeeResourceMappings = 'employee_resource_mappings';
export const employeeMaster = 'employee_master';
export const rentalManpower = 'rental_manpower';
export const rentalManpowerResourceMappings = 'rental_manpower_resource_mappings';
export const equipmentManufacturers = 'equipment_manufacturers';
export const equipmentTypes = 'equipment_types';
export const equipmentMaster = 'equipment_master';
export const rentalEquipment = 'rental_equipment';
export const rentalEquipmentResourceMappings = 'rental_equipment_resource_mappings';
export const equipmentResourceMappings = 'equipment_resource_mappings';
export const toolManufacturers = 'tool_manufacturers';
export const toolTypes = 'tool_types';
export const toolModels = 'tool_models';
export const toolMaster = 'tool_master';
export const toolResourceMappings = 'tool_resource_mappings';
export const resourceTimesheets = 'resource_timesheets';
export const fileUploads = 'file_uploads';
export const uoms = 'uoms';
export const materialTypes = 'material_types';
export const materialGroups = 'material_groups';
export const countries = 'countries';
export const cities = 'cities';
export const globalDefaults = 'global_defaults';
export const defaultCalendar = 'default_calendar';
export const calendarHolidays = 'calendar_holidays';
export const nationalities = 'nationalities';
export const employeeTitles = 'employee_titles';
export const employeePositions = 'employee_positions';
export const employeeGrades = 'employee_grades';
export const employeeTrades = 'employee_trades';
export const kanbanCards = 'kanban_cards';
export const projectActivityDependencies = 'project_activity_dependencies';
export const projectActivityPlanVersions = 'project_activity_plan_versions';

// --- Project Wiki records (safety, environmental, others) ---
export const insertWikiRecordSchema = z.object({
  projectId: z.number(),
  recordDate: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  loggedBy: z.string(),
  location: z.string().optional().nullable(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().nullable(),
  status: z.enum(['Open', 'In Progress', 'Closed']).default('Open'),
  remarks: z.string().optional().nullable(),
});
export type InsertWikiRecord = z.infer<typeof insertWikiRecordSchema>;
export type WikiRecord = InsertWikiRecord & { id: number; createdAt: Date; updatedAt: Date };

export const safetyIncidents = 'safety_incidents';
export const safetyToolboxTalks = 'safety_toolbox_talks';
export const environmentalIncidents = 'environmental_incidents';
export const wikiOthers = 'wiki_others';
