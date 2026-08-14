import { pgTable, text, serial, integer, numeric, date, timestamp, boolean, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture"), // Profile picture URL
  provider: text("provider").notNull(), // 'google', 'linkedin', 'email'
  providerId: text("provider_id").notNull(), // OAuth provider ID or email for email auth
  role: text("role").default("user").notNull(), // 'admin' | 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects Table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  projectType: text("project_type"), // Highway, Infrastructure, Power, Commercial, Petrochem, Oil&Gas
  status: text("status"), // concept, planning, active, in progress, aborted, on-hold, completed
  startDate: date("start_date"),
  endDate: date("end_date"),
  /** Budget allocation version: null = not completed, 0 = version 0 allocated, 1+ = amendments */
  allocationVersion: integer("allocation_version"),
  /** True after user successfully finalizes the WBS tree structure */
  wbsFinalized: boolean("wbs_finalized").default(false),
  /** User id of the project creator (may amend WBS after finalize) */
  createdById: integer("created_by_id"),
  /** Source project id when this project is a WBS amendment copy */
  amendedFromId: integer("amended_from_id"),
  /** N in name suffix `_amd_N` */
  amendmentNumber: integer("amendment_number"),
  /** Project version: 'estimation' | 'planning' | 'execution' (defaults to 'execution') */
  projectVersion: text("project_version").default("execution"),
  /** Mapped estimation project ID (optional, when projectVersion is 'execution') */
  mappedEstimationProjectId: integer("mapped_estimation_project_id"),
  /** Mapped planning project ID (optional, when projectVersion is 'execution') */
  mappedPlanningProjectId: integer("mapped_planning_project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// WBS Table - Updated with revised structure
export const wbsItems = pgTable("wbs_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull(), // 1, 2, 3, etc.
  code: text("code").notNull(), // e.g. 1, 1.1, 1.1.1
  type: text("type").notNull(), // Summary, WorkPackage, Activity (removed Task)
  budgetedCost: numeric("budgeted_cost", { precision: 12, scale: 2 }).notNull(),
  actualCost: numeric("actual_cost", { precision: 12, scale: 2 }).default("0"),
  percentComplete: numeric("percent_complete", { precision: 5, scale: 2 }).default("0"),
  isTopLevel: boolean("is_top_level").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dependencies Table
export const dependencies = pgTable("dependencies", {
  id: serial("id").primaryKey(),
  predecessorId: integer("predecessor_id").notNull().references(() => wbsItems.id, { onDelete: "cascade" }),
  successorId: integer("successor_id").notNull().references(() => wbsItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // FS (Finish-to-Start), SS (Start-to-Start), etc.
  lag: integer("lag").default(0), // in days
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cost Entries Table
export const costEntries = pgTable("cost_entries", {
  id: serial("id").primaryKey(),
  wbsItemId: integer("wbs_item_id").notNull().references(() => wbsItems.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  entryDate: date("entry_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Work Packages Table
export const workPackages = pgTable("work_packages", {
  id: serial("id").primaryKey(),
  wbsItemId: integer("wbs_item_id").notNull().references(() => wbsItems.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull(), // e.g. 1.2.1.1.1, 1.2.1.1.2 (WBS code + sequential index)
  budgetedCost: numeric("budgeted_cost", { precision: 12, scale: 2 }).notNull(),
  actualCost: numeric("actual_cost", { precision: 12, scale: 2 }).default("0"),
  percentComplete: numeric("percent_complete", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: code must be unique within a project
  projectCodeUnique: uniqueIndex("work_packages_project_id_code_unique").on(table.projectId, table.code),
}));

// Activities Table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unitOfMeasure: text("unit_of_measure").notNull(),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2 }).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Resources Table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // manpower, equipment, rental_manpower, rental_equipment, tools
  unitOfMeasure: text("unit_of_measure").notNull(), // hours, days, pieces, etc.
  unitRate: numeric("unit_rate", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  availability: numeric("availability", { precision: 5, scale: 2 }).default("100"), // percentage
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tasks Table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }), // Made nullable
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Resource Plans Table
export const resourcePlans = pgTable("resource_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  resourceName: text("resource_name").notNull(),
  resourceType: text("resource_type").notNull(), // Manpower, Equipment, Material
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("Planned").notNull(), // Planned, Allocated, In Use, Completed
  remarks: text("remarks"),
  createdBy: text("created_by").notNull().default("System"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResourcePlanSchema = createInsertSchema(resourcePlans)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    quantity: z.string().or(z.number()).transform(val => val.toString()),
    costPerUnit: z.string().or(z.number()).transform(val => val.toString()),
    totalCost: z.string().or(z.number()).transform(val => val.toString()),
    startDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    endDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    resourceType: z.enum(["Manpower", "Equipment", "Material"]),
    status: z.enum(["Planned", "Allocated", "In Use", "Completed"]).default("Planned"),
  });
export type ResourcePlan = typeof resourcePlans.$inferSelect;
export type InsertResourcePlan = z.infer<typeof insertResourcePlanSchema>;

// Task Resources Table (for the many-to-many relationship between tasks and resources)
export const taskResources = pgTable("task_resources", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Activities Table
export const projectActivities = pgTable("project_activities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  wpId: integer("wp_id").notNull().references(() => workPackages.id, { onDelete: "cascade" }), // Work Package ID - required
  globalActivityId: integer("global_activity_id").references(() => activities.id, { onDelete: "set null" }), // nullable for project-specific activities
  activityType: text("activity_type").notNull().default("units"), // units | milestone | lumpsum | progress_0_50_100
  categoryTag: text("category_tag"), // materials-heavy | subcontract-heavy | resource-heavy
  name: text("name").notNull(),
  description: text("description"),
  unitOfMeasure: text("unit_of_measure"),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2 }),
  quantity: numeric("quantity", { precision: 12, scale: 2 }),
  totalBudget: numeric("total_budget", { precision: 14, scale: 2 }),
  percentComplete: integer("percent_complete").default(0).notNull(),
  progressState: integer("progress_state").default(0).notNull(), // 0 | 50 | 100 for progress_0_50_100 type
  milestones: text("milestones"), // JSON array: [{ name, weightPercent, achieved? }]
  finalized: boolean("finalized").default(false).notNull(),
  remarks: text("remarks"),
  // Date fields
  plannedFromDate: date("planned_from_date"),
  plannedToDate: date("planned_to_date"),
  estimatedStartDate: date("estimated_start_date"),
  estimatedEndDate: date("estimated_end_date"),
  actualStartDate: date("actual_start_date"),
  actualToDate: date("actual_to_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Collaboration Threads Table
export const collaborationThreads = pgTable("collaboration_threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // issue, info, announcement, awards
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }), // null for global threads
  createdById: text("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Collaboration Messages Table
export const collaborationMessages = pgTable("collaboration_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => collaborationThreads.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Project Collaboration Threads Table (project-specific)
export const projectCollaborationThreads = pgTable("project_collaboration_threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // issue, info, announcement, awards
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), // required for project threads
  createdById: text("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Collaboration Messages Table (project-specific)
export const projectCollaborationMessages = pgTable("project_collaboration_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => projectCollaborationThreads.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// Insert Schemas
export const insertProjectSchema = createInsertSchema(projects)
  .omit({ id: true, createdAt: true } as any)
  .extend({
    name: z.string(),
    description: z.string().optional().nullable(),
    budget: z.string().or(z.number()).transform(val => val.toString()),
    currency: z.enum(["USD", "EUR", "SAR"]).default("USD"),
    projectType: z.enum(["Highway", "Infrastructure", "Power", "Commercial", "Petrochem", "Oil&Gas"]).optional().nullable(),
    status: z.enum(["concept", "planning", "active", "in progress", "aborted", "on-hold", "completed"]).optional().nullable(),
    startDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
      return val.toISOString().split('T')[0];
    }).optional().nullable(),
    endDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') return new Date(val).toISOString().split('T')[0];
      return val.toISOString().split('T')[0];
    }).optional().nullable(),
    allocationVersion: z.number().int().min(0).optional().nullable(),
    projectVersion: z.enum(["estimation", "planning", "execution"]).optional().nullable().default("execution"),
    mappedEstimationProjectId: z.number().optional().nullable(),
    mappedPlanningProjectId: z.number().optional().nullable(),
  });

// Base WBS schema - a simpler version without all the refinements
export const baseWbsSchema = createInsertSchema(wbsItems)
  .omit({ id: true, createdAt: true, actualCost: true, percentComplete: true } as any)
  .extend({
    projectId: z.number(),
    parentId: z.number().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    code: z.string().optional(),
    level: z.number().optional(),
    isTopLevel: z.boolean().optional(),
    budgetedCost: z.string().or(z.number()).transform(val => val.toString()),
    type: z.enum(["Summary", "WorkPackage", "WBS", "Activity"]),
  });

// Updated WBS schema with conditional validations
export const insertWbsItemSchema = baseWbsSchema
  .refine(
    (data) => {
      // Summary, WorkPackage and WBS types must have budgetedCost
      if (data.type === "Summary" || data.type === "WorkPackage" || data.type === "WBS") {
        return data.budgetedCost !== undefined && parseFloat(data.budgetedCost) >= 0;
      }
      return true;
    },
    {
      message: "Summary and WorkPackage types must have a budget",
      path: ["budgetedCost"],
    }
  )
  .refine(
    (data) => {
      // Activity types should not have budgetedCost (or set to 0)
      if (data.type === "Activity") {
        return parseFloat(data.budgetedCost) === 0;
      }
      return true;
    },
    {
      message: "Activity types cannot have a budget",
      path: ["budgetedCost"],
    }
  );

export const insertDependencySchema = createInsertSchema(dependencies).omit({ id: true, createdAt: true } as any);
export const insertCostEntrySchema = createInsertSchema(costEntries)
  .omit({ id: true, createdAt: true } as any)
  .extend({
    amount: z.string().or(z.number()).transform(val => val.toString()),
    entryDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
  });

// Work Package schema
export const insertWorkPackageSchema = createInsertSchema(workPackages)
  .omit({ id: true, createdAt: true, actualCost: true, percentComplete: true } as any)
  .extend({
    wbsItemId: z.number(),
    projectId: z.number(),
    name: z.string().min(1, "Work package name is required"),
    description: z.string().nullable().optional(),
    code: z.string().optional(), // Will be auto-generated if not provided
    budgetedCost: z.string().or(z.number()).transform(val => val.toString()),
  });

// Task schema
export const insertTaskSchema = createInsertSchema(tasks)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    name: z.string(),
    description: z.string().optional().nullable(),
    duration: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val).optional().nullable(),
  });

// Resource schema
export const insertResourceSchema = createInsertSchema(resources)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    unitRate: z.string().or(z.number()).transform(val => val.toString()),
    availability: z.string().or(z.number()).transform(val => val.toString()).default("100"),
    type: z.enum(["manpower", "equipment", "rental_manpower", "rental_equipment", "tools"]),
    currency: z.enum(["USD", "EUR", "SAR"]).default("USD"),
  });

// Task Resource schema
export const insertTaskResourceSchema = createInsertSchema(taskResources)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    quantity: z.string().or(z.number()).transform(val => val.toString()),
  });

// Activity schema
export const insertActivitySchema = createInsertSchema(activities)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    name: z.string(),
    description: z.string().optional().nullable(),
    unitOfMeasure: z.string(),
    unitRate: z.string().or(z.number()).transform(val => val.toString()),
  });

// Project Activity schema
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

export const insertProjectActivitySchema = createInsertSchema(projectActivities)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    wpId: z.number(),
    projectId: z.number(),
    activityType: projectActivityTypeEnum.default("units"),
    categoryTag: z.enum(["materials-heavy", "subcontract-heavy", "resource-heavy"]).optional().nullable(),
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
    plannedFromDate: z.string().optional().nullable(),
    plannedToDate: z.string().optional().nullable(),
    estimatedStartDate: z.string().optional().nullable(),
    estimatedEndDate: z.string().optional().nullable(),
    actualStartDate: z.string().optional().nullable(),
    actualToDate: z.string().optional().nullable(),
  });

