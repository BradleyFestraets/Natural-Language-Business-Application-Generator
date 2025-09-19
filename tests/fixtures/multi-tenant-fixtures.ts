import { randomUUID } from "crypto";
import type { 
  InsertOrganization, 
  InsertOrgMembership,
  UpsertUser,
  InsertBusinessRequirement,
  InsertGeneratedApplication,
  InsertWorkflowExecution,
  InsertEmbeddedChatbot
} from "@shared/schema";

/**
 * Multi-tenant test fixtures for comprehensive testing
 * Supports isolation testing between organizations and role-based access control
 */

// Test Organizations
export const testOrganizations: (InsertOrganization & { id: string })[] = [
  {
    id: "org-a-test-uuid",
    name: "Organization A - Test Corp",
    subdomain: "org-a-test",
    plan: "professional",
    isActive: true
  },
  {
    id: "org-b-test-uuid", 
    name: "Organization B - Test Inc",
    subdomain: "org-b-test",
    plan: "enterprise",
    isActive: true
  }
];

// Test Users across organizations
export const testUsers: (UpsertUser & { id: string })[] = [
  // Organization A Users
  {
    id: "user-owner-org-a",
    email: "owner@org-a-test.com",
    firstName: "Alice",
    lastName: "Owner"
  },
  {
    id: "user-admin-org-a",
    email: "admin@org-a-test.com", 
    firstName: "Bob",
    lastName: "Admin"
  },
  {
    id: "user-manager-org-a",
    email: "manager@org-a-test.com",
    firstName: "Carol",
    lastName: "Manager"
  },
  {
    id: "user-contributor-org-a",
    email: "contributor@org-a-test.com",
    firstName: "David",
    lastName: "Contributor"
  },
  {
    id: "user-viewer-org-a",
    email: "viewer@org-a-test.com",
    firstName: "Eve",
    lastName: "Viewer"
  },
  // Organization B Users
  {
    id: "user-owner-org-b",
    email: "owner@org-b-test.com",
    firstName: "Frank",
    lastName: "Owner"
  },
  {
    id: "user-admin-org-b",
    email: "admin@org-b-test.com",
    firstName: "Grace",
    lastName: "Admin"
  }
];

// Organization Memberships with RBAC roles
export const testOrgMemberships: (InsertOrgMembership & { id: string })[] = [
  // Organization A memberships
  {
    id: "membership-owner-org-a",
    organizationId: "org-a-test-uuid",
    userId: "user-owner-org-a",
    role: "owner",
    isActive: true
  },
  {
    id: "membership-admin-org-a",
    organizationId: "org-a-test-uuid",
    userId: "user-admin-org-a",
    role: "admin",
    isActive: true
  },
  {
    id: "membership-manager-org-a",
    organizationId: "org-a-test-uuid",
    userId: "user-manager-org-a",
    role: "manager",
    isActive: true
  },
  {
    id: "membership-contributor-org-a",
    organizationId: "org-a-test-uuid",
    userId: "user-contributor-org-a",
    role: "contributor",
    isActive: true
  },
  {
    id: "membership-viewer-org-a",
    organizationId: "org-a-test-uuid",
    userId: "user-viewer-org-a",
    role: "viewer",
    isActive: true
  },
  // Organization B memberships
  {
    id: "membership-owner-org-b",
    organizationId: "org-b-test-uuid",
    userId: "user-owner-org-b",
    role: "owner",
    isActive: true
  },
  {
    id: "membership-admin-org-b",
    organizationId: "org-b-test-uuid",
    userId: "user-admin-org-b",
    role: "admin",
    isActive: true
  }
];

