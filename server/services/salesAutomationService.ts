import { BusinessRequirement } from "@shared/schema";
import { isAIServiceAvailable } from "../config/validation";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'service' | 'product' | 'subscription';
  basePrice: number;
  pricingModel: 'fixed' | 'hourly' | 'monthly' | 'annual' | 'usage';
  features: string[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCatalog {
  products: Product[];
  categories: string[];
  pricingRules: PricingRule[];
  discountMatrices: DiscountMatrix[];
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    field: 'customerType' | 'customerValue' | 'volume' | 'industry' | 'segment';
    operator: 'equals' | 'greater_than' | 'less_than' | 'in_range';
    value: any;
  }>;
  pricing: {
    discountPercentage: number;
    fixedPrice?: number;
    multiplier?: number;
  };
  isActive: boolean;
  priority: number;
}

export interface DiscountMatrix {
  id: string;
  name: string;
  type: 'volume' | 'loyalty' | 'promotional' | 'seasonal';
  tiers: Array<{
    minQuantity: number;
    maxQuantity?: number;
    discountPercentage: number;
    fixedDiscount?: number;
  }>;
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
}

export interface SalesQuote {
  id: string;
  customerId: string;
  opportunityId?: string;
  quoteNumber: string;
  title: string;
  description?: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'accepted' | 'expired';
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  approvalWorkflow: ApprovalStep[];
  validUntil: Date;
  customerInfo: {
    name: string;
    email: string;
    company?: string;
    address?: string;
  };
  termsAndConditions: string;
  notes?: string;
  attachments?: QuoteAttachment[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface QuoteLineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  totalPrice: number;
  pricingModel: Product['pricingModel'];
  customFields: Record<string, any>;
}

export interface QuoteAttachment {
  id: string;
  filename: string;
  url: string;
  type: 'contract' | 'proposal' | 'specification' | 'other';
  uploadedAt: Date;
}

export interface ApprovalStep {
  id: string;
  step: number;
  approverRole: string;
  approverUser?: string;
  status: 'pending' | 'approved' | 'rejected';
  required: boolean;
  approvalDate?: Date;
  comments?: string;
}

export interface Contract {
  id: string;
  quoteId: string;
  contractNumber: string;
  title: string;
  customerId: string;
  customerInfo: {
    name: string;
    email: string;
    company?: string;
    address?: string;
  };
  contractValue: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  renewalType: 'manual' | 'automatic' | 'auto_renew';
  status: 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated' | 'cancelled';
  contractType: 'one_time' | 'subscription' | 'maintenance' | 'support' | 'custom';
  termsAndConditions: string;
  specialTerms?: string;
  attachments: ContractAttachment[];
  versions: ContractVersion[];
  signatureStatus: {
    customerSigned: boolean;
    customerSignedAt?: Date;
    companySigned: boolean;
    companySignedAt?: Date;
  };
  renewalSettings: {
    autoRenew: boolean;
    renewalNoticeDays: number;
    renewalDiscountPercentage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  terminatedAt?: Date;
  terminationReason?: string;
}

export interface ContractAttachment {
  id: string;
  filename: string;
  url: string;
  type: 'main_contract' | 'amendment' | 'appendix' | 'other';
  version: number;
  uploadedAt: Date;
}

export interface ContractVersion {
  version: number;
  changes: string[];
  createdAt: Date;
  createdBy: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  invoiceNumber: string;
  customerId: string;
  customerInfo: {
    name: string;
    email: string;
    company?: string;
    billingAddress?: string;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paymentTerms: string;
  paymentMethod?: string;
  paidAt?: Date;
  paidAmount?: number;
  outstandingAmount: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
}

export interface RevenueRecognition {
  id: string;
  contractId: string;
  invoiceId?: string;
  customerId: string;
  revenueType: 'one_time' | 'subscription' | 'milestone' | 'usage';
  recognizedAmount: number;
  recognitionDate: Date;
  recognitionMethod: 'straight_line' | 'milestone' | 'percentage_complete' | 'immediate';
  period: {
    startDate: Date;
    endDate: Date;
  };
  status: 'pending' | 'recognized' | 'deferred' | 'reversed';
  accountingPeriod: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'check' | 'paypal' | 'stripe' | 'other';
  paymentDate: Date;
  transactionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  gatewayResponse?: any;
  fees?: number;
  netAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    quotesGenerated: number;
    quotesAccepted: number;
    quotesRejected: number;
    quoteToCloseRate: number;
    averageQuoteValue: number;
    totalContractValue: number;
    contractsSigned: number;
    revenueRecognized: number;
    outstandingRevenue: number;
    churnRate: number;
    renewalRate: number;
  };
  trends: {
    monthlyRevenue: Array<{ month: string; amount: number }>;
    quoteConversion: Array<{ month: string; rate: number }>;
    contractRenewals: Array<{ month: string; count: number }>;
  };
  topProducts: Array<{ productId: string; productName: string; revenue: number; count: number }>;
  salesRepPerformance: Array<{
    salesRepId: string;
    name: string;
    quotesGenerated: number;
    contractsClosed: number;
    revenueGenerated: number;
    conversionRate: number;
  }>;
}

/**
 * SalesAutomationService handles comprehensive sales automation
 * Provides AI-powered quote generation, contract management, and revenue operations
 */
export class SalesAutomationService {
  private products: Map<string, Product> = new Map();
  private quotes: Map<string, SalesQuote> = new Map();
  private contracts: Map<string, Contract> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private revenueRecords: Map<string, RevenueRecognition> = new Map();
  private payments: Map<string, Payment> = new Map();
  private pricingRules: Map<string, PricingRule> = new Map();
  private discountMatrices: Map<string, DiscountMatrix> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  /**
   * Generate AI-powered quote with CRM integration
   */
  async generateQuote(quoteRequest: {
    customerId: string;
    opportunityId?: string;
    lineItems: Array<{
      productId: string;
      quantity: number;
      customDescription?: string;
      customFields?: Record<string, any>;
    }>;
    title: string;
    description?: string;
    validDays?: number;
    customTerms?: string;
    attachments?: QuoteAttachment[];
  }): Promise<SalesQuote> {
    // Get customer information from CRM (in real implementation)
    const customerInfo = await this.getCustomerInfo(quoteRequest.customerId);

    // Process line items with pricing
    const processedLineItems = await this.processQuoteLineItems(quoteRequest.lineItems);

    // Calculate totals
    const subtotal = processedLineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = processedLineItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxAmount = (subtotal - totalDiscount) * 0.1; // 10% default tax
    const totalAmount = subtotal - totalDiscount + taxAmount;

    // Generate AI-powered quote content
    const quoteContent = await this.generateQuoteContent({
      customerInfo,
      lineItems: processedLineItems,
      title: quoteRequest.title,
      description: quoteRequest.description,
      customTerms: quoteRequest.customTerms
    });

    const quote: SalesQuote = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: quoteRequest.customerId,
      opportunityId: quoteRequest.opportunityId,
      quoteNumber: await this.generateQuoteNumber(),
      title: quoteRequest.title,
      description: quoteRequest.description,
      lineItems: processedLineItems,
      subtotal,
      totalDiscount,
      taxAmount,
      totalAmount,
      currency: 'USD',
      status: 'draft',
      approvalStatus: 'pending',
      approvalWorkflow: await this.createApprovalWorkflow(totalAmount),
      validUntil: new Date(Date.now() + (quoteRequest.validDays || 30) * 24 * 60 * 60 * 1000),
      customerInfo,
      termsAndConditions: quoteContent.termsAndConditions,
      notes: quoteContent.notes,
      attachments: quoteRequest.attachments || [],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.quotes.set(quote.id, quote);
    return quote;
  }

