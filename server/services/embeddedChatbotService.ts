import OpenAI from "openai";
import WebSocket from "ws";
import { 
  EmbeddedChatbot, 
  ChatInteraction, 
  GeneratedApplication,
  BusinessRequirement,
  insertEmbeddedChatbot,
  insertChatInteraction,
  selectEmbeddedChatbot,
  selectChatInteraction
} from "../../shared/schema";
import { storage } from "../storage";
import { isAIServiceAvailable } from "../config/validation";

export interface ChatbotCapability {
  type: 'form_help' | 'validation' | 'action_execution' | 'process_guidance' | 'contextual_assistance';
  description: string;
  permissions: string[];
}

export interface ChatbotPersonality {
  tone: 'professional' | 'friendly' | 'helpful' | 'concise' | 'detailed';
  style: 'formal' | 'casual' | 'technical' | 'business';
  proactiveness: 'low' | 'medium' | 'high';
  expertiseLevel: 'basic' | 'intermediate' | 'expert';
}

export interface ChatbotContext {
  applicationId: string;
  currentPage?: string;
  formState?: Record<string, any>;
  userRole?: string;
  sessionData?: Record<string, any>;
  workflowState?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: ChatbotContext;
  actionData?: any;
}

export interface ChatbotResponse {
  message: string;
  suggestedActions?: Array<{
    type: string;
    label: string;
    data: any;
  }>;
  formHelp?: {
    fieldName: string;
    suggestion: string;
    validation?: string;
  };
  contextUpdate?: Partial<ChatbotContext>;
}

/**
 * EmbeddedChatbotService handles AI chatbots within generated applications
 * Provides contextual assistance, form help, and action execution capabilities
 */
export class EmbeddedChatbotService {
  private openai: OpenAI | null;
  private activeChatbots: Map<string, WebSocket[]> = new Map();
  private chatbotConfigs: Map<string, EmbeddedChatbot> = new Map();

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
   * Create embedded chatbot for a generated application
   */
  async createEmbeddedChatbot(
    applicationId: string,
    businessRequirement: BusinessRequirement,
    capabilities: ChatbotCapability[] = [],
    personality: ChatbotPersonality = {
      tone: 'professional',
      style: 'business',
      proactiveness: 'medium',
      expertiseLevel: 'intermediate'
    }
  ): Promise<EmbeddedChatbot> {
    try {
      // Extract contextual knowledge from business requirement
      const contextualKnowledge = await this.extractContextualKnowledge(
        businessRequirement,
        applicationId
      );

      // Create chatbot configuration
      const chatbot: Omit<EmbeddedChatbot, 'id'> = {
        applicationId,
        name: this.generateChatbotName(businessRequirement),
        contextualKnowledge,
        capabilities: capabilities.length > 0 ? capabilities.map(c => c.type) : [
          'form_help',
          'validation', 
          'process_guidance',
          'contextual_assistance'
        ],
        conversationHistory: [],
        aiModel: 'gpt-4',
        personalityConfig: personality,
        triggerPoints: this.generateTriggerPoints(businessRequirement),
        integrationAccess: [],
        status: 'active'
      };

      // Store in database
      const createdChatbot = await storage.createEmbeddedChatbot(chatbot);
      
      // Cache configuration
      this.chatbotConfigs.set(createdChatbot.id, createdChatbot);

      console.log(`[EmbeddedChatbot] Created chatbot ${createdChatbot.name} for application ${applicationId}`);
      
      return createdChatbot;

    } catch (error) {
      console.error(`[EmbeddedChatbot] Error creating chatbot for application ${applicationId}:`, error);
      throw new Error(`Failed to create embedded chatbot: ${error}`);
    }
  }

