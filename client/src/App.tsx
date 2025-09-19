import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import NaturalLanguageInput from "@/pages/natural-language-input";
import ApplicationDashboard from "@/pages/application-dashboard";
import ApplicationViewer from "@/pages/application-viewer";
import WorkflowDashboard from "@/pages/workflow-dashboard";
import WorkflowExecution from "@/pages/workflow-execution";

function Router() {
  return (
    <Switch>
      {/* Authentication Routes */}
      <Route path="/login" component={Login} />
      
      {/* Natural Language Business Application Generator Routes */}
      <Route path="/" component={NaturalLanguageInput} />
      <Route path="/dashboard" component={ApplicationDashboard} />
      <Route path="/application/:id" component={ApplicationViewer} />
      
      {/* Workflow Management Routes */}
      <Route path="/workflows" component={WorkflowDashboard} />
      <Route path="/workflows/:workflowId/start" component={WorkflowExecution} />
      <Route path="/workflows/executions/:executionId" component={WorkflowExecution} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GlobalLoadingProvider>
            <Toaster />
            <Router />
          </GlobalLoadingProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
