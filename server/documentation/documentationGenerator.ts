import { z } from 'zod';
import { BusinessRequirement } from '@shared/schema';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

const DocumentationSchema = z.object({
  userGuide: z.string(),
  technicalDocs: z.string(),
  apiReference: z.string(),
  deploymentGuide: z.string(),
  maintenanceGuide: z.string()
});

export type Documentation = z.infer<typeof DocumentationSchema>;

export interface DocumentationSection {
  title: string;
  content: string;
  subsections?: DocumentationSection[];
  codeExamples?: Array<{
    language: string;
    code: string;
    description?: string;
  }>;
}

export class DocumentationGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Generate comprehensive documentation for the generated application
   */
  async generateDocumentation(
    requirement: BusinessRequirement,
    generatedCode: {
      components: any[];
      apis: any[];
      schemas: any[];
      workflows: any[];
      forms: any[];
      integrations: any[];
      chatbots: any[];
    }
  ): Promise<Documentation> {
    try {
      const [userGuide, technicalDocs, apiReference, deploymentGuide, maintenanceGuide] = await Promise.all([
        this.generateUserGuide(requirement, generatedCode),
        this.generateTechnicalDocumentation(requirement, generatedCode),
        this.generateAPIReference(generatedCode.apis),
        this.generateDeploymentGuide(requirement),
        this.generateMaintenanceGuide(requirement, generatedCode)
      ]);

      return {
        userGuide,
        technicalDocs,
        apiReference,
        deploymentGuide,
        maintenanceGuide
      };
    } catch (error) {
      console.error('Error generating documentation:', error);
      return this.generateFallbackDocumentation(requirement);
    }
  }

  /**
   * Generate user guide documentation
   */
  private async generateUserGuide(
    requirement: BusinessRequirement,
    generatedCode: any
  ): Promise<string> {
    if (!this.openai) {
      return this.generateFallbackUserGuide(requirement);
    }

    try {
      const prompt = `Generate a comprehensive user guide for an application with the following:
Business Requirement: ${requirement.originalDescription}

Components: ${generatedCode.components.map((c: any) => c.name).join(', ')}
Features: ${requirement.extractedEntities?.uiRequirements?.join(', ') || 'Standard features'}

Include:
1. Getting Started section
2. Feature walkthrough
3. Common tasks and workflows
4. Troubleshooting guide
5. FAQ section

Format as clean Markdown.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      return completion.choices[0]?.message?.content || this.generateFallbackUserGuide(requirement);
    } catch (error) {
      console.error('Error generating user guide:', error);
      return this.generateFallbackUserGuide(requirement);
    }
  }

  /**
   * Generate technical documentation
   */
  private async generateTechnicalDocumentation(
    requirement: BusinessRequirement,
    generatedCode: any
  ): Promise<string> {
    const sections: DocumentationSection[] = [
      {
        title: 'Architecture Overview',
        content: this.generateArchitectureOverview(requirement, generatedCode)
      },
      {
        title: 'Component Documentation',
        content: 'React components and their usage',
        subsections: this.documentComponents(generatedCode.components)
      },
      {
        title: 'Database Schema',
        content: 'Database structure and relationships',
        subsections: this.documentSchemas(generatedCode.schemas)
      },
      {
        title: 'Workflows',
        content: 'Business process workflows',
        subsections: this.documentWorkflows(generatedCode.workflows)
      },
      {
        title: 'Integrations',
        content: 'Third-party service integrations',
        subsections: this.documentIntegrations(generatedCode.integrations)
      }
    ];

    return this.formatDocumentation(sections);
  }

  /**
   * Generate API reference documentation
   */
  private async generateAPIReference(apis: any[]): Promise<string> {
    let apiDoc = '# API Reference\n\n';

    for (const api of apis) {
      apiDoc += `## ${api.method} ${api.endpoint}\n\n`;
      apiDoc += `**Description:** ${api.description || 'API endpoint'}\n\n`;
      
      if (api.params) {
        apiDoc += '### Parameters\n\n';
        apiDoc += '| Name | Type | Required | Description |\n';
        apiDoc += '|------|------|----------|-------------|\n';
        for (const [key, value] of Object.entries(api.params as Record<string, any>)) {
          apiDoc += `| ${key} | ${value.type || 'string'} | ${value.required ? 'Yes' : 'No'} | ${value.description || '-'} |\n`;
        }
        apiDoc += '\n';
      }

      if (api.requestBody) {
        apiDoc += '### Request Body\n\n';
        apiDoc += '```json\n' + JSON.stringify(api.requestBody, null, 2) + '\n```\n\n';
      }

      if (api.response) {
        apiDoc += '### Response\n\n';
        apiDoc += '```json\n' + JSON.stringify(api.response, null, 2) + '\n```\n\n';
      }

      apiDoc += '### Example\n\n';
      apiDoc += '```bash\n';
      apiDoc += `curl -X ${api.method} http://localhost:5000${api.endpoint}`;
      if (api.method !== 'GET') {
        apiDoc += ' \\\n  -H "Content-Type: application/json"';
        if (api.requestBody) {
          apiDoc += ' \\\n  -d \'' + JSON.stringify(api.requestBody, null, 2) + '\'';
        }
      }
      apiDoc += '\n```\n\n---\n\n';
    }

    return apiDoc;
  }

  /**
   * Generate deployment guide
   */
  private async generateDeploymentGuide(requirement: BusinessRequirement): Promise<string> {
    return `# Deployment Guide

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Replit account (for deployment)

## Environment Variables

Set the following environment variables:

\`\`\`bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key
NODE_ENV=production
\`\`\`

## Development Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up the database:
   \`\`\`bash
   npm run db:push
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Production Deployment

### Deploy to Replit

1. Fork the repository to your Replit account
2. Configure environment variables in Replit Secrets
3. Run the deployment command:
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

### Custom Domain Setup

1. Go to Replit deployment settings
2. Add your custom domain
3. Configure DNS records as instructed

## Health Checks

The application includes health check endpoints:
- \`/health\` - Basic health check
- \`/health/detailed\` - Detailed system status

## Monitoring

Monitor your application using:
- Replit Analytics Dashboard
- Application logs at \`/logs\`
- Performance metrics at \`/metrics\`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL environment variable
   - Verify database is accessible

2. **Build Failures**
   - Clear node_modules and reinstall
   - Check for TypeScript errors

3. **Performance Issues**
   - Review database queries
   - Check memory usage
   - Enable caching

## Support

For support, please refer to:
- Technical documentation
- API reference
- Community forums`;
  }

  /**
   * Generate maintenance guide
   */
  private async generateMaintenanceGuide(
    requirement: BusinessRequirement,
    generatedCode: any
  ): Promise<string> {
    return `# Maintenance Guide

## Regular Maintenance Tasks

### Daily
- Monitor application logs
- Check error rates
- Verify backup completion

### Weekly
- Review performance metrics
- Update dependencies (security patches)
- Clean up temporary files

### Monthly
- Full system backup
- Database optimization
- Security audit
- Performance review

## Database Maintenance

### Backup Procedures
\`\`\`bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20240101.sql
\`\`\`

### Optimization
\`\`\`sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim storage
VACUUM ANALYZE;

-- Reindex for better performance
REINDEX DATABASE your_database;
\`\`\`

## Application Updates

### Updating Dependencies
\`\`\`bash
# Check for outdated packages
npm outdated

# Update minor versions
npm update

# Update major versions (careful!)
npm install package@latest
\`\`\`

### Code Updates
1. Test in development environment
2. Run automated tests
3. Deploy to staging
4. Verify functionality
5. Deploy to production

## Security Maintenance

### Security Patches
- Enable automatic security updates
- Review security advisories weekly
- Apply patches immediately for critical issues

### Access Control
- Review user permissions monthly
- Rotate API keys quarterly
- Update passwords regularly

## Performance Optimization

### Monitoring
- CPU usage should stay below 80%
- Memory usage should stay below 85%
- Response time should be under 200ms

### Optimization Steps
1. Identify bottlenecks using profiling
2. Optimize database queries
3. Implement caching where appropriate
4. Consider horizontal scaling

## Troubleshooting Guide

### Application Crashes
1. Check error logs: \`npm run logs:error\`
2. Review recent changes
3. Check resource usage
4. Verify external services

### Slow Performance
1. Check database query performance
2. Review network latency
3. Analyze memory usage
4. Check for memory leaks

### Data Issues
1. Verify data integrity
2. Check for constraint violations
3. Review recent migrations
4. Validate input data

## Emergency Procedures

### Rollback Process
\`\`\`bash
# Rollback to previous version
git checkout <previous-version>
npm install
npm run build
npm run deploy
\`\`\`

### Incident Response
1. Identify the issue
2. Assess impact
3. Communicate with stakeholders
4. Implement fix
5. Document incident
6. Post-mortem analysis

## Contact Information

- Technical Lead: tech@example.com
- Database Admin: dba@example.com
- Security Team: security@example.com
- On-call Support: +1-xxx-xxx-xxxx`;
  }

  private generateArchitectureOverview(requirement: BusinessRequirement, generatedCode: any): string {
    return `The application follows a modern three-tier architecture:

**Frontend Layer:**
- React-based single-page application
- Component-based architecture
- Responsive design with Tailwind CSS
- State management with React hooks

**Backend Layer:**
- Node.js with Express framework
- RESTful API design
- JWT-based authentication
- Input validation with Zod

**Database Layer:**
- PostgreSQL database
- Drizzle ORM for type-safe queries
- Optimized indexing
- Transaction support

**Key Architectural Decisions:**
- Separation of concerns through layered architecture
- Stateless API design for scalability
- Component reusability for maintainability
- Type safety throughout the stack`;
  }

  private documentComponents(components: any[]): DocumentationSection[] {
    return components.map(component => ({
      title: component.name,
      content: `Component type: ${component.type}\nPath: ${component.path}`,
      codeExamples: [{
        language: 'tsx',
        code: `import { ${component.name} } from '${component.path}';

// Usage example
<${component.name} />`,
        description: `Import and use the ${component.name} component`
      }]
    }));
  }

  private documentSchemas(schemas: any[]): DocumentationSection[] {
    return schemas.map(schema => ({
      title: schema.tableName,
      content: `Database table: ${schema.tableName}`,
      codeExamples: [{
        language: 'typescript',
        code: `// Table structure
{
  ${Object.entries(schema.columns || {})
    .map(([col, type]) => `${col}: ${type}`)
    .join(',\n  ')}
}`,
        description: 'Table schema definition'
      }]
    }));
  }

  private documentWorkflows(workflows: any[]): DocumentationSection[] {
    return workflows.map(workflow => ({
      title: workflow.name,
      content: `Workflow type: ${workflow.type}`,
      subsections: workflow.steps?.map((step: any) => ({
        title: step.name,
        content: `Step type: ${step.type}`
      }))
    }));
  }

  private documentIntegrations(integrations: any[]): DocumentationSection[] {
    return integrations.map(integration => ({
      title: integration.name,
      content: `Provider: ${integration.provider}\nType: ${integration.type}`,
      codeExamples: integration.endpoints?.map((endpoint: string) => ({
        language: 'bash',
        code: `curl -X GET ${endpoint}`,
        description: `Call ${endpoint}`
      }))
    }));
  }

  private formatDocumentation(sections: DocumentationSection[]): string {
    let doc = '';
    
    for (const section of sections) {
      doc += `# ${section.title}\n\n`;
      doc += `${section.content}\n\n`;
      
      if (section.subsections) {
        for (const subsection of section.subsections) {
          doc += `## ${subsection.title}\n\n`;
          doc += `${subsection.content}\n\n`;
          
          if (subsection.codeExamples) {
            for (const example of subsection.codeExamples) {
              if (example.description) {
                doc += `${example.description}\n\n`;
              }
              doc += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
            }
          }
        }
      }
      
      if (section.codeExamples) {
        for (const example of section.codeExamples) {
          if (example.description) {
            doc += `${example.description}\n\n`;
          }
          doc += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
        }
      }
    }
    
    return doc;
  }

  private generateFallbackDocumentation(requirement: BusinessRequirement): Documentation {
    return {
      userGuide: this.generateFallbackUserGuide(requirement),
      technicalDocs: '# Technical Documentation\n\nComprehensive technical documentation for the application.',
      apiReference: '# API Reference\n\nDetailed API endpoint documentation.',
      deploymentGuide: '# Deployment Guide\n\nStep-by-step deployment instructions.',
      maintenanceGuide: '# Maintenance Guide\n\nApplication maintenance procedures.'
    };
  }

  private generateFallbackUserGuide(requirement: BusinessRequirement): string {
    return `# User Guide

## Getting Started

Welcome to your generated application! This guide will help you get started.

### Overview
${requirement.originalDescription}

### Key Features
- User authentication and authorization
- Data management interface
- Workflow automation
- Real-time updates
- Responsive design

### First Steps

1. **Login to the Application**
   - Navigate to the login page
   - Enter your credentials
   - Click "Sign In"

2. **Explore the Dashboard**
   - View key metrics
   - Access recent items
   - Navigate to different sections

3. **Manage Your Data**
   - Create new entries
   - Edit existing data
   - Delete unwanted items

### Common Tasks

#### Creating New Items
1. Click "New" button
2. Fill in required fields
3. Click "Save"

#### Editing Items
1. Select item to edit
2. Modify fields
3. Save changes

#### Searching and Filtering
- Use search bar for quick lookup
- Apply filters for refined results
- Sort by different columns

### Need Help?

If you encounter issues:
1. Check the FAQ section
2. Contact support
3. Review documentation

## FAQ

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page.

**Q: Can I export my data?**
A: Yes, use the Export button in the data view.

**Q: Is my data secure?**
A: Yes, we use industry-standard encryption.`;
  }

  /**
   * Save documentation to files
   */
  async saveDocumentation(
    documentation: Documentation,
    outputDir: string
  ): Promise<void> {
    const docs = [
      { name: 'USER_GUIDE.md', content: documentation.userGuide },
      { name: 'TECHNICAL_DOCS.md', content: documentation.technicalDocs },
      { name: 'API_REFERENCE.md', content: documentation.apiReference },
      { name: 'DEPLOYMENT_GUIDE.md', content: documentation.deploymentGuide },
      { name: 'MAINTENANCE_GUIDE.md', content: documentation.maintenanceGuide }
    ];

    for (const doc of docs) {
      await writeFile(join(outputDir, doc.name), doc.content, 'utf-8');
    }
  }
}