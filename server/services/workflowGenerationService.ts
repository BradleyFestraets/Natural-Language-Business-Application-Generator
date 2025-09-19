import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement } from "@shared/schema";
import { WebSocket } from "ws";

export interface WorkflowStep {
  id: string;
  name: string;
  type: "manual" | "automated" | "approval" | "integration" | "condition";
  description: string;
  assigneeRoles: string[];
  requiredFields: string[];
  validation?: WorkflowValidation;
  conditions?: WorkflowCondition[];
  notifications?: WorkflowNotification[];
  slaHours?: number;
  escalationRules?: EscalationRule[];
  outputs?: string[];
}

export interface WorkflowValidation {
  rules: { field: string; rule: string; message: string }[];
  externalService?: {
    endpoint: string;
    method: "GET" | "POST";
    headers?: Record<string, string>;
  };
}

export interface WorkflowCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
  value: any;
  nextStep?: string;
  elseStep?: string;
}

export interface WorkflowNotification {
  type: "email" | "sms" | "in_app";
  trigger: "step_start" | "step_complete" | "overdue" | "escalation";
  recipients: ("assignee" | "creator" | "manager")[];
  template: string;
  delay?: number; // minutes
}

export interface EscalationRule {
  afterHours: number;
  escalateTo: string[]; // role names
  notification: WorkflowNotification;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  type: "sequential" | "parallel" | "conditional" | "approval_chain";
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  metadata: {
    estimatedDuration: number; // hours
    complexity: "simple" | "medium" | "complex";
    category: string;
    tags: string[];
  };
}

export interface WorkflowTrigger {
  event: "form_submit" | "approval_granted" | "timer" | "external_event";
  conditions?: WorkflowCondition[];
  startStep: string;
}

export interface GeneratedWorkflowSystem {
  workflows: WorkflowPattern[];
  rolePermissions: { [role: string]: string[] };
  integrations: { [service: string]: any };
  uiComponents: { [componentName: string]: string };
  documentation: string;
}

export interface WorkflowGenerationOptions {
  includeApprovals?: boolean;
  includeNotifications?: boolean;
  includeExternalIntegrations?: boolean;
  generateUI?: boolean;
  complexity?: "simple" | "advanced";
  targetRoles?: string[];
}

export class WorkflowGenerationService {
  private openai: OpenAI;
  private activeGenerations: Map<string, WebSocket[]> = new Map();

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
   * Generate complete workflow system from business requirements
   */
  async generateWorkflowSystem(
    businessRequirement: BusinessRequirement,
    options: WorkflowGenerationOptions = {}
  ): Promise<GeneratedWorkflowSystem> {
    const finalOptions = {
      includeApprovals: true,
      includeNotifications: true,
      includeExternalIntegrations: true,
      generateUI: true,
      complexity: "advanced" as const,
      targetRoles: ["manager", "employee", "admin"],
      ...options
    };

    try {
      // Extract workflow patterns from business requirements
      const workflowPatterns = await this.extractWorkflowPatterns(businessRequirement, finalOptions);
      
      // Generate role-based permissions for workflows
      const rolePermissions = await this.generateRolePermissions(workflowPatterns, finalOptions);
      
      // Generate external integrations if requested
      const integrations = finalOptions.includeExternalIntegrations
        ? await this.generateWorkflowIntegrations(businessRequirement, workflowPatterns)
        : {};
        
      // Generate UI components if requested
      const uiComponents = finalOptions.generateUI
        ? await this.generateWorkflowUI(workflowPatterns, finalOptions)
        : {};
        
      // Generate comprehensive documentation
      const documentation = await this.generateWorkflowDocumentation(
        workflowPatterns,
        rolePermissions,
        integrations
      );

      return {
        workflows: workflowPatterns,
        rolePermissions,
        integrations,
        uiComponents,
        documentation
      };

    } catch (error) {
      throw new Error(`Failed to generate workflow system: ${error}`);
    }
  }

