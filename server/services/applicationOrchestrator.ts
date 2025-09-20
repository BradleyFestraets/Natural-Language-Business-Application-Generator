import { EventEmitter } from 'events';
import { z } from 'zod';
import { BusinessRequirement } from '@shared/schema';
import { WebSocket } from 'ws';
import { ReactComponentGenerator } from '../generators/reactComponentGenerator';
import { APIEndpointGenerator } from '../generators/apiEndpointGenerator';
import { DatabaseSchemaGenerator } from '../generators/databaseSchemaGenerator';
import { WorkflowGenerator } from '../generators/workflowGenerator';
import { FormGenerator } from '../generators/formGenerator';
import { IntegrationGenerator } from '../generators/integrationGenerator';
import { ChatbotGenerator } from '../generators/chatbotGenerator';
import { ApplicationDeployer } from '../deployment/applicationDeployer';
import { CodeValidator } from '../validation/codeValidator';
import { DocumentationGenerator } from '../documentation/documentationGenerator';
import { dbStorage } from '../storage';

// Generation Status Enum
export enum GenerationStatus {
  QUEUED = 'queued',
  INITIALIZING = 'initializing',
  GENERATING_SCHEMA = 'generating_schema',
  GENERATING_BACKEND = 'generating_backend',
  GENERATING_FRONTEND = 'generating_frontend',
  GENERATING_WORKFLOWS = 'generating_workflows',
  GENERATING_FORMS = 'generating_forms',
  INTEGRATING_SERVICES = 'integrating_services',
  EMBEDDING_CHATBOTS = 'embedding_chatbots',
  VALIDATING = 'validating',
  DEPLOYING = 'deploying',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Generation Progress Schema
const GenerationProgressSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(GenerationStatus),
  progress: z.number().min(0).max(100),
  currentStep: z.string(),
  steps: z.array(z.object({
    name: z.string(),
    status: z.enum(['pending', 'in-progress', 'completed', 'failed']),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    error: z.string().optional()
  })),
  startTime: z.string(),
  estimatedCompletionTime: z.string().optional(),
  deploymentUrl: z.string().optional(),
  error: z.string().optional()
});

export type GenerationProgress = z.infer<typeof GenerationProgressSchema>;

// Generated Application Schema
const GeneratedApplicationSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  name: z.string(),
  description: z.string(),
  deploymentUrl: z.string(),
  components: z.object({
    frontend: z.array(z.string()),
    backend: z.array(z.string()),
    database: z.array(z.string()),
    workflows: z.array(z.string()),
    forms: z.array(z.string()),
    integrations: z.array(z.string()),
    chatbots: z.array(z.string())
  }),
  documentation: z.object({
    userGuide: z.string(),
    technicalDocs: z.string(),
    apiReference: z.string()
  }),
  metadata: z.object({
    generatedAt: z.string(),
    version: z.string(),
    framework: z.string(),
    deploymentPlatform: z.string()
  })
});

export type GeneratedApplication = z.infer<typeof GeneratedApplicationSchema>;

export class ApplicationOrchestrator extends EventEmitter {
  private activeGenerations: Map<string, GenerationProgress> = new Map();
  private generationQueue: Array<{ id: string; requirement: BusinessRequirement }> = [];
  private wsClients: Map<string, WebSocket> = new Map();
  
  // Component generators
  private reactGenerator: ReactComponentGenerator;
  private apiGenerator: APIEndpointGenerator;
  private schemaGenerator: DatabaseSchemaGenerator;
  private workflowGenerator: WorkflowGenerator;
  private formGenerator: FormGenerator;
  private integrationGenerator: IntegrationGenerator;
  private chatbotGenerator: ChatbotGenerator;
  private deployer: ApplicationDeployer;
  private validator: CodeValidator;
  private documentationGenerator: DocumentationGenerator;

  constructor() {
    super();
    this.initializeGenerators();
    this.startQueueProcessor();
  }

