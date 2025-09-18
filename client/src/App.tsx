import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import NaturalLanguageInput from "@/pages/natural-language-input";
import ApplicationDashboard from "@/pages/application-dashboard";
import ApplicationViewer from "@/pages/application-viewer";

function Router() {
  return (
    <Switch>
      {/* Natural Language Business Application Generator Routes */}
      <Route path="/" component={NaturalLanguageInput} />
      <Route path="/dashboard" component={ApplicationDashboard} />
      <Route path="/application/:id" component={ApplicationViewer} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
