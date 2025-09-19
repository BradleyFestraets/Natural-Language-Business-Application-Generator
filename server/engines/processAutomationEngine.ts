import { WorkflowExecutionEngine, WorkflowContext, WorkflowEvent } from "./workflowExecutionEngine";
import { WorkflowPattern, WorkflowStep } from "../services/workflowGenerationService";
import { AIDecisionService, AIRoutingDecision, AIValidationResult } from "../services/aiDecisionService";
import { BusinessRequirement } from "../../shared/schema";
import { storage } from "../storage";

export interface ProcessAutomationOptions {
  enableAIDecisions: boolean;
  enableAutoRecovery: boolean;
  enableRealTimeMonitoring: boolean;
  maxRetryAttempts: number;
  escalationThreshold: number; // hours
}

export interface ProcessExecution {
  executionId: string;
  workflowId: string;
  organizationId: string; // CRITICAL: Added for multi-tenant security isolation
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  currentStep: string;
  progress: number;
  aiDecisionsUsed: number;
  validationErrors: string[];
  escalations: EscalationRecord[];
  startTime: Date;
  endTime?: Date;
  metrics: ProcessMetrics;
}

export interface ProcessMetrics {
  totalDuration: number; // milliseconds
  stepDurations: Record<string, number>;
  aiDecisionAccuracy: number;
  validationSuccessRate: number;
  escalationRate: number;
  automationEfficiency: number;
}

export interface EscalationRecord {
  stepId: string;
  reason: string;
  escalatedTo: string;
  escalatedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface ProcessRecoveryContext {
  executionId: string;
  failedStep: string;
  errorMessage: string;
  retryAttempt: number;
  recoveryStrategy: "retry" | "skip" | "escalate" | "manual_intervention";
}

export interface NotificationRequest {
  type: "email" | "sms" | "slack" | "webhook";
  recipients: string[];
  subject: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  metadata?: Record<string, any>;
}

/**
 * Enhanced Process Automation Engine with AI-powered decision making,
 * automated validation, and intelligent recovery capabilities
 */
export class ProcessAutomationEngine extends WorkflowExecutionEngine {
  private aiDecisionService: AIDecisionService;
  private activeProcesses: Map<string, ProcessExecution> = new Map();
  private recoveryQueue: Map<string, ProcessRecoveryContext> = new Map();
  private notificationQueue: NotificationRequest[] = [];
  private options: ProcessAutomationOptions;

  constructor(options: Partial<ProcessAutomationOptions> = {}) {
    super();
    
    this.options = {
      enableAIDecisions: true,
      enableAutoRecovery: true,
      enableRealTimeMonitoring: true,
      maxRetryAttempts: 3,
      escalationThreshold: 24,
      ...options
    };
    
    this.aiDecisionService = new AIDecisionService();
    
    // Start background services
    this.startNotificationProcessor();
    this.startRecoveryProcessor();
    this.startMetricsCollector();
  }

  /**
   * Start enhanced workflow with AI-powered automation
   */
  async startAutomatedProcess(
    workflowPattern: WorkflowPattern,
    userId: string,
    applicationId: string,
    organizationId: string, // CRITICAL: Required for multi-tenant security
    businessRequirement?: BusinessRequirement,
    initialData: Record<string, any> = {}
  ): Promise<ProcessExecution> {
    try {
      // Start the workflow execution
      const execution = await this.startWorkflow(
        workflowPattern, 
        userId, 
        applicationId, 
        initialData
      );

      // Initialize process execution tracking
      const processExecution: ProcessExecution = {
        executionId: execution.id,
        workflowId: workflowPattern.id,
        organizationId, // CRITICAL: Set organizationId for multi-tenant isolation
        status: "running",
        currentStep: workflowPattern.steps[0].id,
        progress: 0,
        aiDecisionsUsed: 0,
        validationErrors: [],
        escalations: [],
        startTime: new Date(),
        metrics: {
          totalDuration: 0,
          stepDurations: {},
          aiDecisionAccuracy: 0,
          validationSuccessRate: 0,
          escalationRate: 0,
          automationEfficiency: 0
        }
      };

      this.activeProcesses.set(execution.id, processExecution);

      // Send initial notifications
      if (workflowPattern.triggers.length > 0) {
        await this.sendProcessNotification({
          type: "email",
          recipients: [userId],
          subject: `Process Started: ${workflowPattern.name}`,
          message: `Your ${workflowPattern.name} workflow has been started and is now processing.`,
          priority: "medium",
          metadata: { executionId: execution.id, workflowId: workflowPattern.id }
        });
      }

      return processExecution;

    } catch (error) {
      throw new Error(`Failed to start automated process: ${error}`);
    }
  }

