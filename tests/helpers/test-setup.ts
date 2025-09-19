import { vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { MemStorage } from "../../server/storage";
import { 
  testOrganizations, 
  testUsers, 
  testOrgMemberships,
  testBusinessRequirements,
  testGeneratedApplications,
  testEmbeddedChatbots,
  testWorkflowExecutions,
  mockSessionData,
  type MockSessionData
} from "../fixtures/multi-tenant-fixtures";

/**
 * Test setup utilities for Enterprise AI Application Platform testing
 * Provides comprehensive mocking for multi-tenant authentication, storage, and external services
 */

// Mock session data type
export type MockSessionType = typeof mockSessionData;

/**
 * Mock authentication middleware that injects test session data
 */
export function createMockAuthMiddleware(sessionData?: any) {
  return vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Mock isAuthenticated middleware behavior
    req.isAuthenticated = vi.fn(() => true);
    
    // Inject session data
    if (sessionData) {
      req.user = sessionData.user;
      req.session = {
        organizationId: sessionData.organizationId,
        role: sessionData.role,
        permissions: sessionData.permissions,
        ...req.session
      };
    }
    
    next();
  });
}

/**
 * Mock authorization middleware that validates organization access
 */
export function createMockAuthorizationMiddleware() {
  return {
    requireOrganization: vi.fn((req: Request, res: Response, next: NextFunction) => {
      const organizationId = req.headers['x-organization-id'] || req.session?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: "Organization context required" });
      }
      req.organizationId = organizationId as string;
      next();
    }),
    
    requirePermissions: (permissions: string[]) => 
      vi.fn((req: Request, res: Response, next: NextFunction) => {
        const userPermissions = req.session?.permissions || [];
        const hasPermission = permissions.every(p => 
          userPermissions.includes(p) || userPermissions.includes("*")
        );
        
        if (!hasPermission) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        next();
      }),
      
    workflowAuth: vi.fn((req: Request, res: Response, next: NextFunction) => {
      // Mock workflow ownership validation
      const workflowId = req.params.workflowId || req.body.workflowId;
      const userId = req.user?.id;
      const organizationId = req.organizationId;
      
      if (!workflowId || !userId || !organizationId) {
        return res.status(403).json({ error: "Workflow access denied" });
      }
      next();
    })
  };
}

/**
 * Setup in-memory storage with test data for multi-tenant isolation testing
 */
export async function setupTestStorage(): Promise<MemStorage> {
  const storage = new MemStorage();
  
  // Setup organizations
  for (const org of testOrganizations) {
    await storage.createOrganization(org);
  }
  
  // Setup users
  for (const user of testUsers) {
    await storage.upsertUser(user);
  }
  
  // Setup organization memberships
  for (const membership of testOrgMemberships) {
    await storage.addOrgMembership(membership);
  }
  
  // Setup business requirements
  for (const requirement of testBusinessRequirements) {
    await storage.createBusinessRequirement(requirement);
  }
  
  // Setup generated applications
  for (const app of testGeneratedApplications) {
    await storage.createGeneratedApplication(app);
  }
  
  // Setup embedded chatbots
  for (const chatbot of testEmbeddedChatbots) {
    await storage.createEmbeddedChatbot(chatbot);
  }
  
  // Setup workflow executions
  for (const execution of testWorkflowExecutions) {
    await storage.createWorkflowExecution(execution);
  }
  
  return storage;
}

/**
 * Mock OpenAI service for AI service testing
 */
export function createMockOpenAI() {
  const mockOpenAI = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              function_call: {
                arguments: JSON.stringify({
                  processes: [
                    {
                      name: "test_process",
                      type: "business_process",
                      description: "Test business process",
                      complexity: "medium"
                    }
                  ],
                  forms: [
                    {
                      name: "test_form",
                      purpose: "Test form",
                      complexity: "low",
                      dataTypes: ["text", "email"]
                    }
                  ],
                  approvals: [
                    {
                      name: "manager_approval",
                      role: "manager",
                      criteria: "Standard approval",
                      timeLimit: "24h"
                    }
                  ],
                  integrations: [],
                  confidence: 0.85
                })
              }
            }
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        })
      }
    }
  };
  
  return mockOpenAI;
}

