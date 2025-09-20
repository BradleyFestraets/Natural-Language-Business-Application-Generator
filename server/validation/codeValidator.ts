import { z } from 'zod';
import { ESLint } from 'eslint';
import * as ts from 'typescript';
import { readFile } from 'fs/promises';
import { join } from 'path';

const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    file: z.string(),
    line: z.number(),
    column: z.number(),
    message: z.string(),
    severity: z.enum(['error', 'warning', 'info'])
  })),
  warnings: z.array(z.string()),
  metrics: z.object({
    totalFiles: z.number(),
    totalLines: z.number(),
    coverage: z.number().optional(),
    complexity: z.number().optional()
  })
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export class CodeValidator {
  private eslint: ESLint;

  constructor() {
    // Initialize ESLint with TypeScript support
    this.eslint = new ESLint({
      baseConfig: {
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true
          }
        },
        extends: [
          'eslint:recommended',
          'plugin:react/recommended',
          'plugin:@typescript-eslint/recommended'
        ],
        rules: {
          'no-console': 'warn',
          'no-unused-vars': 'off',
          '@typescript-eslint/no-unused-vars': ['warn'],
          '@typescript-eslint/explicit-module-boundary-types': 'off',
          '@typescript-eslint/no-explicit-any': 'warn',
          'react/react-in-jsx-scope': 'off'
        }
      },
      useEslintrc: false
    });
  }

  /**
   * Validate generated code for syntax errors, best practices, and security issues
   */
  async validateCode(
    code: string,
    filePath: string,
    options?: {
      validateTypes?: boolean;
      validateSecurity?: boolean;
      validatePerformance?: boolean;
    }
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: string[] = [];

    try {
      // 1. Check TypeScript syntax if it's a TS/TSX file
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        const tsErrors = this.validateTypeScript(code, filePath);
        errors.push(...tsErrors);
      }

      // 2. Run ESLint validation
      const eslintResults = await this.eslint.lintText(code, {
        filePath
      });

      for (const result of eslintResults) {
        for (const message of result.messages) {
          errors.push({
            file: filePath,
            line: message.line || 0,
            column: message.column || 0,
            message: message.message,
            severity: message.severity === 2 ? 'error' : 'warning'
          });
        }
      }

      // 3. Security validation
      if (options?.validateSecurity) {
        const securityIssues = this.checkSecurityIssues(code);
        warnings.push(...securityIssues);
      }

      // 4. Performance validation
      if (options?.validatePerformance) {
        const performanceIssues = this.checkPerformanceIssues(code);
        warnings.push(...performanceIssues);
      }

      // 5. Best practices validation
      const bestPracticeIssues = this.checkBestPractices(code);
      warnings.push(...bestPracticeIssues);

      const metrics = this.calculateMetrics(code);

      return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings,
        metrics
      };
    } catch (error) {
      console.error('Code validation failed:', error);
      return {
        valid: false,
        errors: [{
          file: filePath,
          line: 0,
          column: 0,
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings,
        metrics: {
          totalFiles: 1,
          totalLines: code.split('\n').length
        }
      };
    }
  }

  /**
   * Validate multiple files at once
   */
  async validateFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<ValidationResult> {
    const allErrors: ValidationResult['errors'] = [];
    const allWarnings: string[] = [];
    let totalLines = 0;
    let totalValid = 0;

    for (const file of files) {
      const result = await this.validateCode(file.content, file.path);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      totalLines += result.metrics.totalLines;
      if (result.valid) totalValid++;
    }

    return {
      valid: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      warnings: allWarnings,
      metrics: {
        totalFiles: files.length,
        totalLines,
        coverage: (totalValid / files.length) * 100
      }
    };
  }

  /**
   * Validate React component structure
   */
  async validateReactComponent(
    code: string,
    componentName: string
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: string[] = [];

    // Check for component definition
    if (!code.includes(`function ${componentName}`) && 
        !code.includes(`const ${componentName}`) &&
        !code.includes(`class ${componentName}`)) {
      errors.push({
        file: componentName,
        line: 0,
        column: 0,
        message: `Component ${componentName} not found in code`,
        severity: 'error'
      });
    }

    // Check for React imports
    if (!code.includes('import') || !code.includes('react')) {
      warnings.push('React imports might be missing');
    }

    // Check for proper exports
    if (!code.includes(`export default ${componentName}`) && 
        !code.includes(`export { ${componentName}`) &&
        !code.includes(`export function ${componentName}`)) {
      warnings.push('Component might not be exported properly');
    }

    // Check for hooks usage
    if (code.includes('useState') || code.includes('useEffect')) {
      if (!code.includes("'react'") && !code.includes('"react"')) {
        errors.push({
          file: componentName,
          line: 0,
          column: 0,
          message: 'React hooks used but React not imported',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        totalFiles: 1,
        totalLines: code.split('\n').length
      }
    };
  }

  /**
   * Validate API endpoint structure
   */
  async validateAPIEndpoint(
    code: string,
    endpoint: string
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: string[] = [];

    // Check for Express route handlers
    const hasRouteHandler = ['app.get', 'app.post', 'app.put', 'app.delete', 'app.patch']
      .some(method => code.includes(method));

    if (!hasRouteHandler) {
      errors.push({
        file: endpoint,
        line: 0,
        column: 0,
        message: 'No Express route handlers found',
        severity: 'error'
      });
    }

    // Check for error handling
    if (!code.includes('try') || !code.includes('catch')) {
      warnings.push('API endpoint might lack proper error handling');
    }

    // Check for validation
    if (!code.includes('validate') && !code.includes('z.') && !code.includes('joi')) {
      warnings.push('API endpoint might lack input validation');
    }

    // Check for authentication
    if (endpoint.includes('admin') || endpoint.includes('user')) {
      if (!code.includes('authenticate') && !code.includes('auth')) {
        warnings.push('Protected endpoint might lack authentication');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        totalFiles: 1,
        totalLines: code.split('\n').length
      }
    };
  }

  /**
   * Validate database schema
   */
  async validateDatabaseSchema(
    code: string,
    schemaName: string
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: string[] = [];

    // Check for Drizzle imports
    if (!code.includes('drizzle-orm')) {
      errors.push({
        file: schemaName,
        line: 0,
        column: 0,
        message: 'Drizzle ORM imports missing',
        severity: 'error'
      });
    }

    // Check for table definition
    if (!code.includes('pgTable') && !code.includes('mysqlTable') && !code.includes('sqliteTable')) {
      errors.push({
        file: schemaName,
        line: 0,
        column: 0,
        message: 'No table definition found',
        severity: 'error'
      });
    }

    // Check for primary key
    if (!code.includes('primaryKey') && !code.includes('.primary()')) {
      warnings.push('Table might lack a primary key');
    }

    // Check for timestamps
    if (!code.includes('createdAt') && !code.includes('created_at')) {
      warnings.push('Table might benefit from timestamp fields');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        totalFiles: 1,
        totalLines: code.split('\n').length
      }
    };
  }

  private validateTypeScript(code: string, filePath: string): ValidationResult['errors'] {
    const errors: ValidationResult['errors'] = [];

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        code,
        ts.ScriptTarget.Latest,
        true
      );

      // Check for syntax errors
      const diagnostics = ts.getPreEmitDiagnostics(
        ts.createProgram([filePath], {
          noEmit: true,
          allowJs: true,
          checkJs: false
        }),
        sourceFile
      );

      for (const diagnostic of diagnostics) {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          errors.push({
            file: filePath,
            line: line + 1,
            column: character + 1,
            message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
            severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning'
          });
        }
      }
    } catch (error) {
      // Silently handle TypeScript validation errors
      console.debug('TypeScript validation skipped:', error);
    }

    return errors;
  }

  private checkSecurityIssues(code: string): string[] {
    const issues: string[] = [];

    // Check for potential security vulnerabilities
    const securityPatterns = [
      { pattern: /eval\s*\(/, message: 'Avoid using eval() - security risk' },
      { pattern: /innerHTML\s*=/, message: 'Avoid innerHTML - use textContent or React components' },
      { pattern: /document\.write/, message: 'Avoid document.write() - security risk' },
      { pattern: /\$\{.*\}.*<script/i, message: 'Potential XSS vulnerability in template literal' },
      { pattern: /process\.env\.\w+.*client/i, message: 'Avoid exposing environment variables to client' },
      { pattern: /password.*=.*["'].*["']/i, message: 'Hardcoded password detected' },
      { pattern: /api[_-]?key.*=.*["'].*["']/i, message: 'Hardcoded API key detected' }
    ];

    for (const { pattern, message } of securityPatterns) {
      if (pattern.test(code)) {
        issues.push(message);
      }
    }

    return issues;
  }

  private checkPerformanceIssues(code: string): string[] {
    const issues: string[] = [];

    // Check for potential performance issues
    const performancePatterns = [
      { pattern: /useEffect.*\[\s*\]/, message: 'Empty dependency array in useEffect might cause issues' },
      { pattern: /\.map\(.*\.map\(/s, message: 'Nested map operations might impact performance' },
      { pattern: /await.*for\s*\(/s, message: 'Await inside loop might cause performance issues' },
      { pattern: /document\.querySelector.*useEffect/s, message: 'DOM queries in React components - use refs instead' }
    ];

    for (const { pattern, message } of performancePatterns) {
      if (pattern.test(code)) {
        issues.push(message);
      }
    }

    return issues;
  }

  private checkBestPractices(code: string): string[] {
    const issues: string[] = [];

    // Check for best practices
    const bestPracticePatterns = [
      { pattern: /console\.(log|error|warn)/, message: 'Remove console statements in production' },
      { pattern: /\/\/\s*TODO/i, message: 'TODO comment found - complete implementation' },
      { pattern: /any\s*[;:,\)]/, message: 'Avoid using "any" type in TypeScript' },
      { pattern: /var\s+\w+\s*=/, message: 'Use const/let instead of var' },
      { pattern: /==(?!=)/, message: 'Use === instead of ==' }
    ];

    for (const { pattern, message } of bestPracticePatterns) {
      if (pattern.test(code)) {
        issues.push(message);
      }
    }

    return issues;
  }

  private calculateMetrics(code: string): ValidationResult['metrics'] {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*'));

    // Simple cyclomatic complexity calculation
    let complexity = 1;
    const complexityPatterns = [/if\s*\(/, /else\s*{/, /for\s*\(/, /while\s*\(/, /case\s+/, /catch\s*\(/];
    for (const pattern of complexityPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return {
      totalFiles: 1,
      totalLines: lines.length,
      coverage: (nonEmptyLines.length - commentLines.length) / nonEmptyLines.length * 100,
      complexity
    };
  }
}