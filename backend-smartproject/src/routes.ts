import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertFileUploadRecord } from "./file-upload-helpers";
import { registerCorrespondenceRoutes } from "./correspondence-helpers";
import { registerWikiRecordRoutes } from "./wiki-register-routes";
import { registerCollabRoutes } from "./collab-routes";
import { validateWbsStructure } from "./wbs-validation.js";
import {
  computeActivityBudget,
  validateProjectActivityPayload,
  validateGlobalActivityPayload,
} from "./activity-types.js";

async function normalizeAndValidateGlobalActivity(
  data: {
    activityType?: string | null;
    name?: string;
    unitOfMeasure?: string | null;
    unitRate?: string | number | null;
    quantity?: string | number | null;
    totalBudget?: string | number | null;
    milestones?: Array<{ name?: string; weightPercent?: number; achieved?: boolean }> | null;
    progressState?: number | null;
  }
): Promise<{ error: string } | { data: typeof data & { unitOfMeasure?: string | null } }> {
  const validationError = validateGlobalActivityPayload(data);
  if (validationError) return { error: validationError };

  const type = data.activityType ?? "units";
  if (type === "units") {
    const uom = await storage.getUomByName(String(data.unitOfMeasure || ""));
    if (!uom) {
      return {
        error: `Unit of measure "${data.unitOfMeasure}" is not in the UOM master. Add it under Activity Master → UOM.`,
      };
    }
    return {
      data: {
        ...data,
        unitOfMeasure: uom.name,
        quantity: null,
        totalBudget: null,
      },
    };
  }

  return {
    data: {
      ...data,
      unitOfMeasure: null,
      unitRate: null,
      quantity: null,
      totalBudget: null,
      percentComplete: 0,
      progressState: 0,
    },
  };
}

import {
  insertProjectSchema as projectSchema,
  insertWbsItemSchema as wbsItemSchema,
  baseWbsSchema,
  insertDependencySchema as dependencySchema,
  insertCostEntrySchema as costEntrySchema,
  insertTaskSchema as taskSchema,
  insertActivitySchema,
  insertProjectActivitySchema,
  insertProjectTaskSchema,
  insertResourceSchema,
  insertTaskResourceSchema,
  insertProjectResourceSchema,
  insertCollaborationThreadSchema,
  insertCollaborationMessageSchema,
  insertProjectCollaborationThreadSchema,
  insertProjectCollaborationMessageSchema,
  type Project,
  type WbsItem,
  type Dependency,
  type CostEntry,
  type Task,
  type Activity,
  type Resource,
  type TaskResource,
  collaborationThreads,
  collaborationMessages,
  projectCollaborationThreads,
  projectCollaborationMessages,
  projects,
  workPackages,
  tasks,
  insertDailyProgressSchema,
  insertResourcePlanSchema,
  insertRiskRegisterSchema,
  insertLessonLearntRegisterSchema,
  insertDirectManpowerPositionSchema,
  insertDirectManpowerEntrySchema,
  insertIndirectManpowerPositionSchema,
  insertIndirectManpowerEntrySchema,
  insertPlannedActivitySchema,
  insertWorkPackageSchema,
  insertProjectActivityDependencySchema,
  insertMaterialMasterSchema,
  type InsertMaterialMaster,
  type MaterialMaster,
  insertServiceMasterSchema,
  insertServiceTypeSchema,
  insertServiceGroupSchema,
  insertVendorMasterSchema,
  type InsertVendorMaster,
  type VendorMaster,
  insertEmployeeMasterSchema,
  insertEmployeeResourceMappingSchema,
  insertRentalManpowerResourceMappingSchema,
  insertEquipmentMasterSchema,
  insertEquipmentResourceMappingSchema,
  insertRentalEquipmentResourceMappingSchema,
  insertToolMasterSchema,
  insertToolManufacturerSchema,
  insertToolTypeSchema,
  insertToolModelSchema,
  insertToolResourceMappingSchema,
  insertResourceTimesheetSchema,
  insertRentalManpowerSchema,
  materialMaster,
  serviceMaster,
  workPackageMaterials,
  workPackageServices,
  insertWorkPackageMaterialSchema,
  insertWorkPackageServiceSchema,
  serviceTypes,
  serviceGroups,
  vendorMaster,
  employeeMaster,
  rentalManpower,
  employeeResourceMappings,
  rentalManpowerResourceMappings,
  equipmentMaster,
  equipmentManufacturers,
  equipmentTypes,
  rentalEquipment,
  rentalEquipmentResourceMappings,
  toolMaster,
  toolResourceMappings,
  resourceTimesheets,
  insertEquipmentManufacturerSchema,
  insertEquipmentTypeSchema,
  insertRentalEquipmentSchema,
  equipmentResourceMappings,
  resources,
  fileUploads,
  uoms,
  materialTypes,
  materialGroups,
  insertUomSchema,
  insertMaterialTypeSchema,
  insertMaterialGroupSchema,
  countries,
  cities,
  insertCountrySchema,
  insertCitySchema,
  updateGlobalDefaultsSchema,
  nationalities,
  employeeTitles,
  employeePositions,
  employeeGrades,
  employeeTrades,
  insertNationalitySchema,
  insertEmployeeTitleSchema,
  insertEmployeePositionSchema,
  insertEmployeeGradeSchema,
  insertEmployeeTradeSchema,
  kanbanCards,
  insertKanbanCardSchema,
  insertPlannedActivityTaskSchema,
  type KanbanCard,
  type InsertPlannedActivityTask,
  projectActivityDependencies,
  projectActivities,
  projectActivityPlanVersions,
  plannedCostWorkpackages,
  projectResources,
  purchaseOrders,
  purchaseOrderItems,
  insertPurchaseRequisitionSchema,
  insertPurchaseRequisitionItemSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  type InsertPurchaseOrder,
  type InsertPurchaseRequisition,
  type InsertServiceMaster,
  type ServiceMaster,
} from "./schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import fileUpload from "express-fileupload";
// Create an inline implementation for cors
const cors = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  };
};
import { DatabaseStorage } from "./storage";
// Create uploadMiddleware using express-fileupload
const uploadMiddleware = fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
// Create an inline error handler
const handleError = (err: unknown, res: Response) => {
  console.error("Server error:", err);

  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({
      message: "Validation error: " + validationError.message,
      errors: err.errors
    });
  }

  if (err instanceof Error) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: "An unexpected error occurred" });
};

/** Work package rows for global resources (manpower, equipment, tools, etc.) joined to project/WP names. */
type WpAssignmentRollup = {
  projectResourceId: number;
  projectId: number;
  projectName: string;
  wpId: number;
  wpCode: string;
  wpName: string;
  quantity: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  durationDays: number | null;
};

function toIsoDateWp(d: unknown): string | null {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function durationDaysWp(start: unknown, end: unknown): number | null {
  const a = toIsoDateWp(start);
  const b = toIsoDateWp(end);
  if (!a || !b) return null;
  const t0 = new Date(a + "T12:00:00").getTime();
  const t1 = new Date(b + "T12:00:00").getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1)) return null;
  return Math.round((t1 - t0) / (24 * 60 * 60 * 1000)) + 1;
}