// Collaboration Thread schema
export const insertCollaborationThreadSchema = createInsertSchema(collaborationThreads)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    type: z.enum(["issue", "info", "announcement", "awards"]),
    isClosed: z.boolean().default(false),
  });

// Collaboration Message schema
export const insertCollaborationMessageSchema = createInsertSchema(collaborationMessages)
  .omit({ id: true, createdAt: true } as any);

// Project Collaboration Thread schema
export const insertProjectCollaborationThreadSchema = createInsertSchema(projectCollaborationThreads)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    type: z.enum(["issue", "info", "announcement", "awards"]),
    isClosed: z.boolean().default(false),
  });

// Project Collaboration Message schema
export const insertProjectCollaborationMessageSchema = createInsertSchema(projectCollaborationMessages)
  .omit({ id: true, createdAt: true } as any);

// User schema
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    provider: z.enum(["google", "linkedin", "email"]),
  });

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type WbsItem = typeof wbsItems.$inferSelect;
export type InsertWbsItem = z.infer<typeof insertWbsItemSchema>;

export type Dependency = typeof dependencies.$inferSelect;
export type InsertDependency = z.infer<typeof insertDependencySchema>;

export type CostEntry = typeof costEntries.$inferSelect;
export type InsertCostEntry = z.infer<typeof insertCostEntrySchema>;

