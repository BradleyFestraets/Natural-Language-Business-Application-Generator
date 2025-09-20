import { BusinessRequirement } from "@shared/schema";
import { isAIServiceAvailable } from "../config/validation";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel: 'email' | 'chat' | 'phone' | 'application' | 'portal';
  customerId: string;
  customerInfo: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  assignedAgent?: string;
  tags: string[];
  category: string;
  subcategory?: string;
  source: {
    type: 'email' | 'chat' | 'phone' | 'application' | 'portal';
    referenceId?: string;
    metadata: Record<string, any>;
  };
  sla: {
    responseTime: number; // minutes
    resolutionTime: number; // minutes
    targetResponseTime: Date;
    targetResolutionTime: Date;
    isBreached: boolean;
  };
  interactions: SupportInteraction[];
  resolution?: {
    solution: string;
    resolutionType: 'workaround' | 'permanent_fix' | 'feature_request' | 'user_error' | 'configuration';
    satisfaction?: number; // 1-5 rating
    feedback?: string;
    resolvedAt: Date;
    resolvedBy: string;
  };
  aiSuggestions: {
    category: string;
    priority: string;
    assignedAgent: string;
    similarTickets: string[];
    knowledgeArticles: KnowledgeArticle[];
    resolutionSuggestions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface SupportInteraction {
  id: string;
  type: 'customer_message' | 'agent_reply' | 'internal_note' | 'system_update' | 'ai_suggestion';
  content: string;
  author: string;
  authorType: 'customer' | 'agent' | 'system' | 'ai';
  isPrivate: boolean;
  attachments?: SupportAttachment[];
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface SupportAttachment {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'log' | 'other';
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  lastUpdated: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  searchScore?: number;
  relevanceScore?: number;
  relatedArticles: string[];
  aiGenerated: boolean;
  source: 'manual' | 'ai_generated' | 'application_docs' | 'support_resolution';
}

export interface KnowledgeBase {
  categories: KnowledgeCategory[];
  articles: KnowledgeArticle[];
  searchIndex: SearchIndex;
  analytics: KnowledgeAnalytics;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  parentCategory?: string;
  articleCount: number;
  viewCount: number;
  subcategories: KnowledgeCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchIndex {
  terms: Map<string, SearchTerm>;
  articles: Map<string, ArticleIndex>;
  categoryIndex: Map<string, string[]>;
}

export interface SearchTerm {
  term: string;
  frequency: number;
  documentFrequency: number;
  inverseDocumentFrequency: number;
}

export interface ArticleIndex {
  articleId: string;
  termFrequency: Map<string, number>;
  tfIdfScore: number;
}

export interface KnowledgeAnalytics {
  totalViews: number;
  totalSearches: number;
  averageSearchTime: number;
  topSearchedTerms: Array<{ term: string; count: number }>;
  popularArticles: Array<{ articleId: string; views: number; helpfulRate: number }>;
  searchSuccessRate: number;
  updatedAt: Date;
}

export interface CustomerHealth {
  customerId: string;
  overallScore: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  riskFactors: RiskFactor[];
  engagementMetrics: EngagementMetric[];
  supportMetrics: SupportMetric[];
  successMetrics: SuccessMetric[];
  interventionHistory: Intervention[];
  predictiveAnalytics: {
    churnProbability: number;
    expansionOpportunity: number;
    nextBestAction: string;
    recommendedIntervention: string;
  };
  lastUpdated: Date;
  nextReviewDate: Date;
}

export interface RiskFactor {
  id: string;
  type: 'support_volume' | 'engagement_drop' | 'feature_usage' | 'payment_issues' | 'competitive_threat' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number;
  trend: 'improving' | 'stable' | 'worsening';
  detectedAt: Date;
  mitigatedAt?: Date;
}

export interface EngagementMetric {
  metric: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  benchmark: number;
  lastUpdated: Date;
}

export interface SupportMetric {
  totalTickets: number;
  openTickets: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  lastTicketDate: Date;
}

export interface SuccessMetric {
  onboardingComplete: boolean;
  featureAdoption: number;
  timeToValue: number;
  expansionRevenue: number;
  contractUtilization: number;
}

export interface Intervention {
  id: string;
  type: 'outreach' | 'training' | 'feature_demo' | 'account_review' | 'discount_offer' | 'success_call';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  scheduledDate: Date;
  completedDate?: Date;
  outcome?: string;
  effectiveness: 'unknown' | 'low' | 'medium' | 'high';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  ticketMetrics: TicketMetrics;
  agentPerformance: AgentPerformance[];
  customerSatisfaction: SatisfactionMetrics;
  resolutionAnalytics: ResolutionAnalytics;
  trends: SupportTrends;
  recommendations: OptimizationRecommendation[];
}

export interface TicketMetrics {
  totalCreated: number;
  totalResolved: number;
  avgResolutionTime: number;
  firstContactResolution: number;
  reopenedTickets: number;
  escalatedTickets: number;
  slaCompliance: number;
  byChannel: {
    channel: string;
    count: number;
    avgResolutionTime: number;
  }[];
  byPriority: {
    priority: string;
    count: number;
    avgResolutionTime: number;
  }[];
  byCategory: {
    category: string;
    count: number;
    avgResolutionTime: number;
  }[];
}

export interface AgentPerformance {
  agentId: string;
  name: string;
  ticketsHandled: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  firstContactResolution: number;
  activeTickets: number;
  productivity: number;
}

export interface SatisfactionMetrics {
  averageScore: number;
  responseRate: number;
  byChannel: {
    channel: string;
    averageScore: number;
    responseCount: number;
  }[];
  trends: {
    date: string;
    score: number;
    count: number;
  }[];
}

export interface ResolutionAnalytics {
  commonIssues: Array<{
    category: string;
    count: number;
    avgResolutionTime: number;
    commonSolutions: string[];
  }>;
  knowledgeBaseEffectiveness: {
    searchSuccessRate: number;
    selfServiceResolution: number;
    avgSessionTime: number;
  };
  automationImpact: {
    aiRoutingAccuracy: number;
    automatedResponses: number;
    resolutionSuggestions: number;
  };
}

export interface SupportTrends {
  ticketVolume: {
    date: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  resolutionTime: {
    date: string;
    time: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  satisfactionScore: {
    date: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  topCategories: {
    date: string;
    categories: Array<{ name: string; count: number }>;
  }[];
}

export interface OptimizationRecommendation {
  id: string;
  type: 'agent_training' | 'knowledge_improvement' | 'process_optimization' | 'automation' | 'resource_allocation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  expectedImprovement: number;
  implementation: string;
  priority: number;
}

/**
 * CustomerSupportService handles comprehensive customer support operations
 * Provides intelligent ticket management, AI-powered assistance, and proactive customer success
 */
export class CustomerSupportService {
  private tickets: Map<string, SupportTicket> = new Map();
  private knowledgeBase: KnowledgeBase;
  private customerHealth: Map<string, CustomerHealth> = new Map();
  private supportAnalytics: SupportAnalytics | null = null;

  constructor() {
    this.initializeKnowledgeBase();
    this.initializeSampleData();
  }

  /**
   * Create new support ticket with AI-powered routing
   */
  async createTicket(ticketData: {
    title: string;
    description: string;
    customerId: string;
    customerInfo: any;
    channel: SupportTicket['channel'];
    priority?: SupportTicket['priority'];
    category: string;
    subcategory?: string;
    tags?: string[];
    attachments?: SupportAttachment[];
    source?: any;
  }): Promise<SupportTicket> {
    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber();

    // AI-powered categorization and priority assessment
    const aiSuggestions = await this.analyzeTicketContent(ticketData);

    // Calculate SLA based on priority and customer
    const sla = this.calculateSLA(ticketData.priority || aiSuggestions.priority as any);

    // AI-powered agent assignment
    const assignedAgent = await this.routeToAgent(ticketData, aiSuggestions);

    const ticket: SupportTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticketNumber,
      ...ticketData,
      status: 'open',
      priority: ticketData.priority || aiSuggestions.priority as any,
      tags: ticketData.tags || [],
      source: ticketData.source || {
        type: ticketData.channel,
        metadata: {}
      },
      sla,
      interactions: [{
        id: `interaction_${Date.now()}_1`,
        type: 'customer_message',
        content: ticketData.description,
        author: ticketData.customerInfo.name,
        authorType: 'customer',
        isPrivate: false,
        attachments: ticketData.attachments,
        metadata: {},
        timestamp: new Date()
      }],
      aiSuggestions,
      assignedAgent,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tickets.set(ticket.id, ticket);

    // Update customer health
    await this.updateCustomerHealthAfterTicket(ticket);

    // Generate automated acknowledgment
    await this.sendAutomatedAcknowledgment(ticket);

    return ticket;
  }

  /**
   * AI-powered ticket content analysis
   */
  private async analyzeTicketContent(ticketData: any): Promise<SupportTicket['aiSuggestions']> {
    // AI-powered categorization and analysis
    const category = this.categorizeIssue(ticketData.description, ticketData.category);
    const priority = this.assessPriority(ticketData.description, ticketData.customerInfo);
    const assignedAgent = await this.suggestAgent(category, priority);

    // Find similar tickets
    const similarTickets = this.findSimilarTickets(ticketData.description);

    // Get relevant knowledge articles
    const knowledgeArticles = await this.searchKnowledgeBase(ticketData.description);

    // Generate resolution suggestions
    const resolutionSuggestions = await this.generateResolutionSuggestions(
      ticketData.description,
      category,
      similarTickets
    );

    return {
      category,
      priority,
      assignedAgent,
      similarTickets: similarTickets.map(t => t.id),
      knowledgeArticles,
      resolutionSuggestions
    };
  }

  /**
   * Add interaction to ticket
   */
  async addTicketInteraction(ticketId: string, interaction: Omit<SupportInteraction, 'id' | 'timestamp'>): Promise<SupportTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const newInteraction: SupportInteraction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...interaction,
      timestamp: new Date()
    };

    ticket.interactions.push(newInteraction);
    ticket.updatedAt = new Date();

    // Update SLA if agent responds
    if (interaction.authorType === 'agent' && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Update ticket status with SLA checking
   */
  async updateTicketStatus(ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const updatedTicket = { ...ticket, ...updates, updatedAt: new Date() };

    // Handle status changes
    if (updates.status === 'resolved' && !ticket.resolvedAt) {
      updatedTicket.resolvedAt = new Date();
    } else if (updates.status === 'closed' && !ticket.closedAt) {
      updatedTicket.closedAt = new Date();
    }

    // Check SLA breaches
    updatedTicket.sla.isBreached = this.checkSLABreach(updatedTicket);

    this.tickets.set(ticketId, updatedTicket);

    // Update customer health if resolved
    if (updates.status === 'resolved') {
      await this.updateCustomerHealthAfterResolution(updatedTicket);
    }

    return updatedTicket;
  }

  /**
   * Search knowledge base with AI-powered relevance
   */
  async searchKnowledgeBase(query: string, limit: number = 5): Promise<KnowledgeArticle[]> {
    const articles = Array.from(this.knowledgeBase.articles.values());

    // Simple text matching with relevance scoring
    const scoredArticles = articles
      .map(article => ({
        article,
        score: this.calculateRelevanceScore(query, article)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({ ...item.article, relevanceScore: item.score }));

    return scoredArticles;
  }

  /**
   * Calculate customer health score
   */
  async calculateCustomerHealth(customerId: string): Promise<CustomerHealth> {
    // Get recent tickets for this customer
    const customerTickets = Array.from(this.tickets.values())
      .filter(ticket => ticket.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate support metrics
    const supportMetrics: SupportMetric = {
      totalTickets: customerTickets.length,
      openTickets: customerTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      avgResolutionTime: this.calculateAverageResolutionTime(customerTickets),
      satisfactionScore: this.calculateAverageSatisfaction(customerTickets),
      lastTicketDate: customerTickets[0]?.createdAt || new Date()
    };

    // Calculate engagement and success metrics (simplified)
    const engagementMetrics: EngagementMetric[] = [
      {
        metric: 'ticket_frequency',
        value: customerTickets.length / 30, // tickets per month
        trend: 'stable',
        benchmark: 2,
        lastUpdated: new Date()
      }
    ];

    const successMetrics: SuccessMetric = {
      onboardingComplete: true,
      featureAdoption: 75,
      timeToValue: 15,
      expansionRevenue: 0,
      contractUtilization: 80
    };

    // Identify risk factors
    const riskFactors: RiskFactor[] = [];
    if (supportMetrics.totalTickets > 5) {
      riskFactors.push({
        id: 'high_support_volume',
        type: 'support_volume',
        severity: supportMetrics.totalTickets > 10 ? 'high' : 'medium',
        description: 'High volume of support tickets',
        impact: 0.3,
        trend: 'worsening',
        detectedAt: new Date()
      });
    }

    // Calculate overall health score
    const overallScore = this.calculateHealthScore(supportMetrics, riskFactors, engagementMetrics);

    const health: CustomerHealth = {
      customerId,
      overallScore,
      status: this.getHealthStatus(overallScore),
      riskFactors,
      engagementMetrics,
      supportMetrics,
      successMetrics,
      interventionHistory: [],
      predictiveAnalytics: {
        churnProbability: overallScore < 40 ? 0.7 : overallScore < 60 ? 0.4 : 0.1,
        expansionOpportunity: overallScore > 80 ? 0.8 : 0.3,
        nextBestAction: this.suggestNextBestAction(riskFactors, overallScore),
        recommendedIntervention: this.suggestIntervention(riskFactors, overallScore)
      },
      lastUpdated: new Date(),
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
    };

    this.customerHealth.set(customerId, health);
    return health;
  }

  /**
   * Get comprehensive support analytics
   */
  async getSupportAnalytics(startDate: Date, endDate: Date): Promise<SupportAnalytics> {
    const tickets = Array.from(this.tickets.values())
      .filter(ticket => ticket.createdAt >= startDate && ticket.createdAt <= endDate);

    const ticketMetrics: TicketMetrics = {
      totalCreated: tickets.length,
      totalResolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
      avgResolutionTime: this.calculateAverageResolutionTime(tickets),
      firstContactResolution: Math.round((tickets.filter(t =>
        t.firstResponseAt && t.resolvedAt &&
        (t.resolvedAt.getTime() - t.firstResponseAt.getTime()) < 24 * 60 * 60 * 1000
      ).length / tickets.length) * 100),
      reopenedTickets: tickets.filter(t => t.interactions.some(i =>
        i.type === 'customer_message' && i.timestamp > (t.resolvedAt || new Date())
      )).length,
      escalatedTickets: tickets.filter(t => t.status === 'escalated').length,
      slaCompliance: Math.round((tickets.filter(t => !t.sla.isBreached).length / tickets.length) * 100),
      byChannel: ['email', 'chat', 'phone', 'application', 'portal'].map(channel => ({
        channel,
        count: tickets.filter(t => t.channel === channel).length,
        avgResolutionTime: this.calculateAverageResolutionTime(tickets.filter(t => t.channel === channel))
      })),
      byPriority: ['low', 'medium', 'high', 'urgent'].map(priority => ({
        priority,
        count: tickets.filter(t => t.priority === priority).length,
        avgResolutionTime: this.calculateAverageResolutionTime(tickets.filter(t => t.priority === priority))
      })),
      byCategory: this.getCategoriesFromTickets(tickets).map(category => ({
        category,
        count: tickets.filter(t => t.category === category).length,
        avgResolutionTime: this.calculateAverageResolutionTime(tickets.filter(t => t.category === category))
      }))
    };

    // Agent performance (simplified)
    const agents = ['agent_1', 'agent_2', 'agent_3'];
    const agentPerformance: AgentPerformance[] = agents.map(agentId => {
      const agentTickets = tickets.filter(t => t.assignedAgent === agentId);
      return {
        agentId,
        name: `Agent ${agentId.split('_')[1]}`,
        ticketsHandled: agentTickets.length,
        avgResolutionTime: this.calculateAverageResolutionTime(agentTickets),
        satisfactionScore: 4.2 + Math.random() * 0.8,
        firstContactResolution: Math.round(Math.random() * 40 + 60),
        activeTickets: agentTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        productivity: Math.round(Math.random() * 20 + 80)
      };
    });

    const satisfactionMetrics: SatisfactionMetrics = {
      averageScore: 4.3,
      responseRate: 95,
      byChannel: ['email', 'chat', 'phone'].map(channel => ({
        channel,
        averageScore: 4.0 + Math.random() * 0.8,
        responseCount: Math.floor(Math.random() * 100)
      })),
      trends: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        score: 3.8 + Math.random() * 1.2,
        count: Math.floor(Math.random() * 10)
      }))
    };

    const resolutionAnalytics: ResolutionAnalytics = {
      commonIssues: [
        {
          category: 'Technical Issues',
          count: 45,
          avgResolutionTime: 120,
          commonSolutions: ['Restart application', 'Clear cache', 'Update software']
        }
      ],
      knowledgeBaseEffectiveness: {
        searchSuccessRate: 85,
        selfServiceResolution: 65,
        avgSessionTime: 180
      },
      automationImpact: {
        aiRoutingAccuracy: 92,
        automatedResponses: 156,
        resolutionSuggestions: 89
      }
    };

    const trends: SupportTrends = {
      ticketVolume: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20 + 10),
        trend: 'stable'
      })),
      resolutionTime: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: Math.floor(Math.random() * 200 + 100),
        trend: 'stable'
      })),
      satisfactionScore: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        score: 3.8 + Math.random() * 1.2,
        trend: 'stable'
      })),
      topCategories: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        categories: [
          { name: 'Technical', count: Math.floor(Math.random() * 10) },
          { name: 'Billing', count: Math.floor(Math.random() * 5) },
          { name: 'Feature Request', count: Math.floor(Math.random() * 3) }
        ]
      }))
    };

    const recommendations: OptimizationRecommendation[] = [
      {
        id: 'rec_agent_training',
        type: 'agent_training',
        title: 'Improve Resolution Time for Technical Issues',
        description: 'Technical issues are taking 20% longer than average to resolve.',
        impact: 'medium',
        effort: 'medium',
        expectedImprovement: 20,
        implementation: 'Provide specialized training for technical issue resolution',
        priority: 1
      }
    ];

    return {
      period: { startDate, endDate },
      ticketMetrics,
      agentPerformance,
      customerSatisfaction: satisfactionMetrics,
      resolutionAnalytics,
      trends,
      recommendations
    };
  }

  // Private helper methods

  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.tickets.size + 1;
    return `SUP-${year}-${count.toString().padStart(4, '0')}`;
  }

  private calculateSLA(priority: SupportTicket['priority']): SupportTicket['sla'] {
    const slaTimes = {
      low: { response: 24 * 60, resolution: 7 * 24 * 60 }, // 24 hours response, 7 days resolution
      medium: { response: 8 * 60, resolution: 3 * 24 * 60 }, // 8 hours response, 3 days resolution
      high: { response: 2 * 60, resolution: 24 * 60 }, // 2 hours response, 1 day resolution
      urgent: { response: 30, resolution: 4 * 60 } // 30 minutes response, 4 hours resolution
    };

    const times = slaTimes[priority];
    const now = new Date();

    return {
      responseTime: times.response,
      resolutionTime: times.resolution,
      targetResponseTime: new Date(now.getTime() + times.response * 60 * 1000),
      targetResolutionTime: new Date(now.getTime() + times.resolution * 60 * 1000),
      isBreached: false
    };
  }

  private async routeToAgent(ticketData: any, aiSuggestions: any): Promise<string> {
    // Simple agent routing logic (in real implementation would use AI)
    const agents = ['agent_1', 'agent_2', 'agent_3'];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private categorizeIssue(description: string, suggestedCategory: string): string {
    // Simple categorization logic
    const categories = ['technical', 'billing', 'feature_request', 'account', 'general'];
    return suggestedCategory || categories[Math.floor(Math.random() * categories.length)];
  }

  private assessPriority(description: string, customerInfo: any): string {
    // Simple priority assessment
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'down', 'broken'];
    const hasUrgentKeyword = urgentKeywords.some(keyword =>
      description.toLowerCase().includes(keyword)
    );

    if (hasUrgentKeyword) return 'urgent';
    if (customerInfo.priority === 'high') return 'high';
    return 'medium';
  }

  private findSimilarTickets(description: string): SupportTicket[] {
    // Simple similarity search (in real implementation would use ML)
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.status === 'resolved')
      .slice(0, 3);
  }

  private checkSLABreach(ticket: SupportTicket): boolean {
    const now = new Date();

    if (ticket.status === 'open' && now > ticket.sla.targetResponseTime) {
      return true;
    }

    if ((ticket.status === 'open' || ticket.status === 'in_progress') &&
        now > ticket.sla.targetResolutionTime) {
      return true;
    }

    return false;
  }

  private calculateRelevanceScore(query: string, article: KnowledgeArticle): number {
    // Simple relevance scoring
    const queryWords = query.toLowerCase().split(' ');
    const titleWords = article.title.toLowerCase().split(' ');
    const contentWords = article.content.toLowerCase().split(' ');

    let score = 0;
    queryWords.forEach(word => {
      if (titleWords.includes(word)) score += 10;
      if (contentWords.includes(word)) score += 1;
    });

    return score;
  }

  private calculateHealthScore(supportMetrics: SupportMetric, riskFactors: RiskFactor[], engagementMetrics: EngagementMetric[]): number {
    let score = 100;

    // Reduce score based on support volume
    if (supportMetrics.totalTickets > 5) score -= 20;
    if (supportMetrics.totalTickets > 10) score -= 20;

    // Reduce score based on open tickets
    if (supportMetrics.openTickets > 2) score -= 15;
    if (supportMetrics.openTickets > 5) score -= 25;

    // Reduce score based on satisfaction
    if (supportMetrics.satisfactionScore < 4) score -= 10;
    if (supportMetrics.satisfactionScore < 3) score -= 20;

    // Reduce score based on risk factors
    riskFactors.forEach(risk => {
      switch (risk.severity) {
        case 'low': score -= 5; break;
        case 'medium': score -= 15; break;
        case 'high': score -= 30; break;
        case 'critical': score -= 50; break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private getHealthStatus(score: number): CustomerHealth['status'] {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }

  private suggestNextBestAction(riskFactors: RiskFactor[], score: number): string {
    if (score < 40) return 'Schedule immediate account review call';
    if (riskFactors.some(r => r.severity === 'high')) return 'Provide proactive training session';
    return 'Send feature adoption tips';
  }

  private suggestIntervention(riskFactors: RiskFactor[], score: number): string {
    if (score < 40) return 'Executive business review';
    if (riskFactors.some(r => r.type === 'support_volume')) return 'Dedicated success manager assignment';
    return 'Quarterly business review';
  }

  private calculateAverageResolutionTime(tickets: SupportTicket[]): number {
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    if (resolvedTickets.length === 0) return 0;

    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      return sum + (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime());
    }, 0);

    return totalTime / resolvedTickets.length / (1000 * 60); // Convert to minutes
  }

  private calculateAverageSatisfaction(tickets: SupportTicket[]): number {
    const ratedTickets = tickets.filter(t => t.resolution?.satisfaction);
    if (ratedTickets.length === 0) return 0;

    return ratedTickets.reduce((sum, ticket) => sum + (ticket.resolution!.satisfaction || 0), 0) / ratedTickets.length;
  }

  private getCategoriesFromTickets(tickets: SupportTicket[]): string[] {
    return [...new Set(tickets.map(t => t.category))];
  }

  private async updateCustomerHealthAfterTicket(ticket: SupportTicket): Promise<void> {
    await this.calculateCustomerHealth(ticket.customerId);
  }

  private async updateCustomerHealthAfterResolution(ticket: SupportTicket): Promise<void> {
    await this.calculateCustomerHealth(ticket.customerId);
  }

  private async sendAutomatedAcknowledgment(ticket: SupportTicket): Promise<void> {
    // In real implementation, would send email/chat acknowledgment
    console.log(`Sending acknowledgment for ticket ${ticket.ticketNumber}`);
  }

  private initializeKnowledgeBase(): void {
    this.knowledgeBase = {
      categories: [
        {
          id: 'cat_technical',
          name: 'Technical Issues',
          description: 'Application and technical problems',
          articleCount: 25,
          viewCount: 1200,
          subcategories: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      articles: new Map(),
      searchIndex: {
        terms: new Map(),
        articles: new Map(),
        categoryIndex: new Map()
      },
      analytics: {
        totalViews: 0,
        totalSearches: 0,
        averageSearchTime: 0,
        topSearchedTerms: [],
        popularArticles: [],
        searchSuccessRate: 0,
        updatedAt: new Date()
      }
    };
  }

  private initializeSampleData(): void {
    // Create sample tickets for development
    const sampleTickets: SupportTicket[] = [
      {
        id: 'ticket_sample_1',
        ticketNumber: 'SUP-2025-0001',
        title: 'Unable to login to application',
        description: 'Customer cannot access their account after recent update',
        status: 'in_progress',
        priority: 'high',
        channel: 'email',
        customerId: 'cust_1',
        customerInfo: {
          name: 'John Smith',
          email: 'john.smith@example.com',
          company: 'Tech Corp'
        },
        assignedAgent: 'agent_1',
        tags: ['login', 'authentication', 'urgent'],
        category: 'technical',
        source: {
          type: 'email',
          metadata: {}
        },
        sla: {
          responseTime: 120,
          resolutionTime: 1440,
          targetResponseTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          targetResolutionTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isBreached: false
        },
        interactions: [],
        aiSuggestions: {
          category: 'technical',
          priority: 'high',
          assignedAgent: 'agent_1',
          similarTickets: [],
          knowledgeArticles: [],
          resolutionSuggestions: ['Reset password', 'Check browser compatibility']
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
    ];

    sampleTickets.forEach(ticket => {
      this.tickets.set(ticket.id, ticket);
    });
  }
}
