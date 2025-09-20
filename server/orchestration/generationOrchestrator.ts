import { EventEmitter } from "events";
import { WebSocket } from "ws";
import { BusinessRequirement, GeneratedApplication } from "@shared/schema";
import { ReactComponentGenerator } from "../generators/reactComponentGenerator";
import { APIEndpointGenerator } from "../generators/apiEndpointGenerator";
import { DatabaseSchemaGenerator } from "../generators/databaseSchemaGenerator";
import { WorkflowGenerationService } from "../services/workflowGenerationService";
import { WorkflowUIGenerator } from "../generators/workflowUIGenerator";
import { EmbeddedChatbotService } from "../services/embeddedChatbotService";
import { ComputerUseService } from "../services/computerUseService";
import { ImageVideoGenerationService } from "../services/imageVideoGenerationService";
import { ApplicationDeployer } from "../deployment/applicationDeployer";
import { GeneratedCodeValidator } from "../validation/generatedCodeValidator";
import { AutoDocGenerator } from "../documentation/autoDocGenerator";
import { storage } from "../storage";
import { join } from "path";
import { mkdir } from "fs/promises";

export enum GenerationStage {
  INITIALIZING = "initializing",
  ANALYZING = "analyzing",
  GENERATING_COMPONENTS = "generating_components",
  GENERATING_API = "generating_api",
  GENERATING_DATABASE = "generating_database",
  INTEGRATING = "integrating",
  TESTING = "testing",
  DEPLOYING = "deploying",
  DOCUMENTING = "documenting",
  COMPLETED = "completed",
  FAILED = "failed"
}

export interface GenerationProgress {
  stage: GenerationStage;
  progress: number;
  message: string;
  currentComponent?: string;
  estimatedTimeRemaining?: number;
  errors?: string[];
  details?: {
    totalSteps: number;
    currentStep: number;
    stepDescription?: string;
  };
}

export interface GenerationPlan {
  components: ComponentPlan[];
  apiEndpoints: ApiEndpointPlan[];
  databaseSchemas: DatabaseSchemaPlan[];
  workflows: WorkflowPlan[];
  integrations: IntegrationPlan[];
  chatbots: ChatbotPlan[];
  documentation: DocumentationPlan;
  deployment: DeploymentPlan;
  estimatedDuration: number;
  priorityOrder: string[];
}

interface ComponentPlan {
  name: string;
  type: "form" | "dashboard" | "workflow" | "list" | "detail" | "layout";
  dependencies: string[];
  complexity: "low" | "medium" | "high";
  estimatedTime: number;
}

interface ApiEndpointPlan {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  purpose: string;
  authentication: boolean;
  validation: boolean;
  complexity: "low" | "medium" | "high";
}

interface DatabaseSchemaPlan {
  tableName: string;
  relationships: string[];
  fields: { name: string; type: string; constraints: string[] }[];
  indexes: string[];
  complexity: "low" | "medium" | "high";
}

interface WorkflowPlan {
  name: string;
  steps: string[];
  approvals: boolean;
  notifications: boolean;
  integrations: string[];
  complexity: "low" | "medium" | "high";
}

interface IntegrationPlan {
  name: string;
  type: "api" | "webhook" | "database" | "file" | "email" | "sms";
  authentication: "oauth" | "apikey" | "basic" | "none";
  dataFlow: "inbound" | "outbound" | "bidirectional";
  priority: "critical" | "high" | "medium" | "low";
}

interface ChatbotPlan {
  name: string;
  capabilities: string[];
  integrationPoints: string[];
  aiModel: string;
  contextAware: boolean;
}

interface DocumentationPlan {
  userGuide: boolean;
  apiDocumentation: boolean;
  developerGuide: boolean;
  deploymentGuide: boolean;
  format: "markdown" | "html" | "pdf";
}

interface DeploymentPlan {
  environment: "development" | "staging" | "production";
  url: string;
  autoScaling: boolean;
  monitoring: boolean;
  backup: boolean;
}

export interface OrchestrationOptions {
  parallel: boolean;
  maxConcurrency: number;
  retryOnFailure: boolean;
  maxRetries: number;
  generateTests: boolean;
  generateDocumentation: boolean;
  validateOutput: boolean;
  deploymentTarget: "replit" | "docker" | "kubernetes";
  notificationWebhook?: string;
}

