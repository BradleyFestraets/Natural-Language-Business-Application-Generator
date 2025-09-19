import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, real, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Updated users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Business Requirements Table
export const businessRequirements = pgTable("business_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  originalDescription: text("original_description").notNull(),
  extractedEntities: json("extracted_entities").$type<{
    businessContext?: {
      industry?: string;
      criticality?: string;
      scope?: string;
      complianceRequirements?: string[];
    };
    processes?: Array<{
      name: string;
      type?: string;
      description?: string;
      complexity?: string;
      dependencies?: string[];
    }>;
    forms?: Array<{
      name: string;
      purpose?: string;
      complexity?: string;
      dataTypes?: string[];
      validationRules?: string[];
    }>;
    approvals?: Array<{
      name: string;
      role?: string;
      criteria?: string;
      escalation?: string;
      timeLimit?: string;
    }>;
    integrations?: Array<{
      name: string;
      type?: string;
      purpose?: string;
      criticality?: string;
      dataFlow?: string;
    }>;
    workflowPatterns?: Array<{
      name: string;
      type?: string;
      description?: string;
      complexity?: string;
      businessRules?: string[];
    }>;
    riskAssessment?: {
      securityRisks?: string[];
      complianceRisks?: string[];
      operationalRisks?: string[];
      mitigationStrategies?: string[];
    };
    resourceRequirements?: {
      userRoles?: string[];
      technicalComplexity?: string;
      estimatedTimeframe?: string;
      infrastructureNeeds?: string[];
    };
    // Legacy support for backward compatibility
    processes_legacy?: string[];
    forms_legacy?: string[];
    approvals_legacy?: string[];
    integrations_legacy?: string[];
  }>(),
  workflowPatterns: json("workflow_patterns").$type<Array<{
    name: string;
    type?: string;
    description?: string;
    complexity?: string;
    businessRules?: string[];
  }> | string[]>(),
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
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
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

// Chat Interactions Table
export const chatInteractions = pgTable("chat_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").notNull().references(() => embeddedChatbots.id),
  userId: varchar("user_id").references(() => users.id),
  userMessage: text("user_message").notNull(),
  botResponse: text("bot_response").notNull(),
  context: json("context").$type<Record<string, any>>(),
  actionTaken: text("action_taken"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertChatInteractionSchema = createInsertSchema(chatInteractions).omit({ 
  id: true, 
  timestamp: true 
});

export type InsertChatInteraction = z.infer<typeof insertChatInteractionSchema>;
export type ChatInteraction = typeof chatInteractions.$inferSelect;

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

// ===== ENTERPRISE FEATURES =====

// Organizations and Multi-tenancy
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: varchar("subdomain").unique(),
  plan: varchar("plan", { enum: ["starter", "professional", "enterprise"] }).notNull().default("starter"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orgMemberships = pgTable("org_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { enum: ["owner", "admin", "manager", "contributor", "viewer"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roles and Permissions
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roleBindings = pgTable("role_bindings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  resourceType: varchar("resource_type"), // application, workflow, form, etc.
  resourceId: varchar("resource_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks and Approvals
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  assigneeId: varchar("assignee_id").references(() => users.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).notNull().default("pending"),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskComments = pgTable("task_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const approvals = pgTable("approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(), // Generic ID for approval requests
  requestType: varchar("request_type").notNull(), // workflow, application, etc.
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  approverId: varchar("approver_id").references(() => users.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  state: varchar("state", { enum: ["pending", "approved", "rejected", "expired"] }).notNull().default("pending"),
  slaHours: integer("sla_hours").default(24),
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Events and Jobs for Background Processing
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  payload: json("payload").$type<Record<string, any>>(),
  actorId: varchar("actor_id").references(() => users.id),
  resourceType: varchar("resource_type"),
  resourceId: varchar("resource_id"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  payload: json("payload").$type<Record<string, any>>(),
  status: varchar("status", { enum: ["queued", "running", "completed", "failed"] }).notNull().default("queued"),
  retries: integer("retries").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  organizationId: varchar("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const jobRuns = pgTable("job_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  status: varchar("status", { enum: ["running", "completed", "failed"] }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  result: json("result").$type<Record<string, any>>(),
});

// Integrations Engine
export const connectors = pgTable("connectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  type: varchar("type", { enum: ["webhook", "email", "slack", "salesforce", "sap", "api"] }).notNull(),
  description: text("description"),
  configSchema: json("config_schema").$type<Record<string, any>>(),
  authType: varchar("auth_type", { enum: ["none", "api_key", "oauth", "basic"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  connectorId: varchar("connector_id").notNull().references(() => connectors.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  config: json("config").$type<Record<string, any>>(),
  credentials: json("credentials").$type<Record<string, any>>(), // Encrypted
  isActive: boolean("is_active").notNull().default(true),
  lastTestedAt: timestamp("last_tested_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const triggers = pgTable("triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["webhook", "schedule", "event", "manual"] }).notNull(),
  connectionId: varchar("connection_id").references(() => connections.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  config: json("config").$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["http_request", "email", "slack_message", "create_task", "approval"] }).notNull(),
  connectionId: varchar("connection_id").references(() => connections.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  config: json("config").$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrationRules = pgTable("integration_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  triggerId: varchar("trigger_id").notNull().references(() => triggers.id),
  actionId: varchar("action_id").notNull().references(() => actions.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  conditions: json("conditions").$type<Record<string, any>>(),
  mapping: json("mapping").$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrationRuns = pgTable("integration_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => integrationRules.id),
  status: varchar("status", { enum: ["running", "completed", "failed", "retrying"] }).notNull(),
  input: json("input").$type<Record<string, any>>(),
  output: json("output").$type<Record<string, any>>(),
  error: text("error"),
  duration: integer("duration"), // milliseconds
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Enhanced Forms and Workflows
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  generatedApplicationId: varchar("generated_application_id").references(() => generatedApplications.id),
  schema: json("schema").$type<Record<string, any>>(),
  validations: json("validations").$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formFields = pgTable("form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["text", "email", "number", "date", "select", "checkbox", "file"] }).notNull(),
  label: text("label").notNull(),
  placeholder: text("placeholder"),
  required: boolean("required").notNull().default(false),
  validation: json("validation").$type<Record<string, any>>(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  generatedApplicationId: varchar("generated_application_id").references(() => generatedApplications.id),
  definition: json("definition").$type<Record<string, any>>(),
  isPublished: boolean("is_published").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowSteps = pgTable("workflow_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull().references(() => workflows.id),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["form", "approval", "integration", "condition", "delay"] }).notNull(),
  config: json("config").$type<Record<string, any>>(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reporting and Analytics
export const datasets = pgTable("datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  query: text("query").notNull(),
  parameters: json("parameters").$type<Record<string, any>>(),
  refreshInterval: integer("refresh_interval"), // minutes
  lastRefreshedAt: timestamp("last_refreshed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  datasetId: varchar("dataset_id").notNull().references(() => datasets.id),
  definition: json("definition").$type<Record<string, any>>(),
  schedule: varchar("schedule"), // cron expression
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dashboards = pgTable("dashboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  layout: json("layout").$type<Record<string, any>>(),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgets = pgTable("widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dashboardId: varchar("dashboard_id").notNull().references(() => dashboards.id),
  reportId: varchar("report_id").references(() => reports.id),
  datasetId: varchar("dataset_id").references(() => datasets.id),
  type: varchar("type", { enum: ["chart", "table", "metric", "text"] }).notNull(),
  config: json("config").$type<Record<string, any>>(),
  position: json("position").$type<{ x: number; y: number; w: number; h: number }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit and Analytics
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  action: text("action").notNull(),
  resourceType: varchar("resource_type").notNull(),
  resourceId: varchar("resource_id").notNull(),
  changes: json("changes").$type<Record<string, any>>(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usageMetrics = pgTable("usage_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  metricType: varchar("metric_type").notNull(), // api_calls, storage, users, etc.
  value: integer("value").notNull(),
  date: timestamp("date").notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications
export const notificationChannels = pgTable("notification_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["email", "slack", "webhook", "sms"] }).notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  config: json("config").$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["email", "slack", "webhook", "sms"] }).notNull(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  subject: text("subject"),
  body: text("body").notNull(),
  variables: json("variables").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(),
  channelId: varchar("channel_id").notNull().references(() => notificationChannels.id),
  templateId: varchar("template_id").references(() => notificationTemplates.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => notificationSubscriptions.id),
  channelId: varchar("channel_id").notNull().references(() => notificationChannels.id),
  status: varchar("status", { enum: ["pending", "sent", "failed", "retrying"] }).notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  error: text("error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== INSERT SCHEMAS AND TYPES =====

// Organization schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrgMembershipSchema = createInsertSchema(orgMemberships).omit({ id: true, createdAt: true, updatedAt: true });

// Task schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ id: true, createdAt: true });
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });

// Integration schemas
export const insertConnectorSchema = createInsertSchema(connectors).omit({ id: true, createdAt: true });
export const insertConnectionSchema = createInsertSchema(connections).omit({ id: true, createdAt: true, updatedAt: true, lastTestedAt: true });
export const insertTriggerSchema = createInsertSchema(triggers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActionSchema = createInsertSchema(actions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIntegrationRuleSchema = createInsertSchema(integrationRules).omit({ id: true, createdAt: true, updatedAt: true });

// Workflow schemas
export const insertFormSchema = createInsertSchema(forms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true, createdAt: true, updatedAt: true });

// Reporting schemas
export const insertDatasetSchema = createInsertSchema(datasets).omit({ id: true, createdAt: true, updatedAt: true, lastRefreshedAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDashboardSchema = createInsertSchema(dashboards).omit({ id: true, createdAt: true, updatedAt: true });

// Notification schemas
export const insertNotificationChannelSchema = createInsertSchema(notificationChannels).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrgMembership = typeof orgMemberships.$inferSelect;
export type InsertOrgMembership = z.infer<typeof insertOrgMembershipSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;

export type Connector = typeof connectors.$inferSelect;
export type InsertConnector = z.infer<typeof insertConnectorSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Trigger = typeof triggers.$inferSelect;
export type InsertTrigger = z.infer<typeof insertTriggerSchema>;
export type Action = typeof actions.$inferSelect;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type IntegrationRule = typeof integrationRules.$inferSelect;
export type InsertIntegrationRule = z.infer<typeof insertIntegrationRuleSchema>;

export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Dashboard = typeof dashboards.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;

export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type InsertNotificationChannel = z.infer<typeof insertNotificationChannelSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
