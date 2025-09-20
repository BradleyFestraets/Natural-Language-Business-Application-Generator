import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Play,
  Lightbulb,
  Target,
  Zap,
  Smartphone,
  Globe,
  MessageSquare,
  Settings,
  X
} from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    type: 'example' | 'practice' | 'demo';
    label: string;
    onClick: () => void;
  };
  tips?: string[];
}

interface TutorialSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: TutorialStep[];
  estimatedTime: number; // minutes
}

interface InteractiveTutorialProps {
  onComplete?: () => void;
  onSkip?: () => void;
  initialSection?: string;
  className?: string;
}

export function InteractiveTutorial({
  onComplete,
  onSkip,
  initialSection,
  className = ''
}: InteractiveTutorialProps) {
  const [currentSection, setCurrentSection] = useState(initialSection || 'business-requirements');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const tutorialSections: TutorialSection[] = [
    {
      id: 'business-requirements',
      title: 'Writing Effective Business Requirements',
      description: 'Learn how to describe your business needs clearly and effectively',
      icon: <BookOpen className="h-5 w-5" />,
      estimatedTime: 8,
      steps: [
        {
          id: 'br-1',
          title: 'Start with Your Business Goal',
          description: 'Clearly state what you want to achieve with your business application.',
          content: (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Good Examples:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• "Create an employee onboarding system..."</li>
                  <li>• "Build a customer support ticket system..."</li>
                  <li>• "Develop a sales quote and contract management system..."</li>
                </ul>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-red-800">Avoid:</h4>
                <ul className="space-y-1 text-sm text-red-700">
                  <li>• "Make an app" (too vague)</li>
                  <li>• "I need a website" (not specific)</li>
                  <li>• "Just build something cool" (no business context)</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Be specific about your business processes',
            'Include user roles and responsibilities',
            'Mention integration requirements upfront',
            'Describe expected outcomes clearly'
          ]
        },
        {
          id: 'br-2',
          title: 'Describe User Roles and Permissions',
          description: 'Specify who will use the system and what they need to do.',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">User Types:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Administrators (full access)</li>
                    <li>• Managers (department oversight)</li>
                    <li>• Employees (daily operations)</li>
                    <li>• Customers/Clients (external access)</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Permission Examples:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Create and edit records</li>
                    <li>• Approve workflows</li>
                    <li>• View reports and analytics</li>
                    <li>• Manage system settings</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
          tips: [
            'Define clear user roles with specific responsibilities',
            'Specify permission levels for each role',
            'Consider external users (customers, vendors)',
            'Think about approval hierarchies'
          ]
        },
        {
          id: 'br-3',
          title: 'Include Integration Requirements',
          description: 'Specify what existing systems your application needs to connect with.',
          content: (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Common Integrations:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>• CRM systems</div>
                  <div>• Email platforms</div>
                  <div>• Payment processors</div>
                  <div>• Document storage</div>
                  <div>• Calendar systems</div>
                  <div>• Communication tools</div>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Integration Details:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Data flow direction (import/export)</li>
                  <li>• Real-time vs. scheduled sync</li>
                  <li>• Authentication requirements</li>
                  <li>• Error handling preferences</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'List all systems that need to connect',
            'Specify data synchronization requirements',
            'Mention authentication and security needs',
            'Consider scalability for future integrations'
          ]
        },
        {
          id: 'br-4',
          title: 'Practice: Write Your Business Requirements',
          description: 'Put your learning into practice with guided exercises.',
          content: (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Exercise: Employee Onboarding System</h4>
                <p className="text-sm mb-3">Write requirements for an employee onboarding system that includes:</p>
                <ul className="space-y-1 text-sm mb-4">
                  <li>• New hire information collection</li>
                  <li>• Document submission and verification</li>
                  <li>• Manager and HR approval workflows</li>
                  <li>• Integration with HR systems</li>
                </ul>
                <textarea
                  className="w-full h-32 p-2 border rounded-md text-sm"
                  placeholder="Start writing your business requirements here..."
                />
              </div>
            </div>
          ),
          action: {
            type: 'practice',
            label: 'Submit Practice Requirements',
            onClick: () => {
              // Handle practice submission
              console.log('Practice requirements submitted');
            }
          }
        }
      ]
    },
    {
      id: 'navigation',
      title: 'Navigating Your Generated Applications',
      description: 'Learn how to effectively use and navigate your generated business applications',
      icon: <Globe className="h-5 w-5" />,
      estimatedTime: 6,
      steps: [
        {
          id: 'nav-1',
          title: 'Understanding the Application Layout',
          description: 'Familiarize yourself with the main sections of your generated application.',
          content: (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Main Application Sections:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span><strong>Dashboard:</strong> Overview of key metrics and activities</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span><strong>Records:</strong> Create, view, and manage your data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span><strong>Workflows:</strong> Automated business processes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span><strong>Reports:</strong> Analytics and business intelligence</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span><strong>Settings:</strong> Configure your application</span>
                  </li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Use the sidebar navigation to move between sections',
            'Check the top navigation for user profile and notifications',
            'Look for help icons (?) for context-sensitive assistance',
            'Use keyboard shortcuts for faster navigation'
          ]
        },
        {
          id: 'nav-2',
          title: 'Working with Data Records',
          description: 'Learn how to create, edit, and manage your business data.',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Creating Records:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Click "New" or "+" buttons</li>
                    <li>• Fill in required fields (marked with *)</li>
                    <li>• Use the AI assistant for help</li>
                    <li>• Save or submit for approval</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Managing Records:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Use filters to find specific records</li>
                    <li>• Sort by columns to organize data</li>
                    <li>• Export data for external use</li>
                    <li>• Archive inactive records</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
          tips: [
            'Use the search bar to quickly find records',
            'Set up filters for common searches',
            'Use bulk actions for multiple records',
            'Check record history to see changes'
          ]
        },
        {
          id: 'nav-3',
          title: 'Using Workflows and Automation',
          description: 'Understand how automated processes work in your application.',
          content: (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Workflow Types:</h4>
                <ul className="space-y-2 text-sm">
                  <li><strong>Approval Workflows:</strong> Require human approval at specific steps</li>
                  <li><strong>Automated Workflows:</strong> Run automatically based on triggers</li>
                  <li><strong>Conditional Workflows:</strong> Branch based on data or conditions</li>
                  <li><strong>Integration Workflows:</strong> Connect with other systems</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Monitor workflow status in the dashboard',
            'Set up notifications for workflow events',
            'Review completed workflows for optimization',
            'Use workflow templates for common processes'
          ]
        }
      ]
    },
    {
      id: 'natural-language',
      title: 'Using Natural Language Commands',
      description: 'Master the power of natural language for managing your business operations',
      icon: <MessageSquare className="h-5 w-5" />,
      estimatedTime: 7,
      steps: [
        {
          id: 'nl-1',
          title: 'Basic Natural Language Commands',
          description: 'Start with simple commands to perform common tasks.',
          content: (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Simple Commands:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <strong>Create:</strong> "Create a new customer record"
                  </div>
                  <div>
                    <strong>Find:</strong> "Show me all customers in California"
                  </div>
                  <div>
                    <strong>Update:</strong> "Update John's status to approved"
                  </div>
                  <div>
                    <strong>Generate:</strong> "Generate a sales report for Q4"
                  </div>
                </div>
              </div>
            </div>
          ),
          tips: [
            'Be specific about what you want to do',
            'Include relevant details (names, dates, filters)',
            'Use natural, conversational language',
            'Ask for help if unsure: "How do I...?"'
          ]
        },
        {
          id: 'nl-2',
          title: 'Advanced Business Operations',
          description: 'Use natural language for complex business tasks and analysis.',
          content: (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Complex Operations:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• "Generate a quote for [customer] with [product] and 20% discount"</li>
                  <li>• "Create a marketing campaign targeting customers who haven't purchased in 6 months"</li>
                  <li>• "Find all support tickets that are overdue and escalate them"</li>
                  <li>• "Generate a monthly sales report comparing this quarter to last quarter"</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Combine multiple operations in one command',
            'Reference specific data points and criteria',
            'Include business logic and conditions',
            'Specify output formats when needed'
          ]
        },
        {
          id: 'nl-3',
          title: 'System Management Commands',
          description: 'Use natural language to manage your application settings and configurations.',
          content: (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Management Commands:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• "Add a new user role called 'Project Manager' with specific permissions"</li>
                  <li>• "Create a new workflow for expense approvals with these steps..."</li>
                  <li>• "Set up integration with our QuickBooks account"</li>
                  <li>• "Generate a backup of all customer data from the last 30 days"</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Use clear, descriptive language for configurations',
            'Specify all requirements and conditions',
            'Ask for confirmation on destructive actions',
            'Include security and permission requirements'
          ]
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Setting Up System Integrations',
      description: 'Learn how to connect your generated application with existing business tools',
      icon: <Settings className="h-5 w-5" />,
      estimatedTime: 10,
      steps: [
        {
          id: 'int-1',
          title: 'Planning Your Integration Strategy',
          description: 'Before setting up integrations, plan which systems need to connect and how.',
          content: (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Common Integration Scenarios:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-sm">Data Import/Export:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Migrate existing customer data</li>
                      <li>• Export reports to spreadsheets</li>
                      <li>• Sync contacts with email systems</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">Process Automation:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Auto-create invoices from orders</li>
                      <li>• Send notifications via Slack</li>
                      <li>• Update CRM when deals close</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ),
          tips: [
            'List all systems that need integration',
            'Determine data flow direction (one-way vs two-way)',
            'Consider security and authentication requirements',
            'Plan for data mapping and transformation'
          ]
        },
        {
          id: 'int-2',
          title: 'Authentication and Security',
          description: 'Learn about secure connection methods for your integrations.',
          content: (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Authentication Methods:</h4>
                <ul className="space-y-2 text-sm">
                  <li><strong>API Keys:</strong> Simple token-based authentication</li>
                  <li><strong>OAuth 2.0:</strong> Secure authorization for user data access</li>
                  <li><strong>Webhooks:</strong> Real-time event notifications</li>
                  <li><strong>Basic Auth:</strong> Username/password authentication</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Use OAuth 2.0 for user data access',
            'Store API keys securely in environment variables',
            'Set up proper rate limiting',
            'Monitor integration activity for security'
          ]
        },
        {
          id: 'int-3',
          title: 'Data Mapping and Synchronization',
          description: 'Learn how to map data between systems and set up synchronization rules.',
          content: (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Data Mapping Best Practices:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Map similar data types (text to text, numbers to numbers)</li>
                  <li>• Handle data transformations (date formats, currency)</li>
                  <li>• Set up field validation rules</li>
                  <li>• Configure error handling for mapping failures</li>
                </ul>
              </div>
            </div>
          ),
          tips: [
            'Test data mapping with sample data first',
            'Set up field validation to prevent bad data',
            'Configure error handling for mapping failures',
            'Monitor data quality after synchronization'
          ]
        }
      ]
    }
  ];

  const currentSectionData = tutorialSections.find(s => s.id === currentSection);
  const currentStepData = currentSectionData?.steps[currentStep];
  const progress = ((currentStep + 1) / (currentSectionData?.steps.length || 1)) * 100;

  const handleNext = () => {
    if (currentStep < (currentSectionData?.steps.length || 1) - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Move to next section
      const currentIndex = tutorialSections.findIndex(s => s.id === currentSection);
      if (currentIndex < tutorialSections.length - 1) {
        setCurrentSection(tutorialSections[currentIndex + 1].id);
        setCurrentStep(0);
      } else {
        // Complete tutorial
        setCompletedSections(new Set([...completedSections, currentSection]));
        onComplete?.();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // Move to previous section
      const currentIndex = tutorialSections.findIndex(s => s.id === currentSection);
      if (currentIndex > 0) {
        setCurrentSection(tutorialSections[currentIndex - 1].id);
        setCurrentStep(tutorialSections[currentIndex - 1].steps.length - 1);
      }
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setCurrentSection(sectionId);
    setCurrentStep(0);
  };

  const handleCompleteStep = (stepId: string) => {
    setCompletedSteps(new Set([...completedSteps, stepId]));
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Interactive Business Platform Tutorial</h1>
            <p className="text-muted-foreground">Master your AI-powered business operating system</p>
          </div>
        </div>
        <Button variant="outline" onClick={onSkip}>
          <X className="h-4 w-4 mr-2" />
          Skip Tutorial
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">
            {tutorialSections.findIndex(s => s.id === currentSection) + 1} of {tutorialSections.length} sections
          </span>
        </div>
        <Progress value={(tutorialSections.findIndex(s => s.id === currentSection) / tutorialSections.length) * 100} className="h-2" />
      </div>

      <Tabs value={currentSection} onValueChange={handleSectionChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          {tutorialSections.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="flex items-center gap-2 text-xs"
            >
              {section.icon}
              <span className="hidden sm:inline">{section.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tutorialSections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {section.title}
                      <Badge variant="secondary">{section.estimatedTime} min</Badge>
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Step {currentStep + 1} of {section.steps.length}</span>
                    <Progress value={progress} className="w-24 h-2" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentStep === 0 && tutorialSections.findIndex(s => s.id === currentSection) === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                    >
                      {currentStep === section.steps.length - 1 ? 'Complete Section' : 'Next'}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {currentStepData && (
                  <div className="space-y-4">
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
                      <p className="text-muted-foreground mb-4">{currentStepData.description}</p>
                      {currentStepData.content}
                    </div>

                    {currentStepData.tips && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Pro Tips</span>
                        </div>
                        <ul className="space-y-1 text-sm text-yellow-700">
                          {currentStepData.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentStepData.action && (
                      <div className="flex justify-center">
                        <Button
                          onClick={currentStepData.action.onClick}
                          className="px-8"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {currentStepData.action.label}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Need help? Use natural language commands like "How do I create a new customer?" or "Show me how to set up workflows"
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip Tutorial
          </Button>
          <Button onClick={onComplete}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Tutorial
          </Button>
        </div>
      </div>
    </div>
  );
}