  private initializeGenerators(): void {
    this.reactGenerator = new ReactComponentGenerator();
    this.apiGenerator = new APIEndpointGenerator();
    this.schemaGenerator = new DatabaseSchemaGenerator();
    this.workflowGenerator = new WorkflowGenerator();
    this.formGenerator = new FormGenerator();
    this.integrationGenerator = new IntegrationGenerator();
    this.chatbotGenerator = new ChatbotGenerator();
    this.deployer = new ApplicationDeployer();
    this.validator = new CodeValidator();
    this.documentationGenerator = new DocumentationGenerator();
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (this.generationQueue.length > 0 && this.activeGenerations.size < 3) {
        const next = this.generationQueue.shift();
        if (next) {
          this.processGeneration(next.id, next.requirement);
        }
      }
    }, 5000);
  }

  public async generateApplication(requirement: BusinessRequirement): Promise<string> {
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Initialize generation progress
    const progress: GenerationProgress = {
      id: generationId,
      status: GenerationStatus.QUEUED,
      progress: 0,
      currentStep: 'Queued for generation',
      steps: [
        { name: 'Initialize', status: 'pending' },
        { name: 'Generate Schema', status: 'pending' },
        { name: 'Generate Backend', status: 'pending' },
        { name: 'Generate Frontend', status: 'pending' },
        { name: 'Generate Workflows', status: 'pending' },
        { name: 'Generate Forms', status: 'pending' },
        { name: 'Integrate Services', status: 'pending' },
        { name: 'Embed Chatbots', status: 'pending' },
        { name: 'Validate', status: 'pending' },
        { name: 'Deploy', status: 'pending' }
      ],
      startTime: new Date().toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };

    this.activeGenerations.set(generationId, progress);
    this.generationQueue.push({ id: generationId, requirement });
    
    // Emit initial progress
    this.broadcastProgress(generationId, progress);
    
    return generationId;
  }

  private async processGeneration(generationId: string, requirement: BusinessRequirement): Promise<void> {
    try {
      // Update status to initializing
      await this.updateProgress(generationId, {
        status: GenerationStatus.INITIALIZING,
        progress: 5,
        currentStep: 'Initializing application generation'
      });

      // Step 1: Generate Database Schema
      await this.updateStepStatus(generationId, 'Generate Schema', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.GENERATING_SCHEMA,
        progress: 15,
        currentStep: 'Generating database schema'
      });
      const schemas = await this.schemaGenerator.generateSchemas(requirement);
      await this.updateStepStatus(generationId, 'Generate Schema', 'completed');

      // Step 2: Generate Backend APIs
      await this.updateStepStatus(generationId, 'Generate Backend', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.GENERATING_BACKEND,
        progress: 30,
        currentStep: 'Generating API endpoints'
      });
      const apis = await this.apiGenerator.generateAPIs(requirement, schemas);
      await this.updateStepStatus(generationId, 'Generate Backend', 'completed');

      // Step 3: Generate Frontend Components
      await this.updateStepStatus(generationId, 'Generate Frontend', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.GENERATING_FRONTEND,
        progress: 45,
        currentStep: 'Generating React components'
      });
      const components = await this.reactGenerator.generateComponents(requirement, apis);
      await this.updateStepStatus(generationId, 'Generate Frontend', 'completed');

      // Step 4: Generate Workflows
      await this.updateStepStatus(generationId, 'Generate Workflows', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.GENERATING_WORKFLOWS,
        progress: 55,
        currentStep: 'Generating business workflows'
      });
      const workflows = await this.workflowGenerator.generateWorkflows(requirement);
      await this.updateStepStatus(generationId, 'Generate Workflows', 'completed');

      // Step 5: Generate Forms
      await this.updateStepStatus(generationId, 'Generate Forms', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.GENERATING_FORMS,
        progress: 65,
        currentStep: 'Generating dynamic forms'
      });
      const forms = await this.formGenerator.generateForms(requirement);
      await this.updateStepStatus(generationId, 'Generate Forms', 'completed');

      // Step 6: Integrate External Services
      await this.updateStepStatus(generationId, 'Integrate Services', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.INTEGRATING_SERVICES,
        progress: 75,
        currentStep: 'Integrating external services'
      });
      const integrations = await this.integrationGenerator.generateIntegrations(requirement);
      await this.updateStepStatus(generationId, 'Integrate Services', 'completed');

      // Step 7: Embed Chatbots
      await this.updateStepStatus(generationId, 'Embed Chatbots', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.EMBEDDING_CHATBOTS,
        progress: 80,
        currentStep: 'Embedding AI chatbots'
      });
      const chatbots = await this.chatbotGenerator.generateChatbots(requirement);
      await this.updateStepStatus(generationId, 'Embed Chatbots', 'completed');

      // Step 8: Validate Generated Code
      await this.updateStepStatus(generationId, 'Validate', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.VALIDATING,
        progress: 85,
        currentStep: 'Validating generated code'
      });
      
      const validationResult = await this.validator.validateGeneratedCode({
        schemas,
        apis,
        components,
        workflows,
        forms,
        integrations,
        chatbots
      });

      if (!validationResult.isValid) {
        throw new Error(`Code validation failed: ${validationResult.errors.join(', ')}`);
      }
      await this.updateStepStatus(generationId, 'Validate', 'completed');

      // Step 9: Deploy Application
      await this.updateStepStatus(generationId, 'Deploy', 'in-progress');
      await this.updateProgress(generationId, {
        status: GenerationStatus.DEPLOYING,
        progress: 90,
        currentStep: 'Deploying application to Replit'
      });

      const deploymentResult = await this.deployer.deployApplication({
        generationId,
        requirement,
        components: {
          schemas,
          apis,
          components,
          workflows,
          forms,
          integrations,
          chatbots
        }
      });
      
      await this.updateStepStatus(generationId, 'Deploy', 'completed');

      // Step 10: Generate Documentation
      const documentation = await this.documentationGenerator.generateDocumentation({
        requirement,
        deploymentUrl: deploymentResult.url,
        components: {
          schemas,
          apis,
          components,
          workflows,
          forms,
          integrations,
          chatbots
        }
      });

      // Create final application record
      const generatedApp: GeneratedApplication = {
        id: generationId,
        requirementId: requirement.id,
        name: requirement.applicationName,
        description: requirement.description,
        deploymentUrl: deploymentResult.url,
        components: {
          frontend: components.map(c => c.name),
          backend: apis.map(a => a.endpoint),
          database: schemas.map(s => s.tableName),
          workflows: workflows.map(w => w.name),
          forms: forms.map(f => f.name),
          integrations: integrations.map(i => i.name),
          chatbots: chatbots.map(c => c.name)
        },
        documentation: {
          userGuide: documentation.userGuide,
          technicalDocs: documentation.technicalDocs,
          apiReference: documentation.apiReference
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
          framework: 'React + Express + Drizzle',
          deploymentPlatform: 'Replit'
        }
      };

      // Save to database
      await dbStorage.createGeneratedApplication(generatedApp);

      // Update final status
      await this.updateProgress(generationId, {
        status: GenerationStatus.COMPLETED,
        progress: 100,
        currentStep: 'Application generated successfully',
        deploymentUrl: deploymentResult.url
      });

    } catch (error) {
      console.error(`Generation failed for ${generationId}:`, error);
      await this.updateProgress(generationId, {
        status: GenerationStatus.FAILED,
        currentStep: 'Generation failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      // Clean up after 1 hour
      setTimeout(() => {
        this.activeGenerations.delete(generationId);
      }, 60 * 60 * 1000);
    }
  }

  private async updateProgress(generationId: string, update: Partial<GenerationProgress>): Promise<void> {
    const current = this.activeGenerations.get(generationId);
    if (!current) return;

    const updated = { ...current, ...update };
    this.activeGenerations.set(generationId, updated);
    this.broadcastProgress(generationId, updated);
  }

  private async updateStepStatus(
    generationId: string, 
    stepName: string, 
    status: 'pending' | 'in-progress' | 'completed' | 'failed'
  ): Promise<void> {
    const progress = this.activeGenerations.get(generationId);
    if (!progress) return;

    const stepIndex = progress.steps.findIndex(s => s.name === stepName);
    if (stepIndex !== -1) {
      progress.steps[stepIndex].status = status;
      if (status === 'in-progress') {
        progress.steps[stepIndex].startTime = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed') {
        progress.steps[stepIndex].endTime = new Date().toISOString();
      }
      this.activeGenerations.set(generationId, progress);
      this.broadcastProgress(generationId, progress);
    }
  }

  private broadcastProgress(generationId: string, progress: GenerationProgress): void {
    const message = JSON.stringify({ type: 'generation-progress', data: progress });
    
    // Emit to event listeners
    this.emit('progress', progress);
    
    // Broadcast to WebSocket clients
    this.wsClients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        this.wsClients.delete(clientId);
      }
    });
  }

  public subscribeToProgress(generationId: string, ws: WebSocket): void {
    const clientId = `${generationId}_${Date.now()}`;
    this.wsClients.set(clientId, ws);
    
    // Send current progress immediately
    const progress = this.activeGenerations.get(generationId);
    if (progress) {
      ws.send(JSON.stringify({ type: 'generation-progress', data: progress }));
    }

    // Clean up on disconnect
    ws.on('close', () => {
      this.wsClients.delete(clientId);
    });
  }

  public getProgress(generationId: string): GenerationProgress | null {
    return this.activeGenerations.get(generationId) || null;
  }

  public cancelGeneration(generationId: string): boolean {
    const progress = this.activeGenerations.get(generationId);
    if (progress && progress.status !== GenerationStatus.COMPLETED) {
      this.updateProgress(generationId, {
        status: GenerationStatus.CANCELLED,
        currentStep: 'Generation cancelled by user'
      });
      
      // Remove from queue if present
      const queueIndex = this.generationQueue.findIndex(item => item.id === generationId);
      if (queueIndex !== -1) {
        this.generationQueue.splice(queueIndex, 1);
      }
      
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const applicationOrchestrator = new ApplicationOrchestrator();