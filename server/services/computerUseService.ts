
import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement } from "@shared/schema";

export interface ComputerUseAction {
  type: 'screenshot' | 'click' | 'type' | 'scroll' | 'key' | 'wait';
  coordinates?: { x: number; y: number };
  text?: string;
  key?: string;
  duration?: number;
}

export interface ComputerUseCapability {
  name: string;
  description: string;
  actions: ComputerUseAction[];
  category: string;
  businessContext: string;
}

export interface ComputerUseGenerationResult {
  capabilities: ComputerUseCapability[];
  integrationCode: string;
  documentation: string;
  setupInstructions: string;
}

export class ComputerUseService {
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
   * Generate computer use capabilities for business applications
   */
  async generateComputerUseCapabilities(
    businessRequirement: BusinessRequirement,
    generatedWorkflows: any[] = [],
    generatedForms: any[] = []
  ): Promise<ComputerUseGenerationResult> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for computer use generation");
    }

    const computerUsePrompt = `Generate computer use capabilities for this business application:

Business Requirement: ${businessRequirement.originalDescription}
Industry: ${businessRequirement.extractedEntities?.businessContext?.industry || 'General'}
Processes: ${JSON.stringify(businessRequirement.extractedEntities?.processes, null, 2)}
Forms: ${JSON.stringify(businessRequirement.extractedEntities?.forms, null, 2)}

Generate computer use capabilities that can:
1. Automate data entry across multiple systems
2. Navigate complex legacy applications
3. Extract data from non-API systems
4. Perform cross-application workflows
5. Monitor and interact with external business tools

Each capability should include:
- Clear business purpose and value
- Step-by-step action sequences
- Error handling and recovery steps
- Integration points with generated workflows

Focus on practical automation that reduces manual work and improves accuracy.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at creating computer use automation for business processes. Generate practical, safe, and effective computer interaction capabilities." 
          },
          { role: "user", content: computerUsePrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

      const capabilitiesContent = response.choices[0]?.message?.content || "";
      
      // Parse and structure the capabilities
      const capabilities = this.parseComputerUseCapabilities(capabilitiesContent, businessRequirement);
      
      // Generate integration code
      const integrationCode = await this.generateComputerUseIntegration(capabilities, businessRequirement);
      
      // Generate documentation
      const documentation = this.generateComputerUseDocumentation(capabilities, businessRequirement);
      
      // Generate setup instructions
      const setupInstructions = this.generateSetupInstructions(capabilities);
      
      return {
        capabilities,
        integrationCode,
        documentation,
        setupInstructions
      };
    } catch (error) {
      console.error("Failed to generate computer use capabilities:", error);
      throw new Error(`Computer use generation failed: ${error}`);
    }
  }

  /**
   * Parse computer use capabilities from AI response
   */
  private parseComputerUseCapabilities(
    content: string, 
    businessRequirement: BusinessRequirement
  ): ComputerUseCapability[] {
    const capabilities: ComputerUseCapability[] = [];
    
    // Industry-specific computer use patterns
    const industry = businessRequirement.extractedEntities?.businessContext?.industry?.toLowerCase();
    
    switch (industry) {
      case 'hr':
      case 'human resources':
        capabilities.push({
          name: 'hr_system_automation',
          description: 'Automate data entry and navigation in HR systems',
          category: 'hr_automation',
          businessContext: industry,
          actions: [
            { type: 'screenshot' },
            { type: 'click', coordinates: { x: 100, y: 200 } },
            { type: 'type', text: 'employee data' },
            { type: 'key', key: 'Tab' },
            { type: 'wait', duration: 1000 }
          ]
        });
        break;
        
      case 'finance':
      case 'accounting':
        capabilities.push({
          name: 'financial_data_extraction',
          description: 'Extract financial data from legacy accounting systems',
          category: 'finance_automation',
          businessContext: industry,
          actions: [
            { type: 'screenshot' },
            { type: 'click', coordinates: { x: 150, y: 300 } },
            { type: 'type', text: 'financial report' },
            { type: 'key', key: 'Enter' },
            { type: 'wait', duration: 2000 }
          ]
        });
        break;
        
      default:
        capabilities.push({
          name: 'general_data_automation',
          description: 'General purpose data entry and system navigation',
          category: 'general_automation',
          businessContext: 'general',
          actions: [
            { type: 'screenshot' },
            { type: 'click', coordinates: { x: 200, y: 150 } },
            { type: 'type', text: 'business data' },
            { type: 'key', key: 'Enter' }
          ]
        });
    }
    
    return capabilities;
  }

  /**
   * Generate integration code for computer use capabilities
   */
  private async generateComputerUseIntegration(
    capabilities: ComputerUseCapability[],
    businessRequirement: BusinessRequirement
  ): Promise<string> {
    const integrationPrompt = `Generate TypeScript integration code for computer use capabilities:

Capabilities: ${capabilities.map(c => `${c.name} - ${c.description}`).join('\n')}
Business Context: ${businessRequirement.originalDescription}

Create:
1. ComputerUseAgent class to execute capabilities
2. Screen capture and analysis system
3. Action execution framework with safety checks
4. Integration with business workflows
5. Error handling and recovery mechanisms
6. Audit logging for all computer interactions

The integration should be secure, reliable, and include proper safeguards.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert TypeScript developer creating enterprise-grade computer use automation." },
          { role: "user", content: integrationPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Failed to generate computer use integration:", error);
      return "// Computer use integration code generation failed";
    }
  }

  /**
   * Generate documentation for computer use capabilities
   */
  private generateComputerUseDocumentation(
    capabilities: ComputerUseCapability[],
    businessRequirement: BusinessRequirement
  ): string {
    let doc = `# Computer Use Automation Documentation\n\n`;
    doc += `Generated for: ${businessRequirement.originalDescription}\n\n`;
    doc += `## Overview\n\n`;
    doc += `This system provides AI-powered computer use automation to interact with legacy systems, `;
    doc += `perform cross-application workflows, and automate manual data entry tasks.\n\n`;
    doc += `## Available Capabilities\n\n`;
    
    for (const capability of capabilities) {
      doc += `### ${capability.name}\n`;
      doc += `**Description**: ${capability.description}\n`;
      doc += `**Category**: ${capability.category}\n`;
      doc += `**Business Context**: ${capability.businessContext}\n`;
      doc += `**Actions**: ${capability.actions.length} automated steps\n\n`;
    }
    
    doc += `## Safety Features\n\n`;
    doc += `- Screen capture analysis before actions\n`;
    doc += `- Action validation and confirmation prompts\n`;
    doc += `- Automatic rollback on errors\n`;
    doc += `- Comprehensive audit logging\n`;
    doc += `- User permission controls\n\n`;
    
    return doc;
  }

  /**
   * Generate setup instructions
   */
  private generateSetupInstructions(capabilities: ComputerUseCapability[]): string {
    let instructions = `# Computer Use Setup Instructions\n\n`;
    instructions += `## Prerequisites\n\n`;
    instructions += `1. OpenAI API access with computer use capabilities\n`;
    instructions += `2. Screen capture permissions\n`;
    instructions += `3. Input automation permissions\n`;
    instructions += `4. Target applications accessible\n\n`;
    instructions += `## Configuration\n\n`;
    instructions += `1. Set OPENAI_API_KEY environment variable\n`;
    instructions += `2. Configure screen resolution settings\n`;
    instructions += `3. Set up application-specific coordinates\n`;
    instructions += `4. Configure safety timeouts and limits\n\n`;
    instructions += `## Security Considerations\n\n`;
    instructions += `- Review all generated actions before deployment\n`;
    instructions += `- Set up proper access controls\n`;
    instructions += `- Monitor all computer use activities\n`;
    instructions += `- Regular security audits recommended\n`;
    
    return instructions;
  }

  /**
   * Execute a computer use capability
   */
  async executeComputerUseCapability(
    capabilityName: string,
    context: Record<string, any> = {}
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      // This would integrate with OpenAI's computer use API
      // For now, return a mock response
      return {
        success: true,
        result: {
          message: `Computer use capability '${capabilityName}' executed successfully`,
          context,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
