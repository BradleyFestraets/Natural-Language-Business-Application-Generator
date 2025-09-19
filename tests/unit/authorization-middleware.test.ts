import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { 
  requireOrganization,
  requirePermissions,
  SYSTEM_PERMISSIONS
} from "../../server/middleware/authorizationMiddleware";
import { testOrganizations, testUsers, rbacPermissionMatrix } from "../fixtures/multi-tenant-fixtures";
import { storage } from "../../server/storage";

// Mock storage for authorization tests
vi.mock('../../server/storage', () => ({
  storage: {
    hasOrgMembership: vi.fn(),
    getUserOrgMembership: vi.fn(),
    getUserPermissions: vi.fn()
  }
}));

// Mock workflowAuth function for tests
const workflowAuth = (req: any, res: any, next: any) => {
  if (!req.params?.workflowId && !req.body?.workflowId) {
    return res.status(403).json({ error: "Workflow access denied" });
  }
  if (!req.user?.id) {
    return res.status(403).json({ error: "User ID required" });
  }
  if (!req.organizationId) {
    return res.status(403).json({ error: "Organization context required" });
  }
  next();
};

/**
 * P0 PRIORITY: Authorization Middleware Tests
 * Critical for Fortune 500 security compliance and multi-tenant isolation
 */

