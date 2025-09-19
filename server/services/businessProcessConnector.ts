import { WorkflowContext } from "../engines/workflowExecutionEngine";
import { BusinessRequirement } from "../../shared/schema";

export interface ExternalServiceConfig {
  name: string;
  type: "email" | "sms" | "slack" | "webhook" | "database" | "api";
  endpoint: string;
  authentication: {
    type: "bearer" | "basic" | "api_key" | "oauth";
    credentials: Record<string, string>;
  };
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    retryableErrors: string[];
  };
  timeout: number; // milliseconds
}

export interface ServiceRequest {
  serviceId: string;
  action: string;
  data: Record<string, any>;
  context: WorkflowContext;
  priority: "low" | "medium" | "high" | "urgent";
  metadata?: Record<string, any>;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  executionTime: number;
  retryCount: number;
}

export interface NotificationService {
  sendEmail(to: string[], subject: string, message: string, priority?: "low" | "medium" | "high"): Promise<ServiceResponse>;
  sendSMS(to: string[], message: string): Promise<ServiceResponse>;
  sendSlack(channel: string, message: string, mentions?: string[]): Promise<ServiceResponse>;
  sendWebhook(url: string, payload: Record<string, any>): Promise<ServiceResponse>;
}

export interface ValidationService {
  validateBusinessData(data: Record<string, any>, rules: string[]): Promise<ServiceResponse>;
  checkCompliance(data: Record<string, any>, requirements: string[]): Promise<ServiceResponse>;
  performKYC(personalInfo: Record<string, any>): Promise<ServiceResponse>;
  validatePayment(paymentData: Record<string, any>): Promise<ServiceResponse>;
}

export interface IntegrationService {
  syncToERP(data: Record<string, any>): Promise<ServiceResponse>;
  updateCRM(customerData: Record<string, any>): Promise<ServiceResponse>;
  processPayment(paymentInfo: Record<string, any>): Promise<ServiceResponse>;
  generateDocument(template: string, data: Record<string, any>): Promise<ServiceResponse>;
}

/**
 * Business Process Connector handles external service integrations
 * for automated business processes
 */
export class BusinessProcessConnector {
  private services: Map<string, ExternalServiceConfig> = new Map();
  private requestQueue: ServiceRequest[] = [];
  private responseCache: Map<string, ServiceResponse> = new Map();
  
  // Service implementations
  private notificationService: NotificationService;
  private validationService: ValidationService;
  private integrationService: IntegrationService;

  constructor() {
    this.notificationService = new MockNotificationService();
    this.validationService = new MockValidationService();
    this.integrationService = new MockIntegrationService();
    
    // Initialize default services
    this.initializeDefaultServices();
    
    // Start request processor
    this.startRequestProcessor();
  }

  /**
   * Register external service configuration
   */
  registerService(config: ExternalServiceConfig): void {
    this.services.set(config.name, config);
    console.log(`Registered external service: ${config.name} (${config.type})`);
  }

  /**
   * Execute service request with retry logic
   */
  async executeServiceRequest(request: ServiceRequest): Promise<ServiceResponse> {
    const startTime = Date.now();
    const config = this.services.get(request.serviceId);
    
    if (!config) {
      return {
        success: false,
        error: `Service ${request.serviceId} not found`,
        executionTime: Date.now() - startTime,
        retryCount: 0
      };
    }

    // Check cache first
    const cacheKey = `${request.serviceId}_${request.action}_${JSON.stringify(request.data)}`;
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }

    let lastError: string = "";
    let retryCount = 0;

    while (retryCount <= config.retryPolicy.maxAttempts) {
      try {
        const response = await this.callExternalService(config, request);
        
        // Cache successful responses for 5 minutes
        if (response.success) {
          this.responseCache.set(cacheKey, response);
          setTimeout(() => this.responseCache.delete(cacheKey), 5 * 60 * 1000);
        }
        
        response.executionTime = Date.now() - startTime;
        response.retryCount = retryCount;
        
        return response;

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        retryCount++;

        if (retryCount <= config.retryPolicy.maxAttempts) {
          await this.delay(config.retryPolicy.backoffMs * retryCount);
        }
      }
    }

