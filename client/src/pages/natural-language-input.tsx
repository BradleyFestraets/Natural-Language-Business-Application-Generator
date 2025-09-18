import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import NaturalLanguageInput from "@/components/nlp/NaturalLanguageInput";
import RequirementVisualization from "@/components/nlp/RequirementVisualization";

export default function NaturalLanguageInputPage() {
  const [businessRequirementId, setBusinessRequirementId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to use this application.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Mutation for parsing business description
  const parseDescriptionMutation = useMutation({
    mutationFn: async (data: { description: string }) => {
      const response = await apiRequest("POST", "/api/nlp/parse-business-description", {
        description: data.description
        // Note: userId now derived from authenticated session server-side
        // Optional conversationId and context fields omitted
      });
      return response.json();
    },
    onSuccess: (data) => {
      setBusinessRequirementId(data.businessRequirementId);
      setExtractedData({
        processes: data.extractedEntities.processes,
        forms: data.extractedEntities.forms,
        approvals: data.extractedEntities.approvals,
        integrations: data.extractedEntities.integrations,
        workflowPatterns: data.workflowPatterns,
        confidence: data.confidence
      });
      toast({
        title: "Requirements Analyzed",
        description: `AI confidence: ${Math.round(data.confidence * 100)}%`
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze business requirements. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for generating application
  const generateApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!businessRequirementId) throw new Error("No business requirement ID");
      const response = await apiRequest("POST", "/api/generate/application", {
        businessRequirementId
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerating(true);
      toast({
        title: "Application Generation Started",
        description: `Estimated completion: ${new Date(data.estimatedCompletionTime).toLocaleTimeString()}`
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Generation Failed",
        description: "Failed to start application generation. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDescriptionSubmit = async (data: { description: string }) => {
    parseDescriptionMutation.mutate(data);
  };

  const handleGenerateApplication = () => {
    generateApplicationMutation.mutate();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-center">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Natural Language Business Application Generator
          </span>
        </h1>
        <p className="text-muted-foreground text-center text-lg">
          Describe your business process in plain English and watch AI create a complete application with workflows, forms, and embedded chatbots
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-6">
          <NaturalLanguageInput
            onSubmit={handleDescriptionSubmit}
            isLoading={parseDescriptionMutation.isPending}
            placeholder="Example: Create an employee onboarding system with background checks, document collection, manager approvals, and automated notifications. New employees should fill out personal information, submit required documents, get background checks processed, and receive approval from their manager and HR before gaining system access."
          />
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <RequirementVisualization
            extractedData={extractedData}
            isLoading={parseDescriptionMutation.isPending}
            onGenerateApplication={handleGenerateApplication}
          />
        </div>
      </div>
    </div>
  );
}