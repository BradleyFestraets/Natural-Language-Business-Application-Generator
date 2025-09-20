import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement, GeneratedApplication } from "@shared/schema";
import { WebSocket } from "ws";
import { ReactComponentGenerator } from "../generators/reactComponentGenerator";
import { APIEndpointGenerator } from "../generators/apiEndpointGenerator";
import { DatabaseSchemaGenerator } from "../generators/databaseSchemaGenerator";
import { WorkflowGenerationService } from "./workflowGenerationService";
import { WorkflowUIGenerator } from "../generators/workflowUIGenerator";
import { EmbeddedChatbotService } from "./embeddedChatbotService";
import { ComputerUseService } from "./computerUseService";
import { ApplicationDeployer } from "../deployment/applicationDeployer";
import { storage } from "../storage";
import { join } from "path";
import { ImageVideoGenerationService } from "./imageVideoGenerationService";
import { VoiceComponentGenerator } from "./voiceComponentGenerator";
import { TelephonyService } from "./telephonyService";
import { GenerationOrchestrator, GenerationStage, OrchestrationOptions } from "../orchestration/generationOrchestrator";

export interface GenerationOptions {
  includeWorkflows?: boolean;
  includeForms?: boolean;
  includeIntegrations?: boolean;
  includeChatbots?: boolean;
  includeVoiceComponents?: boolean;
  includeTelephony?: boolean;
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
  computerUse: { [filename: string]: string };
  voiceComponents: { [filename: string]: string };
  telephony: { [filename: string]: string };
  documentation: { [filename: string]: string };
  visualAssets?: any; // Placeholder for visual assets
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
  private apiGenerator: APIEndpointGenerator;
  private schemaGenerator: DatabaseSchemaGenerator;
  private workflowGenerator: WorkflowGenerationService;
  private workflowUIGenerator: WorkflowUIGenerator;
  private chatbotService: EmbeddedChatbotService;
  private computerUseService: ComputerUseService;
  private deployer: ApplicationDeployer;
  private imageVideoService: ImageVideoGenerationService;
  private voiceComponentGenerator: VoiceComponentGenerator;
  private telephonyService: TelephonyService;
  private orchestrator: GenerationOrchestrator;

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
    this.apiGenerator = new APIEndpointGenerator();
    this.schemaGenerator = new DatabaseSchemaGenerator();
    this.workflowGenerator = new WorkflowGenerationService();
    this.workflowUIGenerator = new WorkflowUIGenerator();
    this.chatbotService = new EmbeddedChatbotService();
    this.computerUseService = new ComputerUseService();
    this.deployer = new ApplicationDeployer();
    this.imageVideoService = new ImageVideoGenerationService();
    this.voiceComponentGenerator = new VoiceComponentGenerator();
    this.telephonyService = new TelephonyService();
    this.orchestrator = new GenerationOrchestrator();
    