// Test Business Requirements
export const testBusinessRequirements: (InsertBusinessRequirement & { id: string })[] = [
  {
    id: "req-org-a-1",
    userId: "user-admin-org-a",
    organizationId: "org-a-test-uuid",
    originalDescription: "Create employee onboarding system with background checks and approvals",
    extractedEntities: {
      processes: [
        {
          name: "employee_onboarding",
          type: "business_process",
          description: "Complete employee onboarding workflow",
          complexity: "medium"
        },
        {
          name: "background_verification", 
          type: "verification_process",
          description: "Background check validation",
          complexity: "high"
        }
      ],
      forms: [
        {
          name: "employee_information_form",
          purpose: "Collect employee details",
          complexity: "low",
          dataTypes: ["text", "email", "date"]
        }
      ],
      approvals: [
        {
          name: "manager_approval",
          role: "manager",
          criteria: "All forms completed",
          timeLimit: "24 hours"
        }
      ],
      integrations: [
        {
          name: "background_check_api",
          type: "third_party_api",
          purpose: "Background verification",
          criticality: "high"
        }
      ]
    },
    confidence: 0.87,
    status: "validated"
  },
  {
    id: "req-org-b-1",
    userId: "user-admin-org-b",
    organizationId: "org-b-test-uuid",
    originalDescription: "Build expense reporting system with receipt scanning and approval workflow",
    extractedEntities: {
      processes: [
        {
          name: "expense_submission",
          type: "business_process",
          description: "Submit expense claims",
          complexity: "low"
        }
      ],
      forms: [
        {
          name: "expense_claim_form",
          purpose: "Submit expense details",
          complexity: "medium",
          dataTypes: ["currency", "file", "date"]
        }
      ],
      approvals: [
        {
          name: "manager_approval",
          role: "manager", 
          criteria: "Amount under threshold",
          timeLimit: "48 hours"
        }
      ]
    },
    confidence: 0.92,
    status: "generating_app"
  }
];

// Test Generated Applications
export const testGeneratedApplications: (InsertGeneratedApplication & { id: string })[] = [
  {
    id: "app-org-a-1",
    businessRequirementId: "req-org-a-1",
    organizationId: "org-a-test-uuid",
    name: "Employee Onboarding System",
    description: "Complete onboarding workflow with background checks",
    generatedWorkflows: [
      {
        id: "workflow-onboarding",
        name: "Employee Onboarding Workflow",
        steps: ["form_submission", "background_check", "manager_approval", "completion"],
        configuration: {
          approvalFlow: "sequential",
          timeouts: { background_check: "72h", manager_approval: "24h" }
        }
      }
    ],
    generatedForms: [
      {
        id: "form-employee-info",
        name: "Employee Information Form",
        fields: ["firstName", "lastName", "email", "position", "startDate"],
        validationRules: ["required_fields", "email_format", "future_date_validation"]
      }
    ],
    generatedIntegrations: [
      {
        id: "integration-background-check",
        name: "Background Check Service",
        type: "third_party_api",
        configuration: { endpoint: "/api/background-check", timeout: "30s" }
      }
    ],
    status: "completed",
    completionPercentage: 100
  },
  {
    id: "app-org-b-1", 
    businessRequirementId: "req-org-b-1",
    organizationId: "org-b-test-uuid",
    name: "Expense Reporting System",
    description: "Expense claims with receipt scanning",
    status: "generating",
    completionPercentage: 45
  }
];

// Test Embedded Chatbots
export const testEmbeddedChatbots: (InsertEmbeddedChatbot & { id: string })[] = [
  {
    id: "chatbot-org-a-1",
    generatedApplicationId: "app-org-a-1",
    name: "HR Assistant",
    systemPrompt: "You are an HR assistant helping with employee onboarding. Provide helpful guidance and answer questions about the onboarding process.",
    capabilities: ["answer_questions", "guide_workflow", "provide_help", "escalate_issues"],
    aiModel: "gpt-4",
    isActive: true
  },
  {
    id: "chatbot-org-b-1",
    generatedApplicationId: "app-org-b-1", 
    name: "Expense Assistant",
    systemPrompt: "You are an expense reporting assistant. Help users submit expense claims and navigate the approval process.",
    capabilities: ["answer_questions", "guide_workflow", "validate_expenses"],
    aiModel: "gpt-4",
    isActive: true
  }
];

