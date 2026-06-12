import { relations } from "drizzle-orm/relations";
import { projects, wbsItems, costEntries, dependencies, tasks } from "./schema";

export const wbsItemsRelations = relations(wbsItems, ({one, many}) => ({
	project: one(projects, {
		fields: [wbsItems.projectId],
		references: [projects.id]
	}),
	costEntries: many(costEntries),
	dependencies_predecessorId: many(dependencies, {
		relationName: "dependencies_predecessorId_wbsItems_id"
	}),
	dependencies_successorId: many(dependencies, {
		relationName: "dependencies_successorId_wbsItems_id"
	}),
	tasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	wbsItems: many(wbsItems),
	tasks: many(tasks),
}));

export const costEntriesRelations = relations(costEntries, ({one}) => ({
	wbsItem: one(wbsItems, {
		fields: [costEntries.wbsItemId],
		references: [wbsItems.id]
	}),
}));

export const dependenciesRelations = relations(dependencies, ({one}) => ({
	wbsItem_predecessorId: one(wbsItems, {
		fields: [dependencies.predecessorId],
		references: [wbsItems.id],
		relationName: "dependencies_predecessorId_wbsItems_id"
	}),
	wbsItem_successorId: one(wbsItems, {
		fields: [dependencies.successorId],
		references: [wbsItems.id],
		relationName: "dependencies_successorId_wbsItems_id"
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	wbsItem: one(wbsItems, {
		fields: [tasks.activityId],
		references: [wbsItems.id]
	}),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
}));