  /**
   * Enhanced step execution with AI decision making and validation
   */
  async executeStepWithAI(
    executionId: string,
    stepData: Record<string, any>,
    businessRequirement?: BusinessRequirement
  ): Promise<void> {
    const processExecution = this.activeProcesses.get(executionId);
    if (!processExecution) {
      throw new Error("Process execution not found");
    }

    const stepStartTime = Date.now();

    try {
      // Get workflow pattern and current step
      const workflowPattern = await this.getWorkflowPattern(processExecution.workflowId);
      const currentStep = workflowPattern.steps.find(s => s.id === processExecution.currentStep);
      if (!currentStep) {
        throw new Error("Current step not found");
      }

      // Validate data with AI if enabled
      if (this.options.enableAIDecisions) {
        const validationResult = await this.aiDecisionService.validateData(
          stepData,
          currentStep,
          businessRequirement
        );

        if (!validationResult.isValid) {
          processExecution.validationErrors.push(
            ...validationResult.issues
              .filter(issue => issue.severity === "error")
              .map(issue => issue.message)
          );

          if (validationResult.issues.some(i => i.severity === "error")) {
            throw new Error(`Validation failed: ${validationResult.issues
              .filter(i => i.severity === "error")
              .map(i => i.message)
              .join(", ")}`);
          }
        }
      }

      // Get AI routing decision if enabled
      let routingDecision: AIRoutingDecision | null = null;
      if (this.options.enableAIDecisions) {
        const context = await this.getWorkflowContext(executionId);
        routingDecision = await this.aiDecisionService.makeRoutingDecision(
          context,
          workflowPattern,
          currentStep,
          stepData
        );
        
        processExecution.aiDecisionsUsed++;
      }

      // Execute the step
      await this.advanceWorkflow(executionId, stepData, processExecution.workflowId);

      // Update process execution
      const stepDuration = Date.now() - stepStartTime;
      processExecution.metrics.stepDurations[currentStep.id] = stepDuration;
      
      // Check if next step exists or process is completed
      const nextStepId = routingDecision?.nextStep || this.getNextStepId(workflowPattern, currentStep.id);
      
      if (nextStepId === "completed") {
        await this.completeProcess(executionId);
      } else {
        processExecution.currentStep = nextStepId;
        processExecution.progress = this.calculateProcessProgress(workflowPattern, nextStepId);
        
        // Check for escalation if needed
        await this.checkEscalationNeeded(executionId, processExecution, currentStep);
      }

      // Send progress notifications
      await this.sendProgressNotification(processExecution, currentStep);

    } catch (error) {
      await this.handleStepError(executionId, processExecution, error, stepStartTime);
    }
  }

  /**
   * Handle step execution errors with intelligent recovery
   */
  private async handleStepError(
    executionId: string,
    processExecution: ProcessExecution,
    error: any,
    stepStartTime: number
  ): Promise<void> {
    const stepDuration = Date.now() - stepStartTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Add to recovery queue if auto-recovery is enabled
    if (this.options.enableAutoRecovery) {
      const recoveryContext: ProcessRecoveryContext = {
        executionId,
        failedStep: processExecution.currentStep,
        errorMessage,
        retryAttempt: 0,
        recoveryStrategy: "retry"
      };

      this.recoveryQueue.set(executionId, recoveryContext);
    } else {
      // Mark as failed
      processExecution.status = "failed";
      processExecution.endTime = new Date();
    }

    // Send error notification
    await this.sendProcessNotification({
      type: "email",
      recipients: [processExecution.workflowId], // Will be resolved to actual users
      subject: `Process Error: ${processExecution.workflowId}`,
      message: `Step '${processExecution.currentStep}' failed with error: ${errorMessage}`,
      priority: "high",
      metadata: { executionId, error: errorMessage }
    });

    // Update metrics
    processExecution.metrics.stepDurations[processExecution.currentStep] = stepDuration;
  }