  /**
   * Process chat message and generate intelligent response
   */
  async processMessage(
    chatbotId: string,
    message: string,
    context: ChatbotContext,
    userId?: string
  ): Promise<ChatbotResponse> {
    try {
      if (!isAIServiceAvailable() || !this.openai) {
        return this.getFallbackResponse(message, context);
      }

      // Get chatbot configuration
      const chatbot = await this.getChatbotConfig(chatbotId);
      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} not found`);
      }

      // Build context-aware system prompt
      const systemPrompt = this.buildSystemPrompt(chatbot, context);
      
      // Get recent conversation history
      const recentHistory = this.getRecentHistory(chatbot, 5);

      // Create OpenAI messages
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message }
      ];

      // Generate AI response
      const response = await this.openai.chat.completions.create({
        model: chatbot.aiModel === 'gpt-4' ? 'gpt-4o' : 'gpt-3.5-turbo',
        messages,
        temperature: this.getTemperature(chatbot.personalityConfig),
        max_tokens: 800,
        functions: this.getChatbotFunctions(chatbot.capabilities),
        function_call: "auto"
      });

      // Process AI response
      const aiMessage = response.choices[0]?.message;
      if (!aiMessage) {
        return this.getFallbackResponse(message, context);
      }

      // Handle function calls if present
      let chatbotResponse: ChatbotResponse;
      if (aiMessage.function_call) {
        chatbotResponse = await this.handleFunctionCall(
          aiMessage.function_call,
          chatbot,
          context
        );
      } else {
        chatbotResponse = {
          message: aiMessage.content || "I'm here to help! How can I assist you?",
          contextUpdate: context
        };
      }

      // Store interaction
      await this.storeChatInteraction(chatbotId, message, chatbotResponse, context, userId);

      return chatbotResponse;

    } catch (error) {
      console.error(`[EmbeddedChatbot] Error processing message for chatbot ${chatbotId}:`, error);
      return this.getFallbackResponse(message, context);
    }
  }

  /**
   * Register WebSocket client for real-time chatbot communication
   */
  registerChatbotClient(chatbotId: string, ws: WebSocket): void {
    if (!this.activeChatbots.has(chatbotId)) {
      this.activeChatbots.set(chatbotId, []);
    }
    
    this.activeChatbots.get(chatbotId)!.push(ws);
    
    // Handle client disconnect
    ws.on('close', () => {
      this.unregisterChatbotClient(chatbotId, ws);
    });

    console.log(`[EmbeddedChatbot] Registered WebSocket client for chatbot ${chatbotId}`);
  }

  /**
   * Unregister WebSocket client
   */
  private unregisterChatbotClient(chatbotId: string, ws: WebSocket): void {
    const clients = this.activeChatbots.get(chatbotId);
    if (clients) {
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
      }
      
      if (clients.length === 0) {
        this.activeChatbots.delete(chatbotId);
      }
    }
  }

  /**
   * Broadcast message to all connected clients for a chatbot
   */
  private broadcastToClients(chatbotId: string, message: any): void {
    const clients = this.activeChatbots.get(chatbotId);
    if (clients) {
      const messageStr = JSON.stringify(message);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }

  /**
   * Extract contextual knowledge from business requirements
   */
  private async extractContextualKnowledge(
    businessRequirement: BusinessRequirement,
    applicationId: string
  ): Promise<Record<string, any>> {
    return {
      businessContext: businessRequirement.extractedData?.businessContext || {},
      processes: businessRequirement.extractedData?.processes || [],
      forms: businessRequirement.extractedData?.forms || [],
      workflowPatterns: businessRequirement.extractedData?.workflowPatterns || [],
      industry: businessRequirement.extractedData?.businessContext?.industry || 'general',
      applicationPurpose: businessRequirement.originalDescription,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generate appropriate chatbot name based on business requirement
   */
  private generateChatbotName(businessRequirement: BusinessRequirement): string {
    const context = businessRequirement.extractedData?.businessContext;
    if (context?.industry) {
      return `${context.industry} Assistant`;
    }
    return "Business Assistant";
  }

  /**
   * Generate trigger points where chatbot should proactively help
   */
  private generateTriggerPoints(businessRequirement: BusinessRequirement): string[] {
    const triggers = ['form_error', 'validation_failure', 'workflow_start'];
    
    // Add specific triggers based on business context
    if (businessRequirement.extractedData?.forms?.length) {
      triggers.push('form_completion_help');
    }
    
    if (businessRequirement.extractedData?.approvals?.length) {
      triggers.push('approval_guidance');
    }

    return triggers;
  }

  /**
   * Build context-aware system prompt for AI chatbot
   */
  private buildSystemPrompt(chatbot: EmbeddedChatbot, context: ChatbotContext): string {
    const personality = chatbot.personalityConfig as ChatbotPersonality;
    const knowledge = chatbot.contextualKnowledge;

    return `You are ${chatbot.name}, an intelligent assistant embedded in a business application.

PERSONALITY: You are ${personality.tone} and ${personality.style}, with ${personality.proactiveness} proactiveness.

CONTEXT: You are helping users with a ${knowledge.industry || 'business'} application that handles: ${knowledge.applicationPurpose || 'business processes'}.

CAPABILITIES: You can help with:
${chatbot.capabilities.map(cap => `- ${cap.replace('_', ' ')}`).join('\n')}

CURRENT CONTEXT:
- Application: ${context.applicationId}
- Current Page: ${context.currentPage || 'main'}
- User Role: ${context.userRole || 'user'}
- Workflow State: ${context.workflowState || 'active'}

BUSINESS KNOWLEDGE:
${knowledge.processes ? `Processes: ${JSON.stringify(knowledge.processes, null, 2)}` : ''}
${knowledge.forms ? `Forms: ${JSON.stringify(knowledge.forms, null, 2)}` : ''}

GUIDELINES:
1. Provide specific, actionable help based on the current context
2. Use your business knowledge to give relevant suggestions
3. Be concise but comprehensive
4. Offer to take actions when appropriate
5. Maintain conversation context across interactions

Respond helpfully to the user's request.`;
  }

