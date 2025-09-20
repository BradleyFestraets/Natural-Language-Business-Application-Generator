import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Lightbulb,
  HelpCircle,
  Bot,
  Sparkles,
  TrendingUp,
  SkipForward,
  RefreshCw
} from "lucide-react";
import {
  useStartClarification,
  useSubmitClarificationResponse,
  useClarificationSession,
  useRefineRequirements,
  useValidateResponse,
  useConfidenceTracking,
  useClarificationSuggestions,
  useClarificationHistory,
  useAbandonClarification
} from "@/hooks/useClarification";

interface ClarificationInterfaceV2Props {
  businessRequirementId: string;
  currentConfidence: number;
  onComplete?: (refinedRequirements: any) => void;
  onCancel?: () => void;
  autoStart?: boolean;
  minConfidenceTarget?: number;
}

export default function ClarificationInterfaceV2({
  businessRequirementId,
  currentConfidence,
  onComplete,
  onCancel,
  autoStart = false,
  minConfidenceTarget = 0.8
}: ClarificationInterfaceV2Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState("");
  const [localResponses, setLocalResponses] = useState<{ [questionId: string]: string }>({});
  
  // React Query hooks
  const startClarification = useStartClarification();
  const submitResponse = useSubmitClarificationResponse();
  const refineRequirements = useRefineRequirements();
  const validateResponse = useValidateResponse();
  const abandonSession = useAbandonClarification();
  
  const { data: session, isLoading: sessionLoading } = useClarificationSession(sessionId);
  const { data: confidenceData } = useConfidenceTracking(businessRequirementId);
  const { data: suggestions } = useClarificationSuggestions(sessionId);
  const { data: history } = useClarificationHistory(businessRequirementId);

  // Auto-start clarification if enabled and confidence is low
  useEffect(() => {
    if (autoStart && !sessionId && currentConfidence < minConfidenceTarget) {
      handleStartClarification();
    }
  }, [autoStart, currentConfidence, minConfidenceTarget]);

  const handleStartClarification = async () => {
    try {
      const result = await startClarification.mutateAsync(businessRequirementId);
      setSessionId(result.sessionId);
    } catch (error) {
      console.error("Failed to start clarification:", error);
    }
  };

  const handleSubmitResponse = async () => {
    if (!session || !session.currentQuestion || !currentResponse.trim()) {
      return;
    }

    // Validate response first
    const validation = await validateResponse.mutateAsync({
      questionId: session.currentQuestion.id,
      response: currentResponse.trim(),
      context: localResponses
    });

    // Submit response
    const result = await submitResponse.mutateAsync({
      sessionId: session.sessionId,
      questionId: session.currentQuestion.id,
      response: currentResponse.trim()
    });

    // Update local responses
    setLocalResponses(prev => ({
      ...prev,
      [session.currentQuestion!.id]: currentResponse.trim()
    }));

    // Clear current response
    setCurrentResponse("");

    // If complete, refine requirements
    if (result.isComplete) {
      await handleRefineRequirements();
    }
  };

  const handleRefineRequirements = async () => {
    if (!session) return;

    const refined = await refineRequirements.mutateAsync({
      businessRequirementId,
      sessionId: session.sessionId
    });

    onComplete?.(refined);
  };

  const handleSkipQuestion = async () => {
    if (!session || !session.currentQuestion) return;

    // Submit empty response to skip
    await submitResponse.mutateAsync({
      sessionId: session.sessionId,
      questionId: session.currentQuestion.id,
      response: "[SKIPPED]"
    });

    setCurrentResponse("");
  };

  const handleAbandon = async () => {
    if (!session) return;
    
    await abandonSession.mutateAsync(session.sessionId);
    setSessionId(null);
    onCancel?.();
  };

  // Calculate progress and estimates
  const progressInfo = useMemo(() => {
    if (!session) {
      return {
        progress: 0,
        questionsAnswered: 0,
        totalQuestions: 0,
        estimatedTimeRemaining: 0,
        confidenceGain: 0
      };
    }

    const questionsAnswered = session.completedQuestions?.length || 0;
    const totalQuestions = session.totalQuestions || 0;
    const progress = totalQuestions > 0 ? (questionsAnswered / totalQuestions) * 100 : 0;
    const estimatedTimeRemaining = Math.max(0, (totalQuestions - questionsAnswered) * 60);
    
    // Calculate confidence gain
    const baseConfidence = currentConfidence;
    const projectedConfidence = confidenceData?.currentConfidence || baseConfidence;
    const confidenceGain = projectedConfidence - baseConfidence;

    return {
      progress,
      questionsAnswered,
      totalQuestions,
      estimatedTimeRemaining,
      confidenceGain
    };
  }, [session, currentConfidence, confidenceData]);

  // Render loading state
  if (startClarification.isPending || sessionLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Render start screen if no session
  if (!session) {
    const needsClarification = currentConfidence < minConfidenceTarget;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI-Powered Clarification System
          </CardTitle>
          <CardDescription>
            Intelligent questioning to refine your requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Confidence</span>
              <Badge className={currentConfidence >= 0.8 ? "bg-green-500" : currentConfidence >= 0.6 ? "bg-yellow-500" : "bg-red-500"}>
                {Math.round(currentConfidence * 100)}%
              </Badge>
            </div>
            <Progress value={currentConfidence * 100} className="h-2" />
            {needsClarification ? (
              <p className="text-sm text-muted-foreground">
                Your requirements need clarification to improve accuracy. Our AI will ask 1-3 targeted questions.
              </p>
            ) : (
              <p className="text-sm text-green-600">
                Your requirements have high confidence! Clarification is optional.
              </p>
            )}
          </div>

          {history && history.length > 0 && (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Previous Clarifications</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You've answered {history.length} clarification questions for this requirement
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleStartClarification}
              disabled={startClarification.isPending}
              className="flex-1"
              data-testid="button-start-clarification-v2"
            >
              {startClarification.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Intelligent Clarification
                </>
              )}
            </Button>
            {!needsClarification && onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Skip
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Typically completes in under 3 minutes</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = session.currentQuestion;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  Question {progressInfo.questionsAnswered + 1} of {progressInfo.totalQuestions}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {Math.ceil(progressInfo.estimatedTimeRemaining / 60)}m left
                </Badge>
                {progressInfo.confidenceGain > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    +{Math.round(progressInfo.confidenceGain * 100)}% confidence
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progressInfo.progress} className="h-2" data-testid="progress-clarification-v2" />
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      {currentQuestion && (
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
                data-testid="textarea-clarification-response-v2"
                placeholder="Please provide a detailed response..."
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmitResponse();
                  }
                }}
                className="min-h-[120px]"
                disabled={submitResponse.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to submit
              </p>
            </div>

            {currentQuestion.examples && currentQuestion.examples.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Examples:</Label>
                <div className="grid gap-2">
                  {currentQuestion.examples.map((example, index) => (
                    <div 
                      key={index} 
                      className="p-2 bg-muted rounded text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => setCurrentResponse(example)}
                    >
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentQuestion.suggestions && currentQuestion.suggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick Options:</Label>
                <div className="flex flex-wrap gap-2">
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

            {suggestions && suggestions.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Suggestions</span>
                </div>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmitResponse}
                disabled={!currentResponse.trim() || submitResponse.isPending}
                className="flex-1"
                data-testid="button-submit-clarification-v2"
              >
                {submitResponse.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Response
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              {!currentQuestion.required && (
                <Button
                  variant="outline"
                  onClick={handleSkipQuestion}
                  disabled={submitResponse.isPending}
                  data-testid="button-skip-question"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleAbandon}
                disabled={abandonSession.isPending}
                data-testid="button-abandon-clarification"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answered Questions Summary */}
      {progressInfo.questionsAnswered > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed Responses ({progressInfo.questionsAnswered})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(localResponses).map(([questionId, response], index) => (
                <div key={questionId} className="flex items-start gap-2 p-2 bg-muted rounded">
                  <span className="text-xs text-muted-foreground min-w-[20px]">{index + 1}.</span>
                  <p className="text-sm flex-1">{response}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}