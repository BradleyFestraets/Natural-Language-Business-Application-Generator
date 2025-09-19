import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { BusinessRequirement } from "@shared/schema";
import { sanitizeFilename, sanitizeApiName, validateSafeFilename } from "../utils/sanitizeFilename";

export interface ApiGenerationOptions {
  outputDir: string;
  includeTests?: boolean;
  includeValidation?: boolean;
  authRequired?: boolean;
}

export class ApiEndpointGenerator {
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
   * Generate API endpoints and write them to filesystem
   */
  async generateApiEndpoints(
    businessRequirement: BusinessRequirement,
    options: ApiGenerationOptions
  ): Promise<{ [filename: string]: string }> {
    const generatedFiles: { [filename: string]: string } = {};
    
    // Ensure output directory exists
    await mkdir(options.outputDir, { recursive: true });

    try {
      // Generate main API routes file
      const routesCode = await this.generateMainRoutes(businessRequirement, options);
      const routesPath = join(options.outputDir, "routes.ts");
      await writeFile(routesPath, routesCode);
      generatedFiles["routes.ts"] = routesCode;

      // Generate business entity CRUD endpoints from forms
      if (businessRequirement.extractedEntities?.forms) {
        for (const entityName of businessRequirement.extractedEntities.forms) {
          const crudCode = await this.generateCrudEndpoints(entityName, businessRequirement);
          const safeApiName = sanitizeApiName(entityName);
          validateSafeFilename(safeApiName);
          const filename = `${safeApiName}Routes.ts`;
          const crudPath = join(options.outputDir, filename);
          await writeFile(crudPath, crudCode);
          generatedFiles[filename] = crudCode;
        }
      }

      // Generate workflow API endpoints
      if (businessRequirement.extractedEntities?.processes) {
        const workflowCode = await this.generateWorkflowEndpoints(businessRequirement);
        const workflowPath = join(options.outputDir, "workflowRoutes.ts");
        await writeFile(workflowPath, workflowCode);
        generatedFiles["workflowRoutes.ts"] = workflowCode;
      }

      // Generate validation schemas
      if (options.includeValidation) {
        const validationCode = await this.generateValidationSchemas(businessRequirement);
        const validationPath = join(options.outputDir, "validation.ts");
        await writeFile(validationPath, validationCode);
        generatedFiles["validation.ts"] = validationCode;
      }

      // Generate middleware
      const middlewareCode = await this.generateMiddleware(businessRequirement, options);
      const middlewarePath = join(options.outputDir, "middleware.ts");
      await writeFile(middlewarePath, middlewareCode);
      generatedFiles["middleware.ts"] = middlewareCode;

      return generatedFiles;

    } catch (error) {
      throw new Error(`Failed to generate API endpoints: ${error}`);
    }
  }

  /**
   * Generate main API routes file
   */
  private async generateMainRoutes(businessRequirement: BusinessRequirement, options: ApiGenerationOptions): Promise<string> {
    const prompt = `Generate Express.js TypeScript main routes file for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Use Express.js with TypeScript
- Include proper middleware setup
- Add authentication middleware where needed
- Include CORS and security headers
- Add request logging and error handling
- Use proper HTTP status codes
- Include rate limiting
- Add API versioning (/api/v1/)
- Include health check endpoint
- Add proper TypeScript types

Generated code should be production-ready and follow REST API best practices.`;

    if (!this.openai) {
      return this.getFallbackMainRoutes();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert backend developer. Generate production-ready Express.js APIs with proper middleware and security." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || this.getFallbackMainRoutes();
    } catch (error) {
      console.error("Failed to generate main routes:", error);
      return this.getFallbackMainRoutes();
    }
  }

