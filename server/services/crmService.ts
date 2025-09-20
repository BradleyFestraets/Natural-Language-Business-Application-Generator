import { BusinessRequirement } from "@shared/schema";
import { isAIServiceAvailable } from "../config/validation";

export interface Customer {
  id: string;
  organizationId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    company?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  customerStatus: 'lead' | 'prospect' | 'customer' | 'churned';
  customerType: 'individual' | 'business' | 'enterprise';
  customerValue: number; // Lifetime value calculation
  acquisitionSource: string;
  assignedSalesRep?: string;
  customerHealth: {
    score: number; // 0-100 health score
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    riskFactors: string[];
    lastActivityDate: Date;
    engagementScore: number;
    supportTicketCount: number;
    applicationUsageScore: number;
  };
  customFields: Record<string, any>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastContactAt?: Date;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  type: 'application_usage' | 'sales_activity' | 'marketing_interaction' | 'support_ticket' | 'phone_call' | 'email' | 'meeting';
  title: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  userId?: string;
  outcome?: string;
  value?: number; // For sales activities
  systemSource: 'application' | 'sales' | 'marketing' | 'support' | 'telephony';
}

export interface CustomerSearchRequest {
  query?: string;
  filters?: {
    status?: Customer['customerStatus'][];
    type?: Customer['customerType'][];
    healthScore?: { min: number; max: number };
    tags?: string[];
    assignedSalesRep?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    customFields?: Record<string, any>;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface CustomerSearchResponse {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  filters: any;
}

export interface CustomerHealthUpdate {
  customerId: string;
  healthScore?: number;
  status?: Customer['customerHealth']['status'];
  riskFactors?: string[];
  lastActivityDate?: Date;
  engagementScore?: number;
  supportTicketCount?: number;
  applicationUsageScore?: number;
}

export interface CustomerSegmentationRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  }>;
  logic: 'AND' | 'OR';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  ruleId: string;
  customerCount: number;
  customers: string[]; // Customer IDs
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CRMService handles comprehensive customer relationship management
 * Provides unified customer database, 360-degree view, and AI-powered insights
 */
export class CRMService {
  private customers: Map<string, Customer> = new Map();
  private interactions: Map<string, CustomerInteraction> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private segmentationRules: Map<string, CustomerSegmentationRule> = new Map();

  constructor() {
    // Initialize with some sample data for development
    this.initializeSampleData();
  }

  /**
   * Create a new customer record
   */
  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'customerHealth'>): Promise<Customer> {
    const customer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...customerData,
      customerHealth: this.calculateInitialHealthScore(customerData),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  /**
   * Update customer information
   */
  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const updatedCustomer = {
      ...customer,
      ...updates,
      updatedAt: new Date()
    };

    this.customers.set(customerId, updatedCustomer);
    return updatedCustomer;
  }

  /**
   * Get customer by ID with full 360-degree view
   */
  async getCustomer(customerId: string): Promise<Customer & { interactions: CustomerInteraction[] }> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Get recent interactions for this customer
    const interactions = Array.from(this.interactions.values())
      .filter(interaction => interaction.customerId === customerId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Last 50 interactions

    return {
      ...customer,
      interactions
    };
  }

  /**
   * Search customers with advanced filtering
   */
  async searchCustomers(request: CustomerSearchRequest): Promise<CustomerSearchResponse> {
    let customers = Array.from(this.customers.values());

    // Apply filters
    if (request.filters) {
      customers = this.applySearchFilters(customers, request.filters);
    }

    // Apply search query
    if (request.query) {
      customers = this.applySearchQuery(customers, request.query);
    }

    // Apply sorting
    if (request.sort) {
      customers = this.applySorting(customers, request.sort);
    }

    // Apply pagination
    const total = customers.length;
    const page = request.pagination?.page || 1;
    const limit = request.pagination?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    customers = customers.slice(startIndex, endIndex);

    return {
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: request.filters
    };
  }

