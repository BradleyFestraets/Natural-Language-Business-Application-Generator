/**
 * Template Generation Service - Epic 5: Story 5.2
 * 
 * Converts generated business applications into reusable templates with:
 * - Template extraction and pattern recognition
 * - Customization point identification  
 * - Template metadata generation
 * - Rapid deployment capabilities
 * - Template versioning and management
 */

// Template Generation Service - Mock interfaces for initial implementation

// Mock application interface for template generation
interface MockGeneratedApplication {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  status: string;
  workflowConfiguration?: any;
  formConfiguration?: any;
  integrationConfiguration?: any;
  chatbotConfiguration?: any;
}

// Mock business requirement interface
interface MockBusinessRequirement {
  id: string;
  description?: string;
  organizationId: string;
  extractedEntities?: {
    businessContext?: {
      industry?: string;
      criticality?: string;
      scope?: string;
      complianceRequirements?: string[];
    };
    processes?: Array<{
      name: string;
      type?: string;
      description?: string;
      complexity?: string;
      dependencies?: string[];
    }>;
    forms?: Array<{
      name: string;
      purpose?: string;
      complexity?: string;
      dataTypes?: string[];
      validationRules?: string[];
    }>;
    approvals?: Array<{
      name: string;
      role?: string;
      criteria?: string;
      escalation?: boolean;
      timeLimit?: number;
    }>;
    integrations?: Array<{
      name: string;
      type?: string;
    }>;
  };
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  version: string;
  
  // Core template structure
  extractedPatterns: ExtractedPattern[];
  customizationPoints: CustomizationPoint[];
  requiredIntegrations: string[];
  
  // Metadata
  metadata: TemplateMetadata;
  deploymentConfiguration: DeploymentConfiguration;
  
  // Source tracking
  sourceApplicationId?: string;
  organizationId: string; // REQUIRED for multi-tenant organization scoping
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedPattern {
  id: string;
  type: PatternType;
  name: string;
  description: string;
  configuration: Record<string, any>;
  dependencies: string[];
}

export interface CustomizationPoint {
  id: string;
  name: string;
  description: string;
  type: CustomizationType;
  defaultValue: any;
  validationRules: ValidationRule[];
  isRequired: boolean;
  category: string;
}

export interface TemplateMetadata {
  industry: string[];
  businessProcesses: string[];
  complexity: "simple" | "moderate" | "complex";
  estimatedDeploymentTime: number; // minutes
  targetUsers: string[];
  tags: string[];
  previewImages?: string[];
  documentation?: string;
}

export interface DeploymentConfiguration {
  environment: "development" | "staging" | "production";
  scalingConfig: {
    minInstances: number;
    maxInstances: number;
    autoScale: boolean;
  };
  databaseConfig: {
    tables: string[];
    relationships: string[];
    seedData?: Record<string, any[]>;
  };
  integrationConfig: {
    required: string[];
    optional: string[];
    apiKeys: string[];
  };
}

export type TemplateCategory = 
  | "workflow_automation"
  | "business_process"
  | "data_management" 
  | "customer_management"
  | "reporting_analytics"
  | "collaboration"
  | "custom";

export type PatternType = 
  | "workflow_pattern"
  | "form_pattern" 
  | "approval_pattern"
  | "integration_pattern"
  | "ui_pattern"
  | "data_pattern";

export type CustomizationType = 
  | "text"
  | "number" 
  | "boolean"
  | "select"
  | "multi_select"
  | "color"
  | "integration_config";

export interface ValidationRule {
  type: "required" | "minLength" | "maxLength" | "pattern" | "range" | "custom";
  value?: any;
  message: string;
}

export interface TemplateDeploymentRequest {
  templateId: string;
  organizationId: string;
  applicationName: string;
  customizations: Record<string, any>;
  configuration: {
    environment: "development" | "staging" | "production";
    enableAI: boolean;
    integrations: string[];
  };
}

export interface TemplateDeploymentResult {
  deploymentId: string;
  applicationId: string;
  status: "initializing" | "configuring" | "deploying" | "completed" | "failed";
  progress: number;
  estimatedCompletion: string;
  deployedUrl?: string;
  error?: string;
}

/**
 * Template Generation Service
 * Handles template creation, management, and deployment
 */
export class TemplateGenerationService {
  private templateCache = new Map<string, TemplateDefinition>();

