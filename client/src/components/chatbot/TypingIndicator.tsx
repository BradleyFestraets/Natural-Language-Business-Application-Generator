import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" data-testid="typing-indicator">
      <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
        <Bot className="h-4 w-4 text-secondary-foreground" />
      </div>
      <div className="bg-secondary/50 px-4 py-3 rounded-lg rounded-tl-sm shadow-sm">
        <div className="flex gap-1 items-center">
          <div className="flex gap-1">
            <div 
              className="w-2 h-2 bg-secondary-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1000ms' }}
            />
            <div 
              className="w-2 h-2 bg-secondary-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: '200ms', animationDuration: '1000ms' }}
            />
            <div 
              className="w-2 h-2 bg-secondary-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: '400ms', animationDuration: '1000ms' }}
            />
          </div>
          <span className="text-xs text-secondary-foreground/70 ml-2">AI is typing</span>
        </div>
      </div>
    </div>
  );
}