// Test Workflow Executions
export const testWorkflowExecutions: (InsertWorkflowExecution & { id: string })[] = [
  {
    id: "execution-org-a-1",
    generatedApplicationId: "app-org-a-1",
    workflowId: "workflow-onboarding",
    userId: "user-contributor-org-a",
    currentStep: "background_check",
    stepData: {
      employee_name: "John Doe",
      position: "Software Engineer",
      hire_date: "2024-01-15"
    },
    status: "in_progress",
    aiAssistanceUsed: true
  },
  {
    id: "execution-org-b-1",
    generatedApplicationId: "app-org-b-1",
    workflowId: "workflow-expense",
    userId: "user-contributor-org-a", // Cross-org attempt (should be blocked)
    currentStep: "expense_submission",
    stepData: {
      amount: 125.50,
      category: "travel",
      receipt_url: "https://example.com/receipt.jpg"
    },
    status: "pending",
    aiAssistanceUsed: false
  }
];

/**
 * Mock session data for authentication testing
 */
export const mockSessionData = {
  orgA: {
    owner: {
      user: testUsers.find(u => u.id === "user-owner-org-a")!,
      organizationId: "org-a-test-uuid",
      role: "owner" as const,
      permissions: ["*"] // All permissions
    },
    admin: {
      user: testUsers.find(u => u.id === "user-admin-org-a")!,
      organizationId: "org-a-test-uuid", 
      role: "admin" as const,
      permissions: ["create_app", "edit_app", "delete_app", "manage_users", "view_analytics"]
    },
    manager: {
      user: testUsers.find(u => u.id === "user-manager-org-a")!,
      organizationId: "org-a-test-uuid",
      role: "manager" as const,
      permissions: ["create_app", "edit_app", "view_analytics", "approve_workflows"]
    },
    contributor: {
      user: testUsers.find(u => u.id === "user-contributor-org-a")!,
      organizationId: "org-a-test-uuid",
      role: "contributor" as const,
      permissions: ["create_app", "edit_own_app", "execute_workflows"]
    },
    viewer: {
      user: testUsers.find(u => u.id === "user-viewer-org-a")!,
      organizationId: "org-a-test-uuid",
      role: "viewer" as const,
      permissions: ["view_app", "view_workflows"]
    }
  },
  orgB: {
    owner: {
      user: testUsers.find(u => u.id === "user-owner-org-b")!,
      organizationId: "org-b-test-uuid",
      role: "owner" as const,
      permissions: ["*"]
    },
    admin: {
      user: testUsers.find(u => u.id === "user-admin-org-b")!,
      organizationId: "org-b-test-uuid",
      role: "admin" as const,
      permissions: ["create_app", "edit_app", "delete_app", "manage_users", "view_analytics"]
    }
  }
};

/**
 * Generate test-specific organization ID for test isolation
 */
export function generateTestOrgId(testName: string): string {
  return `test-org-${testName}-${randomUUID().slice(0, 8)}`;
}

/**
 * Generate test-specific user ID for test isolation  
 */
export function generateTestUserId(testName: string, role: string): string {
  return `test-user-${testName}-${role}-${randomUUID().slice(0, 8)}`;
}

/**
 * RBAC Permission Matrix for testing authorization
 */
export const rbacPermissionMatrix = {
  owner: {
    canCreateApp: true,
    canEditApp: true,
    canDeleteApp: true,
    canViewApp: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canApproveWorkflows: true,
    canExecuteWorkflows: true,
    canManageIntegrations: true,
    canConfigureChatbots: true
  },
  admin: {
    canCreateApp: true,
    canEditApp: true,
    canDeleteApp: true,
    canViewApp: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canApproveWorkflows: true,
    canExecuteWorkflows: true,
    canManageIntegrations: true,
    canConfigureChatbots: true
  },
  manager: {
    canCreateApp: true,
    canEditApp: true,
    canDeleteApp: false,
    canViewApp: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canApproveWorkflows: true,
    canExecuteWorkflows: true,
    canManageIntegrations: false,
    canConfigureChatbots: false
  },
  contributor: {
    canCreateApp: true,
    canEditApp: true, // Only own apps
    canDeleteApp: false,
    canViewApp: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canApproveWorkflows: false,
    canExecuteWorkflows: true,
    canManageIntegrations: false,
    canConfigureChatbots: false
  },
  viewer: {
    canCreateApp: false,
    canEditApp: false,
    canDeleteApp: false,
    canViewApp: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canApproveWorkflows: false,
    canExecuteWorkflows: false,
    canManageIntegrations: false,
    canConfigureChatbots: false
  }
} as const;