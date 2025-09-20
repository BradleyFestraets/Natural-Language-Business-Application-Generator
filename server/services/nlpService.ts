import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";

// Enhanced business context analysis
export interface BusinessContext {
  industry: string;
  criticality: 'mission_critical' | 'important' | 'standard' | 'support';
  scope: 'department' | 'division' | 'enterprise';
  complianceRequirements?: string[];
}

// Enhanced process analysis
export interface BusinessProcess {
  name: string;
  type: 'core' | 'support' | 'governance' | 'integration';
  description: string;
  complexity: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

// Enhanced form analysis
export interface BusinessForm {
  name: string;
  purpose: string;
  complexity: 'simple' | 'moderate' | 'complex';
  dataTypes?: string[];
  validationRules?: string[];
}

// Enhanced approval analysis
export interface BusinessApproval {
  name: string;
  role: string;
  criteria: string;
  escalation?: string;
  timeLimit?: string;
}

// Enhanced integration analysis
export interface BusinessIntegration {
  name: string;
  type: 'api' | 'database' | 'file_system' | 'email' | 'notification' | 'authentication';
  purpose: string;
  criticality: 'essential' | 'important' | 'optional';
  dataFlow?: 'inbound' | 'outbound' | 'bidirectional';
}

// Enhanced workflow pattern analysis
export interface WorkflowPattern {
  name: string;
  type: 'sequential' | 'parallel' | 'conditional' | 'loop' | 'escalation' | 'approval_chain';
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
  businessRules?: string[];
}

// Risk assessment analysis
export interface RiskAssessment {
  securityRisks: string[];
  complianceRisks: string[];
  operationalRisks: string[];
  mitigationStrategies?: string[];
}

// Resource requirements analysis
export interface ResourceRequirements {
  userRoles: string[];
  technicalComplexity: 'low' | 'medium' | 'high';
  estimatedTimeframe: string;
  infrastructureNeeds?: string[];
}

// Main enhanced business data interface
export interface ExtractedBusinessData {
  businessContext: BusinessContext;
  processes: BusinessProcess[];
  forms: BusinessForm[];
  approvals: BusinessApproval[];
  integrations: BusinessIntegration[];
  workflowPatterns: WorkflowPattern[];
  riskAssessment: RiskAssessment;
  resourceRequirements: ResourceRequirements;
  confidence: number;
  validationWarnings?: string[];
  recommendations?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  suggestions: string[];
  recommendations: string[];
  score: {
    length: number;
    specificity: number;
    businessContext: number;
    technicalDetail: number;
  };
}

export interface ConfidenceFactors {
  lengthScore: number;
  specificityScore: number;
  businessContextScore: number;
  technicalDetailScore: number;
  overallConfidence: number;
  recommendations: string[];
}

export interface ConversationContext {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  extractedData?: Partial<ExtractedBusinessData>;
}

export interface StreamingUpdate {
  status: "parsing" | "processing" | "completed" | "error";
  partialData?: Partial<ExtractedBusinessData>;
  progress?: number;
  message?: string;
  error?: string;
}

export interface AIServiceHealthStatus {
  aiServiceAvailable: boolean;
  degradedMode: boolean;
  lastChecked: Date;
  responseTime?: number;
  fallbackModeActive?: boolean;
  degradationStartTime?: number;
  lastSuccessfulAICall?: number;
  capabilities: {
    parsing: boolean;
    validation: boolean;
    streaming: boolean;
    contextEnhancement: boolean;
  };
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

interface ServiceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

interface ProbeMetrics {
  totalProbes: number;
  successfulProbes: number;
  failedProbes: number;
  lastProbeTime: number | null;
  lastSuccessfulProbe: number | null;
}

export class NLPService {
  private openai: OpenAI;
  private cache: Map<string, ExtractedBusinessData> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();
  private availabilityCache: Map<string, { available: boolean; timestamp: number }> = new Map();
  private readonly AVAILABILITY_CACHE_TTL = 30 * 1000; // 30 seconds
  private degradationStartTime: number | null = null;
  private lastSuccessfulAICall: number | null = null;
  private fallbackModeActive: boolean = false;
  private terminologyMappings: Map<string, string> = new Map();

  // Circuit breaker properties
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number = 0;
  private halfOpenCalls: number = 0;
  
  private readonly circuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Open circuit after 5 consecutive failures
    resetTimeout: 60000, // Try to close circuit after 60 seconds
    monitoringPeriod: 300000, // 5 minutes monitoring window
    halfOpenMaxCalls: 3 // Allow 3 calls in half-open state
  };
  
  private metrics: ServiceMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageResponseTime: 0,
    lastFailureTime: null,
    lastSuccessTime: null
  };

  private probeMetrics: ProbeMetrics = {
    totalProbes: 0,
    successfulProbes: 0,
    failedProbes: 0,
    lastProbeTime: null,
    lastSuccessfulProbe: null
  };

  constructor() {
    // Only initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      // Placeholder client for graceful degradation
      this.openai = null as any;
    }
    
