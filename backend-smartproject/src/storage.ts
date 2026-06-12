import { db } from "./db";
import { normalizeHourlyResourceUom } from "./resource-uom";
import {
  type Project,
  type InsertProject,
  type WbsItem,
  type InsertWbsItem,
  type Dependency,
  type InsertDependency,
  type CostEntry,
  type InsertCostEntry,
  type Task,
  type InsertTask,
  type Activity,
  type InsertActivity,
  type Resource,
  type InsertResource,
  type TaskResource,
  type InsertTaskResource,
  type ProjectActivity,
  type InsertProjectActivity,
  type ProjectTask,
  type InsertProjectTask,
  type ProjectResource,
  type InsertProjectResource,
  type DailyProgress,
  type InsertDailyProgress,
  type ResourcePlan,
  type InsertResourcePlan,
  type RiskRegister,
  type InsertRiskRegister,
  type LessonLearntRegister,
  type InsertLessonLearntRegister,
  type DirectManpowerPosition,
  type InsertDirectManpowerPosition,
  type DirectManpowerEntry,
  type InsertDirectManpowerEntry,
  type IndirectManpowerPosition,
  type InsertIndirectManpowerPosition,
  type IndirectManpowerEntry,
  type InsertIndirectManpowerEntry,
  type PlannedActivity,
  type InsertPlannedActivity,
  type PlannedActivityTask,
  type InsertPlannedActivityTask,
  type WorkPackage,
  type InsertWorkPackage,
  type KanbanCard,
  type InsertKanbanCard,
  type ProjectActivityDependency,
  type InsertProjectActivityDependency,
  type WikiRecord,
  type InsertWikiRecord,
  type CollaborationThread,
  type CollaborationMessage,
  type InsertCollaborationThread,
  type Uom,
  type InsertUom,
  type MaterialType,
  type InsertMaterialType,
  type MaterialGroup,
  type InsertMaterialGroup,
  type MaterialMaster,
  type InsertMaterialMaster,
  type Country,
  type InsertCountry,
  type City,
  type InsertCity,
  type GlobalDefaults,
  type UpdateGlobalDefaults,
  type VendorMaster,
  type InsertVendorMaster,
  type ServiceType,
  type InsertServiceType,
  type ServiceGroup,
  type InsertServiceGroup,
  type ServiceMaster,
  type InsertServiceMaster,
  type PurchaseRequisition,
  type InsertPurchaseRequisition,
  type PurchaseRequisitionItem,
  type InsertPurchaseRequisitionItem,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type PurchaseOrderAttachment,
  type InsertPurchaseOrderAttachment,
  type Nationality,
  type InsertNationality,
  type EmployeeTitle,
  type InsertEmployeeTitle,
  type EmployeePosition,
  type InsertEmployeePosition,
  type EmployeeGrade,
  type InsertEmployeeGrade,
  type EmployeeTrade,
  type InsertEmployeeTrade,
  type EmployeeMaster,
  type InsertEmployeeMaster,
  type EmployeeResourceMapping,
  type InsertEmployeeResourceMapping,
  type RentalManpower,
  type InsertRentalManpower,
  type RentalManpowerResourceMapping,
  type EquipmentManufacturer,
  type InsertEquipmentManufacturer,
  type EquipmentType,
  type InsertEquipmentType,
  type EquipmentMaster,
  type InsertEquipmentMaster,
  type RentalEquipment,
  type InsertRentalEquipment,
  type EquipmentResourceMapping,
  type RentalEquipmentResourceMapping,
  type ToolManufacturer,
  type InsertToolManufacturer,
  type ToolType,
  type InsertToolType,
  type ToolModel,
  type InsertToolModel,
  type ToolMaster,
  type InsertToolMaster,
  type ToolResourceMapping,
  type InsertCollaborationMessage,
  type InsertCollabNotification,
  type CollabNotification,
  collaborationThreads,
  collaborationMessages,
  projectCollaborationThreads,
  projectCollaborationMessages,
  collabNotifications,
  globalDefaults,
} from "./schema";

const GLOBAL_DEFAULTS_ID = 1;