  /**
   * Generate CRUD endpoints for business entity
   */
  private async generateCrudEndpoints(entityName: string, businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate Express.js TypeScript CRUD endpoints for entity: ${entityName}

Business Context: ${businessRequirement.originalDescription}
Entity: ${entityName}

Requirements:
- Full CRUD operations (GET, POST, PUT, DELETE)
- Proper request validation with Zod schemas
- Include pagination for list endpoints
- Add proper error handling and HTTP status codes
- Include authentication and authorization checks
- Add request/response TypeScript interfaces
- Include proper database integration
- Add comprehensive error responses
- Include filtering and sorting capabilities
- Add proper logging

Generated endpoints should be production-ready and follow REST API conventions.`;

    if (!this.openai) {
      return this.getFallbackCrudEndpoints(entityName);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert backend developer. Generate production-ready CRUD APIs with proper validation and error handling." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || this.getFallbackCrudEndpoints(entityName);
    } catch (error) {
      console.error(`Failed to generate CRUD endpoints for ${entityName}:`, error);
      return this.getFallbackCrudEndpoints(entityName);
    }
  }

  /**
   * Generate workflow endpoints
   */
  private async generateWorkflowEndpoints(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate Express.js TypeScript workflow endpoints for this business application:

Business Context: ${businessRequirement.originalDescription}
Processes: ${businessRequirement.extractedEntities?.processes?.join(", ") || "General workflow"}

Requirements:
- Workflow state management endpoints
- Process step progression endpoints
- Approval workflow endpoints
- Status tracking and history endpoints
- Notification trigger endpoints
- Proper validation and error handling
- Include authentication and authorization
- Add proper TypeScript interfaces
- Include comprehensive logging
- Add proper HTTP status codes

Generated endpoints should be production-ready and support complex business workflows.`;

    if (!this.openai) {
      return this.getFallbackWorkflowEndpoints();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert backend developer. Generate production-ready workflow APIs with proper state management." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      return response.choices[0]?.message?.content || this.getFallbackWorkflowEndpoints();
    } catch (error) {
      console.error("Failed to generate workflow endpoints:", error);
      return this.getFallbackWorkflowEndpoints();
    }
  }

  /**
   * Generate validation schemas
   */
  private async generateValidationSchemas(businessRequirement: BusinessRequirement): Promise<string> {
    const prompt = `Generate Zod validation schemas for this business application:

Business Context: ${businessRequirement.originalDescription}
Extracted Entities: ${JSON.stringify(businessRequirement.extractedEntities, null, 2)}

Requirements:
- Create Zod schemas for all business entities
- Include request validation schemas
- Add response validation schemas
- Include proper field validation rules
- Add custom validation functions where needed
- Include proper error messages
- Add schema composition and reuse
- Include TypeScript type inference
- Add comprehensive validation coverage

Generated schemas should be complete and production-ready.`;

    if (!this.openai) {
      return this.getFallbackValidationSchemas();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert TypeScript developer. Generate comprehensive Zod validation schemas for business applications." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackValidationSchemas();
    } catch (error) {
      console.error("Failed to generate validation schemas:", error);
      return this.getFallbackValidationSchemas();
    }
  }

