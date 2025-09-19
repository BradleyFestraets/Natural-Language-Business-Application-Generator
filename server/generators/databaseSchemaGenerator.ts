import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { BusinessRequirement } from "@shared/schema";
import { sanitizeFilename, sanitizeEntityName, validateSafeFilename } from "../utils/sanitizeFilename";

export interface SchemaGenerationOptions {
  outputDir: string;
  includeSeeds?: boolean;
  includeMigrations?: boolean;
  databaseType?: "postgresql" | "mysql" | "sqlite";
}

export class DatabaseSchemaGenerator {
  private openai: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null as any;
    }
  }

  /**
   * Generate database schema and write to filesystem
   */
  async generateDatabaseSchema(
    businessRequirement: BusinessRequirement,
    options: SchemaGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const generatedFiles: { [filename: string]: string } = {};
    
    // Ensure output directory exists
    await mkdir(options.outputDir, { recursive: true });

    try {
      // Generate main schema file
      const schemaCode = await this.generateMainSchema(businessRequirement, options);
      const schemaPath = join(options.outputDir, "schema.ts");
      await writeFile(schemaPath, schemaCode);
      generatedFiles["schema.ts"] = schemaCode;

      // Generate business entity schemas from forms
      if (businessRequirement.extractedEntities?.forms) {
        for (const entityName of businessRequirement.extractedEntities.forms) {
          const entitySchema = await this.generateEntitySchema(entityName, businessRequirement);
          const safeEntityName = sanitizeEntityName(entityName);
          validateSafeFilename(safeEntityName);
          const filename = `${safeEntityName}Schema.ts`;
          const entitySchemaPath = join(options.outputDir, filename);
          await writeFile(entitySchemaPath, entitySchema);
          generatedFiles[filename] = entitySchema;
        }
      }

      // Generate workflow schemas
      if (businessRequirement.extractedEntities?.processes) {
        const workflowSchema = await this.generateWorkflowSchema(businessRequirement);
        const workflowPath = join(options.outputDir, "workflowSchema.ts");
        await writeFile(workflowPath, workflowSchema);
        generatedFiles["workflowSchema.ts"] = workflowSchema;
      }

      // Generate seed data if requested
      if (options.includeSeeds) {
        const seedsCode = await this.generateSeedData(businessRequirement);
        const seedsPath = join(options.outputDir, "seeds.ts");
        await writeFile(seedsPath, seedsCode);
        generatedFiles["seeds.ts"] = seedsCode;
      }

      // Generate query helpers
      const queryHelpers = await this.generateQueryHelpers(businessRequirement);
      const helpersPath = join(options.outputDir, "queryHelpers.ts");
      await writeFile(helpersPath, queryHelpers);
      generatedFiles["queryHelpers.ts"] = queryHelpers;

      return generatedFiles;

    } catch (error) {
      throw new Error(`Failed to generate database schema: ${error}`);
    }
  }

  /**
   * Generate main database schema file
   */
  private async generateMainSchema(businessRequirement: BusinessRequirement, options: SchemaGenerationOptions): Promise<string> {
    const prompt = `Generate Drizzle ORM database schema for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}
Database Type: ${options.databaseType || "postgresql"}

Requirements:
- Use Drizzle ORM with PostgreSQL patterns
- Include tables for all business entities
- Add proper relationships and foreign keys
- Include workflow state tracking tables
- Add proper indexes for performance
- Include audit fields (createdAt, updatedAt)
- Use proper data types and constraints
- Include proper TypeScript type exports
- Add comprehensive table relationships
- Include proper validation constraints

Generated schema should be production-ready and follow database best practices.`;

    if (!this.openai) {
      return this.getFallbackMainSchema();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert database architect. Generate production-ready Drizzle ORM schemas with proper relationships and constraints." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || this.getFallbackMainSchema();
    } catch (error) {
      console.error("Failed to generate main schema:", error);
      return this.getFallbackMainSchema();
    }
  }

  /**
   * Generate schema for business entity
   */
  private async generateEntitySchema(entityName: string, businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate Drizzle ORM table schema for business entity: ${entityName}

Business Context: ${businessRequirement.originalDescription}
Entity: ${entityName}

Requirements:
- Use Drizzle ORM with PostgreSQL
- Include all relevant fields for this entity
- Add proper data types and constraints
- Include relationships to other entities
- Add indexes for performance
- Include audit fields (createdAt, updatedAt)
- Add proper TypeScript type exports
- Include validation constraints
- Add proper foreign key relationships
- Use modern SQL patterns

Generated schema should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackEntitySchema(entityName);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert database architect. Generate production-ready Drizzle ORM table schemas with proper constraints." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      return response.choices[0]?.message?.content || this.getFallbackEntitySchema(entityName);
    } catch (error) {
      console.error(`Failed to generate entity schema for ${entityName}:`, error);
      return this.getFallbackEntitySchema(entityName);
    }
  }

  /**
   * Generate workflow schema
   */
  private async generateWorkflowSchema(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate Drizzle ORM workflow schema for this business application:

Business Context: ${businessRequirement.originalDescription}
Processes: ${businessRequirement.extractedEntities?.processes?.join(", ") || "General workflow"}

Requirements:
- Use Drizzle ORM with PostgreSQL
- Include workflow instance tracking
- Add workflow step definitions
- Include workflow history/audit trail
- Add approval and rejection tracking
- Include workflow state management
- Add proper relationships between workflow tables
- Include participant and role tracking
- Add notification and escalation tracking
- Use proper data types and constraints

Generated schema should be complete and support complex business workflows.`;

    if (!this.openai) {
      return this.getFallbackWorkflowSchema();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert database architect. Generate production-ready workflow schemas with proper state management." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackWorkflowSchema();
    } catch (error) {
      console.error("Failed to generate workflow schema:", error);
      return this.getFallbackWorkflowSchema();
    }
  }

  /**
   * Generate seed data
   */
  private async generateSeedData(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate seed data for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Create realistic test data for all entities
- Include proper relationships between entities
- Add sample workflow instances
- Include test users with different roles
- Add sample configuration data
- Use TypeScript with proper types
- Include data validation before insertion
- Add proper error handling
- Include cleanup functions for development

Generated seed data should be comprehensive and realistic.`;

    if (!this.openai) {
      return this.getFallbackSeedData();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert database developer. Generate comprehensive seed data for business applications." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackSeedData();
    } catch (error) {
      console.error("Failed to generate seed data:", error);
      return this.getFallbackSeedData();
    }
  }

  /**
   * Generate query helpers
   */
  private async generateQueryHelpers(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate database query helpers for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Create reusable query functions for common operations
- Include complex business logic queries
- Add pagination and filtering helpers
- Include search and sorting functions
- Add transaction helpers
- Include bulk operation functions
- Add query optimization helpers
- Include proper error handling
- Use TypeScript with proper types
- Add comprehensive query coverage

Generated helpers should be production-ready and efficient.`;

    if (!this.openai) {
      return this.getFallbackQueryHelpers();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert database developer. Generate efficient query helpers for business applications." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackQueryHelpers();
    } catch (error) {
      console.error("Failed to generate query helpers:", error);
      return this.getFallbackQueryHelpers();
    }
  }

  /**
   * Fallback schemas when AI generation fails
   */
  private getFallbackMainSchema(): string {
    return `import { pgTable, varchar, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  email: varchar("email").notNull().unique(),
  name: varchar("name").notNull(),
  role: varchar("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business entities table
export const businessEntities = pgTable("business_entities", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  name: varchar("name").notNull(),
  description: text("description"),
  status: varchar("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflows table
export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  name: varchar("name").notNull(),
  description: text("description"),
  status: varchar("status", { enum: ["draft", "active", "inactive"] }).notNull().default("draft"),
  entityId: varchar("entity_id").references(() => businessEntities.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow instances table
export const workflowInstances = pgTable("workflow_instances", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  workflowId: varchar("workflow_id").notNull().references(() => workflows.id),
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "failed"] }).notNull().default("pending"),
  currentStep: varchar("current_step").notNull(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type BusinessEntity = typeof businessEntities.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;

export type InsertUser = typeof users.$inferInsert;
export type InsertBusinessEntity = typeof businessEntities.$inferInsert;
export type InsertWorkflow = typeof workflows.$inferInsert;
export type InsertWorkflowInstance = typeof workflowInstances.$inferInsert;`;
  }

  private getFallbackEntitySchema(entityName: string): string {
    const EntityName = this.capitalizeAndClean(entityName);
    return `import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";

export const ${entityName}s = pgTable("${entityName}s", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  name: varchar("name").notNull(),
  description: text("description"),
  status: varchar("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  metadata: text("metadata"), // JSON field for flexible data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
export type ${EntityName} = typeof ${entityName}s.$inferSelect;
export type Insert${EntityName} = typeof ${entityName}s.$inferInsert;`;
  }

  private getFallbackWorkflowSchema(): string {
    return `import { pgTable, varchar, text, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";

// Workflow definitions
export const workflowDefinitions = pgTable("workflow_definitions", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  name: varchar("name").notNull(),
  description: text("description"),
  steps: json("steps").$type<Array<{
    id: string;
    name: string;
    type: string;
    config: Record<string, any>;
  }>>().notNull(),
  status: varchar("status", { enum: ["draft", "active", "inactive"] }).notNull().default("draft"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow instances
export const workflowInstances = pgTable("workflow_instances", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  definitionId: varchar("definition_id").notNull().references(() => workflowDefinitions.id),
  status: varchar("status", { 
    enum: ["pending", "in_progress", "completed", "failed", "cancelled"] 
  }).notNull().default("pending"),
  currentStepId: varchar("current_step_id"),
  assigneeId: varchar("assignee_id").references(() => users.id),
  initiatorId: varchar("initiator_id").notNull().references(() => users.id),
  data: json("data").$type<Record<string, any>>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow step history
export const workflowStepHistory = pgTable("workflow_step_history", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  instanceId: varchar("instance_id").notNull().references(() => workflowInstances.id),
  stepId: varchar("step_id").notNull(),
  status: varchar("status", { 
    enum: ["pending", "in_progress", "completed", "failed", "skipped"] 
  }).notNull(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  action: varchar("action"),
  comment: text("comment"),
  data: json("data").$type<Record<string, any>>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type WorkflowStepHistory = typeof workflowStepHistory.$inferSelect;

export type InsertWorkflowDefinition = typeof workflowDefinitions.$inferInsert;
export type InsertWorkflowInstance = typeof workflowInstances.$inferInsert;
export type InsertWorkflowStepHistory = typeof workflowStepHistory.$inferInsert;`;
  }

  private getFallbackSeedData(): string {
    return `import { db } from "./database";
import { users, businessEntities, workflows, workflowInstances } from "./schema";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Seed users
    const adminUser = await db.insert(users).values({
      email: "admin@example.com",
      name: "Admin User",
      role: "admin"
    }).returning();

    const regularUser = await db.insert(users).values({
      email: "user@example.com", 
      name: "Regular User",
      role: "user"
    }).returning();

    console.log("Users seeded successfully");

    // Seed business entities
    const sampleEntity = await db.insert(businessEntities).values({
      name: "Sample Business Entity",
      description: "A sample entity for testing",
      status: "active",
      ownerId: adminUser[0].id
    }).returning();

    console.log("Business entities seeded successfully");

    // Seed workflows
    const sampleWorkflow = await db.insert(workflows).values({
      name: "Sample Workflow",
      description: "A sample workflow for testing",
      status: "active",
      entityId: sampleEntity[0].id
    }).returning();

    console.log("Workflows seeded successfully");

    // Seed workflow instances
    await db.insert(workflowInstances).values({
      workflowId: sampleWorkflow[0].id,
      status: "pending",
      currentStep: "initial_step",
      assigneeId: regularUser[0].id
    });

    console.log("Workflow instances seeded successfully");
    console.log("Database seeding completed!");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

export async function clearDatabase() {
  try {
    console.log("Clearing database...");
    
    await db.delete(workflowInstances);
    await db.delete(workflows);
    await db.delete(businessEntities);
    await db.delete(users);
    
    console.log("Database cleared successfully");
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error;
  }
}`;
  }

  private getFallbackQueryHelpers(): string {
    return `import { db } from "./database";
import { users, businessEntities, workflows, workflowInstances } from "./schema";
import { eq, and, or, like, desc, asc, count } from "drizzle-orm";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface SearchOptions {
  query?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// User queries
export const userQueries = {
  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  },

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  },

  async findAll(options: PaginationOptions & SearchOptions = {}) {
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(users);

    if (query) {
      queryBuilder = queryBuilder.where(
        or(
          like(users.name, \`%\${query}%\`),
          like(users.email, \`%\${query}%\`)
        )
      );
    }

    const sortColumn = users[sortBy as keyof typeof users] || users.createdAt;
    queryBuilder = queryBuilder
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    return await queryBuilder;
  }
};

// Business entity queries
export const businessEntityQueries = {
  async findById(id: string) {
    const result = await db.select().from(businessEntities).where(eq(businessEntities.id, id));
    return result[0] || null;
  },

  async findByOwner(ownerId: string, options: PaginationOptions = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    return await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.ownerId, ownerId))
      .orderBy(desc(businessEntities.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async search(options: SearchOptions & PaginationOptions = {}) {
    const { page = 1, limit = 10, query, status } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(businessEntities);

    const conditions = [];
    if (query) {
      conditions.push(
        or(
          like(businessEntities.name, \`%\${query}%\`),
          like(businessEntities.description, \`%\${query}%\`)
        )
      );
    }
    if (status) {
      conditions.push(eq(businessEntities.status, status));
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    return await queryBuilder
      .orderBy(desc(businessEntities.createdAt))
      .limit(limit)
      .offset(offset);
  }
};

// Workflow queries
export const workflowQueries = {
  async findById(id: string) {
    const result = await db.select().from(workflows).where(eq(workflows.id, id));
    return result[0] || null;
  },

  async findByEntity(entityId: string) {
    return await db.select()
      .from(workflows)
      .where(eq(workflows.entityId, entityId))
      .orderBy(desc(workflows.createdAt));
  },

  async findActiveWorkflows() {
    return await db.select()
      .from(workflows)
      .where(eq(workflows.status, 'active'))
      .orderBy(asc(workflows.name));
  }
};

// Workflow instance queries
export const workflowInstanceQueries = {
  async findById(id: string) {
    const result = await db.select().from(workflowInstances).where(eq(workflowInstances.id, id));
    return result[0] || null;
  },

  async findByAssignee(assigneeId: string, status?: string) {
    let queryBuilder = db.select().from(workflowInstances).where(eq(workflowInstances.assigneeId, assigneeId));
    
    if (status) {
      queryBuilder = queryBuilder.where(
        and(
          eq(workflowInstances.assigneeId, assigneeId),
          eq(workflowInstances.status, status)
        )
      );
    }

    return await queryBuilder.orderBy(desc(workflowInstances.createdAt));
  },

  async findByWorkflow(workflowId: string, options: PaginationOptions = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    return await db.select()
      .from(workflowInstances)
      .where(eq(workflowInstances.workflowId, workflowId))
      .orderBy(desc(workflowInstances.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async getStatsCounts() {
    const [total, pending, inProgress, completed, failed] = await Promise.all([
      db.select({ count: count() }).from(workflowInstances),
      db.select({ count: count() }).from(workflowInstances).where(eq(workflowInstances.status, 'pending')),
      db.select({ count: count() }).from(workflowInstances).where(eq(workflowInstances.status, 'in_progress')),
      db.select({ count: count() }).from(workflowInstances).where(eq(workflowInstances.status, 'completed')),
      db.select({ count: count() }).from(workflowInstances).where(eq(workflowInstances.status, 'failed'))
    ]);

    return {
      total: total[0].count,
      pending: pending[0].count,
      inProgress: inProgress[0].count,
      completed: completed[0].count,
      failed: failed[0].count
    };
  }
};

// Transaction helpers
export const transactionHelpers = {
  async withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return await db.transaction(callback);
  },

  async batchInsert<T>(table: any, data: T[], batchSize = 100): Promise<void> {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(table).values(batch);
    }
  }
};`;
  }

  /**
   * Utility function to capitalize and clean names
   */
  private capitalizeAndClean(str: string): string {
    return str
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}