/**
 * Mock WebSocket for streaming tests
 */
export function createMockWebSocket() {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  
  return mockWs;
}

/**
 * Mock external services for integration testing
 */
export function createMockExternalServices() {
  return {
    emailService: {
      sendEmail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
      sendNotification: vi.fn().mockResolvedValue({ sent: true })
    },
    
    smsService: {
      sendSMS: vi.fn().mockResolvedValue({ messageId: "test-sms-id" }),
      sendAlert: vi.fn().mockResolvedValue({ sent: true })
    },
    
    webhookService: {
      triggerWebhook: vi.fn().mockResolvedValue({ status: "delivered" }),
      validateWebhook: vi.fn().mockResolvedValue({ valid: true })
    },
    
    backgroundCheckService: {
      initiateCheck: vi.fn().mockResolvedValue({ 
        checkId: "bg-check-123", 
        status: "pending", 
        estimatedCompletion: "72h" 
      }),
      getCheckStatus: vi.fn().mockResolvedValue({ 
        status: "completed", 
        result: "clear" 
      })
    }
  };
}

/**
 * Performance test helpers
 */
export const performanceHelpers = {
  /**
   * Measure API response time and validate SLA compliance (<200ms)
   */
  async measureApiResponseTime<T>(apiCall: () => Promise<T>): Promise<{
    result: T;
    responseTime: number;
    withinSLA: boolean;
  }> {
    const startTime = performance.now();
    const result = await apiCall();
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      result,
      responseTime,
      withinSLA: responseTime < 200 // <200ms SLA requirement
    };
  },
  
  /**
   * Simulate concurrent user load
   */
  async simulateConcurrentUsers(userCount: number, operation: () => Promise<any>) {
    const operations = Array(userCount).fill(null).map(() => operation());
    const startTime = performance.now();
    const results = await Promise.allSettled(operations);
    const endTime = performance.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const totalTime = endTime - startTime;
    
    return {
      totalUsers: userCount,
      successful,
      failed,
      totalTime,
      averageResponseTime: totalTime / userCount,
      errorRate: (failed / userCount) * 100
    };
  }
};

/**
 * AI service testing helpers
 */
export const aiServiceHelpers = {
  /**
   * Mock AI service availability checks
   */
  mockAIServiceAvailable: (available: boolean = true) => {
    if (available) {
      process.env.OPENAI_API_KEY = "test-key";
      // Mock successful OpenAI response
      vi.doMock("openai", () => ({
        default: vi.fn(() => ({
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [{ message: { content: "test" } }]
              })
            }
          }
        }))
      }));
    } else {
      delete process.env.OPENAI_API_KEY;
      // Mock OpenAI failure or no key
      vi.doMock("openai", () => ({
        default: vi.fn(() => ({
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error("API key not configured"))
            }
          }
        }))
      }));
    }
    return vi.fn().mockResolvedValue(available);
  },

  /**
   * Reset AI service mocks
   */
  resetAIServiceMocks: () => {
    vi.doUnmock("openai");
    delete process.env.OPENAI_API_KEY;
  },
  
  /**
   * Validate NLP parsing accuracy against golden dataset
   */
  validateNLPAccuracy: (actual: any, expected: any) => {
    const extractF1Score = (actualEntities: any[], expectedEntities: any[]) => {
      const actualSet = new Set(actualEntities.map(e => e.name || e));
      const expectedSet = new Set(expectedEntities.map(e => e.name || e));
      
      const intersection = new Set([...actualSet].filter(x => expectedSet.has(x)));
      const precision = intersection.size / actualSet.size;
      const recall = intersection.size / expectedSet.size;
      
      return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    };
    
    return {
      processesF1: extractF1Score(actual.processes || [], expected.processes || []),
      formsF1: extractF1Score(actual.forms || [], expected.forms || []),
      approvalsF1: extractF1Score(actual.approvals || [], expected.approvals || []),
      integrationsF1: extractF1Score(actual.integrations || [], expected.integrations || []),
      confidenceScore: actual.confidence || 0
    };
  },
  
  /**
   * Test chatbot response quality rubric
   */
  evaluateChatbotResponse: (response: string, context: any) => {
    const rubric = {
      helpfulness: response.length > 10 && response.includes("help") ? 4 : 2,
      relevance: context && response.toLowerCase().includes(context.toLowerCase()) ? 4 : 2,
      safety: !response.includes("unsafe") && !response.includes("inappropriate") ? 5 : 1,
      accuracy: response.includes("accurate") || response.includes("correct") ? 4 : 3
    };
    
    const averageScore = Object.values(rubric).reduce((a, b) => a + b, 0) / Object.keys(rubric).length;
    
    return {
      ...rubric,
      averageScore,
      passesThreshold: averageScore >= 3.5 // Required threshold
    };
  }
};

