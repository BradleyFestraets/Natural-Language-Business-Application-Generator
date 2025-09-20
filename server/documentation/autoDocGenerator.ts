import { BusinessRequirement } from "@shared/schema";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

export interface DocumentationOptions {
  format?: "markdown" | "html" | "json";
  includeUserGuide?: boolean;
  includeApiDocs?: boolean;
  includeDeveloperGuide?: boolean;
  includeDeploymentGuide?: boolean;
  includeArchitectureDiagram?: boolean;
  outputDir?: string;
}

interface GeneratedCode {
  components: { [filename: string]: string };
  apiEndpoints: { [filename: string]: string };
  databaseSchema: { [filename: string]: string };
  integrations?: { [filename: string]: string };
  workflows?: { [filename: string]: string };
  chatbots?: { [filename: string]: string };
  documentation?: { [filename: string]: string };
}

interface GenerationPlan {
  components: any[];
  apiEndpoints: any[];
  databaseSchemas: any[];
  workflows: any[];
  integrations: any[];
  chatbots: any[];
  documentation: any;
  deployment: any;
  estimatedDuration: number;
  priorityOrder: string[];
}

/**
 * Automatically generates comprehensive documentation for generated applications
 */
export class AutoDocGenerator {
  /**
   * Generate complete documentation suite for the application
   */
  async generateDocumentation(
    businessRequirement: BusinessRequirement,
    generatedCode: GeneratedCode,
    generationPlan?: GenerationPlan,
    options: DocumentationOptions = {}
  ): Promise<{ [filename: string]: string }> {
    const docs: { [filename: string]: string } = {};
    
    const defaultOptions: DocumentationOptions = {
      format: "markdown",
      includeUserGuide: true,
      includeApiDocs: true,
      includeDeveloperGuide: true,
      includeDeploymentGuide: true,
      includeArchitectureDiagram: true,
      ...options
    };

    // Generate README.md
    docs["README.md"] = await this.generateReadme(businessRequirement, generatedCode, generationPlan);

    // Generate User Guide
    if (defaultOptions.includeUserGuide) {
      docs["USER_GUIDE.md"] = await this.generateUserGuide(businessRequirement, generatedCode);
    }

    // Generate API Documentation
    if (defaultOptions.includeApiDocs) {
      docs["API_DOCUMENTATION.md"] = await this.generateApiDocumentation(generatedCode.apiEndpoints);
    }

    // Generate Developer Guide
    if (defaultOptions.includeDeveloperGuide) {
      docs["DEVELOPER_GUIDE.md"] = await this.generateDeveloperGuide(businessRequirement, generatedCode);
    }

    // Generate Deployment Guide
    if (defaultOptions.includeDeploymentGuide) {
      docs["DEPLOYMENT_GUIDE.md"] = await this.generateDeploymentGuide(businessRequirement);
    }

    // Generate Architecture Documentation
    if (defaultOptions.includeArchitectureDiagram) {
      docs["ARCHITECTURE.md"] = await this.generateArchitectureDoc(businessRequirement, generatedCode, generationPlan);
    }

    // Generate Database Documentation
    docs["DATABASE_SCHEMA.md"] = await this.generateDatabaseDocumentation(generatedCode.databaseSchema);

    // Generate Workflow Documentation if workflows exist
    if (generatedCode.workflows && Object.keys(generatedCode.workflows).length > 0) {
      docs["WORKFLOWS.md"] = await this.generateWorkflowDocumentation(generatedCode.workflows);
    }

    // Generate Integration Documentation if integrations exist
    if (generatedCode.integrations && Object.keys(generatedCode.integrations).length > 0) {
      docs["INTEGRATIONS.md"] = await this.generateIntegrationDocumentation(generatedCode.integrations);
    }

    // Save documentation files if output directory is specified
    if (options.outputDir) {
      await this.saveDocumentation(docs, options.outputDir);
    }

    return docs;
  }

  /**
   * Generate main README file
   */
  private async generateReadme(
    businessRequirement: BusinessRequirement,
    generatedCode: GeneratedCode,
    generationPlan?: GenerationPlan
  ): Promise<string> {
    const entities = businessRequirement.extractedEntities || {};
    const componentCount = Object.keys(generatedCode.components).length;
    const apiCount = Object.keys(generatedCode.apiEndpoints).length;
    const tableCount = Object.keys(generatedCode.databaseSchema).length;

    return `# ${this.extractApplicationName(businessRequirement)}

## 📋 Overview

${businessRequirement.originalDescription}

This application was automatically generated using the Enterprise AI Business Platform, providing a complete business solution with workflows, forms, integrations, and embedded AI assistance.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Environment variables configured (see \`.env.example\`)

### Installation

\`\`\`bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev
\`\`\`

The application will be available at \`http://localhost:5000\`

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React ${this.getReactVersion()}, TypeScript, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth / Passport.js
- **AI Integration**: OpenAI GPT-4
- **Real-time**: WebSocket (ws)

### Project Structure
\`\`\`
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/  # React components (${componentCount} generated)
│   │   ├── pages/      # Application pages
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utilities and helpers
├── server/              # Express backend
│   ├── routes/         # API endpoints (${apiCount} generated)
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   └── storage.ts      # Database operations
├── shared/             # Shared types and schemas
│   └── schema.ts       # Database schema (${tableCount} tables)
└── docs/               # Documentation
\`\`\`

## 🎯 Features

${this.generateFeaturesList(businessRequirement)}

## 📊 Business Entities

${this.generateEntitiesList(entities)}

## 🔌 API Endpoints

See [API Documentation](./API_DOCUMENTATION.md) for complete endpoint reference.

### Key Endpoints:
${this.generateKeyEndpointsList(generatedCode.apiEndpoints)}

## 🗄️ Database Schema

See [Database Documentation](./DATABASE_SCHEMA.md) for complete schema reference.

### Main Tables:
${this.generateMainTablesList(generatedCode.databaseSchema)}

## 🤖 AI Chatbot Assistant

The application includes an embedded AI chatbot that provides:
- Context-aware assistance for application features
- Form filling guidance and validation help
- Workflow navigation and status updates
- General help and documentation access

## 📚 Documentation

- [User Guide](./USER_GUIDE.md) - End-user documentation
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Developer Guide](./DEVELOPER_GUIDE.md) - Development setup and guidelines
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [Architecture](./ARCHITECTURE.md) - System architecture and design decisions

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
\`\`\`

## 🚢 Deployment

See [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 📝 License

Copyright © ${new Date().getFullYear()} - All Rights Reserved

## 🤝 Support

For support, please contact your system administrator or refer to the user guide.

---
*Generated by Enterprise AI Business Platform - ${new Date().toISOString()}*
`;
  }