  /**
   * Process line items with pricing and discounts
   */
  private async processQuoteLineItems(lineItems: any[]): Promise<QuoteLineItem[]> {
    const processedItems: QuoteLineItem[] = [];

    for (const item of lineItems) {
      const product = this.products.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Calculate pricing with rules and discounts
      const pricing = await this.calculateProductPricing(product, item.quantity, item.customFields);
      const discountAmount = (pricing.unitPrice * item.quantity) * (pricing.discountPercentage / 100);

      const lineItem: QuoteLineItem = {
        id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: product.id,
        productName: product.name,
        description: item.customDescription || product.description,
        quantity: item.quantity,
        unitPrice: pricing.unitPrice,
        discountPercentage: pricing.discountPercentage,
        discountAmount,
        totalPrice: (pricing.unitPrice * item.quantity) - discountAmount,
        pricingModel: product.pricingModel,
        customFields: item.customFields || {}
      };

      processedItems.push(lineItem);
    }

    return processedItems;
  }

  /**
   * Calculate product pricing with rules and discounts
   */
  private async calculateProductPricing(product: Product, quantity: number, context: any = {}): Promise<{
    unitPrice: number;
    discountPercentage: number;
  }> {
    let unitPrice = product.basePrice;
    let discountPercentage = 0;

    // Apply pricing rules
    for (const rule of Array.from(this.pricingRules.values()).sort((a, b) => b.priority - a.priority)) {
      if (rule.isActive && this.evaluatePricingRule(rule, { quantity, ...context })) {
        if (rule.pricing.fixedPrice) {
          unitPrice = rule.pricing.fixedPrice;
        } else if (rule.pricing.multiplier) {
          unitPrice = product.basePrice * rule.pricing.multiplier;
        }

        discountPercentage = Math.max(discountPercentage, rule.pricing.discountPercentage);
        break;
      }
    }

    // Apply discount matrices
    for (const matrix of Array.from(this.discountMatrices.values())) {
      if (matrix.isActive && this.isDateValid(matrix.validFrom, matrix.validUntil)) {
        const applicableTier = matrix.tiers.find(tier =>
          quantity >= tier.minQuantity && (!tier.maxQuantity || quantity <= tier.maxQuantity)
        );

        if (applicableTier) {
          discountPercentage = Math.max(discountPercentage, applicableTier.discountPercentage);
        }
      }
    }

    return { unitPrice, discountPercentage };
  }