  constructor() {
    console.log("[TEMPLATE_SERVICE] Template Generation Service initialized");
  }

  /**
   * Convert an existing generated application into a reusable template
   */
  async generateTemplate(
    application: MockGeneratedApplication,
    businessRequirement?: MockBusinessRequirement,
    options: {
      includeCustomizations?: boolean;
      generateDocumentation?: boolean;
      extractAdvancedPatterns?: boolean;
    } = {}
  ): Promise<TemplateDefinition> {
    console.log(`[TEMPLATE_GEN] Generating template from application: ${application.id}`);

    // Analyze application structure and extract patterns
    const extractedPatterns = await this.extractApplicationPatterns(application, businessRequirement);
    
    // Identify customization points
    const customizationPoints = await this.identifyCustomizationPoints(application, businessRequirement);
    
    // Generate metadata from business context
    const metadata = await this.generateTemplateMetadata(application, businessRequirement);
    
    // Create deployment configuration
    const deploymentConfiguration = await this.createDeploymentConfiguration(application);

    const template: TemplateDefinition = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateTemplateName(application, businessRequirement),
      description: this.generateTemplateDescription(application, businessRequirement),
      category: this.categorizeTemplate(application, businessRequirement),
      version: "1.0.0",
      
      extractedPatterns,
      customizationPoints,
      requiredIntegrations: this.extractRequiredIntegrations(application),
      
      metadata,
      deploymentConfiguration,
      
      sourceApplicationId: application.id,
      organizationId: application.organizationId, // Set organization for multi-tenant scoping
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Cache the template
    this.templateCache.set(template.id, template);
    
    console.log(`[TEMPLATE_GEN] Template generated successfully: ${template.id}`);
    return template;
  }

  /**
   * Deploy a template to create a new application instance
   */
  async deployTemplate(request: TemplateDeploymentRequest): Promise<TemplateDeploymentResult> {
    console.log(`[TEMPLATE_DEPLOY] Deploying template: ${request.templateId}`);

    const template = this.templateCache.get(request.templateId);
    if (!template) {
      throw new Error(`Template not found: ${request.templateId}`);
    }

    // Validate customizations against template schema
    await this.validateCustomizations(template, request.customizations);

    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize deployment result
    const result: TemplateDeploymentResult = {
      deploymentId,
      applicationId: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "initializing",
      progress: 0,
      estimatedCompletion: new Date(Date.now() + template.metadata.estimatedDeploymentTime * 60 * 1000).toISOString()
    };

    // Start asynchronous deployment process
    this.executeTemplateDeployment(template, request, result);
    
    return result;
  }

  /**
   * Get available templates with filtering and search
   */
  async getAvailableTemplates(filters: {
    category?: TemplateCategory;
    industry?: string;
    complexity?: string;
    search?: string;
    organizationId: string; // REQUIRED for security - prevents cross-tenant exposure
  }): Promise<TemplateDefinition[]> {
    console.log(`[TEMPLATE_CATALOG] Retrieving templates with filters:`, filters);

    let templates = Array.from(this.templateCache.values());
    
    // Apply organization scoping (REQUIRED for security - NO optional filtering)
    if (!filters.organizationId) {
      throw new Error("organizationId is required for template retrieval - prevents cross-tenant data exposure");
    }
    templates = templates.filter(t => t.organizationId === filters.organizationId);
    
    // Apply filters
    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }
    
