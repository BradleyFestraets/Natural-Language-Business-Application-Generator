import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import url from "url";
import { storage as defaultStorage, type IStorage } from "./storage";
import { z } from "zod";
import { insertBusinessRequirementSchema, insertGeneratedApplicationSchema, insertEmbeddedChatbotSchema, insertChatInteractionSchema } from "@shared/schema";
import { NLPService } from "./services/nlpService.js";
import { ClarificationService } from "./services/clarificationService";
import { ApplicationGenerationService } from "./services/applicationGenerationService";
import { WorkflowGenerationService } from "./services/workflowGenerationService";
import { getWorkflowExecutionEngine } from "./engines/workflowExecutionEngineInstance";
import { nlpAnalysisService } from "./services/nlpAnalysisService";
import { embeddedChatbotService } from "./services/embeddedChatbotService";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { registerWorkflowRoutes } from "./workflowRoutes";
import session from "express-session";
import connectPg from "connect-pg-simple";
import cookieSignature from 'cookie-signature';
import { requireAIServiceMiddleware, checkAIServiceMiddleware } from "./middleware/aiServiceMiddleware";
import { globalServiceHealth } from "./config/validation";
import type { ExtractedBusinessData } from "./services/nlpService";
import { 
  requireOrganization, 
  requirePermissions, 
  requireAdmin, 
  requireOrgRead,
  requireUserManagement,
  SYSTEM_PERMISSIONS,
  type AuthorizedRequest 
} from "./middleware/authorizationMiddleware";
import { ComputerUseService } from "./services/computerUseService";
import { ImageVideoGenerationService } from "./services/imageVideoGenerationService";
import { marketingRouter } from "./routes/marketingRoutes";
import { enterpriseRouter } from "./routes/enterpriseRoutes";

// Session typing for proper TypeScript support
interface SessionWithPassport {
  passport?: {
    user?: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
  };
  [key: string]: any;
}

// Validation schemas for API requests (userId removed - derived from auth session)
const parseBusinessDescriptionSchema = z.object({
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(10000, "Description cannot exceed 10,000 characters")
    .refine(desc => desc.trim().length >= 10, "Description must contain meaningful content"),
  conversationId: z.string().optional(),
  context: z.record(z.any()).optional()
});

const validateDescriptionSchema = z.object({
  description: z.string()
    .min(1, "Description cannot be empty")
    .max(10000, "Description cannot exceed 10,000 characters")
    .refine(desc => desc.trim().length >= 1, "Description must contain meaningful content")
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

const clarificationQuestionSchema = z.object({
  businessRequirementId: z.string()
});

const clarificationResponseSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  response: z.string().min(1, "Response cannot be empty")
});

const refineRequirementsSchema = z.object({
  businessRequirementId: z.string(),
  sessionId: z.string()
});

