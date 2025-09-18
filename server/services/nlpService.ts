import OpenAI from "openai";

export interface ExtractedBusinessData {
  processes: string[];
  forms: string[];
  approvals: string[];
  integrations: string[];
  workflowPatterns: string[];
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

export class NLPService {
  private openai: OpenAI;
  private cache: Map<string, ExtractedBusinessData> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Parse business description into structured requirements using GPT-4
   */
  async parseBusinessDescription(description: string, options?: {
    conversationHistory?: any[];
    preserveContext?: boolean;
  }): Promise<ExtractedBusinessData> {
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

        let parsedData: any;
        try {
          parsedData = JSON.parse(functionCall.arguments);
        } catch (error) {
          throw new Error("Failed to parse AI response");
        }

        const result: ExtractedBusinessData = {
          processes: parsedData.processes || [],
          forms: parsedData.forms || [],
          approvals: parsedData.approvals || [],
          integrations: parsedData.integrations || [],
          workflowPatterns: parsedData.workflowPatterns || [],
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
        processes: finalData.processes || [],
        forms: finalData.forms || [],
        approvals: finalData.approvals || [],
        integrations: finalData.integrations || [],
        workflowPatterns: finalData.workflowPatterns || [],
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
      processes: parsedData.processes || [],
      forms: parsedData.forms || [],
      approvals: parsedData.approvals || [],
      integrations: parsedData.integrations || [],
      workflowPatterns: parsedData.workflowPatterns || [],
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
    return `You are an expert business application generator AI. Your task is to analyze natural language descriptions of business processes and extract structured requirements for generating complete business applications.

Extract the following information:
- Business processes (specific workflows and operations)
- Required forms (data collection interfaces)
- Approval steps (authorization and review processes)
- System integrations (external APIs and services)
- Workflow patterns (sequential, parallel, conditional flows)

Provide a confidence score from 0.0 to 1.0 based on:
- Clarity and specificity of the description
- Completeness of business context
- Technical feasibility
- Workflow complexity

Focus on enterprise-grade applications with proper security, scalability, and user experience considerations.`;
  }

  private getFunctionSchema() {
    return {
      name: "extract_business_requirements",
      description: "Extract structured business requirements from natural language description",
      parameters: {
        type: "object",
        properties: {
          processes: {
            type: "array",
            items: { type: "string" },
            description: "List of business processes (e.g., employee_onboarding, background_verification)"
          },
          forms: {
            type: "array",
            items: { type: "string" },
            description: "List of required forms (e.g., employee_information_form, tax_form)"
          },
          approvals: {
            type: "array",
            items: { type: "string" },
            description: "List of approval steps (e.g., manager_approval, hr_approval)"
          },
          integrations: {
            type: "array",
            items: { type: "string" },
            description: "List of system integrations (e.g., background_check_api, email_service)"
          },
          workflowPatterns: {
            type: "array",
            items: { type: "string" },
            description: "List of workflow patterns (e.g., sequential_approval, parallel_processing)"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence score for the extraction accuracy"
          }
        },
        required: ["processes", "forms", "approvals", "integrations", "workflowPatterns", "confidence"]
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