  /**
   * Generate User Guide
   */
  private async generateUserGuide(
    businessRequirement: BusinessRequirement,
    generatedCode: GeneratedCode
  ): Promise<string> {
    const appName = this.extractApplicationName(businessRequirement);
    const entities = businessRequirement.extractedEntities || {};

    return `# User Guide - ${appName}

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Data](#managing-data)
4. [Workflows](#workflows)
5. [Using the AI Assistant](#using-the-ai-assistant)
6. [Reports and Analytics](#reports-and-analytics)
7. [Settings](#settings)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Logging In
1. Navigate to the application URL
2. Click "Log in with Replit" or enter your credentials
3. You will be directed to the dashboard

### First Time Setup
Upon first login, you may need to:
- Complete your profile information
- Set up your preferences
- Configure initial settings

## Dashboard Overview

The dashboard provides a comprehensive view of your business operations:

### Key Metrics
- Real-time business metrics and KPIs
- Activity summaries
- Pending tasks and approvals
- Recent activities

### Navigation
- **Side Menu**: Access all major features
- **Top Bar**: Quick actions and user profile
- **Search**: Global search functionality

## Managing Data

${this.generateDataManagementSection(entities)}

## Workflows

${this.generateWorkflowSection(entities)}

## Using the AI Assistant

### Accessing the Assistant
- Click the chat icon in the bottom-right corner
- Or press \`Ctrl+K\` (Windows) / \`Cmd+K\` (Mac)

### What the Assistant Can Help With:
1. **Navigation Help**
   - "How do I create a new record?"
   - "Where can I find reports?"

2. **Form Assistance**
   - "Help me fill out this form"
   - "What should I enter in this field?"

3. **Workflow Guidance**
   - "What's the next step in this process?"
   - "How do I approve this request?"

4. **General Questions**
   - "What does this feature do?"
   - "How can I export data?"

## Reports and Analytics

### Available Reports
- Business performance dashboards
- Custom report builder
- Data export options (CSV, PDF)
- Scheduled report delivery

### Creating Custom Reports
1. Navigate to Reports > Custom Reports
2. Select data source
3. Choose fields and filters
4. Preview and save

## Settings

### User Preferences
- Theme selection (Light/Dark mode)
- Notification preferences
- Language settings
- Time zone configuration

### System Settings (Admin Only)
- User management
- Role configuration
- Integration settings
- Security settings

## Troubleshooting

### Common Issues and Solutions

**Cannot log in**
- Check your internet connection
- Clear browser cache and cookies
- Try a different browser
- Contact support if issue persists

**Data not loading**
- Refresh the page
- Check your permissions
- Verify network connectivity

**Form validation errors**
- Review required fields (marked with *)
- Check data format requirements
- Ensure all validations pass

**Workflow stuck**
- Check for pending approvals
- Verify all required steps are complete
- Contact workflow administrator

### Getting Help

**In-App Support**
- Use the AI assistant for immediate help
- Access help documentation via Help menu

**Contact Support**
- Email: support@example.com
- Phone: 1-800-XXX-XXXX
- Hours: Monday-Friday, 9 AM - 5 PM EST

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open AI Assistant |
| Ctrl/Cmd + S | Save current form |
| Ctrl/Cmd + / | Show keyboard shortcuts |
| Esc | Close modal/dialog |
| Alt + N | Create new record |
| Alt + H | Go to home/dashboard |

## Best Practices

1. **Data Entry**
   - Save work frequently
   - Use templates when available
   - Validate before submitting

2. **Security**
   - Log out when finished
   - Don't share credentials
   - Report suspicious activity

3. **Performance**
   - Use filters to limit data
   - Export large datasets during off-peak hours
   - Clear browser cache regularly

---
*Last updated: ${new Date().toLocaleDateString()}*
`;
  }

  /**
   * Generate API Documentation
   */
  private async generateApiDocumentation(apiEndpoints: { [filename: string]: string }): Promise<string> {
    let doc = `# API Documentation

## Base URL
\`\`\`
http://localhost:5000/api/v1
\`\`\`

## Authentication
All API endpoints require authentication unless otherwise specified.

### Headers
\`\`\`
Authorization: Bearer <token>
Content-Type: application/json
\`\`\`

## Error Responses
All endpoints follow standard HTTP status codes:
- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`403\` - Forbidden
- \`404\` - Not Found
- \`500\` - Internal Server Error

Error Response Format:
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
\`\`\`

## Endpoints

`;

    // Parse and document each endpoint
    for (const [filename, content] of Object.entries(apiEndpoints)) {
      const endpointName = filename.replace('Routes.ts', '').replace('.ts', '');
      doc += `### ${this.capitalizeFirst(endpointName)} Endpoints\n\n`;
      
      // Extract route patterns from content
      const routes = this.extractRoutesFromCode(content);
      
      for (const route of routes) {
        doc += this.formatRouteDocumentation(route);
      }
    }

    doc += `
## Rate Limiting
API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## Pagination
List endpoints support pagination:
\`\`\`
GET /api/v1/resource?page=1&limit=20&sort=created_at&order=desc
\`\`\`

## Filtering
Most list endpoints support filtering:
\`\`\`
GET /api/v1/resource?status=active&created_after=2024-01-01
\`\`\`

## WebSocket Events
Real-time updates are available via WebSocket:
\`\`\`javascript
const ws = new WebSocket('ws://localhost:5000/ws');
ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Event:', event);
});
\`\`\`

---
*Generated API Documentation - ${new Date().toLocaleDateString()}*
`;

    return doc;
  }

