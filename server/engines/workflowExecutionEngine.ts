import { WorkflowExecution, InsertWorkflowExecution } from "@shared/schema";
import { storage } from "../storage";
import { WorkflowPattern, WorkflowStep, WorkflowCondition } from "../services/workflowGenerationService";
import { WebSocket } from "ws";

export interface WorkflowContext {
  executionId: string;
  workflowId: string;
  userId: string;
  applicationId: string;
  currentStep: string;
  stepData: Record<string, any>;
  globalData: Record<string, any>;
  assigneeHistory: { step: string; assignee: string; timestamp: Date }[];
}

export interface TaskAssignment {
  stepId: string;
  assigneeId: string;
  assigneeRole: string;
  assignedAt: Date;
  dueAt: Date;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface WorkflowEvent {
  type: "step_started" | "step_completed" | "step_failed" | "workflow_completed" | "escalation_triggered";
  executionId: string;
  stepId?: string;
  userId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface EscalationContext {
  originalAssignee: string;
  escalatedTo: string[];
  escalationLevel: number;
  triggeredAt: Date;
  reason: string;
}

export class WorkflowExecutionEngine {
  private activeExecutions: Map<string, WorkflowContext> = new Map();
  private progressClients: Map<string, WebSocket[]> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Load active executions on startup
    this.loadActiveExecutions();
  }

  /**
   * Start a new workflow execution
   */
  async startWorkflow(
    workflowPattern: WorkflowPattern,
    userId: string,
    applicationId: string,
    initialData: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    try {
      // Create workflow execution record
      const executionData: InsertWorkflowExecution = {
        generatedApplicationId: applicationId,
        workflowId: workflowPattern.id,
        userId,
        currentStep: workflowPattern.steps[0].id,
        stepData: initialData,
        status: "pending"
      };

      const execution = await storage.createWorkflowExecution(executionData);

      // Initialize workflow context
      const context: WorkflowContext = {
        executionId: execution.id,
        workflowId: workflowPattern.id,
        userId,
        applicationId,
        currentStep: workflowPattern.steps[0].id,
        stepData: initialData,
        globalData: {},
        assigneeHistory: []
      };

      this.activeExecutions.set(execution.id, context);

      // Start the first step
      await this.executeStep(workflowPattern, context, workflowPattern.steps[0]);

      // Emit workflow started event
      await this.emitWorkflowEvent({
        type: "step_started",
        executionId: execution.id,
        stepId: workflowPattern.steps[0].id,
        userId,
        timestamp: new Date(),
        data: { stepName: workflowPattern.steps[0].name }
      });

      this.updateProgress(execution.id, {
        status: "in_progress",
        currentStep: workflowPattern.steps[0].name,
        progress: 0
      });

      return execution;

    } catch (error) {
      throw new Error(`Failed to start workflow: ${error}`);
    }
  }

  /**
   * Advance workflow to next step
   */
  async advanceWorkflow(
    executionId: string,
    stepData: Record<string, any>,
    userId: string
  ): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error("Workflow execution not found");
    }

