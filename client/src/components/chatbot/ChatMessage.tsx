import { Button } from "@/components/ui/button";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: {
    id: string;
    message: string;
    isUser: boolean;
    timestamp: string;
    suggestedActions?: Array<{
      type: string;
      label: string;
      data?: any;
    }>;
  };
  onSuggestedAction?: (action: any) => void;
}

export function ChatMessage({ message, onSuggestedAction }: ChatMessageProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (message.isUser) {
    return (
      <div className="flex items-start gap-3 justify-end" data-testid={`message-user-${message.id}`}>
        <div className="flex flex-col items-end max-w-[280px]">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg rounded-tr-sm shadow-sm">
            <p className="text-sm">{message.message}</p>
          </div>
          <span className="text-xs text-muted-foreground mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3" data-testid={`message-ai-${message.id}`}>
      <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
        <Bot className="h-4 w-4 text-secondary-foreground" />
      </div>
      <div className="flex flex-col flex-1 max-w-[280px]">
        <div className="bg-secondary/50 px-4 py-2 rounded-lg rounded-tl-sm shadow-sm">
          <p className="text-sm text-secondary-foreground">{message.message}</p>
        </div>
        
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestedActions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => onSuggestedAction?.(action)}
                className="text-xs"
                data-testid={`suggested-action-${action.type}`}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        <span className="text-xs text-muted-foreground mt-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}