  /**
   * Generate Developer Guide
   */
  private async generateDeveloperGuide(
    businessRequirement: BusinessRequirement,
    generatedCode: GeneratedCode
  ): Promise<string> {
    return `# Developer Guide

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- VS Code (recommended)

### Environment Setup

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd <project-name>
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Configure environment variables**
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

Required environment variables:
\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
OPENAI_API_KEY=sk-...
SESSION_SECRET=your-secret-key
NODE_ENV=development
\`\`\`

4. **Set up database**
\`\`\`bash
npm run db:push
npm run db:seed # Optional: Load sample data
\`\`\`

5. **Start development server**
\`\`\`bash
npm run dev
\`\`\`

## Project Structure

### Frontend (React + TypeScript)
\`\`\`
client/
├── src/
│   ├── components/     # Reusable React components
│   │   ├── ui/        # Shadcn UI components
│   │   └── ...        # Custom components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and helpers
│   └── App.tsx        # Main application component
\`\`\`

### Backend (Express + TypeScript)
\`\`\`
server/
├── routes/            # API route handlers
├── services/          # Business logic services
├── middleware/        # Express middleware
├── generators/        # Code generation utilities
├── validation/        # Input validation schemas
└── storage.ts         # Database operations
\`\`\`

### Shared Code
\`\`\`
shared/
└── schema.ts          # Drizzle ORM schemas and types
\`\`\`

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful variable and function names
- Add JSDoc comments for complex functions

### Component Development
\`\`\`tsx
// Example React component structure
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [state, setState] = useState(false);
  
  return (
    <div data-testid="my-component">
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
\`\`\`

### API Development
\`\`\`typescript
// Example API endpoint
router.post('/resource', 
  isAuthenticated,
  validateRequest(createResourceSchema),
  async (req, res) => {
    try {
      const result = await storage.createResource(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create resource' });
    }
  }
);
\`\`\`

### Database Operations
\`\`\`typescript
// Example using Drizzle ORM
import { db } from './db';
import { users } from '@shared/schema';

// Query
const allUsers = await db.select().from(users);

// Insert
const newUser = await db.insert(users).values({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
}).returning();
\`\`\`

## Testing

### Running Tests
\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
\`\`\`

### Writing Tests
\`\`\`typescript
// Example test
describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" onAction={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
\`\`\`

## Building for Production

\`\`\`bash
# Build the application
npm run build

# Run production build locally
npm run preview
\`\`\`

## Common Tasks

### Adding a New Feature
1. Create database schema in \`shared/schema.ts\`
2. Generate types: \`npm run db:generate\`
3. Create API endpoints in \`server/routes/\`
4. Create React components in \`client/src/components/\`
5. Add pages in \`client/src/pages/\`
6. Update routing in \`client/src/App.tsx\`
7. Write tests
8. Update documentation

### Database Migrations
\`\`\`bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:push

# Reset database (development only)
npm run db:reset
\`\`\`

### Debugging

#### Backend Debugging
1. Add \`debugger\` statements or use VS Code breakpoints
2. Check server logs: \`npm run dev\`
3. Use Postman/Insomnia for API testing

#### Frontend Debugging
1. Use React DevTools
2. Check browser console
3. Use Network tab for API calls
4. Add \`console.log\` or use browser debugger

## Troubleshooting

### Common Issues

**Database connection errors**
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify database exists

**TypeScript errors**
- Run \`npm run type-check\`
- Check for missing types
- Ensure imports are correct

**Build failures**
- Clear node_modules: \`rm -rf node_modules && npm install\`
- Clear build cache: \`npm run clean\`
- Check for syntax errors

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit a pull request

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Express.js Guide](https://expressjs.com/)

---
*Developer Guide - ${new Date().toLocaleDateString()}*
`;
  }

