import { ESLint } from "eslint";
import * as ts from "typescript";

export interface ValidationOptions {
  checkTypes?: boolean;
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  checkAccessibility?: boolean;
  checkBestPractices?: boolean;
  enterprisePatterns?: boolean;
}

export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  metrics: ValidationMetrics;
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  severity: "error" | "critical";
  message: string;
  rule?: string;
  fix?: string;
}

export interface ValidationWarning {
  file: string;
  line?: number;
  column?: number;
  severity: "warning";
  message: string;
  rule?: string;
  suggestion?: string;
}

export interface ValidationMetrics {
  totalFiles: number;
  totalLines: number;
  errorCount: number;
  warningCount: number;
  typeChecksPassed: boolean;
  securityChecksPassed: boolean;
  performanceScore: number;
  accessibilityScore: number;
  codeQualityScore: number;
}

interface GeneratedCode {
  components: { [filename: string]: string };
  apiEndpoints: { [filename: string]: string };
  databaseSchema: { [filename: string]: string };
  integrations?: { [filename: string]: string };
  workflows?: { [filename: string]: string };
  chatbots?: { [filename: string]: string };
  documentation?: { [filename: string]: string };
}

/**
 * Validates generated code for quality, security, and enterprise patterns
 */
export class GeneratedCodeValidator {
  private eslint: ESLint | null = null;
  private readonly enterprisePatterns: Map<string, RegExp[]>;
  private readonly securityPatterns: Map<string, RegExp[]>;
  private readonly performancePatterns: Map<string, RegExp[]>;

  constructor() {
    this.initializePatterns();
    this.initializeESLint();
  }