  /**
   * Get recent conversation history
   */
  private getRecentHistory(chatbot: EmbeddedChatbot, limit: number = 5): any[] {
    const history = chatbot.conversationHistory || [];
    return history.slice(-limit * 2).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Get temperature setting based on personality
   */
  private getTemperature(personality: ChatbotPersonality): number {
    switch (personality.tone) {
      case 'creative': return 0.8;
      case 'friendly': return 0.6;
      case 'professional': return 0.3;
      case 'concise': return 0.2;
      default: return 0.4;
    }
  }

  /**
   * Get available functions based on chatbot capabilities
   */
  private getChatbotFunctions(capabilities: string[]): any[] {
    const functions: any[] = [];

    if (capabilities.includes('form_help')) {
      functions.push({
        name: 'provide_form_help',
        description: 'Provide specific help with form fields and validation',
        parameters: {
          type: 'object',
          properties: {
            fieldName: { type: 'string', description: 'Field that needs help' },
            helpType: { type: 'string', enum: ['completion', 'validation', 'explanation'] },
            suggestion: { type: 'string', description: 'Specific help or suggestion' }
          },
          required: ['fieldName', 'helpType', 'suggestion']
        }
      });
    }

    if (capabilities.includes('action_execution')) {
      functions.push({
        name: 'execute_action',
        description: 'Execute a business action within the application',
        parameters: {
          type: 'object',
          properties: {
            actionType: { type: 'string', enum: ['send_email', 'create_task', 'update_record', 'trigger_workflow'] },
            actionData: { type: 'object', description: 'Data needed for the action' }
          },
          required: ['actionType', 'actionData']
        }
      });
    }

    return functions;
  }

  /**
   * Handle AI function calls
   */
  private async handleFunctionCall(
    functionCall: any,
    chatbot: EmbeddedChatbot,
    context: ChatbotContext
  ): Promise<ChatbotResponse> {
    const { name, arguments: args } = functionCall;
    const parsedArgs = JSON.parse(args);

    switch (name) {
      case 'provide_form_help':
        return {
          message: `Here's help with the ${parsedArgs.fieldName} field:`,
          formHelp: {
            fieldName: parsedArgs.fieldName,
            suggestion: parsedArgs.suggestion,
            validation: parsedArgs.helpType === 'validation' ? parsedArgs.suggestion : undefined
          }
        };

      case 'execute_action':
        return await this.executeBusinessAction(parsedArgs.actionType, parsedArgs.actionData, context);

      default:
        return {
          message: "I understand what you need, but I need more context to help you properly."
        };
    }
  }

  /**
   * Execute business actions (placeholder for now)
   */
  private async executeBusinessAction(
    actionType: string,
    actionData: any,
    context: ChatbotContext
  ): Promise<ChatbotResponse> {
    // This would integrate with the business process automation engine
    return {
      message: `I would execute ${actionType} with the provided data. (Action execution will be implemented in the next phase)`,
      suggestedActions: [{
        type: actionType,
        label: `Execute ${actionType}`,
        data: actionData
      }]
    };
  }

  /**
   * Get fallback response when AI service is unavailable
   */
  private getFallbackResponse(message: string, context: ChatbotContext): ChatbotResponse {
    return {
      message: "I'm here to help! I can assist with forms, validation, and process guidance. What do you need help with?",
      suggestedActions: [
        { type: 'form_help', label: 'Form Help', data: {} },
        { type: 'process_guidance', label: 'Process Guidance', data: {} }
      ]
    };
  }

  /**
   * Get chatbot configuration from cache or database
   */
  private async getChatbotConfig(chatbotId: string): Promise<EmbeddedChatbot | null> {
    // Check cache first
    if (this.chatbotConfigs.has(chatbotId)) {
      return this.chatbotConfigs.get(chatbotId)!;
    }

    // Load from database
    try {
      const chatbot = await storage.getEmbeddedChatbotById(chatbotId);
      if (chatbot) {
        this.chatbotConfigs.set(chatbotId, chatbot);
      }
      return chatbot;
    } catch (error) {
      console.error(`[EmbeddedChatbot] Error loading chatbot config ${chatbotId}:`, error);
      return null;
    }
  }

  /**
   * Store chat interaction in database
   */
  private async storeChatInteraction(
    chatbotId: string,
    userMessage: string,
    botResponse: ChatbotResponse,
    context: ChatbotContext,
    userId?: string
  ): Promise<void> {
    try {
      const interaction: Omit<ChatInteraction, 'id'> = {
        chatbotId,
        userId,
        userMessage,
        botResponse: botResponse.message,
        context: context as any,
        timestamp: new Date(),
        actionTaken: botResponse.suggestedActions ? JSON.stringify(botResponse.suggestedActions) : null
      };

      await storage.createChatInteraction(interaction);
    } catch (error) {
      console.error(`[EmbeddedChatbot] Error storing chat interaction:`, error);
      // Don't fail the main flow if logging fails
    }
  }

  /**
   * Get chatbot by application ID
   */
  async getChatbotByApplication(applicationId: string): Promise<EmbeddedChatbot | null> {
    return await storage.getEmbeddedChatbotByApplication(applicationId);
  }

  /**
   * Update chatbot configuration
   */
  async updateChatbot(chatbotId: string, updates: Partial<EmbeddedChatbot>): Promise<void> {
    await storage.updateEmbeddedChatbot(chatbotId, updates);
    // Clear cache to force reload
    this.chatbotConfigs.delete(chatbotId);
  }

  /**
   * Delete chatbot and cleanup
   */
  async deleteChatbot(chatbotId: string): Promise<void> {
    // Disconnect all WebSocket clients
    this.activeChatbots.delete(chatbotId);
    
    // Clear cache
    this.chatbotConfigs.delete(chatbotId);
    
    // Delete from database
    await storage.deleteEmbeddedChatbot(chatbotId);
  }
}

// Export singleton instance
export const embeddedChatbotService = new EmbeddedChatbotService();