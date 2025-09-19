import { ProcessExecution, ProcessMetrics, EscalationRecord } from "../engines/processAutomationEngine";
import { WorkflowExecution } from "../../shared/schema";
import { storage } from "../storage";

export interface ProcessAnalytics {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  failedProcesses: number;
  averageCompletionTime: number;
  automationEfficiency: number;
  escalationRate: number;
  mostCommonFailures: Array<{ error: string; count: number }>;
  performanceMetrics: {
    throughputPerHour: number;
    averageStepDuration: number;
    bottleneckSteps: Array<{ stepId: string; averageDuration: number }>;
  };
}

export interface ProcessAlert {
  id: string;
  type: "sla_breach" | "failure_spike" | "performance_degradation" | "escalation_required";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  processId?: string;
  stepId?: string;
  triggeredAt: Date;
  metadata: Record<string, any>;
}

export interface ProcessDashboard {
  analytics: ProcessAnalytics;
  recentAlerts: ProcessAlert[];
  activeProcesses: ProcessExecution[];
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    queueSize: number;
    errorRate: number;
  };
  trends: {
    hourly: Array<{ hour: number; completed: number; failed: number }>;
    daily: Array<{ date: string; efficiency: number; throughput: number }>;
  };
}

/**
 * Process Monitoring Service provides real-time analytics,
 * performance tracking, and alerting for business processes
 */
export class ProcessMonitoringService {
  private processHistory: Map<string, ProcessExecution> = new Map();
  private alerts: ProcessAlert[] = [];
  private metricsBuffer: ProcessMetrics[] = [];
  private performanceData: Record<string, number[]> = {};

  constructor() {
    // Start monitoring services
    this.startMetricsCollection();
    this.startAlertMonitoring();
    this.startPerformanceTracking();
  }

  /**
   * Register process execution for monitoring
   */
  registerProcess(processExecution: ProcessExecution): void {
    this.processHistory.set(processExecution.executionId, processExecution);
    console.log(`Monitoring started for process: ${processExecution.executionId}`);
  }

  /**
   * Update process status and metrics
   */
  updateProcessStatus(
    executionId: string, 
    updates: Partial<ProcessExecution>
  ): void {
    const process = this.processHistory.get(executionId);
    if (process) {
      Object.assign(process, updates);
      
      // Check for alerts
      this.checkProcessAlerts(process);
      
      // Update metrics buffer
      if (updates.metrics) {
        this.metricsBuffer.push(updates.metrics);
      }
    }
  }