    // Set up progress event listener from orchestrator
    this.orchestrator.on('progress', ({ applicationId, progress }) => {
      this.updateProgress(applicationId, progress);
    });
  }

  /**
   * Register WebSocket for real-time updates
   */
  registerWebSocket(applicationId: string, ws: WebSocket): void {
    if (!this.activeGenerations.has(applicationId)) {
      this.activeGenerations.set(applicationId, []);
    }
    this.activeGenerations.get(applicationId)?.push(ws);
    
    // Also register with orchestrator for enhanced progress updates
    this.orchestrator.registerWebSocket(applicationId, ws);
    
    ws.on("close", () => {
      const sockets = this.activeGenerations.get(applicationId);
      if (sockets) {
        const index = sockets.indexOf(ws);
        if (index > -1) {
          sockets.splice(index, 1);
        }
      }
    });
  }

  /**
   * Start complete application generation process with BMAD methodology
   */
  async generateApplication(
    businessRequirement: BusinessRequirement,
    generatedApp: GeneratedApplication,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const applicationId = generatedApp.id;
    
    // Use orchestrator for enhanced generation if configured
    const useOrchestrator = options.useOrchestrator !== false;

    if (useOrchestrator) {
      // Use the new orchestrator for coordinated generation
      const orchestrationOptions: Partial<OrchestrationOptions> = {
        parallel: true,
        maxConcurrency: 3,
        retryOnFailure: true,
        maxRetries: 2,
        generateTests: false,
        generateDocumentation: true,
        validateOutput: true,
        deploymentTarget: "replit"
      };
      
      const result = await this.orchestrator.orchestrateGeneration(
        businessRequirement,
        generatedApp,
        orchestrationOptions
      );
      
      return {
        applicationId: result.applicationId,
        success: result.success,
        deploymentUrl: result.deploymentUrl,
        generatedCode: result.generatedCode,
        errors: result.errors,
        metrics: {
          totalDuration: result.metrics.totalDuration,
          componentCount: result.metrics.componentCount,
          apiEndpointCount: result.metrics.apiEndpointCount,
          schemaTableCount: result.metrics.schemaTableCount
        }
      };
    }

    try {
      // Enhanced enterprise options with BMAD methodology (legacy path)
      const finalOptions = {
        includeWorkflows: true,
        includeForms: true,
        includeIntegrations: true,
        includeChatbots: true,
        includeVoiceComponents: true,
        includeTelephony: true,
        deploymentTarget: "replit" as const,
        generateDocumentation: true,
        ...options,
        // BMAD methodology enhancements
        bmadMethodology: {
          useFullWorkflow: options.bmadIntegration?.useFullWorkflow !== false,
          generatePRD: true,
          generateArchitecture: true,
          generateStories: true,
          qualityGates: options.bmadIntegration?.qualityGates !== false,
          agentCollaboration: true
        },
        // Enterprise features
        enterpriseFeatures: {
          securityFirst: true,
          complianceReady: true,
          auditLogging: true,
          enterpriseAuth: !!options.enterpriseFeatures?.includeAuditLog,
          customBranding: !!options.enterpriseFeatures?.includeBranding,
          analytics: options.enterpriseFeatures?.includeAnalytics !== false,
          ...options.enterpriseFeatures
        }
      };

      this.updateProgress(applicationId, {
        stage: "initializing",
        progress: 0,
        message: "🚀 Starting enterprise application generation with BMAD methodology...",
        estimatedTimeRemaining: 720 // 12 minutes with BMAD optimization
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

      // Phase 6: Generate computer use capabilities if requested
      let computerUse: { [filename: string]: string } = {};
      if (finalOptions.includeIntegrations) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 78,
          message: "Generating computer use automation...",
          currentComponent: "Computer Use Capabilities",
          estimatedTimeRemaining: 200
        });

        try {
          const computerUseResult = await this.computerUseService.generateComputerUseCapabilities(
            businessRequirement,
            workflows,
            Object.keys(components)
          );

          computerUse["computerUseCapabilities.ts"] = computerUseResult.integrationCode;
          computerUse["computerUseDocumentation.md"] = computerUseResult.documentation;
          computerUse["computerUseSetup.md"] = computerUseResult.setupInstructions;
          computerUse["computerUseConfig.json"] = JSON.stringify({
            capabilities: computerUseResult.capabilities,
            generatedAt: new Date().toISOString(),
            businessContext: businessRequirement.extractedEntities?.businessContext?.industry
          }, null, 2);

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 80,
            message: "Computer use automation generated successfully",
            estimatedTimeRemaining: 190
          });

        } catch (error) {
          console.error("Failed to generate computer use capabilities:", error);
          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 80,
            message: "Computer use generation failed, continuing without computer use",
            errors: [error instanceof Error ? error.message : "Unknown computer use error"],
            estimatedTimeRemaining: 190
          });
        }
      }

      // Phase 7: Generate embedded chatbots with custom agent tools if requested
      let chatbots: { [filename: string]: string } = {};
      if (finalOptions.includeChatbots) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 82,
          message: "Generating AI chatbot system with custom agent tools...",
          currentComponent: "Embedded Chatbots & Agent Tools",
          estimatedTimeRemaining: 180
        });

        try {
          // Generate business-specific agent tools based on extracted entities
          const agentTools = await this.generateAgentTools(businessRequirement);

          // Create enhanced chatbot capabilities including generated tools
          const chatbotCapabilities = [
            { type: 'form_help' as const, description: 'Form filling guidance', permissions: ['form:read', 'form:validate'] },
            { type: 'validation' as const, description: 'Input validation assistance', permissions: ['validate:input'] },
            { type: 'process_guidance' as const, description: 'Workflow and process guidance', permissions: ['workflow:read'] },
            { type: 'contextual_assistance' as const, description: 'Context-aware help', permissions: ['context:read'] },
            ...agentTools.capabilities
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

      // Phase 7.5: Generate voice components if requested
      let voiceComponents: { [filename: string]: string } = {};
      if (finalOptions.includeVoiceComponents) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 84,
          message: "Generating voice AI components...",
          currentComponent: "Voice Components",
          estimatedTimeRemaining: 165
        });

        try {
          const voicePackage = await this.voiceComponentGenerator.generateVoiceComponentPackage(
            businessRequirement,
            {
              includeSpeechToText: true,
              includeTextToSpeech: true,
              includeVoiceCommands: true,
              includeWebRTC: true,
              includeVoiceAuth: false,
              language: 'en',
              voiceStyle: 'professional',
              provider: 'openai'
            }
          );

          // Generate individual component files
          voicePackage.components.forEach((component, index) => {
            const filename = `${component.name.toLowerCase()}.tsx`;
            voiceComponents[filename] = component.code;
          });

          // Generate voice configuration file
          voiceComponents["voiceConfig.ts"] = `export const voiceConfiguration = ${JSON.stringify(voicePackage.configuration, null, 2)};

${voicePackage.documentation}`;

          // Generate voice integration guide
          voiceComponents["voiceIntegration.md"] = voicePackage.integrationGuide;

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 86,
            message: "Voice AI components generated successfully",
            estimatedTimeRemaining: 160
          });

        } catch (error) {
          console.error("Failed to generate voice components:", error);
          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 86,
            message: "Voice component generation failed, continuing without voice components",
            errors: [error instanceof Error ? error.message : "Unknown voice component error"],
            estimatedTimeRemaining: 160
          });
        }
      }

      // Phase 7.6: Generate telephony components if requested
      let telephony: { [filename: string]: string } = {};
      if (finalOptions.includeTelephony) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 87,
          message: "Generating telephony system...",
          currentComponent: "Telephony Components",
          estimatedTimeRemaining: 155
        });

        try {
          // Generate telephony configuration and integration files
          telephony["telephonyConfig.ts"] = `export const telephonyConfiguration = {
  provider: 'twilio',
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'your-account-sid',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'your-auth-token',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
  features: {
    calls: true,
    sms: true,
    conferences: true,
    voicemail: true,
    callAnalytics: true
  }
};

export interface TelephonyActions {
  makeCall: (to: string, from: string, url?: string) => Promise<any>;
  sendSMS: (to: string, from: string, message: string) => Promise<any>;
  createConference: (name: string, options?: any) => Promise<any>;
  getCallStatus: (callSid: string) => Promise<any>;
  listCalls: (options?: any) => Promise<any[]>;
}
`;

          telephony["telephonyService.ts"] = `import { telephonyConfiguration } from './telephonyConfig';

class TelephonyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || '/api';
  }

  async makeCall(to: string, from: string, url?: string) {
    const response = await fetch(\`\${this.baseUrl}/telephony/call\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from, url })
    });
    return response.json();
  }

  async sendSMS(to: string, from: string, message: string) {
    const response = await fetch(\`\${this.baseUrl}/telephony/sms\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from, message })
    });
    return response.json();
  }

  async createConference(name: string, options: any = {}) {
    const response = await fetch(\`\${this.baseUrl}/telephony/conference\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conferenceName: name, ...options })
    });
    return response.json();
  }

  async getCallStatus(callSid: string) {
    const response = await fetch(\`\${this.baseUrl}/telephony/calls/\${callSid}\`);
    return response.json();
  }

  async listCalls(options: any = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(\`\${this.baseUrl}/telephony/calls?\${params}\`);
    return response.json();
  }
}

export const telephonyService = new TelephonyService();
export default telephonyService;
`;

          telephony["telephonyComponents.tsx"] = `import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MessageSquare, Users, PhoneCall, PhoneOff } from 'lucide-react';

interface TelephonyComponentsProps {
  className?: string;
}

export function TelephonyComponents({ className = '' }: TelephonyComponentsProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [conferenceName, setConferenceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const makeCall = async () => {
    if (!phoneNumber) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/telephony/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
          url: '/api/telephony/twiml/welcome'
        })
      });

      const result = await response.json();
      console.log('Call result:', result);
    } catch (error) {
      console.error('Call error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!phoneNumber || !message) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/telephony/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
          message
        })
      });

      const result = await response.json();
      console.log('SMS result:', result);
    } catch (error) {
      console.error('SMS error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createConference = async () => {
    if (!conferenceName) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/telephony/conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conferenceName })
      });

      const result = await response.json();
      console.log('Conference result:', result);
    } catch (error) {
      console.error('Conference error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={\`grid grid-cols-1 md:grid-cols-3 gap-4 \${className}\}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Make Call
          </CardTitle>
          <CardDescription>Call any phone number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <Button
            onClick={makeCall}
            disabled={isLoading || !phoneNumber}
            className="w-full"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            {isLoading ? 'Calling...' : 'Make Call'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS
          </CardTitle>
          <CardDescription>Send text message</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <Input
            placeholder="Enter message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            onClick={sendSMS}
            disabled={isLoading || !phoneNumber || !message}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send SMS'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Conference
          </CardTitle>
          <CardDescription>Create conference call</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Conference name"
            value={conferenceName}
            onChange={(e) => setConferenceName(e.target.value)}
          />
          <Button
            onClick={createConference}
            disabled={isLoading || !conferenceName}
            className="w-full"
          >
            {isLoading ? 'Creating...' : 'Create Conference'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
`;

          telephony["telephonyIntegration.md"] = `# Telephony Integration Guide

## Overview
This application includes comprehensive telephony capabilities including phone calls, SMS, and conference calling.

## Features
- **Phone Calls**: Make and receive phone calls through Twilio
- **SMS Messaging**: Send and receive text messages
- **Conference Calling**: Multi-party conference calls
- **Call Analytics**: Track call metrics and performance
- **Voicemail**: Automated voicemail handling

## Configuration
1. Set up Twilio account credentials:
   - \`TWILIO_ACCOUNT_SID\`
   - \`TWILIO_AUTH_TOKEN\`
   - \`TWILIO_PHONE_NUMBER\`

2. Configure provider in \`telephonyConfig.ts\`

## Usage Examples

### Making a Call
\`\`\`tsx
import { telephonyService } from './telephonyService';

const call = await telephonyService.makeCall(
  '+1234567890',
  '+0987654321',
  '/api/telephony/twiml/welcome'
);
\`\`\`

### Sending SMS
\`\`\`tsx
const sms = await telephonyService.sendSMS(
  '+1234567890',
  '+0987654321',
  'Hello from your business app!'
);
\`\`\`

### Creating Conference
\`\`\`tsx
const conference = await telephonyService.createConference(
  'Team Meeting',
  { maxParticipants: 10 }
);
\`\`\`

## API Endpoints
- \`POST /api/telephony/call\` - Make phone call
- \`POST /api/telephony/sms\` - Send SMS
- \`POST /api/telephony/conference\` - Create conference
- \`GET /api/telephony/calls\` - List calls
- \`GET /api/telephony/calls/:sid\` - Get call status
- \`POST /api/telephony/twiml/:action\` - Generate TwiML

## TwiML Actions
- \`welcome\` - Welcome message for calls
- \`menu\` - Interactive voice menu
- \`transfer\` - Call transfer
- \`voicemail\` - Voicemail recording
- \`conference\` - Conference joining

## Security
- All calls are logged and monitored
- Phone number validation included
- Rate limiting on SMS sending
- Conference access controls
`;

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 88,
            message: "Telephony system generated successfully",
            estimatedTimeRemaining: 150
          });

        } catch (error) {
          console.error("Failed to generate telephony components:", error);
          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 88,
            message: "Telephony generation failed, continuing without telephony",
            errors: [error instanceof Error ? error.message : "Unknown telephony error"],
            estimatedTimeRemaining: 150
          });
        }
      }

      // Phase 8: Generate integrations if requested
      let integrations: { [filename: string]: string } = {};
      if (finalOptions.includeIntegrations) {
        integrations = await this.generateIntegrations(businessRequirement, generationPlan);
      }

      this.updateProgress(applicationId, {
        stage: "integrating",
        progress: 89,
        message: "Integrating components, workflows, chatbots, voice AI, and telephony...",
        estimatedTimeRemaining: 150
      });

      // Phase 9: Generate visual assets
      const visualAssets = await this.imageVideoService.generateVisualAssetPackage(
        businessRequirement,
        {
          applicationId,
          workflows: Object.keys(workflows).length,
          forms: Object.keys(components).length, // Assuming components represent forms for this context
          industry: businessRequirement.extractedEntities?.businessContext?.industry
        }
      );

      // Phase 10: Generate documentation
      let documentation: { [filename: string]: string } = {};
      if (finalOptions.generateDocumentation) {
        documentation = await this.generateDocumentation(businessRequirement, {
          components,
          apiEndpoints,
          databaseSchema,
          integrations,
          workflows,
          chatbots,
          computerUse,
          voiceComponents,
          telephony,
          documentation: {}
        });
      }

      this.updateProgress(applicationId, {
        stage: "testing",
        progress: 90,
        message: "Validating generated code...",
        estimatedTimeRemaining: 90
      });

      // Phase 11: Validate generated code
      await this.validateGeneratedCode({
        components,
        apiEndpoints,
        databaseSchema,
        integrations,
        workflows,
        chatbots,
        computerUse,
        voiceComponents,
        telephony,
        documentation
      });

      this.updateProgress(applicationId, {
        stage: "deploying",
        progress: 95,
        message: "Deploying application...",
        estimatedTimeRemaining: 60
      });

      // Phase 12: Deploy application using deployment pipeline with pre-generated code
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
          computerUse,
          documentation,
          visualAssets // Include visualAssets in the final result
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
          computerUse: {},
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
6. Image and Video generation capabilities

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
   * Generate custom agent tools based on business requirements
   */
  private async generateAgentTools(
    businessRequirement: BusinessRequirement
  ): Promise<{ tools: { [filename: string]: string }, capabilities: any[] }> {
    if (!isAIServiceAvailable() || !this.openai) {
      return { tools: {}, capabilities: [] };
    }

    const agentToolsPrompt = `Generate custom AI agent tools for this business application:

Business Requirement: ${businessRequirement.originalDescription}
Business Context: ${JSON.stringify(businessRequirement.extractedEntities?.businessContext, null, 2)}
Processes: ${JSON.stringify(businessRequirement.extractedEntities?.processes, null, 2)}
Forms: ${JSON.stringify(businessRequirement.extractedEntities?.forms, null, 2)}
Workflows: ${businessRequirement.workflowPatterns?.join(", ") || "None"}

Generate TypeScript agent tools that can:
1. Execute business-specific actions (e.g., validate employee data, process approvals)
2. Query workflow and form states
3. Provide intelligent automation for repetitive tasks
4. Integrate with the business processes identified

Each tool should:
- Have a clear function signature with TypeScript types
- Include proper error handling and validation
- Provide meaningful responses for the AI agent
- Follow enterprise security best practices

Focus on tools that would genuinely help users complete their business tasks more efficiently.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert AI agent tool developer. Generate production-ready agent tools that enhance business productivity." },
          { role: "user", content: agentToolsPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

      const toolsCode = response.choices[0]?.message?.content || "";

      // Parse the business context to determine domain-specific capabilities
      const businessContext = businessRequirement.extractedEntities?.businessContext;
      const industry = businessContext?.industry || 'general';

      const capabilities = this.generateCapabilitiesFromIndustry(industry, businessRequirement);

      return {
        tools: {
          "agentTools.ts": toolsCode,
          "agentToolsConfig.json": JSON.stringify({
            industry,
            generatedAt: new Date().toISOString(),
            capabilities: capabilities.map(c => c.type),
            businessProcesses: businessRequirement.extractedEntities?.processes?.map(p => p.name) || []
          }, null, 2)
        },
        capabilities
      };
    } catch (error) {
      console.error("Failed to generate agent tools:", error);
      return { tools: {}, capabilities: [] };
    }
  }

  /**
   * Generate domain-specific capabilities based on industry
   */
  private generateCapabilitiesFromIndustry(industry: string, businessRequirement: BusinessRequirement): any[] {
    const baseCaps = [];

    // Industry-specific capabilities
    switch (industry.toLowerCase()) {
      case 'hr':
      case 'human resources':
        baseCaps.push(
          { type: 'employee_data_management', description: 'Manage employee information and records', permissions: ['employee:read', 'employee:update'] },
          { type: 'onboarding_automation', description: 'Automate onboarding workflows', permissions: ['workflow:execute', 'document:process'] },
          { type: 'compliance_monitoring', description: 'Monitor HR compliance requirements', permissions: ['compliance:read', 'audit:create'] }
        );
        break;

      case 'finance':
      case 'accounting':
        baseCaps.push(
          { type: 'expense_processing', description: 'Process and validate expense reports', permissions: ['expense:read', 'expense:validate'] },
          { type: 'approval_routing', description: 'Route financial approvals efficiently', permissions: ['approval:route', 'workflow:execute'] },
          { type: 'budget_analysis', description: 'Analyze budget allocations and spending', permissions: ['budget:read', 'analytics:generate'] }
        );
        break;

      case 'healthcare':
        baseCaps.push(
          { type: 'patient_data_management', description: 'Manage patient information securely', permissions: ['patient:read', 'hipaa:comply'] },
          { type: 'appointment_scheduling', description: 'Intelligent appointment scheduling', permissions: ['schedule:manage', 'calendar:update'] },
          { type: 'compliance_tracking', description: 'Track healthcare compliance requirements', permissions: ['compliance:monitor', 'audit:create'] }
        );
        break;

      default:
        baseCaps.push(
          { type: 'data_processing', description: 'Process and validate business data', permissions: ['data:read', 'data:validate'] },
          { type: 'workflow_automation', description: 'Automate business workflows', permissions: ['workflow:execute', 'process:automate'] },
          { type: 'document_management', description: 'Manage business documents', permissions: ['document:read', 'document:process'] }
        );
    }

    // Add process-specific capabilities
    if (businessRequirement.extractedEntities?.processes) {
      for (const process of businessRequirement.extractedEntities.processes) {
        baseCaps.push({
          type: `${process.name.toLowerCase().replace(/\s+/g, '_')}_assistance`,
          description: `Provide assistance for ${process.name} process`,
          permissions: ['process:read', 'process:execute']
        });
      }
    }

    return baseCaps;
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
Generated Visual Assets: ${generatedCode.visualAssets ? Object.keys(generatedCode.visualAssets).join(", ") : "None"}

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
          visualAssets: {
            type: "array",
            items: { type: "string" },
            description: "List of visual assets to generate (images, videos)"
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