import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Sparkles, CheckCircle } from "lucide-react";

interface ExtractedData {
  processes?: string[];
  forms?: string[];
  approvals?: string[];
  integrations?: string[];
  workflowPatterns?: string[];
  confidence: number;
}

interface RequirementVisualizationProps {
  extractedData?: ExtractedData;
  isLoading?: boolean;
  isStreaming?: boolean;
  progress?: number;
  status?: string;
  onGenerateApplication?: () => void;
  error?: string;
}

export default function RequirementVisualization({
  extractedData,
  isLoading = false,
  isStreaming = false,
  progress = 0,
  status = "Extracting workflow patterns and entities",
  onGenerateApplication,
  error
}: RequirementVisualizationProps) {
  
  const formatLabel = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const renderBadgeSection = (
    title: string, 
    items: string[] = [], 
    variant: "default" | "secondary" | "outline" | "destructive" = "default",
    testId: string
  ) => (
    <div data-testid={testId}>
      <h4 className="font-medium mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <Badge key={index} variant={variant}>
              {formatLabel(item)}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground italic">None detected</span>
        )}
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis in Progress</CardTitle>
          <CardDescription>Parsing your business requirements...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Analyzing business processes</span>
                <span>Processing...</span>
              </div>
              <Progress 
                value={progress} 
                className="h-2" 
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              {status}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-8 text-center">
          <div className="h-12 w-12 mx-auto mb-4 text-destructive">
            <Brain className="h-full w-full" />
          </div>
          <h3 className="font-medium mb-2 text-destructive">Analysis Error</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Extracted data display
  if (extractedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Extracted Business Requirements</span>
            {isStreaming && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Streaming...
              </div>
            )}
          </CardTitle>
          <CardDescription className={getConfidenceColor(extractedData.confidence)}>
            AI Confidence: {Math.round(extractedData.confidence * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderBadgeSection(
            "Business Processes", 
            extractedData.processes, 
            "default", 
            "extracted-processes"
          )}
          
          {renderBadgeSection(
            "Required Forms", 
            extractedData.forms, 
            "secondary", 
            "extracted-forms"
          )}
          
          {renderBadgeSection(
            "Approval Steps", 
            extractedData.approvals, 
            "outline", 
            "extracted-approvals"
          )}
          
          {renderBadgeSection(
            "System Integrations", 
            extractedData.integrations, 
            "destructive", 
            "extracted-integrations"
          )}

          {extractedData.workflowPatterns && extractedData.workflowPatterns.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Workflow Patterns</h4>
              <div className="flex flex-wrap gap-2">
                {extractedData.workflowPatterns.map((pattern, index) => (
                  <Badge key={index} variant="outline" className="border-blue-200 text-blue-700">
                    {formatLabel(pattern)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Confidence indicator */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Analysis Quality</span>
              <div className="flex items-center gap-2">
                <Progress 
                  value={extractedData.confidence * 100} 
                  className="w-20 h-2" 
                />
                <span className={getConfidenceColor(extractedData.confidence)}>
                  {extractedData.confidence >= 0.8 ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">
                      {Math.round(extractedData.confidence * 100)}%
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              data-testid="button-generate-app" 
              className="w-full" 
              size="lg"
              onClick={onGenerateApplication}
              disabled={extractedData.confidence < 0.5}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Complete Application
            </Button>
            {extractedData.confidence < 0.5 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Low confidence - consider providing more details
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  return (
    <Card className="border-dashed" data-testid="visualization-empty">
      <CardContent className="p-8 text-center">
        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-medium mb-2">Ready for AI Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Describe your business application above and our AI will extract structured requirements
        </p>
      </CardContent>
    </Card>
  );
}