    if (filters.industry) {
      templates = templates.filter(t => 
        t.metadata.industry.some(ind => 
          ind.toLowerCase().includes(filters.industry!.toLowerCase())
        )
      );
    }
    
    if (filters.complexity) {
      templates = templates.filter(t => t.metadata.complexity === filters.complexity);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get template by ID with full details
   */
  async getTemplateById(templateId: string): Promise<TemplateDefinition | null> {
    console.log(`[TEMPLATE_CATALOG] Retrieving template: ${templateId}`);
    return this.templateCache.get(templateId) || null;
  }

  /**
   * Update template metadata and configuration
   */
  async updateTemplate(templateId: string, updates: Partial<TemplateDefinition>): Promise<TemplateDefinition> {
    console.log(`[TEMPLATE_UPDATE] Updating template: ${templateId}`);

    const template = this.templateCache.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templateCache.set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  // Private methods for template generation logic

  private async extractApplicationPatterns(
    application: MockGeneratedApplication, 
    businessRequirement?: MockBusinessRequirement
  ): Promise<ExtractedPattern[]> {
    const patterns: ExtractedPattern[] = [];

    // Extract workflow patterns
    if (application.workflowConfiguration) {
      patterns.push({
        id: "workflow_main",
        type: "workflow_pattern",
        name: "Primary Workflow",
        description: "Main business process workflow",
        configuration: application.workflowConfiguration,
        dependencies: []
      });
    }

    // Extract form patterns
    if (application.formConfiguration && application.formConfiguration.forms.length > 0) {
      application.formConfiguration.forms.forEach((form, index) => {
        patterns.push({
          id: `form_${index}`,
          type: "form_pattern", 
          name: form.name || `Form ${index + 1}`,
          description: form.description || "Data collection form",
          configuration: form,
          dependencies: []
        });
      });
    }

    // Extract integration patterns
    if (application.integrationConfiguration) {
      patterns.push({
        id: "integrations_main",
        type: "integration_pattern",
        name: "External Integrations", 
        description: "Third-party service integrations",
        configuration: application.integrationConfiguration,
        dependencies: []
      });
    }

    return patterns;
  }

  private async identifyCustomizationPoints(
    application: MockGeneratedApplication,
    businessRequirement?: MockBusinessRequirement  
  ): Promise<CustomizationPoint[]> {
    const customizations: CustomizationPoint[] = [];

    // Application name customization
    customizations.push({
      id: "app_name",
      name: "Application Name",
      description: "The display name for your application",
      type: "text",
      defaultValue: application.name,
      validationRules: [
        { type: "required", message: "Application name is required" },
        { type: "minLength", value: 3, message: "Name must be at least 3 characters" }
      ],
      isRequired: true,
      category: "General"
    });

    // Color scheme customization
    customizations.push({
      id: "primary_color",
      name: "Primary Color",
      description: "Main brand color for the application",
      type: "color",
      defaultValue: "#0ea5e9",
      validationRules: [],
      isRequired: false,
      category: "Branding"
    });

    // Business logic customizations based on workflow
    if (application.workflowConfiguration?.steps) {
      customizations.push({
        id: "approval_levels",
        name: "Approval Levels",
        description: "Number of approval steps required",
        type: "number",
        defaultValue: application.workflowConfiguration.steps.length,
        validationRules: [
          { type: "range", value: [1, 10], message: "Must be between 1 and 10 levels" }
        ],
        isRequired: true,
        category: "Workflow"
      });
    }

    return customizations;
  }

  private async generateTemplateMetadata(
    application: MockGeneratedApplication,
    businessRequirement?: MockBusinessRequirement
  ): Promise<TemplateMetadata> {
    const industries = businessRequirement?.extractedEntities?.businessContext?.industry 
      ? [businessRequirement.extractedEntities.businessContext.industry]
      : ["general"];

    const businessProcesses = businessRequirement?.extractedEntities?.processes?.map(p => p.name) || [];
    
    const complexity = this.assessTemplateComplexity(application);
    
    return {
      industry: industries,
      businessProcesses,
      complexity,
      estimatedDeploymentTime: this.calculateDeploymentTime(application),
      targetUsers: ["business_users", "managers", "administrators"],
      tags: this.generateTemplateTags(application, businessRequirement),
      documentation: this.generateTemplateDocumentation(application, businessRequirement)
    };
  }

  private async createDeploymentConfiguration(application: MockGeneratedApplication): Promise<DeploymentConfiguration> {
    return {
      environment: "development",
      scalingConfig: {
        minInstances: 1,
        maxInstances: 3,
        autoScale: true
      },
      databaseConfig: {
        tables: this.extractDatabaseTables(application),
        relationships: [],
        seedData: {}
      },
      integrationConfig: {
        required: this.extractRequiredIntegrations(application),
        optional: [],
        apiKeys: []
      }
    };
  }

  private async executeTemplateDeployment(
    template: TemplateDefinition,
    request: TemplateDeploymentRequest,
    result: TemplateDeploymentResult
  ): Promise<void> {
    // Simulate deployment progress
    const progressUpdates = [
      { status: "configuring" as const, progress: 20 },
      { status: "deploying" as const, progress: 60 },
      { status: "completed" as const, progress: 100 }
    ];

    for (const update of progressUpdates) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      result.status = update.status;
      result.progress = update.progress;
      
      if (update.status === "completed") {
        result.deployedUrl = `https://app-${result.applicationId}.replit.app`;
      }
    }
  }

  private async validateCustomizations(template: TemplateDefinition, customizations: Record<string, any>): Promise<void> {
    for (const point of template.customizationPoints) {
      const value = customizations[point.id];
      
      if (point.isRequired && (value === undefined || value === null || value === "")) {
        throw new Error(`Required customization missing: ${point.name}`);
      }
      
      // Apply validation rules
      for (const rule of point.validationRules) {
        if (!this.validateRule(value, rule)) {
          throw new Error(`Validation failed for ${point.name}: ${rule.message}`);
        }
      }
    }
  }

  private validateRule(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case "required":
        return value !== undefined && value !== null && value !== "";
      case "minLength":
        return typeof value === "string" && value.length >= rule.value;
      case "maxLength":
        return typeof value === "string" && value.length <= rule.value;
      case "range":
        return typeof value === "number" && value >= rule.value[0] && value <= rule.value[1];
      default:
        return true;
    }
  }

