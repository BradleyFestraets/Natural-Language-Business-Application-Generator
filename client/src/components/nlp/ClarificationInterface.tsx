import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Lightbulb,
  HelpCircle,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ClarificationQuestion {
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

interface ClarificationSession {
  sessionId: string;
  businessRequirementId: string;
  questions: ClarificationQuestion[];
  totalQuestions: number;
  currentQuestionIndex: number;
  estimatedCompletionTime: number;
  status: "active" | "completed" | "abandoned";
}

interface ClarificationInterfaceProps {
  businessRequirementId: string;
  onComplete?: (refinedRequirements: any) => void;
  onCancel?: () => void;
  autoStart?: boolean;
}

export default function ClarificationInterface({
  businessRequirementId,
  onComplete,
  onCancel,
  autoStart = false
}: ClarificationInterfaceProps) {
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ClarificationQuestion | null>(null);
  const [responses, setResponses] = useState<{ [questionId: string]: string }>({});
  const [currentResponse, setCurrentResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(autoStart);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Initialize clarification session
  const startClarification = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "POST",
        "/api/nlp/clarification/questions",
        { businessRequirementId }
      );
      const data = await response.json();

      setSession(data);
      setCurrentQuestion(data.currentQuestion);
      setProgress(0);
      setHasStarted(true);
      
      toast({
        title: "Clarification Started",
        description: `${data.totalQuestions} questions to help refine your requirements.`
      });
    } catch (error) {
      console.error("Failed to start clarification:", error);
      toast({
        title: "Error",
        description: "Failed to start clarification process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessRequirementId, isLoading, toast]);

  // Submit response to current question
  const submitResponse = useCallback(async () => {
    if (!session || !currentQuestion || !currentResponse.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest(
        "POST",
        "/api/nlp/clarification/response",
        {
          sessionId: session.sessionId,
          questionId: currentQuestion.id,
          response: currentResponse.trim()
        }
      );
      const data = await response.json();

      // Update responses history
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: currentResponse.trim()
      }));

      // Update progress
      setProgress(data.progress || 0);

      if (data.isComplete) {
        // Clarification complete, now refine requirements
        await refineRequirements(session.sessionId);
      } else {
        // Move to next question
        setCurrentQuestion(data.nextQuestion);
        setCurrentResponse("");
        
        toast({
          title: "Response Recorded",
          description: data.nextQuestion ? 
            "Moving to next question..." : 
            "Processing your responses..."
        });
      }
    } catch (error) {
      console.error("Failed to submit response:", error);
      toast({
        title: "Error",
        description: "Failed to submit response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [session, currentQuestion, currentResponse, isSubmitting, toast]);

  // Refine requirements based on clarification responses
  const refineRequirements = useCallback(async (sessionId: string) => {
    try {
      const response = await apiRequest(
        "POST",
        `/api/nlp/requirements/${businessRequirementId}/refine`,
        { sessionId }
      );
      const data = await response.json();

      toast({
        title: "Requirements Refined",
        description: "Your requirements have been enhanced based on your responses.",
        duration: 5000
      });

      onComplete?.(data.refinedRequirements);
    } catch (error) {
      console.error("Failed to refine requirements:", error);
      toast({
        title: "Error",
        description: "Failed to refine requirements. Please try again.",
        variant: "destructive"
      });
    }
  }, [businessRequirementId, onComplete, toast]);

  // Auto-start clarification if enabled
  useEffect(() => {
    if (autoStart && !hasStarted && !session) {
      startClarification();
    }
  }, [autoStart, hasStarted, session, startClarification]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitResponse();
    }
  }, [submitResponse]);

  const isSubmitDisabled = !currentResponse.trim() || isSubmitting;
  const completedQuestions = Object.keys(responses).length;
  const estimatedTimeRemaining = session ? 
    Math.max(0, session.estimatedCompletionTime - (completedQuestions * 60)) : 0;

  if (!hasStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            AI-Powered Clarification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Our AI will ask a few targeted questions to better understand your requirements 
            and generate a more accurate application.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Typically takes 3-5 minutes</span>
          </div>
          <Button 
            onClick={startClarification} 
            disabled={isLoading}
            data-testid="button-start-clarification"
          >
            {isLoading ? "Starting..." : "Start Clarification"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!session || !currentQuestion) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Bot className="h-5 w-5 animate-pulse" />
            <span>Loading clarification questions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  Question {completedQuestions + 1} of {session.totalQuestions}
                </span>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.ceil(estimatedTimeRemaining / 60)}m left
              </Badge>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-clarification" />
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {currentQuestion.type === "gap_filling" && <HelpCircle className="h-5 w-5 text-blue-500" />}
              {currentQuestion.type === "disambiguation" && <AlertCircle className="h-5 w-5 text-orange-500" />}
              {currentQuestion.type === "validation" && <CheckCircle className="h-5 w-5 text-green-500" />}
              {currentQuestion.type === "enhancement" && <Lightbulb className="h-5 w-5 text-purple-500" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.category.replace("_", " ")}
                </Badge>
                {currentQuestion.required && (
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.context && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{currentQuestion.context}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="response">Your Response</Label>
            <Textarea
              id="response"
              data-testid="textarea-clarification-response"
              placeholder="Please provide a detailed response..."
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to submit
            </p>
          </div>

          {currentQuestion.examples && currentQuestion.examples.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Examples:</Label>
              <div className="space-y-1">
                {currentQuestion.examples.map((example, index) => (
                  <div key={index} className="p-2 bg-muted rounded text-sm">
                    {example}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.suggestions && currentQuestion.suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Quick Options:</Label>
              <div className="flex flex-wrap gap-1">
                {currentQuestion.suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCurrentResponse(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={submitResponse}
              disabled={isSubmitDisabled}
              className="flex-1"
              data-testid="button-submit-clarification"
            >
              {isSubmitting ? "Submitting..." : (
                <>
                  Submit Response
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-clarification"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {completedQuestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completed Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(responses).map(([questionId, response], index) => (
                <div key={questionId} className="flex items-start gap-2 p-2 bg-muted rounded">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Question {index + 1}</p>
                    <p className="text-sm truncate">{response}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}