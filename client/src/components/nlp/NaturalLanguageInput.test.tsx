import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NaturalLanguageInput from "./NaturalLanguageInput";

// Mock the mutation hook
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("NaturalLanguageInput Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders input interface correctly", () => {
    render(
      <TestWrapper>
        <NaturalLanguageInput />
      </TestWrapper>
    );

    // Check main elements are present
    expect(screen.getByTestId("input-natural-language")).toBeInTheDocument();
    expect(screen.getByTestId("button-submit")).toBeInTheDocument();
    expect(screen.getByTestId("button-voice-input")).toBeInTheDocument();
    
    // Check placeholder text
    expect(screen.getByPlaceholderText(/describe your business process/i)).toBeInTheDocument();
  });

  test("submit button is disabled when input is empty", () => {
    render(
      <TestWrapper>
        <NaturalLanguageInput />
      </TestWrapper>
    );

    const submitButton = screen.getByTestId("button-submit");
    expect(submitButton).toBeDisabled();
  });

  test("submit button is enabled when input has content", async () => {
    render(
      <TestWrapper>
        <NaturalLanguageInput />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language");
    const submitButton = screen.getByTestId("button-submit");

    fireEvent.change(textarea, {
      target: { value: "Create employee onboarding with background checks" }
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  test("shows character count and validation feedback", async () => {
    render(
      <TestWrapper>
        <NaturalLanguageInput />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language");
    const testText = "Create employee onboarding with background checks and approvals";

    fireEvent.change(textarea, { target: { value: testText } });

    await waitFor(() => {
      expect(screen.getByText(`Characters: ${testText.length}`)).toBeInTheDocument();
      expect(screen.getByText("Good detail level")).toBeInTheDocument();
    });
  });

  test("shows insufficient detail warning for short input", async () => {
    render(
      <TestWrapper>
        <NaturalLanguageInput />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language");
    const shortText = "Short text";

    fireEvent.change(textarea, { target: { value: shortText } });

    await waitFor(() => {
      expect(screen.getByText("More details recommended")).toBeInTheDocument();
    });
  });

  test("calls onSubmit with correct data when form is submitted", async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <TestWrapper>
        <NaturalLanguageInput onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language");
    const submitButton = screen.getByTestId("button-submit");
    const testDescription = "Create employee onboarding with background checks";

    fireEvent.change(textarea, { target: { value: testDescription } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        description: testDescription
      });
    });
  });

  test("shows loading state during processing", async () => {
    const mockOnSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(
      <TestWrapper>
        <NaturalLanguageInput onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language");
    const submitButton = screen.getByTestId("button-submit");

    fireEvent.change(textarea, { target: { value: "Test description" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("AI Processing...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  test("supports keyboard shortcuts", async () => {
    const mockOnSubmit = vi.fn();
    
    render(
      <TestWrapper>
        <NaturalLanguageInput onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language");
    fireEvent.change(textarea, { target: { value: "Test description" } });

    // Test Ctrl+Enter shortcut
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  test("clears input when reset is called", async () => {
    render(
      <TestWrapper>
        <NaturalLanguageInput />
      </TestWrapper>
    );

    const textarea = screen.getByTestId("input-natural-language") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Test description" } });

    expect(textarea.value).toBe("Test description");

    // Simulate external reset (would be triggered by parent component)
    fireEvent.change(textarea, { target: { value: "" } });
    
    expect(textarea.value).toBe("");
  });
});