export async function registerRoutes(
  app: Express, 
  injectedStorage?: IStorage,
  options?: { disableAuth?: boolean }
): Promise<Server> {
  // Use injected storage for testing or default storage for production
  const storage = injectedStorage || defaultStorage;

  // Set up authentication first (unless disabled for testing)
  if (!options?.disableAuth) {
    await setupAuth(app);
  }

  // Initialize NLP Service, Clarification Service, Application Generation Service, Workflow Generation Service, and Computer Use Service
  const nlpService = new NLPService();
  const clarificationService = new ClarificationService();
  const applicationGenerationService = new ApplicationGenerationService();
  const workflowGenerationService = new WorkflowGenerationService();
  const computerUseService = new ComputerUseService();
  const imageVideoService = new ImageVideoGenerationService();

  // ===== GENERATION PROGRESS ENDPOINT =====
  
  // WebSocket endpoint for generation progress
  app.get('/api/generation/ws-token/:applicationId', isAuthenticated, requireOrganization(), (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const token = generateWsToken('generation-progress', applicationId, req.sessionID || '');
    res.json({ token, endpoint: `/ws/generation-progress/${applicationId}` });
  });
  
  // ===== NLP ENDPOINTS =====
  
  // Parse business description with streaming support
  app.post("/api/nlp/parse-business-description", isAuthenticated, requireOrganization(), checkAIServiceMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthorizedRequest;
    try {
      const validation = parseBusinessDescriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }

      const { description, conversationId, context } = validation.data;
      const userId = authReq.user.claims.sub;
      const organizationId = authReq.organizationId;

      // Parse the business description
      const extractedData = await nlpService.parseBusinessDescription(description, {
        conversationHistory: context?.history,
        preserveContext: context?.preserveContext,
        allowFallback: true
      });

      // Save the business requirement
      const requirement: InsertBusinessRequirement = {
        userId,
        organizationId,
        originalDescription: description,
        extractedEntities: extractedData as any,
        workflowPatterns: extractedData.workflowPatterns || [],
        confidence: extractedData.confidence || 0.5,
        status: 'validated'
      };

      const savedRequirement = await storage.createBusinessRequirement(requirement);
      res.json(savedRequirement);
    } catch (error) {
      console.error("Error parsing business description:", error);
      res.status(500).json({ 
        message: "Failed to parse business description", 
        error: error.message 
      });
    }
  });

  // Validate business description
  app.post("/api/nlp/validate-description", checkAIServiceMiddleware, async (req: Request, res: Response) => {
    try {
      const validation = validateDescriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }

      const { description } = validation.data;
      const validationResult = await nlpService.validateBusinessDescription(description, {
        includeRecommendations: true,
        checkCompleteness: true
      });

      res.json(validationResult);
    } catch (error) {
      console.error("Error validating description:", error);
      res.status(500).json({ 
        message: "Failed to validate description", 
        error: error.message 
      });
    }
  });

  // Get auto-completion suggestions
  app.post("/api/nlp/auto-complete", async (req: Request, res: Response) => {
    try {
      const { partialDescription, context } = req.body;
      
      if (!partialDescription || partialDescription.length < 5) {
        return res.json({ suggestions: [] });
      }

      // Get suggestions from common business scenarios
      const suggestions = await nlpService.getAutoCompleteSuggestions(partialDescription, {
        context,
        maxSuggestions: 5
      });

      res.json({ suggestions });
    } catch (error) {
      console.error("Error getting auto-complete suggestions:", error);
      res.json({ suggestions: [] }); // Return empty suggestions on error
    }
  });

  // Extract comprehensive business requirements with advanced analysis
  app.post("/api/nlp/extract-requirements", isAuthenticated, requireOrganization(), checkAIServiceMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthorizedRequest;
    try {
      const { description, context, enableAdvancedAnalysis } = req.body;
      
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ 
          message: "Description must be at least 10 characters" 
        });
      }

      // Extract comprehensive requirements using advanced NLP
      const extractedData = await nlpService.extractRequirements(description, {
        context,
        enableAdvancedAnalysis: enableAdvancedAnalysis !== false
      });

      // Store the extracted requirements in the database
      const businessRequirement = await storage.createBusinessRequirement({
        userId: authReq.user.claims.sub,
        organizationId: authReq.organizationId,
        originalDescription: description,
        extractedEntities: {
          businessContext: extractedData.businessContext,
          processes: extractedData.processes,
          forms: extractedData.forms,
          approvals: extractedData.approvals,
          integrations: extractedData.integrations,
          workflowPatterns: extractedData.workflowPatterns,
          riskAssessment: extractedData.riskAssessment,
          resourceRequirements: extractedData.resourceRequirements
        },
        workflowPatterns: extractedData.workflowPatterns,
        confidence: extractedData.confidence,
        status: "validated"
      });

      res.json({
        requirementId: businessRequirement.id,
        extractedData,
        confidence: extractedData.confidence,
        recommendations: extractedData.recommendations
      });
    } catch (error) {
      console.error("Error extracting requirements:", error);
      res.status(500).json({ 
        message: "Failed to extract requirements", 
        error: error.message 
      });
    }
  });

  // Extract workflow patterns from description
  app.post("/api/nlp/extract-workflow-patterns", checkAIServiceMiddleware, async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ 
          message: "Description must be at least 10 characters" 
        });
      }

      const patterns = await nlpService.extractWorkflowPatterns(description);
      
      res.json({ patterns });
    } catch (error) {
      console.error("Error extracting workflow patterns:", error);
      res.status(500).json({ 
        message: "Failed to extract workflow patterns", 
        error: error.message 
      });
    }
  });

  // Infer form fields from description
  app.post("/api/nlp/infer-form-fields", checkAIServiceMiddleware, async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ 
          message: "Description must be at least 10 characters" 
        });
      }

      const fields = await nlpService.inferFormFields(description);
      
      res.json({ fields });
    } catch (error) {
      console.error("Error inferring form fields:", error);
      res.status(500).json({ 
        message: "Failed to infer form fields", 
        error: error.message 
      });
    }
  });

  // Extract approval chains from description
  app.post("/api/nlp/extract-approval-chains", checkAIServiceMiddleware, async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ 
          message: "Description must be at least 10 characters" 
        });
      }

      const chains = await nlpService.extractApprovalChains(description);
      
      res.json({ chains });
    } catch (error) {
      console.error("Error extracting approval chains:", error);
      res.status(500).json({ 
        message: "Failed to extract approval chains", 
        error: error.message 
      });
    }
  });

  // Identify integration requirements
  app.post("/api/nlp/identify-integrations", checkAIServiceMiddleware, async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ 
          message: "Description must be at least 10 characters" 
        });
      }

      const integrations = await nlpService.identifyIntegrationRequirements(description);
      
      res.json({ integrations });
    } catch (error) {
      console.error("Error identifying integrations:", error);
      res.status(500).json({ 
        message: "Failed to identify integrations", 
        error: error.message 
      });
    }
  });

  // Get conversation history
  app.get("/api/nlp/conversation/:conversationId", isAuthenticated, requireOrganization(), async (req: Request, res: Response) => {
    const authReq = req as AuthorizedRequest;
    try {
      const { conversationId } = req.params;
      const userId = authReq.user.claims.sub;

      // Get conversation history from storage (would need to implement conversation storage)
      const requirements = await storage.listBusinessRequirements(userId);
      const conversation = requirements.filter(r => 
        r.id === conversationId || r.originalDescription.includes(conversationId)
      );

      res.json({ conversation });
    } catch (error) {
      console.error("Error getting conversation history:", error);
      res.status(500).json({ 
        message: "Failed to get conversation history", 
        error: error.message 
      });
    }
  });

  // ===== WORKFLOW MANAGEMENT ENDPOINTS =====

  // Get all available workflow patterns  
  app.get("/api/workflows", isAuthenticated, requireOrganization(), async (req: Request, res: Response) => {
    const authReq = req as AuthorizedRequest;
    try {
      // Get all generated applications for the organization to extract workflow patterns
      const generatedApps = await storage.getGeneratedApplicationsByOrganization(authReq.organizationId!);

      const workflows: any[] = [];

      // Extract workflow patterns from generated applications
      for (const app of generatedApps) {
        if (app.generatedWorkflows && Array.isArray(app.generatedWorkflows)) {
          workflows.push(...app.generatedWorkflows.map(workflow => ({
            ...workflow,
            applicationId: app.id,
            applicationName: app.name,
            activeExecutions: 0, // TODO: Calculate from actual executions
            completedToday: 0 // TODO: Calculate from actual executions
          })));
        }
      }

      // If no workflows found, return some sample patterns for demonstration
      if (workflows.length === 0) {
        workflows.push({
          id: "sample-approval-workflow",
          name: "Approval Workflow",
          description: "Basic approval process for business requests",
          type: "sequential",
          complexity: "medium",
          estimatedDuration: 4,
          activeExecutions: 0,
          completedToday: 0
        });
      }

      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  // Get active workflow executions - SECURITY CRITICAL: Organization scoped
  app.get("/api/workflows/executions/active", isAuthenticated, requireOrganization(), async (req: Request, res: Response) => {
    const authReq = req as AuthorizedRequest;
    try {
      const userId = authReq.user.claims.sub;

      // SECURITY CRITICAL: Use organization-scoped execution listing to prevent cross-tenant data exposure
      const organizationExecutions = await getWorkflowExecutionEngine().listUserExecutionsByOrg(userId, authReq.organizationId);

      // Filter for active executions (in_progress, pending) within the user's organization
      const activeExecutions = organizationExecutions.filter(execution => 
        ["in_progress", "pending"].includes(execution.status)
      );

      res.json(activeExecutions);
    } catch (error) {
      console.error("Error fetching active executions:", error);
      res.status(500).json({ message: "Failed to fetch active executions" });
    }
  });

  // Register workflow execution routes
  registerWorkflowRoutes(app);

  // ===== PROCESS AUTOMATION ENGINE ENDPOINTS =====

  // Initialize Process Automation Engine and Monitoring Service (singletons)
  const { ProcessAutomationEngine } = await import("./engines/processAutomationEngine");
  const { ProcessMonitoringService } = await import("./services/processMonitoringService");
  const { BusinessProcessConnector } = await import("./services/businessProcessConnector");

  const processAutomationEngine = new ProcessAutomationEngine({
    enableAIDecisions: true,
    enableAutoRecovery: true,
    enableRealTimeMonitoring: true,
    maxRetryAttempts: 3,
    escalationThreshold: 24
  });

  const processMonitoringService = new ProcessMonitoringService();
  const businessProcessConnector = new BusinessProcessConnector();

  // Start automated business process
  app.post("/api/process/start", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const { workflowId, businessRequirementId, initialData = {} } = req.body;
      const userId = req.user.claims.sub;
      const applicationId = req.body.applicationId || "default-app";

      // Mock workflow pattern - in production would fetch from database
      const workflowPattern = {
        id: workflowId,
        name: `Business Process ${workflowId}`,
        description: "Automated business process workflow",
        type: "sequential" as const,
        steps: [
          { 
            id: "step1", 
            name: "Initialize Process", 
            type: "form" as const,
            slaHours: 2,
            escalationRules: [{ condition: "timeout", escalateTo: ["manager"] }],
            validationRules: [],
            automationLevel: "full" as const
          }
        ],
        triggers: ["manual_start"],
        metadata: {
          estimatedDuration: 7,
          complexity: "medium" as const,
          category: "business" as const,
          tags: ["automated", "ai-powered"]
        }
      };

      const processExecution = await processAutomationEngine.startAutomatedProcess(
        workflowPattern,
        userId,
        applicationId,
        req.organizationId, // CRITICAL: Pass organizationId for multi-tenant security
        undefined,
        initialData
      );

      // Wire monitoring
      processMonitoringService.registerProcess(processExecution);

      res.status(200).json({
        executionId: processExecution.executionId,
        status: processExecution.status,
        progress: processExecution.progress,
        currentStep: processExecution.currentStep,
        estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });

    } catch (error) {
      console.error("Process automation start failed:", error);
      res.status(500).json({
        message: "Failed to start automated process",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get process analytics dashboard
  app.get("/api/process/analytics", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const dashboard = processMonitoringService.getProcessDashboard(req.organizationId);
      res.status(200).json(dashboard);
    } catch (error) {
      console.error("Failed to get process analytics:", error);
      res.status(500).json({
        message: "Failed to retrieve process analytics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send business process notifications  
  app.post("/api/process/notify", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const { type, recipients, message, subject, priority = "medium" } = req.body;

      const response = await businessProcessConnector.sendNotification(
        type,
        recipients,
        message,
        subject,
        priority
      );

      res.status(200).json({
        success: response.success,
        messageId: response.data?.messageId,
        recipients: recipients.length
      });
    } catch (error) {
      console.error("Notification sending failed:", error);
      res.status(500).json({
        message: "Failed to send notification",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate process performance report
  app.get("/api/process/reports/:timeRange", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const { timeRange = "day" } = req.params;

      const report = processMonitoringService.generatePerformanceReport(timeRange as "day" | "week" | "month");

      res.status(200).json({
        timeRange,
        generatedAt: new Date().toISOString(),
        ...report
      });
    } catch (error) {
      console.error("Report generation failed:", error);
      res.status(500).json({
        message: "Failed to generate performance report",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== TEMPLATE GENERATION SYSTEM ENDPOINTS (Story 5.2) =====

  // Initialize Template Generation Service
  const { templateGenerationService } = await import("./services/templateGenerationService");

  // Zod validation schemas for Template Generation endpoints
  const generateTemplateSchema = z.object({
    applicationId: z.string().min(1, "Application ID is required"),
    options: z.object({
      includeCustomizations: z.boolean().optional(),
      generateDocumentation: z.boolean().optional(),
      extractAdvancedPatterns: z.boolean().optional()
    }).optional().default({})
  });

  const deployTemplateSchema = z.object({
    applicationName: z.string().min(1, "Application name is required").max(100, "Name too long"),
    customizations: z.record(z.any()).optional().default({}),
    configuration: z.object({
      environment: z.enum(["development", "staging", "production"]).optional(),
      enableAI: z.boolean().optional(),
      integrations: z.array(z.string()).optional()
    }).optional().default({})
  });

  // Generate template from existing application
  app.post("/api/templates/generate", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      // Validate request body
      const validation = generateTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      const { applicationId, options } = validation.data;

      // Mock application data for template generation
      const mockApplication = {
        id: applicationId,
        name: `Business Application ${applicationId}`,
        description: "AI-generated business application with workflows and forms",
        organizationId: req.organizationId,
        status: "completed",
        workflowConfiguration: {
          steps: [
            { id: "step1", name: "Submit Request", type: "form" },
            { id: "step2", name: "Manager Review", type: "approval" },
            { id: "step3", name: "Final Processing", type: "automated_task" }
          ]
        },
        formConfiguration: {
          forms: [
            { name: "Request Form", description: "Initial data collection" },
            { name: "Approval Form", description: "Review and approval" }
          ]
        },
        integrationConfiguration: {
          externalServices: ["email_service", "notification_service"]
        }
      };

      const template = await templateGenerationService.generateTemplate(mockApplication, undefined, options);

      res.status(201).json({
        templateId: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        estimatedDeploymentTime: template.metadata.estimatedDeploymentTime,
        customizationPoints: template.customizationPoints.length,
        success: true
      });

    } catch (error) {
      console.error("Template generation failed:", error);
      res.status(500).json({
        message: "Failed to generate template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get available templates with filtering
  app.get("/api/templates", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const filters = {
        category: req.query.category,
        industry: req.query.industry,
        complexity: req.query.complexity,
        search: req.query.search
      };

      const templates = await templateGenerationService.getAvailableTemplates({
        ...filters,
        organizationId: req.organizationId // Add organization scoping at service level
      });

      res.status(200).json({
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          complexity: t.metadata.complexity,
          estimatedDeploymentTime: t.metadata.estimatedDeploymentTime,
          tags: t.metadata.tags,
          version: t.version,
          createdAt: t.createdAt
        })),
        total: templates.length
      });

    } catch (error) {
      console.error("Template retrieval failed:", error);
      res.status(500).json({
        message: "Failed to retrieve templates",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Deploy template to create new application
  app.post("/api/templates/:templateId/deploy", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const { templateId } = req.params;

      // Validate template ID
      if (!templateId || typeof templateId !== 'string' || templateId.length === 0) {
        return res.status(400).json({ message: "Valid template ID is required" });
      }

      // Validate request body
      const validation = deployTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid deployment data",
          errors: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      const { applicationName, customizations, configuration } = validation.data;

      const deploymentRequest = {
        templateId,
        organizationId: req.organizationId,
        applicationName,
        customizations,
        configuration: {
          environment: "development",
          enableAI: true,
          integrations: [],
          ...configuration
        }
      };

      const result = await templateGenerationService.deployTemplate(deploymentRequest);

      res.status(202).json({
        deploymentId: result.deploymentId,
        applicationId: result.applicationId,
        status: result.status,
        progress: result.progress,
        estimatedCompletion: result.estimatedCompletion,
        message: "Template deployment initiated successfully"
      });

    } catch (error) {
      console.error("Template deployment failed:", error);
      res.status(500).json({
        message: "Failed to deploy template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get template details by ID
  app.get("/api/templates/:templateId", isAuthenticated, requireOrganization(), async (req: any, res: Response) => {
    try {
      const { templateId } = req.params;

      // Validate template ID
      if (!templateId || typeof templateId !== 'string' || templateId.length === 0) {
        return res.status(400).json({ message: "Valid template ID is required" });
      }

      const template = await templateGenerationService.getTemplateById(templateId, req.organizationId);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.status(200).json(template);

    } catch (error) {
      console.error("Template retrieval failed:", error);
      res.status(500).json({
        message: "Failed to retrieve template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Helper function to convert database entities to service types
  function convertToExtractedBusinessData(businessRequirement: any): ExtractedBusinessData {
    return {
      businessContext: {
        industry: businessRequirement.extractedEntities?.businessContext?.industry || 'unknown',
        criticality: (businessRequirement.extractedEntities?.businessContext?.criticality as any) || 'standard',
        scope: (businessRequirement.extractedEntities?.businessContext?.scope as any) || 'department',
        complianceRequirements: businessRequirement.extractedEntities?.businessContext?.complianceRequirements || []
      },
      processes: (businessRequirement.extractedEntities?.processes || []).map((p: any) => ({
        name: p.name,
        type: (p.type as any) || 'core',
        description: p.description || '',
        complexity: (p.complexity as any) || 'medium',
        dependencies: p.dependencies || []
      })),
      forms: (businessRequirement.extractedEntities?.forms || []).map((f: any) => ({
        name: f.name,
        purpose: f.purpose || '',
        complexity: (f.complexity as any) || 'moderate',
        dataTypes: f.dataTypes || [],
        validationRules: f.validationRules || []
      })),
      approvals: (businessRequirement.extractedEntities?.approvals || []).map((a: any) => ({
        name: a.name,
        role: a.role || '',
        criteria: a.criteria || '',
        escalation: a.escalation,
        timeLimit: a.timeLimit
      })),
      integrations: (businessRequirement.extractedEntities?.integrations || []).map((i: any) => ({
        name: i.name,
        type: (i.type as any) || 'api',
        purpose: i.purpose || '',
        criticality: (i.criticality as any) || 'optional',
        dataFlow: (i.dataFlow as any)
      })),
      workflowPatterns: Array.isArray(businessRequirement.extractedEntities?.workflowPatterns) && 
        typeof businessRequirement.extractedEntities.workflowPatterns[0] === 'object' 
        ? (businessRequirement.extractedEntities.workflowPatterns as any[]).map((w: any) => ({
            name: w.name,
            type: (w.type as any) || 'sequential',
            description: w.description || '',
            complexity: (w.complexity as any) || 'moderate',
            businessRules: w.businessRules || []
          }))
        : [],
      riskAssessment: {
        securityRisks: businessRequirement.extractedEntities?.riskAssessment?.securityRisks || [],
        complianceRisks: businessRequirement.extractedEntities?.riskAssessment?.complianceRisks || [],
        operationalRisks: businessRequirement.extractedEntities?.riskAssessment?.operationalRisks || [],
        mitigationStrategies: businessRequirement.extractedEntities?.riskAssessment?.mitigationStrategies || []
      },
      resourceRequirements: {
        userRoles: businessRequirement.extractedEntities?.resourceRequirements?.userRoles || [],
        technicalComplexity: (businessRequirement.extractedEntities?.resourceRequirements?.technicalComplexity as any) || 'medium',
        estimatedTimeframe: businessRequirement.extractedEntities?.resourceRequirements?.estimatedTimeframe || 'unknown',
        infrastructureNeeds: businessRequirement.extractedEntities?.resourceRequirements?.infrastructureNeeds || []
      },
      confidence: businessRequirement.confidence || 0.5
    };
  }

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

  // Circuit breaker metrics endpoint for monitoring - ADMIN ONLY
  app.get("/api/ai-service/metrics", isAuthenticated, requireAdmin(), async (req: Request, res: Response) => {
    try {
      const metrics = nlpService.getServiceMetrics();
      const degradationDuration = await nlpService.getDegradationDuration();

      res.json({
        production: {
          totalCalls: metrics.totalCalls,
          successfulCalls: metrics.successfulCalls,
          failedCalls: metrics.failedCalls,
          averageResponseTime: metrics.averageResponseTime,
          lastFailureTime: metrics.lastFailureTime,
          lastSuccessTime: metrics.lastSuccessTime
        },
        probes: {
          totalProbes: metrics.totalProbes,
          successfulProbes: metrics.successfulProbes,
          failedProbes: metrics.failedProbes,
          lastProbeTime: metrics.lastProbeTime,
          lastSuccessfulProbe: metrics.lastSuccessfulProbe
        },
        circuit: {
          state: metrics.circuitState,
          degradationDuration
        },
        healthCheck: {
          productionAvailability: metrics.lastSuccessTime ? Date.now() - metrics.lastSuccessTime < 300000 : false, // 5 min since last production success
          probeAvailability: metrics.lastSuccessfulProbe ? Date.now() - metrics.lastSuccessfulProbe < 300000 : false, // 5 min since last successful probe
          productionErrorRate: metrics.totalCalls > 0 ? (metrics.failedCalls / metrics.totalCalls) * 100 : 0,
          probeErrorRate: metrics.totalProbes > 0 ? (metrics.failedProbes / metrics.totalProbes) * 100 : 0,
          timeSinceLastSuccess: metrics.lastSuccessTime ? Date.now() - metrics.lastSuccessTime : null,
          timeSinceLastProbe: metrics.lastSuccessfulProbe ? Date.now() - metrics.lastSuccessfulProbe : null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve AI service metrics' });
    }
  });

  // ===== ADMIN API ENDPOINTS =====

  // Demo admin endpoint with organization and permission requirements
  app.get("/api/admin/organizations/:organizationId", 
    isAuthenticated, 
    requireOrganization('params'),
    requireOrgRead(),
    async (req: any, res: Response) => {
      try {
        res.status(200).json({
          message: "Organization access granted",
          organizationId: (req as AuthorizedRequest).organizationId,
          userPermissions: (req as AuthorizedRequest).userPermissions,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Admin organization error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // ===== BUSINESS REQUIREMENTS ENDPOINTS =====

  /**
   * Get business requirement by ID with multi-tenant isolation
   */
  app.get("/api/business-requirements/:id", isAuthenticated, requireOrganization(), async (req: AuthorizedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.organizationId;

      const requirement = await storage.getBusinessRequirement(id);

      // Enforce multi-tenant isolation
      if (!requirement || requirement.organizationId !== organizationId) {
        return res.status(404).json({
          error: "Business requirement not found",
          message: "The requested business requirement does not exist or access is denied"
        });
      }

      res.json(requirement);
    } catch (error) {
      console.error("Error fetching business requirement:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch business requirement"
      });
    }
  });

  /**
   * List business requirements with multi-tenant isolation
   */
  app.get("/api/business-requirements", isAuthenticated, requireOrganization(), async (req: AuthorizedRequest, res: Response) => {
    try {
      const organizationId = req.organizationId;
      const requirements = await storage.listBusinessRequirements(organizationId);
      res.json(requirements);
    } catch (error) {
      console.error("Error listing business requirements:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to list business requirements"
      });
    }
  });

  /**
   * Create new business requirement
   */
  app.post("/api/business-requirements", isAuthenticated, requireOrganization(), async (req: AuthorizedRequest, res: Response) => {
    try {
      const organizationId = req.organizationId;
      const userId = req.user.claims.sub;

      const requirementData = {
        ...req.body,
        organizationId,
        userId,
        createdAt: new Date().toISOString()
      };

      const requirement = await storage.createBusinessRequirement(requirementData);
      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating business requirement:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create business requirement"
      });
    }
  });

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
        businessContext: parseResult.businessContext,
        processes: parseResult.processes,
        forms: parseResult.forms,
        approvals: parseResult.approvals,
        integrations: parseResult.integrations,
        workflowPatterns: parseResult.workflowPatterns,
        riskAssessment: parseResult.riskAssessment,
        resourceRequirements: parseResult.resourceRequirements,
        // Legacy format for backward compatibility
        processes_legacy: parseResult.processes?.map(p => p.name) || [],
        forms_legacy: parseResult.forms?.map(f => f.name) || [],
        approvals_legacy: parseResult.approvals?.map(a => a.name) || [],
        integrations_legacy: parseResult.integrations?.map(i => i.name) || []
      };
      const workflowPatterns = parseResult.workflowPatterns;
      const confidence = parseResult.confidence;

      // Store the business requirement
      const businessRequirement = await storage.createBusinessRequirement({
        userId,
        organizationId: req.organizationId!,
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

  // Streaming NLP analysis with real-time progress updates
  app.post("/api/nlp/parse-business-description/stream", isAuthenticated, requireOrganization(), requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const validatedData = parseBusinessDescriptionSchema.parse(req.body);
      const { description, conversationId, context } = validatedData;
      const userId = req.user.claims.sub;

      // Create analysis session ID for WebSocket tracking
      const analysisSessionId = `nlp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Store initial business requirement with pending status
      const businessRequirement = await storage.createBusinessRequirement({
        userId,
        organizationId: req.organizationId, // SECURITY CRITICAL: Bind to user's organization
        originalDescription: description,
        extractedEntities: {
          businessContext: { industry: "General", criticality: "standard", scope: "department" },
          processes: [],
          forms: [],
          approvals: [],
          integrations: [],
          workflowPatterns: [],
          riskAssessment: { securityRisks: [], complianceRisks: [], operationalRisks: [] },
          resourceRequirements: { userRoles: [], technicalComplexity: "medium", estimatedTimeframe: "2-4 weeks" },
          processes_legacy: [],
          forms_legacy: [],
          approvals_legacy: [],
          integrations_legacy: []
        },
        workflowPatterns: [],
        confidence: 0,
        status: "analyzing"
      });

      // SECURITY: Generate CSRF token for WebSocket connection
      const csrfToken = `csrf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // SECURITY CRITICAL: Create analysis session with organization and CSRF token tracking
      nlpAnalysisService.createAnalysisSession(analysisSessionId, userId, req.organizationId, businessRequirement.id, csrfToken);

      // Start streaming analysis in background
      const onUpdate = (update: any) => {
        nlpAnalysisService.updateProgress(analysisSessionId, {
          businessRequirementId: businessRequirement.id,
          status: update.status,
          progress: update.progress,
          message: update.message,
          partialData: update.partialData
        });
      };

      // Use streaming NLP Service with real-time updates
      nlpService.streamParseBusinessDescription(description, onUpdate)
        .then(async (parseResult) => {
          const extractedEntities = {
            businessContext: parseResult.businessContext,
            processes: parseResult.processes,
            forms: parseResult.forms,
            approvals: parseResult.approvals,
            integrations: parseResult.integrations,
            workflowPatterns: parseResult.workflowPatterns,
            riskAssessment: parseResult.riskAssessment,
            resourceRequirements: parseResult.resourceRequirements,
            // Legacy format for backward compatibility
            processes_legacy: parseResult.processes?.map(p => p.name) || [],
            forms_legacy: parseResult.forms?.map(f => f.name) || [],
            approvals_legacy: parseResult.approvals?.map(a => a.name) || [],
            integrations_legacy: parseResult.integrations?.map(i => i.name) || []
          };

          // Update stored business requirement with final results
          await storage.updateBusinessRequirement(businessRequirement.id, {
            extractedEntities,
            workflowPatterns: parseResult.workflowPatterns,
            confidence: parseResult.confidence,
            status: "validated"
          });

          // Send final completion update
          nlpAnalysisService.updateProgress(analysisSessionId, {
            businessRequirementId: businessRequirement.id,
            status: "completed",
            progress: 100,
            message: "Analysis complete!",
            finalResult: {
              extractedEntities,
              workflowPatterns: parseResult.workflowPatterns,
              confidence: parseResult.confidence
            }
          });

          // Clean up after a delay
          setTimeout(() => {
            nlpAnalysisService.cleanupSession(analysisSessionId);
          }, 30000); // Clean up after 30 seconds
        })
        .catch((error) => {
          console.error("Streaming analysis failed:", error);
          nlpAnalysisService.updateProgress(analysisSessionId, {
            businessRequirementId: businessRequirement.id,
            status: "error",
            progress: 0,
            message: "Analysis failed",
            error: error.message
          });
        });

      res.status(200).json({
        analysisSessionId,
        businessRequirementId: businessRequirement.id,
        status: "started",
        websocketUrl: `/ws/nlp-analysis/${analysisSessionId}`,
        csrfToken
      });
    } catch (error) {
      console.error("Failed to start streaming analysis:", error);
      res.status(500).json({
        error: "Failed to start analysis",
        message: error instanceof Error ? error.message : "Unknown error"
      });
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

  // ===== CLARIFICATION ENDPOINTS =====

  // Generate clarification questions for a business requirement
  app.post("/api/nlp/clarification/questions", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const validatedData = clarificationQuestionSchema.parse(req.body);
      const { businessRequirementId } = validatedData;

      // Get the business requirement
      const businessRequirement = await storage.getBusinessRequirement(businessRequirementId);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }

      // Generate clarification questions
      const extractedData = convertToExtractedBusinessData(businessRequirement);

      const questions = await clarificationService.generateClarificationQuestions(
        businessRequirementId,
        extractedData,
        businessRequirement.originalDescription
      );

      // Create clarification session
      const session = await clarificationService.createClarificationSession(
        businessRequirementId,
        questions
      );

      res.status(200).json({
        sessionId: session.sessionId,
        questions: session.questions,
        totalQuestions: session.totalQuestions,
        estimatedCompletionTime: session.estimatedCompletionTime,
        currentQuestion: session.questions[0] || null
      });

    } catch (error) {
      console.error("Error generating clarification questions:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error generating clarification questions" });
      }
    }
  });

  // Process response to clarification question
  app.post("/api/nlp/clarification/response", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const validatedData = clarificationResponseSchema.parse(req.body);
      const { sessionId, questionId, response } = validatedData;

      const session = clarificationService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Clarification session not found" });
      }

      // Get business requirement for context
      const businessRequirement = await storage.getBusinessRequirement(session.businessRequirementId);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }

      // Validate response consistency
      const extractedData = convertToExtractedBusinessData(businessRequirement);

      const validationResult = await clarificationService.validateResponse(
        questionId,
        response,
        extractedData
      );

      // Process the response
      const result = await clarificationService.processResponse(sessionId, {
        questionId,
        response,
        confidence: validationResult.confidence,
        followUpNeeded: validationResult.followUpNeeded,
        followUpQuestion: validationResult.followUpQuestion
      });

      res.status(200).json({
        sessionId: result.session.sessionId,
        isComplete: result.isComplete,
        nextQuestion: result.nextQuestion,
        currentQuestionIndex: result.session.currentQuestionIndex,
        totalQuestions: result.session.totalQuestions,
        progress: (result.session.currentQuestionIndex / result.session.totalQuestions) * 100,
        validationResult: {
          isConsistent: validationResult.isConsistent,
          confidence: validationResult.confidence
        }
      });

    } catch (error) {
      console.error("Error processing clarification response:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error processing response" });
      }
    }
  });

  // Refine requirements based on clarification responses
  app.post("/api/nlp/requirements/:id/refine", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const { id: businessRequirementId } = req.params;
      const validatedData = refineRequirementsSchema.parse({ 
        businessRequirementId, 
        ...req.body 
      });
      const { sessionId } = validatedData;

      // Get business requirement
      const businessRequirement = await storage.getBusinessRequirement(businessRequirementId);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }

      // Refine requirements using clarification responses
      const extractedData = convertToExtractedBusinessData(businessRequirement);
      const refinedRequirements = await clarificationService.refineRequirements(
        sessionId,
        extractedData
      );

      // Update business requirement with refined data
      const updatedRequirement = await storage.updateBusinessRequirement(businessRequirementId, {
        extractedEntities: {
          processes: refinedRequirements.processes,
          forms: refinedRequirements.forms,
          approvals: refinedRequirements.approvals,
          integrations: refinedRequirements.integrations
        },
        workflowPatterns: refinedRequirements.workflowPatterns,
        confidence: refinedRequirements.confidence,
        status: "validated"
      });

      if (!updatedRequirement) {
        return res.status(500).json({ message: "Failed to update business requirement" });
      }

      res.status(200).json({
        businessRequirementId: updatedRequirement.id,
        refinedRequirements: {
          extractedEntities: {
            processes: refinedRequirements.processes,
            forms: refinedRequirements.forms,
            approvals: refinedRequirements.approvals,
            integrations: refinedRequirements.integrations
          },
          workflowPatterns: refinedRequirements.workflowPatterns,
          confidence: refinedRequirements.confidence
        },
        qualityMetrics: {
          refinementScore: refinedRequirements.refinementScore,
          completenessScore: refinedRequirements.completenessScore,
          consistencyScore: refinedRequirements.consistencyScore
        },
        suggestions: refinedRequirements.suggestions,
        status: "refined"
      });

    } catch (error) {
      console.error("Error refining requirements:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error refining requirements" });
      }
    }
  });

  // Get clarification session status
  app.get("/api/nlp/clarification/session/:sessionId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { sessionId } = req.params;

      const session = clarificationService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Clarification session not found" });
      }

      res.status(200).json({
        sessionId: session.sessionId,
        businessRequirementId: session.businessRequirementId,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        progress: (session.currentQuestionIndex / session.totalQuestions) * 100,
        estimatedCompletionTime: session.estimatedCompletionTime,
        currentQuestion: session.questions[session.currentQuestionIndex] || null,
        completedQuestions: session.completedQuestions
      });

    } catch (error) {
      console.error("Error getting clarification session:", error);
      res.status(500).json({ message: "Internal server error getting session status" });
    }
  });

  // Get clarification suggestions for current session
  app.get("/api/nlp/clarification/suggestions/:sessionId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { sessionId } = req.params;
      const suggestions = await clarificationService.getClarificationSuggestions(sessionId);
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Get clarification history for a requirement
  app.get("/api/nlp/clarification/history/:businessRequirementId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { businessRequirementId } = req.params;
      const history = clarificationService.getClarificationHistory(businessRequirementId);
      res.json(history);
    } catch (error) {
      console.error("Failed to fetch clarification history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Validate response consistency
  app.post("/api/nlp/clarification/validate", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const { questionId, response, context } = req.body;
      
      if (!questionId || !response) {
        return res.status(400).json({ message: "Question ID and response are required" });
      }
      
      const validation = await clarificationService.validateResponse(questionId, response, context);
      res.json(validation);
    } catch (error) {
      console.error("Failed to validate response:", error);
      res.status(500).json({ message: "Failed to validate response" });
    }
  });

  // Abandon clarification session
  app.post("/api/nlp/clarification/abandon/:sessionId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { sessionId } = req.params;
      clarificationService.abandonSession(sessionId);
      res.json({ message: "Session abandoned", sessionId });
    } catch (error) {
      console.error("Failed to abandon session:", error);
      res.status(500).json({ message: "Failed to abandon session" });
    }
  });

  // Get confidence tracking for a requirement
  app.get("/api/nlp/requirements/:id/confidence", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const requirement = await storage.getBusinessRequirement(id);
      
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      
      // Calculate confidence improvement from clarification
      const history = clarificationService.getClarificationHistory(id);
      let confidenceBoost = 0;
      if (history.length > 0) {
        confidenceBoost = Math.min(0.3, history.length * 0.05);
      }
      
      res.json({
        baseConfidence: requirement.confidence,
        currentConfidence: Math.min(1, requirement.confidence + confidenceBoost),
        confidenceImprovement: confidenceBoost,
        requiresMoreClarification: requirement.confidence + confidenceBoost < 0.8
      });
    } catch (error) {
      console.error("Failed to fetch confidence tracking:", error);
      res.status(500).json({ message: "Failed to fetch confidence" });
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
        organizationId: businessRequirement.organizationId,
        name: generateApplicationName(businessRequirement.originalDescription),
        description: `Generated application: ${businessRequirement.originalDescription}`,
        status: "generating",
        completionPercentage: 0
      });

      // Start background application generation process
      applicationGenerationService.generateApplication(
        businessRequirement,
        generatedApp,
        {
          includeWorkflows: true,
          includeForms: true,
          includeIntegrations: true,
          includeChatbots: true,
          deploymentTarget: "replit",
          generateDocumentation: true
        }
      ).then(result => {
        console.log(`Application generation completed for ${generatedApp.id}:`, result.success);
      }).catch(error => {
        console.error(`Application generation failed for ${generatedApp.id}:`, error);
      });

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

      // Get business requirement to generate workflow
      const businessRequirement = await storage.getBusinessRequirement(generatedApp.businessRequirementId);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }

      // Generate comprehensive workflow system
      const workflowSystem = await workflowGenerationService.generateWorkflowSystem(
        businessRequirement,
        {
          includeApprovals: true,
          includeNotifications: true,
          includeExternalIntegrations: true,
          generateUI: true,
          complexity: configuration?.complexity || "advanced",
          targetRoles: configuration?.targetRoles || ["manager", "employee", "admin"]
        }
      );

      res.status(200).json({
        workflowSystem,
        totalWorkflows: workflowSystem.workflows.length,
        generatedComponents: Object.keys(workflowSystem.uiComponents).length,
        status: "completed"
      });

    } catch (error) {
      console.error("Workflow generation failed:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ 
          message: "Internal server error generating workflow",
          error: error instanceof Error ? error.message : "Unknown error"
        });
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
  app.post("/api/chatbot/create", isAuthenticated, requireOrganization(), requireAIServiceMiddleware, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { generatedApplicationId, capabilities, personality } = req.body;

      // Verify the application exists and belongs to user's organization
      const application = await storage.getGeneratedApplication(generatedApplicationId);
      if (!application) {
        return res.status(404).json({ message: "Generated application not found" });
      }

      // Security: Verify organization access to the application
      const hasOrgAccess = await storage.hasOrgMembership(req.user.claims.sub, application.organizationId);
      if (!hasOrgAccess || application.organizationId !== req.organizationId) {
        return res.status(403).json({ message: "Access denied to this application" });
      }

      // Get the business requirement for context
      const businessRequirement = await storage.getBusinessRequirement(application.businessRequirementId);
      if (!businessRequirement) {
        return res.status(400).json({ message: "Business requirement not found for application" });
      }

      // Use EmbeddedChatbotService to create intelligent chatbot
      const chatbot = await embeddedChatbotService.createEmbeddedChatbot(
        generatedApplicationId,
        businessRequirement,
        capabilities || [],
        personality || { tone: 'professional', style: 'business', proactiveness: 'medium', expertiseLevel: 'intermediate' }
      );

      res.status(201).json({
        chatbotId: chatbot.id,
        name: chatbot.name,
        capabilities: chatbot.capabilities,
        isActive: chatbot.isActive,
        aiModel: chatbot.aiModel,
        generatedApplicationId: chatbot.generatedApplicationId
      });

    } catch (error) {
      console.error('Chatbot creation error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error creating chatbot" });
      }
    }
  });

  // Handle chatbot interactions
  app.post("/api/chatbot/interact", isAuthenticated, requireAIServiceMiddleware, async (req: any, res: Response) => {
    try {
      const validatedData = chatbotInteractionSchema.parse(req.body);
      const { chatbotId, message, sessionId } = validatedData;
      const userId = req.user.claims.sub;

      const chatbot = await storage.getEmbeddedChatbot(chatbotId);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      if (!chatbot.isActive) {
        return res.status(400).json({ message: "Chatbot is not active" });
      }

      // Build context for the chatbot
      const context = {
        generatedApplicationId: chatbot.generatedApplicationId,
        currentPage: req.body.currentPage || 'main',
        userRole: req.body.userRole || 'user',
        workflowState: req.body.workflowState || 'active',
        formState: req.body.formState || {},
        sessionData: req.body.sessionData || {}
      };

      // Use the EmbeddedChatbotService for intelligent responses
      const response = await embeddedChatbotService.processMessage(
        chatbotId,
        message,
        context,
        userId
      );

      res.status(200).json({
        response: response.message,
        suggestedActions: response.suggestedActions || [],
        sessionId: sessionId || `session-${Date.now()}`,
        timestamp: new Date().toISOString(),
        chatbotId,
        aiModel: chatbot.aiModel
      });

    } catch (error) {
      console.error('Chatbot interaction error:', error);
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

  // Application Generation Status endpoint with ownership check
  app.get("/api/applications/generation-status/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const generatedApp = await storage.getGeneratedApplication(id);
      if (!generatedApp) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Get business requirement to check ownership
      const businessRequirement = await storage.getBusinessRequirement(generatedApp.businessRequirementId);
      if (!businessRequirement || businessRequirement.userId !== userId) {
        return res.status(403).json({ message: "Access denied - not your application" });
      }

      res.status(200).json({
        applicationId: generatedApp.id,
        status: generatedApp.status,
        progress: generatedApp.completionPercentage,
        currentStep: getCurrentGenerationStep(generatedApp),
        estimatedTimeRemaining: calculateRemainingTime(generatedApp.completionPercentage || 0),
        deploymentUrl: (generatedApp as any).deploymentUrl || null,
        createdAt: generatedApp.createdAt,
        updatedAt: generatedApp.updatedAt
      });

    } catch (error) {
      console.error("Failed to get generation status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 404 handler for API routes
  app.use("/api/*", (req: Request, res: Response) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer });

  // SECURITY CRITICAL: Enhanced WebSocket CSRF Token Management with endpoint binding
  const wsTokenStore = new Map<string, { token: string, endpoint: string, createdAt: Date, sessionId: string, used: boolean }>();

  // Generate anti-CSRF token for specific WebSocket endpoint
  const generateWSCSRFToken = (sessionId: string, endpoint: string = 'default'): string => {
    const token = require('crypto').randomBytes(32).toString('hex');
    const nonce = require('crypto').randomBytes(8).toString('hex');
    const tokenKey = `${sessionId}:${endpoint}:${nonce}`;

    wsTokenStore.set(tokenKey, {
      token,
      endpoint,
      createdAt: new Date(),
      sessionId,
      used: false
    });

    // Clean up expired tokens (older than 2 minutes)
    setTimeout(() => {
      wsTokenStore.delete(tokenKey);
    }, 2 * 60 * 1000);

    return token;
  };

  // SECURITY CRITICAL: True endpoint-bound WebSocket CSRF token validation
  const validateWSCSRFToken = (sessionId: string, providedToken: string, endpoint: string): boolean => {
    // Find matching token for this session, endpoint, and token value
    let matchingKey: string | null = null;
    let matchingEntry: any = null;

    for (const [key, entry] of Array.from(wsTokenStore.entries())) {
      if (entry.sessionId === sessionId && 
          entry.endpoint === endpoint && 
          entry.token === providedToken && 
          !entry.used) {
        matchingKey = key;
        matchingEntry = entry;
        break;
      }
    }

    if (!matchingKey || !matchingEntry) {
      return false;
    }

    // Check token age (2 minute TTL for bank-grade security)
    const age = Date.now() - matchingEntry.createdAt.getTime();
    if (age > 2 * 60 * 1000) {
      wsTokenStore.delete(matchingKey);
      return false;
    }

    // BANK-GRADE: Single-use token - mark as used and delete
    wsTokenStore.delete(matchingKey);

    return true;
  };

  // Endpoint to get WebSocket CSRF token for specific endpoint
  app.get("/api/auth/ws-csrf-token", isAuthenticated, (req: any, res: Response) => {
    const sessionId = req.sessionID;
    const endpoint = req.query.endpoint as string || 'default';
    const token = generateWSCSRFToken(sessionId, endpoint);
    res.json({ wscsrfToken: token, endpoint });
  });

  // SECURITY CRITICAL: Use the same session store as HTTP for consistency
  const sessionStore = (app.get('sessionStore') as any) || (() => {
    const pgStore = connectPg(session);
    const store = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: 7 * 24 * 60 * 60 * 1000, // 1 week
      tableName: "sessions",
    });
    app.set('sessionStore', store);
    return store;
  })();

  // SECURITY CRITICAL: Enhanced WebSocket CSRF Protection Utility
  const validateWebSocketCSRF = (request: any, sessionId: string, endpoint: string): boolean => {
    const origin = request.headers.origin;

    // Bank-grade token transport: Use Sec-WebSocket-Protocol header instead of query params
    const protocols = request.headers['sec-websocket-protocol']?.split(',').map((p: string) => p.trim()) || [];
    const csrfProtocol = protocols.find((p: string) => p.startsWith('csrf-'));
    const csrfToken = csrfProtocol?.replace('csrf-', '');

    // Build allowed origins from REPLIT_DOMAINS and localhost
    const allowedOrigins = [
      'https://localhost:5000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'https://127.0.0.1:5000'
    ];

    // Add production domains from REPLIT_DOMAINS (more robust than single REPLIT_DOMAIN)
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      domains.forEach(domain => {
        allowedOrigins.push(`https://${domain.trim()}`);
      });
    }

    // CRITICAL: Reject connections without Origin or with disallowed Origin
    if (!origin || !allowedOrigins.includes(origin)) {
      console.warn(`WebSocket CSRF: Rejected connection from origin: ${origin}`);
      return false;
    }

    // CRITICAL: Validate anti-CSRF token from Sec-WebSocket-Protocol header
    if (!csrfToken || !validateWSCSRFToken(sessionId, csrfToken, endpoint)) {
      console.warn(`WebSocket CSRF: Invalid or missing CSRF token for session: ${sessionId}, endpoint: ${endpoint}`);
      return false;
    }

    return true;
  };

  // WebSocket upgrade handling for application generation progress with authentication
  httpServer.on("upgrade", async (request, socket, head) => {
    const { pathname } = url.parse(request.url || "");

    // CRITICAL: Only handle our specific WebSocket paths, let Vite HMR handle its own
    if (!pathname?.startsWith("/ws/")) {
      return; // Let other handlers (like Vite HMR) handle this WebSocket
    }

    // Parse cookies for session authentication first (needed for CSRF validation)
    const cookieHeader = request.headers.cookie;
    const rawSessionCookie = cookieHeader?.split(';').find(c => c.trim().startsWith('connect.sid='))?.split('=')[1];

    // SECURITY CRITICAL: Unsign the session cookie to get the actual session ID
    let sessionId: string | null = null;
    if (rawSessionCookie) {
      try {
        // cookieSignature already imported at top of file
        const decodedCookie = decodeURIComponent(rawSessionCookie);
        // Remove 's:' prefix and unsign with SESSION_SECRET
        if (decodedCookie.startsWith('s:')) {
          const unsignedResult = cookieSignature.unsign(decodedCookie.slice(2), process.env.SESSION_SECRET!);
          sessionId = unsignedResult || null;
        }
      } catch (error) {
        console.error('Failed to unsign session cookie:', error);
      }
    }

    // SECURITY CRITICAL: Load and verify session using same store as HTTP
    if (!sessionId) {
      socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nSession required');
      socket.destroy();
      return;
    }

    // Verify session exists and is valid using the same session store
    const session = await new Promise((resolve) => {
      sessionStore.get(sessionId, (err: any, session: any) => {
        resolve(err ? null : session);
      });
    });

    if (!session?.passport?.user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\n\r\nInvalid session');
      socket.destroy();
      return;
    }

    // SECURITY CRITICAL: Enhanced CSRF Protection with session verification
    if (!validateWebSocketCSRF(request, sessionId, pathname || '')) {
      socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nCSRF validation failed');
      socket.destroy();
      return;
    }

    // Handle NLP analysis progress WebSocket connections
    if (pathname?.startsWith("/ws/nlp-analysis/")) {
      const analysisSessionId = pathname.split("/").pop();

      if (!analysisSessionId) {
        socket.write('HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nInvalid analysis session ID');
        socket.destroy();
        return;
      }

      try {
        const userId = session.passport.user.id;

        // SECURITY CRITICAL: Verify ownership of the specific analysis session BEFORE WebSocket upgrade
        const sessionMetadata = nlpAnalysisService.getSessionMetadata(analysisSessionId);
        if (!sessionMetadata) {
          socket.write('HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nAnalysis session not found');
          socket.destroy();
          return;
        }

        // BANK-GRADE: Verify user and organization ownership of the analysis session
        if (!nlpAnalysisService.verifySessionOwnership(analysisSessionId, userId, sessionMetadata.organizationId)) {
          console.warn(`WebSocket: Unauthorized access attempt to analysis session ${analysisSessionId} by user ${userId}`);
          socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nAccess denied to analysis session');
          socket.destroy();
          return;
        }

        // BANK-GRADE: Verify user still has organization membership for the specific resource
        const hasOrgAccess = await storage.hasOrgMembership(userId, sessionMetadata.organizationId);
        if (!hasOrgAccess) {
          console.warn(`WebSocket: User ${userId} no longer has access to organization ${sessionMetadata.organizationId}`);
          socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nOrganization access revoked');
          socket.destroy();
          return;
        }

        // Proceed with WebSocket upgrade for NLP analysis
        wss.handleUpgrade(request, socket, head, (ws) => {
        nlpAnalysisService.registerProgressClient(analysisSessionId, ws);

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            if (data.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            console.error('Invalid WebSocket message:', error);
          }
        });

          ws.on('close', () => {
            console.log(`WebSocket client disconnected from NLP analysis ${analysisSessionId}`);
          });

          ws.send(JSON.stringify({ 
            type: 'connected', 
            analysisSessionId,
            message: 'Connected to NLP analysis progress updates'
          }));
        });

      } catch (error) {
        console.error('NLP WebSocket authentication error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }

      return;
    }

    // Handle generation progress WebSocket connections
    if (pathname?.startsWith("/ws/generation-progress/")) {
      const applicationId = pathname.split("/").pop();

      if (!applicationId) {
        socket.destroy();
        return;
      }

      // Authenticate WebSocket connection
      if (!sessionId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        // SECURITY CRITICAL: Extract user session and organization for authorization
        const session = await new Promise((resolve) => {
          sessionStore.get(sessionId, (err, session) => {
            resolve(err ? null : session);
          });
        });

        if (!session?.passport?.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const userId = session.passport.user.id;

        // Verify application exists and belongs to user's organization
        const generatedApp = await storage.getGeneratedApplication(applicationId);
        if (!generatedApp) {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY CRITICAL: Verify user has organization access to this application
        const hasOrgAccess = await storage.hasOrgMembership(userId, generatedApp.organizationId);
        if (!hasOrgAccess) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // Proceed with WebSocket upgrade if authenticated and authorized
        wss.handleUpgrade(request, socket, head, (ws) => {
          // Register WebSocket for real-time generation progress
          applicationGenerationService.registerWebSocket(applicationId, ws);

          ws.on('message', (message) => {
            try {
              const data = JSON.parse(message.toString());
              if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
              }
            } catch (error) {
              console.error('Invalid WebSocket message:', error);
            }
          });

          ws.on('close', () => {
            console.log(`WebSocket client disconnected from generation progress for ${applicationId}`);
          });

          ws.send(JSON.stringify({ 
            type: 'connected', 
            applicationId,
            message: 'Connected to generation progress updates'
          }));
        });

      } catch (error) {
        console.error('WebSocket authentication error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    }

    // Handle workflow execution progress WebSocket connections
    else if (pathname?.startsWith("/ws/workflow-progress/")) {
      const executionId = pathname.split("/").pop();

      if (!executionId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      // Authenticate WebSocket connection
      if (!sessionId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        // SECURITY CRITICAL: Extract user session and organization for authorization  
        const session = await new Promise((resolve) => {
          sessionStore.get(sessionId, (err, session) => {
            resolve(err ? null : session);
          });
        });

        if (!session?.passport?.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const userId = session.passport.user.id;

        // Verify workflow execution exists 
        const workflowExecution = await storage.getWorkflowExecution(executionId);
        if (!workflowExecution) {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
          socket.destroy();
          return;
        }

        // Get the application to verify organization ownership
        const generatedApp = await storage.getGeneratedApplication(workflowExecution.generatedApplicationId);
        if (!generatedApp) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY CRITICAL: Verify user has organization access to this workflow execution
        const hasOrgAccess = await storage.hasOrgMembership(userId, generatedApp.organizationId);
        if (!hasOrgAccess) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // Get workflow execution engine instance
        const { getWorkflowExecutionEngine } = require("./engines/workflowExecutionEngineInstance");
        const workflowExecutionEngine = getWorkflowExecutionEngine();

        // Proceed with WebSocket upgrade for workflow execution
        wss.handleUpgrade(request, socket, head, (ws) => {
          getWorkflowExecutionEngine().registerProgressClient(executionId, ws);

          ws.on('message', (message) => {
            try {
              const parsed = JSON.parse(message.toString());
              if (parsed.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
              }
            } catch (error) {
              console.error('Invalid WebSocket message:', error);
            }
          });

          ws.on('close', () => {
            console.log(`WebSocket client disconnected from workflow execution ${executionId}`);
          });

          ws.send(JSON.stringify({ 
            type: 'connected',
            executionId,
            message: 'Connected to workflow execution progress updates'
          }));
        });

      } catch (error) {
        console.error('WebSocket workflow execution error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
      return;
    }
    // Handle embedded chatbot WebSocket connections
    else if (pathname?.startsWith("/ws/chatbot/")) {
      const chatbotId = pathname.split("/").pop();

      if (!chatbotId || !sessionId) {
        socket.write('HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nInvalid chatbot ID or session');
        socket.destroy();
        return;
      }

      try {
        // SECURITY CRITICAL: Verify session and authorization
        const session = await new Promise((resolve) => {
          sessionStore.get(sessionId, (err, session) => {
            resolve(err ? null : session);
          });
        });

        if (!session?.passport?.user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const userId = session.passport.user.id;

        // Verify chatbot exists and user has access
        const chatbot = await storage.getEmbeddedChatbot(chatbotId);
        if (!chatbot) {
          socket.write('HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nChatbot not found');
          socket.destroy();
          return;
        }

        // Verify application access through organization membership
        const application = await storage.getGeneratedApplication(chatbot.generatedApplicationId);
        if (!application) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // SECURITY CRITICAL: Verify organization access
        const hasOrgAccess = await storage.hasOrgMembership(userId, application.organizationId);
        if (!hasOrgAccess) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // Proceed with WebSocket upgrade for authenticated chatbot connections
        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log(`WebSocket client connected to chatbot ${chatbotId} for user ${userId}`);

          // Register client with EmbeddedChatbotService for real-time updates
          embeddedChatbotService.registerChatbotClient(chatbotId, ws);

          // Handle incoming messages for real-time chat
          ws.on('message', async (message) => {
            try {
              const data = JSON.parse(message.toString());

              if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
              }

              if (data.type === 'chat_message' && data.message) {
                // Build context from WebSocket message
                const context = {
                  generatedApplicationId: chatbot.generatedApplicationId,
                  currentPage: data.context?.currentPage || 'main',
                  userRole: data.context?.userRole || 'user', 
                  workflowState: data.context?.workflowState || 'active',
                  formState: data.context?.formState || {},
                  sessionData: data.context?.sessionData || {}
                };

                // Process message through EmbeddedChatbotService
                const response = await embeddedChatbotService.processMessage(
                  chatbotId,
                  data.message,
                  context,
                  userId
                );

                // Send response back via WebSocket
                ws.send(JSON.stringify({
                  type: 'chat_response',
                  chatbotId,
                  message: response.message,
                  suggestedActions: response.suggestedActions || [],
                  timestamp: new Date().toISOString(),
                  messageId: data.messageId || null
                }));
              }
            } catch (error) {
              console.error(`WebSocket message error for chatbot ${chatbotId}:`, error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message',
                timestamp: new Date().toISOString()
              }));
            }
          });

          ws.on('close', () => {
            console.log(`WebSocket client disconnected from chatbot ${chatbotId}`);
            // EmbeddedChatbotService handles cleanup automatically when WebSocket closes
          });

          ws.on('error', (error) => {
            console.error(`WebSocket error for chatbot ${chatbotId}:`, error);
            // EmbeddedChatbotService handles cleanup automatically on error
          });

          // Send connection confirmation
          ws.send(JSON.stringify({
            type: 'connected',
            chatbotId,
            message: 'Connected to AI chatbot',
            capabilities: chatbot.capabilities,
            timestamp: new Date().toISOString()
          }));
        });

      } catch (error) {
        console.error('WebSocket chatbot connection error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
      return;
    }
    else {
      socket.destroy();
    }
  });

  // ===== Computer Use Automation Endpoint =====
  // Computer use automation endpoint
  // router.post("/api/computer-use/generate", async (req, res) => {
  //   try {
  //     const { businessRequirement, workflows, forms } = req.body;

  //     if (!businessRequirement) {
  //       return res.status(400).json({ error: "Business requirement is required" });
  //     }

  //     const result = await computerUseService.generateComputerUseCapabilities(
  //       businessRequirement, 
  //       workflows || [], 
  //       forms || []
  //     );

  //     res.json(result);
  //   } catch (error) {
  //     console.error("Computer use generation error:", error);
  //     res.status(500).json({ 
  //       error: "Failed to generate computer use capabilities",
  //       details: error instanceof Error ? error.message : "Unknown error"
  //     });
  //   }
  // });

  // ===== Image and Video Generation Endpoints =====
  // Image and video generation endpoints
  app.post("/api/visual-assets/generate", async (req, res) => {
    try {
      const { businessRequirement, applicationMetadata } = req.body;

      if (!businessRequirement) {
        return res.status(400).json({ error: "Business requirement is required" });
      }

      const result = await imageVideoService.generateVisualAssetPackage(
        businessRequirement,
        applicationMetadata || {}
      );

      res.json(result);
    } catch (error) {
      console.error("Visual asset generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate visual assets",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/visual-assets/image", async (req, res) => {
    try {
      const imageRequest = req.body;

      if (!imageRequest.prompt) {
        return res.status(400).json({ error: "Image prompt is required" });
      }

      const result = await imageVideoService.generateSingleImage(imageRequest);

      res.json(result);
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/visual-assets/video", async (req, res) => {
    try {
      const videoRequest = req.body;

      if (!videoRequest.script) {
        return res.status(400).json({ error: "Video script is required" });
      }

      const result = await imageVideoService.generateSingleVideo(videoRequest);

      res.json(result);
    } catch (error) {
      console.error("Video generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate video",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/templates/:templateId/enhance-visuals", async (req, res) => {
    try {
      const { templateId } = req.params;
      const { businessContext } = req.body;

      if (!businessContext) {
        return res.status(400).json({ error: "Business context is required" });
      }

      const result = await imageVideoService.enhanceTemplateWithVisuals(
        templateId,
        businessContext
      );

      res.json(result);
    } catch (error) {
      console.error("Template visual enhancement error:", error);
      res.status(500).json({ 
        error: "Failed to enhance template with visuals",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== Voice Processing Endpoints =====
  // Voice processing endpoints
  app.post("/api/voice/speech-to-text", async (req, res) => {
    try {
      const { audioData, language } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      const result = await voiceService.speechToText({
        audioData,
        language: language || 'en'
      });

      res.json(result);
    } catch (error) {
      console.error("Speech-to-text error:", error);
      res.status(500).json({
        error: "Failed to process speech-to-text",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/voice/text-to-speech", async (req, res) => {
    try {
      const { text, voice, language, speed, pitch } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await voiceService.textToSpeech({
        text,
        voice: voice || 'alloy',
        language: language || 'en',
        speed: speed || 1.0,
        pitch: pitch || 0.0
      });

      res.json(result);
    } catch (error) {
      console.error("Text-to-speech error:", error);
      res.status(500).json({
        error: "Failed to generate speech",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/voice/authenticate", async (req, res) => {
    try {
      const { audioData } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      const result = await voiceService.authenticateVoice({
        audioData
      });

      res.json(result);
    } catch (error) {
      console.error("Voice authentication error:", error);
      res.status(500).json({
        error: "Failed to authenticate voice",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/voice/process-command", async (req, res) => {
    try {
      const { audioData, context } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      const result = await voiceService.processVoiceCommand(audioData, context);

      res.json(result);
    } catch (error) {
      console.error("Voice command processing error:", error);
      res.status(500).json({
        error: "Failed to process voice command",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/voice/languages", async (req, res) => {
    try {
      const languages = voiceService.getSupportedLanguages();
      res.json({ languages });
    } catch (error) {
      console.error("Get languages error:", error);
      res.status(500).json({
        error: "Failed to get supported languages",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/voice/voices", async (req, res) => {
    try {
      const voices = voiceService.getAvailableVoices();
      res.json({ voices });
    } catch (error) {
      console.error("Get voices error:", error);
      res.status(500).json({
        error: "Failed to get available voices",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== Voice Chatbot Endpoints =====
  // Voice chatbot endpoints
  app.post("/api/chatbot/:chatbotId/voice-input", async (req, res) => {
    try {
      const { chatbotId } = req.params;
      const { audioData, context } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      // Process voice input to text
      const transcript = await embeddedChatbotService.processVoiceInput(
        chatbotId,
        audioData,
        context || {}
      );

      // Then process the text message normally
      const response = await embeddedChatbotService.processMessage(
        chatbotId,
        transcript,
        context || {}
      );

      res.json({
        transcript,
        chatbotResponse: response
      });
    } catch (error) {
      console.error("Voice chatbot input error:", error);
      res.status(500).json({
        error: "Failed to process voice input",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/chatbot/:chatbotId/voice-output", async (req, res) => {
    try {
      const { chatbotId } = req.params;
      const { text, voice, language, speed } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const audioData = await embeddedChatbotService.generateVoiceOutput(
        text,
        voice || 'alloy',
        language || 'en',
        speed || 1.0
      );

      res.json({
        audioData,
        voice: voice || 'alloy',
        language: language || 'en',
        speed: speed || 1.0
      });
    } catch (error) {
      console.error("Voice chatbot output error:", error);
      res.status(500).json({
        error: "Failed to generate voice output",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== Telephony Endpoints =====
  // Telephony endpoints
  app.post("/api/telephony/call", async (req, res) => {
    try {
      const { to, from, url, conferenceName } = req.body;

      if (!to || !from) {
        return res.status(400).json({ error: "Phone numbers (to, from) are required" });
      }

      const result = await telephonyService.processTelephonyRequest({
        action: 'call',
        to,
        from,
        url: url || '/api/telephony/handle-call',
        conferenceName
      });

      res.json(result);
    } catch (error) {
      console.error("Telephony call error:", error);
      res.status(500).json({
        error: "Failed to initiate call",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/telephony/sms", async (req, res) => {
    try {
      const { to, from, message } = req.body;

      if (!to || !from || !message) {
        return res.status(400).json({ error: "Phone numbers (to, from) and message are required" });
      }

      const result = await telephonyService.processTelephonyRequest({
        action: 'sms',
        to,
        from,
        message
      });

      res.json(result);
    } catch (error) {
      console.error("Telephony SMS error:", error);
      res.status(500).json({
        error: "Failed to send SMS",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/telephony/conference", async (req, res) => {
    try {
      const { conferenceName, options } = req.body;

      if (!conferenceName) {
        return res.status(400).json({ error: "Conference name is required" });
      }

      const result = await telephonyService.processTelephonyRequest({
        action: 'conference',
        conferenceName,
        ...options
      });

      res.json(result);
    } catch (error) {
      console.error("Telephony conference error:", error);
      res.status(500).json({
        error: "Failed to create conference",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/telephony/calls/:callSid", async (req, res) => {
    try {
      const { callSid } = req.params;

      const result = await telephonyService.processTelephonyRequest({
        action: 'status',
        callSid
      });

      res.json(result);
    } catch (error) {
      console.error("Telephony status error:", error);
      res.status(500).json({
        error: "Failed to get call status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/telephony/calls", async (req, res) => {
    try {
      const { status, from, to, limit } = req.query;

      const result = await telephonyService.processTelephonyRequest({
        action: 'list',
        status: status as string,
        from: from as string,
        to: to as string
      });

      res.json(result);
    } catch (error) {
      console.error("Telephony list calls error:", error);
      res.status(500).json({
        error: "Failed to list calls",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/telephony/twiml/:action", async (req, res) => {
    try {
      const { action } = req.params;
      const parameters = req.body;

      const twiml = telephonyService.generateTwiml(action, parameters);
      res.header('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("TwiML generation error:", error);
      res.status(500).json({
        error: "Failed to generate TwiML",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/telephony/analytics", async (req, res) => {
    try {
      const { timeframe = 'day' } = req.query;

      const analytics = await telephonyService.generateAnalytics(
        timeframe as 'day' | 'week' | 'month'
      );

      res.json(analytics);
    } catch (error) {
      console.error("Telephony analytics error:", error);
      res.status(500).json({
        error: "Failed to generate analytics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== CRM Endpoints =====
  // Customer Relationship Management endpoints
  app.post("/api/crm/customers", async (req, res) => {
    try {
      const customerData = req.body;

      if (!customerData.personalInfo?.email) {
        return res.status(400).json({ error: "Customer email is required" });
      }

      const customer = await crmService.createCustomer(customerData);

      res.json(customer);
    } catch (error) {
      console.error("Create customer error:", error);
      res.status(500).json({
        error: "Failed to create customer",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/crm/customers/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;

      const customer = await crmService.getCustomer(customerId);

      res.json(customer);
    } catch (error) {
      console.error("Get customer error:", error);
      res.status(500).json({
        error: "Failed to get customer",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/crm/customers/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      const updates = req.body;

      const customer = await crmService.updateCustomer(customerId, updates);

      res.json(customer);
    } catch (error) {
      console.error("Update customer error:", error);
      res.status(500).json({
        error: "Failed to update customer",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/crm/customers/search", async (req, res) => {
    try {
      const { query, status, type, healthScoreMin, healthScoreMax, page, limit } = req.query;

      const searchRequest: any = {};

      if (query) searchRequest.query = query;
      if (status) searchRequest.filters = { ...searchRequest.filters, status: status.split(',') };
      if (type) searchRequest.filters = { ...searchRequest.filters, type: type.split(',') };
      if (healthScoreMin || healthScoreMax) {
        searchRequest.filters = {
          ...searchRequest.filters,
          healthScore: {
            min: parseInt(healthScoreMin as string) || 0,
            max: parseInt(healthScoreMax as string) || 100
          }
        };
      }

      if (page) searchRequest.pagination = { page: parseInt(page as string), limit: parseInt(limit as string) || 20 };

      const result = await crmService.searchCustomers(searchRequest);

      res.json(result);
    } catch (error) {
      console.error("Search customers error:", error);
      res.status(500).json({
        error: "Failed to search customers",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/crm/interactions", async (req, res) => {
    try {
      const interactionData = req.body;

      if (!interactionData.customerId || !interactionData.type || !interactionData.title) {
        return res.status(400).json({
          error: "Missing required interaction fields: customerId, type, title"
        });
      }

      const interaction = await crmService.recordInteraction(interactionData);

      res.json(interaction);
    } catch (error) {
      console.error("Record interaction error:", error);
      res.status(500).json({
        error: "Failed to record interaction",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/crm/customers/:customerId/insights", async (req, res) => {
    try {
      const { customerId } = req.params;

      const insights = await crmService.getCustomerInsights(customerId);

      res.json(insights);
    } catch (error) {
      console.error("Get customer insights error:", error);
      res.status(500).json({
        error: "Failed to get customer insights",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/crm/segments/rules", async (req, res) => {
    try {
      const ruleData = req.body;

      if (!ruleData.name || !ruleData.conditions) {
        return res.status(400).json({
          error: "Missing required rule fields: name, conditions"
        });
      }

      const rule = await crmService.createSegmentationRule(ruleData);

      res.json(rule);
    } catch (error) {
      console.error("Create segmentation rule error:", error);
      res.status(500).json({
        error: "Failed to create segmentation rule",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/crm/segments/generate", async (req, res) => {
    try {
      const { ruleId } = req.body;

      if (!ruleId) {
        return res.status(400).json({
          error: "Missing required field: ruleId"
        });
      }

      const segment = await crmService.generateSegment(ruleId);

      res.json(segment);
    } catch (error) {
      console.error("Generate segment error:", error);
      res.status(500).json({
        error: "Failed to generate segment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ===== Sales Automation Endpoints =====
  // Sales automation and quote generation endpoints
  app.post("/api/sales/quotes", async (req, res) => {
    try {
      const quoteData = req.body;

      if (!quoteData.customerId || !quoteData.lineItems || !quoteData.title) {
        return res.status(400).json({
          error: "Missing required fields: customerId, lineItems, title"
        });
      }

      const quote = await salesAutomationService.generateQuote(quoteData);

      res.json(quote);
    } catch (error) {
      console.error("Generate quote error:", error);
      res.status(500).json({
        error: "Failed to generate quote",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/sales/quotes/:quoteId", async (req, res) => {
    try {
      const { quoteId } = req.params;

      // In real implementation, would fetch from database
      const quotes = Array.from((salesAutomationService as any).quotes.values());
      const quote = quotes.find((q: any) => q.id === quoteId);

      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Get quote error:", error);
      res.status(500).json({
        error: "Failed to get quote",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/sales/quotes/:quoteId", async (req, res) => {
    try {
      const { quoteId } = req.params;
      const updates = req.body;

      // In real implementation, would update in database
      const quotes = Array.from((salesAutomationService as any).quotes.values());
      const quoteIndex = quotes.findIndex((q: any) => q.id === quoteId);

      if (quoteIndex === -1) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const updatedQuote = { ...quotes[quoteIndex], ...updates, updatedAt: new Date() };
      (salesAutomationService as any).quotes.set(quoteId, updatedQuote);

      res.json(updatedQuote);
    } catch (error) {
      console.error("Update quote error:", error);
      res.status(500).json({
        error: "Failed to update quote",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/sales/quotes/:quoteId/submit", async (req, res) => {
    try {
      const { quoteId } = req.params;

      const quote = await salesAutomationService.submitQuoteForApproval(quoteId);

      res.json(quote);
    } catch (error) {
      console.error("Submit quote error:", error);
      res.status(500).json({
        error: "Failed to submit quote",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/sales/contracts", async (req, res) => {
    try {
      const { quoteId, ...contractDetails } = req.body;

      if (!quoteId || !contractDetails.startDate || !contractDetails.endDate) {
        return res.status(400).json({
          error: "Missing required fields: quoteId, startDate, endDate"
        });
      }

      const contract = await salesAutomationService.generateContract(quoteId, contractDetails);

      res.json(contract);
    } catch (error) {
      console.error("Generate contract error:", error);
      res.status(500).json({
        error: "Failed to generate contract",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/sales/contracts/:contractId", async (req, res) => {
    try {
      const { contractId } = req.params;

      // In real implementation, would fetch from database
      const contracts = Array.from((salesAutomationService as any).contracts.values());
      const contract = contracts.find((c: any) => c.id === contractId);

      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      res.json(contract);
    } catch (error) {
      console.error("Get contract error:", error);
      res.status(500).json({
        error: "Failed to get contract",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/sales/invoices", async (req, res) => {
    try {
      const { contractId, ...invoiceDetails } = req.body;

      if (!contractId || !invoiceDetails.dueDate || !invoiceDetails.paymentTerms) {
        return res.status(400).json({
          error: "Missing required fields: contractId, dueDate, paymentTerms"
        });
      }

      const invoice = await salesAutomationService.generateInvoice(contractId, invoiceDetails);

      res.json(invoice);
    } catch (error) {
      console.error("Generate invoice error:", error);
      res.status(500).json({
        error: "Failed to generate invoice",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/sales/products", async (req, res) => {
    try {
      // In real implementation, would fetch from database
      const products = Array.from((salesAutomationService as any).products.values());

      res.json({ products });
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({
        error: "Failed to get products",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/sales/analytics", async (req, res) => {
    try {
      // In real implementation, would calculate from database
      const analytics = {
        period: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          endDate: new Date()
        },
        metrics: {
          quotesGenerated: 42,
          quotesAccepted: 29,
          quotesRejected: 3,
          quoteToCloseRate: 68,
          averageQuoteValue: 8450,
          totalContractValue: 125430,
          contractsSigned: 15,
          revenueRecognized: 89500,
          outstandingRevenue: 35930,
          churnRate: 5.2,
          renewalRate: 87.5
        },
        trends: {
          monthlyRevenue: [
            { month: '2024-12', amount: 98500 },
            { month: '2025-01', amount: 125430 }
          ],
          quoteConversion: [
            { month: '2024-12', rate: 65 },
            { month: '2025-01', rate: 68 }
          ],
          contractRenewals: [
            { month: '2024-12', count: 8 },
            { month: '2025-01', count: 12 }
          ]
        },
        topProducts: [
          {
            productId: 'prod_web_dev',
            productName: 'Custom Web Development',
            revenue: 45600,
            count: 12
          },
          {
            productId: 'prod_saas_subscription',
            productName: 'Business Platform Subscription',
            revenue: 32400,
            count: 18
          }
        ],
        salesRepPerformance: [
          {
            salesRepId: 'rep_1',
            name: 'John Smith',
            quotesGenerated: 15,
            contractsClosed: 8,
            revenueGenerated: 67400,
            conversionRate: 53
          },
          {
            salesRepId: 'rep_2',
            name: 'Sarah Johnson',
            quotesGenerated: 12,
            contractsClosed: 7,
            revenueGenerated: 58030,
            conversionRate: 58
          }
        ]
      };

      res.json(analytics);
    } catch (error) {
      console.error("Get sales analytics error:", error);
      res.status(500).json({
        error: "Failed to get sales analytics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

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

function getCurrentGenerationStep(generatedApp: any): string {
  const progress = generatedApp.completionPercentage || 0;

  if (progress === 0) return "initializing";
  if (progress < 20) return "analyzing requirements";
  if (progress < 40) return "generating components";
  if (progress < 60) return "generating APIs";
  if (progress < 80) return "generating database";
  if (progress < 95) return "integrating and testing";
  if (progress < 100) return "deploying";
  return "completed";
}

function calculateRemainingTime(progress: number): number {
  const totalEstimatedTime = 15 * 60; // 15 minutes in seconds
  const remainingProgress = 100 - progress;
  return Math.max(0, Math.floor((remainingProgress / 100) * totalEstimatedTime));
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