  /**
   * Generate Deployment Guide
   */
  private async generateDeploymentGuide(businessRequirement: BusinessRequirement): Promise<string> {
    return `# Deployment Guide

## Overview
This guide provides instructions for deploying the application to production environments.

## Supported Platforms

### Replit (Recommended)
The application is optimized for deployment on Replit.

#### Automatic Deployment
1. The application auto-deploys when pushed to the main branch
2. Access via: \`https://<your-app-name>.repl.co\`

#### Manual Deployment
1. Click "Run" in Replit IDE
2. Configure environment variables in Secrets
3. Set up PostgreSQL database
4. Deploy using Replit's deployment options

### Docker Deployment

#### Prerequisites
- Docker and Docker Compose installed
- PostgreSQL database
- Domain name (optional)

#### Steps
1. **Build Docker image**
\`\`\`bash
docker build -t app-name .
\`\`\`

2. **Run with Docker Compose**
\`\`\`yaml
version: '3.8'
services:
  app:
    image: app-name
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://...
      - NODE_ENV=production
    depends_on:
      - postgres
  
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
\`\`\`

3. **Start services**
\`\`\`bash
docker-compose up -d
\`\`\`

### Cloud Deployment (AWS/GCP/Azure)

#### AWS Deployment
1. **EC2 Instance**
   - Launch EC2 instance (t3.medium recommended)
   - Install Node.js and PostgreSQL
   - Clone repository
   - Set environment variables
   - Run with PM2

2. **Elastic Beanstalk**
   - Package application
   - Create EB environment
   - Deploy using EB CLI

3. **ECS/Fargate**
   - Build and push Docker image to ECR
   - Create ECS task definition
   - Deploy service

#### Database Setup
1. **RDS PostgreSQL**
   - Create RDS instance
   - Configure security groups
   - Update DATABASE_URL

2. **Connection Pooling**
   - Use PgBouncer for production
   - Configure max connections

## Environment Configuration

### Production Environment Variables
\`\`\`env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<strong-random-string>
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://...
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
\`\`\`

### SSL/TLS Configuration
1. Obtain SSL certificate (Let's Encrypt)
2. Configure reverse proxy (Nginx)
3. Enable HTTPS redirect

## Performance Optimization

### Frontend Optimization
- Enable compression
- Use CDN for static assets
- Implement caching strategies
- Optimize images

### Backend Optimization
- Use connection pooling
- Implement Redis caching
- Enable response compression
- Use PM2 cluster mode

### Database Optimization
- Create proper indexes
- Regular VACUUM and ANALYZE
- Monitor slow queries
- Implement read replicas

## Monitoring & Logging

### Application Monitoring
1. **Sentry** - Error tracking
2. **New Relic** - Performance monitoring
3. **Datadog** - Infrastructure monitoring

### Logging
1. **Application Logs**
   - Use structured logging
   - Centralize with ELK stack
   - Set appropriate log levels

2. **Access Logs**
   - Configure Nginx/Apache logs
   - Monitor with fail2ban

### Health Checks
\`\`\`javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
\`\`\`

## Security Checklist

- [ ] Enable HTTPS everywhere
- [ ] Configure CORS properly
- [ ] Set secure headers (Helmet.js)
- [ ] Enable rate limiting
- [ ] Implement DDoS protection
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Disaster recovery plan
- [ ] Security audit completed
- [ ] GDPR/compliance verified

## Backup & Recovery

### Backup Strategy
1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery
   - Off-site backup storage

2. **Application Backups**
   - Version control (Git)
   - Container images
   - Configuration backups

### Recovery Procedures
1. Document recovery steps
2. Test recovery process
3. Maintain runbooks

## Scaling Strategy

### Horizontal Scaling
- Load balancer configuration
- Session management (Redis)
- Database read replicas

### Vertical Scaling
- Monitor resource usage
- Scale based on metrics
- Plan maintenance windows

## Maintenance

### Regular Tasks
- Security updates
- Dependency updates
- Database maintenance
- Log rotation
- Certificate renewal

### Zero-Downtime Deployment
1. Blue-green deployment
2. Rolling updates
3. Feature flags
4. Database migrations

## Rollback Procedures

1. **Application Rollback**
\`\`\`bash
# Using Git tags
git checkout v1.2.3
npm install
npm run build
pm2 restart app
\`\`\`

2. **Database Rollback**
\`\`\`bash
# Restore from backup
pg_restore -d appdb backup.dump
\`\`\`

## Support & Troubleshooting

### Common Issues
- Connection timeouts: Check firewall rules
- Memory issues: Increase Node.js heap size
- Slow queries: Analyze and optimize
- SSL errors: Verify certificate chain

### Getting Help
- Check application logs
- Review monitoring dashboards
- Contact DevOps team
- Escalate to vendor support

---
*Deployment Guide - ${new Date().toLocaleDateString()}*
`;
  }

