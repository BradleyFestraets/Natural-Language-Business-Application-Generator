import { describe, test, expect, vi, beforeEach } from "vitest";
import { NLPService } from "./nlpService.js";

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
};

vi.mock("openai", () => ({
  default: vi.fn(() => mockOpenAI)
}));

describe("NLPService", () => {
  let nlpService: NLPService;

  beforeEach(() => {
    vi.clearAllMocks();
    nlpService = new NLPService();
  });

  describe("parseBusinessDescription", () => {
    test("extracts entities from employee onboarding description", async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: ["employee_onboarding", "background_verification", "document_collection"],
                forms: ["employee_information_form", "background_check_form", "tax_form"],
                approvals: ["manager_approval", "hr_approval"],
                integrations: ["background_check_api", "email_service"],
                workflowPatterns: ["sequential_approval"],
                confidence: 0.87
              })
            }
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const description = "Create an employee onboarding system with background checks, document collection, manager approvals, and automated notifications";
      const result = await nlpService.parseBusinessDescription(description);

      expect(result).toEqual({
        processes: ["employee_onboarding", "background_verification", "document_collection"],
        forms: ["employee_information_form", "background_check_form", "tax_form"],
        approvals: ["manager_approval", "hr_approval"],
        integrations: ["background_check_api", "email_service"],
        workflowPatterns: ["sequential_approval"],
        confidence: 0.87,
        usage: {
          promptTokens: 150,
          completionTokens: 80,
          totalTokens: 230
        }
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("business application generator")
          }),
          expect.objectContaining({
            role: "user",
            content: description
          })
        ]),
        functions: expect.arrayContaining([
          expect.objectContaining({
            name: "extract_business_requirements",
            description: expect.stringContaining("Extract structured business requirements")
          })
        ]),
        function_call: { name: "extract_business_requirements" },
        temperature: 0.3,
        max_tokens: 1500
      });
    });

    test("handles expense reporting system description", async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: ["expense_submission", "receipt_processing", "approval_workflow", "payment_processing"],
                forms: ["expense_claim_form", "receipt_upload_form"],
                approvals: ["manager_approval", "finance_approval"],
                integrations: ["receipt_scanner_api", "payment_system_api", "accounting_software"],
                workflowPatterns: ["parallel_approval"],
                confidence: 0.92
              })
            }
          }
        }],
        usage: {
          prompt_tokens: 180,
          completion_tokens: 95,
          total_tokens: 275
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const description = "Build an expense reporting system where employees submit expense claims with receipts, managers review and approve expenses, finance processes payments";
      const result = await nlpService.parseBusinessDescription(description);

      expect(result.processes).toContain("expense_submission");
      expect(result.processes).toContain("receipt_processing");
      expect(result.integrations).toContain("receipt_scanner_api");
      expect(result.confidence).toBe(0.92);
    });

    test("handles low confidence results with validation warnings", async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: ["generic_process"],
                forms: [],
                approvals: [],
                integrations: [],
                workflowPatterns: [],
                confidence: 0.35
              })
            }
          }
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 30,
          total_tokens: 80
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const description = "make app";
      const result = await nlpService.parseBusinessDescription(description);

      expect(result.confidence).toBe(0.35);
      expect(result.validationWarnings).toContain("Low confidence score - consider providing more details");
      expect(result.validationWarnings).toContain("Insufficient business context detected");
    });

    test("retries on API errors with exponential backoff", async () => {
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error("Rate limit exceeded"))
        .mockRejectedValueOnce(new Error("Temporary server error"))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              function_call: {
                arguments: JSON.stringify({
                  processes: ["leave_management"],
                  forms: ["leave_request_form"],
                  approvals: ["supervisor_approval"],
                  integrations: ["calendar_api"],
                  workflowPatterns: ["simple_approval"],
                  confidence: 0.75
                })
              }
            }
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        });

      const description = "Create a leave management system";
      const result = await nlpService.parseBusinessDescription(description);

      expect(result.confidence).toBe(0.75);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    test("handles malformed JSON responses gracefully", async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: '{ invalid json }'
            }
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 20,
          total_tokens: 120
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const description = "Create a system";
      
      await expect(nlpService.parseBusinessDescription(description))
        .rejects
        .toThrow("Failed to parse AI response");
    });
  });

  describe("validateDescription", () => {
    test("validates sufficient business description", async () => {
      const description = "Create a comprehensive employee onboarding system with background verification, document collection, multi-level approvals, and integration with HR systems";
      
      const result = await nlpService.validateDescription(description);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.suggestions).toHaveLength(0);
    });

    test("provides suggestions for insufficient description", async () => {
      const description = "make app";
      
      const result = await nlpService.validateDescription(description);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.suggestions).toContain("Specify the business domain (HR, Finance, Operations, etc.)");
      expect(result.suggestions).toContain("Describe the main business processes involved");
      expect(result.suggestions).toContain("Mention required user roles and permissions");
    });

    test("validates medium complexity description with recommendations", async () => {
      const description = "Create expense reporting with approvals";
      
      const result = await nlpService.validateDescription(description);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.recommendations).toContain("Consider specifying integration requirements");
      expect(result.recommendations).toContain("Add details about form fields and data collection");
    });
  });

  describe("streamParseBusinessDescription", () => {
    test("provides streaming updates during parsing", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: {
                function_call: {
                  arguments: '{"processes":["employee"'
                }
              }
            }]
          };
          yield {
            choices: [{
              delta: {
                function_call: {
                  arguments: '_onboarding"],"forms":["employee_form"]'
                }
              }
            }]
          };
          yield {
            choices: [{
              delta: {
                function_call: {
                  arguments: ',"confidence":0.8}'
                }
              }
            }]
          };
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const description = "Create employee onboarding system";
      const updates: any[] = [];
      
      await nlpService.streamParseBusinessDescription(
        description,
        (update) => updates.push(update)
      );

      expect(updates).toHaveLength(3);
      expect(updates[0].status).toBe("parsing");
      expect(updates[1].partialData).toBeDefined();
      expect(updates[2].status).toBe("completed");
    });

    test("handles streaming errors gracefully", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: {
                function_call: {
                  arguments: '{"processes":'
                }
              }
            }]
          };
          throw new Error("Connection lost");
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const description = "Create system";
      const updates: any[] = [];
      
      await expect(
        nlpService.streamParseBusinessDescription(
          description,
          (update) => updates.push(update)
        )
      ).rejects.toThrow("Connection lost");

      expect(updates.some(u => u.status === "error")).toBe(true);
    });
  });

  describe("enhanceWithContext", () => {
    test("enhances parsing with conversation context", async () => {
      const description = "Add document collection too";
      const context = [
        {
          type: "user" as const,
          content: "Create employee onboarding with background checks",
          timestamp: new Date()
        },
        {
          type: "ai" as const,
          content: "I've extracted onboarding processes",
          timestamp: new Date(),
          extractedData: {
            processes: ["employee_onboarding", "background_check"],
            confidence: 0.8
          }
        }
      ];

      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: ["employee_onboarding", "background_check", "document_collection"],
                forms: ["employee_form", "background_form", "document_form"],
                approvals: ["manager_approval"],
                integrations: ["background_api", "document_storage"],
                workflowPatterns: ["sequential_approval"],
                confidence: 0.88
              })
            }
          }
        }],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await nlpService.enhanceWithContext(description, context);

      expect(result.processes).toContain("document_collection");
      expect(result.confidence).toBe(0.88);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("conversation context")
            })
          ])
        })
      );
    });
  });

  describe("getConfidenceFactors", () => {
    test("analyzes confidence factors for high-quality description", () => {
      const description = "Create a comprehensive employee onboarding system with background verification, document collection, manager and HR approvals, integration with HRIS and email notifications";
      
      const factors = nlpService.getConfidenceFactors(description);

      expect(factors.lengthScore).toBeGreaterThan(0.8);
      expect(factors.specificityScore).toBeGreaterThan(0.7);
      expect(factors.businessContextScore).toBeGreaterThan(0.8);
      expect(factors.technicalDetailScore).toBeGreaterThan(0.6);
      expect(factors.overallConfidence).toBeGreaterThan(0.7);
    });

    test("identifies low confidence factors for poor description", () => {
      const description = "app";
      
      const factors = nlpService.getConfidenceFactors(description);

      expect(factors.lengthScore).toBeLessThan(0.2);
      expect(factors.specificityScore).toBeLessThan(0.2);
      expect(factors.businessContextScore).toBeLessThan(0.2);
      expect(factors.overallConfidence).toBeLessThan(0.3);
      expect(factors.recommendations).toContain("Add more descriptive details");
    });
  });

  describe("performance and optimization", () => {
    test("completes parsing within 2 second timeout", async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: ["quick_process"],
                confidence: 0.8
              })
            }
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      await nlpService.parseBusinessDescription("Quick test");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    test("caches similar requests to improve performance", async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                processes: ["cached_process"],
                confidence: 0.8
              })
            }
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const description = "Create employee onboarding system";
      
      // First call
      await nlpService.parseBusinessDescription(description);
      
      // Second call (should use cache)
      await nlpService.parseBusinessDescription(description);

      // Should only call OpenAI once due to caching
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });
});