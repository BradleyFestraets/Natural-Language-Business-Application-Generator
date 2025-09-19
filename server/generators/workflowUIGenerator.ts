import { WorkflowPattern, WorkflowStep } from "../services/workflowGenerationService";
import { BusinessRequirement } from "@shared/schema";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export interface UIGenerationOptions {
  outputDir: string;
  includeProgressViews?: boolean;
  includeTaskViews?: boolean;
  includeApprovalViews?: boolean;
  styleTheme?: "light" | "dark" | "auto";
  componentLibrary?: "shadcn" | "material" | "ant";
}

export interface GeneratedUIComponents {
  components: { [filename: string]: string };
  pages: { [filename: string]: string };
  hooks: { [filename: string]: string };
  utils: { [filename: string]: string };
}

export class WorkflowUIGenerator {
  
  constructor() {}

  /**
   * Generate complete UI system for workflows
   */
  async generateWorkflowUI(
    workflows: WorkflowPattern[],
    businessRequirement: BusinessRequirement,
    options: UIGenerationOptions
  ): Promise<GeneratedUIComponents> {
    const generatedComponents: GeneratedUIComponents = {
      components: {},
      pages: {},
      hooks: {},
      utils: {}
    };

    try {
      // Ensure output directory exists
      await mkdir(options.outputDir, { recursive: true });

      // Generate core workflow components
      generatedComponents.components = await this.generateWorkflowComponents(workflows, options);
      
      // Generate workflow pages
      generatedComponents.pages = await this.generateWorkflowPages(workflows, options);
      
      // Generate custom hooks
      generatedComponents.hooks = await this.generateWorkflowHooks(workflows, options);
      
      // Generate utility functions
      generatedComponents.utils = await this.generateWorkflowUtils(workflows, options);

      // Write files to disk
      await this.writeComponentFiles(generatedComponents, options.outputDir);

      return generatedComponents;

    } catch (error) {
      throw new Error(`Failed to generate workflow UI: ${error}`);
    }
  }

  /**
   * Generate core workflow components
   */
  private async generateWorkflowComponents(
    workflows: WorkflowPattern[],
    options: UIGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const components: { [filename: string]: string } = {};

    // Main workflow dashboard
    components["WorkflowDashboard.tsx"] = this.generateWorkflowDashboard(workflows);
    
    // Individual workflow viewers
    workflows.forEach(workflow => {
      const componentName = this.capitalizeAndClean(workflow.name);
      components[`${componentName}View.tsx`] = this.generateWorkflowView(workflow);
    });

    // Progress visualization components
    if (options.includeProgressViews) {
      components["WorkflowProgressBar.tsx"] = this.generateProgressBar();
      components["WorkflowTimeline.tsx"] = this.generateTimeline();
      components["WorkflowStepIndicator.tsx"] = this.generateStepIndicator();
    }

    // Task management components
    if (options.includeTaskViews) {
      components["TaskList.tsx"] = this.generateTaskList();
      components["TaskCard.tsx"] = this.generateTaskCard();
      components["TaskForm.tsx"] = this.generateTaskForm();
    }

    // Approval components
    if (options.includeApprovalViews) {
      components["ApprovalQueue.tsx"] = this.generateApprovalQueue();
      components["ApprovalForm.tsx"] = this.generateApprovalForm();
      components["ApprovalHistory.tsx"] = this.generateApprovalHistory();
    }

    // Common workflow components
    components["WorkflowStatusBadge.tsx"] = this.generateStatusBadge();
    components["WorkflowAssigneeSelector.tsx"] = this.generateAssigneeSelector();
    components["WorkflowNotifications.tsx"] = this.generateNotifications();

    return components;
  }

  /**
   * Generate workflow pages
   */
  private async generateWorkflowPages(
    workflows: WorkflowPattern[],
    options: UIGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const pages: { [filename: string]: string } = {};

    // Main workflows overview page
    pages["WorkflowsOverview.tsx"] = this.generateWorkflowsOverviewPage(workflows);
    
    // Individual workflow execution pages
    workflows.forEach(workflow => {
      const pageName = this.capitalizeAndClean(workflow.name);
      pages[`${pageName}Execution.tsx`] = this.generateWorkflowExecutionPage(workflow);
    });

    // Task management page
    pages["TaskManagement.tsx"] = this.generateTaskManagementPage();
    
    // Approval dashboard page
    pages["ApprovalDashboard.tsx"] = this.generateApprovalDashboardPage();
    
    // Workflow analytics page
    pages["WorkflowAnalytics.tsx"] = this.generateAnalyticsPage();

    return pages;
  }

