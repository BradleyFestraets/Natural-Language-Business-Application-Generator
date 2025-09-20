import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import NaturalLanguageInput from '@/components/nlp/NaturalLanguageInput';
import RequirementVisualization from '@/components/nlp/RequirementVisualization';
import ConversationHistory from '@/components/nlp/ConversationHistory';
import { Brain, Sparkles, MessageSquare, CheckCircle } from 'lucide-react';
import type { BusinessRequirement } from '@shared/schema';

export default function NLPDemo() {
  const [parsedRequirement, setParsedRequirement] = useState<BusinessRequirement | null>(null);
  const [conversationId, setConversationId] = useState<string>(`demo-${Date.now()}`);
  const [conversation, setConversation] = useState<any[]>([]);
  const { toast } = useToast();

  // Query for existing requirements
  const { data: requirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ['nlp', 'requirements'],
    queryFn: () => apiRequest('/api/business-requirements'),
  });

  // Parse business description mutation
  const parseMutation = useMutation({
    mutationFn: (description: string) =>
      apiRequest('/api/nlp/parse-business-description', {
        method: 'POST',
        body: JSON.stringify({
          description,
          conversationId,
        }),
      }),
    onSuccess: (data: BusinessRequirement) => {
      setParsedRequirement(data);
      
      // Add to conversation
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user' as const,
        content: data.originalDescription,
        timestamp: new Date(),
      };
      
      const aiMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai' as const,
        content: 'Successfully extracted business requirements',
        timestamp: new Date(),
        metadata: {
          confidence: data.confidence,
          extractedEntities: data.extractedEntities,
        },
      };
      
      setConversation(prev => [...prev, userMessage, aiMessage]);
      
      queryClient.invalidateQueries({ queryKey: ['nlp', 'requirements'] });
      toast({
        title: 'Requirements Analyzed',
        description: `Extracted ${Object.keys(data.extractedEntities || {}).length} requirement categories with ${Math.round(data.confidence * 100)}% confidence`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to parse business requirements',
        variant: 'destructive',
      });
    },
  });

  // Generate application from requirement
  const generateMutation = useMutation({
    mutationFn: (requirementId: string) =>
      apiRequest('/api/generate-application', {
        method: 'POST',
        body: JSON.stringify({
          businessRequirementId: requirementId,
        }),
      }),
    onSuccess: () => {
      toast({
        title: 'Application Generation Started',
        description: 'Your business application is being generated. This may take a few minutes.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to start application generation',
        variant: 'destructive',
      });
    },
  });

  const handleNaturalLanguageSubmit = async (data: { description: string }) => {
    parseMutation.mutate(data.description);
  };

  const handleGenerateApplication = () => {
    if (parsedRequirement?.id) {
      generateMutation.mutate(parsedRequirement.id);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Natural Language Interface</h1>
          <p className="text-muted-foreground">
            Describe your business application in plain English and watch AI extract structured requirements
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Brain className="w-3 h-3" />
          AI-Powered Analysis
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input and Visualization */}
        <div className="space-y-6">
          {/* Natural Language Input */}
          <NaturalLanguageInput
            onSubmit={handleNaturalLanguageSubmit}
            isLoading={parseMutation.isPending}
            showVoiceInput={true}
            maxLength={10000}
          />

          {/* Requirement Visualization */}
          {parsedRequirement && (
            <RequirementVisualization
              extractedData={{
                processes: parsedRequirement.extractedEntities?.processes_legacy || [],
                forms: parsedRequirement.extractedEntities?.forms_legacy || [],
                approvals: parsedRequirement.extractedEntities?.approvals_legacy || [],
                integrations: parsedRequirement.extractedEntities?.integrations_legacy || [],
                workflowPatterns: Array.isArray(parsedRequirement.workflowPatterns) 
                  ? parsedRequirement.workflowPatterns.map(w => 
                      typeof w === 'string' ? w : w.name
                    )
                  : [],
                confidence: parsedRequirement.confidence,
              }}
              onGenerateApplication={handleGenerateApplication}
              isLoading={generateMutation.isPending}
            />
          )}
        </div>

        {/* Right Column - Conversation History and Stats */}
        <div className="space-y-6">
          {/* Conversation History */}
          <ConversationHistory
            conversation={conversation}
            showTimestamps={true}
            showConfidence={true}
            showExtractedEntities={true}
            searchable={true}
            exportable={true}
            enableActions={true}
            showStats={true}
            onExport={(conv) => {
              const blob = new Blob([JSON.stringify(conv, null, 2)], { 
                type: 'application/json' 
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `conversation-${conversationId}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />

          {/* Stats and Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Capabilities
              </CardTitle>
              <CardDescription>
                Advanced features powered by OpenAI GPT-4
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Real-time streaming analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Speech-to-text input</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Intelligent auto-completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Confidence scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Context preservation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Multi-turn conversations</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Requirements */}
      {requirements && requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Requirements</CardTitle>
            <CardDescription>
              Previously analyzed business requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requirements.slice(0, 5).map((req: BusinessRequirement) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setParsedRequirement(req)}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-2">
                      {req.originalDescription}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {req.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {Math.round(req.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateMutation.mutate(req.id);
                    }}
                  >
                    Generate App
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}