/**
 * Authorization middleware for organization and role-based access control (RBAC)
 * Enforces multi-tenant security and permissions across the Enterprise Platform
 */

import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthorizedRequest extends Request {
  user: {
    claims: {
      sub: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
  };
  organizationId?: string;
  userPermissions?: string[];
  userRole?: string;
}

/**
 * Predefined system permissions for Enterprise features
 */
export const SYSTEM_PERMISSIONS = {
  // Organization Management
  ORG_READ: "org:read",
  ORG_WRITE: "org:write", 
  ORG_DELETE: "org:delete",
  ORG_ADMIN: "org:admin",
  
  // User Management
  USER_READ: "user:read",
  USER_WRITE: "user:write",
  USER_DELETE: "user:delete",
  USER_INVITE: "user:invite",
  
  // Role Management
  ROLE_READ: "role:read",
  ROLE_WRITE: "role:write",
  ROLE_DELETE: "role:delete",
  ROLE_BIND: "role:bind",
  
  // Task Management
  TASK_READ: "task:read",
  TASK_WRITE: "task:write",
  TASK_DELETE: "task:delete",
  TASK_ASSIGN: "task:assign",
  
  // Approval Management
  APPROVAL_READ: "approval:read",
  APPROVAL_WRITE: "approval:write",
  APPROVAL_APPROVE: "approval:approve",
  APPROVAL_REJECT: "approval:reject",
  
  // Integration Management
  INTEGRATION_READ: "integration:read",
  INTEGRATION_WRITE: "integration:write",
  INTEGRATION_DELETE: "integration:delete",
  INTEGRATION_EXECUTE: "integration:execute",
  
  // Workflow Management
  WORKFLOW_READ: "workflow:read",
  WORKFLOW_WRITE: "workflow:write",
  WORKFLOW_DELETE: "workflow:delete",
  WORKFLOW_EXECUTE: "workflow:execute",
  
  // Report Management
  REPORT_READ: "report:read",
  REPORT_WRITE: "report:write",
  REPORT_DELETE: "report:delete",
  REPORT_EXPORT: "report:export",
  
  // Analytics & Audit
  ANALYTICS_READ: "analytics:read",
  AUDIT_READ: "audit:read"
} as const;

/**
 * Built-in org membership role permissions mapping
 */
export const ORG_ROLE_PERMISSIONS = {
  owner: [
    SYSTEM_PERMISSIONS.ORG_READ, SYSTEM_PERMISSIONS.ORG_WRITE, SYSTEM_PERMISSIONS.ORG_DELETE, SYSTEM_PERMISSIONS.ORG_ADMIN,
    SYSTEM_PERMISSIONS.USER_READ, SYSTEM_PERMISSIONS.USER_WRITE, SYSTEM_PERMISSIONS.USER_DELETE, SYSTEM_PERMISSIONS.USER_INVITE,
    SYSTEM_PERMISSIONS.ROLE_READ, SYSTEM_PERMISSIONS.ROLE_WRITE, SYSTEM_PERMISSIONS.ROLE_DELETE, SYSTEM_PERMISSIONS.ROLE_BIND,
    SYSTEM_PERMISSIONS.TASK_READ, SYSTEM_PERMISSIONS.TASK_WRITE, SYSTEM_PERMISSIONS.TASK_DELETE, SYSTEM_PERMISSIONS.TASK_ASSIGN,
    SYSTEM_PERMISSIONS.APPROVAL_READ, SYSTEM_PERMISSIONS.APPROVAL_WRITE, SYSTEM_PERMISSIONS.APPROVAL_APPROVE, SYSTEM_PERMISSIONS.APPROVAL_REJECT,
    SYSTEM_PERMISSIONS.INTEGRATION_READ, SYSTEM_PERMISSIONS.INTEGRATION_WRITE, SYSTEM_PERMISSIONS.INTEGRATION_DELETE, SYSTEM_PERMISSIONS.INTEGRATION_EXECUTE,
    SYSTEM_PERMISSIONS.WORKFLOW_READ, SYSTEM_PERMISSIONS.WORKFLOW_WRITE, SYSTEM_PERMISSIONS.WORKFLOW_DELETE, SYSTEM_PERMISSIONS.WORKFLOW_EXECUTE,
    SYSTEM_PERMISSIONS.REPORT_READ, SYSTEM_PERMISSIONS.REPORT_WRITE, SYSTEM_PERMISSIONS.REPORT_DELETE, SYSTEM_PERMISSIONS.REPORT_EXPORT,
    SYSTEM_PERMISSIONS.ANALYTICS_READ, SYSTEM_PERMISSIONS.AUDIT_READ
  ],
  admin: [
    SYSTEM_PERMISSIONS.ORG_READ, SYSTEM_PERMISSIONS.ORG_WRITE,
    SYSTEM_PERMISSIONS.USER_READ, SYSTEM_PERMISSIONS.USER_WRITE, SYSTEM_PERMISSIONS.USER_INVITE,
    SYSTEM_PERMISSIONS.ROLE_READ, SYSTEM_PERMISSIONS.ROLE_WRITE, SYSTEM_PERMISSIONS.ROLE_BIND,
    SYSTEM_PERMISSIONS.TASK_READ, SYSTEM_PERMISSIONS.TASK_WRITE, SYSTEM_PERMISSIONS.TASK_DELETE, SYSTEM_PERMISSIONS.TASK_ASSIGN,
    SYSTEM_PERMISSIONS.APPROVAL_READ, SYSTEM_PERMISSIONS.APPROVAL_WRITE, SYSTEM_PERMISSIONS.APPROVAL_APPROVE, SYSTEM_PERMISSIONS.APPROVAL_REJECT,
    SYSTEM_PERMISSIONS.INTEGRATION_READ, SYSTEM_PERMISSIONS.INTEGRATION_WRITE, SYSTEM_PERMISSIONS.INTEGRATION_DELETE, SYSTEM_PERMISSIONS.INTEGRATION_EXECUTE,
    SYSTEM_PERMISSIONS.WORKFLOW_READ, SYSTEM_PERMISSIONS.WORKFLOW_WRITE, SYSTEM_PERMISSIONS.WORKFLOW_DELETE, SYSTEM_PERMISSIONS.WORKFLOW_EXECUTE,
    SYSTEM_PERMISSIONS.REPORT_READ, SYSTEM_PERMISSIONS.REPORT_WRITE, SYSTEM_PERMISSIONS.REPORT_DELETE, SYSTEM_PERMISSIONS.REPORT_EXPORT,
    SYSTEM_PERMISSIONS.ANALYTICS_READ, SYSTEM_PERMISSIONS.AUDIT_READ
  ],
  manager: [
    SYSTEM_PERMISSIONS.ORG_READ,
    SYSTEM_PERMISSIONS.USER_READ, SYSTEM_PERMISSIONS.USER_INVITE,
    SYSTEM_PERMISSIONS.ROLE_READ,
    SYSTEM_PERMISSIONS.TASK_READ, SYSTEM_PERMISSIONS.TASK_WRITE, SYSTEM_PERMISSIONS.TASK_ASSIGN,
    SYSTEM_PERMISSIONS.APPROVAL_READ, SYSTEM_PERMISSIONS.APPROVAL_WRITE, SYSTEM_PERMISSIONS.APPROVAL_APPROVE, SYSTEM_PERMISSIONS.APPROVAL_REJECT,
    SYSTEM_PERMISSIONS.INTEGRATION_READ, SYSTEM_PERMISSIONS.INTEGRATION_EXECUTE,
    SYSTEM_PERMISSIONS.WORKFLOW_READ, SYSTEM_PERMISSIONS.WORKFLOW_WRITE, SYSTEM_PERMISSIONS.WORKFLOW_EXECUTE,
    SYSTEM_PERMISSIONS.REPORT_READ, SYSTEM_PERMISSIONS.REPORT_WRITE, SYSTEM_PERMISSIONS.REPORT_EXPORT,
    SYSTEM_PERMISSIONS.ANALYTICS_READ
  ],
  contributor: [
    SYSTEM_PERMISSIONS.ORG_READ,
    SYSTEM_PERMISSIONS.USER_READ,
    SYSTEM_PERMISSIONS.TASK_READ, SYSTEM_PERMISSIONS.TASK_WRITE,
    SYSTEM_PERMISSIONS.APPROVAL_READ, SYSTEM_PERMISSIONS.APPROVAL_WRITE,
    SYSTEM_PERMISSIONS.INTEGRATION_READ, SYSTEM_PERMISSIONS.INTEGRATION_EXECUTE,
    SYSTEM_PERMISSIONS.WORKFLOW_READ, SYSTEM_PERMISSIONS.WORKFLOW_EXECUTE,
    SYSTEM_PERMISSIONS.REPORT_READ
  ],
  viewer: [
    SYSTEM_PERMISSIONS.ORG_READ,
    SYSTEM_PERMISSIONS.USER_READ,
    SYSTEM_PERMISSIONS.TASK_READ,
    SYSTEM_PERMISSIONS.APPROVAL_READ,
    SYSTEM_PERMISSIONS.INTEGRATION_READ,
    SYSTEM_PERMISSIONS.WORKFLOW_READ,
    SYSTEM_PERMISSIONS.REPORT_READ
  ]
} as const;

/**
 * Middleware to require organization access and populate organization context
 */
export function requireOrganization(organizationParam: 'body' | 'params' | 'query' = 'params') {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({
          error: "Authentication Required",
          message: "User must be authenticated to access organization resources",
          code: "AUTH_REQUIRED"
        });
        return;
      }

      // Extract organization ID from request
      let organizationId: string;
      switch (organizationParam) {
        case 'body':
          organizationId = req.body?.organizationId;
          break;
        case 'query':
          organizationId = req.query?.organizationId as string;
          break;
        case 'params':
        default:
          organizationId = req.params?.organizationId;
          break;
      }

      if (!organizationId) {
        res.status(400).json({
          error: "Organization Required",
          message: "Organization ID must be provided",
          code: "ORG_ID_REQUIRED"
        });
        return;
      }

      // Check if user has access to this organization
      // TODO: Implement storage.getUserOrgMembership when storage is expanded
      // For now, we'll stub this check and assume valid access
      // const membership = await storage.getUserOrgMembership(userId, organizationId);
      
      // if (!membership || !membership.isActive) {
      //   res.status(403).json({
      //     error: "Organization Access Denied",
      //     message: "You do not have access to this organization",
      //     code: "ORG_ACCESS_DENIED",
      //     organizationId
      //   });
      //   return;
      // }

      // Add organization context to request
      req.organizationId = organizationId;
      // req.userRole = membership.role;
      
      next();
    } catch (error) {
      console.error("Organization authorization error:", error);
      res.status(500).json({
        error: "Authorization Error",
        message: "Failed to verify organization access",
        code: "ORG_AUTH_ERROR"
      });
    }
  };
}