export interface OrchestrationResult {
  success: boolean;
  applicationId: string;
  deploymentUrl?: string;
  generatedCode: {
    components: { [filename: string]: string };
    apiEndpoints: { [filename: string]: string };
    databaseSchema: { [filename: string]: string };
    integrations: { [filename: string]: string };
    workflows: { [filename: string]: string };
    chatbots: { [filename: string]: string };
    documentation: { [filename: string]: string };
    tests?: { [filename: string]: string };
  };
  metrics: {
    totalDuration: number;
    stageDurations: { [stage: string]: number };
    componentCount: number;
    apiEndpointCount: number;
    schemaTableCount: number;
    codeLineCount: number;
    testCoverage?: number;
  };
  validationReport?: {
    passed: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
  errors?: string[];
}

/**
 * Orchestrates the complete application generation process
 * Coordinates all generation services and manages the workflow
 */
export class GenerationOrchestrator extends EventEmitter {
  private reactGenerator: ReactComponentGenerator;
  private apiGenerator: APIEndpointGenerator;
  private schemaGenerator: DatabaseSchemaGenerator;
  private workflowService: WorkflowGenerationService;
  private workflowUIGenerator: WorkflowUIGenerator;
  private chatbotService: EmbeddedChatbotService;
  private computerUseService: ComputerUseService;
  private imageVideoService: ImageVideoGenerationService;
  private deployer: ApplicationDeployer;
  private validator: GeneratedCodeValidator;
  private docGenerator: AutoDocGenerator;
  private activeWebSockets: Map<string, WebSocket[]> = new Map();
  private stageTiming: Map<string, { start: number; end?: number }> = new Map();

  constructor() {
    super();
    this.initializeGenerators();
  }

  private initializeGenerators(): void {
    this.reactGenerator = new ReactComponentGenerator();
    this.apiGenerator = new APIEndpointGenerator();
    this.schemaGenerator = new DatabaseSchemaGenerator();
    this.workflowService = new WorkflowGenerationService();
    this.workflowUIGenerator = new WorkflowUIGenerator();
    this.chatbotService = new EmbeddedChatbotService();
    this.computerUseService = new ComputerUseService();
    this.imageVideoService = new ImageVideoGenerationService();
    this.deployer = new ApplicationDeployer();
    this.validator = new GeneratedCodeValidator();
    this.docGenerator = new AutoDocGenerator();
  }

  /**
   * Register WebSocket for real-time progress updates
   */
  registerWebSocket(applicationId: string, ws: WebSocket): void {
    if (!this.activeWebSockets.has(applicationId)) {
      this.activeWebSockets.set(applicationId, []);
    }
    this.activeWebSockets.get(applicationId)?.push(ws);
    
    ws.on("close", () => {
      const sockets = this.activeWebSockets.get(applicationId);
      if (sockets) {
        const index = sockets.indexOf(ws);
        if (index > -1) {
          sockets.splice(index, 1);
        }
      }
    });
  }

  /**
   * Main orchestration method - coordinates the entire generation process
   */
  async orchestrateGeneration(
    businessRequirement: BusinessRequirement,
    generatedApp: GeneratedApplication,
    options: Partial<OrchestrationOptions> = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const applicationId = generatedApp.id;
    
    // Default options with enterprise settings
    const orchestrationOptions: OrchestrationOptions = {
      parallel: true,
      maxConcurrency: 3,
      retryOnFailure: true,
      maxRetries: 2,
      generateTests: false, // Can be enabled based on requirements
      generateDocumentation: true,
      validateOutput: true,
      deploymentTarget: "replit",
      ...options
    };

    try {
      // Phase 1: Initialize and analyze
      this.trackStageStart(GenerationStage.INITIALIZING);
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.INITIALIZING,
        progress: 0,
        message: "🚀 Starting enterprise application generation orchestration...",
        estimatedTimeRemaining: 900, // 15 minutes
        details: {
          totalSteps: 12,
          currentStep: 1,
          stepDescription: "Initializing generation environment"
        }
      });

