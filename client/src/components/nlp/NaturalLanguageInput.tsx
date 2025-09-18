import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Send, Sparkles } from "lucide-react";
import VoiceInput from "./VoiceInput.js";

interface NaturalLanguageInputProps {
  onSubmit?: (data: { description: string }) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
  showVoiceInput?: boolean;
  maxLength?: number;
  minLength?: number;
}

export default function NaturalLanguageInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Example: Create an employee onboarding system with background checks, document collection, manager approvals, and automated notifications. New employees should fill out personal information, submit required documents, get background checks processed, and receive approval from their manager and HR before gaining system access.",
  initialValue = "",
  showVoiceInput = true,
  maxLength = 5000,
  minLength = 10
}: NaturalLanguageInputProps) {
  const [description, setDescription] = useState(initialValue);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || description.length < minLength || isProcessing || disabled) {
      return;
    }

    setIsProcessing(true);
    try {
      await onSubmit?.({ description: description.trim() });
    } catch (error) {
      console.error("Error submitting description:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [description, minLength, isProcessing, disabled, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setDescription(prev => {
      const newValue = prev ? `${prev} ${transcript}` : transcript;
      return newValue.slice(0, maxLength);
    });
  }, [maxLength]);

  const isSubmitDisabled = !description.trim() || 
                          description.length < minLength || 
                          isProcessing || 
                          isLoading || 
                          disabled;

  const currentLength = description.length;
  const hasGoodDetail = currentLength >= 50;
  const isNearLimit = currentLength > maxLength * 0.8;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
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
            placeholder={placeholder}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            className="min-h-32 resize-none"
            disabled={isProcessing || isLoading || disabled}
            maxLength={maxLength}
          />
        </div>
        
        <div className="flex gap-2">
          {showVoiceInput && (
            <VoiceInput 
              onTranscript={handleVoiceTranscript}
              disabled={isProcessing || isLoading || disabled}
            />
          )}
          <Button
            data-testid="button-submit"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="flex-1"
          >
            {isProcessing || isLoading ? (
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
              <span>Characters: {currentLength}</span>
              <span className={
                hasGoodDetail 
                  ? "text-green-600" 
                  : isNearLimit 
                    ? "text-orange-500" 
                    : "text-orange-500"
              }>
                {hasGoodDetail 
                  ? "Good detail level" 
                  : currentLength < minLength 
                    ? `Minimum ${minLength} characters required`
                    : "More details recommended"
                }
              </span>
            </div>
            {isNearLimit && (
              <div className="text-xs text-orange-600 mt-1">
                Approaching character limit ({maxLength})
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>💡 Tip: Use Ctrl+Enter to submit quickly</span>
            <span>{maxLength - currentLength} characters remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}