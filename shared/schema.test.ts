import { describe, test, expect } from "vitest";
import { z } from "zod";
import { 
  users,
  businessRequirements,
  generatedApplications, 
  embeddedChatbots,
  workflowExecutions,
  insertUserSchema,
  insertBusinessRequirementSchema,
  insertGeneratedApplicationSchema,
  insertEmbeddedChatbotSchema,
  insertWorkflowExecutionSchema,
  type InsertUser,
  type User,
  type InsertBusinessRequirement,
  type BusinessRequirement,
  type InsertGeneratedApplication,
  type GeneratedApplication,
  type InsertEmbeddedChatbot,
  type EmbeddedChatbot,
  type InsertWorkflowExecution,
  type WorkflowExecution
} from "./schema";

describe("Schema Models", () => {
  describe("User Schema", () => {
    test("should validate correct user data", () => {
      const validUser: InsertUser = {
        username: "testuser",
        password: "password123"
      };
      
      expect(() => insertUserSchema.parse(validUser)).not.toThrow();
    });

    test("should reject user without username", () => {
      const invalidUser = {
        password: "password123"
      };
      
      expect(() => insertUserSchema.parse(invalidUser)).toThrow();
    });
  });

  describe("BusinessRequirement Schema", () => {
    test("should validate correct business requirement data", () => {
      const validRequirement: InsertBusinessRequirement = {
        userId: "user-123",
        originalDescription: "Create employee onboarding with background checks and approvals",
        extractedEntities: {
          processes: ["onboarding", "background_check"],
          forms: ["employee_info", "background_check_form"],
          approvals: ["manager_approval", "hr_approval"],
          integrations: ["background_check_api"]
        },
        workflowPatterns: ["sequential_approval", "conditional_routing"],
        confidence: 0.85,
        status: "analyzing"
      };
      
      expect(() => insertBusinessRequirementSchema.parse(validRequirement)).not.toThrow();
    });

    test("should reject requirement with invalid confidence score", () => {
      const invalidRequirement = {
        userId: "user-123",
        originalDescription: "Create app",
        confidence: 1.5, // Invalid - should be between 0 and 1
        status: "analyzing"
      };
      
      expect(() => insertBusinessRequirementSchema.parse(invalidRequirement)).toThrow();
    });

    test("should reject requirement with invalid status", () => {
      const invalidRequirement = {
        userId: "user-123", 
        originalDescription: "Create app",
        confidence: 0.8,
        status: "invalid_status"
      };
      
      expect(() => insertBusinessRequirementSchema.parse(invalidRequirement)).toThrow();
    });
  });

  describe("GeneratedApplication Schema", () => {
    test("should validate correct generated application data", () => {
      const validApp: InsertGeneratedApplication = {
        businessRequirementId: "req-123",
        name: "Employee Onboarding System",
        description: "Complete employee onboarding workflow with background checks",
        generatedWorkflows: [
          {
            id: "workflow-1",
            name: "Background Check Workflow",
            steps: ["submit_form", "background_check", "approval"]
          }
        ],
        generatedForms: [
          {
            id: "form-1",
            name: "Employee Information Form",
            fields: ["name", "email", "position"]
          }
        ],
        generatedIntegrations: [
          {
            id: "integration-1",
            name: "Background Check API",
            type: "third_party_api"
          }
        ],
        embeddedChatbots: ["chatbot-1"],
        status: "generating",
        completionPercentage: 45
      };
      
      expect(() => insertGeneratedApplicationSchema.parse(validApp)).not.toThrow();
    });

    test("should reject application with invalid completion percentage", () => {
      const invalidApp = {
        businessRequirementId: "req-123",
        name: "Test App",
        status: "generating",
        completionPercentage: 150 // Invalid - should be between 0 and 100
      };
      
      expect(() => insertGeneratedApplicationSchema.parse(invalidApp)).toThrow();
    });
  });

  describe("EmbeddedChatbot Schema", () => {
    test("should validate correct embedded chatbot data", () => {
      const validChatbot: InsertEmbeddedChatbot = {
        generatedApplicationId: "app-123",
        name: "HR Assistant",
        systemPrompt: "You are an HR assistant helping with employee onboarding",
        capabilities: ["answer_questions", "guide_workflow", "provide_help"],
        aiModel: "gpt-4",
        isActive: true
      };
      
      expect(() => insertEmbeddedChatbotSchema.parse(validChatbot)).not.toThrow();
    });

    test("should reject chatbot with invalid AI model", () => {
      const invalidChatbot = {
        generatedApplicationId: "app-123",
        name: "Test Bot",
        aiModel: "invalid-model",
        isActive: true
      };
      
      expect(() => insertEmbeddedChatbotSchema.parse(invalidChatbot)).toThrow();
    });
  });

  describe("WorkflowExecution Schema", () => {
    test("should validate correct workflow execution data", () => {
      const validExecution: InsertWorkflowExecution = {
        generatedApplicationId: "app-123",
        workflowId: "workflow-1",
        userId: "user-123",
        currentStep: "background_check",
        stepData: {
          employee_name: "John Doe",
          position: "Software Engineer"
        },
        status: "in_progress",
        aiAssistanceUsed: true
      };
      
      expect(() => insertWorkflowExecutionSchema.parse(validExecution)).not.toThrow();
    });

    test("should reject execution with invalid status", () => {
      const invalidExecution = {
        generatedApplicationId: "app-123",
        workflowId: "workflow-1", 
        userId: "user-123",
        currentStep: "step1",
        status: "invalid_status"
      };
      
      expect(() => insertWorkflowExecutionSchema.parse(invalidExecution)).toThrow();
    });
  });
});