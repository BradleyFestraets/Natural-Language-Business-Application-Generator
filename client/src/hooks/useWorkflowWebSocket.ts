import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowProgressMessage {
  type: string;
  executionId: string;
  status?: string;
  currentStep?: string;
  progress?: number;
  message?: string;
  stepData?: any;
  error?: string;
}

interface UseWorkflowWebSocketOptions {
  onProgress?: (progress: WorkflowProgressMessage) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export function useWorkflowWebSocket(
  executionId: string | null, 
  options: UseWorkflowWebSocketOptions = {}
) {
  const { 
    onProgress, 
    onStatusChange, 
    onError, 
    enabled = true 
  } = options;
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WorkflowProgressMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionAttempts(0);
  }, []);

  const connect = useCallback(() => {
    if (!executionId || !enabled) return;
    
    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      cleanup();
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/workflow-progress/${executionId}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionAttempts(0);
        console.log(`Connected to workflow execution ${executionId} progress updates`);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WorkflowProgressMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle different message types
          switch (message.type) {
            case 'connected':
              break;
            case 'workflow_execution_progress':
              onProgress?.(message);
              if (message.status) {
                onStatusChange?.(message.status);
              }
              break;
            case 'pong':
              // Heartbeat response
              break;
            case 'error':
              onError?.(message.error || 'Unknown WebSocket error');
              break;
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        
        // Auto-reconnect if connection was not closed intentionally
        if (event.code !== 1000 && enabled && executionId && connectionAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000); // Exponential backoff
          console.log(`WebSocket closed, reconnecting in ${delay}ms (attempt ${connectionAttempts + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        onError?.('WebSocket connection failed');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onError?.('Failed to create WebSocket connection');
    }
  }, [executionId, enabled, connectionAttempts, onProgress, onStatusChange, onError, cleanup]);

  // Send ping to keep connection alive
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Connect when executionId changes or component mounts
  useEffect(() => {
    if (executionId && enabled) {
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [executionId, enabled, connect, cleanup]);

  // Set up ping interval
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(sendPing, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendPing]);

  return {
    isConnected,
    lastMessage,
    connectionAttempts,
    reconnect: connect
  };
}