export type WorkPackage = typeof workPackages.$inferSelect;
export type InsertWorkPackage = z.infer<typeof insertWorkPackageSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type TaskResource = typeof taskResources.$inferSelect;
export type InsertTaskResource = z.infer<typeof insertTaskResourceSchema>;

export type ProjectActivity = typeof projectActivities.$inferSelect;
export type InsertProjectActivity = z.infer<typeof insertProjectActivitySchema>;

export type CollaborationThread = typeof collaborationThreads.$inferSelect;
export type InsertCollaborationThread = z.infer<typeof insertCollaborationThreadSchema>;

export type CollaborationMessage = typeof collaborationMessages.$inferSelect;
export type InsertCollaborationMessage = z.infer<typeof insertCollaborationMessageSchema>;

export type ProjectCollaborationThread = typeof projectCollaborationThreads.$inferSelect;
export type InsertProjectCollaborationThread = z.infer<typeof insertProjectCollaborationThreadSchema>;

export type ProjectCollaborationMessage = typeof projectCollaborationMessages.$inferSelect;
export type InsertProjectCollaborationMessage = z.infer<typeof insertProjectCollaborationMessageSchema>;



// Extended schemas for client-side validation
export const extendedInsertProjectSchema = insertProjectSchema.extend({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  budget: z.string().or(z.number()).transform(val => val.toString()),
  startDate: z.coerce.date().transform(val => val.toISOString().split('T')[0]),
  endDate: z.coerce.date().transform(val => val.toISOString().split('T')[0]),
  currency: z.enum(["USD", "EUR", "SAR"]).default("USD").describe("Project currency"),
});

