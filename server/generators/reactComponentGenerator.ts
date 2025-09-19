import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { BusinessRequirement } from "@shared/schema";
import { sanitizeFilename, sanitizeComponentName, validateSafeFilename } from "../utils/sanitizeFilename";

export interface ComponentGenerationOptions {
  outputDir: string;
  includeTypes?: boolean;
  includeTests?: boolean;
  componentStyle?: "functional" | "class";
}

export class ReactComponentGenerator {
  private openai: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null as any;
    }
  }

  /**
   * Generate React components and write them to filesystem
   */
  async generateComponents(
    businessRequirement: BusinessRequirement,
    options: ComponentGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const generatedFiles: { [filename: string]: string } = {};
    
    // Ensure output directory exists
    await mkdir(options.outputDir, { recursive: true });

    try {
      // Generate main application component
      const mainAppCode = await this.generateMainApp(businessRequirement);
      const mainAppPath = join(options.outputDir, "App.tsx");
      await writeFile(mainAppPath, mainAppCode);
      generatedFiles["App.tsx"] = mainAppCode;

      // Generate business-specific form components
      if (businessRequirement.extractedEntities?.forms) {
        for (const formName of businessRequirement.extractedEntities.forms) {
          const safeComponentName = sanitizeComponentName(formName);
          validateSafeFilename(safeComponentName);
          const formCode = await this.generateFormComponent(formName, businessRequirement);
          const filename = `${safeComponentName}Form.tsx`;
          const formPath = join(options.outputDir, filename);
          await writeFile(formPath, formCode);
          generatedFiles[filename] = formCode;
        }
      }

      // Generate process/workflow components
      if (businessRequirement.extractedEntities?.processes) {
        for (const processName of businessRequirement.extractedEntities.processes) {
          const safeComponentName = sanitizeComponentName(processName);
          validateSafeFilename(safeComponentName);
          const processCode = await this.generateProcessComponent(processName, businessRequirement);
          const filename = `${safeComponentName}Process.tsx`;
          const processPath = join(options.outputDir, filename);
          await writeFile(processPath, processCode);
          generatedFiles[filename] = processCode;
        }
      }

      // Generate dashboard component
      const dashboardCode = await this.generateDashboard(businessRequirement);
      const dashboardPath = join(options.outputDir, "Dashboard.tsx");
      await writeFile(dashboardPath, dashboardCode);
      generatedFiles["Dashboard.tsx"] = dashboardCode;

      // Generate layout component
      const layoutCode = await this.generateLayout(businessRequirement);
      const layoutPath = join(options.outputDir, "Layout.tsx");
      await writeFile(layoutPath, layoutCode);
      generatedFiles["Layout.tsx"] = layoutCode;

      // Generate types file if requested
      if (options.includeTypes) {
        const typesCode = await this.generateTypes(businessRequirement);
        const typesPath = join(options.outputDir, "types.ts");
        await writeFile(typesPath, typesCode);
        generatedFiles["types.ts"] = typesCode;
      }

      return generatedFiles;

    } catch (error) {
      throw new Error(`Failed to generate React components: ${error}`);
    }
  }

  /**
   * Generate main application component with routing
   */
  private async generateMainApp(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate a React TypeScript main App component for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Use wouter for routing
- Include navigation between different sections
- Use Shadcn UI components and styling
- Include proper error boundaries
- Add loading states
- Include data-testid attributes for testing
- Use modern React patterns (hooks, functional components)
- Include proper TypeScript types

Generated component should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackMainApp();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert React/TypeScript developer. Generate production-ready React components using modern patterns and Shadcn UI." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || this.getFallbackMainApp();
    } catch (error) {
      console.error("Failed to generate main app component:", error);
      return this.getFallbackMainApp();
    }
  }

  /**
   * Generate form component for business entity
   */
  private async generateFormComponent(formName: string, businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate a React TypeScript form component for: ${formName}

Business Context: ${businessRequirement.originalDescription}
Form Purpose: ${formName}

Requirements:
- Use react-hook-form with zod validation
- Use Shadcn UI form components
- Include proper error handling and validation
- Add loading states for submission
- Include data-testid attributes for testing
- Use TypeScript interfaces for form data
- Include proper accessibility features
- Add success/error feedback

Generated component should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackFormComponent(formName);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert React developer. Generate production-ready form components with proper validation and UX." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackFormComponent(formName);
    } catch (error) {
      console.error(`Failed to generate form component for ${formName}:`, error);
      return this.getFallbackFormComponent(formName);
    }
  }

  /**
   * Generate process/workflow component
   */
  private async generateProcessComponent(processName: string, businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate a React TypeScript component for business process: ${processName}

Business Context: ${businessRequirement.originalDescription}
Process: ${processName}

Requirements:
- Show process steps and current status
- Include action buttons for process progression
- Use Shadcn UI components for consistent styling
- Add progress indicators and status tracking
- Include data-testid attributes for testing
- Handle process state management
- Add proper error handling
- Include loading states

Generated component should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackProcessComponent(processName);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert React developer. Generate production-ready process/workflow components with proper state management." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackProcessComponent(processName);
    } catch (error) {
      console.error(`Failed to generate process component for ${processName}:`, error);
      return this.getFallbackProcessComponent(processName);
    }
  }

  /**
   * Generate dashboard component
   */
  private async generateDashboard(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate a React TypeScript dashboard component for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Show key metrics and overview information
- Include data visualization with recharts
- Use Shadcn UI components (Cards, Charts, etc.)
- Add responsive layout with proper grid system
- Include data-testid attributes for testing
- Use React Query for data fetching
- Add loading and error states
- Include interactive elements

Generated component should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackDashboard();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert React developer. Generate production-ready dashboard components with data visualization." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || this.getFallbackDashboard();
    } catch (error) {
      console.error("Failed to generate dashboard component:", error);
      return this.getFallbackDashboard();
    }
  }

  /**
   * Generate layout component
   */
  private async generateLayout(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate a React TypeScript layout component for this business application:

Business Context: ${businessRequirement.originalDescription}

Requirements:
- Use Shadcn UI Sidebar component for navigation
- Include header with user information and theme toggle
- Add responsive design patterns
- Include proper accessibility features
- Use data-testid attributes for testing
- Include logout functionality
- Add navigation menu based on application features
- Include proper TypeScript types

Generated component should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackLayout();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert React developer. Generate production-ready layout components with navigation and accessibility." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackLayout();
    } catch (error) {
      console.error("Failed to generate layout component:", error);
      return this.getFallbackLayout();
    }
  }

  /**
   * Generate TypeScript types
   */
  private async generateTypes(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate TypeScript types and interfaces for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Create interfaces for all business entities
- Include form data types
- Add API response types
- Include proper Union types for status/states
- Add utility types where appropriate
- Include proper JSDoc comments
- Ensure type safety throughout the application

Generated types should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackTypes();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert TypeScript developer. Generate comprehensive type definitions for business applications." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      return response.choices[0]?.message?.content || this.getFallbackTypes();
    } catch (error) {
      console.error("Failed to generate types:", error);
      return this.getFallbackTypes();
    }
  }

  /**
   * Utility function to capitalize and clean names
   */
  private capitalizeAndClean(str: string): string {
    return str
      .split(/[_\-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Fallback components when AI generation fails
   */
  private getFallbackMainApp(): string {
    return `import { Switch, Route } from "wouter";
import { Layout } from "./Layout";
import { Dashboard } from "./Dashboard";

export function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route>404 Page Not Found</Route>
      </Switch>
    </Layout>
  );
}

export default App;`;
  }

  private getFallbackFormComponent(formName: string): string {
    const componentName = this.capitalizeAndClean(formName);
    return `import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ${componentName}Form() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement form submission
    setIsLoading(false);
  };

  return (
    <Card data-testid="form-${formName.toLowerCase()}">
      <CardHeader>
        <CardTitle>${componentName} Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}`;
  }

  private getFallbackProcessComponent(processName: string): string {
    const componentName = this.capitalizeAndClean(processName);
    return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ${componentName}Process() {
  return (
    <Card data-testid="process-${processName.toLowerCase()}">
      <CardHeader>
        <CardTitle>${componentName} Process</CardTitle>
        <Badge variant="secondary">In Progress</Badge>
      </CardHeader>
      <CardContent>
        <p>Process steps and status will be displayed here.</p>
      </CardContent>
    </Card>
  );
}`;
  }

  private getFallbackDashboard(): string {
    return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Dashboard() {
  return (
    <div className="space-y-6" data-testid="dashboard">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Application overview and key metrics will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;
  }

  private getFallbackLayout(): string {
    return `import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background" data-testid="layout">
      <header className="border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Business Application</h1>
          <Button variant="outline" data-testid="button-logout">
            Logout
          </Button>
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}`;
  }

  private getFallbackTypes(): string {
    return `// Business Application Types

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface BusinessEntity {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface FormData {
  [key: string]: string | number | boolean | Date;
}

export interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}`;
  }
}