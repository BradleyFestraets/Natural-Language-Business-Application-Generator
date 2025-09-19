
import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement } from "@shared/schema";

export interface AgentTool {
  name: string;
  description: string;
  category: string;
  permissions: string[];
  code: string;
  parameters: any;
}

export interface AgentToolsGenerationResult {
  tools: AgentTool[];
  integrationCode: string;
  documentation: string;
  capabilities: any[];
}

export class AgentToolsService {
  private openai: OpenAI;

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
   * Generate comprehensive agent tools for a business application
   */
  async generateAgentTools(
    businessRequirement: BusinessRequirement,
    generatedWorkflows: any[] = [],
    generatedForms: any[] = []
  ): Promise<AgentToolsGenerationResult> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for agent tools generation");
    }

    // Analyze business context to determine tool categories
    const toolCategories = this.analyzeBusinessContext(businessRequirement);
    
    const tools: AgentTool[] = [];
    
    // Generate tools for each category
    for (const category of toolCategories) {
      const categoryTools = await this.generateToolsForCategory(
        category,
        businessRequirement,
        generatedWorkflows,
        generatedForms
      );
      tools.push(...categoryTools);
    }
    
    // Generate integration code
    const integrationCode = await this.generateIntegrationCode(tools, businessRequirement);
    
    // Generate documentation
    const documentation = this.generateToolsDocumentation(tools, businessRequirement);
    
    // Generate enhanced capabilities
    const capabilities = this.generateEnhancedCapabilities(tools, businessRequirement);
    
    return {
      tools,
      integrationCode,
      documentation,
      capabilities
    };
  }

  /**
   * Analyze business context to determine what tool categories to generate
   */
  private analyzeBusinessContext(businessRequirement: BusinessRequirement): string[] {
    const categories = new Set<string>();
    
    // Base categories
    categories.add('workflow_automation');
    categories.add('form_assistance');
    categories.add('data_validation');
    
    // Industry-specific categories
    const industry = businessRequirement.extractedEntities?.businessContext?.industry;
    if (industry) {
      switch (industry.toLowerCase()) {
        case 'hr':
        case 'human resources':
          categories.add('employee_management');
          categories.add('compliance_monitoring');
          categories.add('onboarding_automation');
          break;
        case 'finance':
        case 'accounting':
          categories.add('financial_processing');
          categories.add('approval_routing');
          categories.add('budget_management');
          break;
        case 'healthcare':
          categories.add('patient_management');
          categories.add('appointment_scheduling');
          categories.add('hipaa_compliance');
          break;
        case 'retail':
          categories.add('inventory_management');
          categories.add('customer_service');
          categories.add('order_processing');
          break;
      }
    }
    
    // Process-specific categories
    if (businessRequirement.extractedEntities?.processes) {
      for (const process of businessRequirement.extractedEntities.processes) {
        if (process.name.toLowerCase().includes('approval')) {
          categories.add('approval_automation');
        }
        if (process.name.toLowerCase().includes('notification')) {
          categories.add('notification_management');
        }
        if (process.name.toLowerCase().includes('document')) {
          categories.add('document_processing');
        }
      }
    }
    
    return Array.from(categories);
  }

  /**
   * Generate specific tools for a category
   */
  private async generateToolsForCategory(
    category: string,
    businessRequirement: BusinessRequirement,
    workflows: any[],
    forms: any[]
  ): Promise<AgentTool[]> {
    const prompt = `Generate AI agent tools for the "${category}" category in this business context:

Business Requirement: ${businessRequirement.originalDescription}
Industry: ${businessRequirement.extractedEntities?.businessContext?.industry || 'General'}
Processes: ${JSON.stringify(businessRequirement.extractedEntities?.processes, null, 2)}

For the "${category}" category, generate 2-3 specific tools that would help users:
1. Complete tasks faster
2. Reduce errors
3. Automate repetitive work
4. Get intelligent guidance

Each tool should be a TypeScript function with:
- Clear name and description
- Input parameters with types
- Return type specification
- Error handling
- Integration with business logic

Focus on practical, actionable tools that enhance productivity.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an expert at creating AI agent tools for business applications. Generate tools that are practical, secure, and enhance user productivity.` },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      const toolsCode = response.choices[0]?.message?.content || "";
      
      // Parse and structure the generated tools
      return this.parseGeneratedTools(toolsCode, category);
    } catch (error) {
      console.error(`Failed to generate tools for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Parse generated tools from AI response
   */
  private parseGeneratedTools(toolsCode: string, category: string): AgentTool[] {
    // Simple parsing - in production, you'd want more sophisticated parsing
    const tools: AgentTool[] = [];
    
    // Mock parsing for now - would need proper code parsing
    const toolMatches = toolsCode.match(/function\s+(\w+)/g) || [];
    
    toolMatches.forEach((match, index) => {
      const toolName = match.replace('function ', '');
      tools.push({
        name: toolName,
        description: `AI-generated tool for ${category}`,
        category,
        permissions: [`${category}:execute`],
        code: toolsCode,
        parameters: {}
      });
    });
    
    return tools;
  }

  /**
   * Generate integration code for the tools
   */
  private async generateIntegrationCode(
    tools: AgentTool[],
    businessRequirement: BusinessRequirement
  ): Promise<string> {
    const integrationPrompt = `Generate TypeScript integration code that connects these AI agent tools to the business application:

Tools: ${tools.map(t => `${t.name} (${t.category})`).join(', ')}
Business Context: ${businessRequirement.originalDescription}

Create:
1. AgentToolsRegistry class to manage all tools
2. Tool execution framework with error handling
3. Permission validation system
4. Integration with the existing chatbot system
5. Tool discovery and help system

The integration should be secure, performant, and easy to extend.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert TypeScript developer creating enterprise-grade integration code." },
          { role: "user", content: integrationPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Failed to generate integration code:", error);
      return "// Integration code generation failed";
    }
  }

  /**
   * Generate documentation for the tools
   */
  private generateToolsDocumentation(
    tools: AgentTool[],
    businessRequirement: BusinessRequirement
  ): string {
    let doc = `# AI Agent Tools Documentation\n\n`;
    doc += `Generated for: ${businessRequirement.originalDescription}\n\n`;
    doc += `## Available Tools\n\n`;
    
    const categories = [...new Set(tools.map(t => t.category))];
    
    for (const category of categories) {
      doc += `### ${category.replace(/_/g, ' ').toUpperCase()}\n\n`;
      const categoryTools = tools.filter(t => t.category === category);
      
      for (const tool of categoryTools) {
        doc += `#### ${tool.name}\n`;
        doc += `${tool.description}\n\n`;
        doc += `**Permissions Required:** ${tool.permissions.join(', ')}\n\n`;
      }
    }
    
    return doc;
  }

  /**
   * Generate enhanced capabilities for the chatbot
   */
  private generateEnhancedCapabilities(
    tools: AgentTool[],
    businessRequirement: BusinessRequirement
  ): any[] {
    const capabilities = [];
    
    for (const tool of tools) {
      capabilities.push({
        type: tool.name.toLowerCase(),
        description: tool.description,
        permissions: tool.permissions,
        category: tool.category,
        businessContext: businessRequirement.extractedEntities?.businessContext?.industry
      });
    }
    
    return capabilities;
  }
}
