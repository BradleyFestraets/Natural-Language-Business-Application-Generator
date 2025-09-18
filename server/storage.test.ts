import { describe, test, expect, beforeEach } from "vitest";
import { MemStorage } from "./storage";
import { 
  type InsertBusinessRequirement,
  type InsertGeneratedApplication,
  type InsertEmbeddedChatbot,
  type InsertWorkflowExecution,
  type InsertUser
} from "@shared/schema";

describe("Storage Interface", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe("User Storage", () => {
    test("should create and retrieve user", async () => {
      const userData: InsertUser = {
        username: "testuser",
        password: "password123"
      };

      const user = await storage.createUser(userData);
      expect(user.id).toBeTruthy();
      expect(user.username).toBe("testuser");

      const retrievedUser = await storage.getUser(user.id);
      expect(retrievedUser).toEqual(user);
    });

    test("should find user by username", async () => {
      const userData: InsertUser = {
        username: "testuser",
        password: "password123"
      };

      const user = await storage.createUser(userData);
      const foundUser = await storage.getUserByUsername("testuser");
      expect(foundUser).toEqual(user);
    });
  });

  describe("Business Requirement Storage", () => {
    test("should create and retrieve business requirement", async () => {
      // First create a user
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirementData: InsertBusinessRequirement = {
        userId: user.id,
        originalDescription: "Create employee onboarding with background checks",
        extractedEntities: {
          processes: ["onboarding", "background_check"],
          forms: ["employee_form"],
          approvals: ["manager_approval"],
          integrations: ["background_api"]
        },
        workflowPatterns: ["sequential_approval"],
        confidence: 0.85,
        status: "analyzing"
      };

      const requirement = await storage.createBusinessRequirement(requirementData);
      expect(requirement.id).toBeTruthy();
      expect(requirement.originalDescription).toBe(requirementData.originalDescription);
      expect(requirement.confidence).toBe(0.85);

      const retrievedRequirement = await storage.getBusinessRequirement(requirement.id);
      expect(retrievedRequirement).toEqual(requirement);
    });

    test("should update business requirement", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.5,
        status: "analyzing"
      });

      const updatedRequirement = await storage.updateBusinessRequirement(requirement.id, {
        confidence: 0.9,
        status: "validated"
      });

      expect(updatedRequirement?.confidence).toBe(0.9);
      expect(updatedRequirement?.status).toBe("validated");
    });

    test("should list business requirements for user", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Requirement 1",
        confidence: 0.8,
        status: "analyzing"
      });

      await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Requirement 2",
        confidence: 0.7,
        status: "validated"
      });

      const requirements = await storage.listBusinessRequirements(user.id);
      expect(requirements).toHaveLength(2);
    });
  });

  describe("Generated Application Storage", () => {
    test("should create and retrieve generated application", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.8,
        status: "validated"
      });

      const appData: InsertGeneratedApplication = {
        businessRequirementId: requirement.id,
        name: "Employee Onboarding System",
        description: "Complete onboarding workflow",
        status: "generating",
        completionPercentage: 25
      };

      const app = await storage.createGeneratedApplication(appData);
      expect(app.id).toBeTruthy();
      expect(app.name).toBe("Employee Onboarding System");
      expect(app.completionPercentage).toBe(25);

      const retrievedApp = await storage.getGeneratedApplication(app.id);
      expect(retrievedApp).toEqual(app);
    });

    test("should update generated application progress", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.8,
        status: "validated"
      });

      const app = await storage.createGeneratedApplication({
        businessRequirementId: requirement.id,
        name: "Test App",
        status: "generating",
        completionPercentage: 10
      });

      const updatedApp = await storage.updateGeneratedApplication(app.id, {
        completionPercentage: 75,
        status: "completed"
      });

      expect(updatedApp?.completionPercentage).toBe(75);
      expect(updatedApp?.status).toBe("completed");
    });
  });

  describe("Embedded Chatbot Storage", () => {
    test("should create and retrieve embedded chatbot", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.8,
        status: "validated"
      });

      const app = await storage.createGeneratedApplication({
        businessRequirementId: requirement.id,
        name: "Test App",
        status: "completed",
        completionPercentage: 100
      });

      const chatbotData: InsertEmbeddedChatbot = {
        generatedApplicationId: app.id,
        name: "HR Assistant",
        systemPrompt: "You are an HR assistant",
        capabilities: ["answer_questions", "guide_workflow"],
        aiModel: "gpt-4",
        isActive: true
      };

      const chatbot = await storage.createEmbeddedChatbot(chatbotData);
      expect(chatbot.id).toBeTruthy();
      expect(chatbot.name).toBe("HR Assistant");
      expect(chatbot.aiModel).toBe("gpt-4");

      const retrievedChatbot = await storage.getEmbeddedChatbot(chatbot.id);
      expect(retrievedChatbot).toEqual(chatbot);
    });

    test("should list chatbots for application", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.8,
        status: "validated"
      });

      const app = await storage.createGeneratedApplication({
        businessRequirementId: requirement.id,
        name: "Test App",
        status: "completed",
        completionPercentage: 100
      });

      await storage.createEmbeddedChatbot({
        generatedApplicationId: app.id,
        name: "Assistant 1",
        systemPrompt: "Assistant 1",
        aiModel: "gpt-4",
        isActive: true
      });

      await storage.createEmbeddedChatbot({
        generatedApplicationId: app.id,
        name: "Assistant 2",
        systemPrompt: "Assistant 2",
        aiModel: "gpt-3.5-turbo",
        isActive: true
      });

      const chatbots = await storage.listEmbeddedChatbots(app.id);
      expect(chatbots).toHaveLength(2);
    });
  });

  describe("Workflow Execution Storage", () => {
    test("should create and retrieve workflow execution", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.8,
        status: "validated"
      });

      const app = await storage.createGeneratedApplication({
        businessRequirementId: requirement.id,
        name: "Test App",
        status: "completed",
        completionPercentage: 100
      });

      const executionData: InsertWorkflowExecution = {
        generatedApplicationId: app.id,
        workflowId: "workflow-123",
        userId: user.id,
        currentStep: "background_check",
        stepData: { employee_name: "John Doe" },
        status: "in_progress",
        aiAssistanceUsed: true
      };

      const execution = await storage.createWorkflowExecution(executionData);
      expect(execution.id).toBeTruthy();
      expect(execution.currentStep).toBe("background_check");
      expect(execution.status).toBe("in_progress");

      const retrievedExecution = await storage.getWorkflowExecution(execution.id);
      expect(retrievedExecution).toEqual(execution);
    });

    test("should list workflow executions for user", async () => {
      const user = await storage.createUser({
        username: "testuser",
        password: "password123"
      });

      const requirement = await storage.createBusinessRequirement({
        userId: user.id,
        originalDescription: "Test requirement",
        confidence: 0.8,
        status: "validated"
      });

      const app = await storage.createGeneratedApplication({
        businessRequirementId: requirement.id,
        name: "Test App",
        status: "completed",
        completionPercentage: 100
      });

      await storage.createWorkflowExecution({
        generatedApplicationId: app.id,
        workflowId: "workflow-1",
        userId: user.id,
        currentStep: "step1",
        status: "in_progress"
      });

      await storage.createWorkflowExecution({
        generatedApplicationId: app.id,
        workflowId: "workflow-2",
        userId: user.id,
        currentStep: "step1",
        status: "completed"
      });

      const executions = await storage.listWorkflowExecutions(user.id);
      expect(executions).toHaveLength(2);
    });
  });
});