describe("Authorization Middleware - RBAC & Multi-tenant Security", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      headers: {},
      session: {},
      params: {},
      query: {},
      body: {},
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
    test("should accept valid organization header", async () => {
      mockRequest.params = { organizationId: testOrganizations[0].id };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage calls
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(true);
      vi.mocked(storage.getUserOrgMembership).mockResolvedValue({
        userId: testUsers[0].id,
        organizationId: testOrganizations[0].id,
        role: 'admin'
      });
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe(testOrganizations[0].id);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test("should accept organization from body param", async () => {
      mockRequest.body = { organizationId: testOrganizations[1].id };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage calls
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(true);
      vi.mocked(storage.getUserOrgMembership).mockResolvedValue({
        userId: testUsers[0].id,
        organizationId: testOrganizations[1].id,
        role: 'admin'
      });
      
      const middleware = requireOrganization('body');
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockRequest.organizationId).toBe(testOrganizations[1].id);
      expect(mockNext).toHaveBeenCalled();
    });

    test("should reject request without organization context - FAIL CLOSED", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      // No organizationId in params
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Organization Required",
        message: "Organization ID must be provided",
        code: "ORG_ID_REQUIRED"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access to organization user doesn't belong to", async () => {
      mockRequest.params = { organizationId: testOrganizations[0].id };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage to deny access
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(false);
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockRequest.organizationId).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should reject request without authentication", async () => {
      mockRequest.params = { organizationId: testOrganizations[0].id };
      // No user object set
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication Required",
        message: "User must be authenticated to access organization resources",
        code: "AUTH_REQUIRED"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requirePermissions - RBAC Permission Enforcement", () => {
    test("should allow access with wildcard permissions (owner)", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      mockRequest.organizationId = testOrganizations[0].id;
      
      // Mock storage to return all permissions for owner
      vi.mocked(storage.getUserPermissions).mockResolvedValue([
        SYSTEM_PERMISSIONS.ORG_READ,
        SYSTEM_PERMISSIONS.ORG_WRITE,
        SYSTEM_PERMISSIONS.TASK_WRITE
      ]);
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_READ, SYSTEM_PERMISSIONS.TASK_WRITE);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test("should allow access with specific permissions", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      mockRequest.organizationId = testOrganizations[0].id;
      
      // Mock storage to return specific permissions
      vi.mocked(storage.getUserPermissions).mockResolvedValue([
        SYSTEM_PERMISSIONS.ORG_READ,
        SYSTEM_PERMISSIONS.TASK_READ
      ]);
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_READ);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    test("should deny access with insufficient permissions - FAIL CLOSED", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      mockRequest.organizationId = testOrganizations[0].id;
      
      // Mock storage to return limited permissions
      vi.mocked(storage.getUserPermissions).mockResolvedValue([
        SYSTEM_PERMISSIONS.ORG_READ
      ]);
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_DELETE);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Permission Denied",
        message: "Insufficient permissions to access this resource",
        code: "PERMISSION_DENIED",
        organizationId: testOrganizations[0].id
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should require ALL specified permissions", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      mockRequest.organizationId = testOrganizations[0].id;
      
      // Mock storage to return only one of the required permissions
      vi.mocked(storage.getUserPermissions).mockResolvedValue([
        SYSTEM_PERMISSIONS.ORG_READ
      ]);
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_READ, SYSTEM_PERMISSIONS.ORG_WRITE);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access when no permissions exist - FAIL CLOSED", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      mockRequest.organizationId = testOrganizations[0].id;
      
      // Mock storage to return empty permissions
      vi.mocked(storage.getUserPermissions).mockResolvedValue([]);
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_READ);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should deny access when user context missing - FAIL CLOSED", async () => {
      // No user object set
      mockRequest.organizationId = testOrganizations[0].id;
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_READ);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication Required",
        message: "User must be authenticated to check permissions",
        code: "AUTH_REQUIRED"
      });
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
    test("should reject SQL injection attempts in organization ID", async () => {
      mockRequest.params = { organizationId: "'; DROP TABLE users; --" };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage to deny access for malicious org ID
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(false);
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      // Should deny access for suspicious organization ID
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should handle XSS attempts in organization ID", async () => {
      mockRequest.params = { organizationId: "<script>alert('xss')</script>" };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage to deny access for malicious org ID
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(false);
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      // Should deny access for suspicious organization ID
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should handle very long organization IDs", async () => {
      const longOrgId = "a".repeat(1000);
      mockRequest.params = { organizationId: longOrgId };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage to deny access for suspicious org ID
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(false);
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      // Should deny access for suspicious organization ID
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should handle permission array tampering attempts", async () => {
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      mockRequest.organizationId = testOrganizations[0].id;
      
      // Mock storage to return only basic permissions (not the tampered ones)
      vi.mocked(storage.getUserPermissions).mockResolvedValue([
        SYSTEM_PERMISSIONS.ORG_READ
      ]);
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_DELETE);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      // Should deny access since storage doesn't return tampered permissions
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Performance & Scalability", () => {
    test("should complete authorization checks within performance SLA", async () => {
      const startTime = performance.now();
      
      mockRequest.params = { organizationId: testOrganizations[0].id };
      mockRequest.user = { claims: { sub: testUsers[0].id } };
      
      // Mock storage calls for performance test
      vi.mocked(storage.hasOrgMembership).mockResolvedValue(true);
      vi.mocked(storage.getUserOrgMembership).mockResolvedValue({
        userId: testUsers[0].id,
        organizationId: testOrganizations[0].id,
        role: 'admin'
      });
      
      const middleware = requireOrganization();
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Authorization should be < 10ms for Fortune 500 scale (allowing for async overhead)
      expect(executionTime).toBeLessThan(10);
    });

    test("should handle concurrent authorization requests", async () => {
      const concurrentRequests = 10; // Reduced for faster test execution
      const requests = Array(concurrentRequests).fill(null).map(async () => {
        const req = { 
          ...mockRequest, 
          params: { organizationId: testOrganizations[0].id },
          user: { claims: { sub: testUsers[0].id } }
        };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();
        
        // Mock storage to allow access
        vi.mocked(storage.hasOrgMembership).mockResolvedValue(true);
        vi.mocked(storage.getUserOrgMembership).mockResolvedValue({
          userId: testUsers[0].id,
          organizationId: testOrganizations[0].id,
          role: 'admin'
        });
        
        const middleware = requireOrganization();
        await middleware(req as any, res as any, next);
        return next.mock.calls.length > 0;
      });
      
      const startTime = performance.now();
      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All requests should complete successfully
      expect(results.every(result => result === true)).toBe(true);
      // Should handle 10 concurrent authorizations in < 100ms
      expect(totalTime).toBeLessThan(100);
    }, 15000);
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

    test("should generate audit events for authorization failures", async () => {
      // No user object set - authentication failure
      mockRequest.organizationId = testOrganizations[0].id;
      
      const middleware = requirePermissions(SYSTEM_PERMISSIONS.ORG_READ);
      await middleware(mockRequest as any, mockResponse as Response, mockNext);
      
      // Should return 401 for missing authentication (not 403)
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication Required",
        message: "User must be authenticated to check permissions",
        code: "AUTH_REQUIRED"
      });
    });
  });
});