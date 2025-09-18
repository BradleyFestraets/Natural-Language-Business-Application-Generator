/**
 * Startup configuration validation for enterprise reliability
 */

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ServiceHealthStatus {
  openai: 'available' | 'unavailable' | 'unknown';
  database: 'available' | 'unavailable' | 'unknown';
  session: 'available' | 'unavailable' | 'unknown';
}

/**
 * Validates all required environment variables and configurations at startup
 */
export function validateConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical environment variables for core functionality
  const requiredVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'REPL_ID'
  ];

  // AI-dependent environment variables
  const aiVars = [
    'OPENAI_API_KEY'
  ];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check AI variables (warnings only for graceful degradation)
  for (const varName of aiVars) {
    if (!process.env[varName]) {
      warnings.push(`Missing AI environment variable: ${varName} - AI features will be unavailable`);
    } else {
      // Basic API key format validation
      const apiKey = process.env[varName];
      if (apiKey.length < 20) {
        warnings.push(`${varName} appears invalid (too short) - AI features may fail`);
      }
    }
  }

  // Validate SESSION_SECRET strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET should be at least 32 characters for security');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checks health status of external services
 */
export async function checkServiceHealth(): Promise<ServiceHealthStatus> {
  const status: ServiceHealthStatus = {
    openai: 'unknown',
    database: 'unknown', 
    session: 'unknown'
  };

  // Check OpenAI availability
  try {
    if (process.env.OPENAI_API_KEY) {
      // Import OpenAI dynamically to avoid startup crashes
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Quick API validation call (low cost)
      await openai.models.list();
      status.openai = 'available';
    } else {
      status.openai = 'unavailable';
    }
  } catch (error) {
    console.warn('OpenAI service health check failed:', error instanceof Error ? error.message : 'Unknown error');
    status.openai = 'unavailable';
  }

  // Check database availability
  try {
    if (process.env.DATABASE_URL) {
      status.database = 'available'; // Assume available if URL is set
    } else {
      status.database = 'unavailable';
    }
  } catch (error) {
    status.database = 'unavailable';
  }

  // Check session configuration
  try {
    if (process.env.SESSION_SECRET && process.env.DATABASE_URL) {
      status.session = 'available';
    } else {
      status.session = 'unavailable';
    }
  } catch (error) {
    status.session = 'unavailable';
  }

  return status;
}

/**
 * Global service health status for runtime checks
 */
export let globalServiceHealth: ServiceHealthStatus = {
  openai: 'unknown',
  database: 'unknown',
  session: 'unknown'
};

/**
 * Update global service health status
 */
export function updateGlobalServiceHealth(health: ServiceHealthStatus): void {
  globalServiceHealth = health;
}

/**
 * Check if AI services are available for request handling
 */
export function isAIServiceAvailable(): boolean {
  return globalServiceHealth.openai === 'available';
}