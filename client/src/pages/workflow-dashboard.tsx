import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Settings, Users, Clock, AlertCircle } from "lucide-react";

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "completed" | "failed" | "pending";
  progress: number;
  currentStep: string;
  startedAt: string;
  estimatedCompletion?: string;
  assignedTo?: string;
}

interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  type: "sequential" | "parallel" | "conditional" | "approval_chain";
  complexity: "simple" | "medium" | "complex";
  estimatedDuration: number;
  activeExecutions: number;
  completedToday: number;
}

export default function WorkflowDashboard() {
  const [, setLocation] = useLocation();
  
  // Fetch workflow patterns
  const { data: workflows = [], isLoading: workflowsLoading } = useQuery<WorkflowPattern[]>({
    queryKey: ["/api/workflows"],
    enabled: true
  });

  // Fetch active workflow executions
  const { data: activeExecutions = [], isLoading: executionsLoading } = useQuery<WorkflowExecution[]>({
    queryKey: ["/api/workflows/executions/active"],
    enabled: true
  });

  // Start workflow mutation
  const startWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return apiRequest(`/api/workflows/executions/start`, {
        method: "POST",
        body: JSON.stringify({ 
          applicationId: "temp-app-id", // TODO: Get from context
          workflowId 
        })
      });
    },
    onSuccess: (result: any) => {
      setLocation(`/workflows/executions/${result.executionId}`);
    },
    onError: (error: any) => {
      console.error("Failed to start workflow:", error);
    }
  });

  const handleStartWorkflow = async (workflowId: string) => {
    startWorkflowMutation.mutate(workflowId);
  };

  const handleViewExecution = (executionId: string) => {
    setLocation(`/workflows/executions/${executionId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "simple": return "text-green-600";
      case "medium": return "text-yellow-600"; 
      case "complex": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  if (workflowsLoading || executionsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Workflow Dashboard</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage and monitor your business workflows
          </p>
        </div>
        <Link href="/workflows/create">
          <Button data-testid="button-create-workflow">
            <Settings className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
                <p className="text-2xl font-bold" data-testid="stat-total-workflows">
                  {workflows.length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Executions</p>
                <p className="text-2xl font-bold" data-testid="stat-active-executions">
                  {activeExecutions.filter((e: WorkflowExecution) => e.status === "running").length}
                </p>
              </div>
              <Play className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold" data-testid="stat-completed-today">
                  {activeExecutions.filter((e: WorkflowExecution) => 
                    e.status === "completed" && 
                    new Date(e.startedAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold" data-testid="stat-failed">
                  {activeExecutions.filter((e: WorkflowExecution) => e.status === "failed").length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Executions */}
      {activeExecutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle data-testid="section-active-executions">Active Workflow Executions</CardTitle>
            <CardDescription>Currently running or pending workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeExecutions.map((execution: WorkflowExecution) => (
                <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium" data-testid={`execution-name-${execution.id}`}>
                        {execution.workflowName}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className={getStatusColor(execution.status)}
                        data-testid={`execution-status-${execution.id}`}
                      >
                        {execution.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2" data-testid={`execution-step-${execution.id}`}>
                      Current step: {execution.currentStep}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Progress value={execution.progress} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground" data-testid={`execution-progress-${execution.id}`}>
                        {execution.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {execution.assignedTo && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span data-testid={`execution-assignee-${execution.id}`}>{execution.assignedTo}</span>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewExecution(execution.id)}
                      data-testid={`button-view-execution-${execution.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Workflows */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="section-available-workflows">Available Workflows</CardTitle>
          <CardDescription>Start new workflow executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow: WorkflowPattern) => (
              <Card key={workflow.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg" data-testid={`workflow-name-${workflow.id}`}>
                      {workflow.name}
                    </CardTitle>
                    <Badge 
                      variant="outline"
                      className={getComplexityColor(workflow.complexity)}
                      data-testid={`workflow-complexity-${workflow.id}`}
                    >
                      {workflow.complexity}
                    </Badge>
                  </div>
                  <CardDescription data-testid={`workflow-description-${workflow.id}`}>
                    {workflow.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`workflow-duration-${workflow.id}`}>
                        ~{workflow.estimatedDuration}h
                      </span>
                    </span>
                    <span className="text-muted-foreground" data-testid={`workflow-type-${workflow.id}`}>
                      {workflow.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span data-testid={`workflow-active-${workflow.id}`}>
                      {workflow.activeExecutions} active
                    </span>
                    <span data-testid={`workflow-completed-${workflow.id}`}>
                      {workflow.completedToday} completed today
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleStartWorkflow(workflow.id)}
                    data-testid={`button-start-workflow-${workflow.id}`}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Workflow
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}