import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement, GeneratedApplication } from "@shared/schema";
import { WebSocket } from "ws";
import { ReactComponentGenerator } from "../generators/reactComponentGenerator";
import { ApiEndpointGenerator } from "../generators/apiEndpointGenerator";
import { DatabaseSchemaGenerator } from "../generators/databaseSchemaGenerator";
import { WorkflowGenerationService } from "./workflowGenerationService";
import { WorkflowUIGenerator } from "../generators/workflowUIGenerator";
import { EmbeddedChatbotService } from "./embeddedChatbotService";
import { ApplicationDeployer } from "../deployment/applicationDeployer";
import { storage } from "../storage";
import { join } from "path";

export interface GenerationOptions {
  includeWorkflows?: boolean;
  includeForms?: boolean;
  includeIntegrations?: boolean;
  includeChatbots?: boolean;
  deploymentTarget?: "replit" | "local";
  generateDocumentation?: boolean;
}

export interface GenerationProgress {
  stage: "initializing" | "analyzing" | "generating_components" | "generating_api" | "generating_database" | "integrating" | "testing" | "deploying" | "completed" | "failed";
  progress: number;
  message: string;
  currentComponent?: string;
  estimatedTimeRemaining?: number;
  errors?: string[];
}

export interface GeneratedCode {
  components: { [filename: string]: string };
  apiEndpoints: { [filename: string]: string };
  databaseSchema: { [filename: string]: string };
  integrations: { [filename: string]: string };
  workflows: { [filename: string]: string };
  chatbots: { [filename: string]: string };
  documentation: { [filename: string]: string };
}

export interface GenerationResult {
  applicationId: string;
  success: boolean;
  deploymentUrl?: string;
  generatedCode: GeneratedCode;
  errors?: string[];
  metrics: {
    totalDuration: number;
    componentCount: number;
    apiEndpointCount: number;
    schemaTableCount: number;
  };
}