  /**
   * Complete process execution
   */
  private async completeProcess(executionId: string): Promise<void> {
    const processExecution = this.activeProcesses.get(executionId);
    if (!processExecution) return;

    processExecution.status = "completed";
    processExecution.endTime = new Date();
    processExecution.progress = 100;
    processExecution.metrics.totalDuration = processExecution.endTime.getTime() - processExecution.startTime.getTime();

    // Calculate final metrics
    processExecution.metrics.automationEfficiency = this.calculateAutomationEfficiency(processExecution);
    processExecution.metrics.escalationRate = processExecution.escalations.length / Object.keys(processExecution.metrics.stepDurations).length;

    // Send completion notification
    await this.sendProcessNotification({
      type: "email",
      recipients: [processExecution.workflowId],
      subject: `Process Completed: ${processExecution.workflowId}`,
      message: `Your workflow has been completed successfully in ${Math.round(processExecution.metrics.totalDuration / (1000 * 60))} minutes.`,
      priority: "medium",
      metadata: { 
        executionId, 
        duration: processExecution.metrics.totalDuration,
        efficiency: processExecution.metrics.automationEfficiency
      }
    });

    // Store final metrics
    await this.storeProcessMetrics(processExecution);
  }

  /**
   * Check if escalation is needed
   */
  private async checkEscalationNeeded(
    executionId: string,
    processExecution: ProcessExecution,
    currentStep: WorkflowStep
  ): Promise<void> {
    const timeSpent = (Date.now() - processExecution.startTime.getTime()) / (1000 * 60 * 60); // hours
    
    const escalationCheck = await this.aiDecisionService.shouldEscalate(
      await this.getWorkflowContext(executionId),
      currentStep,
      {},
      timeSpent
    );

    if (escalationCheck.shouldEscalate) {
      const escalation: EscalationRecord = {
        stepId: currentStep.id,
        reason: escalationCheck.reason,
        escalatedTo: escalationCheck.escalateTo,
        escalatedAt: new Date()
      };

      processExecution.escalations.push(escalation);

      // Send escalation notification
      await this.sendProcessNotification({
        type: "email",
        recipients: [escalationCheck.escalateTo],
        subject: `Process Escalation Required: ${processExecution.workflowId}`,
        message: `Process step '${currentStep.name}' requires your attention. Reason: ${escalationCheck.reason}`,
        priority: "urgent",
        metadata: { executionId, stepId: currentStep.id }
      });
    }
  }

  /**
   * Send process notification
   */
  private async sendProcessNotification(request: NotificationRequest): Promise<void> {
    this.notificationQueue.push(request);
  }

  /**
   * Send progress notification
   */
  private async sendProgressNotification(
    processExecution: ProcessExecution,
    currentStep: WorkflowStep
  ): Promise<void> {
    // Only send notifications for significant progress milestones
    if (processExecution.progress % 25 === 0) {
      await this.sendProcessNotification({
        type: "email",
        recipients: [processExecution.workflowId],
        subject: `Process Update: ${processExecution.progress}% Complete`,
        message: `Your workflow is ${processExecution.progress}% complete. Currently processing: ${currentStep.name}`,
        priority: "low",
        metadata: { 
          executionId: processExecution.executionId, 
          progress: processExecution.progress 
        }
      });
    }
  }

  /**
   * Calculate automation efficiency
   */
  private calculateAutomationEfficiency(processExecution: ProcessExecution): number {
    const totalSteps = Object.keys(processExecution.metrics.stepDurations).length;
    const automatedSteps = processExecution.aiDecisionsUsed;
    const manualInterventions = processExecution.escalations.length;
    
    return totalSteps > 0 ? (automatedSteps - manualInterventions) / totalSteps : 0;
  }

  /**
   * Calculate process progress based on completed steps
   */
  private calculateProcessProgress(workflowPattern: WorkflowPattern, currentStepId: string): number {
    const currentIndex = workflowPattern.steps.findIndex(s => s.id === currentStepId);
    return Math.round((currentIndex / workflowPattern.steps.length) * 100);
  }

