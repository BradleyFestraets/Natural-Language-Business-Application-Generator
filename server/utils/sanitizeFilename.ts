/**
 * Shared utility for sanitizing filenames to prevent path traversal and security issues
 * Ensures filenames are safe for filesystem operations across all generators
 */

/**
 * Sanitize a filename to prevent path traversal and security issues
 * @param filename - The filename to sanitize
 * @param maxLength - Maximum allowed length (default: 50)
 * @returns A safe filename containing only allowed characters
 */
export function sanitizeFilename(filename: string, maxLength: number = 50): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  // Remove any path separators and dangerous characters
  let sanitized = filename
    .replace(/[/\\:*?"<>|]/g, '') // Remove path separators and reserved characters
    .replace(/\.\./g, '') // Remove dot segments that could be used for path traversal
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase(); // Convert to lowercase for consistency

  // Only allow alphanumeric characters, underscores, hyphens, and single dots
  sanitized = sanitized.replace(/[^a-z0-9_.-]/g, '');

  // Remove any remaining multiple dots or path separators
  sanitized = sanitized.replace(/\.{2,}/g, '.');
  sanitized = sanitized.replace(/_{2,}/g, '_');
  sanitized = sanitized.replace(/-{2,}/g, '-');

  // Ensure it doesn't start with a dot or dash
  sanitized = sanitized.replace(/^[.-]/, '');

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Ensure minimum length
  if (sanitized.length < 1) {
    sanitized = 'default';
  }

  // Ensure it doesn't end with a dot
  sanitized = sanitized.replace(/\.$/, '');

  return sanitized;
}

/**
 * Sanitize a component name for React components
 * Ensures proper capitalization and valid identifier format
 */
export function sanitizeComponentName(name: string): string {
  const sanitized = sanitizeFilename(name);
  
  // Capitalize first letter and ensure it's a valid React component name
  const componentName = sanitized
    .split(/[_-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Ensure it starts with a capital letter
  if (!/^[A-Z]/.test(componentName)) {
    return 'Component' + componentName;
  }

  return componentName;
}

/**
 * Sanitize an entity name for database schemas
 * Ensures proper format for database table/schema names
 */
export function sanitizeEntityName(name: string): string {
  const sanitized = sanitizeFilename(name);
  
  // Ensure it's a valid database identifier
  const entityName = sanitized.replace(/[^a-z0-9_]/g, '_');
  
  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(entityName)) {
    return 'entity_' + entityName;
  }

  return entityName;
}

/**
 * Sanitize an API endpoint name
 * Ensures proper format for API route names
 */
export function sanitizeApiName(name: string): string {
  const sanitized = sanitizeFilename(name);
  
  // Ensure it's a valid API route name (lowercase with hyphens)
  return sanitized.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
}

/**
 * Validate that a filename is safe after sanitization
 * Throws an error if the filename is still potentially dangerous
 */
export function validateSafeFilename(filename: string): void {
  // Check for any remaining path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error(`Unsafe filename after sanitization: ${filename}`);
  }

  // Check for reserved filenames
  const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
  if (reservedNames.includes(filename.toLowerCase())) {
    throw new Error(`Reserved filename not allowed: ${filename}`);
  }

  // Check minimum length
  if (filename.length < 1) {
    throw new Error('Filename cannot be empty after sanitization');
  }
}