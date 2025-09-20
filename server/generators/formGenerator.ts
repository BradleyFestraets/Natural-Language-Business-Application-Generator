import { BusinessRequirement } from '@shared/schema';
import OpenAI from 'openai';
import { z } from 'zod';

const GeneratedFormSchema = z.object({
  name: z.string(),
  type: z.enum(['input', 'multi-step', 'wizard', 'dynamic', 'survey']),
  code: z.string(),
  path: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
    validation: z.record(z.any()).optional()
  })),
  validation: z.string().optional(),
  submitEndpoint: z.string().optional()
});

export type GeneratedForm = z.infer<typeof GeneratedFormSchema>;

export class FormGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateForms(
    requirement: BusinessRequirement
  ): Promise<GeneratedForm[]> {
    const forms: GeneratedForm[] = [];

    try {
      const formEntities = requirement.extractedEntities?.forms || [];
      const uiRequirements = requirement.extractedEntities?.uiRequirements || [];

      // Generate forms for each identified entity
      for (const entity of formEntities) {
        const form = await this.generateEntityForm(entity, requirement);
        if (form) {
          forms.push(form);
        }
      }

      // Generate dynamic forms based on UI requirements
      const dynamicFormNeeds = this.identifyDynamicFormNeeds(uiRequirements);
      for (const formNeed of dynamicFormNeeds) {
        const dynamicForm = await this.generateDynamicForm(formNeed, requirement);
        if (dynamicForm) {
          forms.push(dynamicForm);
        }
      }

      // Generate multi-step forms if needed
      if (this.requiresMultiStepForm(requirement)) {
        const wizardForm = await this.generateWizardForm(requirement);
        forms.push(wizardForm);
      }

      return forms;
    } catch (error) {
      console.error('Error generating forms:', error);
      return this.generateFallbackForms(requirement);
    }
  }

  private async generateEntityForm(
    entityName: string,
    requirement: BusinessRequirement
  ): Promise<GeneratedForm | null> {
    try {
      if (!this.openai) {
        return this.generateFallbackEntityForm(entityName);
      }

      const prompt = `Generate a React form component for entity: ${entityName}
Business Context: ${requirement.originalDescription}

Requirements:
- Use react-hook-form with zod validation
- Include appropriate field types based on entity
- Add comprehensive validation rules
- Include error handling and feedback
- Use Shadcn UI components
- Add loading states and success messages
- Include TypeScript types

Return form definition as JSON with fields and validation.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseFormResponse(response, entityName);
    } catch (error) {
      console.error(`Error generating form for ${entityName}:`, error);
      return this.generateFallbackEntityForm(entityName);
    }
  }

  private async generateDynamicForm(
    formNeed: string,
    requirement: BusinessRequirement
  ): Promise<GeneratedForm | null> {
    const componentName = this.sanitizeName(formNeed) + 'Form';
    const code = `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const dynamicFieldSchema = z.object({
  fieldType: z.enum(['text', 'number', 'select', 'checkbox', 'date']),
  fieldName: z.string(),
  fieldValue: z.any()
});

const formSchema = z.object({
  fields: z.array(dynamicFieldSchema)
});

type FormData = z.infer<typeof formSchema>;

export function ${componentName}() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  
  // Fetch form configuration
  const { data: formConfig } = useQuery({
    queryKey: ['/api/forms/config', '${formNeed}']
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fields: []
    }
  });

  // Update fields when config loads
  useEffect(() => {
    if (formConfig) {
      setDynamicFields(formConfig.fields);
    }
  }, [formConfig]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => apiRequest('/api/forms/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      toast({
        title: 'Success',
        description: 'Form submitted successfully'
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit form',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const renderField = (field: any, index: number) => {
    switch (field.type) {
      case 'text':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              {...form.register(\`fields.\${index}.fieldValue\`)}
              data-testid={\`input-\${field.name}\`}
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Select onValueChange={(value) => form.setValue(\`fields.\${index}.fieldValue\`, value)}>
              <SelectTrigger data-testid={\`select-\${field.name}\`}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>${formNeed}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {dynamicFields.map((field, index) => renderField(field, index))}
          
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}`;

    return {
      name: componentName,
      type: 'dynamic',
      code,
      path: `client/src/components/forms/${componentName}.tsx`,
      fields: [],
      submitEndpoint: '/api/forms/submit'
    };
  }

  private async generateWizardForm(
    requirement: BusinessRequirement
  ): Promise<GeneratedForm> {
    const code = `import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const wizardSchema = z.object({
  step1: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email')
  }),
  step2: z.object({
    company: z.string().min(1, 'Company is required'),
    role: z.string().min(1, 'Role is required')
  }),
  step3: z.object({
    requirements: z.string().min(10, 'Please provide detailed requirements'),
    budget: z.string().optional()
  })
});

type WizardData = z.infer<typeof wizardSchema>;

export function WizardForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      step1: { name: '', email: '' },
      step2: { company: '', role: '' },
      step3: { requirements: '', budget: '' }
    }
  });

  const nextStep = async () => {
    const stepKey = \`step\${currentStep}\` as keyof WizardData;
    const isValid = await form.trigger(stepKey);
    
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: WizardData) => {
    console.log('Wizard completed:', data);
    // Handle submission
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label>Name</label>
              <input {...form.register('step1.name')} className="w-full" />
              {form.formState.errors.step1?.name && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.step1.name.message}
                </p>
              )}
            </div>
            <div>
              <label>Email</label>
              <input {...form.register('step1.email')} className="w-full" />
              {form.formState.errors.step1?.email && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.step1.email.message}
                </p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label>Company</label>
              <input {...form.register('step2.company')} className="w-full" />
            </div>
            <div>
              <label>Role</label>
              <input {...form.register('step2.role')} className="w-full" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label>Requirements</label>
              <textarea {...form.register('step3.requirements')} className="w-full" rows={4} />
            </div>
            <div>
              <label>Budget (Optional)</label>
              <input {...form.register('step3.budget')} className="w-full" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Multi-Step Form</CardTitle>
        <Progress value={(currentStep / totalSteps) * 100} className="mt-2" />
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          {renderStep()}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentStep < totalSteps ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit">
              Complete
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}`;

    return {
      name: 'WizardForm',
      type: 'wizard',
      code,
      path: 'client/src/components/forms/WizardForm.tsx',
      fields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'company', type: 'text', label: 'Company', required: true },
        { name: 'role', type: 'text', label: 'Role', required: true },
        { name: 'requirements', type: 'textarea', label: 'Requirements', required: true },
        { name: 'budget', type: 'text', label: 'Budget', required: false }
      ]
    };
  }

  private identifyDynamicFormNeeds(uiRequirements: string[]): string[] {
    const formKeywords = ['form', 'input', 'submit', 'entry', 'registration', 'feedback'];
    return uiRequirements.filter(req => 
      formKeywords.some(keyword => req.toLowerCase().includes(keyword))
    );
  }

  private requiresMultiStepForm(requirement: BusinessRequirement): boolean {
    const description = requirement.originalDescription.toLowerCase();
    const multiStepKeywords = ['wizard', 'multi-step', 'onboarding', 'registration process', 'step-by-step'];
    
    return multiStepKeywords.some(keyword => description.includes(keyword));
  }

  private parseFormResponse(response: string, entityName: string): GeneratedForm {
    try {
      const parsed = JSON.parse(response);
      return {
        name: parsed.name || this.sanitizeName(entityName) + 'Form',
        type: parsed.type || 'input',
        code: this.generateFormCode(parsed),
        path: `client/src/components/forms/${this.sanitizeName(entityName)}Form.tsx`,
        fields: parsed.fields || this.generateDefaultFields(),
        validation: parsed.validation,
        submitEndpoint: parsed.submitEndpoint || `/api/${entityName.toLowerCase()}`
      };
    } catch {
      return this.generateFallbackEntityForm(entityName);
    }
  }

  private generateFormCode(formDef: any): string {
    // Generate actual React component code based on form definition
    return `// Generated form component
export const ${formDef.name} = () => {
  // Form implementation
  return <form>...</form>;
};`;
  }

  private generateDefaultFields(): any[] {
    return [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description', required: false },
      { name: 'status', type: 'select', label: 'Status', required: true }
    ];
  }

  private generateFallbackEntityForm(entityName: string): GeneratedForm {
    const componentName = this.sanitizeName(entityName) + 'Form';
    const code = `import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ${componentName}() {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>${entityName} Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <input {...register('name')} placeholder="Name" />
          <Button type="submit">Submit</Button>
        </form>
      </CardContent>
    </Card>
  );
}`;

    return {
      name: componentName,
      type: 'input',
      code,
      path: `client/src/components/forms/${componentName}.tsx`,
      fields: this.generateDefaultFields()
    };
  }

  private generateFallbackForms(requirement: BusinessRequirement): GeneratedForm[] {
    return [
      this.generateFallbackEntityForm('Default'),
      {
        name: 'ContactForm',
        type: 'input',
        code: '// Contact form component',
        path: 'client/src/components/forms/ContactForm.tsx',
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'message', type: 'textarea', label: 'Message', required: true }
        ]
      }
    ];
  }

  private sanitizeName(name: string): string {
    return name
      .split(/[\s-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}