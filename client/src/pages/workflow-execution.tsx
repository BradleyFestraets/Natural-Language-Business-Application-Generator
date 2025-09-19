import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, 
  Clock, 
  User, 
  FileText, 
  Send, 
  ArrowLeft,
  PlayCircle,
  PauseCircle,
  AlertCircle
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStep {
  id: string;
  name: string;
  type: "manual" | "approval" | "automated";
  description: string;
  status: "pending" | "current" | "completed" | "failed";
  assigneeRoles: string[];
  requiredFields: string[];
  slaHours?: number;
  outputs?: string[];
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "completed" | "failed" | "pending" | "paused";
  progress: number;
  currentStep: string;
  steps: WorkflowStep[];
  startedAt: string;
  estimatedCompletion?: string;
  assignedTo?: string;
  context: Record<string, any>;
}

const stepActionSchema = z.object({
  action: z.enum(["complete", "reject", "reassign"]),
  notes: z.string().optional(),
  assignTo: z.string().optional(),
  data: z.record(z.any()).optional()
});

type StepActionForm = z.infer<typeof stepActionSchema>;

export default function WorkflowExecution() {
  const { executionId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch workflow execution details
  const { data: execution, isLoading } = useQuery<WorkflowExecution>({
    queryKey: ["/api/workflows/executions", executionId],
    enabled: !!executionId
  });

  const form = useForm<StepActionForm>({
    resolver: zodResolver(stepActionSchema),
    defaultValues: {
      action: "complete",
      notes: "",
      data: {}
    }
  });

  // Step action mutation
  const stepActionMutation = useMutation({
    mutationFn: async (formData: StepActionForm) => {
      return apiRequest(`/api/workflows/executions/${executionId}/advance`, {
        method: "POST",
        body: JSON.stringify(formData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Action completed",
        description: "Workflow step has been updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/executions", executionId] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Failed to complete workflow step",
        variant: "destructive"
      });
    }
  });

  // Pause/Resume workflow mutations
  const pauseWorkflowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/workflows/executions/${executionId}/pause`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow paused",
        description: "The workflow has been paused"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/executions", executionId] });
    }
  });

  const resumeWorkflowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/workflows/executions/${executionId}/resume`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow resumed",
        description: "The workflow has been resumed"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/executions", executionId] });
    }
  });

  const onSubmit = (data: StepActionForm) => {
    stepActionMutation.mutate(data);
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "current": return <PlayCircle className="w-5 h-5 text-blue-600" />;
      case "failed": return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-blue-500 text-white";
      case "completed": return "bg-green-500 text-white";
      case "failed": return "bg-red-500 text-white";
      case "paused": return "bg-yellow-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Workflow Execution Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The workflow execution you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => setLocation("/workflows")} data-testid="button-back-to-workflows">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = execution.steps.find(step => step.status === "current");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setLocation("/workflows")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="execution-title">
              {execution.workflowName}
            </h1>
            <p className="text-muted-foreground" data-testid="execution-id">
              Execution ID: {execution.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            className={getStatusColor(execution.status)}
            data-testid="execution-status"
          >
            {execution.status}
          </Badge>
          {execution.status === "running" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => pauseWorkflowMutation.mutate()}
              disabled={pauseWorkflowMutation.isPending}
              data-testid="button-pause-workflow"
            >
              <PauseCircle className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          {execution.status === "paused" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => resumeWorkflowMutation.mutate()}
              disabled={resumeWorkflowMutation.isPending}
              data-testid="button-resume-workflow"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="section-progress">Workflow Progress</CardTitle>
              <CardDescription>Overall completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground" data-testid="execution-progress">
                    {execution.progress}%
                  </span>
                </div>
                <Progress value={execution.progress} className="h-3" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span data-testid="execution-started">
                    Started: {new Date(execution.startedAt).toLocaleString()}
                  </span>
                  {execution.estimatedCompletion && (
                    <span data-testid="execution-estimated">
                      Est. completion: {new Date(execution.estimatedCompletion).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="section-steps">Workflow Steps</CardTitle>
              <CardDescription>Detailed step-by-step progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {execution.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border">
                      {getStepStatusIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium" data-testid={`step-name-${step.id}`}>
                          {step.name}
                        </h3>
                        <Badge 
                          variant={step.status === "current" ? "default" : "secondary"}
                          data-testid={`step-status-${step.id}`}
                        >
                          {step.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`step-description-${step.id}`}>
                        {step.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span data-testid={`step-type-${step.id}`}>Type: {step.type}</span>
                        {step.slaHours && (
                          <span data-testid={`step-sla-${step.id}`}>SLA: {step.slaHours}h</span>
                        )}
                        {step.assigneeRoles.length > 0 && (
                          <span data-testid={`step-roles-${step.id}`}>
                            Roles: {step.assigneeRoles.join(", ")}
                          </span>
                        )}
                      </div>
                      {step.completedAt && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span data-testid={`step-completed-${step.id}`}>
                            Completed: {new Date(step.completedAt).toLocaleString()}
                          </span>
                          {step.completedBy && (
                            <span data-testid={`step-completed-by-${step.id}`}>
                              {" "}by {step.completedBy}
                            </span>
                          )}
                        </div>
                      )}
                      {step.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm" data-testid={`step-notes-${step.id}`}>
                          {step.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Step Actions */}
          {currentStep && (
            <Card>
              <CardHeader>
                <CardTitle data-testid="section-current-step">Current Step</CardTitle>
                <CardDescription>Take action on the current step</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded">
                    <h4 className="font-medium mb-1" data-testid="current-step-name">
                      {currentStep.name}
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid="current-step-description">
                      {currentStep.description}
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add notes or comments..."
                                {...field}
                                data-testid="input-step-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={stepActionMutation.isPending}
                          onClick={() => form.setValue("action", "complete")}
                          data-testid="button-complete-step"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          disabled={stepActionMutation.isPending}
                          onClick={() => {
                            form.setValue("action", "reject");
                            form.handleSubmit(onSubmit)();
                          }}
                          data-testid="button-reject-step"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution Details */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="section-details">Execution Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Assigned to: {execution.assignedTo || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm" data-testid="execution-current-step">
                  Current: {execution.currentStep}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Steps: {execution.steps.filter(s => s.status === "completed").length} / {execution.steps.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}