// Extended validation for WBS Items - use the base schema for extension
export const extendedInsertWbsItemSchema = baseWbsSchema.extend({
  name: z.string().min(3, "WBS item name must be at least 3 characters"),
});

export const updateWbsProgressSchema = z.object({
  id: z.number(),
  percentComplete: z.string().or(z.number()).transform(val => val.toString()),
});

export const importCostsSchema = z.object({
  wbsItemId: z.number(),
  amount: z.string().or(z.number()).transform(val => val.toString()),
  description: z.string().optional(),
  entryDate: z.date(),
});

export type UpdateWbsProgress = z.infer<typeof updateWbsProgressSchema>;
export type ImportCosts = z.infer<typeof importCostsSchema>;

// Extended schema for CSV import validation
export const csvImportSchema = z.array(
  z.object({
    wbsCode: z.string().min(1, "WBS code is required"),
    amount: z.string().or(z.number()).transform(val => val.toString()),
    description: z.string().optional(),
    entryDate: z.string().transform((val) => new Date(val).toISOString().split('T')[0]),
  })
);

export type CsvImportData = z.infer<typeof csvImportSchema>;

// Project Tasks Table
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityId: integer("activity_id").notNull().references(() => projectActivities.id, { onDelete: "cascade" }), // Parent activity ID - required
  globalTaskId: integer("global_task_id").references(() => tasks.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration"), // Duration in minutes
  status: text("status").default("pending").notNull(), // pending, in_progress, completed
  remarks: text("remarks"),
  plannedDate: date("planned_date"), // Date when task is planned
  closedDate: date("closed_date"), // Date when task is closed (null if not closed)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod Schemas
export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any).extend({
  activityId: z.number(),
  projectId: z.number(),
  plannedDate: z.string().optional().nullable(),
  closedDate: z.string().optional().nullable(),
});

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