  // Utility methods

  private generateTemplateName(application: MockGeneratedApplication, businessRequirement?: MockBusinessRequirement): string {
    const baseName = application.name || "Business Application";
    return `${baseName} Template`;
  }

  private generateTemplateDescription(application: MockGeneratedApplication, businessRequirement?: MockBusinessRequirement): string {
    const baseDescription = application.description || "A customizable business application template";
    const processCount = businessRequirement?.extractedEntities?.processes?.length || 0;
    const formCount = application.formConfiguration?.forms?.length || 0;
    
    return `${baseDescription} featuring ${processCount} business processes and ${formCount} interactive forms. Fully customizable for your organization's needs.`;
  }

  private categorizeTemplate(application: MockGeneratedApplication, businessRequirement?: MockBusinessRequirement): TemplateCategory {
    const description = (application.description || "").toLowerCase();
    const requirement = (businessRequirement?.description || "").toLowerCase();
    
    if (description.includes("workflow") || requirement.includes("workflow")) {
      return "workflow_automation";
    }
    if (description.includes("customer") || requirement.includes("customer")) {
      return "customer_management";
    }
    if (description.includes("data") || requirement.includes("data")) {
      return "data_management";  
    }
    if (description.includes("report") || requirement.includes("report")) {
      return "reporting_analytics";
    }
    
    return "business_process";
  }

