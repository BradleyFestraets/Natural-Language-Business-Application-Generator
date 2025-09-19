import { WorkflowExecutionEngine } from "./workflowExecutionEngine";

// Shared singleton instance to prevent state fragmentation
// This ensures all routes and modules use the same execution engine state
let workflowExecutionEngineInstance: WorkflowExecutionEngine | null = null;

export function getWorkflowExecutionEngine(): WorkflowExecutionEngine {
  if (!workflowExecutionEngineInstance) {
    workflowExecutionEngineInstance = new WorkflowExecutionEngine();
    console.log("WorkflowExecutionEngine singleton instance created");
  }
  return workflowExecutionEngineInstance;
}

// For testing or reset scenarios
export function resetWorkflowExecutionEngine(): void {
  workflowExecutionEngineInstance = null;
}