  /**
   * Extract and generate workflow patterns from business requirements
   */
  private async extractWorkflowPatterns(
    businessRequirement: BusinessRequirement,
    options: WorkflowGenerationOptions
  ): Promise<WorkflowPattern[]> {
    if (!isAIServiceAvailable() || !this.openai) {
      return this.generateFallbackWorkflows(businessRequirement);
    }

    const workflowPrompt = `Analyze the business requirement and generate comprehensive workflow patterns:

Business Description: ${businessRequirement.originalDescription}
Extracted Processes: ${JSON.stringify(businessRequirement.extractedEntities?.processes || [], null, 2)}
Workflow Patterns: ${businessRequirement.workflowPatterns?.join(", ") || "None specified"}
Target Complexity: ${options.complexity}

Generate workflows that include:
1. Sequential workflows for step-by-step processes
2. Parallel workflows for concurrent tasks
3. Conditional workflows with branching logic
4. Approval chains with role-based routing
5. Automated notifications and reminders
6. External service integration points
7. Escalation rules and SLA management
8. Comprehensive audit trails

Create workflows that are:
- Enterprise-ready with proper error handling
- Role-based with proper permission controls
- Scalable with performance considerations
- User-friendly with clear progress indicators

Focus on real business value and practical implementation.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.getWorkflowGenerationSystemPrompt() },
          { role: "user", content: workflowPrompt }
        ],
        functions: [this.getWorkflowPatternFunctionSchema()],
        function_call: { name: "generate_workflow_patterns" },
        temperature: 0.3,
        max_tokens: 4000
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        return this.generateFallbackWorkflows(businessRequirement);
      }

      const parsedWorkflows = JSON.parse(functionCall.arguments);
      return this.enhanceWorkflowPatterns(parsedWorkflows.workflows, businessRequirement, options);

    } catch (error) {
      console.error("Failed to generate AI workflows, using fallback:", error);
      return this.generateFallbackWorkflows(businessRequirement);
    }
  }

  /**
   * Generate fallback workflows when AI is unavailable
   */
  private generateFallbackWorkflows(businessRequirement: BusinessRequirement): WorkflowPattern[] {
    const processes = businessRequirement.extractedEntities?.processes || [];
    const workflows: WorkflowPattern[] = [];

    // Generate a basic approval workflow
    workflows.push({
      id: "approval-workflow-001",
      name: "Standard Approval Process",
      description: "Basic approval workflow with manager review",
      type: "approval_chain",
      steps: [
        {
          id: "submit",
          name: "Submit Request",
          type: "manual",
          description: "Employee submits initial request",
          assigneeRoles: ["employee"],
          requiredFields: ["title", "description", "justification"],
          slaHours: 1,
          outputs: ["request_id", "submission_timestamp"]
        },
        {
          id: "manager_review",
          name: "Manager Review",
          type: "approval",
          description: "Manager reviews and approves/rejects request",
          assigneeRoles: ["manager"],
          requiredFields: ["decision", "comments"],
          slaHours: 24,
          escalationRules: [{
            afterHours: 48,
            escalateTo: ["senior_manager"],
            notification: {
              type: "email",
              trigger: "escalation",
              recipients: ["manager"],
              template: "Request requires immediate attention"
            }
          }],
          outputs: ["approval_status", "manager_comments"]
        },
        {
          id: "processing",
          name: "Process Request",
          type: "automated",
          description: "Automated processing of approved request",
          assigneeRoles: ["system"],
          requiredFields: [],
          slaHours: 2,
          outputs: ["processing_result", "completion_timestamp"]
        }
      ],
      triggers: [{
        event: "form_submit",
        startStep: "submit"
      }],
      metadata: {
        estimatedDuration: 72,
        complexity: "medium",
        category: "approval",
        tags: ["standard", "approval", "management"]
      }
    });

    // Generate process-specific workflows
    processes.forEach((process, index) => {
      const processName = typeof process === 'string' ? process : process.name;
      workflows.push({
        id: `process-workflow-${String(index + 1).padStart(3, '0')}`,
        name: `${processName} Workflow`,
        description: `Automated workflow for ${processName}`,
        type: "sequential",
        steps: [
          {
            id: "initiate",
            name: "Initiate Process",
            type: "manual",
            description: `Start ${processName} process`,
            assigneeRoles: ["employee"],
            requiredFields: ["process_data"],
            slaHours: 4,
            outputs: ["process_id"]
          },
          {
            id: "execute",
            name: "Execute Process",
            type: "automated",
            description: `Execute ${processName} logic`,
            assigneeRoles: ["system"],
            requiredFields: [],
            slaHours: 8,
            outputs: ["execution_result"]
          },
          {
            id: "complete",
            name: "Complete Process",
            type: "manual",
            description: `Complete ${processName} and notify stakeholders`,
            assigneeRoles: ["employee", "manager"],
            requiredFields: ["completion_notes"],
            slaHours: 2,
            outputs: ["completion_status"]
          }
        ],
        triggers: [{
          event: "form_submit",
          startStep: "initiate"
        }],
        metadata: {
          estimatedDuration: 14,
          complexity: "medium",
          category: "process",
          tags: ["automated", "business_process"]
        }
      });
    });

    return workflows;
  }

  /**
   * Enhance workflow patterns with business-specific logic
   */
  private enhanceWorkflowPatterns(
    workflows: WorkflowPattern[],
    businessRequirement: BusinessRequirement,
    options: WorkflowGenerationOptions
  ): WorkflowPattern[] {
    return workflows.map(workflow => {
      // Add notifications if requested
      if (options.includeNotifications) {
        workflow.steps = workflow.steps.map(step => ({
          ...step,
          notifications: step.notifications || [
            {
              type: "email",
              trigger: "step_start",
              recipients: ["assignee"],
              template: `New task assigned: ${step.name}`
            },
            {
              type: "email",
              trigger: "overdue",
              recipients: ["assignee", "manager"],
              template: `Task overdue: ${step.name}`,
              delay: (step.slaHours || 24) * 60
            }
          ]
        }));
      }

      // Add approval steps if requested
      if (options.includeApprovals && workflow.type !== "approval_chain") {
        const approvalStep: WorkflowStep = {
          id: `${workflow.id}-approval`,
          name: "Approval Required",
          type: "approval",
          description: "Manager approval required",
          assigneeRoles: ["manager"],
          requiredFields: ["approval_decision"],
          slaHours: 24,
          outputs: ["approval_status"]
        };
        workflow.steps.splice(-1, 0, approvalStep);
      }

      return workflow;
    });
  }

  /**
   * Generate role-based permissions for workflows
   */
  private async generateRolePermissions(
    workflows: WorkflowPattern[],
    options: WorkflowGenerationOptions
  ): Promise<{ [role: string]: string[] }> {
    const permissions: { [role: string]: string[] } = {};
    
    // Standard role permissions
    permissions["admin"] = [
      "workflow.create", "workflow.edit", "workflow.delete", "workflow.view_all",
      "workflow.assign", "workflow.reassign", "workflow.escalate", "workflow.override"
    ];
    
    permissions["manager"] = [
      "workflow.view", "workflow.approve", "workflow.reject", "workflow.assign",
      "workflow.view_team", "workflow.escalate"
    ];
    
    permissions["employee"] = [
      "workflow.view_own", "workflow.submit", "workflow.update_own"
    ];
    
    permissions["viewer"] = [
      "workflow.view_own"
    ];

    // Add workflow-specific permissions
    workflows.forEach(workflow => {
      workflow.steps.forEach(step => {
        step.assigneeRoles.forEach(role => {
          if (!permissions[role]) {
            permissions[role] = [];
          }
          permissions[role].push(`workflow.${workflow.id}.${step.id}`);
        });
      });
    });

    return permissions;
  }

  /**
   * Generate external service integrations for workflows
   */
  private async generateWorkflowIntegrations(
    businessRequirement: BusinessRequirement,
    workflows: WorkflowPattern[]
  ): Promise<{ [service: string]: any }> {
    const integrations: { [service: string]: any } = {};
    
    // Email service integration
    integrations["email"] = {
      service: "smtp",
      config: {
        host: "smtp.company.com",
        port: 587,
        secure: false,
        auth: {
          user: "${EMAIL_USER}",
          pass: "${EMAIL_PASSWORD}"
        }
      },
      templates: {
        "task_assigned": "You have been assigned a new task: {{task.name}}",
        "task_overdue": "Task {{task.name}} is overdue. Please complete immediately.",
        "approval_request": "Approval required for {{workflow.name}}"
      }
    };

    // SMS service integration
    integrations["sms"] = {
      service: "twilio",
      config: {
        accountSid: "${TWILIO_ACCOUNT_SID}",
        authToken: "${TWILIO_AUTH_TOKEN}",
        fromNumber: "${TWILIO_PHONE_NUMBER}"
      }
    };

    // External validation services
    const externalServices = businessRequirement.extractedEntities?.integrations || [];
    externalServices.forEach(service => {
      const serviceName = typeof service === 'string' ? service : service.name;
      integrations[serviceName.toLowerCase()] = {
        type: "http",
        config: {
          baseUrl: `https://api.${serviceName.toLowerCase()}.com`,
          auth: {
            type: "bearer",
            token: `\${${serviceName.toUpperCase()}_API_KEY}`
          }
        }
      };
    });

    return integrations;
  }

  /**
   * Generate React UI components for workflows
   */
  private async generateWorkflowUI(
    workflows: WorkflowPattern[],
    options: WorkflowGenerationOptions
  ): Promise<{ [componentName: string]: string }> {
    const uiComponents: { [componentName: string]: string } = {};
    
    // Main workflow dashboard component
    uiComponents["WorkflowDashboard"] = this.generateWorkflowDashboardComponent();
    
    // Task list component
    uiComponents["TaskList"] = this.generateTaskListComponent();
    
    // Workflow progress visualization
    uiComponents["WorkflowProgress"] = this.generateWorkflowProgressComponent();
    
    // Approval component
    uiComponents["ApprovalForm"] = this.generateApprovalFormComponent();

    // Generate workflow-specific components
    workflows.forEach(workflow => {
      const componentName = `${this.capitalizeAndClean(workflow.name)}Workflow`;
      uiComponents[componentName] = this.generateWorkflowSpecificComponent(workflow);
    });

    return uiComponents;
  }

  /**
   * Generate comprehensive workflow documentation
   */
  private async generateWorkflowDocumentation(
    workflows: WorkflowPattern[],
    rolePermissions: { [role: string]: string[] },
    integrations: { [service: string]: any }
  ): Promise<string> {
    let documentation = `# Workflow System Documentation

## Overview
This document describes the generated workflow system with ${workflows.length} workflow patterns, role-based permissions, and external integrations.

## Workflow Patterns

`;

    workflows.forEach(workflow => {
      documentation += `### ${workflow.name}
- **Type**: ${workflow.type}
- **Description**: ${workflow.description}
- **Estimated Duration**: ${workflow.metadata.estimatedDuration} hours
- **Complexity**: ${workflow.metadata.complexity}

**Steps**:
${workflow.steps.map(step => 
  `- **${step.name}** (${step.type}): ${step.description} - SLA: ${step.slaHours || 'N/A'} hours`
).join('\n')}

`;
    });

    documentation += `## Role Permissions

`;

    Object.entries(rolePermissions).forEach(([role, permissions]) => {
      documentation += `### ${role}
${permissions.map(p => `- ${p}`).join('\n')}

`;
    });

    documentation += `## External Integrations

`;

    Object.entries(integrations).forEach(([service, config]) => {
      documentation += `### ${service}
- **Type**: ${config.type || config.service}
- **Configuration**: See integration settings

`;
    });

    return documentation;
  }

  /**
   * Generate workflow dashboard component
   */
  private generateWorkflowDashboardComponent(): string {
    return `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, AlertTriangle, Users } from "lucide-react";

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  progress: number;
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export function WorkflowDashboard() {
  const { data: workflows, isLoading } = useQuery<WorkflowSummary[]>({
    queryKey: ['/api/workflows/dashboard']
  });

  if (isLoading) {
    return <div data-testid="loading-workflows">Loading workflows...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="space-y-6" data-testid="workflow-dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
        <Button data-testid="button-new-workflow">New Workflow</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows?.map((workflow) => (
          <Card key={workflow.id} className="hover-elevate" data-testid={\`card-workflow-\${workflow.id}\`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{workflow.name}</CardTitle>
              {getStatusIcon(workflow.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Progress value={workflow.progress} className="h-2" />
                <div className="flex items-center space-x-2">
                  <Badge variant={getPriorityColor(workflow.priority)}>
                    {workflow.priority}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {workflow.progress}% complete
                  </span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  {workflow.assignee}
                </div>
                <div className="text-sm text-muted-foreground">
                  Due: {new Date(workflow.dueDate).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
  }

  /**
   * Generate task list component
   */
  private generateTaskListComponent(): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, Calendar } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  workflowName: string;
}

export function TaskList() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks']
  });

  if (isLoading) {
    return <div data-testid="loading-tasks">Loading tasks...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4" data-testid="task-list">
      <h2 className="text-2xl font-bold">My Tasks</h2>
      
      {tasks?.map((task) => (
        <Card key={task.id} className="hover-elevate" data-testid={\`card-task-\${task.id}\`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <Badge variant={getStatusColor(task.status)} data-testid={\`badge-status-\${task.id}\`}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{task.description}</p>
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {task.assignee}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
                <Badge variant="outline">{task.workflowName}</Badge>
              </div>
              
              <div className="flex space-x-2">
                <Button size="sm" data-testid={\`button-complete-\${task.id}\`}>
                  Mark Complete
                </Button>
                <Button variant="outline" size="sm" data-testid={\`button-details-\${task.id}\`}>
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}`;
  }

  /**
   * Generate workflow progress visualization component
   */
  private generateWorkflowProgressComponent(): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface WorkflowStep {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'pending';
  assignee?: string;
  completedAt?: string;
}

