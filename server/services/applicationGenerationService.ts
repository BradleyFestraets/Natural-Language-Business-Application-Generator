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
import { CRMService } from "./crmService";
import { SalesAutomationService } from "./salesAutomationService";
import { MarketingAutomationService } from "./marketingAutomationService";
import { GenerationOrchestrator, GenerationStage, OrchestrationOptions } from "../orchestration/generationOrchestrator";

export interface GenerationOptions {
  includeWorkflows?: boolean;
  includeForms?: boolean;
  includeIntegrations?: boolean;
  includeChatbots?: boolean;
  includeVoiceComponents?: boolean;
  includeTelephony?: boolean;
  includeCRM?: boolean;
  includeSalesAutomation?: boolean;
  includeMarketingAutomation?: boolean;
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
  crm: { [filename: string]: string };
  sales: { [filename: string]: string };
  marketing: { [filename: string]: string };
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
  private crmService: CRMService;
  private salesAutomationService: SalesAutomationService;
  private marketingAutomationService: MarketingAutomationService;
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
    this.crmService = new CRMService();
    this.salesAutomationService = new SalesAutomationService();
    this.marketingAutomationService = new MarketingAutomationService();
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
        includeCRM: true,
        includeSalesAutomation: true,
        includeMarketingAutomation: true,
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