  /**
   * Get real-time process analytics
   */
  getProcessAnalytics(organizationId: string): ProcessAnalytics {
    // CRITICAL: Filter by organization to prevent cross-tenant data exposure
    const processes = Array.from(this.processHistory.values())
      .filter(p => p.organizationId === organizationId);
    const total = processes.length;
    const active = processes.filter(p => p.status === "running").length;
    const completed = processes.filter(p => p.status === "completed").length;
    const failed = processes.filter(p => p.status === "failed").length;

    // Calculate average completion time
    const completedProcesses = processes.filter(p => p.status === "completed" && p.endTime);
    const avgCompletionTime = completedProcesses.length > 0
      ? completedProcesses.reduce((sum, p) => 
          sum + (p.endTime!.getTime() - p.startTime.getTime()), 0) / completedProcesses.length
      : 0;

    // Calculate automation efficiency
    const avgEfficiency = processes.length > 0
      ? processes.reduce((sum, p) => sum + p.metrics.automationEfficiency, 0) / processes.length
      : 0;

    // Calculate escalation rate
    const totalEscalations = processes.reduce((sum, p) => sum + p.escalations.length, 0);
    const escalationRate = total > 0 ? totalEscalations / total : 0;

    // Find common failures
    const failureMap = new Map<string, number>();
    processes
      .filter(p => p.validationErrors.length > 0)
      .forEach(p => {
        p.validationErrors.forEach(error => {
          failureMap.set(error, (failureMap.get(error) || 0) + 1);
        });
      });

    const mostCommonFailures = Array.from(failureMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    // Performance metrics
    const allStepDurations = processes
      .flatMap(p => Object.entries(p.metrics.stepDurations))
      .reduce((acc, [stepId, duration]) => {
        if (!acc[stepId]) acc[stepId] = [];
        acc[stepId].push(duration);
        return acc;
      }, {} as Record<string, number[]>);

    const bottleneckSteps = Object.entries(allStepDurations)
      .map(([stepId, durations]) => ({
        stepId,
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5);

    const avgStepDuration = Object.values(allStepDurations)
      .flat()
      .reduce((sum, d, _, arr) => sum + d / arr.length, 0);

    return {
      totalProcesses: total,
      activeProcesses: active,
      completedProcesses: completed,
      failedProcesses: failed,
      averageCompletionTime: avgCompletionTime,
      automationEfficiency: avgEfficiency,
      escalationRate,
      mostCommonFailures,
      performanceMetrics: {
        throughputPerHour: this.calculateThroughput(),
        averageStepDuration: avgStepDuration,
        bottleneckSteps
      }
    };
  }

  /**
   * Get process dashboard data
   */
  getProcessDashboard(organizationId: string): ProcessDashboard {
    return {
      analytics: this.getProcessAnalytics(organizationId),
      recentAlerts: this.getRecentAlerts(organizationId),
      activeProcesses: Array.from(this.processHistory.values())
        .filter(p => p.status === "running" && p.organizationId === organizationId)
        .slice(0, 10), // Latest 10 active processes
      performance: this.getPerformanceMetrics(),
      trends: this.generateTrends()
    };
  }

  /**
   * Create alert for process issues
   */
  createAlert(
    type: ProcessAlert["type"],
    severity: ProcessAlert["severity"],
    message: string,
    processId?: string,
    stepId?: string,
    metadata: Record<string, any> = {}
  ): void {
    const alert: ProcessAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      processId,
      stepId,
      triggeredAt: new Date(),
      metadata
    };

    this.alerts.unshift(alert); // Add to beginning
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    console.log(`[ALERT - ${severity.toUpperCase()}] ${type}: ${message}`);

    // Send notifications for high severity alerts
    if (severity === "high" || severity === "critical") {
      this.sendAlertNotification(alert);
    }
  }

  /**
   * Get process execution history
   */
  getProcessHistory(limit: number = 50): ProcessExecution[] {
    return Array.from(this.processHistory.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get process metrics for specific execution
   */
  getProcessMetrics(executionId: string): ProcessMetrics | undefined {
    return this.processHistory.get(executionId)?.metrics;
  }

  /**
   * Generate process performance report
   */
  generatePerformanceReport(organizationId: string, timeRange: "day" | "week" | "month" = "day"): {
    summary: ProcessAnalytics;
    insights: string[];
    recommendations: string[];
  } {
    const analytics = this.getProcessAnalytics(organizationId);
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Generate insights
    if (analytics.automationEfficiency < 0.7) {
      insights.push("Automation efficiency is below optimal (70%). Manual interventions are high.");
      recommendations.push("Review escalation triggers and improve AI decision accuracy.");
    }

    if (analytics.escalationRate > 0.3) {
      insights.push("High escalation rate detected. Processes frequently require manual intervention.");
      recommendations.push("Analyze escalation patterns and adjust workflow complexity.");
    }

    if (analytics.performanceMetrics.bottleneckSteps.length > 0) {
      const topBottleneck = analytics.performanceMetrics.bottleneckSteps[0];
      insights.push(`Step '${topBottleneck.stepId}' is a performance bottleneck.`);
      recommendations.push(`Optimize step '${topBottleneck.stepId}' processing or add parallel execution.`);
    }

    if (analytics.failedProcesses / analytics.totalProcesses > 0.1) {
      insights.push("Process failure rate is above 10%. System reliability may be impacted.");
      recommendations.push("Investigate common failure patterns and implement preventive measures.");
    }

    return {
      summary: analytics,
      insights,
      recommendations
    };
  }

  /**
   * Check for process alerts
   */
  private checkProcessAlerts(process: ProcessExecution): void {
    // Check SLA breach
    const runningTime = Date.now() - process.startTime.getTime();
    if (runningTime > 24 * 60 * 60 * 1000) { // 24 hours
      this.createAlert(
        "sla_breach",
        "high",
        `Process ${process.executionId} has exceeded 24-hour SLA`,
        process.executionId,
        undefined,
        { runningTime: runningTime / (60 * 60 * 1000) }
      );
    }

    // Check for failure spikes
    const recentFailures = this.processHistory.size > 0 
      ? Array.from(this.processHistory.values())
          .filter(p => p.status === "failed" && 
            (Date.now() - p.startTime.getTime()) < 60 * 60 * 1000) // Last hour
          .length
      : 0;

    if (recentFailures > 5) {
      this.createAlert(
        "failure_spike",
        "critical",
        `High failure rate: ${recentFailures} failures in the last hour`,
        undefined,
        undefined,
        { failureCount: recentFailures }
      );
    }

    // Check for performance degradation
    if (process.metrics.automationEfficiency < 0.5) {
      this.createAlert(
        "performance_degradation",
        "medium",
        `Low automation efficiency: ${Math.round(process.metrics.automationEfficiency * 100)}%`,
        process.executionId,
        undefined,
        { efficiency: process.metrics.automationEfficiency }
      );
    }

    // Check for escalation requirements
    if (process.escalations.length > 0) {
      const unresolved = process.escalations.filter(e => !e.resolvedAt);
      if (unresolved.length > 0) {
        this.createAlert(
          "escalation_required",
          "high",
          `Process has ${unresolved.length} unresolved escalation(s)`,
          process.executionId,
          undefined,
          { unresolvedEscalations: unresolved.length }
        );
      }
    }
  }

  /**
   * Get recent alerts for a specific organization
   */
  private getRecentAlerts(organizationId: string, limit: number = 20): ProcessAlert[] {
    // CRITICAL: Filter alerts by organization to prevent cross-tenant data leakage
    return this.alerts
      .filter(alert => alert.metadata?.organizationId === organizationId)
      .slice(0, limit);
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): ProcessDashboard["performance"] {
    return {
      cpuUsage: Math.random() * 30 + 20, // Mock CPU usage 20-50%
      memoryUsage: Math.random() * 40 + 30, // Mock memory usage 30-70%
      queueSize: this.metricsBuffer.length,
      errorRate: this.calculateErrorRate()
    };
  }

  /**
   * Generate trend data
   */
  private generateTrends(): ProcessDashboard["trends"] {
    // Mock trend data - in real system would be calculated from historical data
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      completed: Math.floor(Math.random() * 20) + 5,
      failed: Math.floor(Math.random() * 3)
    }));

    const daily = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        efficiency: Math.random() * 0.3 + 0.7, // 0.7-1.0
        throughput: Math.floor(Math.random() * 50) + 100 // 100-150
      };
    }).reverse();

    return { hourly, daily };
  }

  /**
   * Calculate throughput per hour
   */
  private calculateThroughput(): number {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentCompletions = Array.from(this.processHistory.values())
      .filter(p => p.status === "completed" && p.endTime && p.endTime.getTime() > oneHourAgo)
      .length;
    
    return recentCompletions;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const total = this.processHistory.size;
    if (total === 0) return 0;
    
    const failed = Array.from(this.processHistory.values())
      .filter(p => p.status === "failed").length;
    
    return failed / total;
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: ProcessAlert): Promise<void> {
    // Mock notification - in real system would integrate with notification service
    console.log(`🚨 Sending ${alert.severity} alert notification: ${alert.message}`);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      // Process metrics buffer every minute
      if (this.metricsBuffer.length > 0) {
        console.log(`Collected ${this.metricsBuffer.length} process metrics`);
        this.metricsBuffer = []; // Reset buffer
      }
    }, 60000); // Every minute
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    setInterval(() => {
      // Check for issues across all organizations every 30 seconds
      // SECURITY: Monitor each organization separately to prevent data leakage
      const organizationIds = new Set(
        Array.from(this.processHistory.values()).map(p => p.organizationId)
      );
      
      organizationIds.forEach(orgId => {
        if (!orgId) return; // Skip processes without organizationId
        const analytics = this.getProcessAnalytics(orgId);
        
        // Monitor overall system health per organization
        if (analytics.failedProcesses > 0 && 
            analytics.failedProcesses / analytics.totalProcesses > 0.2) {
          this.createAlert(
            "failure_spike",
            "high",
            `Org ${orgId} failure rate: ${Math.round((analytics.failedProcesses / analytics.totalProcesses) * 100)}%`,
            undefined,
            undefined,
            { organizationFailureRate: analytics.failedProcesses / analytics.totalProcesses, organizationId: orgId }
          );
        }
      }); // Close organizationIds.forEach
    }, 30000); // Every 30 seconds
  }

  /**
   * Start performance tracking
   */
  private startPerformanceTracking(): void {
    setInterval(() => {
      // Track performance trends every 5 minutes
      const metrics = this.getPerformanceMetrics();
      const timestamp = Date.now();
      
      // Store performance data for trending
      if (!this.performanceData.cpu) this.performanceData.cpu = [];
      if (!this.performanceData.memory) this.performanceData.memory = [];
      if (!this.performanceData.errors) this.performanceData.errors = [];
      
      this.performanceData.cpu.push(metrics.cpuUsage);
      this.performanceData.memory.push(metrics.memoryUsage);
      this.performanceData.errors.push(metrics.errorRate);
      
      // Keep only last 24 hours of data (5-minute intervals = 288 points)
      Object.keys(this.performanceData).forEach(key => {
        if (this.performanceData[key].length > 288) {
          this.performanceData[key] = this.performanceData[key].slice(-288);
        }
      });
      
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}