import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, real, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Business Requirements Table
export const businessRequirements = pgTable("business_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  originalDescription: text("original_description").notNull(),
  extractedEntities: json("extracted_entities").$type<{
    processes: string[];
    forms: string[];
    approvals: string[];
    integrations: string[];
  }>(),
  workflowPatterns: json("workflow_patterns").$type<string[]>(),
  confidence: real("confidence").notNull(),
  status: varchar("status", { enum: ["analyzing", "validated", "generating_app", "completed"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusinessRequirementSchema = createInsertSchema(businessRequirements, {
  confidence: z.number().min(0).max(1),
  status: z.enum(["analyzing", "validated", "generating_app", "completed"]),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertBusinessRequirement = z.infer<typeof insertBusinessRequirementSchema>;
export type BusinessRequirement = typeof businessRequirements.$inferSelect;

// Generated Applications Table
export const generatedApplications = pgTable("generated_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessRequirementId: varchar("business_requirement_id").notNull().references(() => businessRequirements.id),
  name: text("name").notNull(),
  description: text("description"),
  generatedWorkflows: json("generated_workflows").$type<Array<{
    id: string;
    name: string;
    steps: string[];
  }>>(),
  generatedForms: json("generated_forms").$type<Array<{
    id: string;
    name: string;
    fields: string[];
  }>>(),
  generatedIntegrations: json("generated_integrations").$type<Array<{
    id: string;
    name: string;
    type: string;
  }>>(),
  embeddedChatbots: json("embedded_chatbots").$type<string[]>(),
  status: varchar("status", { enum: ["generating", "completed", "deployed", "failed"] }).notNull(),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGeneratedApplicationSchema = createInsertSchema(generatedApplications, {
  status: z.enum(["generating", "completed", "deployed", "failed"]),
  completionPercentage: z.number().min(0).max(100),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertGeneratedApplication = z.infer<typeof insertGeneratedApplicationSchema>;
export type GeneratedApplication = typeof generatedApplications.$inferSelect;

// Embedded Chatbots Table
export const embeddedChatbots = pgTable("embedded_chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generatedApplicationId: varchar("generated_application_id").notNull().references(() => generatedApplications.id),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  capabilities: json("capabilities").$type<string[]>(),
  aiModel: varchar("ai_model", { enum: ["gpt-4", "gpt-3.5-turbo", "claude-3"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmbeddedChatbotSchema = createInsertSchema(embeddedChatbots, {
  aiModel: z.enum(["gpt-4", "gpt-3.5-turbo", "claude-3"]),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertEmbeddedChatbot = z.infer<typeof insertEmbeddedChatbotSchema>;
export type EmbeddedChatbot = typeof embeddedChatbots.$inferSelect;

// Workflow Executions Table
export const workflowExecutions = pgTable("workflow_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generatedApplicationId: varchar("generated_application_id").notNull().references(() => generatedApplications.id),
  workflowId: varchar("workflow_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  currentStep: text("current_step").notNull(),
  stepData: json("step_data").$type<Record<string, any>>(),
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "failed", "cancelled"] }).notNull(),
  aiAssistanceUsed: boolean("ai_assistance_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions, {
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
}).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });

export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