  /**
   * Generate Architecture Documentation
   */
  private async generateArchitectureDoc(
    businessRequirement: BusinessRequirement,
    generatedCode: GeneratedCode,
    generationPlan?: GenerationPlan
  ): Promise<string> {
    return `# System Architecture

## Overview
This document describes the technical architecture of the ${this.extractApplicationName(businessRequirement)} system.

## Architecture Principles
- **Scalability**: Designed to handle growth
- **Maintainability**: Clean code and clear structure
- **Security**: Defense in depth approach
- **Performance**: Optimized for speed
- **Reliability**: Fault-tolerant design

## System Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Components │  │     Pages     │  │   Services   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express.js)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Routes    │  │  Middleware   │  │     Auth     │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Database   │  │   Services   │  │  AI Services │
│  PostgreSQL  │  │   Business   │  │   OpenAI     │
│   Drizzle    │  │    Logic     │  │   GPT-4      │
└──────────────┘  └──────────────┘  └──────────────┘
\`\`\`

## Technology Stack

### Frontend
- **Framework**: React ${this.getReactVersion()}
- **Language**: TypeScript
- **UI Library**: Shadcn UI
- **State Management**: Zustand
- **Routing**: Wouter
- **API Client**: TanStack Query
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth / Passport.js
- **Session**: Express Session
- **Validation**: Zod

### Database
- **Primary**: PostgreSQL
- **Caching**: In-memory (optional Redis)
- **Migrations**: Drizzle Kit

### Infrastructure
- **Hosting**: Replit / Docker
- **CDN**: Cloudflare (optional)
- **Monitoring**: Built-in metrics
- **Logging**: Winston / Console

## Component Architecture

### Frontend Components
${this.generateComponentArchitecture(generatedCode.components)}

### API Architecture
${this.generateApiArchitecture(generatedCode.apiEndpoints)}

### Database Schema
${this.generateSchemaArchitecture(generatedCode.databaseSchema)}

## Data Flow

### Request Lifecycle
1. User interacts with React UI
2. Component triggers API call via TanStack Query
3. Request passes through Express middleware
4. Route handler processes request
5. Service layer handles business logic
6. Database operations via Drizzle ORM
7. Response returned to client
8. UI updates with new data

### Authentication Flow
1. User initiates login
2. Redirect to auth provider
3. Callback with auth token
4. Session created
5. Subsequent requests include session
6. Middleware validates session

## Security Architecture

### Security Layers
1. **Network Security**
   - HTTPS/TLS encryption
   - CORS configuration
   - Rate limiting

2. **Application Security**
   - Input validation (Zod)
   - SQL injection prevention (Drizzle)
   - XSS protection (React)
   - CSRF tokens

3. **Authentication & Authorization**
   - OAuth 2.0 / OpenID Connect
   - Session management
   - Role-based access control

4. **Data Security**
   - Encryption at rest
   - Encryption in transit
   - Sensitive data masking

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Session storage in database/Redis
- Load balancer ready

### Vertical Scaling
- Efficient database queries
- Caching strategies
- Async processing

### Performance Optimization
- Code splitting
- Lazy loading
- Database indexing
- Query optimization
- Response caching

## Monitoring & Observability

### Application Metrics
- Response times
- Error rates
- Throughput
- Resource usage

### Business Metrics
- User activity
- Feature usage
- Workflow completion rates

### Logging Strategy
- Structured logging
- Log levels (ERROR, WARN, INFO, DEBUG)
- Centralized log aggregation

## Disaster Recovery

### Backup Strategy
- Automated daily backups
- Point-in-time recovery
- Geographic redundancy

### Recovery Objectives
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 24 hours

## Future Enhancements

### Planned Improvements
- Microservices architecture
- GraphQL API
- Real-time collaboration
- Advanced analytics
- Machine learning integration

### Technology Upgrades
- Next.js for SSR/SSG
- Kubernetes deployment
- Event-driven architecture
- Service mesh

---
*Architecture Documentation - ${new Date().toLocaleDateString()}*
`;
  }

  /**
   * Generate Database Documentation
   */
  private async generateDatabaseDocumentation(schemas: { [filename: string]: string }): Promise<string> {
    let doc = `# Database Schema Documentation

## Database Information
- **Type**: PostgreSQL
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit

## Schema Overview

`;

    // Parse schemas and generate documentation
    for (const [filename, content] of Object.entries(schemas)) {
      const tableName = filename.replace('Schema.ts', '').replace('.ts', '');
      doc += `### ${this.capitalizeFirst(tableName)} Table\n\n`;
      
      // Extract table structure from schema content
      const fields = this.extractFieldsFromSchema(content);
      
      if (fields.length > 0) {
        doc += `| Column | Type | Constraints | Description |\n`;
        doc += `|--------|------|-------------|-------------|\n`;
        
        for (const field of fields) {
          doc += `| ${field.name} | ${field.type} | ${field.constraints} | ${field.description} |\n`;
        }
        
        doc += `\n`;
      }
      
      // Extract relationships
      const relationships = this.extractRelationshipsFromSchema(content);
      if (relationships.length > 0) {
        doc += `**Relationships:**\n`;
        for (const rel of relationships) {
          doc += `- ${rel}\n`;
        }
        doc += `\n`;
      }
      
      // Extract indexes
      const indexes = this.extractIndexesFromSchema(content);
      if (indexes.length > 0) {
        doc += `**Indexes:**\n`;
        for (const idx of indexes) {
          doc += `- ${idx}\n`;
        }
        doc += `\n`;
      }
    }

    doc += `
## Common Queries

### Basic CRUD Operations
\`\`\`typescript
// Select all
const records = await db.select().from(table);

// Select with filter
const filtered = await db.select()
  .from(table)
  .where(eq(table.status, 'active'));

// Insert
const newRecord = await db.insert(table)
  .values({ ... })
  .returning();

// Update
await db.update(table)
  .set({ ... })
  .where(eq(table.id, id));

// Delete
await db.delete(table)
  .where(eq(table.id, id));
\`\`\`

### Joins and Relations
\`\`\`typescript
// Inner join
const results = await db.select()
  .from(table1)
  .innerJoin(table2, eq(table1.id, table2.table1Id));

// Left join with conditions
const results = await db.select()
  .from(table1)
  .leftJoin(table2, and(
    eq(table1.id, table2.table1Id),
    eq(table2.status, 'active')
  ));
\`\`\`

## Database Maintenance

### Regular Tasks
1. **VACUUM** - Weekly
2. **ANALYZE** - Daily
3. **REINDEX** - Monthly
4. **Backup** - Daily

### Performance Tuning
- Monitor slow queries
- Add indexes for frequent queries
- Optimize query patterns
- Use EXPLAIN ANALYZE

---
*Database Documentation - ${new Date().toLocaleDateString()}*
`;

    return doc;
  }

