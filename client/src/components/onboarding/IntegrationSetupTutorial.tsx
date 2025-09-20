import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Key,
  Database,
  Mail,
  CreditCard,
  MessageSquare,
  Calendar,
  FileText,
  Cloud,
  Shield,
  Zap,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'crm' | 'email' | 'payment' | 'communication' | 'calendar' | 'document' | 'analytics';
  popularity: number; // 1-5 stars
  setupSteps: Array<{
    title: string;
    description: string;
    required: boolean;
    fields?: Array<{
      name: string;
      label: string;
      type: 'text' | 'password' | 'url' | 'select' | 'textarea';
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      sensitive?: boolean;
    }>;
    code?: string;
    tips?: string[];
  }>;
  features: string[];
  pricing: 'free' | 'freemium' | 'paid';
  documentationUrl: string;
}

interface IntegrationSetupTutorialProps {
  onComplete?: (integration: IntegrationProvider, config: any) => void;
  onSkip?: () => void;
  initialProvider?: string;
  className?: string;
}

export function IntegrationSetupTutorial({
  onComplete,
  onSkip,
  initialProvider,
  className = ''
}: IntegrationSetupTutorialProps) {
  const [selectedProvider, setSelectedProvider] = useState(initialProvider || '');
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  const integrationProviders: IntegrationProvider[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks Online',
      description: 'Connect your accounting and financial data',
      icon: <FileText className="h-5 w-5" />,
      category: 'document',
      popularity: 5,
      pricing: 'paid',
      documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs',
      setupSteps: [
        {
          title: 'Create QuickBooks App',
          description: 'Set up your QuickBooks Online integration',
          required: true,
          tips: [
            'Go to developer.intuit.com and create a new app',
            'Choose "QuickBooks Online and Payments" as your platform',
            'Set your redirect URI to your application URL'
          ]
        },
        {
          title: 'Configure Authentication',
          description: 'Enter your QuickBooks credentials',
          required: true,
          fields: [
            {
              name: 'clientId',
              label: 'Client ID',
              type: 'text',
              placeholder: 'Your QuickBooks Client ID'
            },
            {
              name: 'clientSecret',
              label: 'Client Secret',
              type: 'password',
              placeholder: 'Your QuickBooks Client Secret',
              sensitive: true
            },
            {
              name: 'environment',
              label: 'Environment',
              type: 'select',
              options: [
                { value: 'sandbox', label: 'Sandbox (Testing)' },
                { value: 'production', label: 'Production' }
              ]
            }
          ]
        },
        {
          title: 'Test Connection',
          description: 'Verify your QuickBooks integration is working',
          required: true,
          code: `// Test QuickBooks connection
const quickbooks = new QuickBooks({
  clientId: process.env.QUICKBOOKS_CLIENT_ID,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
  environment: 'sandbox'
});

const companyInfo = await quickbooks.getCompanyInfo();`,
          tips: [
            'Test with sandbox environment first',
            'Verify company information loads correctly',
            'Check API rate limits and quotas'
          ]
        }
      ],
      features: [
        'Invoice synchronization',
        'Payment tracking',
        'Customer data sync',
        'Financial reporting'
      ]
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Process payments and manage subscriptions',
      icon: <CreditCard className="h-5 w-5" />,
      category: 'payment',
      popularity: 5,
      pricing: 'freemium',
      documentationUrl: 'https://stripe.com/docs',
      setupSteps: [
        {
          title: 'Create Stripe Account',
          description: 'Set up your Stripe payment processing',
          required: true,
          tips: [
            'Go to stripe.com and create an account',
            'Complete the onboarding process',
            'Enable the payment methods you need'
          ]
        },
        {
          title: 'Generate API Keys',
          description: 'Get your Stripe API credentials',
          required: true,
          fields: [
            {
              name: 'publishableKey',
              label: 'Publishable Key',
              type: 'text',
              placeholder: 'pk_test_...'
            },
            {
              name: 'secretKey',
              label: 'Secret Key',
              type: 'password',
              placeholder: 'sk_test_...',
              sensitive: true
            },
            {
              name: 'webhookSecret',
              label: 'Webhook Secret',
              type: 'password',
              placeholder: 'whsec_...',
              sensitive: true
            }
          ]
        },
        {
          title: 'Configure Webhooks',
          description: 'Set up webhook endpoints for payment events',
          required: true,
          code: `// Stripe webhook handler
app.post('/stripe/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      break;
    // ... handle other event types
  }

  res.json({received: true});
});`,
          tips: [
            'Set up webhook endpoints for payment events',
            'Test webhooks with Stripe CLI',
            'Handle both success and failure events'
          ]
        }
      ],
      features: [
        'Payment processing',
        'Subscription management',
        'Invoice generation',
        'Customer payment methods'
      ]
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Email marketing and automation',
      icon: <Mail className="h-5 w-5" />,
      category: 'email',
      popularity: 4,
      pricing: 'freemium',
      documentationUrl: 'https://mailchimp.com/developer/',
      setupSteps: [
        {
          title: 'Create Mailchimp Account',
          description: 'Set up your email marketing platform',
          required: true,
          tips: [
            'Go to mailchimp.com and create an account',
            'Complete your profile and billing setup',
            'Create at least one audience/list'
          ]
        },
        {
          title: 'Generate API Key',
          description: 'Get your Mailchimp API credentials',
          required: true,
          fields: [
            {
              name: 'apiKey',
              label: 'API Key',
              type: 'password',
              placeholder: 'Your Mailchimp API Key',
              sensitive: true
            },
            {
              name: 'serverPrefix',
              label: 'Server Prefix',
              type: 'text',
              placeholder: 'us12 (or your server prefix)'
            }
          ]
        },
        {
          title: 'Test Email Integration',
          description: 'Verify your Mailchimp connection',
          required: true,
          code: `// Test Mailchimp connection
const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX,
});

const response = await mailchimp.ping.get();
console.log('Mailchimp connected:', response);`,
          tips: [
            'Test with a small audience first',
            'Set up email templates',
            'Configure automation workflows'
          ]
        }
      ],
      features: [
        'Email campaigns',
        'Audience management',
        'Automation workflows',
        'Campaign analytics'
      ]
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications',
      icon: <MessageSquare className="h-5 w-5" />,
      category: 'communication',
      popularity: 5,
      pricing: 'freemium',
      documentationUrl: 'https://api.slack.com/',
      setupSteps: [
        {
          title: 'Create Slack App',
          description: 'Set up your Slack integration',
          required: true,
          tips: [
            'Go to api.slack.com/apps and create a new app',
            'Choose "From scratch" and name your app',
            'Add the app to your workspace'
          ]
        },
        {
          title: 'Configure Bot Token',
          description: 'Get your Slack bot credentials',
          required: true,
          fields: [
            {
              name: 'botToken',
              label: 'Bot User OAuth Token',
              type: 'password',
              placeholder: 'xoxb-...',
              sensitive: true
            },
            {
              name: 'appToken',
              label: 'App-Level Token',
              type: 'password',
              placeholder: 'xapp-...',
              sensitive: true
            },
            {
              name: 'signingSecret',
              label: 'Signing Secret',
              type: 'password',
              placeholder: 'Your signing secret',
              sensitive: true
            }
          ]
        },
        {
          title: 'Test Bot Integration',
          description: 'Verify your Slack bot is working',
          required: true,
          code: `// Test Slack connection
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const result = await slack.auth.test();
console.log('Slack connected:', result);`,
          tips: [
            'Invite the bot to channels you want it to post in',
            'Test with simple messages first',
            'Set up proper permissions and scopes'
          ]
        }
      ],
      features: [
        'Channel messaging',
        'User notifications',
        'Interactive buttons',
        'File sharing'
      ]
    }
  ];

  const currentProvider = integrationProviders.find(p => p.id === selectedProvider);
  const currentStepData = currentProvider?.setupSteps[currentStep];

  const handleNext = () => {
    if (currentStep < (currentProvider?.setupSteps.length || 1) - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete integration setup
      onComplete?.(currentProvider!, config);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Code copied',
      description: 'Code snippet copied to clipboard'
    });
  };

  const handleTestConnection = () => {
    toast({
      title: 'Testing connection...',
      description: 'This would test your integration configuration in a real implementation.'
    });
  };

  const getStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Integration Setup Tutorial</h1>
            <p className="text-muted-foreground">Connect your business tools and services</p>
          </div>
        </div>
        <Button variant="outline" onClick={onSkip}>
          Skip Setup
        </Button>
      </div>

      {/* Provider Selection */}
      {!selectedProvider ? (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold mb-2">Choose Your Integration Provider</h2>
            <p className="text-muted-foreground">Select the tools you want to connect with your business platform</p>
          </div>

          <Tabs defaultValue="popular" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="crm">CRM</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationProviders
                  .filter(p => p.popularity >= 4)
                  .map((provider) => (
                  <Card key={provider.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProvider(provider.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {provider.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <CardDescription className="text-sm">{provider.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="flex mb-1">{getStars(provider.popularity)}</div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {provider.pricing}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {provider.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(provider.documentationUrl, '_blank');
                        }}
                        className="w-full"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View Documentation
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="crm" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationProviders
                  .filter(p => p.category === 'crm')
                  .map((provider) => (
                  <Card key={provider.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProvider(provider.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {provider.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <CardDescription className="text-sm">{provider.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {provider.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationProviders
                  .filter(p => p.category === 'payment')
                  .map((provider) => (
                  <Card key={provider.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProvider(provider.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {provider.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <CardDescription className="text-sm">{provider.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrationProviders
                  .filter(p => p.category === 'communication')
                  .map((provider) => (
                  <Card key={provider.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProvider(provider.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {provider.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <CardDescription className="text-sm">{provider.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Integration Setup Steps */
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProvider('')}
            >
              ← Back to Providers
            </Button>
            <div className="flex items-center gap-2">
              {currentProvider?.icon}
              <h2 className="text-xl font-semibold">{currentProvider?.name} Setup</h2>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Step {currentStep + 1} of {currentProvider?.setupSteps.length}: {currentStepData?.title}
                    {currentStepData?.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">{currentStepData?.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    size="sm"
                  >
                    {currentStep === (currentProvider?.setupSteps.length || 1) - 1 ? 'Complete Setup' : 'Next'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tips */}
              {currentStepData?.tips && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Setup Tips</span>
                  </div>
                  <ul className="space-y-1 text-sm text-blue-700">
                    {currentStepData.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Fields */}
              {currentStepData?.fields && (
                <div className="space-y-4">
                  {currentStepData.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-sm font-medium">{field.label}</label>
                      {field.type === 'select' ? (
                        <select
                          className="w-full p-2 border rounded-md"
                          value={config[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <Textarea
                          placeholder={field.placeholder}
                          value={config[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="min-h-[100px]"
                        />
                      ) : (
                        <div className="relative">
                          <Input
                            type={field.sensitive && !showApiKey ? 'password' : 'text'}
                            placeholder={field.placeholder}
                            value={config[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          />
                          {field.sensitive && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Code Example */}
              {currentStepData?.code && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Code Example</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(currentStepData.code!)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                    <code>{currentStepData.code}</code>
                  </pre>
                </div>
              )}

              {/* Test Connection */}
              {currentStep === (currentProvider?.setupSteps.length || 1) - 1 && (
                <div className="flex justify-center pt-4">
                  <Button onClick={handleTestConnection} className="px-8">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress indicator */}
      {selectedProvider && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {currentProvider?.setupSteps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / (currentProvider?.setupSteps.length || 1)) * 100}%`
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Features preview */}
      {currentProvider && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Features Available</CardTitle>
            <CardDescription>What you can do with this integration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentProvider.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
