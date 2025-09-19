import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { NLPService } from "../../server/services/nlpService";
import { aiServiceHelpers, testConfig } from "../helpers/test-setup";

// Mock OpenAI at the top level
vi.mock("openai", () => ({
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

/**
 * P0 PRIORITY: NLP Service Degradation Tests
 * Critical for platform stability when AI services are unavailable
 * Ensures graceful degradation and user experience continuity
 */

describe("NLP Service Degradation & AI Availability", () => {
  let nlpService: NLPService;
  let mockOpenAI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked OpenAI constructor
    const MockedOpenAI = vi.mocked((await import("openai")).default);
    
    // Mock OpenAI with controllable failure modes
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "test" } }]
          })
        }
      }
    };

    // Update the constructor to return our mock
    MockedOpenAI.mockImplementation(() => mockOpenAI);

    nlpService = new NLPService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe("AI Service Availability Detection", () => {
    test("should detect OpenAI service availability correctly", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "test" } }]
      });

      const isAvailable = await nlpService.checkAIServiceAvailability();
      expect(isAvailable).toBe(true);
    });

    test("should detect missing API key", async () => {
      delete process.env.OPENAI_API_KEY;

      const isAvailable = await nlpService.checkAIServiceAvailability();
      expect(isAvailable).toBe(false);
    });

    test("should detect API connection failures", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("Network timeout")
      );

      const isAvailable = await nlpService.checkAIServiceAvailability();
      expect(isAvailable).toBe(false);
    });

    test("should handle rate limit scenarios", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("Rate limit exceeded")
      );

      const isAvailable = await nlpService.checkAIServiceAvailability();
      expect(isAvailable).toBe(false);
    });

    test("should cache availability checks to reduce API calls", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "test" } }]
      });

      // First call
      await nlpService.checkAIServiceAvailability();
      
      // Second call within cache window
      await nlpService.checkAIServiceAvailability();

      // Should only call OpenAI once due to caching
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    test("should respect cache TTL for availability checks", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "test" } }]
      });

      // First call
      await nlpService.checkAIServiceAvailability();
      
      // Mock time advancement beyond cache TTL
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5 * 60 * 1000); // +5 minutes
      
      // Second call after cache expiry
      await nlpService.checkAIServiceAvailability();

      // Should call OpenAI twice due to cache expiry
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Graceful Degradation - Business Description Parsing", () => {
    test("should provide fallback parsing when AI is unavailable", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Create employee onboarding system with background checks and approvals";
      const result = await nlpService.parseBusinessDescription(description);

      // Should provide basic rule-based parsing
      expect(result).toMatchObject({
        processes: expect.arrayContaining([expect.any(String)]),
        forms: expect.arrayContaining([expect.any(String)]),
        confidence: expect.any(Number),
        fallbackMode: true,
        aiServiceAvailable: false
      });

      expect(result.confidence).toBeLessThan(0.5); // Lower confidence for rule-based
      expect(result.fallbackMode).toBe(true);
    });

    test("should extract basic entities using keyword matching", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Create employee onboarding with approval workflow and form validation";
      const result = await nlpService.parseBusinessDescription(description);

      // Should detect keywords even without AI
      expect(result.processes.some((p: any) => 
        p.name?.includes('onboarding') || typeof p === 'string' && p.includes('onboarding')
      )).toBe(true);
      
      expect(result.forms.some((f: any) => 
        f.name?.includes('form') || typeof f === 'string' && f.includes('form')
      )).toBe(true);
      
      expect(result.approvals.some((a: any) => 
        a.name?.includes('approval') || typeof a === 'string' && a.includes('approval')
      )).toBe(true);
    });

    test("should provide helpful error messages when AI fails", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("Service temporarily unavailable")
      );

      const description = "Create expense reporting system";
      const result = await nlpService.parseBusinessDescription(description);

      expect(result.fallbackMode).toBe(true);
      expect(result.userMessage).toContain("AI service temporarily unavailable");
      expect(result.userMessage).toContain("using simplified analysis");
    });

    test("should maintain minimum viable functionality", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Build customer relationship management system";
      const result = await nlpService.parseBusinessDescription(description);

      // Should still provide basic structure
      expect(result).toHaveProperty('processes');
      expect(result).toHaveProperty('forms');
      expect(result).toHaveProperty('approvals');
      expect(result).toHaveProperty('integrations');
      expect(result).toHaveProperty('confidence');
      
      // Minimum viable confidence should be > 0
      expect(result.confidence).toBeGreaterThan(0);
    });

    test("should handle streaming fallback for real-time UI", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Create project management system";
      const updates: any[] = [];
      
      await nlpService.streamParseBusinessDescription(
        description,
        (update) => updates.push(update)
      );

      // Should provide streaming updates even in fallback mode
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].status).toBe("parsing");
      expect(updates[updates.length - 1].status).toBe("completed");
      expect(updates[updates.length - 1].fallbackMode).toBe(true);
    });
  });

  describe("Validation Service Degradation", () => {
    test("should provide basic validation without AI", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Create app";
      const result = await nlpService.validateDescription(description);

      expect(result.isValid).toBe(false); // Too short
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.suggestions).toContain("Add more descriptive details");
      expect(result.fallbackMode).toBe(true);
    });

    test("should use rule-based validation criteria", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const longDescription = "Create a comprehensive employee onboarding system with multiple approval workflows, document management, background verification, and integration with HR information systems for Fortune 500 companies";
      const result = await nlpService.validateDescription(longDescription);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.fallbackMode).toBe(true);
    });

    test("should provide actionable suggestions without AI analysis", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "expense system";
      const result = await nlpService.validateDescription(description);

      expect(result.suggestions).toContain("Specify the business domain");
      expect(result.suggestions).toContain("Describe the main business processes");
      expect(result.suggestions).toContain("Mention required user roles");
    });
  });

  describe("Context Enhancement Degradation", () => {
    test("should handle context enhancement without AI", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Add approval step";
      const context = [
        {
          type: "user" as const,
          content: "Create employee onboarding system",
          timestamp: new Date()
        }
      ];

      const result = await nlpService.enhanceWithContext(description, context);

      expect(result.fallbackMode).toBe(true);
      expect(result.processes.some((p: any) => 
        (typeof p === 'string' ? p : p.name).includes('onboarding')
      )).toBe(true);
      expect(result.approvals.length).toBeGreaterThan(0);
    });

    test("should merge context information using rule-based logic", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Add document verification";
      const context = [
        {
          type: "ai" as const,
          content: "Previous analysis",
          timestamp: new Date(),
          extractedData: {
            processes: [{ name: "employee_onboarding", type: "business_process" }],
            confidence: 0.8
          }
        }
      ];

      const result = await nlpService.enhanceWithContext(description, context);

      // Should combine previous and new information
      expect(result.processes.length).toBeGreaterThan(1);
      expect(result.fallbackMode).toBe(true);
    });
  });

  describe("Performance Under Degraded Conditions", () => {
    test("should maintain response time SLA in fallback mode", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const description = "Create comprehensive business application";
      const startTime = performance.now();
      
      await nlpService.parseBusinessDescription(description);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Fallback should be faster than AI (< 100ms vs < 2000ms)
      expect(responseTime).toBeLessThan(100);
    });

    test("should handle high load when AI is down", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        nlpService.parseBusinessDescription("Test business application")
      );

      const startTime = performance.now();
      const results = await Promise.allSettled(requests);
      const endTime = performance.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // Should handle load better in fallback mode
      expect(successful).toBe(concurrentRequests); // 100% success
      expect(averageTime).toBeLessThan(50); // <50ms average
    });

    test("should not leak memory during extended fallback operation", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate extended operation
      for (let i = 0; i < 100; i++) {
        await nlpService.parseBusinessDescription(`Test application ${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe("AI Service Recovery", () => {
    test("should detect when AI service comes back online", async () => {
      // Start with AI unavailable
      aiServiceHelpers.mockAIServiceAvailable(false);
      let firstCheck = await nlpService.checkAIServiceAvailability();
      expect(firstCheck).toBe(false);

      // AI comes back online
      aiServiceHelpers.mockAIServiceAvailable(true);
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "test" } }]
      });

      let secondCheck = await nlpService.checkAIServiceAvailability();
      expect(secondCheck).toBe(true);
    });

    test("should automatically switch back to AI mode when available", async () => {
      // Start in fallback mode
      aiServiceHelpers.mockAIServiceAvailable(false);
      let fallbackResult = await nlpService.parseBusinessDescription("Test system");
      expect(fallbackResult.fallbackMode).toBe(true);

      // AI becomes available
      process.env.OPENAI_API_KEY = "test-key";
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: [{ name: "test_process", type: "business_process" }],
                confidence: 0.85
              })
            }
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      });

      let aiResult = await nlpService.parseBusinessDescription("Test system");
      expect(aiResult.fallbackMode).toBeFalsy();
      expect(aiResult.confidence).toBeGreaterThan(0.7);
    });

    test("should handle intermittent AI failures gracefully", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      
      // First call succeeds
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { function_call: { arguments: '{"confidence":0.8}' } } }]
      });

      let firstResult = await nlpService.parseBusinessDescription("Test");
      expect(firstResult.fallbackMode).toBeFalsy();

      // Second call fails (intermittent)
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error("Temporary failure")
      );

      let secondResult = await nlpService.parseBusinessDescription("Test");
      expect(secondResult.fallbackMode).toBe(true);

      // Third call succeeds (recovery)
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { function_call: { arguments: '{"confidence":0.8}' } } }]
      });

      let thirdResult = await nlpService.parseBusinessDescription("Test");
      expect(thirdResult.fallbackMode).toBeFalsy();
    });
  });

  describe("User Experience During Degradation", () => {
    test("should provide clear messaging about degraded functionality", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const result = await nlpService.parseBusinessDescription("Test system");

      expect(result.userMessage).toContain("simplified analysis");
      expect(result.userMessage).toContain("AI service");
      expect(result.userMessage).not.toContain("error");
      expect(result.userMessage).not.toContain("failed");
    });

    test("should suggest user actions during degradation", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const result = await nlpService.validateDescription("short");

      expect(result.suggestions).toContain("Add more descriptive details");
      expect(result.suggestions).toContain("business domain");
      expect(result.degradationTips).toContain("provide more context");
    });

    test("should maintain progress indicators in fallback mode", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);

      const updates: any[] = [];
      await nlpService.streamParseBusinessDescription(
        "Test application",
        (update) => updates.push(update)
      );

      const statusUpdates = updates.map(u => u.status);
      expect(statusUpdates).toContain("parsing");
      expect(statusUpdates).toContain("completed");
      
      // Should provide user-friendly status messages
      const messages = updates.map(u => u.message).filter(Boolean);
      expect(messages.some(m => m.includes("Analyzing your description"))).toBe(true);
    });
  });

  describe("Configuration & Feature Flags", () => {
    test("should respect AI service disable flag", async () => {
      process.env.OPENAI_API_KEY = "test-key";
      process.env.DISABLE_AI_SERVICES = "true";

      const result = await nlpService.parseBusinessDescription("Test system");
      expect(result.fallbackMode).toBe(true);
    });

    test("should allow fallback-only mode for testing", async () => {
      process.env.FORCE_FALLBACK_MODE = "true";
      process.env.OPENAI_API_KEY = "test-key";

      const result = await nlpService.parseBusinessDescription("Test system");
      expect(result.fallbackMode).toBe(true);
    });

    test("should support different fallback quality levels", async () => {
      process.env.FALLBACK_QUALITY_LEVEL = "enhanced";
      aiServiceHelpers.mockAIServiceAvailable(false);

      const result = await nlpService.parseBusinessDescription("Complex business system");
      
      // Enhanced fallback should provide better results
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.processes.length).toBeGreaterThan(1);
    });
  });

  describe("Monitoring & Observability", () => {
    test("should emit metrics for AI service availability", async () => {
      const metricsSpy = vi.fn();
      (global as any).metrics = { increment: metricsSpy };

      aiServiceHelpers.mockAIServiceAvailable(false);
      await nlpService.parseBusinessDescription("Test");

      expect(metricsSpy).toHaveBeenCalledWith("nlp.fallback_mode_used");
      expect(metricsSpy).toHaveBeenCalledWith("ai_service.unavailable");
    });

    test("should track degradation duration", async () => {
      const startTime = Date.now();
      aiServiceHelpers.mockAIServiceAvailable(false);
      
      await nlpService.parseBusinessDescription("Test 1");
      
      // Simulate time passing
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 5000);
      
      await nlpService.parseBusinessDescription("Test 2");

      const duration = await nlpService.getDegradationDuration();
      expect(duration).toBeGreaterThan(5000);
    });

    test("should provide health check endpoint status", async () => {
      aiServiceHelpers.mockAIServiceAvailable(false);
      
      const healthStatus = await nlpService.getHealthStatus();
      
      expect(healthStatus).toMatchObject({
        aiServiceAvailable: false,
        fallbackModeActive: true,
        lastSuccessfulAICall: expect.any(Number),
        degradationStartTime: expect.any(Number)
      });
    });
  });
});