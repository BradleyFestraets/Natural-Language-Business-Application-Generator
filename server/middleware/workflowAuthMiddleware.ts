/**
 * Workflow-specific authorization helpers for verifying execution ownership
 */

import { storage } from "../storage";

/**
 * Verifies that a workflow execution belongs to the specified organization
 * @param executionId - The workflow execution ID
 * @param organizationId - The organization ID to verify against
 * @returns Promise<boolean> - True if the execution belongs to the organization
 */
export async function verifyExecutionOwnership(executionId: string, organizationId: string): Promise<boolean> {
  try {
    // Get the workflow execution
    const execution = await storage.getWorkflowExecution(executionId);
    if (!execution) {
      return false;
    }

    // Get the application
    const generatedApp = await storage.getGeneratedApplication(execution.generatedApplicationId);
    if (!generatedApp) {
      return false;
    }

    // Get the business requirement to check user ownership
    const businessRequirement = await storage.getBusinessRequirement(generatedApp.businessRequirementId);
    if (!businessRequirement) {
      return false;
    }

    // Verify the business requirement owner is in the organization
    const orgMembership = await storage.getUserOrgMembership(businessRequirement.userId, organizationId);
    return orgMembership !== undefined && orgMembership.isActive;
  } catch (error) {
    console.error("Error verifying execution ownership:", error);
    return false;
  }
}

/**
 * Verifies that an application belongs to the specified organization
 * @param applicationId - The application ID
 * @param organizationId - The organization ID to verify against
 * @returns Promise<boolean> - True if the application belongs to the organization
 */
export async function verifyApplicationOwnership(applicationId: string, organizationId: string): Promise<boolean> {
  try {
    // Get the application
    const generatedApp = await storage.getGeneratedApplication(applicationId);
    if (!generatedApp) {
      return false;
    }

    // Get the business requirement to check user ownership
    const businessRequirement = await storage.getBusinessRequirement(generatedApp.businessRequirementId);
    if (!businessRequirement) {
      return false;
    }

    // Verify the business requirement owner is in the organization
    const orgMembership = await storage.getUserOrgMembership(businessRequirement.userId, organizationId);
    return orgMembership !== undefined && orgMembership.isActive;
  } catch (error) {
    console.error("Error verifying application ownership:", error);
    return false;
  }
}