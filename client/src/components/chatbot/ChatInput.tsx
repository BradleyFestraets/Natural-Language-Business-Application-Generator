import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // 5 lines approximately
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  return (
    <div className="flex gap-2 items-end" data-testid="chat-input-container">
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="resize-none min-h-[40px] max-h-[120px] border-input focus-visible:ring-1 focus-visible:ring-ring"
          rows={1}
          data-testid="input-chat-message"
        />
      </div>
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || !message.trim()}
        className="flex-shrink-0"
        data-testid="button-send-message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}