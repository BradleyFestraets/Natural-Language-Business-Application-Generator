import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import ConversationHistory from "./ConversationHistory";

const mockConversation = [
  {
    id: "1",
    type: "user" as const,
    content: "Create an employee onboarding system with background checks",
    timestamp: new Date("2025-01-18T10:00:00Z"),
    metadata: {
      confidence: 0.8,
      source: "text_input"
    }
  },
  {
    id: "2", 
    type: "ai" as const,
    content: "I've analyzed your request and extracted the following business requirements:",
    timestamp: new Date("2025-01-18T10:00:30Z"),
    metadata: {
      extractedEntities: {
        processes: ["employee_onboarding", "background_verification"],
        forms: ["employee_form", "background_check_form"],
        approvals: ["manager_approval", "hr_approval"],
        integrations: ["background_api"]
      },
      confidence: 0.85,
      processingTime: 2.3
    }
  },
  {
    id: "3",
    type: "user" as const, 
    content: "Can you also add document collection and automated notifications?",
    timestamp: new Date("2025-01-18T10:01:00Z"),
    metadata: {
      confidence: 0.9,
      source: "text_input",
      contextRef: "1"
    }
  },
  {
    id: "4",
    type: "ai" as const,
    content: "Absolutely! I've updated the requirements to include document collection and automated notifications:",
    timestamp: new Date("2025-01-18T10:01:15Z"),
    metadata: {
      extractedEntities: {
        processes: ["employee_onboarding", "background_verification", "document_collection"],
        forms: ["employee_form", "background_check_form", "document_upload_form"],
        approvals: ["manager_approval", "hr_approval"],
        integrations: ["background_api", "email_service", "document_storage"]
      },
      confidence: 0.9,
      processingTime: 1.8
    }
  }
];

