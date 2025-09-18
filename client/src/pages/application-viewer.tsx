import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Play,
  Pause,
  Download,
  Share2,
  Settings,
  Bot,
  Workflow,
  FileText,
  Zap,
  MessageSquare,
  CheckCircle,
  Clock,
  Users,
  Database
} from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";

// Mock data for a generated application
const mockApplication = {
  id: "app-1",
  name: "Employee Onboarding System",
  description: "Complete employee onboarding workflow with background checks, document collection, manager approvals, and automated notifications",
  status: "completed" as const,
  completionPercentage: 100,
  createdAt: "2025-01-15",
  updatedAt: "2025-01-15",
  workflows: [
    {
      id: "workflow-1",
      name: "Employee Information Collection",
      status: "active",
      steps: ["Personal Details", "Emergency Contacts", "Tax Information", "Direct Deposit"],
      description: "Collect all necessary employee information"
    },
    {
      id: "workflow-2", 
      name: "Background Verification Process",
      status: "active",
      steps: ["Authorization", "Criminal Check", "Employment History", "Education Verification"],
      description: "Comprehensive background check workflow"
    },
    {
      id: "workflow-3",
      name: "Approval and Onboarding",
      status: "active", 
      steps: ["Manager Review", "HR Approval", "IT Setup", "Welcome Package"],
      description: "Final approval and system setup"
    }
  ],
  forms: [
    {
      id: "form-1",
      name: "Employee Information Form",
      fields: ["Full Name", "Email", "Phone", "Address", "Emergency Contact"],
      status: "active"
    },
    {
      id: "form-2",
      name: "Background Check Authorization",
      fields: ["Consent", "Previous Addresses", "Previous Employers", "References"],
      status: "active"
    },
    {
      id: "form-3",
      name: "Tax and Banking Information",
      fields: ["SSN", "Tax Status", "Bank Account", "Direct Deposit"],
      status: "active"
    }
  ],
  chatbots: [
    {
      id: "chatbot-1",
      name: "HR Onboarding Assistant",
      description: "Helps new employees navigate the onboarding process",
      capabilities: ["Answer Questions", "Guide Workflow", "Document Help"],
      aiModel: "gpt-4",
      status: "active"
    },
    {
      id: "chatbot-2",
      name: "Manager Support Bot",
      description: "Assists managers with approval processes",
      capabilities: ["Review Guidance", "Status Updates", "Policy Help"],
      aiModel: "gpt-4",
      status: "active"
    }
  ],
  integrations: [
    {
      id: "integration-1",
      name: "Background Check API",
      type: "Third Party API",
      status: "connected",
      description: "Automated background verification service"
    },
    {
      id: "integration-2",
      name: "Email Notification Service",
      type: "Email Service",
      status: "connected", 
      description: "Automated email notifications for workflow steps"
    }
  ]
};

export default function ApplicationViewer() {
  const [match, params] = useRoute("/application/:id");
  const [activeTab, setActiveTab] = useState("overview");
  const [isRunning, setIsRunning] = useState(true);

  // In a real app, you'd fetch the application data based on params.id
  const application = mockApplication;

  const handleToggleStatus = () => {
    setIsRunning(!isRunning);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "connected":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button data-testid="button-back" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{application.name}</h1>
            <p className="text-muted-foreground">{application.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="button-toggle-status"
              onClick={handleToggleStatus}
              variant={isRunning ? "destructive" : "default"}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button data-testid="button-share" variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button data-testid="button-settings" variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>{isRunning ? 'Running' : 'Stopped'}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span>Created {application.createdAt}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Last updated {application.updatedAt}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="workflows" data-testid="tab-workflows">Workflows</TabsTrigger>
          <TabsTrigger value="forms" data-testid="tab-forms">Forms</TabsTrigger>
          <TabsTrigger value="chatbots" data-testid="tab-chatbots">AI Chatbots</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  Workflows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{application.workflows.length}</div>
                <p className="text-xs text-muted-foreground">Active processes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Forms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{application.forms.length}</div>
                <p className="text-xs text-muted-foreground">Data collection forms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Chatbots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{application.chatbots.length}</div>
                <p className="text-xs text-muted-foreground">Intelligent assistants</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Integrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{application.integrations.length}</div>
                <p className="text-xs text-muted-foreground">External connections</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Overview Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application Architecture</CardTitle>
                <CardDescription>Generated components and their relationships</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Primary Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Employee Information → Background Check → Manager Approval → System Setup
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">User Roles</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">New Employee</Badge>
                    <Badge variant="outline">Manager</Badge>
                    <Badge variant="outline">HR Team</Badge>
                    <Badge variant="outline">IT Admin</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Security Features</h4>
                  <p className="text-sm text-muted-foreground">
                    Role-based access control, encrypted data storage, audit logging
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Application usage and performance data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">98.5%</div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">1.2s</div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">45</div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">128</div>
                    <p className="text-sm text-muted-foreground">Total Processed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <div className="grid gap-6">
            {application.workflows.map((workflow) => (
              <Card key={workflow.id} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {workflow.name}
                        {getStatusIcon(workflow.status)}
                      </CardTitle>
                      <CardDescription>{workflow.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{workflow.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Workflow Steps</h4>
                      <div className="flex flex-wrap gap-2">
                        {workflow.steps.map((step, index) => (
                          <Badge key={index} variant="outline">
                            {index + 1}. {step}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button data-testid={`button-view-workflow-${workflow.id}`} variant="outline" size="sm">
                        <Workflow className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button data-testid={`button-edit-workflow-${workflow.id}`} variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <div className="grid gap-6">
            {application.forms.map((form) => (
              <Card key={form.id} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {form.name}
                        {getStatusIcon(form.status)}
                      </CardTitle>
                      <CardDescription>{form.fields.length} fields</CardDescription>
                    </div>
                    <Badge variant="secondary">{form.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Form Fields</h4>
                      <div className="flex flex-wrap gap-2">
                        {form.fields.map((field, index) => (
                          <Badge key={index} variant="outline">{field}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button data-testid={`button-preview-form-${form.id}`} variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button data-testid={`button-edit-form-${form.id}`} variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chatbots" className="space-y-6">
          <div className="grid gap-6">
            {application.chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        {chatbot.name}
                        {getStatusIcon(chatbot.status)}
                      </CardTitle>
                      <CardDescription>{chatbot.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{chatbot.status}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Model: {chatbot.aiModel}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {chatbot.capabilities.map((capability, index) => (
                          <Badge key={index} variant="outline">{capability}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button data-testid={`button-chat-${chatbot.id}`} variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Test Chat
                      </Button>
                      <Button data-testid={`button-configure-chatbot-${chatbot.id}`} variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-6">
            {application.integrations.map((integration) => (
              <Card key={integration.id} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        {integration.name}
                        {getStatusIcon(integration.status)}
                      </CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{integration.status}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {integration.type}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button data-testid={`button-test-integration-${integration.id}`} variant="outline" size="sm">
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                    <Button data-testid={`button-configure-integration-${integration.id}`} variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}