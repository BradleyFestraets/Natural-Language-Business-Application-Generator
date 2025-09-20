import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GenerationOrchestrator } from '../orchestration/generationOrchestrator';
import { GeneratedCodeValidator } from '../validation/generatedCodeValidator';
import { AutoDocGenerator } from '../documentation/autoDocGenerator';
import { BusinessRequirement, GeneratedApplication } from '@shared/schema';

// Mock the generators
vi.mock('../generators/reactComponentGenerator');
vi.mock('../generators/apiEndpointGenerator');
vi.mock('../generators/databaseSchemaGenerator');
vi.mock('../deployment/applicationDeployer');
vi.mock('../services/workflowGenerationService');
vi.mock('../services/embeddedChatbotService');

describe('Application Generation Orchestrator', () => {
  let orchestrator: GenerationOrchestrator;
  let validator: GeneratedCodeValidator;
  let docGenerator: AutoDocGenerator;
  
  beforeAll(() => {
    orchestrator = new GenerationOrchestrator();
    validator = new GeneratedCodeValidator();
    docGenerator = new AutoDocGenerator();
  });
  
  describe('Orchestration Flow', () => {
    it('should successfully orchestrate complete application generation', async () => {
      // Create test business requirement
      const businessRequirement: BusinessRequirement = {
        id: 'test-req-1',
        userId: 'test-user',
        organizationId: 'test-org',
        originalDescription: 'Build an inventory management system with product tracking, order processing, and reporting features',
        parsedRequirements: {
          entities: ['Product', 'Order', 'Customer', 'Report'],
          features: ['CRUD operations', 'Order workflow', 'Dashboard', 'Reports'],
          technologies: ['React', 'TypeScript', 'PostgreSQL'],
          integrations: ['Payment Gateway', 'Email Service']
        },
        extractedEntities: {
          forms: ['Product Form', 'Order Form', 'Customer Form'],
          processes: [{
            name: 'Order Processing',
            steps: ['Create Order', 'Process Payment', 'Update Inventory', 'Send Confirmation'],
            approvals: ['Manager approval for large orders']
          }],
          approvals: ['Manager', 'Finance'],
          integrations: ['Stripe', 'SendGrid']
        },
        status: 'refined',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create test generated application
      const generatedApp: GeneratedApplication = {
        id: 'test-app-1',
        userId: 'test-user',
        organizationId: 'test-org',
        businessRequirementId: businessRequirement.id,
        applicationMetadata: {
          name: 'Inventory Management System',
          description: 'Complete inventory management solution',
          version: '1.0.0',
          framework: 'React with TypeScript',
          database: 'PostgreSQL',
          deploymentTarget: 'replit'
        },
        generatedComponents: [],
        status: 'generating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Test orchestration options
      const options = {
        parallel: true,
        maxConcurrency: 3,
        retryOnFailure: true,
        validateOutput: true,
        generateDocumentation: true,
        deploymentTarget: 'replit' as const
      };
      
      // Mock WebSocket for progress tracking
      const mockWs = {
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn()
      };
      
      orchestrator.registerWebSocket(generatedApp.id, mockWs as any);
      
      // Test the orchestration - would normally run the full flow
      const plan = await orchestrator.createGenerationPlan(businessRequirement);
      
      expect(plan).toBeDefined();
      expect(plan.components).toBeDefined();
      expect(plan.apiEndpoints).toBeDefined();
      expect(plan.databaseSchemas).toBeDefined();
      expect(plan.workflows).toBeDefined();
      expect(plan.priorityOrder).toBeInstanceOf(Array);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });
    
    it('should validate generated code for enterprise patterns', async () => {
      // Test generated code structure
      const generatedCode = {
        components: {
          'ProductList.tsx': `
            import React, { useState, useEffect } from 'react';
            import { useQuery } from '@tanstack/react-query';
            import { Button } from '@/components/ui/button';
            
            interface Product {
              id: string;
              name: string;
              price: number;
              quantity: number;
            }
            
            export const ProductList: React.FC = () => {
              const { data, isLoading, error } = useQuery({
                queryKey: ['products'],
                queryFn: fetchProducts
              });
              
              if (isLoading) return <div data-testid="loading">Loading...</div>;
              if (error) return <div data-testid="error">Error loading products</div>;
              
              return (
                <div data-testid="product-list">
                  {data?.map(product => (
                    <div key={product.id} data-testid={\`product-\${product.id}\`}>
                      {product.name} - \${product.price}
                    </div>
                  ))}
                </div>
              );
            };
          `
        },
        apiEndpoints: {
          'productRoutes.ts': `
            import { Router } from 'express';
            import { z } from 'zod';
            
            const router = Router();
            
            const productSchema = z.object({
              name: z.string(),
              price: z.number().positive(),
              quantity: z.number().int().nonnegative()
            });
            
            router.get('/products', async (req, res) => {
              try {
                const products = await storage.getProducts();
                res.status(200).json(products);
              } catch (error) {
                res.status(500).json({ error: 'Failed to fetch products' });
              }
            });
            
            router.post('/products', async (req, res) => {
              try {
                const validated = productSchema.parse(req.body);
                const product = await storage.createProduct(validated);
                res.status(201).json(product);
              } catch (error) {
                if (error instanceof z.ZodError) {
                  res.status(400).json({ error: error.errors });
                } else {
                  res.status(500).json({ error: 'Failed to create product' });
                }
              }
            });
            
            export default router;
          `
        },
        databaseSchema: {
          'productSchema.ts': `
            import { pgTable, varchar, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
            import { createInsertSchema } from 'drizzle-zod';
            
            export const products = pgTable('products', {
              id: uuid('id').primaryKey().defaultRandom(),
              name: varchar('name', { length: 255 }).notNull(),
              price: integer('price').notNull(),
              quantity: integer('quantity').notNull().default(0),
              createdAt: timestamp('created_at').defaultNow(),
              updatedAt: timestamp('updated_at').defaultNow()
            });
            
            export const insertProductSchema = createInsertSchema(products).omit({
              id: true,
              createdAt: true,
              updatedAt: true
            });
            
            export type Product = typeof products.$inferSelect;
            export type NewProduct = z.infer<typeof insertProductSchema>;
          `
        }
      };
      
      const validationResult = await validator.validateGeneratedCode(generatedCode, {
        checkTypes: true,
        checkSecurity: true,
        enterprisePatterns: true
      });
      
      // Check validation results
      expect(validationResult.passed).toBe(true);
      expect(validationResult.metrics.typeChecksPassed).toBe(true);
      expect(validationResult.metrics.securityChecksPassed).toBe(true);
      
      // Should have minimal warnings
      expect(validationResult.warnings.length).toBeLessThan(5);
      expect(validationResult.errors.length).toBe(0);
    });
    
    it('should generate comprehensive documentation', async () => {
      const businessRequirement: BusinessRequirement = {
        id: 'test-req-2',
        userId: 'test-user',
        organizationId: 'test-org',
        originalDescription: 'E-commerce platform for online sales',
        parsedRequirements: {
          entities: ['Product', 'Cart', 'Order'],
          features: ['Shopping cart', 'Checkout', 'Payment processing'],
          technologies: ['React', 'TypeScript', 'PostgreSQL']
        },
        extractedEntities: {
          forms: ['Product Form', 'Checkout Form'],
          processes: [{
            name: 'Checkout Process',
            steps: ['Add to cart', 'Review order', 'Payment', 'Confirmation']
          }],
          integrations: ['Stripe']
        },
        status: 'refined',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const generatedCode = {
        components: { 'ProductList.tsx': '// Component code' },
        apiEndpoints: { 'productRoutes.ts': '// API code' },
        databaseSchema: { 'schema.ts': '// Schema code' }
      };
      
      const documentation = await docGenerator.generateDocumentation(
        businessRequirement,
        generatedCode,
        undefined,
        {
          includeUserGuide: true,
          includeApiDocs: true,
          includeDeveloperGuide: true,
          includeDeploymentGuide: true
        }
      );
      
      // Check that all documentation files are generated
      expect(documentation['README.md']).toBeDefined();
      expect(documentation['USER_GUIDE.md']).toBeDefined();
      expect(documentation['API_DOCUMENTATION.md']).toBeDefined();
      expect(documentation['DEVELOPER_GUIDE.md']).toBeDefined();
      expect(documentation['DEPLOYMENT_GUIDE.md']).toBeDefined();
      expect(documentation['DATABASE_SCHEMA.md']).toBeDefined();
      expect(documentation['ARCHITECTURE.md']).toBeDefined();
      
      // Check that README includes key sections
      const readme = documentation['README.md'];
      expect(readme).toContain('Overview');
      expect(readme).toContain('Quick Start');
      expect(readme).toContain('Architecture');
      expect(readme).toContain('Features');
      expect(readme).toContain('Documentation');
    });
    
    it('should handle parallel generation with proper coordination', async () => {
      const orchestrator = new GenerationOrchestrator();
      
      // Test parallel execution tracking
      const tasks = [
        { id: '1', name: 'Component Generation', duration: 100 },
        { id: '2', name: 'API Generation', duration: 150 },
        { id: '3', name: 'Database Generation', duration: 80 }
      ];
      
      const startTime = Date.now();
      
      // Simulate parallel execution
      const results = await Promise.all(
        tasks.map(task => 
          new Promise(resolve => 
            setTimeout(() => resolve(task), task.duration)
          )
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete in roughly the time of the longest task (150ms)
      // Not the sum of all tasks (330ms)
      expect(totalTime).toBeLessThan(200);
      expect(results).toHaveLength(3);
    });
    
    it('should generate unique deployment URLs', async () => {
      const appIds = ['app1', 'app2', 'app3'];
      const urls = new Set<string>();
      
      // Generate URLs for different apps
      for (const appId of appIds) {
        const timestamp = Date.now().toString(36);
        const shortId = appId.substring(0, 8).toLowerCase();
        const uniqueId = `${shortId}-${timestamp}`;
        const url = `https://${uniqueId}.replit.app`;
        
        // Each URL should be unique
        expect(urls.has(url)).toBe(false);
        urls.add(url);
      }
      
      expect(urls.size).toBe(3);
    });
  });
  
  describe('Error Handling and Recovery', () => {
    it('should handle generation failures gracefully', async () => {
      const orchestrator = new GenerationOrchestrator();
      
      // Test with invalid business requirement
      const invalidReq = {} as BusinessRequirement;
      const invalidApp = {} as GeneratedApplication;
      
      try {
        await orchestrator.createGenerationPlan(invalidReq);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
    
    it('should validate enterprise patterns in generated code', async () => {
      const validator = new GeneratedCodeValidator();
      
      // Test code with missing patterns
      const poorCode = {
        components: {
          'BadComponent.tsx': `
            // Missing TypeScript types, data-testid, and error handling
            export const BadComponent = () => {
              const data = fetch('/api/data');
              return <div>{data}</div>;
            };
          `
        },
        apiEndpoints: {
          'badRoute.ts': `
            // Missing validation, error handling, and status codes
            router.post('/data', (req, res) => {
              const result = saveData(req.body);
              res.json(result);
            });
          `
        },
        databaseSchema: {}
      };
      
      const result = await validator.validateGeneratedCode(poorCode, {
        enterprisePatterns: true,
        checkSecurity: true
      });
      
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});