describe("ConversationHistory Component", () => {
  test("renders empty state when no conversation", () => {
    render(<ConversationHistory conversation={[]} />);
    
    expect(screen.getByTestId("conversation-empty")).toBeInTheDocument();
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    expect(screen.getByText(/describe your business application/i)).toBeInTheDocument();
  });

  test("displays conversation messages correctly", () => {
    render(<ConversationHistory conversation={mockConversation} />);
    
    // Check that messages are displayed
    expect(screen.getByTestId("conversation-list")).toBeInTheDocument();
    expect(screen.getByTestId("message-1")).toBeInTheDocument();
    expect(screen.getByTestId("message-2")).toBeInTheDocument();
    expect(screen.getByTestId("message-3")).toBeInTheDocument();
    expect(screen.getByTestId("message-4")).toBeInTheDocument();
    
    // Check message content
    expect(screen.getByText("Create an employee onboarding system with background checks")).toBeInTheDocument();
    expect(screen.getByText(/I've analyzed your request/)).toBeInTheDocument();
  });

  test("shows user and AI message styling differently", () => {
    render(<ConversationHistory conversation={mockConversation} />);
    
    const userMessage = screen.getByTestId("message-1");
    const aiMessage = screen.getByTestId("message-2");
    
    // User messages should have different styling
    expect(userMessage).toHaveClass("message-user");
    expect(aiMessage).toHaveClass("message-ai");
  });

  test("displays timestamps correctly", () => {
    render(<ConversationHistory conversation={mockConversation} showTimestamps={true} />);
    
    // Check that timestamps are shown
    expect(screen.getByTestId("timestamp-1")).toBeInTheDocument();
    expect(screen.getByTestId("timestamp-2")).toBeInTheDocument();
    
    // Check timestamp format (should show relative time)
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
  });

  test("hides timestamps when showTimestamps is false", () => {
    render(<ConversationHistory conversation={mockConversation} showTimestamps={false} />);
    
    expect(screen.queryByTestId("timestamp-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timestamp-2")).not.toBeInTheDocument();
  });

  test("displays confidence scores for AI messages", () => {
    render(<ConversationHistory conversation={mockConversation} showConfidence={true} />);
    
    // AI messages should show confidence
    expect(screen.getByTestId("confidence-2")).toBeInTheDocument();
    expect(screen.getByTestId("confidence-4")).toBeInTheDocument();
    
    // Check confidence values
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  test("shows processing time for AI responses", () => {
    render(<ConversationHistory conversation={mockConversation} showMetadata={true} />);
    
    expect(screen.getByText("2.3s")).toBeInTheDocument();
    expect(screen.getByText("1.8s")).toBeInTheDocument();
  });

  test("displays extracted entities in expandable format", () => {
    render(<ConversationHistory conversation={mockConversation} showExtractedEntities={true} />);
    
    // Should show extracted entities for AI messages that have them
    expect(screen.getByTestId("entities-2")).toBeInTheDocument();
    expect(screen.getByTestId("entities-4")).toBeInTheDocument();
    
    // Check some entity content
    expect(screen.getByText("employee onboarding")).toBeInTheDocument();
    expect(screen.getByText("background verification")).toBeInTheDocument();
  });

  test("allows filtering by message type", () => {
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        filter="user"
      />
    );
    
    // Should only show user messages
    expect(screen.getByTestId("message-1")).toBeInTheDocument();
    expect(screen.getByTestId("message-3")).toBeInTheDocument();
    expect(screen.queryByTestId("message-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("message-4")).not.toBeInTheDocument();
  });

  test("supports search functionality", () => {
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        searchable={true}
      />
    );
    
    const searchInput = screen.getByTestId("search-conversation");
    expect(searchInput).toBeInTheDocument();
    
    // Search for specific content
    fireEvent.change(searchInput, { target: { value: "background checks" } });
    
    // Should highlight matching content
    expect(screen.getByTestId("message-1")).toBeInTheDocument();
    expect(screen.queryByTestId("message-3")).not.toBeInTheDocument();
  });

  test("auto-scrolls to bottom with new messages", () => {
    const { rerender } = render(<ConversationHistory conversation={mockConversation.slice(0, 2)} />);
    
    // Add new message
    const newMessage = {
      id: "5",
      type: "user" as const,
      content: "New message",
      timestamp: new Date(),
      metadata: {}
    };
    
    rerender(<ConversationHistory conversation={[...mockConversation.slice(0, 2), newMessage]} />);
    
    expect(screen.getByTestId("message-5")).toBeInTheDocument();
    // Note: Actual scroll behavior would require more complex testing
  });

  test("shows context references between messages", () => {
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        showContext={true}
      />
    );
    
    // Message 3 references message 1
    const message3 = screen.getByTestId("message-3");
    expect(message3).toBeInTheDocument();
    
    // Should show context indicator
    expect(screen.getByTestId("context-ref-3")).toBeInTheDocument();
  });

  test("supports message actions (copy, delete, etc.)", () => {
    const mockOnMessageAction = vi.fn();
    
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        onMessageAction={mockOnMessageAction}
        enableActions={true}
      />
    );
    
    // Should show action buttons on hover/focus
    const message1 = screen.getByTestId("message-1");
    fireEvent.mouseEnter(message1);
    
    const copyButton = screen.getByTestId("action-copy-1");
    expect(copyButton).toBeInTheDocument();
    
    fireEvent.click(copyButton);
    expect(mockOnMessageAction).toHaveBeenCalledWith("copy", "1");
  });

  test("displays conversation statistics", () => {
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        showStats={true}
      />
    );
    
    expect(screen.getByTestId("conversation-stats")).toBeInTheDocument();
    expect(screen.getByText("4 messages")).toBeInTheDocument();
    expect(screen.getByText("2 user")).toBeInTheDocument();
    expect(screen.getByText("2 AI")).toBeInTheDocument();
  });

  test("handles conversation export", () => {
    const mockOnExport = vi.fn();
    
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        onExport={mockOnExport}
        exportable={true}
      />
    );
    
    const exportButton = screen.getByTestId("button-export");
    expect(exportButton).toBeInTheDocument();
    
    fireEvent.click(exportButton);
    expect(mockOnExport).toHaveBeenCalledWith(mockConversation);
  });

  test("loads more messages on scroll (pagination)", () => {
    const mockOnLoadMore = vi.fn();
    
    render(
      <ConversationHistory 
        conversation={mockConversation} 
        onLoadMore={mockOnLoadMore}
        hasMore={true}
      />
    );
    
    // Simulate scroll to top
    const conversationList = screen.getByTestId("conversation-list");
    fireEvent.scroll(conversationList, { target: { scrollTop: 0 } });
    
    expect(mockOnLoadMore).toHaveBeenCalled();
  });
});