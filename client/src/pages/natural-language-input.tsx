import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";
import NaturalLanguageInput from "@/components/nlp/NaturalLanguageInput";
import RequirementVisualization from "@/components/nlp/RequirementVisualization";

export default function NaturalLanguageInputPage() {
  const [businessRequirementId, setBusinessRequirementId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [streamingStatus, setStreamingStatus] = useState<"analyzing" | "processing" | "completed" | "error" | undefined>(undefined);
  const [streamingMessage, setStreamingMessage] = useState("");
  
  const toast = useEnhancedToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { startLoading, stopLoading, updateProgress } = useGlobalLoading();
  const websocketRef = useRef<WebSocket | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Authentication Required", {
        description: "You need to log in to use this application.",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // WebSocket connection management
  const connectWebSocket = (analysisSessionId: string, csrfToken?: string) => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/nlp-analysis/${analysisSessionId}`;
    const ws = csrfToken ? new WebSocket(wsUrl, `csrf-${csrfToken}`) : new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to NLP analysis WebSocket');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'nlp_progress') {
          setStreamingProgress(data.progress || 0);
          setStreamingStatus(data.status);
          setStreamingMessage(data.message || "");
          
          // Update partial data during streaming
          if (data.partialData) {
            setExtractedData(data.partialData);
          }
          
          // Handle completion
          if (data.status === 'completed' && data.finalResult) {
            setExtractedData({
              processes: data.finalResult.extractedEntities.processes,
              forms: data.finalResult.extractedEntities.forms,
              approvals: data.finalResult.extractedEntities.approvals,
              integrations: data.finalResult.extractedEntities.integrations,
              workflowPatterns: data.finalResult.workflowPatterns,
              confidence: data.finalResult.confidence
            });
            setIsStreaming(false);
            toast({
              title: "Requirements Analyzed",
              description: `AI confidence: ${Math.round((data.finalResult.confidence || 0) * 100)}%`
            });
          }
          
          // Handle errors
          if (data.status === 'error') {
            setIsStreaming(false);
            toast({
              title: "Analysis Failed",
              description: data.message || "Failed to analyze business requirements.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('NLP analysis WebSocket disconnected');
      setIsStreaming(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsStreaming(false);
      toast.error("Connection Error", {
        description: "Lost connection to real-time analysis updates.",
      });
    };
    
    websocketRef.current = ws;
  };

  // Mutation for streaming parsing business description
  const parseDescriptionMutation = useMutation({
    mutationFn: async (data: { description: string }) => {
      const response = await apiRequest("POST", "/api/nlp/parse-business-description/stream", {
        description: data.description
      });
      return response.json();
    },
    onSuccess: (data) => {
      setBusinessRequirementId(data.businessRequirementId);
      setIsStreaming(true);
      setStreamingProgress(0);
      setStreamingStatus("analyzing");
      setStreamingMessage("Starting AI analysis...");
      
      // Connect to WebSocket for real-time updates
      connectWebSocket(data.analysisSessionId, data.csrfToken);
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
        description: "Failed to start analysis. Please try again.",
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
            isLoading={parseDescriptionMutation.isPending || isStreaming}
            isStreaming={isStreaming}
            progress={streamingProgress}
            status={streamingStatus}
            onGenerateApplication={handleGenerateApplication}
          />
        </div>
      </div>
    </div>
  );
}