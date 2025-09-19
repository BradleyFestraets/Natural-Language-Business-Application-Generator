import OpenAI from "openai";
import { WorkflowStep, WorkflowPattern } from "../services/workflowGenerationService";
import { WorkflowContext } from "../engines/workflowExecutionEngine";
import { BusinessRequirement } from "../../shared/schema";
import { isAIServiceAvailable } from "../config/validation";

export interface AIDecisionRequest {
  context: WorkflowContext;
  businessRequirement?: BusinessRequirement;
  currentStep: WorkflowStep;
  inputData: Record<string, any>;
  decisionType: "routing" | "validation" | "escalation" | "approval";
}

export interface AIDecisionResponse {
  decision: string;
  confidence: number;
  reasoning: string;
  suggestedActions: Array<{
    type: string;
    description: string;
    data?: any;
  }>;
  nextSteps?: string[];
  escalationRequired?: boolean;
  validationErrors?: Array<{
    field: string;
    error: string;
    severity: "error" | "warning" | "info";
  }>;
}

export interface AIValidationResult {
  isValid: boolean;
  score: number;
  issues: Array<{
    field: string;
    message: string;
    severity: "error" | "warning" | "info";
    suggestedFix?: string;
  }>;
  dataQualityScore: number;
  complianceScore: number;
}

export interface AIRoutingDecision {
  nextStep: string;
  assignee?: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedDuration: number; // hours
  reasoning: string;
  confidence: number;
  alternativeRoutes?: Array<{
    step: string;
    condition: string;
    probability: number;
  }>;
}

/**
 * AI Decision Service provides intelligent routing, validation, and decision making
 * for business process automation
 */