  /**
   * Update customer health score and status
   */
  async updateCustomerHealth(update: CustomerHealthUpdate): Promise<Customer> {
    const customer = this.customers.get(update.customerId);
    if (!customer) {
      throw new Error(`Customer ${update.customerId} not found`);
    }

    const updatedHealth = {
      ...customer.customerHealth,
      ...update,
      // Recalculate overall health score if components were updated
      score: update.healthScore ?? this.calculateOverallHealthScore({
        ...customer.customerHealth,
        ...update
      })
    };

    return this.updateCustomer(update.customerId, {
      customerHealth: updatedHealth
    });
  }

  /**
   * Record customer interaction
   */
  async recordInteraction(interaction: Omit<CustomerInteraction, 'id' | 'timestamp'>): Promise<CustomerInteraction> {
    const newInteraction: CustomerInteraction = {
      id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...interaction,
      timestamp: new Date()
    };

    this.interactions.set(newInteraction.id, newInteraction);

    // Update customer's last activity
    const customer = this.customers.get(interaction.customerId);
    if (customer) {
      await this.updateCustomer(interaction.customerId, {
        lastContactAt: new Date()
      });

      // Update health score based on interaction
      await this.updateCustomerHealthScoreFromInteraction(customer, newInteraction);
    }

    return newInteraction;
  }