  /**
   * Generate Workflow Documentation
   */
  private async generateWorkflowDocumentation(workflows: { [filename: string]: string }): Promise<string> {
    return `# Workflow Documentation

## Overview
This document describes the business workflows implemented in the system.

## Workflow Engine
The application uses a custom workflow engine that supports:
- Multi-step processes
- Approval chains
- Conditional branching
- Notifications
- External integrations

## Implemented Workflows

${this.parseWorkflowsFromCode(workflows)}

## Workflow States

### Common States
- **Draft**: Initial state
- **Submitted**: Awaiting approval
- **In Progress**: Being processed
- **Approved**: Approved by authorized user
- **Rejected**: Rejected with reason
- **Completed**: Successfully finished
- **Failed**: Error occurred
- **Cancelled**: Manually cancelled

## Workflow Triggers

### Manual Triggers
- User form submission
- Button click
- API call

### Automatic Triggers
- Schedule (cron)
- Event-based
- Condition-based
- Integration webhook

## Approval Process

### Approval Levels
1. **Single Approval**: One approver required
2. **Multi-Level**: Sequential approvals
3. **Parallel**: Multiple approvers simultaneously
4. **Conditional**: Based on criteria

### Approval Actions
- Approve
- Reject with reason
- Request more information
- Delegate to another user
- Escalate to higher level

## Notifications

### Notification Types
- Email
- In-app notifications
- SMS (if configured)
- Webhook

### Notification Events
- Workflow started
- Approval required
- Status changed
- Workflow completed
- Error occurred

## Integration Points

### External Systems
- Email service
- SMS gateway
- Third-party APIs
- Webhook endpoints

### Data Exchange
- JSON format
- REST API calls
- Webhook payloads
- File uploads/downloads

## Error Handling

### Error Types
- Validation errors
- System errors
- Integration failures
- Timeout errors

### Recovery Mechanisms
- Automatic retry
- Manual retry
- Rollback
- Escalation

## Monitoring & Analytics

### Metrics
- Workflow completion rate
- Average processing time
- Approval turnaround time
- Error rate

### Reports
- Workflow status dashboard
- Performance metrics
- Bottleneck analysis
- User activity

## Best Practices

1. **Design Principles**
   - Keep workflows simple
   - Clear naming conventions
   - Document business rules
   - Test edge cases

2. **Performance**
   - Optimize long-running tasks
   - Use async processing
   - Implement timeouts
   - Cache frequently used data

3. **User Experience**
   - Provide clear status updates
   - Show progress indicators
   - Enable manual intervention
   - Provide helpful error messages

---
*Workflow Documentation - ${new Date().toLocaleDateString()}*
`;
  }

  /**
   * Generate Integration Documentation
   */
  private async generateIntegrationDocumentation(integrations: { [filename: string]: string }): Promise<string> {
    return `# Integration Documentation

## Overview
This document describes the external integrations configured in the system.

## Integration Architecture

\`\`\`
Application
    │
    ├── REST APIs
    │   ├── Authentication APIs
    │   ├── Payment Gateways
    │   └── Third-party Services
    │
    ├── Webhooks
    │   ├── Inbound webhooks
    │   └── Outbound webhooks
    │
    └── File Integrations
        ├── Import/Export
        └── Document storage
\`\`\`

## Configured Integrations

${this.parseIntegrationsFromCode(integrations)}

## Authentication Methods

### API Key Authentication
\`\`\`javascript
headers: {
  'X-API-Key': process.env.API_KEY
}
\`\`\`

### OAuth 2.0
\`\`\`javascript
// OAuth flow implementation
const authUrl = \`\${provider}/authorize?client_id=\${clientId}&redirect_uri=\${redirectUri}\`;
\`\`\`

### Basic Authentication
\`\`\`javascript
headers: {
  'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
}
\`\`\`

## Webhook Configuration

### Inbound Webhooks
Endpoint: \`/api/webhooks/{integration-name}\`

Security:
- Signature verification
- IP whitelisting
- Rate limiting

### Outbound Webhooks
Configuration:
- Retry logic (3 attempts)
- Timeout (30 seconds)
- Failure notifications

## Error Handling

### Retry Strategy
- Exponential backoff
- Max 3 retries
- Circuit breaker pattern

### Error Logging
- Integration errors logged separately
- Alert on repeated failures
- Daily error reports

## Testing Integrations

### Test Environments
- Sandbox/test accounts
- Mock services
- Integration tests

### Testing Checklist
- [ ] Authentication works
- [ ] Data mapping correct
- [ ] Error handling works
- [ ] Rate limits respected
- [ ] Timeout handling
- [ ] Retry logic works

## Monitoring

### Health Checks
- Periodic connectivity tests
- API availability monitoring
- Response time tracking

### Metrics
- API call volume
- Success/failure rates
- Response times
- Error types

## Security Considerations

### API Keys
- Store in environment variables
- Rotate regularly
- Never commit to code

### Data Protection
- Encrypt sensitive data
- Use HTTPS only
- Validate SSL certificates

### Rate Limiting
- Respect provider limits
- Implement local rate limiting
- Use caching when possible

---
*Integration Documentation - ${new Date().toLocaleDateString()}*
`;
  }

  /**
   * Save documentation files to disk
   */
  private async saveDocumentation(docs: { [filename: string]: string }, outputDir: string): Promise<void> {
    await mkdir(outputDir, { recursive: true });
    
    for (const [filename, content] of Object.entries(docs)) {
      const filepath = join(outputDir, filename);
      await writeFile(filepath, content, 'utf-8');
    }
  }

  // Helper methods

  private extractApplicationName(businessRequirement: BusinessRequirement): string {
    // Try to extract a name from the business description
    const description = businessRequirement.originalDescription;
    const words = description.split(' ').slice(0, 5);
    
    // Look for common patterns
    if (description.toLowerCase().includes('system')) {
      return description.match(/(\w+\s+)*system/i)?.[0] || 'Business Application System';
    }
    if (description.toLowerCase().includes('platform')) {
      return description.match(/(\w+\s+)*platform/i)?.[0] || 'Business Platform';
    }
    if (description.toLowerCase().includes('application')) {
      return description.match(/(\w+\s+)*application/i)?.[0] || 'Business Application';
    }
    
    return 'Enterprise Business Application';
  }

  private getReactVersion(): string {
    return '18.2.0';
  }