interface WorkflowProgressProps {
  workflowId: string;
  workflowName: string;
  steps: WorkflowStep[];
  currentProgress: number;
}

export function WorkflowProgress({ workflowId, workflowName, steps, currentProgress }: WorkflowProgressProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  return (
    <Card data-testid={\`workflow-progress-\${workflowId}\`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {workflowName}
          <Badge variant="outline" data-testid={\`progress-badge-\${workflowId}\`}>
            {currentProgress}% Complete
          </Badge>
        </CardTitle>
        <Progress value={currentProgress} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3" data-testid={\`step-\${step.id}\`}>
              {getStepIcon(step.status)}
              <div className="flex-1">
                <div className="font-medium">{step.name}</div>
                {step.assignee && (
                  <div className="text-sm text-muted-foreground">
                    Assigned to: {step.assignee}
                  </div>
                )}
                {step.completedAt && (
                  <div className="text-sm text-muted-foreground">
                    Completed: {new Date(step.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Badge 
                variant={step.status === 'completed' ? 'default' : step.status === 'current' ? 'secondary' : 'outline'}
                data-testid={\`step-status-\${step.id}\`}
              >
                {step.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}`;
  }

  /**
   * Generate approval form component
   */
  private generateApprovalFormComponent(): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  requestDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  workflowName: string;
}

interface ApprovalFormProps {
  request: ApprovalRequest;
  onApprovalComplete: () => void;
}

export function ApprovalForm({ request, onApprovalComplete }: ApprovalFormProps) {
  const [comments, setComments] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approvalMutation = useMutation({
    mutationFn: async (decision: 'approved' | 'rejected') => {
      return apiRequest(\`/api/approvals/\${request.id}\`, {
        method: 'POST',
        body: { decision, comments }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      toast({ title: "Approval processed successfully" });
      onApprovalComplete();
    },
    onError: () => {
      toast({ title: "Failed to process approval", variant: "destructive" });
    }
  });

  return (
    <Card data-testid={\`approval-form-\${request.id}\`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Approval Required
          <Badge 
            variant={request.priority === 'urgent' ? 'destructive' : 'secondary'}
            data-testid={\`priority-\${request.id}\`}
          >
            {request.priority}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium">{request.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Requester:</span> {request.requesterName}
          </div>
          <div>
            <span className="font-medium">Workflow:</span> {request.workflowName}
          </div>
          <div>
            <span className="font-medium">Date:</span> {new Date(request.requestDate).toLocaleDateString()}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Comments</label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add your comments..."
            className="mt-1"
            data-testid={\`textarea-comments-\${request.id}\`}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={() => approvalMutation.mutate('approved')}
            disabled={approvalMutation.isPending}
            className="flex-1"
            data-testid={\`button-approve-\${request.id}\`}
          >
            Approve
          </Button>
          <Button
            onClick={() => approvalMutation.mutate('rejected')}
            disabled={approvalMutation.isPending}
            variant="destructive"
            className="flex-1"
            data-testid={\`button-reject-\${request.id}\`}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}`;
  }

  /**
   * Generate workflow-specific component
   */
  private generateWorkflowSpecificComponent(workflow: WorkflowPattern): string {
    const componentName = this.capitalizeAndClean(workflow.name);
    return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowProgress } from "./WorkflowProgress";
import { TaskList } from "./TaskList";

export function ${componentName}Workflow() {
  return (
    <div className="space-y-6" data-testid="${workflow.id}-workflow">
      <h1 className="text-3xl font-bold">${workflow.name}</h1>
      <p className="text-muted-foreground">${workflow.description}</p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <WorkflowProgress 
          workflowId="${workflow.id}"
          workflowName="${workflow.name}"
          steps={[]}
          currentProgress={0}
        />
        <TaskList />
      </div>
    </div>
  );
}`;
  }

  /**
   * Update progress for WebSocket clients
   */
  private updateProgress(workflowId: string, progress: any): void {
    const clients = this.activeGenerations.get(workflowId) || [];
    const message = JSON.stringify({
      type: "workflow_generation_progress",
      workflowId,
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
  registerProgressClient(workflowId: string, ws: WebSocket): void {
    const clients = this.activeGenerations.get(workflowId) || [];
    clients.push(ws);
    this.activeGenerations.set(workflowId, clients);

    ws.on('close', () => {
      const updatedClients = this.activeGenerations.get(workflowId)?.filter(client => client !== ws) || [];
      this.activeGenerations.set(workflowId, updatedClients);
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

  private getWorkflowGenerationSystemPrompt(): string {
    return `You are an expert business process automation architect. Generate comprehensive workflow patterns that are enterprise-ready, scalable, and user-friendly. Focus on real business value with proper error handling, role-based permissions, and seamless integrations.`;
  }

  private getWorkflowPatternFunctionSchema() {
    return {
      name: "generate_workflow_patterns",
      description: "Generate comprehensive workflow patterns for business processes",
      parameters: {
        type: "object",
        properties: {
          workflows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                type: { 
                  type: "string", 
                  enum: ["sequential", "parallel", "conditional", "approval_chain"] 
                },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      type: { 
                        type: "string", 
                        enum: ["manual", "automated", "approval", "integration", "condition"] 
                      },
                      description: { type: "string" },
                      assigneeRoles: { type: "array", items: { type: "string" } },
                      requiredFields: { type: "array", items: { type: "string" } },
                      slaHours: { type: "number" },
                      outputs: { type: "array", items: { type: "string" } }
                    },
                    required: ["id", "name", "type", "description", "assigneeRoles"]
                  }
                },
                metadata: {
                  type: "object",
                  properties: {
                    estimatedDuration: { type: "number" },
                    complexity: { type: "string", enum: ["simple", "medium", "complex"] },
                    category: { type: "string" },
                    tags: { type: "array", items: { type: "string" } }
                  }
                }
              },
              required: ["id", "name", "description", "type", "steps", "metadata"]
            }
          }
        },
        required: ["workflows"]
      }
    };
  }
}