    // Initialize business-to-technical terminology mappings
    this.initializeTerminologyMappings();
  }
  
  /**
   * Initialize business terminology to technical implementation mappings
   */
  private initializeTerminologyMappings(): void {
    // Common business terms to technical implementations
    this.terminologyMappings.set('approval workflow', 'sequential_approval_chain');
    this.terminologyMappings.set('background check', 'api_integration_background_verification');
    this.terminologyMappings.set('document upload', 'file_storage_integration');
    this.terminologyMappings.set('email notification', 'smtp_email_service');
    this.terminologyMappings.set('sms alert', 'twilio_sms_integration');
    this.terminologyMappings.set('manager approval', 'role_based_approval');
    this.terminologyMappings.set('expense report', 'financial_form_workflow');
    this.terminologyMappings.set('employee onboarding', 'hr_onboarding_process');
    this.terminologyMappings.set('customer portal', 'external_user_interface');
    this.terminologyMappings.set('payment processing', 'payment_gateway_integration');
    this.terminologyMappings.set('inventory management', 'erp_inventory_module');
    this.terminologyMappings.set('leave request', 'hr_time_off_workflow');
    this.terminologyMappings.set('purchase order', 'procurement_workflow');
    this.terminologyMappings.set('invoice processing', 'accounts_payable_workflow');
    this.terminologyMappings.set('contract management', 'legal_document_workflow');
    this.terminologyMappings.set('customer feedback', 'survey_collection_system');
    this.terminologyMappings.set('performance review', 'hr_evaluation_process');
    this.terminologyMappings.set('sales pipeline', 'crm_opportunity_management');
    this.terminologyMappings.set('help desk ticket', 'support_ticketing_system');
    this.terminologyMappings.set('compliance audit', 'regulatory_compliance_workflow');
  }

  /**
   * Circuit breaker - check if calls should be allowed
   */
  private isCircuitOpen(): boolean {
    const now = Date.now();
    
    switch (this.circuitState) {
      case CircuitState.CLOSED:
        return false;
      
      case CircuitState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.circuitState = CircuitState.HALF_OPEN;
          this.halfOpenCalls = 0;
          return false;
        }
        return true;
      
      case CircuitState.HALF_OPEN:
        // If half-open calls exceed maximum, transition back to OPEN with timer to prevent deadlock
        if (this.halfOpenCalls >= this.circuitConfig.halfOpenMaxCalls) {
          this.circuitState = CircuitState.OPEN;
          this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeout;
          return true;
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Record successful call - update circuit breaker and metrics
   */
  private recordSuccess(responseTime: number, isProbe: boolean = false): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    
    if (isProbe) {
      // Update probe metrics
      this.probeMetrics.totalProbes++;
      this.probeMetrics.successfulProbes++;
      this.probeMetrics.lastProbeTime = Date.now();
      this.probeMetrics.lastSuccessfulProbe = Date.now();
    } else {
      // Update production metrics
      this.metrics.totalCalls++;
      this.metrics.successfulCalls++;
      this.metrics.lastSuccessTime = Date.now();
      
      // Update average response time using only successful calls
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.successfulCalls - 1) + responseTime) / this.metrics.successfulCalls;
    }
    
    // Update service state
    this.lastSuccessfulAICall = Date.now();
    if (this.fallbackModeActive) {
      this.fallbackModeActive = false;
      this.degradationStartTime = null;
    }
  }

  /**
   * Record failed call - update circuit breaker and metrics
   */
  private recordFailure(error: Error, isProbe: boolean = false): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (isProbe) {
      // Update probe metrics
      this.probeMetrics.totalProbes++;
      this.probeMetrics.failedProbes++;
      this.probeMetrics.lastProbeTime = Date.now();
    } else {
      // Update production metrics
      this.metrics.totalCalls++;
      this.metrics.failedCalls++;
      this.metrics.lastFailureTime = Date.now();
    }
    
    // Update circuit state - only increment half-open calls on failure, not in recordFailure
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeout;
    } else if (this.failureCount >= this.circuitConfig.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeout;
    }
    
    // Track degradation start
    if (!this.fallbackModeActive) {
      this.degradationStartTime = Date.now();
      this.fallbackModeActive = true;
    }
  }

  /**
   * Enhanced exponential backoff with jitter
   */
  private calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    const exponentialDelay = Math.pow(2, attempt) * baseDelay;
    const maxDelay = 30000; // 30 seconds max
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Get service metrics for monitoring
   */
  getServiceMetrics(): ServiceMetrics & ProbeMetrics & { circuitState: CircuitState } {
    return {
      ...this.metrics,
      ...this.probeMetrics,
      circuitState: this.circuitState
    };
  }

  /**
   * Check AI service availability with caching - no half-open tracking here
   */
  async checkAIServiceAvailability(): Promise<boolean> {
    // Check circuit breaker first
    if (this.isCircuitOpen()) {
      return false;
    }
    const cacheKey = 'availability_check';
    const cached = this.availabilityCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.AVAILABILITY_CACHE_TTL) {
      return cached.available;
    }

    // Check circuit breaker first
    if (this.isCircuitOpen()) {
      this.availabilityCache.set(cacheKey, { available: false, timestamp: Date.now() });
      return false;
    }

    try {
      // Quick check - do we have an API key?
      if (!process.env.OPENAI_API_KEY) {
        this.availabilityCache.set(cacheKey, { available: false, timestamp: Date.now() });
        return false;
      }

      // Re-initialize OpenAI client if not available but API key exists
      if (!this.openai && process.env.OPENAI_API_KEY) {
        const OpenAI = (await import("openai")).default;
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
      }

      // Only do actual ping if not returning cached result
      if (!cached || Date.now() - cached.timestamp > this.AVAILABILITY_CACHE_TTL) {
        // Increment half-open calls only before actual outbound call
        if (this.circuitState === CircuitState.HALF_OPEN) {
          this.halfOpenCalls++;
          // Check if we've exceeded the cap after incrementing
          if (this.halfOpenCalls > this.circuitConfig.halfOpenMaxCalls) {
            this.circuitState = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeout;
            return false;
          }
        }

        // Enhanced ping to OpenAI with proper timeout handling
        const startTime = Date.now();
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout
        
        let response;
        try {
          response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          }, {
            signal: abortController.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const responseTime = Date.now() - startTime;
        const available = response.choices?.[0] ? true : false;
        
        // Record success in circuit breaker (as probe)
        if (available) {
          this.recordSuccess(responseTime, true);
        }
        
        this.availabilityCache.set(cacheKey, { available, timestamp: Date.now() });
        return available;
      } else {
        // Return cached result
        return cached.available;
      }

    } catch (error) {
      // Record failure in circuit breaker (as probe)
      this.recordFailure(error as Error, true);
      
      this.availabilityCache.set(cacheKey, { available: false, timestamp: Date.now() });
      return false;
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<AIServiceHealthStatus> {
    const startTime = Date.now();
    const aiAvailable = await this.checkAIServiceAvailability();
    const responseTime = Date.now() - startTime;

    return {
      aiServiceAvailable: aiAvailable,
      degradedMode: !aiAvailable,
      lastChecked: new Date(),
      responseTime,
      fallbackModeActive: this.fallbackModeActive,
      degradationStartTime: this.degradationStartTime,
      lastSuccessfulAICall: this.lastSuccessfulAICall,
      capabilities: {
        parsing: aiAvailable,
        validation: true, // Always available with fallback
        streaming: aiAvailable,
        contextEnhancement: aiAvailable
      }
    };
  }

  /**
   * Get degradation duration in milliseconds
   */
  async getDegradationDuration(): Promise<number> {
    if (!this.fallbackModeActive || !this.degradationStartTime) {
      return 0;
    }
    return Date.now() - this.degradationStartTime;
  }

  /**
   * Parse business description with fallback capability
   */
  async parseBusinessDescription(description: string, options?: {
    conversationHistory?: any[];
    preserveContext?: boolean;
    allowFallback?: boolean;
  }): Promise<ExtractedBusinessData> {
    // Check if AI service is available
    const aiAvailable = await this.checkAIServiceAvailability();
    
    if (!aiAvailable) {
      // Use fallback parsing if allowed
      if (options?.allowFallback !== false) {
        return this.parseWithFallback(description);
      }
      throw new Error("AI service unavailable: OpenAI API key not configured or service unreachable");
    }

    const cacheKey = this.getCacheKey(description);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    const systemPrompt = this.getSystemPrompt();
    const functionSchema = this.getFunctionSchema();

    // Circuit breaker state is already checked in checkAIServiceAvailability()

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const startTime = Date.now();
        
        // Increment half-open calls if in half-open state - only before actual call
        if (this.circuitState === CircuitState.HALF_OPEN) {
          this.halfOpenCalls++;
          // Check if we've exceeded the cap after incrementing
          if (this.halfOpenCalls > this.circuitConfig.halfOpenMaxCalls) {
            this.circuitState = CircuitState.OPEN;
            this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeout;
            throw new Error("Half-open call limit exceeded - circuit reopened");
          }
        }

        // Use AbortController for proper timeout handling
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout

        let response;
        try {
          response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: description }
            ],
            functions: [functionSchema],
            function_call: { name: "extract_business_requirements" },
            temperature: 0.3,
            max_tokens: 1500
          }, {
            signal: abortController.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const responseTime = Date.now() - startTime;

        const functionCall = response.choices[0]?.message?.function_call;
        if (!functionCall?.arguments) {
          throw new Error("No function call in response");
        }

        let parsedData: any;
        try {
          parsedData = JSON.parse(functionCall.arguments);
        } catch (error) {
          throw new Error("Failed to parse AI response");
        }

        const result: ExtractedBusinessData = {
          businessContext: parsedData.businessContext || {
            industry: "General",
            criticality: "standard",
            scope: "department"
          },
          processes: parsedData.processes || [],
          forms: parsedData.forms || [],
          approvals: parsedData.approvals || [],
          integrations: parsedData.integrations || [],
          workflowPatterns: parsedData.workflowPatterns || [],
          riskAssessment: parsedData.riskAssessment || {
            securityRisks: [],
            complianceRisks: [],
            operationalRisks: []
          },
          resourceRequirements: parsedData.resourceRequirements || {
            userRoles: [],
            technicalComplexity: "medium",
            estimatedTimeframe: "2-4 weeks"
          },
          confidence: parsedData.confidence || 0,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          }
        };

        // Add validation warnings for low confidence
        if (result.confidence < 0.5) {
          result.validationWarnings = [
            "Low confidence score - consider providing more details",
            "Insufficient business context detected"
          ];
        }

        // Record successful call in circuit breaker (production call)
        this.recordSuccess(responseTime, false);

        // Cache the result
        this.setCachedResult(cacheKey, result);

        return result;

      } catch (error) {
        // Record failure in circuit breaker (production call)
        this.recordFailure(error as Error, false);

        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Enhanced exponential backoff with jitter
        const delay = this.calculateBackoffDelay(retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check circuit breaker again after delay
        if (this.isCircuitOpen()) {
          throw new Error("AI service circuit breaker opened during retry attempts");
        }
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Fallback parsing using rule-based analysis when AI is unavailable
   */
  private parseWithFallback(description: string): ExtractedBusinessData {
    // Basic keyword-based analysis for fallback mode
    const lowerDesc = description.toLowerCase();
    
    // Detect industry based on keywords
    let industry = "General";
    if (lowerDesc.includes('hr') || lowerDesc.includes('human resources') || lowerDesc.includes('employee')) {
      industry = "Human Resources";
    } else if (lowerDesc.includes('finance') || lowerDesc.includes('accounting') || lowerDesc.includes('expense')) {
      industry = "Finance";
    } else if (lowerDesc.includes('operations') || lowerDesc.includes('inventory') || lowerDesc.includes('supply')) {
      industry = "Operations";
    }

    // Extract basic processes based on keywords
    const processes: BusinessProcess[] = [];
    if (lowerDesc.includes('approval') || lowerDesc.includes('approve')) {
      processes.push({
        name: "Approval Process",
        type: "core",
        description: "Document or request approval workflow",
        complexity: "medium"
      });
    }
    if (lowerDesc.includes('form') || lowerDesc.includes('submit')) {
      processes.push({
        name: "Form Submission",
        type: "core", 
        description: "Data collection and form processing",
        complexity: "low"
      });
    }

    // Extract basic forms
    const forms: BusinessForm[] = [];
    if (lowerDesc.includes('form')) {
      forms.push({
        name: "Primary Form",
        purpose: "Data collection based on description",
        complexity: "simple"
      });
    }

    // Extract basic approvals
    const approvals: BusinessApproval[] = [];
    if (lowerDesc.includes('manager') || lowerDesc.includes('supervisor')) {
      approvals.push({
        name: "Manager Approval",
        role: "Manager",
        criteria: "Standard approval criteria"
      });
    }

    // Extract basic integrations
    const integrations: BusinessIntegration[] = [];
    if (lowerDesc.includes('email') || lowerDesc.includes('notification')) {
      integrations.push({
        name: "Email Notifications",
        type: "email",
        purpose: "Send notifications and updates",
        criticality: "important"
      });
    }

    // Basic workflow patterns
    const workflowPatterns: WorkflowPattern[] = [];
    if (lowerDesc.includes('approval')) {
      workflowPatterns.push({
        name: "Approval Workflow",
        type: "sequential",
        description: "Sequential approval process",
        complexity: "simple"
      });
    }

    // Basic risk assessment
    const riskAssessment: RiskAssessment = {
      securityRisks: ["Data access control needed"],
      complianceRisks: ["Audit trail requirements"],
      operationalRisks: ["User training requirements"]
    };

    // Basic resource requirements
    const resourceRequirements: ResourceRequirements = {
      userRoles: ["User", "Manager"],
      technicalComplexity: "medium",
      estimatedTimeframe: "2-4 weeks"
    };

    // Calculate confidence based on keywords found
    const keywordCount = [
      'process', 'workflow', 'form', 'approval', 'user', 'manager', 
      'submit', 'review', 'data', 'system'
    ].filter(keyword => lowerDesc.includes(keyword)).length;
    
    const confidence = Math.min(keywordCount / 10, 0.7); // Max 0.7 for fallback

    return {
      businessContext: {
        industry,
        criticality: "standard",
        scope: "department"
      },
      processes,
      forms,
      approvals,
      integrations,
      workflowPatterns,
      riskAssessment,
      resourceRequirements,
      confidence,
      validationWarnings: [
        "Parsed using fallback mode - AI service unavailable",
        "Limited analysis performed - consider providing more details when AI is available"
      ],
      recommendations: [
        "Review generated requirements when AI service is available for enhanced analysis",
        "Provide more detailed specifications for better accuracy"
      ]
    };
  }

  /**
   * Validate business description quality and provide suggestions
   */
  async validateDescription(description: string): Promise<ValidationResult> {
    const factors = this.getConfidenceFactors(description);
    
    const suggestions: string[] = [];
    const recommendations: string[] = [];

    if (factors.lengthScore < 0.3) {
      suggestions.push("Provide more detailed description (minimum 50 characters recommended)");
    }

    if (factors.businessContextScore < 0.5) {
      suggestions.push("Specify the business domain (HR, Finance, Operations, etc.)");
      suggestions.push("Describe the main business processes involved");
      suggestions.push("Mention required user roles and permissions");
    }

    if (factors.specificityScore < 0.5) {
      suggestions.push("Include specific features and functionality");
      suggestions.push("Describe the workflow steps in detail");
    }

    if (factors.technicalDetailScore < 0.4) {
      recommendations.push("Consider specifying integration requirements");
      recommendations.push("Add details about form fields and data collection");
      recommendations.push("Mention any automation or notification needs");
    }

    return {
      isValid: factors.overallConfidence >= 0.4,
      confidence: factors.overallConfidence,
      suggestions,
      recommendations,
      score: {
        length: factors.lengthScore,
        specificity: factors.specificityScore,
        businessContext: factors.businessContextScore,
        technicalDetail: factors.technicalDetailScore
      }
    };
  }

  /**
   * Stream parsing with real-time updates
   */
  async streamParseBusinessDescription(
    description: string,
    onUpdate: (update: StreamingUpdate) => void
  ): Promise<ExtractedBusinessData> {
    onUpdate({ status: "parsing", progress: 0, message: "Starting AI analysis..." });

    // Check if AI service is available
    const aiAvailable = await this.checkAIServiceAvailability();
    
    if (!aiAvailable) {
      onUpdate({ 
        status: "processing", 
        progress: 50, 
        message: "Using fallback mode - AI service unavailable" 
      });
      
      // Simulate streaming with fallback
      const result = this.parseWithFallback(description);
      
      onUpdate({
        status: "completed",
        partialData: result,
        progress: 100,
        message: "Fallback analysis complete!"
      });
      
      return result;
    }

    try {
      const systemPrompt = this.getSystemPrompt();
      const functionSchema = this.getFunctionSchema();

      const stream = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description }
        ],
        functions: [functionSchema],
        function_call: { name: "extract_business_requirements" },
        temperature: 0.3,
        max_tokens: 1500,
        stream: true
      });

      let accumulatedArgs = "";
      let progress = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.function_call?.arguments) {
          accumulatedArgs += delta.function_call.arguments;
          progress = Math.min(progress + 10, 90);

          // Try to parse partial data
          try {
            const partialData = JSON.parse(accumulatedArgs + "}");
            onUpdate({
              status: "processing",
              partialData,
              progress,
              message: "Extracting business entities..."
            });
          } catch {
            // Not enough data to parse yet, continue
            onUpdate({
              status: "parsing",
              progress,
              message: "Processing natural language..."
            });
          }
        }
      }

      // Parse final result
      const finalData = JSON.parse(accumulatedArgs);
      const result: ExtractedBusinessData = {
        businessContext: finalData.businessContext || {
          industry: "General",
          criticality: "standard",
          scope: "department"
        },
        processes: finalData.processes || [],
        forms: finalData.forms || [],
        approvals: finalData.approvals || [],
        integrations: finalData.integrations || [],
        workflowPatterns: finalData.workflowPatterns || [],
        riskAssessment: finalData.riskAssessment || {
          securityRisks: [],
          complianceRisks: [],
          operationalRisks: []
        },
        resourceRequirements: finalData.resourceRequirements || {
          userRoles: [],
          technicalComplexity: "medium",
          estimatedTimeframe: "2-4 weeks"
        },
        confidence: finalData.confidence || 0
      };

      onUpdate({
        status: "completed",
        partialData: result,
        progress: 100,
        message: "Analysis complete!"
      });

      return result;

    } catch (error) {
      onUpdate({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to parse business description"
      });
      throw error;
    }
  }

  /**
   * Enhance parsing with conversation context
   */
  async enhanceWithContext(
    description: string,
    context: ConversationContext[]
  ): Promise<ExtractedBusinessData> {
    // Check if AI service is available
    const aiAvailable = await this.checkAIServiceAvailability();
    
    if (!aiAvailable) {
      // Use fallback parsing and try to extract some context
      const fallbackResult = this.parseWithFallback(description);
      
      // Add context-based enhancements to fallback result
      const contextKeywords = context.flatMap(c => 
        c.content.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      );
      
      // Enhance industry detection with context
      if (contextKeywords.some(k => ['hr', 'human', 'employee'].includes(k))) {
        fallbackResult.businessContext.industry = "Human Resources";
      } else if (contextKeywords.some(k => ['finance', 'money', 'budget'].includes(k))) {
        fallbackResult.businessContext.industry = "Finance";
      }
      
      return fallbackResult;
    }

    const contextPrompt = this.buildContextPrompt(context);
    const systemPrompt = this.getSystemPrompt() + "\n\n" + contextPrompt;
    const functionSchema = this.getFunctionSchema();

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description }
      ],
      functions: [functionSchema],
      function_call: { name: "extract_business_requirements" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall?.arguments) {
      throw new Error("No function call in response");
    }

    const parsedData = JSON.parse(functionCall.arguments);

    return {
      businessContext: parsedData.businessContext || {
        industry: "General",
        criticality: "standard",
        scope: "department"
      },
      processes: parsedData.processes || [],
      forms: parsedData.forms || [],
      approvals: parsedData.approvals || [],
      integrations: parsedData.integrations || [],
      workflowPatterns: parsedData.workflowPatterns || [],
      riskAssessment: parsedData.riskAssessment || {
        securityRisks: [],
        complianceRisks: [],
        operationalRisks: []
      },
      resourceRequirements: parsedData.resourceRequirements || {
        userRoles: [],
        technicalComplexity: "medium",
        estimatedTimeframe: "2-4 weeks"
      },
      confidence: parsedData.confidence || 0,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  }

  /**
   * Analyze confidence factors for a description
   */
  getConfidenceFactors(description: string): ConfidenceFactors {
    const length = description.length;
    const words = description.split(/\s+/).filter(w => w.length > 0);
    
    // Length score (0-1)
    const lengthScore = Math.min(length / 200, 1);

    // Specificity score - look for specific business terms
    const businessTerms = [
      'approval', 'workflow', 'process', 'form', 'integration', 'notification',
      'employee', 'manager', 'system', 'document', 'data', 'user', 'role',
      'background', 'check', 'verification', 'collection', 'submission'
    ];
    const foundTerms = businessTerms.filter(term => 
      description.toLowerCase().includes(term)
    );
    const specificityScore = Math.min(foundTerms.length / 8, 1);

    // Business context score - look for business domains
    const businessDomains = [
      'hr', 'human resources', 'finance', 'accounting', 'operations',
      'employee', 'onboarding', 'expense', 'leave', 'payroll', 'inventory'
    ];
    const foundDomains = businessDomains.filter(domain =>
      description.toLowerCase().includes(domain)
    );
    const businessContextScore = Math.min(foundDomains.length / 3, 1);

    // Technical detail score - look for technical concepts
    const technicalTerms = [
      'api', 'integration', 'database', 'email', 'notification', 'automation',
      'scanning', 'upload', 'download', 'sync', 'import', 'export'
    ];
    const foundTechnical = technicalTerms.filter(term =>
      description.toLowerCase().includes(term)
    );
    const technicalDetailScore = Math.min(foundTechnical.length / 4, 1);

    // Overall confidence weighted average
    const overallConfidence = (
      lengthScore * 0.2 +
      specificityScore * 0.3 +
      businessContextScore * 0.3 +
      technicalDetailScore * 0.2
    );

    const recommendations: string[] = [];
    if (lengthScore < 0.5) recommendations.push("Add more descriptive details");
    if (specificityScore < 0.5) recommendations.push("Include specific business processes");
    if (businessContextScore < 0.5) recommendations.push("Clarify the business domain");
    if (technicalDetailScore < 0.3) recommendations.push("Consider technical requirements");

    return {
      lengthScore,
      specificityScore,
      businessContextScore,
      technicalDetailScore,
      overallConfidence,
      recommendations
    };
  }

  private getSystemPrompt(): string {
    return `You are an expert business analyst and application architect AI specializing in Fortune 500 enterprise requirements extraction. Your task is to perform deep analysis of natural language business descriptions and extract comprehensive structured requirements for generating complete business applications.

PERFORM ADVANCED BUSINESS ANALYSIS:

1. BUSINESS CONTEXT ANALYSIS:
   - Industry domain identification (Healthcare, Finance, HR, Operations, etc.)
   - Business criticality level (Mission-critical, Important, Standard, Support)
   - Organizational scope (Department, Division, Enterprise-wide)
   - Compliance requirements (SOX, HIPAA, GDPR, SOC2, etc.)

2. PROCESS INTELLIGENCE:
   - Core business processes with detailed characteristics
   - Process dependencies and relationships
   - Data flow patterns and information architecture
   - Decision points and business rules
   - Exception handling scenarios

3. WORKFLOW PATTERN RECOGNITION:
   - Sequential workflows (step-by-step processes)
   - Parallel processing (concurrent operations)
   - Conditional branching (decision-based routing)
   - Loop patterns (iterative processes)
   - Escalation patterns (exception handling)
   - Approval hierarchies (authorization chains)

4. TECHNICAL ARCHITECTURE:
   - System integration requirements and APIs
   - Data persistence needs and structures
   - Security and access control requirements
   - Performance and scalability considerations
   - Third-party service dependencies

5. RISK AND COMPLIANCE:
   - Security risk assessment
   - Compliance requirements identification
   - Data privacy considerations
   - Audit trail requirements

6. RESOURCE ANALYSIS:
   - User roles and permissions
   - Technical complexity assessment
   - Implementation timeline estimate
   - Operational requirements

Provide comprehensive confidence scoring based on:
- Business context clarity and completeness
- Process specification detail and feasibility
- Technical architecture alignment
- Compliance and security considerations
- Resource requirement clarity

Focus on enterprise-grade applications with Fortune 500 standards for security, compliance, scalability, and operational excellence.`;
  }

  private getFunctionSchema() {
    return {
      name: "extract_business_requirements",
      description: "Extract comprehensive structured business requirements with deep enterprise analysis",
      parameters: {
        type: "object",
        properties: {
          businessContext: {
            type: "object",
            properties: {
              industry: { type: "string", description: "Industry domain (Healthcare, Finance, HR, Operations, etc.)" },
              criticality: { type: "string", enum: ["mission_critical", "important", "standard", "support"], description: "Business criticality level" },
              scope: { type: "string", enum: ["department", "division", "enterprise"], description: "Organizational scope" },
              complianceRequirements: { type: "array", items: { type: "string" }, description: "Compliance standards (SOX, HIPAA, GDPR, SOC2, etc.)" }
            },
            required: ["industry", "criticality", "scope"]
          },
          processes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Process name" },
                type: { type: "string", enum: ["core", "support", "governance", "integration"], description: "Process type" },
                description: { type: "string", description: "Detailed process description" },
                complexity: { type: "string", enum: ["simple", "medium", "complex"], description: "Process complexity" },
                dependencies: { type: "array", items: { type: "string" }, description: "Process dependencies" }
              },
              required: ["name", "type", "description", "complexity"]
            },
            description: "Detailed business processes with characteristics"
          },
          forms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Form name" },
                purpose: { type: "string", description: "Form purpose and usage" },
                complexity: { type: "string", enum: ["simple", "moderate", "complex"], description: "Form complexity" },
                dataTypes: { type: "array", items: { type: "string" }, description: "Types of data collected" },
                validationRules: { type: "array", items: { type: "string" }, description: "Validation requirements" }
              },
              required: ["name", "purpose", "complexity"]
            },
            description: "Required forms with detailed specifications"
          },
          approvals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Approval step name" },
                role: { type: "string", description: "Approver role or position" },
                criteria: { type: "string", description: "Approval criteria" },
                escalation: { type: "string", description: "Escalation process" },
                timeLimit: { type: "string", description: "Time limit for approval" }
              },
              required: ["name", "role", "criteria"]
            },
            description: "Approval workflows with detailed requirements"
          },
          integrations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Integration name" },
                type: { type: "string", enum: ["api", "database", "file_system", "email", "notification", "authentication"], description: "Integration type" },
                purpose: { type: "string", description: "Integration purpose" },
                criticality: { type: "string", enum: ["essential", "important", "optional"], description: "Integration criticality" },
                dataFlow: { type: "string", enum: ["inbound", "outbound", "bidirectional"], description: "Data flow direction" }
              },
              required: ["name", "type", "purpose", "criticality"]
            },
            description: "System integrations with detailed specifications"
          },
          workflowPatterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Pattern name" },
                type: { type: "string", enum: ["sequential", "parallel", "conditional", "loop", "escalation", "approval_chain"], description: "Workflow pattern type" },
                description: { type: "string", description: "Pattern description" },
                complexity: { type: "string", enum: ["simple", "moderate", "complex"], description: "Pattern complexity" },
                businessRules: { type: "array", items: { type: "string" }, description: "Business rules governing the pattern" }
              },
              required: ["name", "type", "description", "complexity"]
            },
            description: "Intelligent workflow patterns with detailed analysis"
          },
          riskAssessment: {
            type: "object",
            properties: {
              securityRisks: { type: "array", items: { type: "string" }, description: "Identified security risks" },
              complianceRisks: { type: "array", items: { type: "string" }, description: "Compliance risks" },
              operationalRisks: { type: "array", items: { type: "string" }, description: "Operational risks" },
              mitigationStrategies: { type: "array", items: { type: "string" }, description: "Risk mitigation strategies" }
            },
            required: ["securityRisks", "complianceRisks", "operationalRisks"]
          },
          resourceRequirements: {
            type: "object",
            properties: {
              userRoles: { type: "array", items: { type: "string" }, description: "Required user roles and permissions" },
              technicalComplexity: { type: "string", enum: ["low", "medium", "high"], description: "Overall technical complexity" },
              estimatedTimeframe: { type: "string", description: "Implementation timeframe estimate" },
              infrastructureNeeds: { type: "array", items: { type: "string" }, description: "Infrastructure requirements" }
            },
            required: ["userRoles", "technicalComplexity", "estimatedTimeframe"]
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Overall confidence score for the comprehensive analysis"
          }
        },
        required: ["businessContext", "processes", "forms", "approvals", "integrations", "workflowPatterns", "riskAssessment", "resourceRequirements", "confidence"]
      }
    };
  }

  private buildContextPrompt(context: ConversationContext[]): string {
    if (context.length === 0) return "";

    let prompt = "Previous conversation context:\n";
    context.slice(-5).forEach((msg, index) => {
      prompt += `${index + 1}. ${msg.type.toUpperCase()}: ${msg.content}\n`;
      if (msg.extractedData) {
        prompt += `   Extracted: ${JSON.stringify(msg.extractedData)}\n`;
      }
    });
    prompt += "\nUse this context to enhance and build upon the current request.";
    
    return prompt;
  }

  private getCacheKey(description: string): string {
    return Buffer.from(description.toLowerCase().trim()).toString('base64');
  }

  private getCachedResult(key: string): ExtractedBusinessData | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  private setCachedResult(key: string, result: ExtractedBusinessData): void {
    this.cache.set(key, result);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Get auto-completion suggestions for business descriptions
   */
  async getAutoCompleteSuggestions(partialDescription: string, options?: {
    context?: string;
    maxSuggestions?: number;
  }): Promise<string[]> {
    const maxSuggestions = options?.maxSuggestions || 5;
    
    // Common business scenario patterns
    const commonScenarios = [
      "with approval workflows that route to managers and executives based on request type and amount",
      "including document collection, validation, and automated processing for compliance",
      "with integration to existing HR systems for employee data synchronization",
      "featuring automated notifications via email and SMS at each workflow stage",
      "including role-based access control for different user levels",
      "with real-time reporting and analytics dashboard for management",
      "including audit trails and compliance tracking for regulatory requirements",
      "featuring mobile-responsive forms for field workers and remote employees",
      "with automated data validation and error handling",
      "including file upload capabilities for supporting documentation",
      "with customizable approval chains based on business rules",
      "featuring integration with payment processing systems",
      "including customer portal for self-service requests",
      "with automated task assignment and deadline tracking",
      "featuring multi-language support for global operations"
    ];

    // Filter suggestions based on partial description
    const lowerPartial = partialDescription.toLowerCase();
    const filtered = commonScenarios.filter(scenario => {
      // Don't suggest something already mentioned
      if (lowerPartial.includes(scenario.toLowerCase().substring(0, 20))) {
        return false;
      }
      // Match based on context
      if (lowerPartial.includes('approval') && scenario.includes('approval')) return true;
      if (lowerPartial.includes('document') && scenario.includes('document')) return true;
      if (lowerPartial.includes('integration') && scenario.includes('integration')) return true;
      if (lowerPartial.includes('notification') && scenario.includes('notification')) return true;
      if (lowerPartial.includes('report') && scenario.includes('report')) return true;
      if (lowerPartial.includes('mobile') && scenario.includes('mobile')) return true;
      if (lowerPartial.includes('payment') && scenario.includes('payment')) return true;
      // Default suggestions if no specific match
      return true;
    });

    // If AI service is available, enhance with AI suggestions
    const aiAvailable = await this.checkAIServiceAvailability();
    if (aiAvailable && this.openai) {
      try {
        const prompt = `Given this partial business application description: "${partialDescription}"
        Suggest ${maxSuggestions} natural completions that would continue this description.
        Focus on common business patterns and requirements.
        Return only the completion text that would naturally follow the partial description.
        Format as JSON array: ["completion 1", "completion 2", ...]`;

        const response = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are an expert at predicting business application requirements." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          try {
            const aiSuggestions = JSON.parse(content);
            if (Array.isArray(aiSuggestions)) {
              return aiSuggestions.slice(0, maxSuggestions);
            }
          } catch {
            // Fall back to rule-based suggestions
          }
        }
      } catch (error) {
        console.error("Error getting AI suggestions:", error);
        // Fall back to rule-based suggestions
      }
    }

    // Return filtered rule-based suggestions
    return filtered.slice(0, maxSuggestions);
  }

  /**
   * Validate business description - wrapper method
   */
  async validateBusinessDescription(description: string, options?: {
    includeRecommendations?: boolean;
    checkCompleteness?: boolean;
  }): Promise<ValidationResult> {
    // Use the existing validateDescription method
    return this.validateDescription(description);
  }

  /**
   * Extract comprehensive requirements with enhanced function calling
   * This is the main method for Story 2.2 implementation
   */
  async extractRequirements(description: string, options?: {
    context?: any;
    enableAdvancedAnalysis?: boolean;
  }): Promise<ExtractedBusinessData> {
    const aiAvailable = await this.checkAIServiceAvailability();
    
    if (!aiAvailable) {
      return this.parseWithFallback(description);
    }

    const enhancedPrompt = this.getEnhancedExtractionPrompt();
    const advancedSchema = this.getAdvancedFunctionSchema();

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: enhancedPrompt },
          { role: "user", content: `Extract comprehensive business requirements from: ${description}` }
        ],
        functions: [advancedSchema],
        function_call: { name: "extract_advanced_requirements" },
        temperature: 0.2,
        max_tokens: 2500
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error("No function call in response");
      }

      const parsedData = JSON.parse(functionCall.arguments);
      
      // Apply terminology mapping
      const mappedData = this.applyTerminologyMapping(parsedData);
      
      // Add AI chatbot placement recommendations
      const chatbotRecommendations = this.identifyAIChatbotPlacements(mappedData);
      
      // Calculate confidence with enhanced metrics
      const confidence = this.calculateAdvancedConfidence(mappedData);

      return {
        ...mappedData,
        confidence,
        recommendations: chatbotRecommendations,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error("Error extracting requirements:", error);
      throw error;
    }
  }

  /**
   * Extract workflow patterns with advanced recognition
   */
  async extractWorkflowPatterns(description: string): Promise<WorkflowPattern[]> {
    const lowerDesc = description.toLowerCase();
    const patterns: WorkflowPattern[] = [];

    // Sequential pattern detection
    const sequentialIndicators = ['then', 'after', 'next', 'followed by', 'step-by-step'];
    if (sequentialIndicators.some(indicator => lowerDesc.includes(indicator))) {
      patterns.push({
        name: "Sequential Process Flow",
        type: "sequential",
        description: "Linear progression through defined steps",
        complexity: "simple",
        businessRules: ["Complete each step before proceeding", "Maintain audit trail"]
      });
    }

    // Parallel pattern detection
    const parallelIndicators = ['simultaneously', 'parallel', 'concurrent', 'at the same time'];
    if (parallelIndicators.some(indicator => lowerDesc.includes(indicator))) {
      patterns.push({
        name: "Parallel Processing",
        type: "parallel",
        description: "Multiple processes executing concurrently",
        complexity: "moderate",
        businessRules: ["Synchronize parallel branches", "Handle race conditions"]
      });
    }

    // Conditional pattern detection
    const conditionalIndicators = ['if', 'when', 'based on', 'depending on', 'criteria'];
    if (conditionalIndicators.some(indicator => lowerDesc.includes(indicator))) {
      patterns.push({
        name: "Conditional Routing",
        type: "conditional",
        description: "Decision-based workflow branching",
        complexity: "moderate",
        businessRules: ["Evaluate conditions accurately", "Define default paths"]
      });
    }

    // Approval chain pattern detection
    const approvalIndicators = ['approval', 'authorize', 'sign off', 'review', 'escalate'];
    if (approvalIndicators.some(indicator => lowerDesc.includes(indicator))) {
      patterns.push({
        name: "Approval Hierarchy",
        type: "approval_chain",
        description: "Multi-level approval workflow",
        complexity: "complex",
        businessRules: ["Define approval limits", "Set escalation timeouts", "Track approval history"]
      });
    }

    // Loop pattern detection
    const loopIndicators = ['repeat', 'iterate', 'retry', 'loop', 'until'];
    if (loopIndicators.some(indicator => lowerDesc.includes(indicator))) {
      patterns.push({
        name: "Iterative Process",
        type: "loop",
        description: "Repeating process until conditions met",
        complexity: "moderate",
        businessRules: ["Define exit conditions", "Prevent infinite loops"]
      });
    }

    return patterns;
  }

  /**
   * Extract form fields with data types and validation rules
   */
  async inferFormFields(description: string): Promise<Array<{
    name: string;
    dataType: string;
    validationRules: string[];
    required: boolean;
  }>> {
    const fields: Array<{
      name: string;
      dataType: string;
      validationRules: string[];
      required: boolean;
    }> = [];

    const lowerDesc = description.toLowerCase();

    // Common form field patterns
    if (lowerDesc.includes('email')) {
      fields.push({
        name: "email",
        dataType: "email",
        validationRules: ["Valid email format", "Required field"],
        required: true
      });
    }

    if (lowerDesc.includes('phone') || lowerDesc.includes('contact')) {
      fields.push({
        name: "phoneNumber",
        dataType: "phone",
        validationRules: ["Valid phone format", "10-digit number"],
        required: true
      });
    }

    if (lowerDesc.includes('date') || lowerDesc.includes('deadline')) {
      fields.push({
        name: "date",
        dataType: "date",
        validationRules: ["Valid date format", "Future date only"],
        required: true
      });
    }

    if (lowerDesc.includes('amount') || lowerDesc.includes('cost') || lowerDesc.includes('price')) {
      fields.push({
        name: "amount",
        dataType: "currency",
        validationRules: ["Positive number", "Maximum 2 decimal places"],
        required: true
      });
    }

    if (lowerDesc.includes('file') || lowerDesc.includes('document') || lowerDesc.includes('upload')) {
      fields.push({
        name: "document",
        dataType: "file",
        validationRules: ["PDF, DOC, DOCX formats", "Maximum 10MB"],
        required: false
      });
    }

    if (lowerDesc.includes('reason') || lowerDesc.includes('description') || lowerDesc.includes('comments')) {
      fields.push({
        name: "description",
        dataType: "text",
        validationRules: ["Minimum 10 characters", "Maximum 500 characters"],
        required: false
      });
    }

    return fields;
  }

  /**
   * Extract approval chains with routing logic
   */
  async extractApprovalChains(description: string): Promise<Array<{
    level: number;
    approver: string;
    conditions: string[];
    escalation: string;
    timeout: string;
  }>> {
    const chains: Array<{
      level: number;
      approver: string;
      conditions: string[];
      escalation: string;
      timeout: string;
    }> = [];

    const lowerDesc = description.toLowerCase();

    // Manager approval
    if (lowerDesc.includes('manager')) {
      chains.push({
        level: 1,
        approver: "Direct Manager",
        conditions: ["Request submitted", "All required fields complete"],
        escalation: "Department Head",
        timeout: "24 hours"
      });
    }

    // Director/Department head approval
    if (lowerDesc.includes('director') || lowerDesc.includes('department head')) {
      chains.push({
        level: 2,
        approver: "Department Head",
        conditions: ["Manager approved", "Amount > $5000"],
        escalation: "VP",
        timeout: "48 hours"
      });
    }

    // VP/Executive approval
    if (lowerDesc.includes('vp') || lowerDesc.includes('vice president') || lowerDesc.includes('executive')) {
      chains.push({
        level: 3,
        approver: "Vice President",
        conditions: ["Department Head approved", "Amount > $25000"],
        escalation: "CEO",
        timeout: "72 hours"
      });
    }

    // Finance approval
    if (lowerDesc.includes('finance') || lowerDesc.includes('budget')) {
      chains.push({
        level: 2,
        approver: "Finance Team",
        conditions: ["Budget impact", "Financial compliance required"],
        escalation: "CFO",
        timeout: "24 hours"
      });
    }

    return chains;
  }

  /**
   * Identify integration requirements for external services
   */
  async identifyIntegrationRequirements(description: string): Promise<BusinessIntegration[]> {
    const integrations: BusinessIntegration[] = [];
    const lowerDesc = description.toLowerCase();

    // Email integration
    if (lowerDesc.includes('email') || lowerDesc.includes('notification')) {
      integrations.push({
        name: "Email Service",
        type: "email",
        purpose: "Send automated notifications and alerts",
        criticality: "essential",
        dataFlow: "outbound"
      });
    }

    // SMS integration
    if (lowerDesc.includes('sms') || lowerDesc.includes('text message')) {
      integrations.push({
        name: "SMS Gateway",
        type: "notification",
        purpose: "Send SMS alerts for critical updates",
        criticality: "important",
        dataFlow: "outbound"
      });
    }

    // Database integration
    if (lowerDesc.includes('database') || lowerDesc.includes('data storage')) {
      integrations.push({
        name: "Database System",
        type: "database",
        purpose: "Persistent data storage and retrieval",
        criticality: "essential",
        dataFlow: "bidirectional"
      });
    }

    // API integration
    if (lowerDesc.includes('api') || lowerDesc.includes('third-party') || lowerDesc.includes('external')) {
      integrations.push({
        name: "External API",
        type: "api",
        purpose: "Connect with external services",
        criticality: "important",
        dataFlow: "bidirectional"
      });
    }

    // File storage integration
    if (lowerDesc.includes('file') || lowerDesc.includes('document') || lowerDesc.includes('upload')) {
      integrations.push({
        name: "File Storage",
        type: "file_system",
        purpose: "Store and manage uploaded documents",
        criticality: "essential",
        dataFlow: "bidirectional"
      });
    }

    // Authentication integration
    if (lowerDesc.includes('login') || lowerDesc.includes('authentication') || lowerDesc.includes('sso')) {
      integrations.push({
        name: "Authentication Service",
        type: "authentication",
        purpose: "User authentication and authorization",
        criticality: "essential",
        dataFlow: "bidirectional"
      });
    }

    return integrations;
  }

  /**
   * Map business terminology to technical implementations
   */
  private applyTerminologyMapping(data: any): any {
    const mapped = { ...data };
    
    // Map processes
    if (mapped.processes) {
      mapped.processes = mapped.processes.map((process: any) => ({
        ...process,
        technicalImplementation: this.mapTermToTechnical(process.name)
      }));
    }

    // Map integrations
    if (mapped.integrations) {
      mapped.integrations = mapped.integrations.map((integration: any) => ({
        ...integration,
        technicalImplementation: this.mapTermToTechnical(integration.name)
      }));
    }

    return mapped;
  }

  /**
   * Map individual business term to technical implementation
   */
  private mapTermToTechnical(businessTerm: string): string {
    const lowerTerm = businessTerm.toLowerCase();
    
    // Check direct mapping
    for (const [key, value] of this.terminologyMappings) {
      if (lowerTerm.includes(key)) {
        return value;
      }
    }

    // Generate technical name if no mapping found
    return businessTerm
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Identify where AI chatbots should be placed for user guidance
   */
  private identifyAIChatbotPlacements(data: ExtractedBusinessData): string[] {
    const recommendations: string[] = [];

    // Complex forms need chatbot assistance
    if (data.forms?.some(f => f.complexity === 'complex')) {
      recommendations.push("AI chatbot recommended for complex form assistance and field validation guidance");
    }

    // Multi-step processes benefit from guidance
    if (data.processes?.length > 3) {
      recommendations.push("AI chatbot recommended for multi-step process navigation and progress tracking");
    }

    // Approval workflows need explanation
    if (data.approvals?.length > 0) {
      recommendations.push("AI chatbot recommended for approval status inquiries and escalation guidance");
    }

    // Integration errors need help
    if (data.integrations?.some(i => i.criticality === 'essential')) {
      recommendations.push("AI chatbot recommended for troubleshooting integration issues and error resolution");
    }

    // New user onboarding
    if (data.businessContext?.scope === 'enterprise') {
      recommendations.push("AI chatbot recommended for new user onboarding and feature discovery");
    }

    // Compliance assistance
    if (data.businessContext?.complianceRequirements?.length > 0) {
      recommendations.push("AI chatbot recommended for compliance guidance and regulatory requirement explanations");
    }

    return recommendations;
  }

  /**
   * Calculate advanced confidence score
   */
  private calculateAdvancedConfidence(data: ExtractedBusinessData): number {
    let score = 0;
    let factors = 0;

    // Business context completeness
    if (data.businessContext) {
      score += data.businessContext.industry !== 'General' ? 0.15 : 0.05;
      score += data.businessContext.complianceRequirements?.length > 0 ? 0.1 : 0;
      factors += 0.25;
    }

    // Process definition quality
    if (data.processes?.length > 0) {
      score += Math.min(data.processes.length / 5, 1) * 0.2;
      factors += 0.2;
    }

    // Form specification detail
    if (data.forms?.length > 0) {
      const detailedForms = data.forms.filter(f => f.validationRules?.length > 0);
      score += (detailedForms.length / data.forms.length) * 0.15;
      factors += 0.15;
    }

    // Workflow pattern recognition
    if (data.workflowPatterns?.length > 0) {
      score += Math.min(data.workflowPatterns.length / 3, 1) * 0.15;
      factors += 0.15;
    }

    // Integration completeness
    if (data.integrations?.length > 0) {
      score += Math.min(data.integrations.length / 4, 1) * 0.15;
      factors += 0.15;
    }

    // Risk and resource assessment
    if (data.riskAssessment && data.resourceRequirements) {
      score += 0.1;
      factors += 0.1;
    }

    return factors > 0 ? Math.min(score / factors, 1) : 0.5;
  }

  /**
   * Get enhanced extraction prompt for advanced analysis
   */
  private getEnhancedExtractionPrompt(): string {
    return `You are an elite Fortune 500 enterprise architect and business analyst AI with deep expertise in business process automation, application generation, and digital transformation. Your mission is to extract COMPREHENSIVE, ACTIONABLE business requirements that enable automatic application generation.

ADVANCED EXTRACTION REQUIREMENTS:

1. WORKFLOW PATTERN RECOGNITION:
   - Sequential workflows: Step-by-step linear processes
   - Parallel workflows: Concurrent execution paths
   - Conditional workflows: Decision-based branching
   - Loop patterns: Iterative processes with exit conditions
   - Escalation patterns: Time-based or condition-based escalations
   - Approval chains: Multi-level hierarchical approvals

2. FORM FIELD INFERENCE:
   - Data types: text, number, date, email, phone, file, currency, percentage
   - Validation rules: required, format, range, length, pattern matching
   - Field relationships: dependent fields, conditional visibility
   - Auto-population: default values, calculated fields
   - Multi-step forms: wizard-style progression

3. APPROVAL CHAIN EXTRACTION:
   - Approval levels and hierarchy
   - Role-based routing (manager, director, VP, C-suite)
   - Conditional routing based on amount, type, urgency
   - Escalation paths and timeouts
   - Delegation and out-of-office handling
   - Parallel vs sequential approvals

4. INTEGRATION IDENTIFICATION:
   - Email services: SMTP, SendGrid, AWS SES
   - SMS gateways: Twilio, AWS SNS
   - Database systems: PostgreSQL, MongoDB, DynamoDB
   - File storage: S3, Google Cloud Storage
   - Payment gateways: Stripe, PayPal, Square
   - Authentication: OAuth, SAML, Active Directory
   - APIs: REST, GraphQL, SOAP

5. AI CHATBOT PLACEMENT:
   - Form completion assistance
   - Process navigation guidance
   - Error resolution help
   - Status inquiry handling
   - FAQ and knowledge base integration
   - Proactive user assistance

6. BUSINESS-TO-TECHNICAL MAPPING:
   - Convert business language to technical specifications
   - Identify implementation patterns
   - Suggest architectural components
   - Define data models and relationships
   - Specify security requirements

Provide MAXIMUM detail and specificity for automatic code generation. Include confidence scores and recommendations for optimal implementation.`;
  }

  /**
   * Get advanced function schema for comprehensive extraction
   */
  private getAdvancedFunctionSchema() {
    return {
      name: "extract_advanced_requirements",
      description: "Extract comprehensive business requirements with advanced pattern recognition and technical mapping",
      parameters: {
        type: "object",
        properties: {
          businessContext: {
            type: "object",
            properties: {
              industry: { type: "string" },
              criticality: { type: "string", enum: ["mission_critical", "important", "standard", "support"] },
              scope: { type: "string", enum: ["department", "division", "enterprise"] },
              complianceRequirements: { type: "array", items: { type: "string" } },
              businessObjective: { type: "string" },
              successCriteria: { type: "array", items: { type: "string" } }
            }
          },
          processes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["core", "support", "governance", "integration"] },
                description: { type: "string" },
                complexity: { type: "string", enum: ["low", "medium", "high"] },
                dependencies: { type: "array", items: { type: "string" } },
                steps: { type: "array", items: { type: "string" } },
                actors: { type: "array", items: { type: "string" } }
              }
            }
          },
          forms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                purpose: { type: "string" },
                complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      dataType: { type: "string" },
                      required: { type: "boolean" },
                      validationRules: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                dataTypes: { type: "array", items: { type: "string" } },
                validationRules: { type: "array", items: { type: "string" } }
              }
            }
          },
          approvals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                role: { type: "string" },
                level: { type: "number" },
                criteria: { type: "string" },
                conditions: { type: "array", items: { type: "string" } },
                escalation: { type: "string" },
                timeLimit: { type: "string" },
                delegationRules: { type: "string" }
              }
            }
          },
          integrations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["api", "database", "file_system", "email", "notification", "authentication", "payment"] },
                purpose: { type: "string" },
                criticality: { type: "string", enum: ["essential", "important", "optional"] },
                dataFlow: { type: "string", enum: ["inbound", "outbound", "bidirectional"] },
                technicalSpec: { type: "string" }
              }
            }
          },
          workflowPatterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["sequential", "parallel", "conditional", "loop", "escalation", "approval_chain"] },
                description: { type: "string" },
                complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                businessRules: { type: "array", items: { type: "string" } },
                implementation: { type: "string" }
              }
            }
          },
          aiChatbotRecommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                placement: { type: "string" },
                purpose: { type: "string" },
                capabilities: { type: "array", items: { type: "string" } }
              }
            }
          },
          riskAssessment: {
            type: "object",
            properties: {
              securityRisks: { type: "array", items: { type: "string" } },
              complianceRisks: { type: "array", items: { type: "string" } },
              operationalRisks: { type: "array", items: { type: "string" } },
              mitigationStrategies: { type: "array", items: { type: "string" } }
            }
          },
          resourceRequirements: {
            type: "object",
            properties: {
              userRoles: { type: "array", items: { type: "string" } },
              technicalComplexity: { type: "string", enum: ["low", "medium", "high"] },
              estimatedTimeframe: { type: "string" },
              infrastructureNeeds: { type: "array", items: { type: "string" } }
            }
          },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["businessContext", "processes", "forms", "approvals", "integrations", "workflowPatterns", "confidence"]
      }
    };
  }
}