  private generateFeaturesList(businessRequirement: BusinessRequirement): string {
    const features = [];
    const entities = businessRequirement.extractedEntities || {};
    
    if (entities.forms && entities.forms.length > 0) {
      features.push('### 📝 Dynamic Forms\n- Intelligent form generation\n- Real-time validation\n- Auto-save functionality');
    }
    
    if (entities.processes && entities.processes.length > 0) {
      features.push('### 🔄 Workflow Automation\n- Multi-step workflows\n- Approval chains\n- Status tracking');
    }
    
    if (entities.integrations && entities.integrations.length > 0) {
      features.push('### 🔌 External Integrations\n- Third-party API connections\n- Webhook support\n- Data synchronization');
    }
    
    features.push('### 🤖 AI Assistant\n- Context-aware help\n- Form filling guidance\n- Natural language queries');
    
    features.push('### 📊 Analytics & Reporting\n- Real-time dashboards\n- Custom reports\n- Data export');
    
    return features.join('\n\n');
  }

  private generateEntitiesList(entities: any): string {
    const items = [];
    
    if (Array.isArray(entities.forms)) {
      items.push(`**Forms**: ${entities.forms.join(', ')}`);
    }
    
    if (Array.isArray(entities.processes)) {
      const processNames = entities.processes.map((p: any) => 
        typeof p === 'string' ? p : p.name
      );
      items.push(`**Processes**: ${processNames.join(', ')}`);
    }
    
    if (Array.isArray(entities.approvals)) {
      const approvalNames = entities.approvals.map((a: any) => 
        typeof a === 'string' ? a : a.name
      );
      items.push(`**Approvals**: ${approvalNames.join(', ')}`);
    }
    
    if (Array.isArray(entities.integrations)) {
      const integrationNames = entities.integrations.map((i: any) => 
        typeof i === 'string' ? i : i.name
      );
      items.push(`**Integrations**: ${integrationNames.join(', ')}`);
    }
    
    return items.join('\n');
  }

  private generateKeyEndpointsList(apiEndpoints: { [filename: string]: string }): string {
    const endpoints = [];
    
    for (const filename of Object.keys(apiEndpoints)) {
      const name = filename.replace('Routes.ts', '').replace('.ts', '');
      endpoints.push(`- \`/api/${name.toLowerCase()}\` - ${this.capitalizeFirst(name)} operations`);
      
      if (endpoints.length >= 5) break; // Limit to 5 for README
    }
    
    return endpoints.join('\n');
  }

  private generateMainTablesList(schemas: { [filename: string]: string }): string {
    const tables = [];
    
    for (const filename of Object.keys(schemas)) {
      const name = filename.replace('Schema.ts', '').replace('.ts', '');
      tables.push(`- \`${name.toLowerCase()}\` - ${this.capitalizeFirst(name)} data`);
      
      if (tables.length >= 5) break; // Limit to 5 for README
    }
    
    return tables.join('\n');
  }

  private generateDataManagementSection(entities: any): string {
    let section = '';
    
    if (Array.isArray(entities.forms)) {
      section += '### Forms\n\n';
      for (const form of entities.forms) {
        const formName = typeof form === 'string' ? form : form.name;
        section += `#### ${formName}\n`;
        section += `1. Navigate to ${formName} from the menu\n`;
        section += `2. Click "New" to create a record\n`;
        section += `3. Fill in required fields (marked with *)\n`;
        section += `4. Click "Save" to submit\n\n`;
      }
    }
    
    return section || 'The system provides intuitive forms for data entry and management.\n';
  }

  private generateWorkflowSection(entities: any): string {
    let section = '';
    
    if (Array.isArray(entities.processes)) {
      section += 'The system includes the following automated workflows:\n\n';
      for (const process of entities.processes) {
        const processName = typeof process === 'string' ? process : process.name;
        section += `- **${processName}**: Automated process with status tracking\n`;
      }
    }
    
    return section || 'Workflows help automate your business processes.\n';
  }

  private generateComponentArchitecture(components: { [filename: string]: string }): string {
    const componentList = Object.keys(components).map(name => 
      `- ${name}: ${this.getComponentDescription(name)}`
    );
    
    return '```\n' + componentList.join('\n') + '\n```';
  }

  private generateApiArchitecture(apiEndpoints: { [filename: string]: string }): string {
    const endpointList = Object.keys(apiEndpoints).map(name => 
      `- ${name}: ${this.getEndpointDescription(name)}`
    );
    
    return '```\n' + endpointList.join('\n') + '\n```';
  }

  private generateSchemaArchitecture(schemas: { [filename: string]: string }): string {
    const schemaList = Object.keys(schemas).map(name => 
      `- ${name}: ${this.getSchemaDescription(name)}`
    );
    
    return '```\n' + schemaList.join('\n') + '\n```';
  }

  private getComponentDescription(filename: string): string {
    if (filename.includes('Form')) return 'Data entry form component';
    if (filename.includes('Dashboard')) return 'Main dashboard view';
    if (filename.includes('Layout')) return 'Application layout wrapper';
    if (filename.includes('Process')) return 'Workflow process component';
    return 'UI component';
  }

  private getEndpointDescription(filename: string): string {
    if (filename.includes('Routes')) return 'RESTful API routes';
    if (filename.includes('workflow')) return 'Workflow management endpoints';
    if (filename.includes('validation')) return 'Data validation schemas';
    return 'API endpoints';
  }

  private getSchemaDescription(filename: string): string {
    if (filename.includes('workflow')) return 'Workflow state tables';
    if (filename.includes('Schema')) return 'Entity data model';
    if (filename.includes('seeds')) return 'Sample data';
    return 'Database schema';
  }

