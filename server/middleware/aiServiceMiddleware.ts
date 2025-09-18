/**
 * Middleware for handling AI service availability and graceful degradation
 */

import { Request, Response, NextFunction } from "express";
import { isAIServiceAvailable } from "../config/validation";

/**
 * Middleware that checks AI service availability and adds status to request
 */
export function checkAIServiceMiddleware(req: Request, res: Response, next: NextFunction): void {
  (req as any).aiServiceAvailable = isAIServiceAvailable();
  next();
}

/**
 * Middleware that requires AI service to be available, returns 503 if not
 */
export function requireAIServiceMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isAIServiceAvailable()) {
    res.status(503).json({
      error: "AI Service Unavailable",
      message: "The AI service is currently unavailable. This may be due to missing API keys or service connectivity issues. Please try again later or contact support.",
      code: "AI_SERVICE_UNAVAILABLE",
      availableAlternatives: [
        "Check system status at /api/health",
        "Contact administrator to verify API configuration"
      ]
    });
    return;
  }
  next();
}

/**
 * Middleware for routes that can work with degraded AI functionality
 */
export function optionalAIServiceMiddleware(req: Request, res: Response, next: NextFunction): void {
  (req as any).aiServiceAvailable = isAIServiceAvailable();
  
  // Add degraded mode header if AI service is unavailable
  if (!(req as any).aiServiceAvailable) {
    res.setHeader('X-AI-Service-Status', 'degraded');
    res.setHeader('X-AI-Service-Message', 'AI features limited due to service unavailability');
  }
  
  next();
}