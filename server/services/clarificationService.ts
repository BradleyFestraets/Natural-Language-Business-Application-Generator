import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { ExtractedBusinessData } from "./nlpService";

export interface ClarificationQuestion {
  id: string;
  type: "gap_filling" | "disambiguation" | "validation" | "enhancement";
  category: "workflow" | "forms" | "approvals" | "integrations" | "business_rules";
  question: string;
  context: string;
  examples?: string[];
  suggestions?: string[];
  required: boolean;
  followUp?: string;
}

export interface ClarificationSession {
  sessionId: string;
  businessRequirementId: string;
  questions: ClarificationQuestion[];
  responses: { [questionId: string]: string };
  completedQuestions: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  estimatedCompletionTime: number;
  status: "active" | "completed" | "abandoned";
}

export interface ClarificationResponse {
  questionId: string;
  response: string;
  confidence: number;
  followUpNeeded: boolean;
  followUpQuestion?: ClarificationQuestion;
}

export interface RefinedRequirements extends ExtractedBusinessData {
  clarificationResponses: { [questionId: string]: string };
  refinementScore: number;
  completenessScore: number;
  consistencyScore: number;
  suggestions: string[];
}

export class ClarificationService {
  private openai: OpenAI;
  private activeSessions: Map<string, ClarificationSession> = new Map();
  private sessionHistory: Map<string, Array<{ question: string; response: string; timestamp: Date }>> = new Map();
  private confidenceTracking: Map<string, number[]> = new Map();

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null as any;
    }
  }

  /**
   * Generate clarification questions for incomplete requirements with intelligent analysis
   */
  async generateClarificationQuestions(
    businessRequirementId: string,
    extractedData: ExtractedBusinessData,
    originalDescription: string
  ): Promise<ClarificationQuestion[]> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for clarification generation");
    }

    const systemPrompt = this.getClarificationSystemPrompt();
    const analysisPrompt = this.buildAnalysisPrompt(extractedData, originalDescription);

    try {
      // Analyze gaps and generate intelligent questions
      const gapAnalysis = await this.analyzeRequirementGaps(extractedData);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: analysisPrompt },
          { role: "assistant", content: `Gap Analysis: ${JSON.stringify(gapAnalysis)}` }
        ],
        functions: [this.getClarificationFunctionSchema()],
        function_call: { name: "generate_clarification_questions" },
        temperature: 0.4,
        max_tokens: 2000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error("No clarification questions generated");
      }

      const questionsData = JSON.parse(functionCall.arguments);
      return questionsData.questions.map((q: any, index: number) => ({
        id: `clarify_${businessRequirementId}_${index + 1}`,
        type: q.type || "gap_filling",
        category: q.category || "workflow",
        question: q.question,
        context: q.context || "",
        examples: q.examples || [],
        suggestions: q.suggestions || [],
        required: q.required !== false,
        followUp: q.followUp
      }));
    } catch (error) {
      throw new Error(`Failed to generate clarification questions: ${error}`);
    }
  }

  /**
   * Create a new clarification session
   */
  async createClarificationSession(
    businessRequirementId: string,
    questions: ClarificationQuestion[]
  ): Promise<ClarificationSession> {
    const sessionId = `session_${businessRequirementId}_${Date.now()}`;
    
    const session: ClarificationSession = {
      sessionId,
      businessRequirementId,
      questions,
      responses: {},
      completedQuestions: [],
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      estimatedCompletionTime: questions.length * 60, // 1 minute per question
      status: "active"
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Process user response to clarification question
   */
  async processResponse(
    sessionId: string,
    response: ClarificationResponse
  ): Promise<{
    session: ClarificationSession;
    nextQuestion?: ClarificationQuestion;
    isComplete: boolean;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Clarification session not found");
    }

    // Store the response
    session.responses[response.questionId] = response.response;
    session.completedQuestions.push(response.questionId);

    // Check for follow-up questions
    if (response.followUpNeeded && response.followUpQuestion) {
      session.questions.push(response.followUpQuestion);
      session.totalQuestions++;
    }

    // Move to next question
    session.currentQuestionIndex++;

    const isComplete = session.currentQuestionIndex >= session.totalQuestions;
    
    if (isComplete) {
      session.status = "completed";
    }

    const nextQuestion = isComplete ? undefined : session.questions[session.currentQuestionIndex];

    this.activeSessions.set(sessionId, session);

    return {
      session,
      nextQuestion,
      isComplete
    };
  }

  /**
   * Validate response consistency and generate follow-up if needed
   */
  async validateResponse(
    questionId: string,
    response: string,
    context: ExtractedBusinessData
  ): Promise<{
    isConsistent: boolean;
    confidence: number;
    followUpNeeded: boolean;
    followUpQuestion?: ClarificationQuestion;
  }> {
    if (!isAIServiceAvailable() || !this.openai) {
      return {
        isConsistent: true,
        confidence: 0.7,
        followUpNeeded: false
      };
    }

    const validationPrompt = `
Analyze the consistency of this clarification response:

Question ID: ${questionId}
User Response: ${response}
Existing Context: ${JSON.stringify(context, null, 2)}

Evaluate:
1. Is the response consistent with existing requirements?
2. Does it introduce contradictions?
3. Is the response clear and actionable?
4. Does it need follow-up clarification?

Provide analysis with confidence score (0-1) and determine if follow-up is needed.
`;

    try {
      const response_ai = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a business requirement validation expert." },
          { role: "user", content: validationPrompt }
        ],
        functions: [this.getValidationFunctionSchema()],
        function_call: { name: "validate_response" },
        temperature: 0.2,
        max_tokens: 1000
      });

      const functionCall = response_ai.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error("No validation result generated");
      }

      const validationData = JSON.parse(functionCall.arguments);
      
      let followUpQuestion: ClarificationQuestion | undefined;
      if (validationData.followUpNeeded && validationData.followUpText) {
        followUpQuestion = {
          id: `${questionId}_followup`,
          type: "validation",
          category: "business_rules",
          question: validationData.followUpText,
          context: `Follow-up to clarify: ${response}`,
          required: true
        };
      }

      return {
        isConsistent: validationData.isConsistent,
        confidence: validationData.confidence,
        followUpNeeded: validationData.followUpNeeded,
        followUpQuestion
      };
    } catch (error) {
      console.error("Response validation error:", error);
      return {
        isConsistent: true,
        confidence: 0.5,
        followUpNeeded: false
      };
    }
  }

  /**
   * Refine requirements based on clarification responses
   */
  async refineRequirements(
    sessionId: string,
    originalData: ExtractedBusinessData
  ): Promise<RefinedRequirements> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== "completed") {
      throw new Error("Clarification session not completed");
    }

    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for requirement refinement");
    }

    const refinementPrompt = this.buildRefinementPrompt(originalData, session.responses);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.getRefinementSystemPrompt() },
          { role: "user", content: refinementPrompt }
        ],
        functions: [this.getRefinementFunctionSchema()],
        function_call: { name: "refine_requirements" },
        temperature: 0.3,
        max_tokens: 2500
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error("No refined requirements generated");
      }

      const refinedData = JSON.parse(functionCall.arguments);

      return {
        businessContext: refinedData.businessContext || originalData.businessContext,
        processes: refinedData.processes || originalData.processes,
        forms: refinedData.forms || originalData.forms,
        approvals: refinedData.approvals || originalData.approvals,
        integrations: refinedData.integrations || originalData.integrations,
        workflowPatterns: refinedData.workflowPatterns || originalData.workflowPatterns,
        riskAssessment: refinedData.riskAssessment || originalData.riskAssessment,
        resourceRequirements: refinedData.resourceRequirements || originalData.resourceRequirements,
        confidence: refinedData.confidence || originalData.confidence,
        clarificationResponses: session.responses,
        refinementScore: refinedData.refinementScore || 0.8,
        completenessScore: refinedData.completenessScore || 0.8,
        consistencyScore: refinedData.consistencyScore || 0.8,
        suggestions: refinedData.suggestions || []
      };
    } catch (error) {
      throw new Error(`Failed to refine requirements: ${error}`);
    }
  }

  /**
   * Get clarification session by ID
   */
  getSession(sessionId: string): ClarificationSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  private getClarificationSystemPrompt(): string {
    return `You are an expert business analyst specializing in requirement clarification. Your task is to identify gaps in business requirements and generate targeted, contextual questions that will help complete the understanding.

Focus on generating:
1. Specific, actionable questions that address clear gaps
2. Questions that consider business domain and process complexity
3. Questions with helpful examples and suggestions
4. Questions that can be answered in <3 total questions
5. Questions that improve confidence from ${this.getConfidenceThreshold()}% to 90%+

Intelligent Questioning Strategy:
- Identify the MOST CRITICAL missing information first
- Consider dependencies between requirements
- Focus on implementation-blocking gaps
- Provide domain-specific examples
- Suggest common patterns in the industry
- Validate contradictions and ambiguities

Prioritize questions that:
- Clarify business rules and logic
- Define data validation requirements
- Specify integration details
- Confirm approval workflows
- Establish security and compliance needs`;
  }

  private getConfidenceThreshold(): number {
    return 60; // Minimum confidence threshold
  }

  private buildAnalysisPrompt(extractedData: ExtractedBusinessData, originalDescription: string): string {
    const processNames = extractedData.processes?.map(p => p.name).join(", ") || "None identified";
    const formNames = extractedData.forms?.map(f => f.name).join(", ") || "None identified";
    const approvalNames = extractedData.approvals?.map(a => a.name).join(", ") || "None identified";
    const integrationNames = extractedData.integrations?.map(i => i.name).join(", ") || "None identified";
    const workflowNames = extractedData.workflowPatterns?.map(w => w.name).join(", ") || "None identified";
    
    return `Analyze these extracted requirements for gaps and generate clarification questions:

Original Description: ${originalDescription}

Extracted Requirements:
- Business Context: ${extractedData.businessContext?.industry || "Unknown"} industry, ${extractedData.businessContext?.scope || "unknown"} scope
- Processes: ${processNames}
- Forms: ${formNames}
- Approvals: ${approvalNames}
- Integrations: ${integrationNames}
- Workflow Patterns: ${workflowNames}
- Risk Assessment: ${extractedData.riskAssessment?.securityRisks?.length || 0} security risks identified
- Resource Requirements: ${extractedData.resourceRequirements?.technicalComplexity || "medium"} complexity, ${extractedData.resourceRequirements?.estimatedTimeframe || "unknown"} timeframe
- Confidence: ${extractedData.confidence}

Generate 1-3 targeted clarification questions that address the most critical gaps for application generation.`;
  }

  private getClarificationFunctionSchema() {
    return {
      name: "generate_clarification_questions",
      description: "Generate targeted clarification questions for incomplete business requirements",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["gap_filling", "disambiguation", "validation", "enhancement"],
                  description: "Type of clarification needed"
                },
                category: {
                  type: "string",
                  enum: ["workflow", "forms", "approvals", "integrations", "business_rules"],
                  description: "Category of requirement being clarified"
                },
                question: {
                  type: "string",
                  description: "Clear, specific question to ask the user"
                },
                context: {
                  type: "string",
                  description: "Context explaining why this question is important"
                },
                examples: {
                  type: "array",
                  items: { type: "string" },
                  description: "Example answers to help guide the user"
                },
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Suggested options or common patterns"
                },
                required: {
                  type: "boolean",
                  description: "Whether this question is critical for application generation"
                }
              },
              required: ["question", "category"]
            }
          }
        },
        required: ["questions"]
      }
    };
  }

  private getValidationFunctionSchema() {
    return {
      name: "validate_response",
      description: "Validate user response for consistency and determine follow-up needs",
      parameters: {
        type: "object",
        properties: {
          isConsistent: {
            type: "boolean",
            description: "Whether the response is consistent with existing requirements"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence in the response quality"
          },
          followUpNeeded: {
            type: "boolean",
            description: "Whether a follow-up question is needed"
          },
          followUpText: {
            type: "string",
            description: "Follow-up question if needed"
          }
        },
        required: ["isConsistent", "confidence", "followUpNeeded"]
      }
    };
  }

  private getRefinementSystemPrompt(): string {
    return `You are an expert business requirement analyst. Your task is to refine and enhance business requirements based on clarification responses.

Integrate the clarification responses to:
1. Fill identified gaps in the original requirements
2. Resolve ambiguities and contradictions
3. Enhance completeness and specificity
4. Maintain consistency across all requirements

Provide refined requirements with improved confidence and completeness scores.`;
  }

  private buildRefinementPrompt(originalData: ExtractedBusinessData, responses: { [key: string]: string }): string {
    return `Refine these business requirements using the clarification responses:

Original Requirements:
${JSON.stringify(originalData, null, 2)}

Clarification Responses:
${Object.entries(responses).map(([id, response]) => `${id}: ${response}`).join("\n")}

Generate enhanced requirements that integrate the clarification responses to improve completeness and accuracy.`;
  }

  private getRefinementFunctionSchema() {
    return {
      name: "refine_requirements",
      description: "Refine business requirements based on clarification responses",
      parameters: {
        type: "object",
        properties: {
          businessContext: {
            type: "object",
            properties: {
              industry: { type: "string" },
              criticality: { type: "string", enum: ["mission_critical", "important", "standard", "support"] },
              scope: { type: "string", enum: ["department", "division", "enterprise"] },
              complianceRequirements: { type: "array", items: { type: "string" } }
            },
            description: "Refined business context"
          },
          processes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["core", "support", "governance", "integration"] },
                description: { type: "string" },
                complexity: { type: "string", enum: ["simple", "medium", "complex"] },
                dependencies: { type: "array", items: { type: "string" } }
              }
            },
            description: "Refined list of business processes"
          },
          forms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                purpose: { type: "string" },
                complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                dataTypes: { type: "array", items: { type: "string" } },
                validationRules: { type: "array", items: { type: "string" } }
              }
            },
            description: "Refined list of required forms"
          },
          approvals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                role: { type: "string" },
                criteria: { type: "string" },
                escalation: { type: "string" },
                timeLimit: { type: "string" }
              }
            },
            description: "Refined list of approval steps"
          },
          integrations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["api", "database", "file_system", "email", "notification", "authentication"] },
                purpose: { type: "string" },
                criticality: { type: "string", enum: ["essential", "important", "optional"] },
                dataFlow: { type: "string", enum: ["inbound", "outbound", "bidirectional"] }
              }
            },
            description: "Refined list of system integrations"
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
                businessRules: { type: "array", items: { type: "string" } }
              }
            },
            description: "Refined list of workflow patterns"
          },
          riskAssessment: {
            type: "object",
            properties: {
              securityRisks: { type: "array", items: { type: "string" } },
              complianceRisks: { type: "array", items: { type: "string" } },
              operationalRisks: { type: "array", items: { type: "string" } },
              mitigationStrategies: { type: "array", items: { type: "string" } }
            },
            description: "Risk assessment with mitigation strategies"
          },
          resourceRequirements: {
            type: "object",
            properties: {
              userRoles: { type: "array", items: { type: "string" } },
              technicalComplexity: { type: "string", enum: ["low", "medium", "high"] },
              estimatedTimeframe: { type: "string" },
              infrastructureNeeds: { type: "array", items: { type: "string" } }
            },
            description: "Resource requirements and technical needs"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Updated confidence score"
          },
          refinementScore: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Score indicating quality of refinement"
          },
          completenessScore: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Score indicating requirement completeness"
          },
          consistencyScore: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Score indicating requirement consistency"
          },
          suggestions: {
            type: "array",
            items: { type: "string" },
            description: "Additional suggestions for improvement"
          }
        },
        required: ["businessContext", "processes", "forms", "approvals", "integrations", "workflowPatterns", "riskAssessment", "resourceRequirements", "confidence"]
      }
    };
  }

  /**
   * Prioritize questions based on criticality and impact
   */
  private prioritizeQuestions(questions: ClarificationQuestion[]): ClarificationQuestion[] {
    return questions.sort((a, b) => {
      // Required questions first
      if (a.required !== b.required) {
        return a.required ? -1 : 1;
      }
      
      // Then by type priority
      const typePriority = {
        'gap_filling': 1,
        'validation': 2,
        'disambiguation': 3,
        'enhancement': 4
      };
      
      const aPriority = typePriority[a.type] || 5;
      const bPriority = typePriority[b.type] || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then by category priority
      const categoryPriority = {
        'business_rules': 1,
        'approvals': 2,
        'workflow': 3,
        'forms': 4,
        'integrations': 5
      };
      
      const aCatPriority = categoryPriority[a.category] || 6;
      const bCatPriority = categoryPriority[b.category] || 6;
      
      return aCatPriority - bCatPriority;
    });
  }
}