    try {
      // Load workflow pattern (in real implementation, this would be cached)
      const workflowPattern = await this.loadWorkflowPattern(context.workflowId);
      const currentStep = workflowPattern.steps.find(s => s.id === context.currentStep);
      
      if (!currentStep) {
        throw new Error("Current step not found in workflow pattern");
      }

      // Validate step completion
      await this.validateStepCompletion(currentStep, stepData);

      // Update context with step data
      context.stepData = { ...context.stepData, ...stepData };
      context.globalData = { ...context.globalData, ...stepData };

      // Mark current step as completed
      await this.emitWorkflowEvent({
        type: "step_completed",
        executionId,
        stepId: currentStep.id,
        userId,
        timestamp: new Date(),
        data: stepData
      });

      // Determine next step
      const nextStep = await this.determineNextStep(workflowPattern, context, currentStep, stepData);

      if (nextStep) {
        // Update context and execute next step
        context.currentStep = nextStep.id;
        await this.executeStep(workflowPattern, context, nextStep);
        
        // Update database
        await storage.updateWorkflowExecution(executionId, {
          currentStep: nextStep.id,
          stepData: context.stepData,
          status: "in_progress"
        });

        this.updateProgress(executionId, {
          status: "in_progress",
          currentStep: nextStep.name,
          progress: this.calculateProgress(workflowPattern, context.currentStep)
        });

      } else {
        // Workflow completed
        await this.completeWorkflow(executionId, context);
      }

    } catch (error) {
      await this.failWorkflow(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  }

  /**
   * Execute a workflow step
   */
  private async executeStep(
    workflowPattern: WorkflowPattern,
    context: WorkflowContext,
    step: WorkflowStep
  ): Promise<void> {
    try {
      switch (step.type) {
        case "manual":
          await this.executeManualStep(context, step);
          break;
        case "automated":
          await this.executeAutomatedStep(context, step);
          break;
        case "approval":
          await this.executeApprovalStep(context, step);
          break;
        case "integration":
          await this.executeIntegrationStep(context, step);
          break;
        case "condition":
          await this.executeConditionalStep(workflowPattern, context, step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Set up escalation timers if SLA is defined
      if (step.slaHours && step.escalationRules) {
        this.setupEscalationTimer(context.executionId, step);
      }

    } catch (error) {
      await this.emitWorkflowEvent({
        type: "step_failed",
        executionId: context.executionId,
        stepId: step.id,
        userId: context.userId,
        timestamp: new Date(),
        data: { error: error instanceof Error ? error.message : "Unknown error" }
      });
      throw error;
    }
  }

  /**
   * Execute manual step (assign to user)
   */
  private async executeManualStep(context: WorkflowContext, step: WorkflowStep): Promise<void> {
    // Assign task to appropriate user based on roles
    const assignee = await this.assignTask(context, step);
    
    // Create task record (placeholder - in real implementation would use task service)
    console.log("Task created:", {
      title: step.name,
      description: step.description,
      assigneeId: assignee.assigneeId,
      creatorId: context.userId,
      status: "pending",
      priority: assignee.priority,
      dueAt: assignee.dueAt
    });

    // Send notifications
    await this.sendStepNotifications(context, step, "step_start");

    // Record assignment history
    context.assigneeHistory.push({
      step: step.id,
      assignee: assignee.assigneeId,
      timestamp: new Date()
    });
  }

  /**
   * Execute automated step
   */
  private async executeAutomatedStep(context: WorkflowContext, step: WorkflowStep): Promise<void> {
    // Simulate automated processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate automated outputs
    const outputs: Record<string, any> = {};
    step.outputs?.forEach(output => {
      outputs[output] = `automated_${output}_${Date.now()}`;
    });

    // Update context with outputs
    context.stepData = { ...context.stepData, ...outputs };
    context.globalData = { ...context.globalData, ...outputs };

    // Automatically advance (for demo - in real implementation this would be more sophisticated)
    setTimeout(() => {
      this.advanceWorkflow(context.executionId, outputs, "system");
    }, 2000);
  }

  /**
   * Execute approval step
   */
  private async executeApprovalStep(context: WorkflowContext, step: WorkflowStep): Promise<void> {
    // Create approval request
    const approvers = await this.findApprovers(step.assigneeRoles);
    
    for (const approver of approvers) {
      // Create approval record (placeholder - in real implementation would use approval service)
      console.log("Approval created:", {
        requestId: context.executionId,
        requestType: "workflow",
        requesterId: context.userId,
        approverId: approver,
        state: "pending",
        slaHours: step.slaHours || 24
      });
    }

    // Send approval notifications
    await this.sendStepNotifications(context, step, "step_start");
  }

  /**
   * Execute integration step
   */
  private async executeIntegrationStep(context: WorkflowContext, step: WorkflowStep): Promise<void> {
    // Simulate external service integration
    if (step.validation?.externalService) {
      try {
        // In real implementation, this would make actual HTTP requests
        const validationResult = await this.callExternalService(
          step.validation.externalService,
          context.stepData
        );
        
        context.stepData = { ...context.stepData, validationResult };
        context.globalData = { ...context.globalData, validationResult };
        
        // Auto-advance if validation successful
        setTimeout(() => {
          this.advanceWorkflow(context.executionId, { validationResult }, "system");
        }, 3000);
        
      } catch (error) {
        throw new Error(`External service validation failed: ${error}`);
      }
    }
  }

  /**
   * Execute conditional step
   */
  private async executeConditionalStep(
    workflowPattern: WorkflowPattern,
    context: WorkflowContext,
    step: WorkflowStep
  ): Promise<void> {
    if (!step.conditions || step.conditions.length === 0) {
      throw new Error("Conditional step has no conditions defined");
    }

    // Evaluate conditions
    for (const condition of step.conditions) {
      if (this.evaluateCondition(condition, context.globalData)) {
        if (condition.nextStep) {
          // Jump to specific step
          const nextStep = workflowPattern.steps.find(s => s.id === condition.nextStep);
          if (nextStep) {
            context.currentStep = nextStep.id;
            await this.executeStep(workflowPattern, context, nextStep);
          }
        }
        return;
      }
    }

    // If no conditions matched, use else step or continue to next
    const elseCondition = step.conditions.find(c => c.elseStep);
    if (elseCondition?.elseStep) {
      const elseStep = workflowPattern.steps.find(s => s.id === elseCondition.elseStep);
      if (elseStep) {
        context.currentStep = elseStep.id;
        await this.executeStep(workflowPattern, context, elseStep);
      }
    }
  }

  /**
   * Determine next step in workflow
   */
  private async determineNextStep(
    workflowPattern: WorkflowPattern,
    context: WorkflowContext,
    currentStep: WorkflowStep,
    stepData: Record<string, any>
  ): Promise<WorkflowStep | null> {
    const currentIndex = workflowPattern.steps.findIndex(s => s.id === currentStep.id);
    
    // Check if this is the last step
    if (currentIndex === workflowPattern.steps.length - 1) {
      return null;
    }

    // For conditional workflows, evaluate conditions
    if (currentStep.conditions && currentStep.conditions.length > 0) {
      for (const condition of currentStep.conditions) {
        if (this.evaluateCondition(condition, { ...context.globalData, ...stepData })) {
          if (condition.nextStep) {
            return workflowPattern.steps.find(s => s.id === condition.nextStep) || null;
          }
        }
      }
    }

    // Default: return next step in sequence
    return workflowPattern.steps[currentIndex + 1];
  }

  /**
   * Complete workflow execution
   */
  private async completeWorkflow(executionId: string, context: WorkflowContext): Promise<void> {
    try {
      // Update database
      await storage.updateWorkflowExecution(executionId, {
        status: "completed"
      });

      // Emit completion event
      await this.emitWorkflowEvent({
        type: "workflow_completed",
        executionId,
        userId: context.userId,
        timestamp: new Date(),
        data: { finalData: context.globalData }
      });

      // Send completion notifications
      await this.sendCompletionNotifications(context);

      // Clean up
      this.activeExecutions.delete(executionId);
      this.clearEscalationTimer(executionId);

      this.updateProgress(executionId, {
        status: "completed",
        currentStep: "Completed",
        progress: 100
      });

    } catch (error) {
      throw new Error(`Failed to complete workflow: ${error}`);
    }
  }

  /**
   * Fail workflow execution
   */
  private async failWorkflow(executionId: string, error: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    
    await storage.updateWorkflowExecution(executionId, {
      status: "failed"
    });

    if (context) {
      await this.emitWorkflowEvent({
        type: "step_failed",
        executionId,
        userId: context.userId,
        timestamp: new Date(),
        data: { error }
      });
    }

    this.activeExecutions.delete(executionId);
    this.clearEscalationTimer(executionId);

    this.updateProgress(executionId, {
      status: "failed",
      currentStep: "Failed",
      progress: 0,
      error
    });
  }

  /**
   * Assign task to appropriate user
   */
  private async assignTask(context: WorkflowContext, step: WorkflowStep): Promise<TaskAssignment> {
    // Simple role-based assignment (placeholder - in real implementation would use user service)
    const assigneeId = "user-" + Math.random().toString(36).substring(2, 15);
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (step.slaHours || 24));

    return {
      stepId: step.id,
      assigneeId,
      assigneeRole: step.assigneeRoles[0],
      assignedAt: new Date(),
      dueAt: dueDate,
      priority: "medium"
    };
  }

  /**
   * Find users with approval roles
   */
  private async findApprovers(roles: string[]): Promise<string[]> {
    // Placeholder - in real implementation would query user service
    return roles.map(role => `${role}-approver-${Math.random().toString(36).substring(2, 15)}`);
  }

  /**
   * Validate step completion
   */
  private async validateStepCompletion(step: WorkflowStep, stepData: Record<string, any>): Promise<void> {
    // Check required fields
    for (const field of step.requiredFields) {
      if (!stepData[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    // Validate against rules if defined
    if (step.validation?.rules) {
      for (const rule of step.validation.rules) {
        if (!this.validateField(stepData[rule.field], rule.rule)) {
          throw new Error(rule.message);
        }
      }
    }
  }

  /**
   * Evaluate workflow condition
   */
  private evaluateCondition(condition: WorkflowCondition, data: Record<string, any>): boolean {
    const fieldValue = data[condition.field];
    
    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "not_equals":
        return fieldValue !== condition.value;
      case "greater_than":
        return Number(fieldValue) > Number(condition.value);
      case "less_than":
        return Number(fieldValue) < Number(condition.value);
      case "contains":
        return String(fieldValue).includes(String(condition.value));
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Validate field against rule
   */
  private validateField(value: any, rule: string): boolean {
    // Simple validation rules (extend as needed)
    switch (rule) {
      case "required":
        return value !== null && value !== undefined && value !== "";
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      case "number":
        return !isNaN(Number(value));
      case "positive":
        return Number(value) > 0;
      default:
        return true;
    }
  }

  /**
   * Calculate workflow progress percentage
   */
  private calculateProgress(workflowPattern: WorkflowPattern, currentStepId: string): number {
    const currentIndex = workflowPattern.steps.findIndex(s => s.id === currentStepId);
    if (currentIndex === -1) return 0;
    
    return Math.round((currentIndex / workflowPattern.steps.length) * 100);
  }

  /**
   * Setup escalation timer for step
   */
  private setupEscalationTimer(executionId: string, step: WorkflowStep): void {
    if (!step.slaHours || !step.escalationRules) return;

    const escalationTime = step.slaHours * 60 * 60 * 1000; // Convert to milliseconds
    
    const timer = setTimeout(async () => {
      await this.triggerEscalation(executionId, step);
    }, escalationTime);

    this.escalationTimers.set(`${executionId}-${step.id}`, timer);
  }

  /**
   * Trigger escalation for overdue step
   */
  private async triggerEscalation(executionId: string, step: WorkflowStep): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context || !step.escalationRules) return;

    for (const escalationRule of step.escalationRules) {
      // Send escalation notifications
      await this.sendEscalationNotifications(context, step, escalationRule);
      
      // Emit escalation event
      await this.emitWorkflowEvent({
        type: "escalation_triggered",
        executionId,
        stepId: step.id,
        userId: context.userId,
        timestamp: new Date(),
        data: {
          escalationLevel: 1,
          escalatedTo: escalationRule.escalateTo,
          reason: "SLA exceeded"
        }
      });
    }
  }

  /**
   * Clear escalation timer
   */
  private clearEscalationTimer(executionId: string): void {
    this.escalationTimers.forEach((timer, key) => {
      if (key.startsWith(executionId)) {
        clearTimeout(timer);
        this.escalationTimers.delete(key);
      }
    });
  }

  /**
   * Send step notifications
   */
  private async sendStepNotifications(
    context: WorkflowContext,
    step: WorkflowStep,
    trigger: string
  ): Promise<void> {
    if (!step.notifications) return;

    const relevantNotifications = step.notifications.filter(n => n.trigger === trigger);
    
    for (const notification of relevantNotifications) {
      // In real implementation, this would integrate with email/SMS services
      console.log(`Sending ${notification.type} notification:`, {
        recipients: notification.recipients,
        template: notification.template,
        context: {
          stepName: step.name,
          workflowId: context.workflowId,
          executionId: context.executionId
        }
      });
    }
  }

  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(
    context: WorkflowContext,
    step: WorkflowStep,
    escalationRule: any
  ): Promise<void> {
    console.log(`Sending escalation notification:`, {
      escalatedTo: escalationRule.escalateTo,
      notification: escalationRule.notification,
      context: {
        stepName: step.name,
        executionId: context.executionId,
        overdueDuration: escalationRule.afterHours
      }
    });
  }

  /**
   * Send completion notifications
   */
  private async sendCompletionNotifications(context: WorkflowContext): Promise<void> {
    console.log(`Workflow completed:`, {
      executionId: context.executionId,
      workflowId: context.workflowId,
      userId: context.userId
    });
  }

  /**
   * Call external service for validation
   */
  private async callExternalService(
    serviceConfig: { endpoint: string; method: string; headers?: Record<string, string> },
    data: Record<string, any>
  ): Promise<any> {
    // Simulate external service call
    console.log(`Calling external service: ${serviceConfig.endpoint}`, data);
    return { valid: true, result: "success" };
  }

  /**
   * Emit workflow event for audit trail
   */
  private async emitWorkflowEvent(event: WorkflowEvent): Promise<void> {
    // Placeholder - in real implementation would use event service
    console.log("Workflow event:", {
      type: event.type,
      payload: event.data,
      actorId: event.userId,
      resourceType: "workflow",
      resourceId: event.executionId,
      timestamp: event.timestamp
    });
  }

  /**
   * Load active executions from database
   */
  private async loadActiveExecutions(): Promise<void> {
    try {
      // Placeholder - in real implementation would load from database
      console.log("Loading active workflow executions...");
    } catch (error) {
      console.error("Failed to load active executions:", error);
    }
  }

  /**
   * Load workflow pattern (placeholder - in real implementation this would be cached)
   */
  private async loadWorkflowPattern(workflowId: string): Promise<WorkflowPattern> {
    // This is a placeholder - in real implementation, workflow patterns would be stored
    // and retrieved from database or cache
    return {
      id: workflowId,
      name: "Sample Workflow",
      description: "Sample workflow for testing",
      type: "sequential",
      steps: [
        {
          id: "step1",
          name: "Initial Step",
          type: "manual",
          description: "First step",
          assigneeRoles: ["employee"],
          requiredFields: ["data"]
        },
        {
          id: "step2",
          name: "Final Step",
          type: "manual",
          description: "Last step",
          assigneeRoles: ["manager"],
          requiredFields: ["approval"]
        }
      ],
      triggers: [],
      metadata: {
        estimatedDuration: 24,
        complexity: "medium",
        category: "general",
        tags: ["sample"]
      }
    };
  }

  /**
   * Update progress for WebSocket clients
   */
  private updateProgress(executionId: string, progress: any): void {
    const clients = this.progressClients.get(executionId) || [];
    const message = JSON.stringify({
      type: "workflow_execution_progress",
      executionId,
      ...progress
    });

    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Register WebSocket client for progress updates
   */
  registerProgressClient(executionId: string, ws: WebSocket): void {
    const clients = this.progressClients.get(executionId) || [];
    clients.push(ws);
    this.progressClients.set(executionId, clients);

    ws.on('close', () => {
      const updatedClients = this.progressClients.get(executionId)?.filter(client => client !== ws) || [];
      this.progressClients.set(executionId, updatedClients);
    });
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    const execution = await storage.getWorkflowExecution(executionId);
    return execution || null;
  }

  /**
   * List user's workflow executions
   */
  async listUserExecutions(userId: string): Promise<WorkflowExecution[]> {
    return await storage.listWorkflowExecutions(userId);
  }

  /**
   * List user's workflow executions filtered by organization (security critical)
   */
  async listUserExecutionsByOrg(userId: string, organizationId: string): Promise<WorkflowExecution[]> {
    return await storage.listWorkflowExecutionsByOrg(userId, organizationId);
  }

  /**
   * Pause workflow execution
   */
  async pauseWorkflow(executionId: string, userId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error("Workflow execution not found");
    }

    await storage.updateWorkflowExecution(executionId, {
      status: "pending"
    });

    await this.emitWorkflowEvent({
      type: "step_completed",
      executionId,
      userId,
      timestamp: new Date(),
      data: { reason: "paused_by_user" }
    });

    this.clearEscalationTimer(executionId);

    this.updateProgress(executionId, {
      status: "paused",
      currentStep: `Paused: ${context.currentStep}`,
      progress: this.calculateProgress(await this.loadWorkflowPattern(context.workflowId), context.currentStep)
    });
  }

  /**
   * Resume workflow execution
   */
  async resumeWorkflow(executionId: string, userId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error("Workflow execution not found");
    }

    await storage.updateWorkflowExecution(executionId, {
      status: "in_progress"
    });

    await this.emitWorkflowEvent({
      type: "step_started",
      executionId,
      userId,
      timestamp: new Date(),
      data: { reason: "resumed_by_user" }
    });

    // Continue execution from current step
    const workflowPattern = await this.loadWorkflowPattern(context.workflowId);
    const currentStep = workflowPattern.steps.find(s => s.id === context.currentStep);
    
    if (currentStep) {
      await this.executeStep(workflowPattern, context, currentStep);
    }

    this.updateProgress(executionId, {
      status: "in_progress",
      currentStep: currentStep?.name || context.currentStep,
      progress: this.calculateProgress(workflowPattern, context.currentStep)
    });
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(executionId: string, userId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error("Workflow execution not found");
    }

    await storage.updateWorkflowExecution(executionId, {
      status: "cancelled"
    });

    await this.emitWorkflowEvent({
      type: "step_failed",
      executionId,
      userId,
      timestamp: new Date(),
      data: { reason: "cancelled_by_user" }
    });

    this.activeExecutions.delete(executionId);
    this.clearEscalationTimer(executionId);

    this.updateProgress(executionId, {
      status: "cancelled",
      currentStep: "Cancelled",
      progress: 0
    });
  }
}