/**
 * Database isolation test helpers
 */
export const isolationHelpers = {
  /**
   * Verify cross-tenant data isolation
   */
  async verifyDataIsolation(storage: MemStorage, orgAId: string, orgBId: string) {
    // Test business requirements isolation
    const orgARequirements = await storage.listBusinessRequirements("user-admin-org-a");
    const orgBRequirements = await storage.listBusinessRequirements("user-admin-org-b");
    
    const hasOrgAData = orgARequirements.some(req => req.organizationId === orgAId);
    const hasOrgBData = orgBRequirements.some(req => req.organizationId === orgBId);
    const hasOrgAInOrgB = orgBRequirements.some(req => req.organizationId === orgAId);
    const hasOrgBInOrgA = orgARequirements.some(req => req.organizationId === orgBId);
    
    return {
      orgAHasOwnData: hasOrgAData,
      orgBHasOwnData: hasOrgBData,
      crossTenantLeakage: hasOrgAInOrgB || hasOrgBInOrgA,
      isolationMaintained: !hasOrgAInOrgB && !hasOrgBInOrgA
    };
  },
  
  /**
   * Test authorization enforcement
   */
  async testAuthorizationMatrix(
    storage: MemStorage, 
    userId: string, 
    role: string,
    operation: string,
    resourceId: string
  ) {
    // This would integrate with RBAC permission checking
    const permissions = mockSessionData.orgA[role as keyof typeof mockSessionData.orgA]?.permissions || [];
    const hasPermission = permissions.includes("*") || permissions.includes(operation);
    
    return {
      userId,
      role,
      operation,
      hasPermission,
      authorized: hasPermission
    };
  }
};

/**
 * Comprehensive test cleanup helper
 */
export async function cleanupTestData(storage: MemStorage) {
  // Clear all test data in reverse dependency order
  // Note: In real implementation, this would use proper cascade delete
  try {
    // Clear workflow executions
    for (const execution of testWorkflowExecutions) {
      await storage.deleteWorkflowExecution(execution.id);
    }
    
    // Clear chatbots
    for (const chatbot of testEmbeddedChatbots) {
      await storage.deleteEmbeddedChatbot(chatbot.id);
    }
    
    // Clear applications
    for (const app of testGeneratedApplications) {
      await storage.deleteGeneratedApplication(app.id);
    }
    
    // Clear business requirements
    for (const req of testBusinessRequirements) {
      await storage.deleteBusinessRequirement(req.id);
    }
    
    console.log("✅ Test data cleanup completed");
  } catch (error) {
    console.warn("⚠️ Test cleanup encountered issues:", error);
  }
}

/**
 * Global test configuration
 */

export const testConfig = {
  slaResponseTime: 200, // milliseconds
  generationTimeLimit: 15 * 60 * 1000, // 15 minutes in milliseconds
  concurrentUserLimit: 200,
  maxErrorRate: 1, // 1% max error rate
  minAIAccuracy: 0.75, // 75% F1 score minimum
  minChatbotQuality: 3.5, // 3.5/5 rubric score minimum
};