      // Create generation plan
      const generationPlan = await this.createGenerationPlan(businessRequirement);
      
      this.trackStageEnd(GenerationStage.INITIALIZING);
      this.trackStageStart(GenerationStage.ANALYZING);
      
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.ANALYZING,
        progress: 8,
        message: "📊 Analyzing business requirements and creating generation strategy...",
        estimatedTimeRemaining: 850,
        details: {
          totalSteps: 12,
          currentStep: 2,
          stepDescription: `Identified ${generationPlan.components.length} components, ${generationPlan.apiEndpoints.length} API endpoints`
        }
      });

      // Create workspace directory
      const workspaceDir = await this.createWorkspace(applicationId);
      
      this.trackStageEnd(GenerationStage.ANALYZING);

      // Phase 2: Generate components in parallel or sequence based on options
      const generatedCode = await this.executeGenerationPlan(
        businessRequirement,
        generatedApp,
        generationPlan,
        workspaceDir,
        orchestrationOptions,
        applicationId
      );

      // Phase 3: Integration
      this.trackStageStart(GenerationStage.INTEGRATING);
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.INTEGRATING,
        progress: 75,
        message: "🔗 Integrating components and services...",
        estimatedTimeRemaining: 200,
        details: {
          totalSteps: 12,
          currentStep: 9,
          stepDescription: "Connecting workflows, chatbots, and integrations"
        }
      });

      // Integrate all components
      await this.integrateComponents(generatedCode, workspaceDir);
      
      this.trackStageEnd(GenerationStage.INTEGRATING);

      // Phase 4: Testing and validation
      let validationReport;
      if (orchestrationOptions.validateOutput) {
        this.trackStageStart(GenerationStage.TESTING);
        this.broadcastProgress(applicationId, {
          stage: GenerationStage.TESTING,
          progress: 80,
          message: "✅ Validating generated code and checking enterprise patterns...",
          estimatedTimeRemaining: 150,
          details: {
            totalSteps: 12,
            currentStep: 10,
            stepDescription: "Running code validation and pattern checks"
          }
        });

        validationReport = await this.validator.validateGeneratedCode(generatedCode, {
          checkTypes: true,
          checkSecurity: true,
          checkPerformance: true,
          checkAccessibility: true
        });

        this.trackStageEnd(GenerationStage.TESTING);
      }

      // Phase 5: Documentation generation
      if (orchestrationOptions.generateDocumentation) {
        this.trackStageStart(GenerationStage.DOCUMENTING);
        this.broadcastProgress(applicationId, {
          stage: GenerationStage.DOCUMENTING,
          progress: 85,
          message: "📚 Generating comprehensive documentation...",
          estimatedTimeRemaining: 100,
          details: {
            totalSteps: 12,
            currentStep: 11,
            stepDescription: "Creating user guides and API documentation"
          }
        });

        const documentation = await this.docGenerator.generateDocumentation(
          businessRequirement,
          generatedCode,
          generationPlan
        );
        
        generatedCode.documentation = documentation;
        this.trackStageEnd(GenerationStage.DOCUMENTING);
      }

      // Phase 6: Deployment
      this.trackStageStart(GenerationStage.DEPLOYING);
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.DEPLOYING,
        progress: 90,
        message: "🚀 Deploying application to target environment...",
        estimatedTimeRemaining: 60,
        details: {
          totalSteps: 12,
          currentStep: 12,
          stepDescription: "Deploying to Replit with unique URL"
        }
      });

      const deploymentResult = await this.deployer.deployApplication(
        businessRequirement,
        generatedApp,
        {
          targetEnvironment: "development",
          enableSSL: true,
          autoScale: false
        },
        generatedCode
      );

      this.trackStageEnd(GenerationStage.DEPLOYING);

      // Update application status
      await storage.updateGeneratedApplication(applicationId, {
        status: "deployed",
        completionPercentage: 100
      });

      // Phase 7: Complete
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.COMPLETED,
        progress: 100,
        message: `✨ Application successfully generated and deployed!`,
        estimatedTimeRemaining: 0,
        details: {
          totalSteps: 12,
          currentStep: 12,
          stepDescription: `Deployed to ${deploymentResult.deploymentUrl}`
        }
      });

      const endTime = Date.now();
      const metrics = this.calculateMetrics(generatedCode, startTime, endTime);

      return {
        success: true,
        applicationId,
        deploymentUrl: deploymentResult.deploymentUrl,
        generatedCode,
        metrics,
        validationReport,
        errors: []
      };

    } catch (error) {
      this.trackStageStart(GenerationStage.FAILED);
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.FAILED,
        progress: 0,
        message: "❌ Generation failed",
        errors: [error instanceof Error ? error.message : "Unknown error"]
      });

      await storage.updateGeneratedApplication(applicationId, {
        status: "failed",
        completionPercentage: 0
      });

      return {
        success: false,
        applicationId,
        generatedCode: this.getEmptyGeneratedCode(),
        metrics: this.getEmptyMetrics(),
        errors: [error instanceof Error ? error.message : "Unknown error"]
      };
    }
  }

  /**
   * Create a comprehensive generation plan based on business requirements
   */
  private async createGenerationPlan(businessRequirement: BusinessRequirement): Promise<GenerationPlan> {
    const entities = businessRequirement.extractedEntities || {};
    const plan: GenerationPlan = {
      components: [],
      apiEndpoints: [],
      databaseSchemas: [],
      workflows: [],
      integrations: [],
      chatbots: [],
      documentation: {
        userGuide: true,
        apiDocumentation: true,
        developerGuide: true,
        deploymentGuide: true,
        format: "markdown"
      },
      deployment: {
        environment: "development",
        url: "",
        autoScaling: false,
        monitoring: true,
        backup: true
      },
      estimatedDuration: 900,
      priorityOrder: []
    };

    // Plan components from forms and processes
    if (Array.isArray(entities.forms)) {
      entities.forms.forEach((form: string) => {
        plan.components.push({
          name: form,
          type: "form",
          dependencies: [],
          complexity: "medium",
          estimatedTime: 30
        });
      });
    } else if (entities.forms && Array.isArray(entities.forms.forms_legacy)) {
      // Handle legacy format
      entities.forms.forms_legacy.forEach((form: string) => {
        plan.components.push({
          name: form,
          type: "form",
          dependencies: [],
          complexity: "medium",
          estimatedTime: 30
        });
      });
    }

    // Add dashboard and layout components
    plan.components.push(
      {
        name: "Dashboard",
        type: "dashboard",
        dependencies: [],
        complexity: "high",
        estimatedTime: 45
      },
      {
        name: "Layout",
        type: "layout",
        dependencies: [],
        complexity: "low",
        estimatedTime: 20
      }
    );

    // Plan API endpoints
    plan.components.forEach(component => {
      if (component.type === "form") {
        // CRUD endpoints for each form
        ["GET", "POST", "PUT", "DELETE"].forEach(method => {
          plan.apiEndpoints.push({
            path: `/api/${component.name.toLowerCase()}`,
            method: method as any,
            purpose: `${method} operation for ${component.name}`,
            authentication: true,
            validation: method !== "GET" && method !== "DELETE",
            complexity: "medium"
          });
        });
      }
    });

    // Plan database schemas
    plan.components.forEach(component => {
      if (component.type === "form") {
        plan.databaseSchemas.push({
          tableName: component.name.toLowerCase(),
          relationships: [],
          fields: [
            { name: "id", type: "uuid", constraints: ["primary key"] },
            { name: "created_at", type: "timestamp", constraints: ["not null"] },
            { name: "updated_at", type: "timestamp", constraints: ["not null"] }
          ],
          indexes: ["id"],
          complexity: "medium"
        });
      }
    });

    // Plan workflows
    if (Array.isArray(entities.processes)) {
      entities.processes.forEach((process: any) => {
        const processName = typeof process === 'string' ? process : process.name;
        plan.workflows.push({
          name: processName,
          steps: [],
          approvals: true,
          notifications: true,
          integrations: [],
          complexity: "high"
        });
      });
    }

    // Plan chatbot
    plan.chatbots.push({
      name: "Business Assistant",
      capabilities: ["form_help", "workflow_guidance", "general_assistance"],
      integrationPoints: ["dashboard", "forms"],
      aiModel: "gpt-4",
      contextAware: true
    });

    // Set priority order
    plan.priorityOrder = [
      "database",
      "api",
      "components",
      "workflows",
      "integrations",
      "chatbots",
      "documentation",
      "deployment"
    ];

    return plan;
  }

  /**
   * Execute the generation plan
   */
  private async executeGenerationPlan(
    businessRequirement: BusinessRequirement,
    generatedApp: GeneratedApplication,
    plan: GenerationPlan,
    workspaceDir: string,
    options: OrchestrationOptions,
    applicationId: string
  ): Promise<any> {
    const generatedCode: any = {
      components: {},
      apiEndpoints: {},
      databaseSchema: {},
      integrations: {},
      workflows: {},
      chatbots: {},
      documentation: {}
    };

    // Generate database schema first (dependencies for other components)
    this.trackStageStart(GenerationStage.GENERATING_DATABASE);
    this.broadcastProgress(applicationId, {
      stage: GenerationStage.GENERATING_DATABASE,
      progress: 20,
      message: "🗄️ Generating database schema...",
      currentComponent: "Database Models",
      estimatedTimeRemaining: 700,
      details: {
        totalSteps: 12,
        currentStep: 3,
        stepDescription: `Creating ${plan.databaseSchemas.length} database tables`
      }
    });

    generatedCode.databaseSchema = await this.schemaGenerator.generateDatabaseSchema(
      businessRequirement,
      {
        outputDir: join(workspaceDir, "database"),
        includeSeeds: true,
        includeMigrations: false,
        databaseType: "postgresql"
      }
    );
    this.trackStageEnd(GenerationStage.GENERATING_DATABASE);

    // Generate API endpoints
    this.trackStageStart(GenerationStage.GENERATING_API);
    this.broadcastProgress(applicationId, {
      stage: GenerationStage.GENERATING_API,
      progress: 35,
      message: "🔌 Generating API endpoints...",
      currentComponent: "REST APIs",
      estimatedTimeRemaining: 600,
      details: {
        totalSteps: 12,
        currentStep: 4,
        stepDescription: `Creating ${plan.apiEndpoints.length} API endpoints`
      }
    });

    generatedCode.apiEndpoints = await this.apiGenerator.generateApiEndpoints(
      businessRequirement,
      {
        outputDir: join(workspaceDir, "server", "routes"),
        includeValidation: true,
        authRequired: true
      }
    );
    this.trackStageEnd(GenerationStage.GENERATING_API);

    // Generate React components
    this.trackStageStart(GenerationStage.GENERATING_COMPONENTS);
    this.broadcastProgress(applicationId, {
      stage: GenerationStage.GENERATING_COMPONENTS,
      progress: 50,
      message: "⚛️ Generating React components...",
      currentComponent: "UI Components",
      estimatedTimeRemaining: 500,
      details: {
        totalSteps: 12,
        currentStep: 5,
        stepDescription: `Building ${plan.components.length} React components`
      }
    });

    generatedCode.components = await this.reactGenerator.generateComponents(
      businessRequirement,
      {
        outputDir: join(workspaceDir, "src", "components"),
        includeTypes: true,
        includeTests: options.generateTests
      }
    );
    this.trackStageEnd(GenerationStage.GENERATING_COMPONENTS);

    // Generate workflows
    if (plan.workflows.length > 0) {
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.GENERATING_COMPONENTS,
        progress: 60,
        message: "🔄 Generating workflow systems...",
        currentComponent: "Workflows",
        estimatedTimeRemaining: 400,
        details: {
          totalSteps: 12,
          currentStep: 6,
          stepDescription: `Creating ${plan.workflows.length} workflow patterns`
        }
      });

      const workflowSystem = await this.workflowService.generateWorkflowSystem(
        businessRequirement,
        {
          includeApprovals: true,
          includeNotifications: true,
          includeExternalIntegrations: true,
          generateUI: false,
          complexity: "advanced"
        }
      );

      generatedCode.workflows = {
        "workflowPatterns.ts": JSON.stringify(workflowSystem.workflows, null, 2),
        "workflowDocumentation.md": workflowSystem.documentation
      };
    }

    // Generate chatbot
    if (plan.chatbots.length > 0) {
      this.broadcastProgress(applicationId, {
        stage: GenerationStage.GENERATING_COMPONENTS,
        progress: 70,
        message: "🤖 Generating AI chatbot system...",
        currentComponent: "Embedded Chatbot",
        estimatedTimeRemaining: 300,
        details: {
          totalSteps: 12,
          currentStep: 7,
          stepDescription: "Creating intelligent chatbot assistant"
        }
      });

      try {
        const chatbotResult = await this.chatbotService.createEmbeddedChatbot(
          applicationId,
          businessRequirement,
          plan.chatbots[0].capabilities,
          {
            tone: "professional",
            style: "business",
            proactiveness: "medium",
            expertiseLevel: "intermediate"
          }
        );

        generatedCode.chatbots = {
          "chatbotConfig.json": JSON.stringify(chatbotResult, null, 2),
          "chatbotIntegration.md": `# Chatbot Integration\n\nChatbot ID: ${chatbotResult.id}\nName: ${chatbotResult.name}`
        };
      } catch (error) {
        console.error("Failed to generate chatbot:", error);
      }
    }

    return generatedCode;
  }

  /**
   * Create workspace directory for generated code
   */
  private async createWorkspace(applicationId: string): Promise<string> {
    const sanitizedAppId = applicationId.replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
    if (sanitizedAppId.length < 3 || sanitizedAppId.length > 50) {
      throw new Error("Invalid application ID for workspace creation");
    }
    const workspaceDir = join(process.cwd(), "temp", "generated", sanitizedAppId);
    await mkdir(workspaceDir, { recursive: true });
    return workspaceDir;
  }

  /**
   * Integrate all generated components
   */
  private async integrateComponents(generatedCode: any, workspaceDir: string): Promise<void> {
    // Integration logic to connect components, APIs, and database
    // This is a placeholder for the actual integration implementation
    console.log("Integrating components in workspace:", workspaceDir);
  }

  /**
   * Broadcast progress updates to connected WebSockets
   */
  private broadcastProgress(applicationId: string, progress: GenerationProgress): void {
    this.emit("progress", { applicationId, progress });
    
    const sockets = this.activeWebSockets.get(applicationId);
    if (sockets && sockets.length > 0) {
      const message = JSON.stringify({
        type: "generation_progress",
        data: progress
      });
      
      sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  /**
   * Track stage timing
   */
  private trackStageStart(stage: GenerationStage): void {
    this.stageTiming.set(stage, { start: Date.now() });
  }

  private trackStageEnd(stage: GenerationStage): void {
    const timing = this.stageTiming.get(stage);
    if (timing) {
      timing.end = Date.now();
    }
  }

  /**
   * Calculate generation metrics
   */
  private calculateMetrics(generatedCode: any, startTime: number, endTime: number): any {
    const stageDurations: { [stage: string]: number } = {};
    
    this.stageTiming.forEach((timing, stage) => {
      if (timing.end) {
        stageDurations[stage] = timing.end - timing.start;
      }
    });

    const countLines = (code: { [key: string]: string }): number => {
      return Object.values(code).reduce((total, content) => {
        return total + content.split('\n').length;
      }, 0);
    };

    return {
      totalDuration: endTime - startTime,
      stageDurations,
      componentCount: Object.keys(generatedCode.components).length,
      apiEndpointCount: Object.keys(generatedCode.apiEndpoints).length,
      schemaTableCount: Object.keys(generatedCode.databaseSchema).length,
      codeLineCount: countLines(generatedCode.components) + 
                    countLines(generatedCode.apiEndpoints) + 
                    countLines(generatedCode.databaseSchema)
    };
  }

  /**
   * Get empty generated code structure
   */
  private getEmptyGeneratedCode(): any {
    return {
      components: {},
      apiEndpoints: {},
      databaseSchema: {},
      integrations: {},
      workflows: {},
      chatbots: {},
      documentation: {}
    };
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): any {
    return {
      totalDuration: 0,
      stageDurations: {},
      componentCount: 0,
      apiEndpointCount: 0,
      schemaTableCount: 0,
      codeLineCount: 0
    };
  }
}