    return {
      success: false,
      error: `Service failed after ${retryCount} attempts: ${lastError}`,
      executionTime: Date.now() - startTime,
      retryCount
    };
  }

  /**
   * Send notification through configured service
   */
  async sendNotification(
    type: "email" | "sms" | "slack",
    recipients: string[],
    message: string,
    subject?: string,
    priority: "low" | "medium" | "high" = "medium"
  ): Promise<ServiceResponse> {
    try {
      switch (type) {
        case "email":
          return await this.notificationService.sendEmail(
            recipients, 
            subject || "Business Process Notification", 
            message, 
            priority
          );
        case "sms":
          return await this.notificationService.sendSMS(recipients, message);
        case "slack":
          return await this.notificationService.sendSlack(recipients[0], message, recipients.slice(1));
        default:
          return {
            success: false,
            error: `Unsupported notification type: ${type}`,
            executionTime: 0,
            retryCount: 0
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Notification failed",
        executionTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * Validate business data through external services
   */
  async validateBusinessData(
    data: Record<string, any>,
    validationType: "compliance" | "kyc" | "payment" | "general",
    rules: string[] = []
  ): Promise<ServiceResponse> {
    try {
      switch (validationType) {
        case "compliance":
          return await this.validationService.checkCompliance(data, rules);
        case "kyc":
          return await this.validationService.performKYC(data);
        case "payment":
          return await this.validationService.validatePayment(data);
        case "general":
        default:
          return await this.validationService.validateBusinessData(data, rules);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Validation failed",
        executionTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * Integrate with external business systems
   */
  async integrateWithExternalSystem(
    system: "erp" | "crm" | "payment" | "document",
    data: Record<string, any>,
    operation: string = "sync"
  ): Promise<ServiceResponse> {
    try {
      switch (system) {
        case "erp":
          return await this.integrationService.syncToERP(data);
        case "crm":
          return await this.integrationService.updateCRM(data);
        case "payment":
          return await this.integrationService.processPayment(data);
        case "document":
          return await this.integrationService.generateDocument(operation, data);
        default:
          return {
            success: false,
            error: `Unsupported system: ${system}`,
            executionTime: 0,
            retryCount: 0
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Integration failed",
        executionTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * Process workflow-triggered integrations
   */
  async processWorkflowIntegration(
    context: WorkflowContext,
    integrationType: string,
    integrationData: Record<string, any>
  ): Promise<ServiceResponse> {
    const request: ServiceRequest = {
      serviceId: integrationType,
      action: "process_workflow",
      data: {
        ...integrationData,
        workflowContext: context
      },
      context,
      priority: "medium",
      metadata: {
        triggeredBy: "workflow",
        executionId: context.executionId
      }
    };

    return await this.executeServiceRequest(request);
  }

  /**
   * Generate business process reports
   */
  async generateProcessReport(
    executionId: string,
    reportType: "summary" | "detailed" | "metrics",
    format: "pdf" | "excel" | "json" = "pdf"
  ): Promise<ServiceResponse> {
    try {
      const reportData = await this.getProcessData(executionId);
      
      return await this.integrationService.generateDocument(
        `${reportType}_report_${format}`,
        reportData
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Report generation failed",
        executionTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * Call external service
   */
  private async callExternalService(
    config: ExternalServiceConfig,
    request: ServiceRequest
  ): Promise<ServiceResponse> {
    // Mock implementation - in real system would make actual HTTP calls
    const mockDelay = Math.random() * 100 + 50; // 50-150ms
    await this.delay(mockDelay);

    // Simulate occasional failures for testing retry logic
    if (Math.random() < 0.1) {
      throw new Error("Simulated service failure");
    }

    return {
      success: true,
      data: {
        result: "Service call successful",
        requestId: `req_${Date.now()}`,
        service: config.name,
        action: request.action
      },
      executionTime: mockDelay,
      retryCount: 0
    };
  }

  /**
   * Get process data for reporting
   */
  private async getProcessData(executionId: string): Promise<Record<string, any>> {
    // Mock process data - in real system would fetch from database
    return {
      executionId,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: "completed",
      steps: [],
      metrics: {
        duration: 120000,
        efficiency: 0.85
      }
    };
  }

  /**
   * Initialize default services
   */
  private initializeDefaultServices(): void {
    // Email service configuration
    this.registerService({
      name: "email_service",
      type: "email",
      endpoint: "https://api.sendgrid.com/v3/mail/send",
      authentication: {
        type: "api_key",
        credentials: { apiKey: process.env.SENDGRID_API_KEY || "" }
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrors: ["timeout", "network"]
      },
      timeout: 10000
    });

    // SMS service configuration
    this.registerService({
      name: "sms_service",
      type: "sms",
      endpoint: "https://api.twilio.com/2010-04-01/Accounts",
      authentication: {
        type: "basic",
        credentials: {
          username: process.env.TWILIO_ACCOUNT_SID || "",
          password: process.env.TWILIO_AUTH_TOKEN || ""
        }
      },
      retryPolicy: {
        maxAttempts: 2,
        backoffMs: 2000,
        retryableErrors: ["timeout"]
      },
      timeout: 15000
    });

    // Webhook service configuration
    this.registerService({
      name: "webhook_service",
      type: "webhook",
      endpoint: "configurable",
      authentication: {
        type: "bearer",
        credentials: { token: "configurable" }
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrors: ["timeout", "5xx"]
      },
      timeout: 5000
    });
  }

  /**
   * Start request processor
   */
  private startRequestProcessor(): void {
    setInterval(() => {
      this.processRequestQueue();
    }, 1000); // Process every second
  }

  /**
   * Process request queue
   */
  private async processRequestQueue(): Promise<void> {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await this.executeServiceRequest(request);
        } catch (error) {
          console.error("Failed to process queued request:", error);
        }
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock implementation of notification service
 */
class MockNotificationService implements NotificationService {
  async sendEmail(to: string[], subject: string, message: string, priority = "medium"): Promise<ServiceResponse> {
    console.log(`[EMAIL - ${priority.toUpperCase()}] To: ${to.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    
    await this.delay(100);
    return {
      success: true,
      data: { messageId: `email_${Date.now()}`, recipients: to.length },
      executionTime: 100,
      retryCount: 0
    };
  }

  async sendSMS(to: string[], message: string): Promise<ServiceResponse> {
    console.log(`[SMS] To: ${to.join(", ")}`);
    console.log(`Message: ${message}`);
    
    await this.delay(200);
    return {
      success: true,
      data: { messageId: `sms_${Date.now()}`, recipients: to.length },
      executionTime: 200,
      retryCount: 0
    };
  }

  async sendSlack(channel: string, message: string, mentions = []): Promise<ServiceResponse> {
    const mentionText = mentions.length > 0 ? ` (${mentions.map(m => `@${m}`).join(", ")})` : "";
    console.log(`[SLACK] #${channel}${mentionText}: ${message}`);
    
    await this.delay(150);
    return {
      success: true,
      data: { messageId: `slack_${Date.now()}`, channel },
      executionTime: 150,
      retryCount: 0
    };
  }

  async sendWebhook(url: string, payload: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[WEBHOOK] ${url}:`, JSON.stringify(payload, null, 2));
    
    await this.delay(300);
    return {
      success: true,
      data: { webhookId: `webhook_${Date.now()}`, url },
      executionTime: 300,
      retryCount: 0
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock implementation of validation service
 */
class MockValidationService implements ValidationService {
  async validateBusinessData(data: Record<string, any>, rules: string[]): Promise<ServiceResponse> {
    console.log(`[VALIDATION] Validating data with ${rules.length} rules`);
    
    await this.delay(250);
    const isValid = Math.random() > 0.2; // 80% success rate
    
    return {
      success: isValid,
      data: {
        isValid,
        score: isValid ? 0.9 : 0.4,
        issues: isValid ? [] : ["Sample validation issue"],
        validatedFields: Object.keys(data).length
      },
      executionTime: 250,
      retryCount: 0
    };
  }

  async checkCompliance(data: Record<string, any>, requirements: string[]): Promise<ServiceResponse> {
    console.log(`[COMPLIANCE] Checking ${requirements.length} compliance requirements`);
    
    await this.delay(400);
    return {
      success: true,
      data: {
        compliant: true,
        score: 0.95,
        checkedRequirements: requirements.length
      },
      executionTime: 400,
      retryCount: 0
    };
  }

  async performKYC(personalInfo: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[KYC] Performing KYC validation`);
    
    await this.delay(2000);
    return {
      success: true,
      data: {
        kycPassed: true,
        riskScore: "low",
        verifiedFields: Object.keys(personalInfo)
      },
      executionTime: 2000,
      retryCount: 0
    };
  }

  async validatePayment(paymentData: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[PAYMENT] Validating payment data`);
    
    await this.delay(500);
    return {
      success: true,
      data: {
        valid: true,
        fraudScore: 0.1,
        paymentMethod: paymentData.method || "unknown"
      },
      executionTime: 500,
      retryCount: 0
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock implementation of integration service
 */
class MockIntegrationService implements IntegrationService {
  async syncToERP(data: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[ERP] Syncing data to ERP system`);
    
    await this.delay(1000);
    return {
      success: true,
      data: {
        erpRecordId: `erp_${Date.now()}`,
        syncedFields: Object.keys(data).length,
        status: "synchronized"
      },
      executionTime: 1000,
      retryCount: 0
    };
  }

  async updateCRM(customerData: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[CRM] Updating customer data in CRM`);
    
    await this.delay(750);
    return {
      success: true,
      data: {
        customerId: customerData.customerId || `customer_${Date.now()}`,
        updatedFields: Object.keys(customerData).length,
        status: "updated"
      },
      executionTime: 750,
      retryCount: 0
    };
  }

  async processPayment(paymentInfo: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[PAYMENT] Processing payment`);
    
    await this.delay(1500);
    return {
      success: true,
      data: {
        transactionId: `txn_${Date.now()}`,
        amount: paymentInfo.amount || 0,
        status: "processed",
        confirmationCode: `conf_${Date.now()}`
      },
      executionTime: 1500,
      retryCount: 0
    };
  }

  async generateDocument(template: string, data: Record<string, any>): Promise<ServiceResponse> {
    console.log(`[DOCUMENT] Generating document from template: ${template}`);
    
    await this.delay(2000);
    return {
      success: true,
      data: {
        documentId: `doc_${Date.now()}`,
        template,
        format: "pdf",
        url: `https://docs.example.com/doc_${Date.now()}.pdf`,
        size: Math.floor(Math.random() * 1000000) + 100000 // Random size in bytes
      },
      executionTime: 2000,
      retryCount: 0
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}