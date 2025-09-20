import { BusinessRequirement } from '@shared/schema';
import OpenAI from 'openai';
import { z } from 'zod';

const GeneratedChatbotSchema = z.object({
  name: z.string(),
  type: z.enum(['support', 'assistant', 'faq', 'sales', 'general']),
  code: z.string(),
  path: z.string(),
  personality: z.string(),
  capabilities: z.array(z.string()),
  integrations: z.array(z.string()).optional(),
  fallbackBehavior: z.string().optional()
});

export type GeneratedChatbot = z.infer<typeof GeneratedChatbotSchema>;

export class ChatbotGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateChatbots(
    requirement: BusinessRequirement
  ): Promise<GeneratedChatbot[]> {
    const chatbots: GeneratedChatbot[] = [];

    try {
      // Determine chatbot needs from business requirements
      const chatbotNeeds = this.identifyChatbotNeeds(requirement);

      // Generate main support chatbot if customer service is needed
      if (chatbotNeeds.includes('support')) {
        const supportBot = await this.generateSupportChatbot(requirement);
        chatbots.push(supportBot);
      }

      // Generate FAQ chatbot if knowledge base is needed
      if (chatbotNeeds.includes('faq')) {
        const faqBot = await this.generateFAQChatbot(requirement);
        chatbots.push(faqBot);
      }

      // Generate sales assistant if e-commerce features detected
      if (chatbotNeeds.includes('sales')) {
        const salesBot = await this.generateSalesChatbot(requirement);
        chatbots.push(salesBot);
      }

      // Always generate a general assistant chatbot
      const assistantBot = await this.generateAssistantChatbot(requirement);
      chatbots.push(assistantBot);

      return chatbots;
    } catch (error) {
      console.error('Error generating chatbots:', error);
      return this.generateFallbackChatbots(requirement);
    }
  }

  private identifyChatbotNeeds(requirement: BusinessRequirement): string[] {
    const needs: string[] = [];
    const description = requirement.originalDescription.toLowerCase();
    
    if (description.includes('support') || description.includes('help') || description.includes('customer service')) {
      needs.push('support');
    }
    
    if (description.includes('faq') || description.includes('questions') || description.includes('knowledge')) {
      needs.push('faq');
    }
    
    if (description.includes('sales') || description.includes('product') || description.includes('purchase')) {
      needs.push('sales');
    }
    
    return needs;
  }

  private async generateSupportChatbot(requirement: BusinessRequirement): Promise<GeneratedChatbot> {
    const code = `import { EmbeddedChatbot } from '@/components/chatbot/EmbeddedChatbot';
import { useEffect, useState } from 'react';

interface SupportMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  metadata?: any;
}

export function SupportChatbot() {
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: '1',
      text: 'Hello! I\\'m here to help with any support issues you may have. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  const handleUserMessage = async (text: string) => {
    // Add user message
    const userMessage: SupportMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Process with support logic
    const response = await processSupportQuery(text);
    
    // Add bot response
    const botMessage: SupportMessage = {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const processSupportQuery = async (query: string): Promise<string> => {
    // Check for common support topics
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('reset password')) {
      return 'To reset your password, please click on "Forgot Password" on the login page. You\\'ll receive an email with reset instructions.';
    }
    
    if (lowerQuery.includes('billing') || lowerQuery.includes('payment')) {
      return 'For billing inquiries, please visit the Billing section in your account settings or contact our billing team at billing@example.com.';
    }
    
    if (lowerQuery.includes('technical') || lowerQuery.includes('error')) {
      return 'I\\'m sorry you\\'re experiencing technical issues. Could you please describe the problem in more detail? Include any error messages you\\'re seeing.';
    }
    
    // Default response with escalation option
    return 'I understand you need help. Would you like me to connect you with a human support agent, or can you provide more details about your issue?';
  };

  const supportCapabilities = [
    'Password reset assistance',
    'Account management',
    'Technical troubleshooting',
    'Billing inquiries',
    'Feature guidance',
    'Escalation to human agents'
  ];

  return (
    <EmbeddedChatbot
      title="Support Assistant"
      messages={messages}
      onSendMessage={handleUserMessage}
      capabilities={supportCapabilities}
      showTypingIndicator={true}
      allowFileUpload={true}
    />
  );
}`;

    return {
      name: 'SupportChatbot',
      type: 'support',
      code,
      path: 'client/src/components/chatbots/SupportChatbot.tsx',
      personality: 'Helpful, empathetic, and professional support agent',
      capabilities: [
        'Password reset assistance',
        'Account management',
        'Technical troubleshooting',
        'Billing inquiries',
        'Feature guidance',
        'Escalation to human agents'
      ],
      integrations: ['ticketing-system', 'email-notifications'],
      fallbackBehavior: 'Escalate to human agent'
    };
  }

  private async generateFAQChatbot(requirement: BusinessRequirement): Promise<GeneratedChatbot> {
    const code = `import { EmbeddedChatbot } from '@/components/chatbot/EmbeddedChatbot';
import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

export function FAQChatbot() {
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      text: 'Hi! I can help answer frequently asked questions. What would you like to know?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  const faqs: FAQ[] = [
    {
      question: 'How do I get started?',
      answer: 'To get started, create an account and follow our onboarding guide. It takes just a few minutes!',
      category: 'Getting Started',
      keywords: ['start', 'begin', 'new', 'onboarding']
    },
    {
      question: 'What are the pricing plans?',
      answer: 'We offer three plans: Basic ($9/month), Pro ($29/month), and Enterprise (custom pricing). Visit our pricing page for details.',
      category: 'Pricing',
      keywords: ['price', 'cost', 'plan', 'subscription']
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required.',
      category: 'Trial',
      keywords: ['free', 'trial', 'test', 'try']
    }
  ];

  const findBestMatch = (query: string): FAQ | null => {
    const lowerQuery = query.toLowerCase();
    let bestMatch: FAQ | null = null;
    let bestScore = 0;

    for (const faq of faqs) {
      let score = 0;
      
      // Check for keyword matches
      for (const keyword of faq.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += 2;
        }
      }
      
      // Check for question similarity
      const questionWords = faq.question.toLowerCase().split(' ');
      for (const word of questionWords) {
        if (lowerQuery.includes(word) && word.length > 3) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    return bestScore > 2 ? bestMatch : null;
  };

  const handleUserMessage = async (text: string) => {
    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    }]);

    // Find matching FAQ
    const match = findBestMatch(text);
    
    const response = match 
      ? match.answer
      : 'I couldn\\'t find a specific answer to your question. Would you like to see all available topics, or contact support?';
    
    // Add bot response
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'bot',
      timestamp: new Date(),
      suggestions: match ? [] : ['View all FAQs', 'Contact Support']
    }]);
  };

  return (
    <EmbeddedChatbot
      title="FAQ Assistant"
      messages={messages}
      onSendMessage={handleUserMessage}
      capabilities={['Answer frequently asked questions', 'Provide quick help', 'Direct to resources']}
      showSuggestions={true}
    />
  );
}`;

    return {
      name: 'FAQChatbot',
      type: 'faq',
      code,
      path: 'client/src/components/chatbots/FAQChatbot.tsx',
      personality: 'Informative and concise knowledge assistant',
      capabilities: [
        'Answer frequently asked questions',
        'Provide quick help',
        'Search knowledge base',
        'Direct to resources'
      ],
      fallbackBehavior: 'Suggest contacting support'
    };
  }

  private async generateSalesChatbot(requirement: BusinessRequirement): Promise<GeneratedChatbot> {
    const code = `import { EmbeddedChatbot } from '@/components/chatbot/EmbeddedChatbot';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function SalesChatbot() {
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      text: 'Welcome! I\\'m here to help you find the perfect product. What are you looking for today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  const { data: products } = useQuery({
    queryKey: ['/api/products']
  });

  const handleUserMessage = async (text: string) => {
    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    }]);

    // Process sales query
    const response = await processSalesQuery(text);
    
    // Add bot response
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      text: response.text,
      sender: 'bot',
      timestamp: new Date(),
      products: response.products,
      actions: response.actions
    }]);
  };

  const processSalesQuery = async (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    // Product recommendations
    if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      return {
        text: 'Based on your interests, I recommend these top products:',
        products: products?.slice(0, 3) || [],
        actions: ['View All Products', 'Filter by Category']
      };
    }
    
    // Pricing inquiries
    if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
      return {
        text: 'Our products range from $29 to $299. Would you like to see products in a specific price range?',
        products: [],
        actions: ['Under $50', '$50-$100', 'Over $100']
      };
    }
    
    // Discount inquiries
    if (lowerQuery.includes('discount') || lowerQuery.includes('sale')) {
      return {
        text: 'Great news! We currently have a 20% off promotion on selected items. Use code SAVE20 at checkout.',
        products: products?.filter((p: any) => p.onSale) || [],
        actions: ['View Sale Items', 'Apply Discount']
      };
    }
    
    // Default response
    return {
      text: 'I can help you find products, check prices, and apply discounts. What specifically interests you?',
      products: [],
      actions: ['Browse Products', 'Current Promotions', 'Contact Sales']
    };
  };

  return (
    <EmbeddedChatbot
      title="Sales Assistant"
      messages={messages}
      onSendMessage={handleUserMessage}
      capabilities={[
        'Product recommendations',
        'Price inquiries',
        'Discount information',
        'Order assistance',
        'Product comparisons'
      ]}
      showProductCards={true}
      enableQuickActions={true}
    />
  );
}`;

    return {
      name: 'SalesChatbot',
      type: 'sales',
      code,
      path: 'client/src/components/chatbots/SalesChatbot.tsx',
      personality: 'Friendly and persuasive sales assistant',
      capabilities: [
        'Product recommendations',
        'Price inquiries',
        'Discount information',
        'Order assistance',
        'Product comparisons',
        'Upselling and cross-selling'
      ],
      integrations: ['product-catalog', 'pricing-engine', 'order-system'],
      fallbackBehavior: 'Connect to sales representative'
    };
  }

  private async generateAssistantChatbot(requirement: BusinessRequirement): Promise<GeneratedChatbot> {
    const code = `import { EmbeddedChatbot } from '@/components/chatbot/EmbeddedChatbot';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function AssistantChatbot() {
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      text: 'Hello! I\\'m your AI assistant. I can help you navigate the application, answer questions, and assist with various tasks. How can I help you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUserMessage = async (text: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsProcessing(true);
    
    try {
      // Process with AI
      const response = await apiRequest('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          context: messages.slice(-5) // Send last 5 messages for context
        })
      });
      
      // Add bot response
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.reply || 'I understand. Let me help you with that.',
        sender: 'bot',
        timestamp: new Date(),
        actions: response.suggestedActions
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      // Fallback response
      const fallbackMessage = {
        id: (Date.now() + 1).toString(),
        text: 'I\\'m having trouble processing that request. Could you please rephrase or try again?',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const capabilities = [
    'Answer general questions',
    'Help with navigation',
    'Explain features',
    'Provide guidance',
    'Process natural language requests',
    'Learn from interactions'
  ];

  return (
    <EmbeddedChatbot
      title="AI Assistant"
      messages={messages}
      onSendMessage={handleUserMessage}
      capabilities={capabilities}
      showTypingIndicator={isProcessing}
      enableVoiceInput={true}
      persistConversation={true}
      theme="modern"
    />
  );
}`;

    return {
      name: 'AssistantChatbot',
      type: 'assistant',
      code,
      path: 'client/src/components/chatbots/AssistantChatbot.tsx',
      personality: 'Intelligent, helpful, and adaptive AI assistant',
      capabilities: [
        'Answer general questions',
        'Help with navigation',
        'Explain features',
        'Provide guidance',
        'Process natural language requests',
        'Learn from interactions'
      ],
      integrations: ['openai-api', 'application-context'],
      fallbackBehavior: 'Provide helpful suggestions'
    };
  }

  private generateFallbackChatbots(requirement: BusinessRequirement): GeneratedChatbot[] {
    return [
      {
        name: 'BasicChatbot',
        type: 'general',
        code: `export function BasicChatbot() {
  return (
    <div className="chatbot-container">
      <h3>Chat Assistant</h3>
      <div className="chat-messages">
        <p>Hello! How can I help you today?</p>
      </div>
      <input type="text" placeholder="Type your message..." />
    </div>
  );
}`,
        path: 'client/src/components/chatbots/BasicChatbot.tsx',
        personality: 'Friendly and helpful assistant',
        capabilities: ['Basic conversation', 'Simple Q&A']
      }
    ];
  }
}