  /**
   * Get next step ID in workflow
   */
  private getNextStepId(workflowPattern: WorkflowPattern, currentStepId: string): string {
    const currentIndex = workflowPattern.steps.findIndex(s => s.id === currentStepId);
    if (currentIndex >= 0 && currentIndex < workflowPattern.steps.length - 1) {
      return workflowPattern.steps[currentIndex + 1].id;
    }
    return "completed";
  }

  /**
   * Store process metrics for analytics
   */
  private async storeProcessMetrics(processExecution: ProcessExecution): Promise<void> {
    try {
      // Store metrics in database for analytics
      // This would typically go to a metrics/analytics table
      console.log(`Process metrics stored for ${processExecution.executionId}:`, processExecution.metrics);
    } catch (error) {
      console.error("Failed to store process metrics:", error);
    }
  }

  /**
   * Get workflow pattern by ID
   */
  private async getWorkflowPattern(workflowId: string): Promise<WorkflowPattern> {
    // This would typically fetch from database or cache
    // For now, return a mock pattern - this should be implemented properly
    return {
      id: workflowId,
      name: "Business Process",
      description: "Automated business process",
      type: "sequential",
      steps: [],
      triggers: [],
      metadata: {
        estimatedDuration: 2,
        complexity: "medium",
        category: "business",
        tags: ["automated"]
      }
    };
  }

  /**
   * Get workflow context by execution ID
   */
  private async getWorkflowContext(executionId: string): Promise<WorkflowContext> {
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      throw new Error("Workflow execution not found");
    }

    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      userId: execution.userId,
      applicationId: execution.generatedApplicationId,
      currentStep: execution.currentStep,
      stepData: execution.stepData || {},
      globalData: {},
      assigneeHistory: []
    };
  }

  /**
   * Start notification processor
   */
  private startNotificationProcessor(): void {
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Start recovery processor  
   */
  private startRecoveryProcessor(): void {
    setInterval(() => {
      this.processRecoveryQueue();
    }, 10000); // Process every 10 seconds
  }

  /**
   * Start metrics collector
   */
  private startMetricsCollector(): void {
    setInterval(() => {
      this.collectRealTimeMetrics();
    }, 60000); // Collect every minute
  }

  /**
   * Process notification queue
   */
  private async processNotificationQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        try {
          await this.sendNotification(notification);
        } catch (error) {
          console.error("Failed to send notification:", error);
        }
      }
    }
  }

  /**
   * Process recovery queue
   */
  private async processRecoveryQueue(): Promise<void> {
    for (const [executionId, recoveryContext] of Array.from(this.recoveryQueue.entries())) {
      try {
        await this.attemptRecovery(executionId, recoveryContext);
      } catch (error) {
        console.error(`Recovery failed for ${executionId}:`, error);
      }
    }
  }

  /**
   * Collect real-time metrics
   */
  private collectRealTimeMetrics(): void {
    // Collect and aggregate metrics from active processes
    const totalProcesses = this.activeProcesses.size;
    const completedProcesses = Array.from(this.activeProcesses.values())
      .filter(p => p.status === "completed").length;
    
    console.log(`Process Automation Metrics: ${completedProcesses}/${totalProcesses} completed`);
  }

  /**
   * Send notification (mock implementation)
   */
  private async sendNotification(notification: NotificationRequest): Promise<void> {
    // Mock implementation - in real system would integrate with email/SMS services
    console.log(`[${notification.type.toUpperCase()}] ${notification.subject}: ${notification.message}`);
  }

  /**
   * Attempt recovery (mock implementation)
   */
  private async attemptRecovery(executionId: string, context: ProcessRecoveryContext): Promise<void> {
    if (context.retryAttempt < this.options.maxRetryAttempts) {
      context.retryAttempt++;
      console.log(`Attempting recovery for ${executionId}, attempt ${context.retryAttempt}`);
      // Actual recovery logic would go here
    } else {
      this.recoveryQueue.delete(executionId);
      console.log(`Recovery failed for ${executionId} after ${context.retryAttempt} attempts`);
    }
  }
}