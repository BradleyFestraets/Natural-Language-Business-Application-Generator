import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface VoiceInputProps {
  onTranscript?: (transcript: string) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  language?: string;
  continuous?: boolean;
  showInterimResults?: boolean;
  showConfidence?: boolean;
  size?: "sm" | "default" | "lg";
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInput({
  onTranscript,
  onError,
  disabled = false,
  language = "en-US",
  continuous = false,
  showInterimResults = false,
  showConfidence = false,
  size = "sm"
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = continuous;
      recognition.interimResults = showInterimResults;
      recognition.lang = language;

      recognition.addEventListener('result', handleResult);
      recognition.addEventListener('error', handleError);
      recognition.addEventListener('end', handleEnd);
      recognition.addEventListener('start', handleStart);

      return () => {
        if (recognition) {
          recognition.removeEventListener('result', handleResult);
          recognition.removeEventListener('error', handleError);
          recognition.removeEventListener('end', handleEnd);
          recognition.removeEventListener('start', handleStart);
        }
      };
    }
  }, [continuous, showInterimResults, language]);

  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i][0];
      
      if (event.results[i].isFinal) {
        finalTranscript += result.transcript;
        setConfidence(result.confidence);
      } else {
        interimTranscript += result.transcript;
      }
    }

    if (finalTranscript) {
      onTranscript?.(finalTranscript);
      setInterimTranscript('');
      setConfidence(null);
    } else if (showInterimResults && interimTranscript) {
      setInterimTranscript(interimTranscript);
    }
  }, [onTranscript, showInterimResults]);

  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    setError(event.error);
    setIsRecording(false);
    onError?.(event);
  }, [onError]);

  const handleStart = useCallback(() => {
    setIsRecording(true);
    setError(null);
  }, []);

  const handleEnd = useCallback(() => {
    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported || !recognitionRef.current || disabled) return;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start recording');
    }
  }, [isSupported, disabled]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>Voice input not supported in this browser</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        data-testid="button-voice-input"
        variant={isRecording ? "destructive" : "outline"}
        size={size}
        onClick={toggleRecording}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        {isRecording ? (
          <>
            <MicOff className="h-4 w-4" />
            Recording...
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            {size === "sm" ? "Voice" : "Start Voice Input"}
          </>
        )}
      </Button>

      {/* Interim results display */}
      {showInterimResults && interimTranscript && (
        <div 
          data-testid="interim-results"
          className="text-sm text-muted-foreground italic border rounded p-2 bg-muted/50"
        >
          "{interimTranscript}"
        </div>
      )}

      {/* Confidence display */}
      {showConfidence && confidence !== null && (
        <Badge 
          data-testid="confidence-level"
          variant="outline" 
          className="text-xs"
        >
          Confidence: {Math.round(confidence * 100)}%
        </Badge>
      )}

      {/* Error display */}
      {error && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          Listening...
        </div>
      )}
    </div>
  );
}