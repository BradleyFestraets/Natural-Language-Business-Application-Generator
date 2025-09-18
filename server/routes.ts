import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertBusinessRequirementSchema, insertGeneratedApplicationSchema, insertEmbeddedChatbotSchema } from "@shared/schema";
import { NLPService } from "./services/nlpService.js";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireAIServiceMiddleware, checkAIServiceMiddleware } from "./middleware/aiServiceMiddleware";
import { globalServiceHealth } from "./config/validation";
import { 
  requireOrganization, 
  requirePermissions, 
  requireAdmin, 
  requireOrgRead,
  requireUserManagement,
  SYSTEM_PERMISSIONS,
  type AuthorizedRequest 
} from "./middleware/authorizationMiddleware";

// Validation schemas for API requests (userId removed - derived from auth session)
const parseBusinessDescriptionSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  conversationId: z.string().optional(),
  context: z.record(z.any()).optional()
});

const validateDescriptionSchema = z.object({
  description: z.string().min(1, "Description cannot be empty")
});

const generateApplicationSchema = z.object({
  businessRequirementId: z.string()
});

const generateWorkflowSchema = z.object({
  applicationId: z.string(),
  workflowType: z.string(),
  configuration: z.record(z.any())
});

const chatbotInteractionSchema = z.object({
  chatbotId: z.string(),
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Set up authentication first
  await setupAuth(app);
  
  // Initialize NLP Service
  const nlpService = new NLPService();
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Health Check Endpoint - Enhanced with service status
  app.get("/api/health", (req: Request, res: Response) => {
    const allServicesHealthy = Object.values(globalServiceHealth).every(status => status === 'available');
    const httpStatus = allServicesHealthy ? 200 : 503;
    
    res.status(httpStatus).json({
      status: allServicesHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      service: "Natural Language Business Application Generator",
      services: {
        openai: globalServiceHealth.openai,
        database: globalServiceHealth.database,
        session: globalServiceHealth.session
      },
      degraded: !allServicesHealthy,
      message: allServicesHealthy ? "All services operational" : "Some services are unavailable"
    });
  });

  // ===== ADMIN API ENDPOINTS =====
  
  // Demo admin endpoint with organization and permission requirements
  app.get("/api/admin/organizations/:organizationId", 
    isAuthenticated, 
    requireOrganization('params'),
    requireOrgRead(),
    async (req: AuthorizedRequest, res: Response) => {
      try {
        res.status(200).json({
          message: "Organization access granted",
          organizationId: req.organizationId,
          userPermissions: req.userPermissions,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Admin organization error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // ===== NLP ENDPOINTS =====
  
  // Parse business description into structured requirements
  app.post("/api/nlp/parse-business-description", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const validatedData = parseBusinessDescriptionSchema.parse(req.body);
      const { description, conversationId, context } = validatedData;
      const userId = req.user.claims.sub; // Derive userId from authenticated session
      
      // Use real NLP Service with OpenAI GPT-4 integration
      const parseResult = await nlpService.parseBusinessDescription(description, {
        conversationHistory: context?.conversationHistory || [],
        preserveContext: !!conversationId
      });
      
      const extractedEntities = {
        processes: parseResult.processes,
        forms: parseResult.forms,
        approvals: parseResult.approvals,
        integrations: parseResult.integrations
      };
      const workflowPatterns = parseResult.workflowPatterns;
      const confidence = parseResult.confidence;
      
      // Store the business requirement
      const businessRequirement = await storage.createBusinessRequirement({
        userId,
        originalDescription: description,
        extractedEntities,
        workflowPatterns,
        confidence,
        status: "validated"
      });
      
      res.status(200).json({
        businessRequirementId: businessRequirement.id,
        extractedEntities,
        workflowPatterns,
        confidence,
        status: "validated",
        suggestions: parseResult.recommendations || [],
        validationWarnings: parseResult.validationWarnings || [],
        usage: parseResult.usage
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error parsing business description" });
      }
    }
  });
  
  // Validate business description completeness
  app.post("/api/nlp/validate-description", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const validatedData = validateDescriptionSchema.parse(req.body);
      const { description } = validatedData;
      
      // Use real NLP Service for validation
      const validationResult = await nlpService.validateDescription(description);
      
      res.status(200).json({
        isValid: validationResult.isValid,
        confidence: validationResult.confidence,
        score: validationResult.score,
        suggestions: validationResult.suggestions,
        recommendations: validationResult.recommendations,
        requiredElements: {
          hasProcess: validationResult.score.businessContext > 0.5,
          hasUsers: validationResult.score.specificity > 0.5,
          hasOutcome: validationResult.score.technicalDetail > 0.3
        }
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error validating description" });
      }
    }
  });

  // ===== APPLICATION GENERATION ENDPOINTS =====
  
  // Start complete application generation from business requirements
  app.post("/api/generate/application", isAuthenticated, async (req: any, res: Response) => {
    try {
      const validatedData = generateApplicationSchema.parse(req.body);
      const { businessRequirementId } = validatedData;
      
      const businessRequirement = await storage.getBusinessRequirement(businessRequirementId);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }
      
      // Create generated application record
      const generatedApp = await storage.createGeneratedApplication({
        businessRequirementId,
        name: generateApplicationName(businessRequirement.originalDescription),
        description: `Generated application: ${businessRequirement.originalDescription}`,
        status: "generating",
        completionPercentage: 0
      });
      
      // TODO: Implement actual application generation logic
      // This would orchestrate workflow, form, and integration generation
      
      res.status(200).json({
        applicationId: generatedApp.id,
        status: "generating",
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        currentStep: "Analyzing requirements"
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error generating application" });
      }
    }
  });
  
  // Generate specific workflow within an application
  app.post("/api/generate/workflow", isAuthenticated, async (req: any, res: Response) => {
    try {
      const validatedData = generateWorkflowSchema.parse(req.body);
      const { applicationId, workflowType, configuration } = validatedData;
      
      const generatedApp = await storage.getGeneratedApplication(applicationId);
      if (!generatedApp) {
        return res.status(404).json({ message: "Generated application not found" });
      }
      
      // TODO: Implement actual workflow generation logic
      const workflowId = `workflow-${Date.now()}`;
      const generatedSteps = generateWorkflowSteps(workflowType, configuration);
      
      res.status(200).json({
        workflowId,
        generatedSteps,
        status: "completed",
        workflowType,
        configuration
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error generating workflow" });
      }
    }
  });
  
  // Get application generation status
  app.get("/api/generate/application/:id/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      
      const generatedApp = await storage.getGeneratedApplication(id);
      if (!generatedApp) {
        return res.status(404).json({ message: "Generated application not found" });
      }
      
      res.status(200).json({
        status: generatedApp.status,
        completionPercentage: generatedApp.completionPercentage,
        currentStep: getCurrentGenerationStep(generatedApp),
        estimatedTimeRemaining: calculateRemainingTime(generatedApp.completionPercentage)
      });
      
    } catch (error) {
      res.status(500).json({ message: "Internal server error getting application status" });
    }
  });

  // ===== CHATBOT ENDPOINTS =====
  
  // Create embedded chatbot for generated application
  app.post("/api/chatbot/create", isAuthenticated, async (req: any, res: Response) => {
    try {
      const validatedData = insertEmbeddedChatbotSchema.parse(req.body);
      
      const chatbot = await storage.createEmbeddedChatbot(validatedData);
      
      res.status(201).json({
        chatbotId: chatbot.id,
        name: chatbot.name,
        capabilities: chatbot.capabilities,
        isActive: chatbot.isActive,
        aiModel: chatbot.aiModel
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error creating chatbot" });
      }
    }
  });
  
  // Handle chatbot interactions
  app.post("/api/chatbot/interact", isAuthenticated, async (req: any, res: Response) => {
    try {
      const validatedData = chatbotInteractionSchema.parse(req.body);
      const { chatbotId, message, sessionId } = validatedData;
      const userId = req.user.claims.sub; // Derive userId from authenticated session
      
      const chatbot = await storage.getEmbeddedChatbot(chatbotId);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      if (!chatbot.isActive) {
        return res.status(400).json({ message: "Chatbot is not active" });
      }
      
      // TODO: Integrate with OpenAI for actual chatbot response
      const mockResponse = generateChatbotResponse(message, chatbot);
      const newSessionId = sessionId || `session-${Date.now()}`;
      
      res.status(200).json({
        response: mockResponse,
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
        chatbotId,
        aiModel: chatbot.aiModel
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error during chatbot interaction" });
      }
    }
  });
  
  // Get chatbot details
  app.get("/api/chatbot/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      
      const chatbot = await storage.getEmbeddedChatbot(id);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      res.status(200).json({
        id: chatbot.id,
        name: chatbot.name,
        capabilities: chatbot.capabilities,
        isActive: chatbot.isActive,
        aiModel: chatbot.aiModel,
        generatedApplicationId: chatbot.generatedApplicationId
      });
      
    } catch (error) {
      res.status(500).json({ message: "Internal server error getting chatbot details" });
    }
  });

  // ===== ERROR HANDLING =====
  
  // 404 handler for API routes
  app.use("/api/*", (req: Request, res: Response) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// ===== UTILITY FUNCTIONS =====

// Mock NLP processing functions (to be replaced with actual OpenAI integration)
function extractProcesses(description: string): string[] {
  const processes = [];
  if (description.toLowerCase().includes('onboarding')) processes.push('employee_onboarding');
  if (description.toLowerCase().includes('approval')) processes.push('approval_process');
  if (description.toLowerCase().includes('background check')) processes.push('background_verification');
  return processes;
}

function extractForms(description: string): string[] {
  const forms = [];
  if (description.toLowerCase().includes('employee') || description.toLowerCase().includes('personal')) {
    forms.push('employee_information_form');
  }
  if (description.toLowerCase().includes('background check')) {
    forms.push('background_check_authorization_form');
  }
  return forms;
}

function extractApprovals(description: string): string[] {
  const approvals = [];
  if (description.toLowerCase().includes('manager')) approvals.push('manager_approval');
  if (description.toLowerCase().includes('hr')) approvals.push('hr_approval');
  if (description.toLowerCase().includes('supervisor')) approvals.push('supervisor_approval');
  return approvals;
}

function extractIntegrations(description: string): string[] {
  const integrations = [];
  if (description.toLowerCase().includes('background check')) integrations.push('background_check_api');
  if (description.toLowerCase().includes('email')) integrations.push('email_service');
  return integrations;
}

function identifyWorkflowPatterns(description: string): string[] {
  const patterns = [];
  if (description.toLowerCase().includes('approval')) patterns.push('sequential_approval');
  if (description.toLowerCase().includes('conditional')) patterns.push('conditional_routing');
  if (description.toLowerCase().includes('parallel')) patterns.push('parallel_processing');
  return patterns;
}

function calculateConfidence(description: string): number {
  const length = description.length;
  const keywordCount = ['process', 'workflow', 'approval', 'form', 'user', 'employee'].filter(keyword => 
    description.toLowerCase().includes(keyword)
  ).length;
  
  return Math.min(0.95, (length / 200) * 0.3 + (keywordCount / 6) * 0.7);
}

function generateSuggestions(description: string): string[] {
  const suggestions = [];
  if (!description.toLowerCase().includes('approval')) {
    suggestions.push('Consider adding approval steps for better workflow control');
  }
  if (!description.toLowerCase().includes('notification')) {
    suggestions.push('Add email notifications to keep users informed');
  }
  return suggestions;
}

function calculateCompletenessScore(description: string): number {
  const requiredElements = [
    description.toLowerCase().includes('process') || description.toLowerCase().includes('workflow'),
    description.toLowerCase().includes('user') || description.toLowerCase().includes('employee'),
    description.toLowerCase().includes('approval') || description.toLowerCase().includes('complete'),
    description.length >= 20
  ];
  
  return requiredElements.filter(Boolean).length / requiredElements.length;
}

function generateCompletnessSuggestions(description: string): string[] {
  const suggestions = [];
  if (!description.toLowerCase().includes('process') && !description.toLowerCase().includes('workflow')) {
    suggestions.push('Describe the business process or workflow you want to create');
  }
  if (!description.toLowerCase().includes('user') && !description.toLowerCase().includes('employee')) {
    suggestions.push('Specify who will be using this application');
  }
  if (description.length < 20) {
    suggestions.push('Provide more details about your requirements');
  }
  return suggestions;
}

function generateApplicationName(description: string): string {
  if (description.toLowerCase().includes('onboarding')) return 'Employee Onboarding System';
  if (description.toLowerCase().includes('approval')) return 'Approval Workflow System';
  if (description.toLowerCase().includes('inventory')) return 'Inventory Management System';
  return 'Custom Business Application';
}

function generateWorkflowSteps(workflowType: string, configuration: any): string[] {
  switch (workflowType) {
    case 'approval_workflow':
      return ['submit_request', 'initial_review', 'manager_approval', 'final_processing', 'notification'];
    case 'onboarding_workflow':
      return ['information_collection', 'document_verification', 'background_check', 'approval', 'account_creation'];
    default:
      return ['start', 'process', 'review', 'complete'];
  }
}

function getCurrentGenerationStep(app: any): string {
  if (app.completionPercentage < 25) return 'Analyzing requirements';
  if (app.completionPercentage < 50) return 'Generating workflows';
  if (app.completionPercentage < 75) return 'Creating forms and integrations';
  if (app.completionPercentage < 100) return 'Setting up embedded chatbots';
  return 'Finalizing application';
}

function calculateRemainingTime(completionPercentage: number): string {
  const remainingPercent = 100 - completionPercentage;
  const estimatedMinutes = Math.ceil((remainingPercent / 100) * 5); // 5 minutes total
  return `${estimatedMinutes} minutes`;
}

function generateChatbotResponse(message: string, chatbot: any): string {
  // Mock chatbot responses based on capabilities
  if (message.toLowerCase().includes('help')) {
    return `Hi! I'm ${chatbot.name}. I'm here to help you with this application. What would you like to know?`;
  }
  if (message.toLowerCase().includes('status')) {
    return "You can check your current progress in the workflow by looking at the status indicator at the top of the page.";
  }
  if (message.toLowerCase().includes('document')) {
    return "To submit documents, use the file upload section in the form. Make sure your files are in PDF or image format.";
  }
  return "I understand your question. Let me help you with that. Could you provide more specific details about what you need assistance with?";
}