  /**
   * Initialize validation patterns for enterprise standards
   */
  private initializePatterns(): void {
    // Enterprise patterns that should be present
    this.enterprisePatterns = new Map([
      ["error-handling", [
        /try\s*{[\s\S]*?}\s*catch/g, // Try-catch blocks
        /\.catch\(/g, // Promise catch handlers
        /error\s*:\s*Error/gi, // Error typing
        /throw\s+new\s+Error/g // Proper error throwing
      ]],
      ["typescript-strict", [
        /:\s*(string|number|boolean|object|\[\]|Array|Promise)/g, // Type annotations
        /interface\s+\w+/g, // Interface definitions
        /type\s+\w+\s*=/g, // Type definitions
        /as\s+\w+/g // Type assertions
      ]],
      ["react-best-practices", [
        /data-testid\s*=/g, // Test IDs for testing
        /useCallback|useMemo|useEffect/g, // React hooks optimization
        /key\s*=\s*{/g, // Keys in lists
        /PropTypes|interface.*Props/g // Props validation
      ]],
      ["api-standards", [
        /status\(\d{3}\)/g, // HTTP status codes
        /res\.json\(/g, // JSON responses
        /router\.(get|post|put|delete|patch)/g, // RESTful methods
        /middleware/g // Middleware usage
      ]],
      ["database-patterns", [
        /pgTable|varchar|text|integer|timestamp/g, // Drizzle ORM patterns
        /createInsertSchema/g, // Drizzle Zod schemas
        /references\(/g, // Foreign keys
        /index\(/g // Database indexes
      ]]
    ]);

    // Security patterns to check for vulnerabilities
    this.securityPatterns = new Map([
      ["sql-injection", [
        /query\s*\(\s*['"`].*\$\{.*\}.*['"`]/g, // Direct string interpolation in queries
        /query\s*\(\s*['"`].*\+.*['"`]/g, // String concatenation in queries
        /exec\s*\(/g // Direct exec usage
      ]],
      ["xss-prevention", [
        /dangerouslySetInnerHTML/g, // React dangerous HTML
        /innerHTML\s*=/g, // Direct innerHTML assignment
        /document\.write/g // Document write
      ]],
      ["authentication", [
        /isAuthenticated|requireAuth|checkAuth/g, // Auth middleware
        /jwt\.verify|passport\./g, // Auth libraries
        /session\./g // Session management
      ]],
      ["input-validation", [
        /z\.string\(\)|z\.number\(\)|z\.object\(/g, // Zod validation
        /validate|sanitize/gi, // Validation functions
        /\.trim\(\)|\.escape\(/g // Input sanitization
      ]],
      ["secrets-management", [
        /process\.env\./g, // Environment variables
        /apiKey|api_key|password|secret/gi, // Potential exposed secrets
      ]]
    ]);

    // Performance patterns
    this.performancePatterns = new Map([
      ["react-optimization", [
        /React\.memo/g, // Memoized components
        /useCallback|useMemo/g, // Hook optimization
        /lazy\(/g, // Lazy loading
        /Suspense/g // Code splitting
      ]],
      ["database-optimization", [
        /index\(/g, // Database indexes
        /limit\(/g, // Query limits
        /select\(\)/g, // Selective queries
        /join\(/g // Optimized joins
      ]],
      ["api-optimization", [
        /cache|Cache/g, // Caching
        /compression/g, // Response compression
        /limit|rateLimit/g, // Rate limiting
        /pagination|page|limit|offset/g // Pagination
      ]]
    ]);
  }

  /**
   * Initialize ESLint for JavaScript/TypeScript validation
   */
  private initializeESLint(): void {
    try {
      // Note: ESLint would need to be properly configured in production
      // This is a placeholder for the actual ESLint configuration
      this.eslint = null; // Would be: new ESLint({ configuration })
    } catch (error) {
      console.warn("ESLint initialization failed:", error);
    }
  }

  /**
   * Main validation method
   */
  async validateGeneratedCode(
    generatedCode: GeneratedCode,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const defaultOptions: ValidationOptions = {
      checkTypes: true,
      checkSecurity: true,
      checkPerformance: true,
      checkAccessibility: false,
      checkBestPractices: true,
      enterprisePatterns: true,
      ...options
    };

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    const metrics: ValidationMetrics = {
      totalFiles: 0,
      totalLines: 0,
      errorCount: 0,
      warningCount: 0,
      typeChecksPassed: true,
      securityChecksPassed: true,
      performanceScore: 100,
      accessibilityScore: 100,
      codeQualityScore: 100
    };

    // Validate each category of generated code
    const validationPromises = [
      this.validateComponents(generatedCode.components, defaultOptions),
      this.validateApiEndpoints(generatedCode.apiEndpoints, defaultOptions),
      this.validateDatabaseSchemas(generatedCode.databaseSchema, defaultOptions),
    ];

    if (generatedCode.workflows) {
      validationPromises.push(this.validateWorkflows(generatedCode.workflows, defaultOptions));
    }

    const results = await Promise.all(validationPromises);

    // Aggregate results
    results.forEach(result => {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      suggestions.push(...result.suggestions);
      metrics.totalFiles += result.metrics.totalFiles;
      metrics.totalLines += result.metrics.totalLines;
      metrics.errorCount += result.metrics.errorCount;
      metrics.warningCount += result.metrics.warningCount;
      
      // Update pass/fail flags
      metrics.typeChecksPassed = metrics.typeChecksPassed && result.metrics.typeChecksPassed;
      metrics.securityChecksPassed = metrics.securityChecksPassed && result.metrics.securityChecksPassed;
      
      // Average scores
      metrics.performanceScore = Math.min(metrics.performanceScore, result.metrics.performanceScore);
      metrics.accessibilityScore = Math.min(metrics.accessibilityScore, result.metrics.accessibilityScore);
      metrics.codeQualityScore = Math.min(metrics.codeQualityScore, result.metrics.codeQualityScore);
    });

    // Add general suggestions based on validation results
    if (errors.length > 0) {
      suggestions.push("Fix critical errors before deployment");
    }
    if (warnings.length > 10) {
      suggestions.push("Consider addressing warnings to improve code quality");
    }
    if (metrics.performanceScore < 80) {
      suggestions.push("Implement performance optimizations for better user experience");
    }
    if (metrics.securityChecksPassed === false) {
      suggestions.push("Security vulnerabilities detected - review and fix immediately");
    }

    return {
      passed: errors.length === 0 && metrics.securityChecksPassed,
      errors,
      warnings,
      suggestions,
      metrics
    };
  }

  /**
   * Validate React components
   */
  private async validateComponents(
    components: { [filename: string]: string },
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    let totalLines = 0;

    for (const [filename, content] of Object.entries(components)) {
      totalLines += content.split('\n').length;

      // Check for React best practices
      if (options.enterprisePatterns) {
        const reactPatterns = this.enterprisePatterns.get("react-best-practices") || [];
        
        // Check for missing data-testid attributes
        if (!content.match(/data-testid/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Missing data-testid attributes for testing",
            suggestion: "Add data-testid attributes to interactive elements"
          });
        }

        // Check for key props in lists
        if (content.match(/\.map\(/) && !content.match(/key\s*=/)) {
          errors.push({
            file: filename,
            severity: "error",
            message: "Missing key prop in list rendering",
            fix: "Add unique key prop to list items"
          });
        }

        // Check for TypeScript types
        if (filename.endsWith('.tsx') && !content.match(/interface.*Props|type.*Props/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Missing TypeScript prop types",
            suggestion: "Define interface or type for component props"
          });
        }
      }

      // Check for security issues
      if (options.checkSecurity) {
        if (content.match(/dangerouslySetInnerHTML/)) {
          errors.push({
            file: filename,
            severity: "critical",
            message: "Usage of dangerouslySetInnerHTML detected - potential XSS vulnerability",
            fix: "Use safe rendering methods or sanitize content properly"
          });
        }
      }

      // Check for accessibility
      if (options.checkAccessibility && content.match(/<img/)) {
        if (!content.match(/alt\s*=/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Images missing alt attributes",
            suggestion: "Add descriptive alt text for accessibility"
          });
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metrics: {
        totalFiles: Object.keys(components).length,
        totalLines,
        errorCount: errors.length,
        warningCount: warnings.length,
        typeChecksPassed: true,
        securityChecksPassed: !errors.some(e => e.severity === "critical"),
        performanceScore: this.calculatePerformanceScore(components),
        accessibilityScore: 100 - (warnings.filter(w => w.message.includes("accessibility")).length * 10),
        codeQualityScore: this.calculateCodeQualityScore(errors.length, warnings.length, totalLines)
      }
    };
  }

  /**
   * Validate API endpoints
   */
  private async validateApiEndpoints(
    apiEndpoints: { [filename: string]: string },
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    let totalLines = 0;

    for (const [filename, content] of Object.entries(apiEndpoints)) {
      totalLines += content.split('\n').length;

      // Check for API standards
      if (options.enterprisePatterns) {
        // Check for proper status codes
        if (!content.match(/status\(\d{3}\)/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Missing explicit HTTP status codes",
            suggestion: "Use explicit status codes like res.status(200)"
          });
        }

        // Check for error handling
        if (!content.match(/try\s*{[\s\S]*?}\s*catch|\.catch\(/)) {
          errors.push({
            file: filename,
            severity: "error",
            message: "Missing error handling in API endpoint",
            fix: "Add try-catch blocks or .catch() handlers"
          });
        }

        // Check for input validation
        if (content.match(/router\.(post|put|patch)/) && !content.match(/validate|z\./)) {
          errors.push({
            file: filename,
            severity: "critical",
            message: "Missing input validation for POST/PUT/PATCH endpoints",
            fix: "Add Zod validation schemas for request body"
          });
        }
      }

      // Check for security issues
      if (options.checkSecurity) {
        // Check for SQL injection vulnerabilities
        if (content.match(/query\s*\(\s*['"`].*\$\{.*\}.*['"`]/)) {
          errors.push({
            file: filename,
            severity: "critical",
            message: "Potential SQL injection vulnerability detected",
            fix: "Use parameterized queries instead of string interpolation"
          });
        }

        // Check for authentication
        if (!content.match(/isAuthenticated|requireAuth|passport/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "No authentication middleware detected",
            suggestion: "Add authentication middleware to protect endpoints"
          });
        }
      }

      // Check for performance
      if (options.checkPerformance) {
        if (!content.match(/limit|pagination|cache/i)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "No pagination or caching detected",
            suggestion: "Implement pagination and caching for better performance"
          });
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metrics: {
        totalFiles: Object.keys(apiEndpoints).length,
        totalLines,
        errorCount: errors.length,
        warningCount: warnings.length,
        typeChecksPassed: true,
        securityChecksPassed: !errors.some(e => e.severity === "critical"),
        performanceScore: this.calculatePerformanceScore(apiEndpoints),
        accessibilityScore: 100,
        codeQualityScore: this.calculateCodeQualityScore(errors.length, warnings.length, totalLines)
      }
    };
  }

  /**
   * Validate database schemas
   */
  private async validateDatabaseSchemas(
    schemas: { [filename: string]: string },
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    let totalLines = 0;

    for (const [filename, content] of Object.entries(schemas)) {
      totalLines += content.split('\n').length;

      // Check for Drizzle ORM patterns
      if (options.enterprisePatterns) {
        // Check for proper table definitions
        if (!content.match(/pgTable/)) {
          errors.push({
            file: filename,
            severity: "error",
            message: "Missing Drizzle ORM table definitions",
            fix: "Use pgTable to define database tables"
          });
        }

        // Check for indexes
        if (!content.match(/index\(/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "No database indexes defined",
            suggestion: "Add indexes for frequently queried columns"
          });
        }

        // Check for foreign key relationships
        if (content.match(/Id|_id/) && !content.match(/references\(/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Potential missing foreign key relationships",
            suggestion: "Add references() for foreign key columns"
          });
        }

        // Check for validation schemas
        if (!content.match(/createInsertSchema|z\./)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Missing validation schemas",
            suggestion: "Add Drizzle Zod schemas for data validation"
          });
        }
      }

      // Check for best practices
      if (options.checkBestPractices) {
        // Check for audit fields
        if (!content.match(/createdAt|created_at/) || !content.match(/updatedAt|updated_at/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Missing audit timestamp fields",
            suggestion: "Add createdAt and updatedAt fields for audit trail"
          });
        }

        // Check for proper typing
        if (!content.match(/\$inferSelect|\$inferInsert/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "Missing TypeScript type inference",
            suggestion: "Export types using $inferSelect and $inferInsert"
          });
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metrics: {
        totalFiles: Object.keys(schemas).length,
        totalLines,
        errorCount: errors.length,
        warningCount: warnings.length,
        typeChecksPassed: true,
        securityChecksPassed: true,
        performanceScore: this.calculatePerformanceScore(schemas),
        accessibilityScore: 100,
        codeQualityScore: this.calculateCodeQualityScore(errors.length, warnings.length, totalLines)
      }
    };
  }

  /**
   * Validate workflows
   */
  private async validateWorkflows(
    workflows: { [filename: string]: string },
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    let totalLines = 0;

    for (const [filename, content] of Object.entries(workflows)) {
      totalLines += content.split('\n').length;

      // Check for workflow patterns
      if (options.enterprisePatterns) {
        // Check for error handling in workflows
        if (!content.match(/error|Error|catch|fail/i)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "No error handling defined in workflow",
            suggestion: "Add error states and recovery mechanisms"
          });
        }

        // Check for state management
        if (!content.match(/status|state|Status|State/)) {
          warnings.push({
            file: filename,
            severity: "warning",
            message: "No explicit state management in workflow",
            suggestion: "Define clear workflow states and transitions"
          });
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metrics: {
        totalFiles: Object.keys(workflows).length,
        totalLines,
        errorCount: errors.length,
        warningCount: warnings.length,
        typeChecksPassed: true,
        securityChecksPassed: true,
        performanceScore: 100,
        accessibilityScore: 100,
        codeQualityScore: this.calculateCodeQualityScore(errors.length, warnings.length, totalLines)
      }
    };
  }

  /**
   * Calculate performance score based on code patterns
   */
  private calculatePerformanceScore(code: { [filename: string]: string }): number {
    let score = 100;
    let optimizationCount = 0;
    let fileCount = 0;

    for (const content of Object.values(code)) {
      fileCount++;
      
      // Check for performance optimizations
      this.performancePatterns.forEach((patterns, category) => {
        patterns.forEach(pattern => {
          if (content.match(pattern)) {
            optimizationCount++;
          }
        });
      });
    }

    // Calculate score based on optimization density
    const optimizationDensity = fileCount > 0 ? optimizationCount / fileCount : 0;
    
    if (optimizationDensity < 1) {
      score -= 20;
    }
    if (optimizationDensity < 0.5) {
      score -= 30;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate code quality score
   */
  private calculateCodeQualityScore(errors: number, warnings: number, lines: number): number {
    let score = 100;
    
    // Deduct for errors (more severe)
    score -= errors * 10;
    
    // Deduct for warnings (less severe)
    score -= warnings * 2;
    
    // Normalize by code size (issues per 100 lines)
    if (lines > 0) {
      const issuesPerHundredLines = ((errors + warnings) / lines) * 100;
      if (issuesPerHundredLines > 10) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}