  /**
   * Generate custom hooks for workflow functionality
   */
  private async generateWorkflowHooks(
    workflows: WorkflowPattern[],
    options: UIGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const hooks: { [filename: string]: string } = {};

    // Core workflow hooks
    hooks["useWorkflowExecution.ts"] = this.generateWorkflowExecutionHook();
    hooks["useWorkflowProgress.ts"] = this.generateWorkflowProgressHook();
    hooks["useTaskManagement.ts"] = this.generateTaskManagementHook();
    hooks["useApprovalQueue.ts"] = this.generateApprovalQueueHook();
    hooks["useWorkflowNotifications.ts"] = this.generateWorkflowNotificationsHook();

    // WebSocket hooks for real-time updates
    hooks["useWorkflowWebSocket.ts"] = this.generateWorkflowWebSocketHook();

    return hooks;
  }

  /**
   * Generate utility functions
   */
  private async generateWorkflowUtils(
    workflows: WorkflowPattern[],
    options: UIGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const utils: { [filename: string]: string } = {};

    utils["workflowHelpers.ts"] = this.generateWorkflowHelpers();
    utils["dateUtils.ts"] = this.generateDateUtils();
    utils["statusUtils.ts"] = this.generateStatusUtils();
    utils["assignmentUtils.ts"] = this.generateAssignmentUtils();

    return utils;
  }

  /**
   * Generate main workflow dashboard
   */
  private generateWorkflowDashboard(workflows: WorkflowPattern[]): string {
    return `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useWorkflowProgress } from "../hooks/useWorkflowProgress";
import { useTaskManagement } from "../hooks/useTaskManagement";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  PlayCircle,
  PauseCircle
} from "lucide-react";

interface WorkflowSummary {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'completed';
  totalExecutions: number;
  activeExecutions: number;
  completedExecutions: number;
  averageCompletionTime: number;
  successRate: number;
}

interface ExecutionSummary {
  id: string;
  workflowName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep: string;
  progress: number;
  assignee: string;
  startedAt: string;
  dueAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export function WorkflowDashboard() {
  const { data: workflowSummaries, isLoading: loadingSummaries } = useQuery<WorkflowSummary[]>({
    queryKey: ['/api/workflows/summary']
  });

  const { data: activeExecutions, isLoading: loadingExecutions } = useQuery<ExecutionSummary[]>({
    queryKey: ['/api/workflows/executions/active']
  });

  const { data: myTasks } = useTaskManagement();
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'paused': return <PauseCircle className="h-5 w-5 text-yellow-500" />;
      case 'active': return <PlayCircle className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loadingSummaries || loadingExecutions) {
    return <div className="p-6" data-testid="loading-dashboard">Loading workflow dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="workflow-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your business workflows
          </p>
        </div>
        <Button data-testid="button-new-workflow">
          <PlayCircle className="h-4 w-4 mr-2" />
          Start Workflow
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-workflows">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowSummaries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {workflows.length} patterns available
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-executions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Executions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeExecutions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-my-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending action
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflowSummaries ? 
                Math.round(workflowSummaries.reduce((acc, w) => acc + w.successRate, 0) / workflowSummaries.length) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList data-testid="dashboard-tabs">
          <TabsTrigger value="executions">Active Executions</TabsTrigger>
          <TabsTrigger value="workflows">Workflow Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <div className="grid gap-4">
            {activeExecutions?.map((execution) => (
              <Card key={execution.id} className="hover-elevate" data-testid={\`execution-card-\${execution.id}\`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-lg">{execution.workflowName}</CardTitle>
                    <CardDescription>Current step: {execution.currentStep}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getPriorityColor(execution.priority)} data-testid={\`priority-\${execution.id}\`}>
                      {execution.priority}
                    </Badge>
                    {getStatusIcon(execution.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={execution.progress} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>{execution.progress}% complete</span>
                      <span className="text-muted-foreground">
                        Due: {new Date(execution.dueAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      Assigned to: {execution.assignee}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" data-testid={\`button-view-\${execution.id}\`}>
                        View Details
                      </Button>
                      <Button size="sm" data-testid={\`button-advance-\${execution.id}\`}>
                        Advance Step
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflowSummaries?.map((workflow) => (
              <Card key={workflow.id} className="hover-elevate" data-testid={\`workflow-card-\${workflow.id}\`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    {getStatusIcon(workflow.status)}
                  </div>
                  <CardDescription>Type: {workflow.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Executions:</span>
                      <span className="font-medium">{workflow.totalExecutions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Success Rate:</span>
                      <span className="font-medium">{workflow.successRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg. Completion:</span>
                      <span className="font-medium">{workflow.averageCompletionTime}h</span>
                    </div>
                    
                    <Button className="w-full" size="sm" data-testid={\`button-start-\${workflow.id}\`}>
                      Start New Execution
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card data-testid="analytics-placeholder">
            <CardHeader>
              <CardTitle>Workflow Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and reporting will be available here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}`;
  }