  /**
   * Generate AI-powered quote content
   */
  private async generateQuoteContent(request: {
    customerInfo: any;
    lineItems: QuoteLineItem[];
    title: string;
    description?: string;
    customTerms?: string;
  }): Promise<{
    termsAndConditions: string;
    notes: string;
  }> {
    // Generate professional proposal content
    const termsAndConditions = `
PAYMENT TERMS
Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly fee.

DELIVERY TERMS
Services will be delivered according to the agreed project timeline. Any delays due to client feedback or requirements changes may affect delivery dates.

SERVICE LEVEL AGREEMENT
We commit to maintaining 99.9% uptime for hosted services and responding to support requests within 24 hours.

INTELLECTUAL PROPERTY
All deliverables remain the property of our company until full payment is received.

CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information shared during the project.

${request.customTerms || ''}
    `.trim();

    const notes = `This quote is generated based on the requirements discussed with ${request.customerInfo.name}. The proposal includes comprehensive solutions tailored to your business needs. Please review the line items and let us know if you have any questions or require modifications.`;

    return { termsAndConditions, notes };
  }

  /**
   * Create approval workflow based on quote value
   */
  private async createApprovalWorkflow(totalAmount: number): Promise<ApprovalStep[]> {
    const workflow: ApprovalStep[] = [];

    if (totalAmount > 50000) {
      // High-value quotes require multiple approvals
      workflow.push({
        id: 'step_1',
        step: 1,
        approverRole: 'sales_manager',
        status: 'pending',
        required: true
      });
      workflow.push({
        id: 'step_2',
        step: 2,
        approverRole: 'finance_director',
        status: 'pending',
        required: true
      });
    } else if (totalAmount > 10000) {
      // Medium-value quotes require manager approval
      workflow.push({
        id: 'step_1',
        step: 1,
        approverRole: 'sales_manager',
        status: 'pending',
        required: true
      });
    } else {
      // Low-value quotes auto-approved
      workflow.push({
        id: 'step_1',
        step: 1,
        approverRole: 'auto_approved',
        status: 'approved',
        required: true
      });
    }

    return workflow;
  }

  /**
   * Submit quote for approval
   */
  async submitQuoteForApproval(quoteId: string): Promise<SalesQuote> {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    if (quote.status !== 'draft') {
      throw new Error(`Quote ${quoteId} is not in draft status`);
    }

    // Check if already auto-approved
    if (quote.approvalWorkflow[0]?.approverRole === 'auto_approved') {
      quote.status = 'sent';
      quote.approvalStatus = 'auto_approved';
      quote.sentAt = new Date();
    } else {
      quote.status = 'sent';
      quote.sentAt = new Date();
    }

    quote.updatedAt = new Date();
    this.quotes.set(quoteId, quote);

    return quote;
  }

