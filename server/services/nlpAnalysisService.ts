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

/**
 * Service for managing NLP analysis progress with WebSocket updates
 */
class NLPAnalysisService {
  private activeAnalyses = new Map<string, WebSocket[]>();

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
  }
}

export const nlpAnalysisService = new NLPAnalysisService();