  /**
   * Generate workflow execution hook
   */
  private generateWorkflowExecutionHook(): string {
    return `import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWorkflowWebSocket } from "./useWorkflowWebSocket";

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  progress: number;
  startedAt: string;
  estimatedCompletion?: string;
  assignee?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  assignee?: string;
  dueAt?: string;
  completedAt?: string;
}

export function useWorkflowExecution(executionId?: string) {
  const queryClient = useQueryClient();
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  
  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWorkflowWebSocket(executionId);

  // Query for execution details
  const executionQuery = useQuery<WorkflowExecution>({
    queryKey: ['/api/workflows/executions', executionId],
    enabled: !!executionId
  });

  // Query for workflow steps
  const stepsQuery = useQuery<WorkflowStep[]>({
    queryKey: ['/api/workflows/executions', executionId, 'steps'],
    enabled: !!executionId
  });

  // Mutation to advance workflow
  const advanceWorkflow = useMutation({
    mutationFn: async (stepData: Record<string, any>) => {
      return apiRequest(\`/api/workflows/executions/\${executionId}/advance\`, {
        method: 'POST',
        body: stepData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/workflows/executions', executionId] 
      });
    }
  });

  // Mutation to cancel workflow
  const cancelWorkflow = useMutation({
    mutationFn: async () => {
      return apiRequest(\`/api/workflows/executions/\${executionId}/cancel\`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/workflows/executions'] 
      });
    }
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'workflow_execution_progress') {
      setCurrentExecution(prev => prev ? {
        ...prev,
        status: lastMessage.status,
        currentStep: lastMessage.currentStep,
        progress: lastMessage.progress
      } : null);
      
      // Refresh queries when significant updates occur
      if (['completed', 'failed', 'cancelled'].includes(lastMessage.status)) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/workflows/executions', executionId] 
        });
      }
    }
  }, [lastMessage, queryClient, executionId]);

  // Update current execution when query data changes
  useEffect(() => {
    if (executionQuery.data) {
      setCurrentExecution(executionQuery.data);
    }
  }, [executionQuery.data]);

  return {
    // Data
    execution: currentExecution,
    steps: stepsQuery.data,
    
    // Loading states
    isLoading: executionQuery.isLoading || stepsQuery.isLoading,
    isConnected,
    
    // Actions
    advanceWorkflow: advanceWorkflow.mutate,
    cancelWorkflow: cancelWorkflow.mutate,
    
    // Status
    isAdvancing: advanceWorkflow.isPending,
    isCancelling: cancelWorkflow.isPending,
    
    // Utilities
    canAdvance: currentExecution?.status === 'in_progress',
    canCancel: currentExecution?.status === 'in_progress' || currentExecution?.status === 'pending',
    isCompleted: currentExecution?.status === 'completed',
    isFailed: currentExecution?.status === 'failed'
  };
}`;
  }

  /**
   * Generate WebSocket hook for real-time updates
   */
  private generateWorkflowWebSocketHook(): string {
    return `import { useState, useEffect, useRef } from "react";

export interface WorkflowMessage {
  type: 'workflow_execution_progress' | 'task_assigned' | 'approval_required' | 'workflow_completed';
  executionId?: string;
  status?: string;
  currentStep?: string;
  progress?: number;
  message?: string;
  data?: Record<string, any>;
}

export function useWorkflowWebSocket(executionId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WorkflowMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!executionId) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = \`\${protocol}//\${window.location.host}/ws/workflow-progress/\${executionId}\`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('Workflow WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WorkflowMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        console.log('Workflow WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect after delay unless it was a clean close
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        setError('WebSocket connection error');
        console.error('Workflow WebSocket error:', error);
      };

    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket creation error:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setLastMessage(null);
    setError(null);
  };

  // Connect when executionId is available
  useEffect(() => {
    if (executionId) {
      connect();
    }
    
    return disconnect;
  }, [executionId]);

  return {
    isConnected,
    lastMessage,
    error,
    reconnect: connect,
    disconnect
  };
}`;
  }

