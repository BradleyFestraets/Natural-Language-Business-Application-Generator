import { 
  type User, 
  type UpsertUser,
  type BusinessRequirement,
  type InsertBusinessRequirement,
  type GeneratedApplication,
  type InsertGeneratedApplication,
  type EmbeddedChatbot,
  type InsertEmbeddedChatbot,
  type WorkflowExecution,
  type InsertWorkflowExecution
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (IMPORTANT: Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Business Requirement operations
  getBusinessRequirement(id: string): Promise<BusinessRequirement | undefined>;
  createBusinessRequirement(requirement: InsertBusinessRequirement): Promise<BusinessRequirement>;
  updateBusinessRequirement(id: string, updates: Partial<InsertBusinessRequirement>): Promise<BusinessRequirement | undefined>;
  listBusinessRequirements(userId: string): Promise<BusinessRequirement[]>;
  deleteBusinessRequirement(id: string): Promise<boolean>;

  // Generated Application operations
  getGeneratedApplication(id: string): Promise<GeneratedApplication | undefined>;
  createGeneratedApplication(application: InsertGeneratedApplication): Promise<GeneratedApplication>;
  updateGeneratedApplication(id: string, updates: Partial<InsertGeneratedApplication>): Promise<GeneratedApplication | undefined>;
  listGeneratedApplications(businessRequirementId?: string): Promise<GeneratedApplication[]>;
  deleteGeneratedApplication(id: string): Promise<boolean>;

  // Embedded Chatbot operations
  getEmbeddedChatbot(id: string): Promise<EmbeddedChatbot | undefined>;
  createEmbeddedChatbot(chatbot: InsertEmbeddedChatbot): Promise<EmbeddedChatbot>;
  updateEmbeddedChatbot(id: string, updates: Partial<InsertEmbeddedChatbot>): Promise<EmbeddedChatbot | undefined>;
  listEmbeddedChatbots(generatedApplicationId: string): Promise<EmbeddedChatbot[]>;
  deleteEmbeddedChatbot(id: string): Promise<boolean>;

  // Workflow Execution operations
  getWorkflowExecution(id: string): Promise<WorkflowExecution | undefined>;
  createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateWorkflowExecution(id: string, updates: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined>;
  listWorkflowExecutions(userId: string, applicationId?: string): Promise<WorkflowExecution[]>;
  deleteWorkflowExecution(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private businessRequirements: Map<string, BusinessRequirement>;
  private generatedApplications: Map<string, GeneratedApplication>;
  private embeddedChatbots: Map<string, EmbeddedChatbot>;
  private workflowExecutions: Map<string, WorkflowExecution>;

  constructor() {
    this.users = new Map();
    this.businessRequirements = new Map();
    this.generatedApplications = new Map();
    this.embeddedChatbots = new Map();
    this.workflowExecutions = new Map();
  }

  // ===== USER OPERATIONS =====

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    
    const user: User = {
      id: userData.id || randomUUID(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(user.id, user);
    return user;
  }

  // ===== BUSINESS REQUIREMENT OPERATIONS =====

  async getBusinessRequirement(id: string): Promise<BusinessRequirement | undefined> {
    return this.businessRequirements.get(id);
  }

  async createBusinessRequirement(insertRequirement: InsertBusinessRequirement): Promise<BusinessRequirement> {
    const id = randomUUID();
    const now = new Date();
    const requirement: BusinessRequirement = {
      ...insertRequirement,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.businessRequirements.set(id, requirement);
    return requirement;
  }

  async updateBusinessRequirement(id: string, updates: Partial<InsertBusinessRequirement>): Promise<BusinessRequirement | undefined> {
    const existing = this.businessRequirements.get(id);
    if (!existing) return undefined;

    const updated: BusinessRequirement = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.businessRequirements.set(id, updated);
    return updated;
  }

  async listBusinessRequirements(userId: string): Promise<BusinessRequirement[]> {
    return Array.from(this.businessRequirements.values())
      .filter(req => req.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteBusinessRequirement(id: string): Promise<boolean> {
    return this.businessRequirements.delete(id);
  }

  // ===== GENERATED APPLICATION OPERATIONS =====

  async getGeneratedApplication(id: string): Promise<GeneratedApplication | undefined> {
    return this.generatedApplications.get(id);
  }

  async createGeneratedApplication(insertApplication: InsertGeneratedApplication): Promise<GeneratedApplication> {
    const id = randomUUID();
    const now = new Date();
    const application: GeneratedApplication = {
      ...insertApplication,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.generatedApplications.set(id, application);
    return application;
  }

  async updateGeneratedApplication(id: string, updates: Partial<InsertGeneratedApplication>): Promise<GeneratedApplication | undefined> {
    const existing = this.generatedApplications.get(id);
    if (!existing) return undefined;

    const updated: GeneratedApplication = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.generatedApplications.set(id, updated);
    return updated;
  }

  async listGeneratedApplications(businessRequirementId?: string): Promise<GeneratedApplication[]> {
    const applications = Array.from(this.generatedApplications.values());
    if (businessRequirementId) {
      return applications.filter(app => app.businessRequirementId === businessRequirementId);
    }
    return applications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteGeneratedApplication(id: string): Promise<boolean> {
    return this.generatedApplications.delete(id);
  }

  // ===== EMBEDDED CHATBOT OPERATIONS =====

  async getEmbeddedChatbot(id: string): Promise<EmbeddedChatbot | undefined> {
    return this.embeddedChatbots.get(id);
  }

  async createEmbeddedChatbot(insertChatbot: InsertEmbeddedChatbot): Promise<EmbeddedChatbot> {
    const id = randomUUID();
    const now = new Date();
    const chatbot: EmbeddedChatbot = {
      ...insertChatbot,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.embeddedChatbots.set(id, chatbot);
    return chatbot;
  }

  async updateEmbeddedChatbot(id: string, updates: Partial<InsertEmbeddedChatbot>): Promise<EmbeddedChatbot | undefined> {
    const existing = this.embeddedChatbots.get(id);
    if (!existing) return undefined;

    const updated: EmbeddedChatbot = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.embeddedChatbots.set(id, updated);
    return updated;
  }

  async listEmbeddedChatbots(generatedApplicationId: string): Promise<EmbeddedChatbot[]> {
    return Array.from(this.embeddedChatbots.values())
      .filter(chatbot => chatbot.generatedApplicationId === generatedApplicationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteEmbeddedChatbot(id: string): Promise<boolean> {
    return this.embeddedChatbots.delete(id);
  }

  // ===== WORKFLOW EXECUTION OPERATIONS =====

  async getWorkflowExecution(id: string): Promise<WorkflowExecution | undefined> {
    return this.workflowExecutions.get(id);
  }

  async createWorkflowExecution(insertExecution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const id = randomUUID();
    const now = new Date();
    const execution: WorkflowExecution = {
      ...insertExecution,
      id,
      createdAt: now,
      updatedAt: now,
      completedAt: insertExecution.status === "completed" ? now : null
    };
    this.workflowExecutions.set(id, execution);
    return execution;
  }

  async updateWorkflowExecution(id: string, updates: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined> {
    const existing = this.workflowExecutions.get(id);
    if (!existing) return undefined;

    const updated: WorkflowExecution = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
      completedAt: updates.status === "completed" ? new Date() : existing.completedAt
    };
    this.workflowExecutions.set(id, updated);
    return updated;
  }

  async listWorkflowExecutions(userId: string, applicationId?: string): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.workflowExecutions.values())
      .filter(execution => execution.userId === userId);

    if (applicationId) {
      executions = executions.filter(execution => execution.generatedApplicationId === applicationId);
    }

    return executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteWorkflowExecution(id: string): Promise<boolean> {
    return this.workflowExecutions.delete(id);
  }
}

export const storage = new MemStorage();