  /**
   * Create customer segmentation rule
   */
  async createSegmentationRule(rule: Omit<CustomerSegmentationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomerSegmentationRule> {
    const newRule: CustomerSegmentationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.segmentationRules.set(newRule.id, newRule);
    return newRule;
  }

  /**
   * Generate customer segment based on rule
   */
  async generateSegment(ruleId: string): Promise<CustomerSegment> {
    const rule = this.segmentationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Segmentation rule ${ruleId} not found`);
    }

    const customers = Array.from(this.customers.values());
    const matchingCustomers = this.applySegmentationRule(customers, rule);

    const segment: CustomerSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: rule.name,
      description: rule.description,
      ruleId: rule.id,
      customerCount: matchingCustomers.length,
      customers: matchingCustomers.map(c => c.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.segments.set(segment.id, segment);
    return segment;
  }

  /**
   * Get AI-powered customer insights
   */
  async getCustomerInsights(customerId: string): Promise<{
    recommendations: string[];
    riskFactors: string[];
    opportunities: string[];
    predictedValue: number;
    engagementScore: number;
  }> {
    const customer = await this.getCustomer(customerId);

    // Simple AI-powered insights (in production, would use ML models)
    const insights = {
      recommendations: this.generateRecommendations(customer),
      riskFactors: this.identifyRiskFactors(customer),
      opportunities: this.identifyOpportunities(customer),
      predictedValue: this.predictCustomerValue(customer),
      engagementScore: customer.customerHealth.engagementScore
    };

    return insights;
  }

  // Private helper methods

  private calculateInitialHealthScore(customerData: any): Customer['customerHealth'] {
    return {
      score: 75, // Default good health score
      status: 'good',
      riskFactors: [],
      lastActivityDate: new Date(),
      engagementScore: 50,
      supportTicketCount: 0,
      applicationUsageScore: 50
    };
  }

  private calculateOverallHealthScore(health: Customer['customerHealth']): number {
    // Weighted calculation of health score
    const weights = {
      engagementScore: 0.4,
      applicationUsageScore: 0.3,
      supportTicketCount: -0.2,
      recentActivity: 0.1
    };

    let score = 50; // Base score

    score += (health.engagementScore - 50) * weights.engagementScore;
    score += (health.applicationUsageScore - 50) * weights.applicationUsageScore;
    score += (50 - health.supportTicketCount) * weights.supportTicketCount;

    // Recent activity bonus
    const daysSinceActivity = Math.floor((Date.now() - health.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity < 7) score += 10;
    else if (daysSinceActivity < 30) score += 5;
    else score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private applySearchFilters(customers: Customer[], filters: any): Customer[] {
    return customers.filter(customer => {
      if (filters.status && !filters.status.includes(customer.customerStatus)) return false;
      if (filters.type && !filters.type.includes(customer.customerType)) return false;
      if (filters.healthScore) {
        const score = customer.customerHealth.score;
        if (score < filters.healthScore.min || score > filters.healthScore.max) return false;
      }
      if (filters.tags && !filters.tags.some((tag: string) => customer.tags.includes(tag))) return false;
      if (filters.assignedSalesRep && customer.assignedSalesRep !== filters.assignedSalesRep) return false;

      // Date range filters
      if (filters.createdAfter && new Date(customer.createdAt) < filters.createdAfter) return false;
      if (filters.createdBefore && new Date(customer.createdAt) > filters.createdBefore) return false;

      return true;
    });
  }

  private applySearchQuery(customers: Customer[], query: string): Customer[] {
    const searchTerms = query.toLowerCase().split(' ');

    return customers.filter(customer => {
      const searchableText = `
        ${customer.personalInfo.firstName} ${customer.personalInfo.lastName}
        ${customer.personalInfo.email} ${customer.personalInfo.company}
        ${customer.personalInfo.title} ${customer.tags.join(' ')}
      `.toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  private applySorting(customers: Customer[], sort: any): Customer[] {
    return customers.sort((a, b) => {
      const aValue = this.getSortValue(a, sort.field);
      const bValue = this.getSortValue(b, sort.field);

      if (sort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  private getSortValue(customer: Customer, field: string): any {
    switch (field) {
      case 'name':
        return `${customer.personalInfo.firstName} ${customer.personalInfo.lastName}`;
      case 'company':
        return customer.personalInfo.company || '';
      case 'status':
        return customer.customerStatus;
      case 'healthScore':
        return customer.customerHealth.score;
      case 'createdAt':
        return customer.createdAt;
      case 'updatedAt':
        return customer.updatedAt;
      case 'customerValue':
        return customer.customerValue;
      default:
        return customer[field as keyof Customer];
    }
  }

  private async updateCustomerHealthScoreFromInteraction(customer: Customer, interaction: CustomerInteraction): Promise<void> {
    let healthUpdate: CustomerHealthUpdate = { customerId: customer.id };

    // Update engagement score based on interaction type
    switch (interaction.type) {
      case 'application_usage':
        healthUpdate.engagementScore = Math.min(100, customer.customerHealth.engagementScore + 5);
        healthUpdate.applicationUsageScore = Math.min(100, customer.customerHealth.applicationUsageScore + 10);
        break;
      case 'sales_activity':
        healthUpdate.engagementScore = Math.min(100, customer.customerHealth.engagementScore + 8);
        break;
      case 'marketing_interaction':
        healthUpdate.engagementScore = Math.min(100, customer.customerHealth.engagementScore + 3);
        break;
      case 'support_ticket':
        healthUpdate.engagementScore = Math.max(0, customer.customerHealth.engagementScore - 5);
        healthUpdate.supportTicketCount = customer.customerHealth.supportTicketCount + 1;
        break;
    }

    if (Object.keys(healthUpdate).length > 1) {
      await this.updateCustomerHealth(healthUpdate);
    }
  }

  private applySegmentationRule(customers: Customer[], rule: CustomerSegmentationRule): Customer[] {
    return customers.filter(customer => {
      let matches = 0;

      for (const condition of rule.conditions) {
        const customerValue = this.getCustomerFieldValue(customer, condition.field);
        const conditionMatch = this.evaluateCondition(customerValue, condition.operator, condition.value);

        if (rule.logic === 'AND') {
          if (!conditionMatch) return false;
        } else {
          if (conditionMatch) matches++;
        }
      }

      if (rule.logic === 'OR') {
        return matches > 0;
      }

      return true;
    });
  }

  private getCustomerFieldValue(customer: Customer, field: string): any {
    const fieldPath = field.split('.');
    let value: any = customer;

    for (const path of fieldPath) {
      value = value?.[path];
    }

    return value;
  }

  private evaluateCondition(customerValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return customerValue === expectedValue;
      case 'contains':
        return String(customerValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'greater_than':
        return customerValue > expectedValue;
      case 'less_than':
        return customerValue < expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(customerValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(customerValue);
      default:
        return false;
    }
  }

  private generateRecommendations(customer: Customer): string[] {
    const recommendations: string[] = [];

    if (customer.customerHealth.score < 50) {
      recommendations.push('Schedule follow-up call to address customer concerns');
      recommendations.push('Send personalized content to re-engage customer');
    }

    if (customer.customerHealth.engagementScore < 30) {
      recommendations.push('Create targeted marketing campaign for customer segment');
      recommendations.push('Assign dedicated account manager');
    }

    if (customer.customerStatus === 'prospect') {
      recommendations.push('Send product demo invitation');
      recommendations.push('Offer consultation call');
    }

    if (customer.customerHealth.supportTicketCount > 3) {
      recommendations.push('Review product experience and provide training');
      recommendations.push('Consider account review meeting');
    }

    return recommendations;
  }

  private identifyRiskFactors(customer: Customer): string[] {
    const risks: string[] = [];

    if (customer.customerHealth.score < 30) {
      risks.push('High risk of churn');
    }

    if (customer.customerHealth.engagementScore < 20) {
      risks.push('Very low engagement');
    }

    if (customer.customerHealth.supportTicketCount > 5) {
      risks.push('Multiple support issues');
    }

    const daysSinceActivity = Math.floor((Date.now() - customer.customerHealth.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity > 90) {
      risks.push('No recent activity');
    }

    return risks;
  }

  private identifyOpportunities(customer: Customer): string[] {
    const opportunities: string[] = [];

    if (customer.customerValue > 10000) {
      opportunities.push('Upsell premium features');
      opportunities.push('Schedule strategic review meeting');
    }

    if (customer.customerStatus === 'customer' && customer.customerHealth.score > 80) {
      opportunities.push('Request testimonial or case study');
      opportunities.push('Refer to similar companies');
    }

    if (customer.customerType === 'business') {
      opportunities.push('Explore enterprise licensing options');
    }

    return opportunities;
  }

  private predictCustomerValue(customer: Customer): number {
    // Simple prediction based on current value and health score
    const baseValue = customer.customerValue;
    const healthMultiplier = customer.customerHealth.score / 100;
    const engagementMultiplier = customer.customerHealth.engagementScore / 100;

    return Math.round(baseValue * (1 + healthMultiplier * 0.3 + engagementMultiplier * 0.2));
  }

  private initializeSampleData(): void {
    // Create sample customers for development
    const sampleCustomers: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'customerHealth'>[] = [
      {
        organizationId: 'org_1',
        personalInfo: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@example.com',
          phone: '+1234567890',
          title: 'CEO',
          company: 'Tech Innovations Inc.'
        },
        customerStatus: 'customer',
        customerType: 'business',
        customerValue: 15000,
        acquisitionSource: 'website',
        assignedSalesRep: 'sales_rep_1',
        customFields: {
          industry: 'technology',
          employeeCount: 50
        },
        tags: ['premium', 'enterprise', 'high-value']
      },
      {
        organizationId: 'org_1',
        personalInfo: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1234567891',
          title: 'Marketing Manager',
          company: 'Digital Solutions Ltd.'
        },
        customerStatus: 'prospect',
        customerType: 'business',
        customerValue: 8500,
        acquisitionSource: 'social media',
        assignedSalesRep: 'sales_rep_2',
        customFields: {
          industry: 'marketing',
          budget: 10000
        },
        tags: ['prospect', 'medium-value']
      }
    ];

    // Add sample customers
    sampleCustomers.forEach(customerData => {
      this.createCustomer(customerData);
    });
  }
}