  /**
   * Generate task management hook
   */
  private generateTaskManagementHook(): string {
    return `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  assigneeName?: string;
  creatorId: string;
  creatorName?: string;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  workflowExecutionId?: string;
  workflowName?: string;
}

export function useTaskManagement(userId?: string) {
  const queryClient = useQueryClient();

  // Query for user's tasks
  const tasksQuery = useQuery<Task[]>({
    queryKey: ['/api/tasks', userId ? { assigneeId: userId } : undefined],
  });

  // Mutation to update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      return apiRequest(\`/api/tasks/\${taskId}/status\`, {
        method: 'PATCH',
        body: { status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  // Mutation to assign task
  const assignTask = useMutation({
    mutationFn: async ({ taskId, assigneeId }: { taskId: string; assigneeId: string }) => {
      return apiRequest(\`/api/tasks/\${taskId}/assign\`, {
        method: 'PATCH',
        body: { assigneeId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  // Mutation to complete task
  const completeTask = useMutation({
    mutationFn: async ({ taskId, completionData }: { 
      taskId: string; 
      completionData?: Record<string, any> 
    }) => {
      return apiRequest(\`/api/tasks/\${taskId}/complete\`, {
        method: 'POST',
        body: completionData || {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  // Computed values
  const pendingTasks = tasksQuery.data?.filter(task => task.status === 'pending') || [];
  const inProgressTasks = tasksQuery.data?.filter(task => task.status === 'in_progress') || [];
  const completedTasks = tasksQuery.data?.filter(task => task.status === 'completed') || [];
  const overdueTasks = tasksQuery.data?.filter(task => 
    task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'completed'
  ) || [];

  return {
    // Data
    tasks: tasksQuery.data || [],
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    
    // Loading state
    isLoading: tasksQuery.isLoading,
    
    // Actions
    updateStatus: updateTaskStatus.mutate,
    assignTask: assignTask.mutate,
    completeTask: completeTask.mutate,
    
    // Action states
    isUpdating: updateTaskStatus.isPending,
    isAssigning: assignTask.isPending,
    isCompleting: completeTask.isPending,
    
    // Statistics
    totalTasks: tasksQuery.data?.length || 0,
    completionRate: tasksQuery.data?.length ? 
      Math.round((completedTasks.length / tasksQuery.data.length) * 100) : 0
  };
}`;
  }

  /**
   * Write component files to disk
   */
  private async writeComponentFiles(
    components: GeneratedUIComponents,
    outputDir: string
  ): Promise<void> {
    // Write components
    const componentsDir = join(outputDir, "components");
    await mkdir(componentsDir, { recursive: true });
    for (const [filename, content] of Object.entries(components.components)) {
      await writeFile(join(componentsDir, filename), content);
    }

    // Write pages
    const pagesDir = join(outputDir, "pages");
    await mkdir(pagesDir, { recursive: true });
    for (const [filename, content] of Object.entries(components.pages)) {
      await writeFile(join(pagesDir, filename), content);
    }

    // Write hooks
    const hooksDir = join(outputDir, "hooks");
    await mkdir(hooksDir, { recursive: true });
    for (const [filename, content] of Object.entries(components.hooks)) {
      await writeFile(join(hooksDir, filename), content);
    }

    // Write utils
    const utilsDir = join(outputDir, "utils");
    await mkdir(utilsDir, { recursive: true });
    for (const [filename, content] of Object.entries(components.utils)) {
      await writeFile(join(utilsDir, filename), content);
    }
  }

  /**
   * Generate remaining component methods (simplified for brevity)
   */
  private generateWorkflowView(workflow: WorkflowPattern): string {
    const componentName = this.capitalizeAndClean(workflow.name);
    return `// ${componentName} Workflow View Component
export function ${componentName}View() {
  return <div data-testid="${workflow.id}-view">${workflow.name} View</div>;
}`;
  }

  private generateProgressBar(): string {
    return `// Workflow Progress Bar Component
export function WorkflowProgressBar() {
  return <div data-testid="workflow-progress-bar">Progress Bar</div>;
}`;
  }

  private generateTimeline(): string {
    return `// Workflow Timeline Component
export function WorkflowTimeline() {
  return <div data-testid="workflow-timeline">Timeline</div>;
}`;
  }

  private generateStepIndicator(): string {
    return `// Workflow Step Indicator Component
export function WorkflowStepIndicator() {
  return <div data-testid="workflow-step-indicator">Step Indicator</div>;
}`;
  }

