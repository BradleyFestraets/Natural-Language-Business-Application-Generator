import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { useToast } from "@/hooks/use-toast";

interface ChatbotApiResponse {
  chatbotId: string;
  name: string;
  capabilities: string[];
  isActive: boolean;
  aiModel: string;
  generatedApplicationId: string;
}

interface ChatInteractionResponse {
  response: string;
  suggestedActions?: Array<{
    type: string;
    label: string;
    data?: any;
  }>;
  sessionId: string;
  timestamp: string;
  chatbotId: string;
  aiModel: string;
}

interface WSCsrfTokenResponse {
  wscsrfToken: string;
  endpoint: string;
}

interface EmbeddedChatbotProps {
  generatedApplicationId: string;
  chatbotId?: string;
  context?: {
    currentPage?: string;
    userRole?: string;
    workflowState?: string;
    formState?: Record<string, any>;
    sessionData?: Record<string, any>;
  };
  className?: string;
}

interface ChatMessageItem {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  suggestedActions?: Array<{
    type: string;
    label: string;
    data?: any;
  }>;
}

export function EmbeddedChatbot({
  generatedApplicationId,
  chatbotId,
  context = {},
  className = ""
}: EmbeddedChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get or create chatbot for this application
  const { data: chatbot, isLoading } = useQuery<ChatbotApiResponse>({
    queryKey: ['/api/chatbot', 'application', generatedApplicationId],
    queryFn: async () => {
      if (chatbotId) {
        const response = await apiRequest("GET", `/api/chatbot/${chatbotId}`);
        return await response.json() as ChatbotApiResponse;
      }
      
      // Create a new chatbot for this application
      const response = await apiRequest("POST", "/api/chatbot/create", {
        generatedApplicationId,
        capabilities: ['general_help', 'form_help', 'navigation_help'],
        personality: {
          tone: 'professional',
          style: 'business',
          proactiveness: 'medium',
          expertiseLevel: 'intermediate'
        }
      });
      return await response.json() as ChatbotApiResponse;
    },
    enabled: isOpen
  });

  // Send message mutation
  const sendMessageMutation = useMutation<ChatInteractionResponse | { message: string }, Error, string>({
    mutationFn: async (message: string) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        // Use WebSocket for real-time communication
        wsConnection.send(JSON.stringify({
          type: 'chat_message',
          message,
          context,
          messageId: `msg-${Date.now()}`
        }));
        return { message: 'Sent via WebSocket' };
      } else {
        // Fallback to REST API
        const response = await apiRequest("POST", "/api/chatbot/interact", {
          chatbotId: chatbot?.chatbotId,
          message,
          sessionId: `session-${Date.now()}`,
          ...context
        });
        return await response.json() as ChatInteractionResponse;
      }
    },
    onSuccess: (data) => {
      if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        // Add AI response for REST API fallback
        if ('response' in data) {
          const aiMessage: ChatMessageItem = {
            id: `ai-${Date.now()}`,
            message: data.response,
            isUser: false,
            timestamp: new Date().toISOString(),
            suggestedActions: data.suggestedActions
          };
          setMessages(prev => [...prev, aiMessage]);
        }
      }
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "Message failed",
        description: "Unable to send message. Please try again.",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (isOpen && chatbot?.chatbotId && !wsConnection) {
      initializeWebSocket();
    }
  }, [isOpen, chatbot?.chatbotId, wsConnection]);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close();
        wsConnectionRef.current = null;
      }
    };
  }, []);

  const initializeWebSocket = async () => {
    try {
      if (!chatbot?.chatbotId) {
        console.error('Cannot initialize WebSocket: chatbotId is missing');
        return;
      }

      // Get WebSocket CSRF token
      const response = await apiRequest("GET", `/api/auth/ws-csrf-token?endpoint=/ws/chatbot/${chatbot.chatbotId}`);
      const tokenResponse = await response.json() as WSCsrfTokenResponse;
      const wscsrfToken = tokenResponse.wscsrfToken;

      // Establish WebSocket connection with CSRF token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(
        `${protocol}//${host}/ws/chatbot/${chatbot.chatbotId}`,
        [`csrf-${wscsrfToken}`]
      );

      ws.onopen = () => {
        console.log('WebSocket connected to chatbot');
        setWsConnection(ws);
        wsConnectionRef.current = ws;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Chatbot WebSocket connection established');
        } else if (data.type === 'chat_response') {
          const aiMessage: ChatMessageItem = {
            id: `ai-${Date.now()}`,
            message: data.message,
            isUser: false,
            timestamp: data.timestamp,
            suggestedActions: data.suggestedActions
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsTyping(false);
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
          toast({
            title: "Connection Error",
            description: data.message,
            variant: "destructive"
          });
          setIsTyping(false);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to establish real-time connection. Using fallback mode.",
          variant: "destructive"
        });
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWsConnection(null);
        wsConnectionRef.current = null;
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      toast({
        title: "Connection Error", 
        description: "Failed to establish real-time connection. Using fallback mode.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async (message: string) => {
    // Add user message immediately
    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      message,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Send to AI
    sendMessageMutation.mutate(message);
  };

  const handleSuggestedAction = (action: any) => {
    toast({
      title: "Action Triggered",
      description: `Executing: ${action.label}`,
    });
    // TODO: Integrate with business process automation engine
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg"
          data-testid="button-chatbot-open"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Card className="w-80 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">AI Assistant</span>
              {isTyping && (
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
                data-testid="button-chatbot-maximize"
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                data-testid="button-chatbot-close"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className="w-96 h-[500px] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">
                {wsConnection ? 'Connected' : 'Offline mode'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              data-testid="button-chatbot-minimize"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              data-testid="button-chatbot-close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4" data-testid="chatbot-messages">
            {isLoading && (
              <div className="text-center text-sm text-muted-foreground">
                Initializing AI Assistant...
              </div>
            )}
            
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-sm text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="mb-1">Hello! I'm your AI Assistant.</p>
                <p>Ask me anything about this application or need help with tasks.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onSuggestedAction={handleSuggestedAction}
              />
            ))}
            
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || sendMessageMutation.isPending}
            placeholder="Type your message..."
          />
        </div>
      </Card>
    </div>
  );
}