async function loadWpAssignmentsByGlobalResourceIds(
  resourceIds: number[],
  projectResourceType: string
): Promise<Map<number, WpAssignmentRollup[]>> {
  const assignmentsByResourceId = new Map<number, WpAssignmentRollup[]>();
  if (resourceIds.length === 0) return assignmentsByResourceId;

  const prRows = await db
    .select({
      id: projectResources.id,
      globalResourceId: projectResources.globalResourceId,
      projectId: projectResources.projectId,
      wpId: projectResources.wpId,
      quantity: projectResources.quantity,
      plannedStartDate: projectResources.plannedStartDate,
      plannedEndDate: projectResources.plannedEndDate,
      projectName: projects.name,
      wpCode: workPackages.code,
      wpName: workPackages.name,
    })
    .from(projectResources)
    .innerJoin(projects, eq(projectResources.projectId, projects.id))
    .innerJoin(workPackages, eq(projectResources.wpId, workPackages.id))
    .where(
      and(eq(projectResources.type, projectResourceType), inArray(projectResources.globalResourceId, resourceIds))
    );

  for (const row of prRows) {
    const gid = row.globalResourceId;
    if (gid == null) continue;
    const out: WpAssignmentRollup = {
      projectResourceId: row.id,
      projectId: row.projectId,
      projectName: row.projectName,
      wpId: row.wpId,
      wpCode: row.wpCode,
      wpName: row.wpName,
      quantity: String(row.quantity ?? "0"),
      plannedStartDate: toIsoDateWp(row.plannedStartDate),
      plannedEndDate: toIsoDateWp(row.plannedEndDate),
      durationDays: durationDaysWp(row.plannedStartDate, row.plannedEndDate),
    };
    const list = assignmentsByResourceId.get(gid) ?? [];
    list.push(out);
    assignmentsByResourceId.set(gid, list);
  }

  for (const [, list] of assignmentsByResourceId) {
    list.sort((a, b) => {
      const pc = a.projectName.localeCompare(b.projectName, undefined, { sensitivity: "base" });
      if (pc !== 0) return pc;
      return a.wpCode.localeCompare(b.wpCode, undefined, { numeric: true });
    });
  }

  return assignmentsByResourceId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Simple test endpoint that doesn't need database
  app.get("/api/hello", (_req: Request, res: Response) => {
    res.json({ message: "Hello from SmartConstruct API!" });
  });

  // Middleware
  app.use(cors());
  app.use(uploadMiddleware);

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const projectData = projectSchema.parse(req.body);
      const project = await storage.createProject(projectData);

      // Single project root + 3 default phase WBS children
      const totalBudget = Number(project.budget);

      const projectRoot = await storage.createWbsItem({
        projectId: project.id,
        parentId: null,
        name: project.name,
        level: 1,
        code: "1",
        type: "Summary",
        budgetedCost: totalBudget.toString(),
        actualCost: "0",
        percentComplete: "0",
        isTopLevel: true,
        description: "Project root WBS",
      } as any);

      const defaultPhaseWbs = [
        {
          name: "Engineering & Design",
          code: "1.1",
          share: 0.05,
          description: "Engineering and design phase",
        },
        {
          name: "Procurement & Construction",
          code: "1.2",
          share: 0.85,
          description: "Procurement and construction phase",
        },
        {
          name: "Testing & Commissioning",
          code: "1.3",
          share: 0.1,
          description: "Testing and commissioning phase",
        },
      ];

      for (const phase of defaultPhaseWbs) {
        await storage.createWbsItem({
          projectId: project.id,
          parentId: projectRoot.id,
          name: phase.name,
          level: 2,
          code: phase.code,
          type: "WBS",
          budgetedCost: (totalBudget * phase.share).toString(),
          actualCost: "0",
          percentComplete: "0",
          isTopLevel: false,
          description: phase.description,
        } as any);
      }

      res.status(201).json(project);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Use the project schema in partial mode for validation
      const projectData = projectSchema.partial().parse(req.body);

      // Check if budget is being changed
      if (projectData.budget !== undefined && Number(projectData.budget) !== Number(project.budget)) {
        // Get all WBS items for the project
        const wbsItems = await storage.getWbsItems(id);

        const projectRoot = wbsItems.find((item) => !item.parentId && item.isTopLevel);
        const rootChildren = projectRoot
          ? wbsItems.filter((item) => item.parentId === projectRoot.id)
          : [];
        const defaultChildNames = new Set([
          "Engineering & Design",
          "Procurement & Construction",
          "Testing & Commissioning",
        ]);
        const hasOnlyDefaultWbs =
          wbsItems.length === 4 &&
          !!projectRoot &&
          rootChildren.length === 3 &&
          rootChildren.every((item) => defaultChildNames.has(item.name));

        if (hasOnlyDefaultWbs && projectRoot) {
          const budgetDifference = Number(projectData.budget) - Number(project.budget);
          const procurementWbs = rootChildren.find(
            (item) => item.name === "Procurement & Construction"
          );

          await storage.updateWbsItem(projectRoot.id, {
            budgetedCost: projectData.budget!.toString(),
          });

          if (procurementWbs) {
            const newBudget = Number(procurementWbs.budgetedCost) + budgetDifference;

            if (newBudget < 0) {
              return res.status(400).json({
                message:
                  "Cannot reduce project budget by this amount as it would result in a negative budget for the Procurement & Construction WBS item",
              });
            }

            await storage.updateWbsItem(procurementWbs.id, {
              budgetedCost: newBudget.toString(),
            });
          }
        } else {
          // If custom WBS items exist, prevent budget changes
          return res.status(400).json({
            message: "Cannot change project budget after custom WBS items have been added"
          });
        }
      }

      const updatedProject = await storage.updateProject(id, projectData);

      res.json(updatedProject);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      await storage.deleteProject(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Activity routes
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const activity = await storage.getActivity(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      res.json(activity);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/activities", async (req: Request, res: Response) => {
    try {
      const parsed = insertActivitySchema.parse(req.body);
      const validated = await normalizeAndValidateGlobalActivity(parsed);
      if ("error" in validated) {
        return res.status(400).json({ message: validated.error });
      }
      const activity = await storage.createActivity({
        ...parsed,
        ...validated.data,
        activityType: parsed.activityType ?? "units",
      });
      res.status(201).json(activity);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Bulk import activity masters
  app.post("/api/activities/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }

      const activitiesToCreate: any[] = [];
      const rowErrors: Array<{ row: number; errors: unknown[] }> = [];

      for (let index = 0; index < csvData.length; index++) {
        const row = csvData[index];
        const parsed = insertActivitySchema.safeParse({
          ...row,
          activityType: row.activityType ?? "units",
        });
        if (!parsed.success) {
          rowErrors.push({
            row: index + 1,
            errors: parsed.error.errors,
          });
          continue;
        }
        const validated = await normalizeAndValidateGlobalActivity(parsed.data);
        if ("error" in validated) {
          rowErrors.push({
            row: index + 1,
            errors: [{ message: validated.error }],
          });
          continue;
        }
        activitiesToCreate.push({
          ...parsed.data,
          ...validated.data,
        });
      }

      if (rowErrors.length > 0) {
        return res.status(400).json({
          message: "Validation error in uploaded rows",
          errors: rowErrors,
        });
      }

      const createdActivities = await Promise.all(
        activitiesToCreate.map((activityData) => storage.createActivity(activityData))
      );
      res.status(201).json(createdActivities);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const activity = await storage.getActivity(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const parsed = insertActivitySchema.parse(req.body);
      const validated = await normalizeAndValidateGlobalActivity(parsed);
      if ("error" in validated) {
        return res.status(400).json({ message: validated.error });
      }
      const updatedActivity = await storage.updateActivity(id, {
        ...parsed,
        ...validated.data,
      });
      res.json(updatedActivity);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/activities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const activity = await storage.getActivity(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      await storage.deleteActivity(id);
      res.json({ message: "Activity deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Project Activity routes
  // Get all activities for a project (grouped by work package)
  app.get("/api/projects/:projectId/activities", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const activities = await storage.getProjectActivities(projectId);
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get activities for a specific work package
  app.get("/api/work-packages/:wpId/activities", async (req: Request, res: Response) => {
    try {
      const wpId = parseInt(req.params.wpId);
      if (isNaN(wpId)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      const activities = await storage.getProjectActivitiesByWorkPackage(wpId);
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/activities", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate wpId is provided
      if (!req.body.wpId) {
        return res.status(400).json({ message: "Work Package ID (wpId) is required" });
      }

      const wpId = parseInt(req.body.wpId);
      if (isNaN(wpId)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      // Verify the work package exists and belongs to the project
      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }
      if (workPackage.projectId !== projectId) {
        return res.status(400).json({ message: "Work package does not belong to this project" });
      }

      const parsed = insertProjectActivitySchema.parse({
        ...req.body,
        projectId,
        wpId,
      });

      const validationError = validateProjectActivityPayload(parsed);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const uomValidated = await normalizeAndValidateGlobalActivity(parsed);
      if ("error" in uomValidated) {
        return res.status(400).json({ message: uomValidated.error });
      }

      const activityBudget = computeActivityBudget(parsed);
      const siblingActivities = await storage.getProjectActivitiesByWorkPackage(wpId);
      const siblingBudget = siblingActivities.reduce(
        (sum, a) => sum + computeActivityBudget(a),
        0
      );
      if (siblingBudget + activityBudget > Number(workPackage.budgetedCost)) {
        return res.status(400).json({
          message: `Activity budgets (${(siblingBudget + activityBudget).toFixed(2)}) cannot exceed work package budget (${workPackage.budgetedCost})`,
        });
      }

      const activityData = {
        ...parsed,
        ...uomValidated.data,
        activityType: parsed.activityType ?? "units",
        percentComplete: parsed.percentComplete ?? 0,
        progressState: parsed.progressState ?? 0,
        finalized: parsed.finalized ?? false,
        milestones: parsed.milestones ?? null,
      };

      const activity = await storage.createProjectActivity(activityData);
      res.status(201).json(activity);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/activities/:activityId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activityId = parseInt(req.params.activityId);

      if (isNaN(projectId) || isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const activity = await storage.getProjectActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      if (activity.projectId !== projectId) {
        return res.status(400).json({ message: "Activity does not belong to this project" });
      }

      if (activity.finalized) {
        return res.status(400).json({ message: "Cannot edit a finalized activity" });
      }

      const wpId = req.body.wpId ?? activity.wpId;
      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      const parsed = insertProjectActivitySchema.parse({
        ...req.body,
        projectId,
        wpId,
      });

      const validationError = validateProjectActivityPayload(parsed);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const uomValidated = await normalizeAndValidateGlobalActivity(parsed);
      if ("error" in uomValidated) {
        return res.status(400).json({ message: uomValidated.error });
      }

      const activityBudget = computeActivityBudget(parsed);
      const siblingActivities = await storage.getProjectActivitiesByWorkPackage(wpId);
      const siblingBudget = siblingActivities
        .filter((a) => a.id !== activityId)
        .reduce((sum, a) => sum + computeActivityBudget(a), 0);
      if (siblingBudget + activityBudget > Number(workPackage.budgetedCost)) {
        return res.status(400).json({
          message: `Activity budgets (${(siblingBudget + activityBudget).toFixed(2)}) cannot exceed work package budget (${workPackage.budgetedCost})`,
        });
      }

      const activityData = {
        ...parsed,
        ...uomValidated.data,
        activityType: parsed.activityType ?? activity.activityType ?? "units",
        percentComplete: parsed.percentComplete ?? activity.percentComplete ?? 0,
        progressState: parsed.progressState ?? activity.progressState ?? 0,
        finalized: parsed.finalized ?? activity.finalized ?? false,
        milestones: parsed.milestones ?? activity.milestones ?? null,
      };

      const updatedActivity = await storage.updateProjectActivity(activityId, activityData);
      res.json(updatedActivity);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/activities/:activityId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activityId = parseInt(req.params.activityId);

      if (isNaN(projectId) || isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const activity = await storage.getProjectActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      if (activity.projectId !== projectId) {
        return res.status(400).json({ message: "Activity does not belong to this project" });
      }

      if (activity.finalized) {
        return res.status(400).json({ message: "Cannot delete a finalized activity" });
      }

      await storage.deleteProjectActivity(activityId);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Helper schema for project activity CSV import
  const projectActivityCsvRowSchema = z.object({
    workPackageCode: z.string().min(1, "workPackageCode is required"),
    name: z.string().min(1, "name is required"),
    description: z.string().optional().nullable(),
    unitOfMeasure: z.string().min(1, "unitOfMeasure is required"),
    unitRate: z.union([z.string(), z.number()]),
    duration: z.union([z.string(), z.number()]).optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    quantity: z.union([z.string(), z.number()]).optional().nullable(),
  });

  // Bulk import project activities from CSV (parsed on frontend)
  app.post("/api/projects/:projectId/activities/import-csv", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const { csvData } = req.body as { csvData?: unknown };
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Request body must include csvData array" });
      }

      // Preload work packages for this project to resolve workPackageCode
      const workPackages = await storage.getWorkPackagesByProject(projectId);
      const workPackagesByCode = new Map(workPackages.map(wp => [wp.code, wp]));

      // Preload global activities to reuse where possible
      const globalActivities = await storage.getActivities();
      const globalActivitiesByKey = new Map(
        globalActivities.map(act => [
          `${act.name}|${act.unitOfMeasure}|${act.unitRate}`,
          act,
        ]),
      );

      const errors: string[] = [];
      const createdActivities: any[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const rawRow = csvData[i];

        const parsed = projectActivityCsvRowSchema.safeParse(rawRow);
        if (!parsed.success) {
          const message = parsed.error.errors.map(e => e.message).join("; ");
          errors.push(`Row ${i + 1}: ${message}`);
          continue;
        }

        const row = parsed.data;

        const workPackage = workPackagesByCode.get(row.workPackageCode);
        if (!workPackage) {
          errors.push(
            `Row ${i + 1}: Work Package with code '${row.workPackageCode}' not found in this project`,
          );
          continue;
        }

        const hasDuration =
          row.duration !== undefined &&
          row.duration !== null &&
          String(row.duration).trim() !== "";
        const hasDates = !!row.startDate && !!row.endDate;

        if (!hasDuration && !hasDates) {
          errors.push(
            `Row ${i + 1}: Either duration or both startDate and endDate must be provided`,
          );
          continue;
        }

        let duration: number | null = null;
        let plannedFromDate: string | null = null;
        let plannedToDate: string | null = null;

        if (hasDuration) {
          const durNum = Number(row.duration);
          if (!Number.isFinite(durNum) || durNum <= 0) {
            errors.push(`Row ${i + 1}: duration must be a positive number`);
            continue;
          }
          duration = Math.round(durNum);
        }

        if (hasDates) {
          const start = new Date(row.startDate as string);
          const end = new Date(row.endDate as string);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            errors.push(`Row ${i + 1}: Invalid startDate or endDate`);
            continue;
          }

          if (end < start) {
            errors.push(`Row ${i + 1}: endDate must be on or after startDate`);
            continue;
          }

          plannedFromDate = start.toISOString().split("T")[0];
          plannedToDate = end.toISOString().split("T")[0];

          if (!duration) {
            const msPerDay = 24 * 60 * 60 * 1000;
            duration = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
          }
        }

        const unitRateNumber = Number(row.unitRate);
        if (!Number.isFinite(unitRateNumber) || unitRateNumber < 0) {
          errors.push(`Row ${i + 1}: unitRate must be a non-negative number`);
          continue;
        }
        const unitRateString = unitRateNumber.toString();

        const activityKey = `${row.name}|${row.unitOfMeasure}|${unitRateString}`;
        let globalActivity = globalActivitiesByKey.get(activityKey);

        if (!globalActivity) {
          try {
            globalActivity = await storage.createActivity({
              name: row.name,
              description: row.description ?? null,
              unitOfMeasure: row.unitOfMeasure,
              unitRate: unitRateString,
              remarks: null,
            } as any);

            globalActivitiesByKey.set(activityKey, globalActivity);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Failed to create global activity";
            errors.push(`Row ${i + 1}: ${message}`);
            continue;
          }
        }

        let quantityString = "1";
        if (row.quantity !== undefined && row.quantity !== null && String(row.quantity).trim() !== "") {
          const quantityNumber = Number(row.quantity);
          if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
            errors.push(`Row ${i + 1}: quantity must be a positive number if provided`);
            continue;
          }
          quantityString = quantityNumber.toString();
        }

        // Build payload for project activity creation
        const payload: any = {
          projectId,
          wpId: workPackage.id,
          globalActivityId: globalActivity.id,
          name: row.name,
          description: row.description ?? null,
          unitOfMeasure: row.unitOfMeasure,
          unitRate: unitRateString,
          quantity: quantityString,
          remarks: null,
          plannedFromDate,
          plannedToDate,
        };

        if (duration !== null) {
          payload.duration = duration;
        }

        try {
          const activityData = insertProjectActivitySchema.parse(payload);
          const created = await storage.createProjectActivity(activityData);
          createdActivities.push(created);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to create project activity";
          errors.push(`Row ${i + 1}: ${message}`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          message: "Some activities could not be imported",
          errors,
          createdCount: createdActivities.length,
        });
      }

      return res.status(201).json({
        message: "Activities imported successfully",
        createdCount: createdActivities.length,
        activities: createdActivities,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get categorized activities for a project (for page2 view)
  app.get("/api/projects/:projectId/activities/categorized", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const categorized = await storage.getCategorizedActivities(projectId);
      res.json(categorized);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get resources for activities (planned and actual utilization)
  app.get("/api/projects/:projectId/activities/resources", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const activityResources = await storage.getActivityResources(projectId);
      res.json(activityResources);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========== Activity Dependency Routes ==========

  // Get all activity dependencies for a project
  app.get("/api/projects/:projectId/activity-dependencies", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const dependencies = await db
        .select()
        .from(projectActivityDependencies)
        .where(eq(projectActivityDependencies.projectId, projectId));

      res.json(dependencies);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create a new activity dependency
  app.post("/api/projects/:projectId/activity-dependencies", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const depData = insertProjectActivityDependencySchema.parse({
        ...req.body,
        projectId,
      }) as any;

      const predecessorId = parseInt(req.body.predecessorId);
      const successorId = parseInt(req.body.successorId);

      if (isNaN(predecessorId) || isNaN(successorId)) {
        return res.status(400).json({ message: "predecessorId and successorId are required" });
      }

      // Verify both activities exist and belong to this project
      const [predecessor, successor] = await Promise.all([
        db.collection(projectActivities).find().toArray().where(
          and(
            eq(projectActivities.id, predecessorId),
            eq(projectActivities.projectId, projectId)
          )
        ),
        db.collection(projectActivities).find().toArray().where(
          and(
            eq(projectActivities.id, successorId),
            eq(projectActivities.projectId, projectId)
          )
        ),
      ]);

      if (predecessor.length === 0) {
        return res.status(404).json({ message: "Predecessor activity not found in this project" });
      }
      if (successor.length === 0) {
        return res.status(404).json({ message: "Successor activity not found in this project" });
      }

      // Prevent duplicate links
      const existing = await db
        .select()
        .from(projectActivityDependencies)
        .where(
          and(
            eq(projectActivityDependencies.projectId, projectId),
            eq(projectActivityDependencies.predecessorId, predecessorId),
            eq(projectActivityDependencies.successorId, successorId)
          )
        );

      if (existing.length > 0) {
        return res.status(409).json({ message: "This dependency link already exists" });
      }

      const [created] = await db
        .insert(projectActivityDependencies)
        .values({
          projectId,
          predecessorId,
          successorId,
          type: depData.type || "FS",
          lag: depData.lag || 0,
        })
        .returning();

      const p = await storage.getProject(projectId);
      if (p) {
        const seq = ((p as any).sequenceVersion ?? 0) + 1;
        await storage.updateProject(projectId, { sequenceVersion: seq });
      }

      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Update an activity dependency
  app.put("/api/projects/:projectId/activity-dependencies/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const depId = parseInt(req.params.id);
      if (isNaN(projectId) || isNaN(depId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const [existing] = await db
        .select()
        .from(projectActivityDependencies)
        .where(
          and(
            eq(projectActivityDependencies.id, depId),
            eq(projectActivityDependencies.projectId, projectId)
          )
        );
      if (!existing) return res.status(404).json({ message: "Dependency not found" });

      const type = req.body.type != null ? String(req.body.type) : existing.type;
      const lag = req.body.lag != null ? Number(req.body.lag) : existing.lag;
      if (!["FS", "SS", "FF", "SF"].includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }

      const [updated] = await db
        .update(projectActivityDependencies)
        .set({ type, lag })
        .where(eq(projectActivityDependencies.id, depId))
        .returning();

      const p2 = await storage.getProject(projectId);
      if (p2) {
        const seq = ((p2 as any).sequenceVersion ?? 0) + 1;
        await storage.updateProject(projectId, { sequenceVersion: seq });
      }

      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Delete an activity dependency
  app.delete("/api/projects/:projectId/activity-dependencies/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const depId = parseInt(req.params.id);

      if (isNaN(projectId) || isNaN(depId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const [dep] = await db
        .select()
        .from(projectActivityDependencies)
        .where(
          and(
            eq(projectActivityDependencies.id, depId),
            eq(projectActivityDependencies.projectId, projectId)
          )
        );

      if (!dep) {
        return res.status(404).json({ message: "Dependency not found" });
      }

      await db
        .delete(projectActivityDependencies)
        .where(eq(projectActivityDependencies.id, depId));

      const p = await storage.getProject(projectId);
      if (p) {
        const seq = ((p as any).sequenceVersion ?? 0) + 1;
        await storage.updateProject(projectId, { sequenceVersion: seq });
      }

      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========== CPM Scheduling Endpoint ==========

  app.post("/api/projects/:projectId/schedule", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.startDate) {
        return res.status(400).json({ message: "Project must have a start date set before scheduling" });
      }

      const projectStartDate = new Date(project.startDate);
      const currentPlanVersion = (project as any).planVersion ?? 0;
      const isInitialPlan = currentPlanVersion === 0;

      // Fetch all activities and dependencies
      const activitiesRaw = await db
        .select()
        .from(projectActivities)
        .where(eq(projectActivities.projectId, projectId));

      const deps = await db
        .select()
        .from(projectActivityDependencies)
        .where(eq(projectActivityDependencies.projectId, projectId));

      if (activitiesRaw.length === 0) {
        return res.status(400).json({ message: "No activities found for this project" });
      }

      // Build activity map with durations and firmed start offsets
      const getDayOffset = (base: Date, targetStr: string | null): number => {
        if (!targetStr) return 0;
        const target = new Date(targetStr);
        const diffTime = target.getTime() - base.getTime();
        return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      };

      const actMap = new Map<number, { id: number; duration: number; name: string; firmedOffset: number }>();
      for (const act of activitiesRaw) {
        actMap.set(act.id, {
          id: act.id,
          duration: act.duration && act.duration > 0 ? act.duration : 1,
          name: act.name,
          firmedOffset: getDayOffset(projectStartDate, act.plannedFromDate),
        });
      }

      // Build adjacency lists
      const successors = new Map<number, { actId: number; type: string; lag: number }[]>();
      const predecessors = new Map<number, { actId: number; type: string; lag: number }[]>();
      const inDegree = new Map<number, number>();

      for (const act of activitiesRaw) {
        successors.set(act.id, []);
        predecessors.set(act.id, []);
        inDegree.set(act.id, 0);
      }

      for (const dep of deps) {
        // Only process deps where both activities exist in this project
        if (!actMap.has(dep.predecessorId) || !actMap.has(dep.successorId)) continue;

        successors.get(dep.predecessorId)!.push({
          actId: dep.successorId,
          type: dep.type,
          lag: dep.lag ?? 0,
        });
        predecessors.get(dep.successorId)!.push({
          actId: dep.predecessorId,
          type: dep.type,
          lag: dep.lag ?? 0,
        });
        inDegree.set(dep.successorId, (inDegree.get(dep.successorId) || 0) + 1);
      }

      // ─── Topological Sort (Kahn's algorithm) ─────────────────
      const topoOrder: number[] = [];
      const queue: number[] = [];

      for (const [actId, degree] of inDegree) {
        if (degree === 0) queue.push(actId);
      }

      const tempInDegree = new Map(inDegree);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        topoOrder.push(curr);

        for (const succ of successors.get(curr) || []) {
          const newDeg = (tempInDegree.get(succ.actId) || 0) - 1;
          tempInDegree.set(succ.actId, newDeg);
          if (newDeg === 0) queue.push(succ.actId);
        }
      }

      // Check for circular dependencies
      if (topoOrder.length < activitiesRaw.length) {
        for (const act of activitiesRaw) {
          if (!topoOrder.includes(act.id)) {
            topoOrder.push(act.id);
          }
        }
      }

      // ─── Forward Pass ────────────────────────────────────────
      const es = new Map<number, number>(); // Early Start (day offset from project start)
      const ef = new Map<number, number>(); // Early Finish

      for (const actId of topoOrder) {
        const act = actMap.get(actId)!;
        const preds = predecessors.get(actId) || [];

        let earliestStart = 0;

        if (preds.length === 0) {
          // ROOT activity - respect user-defined firmed date
          earliestStart = act.firmedOffset;
        } else {
          for (const pred of preds) {
            const predAct = actMap.get(pred.actId)!;
            const predES = es.get(pred.actId) ?? 0;
            const predEF = ef.get(pred.actId) ?? 0;

            let constraint: number;
            switch (pred.type) {
              case "FS":
                constraint = predEF + 1 + pred.lag;
                break;
              case "SS":
                constraint = predES + pred.lag;
                break;
              case "FF":
                constraint = predEF + pred.lag - act.duration + 1;
                break;
              case "SF":
                constraint = predES + pred.lag - act.duration + 1;
                break;
              default:
                constraint = predEF + 1 + pred.lag;
            }
            earliestStart = Math.max(earliestStart, constraint);
          }
        }

        es.set(actId, earliestStart);
        ef.set(actId, earliestStart + act.duration - 1);
      }

      // ─── Backward Pass ───────────────────────────────────────
      let projectEndDay = 0;
      for (const [, finish] of ef) {
        projectEndDay = Math.max(projectEndDay, finish);
      }

      const ls = new Map<number, number>(); // Late Start
      const lf = new Map<number, number>(); // Late Finish
      const totalFloat = new Map<number, number>();

      for (const act of activitiesRaw) {
        lf.set(act.id, projectEndDay);
      }

      for (let i = topoOrder.length - 1; i >= 0; i--) {
        const actId = topoOrder[i];
        const act = actMap.get(actId)!;
        const succs = successors.get(actId) || [];

        let latestFinish = projectEndDay;

        for (const succ of succs) {
          const succLS = ls.get(succ.actId) ?? projectEndDay;
          const succLF = lf.get(succ.actId) ?? projectEndDay;

          let constraint: number;
          switch (succ.type) {
            case "FS":
              constraint = (succLS) - 1 - succ.lag;
              break;
            case "SS":
              constraint = (succLS) - succ.lag + act.duration - 1;
              break;
            case "FF":
              constraint = (succLF) - succ.lag;
              break;
            case "SF":
              constraint = (succLF) - succ.lag + act.duration - 1;
              break;
            default:
              constraint = (succLS) - 1 - succ.lag;
          }
          latestFinish = Math.min(latestFinish, constraint);
        }

        lf.set(actId, latestFinish);
        ls.set(actId, latestFinish - act.duration + 1);
        totalFloat.set(actId, (latestFinish - act.duration + 1) - (es.get(actId) ?? 0));
      }

      // ─── Critical Path ───────────────────────────────────────
      const criticalPath: number[] = [];
      for (const actId of topoOrder) {
        if ((totalFloat.get(actId) ?? Infinity) === 0) {
          criticalPath.push(actId);
        }
      }

      // ─── Convert day offsets to dates & update DB ────────────
      const addDays = (base: Date, days: number): string => {
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
      };

      const results: any[] = [];

      for (const actId of topoOrder) {
        const act = actMap.get(actId)!;
        const earlyStart = es.get(actId) ?? 0;
        const earlyFinish = ef.get(actId) ?? 0;
        const lateStart = ls.get(actId) ?? 0;
        const lateFinish = lf.get(actId) ?? 0;
        const float = totalFloat.get(actId) ?? 0;
        const isCritical = float === 0;

        const esDate = addDays(projectStartDate, earlyStart);
        const efDate = addDays(projectStartDate, earlyFinish);
        const lsDate = addDays(projectStartDate, lateStart);
        const lfDate = addDays(projectStartDate, lateFinish);

        // Only persist schedule dates back to project_activities for the initial plan (baseline).
        // Revised plans are stored in project_activity_plan_versions without overwriting baseline columns.
        if (isInitialPlan) {
          await db
            .update(projectActivities)
            .set({
              plannedFromDate: esDate,
              plannedToDate: efDate,
              duration: act.duration,
              earlyStartDay: earlyStart,
              earlyFinishDay: earlyFinish,
              lateStartDay: lateStart,
              lateFinishDay: lateFinish,
              totalFloatDays: float,
            })
            .where(eq(projectActivities.id, actId));
        }

        results.push({
          id: actId,
          name: act.name,
          duration: act.duration,
          es: earlyStart,
          ef: earlyFinish,
          ls: lateStart,
          lf: lateFinish,
          es_date: esDate,
          ef_date: efDate,
          ls_date: lsDate,
          lf_date: lfDate,
          float,
          isCritical,
          plannedFromDate: esDate,
          plannedToDate: efDate,
        });
      }

      // Persist this plan version (schedule + sequence) without overwriting previous versions
      const projectEndDate = addDays(projectStartDate, projectEndDay);
      const nextVersion = currentPlanVersion + 1;

      await db.insert(projectActivityPlanVersions).values({
        projectId,
        version: nextVersion,
        activitiesJson: JSON.stringify(results),
        dependenciesJson: JSON.stringify(deps),
      });

      // Update project with latest plan version and end date
      await storage.updateProject(projectId, { planVersion: nextVersion, endDate: projectEndDate });

      res.json({
        projectStartDate: project.startDate,
        projectEndDate,
        totalDuration: projectEndDay + 1,
        criticalPath,
        activities: results,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========== Plan Versions (Schedule History) ==========

  // List all plan versions for a project (with basic summary)
  app.get("/api/projects/:projectId/plan-versions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const rows = await db
        .select()
        .from(projectActivityPlanVersions)
        .where(eq(projectActivityPlanVersions.projectId, projectId))
        .orderBy(projectActivityPlanVersions.version);

      const summaries = rows.map(row => {
        let activities: any[] = [];
        let deps: any[] = [];
        try {
          activities = JSON.parse(row.activitiesJson || "[]");
        } catch {
          activities = [];
        }
        try {
          deps = JSON.parse(row.dependenciesJson || "[]");
        } catch {
          deps = [];
        }

        const activityCount = activities.length;
        const dependencyCount = deps.length;

        let startDate: string | null = null;
        let endDate: string | null = null;
        for (const a of activities) {
          const esDate = a.es_date ?? a.plannedFromDate;
          const lfDate = a.lf_date ?? a.plannedToDate;
          if (esDate) {
            if (!startDate || new Date(esDate) < new Date(startDate)) startDate = esDate;
          }
          if (lfDate) {
            if (!endDate || new Date(lfDate) > new Date(endDate)) endDate = lfDate;
          }
        }

        return {
          id: row.id,
          version: row.version,
          createdAt: (row as any).createdAt,
          activityCount,
          dependencyCount,
          startDate,
          endDate,
        };
      });

      res.json(summaries);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get details for a specific plan version (activities + dependencies)
  app.get("/api/projects/:projectId/plan-versions/:version", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const version = parseInt(req.params.version);
      if (isNaN(projectId) || isNaN(version)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const [row] = await db
        .select()
        .from(projectActivityPlanVersions)
        .where(
          and(
            eq(projectActivityPlanVersions.projectId, projectId),
            eq(projectActivityPlanVersions.version, version),
          )
        );

      if (!row) {
        return res.status(404).json({ message: "Plan version not found" });
      }

      let activities: any[] = [];
      let deps: any[] = [];
      try {
        activities = JSON.parse(row.activitiesJson || "[]");
      } catch {
        activities = [];
      }
      try {
        deps = JSON.parse(row.dependenciesJson || "[]");
      } catch {
        deps = [];
      }

      res.json({
        id: row.id,
        projectId: row.projectId,
        version: row.version,
        createdAt: (row as any).createdAt,
        activities,
        dependencies: deps,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Project Task routes
  // Get all tasks for a project
  app.get("/api/projects/:projectId/tasks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const tasks = await storage.getProjectTasks(projectId);
      res.json(tasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get open tasks for a project (not closed)
  app.get("/api/projects/:projectId/tasks/open", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const tasks = await storage.getOpenProjectTasks(projectId);
      res.json(tasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get tasks for a specific activity
  app.get("/api/activities/:activityId/tasks", async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const activity = await storage.getProjectActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const tasks = await storage.getProjectTasksByActivity(activityId);
      res.json(tasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/tasks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate activityId is provided
      if (!req.body.activityId) {
        return res.status(400).json({ message: "Activity ID (activityId) is required" });
      }

      const activityId = parseInt(req.body.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      // Verify the activity exists and belongs to the project
      const activity = await storage.getProjectActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      if (activity.projectId !== projectId) {
        return res.status(400).json({ message: "Activity does not belong to this project" });
      }

      const taskData = insertProjectTaskSchema.parse({
        ...req.body,
        projectId,
        activityId
      });

      const task = await storage.createProjectTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/tasks/:taskId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskId = parseInt(req.params.taskId);

      if (isNaN(projectId) || isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const task = await storage.getProjectTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.projectId !== projectId) {
        return res.status(400).json({ message: "Task does not belong to this project" });
      }

      // Use partial schema for updates - preserve existing activityId if not provided
      const partialTaskSchema = insertProjectTaskSchema.partial();
      const taskData = partialTaskSchema.parse({
        ...req.body,
        projectId, // Ensure projectId is preserved
        activityId: req.body.activityId ?? task.activityId, // Preserve existing activityId if not provided
      });

      const updatedTask = await storage.updateProjectTask(taskId, taskData);
      res.json(updatedTask);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Close a task (set closedDate to today)
  app.patch("/api/projects/:projectId/tasks/:taskId/close", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskId = parseInt(req.params.taskId);

      if (isNaN(projectId) || isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const task = await storage.getProjectTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.projectId !== projectId) {
        return res.status(400).json({ message: "Task does not belong to this project" });
      }

      const closedTask = await storage.closeProjectTask(taskId);
      if (!closedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(closedTask);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/tasks/:taskId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const taskId = parseInt(req.params.taskId);

      if (isNaN(projectId) || isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const task = await storage.getProjectTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.projectId !== projectId) {
        return res.status(400).json({ message: "Task does not belong to this project" });
      }

      await storage.deleteProjectTask(taskId);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // WBS routes
  app.get("/api/projects/:projectId/wbs", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const wbsItems = await storage.getWbsItems(projectId);
      res.json(wbsItems);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/wbs/finalize", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if ((project as { wbsFinalized?: boolean }).wbsFinalized) {
        return res.status(400).json({ message: "WBS structure is already finalized" });
      }

      const wbsItems = await storage.getWbsItems(projectId);
      const workPackages = await storage.getWorkPackagesByProject(projectId);
      const validation = validateWbsStructure(wbsItems as any, workPackages as any);

      if (!validation.valid) {
        return res.status(400).json({
          message: "Complete the WBS structure completely",
          issues: validation.issues,
          invalidWbsIds: validation.invalidWbsIds,
        });
      }

      const updated = await storage.updateProject(projectId, { wbsFinalized: true } as any);
      res.json({ ok: true, wbsFinalized: true, project: updated });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/work-packages", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const workPackages = await storage.getWorkPackagesByProject(projectId);
      res.json(workPackages);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/wbs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const wbsItem = await storage.getWbsItem(id);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      res.json(wbsItem);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/wbs", async (req: Request, res: Response) => {
    try {
      const wbsItemData = wbsItemSchema.parse(req.body);

      // Validate that the project exists
      const project = await storage.getProject(wbsItemData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const allWbsItems = await storage.getWbsItems(wbsItemData.projectId);
      let level = 1;
      let code = "";
      let type: "Summary" | "WBS" | "Activity" | "WorkPackage" = wbsItemData.type;
      let isTopLevel = false;

      if (!wbsItemData.parentId) {
        // Root level
        level = 1;
        type = "Summary";
        isTopLevel = true;

        // Count existing top-level items to determine next number
        const topLevelItems = allWbsItems.filter(item => !item.parentId);
        code = (topLevelItems.length + 1).toString();
      } else {
        // Child level
        const parentWbsItem = await storage.getWbsItem(wbsItemData.parentId);
        if (!parentWbsItem) {
          return res.status(404).json({ message: "Parent WBS item not found" });
        }

        const parentWorkPackages = await storage.getWorkPackagesByWbsItem(parentWbsItem.id);
        if (parentWorkPackages.length > 0) {
          return res.status(400).json({
            message:
              "Cannot add child WBS — this item already has work packages. Remove work packages first or add WBS under a different parent.",
          });
        }

        level = parentWbsItem.level + 1;
        if (level > 9) {
          return res.status(400).json({ message: "Maximum WBS hierarchy level (9) reached" });
        }

        type = "WBS";
        isTopLevel = false;

        // Count existing siblings to determine next sub-number
        const siblings = allWbsItems.filter(item => item.parentId === wbsItemData.parentId);
        code = `${parentWbsItem.code}.${siblings.length + 1}`;

        // BUDGET VALIDATION
        if (wbsItemData.budgetedCost && Number(wbsItemData.budgetedCost) > Number(parentWbsItem.budgetedCost)) {
          return res.status(400).json({
            message: `Budget cannot exceed parent's budget of ${parentWbsItem.budgetedCost}`
          });
        }

        const siblingsSum = siblings.reduce((sum, sibling) => sum + Number(sibling.budgetedCost), 0);
        if (wbsItemData.budgetedCost && (siblingsSum + Number(wbsItemData.budgetedCost)) > Number(parentWbsItem.budgetedCost)) {
          return res.status(400).json({
            message: `Sum of all child budgets (${siblingsSum + wbsItemData.budgetedCost}) cannot exceed parent's budget (${parentWbsItem.budgetedCost})`
          });
        }
      }

      const finalWbsItemData = {
        ...wbsItemData,
        level,
        code,
        type,
        isTopLevel,
        actualCost: "0",
        percentComplete: "0",
      };

      const wbsItem = await storage.createWbsItem(finalWbsItemData as any);
      res.status(201).json(wbsItem);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/wbs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const wbsItem = await storage.getWbsItem(id);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      const partialWbsSchema = baseWbsSchema.partial();
      const wbsItemData = partialWbsSchema.parse(req.body);

      // BUDGET VALIDATION
      // Check if the budget is being changed
      if (wbsItemData.budgetedCost !== undefined && Number(wbsItemData.budgetedCost) !== Number(wbsItem.budgetedCost)) {
        // Get all WBS items for the project to validate budget constraints
        const projectWbsItems = await storage.getWbsItems(wbsItem.projectId);

        // 1. If item has a parent, check that new budget doesn't exceed parent budget
        if (wbsItem.parentId) {
          const parentWbsItem = projectWbsItems.find(item => item.id === wbsItem.parentId);
          if (parentWbsItem) {
            // Only apply this constraint to Summary and WorkPackage types (Activity can't have budget)
            if (wbsItem.type !== "Activity" && Number(wbsItemData.budgetedCost) > Number(parentWbsItem.budgetedCost)) {
              return res.status(400).json({
                message: `Budget cannot exceed parent's budget of ${parentWbsItem.budgetedCost}`
              });
            }
          }
        }

        // 2. If item has children, check that sum of all children's budgets doesn't exceed this item's budget
        // We don't enforce this for "Activity" types since they can't have children
        if (wbsItem.type !== "Activity") {
          const childItems = projectWbsItems.filter(item => item.parentId === wbsItem.id);
          if (childItems.length > 0) {
            // Calculate sum of child budgets, not including Activities (they have 0 budget)
            const childBudgetSum = childItems
              .filter(child => child.type !== "Activity")
              .reduce((sum, child) => sum + Number(child.budgetedCost), 0);

            if (childBudgetSum > Number(wbsItemData.budgetedCost)) {
              return res.status(400).json({
                message: `Budget cannot be less than the sum of child budgets (${childBudgetSum})`
              });
            }
          }
        }
      }

      // TYPE VALIDATION
      // If changing type, apply the same business rules
      if (wbsItemData.type && wbsItemData.type !== wbsItem.type) {
        // Top-level items must be Summary
        if (wbsItem.isTopLevel && wbsItemData.type !== "Summary") {
          return res.status(400).json({
            message: "Top-level WBS items must be of type 'Summary'"
          });
        }

        // Check parent-child type relationships if changing type
        if (wbsItem.parentId) {
          const parentWbsItem = await storage.getWbsItem(wbsItem.parentId);
          if (!parentWbsItem) {
            return res.status(404).json({ message: "Parent WBS item not found" });
          }

          // Apply same rules as in the POST endpoint (Summary and WBS can have Summary/WBS/WorkPackage children, not Activity directly)
          if (parentWbsItem.type === "Summary" || parentWbsItem.type === "WBS") {
            if (wbsItemData.type === "Activity") {
              return res.status(400).json({
                message: "A 'Summary' WBS item cannot have an 'Activity' as a direct child. It must have a 'WorkPackage' in between."
              });
            }
          } else if (parentWbsItem.type === "WorkPackage") {
            if (wbsItemData.type !== "Activity") {
              return res.status(400).json({
                message: "A 'WorkPackage' can only have 'Activity' items as children"
              });
            }
          }
        }

        // Check for children compatibility with new type
        const projectWbsItems = await storage.getWbsItems(wbsItem.projectId);
        const children = projectWbsItems.filter(item => item.parentId === wbsItem.id);

        if (children.length > 0) {
          if (wbsItemData.type === "Activity") {
            return res.status(400).json({
              message: "Cannot change to 'Activity' type because this item has children. 'Activity' items cannot have children."
            });
          }

          if (wbsItemData.type === "WorkPackage") {
            const hasNonActivityChildren = children.some(child => child.type !== "Activity");
            if (hasNonActivityChildren) {
              return res.status(400).json({
                message: "Cannot change to 'WorkPackage' type because this item has non-Activity children. 'WorkPackage' items can only have 'Activity' children."
              });
            }
          }
        }
      }

      const updatedWbsItem = await storage.updateWbsItem(id, wbsItemData);

      res.json(updatedWbsItem);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/wbs/:id/progress", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const wbsItem = await storage.getWbsItem(id);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      const updateData = {
        percentComplete: req.body.percentComplete,
        actualStartDate: req.body.actualStartDate,
        actualEndDate: req.body.actualEndDate
      };

      const updatedWbsItem = await storage.updateWbsItem(id, updateData as any);
      res.json(updatedWbsItem);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/wbs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const wbsItem = await storage.getWbsItem(id);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      // Don't allow deletion of top-level WBS items
      if (wbsItem.isTopLevel) {
        return res.status(400).json({ message: "Cannot delete top-level WBS items" });
      }

      await storage.deleteWbsItem(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Work Package routes
  app.get("/api/wbs/:wbsItemId/work-packages", async (req: Request, res: Response) => {
    try {
      const wbsItemId = parseInt(req.params.wbsItemId);
      if (isNaN(wbsItemId)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const wbsItem = await storage.getWbsItem(wbsItemId);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      if (wbsItem.isTopLevel) {
        return res.json([]);
      }

      const workPackages = await storage.getWorkPackagesByWbsItem(wbsItemId);
      res.json(workPackages);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/work-packages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(id);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      res.json(workPackage);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/work-packages", async (req: Request, res: Response) => {
    try {
      const workPackageData = insertWorkPackageSchema.parse(req.body);

      // Validate that the WBS item exists
      const wbsItem = await storage.getWbsItem(workPackageData.wbsItemId);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      if (wbsItem.isTopLevel) {
        return res.status(400).json({ message: "Cannot add work packages to root level WBS" });
      }

      const project = await storage.getProject(workPackageData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const parentWbsChildren = (await storage.getWbsItems(workPackageData.projectId)).filter(
        (child) =>
          child.parentId === wbsItem.id &&
          (child.type === "Summary" || child.type === "WBS")
      );
      if (parentWbsChildren.length > 0) {
        return res.status(400).json({
          message:
            "Cannot add work packages — this WBS already has child WBS items. Use work packages on the lowest-level WBS only.",
        });
      }

      let code = workPackageData.code;
      if (!code) {
        const existingWorkPackages = await storage.getWorkPackagesByWbsItem(workPackageData.wbsItemId);
        const sequentialIndex = existingWorkPackages.length + 1;
        // Code format: {wbsCode}.{sequentialIndex}
        // e.g., if WBS code is "1.2.1.1", WP codes will be "1.2.1.1.1", "1.2.1.1.2", etc.
        code = `${wbsItem.code}.${sequentialIndex}`;
      } else {
        // Validate code uniqueness within project
        const allProjectWorkPackages = await storage.getWorkPackagesByProject(workPackageData.projectId);
        const codeExists = allProjectWorkPackages.some(wp => wp.code === code);
        if (codeExists) {
          return res.status(400).json({
            message: `Work Package code "${code}" already exists in this project. Code must be unique within a project.`
          });
        }
      }

      // Budget validation - check against parent WBS budget
      if (Number(workPackageData.budgetedCost) > Number(wbsItem.budgetedCost)) {
        return res.status(400).json({
          message: `Budget cannot exceed parent WBS budget of ${wbsItem.budgetedCost}`
        });
      }

      // Check sum of existing work packages
      const existingWorkPackages = await storage.getWorkPackagesByWbsItem(workPackageData.wbsItemId);
      const totalBudget = existingWorkPackages.reduce((sum, wp) => sum + Number(wp.budgetedCost), 0);
      if ((totalBudget + Number(workPackageData.budgetedCost)) > Number(wbsItem.budgetedCost)) {
        return res.status(400).json({
          message: `Sum of all work package budgets (${totalBudget + Number(workPackageData.budgetedCost)}) cannot exceed parent WBS budget (${wbsItem.budgetedCost})`
        });
      }

      const finalWorkPackageData = {
        ...workPackageData,
        code,
        actualCost: "0",
        percentComplete: "0",
      };

      const workPackage = await storage.createWorkPackage(finalWorkPackageData as any);
      res.status(201).json(workPackage);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/work-packages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(id);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      const partialWorkPackageSchema = insertWorkPackageSchema.partial();
      const workPackageData = partialWorkPackageSchema.parse(req.body);

      // Code uniqueness validation if code is being changed
      if (workPackageData.code && workPackageData.code !== workPackage.code) {
        const allProjectWorkPackages = await storage.getWorkPackagesByProject(workPackage.projectId);
        const codeExists = allProjectWorkPackages.some(wp => wp.code === workPackageData.code && wp.id !== id);
        if (codeExists) {
          return res.status(400).json({
            message: `Work Package code "${workPackageData.code}" already exists in this project. Code must be unique within a project.`
          });
        }
      }

      // Budget validation
      if (workPackageData.budgetedCost !== undefined) {
        const wbsItem = await storage.getWbsItem(workPackage.wbsItemId);
        if (wbsItem) {
          // Check against parent WBS budget
          if (Number(workPackageData.budgetedCost) > Number(wbsItem.budgetedCost)) {
            return res.status(400).json({
              message: `Budget cannot exceed parent WBS budget of ${wbsItem.budgetedCost}`
            });
          }

          // Check sum of other work packages
          const allWorkPackages = await storage.getWorkPackagesByWbsItem(workPackage.wbsItemId);
          const otherWorkPackagesTotal = allWorkPackages
            .filter(wp => wp.id !== id)
            .reduce((sum, wp) => sum + Number(wp.budgetedCost), 0);

          if ((otherWorkPackagesTotal + Number(workPackageData.budgetedCost)) > Number(wbsItem.budgetedCost)) {
            return res.status(400).json({
              message: `Sum of all work package budgets (${otherWorkPackagesTotal + Number(workPackageData.budgetedCost)}) cannot exceed parent WBS budget (${wbsItem.budgetedCost})`
            });
          }
        }
      }

      const updatedWorkPackage = await storage.updateWorkPackage(id, workPackageData);
      if (!updatedWorkPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      res.json(updatedWorkPackage);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/work-packages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(id);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      await storage.deleteWorkPackage(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Dependency routes
  app.get("/api/wbs/:wbsItemId/dependencies", async (req: Request, res: Response) => {
    try {
      const wbsItemId = parseInt(req.params.wbsItemId);
      if (isNaN(wbsItemId)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const dependencies = await storage.getDependencies(wbsItemId);
      res.json(dependencies);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/dependencies", async (req: Request, res: Response) => {
    try {
      const dependencyData = z.object({
        predecessorId: z.number(),
        successorId: z.number(),
        type: z.enum(["FinishToStart", "StartToStart", "FinishToFinish", "StartToFinish"]),
        lag: z.number().default(0),
      }).parse(req.body);

      // Check for circular dependencies
      if (dependencyData.predecessorId === dependencyData.successorId) {
        return res.status(400).json({ message: "Cannot create self-dependency" });
      }

      // Validate that both WBS items exist
      const predecessor = await storage.getWbsItem(dependencyData.predecessorId);
      if (!predecessor) {
        return res.status(404).json({ message: "Predecessor WBS item not found" });
      }

      const successor = await storage.getWbsItem(dependencyData.successorId);
      if (!successor) {
        return res.status(404).json({ message: "Successor WBS item not found" });
      }

      // Only Activity items should have dependencies
      if (predecessor.type !== "Activity" || successor.type !== "Activity") {
        return res.status(400).json({
          message: "Dependencies can only be created between 'Activity' items"
        });
      }

      const dependency = await storage.createDependency(dependencyData);
      res.status(201).json(dependency);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/dependencies/:predecessorId/:successorId", async (req: Request, res: Response) => {
    try {
      const predecessorId = parseInt(req.params.predecessorId);
      const successorId = parseInt(req.params.successorId);

      if (isNaN(predecessorId) || isNaN(successorId)) {
        return res.status(400).json({ message: "Invalid dependency IDs" });
      }

      // Get the dependency ID first
      const dependencies = await storage.getDependencies(predecessorId);
      const dependency = dependencies.find(d => d.successorId === successorId);
      if (!dependency) {
        return res.status(404).json({ message: "Dependency not found" });
      }

      await storage.deleteDependency(dependency.id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Cost entry routes
  app.get("/api/wbs/:wbsItemId/costs", async (req: Request, res: Response) => {
    try {
      const wbsItemId = parseInt(req.params.wbsItemId);
      if (isNaN(wbsItemId)) {
        return res.status(400).json({ message: "Invalid WBS item ID" });
      }

      const costEntries = await storage.getCostEntries(wbsItemId);
      res.json(costEntries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/costs", async (req: Request, res: Response) => {
    try {
      const costEntryData = z.object({
        wbsItemId: z.number(),
        amount: z.string().or(z.number()).transform(v => v.toString()),
        entryDate: z.string().or(z.date()).transform(d => new Date(d).toISOString().split('T')[0]),
        description: z.string().default(""),
      }).parse(req.body);

      // Validate that the WBS item exists
      const wbsItem = await storage.getWbsItem(costEntryData.wbsItemId);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      // Only WorkPackage items can have cost entries
      if (wbsItem.type !== "WorkPackage" && wbsItem.type !== "Summary" && wbsItem.type !== "WBS") {
        return res.status(400).json({
          message: "Cost entries can only be added to 'WorkPackage' or 'Summary' items"
        });
      }

      const costEntry = await storage.createCostEntry(costEntryData);
      res.status(201).json(costEntry);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Fix the CSV import schema
  const csvImportSchema = z.object({
    wbsCode: z.string(),
    amount: z.number(),
    description: z.string().optional(),
    entryDate: z.string().transform(str => new Date(str))
  });

  // Fix the cost import endpoint
  app.post("/api/costs/import", async (req: Request, res: Response) => {
    try {
      const { projectId, csvData } = req.body;

      if (!projectId || !csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid request body" });
      }

      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      try {
        // Validate the CSV data
        const validatedData = csvData.map(row => csvImportSchema.parse(row));

        // Get all WBS items for the project to map codes to IDs
        const wbsItems = await storage.getWbsItems(projectId);
        const wbsItemsByCode = new Map(wbsItems.map(item => [item.code, item]));

        // Transform validated data to cost entries
        const costEntries: Array<{
          wbsItemId: number;
          amount: string;
          description: string;
          entryDate: string;
        }> = [];
        const errors = [];

        for (let i = 0; i < validatedData.length; i++) {
          const row = validatedData[i];
          const wbsItem = wbsItemsByCode.get(row.wbsCode);

          if (!wbsItem) {
            errors.push(`Row ${i + 1}: WBS code '${row.wbsCode}' not found`);
            continue;
          }

          // Check if WBS item is of a type that can accept costs
          if (wbsItem.type !== "WorkPackage" && wbsItem.type !== "Summary" && wbsItem.type !== "WBS") {
            errors.push(`Row ${i + 1}: WBS code '${row.wbsCode}' is of type '${wbsItem.type}'. Cost entries can only be added to 'Summary', 'WBS', or 'WorkPackage' types. 'Activity' type items cannot have costs.`);
            continue;
          }

          costEntries.push({
            wbsItemId: wbsItem.id,
            amount: row.amount.toString(),
            description: row.description || "",
            entryDate: row.entryDate.toISOString()
          });
        }

        if (errors.length > 0) {
          return res.status(400).json({
            message: "Validation errors in CSV data",
            errors
          });
        }

        if (costEntries.length === 0) {
          return res.status(400).json({ message: "No valid cost entries found in the CSV data" });
        }

        // Create entries one by one
        const createdEntries = await Promise.all(
          costEntries.map(entry => storage.createCostEntry(entry))
        );
        return res.status(201).json(createdEntries);
      } catch (validationError) {
        console.error("CSV validation error:", validationError);
        return res.status(400).json({
          message: "Invalid CSV data format",
          error: validationError instanceof Error ? validationError.message : "Unknown validation error"
        });
      }
    } catch (err) {
      console.error("Error importing costs:", err);
      handleError(err, res);
    }
  });

  app.delete("/api/costs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cost entry ID" });
      }

      await storage.deleteCostEntry(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/wbs/import", async (req: Request, res: Response) => {
    try {
      const { projectId, csvData } = req.body;

      if (!projectId || !csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid request body" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const normalizeWbsTypeCsv = (raw: unknown): string | null => {
        if (raw == null) return null;
        const s = String(raw)
          .replace(/^\uFEFF/g, "")
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .normalize("NFKC")
          .trim();
        const compact = s.replace(/\s+/g, "");
        if (["SUMMARY", "WBS", "WorkPackage"].includes(compact)) return compact;
        const key = s.toLowerCase().replace(/[\s_-]+/g, "");
        if (key === "summary") return "SUMMARY";
        if (key === "wbs") return "WBS";
        if (key === "workpackage") return "WorkPackage";
        return null;
      };

      const existingWbsItems = await storage.getWbsItems(projectId);
      const wbsItemsByCode = new Map(existingWbsItems.map((item: { code: string; id: number }) => [item.code, item]));

      const existingWorkPackages = await storage.getWorkPackagesByProject(projectId);
      const workPackagesByCode = new Map(existingWorkPackages.map((wp: { code: string; id: number }) => [wp.code, wp]));

      const errors: string[] = [];
      const results: unknown[] = [];

      // CSV: Level 1 (root) -> wbs_items type "Summary"; Level 2/3 -> type "WBS". CSV WorkPackage -> work_packages table only.
      const CSV_TYPE_SUMMARY = "SUMMARY";
      const CSV_TYPE_WBS = "WBS";
      const CSV_TYPE_WP = "WorkPackage";

      // Sort by code so parent is always before children (1, 1.1, 1.1.1, 1.1.1.1, 2, 2.1, ...)
      const sortedRows = [...csvData].sort((a: { wbsCode: string }, b: { wbsCode: string }) => {
        const aParts = a.wbsCode.split(".").map(Number);
        const bParts = b.wbsCode.split(".").map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const av = aParts[i] ?? 0;
          const bv = bParts[i] ?? 0;
          if (av !== bv) return av - bv;
        }
        return 0;
      });

      for (const row of sortedRows) {
        const n = normalizeWbsTypeCsv((row as { wbsType?: unknown }).wbsType);
        if (n) (row as { wbsType: string }).wbsType = n;
      }

      // First pass: validate hierarchy rules (level vs type, and same-level children consistency)
      const rowsByCode = new Map(sortedRows.map((r: { wbsCode: string }, idx: number) => [r.wbsCode, { ...r, _index: idx + 1 }]));
      const childrenByParent = new Map<string, typeof sortedRows>();
      for (const row of sortedRows) {
        const code = row.wbsCode;
        const parts = code.split(".");
        const level = parts.length;
        const csvType = (row.wbsType || "").trim();

        if (!["SUMMARY", "WBS", "WorkPackage"].includes(csvType)) {
          errors.push(`Row ${code}: Invalid wbsType '${row.wbsType}' - must be SUMMARY, WBS, or WorkPackage`);
          continue;
        }
        if (level === 1 && csvType !== "SUMMARY") {
          errors.push(`Row ${code}: Level 1 (root) must be type SUMMARY`);
          continue;
        }
        if (level === 2 && csvType !== "WBS") {
          errors.push(`Row ${code}: Level 2 must be type WBS`);
          continue;
        }
        if (level === 3) {
          if (csvType !== "WBS" && csvType !== "WorkPackage") {
            errors.push(`Row ${code}: Level 3 must be type WBS or WorkPackage`);
            continue;
          }
        }
        if (level >= 4) {
          if (csvType !== "WorkPackage") {
            errors.push(`Row ${code}: Level ${level} must be type WorkPackage`);
            continue;
          }
          if (level > 4) {
            errors.push(`Row ${code}: Maximum depth is 4 (SUMMARY -> WBS -> WBS or WorkPackage -> WorkPackage if level 3 is WBS)`);
            continue;
          }
        }

        const budgetVal = row.budget != null ? row.budget : row.amount;
        const budgetNum = Number(budgetVal);
        if (budgetVal === undefined || budgetVal === null || budgetVal === "" || isNaN(budgetNum) || budgetNum < 0) {
          errors.push(`Row ${code}: Valid budget (number >= 0) required`);
          continue;
        }

        if (level > 1) {
          const parentCode = parts.slice(0, -1).join(".");
          if (!childrenByParent.has(parentCode)) childrenByParent.set(parentCode, []);
          childrenByParent.get(parentCode)!.push(row);
        }
      }

      // Level-2 WBS: children must be either all WBS or all WorkPackage (not mixed)
      for (const [parentCode, children] of Array.from(childrenByParent.entries())) {
        const parentParts = parentCode.split(".");
        if (parentParts.length !== 2) continue;
        const types = new Set(children.map((c: { wbsType: string }) => (c.wbsType || "").trim()));
        if (types.has("WBS") && types.has("WorkPackage")) {
          errors.push(`Parent ${parentCode}: Level 2 WBS cannot have both WBS and WorkPackage children - use only one type`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          message: "WBS import validation failed",
          errors,
          results: []
        });
      }

      // Process in sorted order: SUMMARY/WBS -> wbs_items (type Summary); WorkPackage -> work_packages table
      for (let i = 0; i < sortedRows.length; i++) {
        const row = sortedRows[i];
        const code = row.wbsCode;
        const codeParts = code.split(".");
        const level = codeParts.length;
        const csvType = (row.wbsType || "").trim();
        const budgetVal = row.budget != null ? row.budget : row.amount;
        const budgetStr = String(Number(budgetVal));

        if (csvType === CSV_TYPE_WP) {
          // WorkPackage: insert into work_packages table; parent must be a WBS (Summary) node
          const parentCode = codeParts.slice(0, -1).join(".");
          const parentItem = wbsItemsByCode.get(parentCode);
          if (!parentItem) {
            errors.push(`Row ${i + 1}: Parent '${parentCode}' not found for Work Package (ensure parent WBS row appears before this row)`);
            continue;
          }
          try {
            const existingWp = workPackagesByCode.get(code);
            const wpData = {
              wbsItemId: parentItem.id,
              projectId,
              name: row.wbsName || code,
              description: row.wbsDescription || null,
              code,
              budgetedCost: budgetStr,
              actualCost: "0",
              percentComplete: "0"
            };
            if (existingWp) {
              await storage.updateWorkPackage(existingWp.id, wpData);
              results.push({ code, type: "WorkPackage", status: "updated" });
            } else {
              const created = await storage.createWorkPackage(wpData as any);
              results.push({ ...created, status: "created" });
              workPackagesByCode.set(code, created as { code: string; id: number });
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(`Row ${i + 1} (${code}): ${msg}`);
          }
          continue;
        }

        // SUMMARY (level 1 only) -> type "Summary"; WBS (level 2/3) -> type "WBS"
        let parentId: number | null = null;
        if (level > 1) {
          const parentCode = codeParts.slice(0, -1).join(".");
          const parentItem = wbsItemsByCode.get(parentCode);
          if (!parentItem) {
            errors.push(`Row ${i + 1}: Parent '${parentCode}' not found (ensure rows are ordered so parent appears before children)`);
            continue;
          }
          parentId = parentItem.id;
        }

        const wbsType = level === 1 ? "Summary" : "WBS";

        const wbsItemData = {
          projectId,
          parentId,
          name: row.wbsName || code,
          description: row.wbsDescription || "",
          level,
          code,
          type: wbsType,
          budgetedCost: budgetStr,
          isTopLevel: level === 1,
          actualCost: "0",
          percentComplete: "0"
        };

        try {
          const existingItem = wbsItemsByCode.get(code);
          let result;
          if (existingItem) {
            result = await storage.updateWbsItem(existingItem.id, wbsItemData as any);
            results.push({ ...result, status: "updated" });
          } else {
            result = await storage.createWbsItem(wbsItemData as any);
            results.push({ ...result, status: "created" });
            wbsItemsByCode.set((result as { code: string }).code, result as { code: string; id: number });
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1} (${code}): ${msg}`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          message: "Some WBS items could not be imported",
          errors,
          results
        });
      }

      return res.status(200).json({
        message: "All WBS items imported successfully",
        count: results.length,
        results
      });
    } catch (err) {
      console.error("Error importing WBS items:", err);
      handleError(err, res);
    }
  });

  // Add endpoint to get all dependencies for a project
  app.get("/api/projects/:projectId/dependencies", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get all WBS items for the project
      const wbsItems = await storage.getWbsItems(projectId);
      const activityIds = wbsItems
        .filter(item => item.type === "Activity")
        .map(item => item.id);

      // Get dependencies for all activities
      const allDependencies = await Promise.all(
        activityIds.map(id => storage.getDependencies(id))
      );

      // Flatten and return all dependencies
      const dependencies = allDependencies.flat();
      res.json(dependencies);
    } catch (err: unknown) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/activity-dependencies", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const dependencies = await storage.getProjectActivityDependencies(projectId);
      res.json(dependencies);
    } catch (err: unknown) {
      handleError(err, res);
    }
  });

  app.post("/api/activity-dependencies", async (req: Request, res: Response) => {
    try {
      const data = insertProjectActivityDependencySchema.parse(req.body);
      const newDependency = await storage.createProjectActivityDependency(data as any);
      res.status(201).json(newDependency);
    } catch (err: unknown) {
      handleError(err, res);
    }
  });

  app.delete("/api/activity-dependencies/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dependency ID" });
      }
      await storage.deleteProjectActivityDependency(id);
      res.sendStatus(204);
    } catch (err: unknown) {
      handleError(err, res);
    }
  });

  app.post("/api/wbs/activities/import", async (req: Request, res: Response) => {
    try {
      const { projectId, workPackageId, csvData } = req.body;

      if (!projectId || !csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid request body" });
      }

      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all WBS items for the project to map codes to IDs
      const wbsItems = await storage.getWbsItems(projectId);
      const wbsItemsByCode = new Map(wbsItems.map(item => [item.code, item]));

      // Check if the workPackage exists if provided
      let parentWorkPackage = null;
      if (workPackageId) {
        parentWorkPackage = wbsItems.find(item => item.id === workPackageId);
        if (!parentWorkPackage) {
          return res.status(404).json({ message: "Work Package not found" });
        }
        if (parentWorkPackage.type !== "WorkPackage") {
          return res.status(400).json({ message: "Provided ID is not a Work Package" });
        }
      }

      // Track any validation errors
      const errors = [];
      const results = [];

      // Process each activity in the CSV data
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        // Skip invalid rows
        if (!row.code) {
          errors.push(`Row ${i + 1}: Missing required activity code`);
          continue;
        }

        if (!row.name) {
          errors.push(`Row ${i + 1}: Missing required activity name`);
          continue;
        }

        // Find the WBS item by code
        const existingItem = wbsItemsByCode.get(row.code);
        const isUpdate = !!existingItem;

        // WBS Items no longer use dates or durations.
        // We'll proceed with creating or updating based only on structural and progress data.

        try {
          // If existing item and it's an activity, update it
          if (isUpdate) {
            if (existingItem.type !== "Activity") {
              errors.push(`Row ${i + 1}: Item with code '${row.code}' exists but is not an Activity (type: ${existingItem.type})`);
              continue;
            }

            // If workPackageId is specified, validate that the activity belongs to this work package
            if (workPackageId && existingItem.parentId !== workPackageId) {
              errors.push(`Row ${i + 1}: Activity with code '${row.code}' exists but belongs to a different Work Package`);
              continue;
            }

            // Update activity data
            const activityData = {
              name: row.name,
              description: row.description || existingItem.description || "",
              percentComplete: row.percentComplete !== undefined ? Number(row.percentComplete).toString() : existingItem.percentComplete
            };

            // Update the existing activity
            const updatedItem = await storage.updateWbsItem(existingItem.id, activityData as any);
            results.push({ ...updatedItem, status: "updated" });
          } else {
            // Create new activity
            if (!workPackageId) {
              errors.push(`Row ${i + 1}: Cannot create new activity '${row.code}' without specifying a Work Package`);
              continue;
            }

            if (!parentWorkPackage) {
              errors.push(`Row ${i + 1}: Parent Work Package not found`);
              continue;
            }

            // Prepare new activity data
            const newActivity = {
              projectId,
              parentId: workPackageId,
              name: row.name,
              description: row.description || "",
              level: parentWorkPackage.level + 1,
              code: row.code,
              type: "Activity" as "Summary" | "WorkPackage" | "Activity",
              budgetedCost: "0", // Activities don't have budget
              actualCost: "0",
              percentComplete: row.percentComplete ? Number(row.percentComplete).toString() : "0",
              isTopLevel: false,
            };

            // Create the new activity
            const createdItem = await storage.createWbsItem(newActivity as any);
            results.push({ ...createdItem, status: "created" });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${i + 1}: Failed to ${isUpdate ? 'update' : 'create'} Activity - ${errorMessage}`);
        }
      }

      // Return errors if any
      if (errors.length > 0) {
        return res.status(400).json({
          message: "Some activities could not be processed",
          errors,
          results
        });
      }

      // Return success
      return res.status(200).json({
        message: "Activities processed successfully",
        count: results.length,
        created: results.filter(r => r.status === "created").length,
        updated: results.filter(r => r.status === "updated").length,
        results
      });
    } catch (err) {
      console.error("Error importing activities:", err);
      handleError(err, res);
    }
  });

  // Endpoint for finalizing a project schedule - simplified approach to avoid linter errors
  app.post("/api/projects/:projectId/schedule/finalize", async (req: Request, res: Response) => {
    try {
      // WBS dates have been removed, so this route is currently disabled
      res.json({ message: "Schedule finalization is currently disabled as WBS dates have been removed.", updatedCount: 0 });
    } catch (err: any) {
      handleError(err, res);
    }
  });

  // Task routes
  app.get("/api/projects/:projectId/tasks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const tasks = await storage.getProjectTasks(projectId);
      res.json(tasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/activities/:activityId/tasks", async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const tasks = await storage.getTasks(activityId);
      res.json(tasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      console.log("Creating task with request body:", JSON.stringify(req.body, null, 2));

      // Ensure required fields have default values if missing
      const taskRequest = {
        ...req.body,
        percentComplete: req.body.percentComplete ?? 0,
        projectId: req.body.projectId || null // Will be set from activity later
      };

      console.log("Adjusted task request:", JSON.stringify(taskRequest, null, 2));

      // Try validation
      try {
        // Attempt validation
        const validationResult = taskSchema.extend({
          startDate: z.string().optional().nullable(),
          endDate: z.string().optional().nullable(),
          duration: z.number().optional().nullable(),
        }).safeParse(taskRequest);
        if (!validationResult.success) {
          console.error("Task validation failed:", JSON.stringify(validationResult.error, null, 2));
          return res.status(400).json({
            message: "Validation error",
            errors: validationResult.error.errors
          });
        }

        const taskData = validationResult.data;
        console.log("Validated task data:", JSON.stringify(taskData, null, 2));

        // Check if the activity exists
        const activity = await storage.getActivity((taskData as any).activityId);
        if (!activity) {
          return res.status(404).json({ message: "Activity not found" });
        }



        const task = await storage.createTask(taskData as any);
        res.status(201).json(task);
      } catch (validationError) {
        console.error("Validation processing error:", validationError);
        throw validationError;
      }
    } catch (err) {
      console.error("Error creating task:", err);
      handleError(err, res);
    }
  });

  // Fix the bulk tasks endpoint
  app.post("/api/tasks/bulk", async (req: Request, res: Response) => {
    try {
      const tasks = req.body.map((task: {
        activityId: number;
        name: string;
        description?: string;
        percentComplete?: number;
        startDate?: string;
        endDate?: string;
        duration?: number;
      }) => ({
        activityId: task.activityId,
        name: task.name,
        description: task.description || "",
        percentComplete: (task.percentComplete || 0).toString(),
        startDate: task.startDate || null,
        endDate: task.endDate || null,
        duration: task.duration || null,
      }));

      const createdTasks = await Promise.all(
        tasks.map((task: {
          activityId: number;
          name: string;
          description: string;
          percentComplete: string;
          startDate?: string;
          endDate?: string;
          duration?: number;
        }) => storage.createTask(task as any))
      );

      res.status(201).json(createdTasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Fix the task update endpoint
  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Validate and parse the task data
      const taskData = z.object({
        activityId: z.number().optional(),
        projectId: z.number().optional(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        percentComplete: z.number().min(0).max(100).optional(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        duration: z.number().optional().nullable(),
      }).parse(req.body);

      // If changing activity, check if it exists
      if (taskData.activityId && taskData.activityId !== task.activityId) {
        const activity = await storage.getActivity(taskData.activityId);
        if (!activity) {
          return res.status(404).json({ message: "Activity not found" });
        }


      }

      // Create a properly typed object for the update
      const taskDataToSend: any = {
        ...taskData,
        percentComplete: taskData.percentComplete !== undefined ? taskData.percentComplete.toString() : undefined
      };

      const updatedTask = await storage.updateTask(id, taskDataToSend);
      res.json(updatedTask);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      await storage.deleteTask(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/dependencies", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const dependencies = await storage.getDependencies(projectId);
      res.json(dependencies);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const activityId = req.query.activityId ? parseInt(req.query.activityId as string) : null;

      if (activityId !== null && isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      // If activityId is provided, filter tasks by activity
      if (activityId !== null) {
        const result = await db.collection(tasks).find().toArray().where(eq(tasks.activityId, activityId));
        res.json(result);
      } else {
        // Return all tasks if no activityId is provided
        const result = await db.collection(tasks).find().toArray();
        res.json(result);
      }
    } catch (err) {
      handleError(err, res);
    }
  });

  // Fix the bulk cost entries endpoint
  app.post("/api/costs/bulk", async (req: Request, res: Response) => {
    try {
      const costEntries = req.body.map((entry: {
        wbsItemId: number;
        amount: number;
        description?: string;
        entryDate: string;
      }) => ({
        wbsItemId: entry.wbsItemId,
        amount: entry.amount.toString(),
        description: entry.description || "",
        entryDate: new Date(entry.entryDate).toISOString()
      }));

      const createdEntries = await Promise.all(
        costEntries.map((entry: {
          wbsItemId: number;
          amount: string;
          description: string;
          entryDate: string;
        }) => storage.createCostEntry(entry as any))
      );

      res.status(201).json(createdEntries);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Resource routes
  app.get("/api/resources", async (req: Request, res: Response) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get entities mapped to a resource (manpower: own + rental; equipment: own + rental)
  app.get("/api/resources/:id/mapped-entities", async (req: Request, res: Response) => {
    try {
      const resourceId = parseInt(req.params.id);
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }
      const resource = await storage.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      const type = resource.type;

      const result: {
        resourceType: string;
        ownManpower: any[];
        rentalManpower: any[];
        ownEquipment: any[];
        rentalEquipment: any[];
      } = {
        resourceType: type,
        ownManpower: [],
        rentalManpower: [],
        ownEquipment: [],
        rentalEquipment: [],
      };

      if (type === "manpower") {
        const empMappings = await db
          .collection(employeeResourceMappings)
          .find({ resourceId })
          .toArray();
        if (empMappings.length > 0) {
          const ids = empMappings.map((m) => m.employeeId);
          result.ownManpower = await db
            .collection(employeeMaster)
            .find({ id: { $in: ids } })
            .toArray();
        }
        const rmMappings = await db
          .collection(rentalManpowerResourceMappings)
          .find({ resourceId })
          .toArray();
        if (rmMappings.length > 0) {
          const ids = rmMappings.map((m) => m.rentalManpowerId);
          result.rentalManpower = await db
            .collection(rentalManpower)
            .find({ id: { $in: ids } })
            .toArray();
        }
      } else if (type === "rental_manpower") {
        const rmMappings = await db
          .collection(rentalManpowerResourceMappings)
          .find({ resourceId })
          .toArray();
        if (rmMappings.length > 0) {
          const ids = rmMappings.map((m) => m.rentalManpowerId);
          result.rentalManpower = await db
            .collection(rentalManpower)
            .find({ id: { $in: ids } })
            .toArray();
        }
      } else if (type === "equipment") {
        const eqMappings = await db
          .collection(equipmentResourceMappings)
          .find({ resourceId })
          .toArray();
        if (eqMappings.length > 0) {
          const ids = eqMappings.map((m) => m.equipmentId);
          result.ownEquipment = await db
            .collection(equipmentMaster)
            .find({ id: { $in: ids } })
            .toArray();
        }
        const reMappings = await db
          .collection(rentalEquipmentResourceMappings)
          .find({ resourceId })
          .toArray();
        if (reMappings.length > 0) {
          const ids = reMappings.map((m) => m.rentalEquipmentId);
          result.rentalEquipment = await db
            .collection(rentalEquipment)
            .find({ id: { $in: ids } })
            .toArray();
        }
      } else if (type === "rental_equipment") {
        const reMappings = await db
          .collection(rentalEquipmentResourceMappings)
          .find({ resourceId })
          .toArray();
        if (reMappings.length > 0) {
          const ids = reMappings.map((m) => m.rentalEquipmentId);
          result.rentalEquipment = await db
            .collection(rentalEquipment)
            .find({ id: { $in: ids } })
            .toArray();
        }
      }

      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/resources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      const resource = await storage.getResource(id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      res.json(resource);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/resources", async (req: Request, res: Response) => {
    try {
      const resourceData = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(resourceData as any);
      res.status(201).json(resource);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Bulk import resources
  app.post("/api/resources/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }

      const resourcesToCreate: any[] = [];
      const rowErrors: Array<{ row: number; errors: unknown[] }> = [];

      csvData.forEach((row: any, index: number) => {
        const parsed = insertResourceSchema.safeParse(row);
        if (parsed.success) {
          resourcesToCreate.push(parsed.data);
        } else {
          rowErrors.push({
            row: index + 1,
            errors: parsed.error.errors,
          });
        }
      });

      if (rowErrors.length > 0) {
        return res.status(400).json({
          message: "Validation error in uploaded rows",
          errors: rowErrors,
        });
      }

      const createdResources: Resource[] = [];
      for (const row of resourcesToCreate) {
        createdResources.push(await storage.createResource(row));
      }
      res.status(201).json(createdResources);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/resources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      const resource = await storage.getResource(id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      const resourceData = insertResourceSchema.partial().parse(req.body);
      const updatedResource = await storage.updateResource(id, resourceData as any);
      res.json(updatedResource);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/resources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      const resource = await storage.getResource(id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      await storage.deleteResource(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Task Resource routes
  app.get("/api/tasks/:taskId/resources", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const taskResources = await storage.getTaskResources(taskId);
      res.json(taskResources);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tasks/:taskId/resources", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const taskResourceData = insertTaskResourceSchema.parse({
        ...req.body,
        taskId
      });
      const taskResource = await storage.createTaskResource(taskResourceData as any);
      res.status(201).json(taskResource);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/task-resources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task resource ID" });
      }

      const taskResourceData = insertTaskResourceSchema.partial().parse(req.body);
      const updatedTaskResource = await storage.updateTaskResource(id, taskResourceData as any);
      res.json(updatedTaskResource);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/task-resources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task resource ID" });
      }

      await storage.deleteTaskResource(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  registerCollabRoutes(app, handleError);


  // Project Resource routes
  app.get("/api/projects/:projectId/resources", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const resources = await storage.getProjectResources(projectId);
      res.json(resources);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get resources for a specific work package
  app.get("/api/work-packages/:wpId/resources", async (req: Request, res: Response) => {
    try {
      const wpId = parseInt(req.params.wpId);
      if (isNaN(wpId)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      const resources = await storage.getProjectResourcesByWorkPackage(wpId);
      const withEstimatedValue = resources.map((r: Record<string, unknown>) => {
        const unitRate = Number(r.unitRate ?? r.unit_rate ?? 0);
        const quantity = Number(r.quantity ?? r.qty ?? 0);
        const estimatedValue =
          Number.isFinite(unitRate) && Number.isFinite(quantity) ? unitRate * quantity : 0;
        return {
          ...r,
          estimatedValue: estimatedValue.toFixed(2),
        };
      });
      res.json(withEstimatedValue);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Capture planned cost snapshot for a specific work package
  app.post("/api/work-packages/:wpId/planned-cost", async (req: Request, res: Response) => {
    try {
      const wpId = parseInt(req.params.wpId);
      if (isNaN(wpId)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      const projectId = workPackage.projectId;

      const materialRows = await db.collection(workPackageMaterials).find().toArray().where(eq(workPackageMaterials.wpId, wpId));
      const serviceRows = await db.collection(workPackageServices).find().toArray().where(eq(workPackageServices.wpId, wpId));
      const resourceRows = await storage.getProjectResourcesByWorkPackage(wpId);

      const materialsPlannedValue = materialRows.reduce((sum, m: any) => sum + Number(m.estimatedValue || 0), 0);
      const servicesPlannedValue = serviceRows.reduce((sum, s: any) => sum + Number(s.estimatedValue || 0), 0);
      const resourcesPlannedValue = resourceRows.reduce(
        (sum: number, r: any) => sum + Number(r.unitRate || 0) * Number(r.quantity || 0),
        0
      );
      const totalPlannedValue = materialsPlannedValue + servicesPlannedValue + resourcesPlannedValue;

      const [existing] = await db
        .select()
        .from(plannedCostWorkpackages)
        .where(
          and(
            eq(plannedCostWorkpackages.projectId, projectId),
            eq(plannedCostWorkpackages.wpId, wpId)
          )
        );

      let row;
      if (existing) {
        [row] = await db
          .update(plannedCostWorkpackages)
          .set({
            materialsPlannedValue: materialsPlannedValue.toFixed(2),
            servicesPlannedValue: servicesPlannedValue.toFixed(2),
            resourcesPlannedValue: resourcesPlannedValue.toFixed(2),
            totalPlannedValue: totalPlannedValue.toFixed(2),
            isLocked: true,
            updatedAt: new Date(),
          } as any)
          .where(
            and(
              eq(plannedCostWorkpackages.projectId, projectId),
              eq(plannedCostWorkpackages.wpId, wpId)
            )
          )
          .returning();
      } else {
        [row] = await db
          .insert(plannedCostWorkpackages)
          .values({
            projectId,
            wpId,
            materialsPlannedValue: materialsPlannedValue.toFixed(2),
            servicesPlannedValue: servicesPlannedValue.toFixed(2),
            resourcesPlannedValue: resourcesPlannedValue.toFixed(2),
            totalPlannedValue: totalPlannedValue.toFixed(2),
            isLocked: true,
          } as any)
          .returning();
      }

      res.status(existing ? 200 : 201).json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get planned cost snapshot for a specific work package
  app.get("/api/work-packages/:wpId/planned-cost", async (req: Request, res: Response) => {
    try {
      const wpId = parseInt(req.params.wpId);
      if (isNaN(wpId)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }

      const projectId = workPackage.projectId;

      const [row] = await db
        .select()
        .from(plannedCostWorkpackages)
        .where(
          and(
            eq(plannedCostWorkpackages.projectId, projectId),
            eq(plannedCostWorkpackages.wpId, wpId)
          )
        );

      if (!row) {
        return res.status(404).json({ message: "No planned cost snapshot for this work package" });
      }

      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  const parsePurchaseOrderItem = (raw: Record<string, unknown>, poId: number, lineNumber: number) =>
    insertPurchaseOrderItemSchema.parse({
      ...raw,
      poId,
      lineNumber: raw.lineNumber != null ? Number(raw.lineNumber) : lineNumber,
      totalPrice:
        raw.totalPrice ??
        String(Number(raw.quantity ?? 0) * Number(raw.unitPrice ?? 0)),
    });

  const parsePurchaseRequisitionItem = (raw: Record<string, unknown>, prId: number, lineNumber: number) =>
    insertPurchaseRequisitionItemSchema.parse({
      ...raw,
      prId,
      lineNumber: raw.lineNumber != null ? Number(raw.lineNumber) : lineNumber,
      preferredVendorCodes: Array.isArray(raw.preferredVendorCodes) ? raw.preferredVendorCodes : [],
    });

  const markPoPrItemsConverted = async (
    poId: number,
    items: Array<{ prItemId?: number | null }>
  ) => {
    const prItemIds = items
      .map((i) => i.prItemId)
      .filter((id): id is number => id != null && !Number.isNaN(id));
    if (prItemIds.length > 0) {
      await storage.markPurchaseRequisitionItemsConverted(prItemIds, poId);
    }
  };

  // Purchase Requisitions
  app.get("/api/purchase-requisitions/search", async (req: Request, res: Response) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const requisitionType =
        typeof req.query.requisitionType === "string" ? req.query.requisitionType : "material";
      const results = await storage.searchPurchaseRequisitionsForPo(q, requisitionType);
      res.json(results);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/purchase-requisitions", async (req: Request, res: Response) => {
    try {
      const requisitionType =
        typeof req.query.requisitionType === "string" ? req.query.requisitionType : undefined;
      const prs = await storage.getPurchaseRequisitions(requisitionType);
      if (prs.length === 0) return res.json([]);

      const prIds = prs.map((p) => p.id);
      const allItems = await storage.getPurchaseRequisitionItemsByPrIds(prIds);
      const itemsByPr = new Map<number, typeof allItems>();
      for (const item of allItems) {
        const list = itemsByPr.get(item.prId) ?? [];
        list.push(item);
        itemsByPr.set(item.prId, list);
      }

      res.json(
        prs.map((pr) => ({
          ...pr,
          itemCount: (itemsByPr.get(pr.id) ?? []).length,
          openItemCount: (itemsByPr.get(pr.id) ?? []).filter((i) => i.status !== "converted").length,
        }))
      );
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/purchase-requisitions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid requisition ID" });

      const pr = await storage.getPurchaseRequisition(id);
      if (!pr) return res.status(404).json({ message: "Purchase requisition not found" });

      const items = await storage.getPurchaseRequisitionItems(id);
      res.json({ requisition: pr, items });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/purchase-requisitions", async (req: Request, res: Response) => {
    try {
      const { items, ...header } = req.body as {
        items?: Record<string, unknown>[];
        prNumber: string;
        prDate: string;
        requisitionType: "material" | "service" | "rental_equipment" | "tools";
        requestedBy?: string | null;
        remarks?: string | null;
      };

      const headerData = insertPurchaseRequisitionSchema.parse(header);
      const parsedItems =
        items && Array.isArray(items)
          ? items.map((raw, index) => {
              const item = parsePurchaseRequisitionItem(
                raw,
                0,
                raw.lineNumber != null ? Number(raw.lineNumber) : index + 1
              );
              const { prId: _prId, ...rest } = item;
              return rest;
            })
          : [];

      const created = await storage.createPurchaseRequisition(headerData, parsedItems);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/purchase-requisitions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid requisition ID" });

      const existing = await storage.getPurchaseRequisition(id);
      if (!existing) return res.status(404).json({ message: "Purchase requisition not found" });

      const body = req.body as {
        prNumber?: string;
        prDate?: string;
        requestedBy?: string | null;
        remarks?: string | null;
        status?: "open" | "closed";
        items?: Record<string, unknown>[];
      };

      const headerUpdates: Partial<InsertPurchaseRequisition> = {};
      if (body.prNumber !== undefined) headerUpdates.prNumber = body.prNumber;
      if (body.prDate !== undefined) headerUpdates.prDate = body.prDate;
      if (body.requestedBy !== undefined) headerUpdates.requestedBy = body.requestedBy;
      if (body.remarks !== undefined) headerUpdates.remarks = body.remarks;
      if (body.status !== undefined) headerUpdates.status = body.status;

      const parsedItems =
        body.items && Array.isArray(body.items)
          ? body.items.map((raw, index) => {
              const item = parsePurchaseRequisitionItem(
                raw,
                id,
                raw.lineNumber != null ? Number(raw.lineNumber) : index + 1
              );
              const { prId: _prId, ...rest } = item;
              return rest;
            })
          : undefined;

      const updated = await storage.updatePurchaseRequisition(id, headerUpdates, parsedItems);
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/purchase-requisitions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid requisition ID" });

      const existing = await storage.getPurchaseRequisition(id);
      if (!existing) return res.status(404).json({ message: "Purchase requisition not found" });

      await storage.deletePurchaseRequisition(id);
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Purchase Orders
  app.get("/api/purchase-orders", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getPurchaseOrders();
      if (orders.length === 0) {
        return res.json(orders);
      }
      const orderIds = orders.map((o) => o.id);
      const allItems = await storage.getPurchaseOrderItemsByPoIds(orderIds);
      const itemsByPo = new Map<number, typeof allItems>();
      for (const item of allItems) {
        const list = itemsByPo.get(item.poId) ?? [];
        list.push(item);
        itemsByPo.set(item.poId, list);
      }
      const itemTypeFilter = typeof req.query.itemType === "string" ? req.query.itemType : null;
      const result = orders.map((o) => {
        const poItems = itemsByPo.get(o.id) ?? [];
        const isDelivered =
          poItems.length > 0 &&
          poItems.every((i) => i.actualDeliveryDate != null && String(i.actualDeliveryDate).trim() !== "");
        const typeSet = new Set(poItems.map((i) => i.itemType));
        const primaryItemType = typeSet.size === 1 ? Array.from(typeSet)[0] : null;
        return { ...o, isDelivered: !!isDelivered, primaryItemType };
      });
      const filtered = itemTypeFilter
        ? result.filter((o) => o.primaryItemType === itemTypeFilter)
        : result;
      res.json(filtered);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }

      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const items = await storage.getPurchaseOrderItems(id);
      const attachments = await storage.getPurchaseOrderAttachments(id);
      res.json({ order, items, attachments });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/purchase-orders", async (req: Request, res: Response) => {
    try {
      const { items, ...header } = req.body as {
        items?: Record<string, unknown>[];
        poNumber: string;
        poDate: string;
        vendor: string;
        remarks?: string | null;
      };

      const headerData = insertPurchaseOrderSchema.parse(header);
      const parsedItems =
        items && Array.isArray(items)
          ? items.map((raw, index) => {
              const item = parsePurchaseOrderItem(raw, 0, raw.lineNumber != null ? Number(raw.lineNumber) : index + 1);
              const { poId: _poId, ...rest } = item;
              return rest;
            })
          : [];

      const createdOrder = await storage.createPurchaseOrder(headerData, parsedItems);
      await markPoPrItemsConverted(createdOrder.id, parsedItems);
      res.status(201).json(createdOrder);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }
      const existing = await storage.getPurchaseOrder(id);
      if (!existing) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      const poItems = await storage.getPurchaseOrderItems(id);
      const isDelivered =
        poItems.length > 0 &&
        poItems.every((i) => i.actualDeliveryDate != null && String(i.actualDeliveryDate).trim() !== "");
      if (isDelivered) {
        return res.status(403).json({ message: "Purchase order is already delivered; editing is not allowed." });
      }
      const body = req.body as {
        poNumber?: string;
        poDate?: string;
        vendor?: string;
        remarks?: string | null;
        prId?: number | null;
        deliveryTerms?: string | null;
        incoterms?: string | null;
        paymentTerms?: string | null;
        paymentMode?: string | null;
        items?: Record<string, unknown>[];
      };
      const headerUpdates: Partial<InsertPurchaseOrder> = {};
      if (body.poNumber !== undefined) headerUpdates.poNumber = body.poNumber;
      if (body.poDate !== undefined) headerUpdates.poDate = body.poDate;
      if (body.vendor !== undefined) headerUpdates.vendor = body.vendor;
      if (body.remarks !== undefined) headerUpdates.remarks = body.remarks;
      if (body.prId !== undefined) headerUpdates.prId = body.prId;
      if (body.deliveryTerms !== undefined) headerUpdates.deliveryTerms = body.deliveryTerms;
      if (body.incoterms !== undefined) headerUpdates.incoterms = body.incoterms;
      if (body.paymentTerms !== undefined) headerUpdates.paymentTerms = body.paymentTerms;
      if (body.paymentMode !== undefined) headerUpdates.paymentMode = body.paymentMode;

      const parsedItems =
        body.items && Array.isArray(body.items)
          ? body.items.map((raw, index) => {
              const item = parsePurchaseOrderItem(raw, id, raw.lineNumber != null ? Number(raw.lineNumber) : index + 1);
              const { poId: _poId, ...rest } = item;
              return rest;
            })
          : undefined;

      const updated = await storage.updatePurchaseOrder(id, headerUpdates, parsedItems);
      if (parsedItems) {
        await markPoPrItemsConverted(id, parsedItems);
      }
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/purchase-orders/:id/items/bulk", async (req: Request, res: Response) => {
    try {
      const poId = parseInt(req.params.id);
      if (isNaN(poId)) {
        return res.status(400).json({ message: "Invalid purchase order ID" });
      }

      const order = await storage.getPurchaseOrder(poId);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const { items } = req.body as { items: Record<string, unknown>[] };
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No items provided" });
      }

      const parsedItems = items.map((raw, index) => {
        const item = parsePurchaseOrderItem(raw, poId, raw.lineNumber != null ? Number(raw.lineNumber) : index + 1);
        const { poId: _poId, ...rest } = item;
        return rest;
      });

      const inserted = await storage.bulkCreatePurchaseOrderItems(poId, parsedItems);
      await markPoPrItemsConverted(poId, parsedItems);
      res.status(201).json(inserted);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/purchase-orders/:id/attachments", async (req: Request, res: Response) => {
    try {
      const poId = parseInt(req.params.id);
      if (isNaN(poId)) return res.status(400).json({ message: "Invalid purchase order ID" });

      const order = await storage.getPurchaseOrder(poId);
      if (!order) return res.status(404).json({ message: "Purchase order not found" });

      const attachments = await storage.getPurchaseOrderAttachments(poId);
      res.json(attachments);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/purchase-orders/:id/attachments/upload", async (req: Request, res: Response) => {
    try {
      const poId = parseInt(req.params.id);
      if (isNaN(poId)) return res.status(400).json({ message: "Invalid purchase order ID" });

      const order = await storage.getPurchaseOrder(poId);
      if (!order) return res.status(404).json({ message: "Purchase order not found" });

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as fileUpload.UploadedFile;
      const fileName = `purchase-orders/${poId}/${Date.now()}_${file.name}`;
      const displayName = req.body.displayName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";

      const { uploadFile } = await import("./b2");
      const fs = await import("fs");

      let fileData: Buffer;
      if (file.tempFilePath) {
        fileData = fs.readFileSync(file.tempFilePath);
      } else {
        fileData = file.data;
      }

      const result = await uploadFile(fileName, fileData, file.mimetype, {
        displayName,
        description,
        uploadedBy: uploadedByName,
      });

      const attachment = await storage.createPurchaseOrderAttachment({
        poId,
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
      });

      res.status(201).json(attachment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/purchase-orders/:poId/attachments/:attachmentId", async (req: Request, res: Response) => {
    try {
      const attachmentId = parseInt(req.params.attachmentId);
      if (isNaN(attachmentId)) return res.status(400).json({ message: "Invalid attachment ID" });

      const attachments = await storage.getPurchaseOrderAttachments(parseInt(req.params.poId));
      const found = attachments.find((a) => a.id === attachmentId);
      if (!found) return res.status(404).json({ message: "Attachment not found" });

      await storage.deletePurchaseOrderAttachment(attachmentId);
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/resources", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate wpId is provided
      if (!req.body.wpId) {
        return res.status(400).json({ message: "Work Package ID (wpId) is required" });
      }

      const wpId = parseInt(req.body.wpId);
      if (isNaN(wpId)) {
        return res.status(400).json({ message: "Invalid work package ID" });
      }

      // Verify the work package exists and belongs to the project
      const workPackage = await storage.getWorkPackage(wpId);
      if (!workPackage) {
        return res.status(404).json({ message: "Work package not found" });
      }
      if (workPackage.projectId !== projectId) {
        return res.status(400).json({ message: "Work package does not belong to this project" });
      }

      // Validate resource type
      const validTypes = ["manpower", "equipment", "rental_manpower", "rental_equipment", "tools"];
      if (req.body.type && !validTypes.includes(req.body.type)) {
        return res.status(400).json({
          message: `Resource type must be one of: ${validTypes.join(", ")}`
        });
      }

      const resourceData = insertProjectResourceSchema.parse({
        ...req.body,
        projectId,
        wpId
      });

      const resource = await storage.createProjectResource(resourceData as any);
      res.status(201).json(resource);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/resources/:resourceId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const resourceId = parseInt(req.params.resourceId);

      if (isNaN(projectId) || isNaN(resourceId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const resource = await storage.getProjectResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      if (resource.projectId !== projectId) {
        return res.status(400).json({ message: "Resource does not belong to this project" });
      }

      // Use partial schema for updates - preserve existing wpId if not provided
      const partialResourceSchema = insertProjectResourceSchema.partial();
      const resourceData = partialResourceSchema.parse({
        ...req.body,
        projectId, // Ensure projectId is preserved
        wpId: req.body.wpId ?? resource.wpId, // Preserve existing wpId if not provided
      });

      const updatedResource = await storage.updateProjectResource(resourceId, resourceData as any);
      res.json(updatedResource);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/resources/:resourceId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const resourceId = parseInt(req.params.resourceId);

      if (isNaN(projectId) || isNaN(resourceId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const resource = await storage.getProjectResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      if (resource.projectId !== projectId) {
        return res.status(400).json({ message: "Resource does not belong to this project" });
      }

      await storage.deleteProjectResource(resourceId);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });


  // Project Drawings routes
  app.post("/api/projects/:projectId/drawings/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as fileUpload.UploadedFile;
      const fileName = `projects/${projectId}/drawings/${Date.now()}_${file.name}`;

      // Extract metadata from body
      const drawingName = req.body.drawingName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      // Import dynamically to avoid top-level await issues if any
      const { uploadFile } = await import("./b2");
      const fs = await import("fs");

      let fileData: Buffer;
      if (file.tempFilePath) {
        fileData = fs.readFileSync(file.tempFilePath);
      } else {
        fileData = file.data;
      }

      // B2 metadata keys must be alphanumeric. We'll prefix them.
      // Actually B2 allows custom headers X-Bz-Info-*, keys in the info object.
      const fileInfo = {
        drawingName: drawingName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "drawings",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: drawingName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/drawings", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "File deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/drawings", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/drawings/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/drawings/:fileName/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileName = req.params.fileName;
      // Reconstruct full path
      // Note: The fileName param might not contain the full path if it has slashes. 
      // However, listFiles returns full names like "projects/8/drawings/123_foo.pdf".
      // We should probably pass the full path or ID. 
      // Let's assume the frontend passes the full path encoded or we just use the ID if B2 supports it easily.
      // Actually, B2 listFiles returns fileId and fileName. 
      // Let's change this route to accept fileId or full path via query param?
      // Or just use the full path constructed:

      // Better approach: The frontend will likely have the full fileName from the list.
      // But passing slashes in URL params can be tricky.
      // Let's use a query parameter for the file name or ID.

      const fullFileName = req.query.fileName as string;

      if (!fullFileName) {
        return res.status(400).json({ message: "File name is required" });
      }

      const { getDownloadUrl } = await import("./b2");
      const url = await getDownloadUrl(fullFileName);

      res.json({ url });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Project BOQ routes
  app.post("/api/projects/:projectId/boq/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as fileUpload.UploadedFile;
      const fileName = `projects/${projectId}/boq/${Date.now()}_${file.name}`;

      // Extract metadata from body
      const boqName = req.body.boqName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      // Import dynamically
      const { uploadFile } = await import("./b2");
      const fs = await import("fs");

      let fileData: Buffer;
      if (file.tempFilePath) {
        fileData = fs.readFileSync(file.tempFilePath);
      } else {
        fileData = file.data;
      }

      const fileInfo = {
        boqName: boqName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "boq",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: boqName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/boq", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/boq/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/boq", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "File deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/boq/:fileName/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fullFileName = req.query.fileName as string;

      if (!fullFileName) {
        return res.status(400).json({ message: "File name is required" });
      }

      const { getDownloadUrl } = await import("./b2");
      const url = await getDownloadUrl(fullFileName);

      res.json({ url });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Project Scope routes
  app.post("/api/projects/:projectId/scope/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as fileUpload.UploadedFile;
      const fileName = `projects/${projectId}/scope/${Date.now()}_${file.name}`;

      // Extract metadata from body
      const scopeName = req.body.scopeName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      // Import dynamically
      const { uploadFile } = await import("./b2");
      const fs = await import("fs");

      let fileData: Buffer;
      if (file.tempFilePath) {
        fileData = fs.readFileSync(file.tempFilePath);
      } else {
        fileData = file.data;
      }

      const fileInfo = {
        scopeName: scopeName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "scope",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: scopeName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/scope", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/scope/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/scope", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "File deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/scope/:fileName/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fullFileName = req.query.fileName as string;

      if (!fullFileName) {
        return res.status(400).json({ message: "File name is required" });
      }

      const { getDownloadUrl } = await import("./b2");
      const url = await getDownloadUrl(fullFileName);

      res.json({ url });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Correspondence mail-trail routes (client, supplier, subcontract, internal)
  registerCorrespondenceRoutes(app, db, "correspondence", "correspondence", handleError);
  registerCorrespondenceRoutes(app, db, "supplier-correspondence", "supplier-correspondence", handleError);
  registerCorrespondenceRoutes(app, db, "subcontract-correspondence", "subcontract-correspondence", handleError);
  registerCorrespondenceRoutes(app, db, "internal-correspondence", "internal-correspondence", handleError);
  registerWikiRecordRoutes(app, handleError);

  // DELETE a WBS item (recursively deletes children)
  app.delete("/api/wbs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const wbsItem = await storage.getWbsItem(id);
      if (!wbsItem) {
        return res.status(404).json({ message: "WBS item not found" });
      }

      // Recursive function to get all child IDs
      const getAllChildIds = async (parentId: number): Promise<number[]> => {
        const children = await storage.getWbsItemsByParentId(parentId);
        let ids = children.map(c => c.id);
        for (const child of children) {
          const subChildIds = await getAllChildIds(child.id);
          ids = [...ids, ...subChildIds];
        }
        return ids;
      };

      const childIds = await getAllChildIds(id);

      // Delete all children first
      for (const childId of childIds.reverse()) { // Reverse to delete from bottom up
        await storage.deleteWbsItem(childId);
      }

      // Finally delete the item itself
      await storage.deleteWbsItem(id);

      res.json({ message: "WBS item and all children deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting WBS item:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Request For Inspection routes
  app.post("/api/projects/:projectId/request-for-inspection/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as any;
      const fileName = `projects/${projectId}/request-for-inspection/${Date.now()}_${file.name}`;

      const rfiName = req.body.rfiName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      const { uploadFile } = await import("./b2");

      const fileData = file.data;

      const fileInfo = {
        rfiName: rfiName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "request-for-inspection",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: rfiName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/request-for-inspection", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/request-for-inspection/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/request-for-inspection", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "RFI deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/request-for-inspection/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = req.query.fileId as string;

      if (isNaN(projectId) || !fileId) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      const { downloadFile } = await import("./b2");
      const { data, info } = await downloadFile(fileId);

      res.setHeader("Content-Type", info.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${info.fileName}"`);
      res.send(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ITP & Reports routes
  app.post("/api/projects/:projectId/itp-and-reports/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as any;
      const fileName = `projects/${projectId}/itp-and-reports/${Date.now()}_${file.name}`;

      const docName = req.body.docName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      const { uploadFile } = await import("./b2");

      const fileData = file.data;

      const fileInfo = {
        docName: docName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "itp-and-reports",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: docName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/itp-and-reports", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/itp-and-reports/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/itp-and-reports", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "Document deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/itp-and-reports/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = req.query.fileId as string;

      if (isNaN(projectId) || !fileId) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      const { downloadFile } = await import("./b2");
      const { data, info } = await downloadFile(fileId);

      res.setHeader("Content-Type", info.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${info.fileName}"`);
      res.send(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Other Documents routes
  app.post("/api/projects/:projectId/other-documents/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as any;
      const fileName = `projects/${projectId}/other-documents/${Date.now()}_${file.name}`;

      const docName = req.body.docName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      const { uploadFile } = await import("./b2");

      const fileData = file.data;

      const fileInfo = {
        docName: docName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "other-documents",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: docName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/other-documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/other-documents/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/other-documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "Document deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/other-documents/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = req.query.fileId as string;

      if (isNaN(projectId) || !fileId) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      const { downloadFile } = await import("./b2");
      const { data, info } = await downloadFile(fileId);

      res.setHeader("Content-Type", info.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${info.fileName}"`);
      res.send(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Equipment Catalogue routes
  app.post("/api/projects/:projectId/equipment-catalogue/upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded." });
      }

      const file = req.files.file as any;
      const fileName = `projects/${projectId}/equipment-catalogue/${Date.now()}_${file.name}`;

      const docName = req.body.docName || file.name;
      const description = req.body.description || "";
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      const { uploadFile } = await import("./b2");

      const fileData = file.data;

      const fileInfo = {
        docName: docName,
        description: description,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);

      await insertFileUploadRecord(db, {
        projectId,
        category: "equipment-catalogue",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: docName,
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/equipment-catalogue", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = `projects/${projectId}/equipment-catalogue/`;
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/equipment-catalogue", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "Document deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/projects/:projectId/equipment-catalogue/download", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = req.query.fileId as string;

      if (isNaN(projectId) || !fileId) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      const { downloadFile } = await import("./b2");
      const { data, info } = await downloadFile(fileId);

      res.setHeader("Content-Type", info.contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${info.fileName}"`);
      res.send(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Daily Progress routes
  app.get("/api/projects/:projectId/daily-progress", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getDailyProgressses(projectId);
      res.json(data ?? []);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/daily-progress", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      // Inject projectId into body for validation
      const bodyWithId = { ...req.body, projectId };
      const entryData = insertDailyProgressSchema.parse(bodyWithId);
      const entry = await storage.createDailyProgress(entryData as any);
      res.json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/daily-progress/bulk", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Body must be an array of entries" });
      }

      // Inject projectId into each entry
      const bodiesWithId = req.body.map((item: any) => ({ ...item, projectId }));

      const entriesData = z.array(insertDailyProgressSchema).parse(bodiesWithId);
      const entries = await storage.createDailyProgressBulk(entriesData as any);
      res.json(entries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/daily-progress/:entryId", async (req: Request, res: Response) => {
    try {
      const entryId = parseInt(req.params.entryId);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      const updateData = insertDailyProgressSchema.partial().parse(req.body);
      const updatedEntry = await storage.updateDailyProgress(entryId, updateData as any);

      if (!updatedEntry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      res.json(updatedEntry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/daily-progress/:entryId", async (req: Request, res: Response) => {
    try {
      const entryId = parseInt(req.params.entryId);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      await storage.deleteDailyProgress(entryId);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Resource Plan routes
  app.get("/api/projects/:projectId/resource-plans", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getResourcePlans(projectId);
      res.json(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/resource-plans", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      // Inject projectId into body for validation
      const bodyWithId = { ...req.body, projectId };
      const entryData = insertResourcePlanSchema.parse(bodyWithId);
      const entry = await storage.createResourcePlan(entryData as any);
      res.json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/resource-plans/bulk", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Body must be an array of entries" });
      }

      // Inject projectId into each entry
      const bodiesWithId = req.body.map((item: any) => ({ ...item, projectId }));

      const entriesData = z.array(insertResourcePlanSchema).parse(bodiesWithId);
      const entries = await storage.createResourcePlanBulk(entriesData as any);
      res.json(entries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/resource-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const updateData = insertResourcePlanSchema.partial().parse(req.body);
      const updatedEntry = await storage.updateResourcePlan(id, updateData as any);

      if (!updatedEntry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      res.json(updatedEntry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/resource-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      await storage.deleteResourcePlan(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Risk Register routes
  app.get("/api/projects/:projectId/risk-register", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getRiskRegisters(projectId);
      res.json(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/risk-register", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      // Inject projectId into body for validation
      const bodyWithId = { ...req.body, projectId };
      const entryData = insertRiskRegisterSchema.parse(bodyWithId);
      const entry = await storage.createRiskRegister(entryData as any);
      res.json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/risk-register/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      if (isNaN(projectId) || isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID or risk register ID" });
      }
      const updateData = insertRiskRegisterSchema.partial().parse(req.body);
      const updatedEntry = await storage.updateRiskRegister(id, updateData as any);
      if (!updatedEntry) {
        return res.status(404).json({ message: "Risk register entry not found" });
      }
      res.json(updatedEntry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/risk-register/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid risk register ID" });
      }
      await storage.deleteRiskRegister(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Lesson Learnt Register routes
  app.get("/api/projects/:projectId/lesson-learnt-register", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getLessonLearntRegisters(projectId);
      res.json(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/lesson-learnt-register", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      // Inject projectId into body for validation
      const bodyWithId = { ...req.body, projectId };
      const entryData = insertLessonLearntRegisterSchema.parse(bodyWithId);
      const entry = await storage.createLessonLearntRegister(entryData as any);
      res.json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/lesson-learnt-register/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      if (isNaN(projectId) || isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID or lesson learnt register ID" });
      }
      const updateData = insertLessonLearntRegisterSchema.partial().parse(req.body);
      const updatedEntry = await storage.updateLessonLearntRegister(id, updateData as any);
      if (!updatedEntry) {
        return res.status(404).json({ message: "Lesson learnt register entry not found" });
      }
      res.json(updatedEntry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/lesson-learnt-register/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lesson learnt register ID" });
      }
      await storage.deleteLessonLearntRegister(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Direct Manpower Position routes
  app.get("/api/projects/:projectId/direct-manpower-positions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getDirectManpowerPositions(projectId);
      res.json(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/direct-manpower-positions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const bodyWithId = { ...req.body, projectId };
      const positionData = insertDirectManpowerPositionSchema.parse(bodyWithId);
      const position = await storage.createDirectManpowerPosition(positionData as any);
      res.json(position);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/direct-manpower-positions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const positionsData = z.array(insertDirectManpowerPositionSchema).parse(
        req.body.map((p: any) => ({ ...p, projectId }))
      );
      const positions = await storage.updateDirectManpowerPositions(projectId, positionsData as any);
      res.json(positions);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/direct-manpower-positions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid position ID" });
      }
      const updateData = insertDirectManpowerPositionSchema.partial().parse(req.body);
      const updatedPosition = await storage.updateDirectManpowerPosition(id, updateData as any);
      if (!updatedPosition) {
        return res.status(404).json({ message: "Position not found" });
      }
      res.json(updatedPosition);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/direct-manpower-positions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid position ID" });
      }
      await storage.deleteDirectManpowerPosition(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Direct Manpower Entry routes
  app.get("/api/projects/:projectId/direct-manpower-entries", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getDirectManpowerEntries(projectId);
      // Parse JSON positions field
      const entries = data.map(entry => ({
        ...entry,
        positions: JSON.parse(entry.positions as string)
      }));
      res.json(entries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/direct-manpower-entries", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const bodyWithId = { ...req.body, projectId };
      const entryData = insertDirectManpowerEntrySchema.parse(bodyWithId);
      const entry = await storage.createDirectManpowerEntry(entryData as any);
      res.json({
        ...entry,
        positions: JSON.parse(entry.positions as string)
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/direct-manpower-entries/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      if (isNaN(projectId) || isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID or entry ID" });
      }
      const updateData = insertDirectManpowerEntrySchema.partial().parse(req.body);
      const updatedEntry = await storage.updateDirectManpowerEntry(id, updateData as any);
      if (!updatedEntry) {
        return res.status(404).json({ message: "Manpower entry not found" });
      }
      res.json({
        ...updatedEntry,
        positions: JSON.parse(updatedEntry.positions as string)
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/direct-manpower-entries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      await storage.deleteDirectManpowerEntry(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Indirect Manpower Position routes
  app.get("/api/projects/:projectId/indirect-manpower-positions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getIndirectManpowerPositions(projectId);
      res.json(data);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/indirect-manpower-positions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const bodyWithId = { ...req.body, projectId };
      const positionData = insertIndirectManpowerPositionSchema.parse(bodyWithId);
      const position = await storage.createIndirectManpowerPosition(positionData as any);
      res.json(position);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/indirect-manpower-positions", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const positionsData = z.array(insertIndirectManpowerPositionSchema).parse(
        req.body.map((p: any) => ({ ...p, projectId }))
      );
      const positions = await storage.updateIndirectManpowerPositions(projectId, positionsData as any);
      res.json(positions);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/indirect-manpower-positions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid position ID" });
      }
      const updateData = insertIndirectManpowerPositionSchema.partial().parse(req.body);
      const updatedPosition = await storage.updateIndirectManpowerPosition(id, updateData as any);
      if (!updatedPosition) {
        return res.status(404).json({ message: "Position not found" });
      }
      res.json(updatedPosition);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/indirect-manpower-positions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid position ID" });
      }
      await storage.deleteIndirectManpowerPosition(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Indirect Manpower Entry routes
  app.get("/api/projects/:projectId/indirect-manpower-entries", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const data = await storage.getIndirectManpowerEntries(projectId);
      // Parse JSON positions field
      const entries = data.map(entry => ({
        ...entry,
        positions: JSON.parse(entry.positions as string),
        totalOverhead: parseFloat(entry.totalOverhead as string)
      }));
      res.json(entries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/indirect-manpower-entries", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const bodyWithId = { ...req.body, projectId };
      const entryData = insertIndirectManpowerEntrySchema.parse(bodyWithId);
      const entry = await storage.createIndirectManpowerEntry(entryData as any);
      res.json({
        ...entry,
        positions: JSON.parse(entry.positions as string),
        totalOverhead: parseFloat(entry.totalOverhead as string)
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/indirect-manpower-entries/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      if (isNaN(projectId) || isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID or entry ID" });
      }
      const updateData = insertIndirectManpowerEntrySchema.partial().parse(req.body);
      const updatedEntry = await storage.updateIndirectManpowerEntry(id, updateData as any);
      if (!updatedEntry) {
        return res.status(404).json({ message: "Manpower entry not found" });
      }
      res.json({
        ...updatedEntry,
        positions: JSON.parse(updatedEntry.positions as string),
        totalOverhead: parseFloat(updatedEntry.totalOverhead as string)
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/indirect-manpower-entries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      await storage.deleteIndirectManpowerEntry(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Kanban board routes
  const KANBAN_COLUMNS = ["wish", "ready", "doing", "done"] as const;

  const KANBAN_PRIORITY_VALUES = new Set([
    "immediate_urgent",
    "before_end_of_today",
    "normal",
  ]);

  function parseKanbanFkInput(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  type KanbanCardRowLite = Pick<KanbanCard, "column" | "position" | "id" | "projectActivityId" | "wbsItemId">;

  function kanbanGroupSortKey(card: KanbanCardRowLite): string {
    if (card.projectActivityId != null)
      return `a:${String(card.projectActivityId).padStart(12, "0")}`;
    if (card.wbsItemId != null) return `w:${String(card.wbsItemId).padStart(12, "0")}`;
    return "z:";
  }

  app.get("/api/projects/:projectId/kanban", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const rows = await storage.getKanbanCardsForBoard(projectId);
      const lanes = KANBAN_COLUMNS.map((col) => ({
        id: col,
        title: col.charAt(0).toUpperCase() + col.slice(1),
        cards: rows
          .filter((r) => r.card.column === col)
          .sort((ra, rb) => {
            const ga = kanbanGroupSortKey(ra.card as KanbanCardRowLite);
            const gb = kanbanGroupSortKey(rb.card as KanbanCardRowLite);
            if (ga !== gb) return ga.localeCompare(gb);
            if (ra.card.position !== rb.card.position) return ra.card.position - rb.card.position;
            return ra.card.id - rb.card.id;
          })
          .map((r) => ({
            id: String(r.card.id),
            title: r.card.title,
            description: r.card.description ?? undefined,
            priority: r.card.priority ?? null,
            wbsItemId: r.card.wbsItemId ?? undefined,
            wbsLabel:
              r.wbsCode != null
                ? (r.wbsName ? `${r.wbsCode} — ${r.wbsName}` : r.wbsCode)
                : undefined,
            projectActivityId: r.card.projectActivityId ?? undefined,
            activityLabel: r.activityName ?? undefined,
          })),
      }));
      res.json({ lanes });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/kanban/cards", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      let wbsItemId: number | null | undefined =
        req.body?.wbsItemId === undefined || req.body?.wbsItemId === ""
          ? null
          : Number(req.body.wbsItemId);
      if (Number.isNaN(wbsItemId as number)) wbsItemId = null;

      let projectActivityId: number | null | undefined =
        req.body?.projectActivityId === undefined || req.body?.projectActivityId === ""
          ? null
          : Number(req.body.projectActivityId);
      if (Number.isNaN(projectActivityId as number)) projectActivityId = null;

      if (projectActivityId != null) {
        const pa = await storage.getProjectActivity(projectActivityId);
        if (!pa || pa.projectId !== projectId) {
          return res.status(400).json({ message: "Activity not found on this project" });
        }
        const wp = await storage.getWorkPackage(pa.wpId);
        if (!wp || wp.projectId !== projectId) {
          return res.status(400).json({ message: "Invalid activity work package for this project" });
        }
        wbsItemId = wp.wbsItemId;
      } else if (wbsItemId != null) {
        const wi = await storage.getWbsItem(wbsItemId);
        if (!wi || wi.projectId !== projectId) {
          return res.status(400).json({ message: "WBS item not found on this project" });
        }
      } else {
        wbsItemId = null;
        projectActivityId = null;
      }

      const existing = await storage.getKanbanCards(projectId);
      const wishCards = existing.filter((c) => c.column === "wish");
      const nextPosition = wishCards.length ? Math.max(...wishCards.map((c) => c.position)) + 1 : 0;

      const bodyParsed = insertKanbanCardSchema.parse({
        title: req.body.title,
        description: req.body.description ?? undefined,
        priority:
          !("priority" in req.body) || req.body.priority === undefined
            ? ("normal" as const)
            : req.body.priority === null || req.body.priority === ""
              ? null
              : (req.body.priority as string),
        column: "wish",
        position: nextPosition,
        projectId,
        wbsItemId: wbsItemId ?? null,
        projectActivityId: projectActivityId ?? null,
      });

      const card = await storage.createKanbanCard(bodyParsed as any);
      res.status(201).json(card);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/projects/:projectId/kanban/cards/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      const existing = await storage.getKanbanCard(id);
      if (!existing || existing.projectId !== projectId) {
        return res.status(404).json({ message: "Card not found" });
      }

      const body = req.body as {
        column?: string;
        position?: number;
        title?: string;
        description?: string | null;
        priority?: string | null;
        wbsItemId?: unknown;
        projectActivityId?: unknown;
      };

      const hasMove =
        body.column !== undefined &&
        typeof body.position === "number" &&
        !Number.isNaN(body.position);

      if (hasMove) {
        if (!KANBAN_COLUMNS.includes(body.column as (typeof KANBAN_COLUMNS)[number])) {
          return res.status(400).json({ message: "Invalid column" });
        }
        await storage.moveKanbanCardToPosition(projectId, id, body.column!, body.position!);
        const moved = await storage.getKanbanCard(id);
        return res.json(moved);
      }

      const update: Parameters<typeof storage.updateKanbanCard>[1] = {};

      if (typeof body.title === "string") update.title = body.title;
      if ("description" in body) update.description = body.description ?? null;

      if ("priority" in body) {
        const p = body.priority;
        if (p === null || p === "") {
          update.priority = null;
        } else if (typeof p === "string" && KANBAN_PRIORITY_VALUES.has(p)) {
          update.priority = p;
        } else if (typeof p !== "undefined") {
          return res.status(400).json({ message: "Invalid priority" });
        }
      }

      const actIn = Object.prototype.hasOwnProperty.call(body, "projectActivityId");
      const wbsIn = Object.prototype.hasOwnProperty.call(body, "wbsItemId");
      const hasLinkage = actIn || wbsIn;

      if (hasLinkage) {
        let nextWi = existing.wbsItemId ?? null;
        let nextPa = existing.projectActivityId ?? null;

        let activityPinned = false;

        if (actIn) {
          const pv = parseKanbanFkInput(body.projectActivityId);
          if (pv !== null) {
            const pa = await storage.getProjectActivity(pv);
            if (!pa || pa.projectId !== projectId) {
              return res.status(400).json({ message: "Activity not found on this project" });
            }
            const wp = await storage.getWorkPackage(pa.wpId);
            if (!wp || wp.projectId !== projectId) {
              return res.status(400).json({ message: "Invalid activity work package for this project" });
            }
            nextPa = pv;
            nextWi = wp.wbsItemId;
            activityPinned = true;
          } else {
            nextPa = null;
          }
        }

        if (wbsIn && !activityPinned) {
          const wv = parseKanbanFkInput(body.wbsItemId);
          if (wv === null) {
            nextWi = null;
            nextPa = null;
          } else {
            const wi = await storage.getWbsItem(wv);
            if (!wi || wi.projectId !== projectId) {
              return res.status(400).json({ message: "WBS item not found on this project" });
            }
            nextWi = wv;
            if (nextPa !== null) {
              const paKeep = await storage.getProjectActivity(nextPa);
              if (!paKeep) {
                nextPa = null;
              } else {
                const wpKeep = await storage.getWorkPackage(paKeep.wpId);
                if (!wpKeep || wpKeep.projectId !== projectId) {
                  nextPa = null;
                } else if (wpKeep.wbsItemId !== nextWi) {
                  nextPa = null;
                }
              }
            }
          }
        }

        update.wbsItemId = nextWi;
        update.projectActivityId = nextPa;
      }

      const card = await storage.updateKanbanCard(id, update as any);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/kanban/cards/:id/archive", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      const card = await storage.updateKanbanCard(id, { archivedAt: new Date() } as any);
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      res.json(card);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Planned Activity routes
  app.get("/api/projects/:projectId/planned-activities", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const activities = await storage.getPlannedActivities(projectId, startDate, endDate);

      // Fetch tasks for each activity
      const activitiesWithTasks = await Promise.all(
        activities.map(async (activity) => {
          const tasks = await storage.getPlannedActivityTasks(activity.id);
          return { ...activity, tasks };
        })
      );

      res.json(activitiesWithTasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/planned-activities", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const bodyWithId = { ...req.body, projectId };
      const activityData = insertPlannedActivitySchema.parse(bodyWithId);
      const activity = await storage.createPlannedActivity(activityData as any);
      res.json({ ...activity, tasks: [] });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/planned-activities/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      if (isNaN(projectId) || isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID or activity ID" });
      }
      const updateData = insertPlannedActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updatePlannedActivity(id, updateData as any);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      const tasks = await storage.getPlannedActivityTasks(id);
      res.json({ ...updatedActivity, tasks });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/planned-activities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      await storage.deletePlannedActivity(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Planned Activity Task routes
  app.get("/api/projects/:projectId/planned-activities/:activityId/tasks", async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      const tasks = await storage.getPlannedActivityTasks(activityId);
      res.json(tasks);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/planned-activities/:activityId/tasks", async (req: Request, res: Response) => {
    try {
      const activityId = parseInt(req.params.activityId);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      const bodyWithId = { ...req.body, activityId };
      const taskData = insertPlannedActivityTaskSchema.parse(bodyWithId);
      const task = await storage.createPlannedActivityTask(taskData as any);
      res.json(task);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/planned-activities/:activityId/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const updateData = insertPlannedActivityTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updatePlannedActivityTask(id, updateData as any);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(updatedTask);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/planned-activities/:activityId/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      await storage.deletePlannedActivityTask(id);
      res.sendStatus(204);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========================================
  // MATERIAL MASTER ROUTES
  // ========================================

  app.get("/api/material-masters", async (_req: Request, res: Response) => {
    try {
      const materials = await storage.getMaterialMasters();
      res.json(materials);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/material-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }
      const material = await storage.getMaterialMaster(id);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(material);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/material-masters", async (req: Request, res: Response) => {
    try {
      const materialData = insertMaterialMasterSchema.parse(req.body);
      const inserted = await storage.createMaterialMaster(materialData);
      res.status(201).json(inserted);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/material-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }
      const materialData = insertMaterialMasterSchema.partial().parse(req.body);
      const updatedMaterial = await storage.updateMaterialMaster(id, materialData);
      if (!updatedMaterial) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(updatedMaterial);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/material-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }
      const material = await storage.getMaterialMaster(id);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      await storage.deleteMaterialMaster(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete material")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Bulk import material masters
  app.post("/api/material-masters/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }

      const rowErrors: Array<{ row: number; errors: unknown[] }> = [];
      const materialsToCreate: InsertMaterialMaster[] = [];

      csvData.forEach((row: unknown, index: number) => {
        const parsed = insertMaterialMasterSchema.safeParse(row);
        if (parsed.success) {
          materialsToCreate.push(parsed.data);
        } else {
          rowErrors.push({ row: index + 1, errors: parsed.error.errors });
        }
      });

      if (rowErrors.length > 0) {
        return res.status(400).json({
          message: "Validation error in uploaded rows",
          errors: rowErrors,
        });
      }

      const createdMaterials: MaterialMaster[] = [];
      for (const row of materialsToCreate) {
        createdMaterials.push(await storage.createMaterialMaster(row));
      }
      res.status(201).json(createdMaterials);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // UOM ROUTES
  // ========================================

  app.get("/api/uoms", async (_req: Request, res: Response) => {
    try {
      const allUoms = await storage.getUoms();
      res.json(allUoms);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/uoms", async (req: Request, res: Response) => {
    try {
      const uomData = insertUomSchema.parse(req.body);
      const uom = await storage.createUom(uomData);
      res.status(201).json(uom);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/uoms/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const uomData = insertUomSchema.partial().parse(req.body);
      const updated = await storage.updateUom(id, uomData);
      if (!updated) return res.status(404).json({ message: "UOM not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/uoms/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteUom(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete UOM")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // MATERIAL TYPE ROUTES
  // ========================================

  app.get("/api/material-types", async (_req: Request, res: Response) => {
    try {
      const allTypes = await storage.getMaterialTypes();
      res.json(allTypes);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/material-types", async (req: Request, res: Response) => {
    try {
      const typeData = insertMaterialTypeSchema.parse(req.body);
      const materialType = await storage.createMaterialType(typeData);
      res.status(201).json(materialType);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/material-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const typeData = insertMaterialTypeSchema.partial().parse(req.body);
      const updated = await storage.updateMaterialType(id, typeData);
      if (!updated) return res.status(404).json({ message: "Material Type not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/material-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteMaterialType(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete material type")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // MATERIAL GROUP ROUTES
  // ========================================

  app.get("/api/material-groups", async (req: Request, res: Response) => {
    try {
      const materialTypeId = req.query.materialTypeId
        ? parseInt(String(req.query.materialTypeId))
        : undefined;
      if (req.query.materialTypeId && (materialTypeId === undefined || isNaN(materialTypeId))) {
        return res.status(400).json({ message: "Invalid materialTypeId" });
      }
      const allGroups = await storage.getMaterialGroups(materialTypeId);
      res.json(allGroups);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/material-groups", async (req: Request, res: Response) => {
    try {
      const groupData = insertMaterialGroupSchema.parse(req.body);
      const materialGroup = await storage.createMaterialGroup(groupData);
      res.status(201).json(materialGroup);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("does not exist")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/material-groups/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const groupData = insertMaterialGroupSchema.partial().parse(req.body);
      const updated = await storage.updateMaterialGroup(id, groupData);
      if (!updated) return res.status(404).json({ message: "Material Group not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("does not exist")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/material-groups/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteMaterialGroup(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete material group")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // SERVICE MASTER ROUTES
  // ========================================

  app.get("/api/service-masters", async (_req: Request, res: Response) => {
    try {
      const services = await storage.getServiceMasters();
      res.json(services);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/service-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid service ID" });
      const service = await storage.getServiceMaster(id);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json(service);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/service-masters", async (req: Request, res: Response) => {
    try {
      const data = insertServiceMasterSchema.parse(req.body);
      const service = await storage.createServiceMaster(data);
      res.status(201).json(service);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in the") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/service-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid service ID" });
      const data = insertServiceMasterSchema.partial().parse(req.body);
      const updated = await storage.updateServiceMaster(id, data);
      if (!updated) return res.status(404).json({ message: "Service not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in the") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/service-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid service ID" });
      await storage.deleteServiceMaster(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete service")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.post("/api/service-masters/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) return res.status(400).json({ message: "csvData must be an array" });

      const rowErrors: Array<{ row: number; errors: unknown[] }> = [];
      const servicesToCreate: InsertServiceMaster[] = [];

      csvData.forEach((row: unknown, index: number) => {
        const parsed = insertServiceMasterSchema.safeParse(row);
        if (parsed.success) {
          servicesToCreate.push(parsed.data);
        } else {
          rowErrors.push({ row: index + 1, errors: parsed.error.errors });
        }
      });

      if (rowErrors.length > 0) {
        return res.status(400).json({
          message: "Validation error in uploaded rows",
          errors: rowErrors,
        });
      }

      const created: ServiceMaster[] = [];
      for (const row of servicesToCreate) {
        created.push(await storage.createServiceMaster(row));
      }
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in the") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // ALLOCATION (cross-project rollups for materials / resources on work packages)
  // ========================================

  /** Global material master rows with total qty across all WPs and per-WP breakdown (project + WP). */
  app.get("/api/allocation/materials", async (_req: Request, res: Response) => {
    try {
      const allMaterials = await db.collection(materialMaster).find().toArray();
      const allocationRows = await db
        .select({
          id: workPackageMaterials.id,
          materialId: workPackageMaterials.materialId,
          quantity: workPackageMaterials.quantity,
          wpId: workPackages.id,
          wpName: workPackages.name,
          wpCode: workPackages.code,
          projectId: projects.id,
          projectName: projects.name,
        })
        .from(workPackageMaterials)
        .innerJoin(workPackages, eq(workPackageMaterials.wpId, workPackages.id))
        .innerJoin(projects, eq(workPackageMaterials.projectId, projects.id));

      type Alloc = {
        allocationId: number;
        projectId: number;
        projectName: string;
        wpId: number;
        wpCode: string;
        wpName: string;
        quantity: number;
      };
      const byMaterial = new Map<number, { total: number; allocations: Alloc[] }>();
      for (const row of allocationRows) {
        const q = parseFloat(String(row.quantity ?? "0"));
        const qty = Number.isFinite(q) ? q : 0;
        const cur = byMaterial.get(row.materialId) ?? { total: 0, allocations: [] as Alloc[] };
        cur.total += qty;
        cur.allocations.push({
          allocationId: row.id,
          projectId: row.projectId,
          projectName: row.projectName,
          wpId: row.wpId,
          wpCode: row.wpCode,
          wpName: row.wpName,
          quantity: qty,
        });
        byMaterial.set(row.materialId, cur);
      }

      const materials = allMaterials.map((m) => {
        const agg = byMaterial.get(m.id);
        const allocations = [...(agg?.allocations ?? [])].sort((a, b) => {
          const pc = a.projectName.localeCompare(b.projectName, undefined, { sensitivity: "base" });
          if (pc !== 0) return pc;
          return a.wpCode.localeCompare(b.wpCode, undefined, { numeric: true });
        });
        return {
          ...m,
          totalQuantityRequired: agg?.total ?? 0,
          allocations,
        };
      });
      materials.sort((a, b) =>
        String(a.materialCode ?? "").localeCompare(String(b.materialCode ?? ""), undefined, { sensitivity: "base" })
      );

      /** PO lines store free-text description (usually material master description); match to material rows. */
      const poMaterialLines = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.itemType, "material"));
      const poIdSet = [...new Set(poMaterialLines.map((r) => r.poId))];
      const orderRows =
        poIdSet.length > 0
          ? await db.collection(purchaseOrders).find().toArray().where(inArray(purchaseOrders.id, poIdSet))
          : [];
      const orderById = new Map(orderRows.map((o) => [o.id, o]));

      const lineMatchesMaterial = (
        itemDescription: string,
        row: { materialCode: string; materialDescription: string }
      ): boolean => {
        const d = (itemDescription ?? "").trim();
        if (!d) return false;
        const md = (row.materialDescription ?? "").trim();
        const code = (row.materialCode ?? "").trim();
        if (d === md) return true;
        const combinedEm = `${code} — ${md}`;
        const combinedHyphen = `${code} - ${md}`;
        if (code && (d === combinedEm || d === combinedHyphen)) return true;
        if (code && (d.startsWith(`${code} —`) || d.startsWith(`${code} -`))) return true;
        return false;
      };

      type PoLineOut = {
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
      };
      type PoOut = {
        poId: number;
        poNumber: string;
        poDate: string;
        vendor: string;
        remarks: string | null;
        lines: PoLineOut[];
      };

      const materialsWithPo = materials.map((m) => {
        const matching = poMaterialLines.filter((line) => lineMatchesMaterial(line.itemDescription, m));
        const byPoId = new Map<number, (typeof purchaseOrderItems.$inferSelect)[]>();
        for (const line of matching) {
          const list = byPoId.get(line.poId) ?? [];
          list.push(line);
          byPoId.set(line.poId, list);
        }
        const purchaseOrders: PoOut[] = [];
        for (const [poId, lines] of byPoId) {
          const hdr = orderById.get(poId);
          if (!hdr) continue;
          const sorted = [...lines].sort((a, b) => a.lineNumber - b.lineNumber);
          purchaseOrders.push({
            poId: hdr.id,
            poNumber: hdr.poNumber,
            poDate:
              hdr.poDate instanceof Date
                ? hdr.poDate.toISOString().slice(0, 10)
                : String(hdr.poDate ?? ""),
            vendor: hdr.vendor,
            remarks: hdr.remarks ?? null,
            lines: sorted.map((line) => ({
              id: line.id,
              lineNumber: line.lineNumber,
              itemDescription: line.itemDescription,
              quantity: String(line.quantity),
              unitOfMeasure: line.unitOfMeasure,
              unitPrice: String(line.unitPrice),
              totalPrice: String(line.totalPrice),
              estimatedDeliveryDate: line.estimatedDeliveryDate
                ? String(line.estimatedDeliveryDate)
                : null,
              actualDeliveryDate: line.actualDeliveryDate ? String(line.actualDeliveryDate) : null,
              projectId: line.projectId ?? null,
              wpId: line.wpId ?? null,
            })),
          });
        }
        purchaseOrders.sort((a, b) => String(b.poDate).localeCompare(String(a.poDate)));
        return { ...m, purchaseOrders };
      });

      res.json({ materials: materialsWithPo });
    } catch (err) {
      handleError(err, res);
    }
  });

  /** Employees mapped to manpower resources, with WP/project assignments from project resources; unmapped employees listed separately. */
  app.get("/api/allocation/manpower", async (_req: Request, res: Response) => {
    try {
      const employees = await db.collection(employeeMaster).find().toArray().orderBy(employeeMaster.employeeNumber);
      const mappings = await db.collection(employeeResourceMappings).find().toArray();
      const mappingByEmployeeId = new Map(mappings.map((m) => [m.employeeId, m]));
      const mappedResourceIds = [...new Set(mappings.map((m) => m.resourceId))];

      const resourceRows =
        mappedResourceIds.length > 0
          ? await db.collection(resources).find().toArray().where(inArray(resources.id, mappedResourceIds))
          : [];
      const resourceById = new Map(resourceRows.map((r) => [r.id, r]));

      const assignmentsByResourceId = await loadWpAssignmentsByGlobalResourceIds(mappedResourceIds, "manpower");

      const employeeOut = (e: (typeof employees)[0]) => ({
        id: e.id,
        employeeNumber: e.employeeNumber,
        empFirstName: e.empFirstName,
        empMiddleName: e.empMiddleName,
        empLastName: e.empLastName,
        empPosition: e.empPosition,
      });

      const mapped: Array<{
        employee: ReturnType<typeof employeeOut>;
        resource: {
          id: number;
          name: string;
          unitOfMeasure: string;
          unitRate: string;
        } | null;
        assignments: WpAssignmentRollup[];
      }> = [];
      const unmapped: ReturnType<typeof employeeOut>[] = [];

      for (const e of employees) {
        const mapRow = mappingByEmployeeId.get(e.id);
        if (!mapRow) {
          unmapped.push(employeeOut(e));
          continue;
        }
        const resRow = resourceById.get(mapRow.resourceId);
        mapped.push({
          employee: employeeOut(e),
          resource: resRow
            ? {
                id: resRow.id,
                name: resRow.name,
                unitOfMeasure: resRow.unitOfMeasure,
                unitRate: String(resRow.unitRate ?? ""),
              }
            : null,
          assignments: assignmentsByResourceId.get(mapRow.resourceId) ?? [],
        });
      }

      res.json({ mapped, unmapped });
    } catch (err) {
      handleError(err, res);
    }
  });

  /** Owned equipment mapped to equipment resources + WP assignments. */
  app.get("/api/allocation/equipment", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getEquipmentMasters();
      const mappings = await db.collection(equipmentResourceMappings).find().toArray();
      const mappingByEquipmentId = new Map(mappings.map((m) => [m.equipmentId, m]));
      const mappedResourceIds = [...new Set(mappings.map((m) => m.resourceId))];
      const resourceRows =
        mappedResourceIds.length > 0
          ? await db.collection(resources).find({ id: { $in: mappedResourceIds } }).toArray()
          : [];
      const resourceById = new Map(resourceRows.map((r) => [r.id, r]));
      const assignmentsByResourceId = await loadWpAssignmentsByGlobalResourceIds(mappedResourceIds, "equipment");

      const equipmentOut = (e: (typeof items)[0]) => ({
        id: e.id,
        equipmentNumber: e.equipmentNumber,
        equipmentName: e.equipmentName,
        equipmentType: e.equipmentType,
      });

      const mapped: Array<{
        equipment: ReturnType<typeof equipmentOut>;
        resource: {
          id: number;
          name: string;
          unitOfMeasure: string;
          unitRate: string;
        } | null;
        assignments: WpAssignmentRollup[];
      }> = [];
      const unmapped: ReturnType<typeof equipmentOut>[] = [];

      for (const e of items) {
        const mapRow = mappingByEquipmentId.get(e.id);
        if (!mapRow) {
          unmapped.push(equipmentOut(e));
          continue;
        }
        const resRow = resourceById.get(mapRow.resourceId);
        mapped.push({
          equipment: equipmentOut(e),
          resource: resRow
            ? {
                id: resRow.id,
                name: resRow.name,
                unitOfMeasure: resRow.unitOfMeasure,
                unitRate: String(resRow.unitRate ?? ""),
              }
            : null,
          assignments: assignmentsByResourceId.get(mapRow.resourceId) ?? [],
        });
      }

      res.json({ mapped, unmapped });
    } catch (err) {
      handleError(err, res);
    }
  });

  /** Rental manpower mapped to rental_manpower resources + WP assignments. */
  app.get("/api/allocation/rental-manpower", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getRentalManpowerList();
      const mappings = await db.collection(rentalManpowerResourceMappings).find().toArray();
      const mappingById = new Map(mappings.map((m) => [m.rentalManpowerId, m]));
      const mappedResourceIds = [...new Set(mappings.map((m) => m.resourceId))];
      const resourceRows =
        mappedResourceIds.length > 0
          ? await db.collection(resources).find({ id: { $in: mappedResourceIds } }).toArray()
          : [];
      const resourceById = new Map(resourceRows.map((r) => [r.id, r]));
      const assignmentsByResourceId = await loadWpAssignmentsByGlobalResourceIds(
        mappedResourceIds,
        "rental_manpower"
      );

      const rentalOut = (e: (typeof items)[0]) => ({
        id: e.id,
        employeeNumber: e.employeeNumber,
        empFirstName: e.empFirstName,
        empMiddleName: e.empMiddleName,
        empLastName: e.empLastName,
        empPosition: e.empPosition,
      });

      const mapped: Array<{
        employee: ReturnType<typeof rentalOut>;
        resource: {
          id: number;
          name: string;
          unitOfMeasure: string;
          unitRate: string;
        } | null;
        assignments: WpAssignmentRollup[];
      }> = [];
      const unmapped: ReturnType<typeof rentalOut>[] = [];

      for (const e of items) {
        const mapRow = mappingById.get(e.id);
        if (!mapRow) {
          unmapped.push(rentalOut(e));
          continue;
        }
        const resRow = resourceById.get(mapRow.resourceId);
        mapped.push({
          employee: rentalOut(e),
          resource: resRow
            ? {
                id: resRow.id,
                name: resRow.name,
                unitOfMeasure: resRow.unitOfMeasure,
                unitRate: String(resRow.unitRate ?? ""),
              }
            : null,
          assignments: assignmentsByResourceId.get(mapRow.resourceId) ?? [],
        });
      }

      res.json({ mapped, unmapped });
    } catch (err) {
      handleError(err, res);
    }
  });

  /** Rental equipment mapped to rental_equipment resources + WP assignments. */
  app.get("/api/allocation/rental-equipment", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getRentalEquipmentList();
      const mappings = await db.collection(rentalEquipmentResourceMappings).find().toArray();
      const mappingById = new Map(mappings.map((m) => [m.rentalEquipmentId, m]));
      const mappedResourceIds = [...new Set(mappings.map((m) => m.resourceId))];
      const resourceRows =
        mappedResourceIds.length > 0
          ? await db.collection(resources).find({ id: { $in: mappedResourceIds } }).toArray()
          : [];
      const resourceById = new Map(resourceRows.map((r) => [r.id, r]));
      const assignmentsByResourceId = await loadWpAssignmentsByGlobalResourceIds(
        mappedResourceIds,
        "rental_equipment"
      );

      const equipmentOut = (e: (typeof items)[0]) => ({
        id: e.id,
        equipmentNumber: e.equipmentNumber,
        equipmentName: e.equipmentName,
        equipmentType: e.equipmentType,
      });

      const mapped: Array<{
        equipment: ReturnType<typeof equipmentOut>;
        resource: {
          id: number;
          name: string;
          unitOfMeasure: string;
          unitRate: string;
        } | null;
        assignments: WpAssignmentRollup[];
      }> = [];
      const unmapped: ReturnType<typeof equipmentOut>[] = [];

      for (const e of items) {
        const mapRow = mappingById.get(e.id);
        if (!mapRow) {
          unmapped.push(equipmentOut(e));
          continue;
        }
        const resRow = resourceById.get(mapRow.resourceId);
        mapped.push({
          equipment: equipmentOut(e),
          resource: resRow
            ? {
                id: resRow.id,
                name: resRow.name,
                unitOfMeasure: resRow.unitOfMeasure,
                unitRate: String(resRow.unitRate ?? ""),
              }
            : null,
          assignments: assignmentsByResourceId.get(mapRow.resourceId) ?? [],
        });
      }

      res.json({ mapped, unmapped });
    } catch (err) {
      handleError(err, res);
    }
  });

  /** Tools mapped to tools resources + WP assignments. */
  app.get("/api/allocation/tools", async (_req: Request, res: Response) => {
    try {
      const tools = await storage.getToolMasters();
      const mappings = await db.collection(toolResourceMappings).find().toArray();
      const mappingByToolId = new Map(mappings.map((m) => [m.toolId, m]));
      const mappedResourceIds = [...new Set(mappings.map((m) => m.resourceId))];
      const resourceRows =
        mappedResourceIds.length > 0
          ? await db.collection(resources).find({ id: { $in: mappedResourceIds } }).toArray()
          : [];
      const resourceById = new Map(resourceRows.map((r) => [r.id, r]));
      const assignmentsByResourceId = await loadWpAssignmentsByGlobalResourceIds(mappedResourceIds, "tools");

      const toolOut = (t: (typeof tools)[0]) => ({
        id: t.id,
        toolNumber: t.toolNumber,
        name: t.name,
        description: t.description,
        brand: t.brand,
        model: t.model,
        unitOfMeasure: t.unitOfMeasure,
        accessories: t.accessories,
        unitRate: String(t.unitRate ?? ""),
      });

      const mapped: Array<{
        tool: ReturnType<typeof toolOut>;
        resource: {
          id: number;
          name: string;
          unitOfMeasure: string;
          unitRate: string;
        } | null;
        assignments: WpAssignmentRollup[];
      }> = [];
      const unmapped: ReturnType<typeof toolOut>[] = [];

      for (const t of tools) {
        const mapRow = mappingByToolId.get(t.id);
        if (!mapRow) {
          unmapped.push(toolOut(t));
          continue;
        }
        const resRow = resourceById.get(mapRow.resourceId);
        mapped.push({
          tool: toolOut(t),
          resource: resRow
            ? {
                id: resRow.id,
                name: resRow.name,
                unitOfMeasure: resRow.unitOfMeasure,
                unitRate: String(resRow.unitRate ?? ""),
              }
            : null,
          assignments: assignmentsByResourceId.get(mapRow.resourceId) ?? [],
        });
      }

      res.json({ mapped, unmapped });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========================================
  // WORK PACKAGE MATERIALS (assign materials to WP; estimated value = quantity * base_rate)
  // ========================================

  app.get("/api/projects/:projectId/work-package-materials", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const rows = await db.collection(workPackageMaterials).find().toArray().where(eq(workPackageMaterials.projectId, projectId));
      const materials = await db.collection(materialMaster).find().toArray();
      const byId = new Map(materials.map((m: any) => [m.id, m]));
      const result = rows.map((r: typeof workPackageMaterials.$inferSelect) => {
        const mat = byId.get(r.materialId);
        return {
          ...r,
          materialCode: (mat as any)?.materialCode,
          materialDescription: (mat as any)?.materialDescription,
          uom: (mat as any)?.uom,
          baseRate: (mat as any)?.baseRate,
        };
      });
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/work-packages/:wpId/materials", async (req: Request, res: Response) => {
    try {
      const wpId = parseInt(req.params.wpId);
      if (isNaN(wpId)) return res.status(400).json({ message: "Invalid work package ID" });
      const rows = await db.collection(workPackageMaterials).find().toArray().where(eq(workPackageMaterials.wpId, wpId));
      const materials = await db.collection(materialMaster).find().toArray();
      const byId = new Map(materials.map((m: any) => [m.id, m]));
      const result = rows.map((r: typeof workPackageMaterials.$inferSelect) => {
        const mat = byId.get(r.materialId);
        return {
          ...r,
          materialCode: (mat as any)?.materialCode,
          materialDescription: (mat as any)?.materialDescription,
          uom: (mat as any)?.uom,
          baseRate: (mat as any)?.baseRate,
        };
      });
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/work-package-materials", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const body = { ...req.body, projectId };
      const data = insertWorkPackageMaterialSchema.parse(body);
      const [row] = await db.insert(workPackageMaterials).values({
        projectId: data.projectId,
        wpId: data.wpId,
        materialId: data.materialId,
        quantity: data.quantity,
        estimatedValue: data.estimatedValue,
        updatedAt: new Date(),
      } as any).returning();
      res.status(201).json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/work-package-materials/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const body = req.body as { quantity?: string | number; estimatedValue?: string | number };
      const updates: { quantity?: string; estimatedValue?: string; updatedAt: Date } = { updatedAt: new Date() };
      if (body.quantity !== undefined) updates.quantity = String(body.quantity);
      if (body.estimatedValue !== undefined) updates.estimatedValue = String(body.estimatedValue);
      const [updated] = await db.update(workPackageMaterials).set(updates).where(eq(workPackageMaterials.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/work-package-materials/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await db.delete(workPackageMaterials).where(eq(workPackageMaterials.id, id));
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========================================
  // WORK PACKAGE SERVICES
  // ========================================

  app.get("/api/projects/:projectId/work-package-services", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const rows = await db.collection(workPackageServices).find().toArray().where(eq(workPackageServices.projectId, projectId));
      const services = await db.collection(serviceMaster).find().toArray();
      const byId = new Map(services.map((s: any) => [s.id, s]));
      const result = rows.map((r: typeof workPackageServices.$inferSelect) => {
        const svc = byId.get(r.serviceId);
        return {
          ...r,
          serviceCode: (svc as any)?.serviceCode,
          serviceDescription: (svc as any)?.serviceDescription,
          uom: (svc as any)?.uom,
          baseRate: (svc as any)?.baseRate,
        };
      });
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/work-packages/:wpId/services", async (req: Request, res: Response) => {
    try {
      const wpId = parseInt(req.params.wpId);
      if (isNaN(wpId)) return res.status(400).json({ message: "Invalid work package ID" });
      const rows = await db.collection(workPackageServices).find().toArray().where(eq(workPackageServices.wpId, wpId));
      const services = await db.collection(serviceMaster).find().toArray();
      const byId = new Map(services.map((s: any) => [s.id, s]));
      const result = rows.map((r: typeof workPackageServices.$inferSelect) => {
        const svc = byId.get(r.serviceId);
        return {
          ...r,
          serviceCode: (svc as any)?.serviceCode,
          serviceDescription: (svc as any)?.serviceDescription,
          uom: (svc as any)?.uom,
          baseRate: (svc as any)?.baseRate,
        };
      });
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/work-package-services", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const body = { ...req.body, projectId };
      const data = insertWorkPackageServiceSchema.parse(body);
      const [row] = await db.insert(workPackageServices).values({
        projectId: data.projectId,
        wpId: data.wpId,
        serviceId: data.serviceId,
        quantity: data.quantity,
        estimatedValue: data.estimatedValue,
        updatedAt: new Date(),
      } as any).returning();
      res.status(201).json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/work-package-services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const body = req.body as { quantity?: string | number; estimatedValue?: string | number };
      const updates: { quantity?: string; estimatedValue?: string; updatedAt: Date } = { updatedAt: new Date() };
      if (body.quantity !== undefined) updates.quantity = String(body.quantity);
      if (body.estimatedValue !== undefined) updates.estimatedValue = String(body.estimatedValue);
      const [updated] = await db.update(workPackageServices).set(updates).where(eq(workPackageServices.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/work-package-services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await db.delete(workPackageServices).where(eq(workPackageServices.id, id));
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Bulk CSV upload: material code, quantity, work package id or code → lookup master, compute estimated value, insert
  const wpMaterialsBulkUploadSchema = z.object({
    csvData: z.array(z.object({
      materialCode: z.string().min(1),
      quantity: z.union([z.string(), z.number()]).transform((v) => (typeof v === "number" ? String(v) : String(v).trim())),
      wpIdOrCode: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
    })),
  });

  app.post("/api/projects/:projectId/work-package-materials/bulk-upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const { csvData } = wpMaterialsBulkUploadSchema.parse({ csvData: req.body?.csvData });
      if (!csvData.length) return res.status(400).json({ message: "csvData must be a non-empty array" });

      const materials = await db.collection(materialMaster).find().toArray();
      const materialByCode = new Map(materials.map((m: { materialCode: string; id: number; baseRate: string }) => [m.materialCode.trim().toLowerCase(), m]));
      const projectWps = await storage.getWorkPackagesByProject(projectId);
      const validWpIds = new Set(projectWps.map((wp: { id: number }) => wp.id));
      const wpByCode = new Map(projectWps.map((wp: { code: string; id: number }) => [wp.code.trim().toLowerCase(), wp.id]));

      const created: unknown[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const qty = parseFloat(row.quantity);
        if (isNaN(qty) || qty <= 0) {
          errors.push({ row: i + 1, message: `Invalid quantity: ${row.quantity}` });
          continue;
        }
        let wpId: number;
        const raw = row.wpIdOrCode;
        const asNum = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        if (!Number.isNaN(asNum) && validWpIds.has(asNum)) {
          wpId = asNum;
        } else {
          const byCode = wpByCode.get(raw.toLowerCase());
          if (byCode !== undefined) wpId = byCode;
          else {
            errors.push({ row: i + 1, message: `Work package "${raw}" not found (use ID or code from the list, e.g. 1.2.1.1)` });
            continue;
          }
        }
        const mat = materialByCode.get(row.materialCode.trim().toLowerCase());
        if (!mat) {
          errors.push({ row: i + 1, message: `Material code not found: ${row.materialCode}` });
          continue;
        }
        const baseRate = Number(mat.baseRate ?? 0);
        const estimatedValue = (qty * baseRate).toFixed(2);
        const [inserted] = await db.insert(workPackageMaterials).values({
          projectId,
          wpId,
          materialId: mat.id,
          quantity: row.quantity,
          estimatedValue,
          updatedAt: new Date(),
        } as any).returning();
        if (inserted) created.push(inserted);
      }

      res.status(201).json({ created: created.length, rows: created, errors: errors.length ? errors : undefined });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Bulk CSV upload: service code, quantity, work package id or code → lookup master, compute estimated value, insert
  const wpServicesBulkUploadSchema = z.object({
    csvData: z.array(z.object({
      serviceCode: z.string().min(1),
      quantity: z.union([z.string(), z.number()]).transform((v) => (typeof v === "number" ? String(v) : String(v).trim())),
      wpIdOrCode: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
    })),
  });

  app.post("/api/projects/:projectId/work-package-services/bulk-upload", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const { csvData } = wpServicesBulkUploadSchema.parse({ csvData: req.body?.csvData });
      if (!csvData.length) return res.status(400).json({ message: "csvData must be a non-empty array" });

      const services = await db.collection(serviceMaster).find().toArray();
      const serviceByCode = new Map(services.map((s: { serviceCode: string; id: number; baseRate: string }) => [s.serviceCode.trim().toLowerCase(), s]));
      const projectWps = await storage.getWorkPackagesByProject(projectId);
      const validWpIds = new Set(projectWps.map((wp: { id: number }) => wp.id));
      const wpByCode = new Map(projectWps.map((wp: { code: string; id: number }) => [wp.code.trim().toLowerCase(), wp.id]));

      const created: unknown[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const qty = parseFloat(row.quantity);
        if (isNaN(qty) || qty <= 0) {
          errors.push({ row: i + 1, message: `Invalid quantity: ${row.quantity}` });
          continue;
        }
        let wpId: number;
        const raw = row.wpIdOrCode;
        const asNum = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        if (!Number.isNaN(asNum) && validWpIds.has(asNum)) {
          wpId = asNum;
        } else {
          const byCode = wpByCode.get(raw.toLowerCase());
          if (byCode !== undefined) wpId = byCode;
          else {
            errors.push({ row: i + 1, message: `Work package "${raw}" not found (use ID or code from the list, e.g. 1.2.1.1)` });
            continue;
          }
        }
        const svc = serviceByCode.get(row.serviceCode.trim().toLowerCase());
        if (!svc) {
          errors.push({ row: i + 1, message: `Service code not found: ${row.serviceCode}` });
          continue;
        }
        const baseRate = Number(svc.baseRate ?? 0);
        const estimatedValue = (qty * baseRate).toFixed(2);
        const [inserted] = await db.insert(workPackageServices).values({
          projectId,
          wpId,
          serviceId: svc.id,
          quantity: row.quantity,
          estimatedValue,
          updatedAt: new Date(),
        } as any).returning();
        if (inserted) created.push(inserted);
      }

      res.status(201).json({ created: created.length, rows: created, errors: errors.length ? errors : undefined });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========================================
  // SERVICE TYPE ROUTES
  // ========================================

  app.get("/api/service-types", async (_req: Request, res: Response) => {
    try {
      const allTypes = await storage.getServiceTypes();
      res.json(allTypes);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/service-types", async (req: Request, res: Response) => {
    try {
      const typeData = insertServiceTypeSchema.parse(req.body);
      const serviceType = await storage.createServiceType(typeData);
      res.status(201).json(serviceType);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/service-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const typeData = insertServiceTypeSchema.partial().parse(req.body);
      const updated = await storage.updateServiceType(id, typeData);
      if (!updated) return res.status(404).json({ message: "Service Type not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/service-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteServiceType(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete service type")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // SERVICE GROUP ROUTES
  // ========================================

  app.get("/api/service-groups", async (req: Request, res: Response) => {
    try {
      const serviceTypeId = req.query.serviceTypeId
        ? parseInt(String(req.query.serviceTypeId))
        : undefined;
      if (req.query.serviceTypeId && (serviceTypeId === undefined || isNaN(serviceTypeId))) {
        return res.status(400).json({ message: "Invalid serviceTypeId" });
      }
      const allGroups = await storage.getServiceGroups(serviceTypeId);
      res.json(allGroups);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/service-groups", async (req: Request, res: Response) => {
    try {
      const groupData = insertServiceGroupSchema.parse(req.body);
      const serviceGroup = await storage.createServiceGroup(groupData);
      res.status(201).json(serviceGroup);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("does not exist")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/service-groups/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const groupData = insertServiceGroupSchema.partial().parse(req.body);
      const updated = await storage.updateServiceGroup(id, groupData);
      if (!updated) return res.status(404).json({ message: "Service Group not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("does not exist")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/service-groups/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteServiceGroup(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete service group")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // GLOBAL DEFAULTS (singleton: base currency, default country)
  // ========================================

  app.get("/api/global-defaults", async (_req: Request, res: Response) => {
    try {
      const defaults = await storage.getGlobalDefaults();
      let defaultCountry: { id: number; name: string; code: string | null } | null = null;
      if (defaults.defaultCountryId != null) {
        const country = await storage.getCountry(defaults.defaultCountryId);
        if (country) {
          defaultCountry = {
            id: country.id,
            name: country.name,
            code: country.code ?? null,
          };
        }
      }
      res.json({ ...defaults, defaultCountry });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/global-defaults", async (req: Request, res: Response) => {
    try {
      const data = updateGlobalDefaultsSchema.parse(req.body);
      const updated = await storage.updateGlobalDefaults(data);
      let defaultCountry: { id: number; name: string; code: string | null } | null = null;
      if (updated.defaultCountryId != null) {
        const country = await storage.getCountry(updated.defaultCountryId);
        if (country) {
          defaultCountry = {
            id: country.id,
            name: country.name,
            code: country.code ?? null,
          };
        }
      }
      res.json({ ...updated, defaultCountry });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // COUNTRY ROUTES
  // ========================================

  app.get("/api/countries", async (_req: Request, res: Response) => {
    try {
      const allCountries = await storage.getCountries();
      res.json(allCountries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/countries", async (req: Request, res: Response) => {
    try {
      const countryData = insertCountrySchema.parse(req.body);
      const country = await storage.createCountry(countryData);
      res.status(201).json(country);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/countries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const countryData = insertCountrySchema.partial().parse(req.body);
      const updated = await storage.updateCountry(id, countryData);
      if (!updated) return res.status(404).json({ message: "Country not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/countries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteCountry(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete country")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // CITY ROUTES
  // ========================================

  app.get("/api/cities", async (req: Request, res: Response) => {
    try {
      const countryId = req.query.countryId
        ? parseInt(String(req.query.countryId))
        : undefined;
      if (req.query.countryId && (countryId === undefined || isNaN(countryId))) {
        return res.status(400).json({ message: "Invalid countryId" });
      }
      const allCities = await storage.getCities(countryId);
      res.json(allCities);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/cities", async (req: Request, res: Response) => {
    try {
      const cityData = insertCitySchema.parse(req.body);
      const city = await storage.createCity(cityData);
      res.status(201).json(city);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("does not exist")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/cities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const cityData = insertCitySchema.partial().parse(req.body);
      const updated = await storage.updateCity(id, cityData);
      if (!updated) return res.status(404).json({ message: "City not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("does not exist")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/cities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      await storage.deleteCity(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete city")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // VENDOR MASTER ROUTES
  // ========================================

  app.get("/api/vendor-masters", async (_req: Request, res: Response) => {
    try {
      const vendors = await storage.getVendorMasters();
      res.json(vendors);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/vendor-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid vendor ID" });
      }
      const vendor = await storage.getVendorMaster(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/vendor-masters", async (req: Request, res: Response) => {
    try {
      const vendorData = insertVendorMasterSchema.parse(req.body);
      const vendor = await storage.createVendorMaster(vendorData);
      res.status(201).json(vendor);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/vendor-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid vendor ID" });
      }
      const vendorData = insertVendorMasterSchema.partial().parse(req.body);
      const updatedVendor = await storage.updateVendorMaster(id, vendorData);
      if (!updatedVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(updatedVendor);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/vendor-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid vendor ID" });
      }
      const vendor = await storage.getVendorMaster(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      await storage.deleteVendorMaster(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete vendor")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Bulk import vendor masters
  app.post("/api/vendor-masters/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }

      const rowErrors: Array<{ row: number; errors: unknown[] }> = [];
      const vendorsToCreate: InsertVendorMaster[] = [];

      csvData.forEach((row: unknown, index: number) => {
        const parsed = insertVendorMasterSchema.safeParse(row);
        if (parsed.success) {
          vendorsToCreate.push(parsed.data);
        } else {
          rowErrors.push({ row: index + 1, errors: parsed.error.errors });
        }
      });

      if (rowErrors.length > 0) {
        return res.status(400).json({
          message: "Validation error in uploaded rows",
          errors: rowErrors,
        });
      }

      const createdVendors: VendorMaster[] = [];
      for (const row of vendorsToCreate) {
        createdVendors.push(await storage.createVendorMaster(row));
      }
      res.status(201).json(createdVendors);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in") ||
        err.message.includes("is not defined")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // EMPLOYEE SETTINGS ROUTES
  // ========================================

  // Nationality Routes
  app.get("/api/nationalities", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getNationalities());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/nationality", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getNationalities());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/nationalities", async (req: Request, res: Response) => {
    try {
      const data = insertNationalitySchema.parse(req.body);
      const result = await storage.createNationality(data);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/nationalities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertNationalitySchema.partial().parse(req.body);
      const result = await storage.updateNationality(id, data);
      if (!result) return res.status(404).json({ message: "Nationality not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/nationalities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteNationality(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete nationality")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Employee Title Routes
  app.get("/api/employee-titles", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeeTitles());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/titles", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeeTitles());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/employee-titles", async (req: Request, res: Response) => {
    try {
      const data = insertEmployeeTitleSchema.parse(req.body);
      const result = await storage.createEmployeeTitle(data);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/employee-titles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertEmployeeTitleSchema.partial().parse(req.body);
      const result = await storage.updateEmployeeTitle(id, data);
      if (!result) return res.status(404).json({ message: "Employee title not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/employee-titles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteEmployeeTitle(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete title")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Employee Position Routes
  app.get("/api/employee-positions", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeePositions());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/positions", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeePositions());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/employee-positions", async (req: Request, res: Response) => {
    try {
      const data = insertEmployeePositionSchema.parse(req.body);
      const result = await storage.createEmployeePosition(data);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/employee-positions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertEmployeePositionSchema.partial().parse(req.body);
      const result = await storage.updateEmployeePosition(id, data);
      if (!result) return res.status(404).json({ message: "Employee position not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/employee-positions/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteEmployeePosition(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete position")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Employee Grade Routes
  app.get("/api/employee-grades", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeeGrades());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/grades", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeeGrades());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/employee-grades", async (req: Request, res: Response) => {
    try {
      const data = insertEmployeeGradeSchema.parse(req.body);
      const result = await storage.createEmployeeGrade(data);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/employee-grades/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertEmployeeGradeSchema.partial().parse(req.body);
      const result = await storage.updateEmployeeGrade(id, data);
      if (!result) return res.status(404).json({ message: "Employee grade not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/employee-grades/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteEmployeeGrade(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete grade")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Employee Trade Routes
  app.get("/api/employee-trades", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeeTrades());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/trades", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEmployeeTrades());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/employee-trades", async (req: Request, res: Response) => {
    try {
      const data = insertEmployeeTradeSchema.parse(req.body);
      const result = await storage.createEmployeeTrade(data);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/employee-trades/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertEmployeeTradeSchema.partial().parse(req.body);
      const result = await storage.updateEmployeeTrade(id, data);
      if (!result) return res.status(404).json({ message: "Employee trade not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/employee-trades/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteEmployeeTrade(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete trade")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // ========================================
  // EMPLOYEE MASTER ROUTES
  // ========================================

  app.get("/api/employee-masters", async (_req: Request, res: Response) => {
    try {
      const employees = await storage.getEmployeeMasters();
      res.json(employees);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/employee-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      const employee = await storage.getEmployeeMaster(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/employee-masters", async (req: Request, res: Response) => {
    try {
      const employeeData = insertEmployeeMasterSchema.parse(req.body);
      const employee = await storage.createEmployeeMaster(employeeData);
      res.status(201).json(employee);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in the")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.patch("/api/employee-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      const employeeData = insertEmployeeMasterSchema.partial().parse(req.body);
      const updatedEmployee = await storage.updateEmployeeMaster(id, employeeData);
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(updatedEmployee);
    } catch (err) {
      if (err instanceof Error && (
        err.message.includes("already exists") ||
        err.message.includes("is not in the")
      )) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/employee-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      await storage.deleteEmployeeMaster(id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot delete employee")) {
        return res.status(400).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Bulk import employee masters
  app.post("/api/employee-masters/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }

      const employeesWithRow: Array<{ row: number; data: any }> = [];
      const rowErrors: Array<{ row: number; errors: unknown[] }> = [];

      csvData.forEach((row: any, index: number) => {
        const parsed = insertEmployeeMasterSchema.safeParse(row);
        if (parsed.success) {
          employeesWithRow.push({ row: index + 1, data: parsed.data });
        } else {
          rowErrors.push({
            row: index + 1,
            errors: parsed.error.errors,
          });
        }
      });

      if (rowErrors.length > 0) {
        return res.status(400).json({
          message: "Validation error in uploaded rows",
          errors: rowErrors,
        });
      }

      const employees = employeesWithRow.map(item => item.data);

      // Check duplicate unique fields inside CSV itself before DB insert.
      const nationalIdRows = new Map<string, number[]>();
      const employeeNumberRows = new Map<string, number[]>();
      employeesWithRow.forEach(({ row, data }) => {
        const nationalId = String(data.empNationalId).trim();
        const employeeNumber = String(data.employeeNumber).trim();
        nationalIdRows.set(nationalId, [...(nationalIdRows.get(nationalId) ?? []), row]);
        employeeNumberRows.set(employeeNumber, [...(employeeNumberRows.get(employeeNumber) ?? []), row]);
      });

      nationalIdRows.forEach((rows, value) => {
        if (rows.length > 1) {
          rows.forEach(row => {
            rowErrors.push({
              row,
              errors: [{ message: `Duplicate empNationalId in upload: ${value}`, path: ["empNationalId"] }],
            });
          });
        }
      });

      employeeNumberRows.forEach((rows, value) => {
        if (rows.length > 1) {
          rows.forEach(row => {
            rowErrors.push({
              row,
              errors: [{ message: `Duplicate employeeNumber in upload: ${value}`, path: ["employeeNumber"] }],
            });
          });
        }
      });

      // Check duplicates against existing DB rows (unique constraints).
      const existingEmployees = await storage.getEmployeeMasters();
      const existingNationalIdSet = new Set(
        existingEmployees.map((item) => String(item.empNationalId).trim().toLowerCase())
      );
      const existingEmployeeNumberSet = new Set(
        existingEmployees.map((item) => String(item.employeeNumber).trim().toLowerCase())
      );

      employeesWithRow.forEach(({ row, data }) => {
        const nationalId = String(data.empNationalId).trim();
        const employeeNumber = String(data.employeeNumber).trim();
        if (existingNationalIdSet.has(nationalId.toLowerCase())) {
          rowErrors.push({
            row,
            errors: [{ message: `empNationalId already exists: ${nationalId}`, path: ["empNationalId"] }],
          });
        }
        if (existingEmployeeNumberSet.has(employeeNumber.toLowerCase())) {
          rowErrors.push({
            row,
            errors: [{ message: `employeeNumber already exists: ${employeeNumber}`, path: ["employeeNumber"] }],
          });
        }
      });

      const rowsWithErrors = new Set(rowErrors.map(item => item.row));
      const validEmployees = employeesWithRow
        .filter(item => !rowsWithErrors.has(item.row))
        .map(item => item.data);

      if (validEmployees.length === 0) {
        return res.status(400).json({
          message: "No valid rows to import",
          createdCount: 0,
          skippedCount: rowErrors.length,
          errors: rowErrors,
        });
      }

      const createdEmployees: Awaited<ReturnType<typeof storage.bulkCreateEmployeeMasters>> = [];
      const importErrors = [...rowErrors];
      for (const { row, data } of employeesWithRow.filter((item) => !rowsWithErrors.has(item.row))) {
        try {
          createdEmployees.push(await storage.createEmployeeMaster(data));
        } catch (err) {
          importErrors.push({
            row,
            errors: [{ message: err instanceof Error ? err.message : "Import failed" }],
          });
        }
      }

      if (createdEmployees.length === 0) {
        return res.status(400).json({
          message: "No valid rows to import",
          createdCount: 0,
          skippedCount: importErrors.length,
          errors: importErrors,
        });
      }

      res.status(201).json({
        message: importErrors.length > 0 ? "Imported with skipped rows" : "Imported successfully",
        createdCount: createdEmployees.length,
        skippedCount: importErrors.length,
        createdEmployees,
        skippedRows: importErrors,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ========================================
  // RENTAL MANPOWER ROUTES
  // ========================================

  app.get("/api/rental-manpower", async (_req: Request, res: Response) => {
    try {
      const rentalEmployees = await storage.getRentalManpowerList();
      res.json(rentalEmployees);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Register before GET /:id so paths like /bulk-upload are not captured as an id.
  app.get("/api/rental-manpower/bulk-upload", (_req: Request, res: Response) => {
    res.status(405).setHeader("Allow", "POST").json({
      message:
        "Bulk upload is only available via POST with JSON body { csvData: [...] }. GET is not supported.",
    });
  });

  // Bulk import rental manpower
  app.post("/api/rental-manpower/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }

      const allVendors = await storage.getVendorMasters();
      const vendorByNormalizedCode = new Map(
        allVendors.map((v) => [String(v.vendorCode).trim().toUpperCase(), v])
      );

      const employees: Awaited<ReturnType<typeof insertRentalManpowerSchema.parse>>[] = [];
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i] as Record<string, unknown>;
        const vendorCodeRaw =
          row.vendorCode != null ? String(row.vendorCode).trim() : "";
        if (!vendorCodeRaw) {
          return res.status(400).json({
            message: `Row ${i + 1}: vendorCode is required. Add a vendorCode column or ensure it has a value.`,
          });
        }
        const vendor = vendorByNormalizedCode.get(vendorCodeRaw.toUpperCase());
        if (!vendor) {
          const validCodes = Array.from(vendorByNormalizedCode.keys())
            .slice(0, 10)
            .join(", ");
          return res.status(400).json({
            message: `Row ${i + 1}: vendorCode "${vendorCodeRaw}" not found. Ensure the vendor exists in Vendor Master. Valid codes include: ${validCodes}${vendorByNormalizedCode.size > 10 ? "..." : ""}`,
          });
        }
        const { vendorCode: _vendorCode, ...rowFields } = row;
        const parsed = insertRentalManpowerSchema.safeParse({
          ...rowFields,
          vendorId: vendor.id,
        });
        if (!parsed.success) {
          const detail = parsed.error.issues
            .map((e) => `${e.path.length ? e.path.join(".") : "field"}: ${e.message}`)
            .join("; ");
          return res.status(400).json({
            message: `Row ${i + 1}: ${detail}`,
          });
        }
        employees.push(parsed.data);
      }

      const createdEmployees = await storage.bulkCreateRentalManpower(employees);
      res.status(201).json(createdEmployees);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/rental-manpower/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid rental employee ID" });
      }
      const employee = await storage.getRentalManpower(id);
      if (!employee) {
        return res.status(404).json({ message: "Rental employee not found" });
      }
      res.json(employee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/rental-manpower", async (req: Request, res: Response) => {
    try {
      const employeeData = insertRentalManpowerSchema.parse(req.body);
      const employee = await storage.createRentalManpower(employeeData);
      res.status(201).json(employee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/rental-manpower/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid rental employee ID" });
      }
      const employeeData = insertRentalManpowerSchema.partial().parse(req.body);
      const updatedEmployee = await storage.updateRentalManpower(id, employeeData);
      if (!updatedEmployee) {
        return res.status(404).json({ message: "Rental employee not found" });
      }
      res.json(updatedEmployee);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/rental-manpower/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid rental employee ID" });
      }
      await storage.deleteRentalManpower(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get all manpower type resources for the mapping dialog
  app.get("/api/resources/manpower/all", async (req: Request, res: Response) => {
    try {
      const manpowerResources = await storage.getResourcesByType("manpower");
      res.json(manpowerResources);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/resources/rental_manpower/all", async (_req: Request, res: Response) => {
    try {
      const rows = await storage.getResourcesByType("rental_manpower");
      res.json(rows);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/resources/rental_equipment/all", async (_req: Request, res: Response) => {
    try {
      const rows = await storage.getResourcesByType("rental_equipment");
      res.json(rows);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/resources/tools/all", async (_req: Request, res: Response) => {
    try {
      const rows = await storage.getResourcesByType("tools");
      res.json(rows);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get resource mapping for an employee
  app.get("/api/employee/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const mapping = await storage.getEmployeeResourceMapping(employeeId);
      res.json(mapping ?? null);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create or update resource mapping for an employee (one-to-one)
  app.post("/api/employee/:id/map-resource", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const resourceId = Number(req.body.resourceId);
      if (!resourceId || Number.isNaN(resourceId)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      insertEmployeeResourceMappingSchema.parse({ employeeId, resourceId });

      const existing = await storage.getEmployeeResourceMapping(employeeId);
      const mapping = await storage.upsertEmployeeResourceMapping(employeeId, resourceId);
      res.status(existing ? 200 : 201).json(mapping);
    } catch (err) {
      if (err instanceof Error && (
        err.message === "Employee not found" ||
        err.message === "Resource not found" ||
        err.message.includes("manpower")
      )) {
        const status = err.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: err.message });
      }
      handleError(err, res);
    }
  });

  // Delete resource mapping for an employee
  app.delete("/api/employee/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const deleted = await storage.deleteEmployeeResourceMapping(employeeId);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }

      res.json({ message: "Mapping deleted successfully", deletedMapping: deleted });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Rental manpower ↔ rental_manpower resource mapping (one-to-one)
  app.get("/api/rental-manpower/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const rentalId = parseInt(req.params.id);
      if (isNaN(rentalId)) {
        return res.status(400).json({ message: "Invalid rental manpower ID" });
      }
      const mapping = await storage.getRentalManpowerResourceMapping(rentalId);
      res.json(mapping ?? null);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/rental-manpower/:id/map-resource", async (req: Request, res: Response) => {
    try {
      const rentalId = parseInt(req.params.id);
      if (isNaN(rentalId)) {
        return res.status(400).json({ message: "Invalid rental manpower ID" });
      }
      const mappingData = insertRentalManpowerResourceMappingSchema.parse({
        rentalManpowerId: rentalId,
        resourceId: req.body.resourceId,
      });
      const existing = await storage.getRentalManpowerResourceMapping(rentalId);
      const mapping = await storage.upsertRentalManpowerResourceMapping(
        rentalId,
        mappingData.resourceId
      );
      res.status(existing ? 200 : 201).json(mapping);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/rental-manpower/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const rentalId = parseInt(req.params.id);
      if (isNaN(rentalId)) {
        return res.status(400).json({ message: "Invalid rental manpower ID" });
      }
      const deleted = await storage.deleteRentalManpowerResourceMapping(rentalId);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ message: "Mapping deleted successfully", deletedMapping: deleted });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== EQUIPMENT MASTER ENDPOINTS =====

  app.get("/api/equipment-masters", async (_req: Request, res: Response) => {
    try {
      const equipment = await storage.getEquipmentMasters();
      res.json(equipment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/equipment-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }
      const equipment = await storage.getEquipmentMaster(id);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/equipment-masters", async (req: Request, res: Response) => {
    try {
      const equipmentData = insertEquipmentMasterSchema.parse(req.body);
      const equipment = await storage.createEquipmentMaster(equipmentData);
      res.status(201).json(equipment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/equipment-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }
      const equipmentData = insertEquipmentMasterSchema.partial().parse(req.body);
      const equipment = await storage.updateEquipmentMaster(id, equipmentData);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/equipment-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }
      const existing = await storage.getEquipmentMaster(id);
      if (!existing) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      await storage.deleteEquipmentMaster(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/equipment-masters/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }
      const equipmentList = csvData.map((row: unknown) => insertEquipmentMasterSchema.parse(row));
      const createdEquipment = await storage.bulkCreateEquipmentMasters(equipmentList);
      res.status(201).json(createdEquipment);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== TOOL MANUFACTURERS =====
  app.get("/api/tool-manufacturers", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getToolManufacturers());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tool-manufacturers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.getToolManufacturer(id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tool-manufacturers", async (req: Request, res: Response) => {
    try {
      const data = insertToolManufacturerSchema.parse(req.body);
      res.status(201).json(await storage.createToolManufacturer(data));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/tool-manufacturers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertToolManufacturerSchema.partial().parse(req.body);
      const updated = await storage.updateToolManufacturer(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/tool-manufacturers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteToolManufacturer(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== TOOL TYPES =====
  app.get("/api/tool-types", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getToolTypes());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tool-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.getToolType(id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tool-types", async (req: Request, res: Response) => {
    try {
      const data = insertToolTypeSchema.parse(req.body);
      res.status(201).json(await storage.createToolType(data));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/tool-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertToolTypeSchema.partial().parse(req.body);
      const updated = await storage.updateToolType(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/tool-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteToolType(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== TOOL MODELS =====
  app.get("/api/tool-models", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getToolModels());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tool-models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.getToolModel(id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tool-models", async (req: Request, res: Response) => {
    try {
      const data = insertToolModelSchema.parse(req.body);
      res.status(201).json(await storage.createToolModel(data));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/tool-models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertToolModelSchema.partial().parse(req.body);
      const updated = await storage.updateToolModel(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/tool-models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteToolModel(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== TOOL MASTER ENDPOINTS =====

  app.get("/api/tool-masters", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getToolMasters());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tool-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid tool ID" });
      const row = await storage.getToolMaster(id);
      if (!row) return res.status(404).json({ message: "Tool not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tool-masters", async (req: Request, res: Response) => {
    try {
      const data = insertToolMasterSchema.parse(req.body);
      res.status(201).json(await storage.createToolMaster(data));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/tool-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid tool ID" });
      const data = insertToolMasterSchema.partial().parse(req.body);
      const updated = await storage.updateToolMaster(id, data);
      if (!updated) return res.status(404).json({ message: "Tool not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/tool-masters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid tool ID" });
      const existing = await storage.getToolMaster(id);
      if (!existing) return res.status(404).json({ message: "Tool not found" });
      await storage.deleteToolMaster(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tool-masters/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }
      if (csvData.length === 0) {
        return res.status(400).json({ message: "csvData must contain at least one row" });
      }

      const parsedRows: Awaited<ReturnType<typeof insertToolMasterSchema.parse>>[] = [];
      const seenNumbers = new Set<string>();

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i] as Record<string, unknown>;
        const toolNumberRaw =
          row.toolNumber != null && String(row.toolNumber).trim() !== ""
            ? String(row.toolNumber).trim()
            : row.toolCode != null && String(row.toolCode).trim() !== ""
              ? String(row.toolCode).trim()
              : "";
        if (!toolNumberRaw) {
          return res.status(400).json({ message: `Row ${i + 1}: toolNumber (or toolCode) is required.` });
        }
        if (seenNumbers.has(toolNumberRaw)) {
          return res.status(400).json({
            message: `Row ${i + 1}: duplicate toolNumber "${toolNumberRaw}" in upload.`,
          });
        }
        seenNumbers.add(toolNumberRaw);

        const { toolCode: _toolCode, ...fields } = row;
        const optional = ["description", "brand", "model", "accessories"] as const;
        for (const key of optional) {
          if (fields[key] == null || fields[key] === "") delete fields[key];
        }
        const parsed = insertToolMasterSchema.safeParse({
          ...fields,
          toolNumber: toolNumberRaw,
        });
        if (!parsed.success) {
          const detail = parsed.error.issues
            .map((e) => `${e.path.length ? e.path.join(".") : "field"}: ${e.message}`)
            .join("; ");
          return res.status(400).json({ message: `Row ${i + 1}: ${detail}` });
        }
        parsedRows.push(parsed.data);
      }

      const existingList = await storage.getToolMasters();
      const existing = existingList.filter((t) =>
        [...seenNumbers].some((n) => n.toLowerCase() === t.toolNumber.toLowerCase())
      );
      if (existing.length > 0) {
        return res.status(400).json({
          message: `toolNumber already exists: ${existing.map((e) => e.toolNumber).join(", ")}`,
        });
      }

      const created = await storage.bulkCreateToolMasters(parsedRows);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  const TIMESHEET_RESOURCE_TYPES = [
    "manpower",
    "rental_manpower",
    "equipment",
    "rental_equipment",
    "tools",
  ] as const;
  const TIMESHEET_STATUSES = [
    "worked",
    "idle_bench",
    "leave_off",
    "un_utilized",
    "weekly_off_rest",
  ] as const;
  type TimesheetResourceType = (typeof TIMESHEET_RESOURCE_TYPES)[number];

  function normalizeTimesheetPayload(payload: Record<string, unknown>) {
    const parsed = insertResourceTimesheetSchema.safeParse(payload);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((e) => `${e.path.length ? e.path.join(".") : "field"}: ${e.message}`)
        .join("; ");
      return { ok: false as const, message: detail };
    }
    const data = { ...parsed.data } as any;
    if (data.projectId == null || data.projectId === "") data.projectId = null;
    if (data.wpId == null || data.wpId === "") data.wpId = null;

    const idFields = ["employeeId", "rentalManpowerId", "equipmentId", "rentalEquipmentId", "toolId"] as const;
    for (const key of idFields) {
      if (data[key] == null || data[key] === "") data[key] = null;
      else data[key] = Number(data[key]);
    }

    const hasOne =
      (data.employeeId != null ? 1 : 0) +
      (data.rentalManpowerId != null ? 1 : 0) +
      (data.equipmentId != null ? 1 : 0) +
      (data.rentalEquipmentId != null ? 1 : 0) +
      (data.toolId != null ? 1 : 0);
    if (hasOne !== 1) {
      return { ok: false as const, message: "Exactly one resource ID field is required." };
    }

    const typeToIdField: Record<TimesheetResourceType, keyof typeof data> = {
      manpower: "employeeId",
      rental_manpower: "rentalManpowerId",
      equipment: "equipmentId",
      rental_equipment: "rentalEquipmentId",
      tools: "toolId",
    };
    const requiredField = typeToIdField[data.resourceType as TimesheetResourceType];
    if (data[requiredField] == null) {
      return { ok: false as const, message: `${requiredField} is required for resourceType ${data.resourceType}.` };
    }
    if (data.status !== "worked") {
      data.projectId = null;
      data.wpId = null;
    }
    return { ok: true as const, data };
  }

  app.get("/api/timesheets", async (req: Request, res: Response) => {
    try {
      const resourceType = String(req.query.resourceType ?? "").trim();
      if (resourceType && !TIMESHEET_RESOURCE_TYPES.includes(resourceType as TimesheetResourceType)) {
        return res.status(400).json({ message: "Invalid resourceType." });
      }

      const rows = await db.collection(resourceTimesheets).find().toArray();
      const projectRows = await db.collection(projects).find().toArray();
      const wpRows = await db.collection(workPackages).find().toArray();
      const empRows = await db.collection(employeeMaster).find().toArray();
      const rempRows = await db.collection(rentalManpower).find().toArray();
      const eqRows = await db.collection(equipmentMaster).find().toArray();
      const reqRows = await db.collection(rentalEquipment).find().toArray();
      const toolRows = await db.collection(toolMaster).find().toArray();

      const projectById = new Map(projectRows.map((p) => [p.id, p]));
      const wpById = new Map(wpRows.map((w) => [w.id, w]));
      const empById = new Map(empRows.map((e) => [e.id, e]));
      const rempById = new Map(rempRows.map((e) => [e.id, e]));
      const eqById = new Map(eqRows.map((e) => [e.id, e]));
      const reqById = new Map(reqRows.map((e) => [e.id, e]));
      const toolById = new Map(toolRows.map((t) => [t.id, t]));

      const out = rows
        .filter((r) => (!resourceType ? true : r.resourceType === resourceType))
        .map((r) => {
          let resourceLabel = "";
          if (r.employeeId) {
            const e = empById.get(r.employeeId);
            resourceLabel = e ? `${e.employeeNumber} - ${e.empFirstName} ${e.empLastName}` : `Employee #${r.employeeId}`;
          } else if (r.rentalManpowerId) {
            const e = rempById.get(r.rentalManpowerId);
            resourceLabel = e ? `${e.employeeNumber} - ${e.empFirstName} ${e.empLastName}` : `Rental employee #${r.rentalManpowerId}`;
          } else if (r.equipmentId) {
            const e = eqById.get(r.equipmentId);
            resourceLabel = e ? `${e.equipmentNumber} - ${e.equipmentName}` : `Equipment #${r.equipmentId}`;
          } else if (r.rentalEquipmentId) {
            const e = reqById.get(r.rentalEquipmentId);
            resourceLabel = e ? `${e.equipmentNumber} - ${e.equipmentName}` : `Rental equipment #${r.rentalEquipmentId}`;
          } else if (r.toolId) {
            const t = toolById.get(r.toolId);
            resourceLabel = t ? `${t.toolNumber} - ${t.name}` : `Tool #${r.toolId}`;
          }
          return {
            ...r,
            projectName: r.projectId ? projectById.get(r.projectId)?.name ?? null : null,
            wpCode: r.wpId ? wpById.get(r.wpId)?.code ?? null : null,
            wpName: r.wpId ? wpById.get(r.wpId)?.name ?? null : null,
            resourceLabel,
          };
        })
        .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
      res.json(out);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/timesheets", async (req: Request, res: Response) => {
    try {
      const normalized = normalizeTimesheetPayload(req.body ?? {});
      if (!normalized.ok) return res.status(400).json({ message: normalized.message });
      const [created] = await db.collection(resourceTimesheets).insertOne(normalized.data as any);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/timesheets/:id", async (req: Request, res: Response) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid timesheet ID" });
      const [row] = await db.collection(resourceTimesheets).findOne({ id: id });
      if (!row) return res.status(404).json({ message: "Timesheet not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/timesheets/:id", async (req: Request, res: Response) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid timesheet ID" });
      const existing = await db.collection(resourceTimesheets).findOne({ id: id });
      if (existing.length === 0) return res.status(404).json({ message: "Timesheet not found" });
      const merged = { ...existing[0], ...(req.body ?? {}) } as Record<string, unknown>;
      const normalized = normalizeTimesheetPayload(merged);
      if (!normalized.ok) return res.status(400).json({ message: normalized.message });
      const [updated] = await db
        .update(resourceTimesheets)
        .set({ ...(normalized.data as any), updatedAt: new Date() })
        .where(eq(resourceTimesheets.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/timesheets/:id", async (req: Request, res: Response) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid timesheet ID" });
      const deleted = await db.delete(resourceTimesheets).where(eq(resourceTimesheets.id, id)).returning();
      if (deleted.length === 0) return res.status(404).json({ message: "Timesheet not found" });
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/timesheets/bulk-upload/project-wise", async (req: Request, res: Response) => {
    try {
      const projectId = Number.parseInt(String(req.body?.projectId ?? ""), 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ message: "projectId is required." });
      const csvData = req.body?.csvData;
      if (!Array.isArray(csvData) || csvData.length === 0) {
        return res.status(400).json({ message: "csvData must be a non-empty array." });
      }
      const rows: any[] = [];
      for (let i = 0; i < csvData.length; i++) {
        const row = { ...(csvData[i] as Record<string, unknown>), projectId };
        const normalized = normalizeTimesheetPayload(row);
        if (!normalized.ok) {
          return res.status(400).json({ message: `Row ${i + 1}: ${normalized.message}` });
        }
        rows.push(normalized.data);
      }
      const created = await db.collection(resourceTimesheets).insertOne(rows as any);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/timesheets/bulk-upload/company-wise", async (req: Request, res: Response) => {
    try {
      const csvData = req.body?.csvData;
      if (!Array.isArray(csvData) || csvData.length === 0) {
        return res.status(400).json({ message: "csvData must be a non-empty array." });
      }
      const rows: any[] = [];
      for (let i = 0; i < csvData.length; i++) {
        const normalized = normalizeTimesheetPayload(csvData[i] as Record<string, unknown>);
        if (!normalized.ok) {
          return res.status(400).json({ message: `Row ${i + 1}: ${normalized.message}` });
        }
        rows.push(normalized.data);
      }
      const created = await db.collection(resourceTimesheets).insertOne(rows as any);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== EQUIPMENT MANUFACTURERS (OEM) ENDPOINTS =====
  app.get("/api/equipment-manufacturers", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEquipmentManufacturers());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/equipment-manufacturers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.getEquipmentManufacturer(id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/equipment-manufacturers", async (req: Request, res: Response) => {
    try {
      const data = insertEquipmentManufacturerSchema.parse(req.body);
      const created = await storage.createEquipmentManufacturer(data);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/equipment-manufacturers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertEquipmentManufacturerSchema.partial().parse(req.body);
      const updated = await storage.updateEquipmentManufacturer(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/equipment-manufacturers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteEquipmentManufacturer(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== EQUIPMENT TYPES ENDPOINTS =====
  app.get("/api/equipment-types", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getEquipmentTypes());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/equipment-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.getEquipmentType(id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/equipment-types", async (req: Request, res: Response) => {
    try {
      const data = insertEquipmentTypeSchema.parse(req.body);
      const created = await storage.createEquipmentType(data);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/equipment-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertEquipmentTypeSchema.partial().parse(req.body);
      const updated = await storage.updateEquipmentType(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/equipment-types/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteEquipmentType(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== RENTAL EQUIPMENT ENDPOINTS =====
  app.get("/api/rental-equipment", async (_req: Request, res: Response) => {
    try {
      res.json(await storage.getRentalEquipmentList());
    } catch (err) {
      handleError(err, res);
    }
  });

  // Register before GET /:id so /bulk-upload is not captured as an id.
  app.get("/api/rental-equipment/bulk-upload", (_req: Request, res: Response) => {
    res.status(405).setHeader("Allow", "POST").json({
      message:
        "Bulk upload is only available via POST with JSON body { csvData: [...] }. GET is not supported.",
    });
  });

  app.post("/api/rental-equipment/bulk-upload", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData must be an array" });
      }
      if (csvData.length === 0) {
        return res.status(400).json({ message: "csvData must contain at least one row" });
      }

      const allVendors = await storage.getVendorMasters();
      const vendorByNormalizedCode = new Map(
        allVendors.map((v) => [String(v.vendorCode).trim().toUpperCase(), v])
      );

      const employees: Awaited<ReturnType<typeof insertRentalEquipmentSchema.parse>>[] = [];
      const seenEquipmentNumbers = new Set<string>();

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i] as Record<string, unknown>;
        const vendorCodeRaw =
          row.vendorCode != null ? String(row.vendorCode).trim() : "";
        if (!vendorCodeRaw) {
          return res.status(400).json({
            message: `Row ${i + 1}: vendorCode is required.`,
          });
        }
        const vendor = vendorByNormalizedCode.get(vendorCodeRaw.toUpperCase());
        if (!vendor) {
          const validCodes = Array.from(vendorByNormalizedCode.keys())
            .slice(0, 10)
            .join(", ");
          return res.status(400).json({
            message: `Row ${i + 1}: vendorCode "${vendorCodeRaw}" not found. Ensure the vendor exists in Vendor Master. Valid codes include: ${validCodes}${vendorByNormalizedCode.size > 10 ? "..." : ""}`,
          });
        }

        const equipmentNumberRaw =
          row.equipmentNumber != null && String(row.equipmentNumber).trim() !== ""
            ? String(row.equipmentNumber).trim()
            : row.equipmentCode != null && String(row.equipmentCode).trim() !== ""
              ? String(row.equipmentCode).trim()
              : "";
        if (!equipmentNumberRaw) {
          return res.status(400).json({
            message: `Row ${i + 1}: equipmentNumber (or equipmentCode) is required.`,
          });
        }

        if (seenEquipmentNumbers.has(equipmentNumberRaw)) {
          return res.status(400).json({
            message: `Row ${i + 1}: duplicate equipmentNumber "${equipmentNumberRaw}" in this upload. Each row must have a unique equipment number.`,
          });
        }
        seenEquipmentNumbers.add(equipmentNumberRaw);

        const { vendorCode: _vendorCode, equipmentCode: _equipmentCode, ...rowFields } = row;

        const optionalText = [
          "description",
          "manufacturer",
          "model",
          "capacity",
          "unit",
        ] as const;
        for (const k of optionalText) {
          const v = rowFields[k];
          if (v === "" || v == null) {
            delete rowFields[k];
          }
        }
        if (rowFields.year === "" || rowFields.year == null) {
          delete rowFields.year;
        } else if (typeof rowFields.year === "string") {
          const y = parseInt(rowFields.year.trim(), 10);
          if (!Number.isNaN(y)) {
            rowFields.year = y;
          } else {
            delete rowFields.year;
          }
        }

        const payload = {
          ...rowFields,
          equipmentNumber: equipmentNumberRaw,
          vendorId: vendor.id,
        };

        const parsed = insertRentalEquipmentSchema.safeParse(payload);
        if (!parsed.success) {
          const detail = parsed.error.issues
            .map((e) => `${e.path.length ? e.path.join(".") : "field"}: ${e.message}`)
            .join("; ");
          return res.status(400).json({
            message: `Row ${i + 1}: ${detail}`,
          });
        }
        employees.push(parsed.data);
      }

      const uniqueNums = [...seenEquipmentNumbers];
      if (uniqueNums.length > 0) {
        const existingList = await storage.getRentalEquipmentList();
        const existing = existingList.filter((e) =>
          uniqueNums.some((n) => n.toLowerCase() === e.equipmentNumber.toLowerCase())
        );
        if (existing.length > 0) {
          const nums = existing.map((e) => e.equipmentNumber).join(", ");
          return res.status(400).json({
            message: `Equipment number(s) already exist in the database: ${nums}. Remove or change duplicate codes.`,
          });
        }
      }

      const created = await storage.bulkCreateRentalEquipment(employees);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/rental-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const row = await storage.getRentalEquipment(id);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/rental-equipment", async (req: Request, res: Response) => {
    try {
      const data = insertRentalEquipmentSchema.parse(req.body);
      const created = await storage.createRentalEquipment(data);
      res.status(201).json(created);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/rental-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertRentalEquipmentSchema.partial().parse(req.body);
      const updated = await storage.updateRentalEquipment(id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/rental-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteRentalEquipment(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/rental-equipment/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const rentalId = parseInt(req.params.id);
      if (isNaN(rentalId)) {
        return res.status(400).json({ message: "Invalid rental equipment ID" });
      }
      const mapping = await storage.getRentalEquipmentResourceMapping(rentalId);
      res.json(mapping ?? null);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/rental-equipment/:id/map-resource", async (req: Request, res: Response) => {
    try {
      const rentalId = parseInt(req.params.id);
      if (isNaN(rentalId)) {
        return res.status(400).json({ message: "Invalid rental equipment ID" });
      }
      const mappingData = insertRentalEquipmentResourceMappingSchema.parse({
        rentalEquipmentId: rentalId,
        resourceId: req.body.resourceId,
      });
      const existing = await storage.getRentalEquipmentResourceMapping(rentalId);
      const mapping = await storage.upsertRentalEquipmentResourceMapping(
        rentalId,
        mappingData.resourceId
      );
      res.status(existing ? 200 : 201).json(mapping);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/rental-equipment/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const rentalId = parseInt(req.params.id);
      if (isNaN(rentalId)) {
        return res.status(400).json({ message: "Invalid rental equipment ID" });
      }
      const deleted = await storage.deleteRentalEquipmentResourceMapping(rentalId);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ message: "Mapping deleted successfully", deletedMapping: deleted });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== EQUIPMENT RESOURCE MAPPING ENDPOINTS =====

  // Get all equipment type resources for the mapping dialog
  app.get("/api/resources/equipment/all", async (req: Request, res: Response) => {
    try {
      const equipmentResources = await storage.getResourcesByType("equipment");
      res.json(equipmentResources);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get resource mapping for equipment
  app.get("/api/equipment/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const equipmentId = parseInt(req.params.id);
      if (isNaN(equipmentId)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }

      const mapping = await storage.getEquipmentResourceMapping(equipmentId);
      res.json(mapping ?? null);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create or update resource mapping for equipment (one-to-one)
  app.post("/api/equipment/:id/map-resource", async (req: Request, res: Response) => {
    try {
      const equipmentId = parseInt(req.params.id);
      if (isNaN(equipmentId)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }

      const mappingData = insertEquipmentResourceMappingSchema.parse({
        equipmentId,
        resourceId: req.body.resourceId,
      });

      const existing = await storage.getEquipmentResourceMapping(equipmentId);
      const mapping = await storage.upsertEquipmentResourceMapping(
        equipmentId,
        mappingData.resourceId
      );
      res.status(existing ? 200 : 201).json(mapping);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Delete resource mapping for equipment
  app.delete("/api/equipment/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const equipmentId = parseInt(req.params.id);
      if (isNaN(equipmentId)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }

      const deleted = await storage.deleteEquipmentResourceMapping(equipmentId);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ message: "Mapping deleted successfully", deletedMapping: deleted });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ===== TOOL RESOURCE MAPPING ENDPOINTS =====

  // Get resource mapping for tool
  app.get("/api/tools/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const toolId = parseInt(req.params.id);
      if (isNaN(toolId)) {
        return res.status(400).json({ message: "Invalid tool ID" });
      }

      const mapping = await storage.getToolResourceMapping(toolId);
      res.json(mapping ?? null);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create or update resource mapping for tool (one-to-one)
  app.post("/api/tools/:id/map-resource", async (req: Request, res: Response) => {
    try {
      const toolId = parseInt(req.params.id);
      if (isNaN(toolId)) {
        return res.status(400).json({ message: "Invalid tool ID" });
      }

      const mappingData = insertToolResourceMappingSchema.parse({
        toolId,
        resourceId: req.body.resourceId,
      });

      const existing = await storage.getToolResourceMapping(toolId);
      const mapping = await storage.upsertToolResourceMapping(toolId, mappingData.resourceId);
      res.status(existing ? 200 : 201).json(mapping);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Delete resource mapping for tool
  app.delete("/api/tools/:id/resource-mapping", async (req: Request, res: Response) => {
    try {
      const toolId = parseInt(req.params.id);
      if (isNaN(toolId)) {
        return res.status(400).json({ message: "Invalid tool ID" });
      }

      const deleted = await storage.deleteToolResourceMapping(toolId);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ message: "Mapping deleted successfully", deletedMapping: deleted });
    } catch (err) {
      handleError(err, res);
    }
  });

  return httpServer;
}

// Helper function to check if there's a WorkPackage in the parent path of a WBS item
function checkForWorkPackageInPath(wbsItems: any[], item: any): boolean {
  if (!item.parentId) return false;

  const parent = wbsItems.find(wbs => wbs.id === item.parentId);
  if (!parent) return false;

  if (parent.type === "WorkPackage") return true;

  return checkForWorkPackageInPath(wbsItems, parent);
}