// Project Resources Table
export const projectResources = pgTable("project_resources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  wpId: integer("wp_id").notNull().references(() => workPackages.id, { onDelete: "cascade" }), // Work Package ID - required
  globalResourceId: integer("global_resource_id").references(() => resources.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // manpower, equipment, rental_manpower, rental_equipment, tools
  unitOfMeasure: text("unit_of_measure").notNull(),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  remarks: text("remarks"),
  // Date fields for planned dates (manpower and equipment only)
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectResourceSchema = createInsertSchema(projectResources)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    wpId: z.number(),
    projectId: z.number(),
    unitRate: z.string().or(z.number()).transform(val => val.toString()),
    quantity: z.string().or(z.number()).transform(val => val.toString()),
    plannedStartDate: z.string().optional().nullable(),
    plannedEndDate: z.string().optional().nullable(),
  });

export type ProjectResource = typeof projectResources.$inferSelect;
export type InsertProjectResource = z.infer<typeof insertProjectResourceSchema>;


// Daily Progress Table
export const dailyProgress = pgTable("daily_progress", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mainCategory: text("main_category").notNull(), // Enum constraint handled in Zod
  subCategory: text("sub_category").notNull(),
  activity: text("activity").notNull(),
  task: text("task").notNull(),
  taskCompletion: integer("task_completion").notNull(),
  activityCompletion: integer("activity_completion").notNull(),
  resourcesDeployed: text("resources_deployed").array().notNull(), // Using Array of Strings
  obstruction: text("obstruction").notNull(), // Headwind, Tailwind, None
  remarks: text("remarks"),
  status: text("status").notNull(), // In Progress, Completed, On Hold
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDailyProgressSchema = createInsertSchema(dailyProgress)
  .omit({ id: true, createdAt: true } as any)
  .extend({
    date: z.string().or(z.date()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    taskCompletion: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val),
    activityCompletion: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val),
    resourcesDeployed: z.array(z.string()).or(z.string().transform(val => val.split(',').map(s => s.trim()))),
    mainCategory: z.enum(['Design', 'Construction', 'Installation', 'Testing', 'Pre-commissioning', 'Commissioning']),
    obstruction: z.enum(['Headwind', 'Tailwind', 'None']),
    status: z.enum(['In Progress', 'Completed', 'On Hold']),
  });

export type DailyProgress = typeof dailyProgress.$inferSelect;
export type InsertDailyProgress = z.infer<typeof insertDailyProgressSchema>;

