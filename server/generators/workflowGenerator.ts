import { BusinessRequirement } from '@shared/schema';
import OpenAI from 'openai';
import { z } from 'zod';

const GeneratedWorkflowSchema = z.object({
  name: z.string(),
  type: z.enum(['approval', 'sequential', 'parallel', 'conditional', 'state-machine']),
  code: z.string(),
  path: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    assignee: z.string().optional(),
    conditions: z.record(z.any()).optional()
  })),
  triggers: z.array(z.string()).optional(),
  notifications: z.array(z.string()).optional()
});

export type GeneratedWorkflow = z.infer<typeof GeneratedWorkflowSchema>;

export class WorkflowGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateWorkflows(
    requirement: BusinessRequirement
  ): Promise<GeneratedWorkflow[]> {
    const workflows: GeneratedWorkflow[] = [];

    try {
      const processes = requirement.extractedEntities?.processes || [];
      const workflowPatterns = requirement.workflowPatterns || [];

      // Generate workflows for each identified process
      for (const process of processes) {
        const workflow = await this.generateProcessWorkflow(process, requirement);
        if (workflow) {
          workflows.push(workflow);
        }
      }

      // Generate approval workflows if needed
      if (this.requiresApprovalWorkflow(requirement)) {
        const approvalWorkflow = await this.generateApprovalWorkflow(requirement);
        workflows.push(approvalWorkflow);
      }

      // Generate state machine workflows if needed
      if (workflowPatterns.includes('state-machine')) {
        const stateMachineWorkflow = await this.generateStateMachineWorkflow(requirement);
        workflows.push(stateMachineWorkflow);
      }

      return workflows;
    } catch (error) {
      console.error('Error generating workflows:', error);
      return this.generateFallbackWorkflows(requirement);
    }
  }

  private async generateProcessWorkflow(
    processName: string,
    requirement: BusinessRequirement
  ): Promise<GeneratedWorkflow | null> {
    try {
      if (!this.openai) {
        return this.generateFallbackProcessWorkflow(processName);
      }

      const prompt = `Generate a business workflow for process: ${processName}
Business Context: ${requirement.originalDescription}

Requirements:
- Define clear workflow steps and transitions
- Include role-based assignments
- Add approval gates where appropriate
- Include error handling and rollback
- Add notifications and escalations
- Use TypeScript with proper types
- Include comprehensive state management

Return workflow definition as JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      
      return this.parseWorkflowResponse(response, processName);
    } catch (error) {
      console.error(`Error generating workflow for ${processName}:`, error);
      return this.generateFallbackProcessWorkflow(processName);
    }
  }

  private async generateApprovalWorkflow(
    requirement: BusinessRequirement
  ): Promise<GeneratedWorkflow> {
    const code = `import { WorkflowEngine } from '../engines/workflowEngine';

export const ApprovalWorkflow = {
  id: 'approval-workflow',
  name: 'General Approval Workflow',
  type: 'approval',
  steps: [
    {
      id: 'initiate',
      name: 'Initiate Request',
      type: 'user-task',
      assignee: 'requester',
      next: 'review'
    },
    {
      id: 'review',
      name: 'Manager Review',
      type: 'approval-task',
      assignee: 'manager',
      actions: ['approve', 'reject', 'request-info'],
      next: {
        approve: 'approved',
        reject: 'rejected',
        'request-info': 'provide-info'
      }
    },
    {
      id: 'provide-info',
      name: 'Provide Additional Information',
      type: 'user-task',
      assignee: 'requester',
      next: 'review'
    },
    {
      id: 'approved',
      name: 'Request Approved',
      type: 'end-event',
      notifications: ['requester', 'manager']
    },
    {
      id: 'rejected',
      name: 'Request Rejected',
      type: 'end-event',
      notifications: ['requester']
    }
  ],
  notifications: {
    channels: ['email', 'in-app'],
    templates: {
      'approval-requested': 'A new request requires your approval',
      'approved': 'Your request has been approved',
      'rejected': 'Your request has been rejected'
    }
  },
  escalations: [
    {
      trigger: 'timeout',
      duration: '48h',
      action: 'escalate-to-senior-manager'
    }
  ]
};`;

    return {
      name: 'ApprovalWorkflow',
      type: 'approval',
      code,
      path: 'server/workflows/approvalWorkflow.ts',
      steps: [
        { id: 'initiate', name: 'Initiate Request', type: 'user-task' },
        { id: 'review', name: 'Manager Review', type: 'approval-task', assignee: 'manager' },
        { id: 'provide-info', name: 'Provide Additional Information', type: 'user-task' },
        { id: 'approved', name: 'Request Approved', type: 'end-event' },
        { id: 'rejected', name: 'Request Rejected', type: 'end-event' }
      ],
      triggers: ['manual', 'api'],
      notifications: ['email', 'in-app']
    };
  }

  private async generateStateMachineWorkflow(
    requirement: BusinessRequirement
  ): Promise<GeneratedWorkflow> {
    const code = `import { StateMachine } from '../engines/stateMachine';

export const EntityStateMachine = {
  id: 'entity-state-machine',
  name: 'Entity Lifecycle State Machine',
  type: 'state-machine',
  states: {
    draft: {
      transitions: {
        submit: 'pending_review',
        delete: 'deleted'
      }
    },
    pending_review: {
      transitions: {
        approve: 'active',
        reject: 'draft',
        request_changes: 'draft'
      }
    },
    active: {
      transitions: {
        suspend: 'suspended',
        archive: 'archived',
        update: 'pending_review'
      }
    },
    suspended: {
      transitions: {
        reactivate: 'active',
        archive: 'archived'
      }
    },
    archived: {
      transitions: {
        restore: 'draft'
      }
    },
    deleted: {
      transitions: {}
    }
  },
  guards: {
    submit: (context) => context.user.role === 'author',
    approve: (context) => context.user.role === 'admin',
    delete: (context) => context.user.role === 'admin' || context.user.id === context.entity.ownerId
  },
  actions: {
    onEnterPendingReview: (context) => {
      // Send notification to reviewers
      console.log('Entity submitted for review');
    },
    onEnterActive: (context) => {
      // Publish entity
      console.log('Entity is now active');
    },
    onEnterDeleted: (context) => {
      // Clean up resources
      console.log('Entity deleted');
    }
  }
};`;

    return {
      name: 'EntityStateMachine',
      type: 'state-machine',
      code,
      path: 'server/workflows/entityStateMachine.ts',
      steps: [
        { id: 'draft', name: 'Draft', type: 'state' },
        { id: 'pending_review', name: 'Pending Review', type: 'state' },
        { id: 'active', name: 'Active', type: 'state' },
        { id: 'suspended', name: 'Suspended', type: 'state' },
        { id: 'archived', name: 'Archived', type: 'state' },
        { id: 'deleted', name: 'Deleted', type: 'state' }
      ]
    };
  }

  private requiresApprovalWorkflow(requirement: BusinessRequirement): boolean {
    const description = requirement.originalDescription.toLowerCase();
    const approvalKeywords = ['approve', 'approval', 'review', 'authorize', 'sign-off'];
    
    return approvalKeywords.some(keyword => description.includes(keyword)) ||
           (requirement.workflowPatterns || []).includes('approval');
  }

  private parseWorkflowResponse(response: string, processName: string): GeneratedWorkflow {
    try {
      const parsed = JSON.parse(response);
      return {
        name: parsed.name || processName,
        type: parsed.type || 'sequential',
        code: this.generateWorkflowCode(parsed),
        path: `server/workflows/${this.sanitizeName(processName)}Workflow.ts`,
        steps: parsed.steps || [],
        triggers: parsed.triggers,
        notifications: parsed.notifications
      };
    } catch {
      return this.generateFallbackProcessWorkflow(processName);
    }
  }

  private generateWorkflowCode(workflowDef: any): string {
    return `export const ${workflowDef.name} = ${JSON.stringify(workflowDef, null, 2)};`;
  }

  private generateFallbackProcessWorkflow(processName: string): GeneratedWorkflow {
    const sanitizedName = this.sanitizeName(processName);
    const code = `export const ${sanitizedName}Workflow = {
  id: '${sanitizedName}-workflow',
  name: '${processName} Workflow',
  type: 'sequential',
  steps: [
    {
      id: 'start',
      name: 'Start ${processName}',
      type: 'start-event',
      next: 'process'
    },
    {
      id: 'process',
      name: 'Process ${processName}',
      type: 'user-task',
      assignee: 'user',
      next: 'complete'
    },
    {
      id: 'complete',
      name: 'Complete ${processName}',
      type: 'end-event'
    }
  ]
};`;

    return {
      name: `${sanitizedName}Workflow`,
      type: 'sequential',
      code,
      path: `server/workflows/${sanitizedName}Workflow.ts`,
      steps: [
        { id: 'start', name: `Start ${processName}`, type: 'start-event' },
        { id: 'process', name: `Process ${processName}`, type: 'user-task' },
        { id: 'complete', name: `Complete ${processName}`, type: 'end-event' }
      ]
    };
  }

  private generateFallbackWorkflows(requirement: BusinessRequirement): GeneratedWorkflow[] {
    return [
      this.generateFallbackProcessWorkflow('Default Process'),
      {
        name: 'BasicApprovalWorkflow',
        type: 'approval',
        code: 'export const BasicApprovalWorkflow = { /* ... */ };',
        path: 'server/workflows/basicApprovalWorkflow.ts',
        steps: [
          { id: 'submit', name: 'Submit', type: 'start-event' },
          { id: 'review', name: 'Review', type: 'approval-task' },
          { id: 'complete', name: 'Complete', type: 'end-event' }
        ]
      }
    ];
  }

  private sanitizeName(name: string): string {
    return name
      .split(/[\s-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}