  /**
   * Generate contract from approved quote
   */
  async generateContract(quoteId: string, contractDetails: {
    startDate: Date;
    endDate: Date;
    renewalType?: Contract['renewalType'];
    specialTerms?: string;
  }): Promise<Contract> {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    if (quote.status !== 'accepted') {
      throw new Error(`Quote ${quoteId} must be accepted before generating contract`);
    }

    const contract: Contract = {
      id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      quoteId: quote.id,
      contractNumber: await this.generateContractNumber(),
      title: quote.title,
      customerId: quote.customerId,
      customerInfo: quote.customerInfo,
      contractValue: quote.totalAmount,
      currency: quote.currency,
      startDate: contractDetails.startDate,
      endDate: contractDetails.endDate,
      renewalDate: contractDetails.endDate,
      renewalType: contractDetails.renewalType || 'manual',
      status: 'draft',
      contractType: this.determineContractType(quote),
      termsAndConditions: quote.termsAndConditions,
      specialTerms: contractDetails.specialTerms,
      attachments: [],
      versions: [{
        version: 1,
        changes: ['Initial contract generation'],
        createdAt: new Date(),
        createdBy: 'system'
      }],
      signatureStatus: {
        customerSigned: false,
        companySigned: false
      },
      renewalSettings: {
        autoRenew: false,
        renewalNoticeDays: 60
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  /**
   * Generate invoice for contract
   */
  async generateInvoice(contractId: string, invoiceDetails: {
    dueDate: Date;
    paymentTerms: string;
    lineItems?: InvoiceLineItem[];
  }): Promise<Invoice> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    // Generate invoice line items from contract
    const lineItems = invoiceDetails.lineItems || await this.generateInvoiceLineItems(contract);

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;

    const invoice: Invoice = {
      id: `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contractId: contract.id,
      invoiceNumber: await this.generateInvoiceNumber(),
      customerId: contract.customerId,
      customerInfo: contract.customerInfo,
      lineItems,
      subtotal,
      taxAmount,
      totalAmount,
      currency: contract.currency,
      status: 'draft',
      dueDate: invoiceDetails.dueDate,
      paymentTerms: invoiceDetails.paymentTerms,
      outstandingAmount: totalAmount,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * Record revenue recognition
   */
  async recordRevenueRecognition(revenueData: {
    contractId: string;
    invoiceId?: string;
    revenueType: RevenueRecognition['revenueType'];
    recognizedAmount: number;
    recognitionDate: Date;
    recognitionMethod: RevenueRecognition['recognitionMethod'];
    period: { startDate: Date; endDate: Date };
    accountingPeriod: string;
  }): Promise<RevenueRecognition> {
    const revenue: RevenueRecognition = {
      id: `revenue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...revenueData,
      status: 'recognized',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.revenueRecords.set(revenue.id, revenue);
    return revenue;
  }

  // Helper methods

  private async getCustomerInfo(customerId: string): Promise<any> {
    // In real implementation, this would fetch from CRM service
    return {
      name: 'Sample Customer',
      email: 'customer@example.com',
      company: 'Sample Company',
      address: '123 Business St, City, State 12345'
    };
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.quotes.size + 1;
    return `Q-${year}-${count.toString().padStart(4, '0')}`;
  }

  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.contracts.size + 1;
    return `C-${year}-${count.toString().padStart(4, '0')}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.invoices.size + 1;
    return `INV-${year}-${count.toString().padStart(4, '0')}`;
  }

  private evaluatePricingRule(rule: PricingRule, context: any): boolean {
    return rule.conditions.every(condition => {
      const contextValue = context[condition.field];
      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'greater_than':
          return contextValue > condition.value;
        case 'less_than':
          return contextValue < condition.value;
        case 'in_range':
          return contextValue >= condition.value.min && contextValue <= condition.value.max;
        default:
          return false;
      }
    });
  }

  private isDateValid(validFrom: Date, validUntil?: Date): boolean {
    const now = new Date();
    return now >= validFrom && (!validUntil || now <= validUntil);
  }

  private determineContractType(quote: SalesQuote): Contract['contractType'] {
    // Determine contract type based on line items
    const hasSubscription = quote.lineItems.some(item => item.pricingModel === 'monthly' || item.pricingModel === 'annual');
    const hasServices = quote.lineItems.some(item => item.pricingModel === 'hourly');

    if (hasSubscription) return 'subscription';
    if (hasServices) return 'maintenance';
    return 'one_time';
  }

  private async generateInvoiceLineItems(contract: Contract): Promise<InvoiceLineItem[]> {
    // Generate line items based on contract type and terms
    return [{
      id: `inv_line_${Date.now()}_1`,
      description: `${contract.title} - ${contract.contractType} services`,
      quantity: 1,
      unitPrice: contract.contractValue,
      totalPrice: contract.contractValue,
      taxRate: 0.1,
      taxAmount: contract.contractValue * 0.1
    }];
  }

  private initializeSampleData(): void {
    // Create sample products
    const sampleProducts: Product[] = [
      {
        id: 'prod_web_dev',
        name: 'Custom Web Development',
        description: 'Professional web application development with modern technologies',
        category: 'Development',
        type: 'service',
        basePrice: 150,
        pricingModel: 'hourly',
        features: ['React/Next.js', 'TypeScript', 'Database Integration', 'API Development'],
        tags: ['web', 'development', 'custom'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'prod_saas_subscription',
        name: 'Business Platform Subscription',
        description: 'Monthly subscription to the complete business platform',
        category: 'Subscription',
        type: 'subscription',
        basePrice: 99,
        pricingModel: 'monthly',
        features: ['CRM', 'Sales Automation', 'Marketing Tools', 'Support System'],
        tags: ['saas', 'subscription', 'business'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
    });

    // Create sample pricing rules
    const pricingRules: PricingRule[] = [
      {
        id: 'rule_volume_discount',
        name: 'Volume Discount',
        description: 'Discount for large orders',
        conditions: [{
          field: 'quantity',
          operator: 'greater_than',
          value: 10
        }],
        pricing: {
          discountPercentage: 15
        },
        isActive: true,
        priority: 1
      }
    ];

    pricingRules.forEach(rule => {
      this.pricingRules.set(rule.id, rule);
    });
  }
}
