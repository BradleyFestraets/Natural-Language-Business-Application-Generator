import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Send, Sparkles, Brain } from "lucide-react";
import { useState } from "react";

export default function NaturalLanguageInput() {
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    
    setIsProcessing(true);
    try {
      // TODO: Connect to /api/nlp/parse-business-description
      // For now, simulate processing
      setTimeout(() => {
        setExtractedEntities({
          processes: ["employee_onboarding", "background_verification"],
          forms: ["employee_information_form", "background_check_form"],
          approvals: ["manager_approval", "hr_approval"],
          integrations: ["background_check_api"]
        });
        setConfidence(0.85);
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error("Error processing description:", error);
      setIsProcessing(false);
    }
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Describe Your Business Application
              </CardTitle>
              <CardDescription>
                Tell us what kind of business application you need. Be specific about processes, users, and outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  data-testid="input-natural-language"
                  placeholder="Example: Create an employee onboarding system with background checks, document collection, manager approvals, and automated notifications. New employees should fill out personal information, submit required documents, get background checks processed, and receive approval from their manager and HR before gaining system access."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-32 resize-none"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  data-testid="button-voice-input"
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Voice Input
                </Button>
                <Button
                  data-testid="button-submit"
                  onClick={handleSubmit}
                  disabled={!description.trim() || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Generate Application
                    </>
                  )}
                </Button>
              </div>

              {description && (
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Characters: {description.length}</span>
                    <span className={description.length >= 50 ? "text-green-600" : "text-orange-500"}>
                      {description.length >= 50 ? "Good detail level" : "More details recommended"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Templates</CardTitle>
              <CardDescription>Click to use pre-built business scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                data-testid="template-onboarding"
                variant="outline"
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => setDescription("Create an employee onboarding system with background checks, document collection, manager approvals, and automated notifications. New employees should fill out personal information, submit required documents, get background checks processed, and receive approval from their manager and HR before gaining system access.")}
              >
                <div>
                  <div className="font-medium">Employee Onboarding</div>
                  <div className="text-sm text-muted-foreground">Background checks, approvals, document management</div>
                </div>
              </Button>
              <Button
                data-testid="template-expense"
                variant="outline"
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => setDescription("Build an expense reporting system where employees submit expense claims with receipts, managers review and approve expenses, finance processes payments, and the system sends automated notifications for each step. Include receipt scanning and expense categorization.")}
              >
                <div>
                  <div className="font-medium">Expense Reporting</div>
                  <div className="text-sm text-muted-foreground">Receipt scanning, approvals, payment processing</div>
                </div>
              </Button>
              <Button
                data-testid="template-leave"
                variant="outline"
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => setDescription("Create a leave management system where employees request time off, managers approve or deny requests, HR tracks leave balances, and the system integrates with payroll and calendar systems. Include holiday calendar and leave policy enforcement.")}
              >
                <div>
                  <div className="font-medium">Leave Management</div>
                  <div className="text-sm text-muted-foreground">Time off requests, approvals, balance tracking</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results Section */}
        <div className="space-y-6">
          {isProcessing && (
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
                    <Progress value={75} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Extracting workflow patterns and entities
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {extractedEntities && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Business Requirements</CardTitle>
                <CardDescription>
                  AI Confidence: {Math.round(confidence * 100)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div data-testid="extracted-processes">
                  <h4 className="font-medium mb-2">Business Processes</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedEntities.processes?.map((process: string, index: number) => (
                      <Badge key={index} variant="default">{process.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>

                <div data-testid="extracted-forms">
                  <h4 className="font-medium mb-2">Required Forms</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedEntities.forms?.map((form: string, index: number) => (
                      <Badge key={index} variant="secondary">{form.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>

                <div data-testid="extracted-approvals">
                  <h4 className="font-medium mb-2">Approval Steps</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedEntities.approvals?.map((approval: string, index: number) => (
                      <Badge key={index} variant="outline">{approval.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>

                <div data-testid="extracted-integrations">
                  <h4 className="font-medium mb-2">System Integrations</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedEntities.integrations?.map((integration: string, index: number) => (
                      <Badge key={index} variant="destructive">{integration.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button data-testid="button-generate-app" className="w-full" size="lg">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Complete Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isProcessing && !extractedEntities && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Ready for AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Describe your business application above and our AI will extract structured requirements
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}