/**
 * Middleware to require specific permissions
 */
export function requirePermissions(...permissions: string[]) {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({
          error: "Authentication Required",
          message: "User must be authenticated to check permissions",
          code: "AUTH_REQUIRED"
        });
        return;
      }

      const organizationId = req.organizationId;
      if (!organizationId) {
        res.status(400).json({
          error: "Organization Context Required",
          message: "Organization context must be established before checking permissions",
          code: "ORG_CONTEXT_REQUIRED"
        });
        return;
      }

      // Get user permissions (combine org role permissions + custom role permissions)
      // TODO: Implement when storage is expanded
      // const userPermissions = await getUserPermissions(userId, organizationId);
      
      // For now, stub with owner permissions for testing
      const userPermissions = [...ORG_ROLE_PERMISSIONS.owner] as string[];
      
      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission as any)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !userPermissions.includes(permission as any)
        );
        
        res.status(403).json({
          error: "Permission Denied",
          message: "You do not have the required permissions to perform this action",
          code: "PERMISSION_DENIED",
          requiredPermissions: permissions,
          missingPermissions,
          userPermissions: userPermissions // Remove in production for security
        });
        return;
      }

      // Add permissions to request context
      req.userPermissions = userPermissions;
      
      next();
    } catch (error) {
      console.error("Permission authorization error:", error);
      res.status(500).json({
        error: "Authorization Error", 
        message: "Failed to verify permissions",
        code: "PERMISSION_AUTH_ERROR"
      });
    }
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export function requireAdmin() {
  return requirePermissions(SYSTEM_PERMISSIONS.ORG_ADMIN);
}

/**
 * Convenience middleware for organization read access
 */
export function requireOrgRead() {
  return requirePermissions(SYSTEM_PERMISSIONS.ORG_READ);
}

/**
 * Convenience middleware for user management access
 */
export function requireUserManagement() {
  return requirePermissions(SYSTEM_PERMISSIONS.USER_WRITE);
}

/**
 * Get all permissions for a user in an organization
 * Combines org membership role permissions + custom role binding permissions
 * TODO: Implement when storage is expanded
 */
async function getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
  const permissions = new Set<string>();

  // Get org membership permissions
  // const membership = await storage.getUserOrgMembership(userId, organizationId);
  // if (membership && membership.isActive) {
  //   const rolePermissions = ORG_ROLE_PERMISSIONS[membership.role] || [];
  //   rolePermissions.forEach(permission => permissions.add(permission));
  // }

  // Get custom role binding permissions
  // const roleBindings = await storage.getUserRoleBindings(userId, organizationId);
  // for (const binding of roleBindings) {
  //   const role = await storage.getRole(binding.roleId);
  //   if (role && role.permissions) {
  //     role.permissions.forEach(permission => permissions.add(permission));
  //   }
  // }

  return Array.from(permissions);
}