// Risk Register Table
export const riskRegister = pgTable("risk_register", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  dateLogged: date("date_logged").notNull(),
  risk: text("risk").notNull(),
  riskType: text("risk_type").notNull(), // Risk, Opportunity
  probability: text("probability").notNull(), // High, Moderate, Low
  impact: text("impact").notNull(), // High, Moderate, Low
  userLogged: text("user_logged").notNull(),
  actionTaken: text("action_taken").notNull(),
  remarks: text("remarks"),
  status: text("status").default("Open").notNull(), // Open, In Progress, Closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRiskRegisterSchema = createInsertSchema(riskRegister)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    dateLogged: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    riskType: z.enum(["Risk", "Opportunity"]),
    probability: z.enum(["High", "Moderate", "Low"]),
    impact: z.enum(["High", "Moderate", "Low"]),
    status: z.enum(["Open", "In Progress", "Closed"]).default("Open"),
  });

export type RiskRegister = typeof riskRegister.$inferSelect;
export type InsertRiskRegister = z.infer<typeof insertRiskRegisterSchema>;

// Direct Manpower Positions Table (project-specific position definitions)
export const directManpowerPositions = pgTable("direct_manpower_positions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(), // e.g., "mason", "carpenter"
  name: text("name").notNull(), // e.g., "Mason", "Carpenter"
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Direct Manpower Entries Table (daily manpower allocation)
export const directManpowerEntries = pgTable("direct_manpower_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  positions: text("positions").notNull(), // JSON string: { "mason": 5, "carpenter": 3, ... }
  totalManpower: integer("total_manpower").notNull(),
  remarks: text("remarks"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDirectManpowerPositionSchema = createInsertSchema(directManpowerPositions)
  .omit({ id: true, createdAt: true, updatedAt: true } as any);

export const insertDirectManpowerEntrySchema = createInsertSchema(directManpowerEntries)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    date: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    positions: z.record(z.string(), z.number()).or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return val; // Already JSON string
      }
      return JSON.stringify(val); // Convert object to JSON string
    }),
    totalManpower: z.string().or(z.number()).transform(val => typeof val === 'string' ? parseInt(val) : val),
  });

export type DirectManpowerPosition = typeof directManpowerPositions.$inferSelect;
export type InsertDirectManpowerPosition = z.infer<typeof insertDirectManpowerPositionSchema>;

export type DirectManpowerEntry = typeof directManpowerEntries.$inferSelect;
export type InsertDirectManpowerEntry = z.infer<typeof insertDirectManpowerEntrySchema>;

// Lesson Learnt Register Table
export const lessonLearntRegister = pgTable("lesson_learnt_register", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // Design, Engineering, Construction, etc.
  lesson: text("lesson").notNull(),
  type: text("type").notNull(), // Risk, Opportunity
  dateLogged: date("date_logged").notNull(),
  loggedBy: text("logged_by").notNull(),
  documents: text("documents").array().default([]), // Array of document names/links
  status: text("status").default("Open").notNull(), // Open, In Progress, Resolved, Closed
  impact: text("impact").notNull(), // Low, Medium, High, Critical
  priority: text("priority").notNull(), // Low, Medium, High, Urgent
  description: text("description").notNull(),
  recommendations: text("recommendations").notNull(),
  actionsTaken: text("actions_taken").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLessonLearntRegisterSchema = createInsertSchema(lessonLearntRegister)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    dateLogged: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    category: z.enum(["Design", "Engineering", "Construction", "Installation", "Testing", "Pre-commissioning", "Commissioning", "Procurement", "Subcontracts", "Quality", "Safety", "Others"]),
    type: z.enum(["Risk", "Opportunity"]),
    status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
    impact: z.enum(["Low", "Medium", "High", "Critical"]),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]),
    documents: z.array(z.string()).default([]),
  });

export type LessonLearntRegister = typeof lessonLearntRegister.$inferSelect;
export type InsertLessonLearntRegister = z.infer<typeof insertLessonLearntRegisterSchema>;

