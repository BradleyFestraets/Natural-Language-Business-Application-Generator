import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import RequirementVisualization from "./RequirementVisualization";

const mockExtractedData = {
  processes: ["employee_onboarding", "background_verification", "document_collection"],
  forms: ["employee_information_form", "background_check_form", "tax_form"],
  approvals: ["manager_approval", "hr_approval", "compliance_approval"],
  integrations: ["background_check_api", "email_service", "payroll_system"],
  workflowPatterns: ["sequential_approval", "parallel_processing"],
  confidence: 0.85
};

describe("RequirementVisualization Component", () => {
  test("renders with no data state", () => {
    render(<RequirementVisualization />);
    
    expect(screen.getByText("Ready for AI Analysis")).toBeInTheDocument();
    expect(screen.getByText(/describe your business application/i)).toBeInTheDocument();
  });

  test("renders loading state correctly", () => {
    render(<RequirementVisualization isLoading={true} />);
    
    expect(screen.getByText("AI Analysis in Progress")).toBeInTheDocument();
    expect(screen.getByText("Parsing your business requirements...")).toBeInTheDocument();
    expect(screen.getByText("Analyzing business processes")).toBeInTheDocument();
  });

  test("displays extracted data correctly", () => {
    render(<RequirementVisualization extractedData={mockExtractedData} />);
    
    // Check confidence score
    expect(screen.getByText("AI Confidence: 85%")).toBeInTheDocument();
    
    // Check processes section
    expect(screen.getByTestId("extracted-processes")).toBeInTheDocument();
    expect(screen.getByText("employee onboarding")).toBeInTheDocument();
    expect(screen.getByText("background verification")).toBeInTheDocument();
    
    // Check forms section
    expect(screen.getByTestId("extracted-forms")).toBeInTheDocument();
    expect(screen.getByText("employee information form")).toBeInTheDocument();
    
    // Check approvals section
    expect(screen.getByTestId("extracted-approvals")).toBeInTheDocument();
    expect(screen.getByText("manager approval")).toBeInTheDocument();
    
    // Check integrations section
    expect(screen.getByTestId("extracted-integrations")).toBeInTheDocument();
    expect(screen.getByText("background check api")).toBeInTheDocument();
  });

  test("handles empty arrays in extracted data", () => {
    const emptyData = {
      processes: [],
      forms: [],
      approvals: [],
      integrations: [],
      workflowPatterns: [],
      confidence: 0.5
    };

    render(<RequirementVisualization extractedData={emptyData} />);
    
    expect(screen.getByText("AI Confidence: 50%")).toBeInTheDocument();
    
    // Should still show section headers even with empty data
    expect(screen.getByText("Business Processes")).toBeInTheDocument();
    expect(screen.getByText("Required Forms")).toBeInTheDocument();
    expect(screen.getByText("Approval Steps")).toBeInTheDocument();
    expect(screen.getByText("System Integrations")).toBeInTheDocument();
  });

  test("displays confidence score with appropriate styling", () => {
    // High confidence
    render(<RequirementVisualization extractedData={{ ...mockExtractedData, confidence: 0.9 }} />);
    expect(screen.getByText("AI Confidence: 90%")).toBeInTheDocument();
    
    // Low confidence
    render(<RequirementVisualization extractedData={{ ...mockExtractedData, confidence: 0.3 }} />);
    expect(screen.getByText("AI Confidence: 30%")).toBeInTheDocument();
  });

  test("formats text labels correctly (removes underscores)", () => {
    render(<RequirementVisualization extractedData={mockExtractedData} />);
    
    // Check that underscores are replaced with spaces
    expect(screen.getByText("employee onboarding")).toBeInTheDocument();
    expect(screen.getByText("background verification")).toBeInTheDocument();
    expect(screen.getByText("employee information form")).toBeInTheDocument();
    expect(screen.getByText("background check api")).toBeInTheDocument();
  });

  test("shows generate application button when data is present", () => {
    render(<RequirementVisualization extractedData={mockExtractedData} />);
    
    const generateButton = screen.getByTestId("button-generate-app");
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).toHaveTextContent("Generate Complete Application");
  });

  test("shows progress bar with correct value during loading", () => {
    render(<RequirementVisualization isLoading={true} progress={75} />);
    
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "75");
  });

  test("displays real-time status updates during processing", () => {
    render(
      <RequirementVisualization 
        isLoading={true} 
        status="Extracting workflow patterns and entities" 
      />
    );
    
    expect(screen.getByText("Extracting workflow patterns and entities")).toBeInTheDocument();
  });

  test("handles streaming updates correctly", () => {
    const partialData = {
      processes: ["employee_onboarding"],
      forms: [],
      approvals: [],
      integrations: [],
      workflowPatterns: [],
      confidence: 0.6
    };

    render(<RequirementVisualization extractedData={partialData} isStreaming={true} />);
    
    expect(screen.getByText("AI Confidence: 60%")).toBeInTheDocument();
    expect(screen.getByText("employee onboarding")).toBeInTheDocument();
    
    // Should indicate streaming state
    expect(screen.getByTestId("extracted-processes")).toBeInTheDocument();
  });
});