import { describe, test, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

describe("API Routes", () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  describe("Health Check", () => {
    test("GET /api/health should return healthy status", async () => {
      const response = await request(app)
        .get("/api/health")
        .expect(200);
      
      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("NLP Endpoints", () => {
    test("POST /api/nlp/parse-business-description should accept business description", async () => {
      const businessDescription = {
        description: "Create employee onboarding with background checks and approvals",
        userId: "user-123"
      };

      const response = await request(app)
        .post("/api/nlp/parse-business-description")
        .send(businessDescription)
        .expect(200);

      expect(response.body).toHaveProperty("extractedEntities");
      expect(response.body).toHaveProperty("confidence");
      expect(response.body).toHaveProperty("status");
      expect(response.body.extractedEntities).toHaveProperty("processes");
      expect(response.body.extractedEntities).toHaveProperty("forms");
      expect(response.body.extractedEntities).toHaveProperty("approvals");
      expect(response.body.extractedEntities).toHaveProperty("integrations");
    });

    test("POST /api/nlp/validate-description should validate business description completeness", async () => {
      const validation = {
        description: "Create simple form",
        userId: "user-123"
      };

      const response = await request(app)
        .post("/api/nlp/validate-description")
        .send(validation)
        .expect(200);

      expect(response.body).toHaveProperty("isValid");
      expect(response.body).toHaveProperty("suggestions");
      expect(response.body).toHaveProperty("completenessScore");
    });

    test("POST /api/nlp/parse-business-description should reject invalid data", async () => {
      const invalidRequest = {
        description: "", // Empty description
        userId: "user-123"
      };

      await request(app)
        .post("/api/nlp/parse-business-description")
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe("Application Generation Endpoints", () => {
    test("POST /api/generate/application should start application generation", async () => {
      const generationRequest = {
        businessRequirementId: "req-123"
      };

      const response = await request(app)
        .post("/api/generate/application")
        .send(generationRequest)
        .expect(200);

      expect(response.body).toHaveProperty("applicationId");
      expect(response.body).toHaveProperty("status", "generating");
      expect(response.body).toHaveProperty("estimatedCompletionTime");
    });

    test("POST /api/generate/workflow should generate specific workflow", async () => {
      const workflowRequest = {
        applicationId: "app-123",
        workflowType: "approval_workflow",
        configuration: {
          steps: ["submit", "review", "approve"],
          approvers: ["manager", "hr"]
        }
      };

      const response = await request(app)
        .post("/api/generate/workflow")
        .send(workflowRequest)
        .expect(200);

      expect(response.body).toHaveProperty("workflowId");
      expect(response.body).toHaveProperty("generatedSteps");
      expect(response.body).toHaveProperty("status", "completed");
    });

    test("GET /api/generate/application/:id/status should return generation status", async () => {
      const response = await request(app)
        .get("/api/generate/application/app-123/status")
        .expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("completionPercentage");
      expect(response.body).toHaveProperty("currentStep");
    });
  });

  describe("Chatbot Endpoints", () => {
    test("POST /api/chatbot/create should create embedded chatbot", async () => {
      const chatbotRequest = {
        generatedApplicationId: "app-123",
        name: "HR Assistant",
        systemPrompt: "You are an HR assistant helping with employee onboarding",
        capabilities: ["answer_questions", "guide_workflow"],
        aiModel: "gpt-4"
      };

      const response = await request(app)
        .post("/api/chatbot/create")
        .send(chatbotRequest)
        .expect(201);

      expect(response.body).toHaveProperty("chatbotId");
      expect(response.body).toHaveProperty("name", "HR Assistant");
      expect(response.body).toHaveProperty("isActive", true);
    });

    test("POST /api/chatbot/interact should handle chatbot conversation", async () => {
      const interaction = {
        chatbotId: "chatbot-123",
        userId: "user-123",
        message: "How do I submit my background check documents?"
      };

      const response = await request(app)
        .post("/api/chatbot/interact")
        .send(interaction)
        .expect(200);

      expect(response.body).toHaveProperty("response");
      expect(response.body).toHaveProperty("sessionId");
      expect(response.body).toHaveProperty("timestamp");
    });

    test("GET /api/chatbot/:id should retrieve chatbot details", async () => {
      const response = await request(app)
        .get("/api/chatbot/chatbot-123")
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name");
      expect(response.body).toHaveProperty("capabilities");
      expect(response.body).toHaveProperty("isActive");
    });
  });

  describe("Error Handling", () => {
    test("should return 404 for non-existent endpoints", async () => {
      await request(app)
        .get("/api/non-existent")
        .expect(404);
    });

    test("should return 400 for malformed JSON", async () => {
      await request(app)
        .post("/api/nlp/parse-business-description")
        .set("Content-Type", "application/json")
        .send("invalid json")
        .expect(400);
    });
  });
});