import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Bot,
  Workflow,
  FileText,
  Settings
} from "lucide-react";
import { useState } from "react";
import { EmbeddedChatbot } from "@/components/chatbot";
import { useWorkflowWebSocket } from "@/hooks/useWorkflowWebSocket";
import VisualAssetViewer from "@/components/visual-assets/VisualAssetViewer";

// Mock data for demonstration
const mockApplications = [
  {
    id: "app-1",
    name: "Employee Onboarding System",
    description: "Complete onboarding workflow with background checks and approvals",
    status: "completed" as const,
    completionPercentage: 100,
    createdAt: "2025-01-15",
    workflows: 3,
    forms: 5,
    chatbots: 2,
    integrations: 2
  },
  {
    id: "app-2",
    name: "Expense Reporting System",
    description: "Receipt scanning, approval workflows, and payment processing",
    status: "generating" as const,
    completionPercentage: 65,
    createdAt: "2025-01-18",
    workflows: 2,
    forms: 3,
    chatbots: 1,
    integrations: 3
  },
  {
    id: "app-3",
    name: "Leave Management System",
    description: "Time off requests, approvals, and balance tracking",
    status: "generating" as const,
    completionPercentage: 25,
    createdAt: "2025-01-18",
    workflows: 1,
    forms: 2,
    chatbots: 1,
    integrations: 1
  }
];

const mockRequirements = [
  {
    id: "req-1",
    description: "Create a customer support ticketing system with AI chatbot assistance",
    status: "analyzing" as const,
    confidence: 0.8,
    createdAt: "2025-01-18"
  },
  {
    id: "req-2",
    description: "Build an inventory management system with automated reordering",
    status: "validated" as const,
    confidence: 0.9,
    createdAt: "2025-01-17"
  }
];

export default function ApplicationDashboard() {
  const [activeTab, setActiveTab] = useState("applications");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "generating":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "analyzing":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "validated":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "generating":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "analyzing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "validated":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Application Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your generated business applications and monitor their status
            </p>
          </div>
          <Button data-testid="button-new-application" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="applications" data-testid="tab-applications">
            Generated Applications
          </TabsTrigger>
          <TabsTrigger value="requirements" data-testid="tab-requirements">
            Business Requirements
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          <div className="grid gap-6">
            {mockApplications.map((app) => (
              <Card key={app.id} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {app.name}
                        {getStatusIcon(app.status)}
                      </CardTitle>
                      <CardDescription>{app.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(app.status)}>
                      {app.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {app.status === "generating" && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Generation Progress</span>
                        <span>{app.completionPercentage}%</span>
                      </div>
                      <Progress value={app.completionPercentage} className="h-2" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-blue-500" />
                      <span>{app.workflows} Workflows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span>{app.forms} Forms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-purple-500" />
                      <span>{app.chatbots} AI Chatbots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <span>{app.integrations} Integrations</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Created {app.createdAt}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        data-testid={`button-view-${app.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        data-testid={`button-edit-${app.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        data-testid={`button-settings-${app.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <div className="grid gap-6">
            {mockRequirements.map((req) => (
              <Card key={req.id} className="hover-elevate">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        Business Requirement
                        {getStatusIcon(req.status)}
                      </CardTitle>
                      <CardDescription>{req.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(req.status)}>
                        {req.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Confidence: {Math.round(req.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Analyzed {req.createdAt}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        data-testid={`button-generate-from-${req.id}`}
                        size="sm"
                        disabled={req.status !== "validated"}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Generate App
                      </Button>
                      <Button
                        data-testid={`button-delete-${req.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  +1 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1</div>
                <p className="text-xs text-muted-foreground">
                  33% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active AI Chatbots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">
                  Across all applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">
                  Automated business processes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">
                  External API connections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Generation Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2min</div>
                <p className="text-xs text-muted-foreground">
                  From description to app
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="computer-use" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🖥️ Computer Use Automation
              </CardTitle>
              <CardDescription>
                AI-powered automation capabilities for interacting with desktop applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* selectedApp is not defined here, assuming it will be handled in a parent component or fetched */}
              {/* For demonstration, let's assume a default structure or conditionally render if selectedApp exists */}
              {selectedApp && selectedApp.computerUse ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedApp.computerUse.capabilities?.map((capability: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-sm">{capability.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {capability.category} • {capability.businessContext}
                          </CardDescription>
                        </Header>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-3">{capability.description}</p>
                          <Badge variant="outline" className="text-xs">
                            {capability.actions?.length || 0} actions
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {selectedApp.computerUse.setupInstructions && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Setup Instructions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto whitespace-pre-wrap">
                          {selectedApp.computerUse.setupInstructions}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No computer use capabilities generated</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual-assets" className="space-y-4">
          <VisualAssetViewer
            businessRequirement={selectedApp?.businessRequirement} // Use optional chaining as selectedApp might be null initially
            onAssetsGenerated={(assets) => {
              setApplications(prev =>
                prev.map(app =>
                  app.id === selectedApp?.id
                    ? { ...app, visualAssets: assets }
                    : app
                )
              );
              setSelectedApp(prev => ({ ...prev, visualAssets: assets }));
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}