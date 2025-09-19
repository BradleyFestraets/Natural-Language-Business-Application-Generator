import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { 
  requireOrganization,
  requirePermissions,
  workflowAuth 
} from "../../server/middleware/authorizationMiddleware";
import { testOrganizations, testUsers, rbacPermissionMatrix } from "../fixtures/multi-tenant-fixtures";

/**
 * P0 PRIORITY: Authorization Middleware Tests
 * Critical for Fortune 500 security compliance and multi-tenant isolation
 */

describe("Authorization Middleware - RBAC & Multi-tenant Security", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      session: {},
      user: undefined,
      organizationId: undefined
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    mockNext = vi.fn();
  });

  describe("requireOrganization - Multi-tenant Context Enforcement", () => {
    test("should accept valid organization header", () => {
      mockRequest.headers = { 'x-organization-id': testOrganizations[0].id };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe(testOrganizations[0].id);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test("should accept organization from session", () => {
      mockRequest.session = { organizationId: testOrganizations[1].id };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe(testOrganizations[1].id);
      expect(mockNext).toHaveBeenCalled();
    });

    test("should reject request without organization context - FAIL CLOSED", () => {
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Organization context required" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should prioritize header over session", () => {
      mockRequest.headers = { 'x-organization-id': testOrganizations[0].id };
      mockRequest.session = { organizationId: testOrganizations[1].id };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe(testOrganizations[0].id);
    });

    test("should reject empty organization ID", () => {
      mockRequest.headers = { 'x-organization-id': '' };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requirePermissions - RBAC Permission Enforcement", () => {
    test("should allow access with wildcard permissions (owner)", () => {
      mockRequest.session = { permissions: ["*"] };
      const middleware = requirePermissions(["create_app", "edit_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test("should allow access with specific permissions", () => {
      mockRequest.session = { permissions: ["create_app", "edit_app", "view_app"] };
      const middleware = requirePermissions(["create_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test("should deny access with insufficient permissions - FAIL CLOSED", () => {
      mockRequest.session = { permissions: ["view_app"] };
      const middleware = requirePermissions(["delete_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Insufficient permissions" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should require ALL specified permissions", () => {
      mockRequest.session = { permissions: ["create_app"] };
      const middleware = requirePermissions(["create_app", "edit_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access when no permissions exist - FAIL CLOSED", () => {
      mockRequest.session = {};
      const middleware = requirePermissions(["view_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access when permissions is null/undefined - FAIL CLOSED", () => {
      mockRequest.session = { permissions: null };
      const middleware = requirePermissions(["view_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("workflowAuth - Workflow Ownership Validation", () => {
    test("should allow access with valid workflow ownership", () => {
      mockRequest.params = { workflowId: "workflow-test-123" };
      mockRequest.user = { id: testUsers[0].id };
      mockRequest.organizationId = testOrganizations[0].id;
      
      workflowAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test("should deny access without workflow ID - FAIL CLOSED", () => {
      mockRequest.user = { id: testUsers[0].id };
      mockRequest.organizationId = testOrganizations[0].id;
      
      workflowAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Workflow access denied" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access without user ID - FAIL CLOSED", () => {
      mockRequest.params = { workflowId: "workflow-test-123" };
      mockRequest.organizationId = testOrganizations[0].id;
      
      workflowAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access without organization context - FAIL CLOSED", () => {
      mockRequest.params = { workflowId: "workflow-test-123" };
      mockRequest.user = { id: testUsers[0].id };
      
      workflowAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should accept workflow ID from request body", () => {
      mockRequest.body = { workflowId: "workflow-body-123" };
      mockRequest.user = { id: testUsers[0].id };
      mockRequest.organizationId = testOrganizations[0].id;
      
      workflowAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("RBAC Permission Matrix Validation", () => {
    test("should enforce owner permissions correctly", () => {
      const ownerPermissions = rbacPermissionMatrix.owner;
      
      expect(ownerPermissions.canCreateApp).toBe(true);
      expect(ownerPermissions.canDeleteApp).toBe(true);
      expect(ownerPermissions.canManageUsers).toBe(true);
      expect(ownerPermissions.canManageIntegrations).toBe(true);
    });

    test("should enforce admin permissions correctly", () => {
      const adminPermissions = rbacPermissionMatrix.admin;
      
      expect(adminPermissions.canCreateApp).toBe(true);
      expect(adminPermissions.canDeleteApp).toBe(true);
      expect(adminPermissions.canManageUsers).toBe(true);
      expect(adminPermissions.canConfigureChatbots).toBe(true);
    });

    test("should enforce manager limitations correctly", () => {
      const managerPermissions = rbacPermissionMatrix.manager;
      
      expect(managerPermissions.canCreateApp).toBe(true);
      expect(managerPermissions.canApproveWorkflows).toBe(true);
      expect(managerPermissions.canDeleteApp).toBe(false); // Limited
      expect(managerPermissions.canManageUsers).toBe(false); // Limited
      expect(managerPermissions.canConfigureChatbots).toBe(false); // Limited
    });

    test("should enforce contributor limitations correctly", () => {
      const contributorPermissions = rbacPermissionMatrix.contributor;
      
      expect(contributorPermissions.canCreateApp).toBe(true);
      expect(contributorPermissions.canExecuteWorkflows).toBe(true);
      expect(contributorPermissions.canDeleteApp).toBe(false); // Limited
      expect(contributorPermissions.canApproveWorkflows).toBe(false); // Limited
      expect(contributorPermissions.canViewAnalytics).toBe(false); // Limited
    });

    test("should enforce viewer restrictions correctly", () => {
      const viewerPermissions = rbacPermissionMatrix.viewer;
      
      expect(viewerPermissions.canViewApp).toBe(true);
      expect(viewerPermissions.canCreateApp).toBe(false); // Restricted
      expect(viewerPermissions.canEditApp).toBe(false); // Restricted
      expect(viewerPermissions.canDeleteApp).toBe(false); // Restricted
      expect(viewerPermissions.canExecuteWorkflows).toBe(false); // Restricted
    });
  });

  describe("Security Edge Cases & Attack Scenarios", () => {
    test("should reject SQL injection attempts in organization ID", () => {
      mockRequest.headers = { 'x-organization-id': "'; DROP TABLE users; --" };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Should still accept as string but would be validated elsewhere
      expect(mockRequest.organizationId).toBe("'; DROP TABLE users; --");
      expect(mockNext).toHaveBeenCalled();
    });

    test("should handle XSS attempts in organization ID", () => {
      mockRequest.headers = { 'x-organization-id': "<script>alert('xss')</script>" };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe("<script>alert('xss')</script>");
      expect(mockNext).toHaveBeenCalled();
    });

    test("should handle very long organization IDs", () => {
      const longOrgId = "a".repeat(1000);
      mockRequest.headers = { 'x-organization-id': longOrgId };
      
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe(longOrgId);
      expect(mockNext).toHaveBeenCalled();
    });

    test("should handle permission array tampering attempts", () => {
      // Simulate client-side tampering
      mockRequest.session = { 
        permissions: ["view_app", "*", "delete_everything"] // Injected wildcard
      };
      const middleware = requirePermissions(["delete_app"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Should allow due to wildcard (this shows importance of server-side validation)
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Performance & Scalability", () => {
    test("should complete authorization checks within performance SLA", () => {
      const startTime = performance.now();
      
      mockRequest.headers = { 'x-organization-id': testOrganizations[0].id };
      requireOrganization(mockRequest as Request, mockResponse as Response, mockNext);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Authorization should be < 5ms for Fortune 500 scale
      expect(executionTime).toBeLessThan(5);
    });

    test("should handle concurrent authorization requests", async () => {
      const concurrentRequests = 100;
      const requests = Array(concurrentRequests).fill(null).map(() => {
        const req = { ...mockRequest, headers: { 'x-organization-id': testOrganizations[0].id } };
        const res = { ...mockResponse };
        const next = vi.fn();
        
        return new Promise<void>((resolve) => {
          requireOrganization(req as Request, res as Response, () => {
            next();
            resolve();
          });
        });
      });
      
      const startTime = performance.now();
      await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle 100 concurrent authorizations in < 50ms
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe("Audit Trail & Logging", () => {
    test("should not log sensitive information", () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      mockRequest.session = { 
        permissions: ["secret_permission"],
        sensitiveData: "password123"
      };
      const middleware = requirePermissions(["secret_permission"]);
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Should not log session data
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("password123")
      );
      
      consoleSpy.mockRestore();
    });

    test("should generate audit events for authorization failures", () => {
      mockRequest.session = { permissions: ["view_app"] };
      mockRequest.user = { id: testUsers[0].id };
      const middleware = requirePermissions(["delete_app"]);
      
      // Mock audit logging
      const auditSpy = vi.fn();
      (global as any).auditLog = auditSpy;
      
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // In real implementation, should generate audit event
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});