// Indirect Manpower Positions Table (project-specific position definitions)
export const indirectManpowerPositions = pgTable("indirect_manpower_positions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(), // e.g., "project_manager", "project_engineer"
  name: text("name").notNull(), // e.g., "Project Manager", "Project Engineer"
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Indirect Manpower Entries Table (daily overhead allocation - percentage-based)
export const indirectManpowerEntries = pgTable("indirect_manpower_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  positions: text("positions").notNull(), // JSON string: { "project_manager": 25, "project_engineer": 30, ... }
  totalOverhead: numeric("total_overhead", { precision: 10, scale: 2 }).notNull(), // Sum of percentages
  remarks: text("remarks"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIndirectManpowerPositionSchema = createInsertSchema(indirectManpowerPositions)
  .omit({ id: true, createdAt: true, updatedAt: true } as any);

export const insertIndirectManpowerEntrySchema = createInsertSchema(indirectManpowerEntries)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    date: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    positions: z.record(z.string(), z.number()).or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return val; // Already JSON string
      }
      return JSON.stringify(val); // Convert object to JSON string
    }),
    totalOverhead: z.string().or(z.number()).transform(val => val.toString()),
  });

export type IndirectManpowerPosition = typeof indirectManpowerPositions.$inferSelect;
export type InsertIndirectManpowerPosition = z.infer<typeof insertIndirectManpowerPositionSchema>;

export type IndirectManpowerEntry = typeof indirectManpowerEntries.$inferSelect;
export type InsertIndirectManpowerEntry = z.infer<typeof insertIndirectManpowerEntrySchema>;

// Planned Activities Table
export const plannedActivities = pgTable("planned_activities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'backlog' | 'planned' | 'advanced'
  status: text("status").notNull(), // 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  progress: integer("progress").default(0).notNull(), // 0-100
  assignedTo: text("assigned_to").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Planned Activity Tasks Table (tasks that belong to activities)
export const plannedActivityTasks = pgTable("planned_activity_tasks", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => plannedActivities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull(), // 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  assignedTo: text("assigned_to").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  progress: integer("progress").default(0).notNull(), // 0-100
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlannedActivitySchema = createInsertSchema(plannedActivities)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    startDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    endDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    progress: z.string().or(z.number()).transform(val => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      return Math.max(0, Math.min(100, num || 0));
    }),
  });

export const insertPlannedActivityTaskSchema = createInsertSchema(plannedActivityTasks)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    startDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    endDate: z.date().or(z.string()).transform(val => {
      if (typeof val === 'string') {
        return new Date(val).toISOString().split('T')[0];
      }
      return val.toISOString().split('T')[0];
    }),
    progress: z.string().or(z.number()).transform(val => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      return Math.max(0, Math.min(100, num || 0));
    }),
  });

export type PlannedActivity = typeof plannedActivities.$inferSelect;
export type InsertPlannedActivity = z.infer<typeof insertPlannedActivitySchema>;

export type PlannedActivityTask = typeof plannedActivityTasks.$inferSelect;
export type InsertPlannedActivityTask = z.infer<typeof insertPlannedActivityTaskSchema>;

// Kanban cards (project-scoped; columns: wish, ready, doing, done; archived = removed from board)
export const kanbanCards = pgTable("kanban_cards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  column: text("column").notNull(), // 'wish' | 'ready' | 'doing' | 'done'
  position: integer("position").notNull().default(0),
  priority: text("priority").default("normal"), // null = unset; immediate_urgent | before_end_of_today | normal
  wbsItemId: integer("wbs_item_id").references(() => wbsItems.id, { onDelete: "set null" }),
  projectActivityId: integer("project_activity_id").references(() => projectActivities.id, { onDelete: "set null" }),
  archivedAt: timestamp("archived_at"), // set when card is archived from done
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKanbanCardSchema = createInsertSchema(kanbanCards)
  .omit({ id: true, createdAt: true, updatedAt: true } as any)
  .extend({
    column: z.enum(["wish", "ready", "doing", "done"]).default("wish"),
    position: z.number().int().min(0).default(0),
    priority: z
      .enum(["immediate_urgent", "before_end_of_today", "normal"])
      .nullable()
      .optional(),
    wbsItemId: z.number().int().nullable().optional(),
    projectActivityId: z.number().int().nullable().optional(),
  });
export type KanbanCard = typeof kanbanCards.$inferSelect;
export type InsertKanbanCard = z.infer<typeof insertKanbanCardSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
