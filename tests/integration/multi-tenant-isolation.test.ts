import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { MemStorage } from "../../server/storage";
import { registerRoutes } from "../../server/routes";
import { 
  testOrganizations, 
  testUsers, 
  testOrgMemberships,
  testBusinessRequirements,
  testGeneratedApplications,
  testWorkflowExecutions,
  mockSessionData
} from "../fixtures/multi-tenant-fixtures";
import { setupTestStorage, createMockAuthMiddleware } from "../helpers/test-setup";

/**
 * P0 PRIORITY: Multi-tenant Isolation Tests
 * Critical for preventing cross-organization data leakage in Fortune 500 environments
 */

describe("Multi-tenant Data Isolation - Enterprise Security", () => {
  let app: express.Application;
  let storage: MemStorage;
  let server: any;

  beforeEach(async () => {
    // Setup test application with multi-tenant data
    app = express();
    app.use(express.json());
    
    // Setup storage with test data
    storage = await setupTestStorage();
    
    // Mock authentication for consistent testing
    app.use((req, res, next) => {
      req.isAuthenticated = () => true;
      next();
    });
    
    server = await registerRoutes(app, storage, { disableAuth: true });
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("Business Requirements Isolation", () => {
    test("Organization A cannot access Organization B requirements", async () => {
      // Try to access Org B requirement from Org A context
      const response = await request(app)
        .get(`/api/business-requirements/${testBusinessRequirements[1].id}`) // Org B requirement
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id) // Org A context
        .expect(404); // Should not be found due to isolation

      expect(response.body.error).toMatch(/not found|access denied/i);
    });

    test("Organization B cannot access Organization A requirements", async () => {
      const response = await request(app)
        .get(`/api/business-requirements/${testBusinessRequirements[0].id}`) // Org A requirement
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[1].id) // Org B context
        .expect(404);

      expect(response.body.error).toMatch(/not found|access denied/i);
    });

    test("Organization A can access its own requirements", async () => {
      const response = await request(app)
        .get(`/api/business-requirements/${testBusinessRequirements[0].id}`) // Org A requirement
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id) // Org A context
        .expect(200);

      expect(response.body.id).toBe(testBusinessRequirements[0].id);
      expect(response.body.organizationId).toBe(testOrganizations[0].id);
    });

    test("List requirements only returns organization-scoped data", async () => {
      const orgAResponse = await request(app)
        .get('/api/business-requirements')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .expect(200);

      const orgBResponse = await request(app)
        .get('/api/business-requirements')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[1].id)
        .expect(200);

      // Org A should only see its own requirements
      expect(orgAResponse.body.every((req: any) => req.organizationId === testOrganizations[0].id)).toBe(true);
      
      // Org B should only see its own requirements
      expect(orgBResponse.body.every((req: any) => req.organizationId === testOrganizations[1].id)).toBe(true);
      
      // No cross-contamination
      const orgAIds = orgAResponse.body.map((req: any) => req.id);
      const orgBIds = orgBResponse.body.map((req: any) => req.id);
      expect(orgAIds.some((id: string) => orgBIds.includes(id))).toBe(false);
    });
  });

  describe("Generated Applications Isolation", () => {
    test("Cannot access cross-organization applications", async () => {
      const response = await request(app)
        .get(`/api/generated-applications/${testGeneratedApplications[1].id}`) // Org B app
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id) // Org A context
        .expect(404);

      expect(response.body.error).toMatch(/not found|access denied/i);
    });

    test("Application generation scoped to organization", async () => {
      const appData = {
        businessRequirementId: testBusinessRequirements[0].id, // Org A requirement
        name: "Cross-Org Test App",
        description: "Test application generation"
      };

      const response = await request(app)
        .post('/api/generate/application')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .send(appData)
        .expect(200);

      expect(response.body.organizationId).toBe(testOrganizations[0].id);
    });

    test("Cannot generate app using cross-organization requirement", async () => {
      const appData = {
        businessRequirementId: testBusinessRequirements[1].id, // Org B requirement
        name: "Unauthorized App",
        description: "Should fail due to cross-org requirement"
      };

      await request(app)
        .post('/api/generate/application')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id) // Org A context
        .send(appData)
        .expect(403); // Should be forbidden
    });
  });

  describe("Workflow Execution Isolation", () => {
    test("Cannot access cross-organization workflow executions", async () => {
      const response = await request(app)
        .get(`/api/workflow-executions/${testWorkflowExecutions[1].id}`) // Cross-org execution
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .expect(404);

      expect(response.body.error).toMatch(/not found|access denied/i);
    });

    test("Workflow execution creation enforces organization scope", async () => {
      const executionData = {
        generatedApplicationId: testGeneratedApplications[0].id, // Org A app
        workflowId: "test-workflow-123",
        currentStep: "initial_step",
        stepData: { test: "data" },
        status: "pending"
      };

      const response = await request(app)
        .post('/api/workflow-executions')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .send(executionData)
        .expect(201);

      // Should inherit organization from application
      expect(response.body.organizationId).toBe(testOrganizations[0].id);
    });

    test("Cannot create execution using cross-organization application", async () => {
      const executionData = {
        generatedApplicationId: testGeneratedApplications[1].id, // Org B app
        workflowId: "unauthorized-workflow",
        currentStep: "should_fail",
        status: "pending"
      };

      await request(app)
        .post('/api/workflow-executions')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id) // Org A context
        .send(executionData)
        .expect(403);
    });
  });

  describe("Embedded Chatbot Isolation", () => {
    test("Cannot access chatbots from different organizations", async () => {
      const response = await request(app)
        .get(`/api/chatbot/${testWorkflowExecutions[1].id}`) // Org B chatbot
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .expect(404);
    });

    test("Chatbot creation scoped to organization applications", async () => {
      const chatbotData = {
        generatedApplicationId: testGeneratedApplications[0].id, // Org A app
        name: "Test Assistant",
        systemPrompt: "You are a test assistant",
        capabilities: ["answer_questions"],
        aiModel: "gpt-4"
      };

      const response = await request(app)
        .post('/api/chatbot/create')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .send(chatbotData)
        .expect(201);

      // Should be associated with Org A
      expect(response.body.organizationId).toBe(testOrganizations[0].id);
    });

    test("Cannot create chatbot for cross-organization application", async () => {
      const chatbotData = {
        generatedApplicationId: testGeneratedApplications[1].id, // Org B app
        name: "Unauthorized Bot",
        systemPrompt: "Should not be created",
        aiModel: "gpt-4"
      };

      await request(app)
        .post('/api/chatbot/create')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id) // Org A context
        .send(chatbotData)
        .expect(403);
    });
  });

  describe("User Context & Session Isolation", () => {
    test("User sessions are organization-scoped", async () => {
      // Test with Org A user
      const orgAUserResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .set('x-user-id', testUsers[0].id) // Org A user
        .expect(200);

      expect(orgAUserResponse.body.organizationId).toBe(testOrganizations[0].id);
    });

    test("User cannot access different organization with valid session", async () => {
      // Org A user trying to access Org B
      await request(app)
        .get('/api/business-requirements')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[1].id) // Org B
        .set('x-user-id', testUsers[0].id) // Org A user
        .expect(403); // Should be forbidden
    });

    test("Organization membership validation", async () => {
      // Valid membership
      const validResponse = await request(app)
        .get('/api/organization/membership')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .set('x-user-id', testUsers[0].id) // Org A user
        .expect(200);

      expect(validResponse.body.role).toBe(testOrgMemberships[0].role);

      // Invalid membership
      await request(app)
        .get('/api/organization/membership')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[1].id) // Org B
        .set('x-user-id', testUsers[0].id) // Org A user
        .expect(403);
    });
  });

  describe("Database-Level Isolation Verification", () => {
    test("SQL queries are properly scoped with organizationId", async () => {
      // This would be tested with database query logging/monitoring
      // Simulating the concept here
      
      const orgARequirements = await storage.listBusinessRequirements(testUsers[0].id);
      const orgBRequirements = await storage.listBusinessRequirements(testUsers[5].id);

      // Verify no cross-tenant data leakage
      const orgAOrgIds = orgARequirements.map(req => req.organizationId);
      const orgBOrgIds = orgBRequirements.map(req => req.organizationId);

      expect(orgAOrgIds.every(id => id === testOrganizations[0].id)).toBe(true);
      expect(orgBOrgIds.every(id => id === testOrganizations[1].id)).toBe(true);
      expect(orgAOrgIds.some(id => orgBOrgIds.includes(id))).toBe(false);
    });

    test("Bulk operations respect organization boundaries", async () => {
      // Test bulk delete scenario
      const deleteResponse = await request(app)
        .delete('/api/business-requirements/bulk')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .send({ 
          ids: [
            testBusinessRequirements[0].id, // Org A (should delete)
            testBusinessRequirements[1].id  // Org B (should not delete)
          ]
        })
        .expect(200);

      // Only Org A requirement should be deleted
      expect(deleteResponse.body.deleted).toBe(1);
      expect(deleteResponse.body.failed).toBe(1);
    });
  });

  describe("API Endpoint Security Matrix", () => {
    const protectedEndpoints = [
      { method: 'GET', path: '/api/business-requirements', requiresOrg: true },
      { method: 'POST', path: '/api/business-requirements', requiresOrg: true },
      { method: 'GET', path: '/api/generated-applications', requiresOrg: true },
      { method: 'POST', path: '/api/generate/application', requiresOrg: true },
      { method: 'GET', path: '/api/workflow-executions', requiresOrg: true },
      { method: 'POST', path: '/api/workflow-executions', requiresOrg: true },
      { method: 'GET', path: '/api/chatbot/list', requiresOrg: true },
      { method: 'POST', path: '/api/chatbot/create', requiresOrg: true }
    ];

    test.each(protectedEndpoints)('$method $path enforces organization context', async ({ method, path }) => {
      const request_fn = request(app)[method.toLowerCase() as 'get' | 'post'];
      
      // Without organization header should fail
      await request_fn(path)
        .set('Authorization', 'Bearer mock-token')
        .expect(401);

      // With organization header should succeed (may still have other validation)
      const response = await request_fn(path)
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id);

      // Should not be 401 (may be 400, 403, etc. due to other validation)
      expect(response.status).not.toBe(401);
    });
  });

  describe("Performance Under Multi-tenant Load", () => {
    test("Multi-tenant queries maintain performance SLA", async () => {
      const concurrentRequests = 50;
      const orgARequests = Array(concurrentRequests / 2).fill(null).map(() => 
        request(app)
          .get('/api/business-requirements')
          .set('Authorization', 'Bearer mock-token')
          .set('x-organization-id', testOrganizations[0].id)
      );

      const orgBRequests = Array(concurrentRequests / 2).fill(null).map(() => 
        request(app)
          .get('/api/business-requirements')
          .set('Authorization', 'Bearer mock-token')
          .set('x-organization-id', testOrganizations[1].id)
      );

      const startTime = performance.now();
      const results = await Promise.allSettled([...orgARequests, ...orgBRequests]);
      const endTime = performance.now();

      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / concurrentRequests;

      // Should handle 50 concurrent multi-tenant requests efficiently
      expect(successfulRequests).toBeGreaterThan(40); // 80%+ success rate
      expect(averageResponseTime).toBeLessThan(200); // <200ms average
    });

    test("Organization switching does not cause performance degradation", async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const orgId = i % 2 === 0 ? testOrganizations[0].id : testOrganizations[1].id;
        
        const startTime = performance.now();
        await request(app)
          .get('/api/business-requirements')
          .set('Authorization', 'Bearer mock-token')
          .set('x-organization-id', orgId)
          .expect(200);
        const endTime = performance.now();
        
        responseTimes.push(endTime - startTime);
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      // Performance should be consistent regardless of organization switching
      expect(averageTime).toBeLessThan(100); // <100ms average
      expect(maxTime).toBeLessThan(200); // <200ms max
    });
  });

  describe("Audit & Compliance", () => {
    test("Cross-tenant access attempts are logged for audit", async () => {
      const auditSpy = vi.fn();
      (global as any).auditLogger = auditSpy;

      // Attempt cross-tenant access
      await request(app)
        .get(`/api/business-requirements/${testBusinessRequirements[1].id}`)
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .expect(404);

      // Should generate audit log (mocked)
      // In real implementation, this would verify audit trail
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cross_tenant_access_attempt',
          severity: 'HIGH',
          userId: expect.any(String),
          targetOrganization: testOrganizations[1].id,
          requestedResource: testBusinessRequirements[1].id
        })
      );
    });

    test("Data export respects organization boundaries", async () => {
      const exportResponse = await request(app)
        .post('/api/data/export')
        .set('Authorization', 'Bearer mock-token')
        .set('x-organization-id', testOrganizations[0].id)
        .send({ format: 'json', includeAll: true })
        .expect(200);

      // Exported data should only contain Org A data
      expect(exportResponse.body.organizationId).toBe(testOrganizations[0].id);
      expect(exportResponse.body.businessRequirements.every((req: any) => 
        req.organizationId === testOrganizations[0].id
      )).toBe(true);
    });
  });
});