export class DatabaseStorage {
  private async getNextId(collectionName: string): Promise<number> {
    const res = await db.collection("counters").findOneAndUpdate(
      { _id: collectionName as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    return (res as any).seq || (res as any).value?.seq || 1;
  }

  async getProjects(projectId?: number): Promise<Project[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("projects").find(filter).toArray() as any;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return await db.collection("projects").findOne({ id }) as any;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const id = await this.getNextId("projects");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("projects").insertOne(item);
    return item as any;
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    await db.collection("projects").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getProject(id);
  }

  async deleteProject(id: number): Promise<void> {
    await db.collection("projects").deleteOne({ id });
  }

  async getWbsItems(projectId?: number): Promise<WbsItem[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("wbs_items").find(filter).toArray() as any;
  }

  async getWbsItem(id: number): Promise<WbsItem | undefined> {
    return await db.collection("wbs_items").findOne({ id }) as any;
  }

  async createWbsItem(data: InsertWbsItem): Promise<WbsItem> {
    const id = await this.getNextId("wbs_items");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("wbs_items").insertOne(item);
    return item as any;
  }

  async updateWbsItem(id: number, data: Partial<InsertWbsItem>): Promise<WbsItem | undefined> {
    await db.collection("wbs_items").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getWbsItem(id);
  }

  async deleteWbsItem(id: number): Promise<void> {
    await db.collection("wbs_items").deleteOne({ id });
  }

  async getDependencies(projectId?: number): Promise<Dependency[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("dependencies").find(filter).toArray() as any;
  }

  async getDependency(id: number): Promise<Dependency | undefined> {
    return await db.collection("dependencies").findOne({ id }) as any;
  }

  async createDependency(data: InsertDependency): Promise<Dependency> {
    const id = await this.getNextId("dependencies");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("dependencies").insertOne(item);
    return item as any;
  }

  async updateDependency(id: number, data: Partial<InsertDependency>): Promise<Dependency | undefined> {
    await db.collection("dependencies").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getDependency(id);
  }

  async deleteDependency(id: number): Promise<void> {
    await db.collection("dependencies").deleteOne({ id });
  }

  async getCostEntries(projectId?: number): Promise<CostEntry[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("cost_entries").find(filter).toArray() as any;
  }

  async getCostEntry(id: number): Promise<CostEntry | undefined> {
    return await db.collection("cost_entries").findOne({ id }) as any;
  }

  async createCostEntry(data: InsertCostEntry): Promise<CostEntry> {
    const id = await this.getNextId("cost_entries");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("cost_entries").insertOne(item);
    return item as any;
  }

  async updateCostEntry(id: number, data: Partial<InsertCostEntry>): Promise<CostEntry | undefined> {
    await db.collection("cost_entries").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getCostEntry(id);
  }

  async deleteCostEntry(id: number): Promise<void> {
    await db.collection("cost_entries").deleteOne({ id });
  }

  async getTasks(projectId?: number): Promise<Task[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("tasks").find(filter).toArray() as any;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return await db.collection("tasks").findOne({ id }) as any;
  }

  async createTask(data: InsertTask): Promise<Task> {
    const id = await this.getNextId("tasks");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("tasks").insertOne(item);
    return item as any;
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    await db.collection("tasks").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getTask(id);
  }

  async deleteTask(id: number): Promise<void> {
    await db.collection("tasks").deleteOne({ id });
  }

  async getActivities(projectId?: number): Promise<Activity[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("activities").find(filter).toArray() as any;
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return await db.collection("activities").findOne({ id }) as any;
  }

  async createActivity(data: InsertActivity): Promise<Activity> {
    const id = await this.getNextId("activities");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("activities").insertOne(item);
    return item as any;
  }

  async updateActivity(id: number, data: Partial<InsertActivity>): Promise<Activity | undefined> {
    await db.collection("activities").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getActivity(id);
  }

  async deleteActivity(id: number): Promise<void> {
    await db.collection("activities").deleteOne({ id });
  }

  async getUoms(): Promise<Uom[]> {
    return (await db.collection("uoms").find().sort({ name: 1 }).toArray()) as Uom[];
  }

  async getUom(id: number): Promise<Uom | undefined> {
    return (await db.collection("uoms").findOne({ id })) as Uom | undefined;
  }

  async getUomByName(name: string): Promise<Uom | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const all = await this.getUoms();
    return all.find((u) => u.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createUom(data: InsertUom): Promise<Uom> {
    const existing = await this.getUomByName(data.name);
    if (existing) {
      throw new Error(`UOM "${data.name}" already exists`);
    }
    const id = await this.getNextId("uoms");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("uoms").insertOne(item);
    return item as Uom;
  }

  async updateUom(id: number, data: Partial<InsertUom>): Promise<Uom | undefined> {
    const existing = await this.getUom(id);
    if (!existing) return undefined;
    if (data.name) {
      const dup = await this.getUomByName(data.name);
      if (dup && dup.id !== id) {
        throw new Error(`UOM "${data.name}" already exists`);
      }
    }
    await db.collection("uoms").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getUom(id);
  }

  async deleteUom(id: number): Promise<void> {
    const uom = await this.getUom(id);
    if (!uom) return;
    const inUse = await db.collection("activities").findOne({
      unitOfMeasure: { $regex: new RegExp(`^${uom.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(`Cannot delete UOM "${uom.name}" — it is used by activity "${(inUse as Activity).name}"`);
    }
    await db.collection("uoms").deleteOne({ id });
  }

  async getMaterialTypes(): Promise<MaterialType[]> {
    return (await db.collection("material_types").find().sort({ name: 1 }).toArray()) as MaterialType[];
  }

  async getMaterialType(id: number): Promise<MaterialType | undefined> {
    return (await db.collection("material_types").findOne({ id })) as MaterialType | undefined;
  }

  async getMaterialTypeByName(name: string): Promise<MaterialType | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const all = await this.getMaterialTypes();
    return all.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createMaterialType(data: InsertMaterialType): Promise<MaterialType> {
    const existing = await this.getMaterialTypeByName(data.name);
    if (existing) {
      throw new Error(`Material type "${data.name}" already exists`);
    }
    const id = await this.getNextId("material_types");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("material_types").insertOne(item);
    return item as MaterialType;
  }

  async updateMaterialType(id: number, data: Partial<InsertMaterialType>): Promise<MaterialType | undefined> {
    const existing = await this.getMaterialType(id);
    if (!existing) return undefined;
    if (data.name) {
      const dup = await this.getMaterialTypeByName(data.name);
      if (dup && dup.id !== id) {
        throw new Error(`Material type "${data.name}" already exists`);
      }
    }
    await db.collection("material_types").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getMaterialType(id);
  }

  async deleteMaterialType(id: number): Promise<void> {
    const materialType = await this.getMaterialType(id);
    if (!materialType) return;
    const linkedGroup = await db.collection("material_groups").findOne({ materialTypeId: id });
    if (linkedGroup) {
      throw new Error(
        `Cannot delete material type "${materialType.name}" — it has material groups linked to it`
      );
    }
    const inUse = await db.collection("material_master").findOne({
      materialType: { $regex: new RegExp(`^${materialType.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(
        `Cannot delete material type "${materialType.name}" — it is used by material "${(inUse as { materialCode?: string }).materialCode ?? "unknown"}"`
      );
    }
    await db.collection("material_types").deleteOne({ id });
  }

  async getMaterialGroups(materialTypeId?: number): Promise<MaterialGroup[]> {
    const filter = materialTypeId ? { materialTypeId } : {};
    return (await db.collection("material_groups").find(filter).sort({ name: 1 }).toArray()) as MaterialGroup[];
  }

  async getMaterialGroup(id: number): Promise<MaterialGroup | undefined> {
    return (await db.collection("material_groups").findOne({ id })) as MaterialGroup | undefined;
  }

  async getMaterialGroupByNameAndType(name: string, materialTypeId: number): Promise<MaterialGroup | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const groups = await this.getMaterialGroups(materialTypeId);
    return groups.find((g) => g.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createMaterialGroup(data: InsertMaterialGroup): Promise<MaterialGroup> {
    const materialType = await this.getMaterialType(data.materialTypeId);
    if (!materialType) {
      throw new Error("Selected material type does not exist");
    }
    const existing = await this.getMaterialGroupByNameAndType(data.name, data.materialTypeId);
    if (existing) {
      throw new Error(`Material group "${data.name}" already exists for this material type`);
    }
    const id = await this.getNextId("material_groups");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("material_groups").insertOne(item);
    return item as MaterialGroup;
  }

  async updateMaterialGroup(id: number, data: Partial<InsertMaterialGroup>): Promise<MaterialGroup | undefined> {
    const existing = await this.getMaterialGroup(id);
    if (!existing) return undefined;

    const materialTypeId = data.materialTypeId ?? existing.materialTypeId;
    if (data.materialTypeId !== undefined) {
      const materialType = await this.getMaterialType(data.materialTypeId);
      if (!materialType) {
        throw new Error("Selected material type does not exist");
      }
    }

    const name = data.name ?? existing.name;
    const dup = await this.getMaterialGroupByNameAndType(name, materialTypeId);
    if (dup && dup.id !== id) {
      throw new Error(`Material group "${name}" already exists for this material type`);
    }

    await db.collection("material_groups").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getMaterialGroup(id);
  }

  async deleteMaterialGroup(id: number): Promise<void> {
    const materialGroup = await this.getMaterialGroup(id);
    if (!materialGroup) return;
    const inUse = await db.collection("material_master").findOne({
      materialGroup: { $regex: new RegExp(`^${materialGroup.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(
        `Cannot delete material group "${materialGroup.name}" — it is used by material "${(inUse as { materialCode?: string }).materialCode ?? "unknown"}"`
      );
    }
    await db.collection("material_groups").deleteOne({ id });
  }

  private async validateMaterialMasterRefs(data: {
    uom?: string;
    materialType?: string;
    materialGroup?: string;
  }): Promise<{ uom?: string }> {
    const normalized: { uom?: string } = {};
    if (data.uom) {
      const uom = await this.getUomByName(data.uom);
      if (!uom) {
        throw new Error(`UOM "${data.uom}" is not in the UOM master`);
      }
      normalized.uom = uom.name;
    }
    if (data.materialType) {
      const materialType = await this.getMaterialTypeByName(data.materialType);
      if (!materialType) {
        throw new Error(`Material type "${data.materialType}" is not in the material type master`);
      }
      if (data.materialGroup) {
        const materialGroup = await this.getMaterialGroupByNameAndType(
          data.materialGroup,
          materialType.id
        );
        if (!materialGroup) {
          throw new Error(
            `Material group "${data.materialGroup}" is not defined for material type "${data.materialType}"`
          );
        }
      }
    } else if (data.materialGroup) {
      const groups = await this.getMaterialGroups();
      const match = groups.find(
        (g) => g.name.toLowerCase() === data.materialGroup!.trim().toLowerCase()
      );
      if (!match) {
        throw new Error(`Material group "${data.materialGroup}" is not in the material group master`);
      }
    }
    return normalized;
  }

  async getMaterialMasters(): Promise<MaterialMaster[]> {
    return (await db.collection("material_master").find().sort({ materialCode: 1 }).toArray()) as MaterialMaster[];
  }

  async getMaterialMaster(id: number): Promise<MaterialMaster | undefined> {
    return (await db.collection("material_master").findOne({ id })) as MaterialMaster | undefined;
  }

  async getMaterialMasterByCode(materialCode: string): Promise<MaterialMaster | undefined> {
    const trimmed = materialCode.trim();
    if (!trimmed) return undefined;
    const all = await this.getMaterialMasters();
    return all.find((m) => m.materialCode.toLowerCase() === trimmed.toLowerCase());
  }

  async createMaterialMaster(data: InsertMaterialMaster): Promise<MaterialMaster> {
    const existing = await this.getMaterialMasterByCode(data.materialCode);
    if (existing) {
      throw new Error(`Material code "${data.materialCode}" already exists`);
    }
    const normalized = await this.validateMaterialMasterRefs(data);
    const id = await this.getNextId("material_master");
    const item = {
      ...data,
      ...normalized,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("material_master").insertOne(item);
    return item as MaterialMaster;
  }

  async updateMaterialMaster(
    id: number,
    data: Partial<InsertMaterialMaster>
  ): Promise<MaterialMaster | undefined> {
    const existing = await this.getMaterialMaster(id);
    if (!existing) return undefined;

    if (data.materialCode) {
      const dup = await this.getMaterialMasterByCode(data.materialCode);
      if (dup && dup.id !== id) {
        throw new Error(`Material code "${data.materialCode}" already exists`);
      }
    }

    const merged = { ...existing, ...data };
    const normalized = await this.validateMaterialMasterRefs({
      uom: merged.uom,
      materialType: merged.materialType,
      materialGroup: merged.materialGroup,
    });

    await db.collection("material_master").updateOne(
      { id },
      { $set: { ...data, ...normalized, updatedAt: new Date() } }
    );
    return this.getMaterialMaster(id);
  }

  async deleteMaterialMaster(id: number): Promise<void> {
    const material = await this.getMaterialMaster(id);
    if (!material) return;
    const inUse = await db.collection("work_package_materials").findOne({ materialId: id });
    if (inUse) {
      throw new Error(
        `Cannot delete material "${material.materialCode}" — it is assigned to a work package`
      );
    }
    await db.collection("material_master").deleteOne({ id });
  }

  private async ensureNumericId(
    collectionName: string,
    doc: Record<string, unknown>
  ): Promise<number> {
    if (typeof doc.id === "number") return doc.id;
    const id = await this.getNextId(collectionName);
    await db.collection(collectionName).updateOne(
      { _id: doc._id as any },
      { $set: { id, createdAt: doc.createdAt ?? new Date(), updatedAt: new Date() } }
    );
    return id;
  }

  async getCountries(): Promise<Country[]> {
    const docs = await db.collection("countries").find().sort({ name: 1 }).toArray();
    const result: Country[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("countries", doc as Record<string, unknown>);
      result.push({ ...(doc as Country), id });
    }
    return result;
  }

  async getCountry(id: number): Promise<Country | undefined> {
    return (await db.collection("countries").findOne({ id })) as Country | undefined;
  }

  async getCountryByName(name: string): Promise<Country | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const all = await this.getCountries();
    return all.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const existing = await this.getCountryByName(data.name);
    if (existing) {
      throw new Error(`Country "${data.name}" already exists`);
    }
    const id = await this.getNextId("countries");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("countries").insertOne(item);
    return item as Country;
  }

  async updateCountry(id: number, data: Partial<InsertCountry>): Promise<Country | undefined> {
    const existing = await this.getCountry(id);
    if (!existing) return undefined;
    if (data.name) {
      const dup = await this.getCountryByName(data.name);
      if (dup && dup.id !== id) {
        throw new Error(`Country "${data.name}" already exists`);
      }
    }
    await db.collection("countries").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getCountry(id);
  }

  async deleteCountry(id: number): Promise<void> {
    const country = await this.getCountry(id);
    if (!country) return;
    const linkedCity = await db.collection("cities").findOne({ countryId: id });
    if (linkedCity) {
      throw new Error(`Cannot delete country "${country.name}" — it has cities linked to it`);
    }
    const vendorUsingCountry = await db.collection("vendor_master").findOne({
      vendorCountry: { $regex: new RegExp(`^${country.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (vendorUsingCountry) {
      throw new Error(`Cannot delete country "${country.name}" — it is used by a vendor`);
    }
    await db.collection("countries").deleteOne({ id });
  }

  async getGlobalDefaults(): Promise<GlobalDefaults> {
    const existing = (await db
      .collection(globalDefaults)
      .findOne({ id: GLOBAL_DEFAULTS_ID })) as GlobalDefaults | null;
    if (existing) return existing;

    const defaults: GlobalDefaults = {
      id: GLOBAL_DEFAULTS_ID,
      defaultCountryId: null,
      defaultCurrencyCode: "USD",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection(globalDefaults).insertOne(defaults);
    return defaults;
  }

  async updateGlobalDefaults(data: UpdateGlobalDefaults): Promise<GlobalDefaults> {
    if (data.defaultCountryId != null) {
      const country = await this.getCountry(data.defaultCountryId);
      if (!country) {
        throw new Error("Selected default country was not found");
      }
    }
    await this.getGlobalDefaults();
    await db.collection(globalDefaults).updateOne(
      { id: GLOBAL_DEFAULTS_ID },
      {
        $set: {
          ...data,
          defaultCountryId: data.defaultCountryId ?? null,
          updatedAt: new Date(),
        },
      }
    );
    return this.getGlobalDefaults();
  }

  async getCities(countryId?: number): Promise<Array<City & { countryName?: string }>> {
    const filter = countryId ? { countryId } : {};
    const docs = await db.collection("cities").find(filter).sort({ name: 1 }).toArray();
    if (docs.length === 0) return [];

    const allCountries = await this.getCountries();
    const countryById = new Map(allCountries.map((c) => [c.id, c.name]));

    const result: Array<City & { countryName?: string }> = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("cities", doc as Record<string, unknown>);
      const city = { ...(doc as City), id };
      result.push({
        ...city,
        countryName: countryById.get(city.countryId),
      });
    }
    return result;
  }

  async getCity(id: number): Promise<City | undefined> {
    return (await db.collection("cities").findOne({ id })) as City | undefined;
  }

  async getCityByNameAndCountry(name: string, countryId: number): Promise<City | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const cities = await this.getCities(countryId);
    return cities.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createCity(data: InsertCity): Promise<City & { countryName?: string }> {
    const country = await this.getCountry(data.countryId);
    if (!country) {
      throw new Error("Selected country does not exist");
    }
    const existing = await this.getCityByNameAndCountry(data.name, data.countryId);
    if (existing) {
      throw new Error(`City "${data.name}" already exists for this country`);
    }
    const id = await this.getNextId("cities");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("cities").insertOne(item);
    return { ...(item as City), countryName: country.name };
  }

  async updateCity(
    id: number,
    data: Partial<InsertCity>
  ): Promise<(City & { countryName?: string }) | undefined> {
    const existing = await this.getCity(id);
    if (!existing) return undefined;

    const countryId = data.countryId ?? existing.countryId;
    if (data.countryId !== undefined) {
      const country = await this.getCountry(data.countryId);
      if (!country) {
        throw new Error("Selected country does not exist");
      }
    }

    const name = data.name ?? existing.name;
    const dup = await this.getCityByNameAndCountry(name, countryId);
    if (dup && dup.id !== id) {
      throw new Error(`City "${name}" already exists for this country`);
    }

    await db.collection("cities").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    const updated = await this.getCity(id);
    if (!updated) return undefined;
    const country = await this.getCountry(updated.countryId);
    return { ...updated, countryName: country?.name };
  }

  async deleteCity(id: number): Promise<void> {
    const city = await this.getCity(id);
    if (!city) return;
    const country = await this.getCountry(city.countryId);
    const vendorUsingCity = await db.collection("vendor_master").findOne({
      vendorCity: { $regex: new RegExp(`^${city.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      ...(country
        ? {
            vendorCountry: {
              $regex: new RegExp(`^${country.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            },
          }
        : {}),
    });
    if (vendorUsingCity) {
      throw new Error(`Cannot delete city "${city.name}" — it is used by a vendor`);
    }
    await db.collection("cities").deleteOne({ id });
  }

  private async validateVendorLocation(data: {
    vendorCountry?: string;
    vendorCity?: string;
  }): Promise<void> {
    if (data.vendorCountry) {
      const country = await this.getCountryByName(data.vendorCountry);
      if (!country) {
        throw new Error(`Country "${data.vendorCountry}" is not in the country master`);
      }
      if (data.vendorCity) {
        const city = await this.getCityByNameAndCountry(data.vendorCity, country.id);
        if (!city) {
          throw new Error(
            `City "${data.vendorCity}" is not defined for country "${data.vendorCountry}"`
          );
        }
      }
    } else if (data.vendorCity) {
      const allCities = (await db.collection("cities").find().toArray()) as City[];
      const match = allCities.find(
        (c) => c.name.toLowerCase() === data.vendorCity!.trim().toLowerCase()
      );
      if (!match) {
        throw new Error(`City "${data.vendorCity}" is not in the city master`);
      }
    }
  }

  async getVendorMasters(): Promise<VendorMaster[]> {
    return (await db.collection("vendor_master").find().sort({ vendorCode: 1 }).toArray()) as VendorMaster[];
  }

  async getVendorMaster(id: number): Promise<VendorMaster | undefined> {
    return (await db.collection("vendor_master").findOne({ id })) as VendorMaster | undefined;
  }

  async getVendorMasterByCode(vendorCode: string): Promise<VendorMaster | undefined> {
    const trimmed = vendorCode.trim();
    if (!trimmed) return undefined;
    const all = await this.getVendorMasters();
    return all.find((v) => v.vendorCode.toLowerCase() === trimmed.toLowerCase());
  }

  async createVendorMaster(data: InsertVendorMaster): Promise<VendorMaster> {
    const existing = await this.getVendorMasterByCode(data.vendorCode);
    if (existing) {
      throw new Error(`Vendor code "${data.vendorCode}" already exists`);
    }
    await this.validateVendorLocation(data);
    const id = await this.getNextId("vendor_master");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("vendor_master").insertOne(item);
    return item as VendorMaster;
  }

  async updateVendorMaster(
    id: number,
    data: Partial<InsertVendorMaster>
  ): Promise<VendorMaster | undefined> {
    const existing = await this.getVendorMaster(id);
    if (!existing) return undefined;

    if (data.vendorCode) {
      const dup = await this.getVendorMasterByCode(data.vendorCode);
      if (dup && dup.id !== id) {
        throw new Error(`Vendor code "${data.vendorCode}" already exists`);
      }
    }

    const merged = { ...existing, ...data };
    await this.validateVendorLocation({
      vendorCountry: merged.vendorCountry,
      vendorCity: merged.vendorCity,
    });

    await db.collection("vendor_master").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getVendorMaster(id);
  }

  async deleteVendorMaster(id: number): Promise<void> {
    const vendor = await this.getVendorMaster(id);
    if (!vendor) return;
    const inUse = await db.collection("purchase_orders").findOne({ vendorId: id });
    if (inUse) {
      throw new Error(`Cannot delete vendor "${vendor.vendorCode}" — it is used by a purchase order`);
    }
    await db.collection("vendor_master").deleteOne({ id });
  }

  async getServiceTypes(): Promise<ServiceType[]> {
    const docs = await db.collection("service_types").find().sort({ name: 1 }).toArray();
    const result: ServiceType[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("service_types", doc as Record<string, unknown>);
      result.push({ ...(doc as ServiceType), id });
    }
    return result;
  }

  async getServiceType(id: number): Promise<ServiceType | undefined> {
    return (await db.collection("service_types").findOne({ id })) as ServiceType | undefined;
  }

  async getServiceTypeByName(name: string): Promise<ServiceType | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const all = await this.getServiceTypes();
    return all.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createServiceType(data: InsertServiceType): Promise<ServiceType> {
    const existing = await this.getServiceTypeByName(data.name);
    if (existing) {
      throw new Error(`Service type "${data.name}" already exists`);
    }
    const id = await this.getNextId("service_types");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("service_types").insertOne(item);
    return item as ServiceType;
  }

  async updateServiceType(id: number, data: Partial<InsertServiceType>): Promise<ServiceType | undefined> {
    const existing = await this.getServiceType(id);
    if (!existing) return undefined;
    if (data.name) {
      const dup = await this.getServiceTypeByName(data.name);
      if (dup && dup.id !== id) {
        throw new Error(`Service type "${data.name}" already exists`);
      }
    }
    await db.collection("service_types").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getServiceType(id);
  }

  async deleteServiceType(id: number): Promise<void> {
    const serviceType = await this.getServiceType(id);
    if (!serviceType) return;
    const linkedGroup = await db.collection("service_groups").findOne({ serviceTypeId: id });
    if (linkedGroup) {
      throw new Error(
        `Cannot delete service type "${serviceType.name}" — it has service groups linked to it`
      );
    }
    const inUse = await db.collection("service_master").findOne({
      serviceType: { $regex: new RegExp(`^${serviceType.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(
        `Cannot delete service type "${serviceType.name}" — it is used by service "${(inUse as { serviceCode?: string }).serviceCode ?? "unknown"}"`
      );
    }
    await db.collection("service_types").deleteOne({ id });
  }

  async getServiceGroups(serviceTypeId?: number): Promise<ServiceGroup[]> {
    const filter = serviceTypeId ? { serviceTypeId } : {};
    const docs = await db.collection("service_groups").find(filter).sort({ name: 1 }).toArray();
    const result: ServiceGroup[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("service_groups", doc as Record<string, unknown>);
      result.push({ ...(doc as ServiceGroup), id });
    }
    return result;
  }

  async getServiceGroup(id: number): Promise<ServiceGroup | undefined> {
    return (await db.collection("service_groups").findOne({ id })) as ServiceGroup | undefined;
  }

  async getServiceGroupByNameAndType(name: string, serviceTypeId: number): Promise<ServiceGroup | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const groups = await this.getServiceGroups(serviceTypeId);
    return groups.find((g) => g.name.toLowerCase() === trimmed.toLowerCase());
  }

  async createServiceGroup(data: InsertServiceGroup): Promise<ServiceGroup> {
    const serviceType = await this.getServiceType(data.serviceTypeId);
    if (!serviceType) {
      throw new Error("Selected service type does not exist");
    }
    const existing = await this.getServiceGroupByNameAndType(data.name, data.serviceTypeId);
    if (existing) {
      throw new Error(`Service group "${data.name}" already exists for this service type`);
    }
    const id = await this.getNextId("service_groups");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("service_groups").insertOne(item);
    return item as ServiceGroup;
  }

  async updateServiceGroup(id: number, data: Partial<InsertServiceGroup>): Promise<ServiceGroup | undefined> {
    const existing = await this.getServiceGroup(id);
    if (!existing) return undefined;

    const serviceTypeId = data.serviceTypeId ?? existing.serviceTypeId;
    if (!serviceTypeId) {
      throw new Error("Service type is required");
    }
    if (data.serviceTypeId !== undefined) {
      const serviceType = await this.getServiceType(data.serviceTypeId);
      if (!serviceType) {
        throw new Error("Selected service type does not exist");
      }
    }

    const name = data.name ?? existing.name;
    const dup = await this.getServiceGroupByNameAndType(name, serviceTypeId);
    if (dup && dup.id !== id) {
      throw new Error(`Service group "${name}" already exists for this service type`);
    }

    await db.collection("service_groups").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getServiceGroup(id);
  }

  async deleteServiceGroup(id: number): Promise<void> {
    const serviceGroup = await this.getServiceGroup(id);
    if (!serviceGroup) return;
    const inUse = await db.collection("service_master").findOne({
      serviceGroup: { $regex: new RegExp(`^${serviceGroup.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(
        `Cannot delete service group "${serviceGroup.name}" — it is used by service "${(inUse as { serviceCode?: string }).serviceCode ?? "unknown"}"`
      );
    }
    await db.collection("service_groups").deleteOne({ id });
  }

  async validateServiceMasterRefs(data: {
    uom?: string;
    serviceType?: string;
    serviceGroup?: string;
  }): Promise<{ uom?: string }> {
    const normalized: { uom?: string } = {};
    if (data.uom) {
      const uom = await this.getUomByName(data.uom);
      if (!uom) {
        throw new Error(`UOM "${data.uom}" is not in the UOM master`);
      }
      normalized.uom = uom.name;
    }
    if (data.serviceType) {
      const serviceType = await this.getServiceTypeByName(data.serviceType);
      if (!serviceType) {
        throw new Error(`Service type "${data.serviceType}" is not in the service type master`);
      }
      if (data.serviceGroup) {
        const serviceGroup = await this.getServiceGroupByNameAndType(
          data.serviceGroup,
          serviceType.id
        );
        if (!serviceGroup) {
          throw new Error(
            `Service group "${data.serviceGroup}" is not defined for service type "${data.serviceType}"`
          );
        }
      }
    } else if (data.serviceGroup) {
      const groups = await this.getServiceGroups();
      const match = groups.find(
        (g) => g.name.toLowerCase() === data.serviceGroup!.trim().toLowerCase()
      );
      if (!match) {
        throw new Error(`Service group "${data.serviceGroup}" is not in the service group master`);
      }
    }
    return normalized;
  }

  async getServiceMasters(): Promise<ServiceMaster[]> {
    return (await db.collection("service_master").find().sort({ serviceCode: 1 }).toArray()) as ServiceMaster[];
  }

  async getServiceMaster(id: number): Promise<ServiceMaster | undefined> {
    return (await db.collection("service_master").findOne({ id })) as ServiceMaster | undefined;
  }

  async getServiceMasterByCode(serviceCode: string): Promise<ServiceMaster | undefined> {
    const trimmed = serviceCode.trim();
    if (!trimmed) return undefined;
    const all = await this.getServiceMasters();
    return all.find((s) => s.serviceCode.toLowerCase() === trimmed.toLowerCase());
  }

  async createServiceMaster(data: InsertServiceMaster): Promise<ServiceMaster> {
    const existing = await this.getServiceMasterByCode(data.serviceCode);
    if (existing) {
      throw new Error(`Service code "${data.serviceCode}" already exists`);
    }
    const normalized = await this.validateServiceMasterRefs(data);
    const id = await this.getNextId("service_master");
    const item = {
      ...data,
      ...normalized,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("service_master").insertOne(item);
    return item as ServiceMaster;
  }

  async updateServiceMaster(
    id: number,
    data: Partial<InsertServiceMaster>
  ): Promise<ServiceMaster | undefined> {
    const existing = await this.getServiceMaster(id);
    if (!existing) return undefined;
    if (data.serviceCode) {
      const dup = await this.getServiceMasterByCode(data.serviceCode);
      if (dup && dup.id !== id) {
        throw new Error(`Service code "${data.serviceCode}" already exists`);
      }
    }
    const merged = { ...existing, ...data };
    const normalized = await this.validateServiceMasterRefs(merged);
    await db.collection("service_master").updateOne(
      { id },
      { $set: { ...data, ...normalized, updatedAt: new Date() } }
    );
    return this.getServiceMaster(id);
  }

  async deleteServiceMaster(id: number): Promise<void> {
    const inWp = await db.collection("work_package_services").findOne({ serviceId: id });
    if (inWp) {
      throw new Error("Cannot delete service — it is assigned to a work package");
    }
    await db.collection("service_master").deleteOne({ id });
  }

  private async listNamedRecords<T extends { id: number; name: string }>(
    collectionName: string
  ): Promise<T[]> {
    const docs = await db.collection(collectionName).find().sort({ name: 1 }).toArray();
    const result: T[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId(collectionName, doc as Record<string, unknown>);
      result.push({ ...(doc as T), id });
    }
    return result;
  }

  private async getNamedRecord<T extends { id: number; name: string }>(
    collectionName: string,
    id: number
  ): Promise<T | undefined> {
    return (await db.collection(collectionName).findOne({ id })) as T | undefined;
  }

  private async getNamedRecordByName<T extends { id: number; name: string }>(
    collectionName: string,
    name: string
  ): Promise<T | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const all = await this.listNamedRecords<T>(collectionName);
    return all.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  }

  private async createNamedRecord<T extends { id: number; name: string }>(
    collectionName: string,
    data: { name: string; description?: string | null }
  ): Promise<T> {
    const existing = await this.getNamedRecordByName<T>(collectionName, data.name);
    if (existing) {
      throw new Error(`"${data.name}" already exists`);
    }
    const id = await this.getNextId(collectionName);
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection(collectionName).insertOne(item);
    return item as T;
  }

  private async updateNamedRecord<T extends { id: number; name: string }>(
    collectionName: string,
    id: number,
    data: Partial<{ name: string; description?: string | null }>
  ): Promise<T | undefined> {
    const existing = await this.getNamedRecord<T>(collectionName, id);
    if (!existing) return undefined;
    if (data.name) {
      const dup = await this.getNamedRecordByName<T>(collectionName, data.name);
      if (dup && dup.id !== id) {
        throw new Error(`"${data.name}" already exists`);
      }
    }
    await db.collection(collectionName).updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getNamedRecord<T>(collectionName, id);
  }

  private async deleteNamedRecord(collectionName: string, id: number): Promise<void> {
    await db.collection(collectionName).deleteOne({ id });
  }

  async getNationalities(): Promise<Nationality[]> {
    return this.listNamedRecords<Nationality>("nationalities");
  }

  async getNationality(id: number): Promise<Nationality | undefined> {
    return this.getNamedRecord<Nationality>("nationalities", id);
  }

  async getNationalityByName(name: string): Promise<Nationality | undefined> {
    return this.getNamedRecordByName<Nationality>("nationalities", name);
  }

  async createNationality(data: InsertNationality): Promise<Nationality> {
    return this.createNamedRecord<Nationality>("nationalities", data);
  }

  async updateNationality(id: number, data: Partial<InsertNationality>): Promise<Nationality | undefined> {
    return this.updateNamedRecord<Nationality>("nationalities", id, data);
  }

  async deleteNationality(id: number): Promise<void> {
    const nationality = await this.getNationality(id);
    if (!nationality) return;
    const inUse = await db.collection("employee_master").findOne({
      empNationality: { $regex: new RegExp(`^${nationality.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(`Cannot delete nationality "${nationality.name}" — it is used by an employee`);
    }
    await this.deleteNamedRecord("nationalities", id);
  }

  async getEmployeeTitles(): Promise<EmployeeTitle[]> {
    return this.listNamedRecords<EmployeeTitle>("employee_titles");
  }

  async getEmployeeTitle(id: number): Promise<EmployeeTitle | undefined> {
    return this.getNamedRecord<EmployeeTitle>("employee_titles", id);
  }

  async getEmployeeTitleByName(name: string): Promise<EmployeeTitle | undefined> {
    return this.getNamedRecordByName<EmployeeTitle>("employee_titles", name);
  }

  async createEmployeeTitle(data: InsertEmployeeTitle): Promise<EmployeeTitle> {
    return this.createNamedRecord<EmployeeTitle>("employee_titles", data);
  }

  async updateEmployeeTitle(id: number, data: Partial<InsertEmployeeTitle>): Promise<EmployeeTitle | undefined> {
    return this.updateNamedRecord<EmployeeTitle>("employee_titles", id, data);
  }

  async deleteEmployeeTitle(id: number): Promise<void> {
    const item = await this.getEmployeeTitle(id);
    if (!item) return;
    const inUse = await db.collection("employee_master").findOne({
      empTitle: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(`Cannot delete title "${item.name}" — it is used by an employee`);
    }
    await this.deleteNamedRecord("employee_titles", id);
  }

  async getEmployeePositions(): Promise<EmployeePosition[]> {
    return this.listNamedRecords<EmployeePosition>("employee_positions");
  }

  async getEmployeePosition(id: number): Promise<EmployeePosition | undefined> {
    return this.getNamedRecord<EmployeePosition>("employee_positions", id);
  }

  async getEmployeePositionByName(name: string): Promise<EmployeePosition | undefined> {
    return this.getNamedRecordByName<EmployeePosition>("employee_positions", name);
  }

  async createEmployeePosition(data: InsertEmployeePosition): Promise<EmployeePosition> {
    return this.createNamedRecord<EmployeePosition>("employee_positions", data);
  }

  async updateEmployeePosition(
    id: number,
    data: Partial<InsertEmployeePosition>
  ): Promise<EmployeePosition | undefined> {
    return this.updateNamedRecord<EmployeePosition>("employee_positions", id, data);
  }

  async deleteEmployeePosition(id: number): Promise<void> {
    const item = await this.getEmployeePosition(id);
    if (!item) return;
    const inUse = await db.collection("employee_master").findOne({
      empPosition: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(`Cannot delete position "${item.name}" — it is used by an employee`);
    }
    await this.deleteNamedRecord("employee_positions", id);
  }

  async getEmployeeGrades(): Promise<EmployeeGrade[]> {
    return this.listNamedRecords<EmployeeGrade>("employee_grades");
  }

  async getEmployeeGrade(id: number): Promise<EmployeeGrade | undefined> {
    return this.getNamedRecord<EmployeeGrade>("employee_grades", id);
  }

  async getEmployeeGradeByName(name: string): Promise<EmployeeGrade | undefined> {
    return this.getNamedRecordByName<EmployeeGrade>("employee_grades", name);
  }

  async createEmployeeGrade(data: InsertEmployeeGrade): Promise<EmployeeGrade> {
    return this.createNamedRecord<EmployeeGrade>("employee_grades", data);
  }

  async updateEmployeeGrade(id: number, data: Partial<InsertEmployeeGrade>): Promise<EmployeeGrade | undefined> {
    return this.updateNamedRecord<EmployeeGrade>("employee_grades", id, data);
  }

  async deleteEmployeeGrade(id: number): Promise<void> {
    const item = await this.getEmployeeGrade(id);
    if (!item) return;
    const inUse = await db.collection("employee_master").findOne({
      empGrade: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(`Cannot delete grade "${item.name}" — it is used by an employee`);
    }
    await this.deleteNamedRecord("employee_grades", id);
  }

  async getEmployeeTrades(): Promise<EmployeeTrade[]> {
    return this.listNamedRecords<EmployeeTrade>("employee_trades");
  }

  async getEmployeeTrade(id: number): Promise<EmployeeTrade | undefined> {
    return this.getNamedRecord<EmployeeTrade>("employee_trades", id);
  }

  async getEmployeeTradeByName(name: string): Promise<EmployeeTrade | undefined> {
    return this.getNamedRecordByName<EmployeeTrade>("employee_trades", name);
  }

  async createEmployeeTrade(data: InsertEmployeeTrade): Promise<EmployeeTrade> {
    return this.createNamedRecord<EmployeeTrade>("employee_trades", data);
  }

  async updateEmployeeTrade(id: number, data: Partial<InsertEmployeeTrade>): Promise<EmployeeTrade | undefined> {
    return this.updateNamedRecord<EmployeeTrade>("employee_trades", id, data);
  }

  async deleteEmployeeTrade(id: number): Promise<void> {
    const item = await this.getEmployeeTrade(id);
    if (!item) return;
    const inUse = await db.collection("employee_master").findOne({
      empTrade: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (inUse) {
      throw new Error(`Cannot delete trade "${item.name}" — it is used by an employee`);
    }
    await this.deleteNamedRecord("employee_trades", id);
  }

  async validateEmployeeMasterRefs(data: {
    empNationality?: string;
    empPosition?: string;
    empTitle?: string;
    empTrade?: string;
    empGrade?: string;
  }): Promise<void> {
    if (data.empNationality) {
      const nat = await this.getNationalityByName(data.empNationality);
      if (!nat) throw new Error(`Nationality "${data.empNationality}" is not in the nationality master`);
    }
    if (data.empPosition) {
      const pos = await this.getEmployeePositionByName(data.empPosition);
      if (!pos) throw new Error(`Position "${data.empPosition}" is not in the position master`);
    }
    if (data.empTitle) {
      const title = await this.getEmployeeTitleByName(data.empTitle);
      if (!title) throw new Error(`Title "${data.empTitle}" is not in the title master`);
    }
    if (data.empTrade) {
      const trade = await this.getEmployeeTradeByName(data.empTrade);
      if (!trade) throw new Error(`Trade "${data.empTrade}" is not in the trade master`);
    }
    if (data.empGrade) {
      const grade = await this.getEmployeeGradeByName(data.empGrade);
      if (!grade) throw new Error(`Grade "${data.empGrade}" is not in the grade master`);
    }
  }

  async getEmployeeMasters(): Promise<EmployeeMaster[]> {
    return (await db
      .collection("employee_master")
      .find()
      .sort({ employeeNumber: 1 })
      .toArray()) as EmployeeMaster[];
  }

  async getEmployeeMaster(id: number): Promise<EmployeeMaster | undefined> {
    return (await db.collection("employee_master").findOne({ id })) as EmployeeMaster | undefined;
  }

  async getEmployeeMasterByNumber(employeeNumber: string): Promise<EmployeeMaster | undefined> {
    const trimmed = employeeNumber.trim();
    if (!trimmed) return undefined;
    const all = await this.getEmployeeMasters();
    return all.find((e) => e.employeeNumber.toLowerCase() === trimmed.toLowerCase());
  }

  async getEmployeeMasterByNationalId(empNationalId: string): Promise<EmployeeMaster | undefined> {
    const trimmed = empNationalId.trim();
    if (!trimmed) return undefined;
    const all = await this.getEmployeeMasters();
    return all.find((e) => e.empNationalId.toLowerCase() === trimmed.toLowerCase());
  }

  async createEmployeeMaster(data: InsertEmployeeMaster): Promise<EmployeeMaster> {
    const byNumber = await this.getEmployeeMasterByNumber(data.employeeNumber);
    if (byNumber) {
      throw new Error(`Employee number "${data.employeeNumber}" already exists`);
    }
    const byNationalId = await this.getEmployeeMasterByNationalId(data.empNationalId);
    if (byNationalId) {
      throw new Error(`National ID "${data.empNationalId}" already exists`);
    }
    await this.validateEmployeeMasterRefs(data);
    const id = await this.getNextId("employee_master");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("employee_master").insertOne(item);
    return item as EmployeeMaster;
  }

  async updateEmployeeMaster(
    id: number,
    data: Partial<InsertEmployeeMaster>
  ): Promise<EmployeeMaster | undefined> {
    const existing = await this.getEmployeeMaster(id);
    if (!existing) return undefined;
    if (data.employeeNumber) {
      const dup = await this.getEmployeeMasterByNumber(data.employeeNumber);
      if (dup && dup.id !== id) {
        throw new Error(`Employee number "${data.employeeNumber}" already exists`);
      }
    }
    if (data.empNationalId) {
      const dup = await this.getEmployeeMasterByNationalId(data.empNationalId);
      if (dup && dup.id !== id) {
        throw new Error(`National ID "${data.empNationalId}" already exists`);
      }
    }
    const merged = { ...existing, ...data };
    await this.validateEmployeeMasterRefs(merged);
    await db.collection("employee_master").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getEmployeeMaster(id);
  }

  async deleteEmployeeMaster(id: number): Promise<void> {
    const mapping = await db.collection("employee_resource_mappings").findOne({ employeeId: id });
    if (mapping) {
      throw new Error("Cannot delete employee — remove the resource mapping first");
    }
    await db.collection("employee_master").deleteOne({ id });
  }

  async bulkCreateEmployeeMasters(
    employees: InsertEmployeeMaster[]
  ): Promise<EmployeeMaster[]> {
    const created: EmployeeMaster[] = [];
    for (const row of employees) {
      created.push(await this.createEmployeeMaster(row));
    }
    return created;
  }

  async getEmployeeResourceMapping(employeeId: number): Promise<EmployeeResourceMapping | undefined> {
    return (await db
      .collection("employee_resource_mappings")
      .findOne({ employeeId })) as EmployeeResourceMapping | undefined;
  }

  async upsertEmployeeResourceMapping(
    employeeId: number,
    resourceId: number
  ): Promise<EmployeeResourceMapping> {
    const employee = await this.getEmployeeMaster(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }
    if (resource.type !== "manpower") {
      throw new Error("Resource must be of type 'manpower'");
    }

    const existing = await this.getEmployeeResourceMapping(employeeId);
    if (existing) {
      await db.collection("employee_resource_mappings").updateOne(
        { employeeId },
        { $set: { resourceId, updatedAt: new Date() } }
      );
      return (await this.getEmployeeResourceMapping(employeeId)) as EmployeeResourceMapping;
    }

    const id = await this.getNextId("employee_resource_mappings");
    const mapping = {
      id,
      employeeId,
      resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("employee_resource_mappings").insertOne(mapping);
    return mapping as EmployeeResourceMapping;
  }

  async deleteEmployeeResourceMapping(employeeId: number): Promise<EmployeeResourceMapping | undefined> {
    const existing = await this.getEmployeeResourceMapping(employeeId);
    if (!existing) return undefined;
    await db.collection("employee_resource_mappings").deleteOne({ employeeId });
    return existing;
  }

  async getRentalManpowerList(): Promise<RentalManpower[]> {
    const docs = await db.collection("rental_manpower").find().sort({ employeeNumber: 1 }).toArray();
    const result: RentalManpower[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("rental_manpower", doc as Record<string, unknown>);
      result.push({ ...(doc as RentalManpower), id });
    }
    return result;
  }

  async getRentalManpower(id: number): Promise<RentalManpower | undefined> {
    return (await db.collection("rental_manpower").findOne({ id })) as RentalManpower | undefined;
  }

  async getRentalManpowerByNumber(employeeNumber: string): Promise<RentalManpower | undefined> {
    const trimmed = employeeNumber.trim();
    if (!trimmed) return undefined;
    const all = await this.getRentalManpowerList();
    return all.find((e) => e.employeeNumber.toLowerCase() === trimmed.toLowerCase());
  }

  async getRentalManpowerByNationalId(empNationalId: string): Promise<RentalManpower | undefined> {
    const trimmed = empNationalId.trim();
    if (!trimmed) return undefined;
    const all = await this.getRentalManpowerList();
    return all.find((e) => e.empNationalId.toLowerCase() === trimmed.toLowerCase());
  }

  async validateRentalManpowerRefs(data: {
    empNationality?: string;
    empPosition?: string;
    empTitle?: string;
    empTrade?: string;
    empGrade?: string;
    vendorId?: number;
  }): Promise<void> {
    await this.validateEmployeeMasterRefs(data);
    if (data.vendorId != null) {
      const vendor = await this.getVendorMaster(data.vendorId);
      if (!vendor) throw new Error(`Vendor ID ${data.vendorId} is not in the vendor master`);
    }
  }

  async createRentalManpower(data: InsertRentalManpower): Promise<RentalManpower> {
    const byNumber = await this.getRentalManpowerByNumber(data.employeeNumber);
    if (byNumber) {
      throw new Error(`Employee number "${data.employeeNumber}" already exists`);
    }
    const byNationalId = await this.getRentalManpowerByNationalId(data.empNationalId);
    if (byNationalId) {
      throw new Error(`National ID "${data.empNationalId}" already exists`);
    }
    await this.validateRentalManpowerRefs(data);
    const id = await this.getNextId("rental_manpower");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("rental_manpower").insertOne(item);
    return item as RentalManpower;
  }

  async updateRentalManpower(
    id: number,
    data: Partial<InsertRentalManpower>
  ): Promise<RentalManpower | undefined> {
    const existing = await this.getRentalManpower(id);
    if (!existing) return undefined;
    if (data.employeeNumber) {
      const dup = await this.getRentalManpowerByNumber(data.employeeNumber);
      if (dup && dup.id !== id) {
        throw new Error(`Employee number "${data.employeeNumber}" already exists`);
      }
    }
    if (data.empNationalId) {
      const dup = await this.getRentalManpowerByNationalId(data.empNationalId);
      if (dup && dup.id !== id) {
        throw new Error(`National ID "${data.empNationalId}" already exists`);
      }
    }
    const merged = { ...existing, ...data };
    await this.validateRentalManpowerRefs(merged);
    await db.collection("rental_manpower").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getRentalManpower(id);
  }

  async deleteRentalManpower(id: number): Promise<void> {
    const mapping = await db.collection("rental_manpower_resource_mappings").findOne({ rentalManpowerId: id });
    if (mapping) {
      throw new Error("Cannot delete rental manpower — remove the resource mapping first");
    }
    await db.collection("rental_manpower").deleteOne({ id });
  }

  async bulkCreateRentalManpower(employees: InsertRentalManpower[]): Promise<RentalManpower[]> {
    const created: RentalManpower[] = [];
    for (const row of employees) {
      created.push(await this.createRentalManpower(row));
    }
    return created;
  }

  async getRentalManpowerResourceMapping(
    rentalManpowerId: number
  ): Promise<RentalManpowerResourceMapping | undefined> {
    return (await db
      .collection("rental_manpower_resource_mappings")
      .findOne({ rentalManpowerId })) as RentalManpowerResourceMapping | undefined;
  }

  async upsertRentalManpowerResourceMapping(
    rentalManpowerId: number,
    resourceId: number
  ): Promise<RentalManpowerResourceMapping> {
    const rental = await this.getRentalManpower(rentalManpowerId);
    if (!rental) {
      throw new Error("Rental manpower record not found");
    }
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }
    if (resource.type !== "rental_manpower") {
      throw new Error("Resource must be of type 'rental_manpower'");
    }

    const existing = await this.getRentalManpowerResourceMapping(rentalManpowerId);
    if (existing) {
      await db.collection("rental_manpower_resource_mappings").updateOne(
        { rentalManpowerId },
        { $set: { resourceId, updatedAt: new Date() } }
      );
      return (await this.getRentalManpowerResourceMapping(rentalManpowerId)) as RentalManpowerResourceMapping;
    }

    const id = await this.getNextId("rental_manpower_resource_mappings");
    const mapping = {
      id,
      rentalManpowerId,
      resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("rental_manpower_resource_mappings").insertOne(mapping);
    return mapping as RentalManpowerResourceMapping;
  }

  async deleteRentalManpowerResourceMapping(
    rentalManpowerId: number
  ): Promise<RentalManpowerResourceMapping | undefined> {
    const existing = await this.getRentalManpowerResourceMapping(rentalManpowerId);
    if (!existing) return undefined;
    await db.collection("rental_manpower_resource_mappings").deleteOne({ rentalManpowerId });
    return existing;
  }

  async getEquipmentManufacturers(): Promise<EquipmentManufacturer[]> {
    return this.listNamedRecords<EquipmentManufacturer>("equipment_manufacturers");
  }

  async getEquipmentManufacturer(id: number): Promise<EquipmentManufacturer | undefined> {
    return this.getNamedRecord<EquipmentManufacturer>("equipment_manufacturers", id);
  }

  async getEquipmentManufacturerByName(name: string): Promise<EquipmentManufacturer | undefined> {
    return this.getNamedRecordByName<EquipmentManufacturer>("equipment_manufacturers", name);
  }

  async createEquipmentManufacturer(data: InsertEquipmentManufacturer): Promise<EquipmentManufacturer> {
    return this.createNamedRecord<EquipmentManufacturer>("equipment_manufacturers", data);
  }

  async updateEquipmentManufacturer(
    id: number,
    data: Partial<InsertEquipmentManufacturer>
  ): Promise<EquipmentManufacturer | undefined> {
    return this.updateNamedRecord<EquipmentManufacturer>("equipment_manufacturers", id, data);
  }

  async deleteEquipmentManufacturer(id: number): Promise<void> {
    const item = await this.getEquipmentManufacturer(id);
    if (!item) return;
    const namePattern = new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const inUse =
      (await db.collection("equipment_master").findOne({ manufacturer: namePattern })) ||
      (await db.collection("rental_equipment").findOne({ manufacturer: namePattern }));
    if (inUse) {
      throw new Error(`Cannot delete manufacturer "${item.name}" — it is used by equipment`);
    }
    await this.deleteNamedRecord("equipment_manufacturers", id);
  }

  async getEquipmentTypes(): Promise<EquipmentType[]> {
    return this.listNamedRecords<EquipmentType>("equipment_types");
  }

  async getEquipmentType(id: number): Promise<EquipmentType | undefined> {
    return this.getNamedRecord<EquipmentType>("equipment_types", id);
  }

  async getEquipmentTypeByName(name: string): Promise<EquipmentType | undefined> {
    return this.getNamedRecordByName<EquipmentType>("equipment_types", name);
  }

  async createEquipmentType(data: InsertEquipmentType): Promise<EquipmentType> {
    return this.createNamedRecord<EquipmentType>("equipment_types", data);
  }

  async updateEquipmentType(
    id: number,
    data: Partial<InsertEquipmentType>
  ): Promise<EquipmentType | undefined> {
    return this.updateNamedRecord<EquipmentType>("equipment_types", id, data);
  }

  async deleteEquipmentType(id: number): Promise<void> {
    const item = await this.getEquipmentType(id);
    if (!item) return;
    const namePattern = new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const inUse =
      (await db.collection("equipment_master").findOne({ equipmentType: namePattern })) ||
      (await db.collection("rental_equipment").findOne({ equipmentType: namePattern }));
    if (inUse) {
      throw new Error(`Cannot delete equipment type "${item.name}" — it is used by equipment`);
    }
    await this.deleteNamedRecord("equipment_types", id);
  }

  async validateEquipmentMasterRefs(data: {
    equipmentType?: string;
    manufacturer?: string | null;
  }): Promise<void> {
    if (data.equipmentType) {
      const eqType = await this.getEquipmentTypeByName(data.equipmentType);
      if (!eqType) {
        throw new Error(`Equipment type "${data.equipmentType}" is not in the equipment type master`);
      }
    }
    if (data.manufacturer) {
      const mfr = await this.getEquipmentManufacturerByName(data.manufacturer);
      if (!mfr) {
        throw new Error(`Manufacturer "${data.manufacturer}" is not in the manufacturer master`);
      }
    }
  }

  async getEquipmentMasters(): Promise<EquipmentMaster[]> {
    const docs = await db.collection("equipment_master").find().sort({ equipmentNumber: 1 }).toArray();
    const result: EquipmentMaster[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("equipment_master", doc as Record<string, unknown>);
      result.push({ ...(doc as EquipmentMaster), id });
    }
    return result;
  }

  async getEquipmentMaster(id: number): Promise<EquipmentMaster | undefined> {
    return (await db.collection("equipment_master").findOne({ id })) as EquipmentMaster | undefined;
  }

  async getEquipmentMasterByNumber(equipmentNumber: string): Promise<EquipmentMaster | undefined> {
    const trimmed = equipmentNumber.trim();
    if (!trimmed) return undefined;
    const all = await this.getEquipmentMasters();
    return all.find((e) => e.equipmentNumber.toLowerCase() === trimmed.toLowerCase());
  }

  async createEquipmentMaster(data: InsertEquipmentMaster): Promise<EquipmentMaster> {
    const dup = await this.getEquipmentMasterByNumber(data.equipmentNumber);
    if (dup) {
      throw new Error(`Equipment number "${data.equipmentNumber}" already exists`);
    }
    await this.validateEquipmentMasterRefs(data);
    const id = await this.getNextId("equipment_master");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("equipment_master").insertOne(item);
    return item as EquipmentMaster;
  }

  async updateEquipmentMaster(
    id: number,
    data: Partial<InsertEquipmentMaster>
  ): Promise<EquipmentMaster | undefined> {
    const existing = await this.getEquipmentMaster(id);
    if (!existing) return undefined;
    if (data.equipmentNumber) {
      const dup = await this.getEquipmentMasterByNumber(data.equipmentNumber);
      if (dup && dup.id !== id) {
        throw new Error(`Equipment number "${data.equipmentNumber}" already exists`);
      }
    }
    const merged = { ...existing, ...data };
    await this.validateEquipmentMasterRefs(merged);
    await db.collection("equipment_master").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getEquipmentMaster(id);
  }

  async deleteEquipmentMaster(id: number): Promise<void> {
    const mapping = await db.collection("equipment_resource_mappings").findOne({ equipmentId: id });
    if (mapping) {
      throw new Error("Cannot delete equipment — remove the resource mapping first");
    }
    await db.collection("equipment_master").deleteOne({ id });
  }

  async bulkCreateEquipmentMasters(rows: InsertEquipmentMaster[]): Promise<EquipmentMaster[]> {
    const created: EquipmentMaster[] = [];
    for (const row of rows) {
      created.push(await this.createEquipmentMaster(row));
    }
    return created;
  }

  async getEquipmentResourceMapping(equipmentId: number): Promise<EquipmentResourceMapping | undefined> {
    return (await db
      .collection("equipment_resource_mappings")
      .findOne({ equipmentId })) as EquipmentResourceMapping | undefined;
  }

  async upsertEquipmentResourceMapping(
    equipmentId: number,
    resourceId: number
  ): Promise<EquipmentResourceMapping> {
    const equipment = await this.getEquipmentMaster(equipmentId);
    if (!equipment) {
      throw new Error("Equipment not found");
    }
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }
    if (resource.type !== "equipment") {
      throw new Error("Resource must be of type 'equipment'");
    }

    const existing = await this.getEquipmentResourceMapping(equipmentId);
    if (existing) {
      await db.collection("equipment_resource_mappings").updateOne(
        { equipmentId },
        { $set: { resourceId, updatedAt: new Date() } }
      );
      return (await this.getEquipmentResourceMapping(equipmentId)) as EquipmentResourceMapping;
    }

    const id = await this.getNextId("equipment_resource_mappings");
    const mapping = {
      id,
      equipmentId,
      resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("equipment_resource_mappings").insertOne(mapping);
    return mapping as EquipmentResourceMapping;
  }

  async deleteEquipmentResourceMapping(
    equipmentId: number
  ): Promise<EquipmentResourceMapping | undefined> {
    const existing = await this.getEquipmentResourceMapping(equipmentId);
    if (!existing) return undefined;
    await db.collection("equipment_resource_mappings").deleteOne({ equipmentId });
    return existing;
  }

  async getRentalEquipmentList(): Promise<RentalEquipment[]> {
    const docs = await db.collection("rental_equipment").find().sort({ equipmentNumber: 1 }).toArray();
    const result: RentalEquipment[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("rental_equipment", doc as Record<string, unknown>);
      result.push({ ...(doc as RentalEquipment), id });
    }
    return result;
  }

  async getRentalEquipment(id: number): Promise<RentalEquipment | undefined> {
    return (await db.collection("rental_equipment").findOne({ id })) as RentalEquipment | undefined;
  }

  async getRentalEquipmentByNumber(equipmentNumber: string): Promise<RentalEquipment | undefined> {
    const trimmed = equipmentNumber.trim();
    if (!trimmed) return undefined;
    const all = await this.getRentalEquipmentList();
    return all.find((e) => e.equipmentNumber.toLowerCase() === trimmed.toLowerCase());
  }

  async validateRentalEquipmentRefs(data: {
    equipmentType?: string;
    manufacturer?: string | null;
    vendorId?: number;
  }): Promise<void> {
    await this.validateEquipmentMasterRefs(data);
    if (data.vendorId != null) {
      const vendor = await this.getVendorMaster(data.vendorId);
      if (!vendor) throw new Error(`Vendor ID ${data.vendorId} is not in the vendor master`);
    }
  }

  async createRentalEquipment(data: InsertRentalEquipment): Promise<RentalEquipment> {
    const dup = await this.getRentalEquipmentByNumber(data.equipmentNumber);
    if (dup) {
      throw new Error(`Equipment number "${data.equipmentNumber}" already exists`);
    }
    await this.validateRentalEquipmentRefs(data);
    const id = await this.getNextId("rental_equipment");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("rental_equipment").insertOne(item);
    return item as RentalEquipment;
  }

  async updateRentalEquipment(
    id: number,
    data: Partial<InsertRentalEquipment>
  ): Promise<RentalEquipment | undefined> {
    const existing = await this.getRentalEquipment(id);
    if (!existing) return undefined;
    if (data.equipmentNumber) {
      const dup = await this.getRentalEquipmentByNumber(data.equipmentNumber);
      if (dup && dup.id !== id) {
        throw new Error(`Equipment number "${data.equipmentNumber}" already exists`);
      }
    }
    const merged = { ...existing, ...data };
    await this.validateRentalEquipmentRefs(merged);
    await db.collection("rental_equipment").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getRentalEquipment(id);
  }

  async deleteRentalEquipment(id: number): Promise<void> {
    const mapping = await db.collection("rental_equipment_resource_mappings").findOne({ rentalEquipmentId: id });
    if (mapping) {
      throw new Error("Cannot delete rental equipment — remove the resource mapping first");
    }
    await db.collection("rental_equipment").deleteOne({ id });
  }

  async bulkCreateRentalEquipment(rows: InsertRentalEquipment[]): Promise<RentalEquipment[]> {
    const created: RentalEquipment[] = [];
    for (const row of rows) {
      created.push(await this.createRentalEquipment(row));
    }
    return created;
  }

  async getRentalEquipmentResourceMapping(
    rentalEquipmentId: number
  ): Promise<RentalEquipmentResourceMapping | undefined> {
    return (await db
      .collection("rental_equipment_resource_mappings")
      .findOne({ rentalEquipmentId })) as RentalEquipmentResourceMapping | undefined;
  }

  async upsertRentalEquipmentResourceMapping(
    rentalEquipmentId: number,
    resourceId: number
  ): Promise<RentalEquipmentResourceMapping> {
    const rental = await this.getRentalEquipment(rentalEquipmentId);
    if (!rental) {
      throw new Error("Rental equipment not found");
    }
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }
    if (resource.type !== "rental_equipment") {
      throw new Error("Resource must be of type 'rental_equipment'");
    }

    const existing = await this.getRentalEquipmentResourceMapping(rentalEquipmentId);
    if (existing) {
      await db.collection("rental_equipment_resource_mappings").updateOne(
        { rentalEquipmentId },
        { $set: { resourceId, updatedAt: new Date() } }
      );
      return (await this.getRentalEquipmentResourceMapping(rentalEquipmentId)) as RentalEquipmentResourceMapping;
    }

    const id = await this.getNextId("rental_equipment_resource_mappings");
    const mapping = {
      id,
      rentalEquipmentId,
      resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("rental_equipment_resource_mappings").insertOne(mapping);
    return mapping as RentalEquipmentResourceMapping;
  }

  async deleteRentalEquipmentResourceMapping(
    rentalEquipmentId: number
  ): Promise<RentalEquipmentResourceMapping | undefined> {
    const existing = await this.getRentalEquipmentResourceMapping(rentalEquipmentId);
    if (!existing) return undefined;
    await db.collection("rental_equipment_resource_mappings").deleteOne({ rentalEquipmentId });
    return existing;
  }

  async getToolManufacturers(): Promise<ToolManufacturer[]> {
    return this.listNamedRecords<ToolManufacturer>("tool_manufacturers");
  }

  async getToolManufacturer(id: number): Promise<ToolManufacturer | undefined> {
    return this.getNamedRecord<ToolManufacturer>("tool_manufacturers", id);
  }

  async getToolManufacturerByName(name: string): Promise<ToolManufacturer | undefined> {
    return this.getNamedRecordByName<ToolManufacturer>("tool_manufacturers", name);
  }

  async createToolManufacturer(data: InsertToolManufacturer): Promise<ToolManufacturer> {
    return this.createNamedRecord<ToolManufacturer>("tool_manufacturers", data);
  }

  async updateToolManufacturer(
    id: number,
    data: Partial<InsertToolManufacturer>
  ): Promise<ToolManufacturer | undefined> {
    return this.updateNamedRecord<ToolManufacturer>("tool_manufacturers", id, data);
  }

  async deleteToolManufacturer(id: number): Promise<void> {
    const item = await this.getToolManufacturer(id);
    if (!item) return;
    const namePattern = new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const inUse =
      (await db.collection("tool_master").findOne({ brand: namePattern })) ||
      (await db.collection("tool_models").findOne({ manufacturer: namePattern }));
    if (inUse) {
      throw new Error(`Cannot delete manufacturer "${item.name}" — it is used by tools or models`);
    }
    await this.deleteNamedRecord("tool_manufacturers", id);
  }

  async getToolTypes(): Promise<ToolType[]> {
    return this.listNamedRecords<ToolType>("tool_types");
  }

  async getToolType(id: number): Promise<ToolType | undefined> {
    return this.getNamedRecord<ToolType>("tool_types", id);
  }

  async getToolTypeByName(name: string): Promise<ToolType | undefined> {
    return this.getNamedRecordByName<ToolType>("tool_types", name);
  }

  async createToolType(data: InsertToolType): Promise<ToolType> {
    return this.createNamedRecord<ToolType>("tool_types", data);
  }

  async updateToolType(id: number, data: Partial<InsertToolType>): Promise<ToolType | undefined> {
    return this.updateNamedRecord<ToolType>("tool_types", id, data);
  }

  async deleteToolType(id: number): Promise<void> {
    const item = await this.getToolType(id);
    if (!item) return;
    const namePattern = new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const inUse = await db.collection("tool_master").findOne({ toolType: namePattern });
    if (inUse) {
      throw new Error(`Cannot delete tool type "${item.name}" — it is used by a tool`);
    }
    await this.deleteNamedRecord("tool_types", id);
  }

  async getToolModels(): Promise<ToolModel[]> {
    const docs = await db.collection("tool_models").find().sort({ manufacturer: 1, name: 1 }).toArray();
    const result: ToolModel[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("tool_models", doc as Record<string, unknown>);
      result.push({ ...(doc as ToolModel), id });
    }
    return result;
  }

  async getToolModel(id: number): Promise<ToolModel | undefined> {
    return (await db.collection("tool_models").findOne({ id })) as ToolModel | undefined;
  }

  async getToolModelByNameAndManufacturer(
    name: string,
    manufacturer: string
  ): Promise<ToolModel | undefined> {
    const trimmedName = name.trim();
    const trimmedMfr = manufacturer.trim();
    if (!trimmedName || !trimmedMfr) return undefined;
    const all = await this.getToolModels();
    return all.find(
      (m) =>
        m.name.toLowerCase() === trimmedName.toLowerCase() &&
        m.manufacturer.toLowerCase() === trimmedMfr.toLowerCase()
    );
  }

  async createToolModel(data: InsertToolModel): Promise<ToolModel> {
    const mfr = await this.getToolManufacturerByName(data.manufacturer);
    if (!mfr) {
      throw new Error(`Manufacturer "${data.manufacturer}" is not in the tool manufacturer master`);
    }
    const existing = await this.getToolModelByNameAndManufacturer(data.name, data.manufacturer);
    if (existing) {
      throw new Error(`Model "${data.name}" already exists for manufacturer "${data.manufacturer}"`);
    }
    const id = await this.getNextId("tool_models");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("tool_models").insertOne(item);
    return item as ToolModel;
  }

  async updateToolModel(
    id: number,
    data: Partial<InsertToolModel>
  ): Promise<ToolModel | undefined> {
    const existing = await this.getToolModel(id);
    if (!existing) return undefined;
    const manufacturer = data.manufacturer ?? existing.manufacturer;
    const name = data.name ?? existing.name;
    if (data.manufacturer) {
      const mfr = await this.getToolManufacturerByName(data.manufacturer);
      if (!mfr) {
        throw new Error(`Manufacturer "${data.manufacturer}" is not in the tool manufacturer master`);
      }
    }
    if (data.name || data.manufacturer) {
      const dup = await this.getToolModelByNameAndManufacturer(name, manufacturer);
      if (dup && dup.id !== id) {
        throw new Error(`Model "${name}" already exists for manufacturer "${manufacturer}"`);
      }
    }
    await db.collection("tool_models").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getToolModel(id);
  }

  async deleteToolModel(id: number): Promise<void> {
    const item = await this.getToolModel(id);
    if (!item) return;
    const namePattern = new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const mfrPattern = new RegExp(`^${item.manufacturer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const inUse = await db.collection("tool_master").findOne({ model: namePattern, brand: mfrPattern });
    if (inUse) {
      throw new Error(`Cannot delete model "${item.name}" — it is used by a tool`);
    }
    await db.collection("tool_models").deleteOne({ id });
  }

  async validateToolMasterRefs(data: {
    toolType?: string;
    brand?: string | null;
    model?: string | null;
  }): Promise<void> {
    if (data.toolType) {
      const toolType = await this.getToolTypeByName(data.toolType);
      if (!toolType) {
        throw new Error(`Tool type "${data.toolType}" is not in the tool type master`);
      }
    }
    if (data.brand) {
      const mfr = await this.getToolManufacturerByName(data.brand);
      if (!mfr) {
        throw new Error(`Manufacturer "${data.brand}" is not in the tool manufacturer master`);
      }
    }
    if (data.model) {
      if (!data.brand) {
        throw new Error("Manufacturer (brand) is required when a model is specified");
      }
      const model = await this.getToolModelByNameAndManufacturer(data.model, data.brand);
      if (!model) {
        throw new Error(`Model "${data.model}" is not in the tool model master for manufacturer "${data.brand}"`);
      }
    }
  }

  async getToolMasters(): Promise<ToolMaster[]> {
    const docs = await db.collection("tool_master").find().sort({ toolNumber: 1 }).toArray();
    const result: ToolMaster[] = [];
    for (const doc of docs) {
      const id = await this.ensureNumericId("tool_master", doc as Record<string, unknown>);
      result.push({ ...(doc as ToolMaster), id, toolType: (doc as ToolMaster).toolType ?? "" });
    }
    return result;
  }

  async getToolMaster(id: number): Promise<ToolMaster | undefined> {
    return (await db.collection("tool_master").findOne({ id })) as ToolMaster | undefined;
  }

  async getToolMasterByNumber(toolNumber: string): Promise<ToolMaster | undefined> {
    const trimmed = toolNumber.trim();
    if (!trimmed) return undefined;
    const all = await this.getToolMasters();
    return all.find((t) => t.toolNumber.toLowerCase() === trimmed.toLowerCase());
  }

  async createToolMaster(data: InsertToolMaster): Promise<ToolMaster> {
    const dup = await this.getToolMasterByNumber(data.toolNumber);
    if (dup) {
      throw new Error(`Tool number "${data.toolNumber}" already exists`);
    }
    const normalized = { ...data, unitOfMeasure: "H" as const };
    await this.validateToolMasterRefs(normalized);
    const id = await this.getNextId("tool_master");
    const item = { ...normalized, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("tool_master").insertOne(item);
    return item as ToolMaster;
  }

  async updateToolMaster(id: number, data: Partial<InsertToolMaster>): Promise<ToolMaster | undefined> {
    const existing = await this.getToolMaster(id);
    if (!existing) return undefined;
    if (data.toolNumber) {
      const dup = await this.getToolMasterByNumber(data.toolNumber);
      if (dup && dup.id !== id) {
        throw new Error(`Tool number "${data.toolNumber}" already exists`);
      }
    }
    const merged = { ...existing, ...data, unitOfMeasure: "H" as const };
    await this.validateToolMasterRefs(merged);
    await db.collection("tool_master").updateOne(
      { id },
      { $set: { ...data, unitOfMeasure: "H", updatedAt: new Date() } }
    );
    return this.getToolMaster(id);
  }

  async deleteToolMaster(id: number): Promise<void> {
    const mapping = await db.collection("tool_resource_mappings").findOne({ toolId: id });
    if (mapping) {
      throw new Error("Cannot delete tool — remove the resource mapping first");
    }
    await db.collection("tool_master").deleteOne({ id });
  }

  async bulkCreateToolMasters(rows: InsertToolMaster[]): Promise<ToolMaster[]> {
    const created: ToolMaster[] = [];
    for (const row of rows) {
      created.push(await this.createToolMaster(row));
    }
    return created;
  }

  async getToolResourceMapping(toolId: number): Promise<ToolResourceMapping | undefined> {
    return (await db
      .collection("tool_resource_mappings")
      .findOne({ toolId })) as ToolResourceMapping | undefined;
  }

  async upsertToolResourceMapping(toolId: number, resourceId: number): Promise<ToolResourceMapping> {
    const tool = await this.getToolMaster(toolId);
    if (!tool) {
      throw new Error("Tool not found");
    }
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }
    if (resource.type !== "tools") {
      throw new Error("Resource must be of type 'tools'");
    }

    const existing = await this.getToolResourceMapping(toolId);
    if (existing) {
      await db.collection("tool_resource_mappings").updateOne(
        { toolId },
        { $set: { resourceId, updatedAt: new Date() } }
      );
      return (await this.getToolResourceMapping(toolId)) as ToolResourceMapping;
    }

    const id = await this.getNextId("tool_resource_mappings");
    const mapping = {
      id,
      toolId,
      resourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("tool_resource_mappings").insertOne(mapping);
    return mapping as ToolResourceMapping;
  }

  async deleteToolResourceMapping(toolId: number): Promise<ToolResourceMapping | undefined> {
    const existing = await this.getToolResourceMapping(toolId);
    if (!existing) return undefined;
    await db.collection("tool_resource_mappings").deleteOne({ toolId });
    return existing;
  }

  async getPurchaseRequisitions(requisitionType?: string): Promise<PurchaseRequisition[]> {
    const filter = requisitionType ? { requisitionType } : {};
    return (await db
      .collection("purchase_requisitions")
      .find(filter)
      .sort({ prDate: -1, id: -1 })
      .toArray()) as PurchaseRequisition[];
  }

  async getPurchaseRequisition(id: number): Promise<PurchaseRequisition | undefined> {
    return (await db.collection("purchase_requisitions").findOne({ id })) as PurchaseRequisition | undefined;
  }

  async getPurchaseRequisitionItems(prId: number): Promise<PurchaseRequisitionItem[]> {
    return (await db
      .collection("purchase_requisition_items")
      .find({ prId })
      .sort({ lineNumber: 1 })
      .toArray()) as PurchaseRequisitionItem[];
  }

  async getPurchaseRequisitionItemsByPrIds(prIds: number[]): Promise<PurchaseRequisitionItem[]> {
    if (prIds.length === 0) return [];
    return (await db
      .collection("purchase_requisition_items")
      .find({ prId: { $in: prIds } })
      .toArray()) as PurchaseRequisitionItem[];
  }

  async createPurchaseRequisitionItem(data: InsertPurchaseRequisitionItem): Promise<PurchaseRequisitionItem> {
    const id = await this.getNextId("purchase_requisition_items");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("purchase_requisition_items").insertOne(item);
    return item as PurchaseRequisitionItem;
  }

  async validatePurchaseRequisitionItems(
    requisitionType: string,
    items: Array<{ itemCode: string }>
  ): Promise<void> {
    for (const item of items) {
      const code = item.itemCode.trim();
      if (!code) {
        throw new Error("Each line item must have an item code");
      }
      if (requisitionType === "material") {
        const mat = await this.getMaterialMasterByCode(code);
        if (!mat) {
          throw new Error(`Material code "${code}" is not in the material master`);
        }
      } else if (requisitionType === "service") {
        const svc = await this.getServiceMasterByCode(code);
        if (!svc) {
          throw new Error(`Service code "${code}" is not in the service master`);
        }
      } else if (requisitionType === "rental_equipment") {
        const eq = await this.getRentalEquipmentByNumber(code);
        if (!eq) {
          throw new Error(`Equipment number "${code}" is not in the rental equipment master`);
        }
      } else if (requisitionType === "tools") {
        const tool = await this.getToolMasterByNumber(code);
        if (!tool) {
          throw new Error(`Tool number "${code}" is not in the tool master`);
        }
      }
    }
  }

  async createPurchaseRequisition(
    header: InsertPurchaseRequisition,
    items: Array<Omit<InsertPurchaseRequisitionItem, "prId">> = []
  ): Promise<PurchaseRequisition> {
    const dup = await db.collection("purchase_requisitions").findOne({
      prNumber: { $regex: new RegExp(`^${header.prNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      requisitionType: header.requisitionType,
    });
    if (dup) {
      throw new Error(`PR number "${header.prNumber}" already exists for ${header.requisitionType} requisitions`);
    }
    if (items.length > 0) {
      await this.validatePurchaseRequisitionItems(header.requisitionType, items);
    }

    const id = await this.getNextId("purchase_requisitions");
    const pr = { ...header, status: header.status ?? "open", id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("purchase_requisitions").insertOne(pr);

    for (let index = 0; index < items.length; index++) {
      const raw = items[index];
      await this.createPurchaseRequisitionItem({
        ...raw,
        prId: id,
        lineNumber: raw.lineNumber ?? index + 1,
        preferredVendorCodes: raw.preferredVendorCodes ?? [],
        status: raw.status ?? "open",
      });
    }

    return pr as PurchaseRequisition;
  }

  async updatePurchaseRequisition(
    id: number,
    header: Partial<InsertPurchaseRequisition>,
    items?: Array<Omit<InsertPurchaseRequisitionItem, "prId">>
  ): Promise<PurchaseRequisition | undefined> {
    const existing = await this.getPurchaseRequisition(id);
    if (!existing) return undefined;

    if (Object.keys(header).length > 0) {
      if (header.prNumber) {
        const dup = await db.collection("purchase_requisitions").findOne({
          prNumber: {
            $regex: new RegExp(`^${header.prNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          },
          requisitionType: existing.requisitionType,
          id: { $ne: id },
        });
        if (dup) {
          throw new Error(
            `PR number "${header.prNumber}" already exists for ${existing.requisitionType} requisitions`
          );
        }
      }
      await db.collection("purchase_requisitions").updateOne(
        { id },
        { $set: { ...header, updatedAt: new Date() } }
      );
    }

    if (items !== undefined) {
      const converted = await db
        .collection("purchase_requisition_items")
        .findOne({ prId: id, status: "converted" });
      if (converted) {
        throw new Error("Cannot replace items on a requisition with converted lines.");
      }
      if (items.length > 0) {
        await this.validatePurchaseRequisitionItems(existing.requisitionType, items);
      }
      await db.collection("purchase_requisition_items").deleteMany({ prId: id });
      for (let index = 0; index < items.length; index++) {
        const raw = items[index];
        await this.createPurchaseRequisitionItem({
          ...raw,
          prId: id,
          lineNumber: raw.lineNumber ?? index + 1,
          preferredVendorCodes: raw.preferredVendorCodes ?? [],
          status: raw.status ?? "open",
        });
      }
    }

    return this.getPurchaseRequisition(id);
  }

  async deletePurchaseRequisition(id: number): Promise<void> {
    const converted = await db
      .collection("purchase_requisition_items")
      .findOne({ prId: id, status: "converted" });
    if (converted) {
      throw new Error("Cannot delete a requisition with converted lines.");
    }
    await db.collection("purchase_requisition_items").deleteMany({ prId: id });
    await db.collection("purchase_requisitions").deleteOne({ id });
  }

  async searchPurchaseRequisitionsForPo(
    query: string,
    requisitionType: string
  ): Promise<Array<PurchaseRequisition & { items: PurchaseRequisitionItem[] }>> {
    const q = query.trim().toLowerCase();
    const prs = await this.getPurchaseRequisitions(requisitionType);
    if (prs.length === 0) return [];

    const prIds = prs.map((p) => p.id);
    const allItems = await this.getPurchaseRequisitionItemsByPrIds(prIds);
    const itemsByPr = new Map<number, PurchaseRequisitionItem[]>();
    for (const item of allItems) {
      const list = itemsByPr.get(item.prId) ?? [];
      list.push(item);
      itemsByPr.set(item.prId, list);
    }

    const results: Array<PurchaseRequisition & { items: PurchaseRequisitionItem[] }> = [];
    for (const pr of prs) {
      if (pr.status === "closed") continue;
      const items = (itemsByPr.get(pr.id) ?? []).filter((i) => i.status !== "converted");
      if (items.length === 0) continue;

      const matchesHeader =
        !q ||
        pr.prNumber.toLowerCase().includes(q) ||
        (pr.remarks ?? "").toLowerCase().includes(q) ||
        (pr.requestedBy ?? "").toLowerCase().includes(q);

      const matchingItems = items.filter(
        (i) =>
          !q ||
          i.itemCode.toLowerCase().includes(q) ||
          i.itemDescription.toLowerCase().includes(q) ||
          (i.longDescription ?? "").toLowerCase().includes(q)
      );

      if (matchesHeader || matchingItems.length > 0) {
        results.push({ ...pr, items: matchingItems.length > 0 ? matchingItems : items });
      }
    }
    return results;
  }

  async markPurchaseRequisitionItemsConverted(
    prItemIds: number[],
    poId: number
  ): Promise<void> {
    if (prItemIds.length === 0) return;
    await db.collection("purchase_requisition_items").updateMany(
      { id: { $in: prItemIds } },
      { $set: { status: "converted", convertedPoId: poId, updatedAt: new Date() } }
    );

    const items = await db
      .collection("purchase_requisition_items")
      .find({ id: { $in: prItemIds } })
      .toArray();
    const prIds = [...new Set(items.map((i) => i.prId))];
    for (const prId of prIds) {
      const openCount = await db
        .collection("purchase_requisition_items")
        .countDocuments({ prId, status: "open" });
      if (openCount === 0) {
        await db.collection("purchase_requisitions").updateOne(
          { id: prId },
          { $set: { status: "closed", updatedAt: new Date() } }
        );
      }
    }
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return (await db.collection("purchase_orders").find().sort({ poDate: -1, id: -1 }).toArray()) as PurchaseOrder[];
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    return (await db.collection("purchase_orders").findOne({ id })) as PurchaseOrder | undefined;
  }

  async getPurchaseOrderItems(poId: number): Promise<PurchaseOrderItem[]> {
    return (await db
      .collection("purchase_order_items")
      .find({ poId })
      .sort({ lineNumber: 1 })
      .toArray()) as PurchaseOrderItem[];
  }

  async getPurchaseOrderItemsByPoIds(poIds: number[]): Promise<PurchaseOrderItem[]> {
    if (poIds.length === 0) return [];
    return (await db
      .collection("purchase_order_items")
      .find({ poId: { $in: poIds } })
      .toArray()) as PurchaseOrderItem[];
  }

  async createPurchaseOrderItem(data: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const id = await this.getNextId("purchase_order_items");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("purchase_order_items").insertOne(item);
    return item as PurchaseOrderItem;
  }

  async createPurchaseOrder(
    header: InsertPurchaseOrder,
    items: Array<Omit<InsertPurchaseOrderItem, "poId">> = []
  ): Promise<PurchaseOrder> {
    const id = await this.getNextId("purchase_orders");
    const order = { ...header, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("purchase_orders").insertOne(order);

    for (let index = 0; index < items.length; index++) {
      const raw = items[index];
      await this.createPurchaseOrderItem({
        ...raw,
        poId: id,
        lineNumber: raw.lineNumber ?? index + 1,
      });
    }

    return order as PurchaseOrder;
  }

  async updatePurchaseOrder(
    id: number,
    header: Partial<InsertPurchaseOrder>,
    items?: Array<Omit<InsertPurchaseOrderItem, "poId">>
  ): Promise<PurchaseOrder | undefined> {
    const existing = await this.getPurchaseOrder(id);
    if (!existing) return undefined;

    if (Object.keys(header).length > 0) {
      await db.collection("purchase_orders").updateOne(
        { id },
        { $set: { ...header, updatedAt: new Date() } }
      );
    }

    if (items !== undefined) {
      await db.collection("purchase_order_items").deleteMany({ poId: id });
      for (let index = 0; index < items.length; index++) {
        const raw = items[index];
        await this.createPurchaseOrderItem({
          ...raw,
          poId: id,
          lineNumber: raw.lineNumber ?? index + 1,
        });
      }
    }

    return this.getPurchaseOrder(id);
  }

  async bulkCreatePurchaseOrderItems(
    poId: number,
    items: Array<Omit<InsertPurchaseOrderItem, "poId">>
  ): Promise<PurchaseOrderItem[]> {
    const existingItems = await this.getPurchaseOrderItems(poId);
    const usedLineNumbers = new Set(existingItems.map((i) => Number(i.lineNumber)));
    let nextLineNumber = existingItems.length + 1;

    const created: PurchaseOrderItem[] = [];
    for (const raw of items) {
      let lineNumber = raw.lineNumber ? Number(raw.lineNumber) : nextLineNumber;
      while (usedLineNumbers.has(lineNumber)) {
        lineNumber += 1;
      }
      usedLineNumbers.add(lineNumber);
      nextLineNumber = lineNumber + 1;

      created.push(
        await this.createPurchaseOrderItem({
          ...raw,
          poId,
          lineNumber,
        })
      );
    }
    return created;
  }

  async getPurchaseOrderAttachments(poId: number): Promise<PurchaseOrderAttachment[]> {
    return (await db
      .collection("purchase_order_attachments")
      .find({ poId })
      .sort({ createdAt: -1 })
      .toArray()) as PurchaseOrderAttachment[];
  }

  async createPurchaseOrderAttachment(data: InsertPurchaseOrderAttachment): Promise<PurchaseOrderAttachment> {
    const id = await this.getNextId("purchase_order_attachments");
    const doc = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("purchase_order_attachments").insertOne(doc);
    return doc as PurchaseOrderAttachment;
  }

  async deletePurchaseOrderAttachment(id: number): Promise<void> {
    await db.collection("purchase_order_attachments").deleteOne({ id });
  }

  async getResources(projectId?: number): Promise<Resource[]> {
    const filter = projectId
      ? { projectId }
      : { $or: [{ projectId: { $exists: false } }, { projectId: null }] };
    return await db.collection("resources").find(filter).toArray() as any;
  }

  async getResourcesByType(type: Resource["type"]): Promise<Resource[]> {
    return await db
      .collection("resources")
      .find({
        type,
        $or: [{ projectId: { $exists: false } }, { projectId: null }],
      })
      .toArray() as any;
  }

  async getResource(id: number): Promise<Resource | undefined> {
    return await db.collection("resources").findOne({ id }) as any;
  }

  async createResource(data: InsertResource): Promise<Resource> {
    const normalized = normalizeHourlyResourceUom(data);
    const id = await this.getNextId("resources");
    const item = { ...normalized, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("resources").insertOne(item);
    return item as any;
  }

  async updateResource(id: number, data: Partial<InsertResource>): Promise<Resource | undefined> {
    const existing = await this.getResource(id);
    const normalized = normalizeHourlyResourceUom(data, existing?.type);
    await db.collection("resources").updateOne({ id }, { $set: { ...normalized, updatedAt: new Date() } });
    return this.getResource(id);
  }

  async deleteResource(id: number): Promise<void> {
    await db.collection("resources").deleteOne({ id });
  }

  async getTaskResources(projectId?: number): Promise<TaskResource[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("task_resources").find(filter).toArray() as any;
  }

  async getTaskResource(id: number): Promise<TaskResource | undefined> {
    return await db.collection("task_resources").findOne({ id }) as any;
  }

  async createTaskResource(data: InsertTaskResource): Promise<TaskResource> {
    const id = await this.getNextId("task_resources");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("task_resources").insertOne(item);
    return item as any;
  }

  async updateTaskResource(id: number, data: Partial<InsertTaskResource>): Promise<TaskResource | undefined> {
    await db.collection("task_resources").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getTaskResource(id);
  }

  async deleteTaskResource(id: number): Promise<void> {
    await db.collection("task_resources").deleteOne({ id });
  }

  async getProjectActivities(projectId?: number): Promise<ProjectActivity[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("project_activities").find(filter).toArray() as any;
  }

  async getProjectActivity(id: number): Promise<ProjectActivity | undefined> {
    return await db.collection("project_activities").findOne({ id }) as any;
  }

  async createProjectActivity(data: InsertProjectActivity): Promise<ProjectActivity> {
    const id = await this.getNextId("project_activities");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("project_activities").insertOne(item);
    return item as any;
  }

  async updateProjectActivity(id: number, data: Partial<InsertProjectActivity>): Promise<ProjectActivity | undefined> {
    await db.collection("project_activities").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getProjectActivity(id);
  }

  async deleteProjectActivity(id: number): Promise<void> {
    await db.collection("project_activities").deleteOne({ id });
  }

  async getProjectTasks(projectId?: number): Promise<ProjectTask[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("project_tasks").find(filter).toArray() as any;
  }

  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    return await db.collection("project_tasks").findOne({ id }) as any;
  }

  async createProjectTask(data: InsertProjectTask): Promise<ProjectTask> {
    const id = await this.getNextId("project_tasks");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("project_tasks").insertOne(item);
    return item as any;
  }

  async updateProjectTask(id: number, data: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    await db.collection("project_tasks").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getProjectTask(id);
  }

  async deleteProjectTask(id: number): Promise<void> {
    await db.collection("project_tasks").deleteOne({ id });
  }

  async getProjectResources(projectId?: number): Promise<ProjectResource[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("project_resources").find(filter).toArray() as any;
  }

  async getProjectResource(id: number): Promise<ProjectResource | undefined> {
    return await db.collection("project_resources").findOne({ id }) as any;
  }

  async createProjectResource(data: InsertProjectResource): Promise<ProjectResource> {
    const id = await this.getNextId("project_resources");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("project_resources").insertOne(item);
    return item as any;
  }

  async updateProjectResource(id: number, data: Partial<InsertProjectResource>): Promise<ProjectResource | undefined> {
    await db.collection("project_resources").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getProjectResource(id);
  }

  async deleteProjectResource(id: number): Promise<void> {
    await db.collection("project_resources").deleteOne({ id });
  }

  async getDailyProgressses(projectId?: number): Promise<DailyProgress[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("daily_progress").find(filter).toArray() as any;
  }

  async getDailyProgress(id: number): Promise<DailyProgress | undefined> {
    return await db.collection("daily_progress").findOne({ id }) as any;
  }

  async createDailyProgress(data: InsertDailyProgress): Promise<DailyProgress> {
    const id = await this.getNextId("daily_progress");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("daily_progress").insertOne(item);
    return item as any;
  }

  async createDailyProgressBulk(data: InsertDailyProgress[]): Promise<DailyProgress[]> {
    const created: DailyProgress[] = [];
    for (const entry of data) {
      created.push(await this.createDailyProgress(entry));
    }
    return created;
  }

  async updateDailyProgress(id: number, data: Partial<InsertDailyProgress>): Promise<DailyProgress | undefined> {
    await db.collection("daily_progress").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getDailyProgress(id);
  }

  async deleteDailyProgress(id: number): Promise<void> {
    await db.collection("daily_progress").deleteOne({ id });
  }

  async getResourcePlans(projectId?: number): Promise<ResourcePlan[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("resource_plans").find(filter).toArray() as any;
  }

  async getResourcePlan(id: number): Promise<ResourcePlan | undefined> {
    return await db.collection("resource_plans").findOne({ id }) as any;
  }

  async createResourcePlan(data: InsertResourcePlan): Promise<ResourcePlan> {
    const id = await this.getNextId("resource_plans");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("resource_plans").insertOne(item);
    return item as any;
  }

  async updateResourcePlan(id: number, data: Partial<InsertResourcePlan>): Promise<ResourcePlan | undefined> {
    await db.collection("resource_plans").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getResourcePlan(id);
  }

  async deleteResourcePlan(id: number): Promise<void> {
    await db.collection("resource_plans").deleteOne({ id });
  }

  async getRiskRegisters(projectId?: number): Promise<RiskRegister[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("risk_register").find(filter).toArray() as any;
  }

  async getRiskRegister(id: number): Promise<RiskRegister | undefined> {
    return await db.collection("risk_register").findOne({ id }) as any;
  }

  async createRiskRegister(data: InsertRiskRegister): Promise<RiskRegister> {
    const id = await this.getNextId("risk_register");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("risk_register").insertOne(item);
    return item as any;
  }

  async updateRiskRegister(id: number, data: Partial<InsertRiskRegister>): Promise<RiskRegister | undefined> {
    await db.collection("risk_register").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getRiskRegister(id);
  }

  async deleteRiskRegister(id: number): Promise<void> {
    await db.collection("risk_register").deleteOne({ id });
  }

  async getLessonLearntRegisters(projectId?: number): Promise<LessonLearntRegister[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("lesson_learnt_register").find(filter).toArray() as any;
  }

  async getLessonLearntRegister(id: number): Promise<LessonLearntRegister | undefined> {
    return await db.collection("lesson_learnt_register").findOne({ id }) as any;
  }

  async createLessonLearntRegister(data: InsertLessonLearntRegister): Promise<LessonLearntRegister> {
    const id = await this.getNextId("lesson_learnt_register");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("lesson_learnt_register").insertOne(item);
    return item as any;
  }

  async updateLessonLearntRegister(id: number, data: Partial<InsertLessonLearntRegister>): Promise<LessonLearntRegister | undefined> {
    await db.collection("lesson_learnt_register").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getLessonLearntRegister(id);
  }

  async deleteLessonLearntRegister(id: number): Promise<void> {
    await db.collection("lesson_learnt_register").deleteOne({ id });
  }

  async getDirectManpowerPositions(projectId?: number): Promise<DirectManpowerPosition[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("direct_manpower_positions").find(filter).toArray() as any;
  }

  async getDirectManpowerPosition(id: number): Promise<DirectManpowerPosition | undefined> {
    return await db.collection("direct_manpower_positions").findOne({ id }) as any;
  }

  async createDirectManpowerPosition(data: InsertDirectManpowerPosition): Promise<DirectManpowerPosition> {
    const id = await this.getNextId("direct_manpower_positions");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("direct_manpower_positions").insertOne(item);
    return item as any;
  }

  async updateDirectManpowerPosition(id: number, data: Partial<InsertDirectManpowerPosition>): Promise<DirectManpowerPosition | undefined> {
    await db.collection("direct_manpower_positions").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getDirectManpowerPosition(id);
  }

  async deleteDirectManpowerPosition(id: number): Promise<void> {
    await db.collection("direct_manpower_positions").deleteOne({ id });
  }

  async getDirectManpowerEntries(projectId?: number): Promise<DirectManpowerEntry[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("direct_manpower_entries").find(filter).toArray() as any;
  }

  async getDirectManpowerEntry(id: number): Promise<DirectManpowerEntry | undefined> {
    return await db.collection("direct_manpower_entries").findOne({ id }) as any;
  }

  async createDirectManpowerEntry(data: InsertDirectManpowerEntry): Promise<DirectManpowerEntry> {
    const id = await this.getNextId("direct_manpower_entries");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("direct_manpower_entries").insertOne(item);
    return item as any;
  }

  async updateDirectManpowerEntry(id: number, data: Partial<InsertDirectManpowerEntry>): Promise<DirectManpowerEntry | undefined> {
    await db.collection("direct_manpower_entries").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getDirectManpowerEntry(id);
  }

  async deleteDirectManpowerEntry(id: number): Promise<void> {
    await db.collection("direct_manpower_entries").deleteOne({ id });
  }

  async getIndirectManpowerPositions(projectId?: number): Promise<IndirectManpowerPosition[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("indirect_manpower_positions").find(filter).toArray() as any;
  }

  async getIndirectManpowerPosition(id: number): Promise<IndirectManpowerPosition | undefined> {
    return await db.collection("indirect_manpower_positions").findOne({ id }) as any;
  }

  async createIndirectManpowerPosition(data: InsertIndirectManpowerPosition): Promise<IndirectManpowerPosition> {
    const id = await this.getNextId("indirect_manpower_positions");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("indirect_manpower_positions").insertOne(item);
    return item as any;
  }

  async updateIndirectManpowerPosition(id: number, data: Partial<InsertIndirectManpowerPosition>): Promise<IndirectManpowerPosition | undefined> {
    await db.collection("indirect_manpower_positions").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getIndirectManpowerPosition(id);
  }

  async deleteIndirectManpowerPosition(id: number): Promise<void> {
    await db.collection("indirect_manpower_positions").deleteOne({ id });
  }

  async getIndirectManpowerEntries(projectId?: number): Promise<IndirectManpowerEntry[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("indirect_manpower_entries").find(filter).toArray() as any;
  }

  async getIndirectManpowerEntry(id: number): Promise<IndirectManpowerEntry | undefined> {
    return await db.collection("indirect_manpower_entries").findOne({ id }) as any;
  }

  async createIndirectManpowerEntry(data: InsertIndirectManpowerEntry): Promise<IndirectManpowerEntry> {
    const id = await this.getNextId("indirect_manpower_entries");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("indirect_manpower_entries").insertOne(item);
    return item as any;
  }

  async updateIndirectManpowerEntry(id: number, data: Partial<InsertIndirectManpowerEntry>): Promise<IndirectManpowerEntry | undefined> {
    await db.collection("indirect_manpower_entries").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getIndirectManpowerEntry(id);
  }

  async deleteIndirectManpowerEntry(id: number): Promise<void> {
    await db.collection("indirect_manpower_entries").deleteOne({ id });
  }

  async getPlannedActivities(projectId?: number): Promise<PlannedActivity[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("planned_activities").find(filter).toArray() as any;
  }

  async getPlannedActivity(id: number): Promise<PlannedActivity | undefined> {
    return await db.collection("planned_activities").findOne({ id }) as any;
  }

  async createPlannedActivity(data: InsertPlannedActivity): Promise<PlannedActivity> {
    const id = await this.getNextId("planned_activities");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("planned_activities").insertOne(item);
    return item as any;
  }

  async updatePlannedActivity(id: number, data: Partial<InsertPlannedActivity>): Promise<PlannedActivity | undefined> {
    await db.collection("planned_activities").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getPlannedActivity(id);
  }

  async deletePlannedActivity(id: number): Promise<void> {
    await db.collection("planned_activities").deleteOne({ id });
  }

  async getPlannedActivityTasks(projectId?: number): Promise<PlannedActivityTask[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("planned_activity_tasks").find(filter).toArray() as any;
  }

  async getPlannedActivityTask(id: number): Promise<PlannedActivityTask | undefined> {
    return await db.collection("planned_activity_tasks").findOne({ id }) as any;
  }

  async createPlannedActivityTask(data: InsertPlannedActivityTask): Promise<PlannedActivityTask> {
    const id = await this.getNextId("planned_activity_tasks");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("planned_activity_tasks").insertOne(item);
    return item as any;
  }

  async updatePlannedActivityTask(id: number, data: Partial<InsertPlannedActivityTask>): Promise<PlannedActivityTask | undefined> {
    await db.collection("planned_activity_tasks").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getPlannedActivityTask(id);
  }

  async deletePlannedActivityTask(id: number): Promise<void> {
    await db.collection("planned_activity_tasks").deleteOne({ id });
  }

  async getWorkPackages(projectId?: number): Promise<WorkPackage[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("work_packages").find(filter).toArray() as any;
  }

  async getWorkPackagesByWbsItem(wbsItemId: number): Promise<WorkPackage[]> {
    return (await db.collection("work_packages").find({ wbsItemId }).toArray()) as any;
  }

  async getWorkPackage(id: number): Promise<WorkPackage | undefined> {
    return await db.collection("work_packages").findOne({ id }) as any;
  }

  async createWorkPackage(data: InsertWorkPackage): Promise<WorkPackage> {
    const id = await this.getNextId("work_packages");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("work_packages").insertOne(item);
    return item as any;
  }

  async updateWorkPackage(id: number, data: Partial<InsertWorkPackage>): Promise<WorkPackage | undefined> {
    await db.collection("work_packages").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getWorkPackage(id);
  }

  async deleteWorkPackage(id: number): Promise<void> {
    await db.collection("work_packages").deleteOne({ id });
  }

  async getKanbanCards(projectId?: number): Promise<KanbanCard[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("kanban_cards").find(filter).toArray() as any;
  }

  async getKanbanCard(id: number): Promise<KanbanCard | undefined> {
    return await db.collection("kanban_cards").findOne({ id }) as any;
  }

  async createKanbanCard(data: InsertKanbanCard): Promise<KanbanCard> {
    const id = await this.getNextId("kanban_cards");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("kanban_cards").insertOne(item);
    return item as any;
  }

  async updateKanbanCard(id: number, data: Partial<InsertKanbanCard>): Promise<KanbanCard | undefined> {
    await db.collection("kanban_cards").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getKanbanCard(id);
  }

  async deleteKanbanCard(id: number): Promise<void> {
    await db.collection("kanban_cards").deleteOne({ id });
  }

  async getProjectActivityDependencies(projectId?: number): Promise<ProjectActivityDependency[]> {
    const filter = projectId ? { projectId } : {};
    return await db.collection("project_activity_dependencies").find(filter).toArray() as any;
  }

  async getProjectActivityDependency(id: number): Promise<ProjectActivityDependency | undefined> {
    return await db.collection("project_activity_dependencies").findOne({ id }) as any;
  }

  async createProjectActivityDependency(data: InsertProjectActivityDependency): Promise<ProjectActivityDependency> {
    const id = await this.getNextId("project_activity_dependencies");
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("project_activity_dependencies").insertOne(item);
    return item as any;
  }

  async updateProjectActivityDependency(id: number, data: Partial<InsertProjectActivityDependency>): Promise<ProjectActivityDependency | undefined> {
    await db.collection("project_activity_dependencies").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getProjectActivityDependency(id);
  }

  async deleteProjectActivityDependency(id: number): Promise<void> {
    await db.collection("project_activity_dependencies").deleteOne({ id });
  }

  // Custom methods
  async getWorkPackagesByProject(projectId: number): Promise<WorkPackage[]> {
    return await db.collection("work_packages").find({ projectId }).toArray() as any;
  }

  async getProjectActivitiesByWorkPackage(wpId: number): Promise<ProjectActivity[]> {
    return await db.collection("project_activities").find({ wpId }).toArray() as any;
  }

  async moveKanbanCardToPosition(projectId: number, cardId: number, newColumn: string, destinationIndex: number): Promise<void> {
    // Basic implementation
    await db.collection("kanban_cards").updateOne({ id: cardId }, { $set: { column: newColumn, position: destinationIndex, updatedAt: new Date() } });
  }

  async getWikiRecords(collectionName: string, projectId: number): Promise<WikiRecord[]> {
    return (await db.collection(collectionName).find({ projectId }).toArray()) as WikiRecord[];
  }

  async getWikiRecord(collectionName: string, id: number): Promise<WikiRecord | undefined> {
    return (await db.collection(collectionName).findOne({ id })) as WikiRecord | undefined;
  }

  async createWikiRecord(collectionName: string, data: InsertWikiRecord): Promise<WikiRecord> {
    const id = await this.getNextId(collectionName);
    const item = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
    await db.collection(collectionName).insertOne(item);
    return item as WikiRecord;
  }

  async updateWikiRecord(
    collectionName: string,
    id: number,
    data: Partial<InsertWikiRecord>
  ): Promise<WikiRecord | undefined> {
    await db.collection(collectionName).updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
    return this.getWikiRecord(collectionName, id);
  }

  async deleteWikiRecord(collectionName: string, id: number): Promise<void> {
    await db.collection(collectionName).deleteOne({ id });
  }

  private computeExpiresAt(expiryDays?: number | null, expiryDate?: string | null): Date | null {
    if (expiryDate) {
      const d = new Date(expiryDate);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (expiryDays && expiryDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiryDays);
      return d;
    }
    return null;
  }

  private normalizeCollabThread(thread: Record<string, unknown>): CollaborationThread {
    const category = (thread.category || thread.type || "general") as string;
    const subject = (thread.subject || thread.title || "General") as string;
    return {
      ...(thread as CollaborationThread),
      category: category as CollaborationThread["category"],
      type: category as CollaborationThread["type"],
      subject,
      criticality: (thread.criticality || "medium") as CollaborationThread["criticality"],
      isPinned: Boolean(thread.isPinned),
    };
  }

  private async enrichCollabThreads(
    threadsCol: string,
    messagesCol: string,
    threads: CollaborationThread[],
    viewerUserId?: number
  ) {
    return Promise.all(
      threads.map(async (raw) => {
        const thread = this.normalizeCollabThread(raw as Record<string, unknown>);
        const messages = (await db
          .collection(messagesCol)
          .find({ threadId: thread.id })
          .sort({ createdAt: 1 })
          .toArray()) as CollaborationMessage[];

        const last = messages[messages.length - 1];
        let unreadMentionCount = 0;
        if (viewerUserId != null) {
          unreadMentionCount = messages.filter(
            (m) =>
              (m.mentions || []).some((x) => x.userId === viewerUserId) &&
              !(m.readBy || []).some((r) => r.userId === viewerUserId)
          ).length;
        }

        const expiresAt = thread.expiresAt ? new Date(thread.expiresAt as string | Date) : null;
        const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;

        return {
          ...thread,
          messageCount: messages.length,
          lastMessageAt: last?.createdAt || thread.updatedAt || thread.createdAt,
          lastMessagePreview: thread.lastMessagePreview || (last ? this.plainTextPreview(last.content) : null),
          unreadMentionCount,
          isExpired,
        };
      })
    );
  }

  private plainTextPreview(content: string, max = 80): string {
    const text = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  async getCollabThreads(
    threadsCol: string,
    messagesCol: string,
    filter: { projectId?: number | null },
    options?: { search?: string; category?: string; includeExpired?: boolean; viewerUserId?: number }
  ) {
    const mongoFilter: Record<string, unknown> = {};
    if (filter.projectId === null || filter.projectId === undefined) {
      mongoFilter.$or = [{ projectId: null }, { projectId: { $exists: false } }];
    } else {
      mongoFilter.projectId = filter.projectId;
    }

    let threads = (await db
      .collection(threadsCol)
      .find(mongoFilter)
      .sort({ updatedAt: -1 })
      .toArray()) as CollaborationThread[];

    if (options?.category) {
      threads = threads.filter((t) => {
        const cat = (t as Record<string, unknown>).category || (t as Record<string, unknown>).type;
        return cat === options.category;
      });
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      threads = threads.filter((t) => {
        const subject = String((t as Record<string, unknown>).subject || t.title || "").toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          subject.includes(q) ||
          t.createdByName.toLowerCase().includes(q)
        );
      });
    }

    const enriched = await this.enrichCollabThreads(
      threadsCol,
      messagesCol,
      threads,
      options?.viewerUserId
    );

    if (!options?.includeExpired) {
      return enriched.filter((t) => !t.isExpired);
    }
    return enriched;
  }

  async getCollabThread(threadsCol: string, id: number): Promise<CollaborationThread | undefined> {
    const thread = await db.collection(threadsCol).findOne({ id });
    return thread ? this.normalizeCollabThread(thread as Record<string, unknown>) : undefined;
  }

  async createCollabThread(
    threadsCol: string,
    data: InsertCollaborationThread & { projectId?: number | null }
  ): Promise<CollaborationThread> {
    const id = await this.getNextId(threadsCol);
    const category = data.category || data.type || "general";
    const subject = (data.subject || data.title).trim();
    const expiresAt = this.computeExpiresAt(data.expiryDays, data.expiryDate);
    const now = new Date();
    const item = {
      ...data,
      id,
      subject,
      category,
      type: category,
      criticality: data.criticality || "medium",
      isPinned: Boolean(data.isPinned),
      pinnedAt: data.isPinned ? now : null,
      expiresAt,
      lastMessagePreview: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(threadsCol).insertOne(item);
    return this.normalizeCollabThread(item as Record<string, unknown>);
  }

  async updateCollabThread(
    threadsCol: string,
    id: number,
    data: Partial<InsertCollaborationThread> & { isPinned?: boolean }
  ): Promise<CollaborationThread | undefined> {
    const existing = await this.getCollabThread(threadsCol, id);
    if (!existing) return undefined;

    const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.category || data.type) {
      const category = data.category || data.type;
      update.category = category;
      update.type = category;
    }
    if (data.subject) update.subject = data.subject.trim();
    if (data.expiryDays !== undefined || data.expiryDate !== undefined) {
      update.expiresAt = this.computeExpiresAt(
        data.expiryDays ?? existing.expiryDays,
        data.expiryDate ?? (existing.expiresAt ? String(existing.expiresAt) : null)
      );
    }
    if (data.isPinned === true) {
      update.isPinned = true;
      update.pinnedAt = new Date();
    } else if (data.isPinned === false) {
      update.isPinned = false;
      update.pinnedAt = null;
    }

    await db.collection(threadsCol).updateOne({ id }, { $set: update });
    return this.getCollabThread(threadsCol, id);
  }

  async enforcePinLimit(threadsCol: string, projectId: number, maxPinned = 3) {
    const pinned = (await db
      .collection(threadsCol)
      .find({ projectId, isPinned: true })
      .sort({ pinnedAt: 1 })
      .toArray()) as CollaborationThread[];
    while (pinned.length >= maxPinned) {
      const oldest = pinned.shift();
      if (!oldest) break;
      await db
        .collection(threadsCol)
        .updateOne({ id: oldest.id }, { $set: { isPinned: false, pinnedAt: null, updatedAt: new Date() } });
    }
  }

  async enforceGlobalPinLimit(threadsCol: string, maxPinned = 3) {
    const pinned = (await db
      .collection(threadsCol)
      .find({
        $or: [{ projectId: null }, { projectId: { $exists: false } }],
        isPinned: true,
      })
      .sort({ pinnedAt: 1 })
      .toArray()) as CollaborationThread[];
    while (pinned.length >= maxPinned) {
      const oldest = pinned.shift();
      if (!oldest) break;
      await db
        .collection(threadsCol)
        .updateOne({ id: oldest.id }, { $set: { isPinned: false, pinnedAt: null, updatedAt: new Date() } });
    }
  }

  async deleteCollabThread(threadsCol: string, messagesCol: string, id: number): Promise<void> {
    await db.collection(messagesCol).deleteMany({ threadId: id });
    await db.collection(threadsCol).deleteOne({ id });
  }

  async getCollabMessages(messagesCol: string, threadId: number): Promise<CollaborationMessage[]> {
    return (await db
      .collection(messagesCol)
      .find({ threadId })
      .sort({ createdAt: 1 })
      .toArray()) as CollaborationMessage[];
  }

  async createCollabMessage(
    threadsCol: string,
    messagesCol: string,
    threadId: number,
    data: InsertCollaborationMessage
  ): Promise<CollaborationMessage> {
    const id = await this.getNextId(messagesCol);
    const now = new Date();
    const item = {
      ...data,
      threadId,
      id,
      mentions: data.mentions || [],
      readBy: [],
      createdAt: now,
    };
    await db.collection(messagesCol).insertOne(item);
    await db.collection(threadsCol).updateOne(
      { id: threadId },
      {
        $set: {
          updatedAt: now,
          lastMessagePreview: this.plainTextPreview(data.content),
        },
      }
    );
    return item as CollaborationMessage;
  }

  async markCollabThreadRead(
    messagesCol: string,
    threadId: number,
    userId: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const messages = await this.getCollabMessages(messagesCol, threadId);
    for (const msg of messages) {
      const mentioned = (msg.mentions || []).some((m) => m.userId === userId);
      if (!mentioned) continue;
      const readBy = msg.readBy || [];
      if (readBy.some((r) => r.userId === userId)) continue;
      readBy.push({ userId, readAt: now });
      await db.collection(messagesCol).updateOne({ id: msg.id }, { $set: { readBy } });
    }
    await db
      .collection(collabNotifications)
      .updateMany({ threadId, userId, read: false }, { $set: { read: true } });
  }

  async createCollabNotification(data: InsertCollabNotification): Promise<CollabNotification> {
    const id = await this.getNextId(collabNotifications);
    const item = { ...data, id, createdAt: new Date() };
    await db.collection(collabNotifications).insertOne(item);
    return item as CollabNotification;
  }

  async getCollabNotifications(userId: number, projectId?: number): Promise<CollabNotification[]> {
    const filter: Record<string, unknown> = { userId };
    if (projectId != null) filter.projectId = projectId;
    return (await db
      .collection(collabNotifications)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()) as CollabNotification[];
  }

  async markCollabNotificationRead(id: number, userId: number): Promise<void> {
    await db.collection(collabNotifications).updateOne({ id, userId }, { $set: { read: true } });
  }

  async getMentionableUsers(): Promise<{ id: number; name: string; email: string }[]> {
    const users = await db.collection("users").find({}).project({ id: 1, name: 1, email: 1 }).toArray();
    return users.map((u) => ({
      id: Number(u.id),
      name: String(u.name || u.email || "User"),
      email: String(u.email || ""),
    }));
  }

  // Convenience wrappers for project vs global collections
  getProjectCollabThreads(projectId: number, options?: Parameters<DatabaseStorage["getCollabThreads"]>[3]) {
    return this.getCollabThreads(projectCollaborationThreads, projectCollaborationMessages, { projectId }, options);
  }

  getGlobalCollabThreads(options?: Parameters<DatabaseStorage["getCollabThreads"]>[3]) {
    return this.getCollabThreads(collaborationThreads, collaborationMessages, { projectId: null }, options);
  }
}

export const storage = new DatabaseStorage();