export class ApplicationGenerationService {
  private openai: OpenAI;
  private activeGenerations: Map<string, WebSocket[]> = new Map();
  private reactGenerator: ReactComponentGenerator;
  private apiGenerator: ApiEndpointGenerator;
  private schemaGenerator: DatabaseSchemaGenerator;
  private workflowGenerator: WorkflowGenerationService;
  private workflowUIGenerator: WorkflowUIGenerator;
  private chatbotService: EmbeddedChatbotService;
  private deployer: ApplicationDeployer;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null as any;
    }
    
    // Initialize concrete generators
    this.reactGenerator = new ReactComponentGenerator();
    this.apiGenerator = new ApiEndpointGenerator();
    this.schemaGenerator = new DatabaseSchemaGenerator();
    this.workflowGenerator = new WorkflowGenerationService();
    this.workflowUIGenerator = new WorkflowUIGenerator();
    this.chatbotService = new EmbeddedChatbotService();
    this.deployer = new ApplicationDeployer();
  }

  /**
   * Start complete application generation process
   */
  async generateApplication(
    businessRequirement: BusinessRequirement,
    generatedApp: GeneratedApplication,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const applicationId = generatedApp.id;
    
    try {
      // Initialize default options
      const finalOptions = {
        includeWorkflows: true,
        includeForms: true,
        includeIntegrations: true,
        includeChatbots: true,
        deploymentTarget: "replit" as const,
        generateDocumentation: true,
        ...options
      };

      this.updateProgress(applicationId, {
        stage: "initializing",
        progress: 0,
        message: "Starting application generation...",
        estimatedTimeRemaining: 900 // 15 minutes
      });

      // Phase 1: Analyze requirements and create generation plan
      const generationPlan = await this.analyzeRequirements(businessRequirement, finalOptions);
      
      this.updateProgress(applicationId, {
        stage: "analyzing",
        progress: 10,
        message: "Analyzing business requirements...",
        estimatedTimeRemaining: 800
      });

      // Phase 2: Generate React components using concrete generator
      this.updateProgress(applicationId, {
        stage: "generating_components",
        progress: 25,
        message: "Generating React components...",
        currentComponent: "Business Forms",
        estimatedTimeRemaining: 600
      });

      // Use consistent workspace directory
      // Sanitize workspace directory path to prevent path traversal
      const sanitizedAppId = applicationId.replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
      if (sanitizedAppId.length < 3 || sanitizedAppId.length > 50) {
        throw new Error("Invalid application ID for workspace creation");
      }
      const workspaceDir = join(process.cwd(), "temp", "generated", sanitizedAppId);

      const components = await this.reactGenerator.generateComponents(businessRequirement, {
        outputDir: join(workspaceDir, "src", "components"),
        includeTypes: true,
        includeTests: false
      });
      
      this.updateProgress(applicationId, {
        stage: "generating_components",
        progress: 35,
        message: "React components generated successfully",
        estimatedTimeRemaining: 550
      });

      // Phase 3: Generate API endpoints using concrete generator
      this.updateProgress(applicationId, {
        stage: "generating_api",
        progress: 40,
        message: "Generating API endpoints...",
        currentComponent: "Business Logic APIs",
        estimatedTimeRemaining: 450
      });

      const apiEndpoints = await this.apiGenerator.generateApiEndpoints(businessRequirement, {
        outputDir: join(workspaceDir, "server", "routes"),
        includeValidation: true,
        authRequired: true
      });
      
      this.updateProgress(applicationId, {
        stage: "generating_api",
        progress: 55,
        message: "API endpoints generated successfully",
        estimatedTimeRemaining: 400
      });

      // Phase 4: Generate database schema using concrete generator
      this.updateProgress(applicationId, {
        stage: "generating_database",
        progress: 60,
        message: "Generating database schema...",
        currentComponent: "Data Models",
        estimatedTimeRemaining: 300
      });

      const databaseSchema = await this.schemaGenerator.generateDatabaseSchema(businessRequirement, {
        outputDir: join(workspaceDir, "database"),
        includeSeeds: true,
        includeMigrations: false,
        databaseType: "postgresql"
      });
      
      this.updateProgress(applicationId, {
        stage: "generating_database",
        progress: 75,
        message: "Database schema generated successfully",
        estimatedTimeRemaining: 250
      });

      // Phase 5: Generate workflows if requested
      let workflows: { [filename: string]: string } = {};
      if (finalOptions.includeWorkflows) {
        this.updateProgress(applicationId, {
          stage: "generating_components",
          progress: 80,
          message: "Generating workflow patterns...",
          currentComponent: "Workflow System",
          estimatedTimeRemaining: 200
        });
        
        const workflowSystem = await this.workflowGenerator.generateWorkflowSystem(businessRequirement, {
          includeApprovals: true,
          includeNotifications: true,
          includeExternalIntegrations: finalOptions.includeIntegrations,
          generateUI: false, // Let WorkflowUIGenerator handle UI
          complexity: "advanced"
        });
        
        // Generate comprehensive workflow UI using WorkflowUIGenerator
        const workflowUIResult = await this.workflowUIGenerator.generateWorkflowUI(
          workflowSystem.workflows,
          businessRequirement,
          {
            outputDir: join(workspaceDir, "src", "components", "workflow"),
            includeProgressViews: true,
            includeTaskViews: true,
            includeApprovalViews: true,
            styleTheme: "light",
            componentLibrary: "shadcn"
          }
        );
        
        // Store workflow patterns and comprehensive UI components
        workflows["workflowPatterns.ts"] = JSON.stringify(workflowSystem.workflows, null, 2);
        workflows["workflowUIComponents.ts"] = Object.entries(workflowUIResult.components)
          .map(([name, code]) => `// ${name}\n${code}`).join("\n\n");
        workflows["workflowPages.tsx"] = Object.entries(workflowUIResult.pages)
          .map(([name, code]) => `// ${name}\n${code}`).join("\n\n");
        workflows["workflowHooks.ts"] = Object.entries(workflowUIResult.hooks)
          .map(([name, code]) => `// ${name}\n${code}`).join("\n\n");
        workflows["workflowUtils.ts"] = Object.entries(workflowUIResult.utils)
          .map(([name, code]) => `// ${name}\n${code}`).join("\n\n");
        workflows["workflowDocumentation.md"] = workflowSystem.documentation;
      }

      // Phase 6: Generate embedded chatbots if requested
      let chatbots: { [filename: string]: string } = {};
      if (finalOptions.includeChatbots) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 82,
          message: "Generating AI chatbot system...",
          currentComponent: "Embedded Chatbots",
          estimatedTimeRemaining: 180
        });

        try {
          // Create embedded chatbot for the generated application
          const chatbotCapabilities = [
            { type: 'form_help' as const, description: 'Form filling guidance', permissions: ['form:read', 'form:validate'] },
            { type: 'validation' as const, description: 'Input validation assistance', permissions: ['validate:input'] },
            { type: 'process_guidance' as const, description: 'Workflow and process guidance', permissions: ['workflow:read'] },
            { type: 'contextual_assistance' as const, description: 'Context-aware help', permissions: ['context:read'] }
          ];
          
          const chatbotResult = await this.chatbotService.createEmbeddedChatbot(
            applicationId,
            businessRequirement,
            chatbotCapabilities,
            {
              tone: "professional",
              style: "business",
              proactiveness: "medium",
              expertiseLevel: "intermediate"
            }
          );

          // Generate chatbot integration documentation
          chatbots["embeddedChatbot.md"] = `# Embedded AI Chatbot Integration

## Overview
This application includes an intelligent AI chatbot assistant that provides:
- General help and navigation assistance
- Form filling guidance and validation
- Workflow status updates and next steps
- Business domain-specific knowledge

## Chatbot Details
- **ID**: ${chatbotResult.id}
- **Name**: ${chatbotResult.name}
- **Capabilities**: ${chatbotResult.capabilities?.join(", ") || "general_help, form_help, navigation_help, workflow_help"}
- **AI Model**: ${chatbotResult.aiModel}

## Integration
The chatbot is automatically embedded in your application and can be accessed:
- Via the floating chat button in the bottom-right corner
- Through the React component: \`<EmbeddedChatbot generatedApplicationId="${applicationId}" />\`
- Via WebSocket for real-time communication
- Through REST API fallback at \`/api/chatbot/interact\`

## Customization
You can customize the chatbot's behavior by updating its personality profile and knowledge base through the chatbot management interface.
`;

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 83,
            message: "AI chatbot system generated successfully",
            estimatedTimeRemaining: 170
          });

        } catch (error) {
          console.error("Failed to generate chatbot:", error);
          this.updateProgress(applicationId, {
            stage: "integrating", 
            progress: 83,
            message: "Chatbot generation failed, continuing without chatbot",
            errors: [error instanceof Error ? error.message : "Unknown chatbot error"],
            estimatedTimeRemaining: 170
          });
        }
      }
      
      // Phase 7: Generate integrations if requested
      let integrations: { [filename: string]: string } = {};
      if (finalOptions.includeIntegrations) {
        integrations = await this.generateIntegrations(businessRequirement, generationPlan);
      }

      this.updateProgress(applicationId, {
        stage: "integrating",
        progress: 85,
        message: "Integrating components, workflows, and chatbots...",
        estimatedTimeRemaining: 150
      });

      // Phase 8: Generate documentation
      let documentation: { [filename: string]: string } = {};
      if (finalOptions.generateDocumentation) {
        documentation = await this.generateDocumentation(businessRequirement, {
          components,
          apiEndpoints,
          databaseSchema,
          integrations,
          workflows,
          chatbots,
          documentation: {}
        });
      }

      this.updateProgress(applicationId, {
        stage: "testing",
        progress: 90,
        message: "Validating generated code...",
        estimatedTimeRemaining: 90
      });

      // Phase 9: Validate generated code
      await this.validateGeneratedCode({
        components,
        apiEndpoints,
        databaseSchema,
        integrations,
        workflows,
        chatbots,
        documentation
      });

      this.updateProgress(applicationId, {
        stage: "deploying",
        progress: 95,
        message: "Deploying application...",
        estimatedTimeRemaining: 60
      });

      // Phase 8: Deploy application using deployment pipeline with pre-generated code
      const deploymentResult = await this.deployer.deployApplication(
        businessRequirement,
        generatedApp,
        {
          targetEnvironment: finalOptions.deploymentTarget === "replit" ? "development" : "development",
          enableSSL: true,
          autoScale: false
        },
        {
          components,
          apiEndpoints,
          databaseSchema
        }
      );

      // Update storage with deployment status
      if (deploymentResult.success && deploymentResult.deploymentUrl) {
        await storage.updateGeneratedApplication(applicationId, {
          status: "completed",
          completionPercentage: 100
        });
      }

      this.updateProgress(applicationId, {
        stage: "completed",
        progress: 100,
        message: deploymentResult.success 
          ? `Application deployed successfully to ${deploymentResult.deploymentUrl}!`
          : "Application generation completed with deployment warnings",
        estimatedTimeRemaining: 0
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        applicationId,
        success: deploymentResult.success,
        deploymentUrl: deploymentResult.deploymentUrl || this.generateDeploymentUrl(applicationId),
        generatedCode: {
          components,
          apiEndpoints,
          databaseSchema,
          integrations,
          workflows,
          chatbots,
          documentation
        },
        metrics: {
          totalDuration: duration,
          componentCount: deploymentResult.metrics?.componentCount || Object.keys(components).length,
          apiEndpointCount: deploymentResult.metrics?.apiEndpointCount || Object.keys(apiEndpoints).length,
          schemaTableCount: deploymentResult.metrics?.schemaTableCount || Object.keys(databaseSchema).length
        }
      };

    } catch (error) {
      console.error("Application generation failed:", error);
      
      this.updateProgress(applicationId, {
        stage: "failed",
        progress: 0,
        message: "Application generation failed",
        errors: [error instanceof Error ? error.message : "Unknown error"]
      });

      return {
        applicationId,
        success: false,
        generatedCode: {
          components: {},
          apiEndpoints: {},
          databaseSchema: {},
          integrations: {},
          workflows: {},
          chatbots: {},
          documentation: {}
        },
        errors: [error instanceof Error ? error.message : "Unknown error"],
        metrics: {
          totalDuration: Date.now() - startTime,
          componentCount: 0,
          apiEndpointCount: 0,
          schemaTableCount: 0
        }
      };
    }
  }

  /**
   * Analyze business requirements and create generation plan
   */
  private async analyzeRequirements(
    businessRequirement: BusinessRequirement,
    options: GenerationOptions
  ): Promise<any> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for requirement analysis");
    }

    const analysisPrompt = `Analyze this business requirement and create a detailed generation plan:

Original Description: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}
Workflow Patterns: ${businessRequirement.workflowPatterns?.join(", ") || "None"}
Confidence: ${businessRequirement.confidence}

Create a comprehensive plan for generating:
1. React components needed for the application
2. API endpoints for business logic
3. Database tables and relationships
4. External integrations required
5. AI chatbot capabilities

Focus on enterprise-grade patterns with TypeScript, proper error handling, and scalability.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.getAnalysisSystemPrompt() },
          { role: "user", content: analysisPrompt }
        ],
        functions: [this.getAnalysisFunctionSchema()],
        function_call: { name: "create_generation_plan" },
        temperature: 0.3,
        max_tokens: 2000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error("No generation plan created");
      }

      return JSON.parse(functionCall.arguments);
    } catch (error) {
      throw new Error(`Failed to analyze requirements: ${error}`);
    }
  }

  /**
   * Legacy method - now handled by concrete ReactComponentGenerator
   * Kept for backward compatibility
   */
  private async generateComponents(
    businessRequirement: BusinessRequirement,
    generationPlan: any
  ): Promise<{ [filename: string]: string }> {
    // This is now handled by the concrete generator in the main flow
    // This method is kept for backward compatibility but should not be called
    throw new Error("This method has been replaced by concrete ReactComponentGenerator");
  }

  /**
   * Generate individual React component
   */
  private async generateComponent(
    componentName: string,
    description: string,
    businessRequirement: BusinessRequirement,
    generationPlan: any
  ): Promise<string> {
    const componentPrompt = `Generate a React TypeScript component for an enterprise business application:

Component Name: ${componentName}
Description: ${description}
Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Use TypeScript with strict typing
- Follow enterprise patterns and best practices
- Use Shadcn UI components (@/components/ui/*)
- Include proper error handling and loading states
- Add data-testid attributes for testing
- Include accessibility features
- Use React Query for data fetching if needed
- Follow the existing component patterns in the codebase

Generate clean, production-ready code with proper imports and exports.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.getComponentGenerationSystemPrompt() },
          { role: "user", content: componentPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      throw new Error(`Failed to generate component ${componentName}: ${error}`);
    }
  }

  /**
   * Legacy method - now handled by concrete ApiEndpointGenerator
   * Kept for backward compatibility
   */
  private async generateApiEndpoints(
    businessRequirement: BusinessRequirement,
    generationPlan: any
  ): Promise<{ [filename: string]: string }> {
    // This is now handled by the concrete generator in the main flow
    // This method is kept for backward compatibility but should not be called
    throw new Error("This method has been replaced by concrete ApiEndpointGenerator");
  }

  /**
   * Legacy method - now handled by concrete DatabaseSchemaGenerator
   * Kept for backward compatibility
   */
  private async generateDatabaseSchema(
    businessRequirement: BusinessRequirement,
    generationPlan: any
  ): Promise<{ [filename: string]: string }> {
    // This is now handled by the concrete generator in the main flow
    // This method is kept for backward compatibility but should not be called
    throw new Error("This method has been replaced by concrete DatabaseSchemaGenerator");
  }

  /**
   * Generate integration code
   */
  private async generateIntegrations(
    businessRequirement: BusinessRequirement,
    generationPlan: any
  ): Promise<{ [filename: string]: string }> {
    const integrations: { [filename: string]: string } = {};

    if (businessRequirement.extractedEntities?.integrations) {
      for (const integration of businessRequirement.extractedEntities.integrations) {
        const integrationName = typeof integration === 'string' ? integration : integration.name;
        const integrationCode = await this.generateIntegration(
          integrationName,
          businessRequirement,
          generationPlan
        );
        integrations[`${this.capitalizeAndClean(integrationName)}Integration.ts`] = integrationCode;
      }
    }

    return integrations;
  }

  /**
   * Generate individual integration
   */
  private async generateIntegration(
    integrationType: string,
    businessRequirement: BusinessRequirement,
    generationPlan: any
  ): Promise<string> {
    const integrationPrompt = `Generate integration code for: ${integrationType}

Business Context: ${businessRequirement.originalDescription}
Integration Type: ${integrationType}

Generate TypeScript code for this integration with:
- Proper error handling
- Configuration management
- Type safety
- Rate limiting considerations
- Authentication handling
- Comprehensive logging`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert integration developer. Generate production-ready integration code." },
          { role: "user", content: integrationPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      throw new Error(`Failed to generate integration ${integrationType}: ${error}`);
    }
  }

  /**
   * Generate comprehensive documentation
   */
  private async generateDocumentation(
    businessRequirement: BusinessRequirement,
    generatedCode: GeneratedCode
  ): Promise<{ [filename: string]: string }> {
    if (!isAIServiceAvailable() || !this.openai) {
      return {};
    }

    const documentation: { [filename: string]: string } = {};

    const docPrompt = `Generate comprehensive documentation for this generated business application:

Original Business Requirement: ${businessRequirement.originalDescription}
Generated Components: ${Object.keys(generatedCode.components).join(", ")}
Generated APIs: ${Object.keys(generatedCode.apiEndpoints).join(", ")}
Database Schema: ${Object.keys(generatedCode.databaseSchema).join(", ")}

Generate:
1. User Guide - How to use the application
2. Technical Documentation - Architecture and code structure
3. API Documentation - Endpoint specifications
4. Deployment Guide - How to deploy and configure
5. Troubleshooting Guide - Common issues and solutions`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a technical documentation expert. Generate clear, comprehensive documentation." },
          { role: "user", content: docPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });

      const docContent = response.choices[0]?.message?.content || "";
      documentation["README.md"] = docContent;

      return documentation;
    } catch (error) {
      console.error("Failed to generate documentation:", error);
      return {};
    }
  }

  /**
   * Validate generated code for quality and completeness
   */
  private async validateGeneratedCode(generatedCode: GeneratedCode): Promise<void> {
    // Basic validation checks
    if (Object.keys(generatedCode.components).length === 0) {
      throw new Error("No components were generated");
    }

    if (Object.keys(generatedCode.apiEndpoints).length === 0) {
      throw new Error("No API endpoints were generated");
    }

    // TypeScript syntax validation (basic check)
    for (const [filename, code] of Object.entries(generatedCode.components)) {
      if (!code.includes("export") || !code.includes("function") && !code.includes("const")) {
        throw new Error(`Invalid component code generated for ${filename}`);
      }
    }

    // Additional validation can be added here
  }

  /**
   * Generate deployment URL for the application
   */
  private generateDeploymentUrl(applicationId: string): string {
    // In a real implementation, this would interact with Replit's deployment API
    const subdomain = applicationId.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://${subdomain}.replit.app`;
  }

  /**
   * Update progress for WebSocket clients
   */
  private updateProgress(applicationId: string, progress: GenerationProgress): void {
    const clients = this.activeGenerations.get(applicationId) || [];
    const message = JSON.stringify({
      type: "generation_progress",
      applicationId,
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
  registerProgressClient(applicationId: string, ws: WebSocket): void {
    const clients = this.activeGenerations.get(applicationId) || [];
    clients.push(ws);
    this.activeGenerations.set(applicationId, clients);

    ws.on('close', () => {
      const updatedClients = this.activeGenerations.get(applicationId)?.filter(client => client !== ws) || [];
      this.activeGenerations.set(applicationId, updatedClients);
    });
  }

  /**
   * Utility functions
   */
  private capitalizeAndClean(str: string): string {
    return str
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private getAnalysisSystemPrompt(): string {
    return `You are an expert business application architect. Analyze business requirements and create detailed generation plans for enterprise applications with React, TypeScript, Express.js, and Drizzle ORM.`;
  }

  private getComponentGenerationSystemPrompt(): string {
    return `You are an expert React/TypeScript developer. Generate enterprise-grade React components using Shadcn UI, with proper error handling, accessibility, and TypeScript types.`;
  }

  private getApiGenerationSystemPrompt(): string {
    return `You are an expert backend developer. Generate RESTful Express.js APIs with proper middleware, validation, error handling, and TypeScript types.`;
  }

  private getSchemaGenerationSystemPrompt(): string {
    return `You are an expert database architect. Generate Drizzle ORM schemas with proper relationships, constraints, and TypeScript types for business applications.`;
  }

  private getAnalysisFunctionSchema() {
    return {
      name: "create_generation_plan",
      description: "Create a detailed plan for generating the business application",
      parameters: {
        type: "object",
        properties: {
          components: {
            type: "array",
            items: { type: "string" },
            description: "List of React components to generate"
          },
          apiEndpoints: {
            type: "array",
            items: { type: "string" },
            description: "List of API endpoints to generate"
          },
          databaseTables: {
            type: "array",
            items: { type: "string" },
            description: "List of database tables to generate"
          },
          integrations: {
            type: "array",
            items: { type: "string" },
            description: "List of external integrations needed"
          },
          estimatedComplexity: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Estimated complexity of the application"
          }
        },
        required: ["components", "apiEndpoints", "databaseTables"]
      }
    };
  }
}