export class AIDecisionService {
  private openai: OpenAI | null;
  private decisionCache: Map<string, AIDecisionResponse> = new Map();
  private validationCache: Map<string, AIValidationResult> = new Map();

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null;
    }
  }

  /**
   * Make AI-powered decision for workflow routing
   */
  async makeRoutingDecision(
    context: WorkflowContext,
    workflowPattern: WorkflowPattern,
    currentStep: WorkflowStep,
    inputData: Record<string, any>
  ): Promise<AIRoutingDecision> {
    if (!isAIServiceAvailable() || !this.openai) {
      return this.getFallbackRoutingDecision(workflowPattern, currentStep);
    }

    const cacheKey = `routing_${context.executionId}_${currentStep.id}`;
    if (this.decisionCache.has(cacheKey)) {
      const cached = this.decisionCache.get(cacheKey)!;
      return this.convertToRoutingDecision(cached);
    }

    try {
      const decisionPrompt = this.buildRoutingPrompt(
        context,
        workflowPattern,
        currentStep,
        inputData
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.getRoutingSystemPrompt() },
          { role: "user", content: decisionPrompt }
        ],
        tools: [{ type: "function", function: this.getRoutingFunctionSchema() }],
        tool_choice: { type: "function", function: { name: "make_routing_decision" } },
        temperature: 0.2,
        max_tokens: 1500
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.type !== "function" || !toolCall.function.arguments) {
        return this.getFallbackRoutingDecision(workflowPattern, currentStep);
      }

      const aiDecision = JSON.parse(toolCall.function.arguments);
      const routingDecision: AIRoutingDecision = {
        nextStep: aiDecision.nextStep || this.getNextStep(workflowPattern, currentStep.id),
        assignee: aiDecision.assignee,
        priority: aiDecision.priority || "medium",
        estimatedDuration: aiDecision.estimatedDuration || 2,
        reasoning: aiDecision.reasoning || "AI routing decision",
        confidence: aiDecision.confidence || 0.7,
        alternativeRoutes: aiDecision.alternativeRoutes || []
      };

      // Cache for 10 minutes
      this.decisionCache.set(cacheKey, {
        decision: routingDecision.nextStep,
        confidence: routingDecision.confidence,
        reasoning: routingDecision.reasoning,
        suggestedActions: []
      });
      setTimeout(() => this.decisionCache.delete(cacheKey), 10 * 60 * 1000);

      return routingDecision;

    } catch (error) {
      console.error("AI routing decision failed:", error);
      return this.getFallbackRoutingDecision(workflowPattern, currentStep);
    }
  }

  /**
   * Perform AI-powered data validation
   */
  async validateData(
    data: Record<string, any>,
    step: WorkflowStep,
    businessContext?: BusinessRequirement
  ): Promise<AIValidationResult> {
    if (!isAIServiceAvailable() || !this.openai) {
      return this.getFallbackValidation(data, step);
    }

    const cacheKey = `validation_${step.id}_${JSON.stringify(data).slice(0, 100)}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    try {
      const validationPrompt = this.buildValidationPrompt(data, step, businessContext);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.getValidationSystemPrompt() },
          { role: "user", content: validationPrompt }
        ],
        tools: [{ type: "function", function: this.getValidationFunctionSchema() }],
        tool_choice: { type: "function", function: { name: "validate_data" } },
        temperature: 0.1,
        max_tokens: 1000
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.type !== "function" || !toolCall.function.arguments) {
        return this.getFallbackValidation(data, step);
      }

      const validationResult = JSON.parse(toolCall.function.arguments);
      const aiValidation: AIValidationResult = {
        isValid: validationResult.isValid || true,
        score: validationResult.score || 0.8,
        issues: validationResult.issues || [],
        dataQualityScore: validationResult.dataQualityScore || 0.8,
        complianceScore: validationResult.complianceScore || 0.9
      };

      // Cache for 5 minutes
      this.validationCache.set(cacheKey, aiValidation);
      setTimeout(() => this.validationCache.delete(cacheKey), 5 * 60 * 1000);

      return aiValidation;

    } catch (error) {
      console.error("AI validation failed:", error);
      return this.getFallbackValidation(data, step);
    }
  }

  /**
   * Determine if escalation is needed
   */
  async shouldEscalate(
    context: WorkflowContext,
    currentStep: WorkflowStep,
    inputData: Record<string, any>,
    timeSpent: number // hours
  ): Promise<{ shouldEscalate: boolean; reason: string; escalateTo: string }> {
    // Simple rule-based escalation for now
    const slaExceeded = currentStep.slaHours && timeSpent > currentStep.slaHours;
    
    if (slaExceeded) {
      return {
        shouldEscalate: true,
        reason: `SLA exceeded: ${timeSpent}h > ${currentStep.slaHours}h`,
        escalateTo: Array.isArray(currentStep.escalationRules?.[0]?.escalateTo) 
          ? currentStep.escalationRules[0].escalateTo[0] || "manager"
          : currentStep.escalationRules?.[0]?.escalateTo || "manager"
      };
    }

    // Check for high-value transactions or critical data
    const isHighValue = inputData.amount && parseFloat(inputData.amount) > 10000;
    const isCritical = inputData.priority === "critical" || inputData.urgency === "high";

    if (isHighValue || isCritical) {
      return {
        shouldEscalate: true,
        reason: isHighValue ? "High-value transaction requires approval" : "Critical priority item",
        escalateTo: "senior_manager"
      };
    }

    return {
      shouldEscalate: false,
      reason: "Normal processing conditions",
      escalateTo: ""
    };
  }

  /**
   * Build routing decision prompt
   */
  private buildRoutingPrompt(
    context: WorkflowContext,
    workflowPattern: WorkflowPattern,
    currentStep: WorkflowStep,
    inputData: Record<string, any>
  ): string {
    return `Analyze this workflow execution and determine the optimal next routing decision:

Workflow: ${workflowPattern.name} (${workflowPattern.type})
Current Step: ${currentStep.name} - ${currentStep.description}
Step Type: ${currentStep.type}

Input Data: ${JSON.stringify(inputData, null, 2)}
Current Context: ${JSON.stringify(context.stepData, null, 2)}

Available Next Steps: ${workflowPattern.steps
  .filter(step => step.id !== currentStep.id)
  .map(step => `${step.id}: ${step.name} (${step.type})`)
  .join(", ")}

Business Rules:
- Consider the workflow type and current step completion
- Evaluate input data quality and completeness
- Account for assignee roles and availability
- Factor in business priority and urgency
- Consider compliance requirements and approval chains

Provide intelligent routing decision with reasoning and confidence score.`;
  }

  /**
   * Build validation prompt
   */
  private buildValidationPrompt(
    data: Record<string, any>,
    step: WorkflowStep,
    businessContext?: BusinessRequirement
  ): string {
    return `Validate this data for a business workflow step:

Step: ${step.name} - ${step.description}
Required Fields: ${step.requiredFields?.join(", ") || "None specified"}
Step Type: ${step.type}

Data to Validate: ${JSON.stringify(data, null, 2)}

${businessContext ? `
Business Context:
- Industry: ${businessContext.extractedEntities?.businessContext?.industry || "General"}
- Compliance: ${businessContext.extractedEntities?.businessContext?.complianceRequirements?.join(", ") || "Standard"}
- Criticality: ${businessContext.extractedEntities?.businessContext?.criticality || "Medium"}
` : ""}

Validation Criteria:
- Check required field completeness
- Validate data types and formats
- Assess data quality and consistency
- Check business rule compliance
- Evaluate potential risks or issues
- Consider industry-specific requirements

Provide comprehensive validation with specific issues and suggestions.`;
  }

  /**
   * Get routing system prompt
   */
  private getRoutingSystemPrompt(): string {
    return `You are an AI expert in business process automation and workflow routing. 

Your role is to analyze workflow execution context and make intelligent routing decisions that optimize business processes while ensuring compliance and efficiency.

Key responsibilities:
- Analyze current workflow state and input data
- Consider business rules and compliance requirements  
- Evaluate assignee capabilities and workload
- Factor in priority, urgency, and SLA requirements
- Provide clear reasoning for routing decisions
- Assess confidence levels and suggest alternatives

Always provide practical, actionable decisions that improve business process efficiency.`;
  }

  /**
   * Get validation system prompt
   */
  private getValidationSystemPrompt(): string {
    return `You are an AI expert in business data validation and quality assurance.

Your role is to thoroughly validate business data for workflow steps, ensuring data quality, compliance, and business rule adherence.

Key responsibilities:
- Validate required fields and data completeness
- Check data types, formats, and consistency
- Assess business rule compliance
- Identify potential risks or quality issues
- Provide specific improvement suggestions
- Score data quality and compliance levels

Always provide actionable feedback to improve data quality and business process efficiency.`;
  }

  /**
   * Get routing function schema
   */
  private getRoutingFunctionSchema() {
    return {
      name: "make_routing_decision",
      description: "Make intelligent routing decision for workflow step",
      parameters: {
        type: "object",
        properties: {
          nextStep: { type: "string", description: "ID of the next workflow step" },
          assignee: { type: "string", description: "Recommended assignee for the next step" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          estimatedDuration: { type: "number", description: "Estimated hours to complete" },
          reasoning: { type: "string", description: "Explanation for the routing decision" },
          confidence: { type: "number", description: "Confidence score 0-1" },
          alternativeRoutes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "string" },
                condition: { type: "string" },
                probability: { type: "number" }
              }
            }
          }
        },
        required: ["nextStep", "reasoning", "confidence"]
      }
    };
  }

  /**
   * Get validation function schema
   */
  private getValidationFunctionSchema() {
    return {
      name: "validate_data",
      description: "Validate business data for workflow step",
      parameters: {
        type: "object",
        properties: {
          isValid: { type: "boolean", description: "Overall validation result" },
          score: { type: "number", description: "Overall quality score 0-1" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
                severity: { type: "string", enum: ["error", "warning", "info"] },
                suggestedFix: { type: "string" }
              }
            }
          },
          dataQualityScore: { type: "number", description: "Data quality score 0-1" },
          complianceScore: { type: "number", description: "Compliance score 0-1" }
        },
        required: ["isValid", "score", "issues"]
      }
    };
  }

  /**
   * Convert decision response to routing decision
   */
  private convertToRoutingDecision(response: AIDecisionResponse): AIRoutingDecision {
    return {
      nextStep: response.decision,
      priority: "medium",
      estimatedDuration: 2,
      reasoning: response.reasoning,
      confidence: response.confidence,
      alternativeRoutes: []
    };
  }

  /**
   * Get fallback routing decision
   */
  private getFallbackRoutingDecision(
    workflowPattern: WorkflowPattern,
    currentStep: WorkflowStep
  ): AIRoutingDecision {
    const nextStep = this.getNextStep(workflowPattern, currentStep.id);
    
    return {
      nextStep,
      priority: "medium",
      estimatedDuration: currentStep.slaHours || 2,
      reasoning: "Fallback sequential routing",
      confidence: 0.5,
      alternativeRoutes: []
    };
  }

  /**
   * Get fallback validation
   */
  private getFallbackValidation(
    data: Record<string, any>,
    step: WorkflowStep
  ): AIValidationResult {
    const issues: Array<{
      field: string;
      message: string;
      severity: "error" | "warning" | "info";
      suggestedFix?: string;
    }> = [];

    // Check required fields
    if (step.requiredFields) {
      for (const field of step.requiredFields) {
        if (!data[field] || data[field] === "") {
          issues.push({
            field,
            message: `Required field '${field}' is missing or empty`,
            severity: "error",
            suggestedFix: `Please provide a value for ${field}`
          });
        }
      }
    }

    return {
      isValid: issues.filter(i => i.severity === "error").length === 0,
      score: issues.length === 0 ? 1.0 : Math.max(0.3, 1.0 - (issues.length * 0.2)),
      issues,
      dataQualityScore: 0.8,
      complianceScore: 0.9
    };
  }

  /**
   * Get next step in workflow
   */
  private getNextStep(workflowPattern: WorkflowPattern, currentStepId: string): string {
    const currentIndex = workflowPattern.steps.findIndex(s => s.id === currentStepId);
    if (currentIndex >= 0 && currentIndex < workflowPattern.steps.length - 1) {
      return workflowPattern.steps[currentIndex + 1].id;
    }
    return "completed";
  }
}