import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Bot, 
  User, 
  Search, 
  Download, 
  Copy, 
  Trash2,
  Clock,
  TrendingUp,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface ConversationMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    source?: string;
    contextRef?: string;
    extractedEntities?: {
      processes?: string[];
      forms?: string[];
      approvals?: string[];
      integrations?: string[];
    };
    processingTime?: number;
  };
}

interface ConversationHistoryProps {
  conversation: ConversationMessage[];
  showTimestamps?: boolean;
  showConfidence?: boolean;
  showMetadata?: boolean;
  showExtractedEntities?: boolean;
  showContext?: boolean;
  showStats?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  enableActions?: boolean;
  filter?: "all" | "user" | "ai";
  hasMore?: boolean;
  onMessageAction?: (action: string, messageId: string) => void;
  onExport?: (conversation: ConversationMessage[]) => void;
  onLoadMore?: () => void;
}

export default function ConversationHistory({
  conversation,
  showTimestamps = true,
  showConfidence = false,
  showMetadata = false,
  showExtractedEntities = false,
  showContext = false,
  showStats = false,
  searchable = false,
  exportable = false,
  enableActions = false,
  filter = "all",
  hasMore = false,
  onMessageAction,
  onExport,
  onLoadMore
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevConversationLength = useRef(conversation.length);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (conversation.length > prevConversationLength.current) {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    prevConversationLength.current = conversation.length;
  }, [conversation.length]);

  // Filter and search messages
  const filteredMessages = useMemo(() => {
    let filtered = conversation;

    // Apply type filter
    if (filter !== "all") {
      filtered = filtered.filter(msg => msg.type === filter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [conversation, filter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const userMessages = conversation.filter(msg => msg.type === "user").length;
    const aiMessages = conversation.filter(msg => msg.type === "ai").length;
    const avgConfidence = conversation
      .filter(msg => msg.metadata?.confidence)
      .reduce((sum, msg) => sum + (msg.metadata?.confidence || 0), 0) /
      conversation.filter(msg => msg.metadata?.confidence).length;

    return {
      total: conversation.length,
      user: userMessages,
      ai: aiMessages,
      avgConfidence: avgConfidence || 0
    };
  }, [conversation]);

  const formatLabel = (text: string) => text.replace(/_/g, ' ');

  const handleCopyMessage = (messageId: string) => {
    const message = conversation.find(msg => msg.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
      onMessageAction?.("copy", messageId);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    onMessageAction?.("delete", messageId);
  };

  const handleExport = () => {
    onExport?.(conversation);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore) {
      onLoadMore?.();
    }
  };

  if (conversation.length === 0) {
    return (
      <Card className="border-dashed" data-testid="conversation-empty">
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">Start a conversation</h3>
          <p className="text-sm text-muted-foreground">
            Describe your business application above to begin the AI analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation History
          </CardTitle>
          <div className="flex gap-2">
            {exportable && (
              <Button
                data-testid="button-export"
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Search and filters */}
        {searchable && (
          <div className="space-y-2">
            <Input
              data-testid="search-conversation"
              placeholder="Search conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div data-testid="conversation-stats" className="flex gap-4 text-sm text-muted-foreground">
            <span>{stats.total} messages</span>
            <span>{stats.user} user</span>
            <span>{stats.ai} AI</span>
            {stats.avgConfidence > 0 && (
              <span>Avg confidence: {Math.round(stats.avgConfidence * 100)}%</span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-96 pr-4"
          data-testid="conversation-list"
          onScrollCapture={handleScroll}
        >
          <div className="space-y-4">
            {filteredMessages.map((message, index) => (
              <div
                key={message.id}
                data-testid={`message-${message.id}`}
                className={`flex gap-3 p-3 rounded-lg transition-colors ${
                  message.type === "user" 
                    ? "bg-muted/50 message-user ml-8" 
                    : "bg-primary/5 message-ai mr-8"
                }`}
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>
                  {message.type === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-sm">{message.content}</p>
                    
                    {/* Actions */}
                    {enableActions && hoveredMessageId === message.id && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          data-testid={`action-copy-${message.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMessage(message.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          data-testid={`action-delete-${message.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Metadata row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {showTimestamps && (
                      <span data-testid={`timestamp-${message.id}`}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(message.timestamp, "h:mm a")}
                      </span>
                    )}
                    
                    {showConfidence && message.metadata?.confidence && (
                      <Badge 
                        data-testid={`confidence-${message.id}`}
                        variant="outline" 
                        className="h-5 text-xs"
                      >
                        {Math.round(message.metadata.confidence * 100)}%
                      </Badge>
                    )}

                    {showMetadata && message.metadata?.processingTime && (
                      <span>
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        {message.metadata.processingTime}s
                      </span>
                    )}

                    {showContext && message.metadata?.contextRef && (
                      <Badge 
                        data-testid={`context-ref-${message.id}`}
                        variant="outline" 
                        className="h-5 text-xs"
                      >
                        References: {message.metadata.contextRef}
                      </Badge>
                    )}
                  </div>

                  {/* Extracted entities */}
                  {showExtractedEntities && message.metadata?.extractedEntities && (
                    <div data-testid={`entities-${message.id}`} className="space-y-2 pt-2 border-t">
                      {message.metadata.extractedEntities.processes && (
                        <div>
                          <span className="text-xs font-medium">Processes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.metadata.extractedEntities.processes.map((process, i) => (
                              <Badge key={i} variant="outline" className="h-5 text-xs">
                                {formatLabel(process)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}