  private extractRoutesFromCode(content: string): any[] {
    const routes = [];
    const routePattern = /router\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        description: this.inferRouteDescription(match[2], match[1])
      });
    }
    
    return routes;
  }

  private inferRouteDescription(path: string, method: string): string {
    const resource = path.split('/').filter(Boolean)[0] || 'resource';
    
    switch (method.toLowerCase()) {
      case 'get':
        return path.includes(':id') ? `Get ${resource} by ID` : `List all ${resource}s`;
      case 'post':
        return `Create new ${resource}`;
      case 'put':
      case 'patch':
        return `Update ${resource}`;
      case 'delete':
        return `Delete ${resource}`;
      default:
        return `${method.toUpperCase()} ${resource}`;
    }
  }

  private formatRouteDocumentation(route: any): string {
    return `
#### ${route.method} ${route.path}
${route.description}

**Request:**
\`\`\`
${route.method} /api/v1${route.path}
\`\`\`

**Response:**
\`\`\`json
{
  "data": {},
  "success": true
}
\`\`\`

`;
  }

  private extractFieldsFromSchema(content: string): any[] {
    const fields = [];
    // Simplified extraction - in production would parse more thoroughly
    const fieldPattern = /(\w+):\s*(varchar|text|integer|timestamp|boolean|json|real|uuid)/g;
    let match;
    
    while ((match = fieldPattern.exec(content)) !== null) {
      fields.push({
        name: match[1],
        type: match[2],
        constraints: this.inferConstraints(content, match[1]),
        description: this.inferFieldDescription(match[1])
      });
    }
    
    return fields;
  }

  private inferConstraints(content: string, fieldName: string): string {
    const constraints = [];
    
    if (fieldName === 'id') constraints.push('PRIMARY KEY');
    if (content.includes(`${fieldName}.*notNull`)) constraints.push('NOT NULL');
    if (content.includes(`${fieldName}.*unique`)) constraints.push('UNIQUE');
    if (content.includes(`${fieldName}.*references`)) constraints.push('FOREIGN KEY');
    
    return constraints.join(', ') || 'None';
  }

  private inferFieldDescription(fieldName: string): string {
    const descriptions: { [key: string]: string } = {
      id: 'Unique identifier',
      created_at: 'Record creation timestamp',
      updated_at: 'Last update timestamp',
      user_id: 'Reference to user',
      status: 'Current status',
      name: 'Display name',
      description: 'Detailed description',
      email: 'Email address',
      phone: 'Phone number'
    };
    
    return descriptions[fieldName.toLowerCase()] || `${this.capitalizeFirst(fieldName)} field`;
  }

  private extractRelationshipsFromSchema(content: string): string[] {
    const relationships = [];
    const refPattern = /references\(\(\)\s*=>\s*(\w+)\.(\w+)\)/g;
    let match;
    
    while ((match = refPattern.exec(content)) !== null) {
      relationships.push(`References ${match[1]}.${match[2]}`);
    }
    
    return relationships;
  }

  private extractIndexesFromSchema(content: string): string[] {
    const indexes = [];
    const indexPattern = /index\(['"`](\w+)['"`]\)\.on\((.*?)\)/g;
    let match;
    
    while ((match = indexPattern.exec(content)) !== null) {
      indexes.push(`${match[1]} on ${match[2]}`);
    }
    
    return indexes;
  }

  private parseWorkflowsFromCode(workflows: { [filename: string]: string }): string {
    let result = '';
    
    for (const [filename, content] of Object.entries(workflows)) {
      const workflowName = filename.replace('.ts', '').replace('.json', '');
      result += `### ${this.capitalizeFirst(workflowName)}\n\n`;
      
      // Try to parse workflow structure
      try {
        if (content.startsWith('{') || content.startsWith('[')) {
          const parsed = JSON.parse(content);
          result += this.formatWorkflowDetails(parsed);
        } else {
          result += 'Workflow implementation details available in code.\n\n';
        }
      } catch {
        result += 'Workflow implementation details available in code.\n\n';
      }
    }
    
    return result;
  }

  private formatWorkflowDetails(workflow: any): string {
    let details = '';
    
    if (Array.isArray(workflow)) {
      details += '**Steps:**\n';
      workflow.forEach((step: any, index: number) => {
        details += `${index + 1}. ${step.name || step}\n`;
      });
    } else if (typeof workflow === 'object') {
      if (workflow.steps) {
        details += '**Steps:**\n';
        workflow.steps.forEach((step: any, index: number) => {
          details += `${index + 1}. ${step.name || step}\n`;
        });
      }
      if (workflow.approvals) {
        details += '\n**Approvals Required:** Yes\n';
      }
      if (workflow.notifications) {
        details += '**Notifications:** Enabled\n';
      }
    }
    
    return details + '\n';
  }

  private parseIntegrationsFromCode(integrations: { [filename: string]: string }): string {
    let result = '';
    
    for (const [filename, content] of Object.entries(integrations)) {
      const integrationName = filename.replace('.ts', '').replace('.json', '');
      result += `### ${this.capitalizeFirst(integrationName)}\n\n`;
      
      // Extract integration details from content
      result += this.extractIntegrationDetails(content);
      result += '\n';
    }
    
    return result;
  }

  private extractIntegrationDetails(content: string): string {
    let details = '**Type:** ';
    
    if (content.includes('webhook')) details += 'Webhook\n';
    else if (content.includes('api') || content.includes('fetch')) details += 'REST API\n';
    else if (content.includes('graphql')) details += 'GraphQL\n';
    else details += 'Custom\n';
    
    if (content.includes('OAuth') || content.includes('oauth')) {
      details += '**Authentication:** OAuth 2.0\n';
    } else if (content.includes('apiKey') || content.includes('api_key')) {
      details += '**Authentication:** API Key\n';
    } else if (content.includes('Basic')) {
      details += '**Authentication:** Basic Auth\n';
    }
    
    return details;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}