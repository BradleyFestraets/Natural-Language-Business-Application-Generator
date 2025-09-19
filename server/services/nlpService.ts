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
  }

  /**
   * Check AI service availability with caching
   */
  async checkAIServiceAvailability(): Promise<boolean> {
    const cacheKey = 'availability_check';
    const cached = this.availabilityCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.AVAILABILITY_CACHE_TTL) {
      return cached.available;
    }

    try {
      // Quick check - do we have an API key?
      if (!process.env.OPENAI_API_KEY || !this.openai) {
        this.availabilityCache.set(cacheKey, { available: false, timestamp: Date.now() });
        return false;
      }

      // Quick ping to OpenAI to check connectivity
      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1
      }, {
        timeout: 5000 // 5 second timeout
      });

      const responseTime = Date.now() - startTime;
      const available = response.choices?.[0] ? true : false;
      
      // Track successful AI calls
      if (available) {
        this.lastSuccessfulAICall = Date.now();
        if (this.fallbackModeActive) {
          this.fallbackModeActive = false;
          this.degradationStartTime = null;
        }
      }
      
      this.availabilityCache.set(cacheKey, { available, timestamp: Date.now() });
      return available;

    } catch (error) {
      // Track degradation start
      if (!this.fallbackModeActive) {
        this.degradationStartTime = Date.now();
        this.fallbackModeActive = true;
      }
      
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

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
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

        // Cache the result
        this.setCachedResult(cacheKey, result);

        return result;

      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
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
}