  private assessTemplateComplexity(application: MockGeneratedApplication): "simple" | "moderate" | "complex" {
    let complexityScore = 0;
    
    // Factor in workflow complexity
    if (application.workflowConfiguration?.steps) {
      complexityScore += application.workflowConfiguration.steps.length * 2;
    }
    
    // Factor in form complexity
    if (application.formConfiguration?.forms) {
      complexityScore += application.formConfiguration.forms.length * 3;
    }
    
    // Factor in integration complexity
    if (application.integrationConfiguration?.externalServices) {
      complexityScore += application.integrationConfiguration.externalServices.length * 4;
    }
    
    if (complexityScore <= 10) return "simple";
    if (complexityScore <= 25) return "moderate";
    return "complex";
  }

  private calculateDeploymentTime(application: MockGeneratedApplication): number {
    const baseTime = 5; // 5 minutes base
    let additionalTime = 0;
    
    if (application.workflowConfiguration?.steps) {
      additionalTime += application.workflowConfiguration.steps.length * 2;
    }
    
    if (application.formConfiguration?.forms) {
      additionalTime += application.formConfiguration.forms.length * 1;
    }
    
    return Math.min(baseTime + additionalTime, 30); // Max 30 minutes
  }

  private generateTemplateTags(application: MockGeneratedApplication, businessRequirement?: MockBusinessRequirement): string[] {
    const tags: string[] = [];
    
    // Add category-based tags
    if (application.workflowConfiguration) tags.push("workflow");
    if (application.formConfiguration) tags.push("forms");
    if (application.integrationConfiguration) tags.push("integrations");
    
    // Add business context tags
    if (businessRequirement?.extractedEntities?.businessContext?.industry) {
      tags.push(businessRequirement.extractedEntities.businessContext.industry);
    }
    
    // Add process-based tags
    businessRequirement?.extractedEntities?.processes?.forEach(process => {
      if (process.name) tags.push(process.name.toLowerCase().replace(/\s+/g, "_"));
    });
    
    return Array.from(new Set(tags)); // Remove duplicates
  }

  private generateTemplateDocumentation(application: MockGeneratedApplication, businessRequirement?: MockBusinessRequirement): string {
    return `
# ${application.name} Template

## Overview
${application.description || "A comprehensive business application template"}

## Key Features
${application.workflowConfiguration ? "- Advanced workflow automation" : ""}
${application.formConfiguration ? "- Interactive data collection forms" : ""}
${application.integrationConfiguration ? "- External service integrations" : ""}
${application.chatbotConfiguration ? "- AI-powered assistance" : ""}

## Customization Points
This template can be customized to fit your specific business needs including:
- Application branding and colors
- Workflow processes and approval levels
- Form fields and validation rules
- Integration configurations

## Deployment
Estimated deployment time: ${this.calculateDeploymentTime(application)} minutes
Complexity level: ${this.assessTemplateComplexity(application)}
    `.trim();
  }

  private extractRequiredIntegrations(application: MockGeneratedApplication): string[] {
    const integrations: string[] = [];
    
    if (application.integrationConfiguration?.externalServices) {
      integrations.push(...application.integrationConfiguration.externalServices);
    }
    
    // Add common integrations
    if (application.chatbotConfiguration) {
      integrations.push("openai");
    }
    
    return Array.from(new Set(integrations));
  }

  private extractDatabaseTables(application: MockGeneratedApplication): string[] {
    const tables: string[] = [];
    
    // Extract from form configuration
    if (application.formConfiguration?.forms) {
      application.formConfiguration.forms.forEach(form => {
        if (form.name) {
          tables.push(form.name.toLowerCase().replace(/\s+/g, "_"));
        }
      });
    }
    
    // Add standard application tables
    tables.push("users", "organizations", "audit_logs");
    
    return Array.from(new Set(tables));
  }
}

// Export singleton instance
export const templateGenerationService = new TemplateGenerationService();