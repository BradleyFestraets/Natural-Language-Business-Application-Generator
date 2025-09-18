export function isUnauthorizedError(error: Error): boolean {
  // Check multiple patterns for unauthorized errors
  const message = error.message.toLowerCase();
  return (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("authentication required") ||
    message.includes("session expired") ||
    error.name === "UnauthorizedError"
  );
}