  /**
   * Generate middleware
   */
  private async generateMiddleware(businessRequirement: BusinessRequirement, options: ApiGenerationOptions): Promise<string> {
    const prompt = `Generate Express.js TypeScript middleware for this business application:

Business Context: ${businessRequirement.originalDescription}
Auth Required: ${options.authRequired}

Requirements:
- Authentication middleware
- Authorization middleware with role-based access
- Request validation middleware
- Error handling middleware
- Rate limiting middleware
- Security headers middleware
- Request logging middleware
- CORS middleware
- Body parsing middleware
- Include proper TypeScript types
- Add comprehensive error handling

Generated middleware should be production-ready and secure.`;

    if (!this.openai) {
      return this.getFallbackMiddleware();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert backend developer. Generate production-ready Express.js middleware with security best practices." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || this.getFallbackMiddleware();
    } catch (error) {
      console.error("Failed to generate middleware:", error);
      return this.getFallbackMiddleware();
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
   * Fallback code when AI generation fails
   */
  private getFallbackMainRoutes(): string {
    return `import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;`;
  }

  private getFallbackCrudEndpoints(entityName: string): string {
    const EntityName = this.capitalizeAndClean(entityName);
    return `import express from "express";
import { Request, Response } from "express";
import { z } from "zod";

const router = express.Router();

// Validation schema
const ${entityName}Schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

// GET /${entityName}s - List all
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Implement database query
    const items = [];
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch ${entityName}s' });
  }
});

// GET /${entityName}s/:id - Get by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Implement database query
    const item = null;
    
    if (!item) {
      return res.status(404).json({ success: false, error: '${EntityName} not found' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch ${entityName}' });
  }
});

// POST /${entityName}s - Create new
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = ${entityName}Schema.parse(req.body);
    // TODO: Implement database insertion
    const newItem = { id: 'generated-id', ...validatedData };
    
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: 'Failed to create ${entityName}' });
  }
});

// PUT /${entityName}s/:id - Update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = ${entityName}Schema.parse(req.body);
    // TODO: Implement database update
    const updatedItem = { id, ...validatedData };
    
    res.json({ success: true, data: updatedItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: 'Failed to update ${entityName}' });
  }
});

// DELETE /${entityName}s/:id - Delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Implement database deletion
    
    res.json({ success: true, message: '${EntityName} deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete ${entityName}' });
  }
});

export default router;`;
  }

  private getFallbackWorkflowEndpoints(): string {
    return `import express from "express";
import { Request, Response } from "express";
import { z } from "zod";

const router = express.Router();

// Workflow step schema
const workflowStepSchema = z.object({
  action: z.string(),
  comment: z.string().optional(),
  data: z.record(z.any()).optional()
});

// GET /workflows - List all workflows
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Implement workflow listing
    const workflows = [];
    res.json({ success: true, data: workflows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch workflows' });
  }
});

// GET /workflows/:id - Get workflow by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Implement workflow retrieval
    const workflow = null;
    
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    res.json({ success: true, data: workflow });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch workflow' });
  }
});

// POST /workflows/:id/advance - Advance workflow to next step
router.post('/:id/advance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = workflowStepSchema.parse(req.body);
    
    // TODO: Implement workflow advancement logic
    const updatedWorkflow = { id, currentStep: 'next_step', ...validatedData };
    
    res.json({ success: true, data: updatedWorkflow });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: 'Failed to advance workflow' });
  }
});

// GET /workflows/:id/history - Get workflow history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Implement workflow history retrieval
    const history = [];
    
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch workflow history' });
  }
});

export default router;`;
  }

  private getFallbackValidationSchemas(): string {
    return `import { z } from "zod";

// Base schemas
export const idSchema = z.string().uuid();
export const timestampSchema = z.string().datetime();

// User schema
export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// Business entity schema
export const businessEntitySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// Workflow schema
export const workflowSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  currentStep: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    completedAt: timestampSchema.optional()
  })),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// Request schemas
export const createEntityRequestSchema = businessEntitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateEntityRequestSchema = createEntityRequestSchema.partial();

// Response schemas
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type BusinessEntity = z.infer<typeof businessEntitySchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type CreateEntityRequest = z.infer<typeof createEntityRequestSchema>;
export type UpdateEntityRequest = z.infer<typeof updateEntityRequestSchema>;`;
  }

  private getFallbackMiddleware(): string {
    return `import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // TODO: Implement token validation
    const token = authHeader.replace('Bearer ', '');
    
    // Add user to request object
    (req as any).user = { id: 'user-id', email: 'user@example.com', role: 'user' };
    
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid authentication' });
  }
};

// Authorization middleware
export const authorize = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user || user.role !== requiredRole) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      res.status(500).json({ success: false, error: 'Validation error' });
    }
  };
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`\${req.method} \${req.path} - \${res.statusCode} (\${duration}ms)\`);
  });
  
  next();
};`;
  }
}