      // Phase 7.7: Generate CRM components if requested
      let crm: { [filename: string]: string } = {};
      if (finalOptions.includeCRM) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 89,
          message: "Generating CRM system...",
          currentComponent: "Customer Relationship Management",
          estimatedTimeRemaining: 145
        });

        try {
          // Generate CRM configuration
          crm["crmConfig.ts"] = `export const crmConfiguration = {
  features: {
    customerManagement: true,
    interactionTracking: true,
    healthScoring: true,
    segmentation: true,
    analytics: true,
    integrations: true
  },
  settings: {
    defaultHealthScore: 75,
    healthUpdateInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxInteractionsPerPage: 50,
    searchDebounceMs: 300
  }
};

export interface CRMFeatures {
  customerManagement: boolean;
  interactionTracking: boolean;
  healthScoring: boolean;
  segmentation: boolean;
  analytics: boolean;
  integrations: boolean;
}
`;

          crm["crmService.ts"] = `import { crmConfiguration } from './crmConfig';

class CRMService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || '/api';
  }

  async createCustomer(customerData: any) {
    const response = await fetch(\`\${this.baseUrl}/crm/customers\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    return response.json();
  }

  async getCustomer(customerId: string) {
    const response = await fetch(\`\${this.baseUrl}/crm/customers/\${customerId}\`);
    return response.json();
  }

  async updateCustomer(customerId: string, updates: any) {
    const response = await fetch(\`\${this.baseUrl}/crm/customers/\${customerId}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async searchCustomers(query: any) {
    const params = new URLSearchParams(query);
    const response = await fetch(\`\${this.baseUrl}/crm/customers/search?\${params}\`);
    return response.json();
  }

  async recordInteraction(interactionData: any) {
    const response = await fetch(\`\${this.baseUrl}/crm/interactions\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interactionData)
    });
    return response.json();
  }

  async getCustomerInsights(customerId: string) {
    const response = await fetch(\`\${this.baseUrl}/crm/customers/\${customerId}/insights\`);
    return response.json();
  }

  async createSegmentationRule(ruleData: any) {
    const response = await fetch(\`\${this.baseUrl}/crm/segments/rules\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData)
    });
    return response.json();
  }

  async generateSegment(ruleId: string) {
    const response = await fetch(\`\${this.baseUrl}/crm/segments/generate\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId })
    });
    return response.json();
  }
}

export const crmService = new CRMService();
export default crmService;
`;

          crm["crmComponents.tsx"] = `import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface Customer {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
  };
  customerStatus: 'lead' | 'prospect' | 'customer' | 'churned';
  customerHealth: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
  tags: string[];
}

interface CRMComponentsProps {
  className?: string;
}

export function CRMComponents({ className = '' }: CRMComponentsProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/customers/search');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCustomers();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(\`/api/crm/customers/search?query=\${encodeURIComponent(searchQuery)}\`);
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 60) return <TrendingUp className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className={\`space-y-6 \${className}\}>
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search customers by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading}>
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  {customer.personalInfo.firstName} {customer.personalInfo.lastName}
                </CardTitle>
                <Badge
                  className={getHealthColor(customer.customerHealth.score)}
                  variant="secondary"
                >
                  {getHealthIcon(customer.customerHealth.score)}
                  <span className="ml-1">{customer.customerHealth.score}</span>
                </Badge>
              </div>
              <CardDescription>
                {customer.personalInfo.company && (
                  <div className="font-medium">{customer.personalInfo.company}</div>
                )}
                <div className="text-sm text-muted-foreground">
                  {customer.personalInfo.email}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="capitalize">
                    {customer.customerStatus}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Health:</span>
                  <span className="capitalize font-medium">
                    {customer.customerHealth.status}
                  </span>
                </div>
                {customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {customer.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Start by adding your first customer'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
`;

          crm["crmIntegration.md"] = \`# CRM System Integration Guide

## Overview
This application includes a comprehensive Customer Relationship Management (CRM) system that provides 360-degree customer views, health scoring, segmentation, and AI-powered insights.

## Features
- **Customer Management**: Complete customer database with profiles and custom fields
- **360-Degree View**: Integrated customer timeline across applications, sales, marketing, and support
- **Health Scoring**: AI-powered customer health assessment and risk prediction
- **Segmentation**: Dynamic customer segmentation with rule-based and AI-powered classification
- **Interaction Tracking**: Comprehensive customer interaction history and analytics
- **Search & Filtering**: Advanced customer search with multi-criteria filtering and sorting

## Configuration
1. CRM is automatically integrated into generated applications
2. Configure customer fields in \`crmConfig.ts\`
3. Set up health scoring parameters based on business needs
4. Define segmentation rules for targeted customer groups

## Usage Examples

### Creating a Customer
\`\`\`tsx
import { crmService } from './crmService';

const newCustomer = await crmService.createCustomer({
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Example Corp'
  },
  customerStatus: 'prospect',
  customerType: 'business',
  acquisitionSource: 'website'
});
\`\`\`

### Searching Customers
\`\`\`tsx
const searchResults = await crmService.searchCustomers({
  query: 'john',
  filters: {
    status: ['prospect', 'customer'],
    healthScore: { min: 60, max: 100 }
  },
  sort: { field: 'createdAt', direction: 'desc' },
  pagination: { page: 1, limit: 20 }
});
\`\`\`

### Recording Customer Interactions
\`\`\`tsx
const interaction = await crmService.recordInteraction({
  customerId: 'customer-id',
  type: 'application_usage',
  title: 'Logged into application',
  description: 'User accessed the main dashboard',
  systemSource: 'application'
});
\`\`\`

## API Endpoints
- \`POST /api/crm/customers\` - Create customer
- \`GET /api/crm/customers/:id\` - Get customer with 360-degree view
- \`PUT /api/crm/customers/:id\` - Update customer
- \`GET /api/crm/customers/search\` - Search customers
- \`POST /api/crm/interactions\` - Record interaction
- \`GET /api/crm/customers/:id/insights\` - Get AI insights
- \`POST /api/crm/segments/rules\` - Create segmentation rule
- \`POST /api/crm/segments/generate\` - Generate segment

## Customer Health Scoring
The system automatically calculates customer health scores based on:
- Application usage frequency and patterns
- Support ticket history and resolution
- Sales engagement and opportunity progression
- Marketing interaction and response rates
- Overall engagement trends and activity levels

## Segmentation Rules
Create dynamic customer segments using rule-based conditions:
- Customer status and type filtering
- Health score ranges
- Custom field values
- Tag-based categorization
- Activity and engagement criteria

## Security & Privacy
- Customer data is isolated by organization
- Role-based access control for customer information
- Audit logging for all customer interactions
- GDPR and privacy compliance built-in
- Data encryption at rest and in transit

## Performance Considerations
- Optimized database queries for large customer datasets
- Caching for frequently accessed customer information
- Pagination for customer lists and search results
- Background processing for health score updates
- Efficient search indexing for fast customer lookups
\`;

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 90,
            message: "CRM system generated successfully",
            estimatedTimeRemaining: 140
          });

        } catch (error) {
          console.error("Failed to generate CRM components:", error);
          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 90,
            message: "CRM generation failed, continuing without CRM",
            errors: [error instanceof Error ? error.message : "Unknown CRM error"],
            estimatedTimeRemaining: 140
          });
        }
      }

      // Phase 7.8: Generate Sales Automation components if requested
      let sales: { [filename: string]: string } = {};
      if (finalOptions.includeSalesAutomation) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 91,
          message: "Generating Sales Automation system...",
          currentComponent: "Sales & Revenue Management",
          estimatedTimeRemaining: 140
        });

        try {
          // Generate sales automation configuration
          sales["salesConfig.ts"] = `export const salesConfiguration = {
            features: {
              quoteGeneration: true,
              contractManagement: true,
              revenueAutomation: true,
              productCatalog: true,
              approvalWorkflows: true,
              analytics: true
            },
            settings: {
              quoteValidityDays: 30,
              autoApprovalThreshold: 10000,
              managerApprovalThreshold: 50000,
              taxRate: 0.1,
              currency: 'USD'
            },
            approvalWorkflows: {
              auto: { threshold: 10000, roles: ['auto_approved'] },
              manager: { threshold: 50000, roles: ['sales_manager'] },
              executive: { threshold: Infinity, roles: ['sales_manager', 'finance_director'] }
            }
          };

          export interface SalesFeatures {
            quoteGeneration: boolean;
            contractManagement: boolean;
            revenueAutomation: boolean;
            productCatalog: boolean;
            approvalWorkflows: boolean;
            analytics: boolean;
          }
          `;

          sales["salesService.ts"] = `import { salesConfiguration } from './salesConfig';

          class SalesService {
            private baseUrl: string;

            constructor() {
              this.baseUrl = process.env.API_BASE_URL || '/api';
            }

            async generateQuote(quoteData: any) {
              const response = await fetch(\`\${this.baseUrl}/sales/quotes\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData)
              });
              return response.json();
            }

            async getQuote(quoteId: string) {
              const response = await fetch(\`\${this.baseUrl}/sales/quotes/\${quoteId}\`);
              return response.json();
            }

            async updateQuote(quoteId: string, updates: any) {
              const response = await fetch(\`\${this.baseUrl}/sales/quotes/\${quoteId}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              return response.json();
            }

            async submitQuoteForApproval(quoteId: string) {
              const response = await fetch(\`\${this.baseUrl}/sales/quotes/\${quoteId}/submit\`, {
                method: 'POST'
              });
              return response.json();
            }

            async generateContract(quoteId: string, contractData: any) {
              const response = await fetch(\`\${this.baseUrl}/sales/contracts\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quoteId, ...contractData })
              });
              return response.json();
            }

            async getContract(contractId: string) {
              const response = await fetch(\`\${this.baseUrl}/sales/contracts/\${contractId}\`);
              return response.json();
            }

            async generateInvoice(contractId: string, invoiceData: any) {
              const response = await fetch(\`\${this.baseUrl}/sales/invoices\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractId, ...invoiceData })
              });
              return response.json();
            }

            async getProducts() {
              const response = await fetch(\`\${this.baseUrl}/sales/products\`);
              return response.json();
            }

            async getSalesAnalytics() {
              const response = await fetch(\`\${this.baseUrl}/sales/analytics\`);
              return response.json();
            }
          }

          export const salesService = new SalesService();
          export default salesService;
          `;

          sales["salesComponents.tsx"] = `import React, { useState, useEffect } from 'react';
          import { Button } from '@/components/ui/button';
          import { Input } from '@/components/ui/input';
          import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
          import { Badge } from '@/components/ui/badge';
          import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
          import { FileText, Plus, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';

          interface Quote {
            id: string;
            quoteNumber: string;
            title: string;
            totalAmount: number;
            status: 'draft' | 'sent' | 'approved' | 'accepted' | 'rejected';
            customerInfo: { name: string; company?: string };
            createdAt: string;
          }

          interface SalesComponentsProps {
            className?: string;
          }

          export function SalesComponents({ className = '' }: SalesComponentsProps) {
            const [quotes, setQuotes] = useState<Quote[]>([]);
            const [isLoading, setIsLoading] = useState(false);

            useEffect(() => {
              loadQuotes();
            }, []);

            const loadQuotes = async () => {
              setIsLoading(true);
              try {
                const response = await fetch('/api/sales/quotes');
                const data = await response.json();
                setQuotes(data.quotes || []);
              } catch (error) {
                console.error('Failed to load quotes:', error);
              } finally {
                setIsLoading(false);
              }
            };

            const getStatusColor = (status: Quote['status']) => {
              switch (status) {
                case 'draft': return 'text-yellow-600 bg-yellow-100';
                case 'sent': return 'text-blue-600 bg-blue-100';
                case 'approved': return 'text-green-600 bg-green-100';
                case 'accepted': return 'text-emerald-600 bg-emerald-100';
                case 'rejected': return 'text-red-600 bg-red-100';
                default: return 'text-gray-600 bg-gray-100';
              }
            };

            const getStatusIcon = (status: Quote['status']) => {
              switch (status) {
                case 'draft': return <Clock className="h-4 w-4" />;
                case 'sent': return <FileText className="h-4 w-4" />;
                case 'approved': return <CheckCircle className="h-4 w-4" />;
                case 'accepted': return <CheckCircle className="h-4 w-4" />;
                default: return <FileText className="h-4 w-4" />;
              }
            };

            return (
              <div className={\`space-y-6 \${className}\}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Sales Automation</h2>
                    <p className="text-muted-foreground">Manage quotes, contracts, and revenue operations</p>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Quote
                  </Button>
                </div>

                <Tabs defaultValue="quotes" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="quotes">Quotes</TabsTrigger>
                    <TabsTrigger value="contracts">Contracts</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="quotes" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {quotes.map((quote) => (
                        <Card key={quote.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{quote.quoteNumber}</CardTitle>
                                <CardDescription>{quote.title}</CardDescription>
                              </div>
                              <Badge className={getStatusColor(quote.status)} variant="secondary">
                                {getStatusIcon(quote.status)}
                                <span className="ml-1 capitalize">{quote.status}</span>
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Customer:</span>
                                <span className="font-medium">{quote.customerInfo.name}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-semibold text-green-600">
                                  \${quote.totalAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Created:</span>
                                <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                              </div>
                              {quote.customerInfo.company && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Company:</span>
                                  <span>{quote.customerInfo.company}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button variant="outline" size="sm" className="flex-1">
                                View
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1">
                                Edit
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {quotes.length === 0 && !isLoading && (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
                          <p className="text-muted-foreground text-center mb-4">
                            Start by creating your first quote
                          </p>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Quote
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="contracts">
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Contract Management</h3>
                        <p className="text-muted-foreground text-center mb-4">
                          Manage contracts, e-signatures, and renewals
                        </p>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Contract
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="analytics">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">$125,430</div>
                          <p className="text-xs text-muted-foreground">+12% from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Quotes Generated</CardTitle>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">42</div>
                          <p className="text-xs text-muted-foreground">+8 from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">68%</div>
                          <p className="text-xs text-muted-foreground">+5% from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">$8,450</div>
                          <p className="text-xs text-muted-foreground">+15% from last month</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            );
          }
          `;

          sales["salesIntegration.md"] = \`# Sales Automation Integration Guide

          ## Overview
          This application includes comprehensive sales automation with AI-powered quote generation, contract management, and revenue operations that seamlessly integrate with CRM and other business systems.

          ## Features
          - **AI-Powered Quote Generation**: Automated quote creation using CRM data and AI content generation
          - **Product Catalog Management**: Dynamic pricing, discount rules, and product configuration
          - **Approval Workflows**: Automated routing based on quote value and business rules
          - **Contract Lifecycle Management**: From quote to renewal with e-signature integration
          - **Revenue Automation**: Invoicing, payment processing, and revenue recognition
          - **Sales Analytics**: Performance tracking, forecasting, and conversion optimization

          ## Configuration
          1. Sales automation is automatically integrated into generated applications
          2. Configure pricing rules and approval workflows in \`salesConfig.ts\`
          3. Set up product catalog with pricing models and discount matrices
          4. Define approval thresholds and routing rules for different quote values

          ## Usage Examples

          ### Creating a Quote
          \`\`\`tsx
          import { salesService } from './salesService';

          const quote = await salesService.generateQuote({
            customerId: 'customer-id',
            lineItems: [
              {
                productId: 'web-dev-service',
                quantity: 40,
                customDescription: 'Custom e-commerce platform'
              }
            ],
            title: 'E-commerce Platform Development',
            description: 'Complete custom e-commerce solution'
          });
          \`\`\`

          ### Submitting for Approval
          \`\`\`tsx
          const approvedQuote = await salesService.submitQuoteForApproval(quote.id);
          \`\`\`

          ### Generating Contract
          \`\`\`tsx
          const contract = await salesService.generateContract(quote.id, {
            startDate: new Date('2025-02-01'),
            endDate: new Date('2025-05-01'),
            renewalType: 'automatic'
          });
          \`\`\`

          ## API Endpoints
          - \`POST /api/sales/quotes\` - Create quote
          - \`GET /api/sales/quotes/:id\` - Get quote details
          - \`PUT /api/sales/quotes/:id\` - Update quote
          - \`POST /api/sales/quotes/:id/submit\` - Submit for approval
          - \`POST /api/sales/contracts\` - Generate contract
          - \`GET /api/sales/contracts/:id\` - Get contract
          - \`POST /api/sales/invoices\` - Generate invoice
          - \`GET /api/sales/products\` - Get product catalog
          - \`GET /api/sales/analytics\` - Get sales analytics

          ## Pricing & Discounts
          The system supports flexible pricing models:
          - **Fixed Pricing**: One-time fees for products or services
          - **Hourly Billing**: Time-based pricing for professional services
          - **Subscription**: Monthly/annual recurring revenue
          - **Usage-Based**: Pricing based on consumption metrics

          ### Discount Types
          - Volume discounts for large orders
          - Loyalty discounts for repeat customers
          - Promotional discounts for marketing campaigns
          - Seasonal discounts for specific time periods

          ## Approval Workflows
          Quotes are automatically routed based on value:
          - **Under \$10K**: Auto-approved for immediate processing
          - **\$10K - \$50K**: Requires sales manager approval
          - **Over \$50K**: Requires sales manager + finance director approval

          ## Revenue Recognition
          Automated revenue recognition supports multiple methods:
          - **Immediate**: Revenue recognized when invoice is sent
          - **Straight Line**: Revenue spread evenly over contract period
          - **Milestone**: Revenue recognized based on project milestones
          - **Percentage Complete**: Revenue based on project completion percentage

          ## Integration Points
          - **CRM Integration**: Customer data, opportunity tracking, sales activities
          - **Marketing Integration**: Campaign attribution and lead source tracking
          - **Support Integration**: Implementation planning and customer onboarding
          - **Accounting Integration**: Revenue recognition and financial reporting

          ## Security & Compliance
          - Role-based access control for sales operations
          - Audit logging for quote and contract activities
          - Digital signature compliance (e-signature ready)
          - Data encryption for sensitive customer information
          - Revenue recognition compliance (ASC 606, IFRS 15)

          ## Performance Considerations
          - Optimized quote generation with caching
          - Background processing for approval workflows
          - Efficient product catalog search and filtering
          - Real-time analytics dashboard updates
          - Scalable contract and invoice management
          \`;

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 92,
            message: "Sales Automation system generated successfully",
            estimatedTimeRemaining: 135
          });

        } catch (error) {
          console.error("Failed to generate Sales Automation components:", error);
          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 92,
            message: "Sales Automation generation failed, continuing without sales features",
            errors: [error instanceof Error ? error.message : "Unknown sales automation error"],
            estimatedTimeRemaining: 135
          });
        }
      }

      // Phase 7.9: Generate Marketing Automation components if requested
      let marketing: { [filename: string]: string } = {};
      if (finalOptions.includeMarketingAutomation) {
        this.updateProgress(applicationId, {
          stage: "integrating",
          progress: 93,
          message: "Generating Marketing Automation system...",
          currentComponent: "Marketing & Lead Generation",
          estimatedTimeRemaining: 130
        });

        try {
          // Generate marketing automation configuration
          marketing["marketingConfig.ts"] = `export const marketingConfiguration = {
            features: {
              multiChannelCampaigns: true,
              emailAutomation: true,
              leadGeneration: true,
              socialMediaManagement: true,
              analyticsAndROI: true,
              contentGeneration: true
            },
            settings: {
              defaultFromEmail: 'marketing@company.com',
              defaultFromName: 'Marketing Team',
              unsubscribeLinkRequired: true,
              gdprCompliant: true,
              maxEmailsPerHour: 1000,
              maxEmailsPerDay: 10000
            },
            integrations: {
              emailProviders: ['sendgrid', 'ses'],
              socialPlatforms: ['linkedin', 'facebook', 'twitter'],
              analytics: ['google_analytics', 'mixpanel']
            }
          };

          export interface MarketingFeatures {
            multiChannelCampaigns: boolean;
            emailAutomation: boolean;
            leadGeneration: boolean;
            socialMediaManagement: boolean;
            analyticsAndROI: boolean;
            contentGeneration: boolean;
          }
          `;

          marketing["marketingService.ts"] = `import { marketingConfiguration } from './marketingConfig';

          class MarketingService {
            private baseUrl: string;

            constructor() {
              this.baseUrl = process.env.API_BASE_URL || '/api';
            }

            async createCampaign(campaignData: any) {
              const response = await fetch(\`\${this.baseUrl}/marketing/campaigns\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignData)
              });
              return response.json();
            }

            async getCampaign(campaignId: string) {
              const response = await fetch(\`\${this.baseUrl}/marketing/campaigns/\${campaignId}\`);
              return response.json();
            }

            async updateCampaign(campaignId: string, updates: any) {
              const response = await fetch(\`\${this.baseUrl}/marketing/campaigns/\${campaignId}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              return response.json();
            }

            async createEmailCampaign(emailData: any) {
              const response = await fetch(\`\${this.baseUrl}/marketing/email-campaigns\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData)
              });
              return response.json();
            }

            async createLeadCapture(captureData: any) {
              const response = await fetch(\`\${this.baseUrl}/marketing/lead-capture\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(captureData)
              });
              return response.json();
            }

            async createAudienceSegment(segmentData: any) {
              const response = await fetch(\`\${this.baseUrl}/marketing/audience-segments\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(segmentData)
              });
              return response.json();
            }

            async getMarketingAnalytics(startDate: string, endDate: string) {
              const response = await fetch(\`\${this.baseUrl}/marketing/analytics?startDate=\${startDate}&endDate=\${endDate}\`);
              return response.json();
            }

            async getCampaignPerformance(campaignId: string) {
              const response = await fetch(\`\${this.baseUrl}/marketing/campaigns/\${campaignId}/performance\`);
              return response.json();
            }
          }

          export const marketingService = new MarketingService();
          export default marketingService;
          `;

          marketing["marketingComponents.tsx"] = `import React, { useState, useEffect } from 'react';
          import { Button } from '@/components/ui/button';
          import { Input } from '@/components/ui/input';
          import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
          import { Badge } from '@/components/ui/badge';
          import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
          import {
            Mail,
            Users,
            BarChart3,
            Target,
            Plus,
            TrendingUp,
            Eye,
            MousePointer,
            DollarSign
          } from 'lucide-react';

          interface Campaign {
            id: string;
            name: string;
            status: 'draft' | 'scheduled' | 'active' | 'completed';
            type: 'email' | 'social' | 'multi_channel';
            sent: number;
            opened: number;
            clicked: number;
            converted: number;
            createdAt: string;
          }

          interface MarketingComponentsProps {
            className?: string;
          }

          export function MarketingComponents({ className = '' }: MarketingComponentsProps) {
            const [campaigns, setCampaigns] = useState<Campaign[]>([]);
            const [isLoading, setIsLoading] = useState(false);

            useEffect(() => {
              loadCampaigns();
            }, []);

            const loadCampaigns = async () => {
              setIsLoading(true);
              try {
                const response = await fetch('/api/marketing/campaigns');
                const data = await response.json();
                setCampaigns(data.campaigns || []);
              } catch (error) {
                console.error('Failed to load campaigns:', error);
              } finally {
                setIsLoading(false);
              }
            };

            const getStatusColor = (status: Campaign['status']) => {
              switch (status) {
                case 'draft': return 'text-yellow-600 bg-yellow-100';
                case 'scheduled': return 'text-blue-600 bg-blue-100';
                case 'active': return 'text-green-600 bg-green-100';
                case 'completed': return 'text-gray-600 bg-gray-100';
                default: return 'text-gray-600 bg-gray-100';
              }
            };

            const getTypeIcon = (type: Campaign['type']) => {
              switch (type) {
                case 'email': return <Mail className="h-4 w-4" />;
                case 'social': return <Users className="h-4 w-4" />;
                case 'multi_channel': return <Target className="h-4 w-4" />;
                default: return <Mail className="h-4 w-4" />;
              }
            };

            return (
              <div className={\`space-y-6 \${className}\}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Marketing Automation</h2>
                    <p className="text-muted-foreground">Create and manage multi-channel marketing campaigns</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Audience Segments
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Campaign
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="campaigns" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="social">Social Media</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="campaigns" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {campaigns.map((campaign) => (
                        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(campaign.type)}
                                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                              </div>
                              <Badge className={getStatusColor(campaign.status)} variant="secondary">
                                <span className="capitalize">{campaign.status}</span>
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sent:</span>
                                  <span className="font-medium">{campaign.sent.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Opened:</span>
                                  <span className="font-medium">{campaign.opened.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Clicked:</span>
                                  <span className="font-medium">{campaign.clicked.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Converted:</span>
                                  <span className="font-medium text-green-600">{campaign.converted.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button variant="outline" size="sm" className="flex-1">
                                  View
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1">
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1">
                                  Report
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {campaigns.length === 0 && !isLoading && (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Target className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                          <p className="text-muted-foreground text-center mb-4">
                            Start by creating your first marketing campaign
                          </p>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Campaign
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="email">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Email Campaigns</CardTitle>
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">24</div>
                          <p className="text-xs text-muted-foreground">+12% from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">34.2%</div>
                          <p className="text-xs text-muted-foreground">+2.1% from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                          <MousePointer className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">8.7%</div>
                          <p className="text-xs text-muted-foreground">+1.3% from last month</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="social">
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Social Media Management</h3>
                        <p className="text-muted-foreground text-center mb-4">
                          Schedule and manage social media posts across platforms
                        </p>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Schedule Post
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="analytics">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total ROI</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">3.2x</div>
                          <p className="text-xs text-muted-foreground">+0.5x from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">1,247</div>
                          <p className="text-xs text-muted-foreground">+18% from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Cost Per Lead</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">$23.50</div>
                          <p className="text-xs text-muted-foreground">-12% from last month</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">12.4%</div>
                          <p className="text-xs text-muted-foreground">+3.2% from last month</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            );
          }
          `;

          marketing["marketingIntegration.md"] = \`# Marketing Automation Integration Guide

          ## Overview
          This application includes comprehensive marketing automation with AI-powered content generation, multi-channel campaign management, and intelligent lead nurturing that seamlessly integrates with CRM and drives customer acquisition and retention.

          ## Features
          - **Multi-Channel Campaign Management**: Email, social media, content marketing, and paid advertising
          - **AI-Powered Content Generation**: Automated creation of marketing materials with brand consistency
          - **Email Marketing Automation**: Behavioral triggers, drip sequences, and customer journey workflows
          - **Lead Generation & Nurturing**: Landing pages, forms, lead scoring, and sales handoff automation
          - **Social Media Management**: Content scheduling, publishing, and engagement tracking
          - **Marketing Analytics & ROI**: Performance tracking, attribution, and optimization recommendations

          ## Configuration
          1. Marketing automation is automatically integrated into generated applications
          2. Configure email settings and deliverability in \`marketingConfig.ts\`
          3. Set up audience segments and targeting criteria
          4. Define automation rules and behavioral triggers
          5. Integrate with external platforms (SendGrid, LinkedIn, Facebook, etc.)

          ## Usage Examples

          ### Creating a Multi-Channel Campaign
          \`\`\`tsx
          import { marketingService } from './marketingService';

          const campaign = await marketingService.createCampaign({
            name: 'Product Launch Campaign',
            description: 'Launch our new business platform features',
            campaignType: 'multi_channel',
            channels: [
              { type: 'email', configuration: {} },
              { type: 'linkedin', configuration: {} }
            ],
            targetAudience: {
              id: 'segment_tech_companies',
              name: 'Technology Companies'
            },
            content: {
              subject: 'Introducing Revolutionary Business Platform Features',
              body: 'AI-powered content will be generated here...'
            },
            schedule: {
              startDate: new Date('2025-02-01'),
              frequency: 'once'
            }
          });
          \`\`\`

          ### Creating Email Campaign with Automation
          \`\`\`tsx
          const emailCampaign = await marketingService.createEmailCampaign({
            campaignId: campaign.id,
            templateId: 'product_launch_template',
            subject: 'Exclusive Early Access: New Platform Features',
            fromName: 'Marketing Team',
            fromEmail: 'marketing@company.com',
            recipients: [
              { email: 'customer@example.com', name: 'John Doe', customerId: '123' }
            ],
            personalization: {
              mergeFields: ['firstName', 'company'],
              dynamicContent: {}
            },
            schedule: {
              sendImmediately: false,
              scheduledTime: new Date('2025-02-01T10:00:00Z'),
              timezone: 'America/New_York'
            }
          });
          \`\`\`

          ### Creating Lead Capture Form
          \`\`\`tsx
          const leadCapture = await marketingService.createLeadCapture({
            name: 'Product Demo Request',
            type: 'landing_page',
            configuration: {
              fields: [
                { id: 'name', name: 'name', type: 'text', label: 'Full Name', required: true },
                { id: 'email', name: 'email', type: 'email', label: 'Email', required: true },
                { id: 'company', name: 'company', type: 'text', label: 'Company', required: true }
              ],
              styling: { theme: 'light' },
              behavior: { submitAction: 'redirect', redirectUrl: '/thank-you' }
            },
            conversionGoal: {
              type: 'demo_request',
              tracking: { crmIntegration: true }
            }
          });
          \`\`\`

          ## API Endpoints
          - \`POST /api/marketing/campaigns\` - Create marketing campaign
          - \`GET /api/marketing/campaigns/:id\` - Get campaign details
          - \`PUT /api/marketing/campaigns/:id\` - Update campaign
          - \`POST /api/marketing/email-campaigns\` - Create email campaign
          - \`POST /api/marketing/lead-capture\` - Create lead capture form
          - \`POST /api/marketing/audience-segments\` - Create audience segment
          - \`GET /api/marketing/analytics\` - Get marketing analytics
          - \`GET /api/marketing/campaigns/:id/performance\` - Get campaign performance

          ## Campaign Types
          - **Email Campaigns**: Professional email marketing with personalization and automation
          - **Social Media**: LinkedIn, Facebook, Twitter, Instagram content scheduling and management
          - **Content Marketing**: Blog posts, articles, and content distribution
          - **Webinar/Event**: Event marketing with registration and follow-up automation
          - **Paid Advertising**: Google Ads, Facebook Ads, LinkedIn Ads campaign management
          - **Multi-Channel**: Coordinated campaigns across multiple channels

          ## Email Marketing Features
          - **Template Library**: Professional email templates with customization
          - **Behavioral Automation**: Triggers based on opens, clicks, and customer actions
          - **Personalization**: Dynamic content using customer data and preferences
          - **Deliverability Management**: Reputation monitoring and compliance features
          - **A/B Testing**: Subject lines, content, and sending times optimization

          ## Lead Generation & Nurturing
          - **Landing Pages**: Conversion-optimized pages with form builders
          - **Lead Scoring**: Automatic qualification based on behavior and demographics
          - **Progressive Nurturing**: Automated sequences based on engagement level
          - **Sales Handoff**: Qualified lead transfer with complete context
          - **Form Analytics**: Conversion tracking and optimization insights

          ## Social Media Management
          - **Content Scheduling**: Plan and schedule posts across platforms
          - **Engagement Tracking**: Monitor likes, shares, comments, and clicks
          - **Social Listening**: Monitor brand mentions and sentiment
          - **Content Calendar**: Visual planning and approval workflows
          - **Performance Analytics**: Channel-specific metrics and ROI tracking

          ## Marketing Analytics
          - **Campaign Performance**: Real-time tracking of opens, clicks, conversions
          - **Multi-Channel Attribution**: Revenue attribution across all touchpoints
          - **ROI Calculation**: Marketing investment return analysis
          - **Funnel Analysis**: Conversion tracking and optimization opportunities
          - **Predictive Insights**: AI-powered recommendations for optimization

          ## Integration Points
          - **CRM Integration**: Lead management, customer segmentation, sales handoff
          - **Application Integration**: User behavior tracking for personalization
          - **Analytics Integration**: Performance tracking with business intelligence
          - **External Platforms**: Email providers, social media, advertising platforms

          ## Compliance & Best Practices
          - **GDPR Compliance**: Data protection and privacy regulation compliance
          - **CAN-SPAM Compliance**: Email marketing regulation adherence
          - **Brand Consistency**: AI-generated content maintains brand voice
          - **Deliverability Optimization**: Email reputation and inbox placement
          - **Data Security**: Marketing data encryption and access controls

          ## Performance Considerations
          - **Scalable Campaign Execution**: Handle large recipient lists efficiently
          - **Real-time Analytics**: Fast dashboard and reporting updates
          - **AI Content Generation**: Sub-60-second content creation
          - **Multi-channel Coordination**: Synchronized campaign execution
          - **Automated Optimization**: Continuous improvement through AI recommendations

          This marketing automation system transforms marketing operations by automating the entire customer acquisition and nurturing process while providing comprehensive analytics and optimization capabilities.
          \`;

          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 94,
            message: "Marketing Automation system generated successfully",
            estimatedTimeRemaining: 125
          });

        } catch (error) {
          console.error("Failed to generate Marketing Automation components:", error);
          this.updateProgress(applicationId, {
            stage: "integrating",
            progress: 94,
            message: "Marketing Automation generation failed, continuing without marketing features",
            errors: [error instanceof Error ? error.message : "Unknown marketing automation error"],
            estimatedTimeRemaining: 125
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
        message: "Integrating components, workflows, chatbots, voice AI, telephony, CRM, sales automation, and marketing...",
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
          crm,
          sales,
          marketing,
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
        crm,
        sales,
        marketing,
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