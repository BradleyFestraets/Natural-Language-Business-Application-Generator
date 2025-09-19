import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

// Global test setup for Enterprise AI Application Platform testing

// Mock console methods to reduce test noise
beforeAll(() => {
  // Keep important logs but reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Keep error logs for debugging
  vi.spyOn(console, 'error').mockImplementation((message) => {
    if (process.env.VITEST_DEBUG) {
      console.error(message);
    }
  });
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset environment variables
  delete process.env.OPENAI_API_KEY;
  delete process.env.DISABLE_AI_SERVICES;
  delete process.env.FORCE_FALLBACK_MODE;
  delete process.env.FALLBACK_QUALITY_LEVEL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Extend Express Request type for testing
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      user?: {
        id: string;
        email?: string;
        firstName?: string;
        lastName?: string;
      };
      session?: {
        organizationId?: string;
        role?: string;
        permissions?: string[];
        [key: string]: any;
      };
    }
  }
}