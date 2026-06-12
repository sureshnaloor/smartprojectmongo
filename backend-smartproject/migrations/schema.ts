import { pgTable, serial, text, numeric, timestamp, foreignKey, integer, date, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const activities = pgTable("activities", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	unitOfMeasure: text("unit_of_measure"),
	unitRate: numeric("unit_rate", { precision: 10, scale:  2 }),
	remarks: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const wbsItems = pgTable("wbs_items", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	parentId: integer("parent_id"),
	name: text().notNull(),
	description: text(),
	level: integer().notNull(),
	code: text().notNull(),
	type: text().notNull(),
	budgetedCost: numeric("budgeted_cost", { precision: 12, scale:  2 }).notNull(),
	actualCost: numeric("actual_cost", { precision: 12, scale:  2 }).default('0'),
	percentComplete: numeric("percent_complete", { precision: 5, scale:  2 }).default('0'),
	startDate: date("start_date"),
	endDate: date("end_date"),
	duration: integer(),
	actualStartDate: date("actual_start_date"),
	actualEndDate: date("actual_end_date"),
	isTopLevel: boolean("is_top_level").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "wbs_items_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const costEntries = pgTable("cost_entries", {
	id: serial().primaryKey().notNull(),
	wbsItemId: integer("wbs_item_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	description: text(),
	entryDate: date("entry_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.wbsItemId],
			foreignColumns: [wbsItems.id],
			name: "cost_entries_wbs_item_id_wbs_items_id_fk"
		}).onDelete("cascade"),
]);

export const dependencies = pgTable("dependencies", {
	id: serial().primaryKey().notNull(),
	predecessorId: integer("predecessor_id").notNull(),
	successorId: integer("successor_id").notNull(),
	type: text().notNull(),
	lag: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.predecessorId],
			foreignColumns: [wbsItems.id],
			name: "dependencies_predecessor_id_wbs_items_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.successorId],
			foreignColumns: [wbsItems.id],
			name: "dependencies_successor_id_wbs_items_id_fk"
		}).onDelete("cascade"),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	activityId: integer("activity_id").notNull(),
	projectId: integer("project_id").notNull(),
	name: text().notNull(),
	description: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	duration: integer(),
	percentComplete: numeric("percent_complete", { precision: 5, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [wbsItems.id],
			name: "tasks_activity_id_wbs_items_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	budget: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});
