import { WebSocket } from "ws";

interface NLPProgress {
  businessRequirementId: string;
  status: "analyzing" | "processing" | "completed" | "error";
  progress: number;
  message: string;
  partialData?: any;
  finalResult?: any;
  error?: string;
}

interface AnalysisSessionMetadata {
  analysisSessionId: string;
  userId: string;
  organizationId: string;
  businessRequirementId: string;
  createdAt: Date;
}

/**
 * Service for managing NLP analysis progress with WebSocket updates
 * SECURITY CRITICAL: Tracks organization ownership for analysis sessions
 */
class NLPAnalysisService {
  private activeAnalyses = new Map<string, WebSocket[]>();
  private sessionMetadata = new Map<string, AnalysisSessionMetadata>();

  /**
   * Update analysis progress and broadcast to connected clients
   */
  updateProgress(analysisSessionId: string, progress: NLPProgress): void {
    const clients = this.activeAnalyses.get(analysisSessionId) || [];
    const message = JSON.stringify({
      type: "nlp_progress",
      analysisSessionId,
      ...progress
    });

    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * SECURITY CRITICAL: Create analysis session with organization tracking
   */
  createAnalysisSession(analysisSessionId: string, userId: string, organizationId: string, businessRequirementId: string): void {
    this.sessionMetadata.set(analysisSessionId, {
      analysisSessionId,
      userId,
      organizationId,
      businessRequirementId,
      createdAt: new Date()
    });
  }

  /**
   * SECURITY CRITICAL: Verify session ownership before WebSocket registration
   */
  verifySessionOwnership(analysisSessionId: string, userId: string, organizationId: string): boolean {
    const metadata = this.sessionMetadata.get(analysisSessionId);
    if (!metadata) {
      return false;
    }
    
    // Verify both user and organization ownership
    return metadata.userId === userId && metadata.organizationId === organizationId;
  }

  /**
   * Get session metadata for verification
   */
  getSessionMetadata(analysisSessionId: string): AnalysisSessionMetadata | undefined {
    return this.sessionMetadata.get(analysisSessionId);
  }

  /**
   * Register WebSocket client for analysis progress updates
   */
  registerProgressClient(analysisSessionId: string, ws: WebSocket): void {
    const clients = this.activeAnalyses.get(analysisSessionId) || [];
    clients.push(ws);
    this.activeAnalyses.set(analysisSessionId, clients);

    ws.on('close', () => {
      const updatedClients = this.activeAnalyses.get(analysisSessionId)?.filter(client => client !== ws) || [];
      this.activeAnalyses.set(analysisSessionId, updatedClients);
    });
  }

  /**
   * Clean up completed analysis sessions
   */
  cleanupSession(analysisSessionId: string): void {
    this.activeAnalyses.delete(analysisSessionId);
    this.sessionMetadata.delete(analysisSessionId);
  }
}

export const nlpAnalysisService = new NLPAnalysisService();