import type { Express, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { getWorkflowExecutionEngine } from "./engines/workflowExecutionEngineInstance";
import { verifyExecutionOwnership, verifyApplicationOwnership } from './middleware/workflowAuthMiddleware';
import { requireOrganization, type AuthorizedRequest } from "./middleware/authorizationMiddleware";

export function registerWorkflowRoutes(app: Express) {
  // ===== WORKFLOW EXECUTION ENDPOINTS =====
  
  // Start workflow execution
  app.post("/api/workflows/executions/start", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { workflowId, applicationId, initialData } = req.body;
      const userId = req.user.claims.sub;
      
      if (!workflowId || !applicationId) {
        return res.status(400).json({ message: "workflowId and applicationId are required" });
      }
      
      // Validate application exists and belongs to user's organization
      const generatedApp = await storage.getGeneratedApplication(applicationId);
      if (!generatedApp) {
        return res.status(404).json({ message: "Generated application not found" });
      }
      
      // Verify organization ownership of the application
      const businessRequirement = await storage.getBusinessRequirement(generatedApp.businessRequirementId);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }
      // Verify the business requirement owner is in the organization
      const orgMembership = await storage.getUserOrgMembership(businessRequirement.userId, req.organizationId);
      if (!orgMembership || !orgMembership.isActive) {
        return res.status(403).json({ message: "Access denied: Application not found in your organization" });
      }
      
      // Check if we have stored workflow system data
      let workflowPattern;
      const generatedWorkflows = generatedApp.generatedWorkflows;
      
      if (generatedWorkflows && Array.isArray(generatedWorkflows)) {
        // Find the specific workflow pattern by ID from stored workflows
        workflowPattern = generatedWorkflows.find((w: any) => w.id === workflowId);
        
        if (!workflowPattern) {
          return res.status(404).json({ 
            message: `Workflow pattern '${workflowId}' not found in generated application` 
          });
        }
      } else {
        // Fallback: Generate workflow pattern on-demand using WorkflowGenerationService
        const { WorkflowGenerationService } = require("./services/workflowGenerationService");
        const workflowGenerationService = new WorkflowGenerationService();
        
        try {
          const workflowSystem = await workflowGenerationService.generateWorkflowSystem(
            businessRequirement,
            {
              includeApprovals: true,
              includeNotifications: true,
              includeExternalIntegrations: true,
              generateUI: false, // Skip UI generation for execution
              complexity: "advanced",
              targetRoles: ["manager", "employee", "admin"]
            }
          );
          
          // Find the requested workflow or use the first one
          workflowPattern = workflowSystem.workflows.find((w: any) => w.id === workflowId) || 
                           workflowSystem.workflows[0];
          
          if (!workflowPattern) {
            return res.status(500).json({ 
              message: "Failed to generate workflow pattern for execution" 
            });
          }
          
          // Store the generated workflow system for future use
          await storage.updateGeneratedApplication(applicationId, {
            generatedWorkflows: workflowSystem.workflows
          });
          
        } catch (generateError) {
          console.error("Failed to generate workflow for execution:", generateError);
          return res.status(500).json({ 
            message: "Failed to generate workflow pattern",
            error: generateError instanceof Error ? generateError.message : "Unknown error"
          });
        }
      }
      
      // Start workflow execution
      const execution = await getWorkflowExecutionEngine().startWorkflow(
        workflowPattern,
        userId,
        applicationId,
        initialData || {}
      );
      
      res.status(201).json({
        executionId: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        currentStep: execution.currentStep,
        message: "Workflow execution started successfully"
      });
      
    } catch (error) {
      console.error("Failed to start workflow execution:", error);
      res.status(500).json({ 
        message: "Internal server error starting workflow execution",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Advance workflow execution
  app.post("/api/workflows/executions/:id/advance", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { id: executionId } = req.params;
      const stepData = req.body;
      const userId = req.user.claims.sub;
      
      await getWorkflowExecutionEngine().advanceWorkflow(executionId, stepData, userId);
      
      const execution = await getWorkflowExecutionEngine().getExecutionStatus(executionId);
      
      res.status(200).json({
        executionId,
        status: execution?.status,
        currentStep: execution?.currentStep,
        message: "Workflow advanced successfully"
      });
      
    } catch (error) {
      console.error("Failed to advance workflow:", error);
      res.status(500).json({ 
        message: "Internal server error advancing workflow",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get workflow execution status
  app.get("/api/workflows/executions/:id", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { id: executionId } = req.params;
      
      const execution = await getWorkflowExecutionEngine().getExecutionStatus(executionId);
      if (!execution) {
        return res.status(404).json({ message: "Workflow execution not found" });
      }
      
      res.status(200).json({
        execution,
        progress: execution.status === "completed" ? 100 : 
                  execution.status === "in_progress" ? 50 : 0
      });
      
    } catch (error) {
      console.error("Failed to get workflow execution:", error);
      res.status(500).json({ message: "Internal server error getting workflow execution" });
    }
  });
  
  // List user's workflow executions
  app.get("/api/workflows/executions", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      
      const executions = await getWorkflowExecutionEngine().listUserExecutions(userId);
      
      res.status(200).json({
        executions,
        total: executions.length,
        active: executions.filter(e => e.status === "in_progress" || e.status === "pending").length,
        completed: executions.filter(e => e.status === "completed").length
      });
      
    } catch (error) {
      console.error("Failed to list workflow executions:", error);
      res.status(500).json({ message: "Internal server error listing workflow executions" });
    }
  });
  
  // Pause workflow execution
  app.post("/api/workflows/executions/:id/pause", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { id: executionId } = req.params;
      const userId = req.user.claims.sub;
      
      await getWorkflowExecutionEngine().pauseWorkflow(executionId, userId);
      
      const execution = await getWorkflowExecutionEngine().getExecutionStatus(executionId);
      
      res.status(200).json({
        executionId,
        status: execution?.status || "paused",
        message: "Workflow execution paused successfully"
      });
      
    } catch (error) {
      console.error("Failed to pause workflow execution:", error);
      res.status(500).json({ 
        message: "Internal server error pausing workflow execution",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Resume workflow execution
  app.post("/api/workflows/executions/:id/resume", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { id: executionId } = req.params;
      const userId = req.user.claims.sub;
      
      await getWorkflowExecutionEngine().resumeWorkflow(executionId, userId);
      
      const execution = await getWorkflowExecutionEngine().getExecutionStatus(executionId);
      
      res.status(200).json({
        executionId,
        status: execution?.status || "running",
        message: "Workflow execution resumed successfully"
      });
      
    } catch (error) {
      console.error("Failed to resume workflow execution:", error);
      res.status(500).json({ 
        message: "Internal server error resuming workflow execution",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Cancel workflow execution
  app.post("/api/workflows/executions/:id/cancel", isAuthenticated, requireOrganization, async (req: AuthorizedRequest, res: Response) => {
    try {
      const { id: executionId } = req.params;
      const userId = req.user.claims.sub;
      
      await getWorkflowExecutionEngine().cancelWorkflow(executionId, userId);
      
      res.status(200).json({
        executionId,
        status: "cancelled", 
        message: "Workflow execution cancelled successfully"
      });
      
    } catch (error) {
      console.error("Failed to cancel workflow execution:", error);
      res.status(500).json({ 
        message: "Internal server error cancelling workflow execution",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  console.log("Workflow execution routes registered successfully");
}