  private generateTaskList(): string {
    return `// Task List Component
export function TaskList() {
  return <div data-testid="task-list">Task List</div>;
}`;
  }

  private generateTaskCard(): string {
    return `// Task Card Component
export function TaskCard() {
  return <div data-testid="task-card">Task Card</div>;
}`;
  }

  private generateTaskForm(): string {
    return `// Task Form Component
export function TaskForm() {
  return <div data-testid="task-form">Task Form</div>;
}`;
  }

  private generateApprovalQueue(): string {
    return `// Approval Queue Component
export function ApprovalQueue() {
  return <div data-testid="approval-queue">Approval Queue</div>;
}`;
  }

  private generateApprovalForm(): string {
    return `// Approval Form Component
export function ApprovalForm() {
  return <div data-testid="approval-form">Approval Form</div>;
}`;
  }

  private generateApprovalHistory(): string {
    return `// Approval History Component
export function ApprovalHistory() {
  return <div data-testid="approval-history">Approval History</div>;
}`;
  }

  private generateStatusBadge(): string {
    return `// Workflow Status Badge Component
export function WorkflowStatusBadge() {
  return <div data-testid="workflow-status-badge">Status Badge</div>;
}`;
  }

  private generateAssigneeSelector(): string {
    return `// Workflow Assignee Selector Component
export function WorkflowAssigneeSelector() {
  return <div data-testid="workflow-assignee-selector">Assignee Selector</div>;
}`;
  }

  private generateNotifications(): string {
    return `// Workflow Notifications Component
export function WorkflowNotifications() {
  return <div data-testid="workflow-notifications">Notifications</div>;
}`;
  }

  // Page generation methods
  private generateWorkflowsOverviewPage(workflows: WorkflowPattern[]): string {
    return `// Workflows Overview Page
export function WorkflowsOverview() {
  return <div data-testid="workflows-overview">Workflows Overview</div>;
}`;
  }

  private generateWorkflowExecutionPage(workflow: WorkflowPattern): string {
    return `// ${workflow.name} Execution Page
export function ${this.capitalizeAndClean(workflow.name)}Execution() {
  return <div data-testid="${workflow.id}-execution">Execution Page</div>;
}`;
  }

  private generateTaskManagementPage(): string {
    return `// Task Management Page
export function TaskManagement() {
  return <div data-testid="task-management">Task Management</div>;
}`;
  }

  private generateApprovalDashboardPage(): string {
    return `// Approval Dashboard Page
export function ApprovalDashboard() {
  return <div data-testid="approval-dashboard">Approval Dashboard</div>;
}`;
  }

  private generateAnalyticsPage(): string {
    return `// Workflow Analytics Page
export function WorkflowAnalytics() {
  return <div data-testid="workflow-analytics">Analytics</div>;
}`;
  }

  // Hook generation methods
  private generateWorkflowProgressHook(): string {
    return `// Workflow Progress Hook
export function useWorkflowProgress() {
  return { progress: 0 };
}`;
  }

  private generateApprovalQueueHook(): string {
    return `// Approval Queue Hook
export function useApprovalQueue() {
  return { approvals: [] };
}`;
  }

  private generateWorkflowNotificationsHook(): string {
    return `// Workflow Notifications Hook
export function useWorkflowNotifications() {
  return { notifications: [] };
}`;
  }

  // Utility generation methods
  private generateWorkflowHelpers(): string {
    return `// Workflow Helper Functions
export const workflowHelpers = {
  calculateProgress: (current: number, total: number) => Math.round((current / total) * 100),
  formatDuration: (hours: number) => \`\${hours}h\`,
  getStatusColor: (status: string) => ({ pending: 'yellow', completed: 'green' }[status] || 'gray')
};`;
  }

  private generateDateUtils(): string {
    return `// Date Utility Functions
export const dateUtils = {
  formatRelative: (date: string) => new Date(date).toLocaleDateString(),
  isOverdue: (dueDate: string) => new Date(dueDate) < new Date()
};`;
  }

  private generateStatusUtils(): string {
    return `// Status Utility Functions
export const statusUtils = {
  getStatusBadgeVariant: (status: string) => status === 'completed' ? 'default' : 'secondary'
};`;
  }

  private generateAssignmentUtils(): string {
    return `// Assignment Utility Functions
export const assignmentUtils = {
  findBestAssignee: (roles: string[], users: any[]) => users[0]?.id
};`;
  }

  /**
   * Utility function to capitalize and clean strings
   */
  private capitalizeAndClean(str: string): string {
    return str
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}