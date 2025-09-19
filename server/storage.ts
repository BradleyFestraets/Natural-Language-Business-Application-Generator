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
  type InsertWorkflowExecution,
  type Organization,
  type InsertOrganization,
  type OrgMembership,
  type InsertOrgMembership,
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
  getGeneratedApplicationsByOrganization(organizationId: string): Promise<GeneratedApplication[]>;
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
  listWorkflowExecutionsByOrg(userId: string, organizationId: string): Promise<WorkflowExecution[]>;
  deleteWorkflowExecution(id: string): Promise<boolean>;

  // ===== AUTHORIZATION & RBAC OPERATIONS =====
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  listUserOrganizations(userId: string): Promise<Organization[]>;
  
  // Organization membership operations
  getUserOrgMembership(userId: string, organizationId: string): Promise<OrgMembership | undefined>;
  addOrgMembership(membership: InsertOrgMembership): Promise<OrgMembership>;
  removeOrgMembership(userId: string, organizationId: string): Promise<boolean>;
  listOrgMembers(organizationId: string): Promise<OrgMembership[]>;
  
  // Permission resolution operations  
  getUserPermissions(userId: string, organizationId: string): Promise<string[]>;
  hasOrgMembership(userId: string, organizationId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private businessRequirements: Map<string, BusinessRequirement>;
  private generatedApplications: Map<string, GeneratedApplication>;
  private embeddedChatbots: Map<string, EmbeddedChatbot>;
  private workflowExecutions: Map<string, WorkflowExecution>;
  private organizations: Map<string, Organization>;
  private orgMemberships: Map<string, OrgMembership>;

  constructor() {
    this.users = new Map();
    this.businessRequirements = new Map();
    this.generatedApplications = new Map();
    this.embeddedChatbots = new Map();
    this.workflowExecutions = new Map();
    this.organizations = new Map();
    this.orgMemberships = new Map();
    
    // Initialize with a default organization for development only
    if (process.env.NODE_ENV === 'development') {
      this.initializeDefaultData();
    }
  }

  private initializeDefaultData() {
    // Create default organization for testing
    const defaultOrg: Organization = {
      id: "test-org-123",
      name: "Test Organization",
      subdomain: "test",
      plan: "enterprise",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.organizations.set(defaultOrg.id, defaultOrg);
  }

  /**
   * Helper method to add a user's organization membership for testing
   * Call this when a user first authenticates to grant them access
   */
  async ensureUserOrgMembership(userId: string, organizationId: string = "test-org-123", role: string = "owner"): Promise<OrgMembership> {
    // Check if membership already exists
    const existing = await this.getUserOrgMembership(userId, organizationId);
    if (existing) {
      return existing;
    }

    // Create new membership
    const membership: OrgMembership = {
      id: randomUUID(),
      organizationId,
      userId,
      role: role as any,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.orgMemberships.set(membership.id, membership);
    console.log(`[STORAGE] Created org membership: user ${userId} -> org ${organizationId} as ${role}`);
    return membership;
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

  async getGeneratedApplicationsByOrganization(organizationId: string): Promise<GeneratedApplication[]> {
    return Array.from(this.generatedApplications.values())
      .filter(app => app.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  async listWorkflowExecutionsByOrg(userId: string, organizationId: string): Promise<WorkflowExecution[]> {
    // SECURITY CRITICAL: Filter executions by organization to prevent cross-tenant data exposure
    const executions = Array.from(this.workflowExecutions.values())
      .filter(execution => {
        // First filter by user
        if (execution.userId !== userId) return false;
        
        // Then check if the execution's application belongs to the organization
        const app = this.generatedApplications.get(execution.generatedApplicationId);
        return app && app.organizationId === organizationId;
      });

    return executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteWorkflowExecution(id: string): Promise<boolean> {
    return this.workflowExecutions.delete(id);
  }

  // ===== AUTHORIZATION & RBAC OPERATIONS =====
  
  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(organizationData: InsertOrganization): Promise<Organization> {
    const organization: Organization = {
      id: randomUUID(),
      name: organizationData.name,
      subdomain: organizationData.subdomain || null,
      plan: organizationData.plan || "starter",
      isActive: organizationData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.organizations.set(organization.id, organization);
    return organization;
  }

  async listUserOrganizations(userId: string): Promise<Organization[]> {
    const userMemberships = Array.from(this.orgMemberships.values())
      .filter(membership => membership.userId === userId && membership.isActive);
    
    const organizations: Organization[] = [];
    for (const membership of userMemberships) {
      const org = this.organizations.get(membership.organizationId);
      if (org && org.isActive) {
        organizations.push(org);
      }
    }
    
    return organizations;
  }

  async getUserOrgMembership(userId: string, organizationId: string): Promise<OrgMembership | undefined> {
    return Array.from(this.orgMemberships.values())
      .find(membership => 
        membership.userId === userId && 
        membership.organizationId === organizationId &&
        membership.isActive
      );
  }

  async addOrgMembership(membershipData: InsertOrgMembership): Promise<OrgMembership> {
    const membership: OrgMembership = {
      id: randomUUID(),
      organizationId: membershipData.organizationId,
      userId: membershipData.userId,
      role: membershipData.role,
      isActive: membershipData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.orgMemberships.set(membership.id, membership);
    return membership;
  }

  async removeOrgMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.getUserOrgMembership(userId, organizationId);
    if (membership) {
      return this.orgMemberships.delete(membership.id);
    }
    return false;
  }

  async listOrgMembers(organizationId: string): Promise<OrgMembership[]> {
    return Array.from(this.orgMemberships.values())
      .filter(membership => 
        membership.organizationId === organizationId &&
        membership.isActive
      );
  }

  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    // Get user's organization membership
    const membership = await this.getUserOrgMembership(userId, organizationId);
    if (!membership) {
      return []; // No membership = no permissions
    }

    // For now, return built-in role permissions
    // This would be enhanced later to include custom role bindings
    return this.getBuiltInRolePermissions(membership.role);
  }

  async hasOrgMembership(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.getUserOrgMembership(userId, organizationId);
    return membership !== undefined;
  }

  // Helper method to get built-in role permissions
  private getBuiltInRolePermissions(role: string): string[] {
    // Import permission constants from authorization middleware
    const rolePermissions = {
      owner: [
        "org:read", "org:write", "org:delete", "org:admin",
        "user:read", "user:write", "user:delete", "user:invite",
        "role:read", "role:write", "role:delete", "role:bind",
        "task:read", "task:write", "task:delete", "task:assign",
        "approval:read", "approval:write", "approval:approve", "approval:reject",
        "integration:read", "integration:write", "integration:delete", "integration:execute",
        "workflow:read", "workflow:write", "workflow:delete", "workflow:execute",
        "report:read", "report:write", "report:delete", "report:export",
        "analytics:read", "audit:read"
      ],
      admin: [
        "org:read", "org:write",
        "user:read", "user:write", "user:invite",
        "role:read", "role:write", "role:bind",
        "task:read", "task:write", "task:assign",
        "approval:read", "approval:write", "approval:approve",
        "integration:read", "integration:write", "integration:execute",
        "workflow:read", "workflow:write", "workflow:execute",
        "report:read", "report:write", "report:export",
        "analytics:read", "audit:read"
      ],
      manager: [
        "org:read",
        "user:read",
        "task:read", "task:write", "task:assign",
        "approval:read", "approval:write", "approval:approve",
        "integration:read", "integration:execute",
        "workflow:read", "workflow:execute",
        "report:read", "report:write"
      ],
      contributor: [
        "org:read",
        "user:read",
        "task:read", "task:write",
        "approval:read",
        "integration:read",
        "workflow:read",
        "report:read"
      ],
      viewer: [
        "org:read",
        "user:read",
        "task:read",
        "approval:read",
        "integration:read",
        "workflow:read",
        "report:read"
      ]
    };

    return rolePermissions[role as keyof typeof rolePermissions] || [];
  }
}

export const storage = new MemStorage();
