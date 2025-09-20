import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface ClarificationQuestion {
  id: string;
  type: "gap_filling" | "disambiguation" | "validation" | "enhancement";
  category: "workflow" | "forms" | "approvals" | "integrations" | "business_rules";
  question: string;
  context: string;
  examples?: string[];
  suggestions?: string[];
  required: boolean;
  followUp?: string;
}

export interface ClarificationSession {
  sessionId: string;
  businessRequirementId: string;
  questions: ClarificationQuestion[];
  responses: { [questionId: string]: string };
  completedQuestions: string[];
  currentQuestionIndex: number;
  currentQuestion?: ClarificationQuestion;
  totalQuestions: number;
  estimatedCompletionTime: number;
  status: "active" | "completed" | "abandoned";
  progress: number;
}

export interface RefinedRequirements {
  businessContext: any;
  processes: any[];
  forms: any[];
  approvals: any[];
  integrations: any[];
  workflowPatterns: any[];
  clarificationResponses: { [questionId: string]: string };
  refinementScore: number;
  completenessScore: number;
  consistencyScore: number;
  suggestions: string[];
  confidence: number;
}

// Hook to start a clarification session
export function useStartClarification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (businessRequirementId: string): Promise<ClarificationSession> => {
      const response = await apiRequest(
        "POST",
        "/api/nlp/clarification/questions",
        { businessRequirementId }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      // Cache the session data
      queryClient.setQueryData(
        ["clarification-session", data.sessionId],
        data
      );
      
      toast({
        title: "Clarification Started",
        description: `${data.totalQuestions} targeted questions to refine your requirements.`,
      });
    },
    onError: (error) => {
      console.error("Failed to start clarification:", error);
      toast({
        title: "Error",
        description: "Failed to start clarification process. Please try again.",
        variant: "destructive"
      });
    }
  });
}

// Hook to submit a clarification response
export function useSubmitClarificationResponse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sessionId,
      questionId,
      response
    }: {
      sessionId: string;
      questionId: string;
      response: string;
    }) => {
      const res = await apiRequest(
        "POST",
        "/api/nlp/clarification/response",
        { sessionId, questionId, response }
      );
      return await res.json();
    },
    onSuccess: (data, variables) => {
      // Update session cache with new state
      queryClient.setQueryData(
        ["clarification-session", variables.sessionId],
        (oldData: ClarificationSession | undefined) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            responses: {
              ...oldData.responses,
              [variables.questionId]: variables.response
            },
            completedQuestions: [...oldData.completedQuestions, variables.questionId],
            currentQuestionIndex: data.currentQuestionIndex || oldData.currentQuestionIndex + 1,
            currentQuestion: data.nextQuestion,
            progress: data.progress,
            status: data.isComplete ? "completed" : "active"
          };
        }
      );

      if (!data.isComplete && data.nextQuestion) {
        toast({
          title: "Response Recorded",
          description: "Moving to next question...",
        });
      }
    },
    onError: (error) => {
      console.error("Failed to submit response:", error);
      toast({
        title: "Error",
        description: "Failed to submit response. Please try again.",
        variant: "destructive"
      });
    }
  });
}

// Hook to get current clarification session
export function useClarificationSession(sessionId: string | null) {
  return useQuery({
    queryKey: ["clarification-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await apiRequest(
        "GET",
        `/api/nlp/clarification/session/${sessionId}`
      );
      return await response.json();
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    refetchInterval: false
  });
}

// Hook to refine requirements based on clarification
export function useRefineRequirements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      businessRequirementId,
      sessionId
    }: {
      businessRequirementId: string;
      sessionId: string;
    }): Promise<RefinedRequirements> => {
      const response = await apiRequest(
        "POST",
        `/api/nlp/requirements/${businessRequirementId}/refine`,
        { sessionId }
      );
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate requirements cache
      queryClient.invalidateQueries({
        queryKey: ["/api/nlp/requirements", variables.businessRequirementId]
      });
      
      // Update session status
      queryClient.setQueryData(
        ["clarification-session", variables.sessionId],
        (oldData: ClarificationSession | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            status: "completed"
          };
        }
      );
      
      toast({
        title: "Requirements Refined",
        description: `Confidence improved to ${Math.round((data.confidence || 0.8) * 100)}%. Your requirements are ready for application generation.`,
        duration: 5000
      });
    },
    onError: (error) => {
      console.error("Failed to refine requirements:", error);
      toast({
        title: "Error",
        description: "Failed to refine requirements. Please try again.",
        variant: "destructive"
      });
    }
  });
}

// Hook to validate response consistency
export function useValidateResponse() {
  return useMutation({
    mutationFn: async ({
      questionId,
      response,
      context
    }: {
      questionId: string;
      response: string;
      context: any;
    }) => {
      const res = await apiRequest(
        "POST",
        "/api/nlp/clarification/validate",
        { questionId, response, context }
      );
      return await res.json();
    }
  });
}

// Hook for real-time confidence tracking
export function useConfidenceTracking(businessRequirementId: string | null) {
  return useQuery({
    queryKey: ["confidence-tracking", businessRequirementId],
    queryFn: async () => {
      if (!businessRequirementId) return null;
      const response = await apiRequest(
        "GET",
        `/api/nlp/requirements/${businessRequirementId}/confidence`
      );
      return await response.json();
    },
    enabled: !!businessRequirementId,
    refetchInterval: 10000 // Update every 10 seconds during clarification
  });
}

// Hook to get clarification suggestions
export function useClarificationSuggestions(sessionId: string | null) {
  return useQuery({
    queryKey: ["clarification-suggestions", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const response = await apiRequest(
        "GET",
        `/api/nlp/clarification/suggestions/${sessionId}`
      );
      return await response.json();
    },
    enabled: !!sessionId,
    staleTime: 60000 // 1 minute
  });
}

// Hook to manage clarification conversation history
export function useClarificationHistory(businessRequirementId: string | null) {
  return useQuery({
    queryKey: ["clarification-history", businessRequirementId],
    queryFn: async () => {
      if (!businessRequirementId) return [];
      const response = await apiRequest(
        "GET",
        `/api/nlp/clarification/history/${businessRequirementId}`
      );
      return await response.json();
    },
    enabled: !!businessRequirementId
  });
}

// Hook to abandon clarification session
export function useAbandonClarification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/nlp/clarification/abandon/${sessionId}`,
        {}
      );
      return await response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.setQueryData(
        ["clarification-session", sessionId],
        (oldData: ClarificationSession | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            status: "abandoned" as const
          };
        }
      );
      
      toast({
        title: "Session Ended",
        description: "You can restart clarification at any time.",
      });
    }
  });
}