# Enterprise AI Application Platform

## Overview

The Enterprise AI Application Platform is the world's first **Natural Language Business Application Generator** that transforms plain English descriptions into complete business systems in under 15 minutes. This revolutionary platform enables Fortune 500 companies to create comprehensive applications including workflows, forms, integrations, and embedded AI chatbots by simply describing their business needs ("Create employee onboarding with background checks and manager approvals"). The platform addresses the $30B+ no-code market by delivering intelligent business applications with AI-powered user assistance.

## BMAD Documentation

This project follows the **BMAD methodology** (Brainstorm, Model, Architect, Deliver) with comprehensive documentation:

### 📋 Core BMAD Documents
- **[Project Brief](docs/brief.md)** - Executive summary, problem statement, solution vision, and market opportunity ($30B+ no-code market)
- **[Product Requirements Document](docs/prd.md)** - Comprehensive PRD with functional/non-functional requirements, UI design goals, and 5 epic breakdown
- **[Architecture Document](docs/architecture.md)** - Complete technical architecture including AI integration, data models, and component specifications
- **[Development Stories](docs/development-stories.md)** - Granular user stories with acceptance criteria, tasks, and implementation guidance

### 📖 Individual Story Documentation
- **[Epic 1 Stories](docs/stories/)** - Foundation & Authentication Infrastructure
  - [Story 1.1: Project Foundation](docs/stories/1.1.project-foundation.md)
  - [Story 1.2: Replit Auth Integration](docs/stories/1.2.replit-auth.md) ✅ **COMPLETED**
- **[Epic 2 Stories](docs/stories/)** - Natural Language Processing Engine
  - [Story 2.1: Natural Language Input Interface](docs/stories/2.1.natural-language-input-interface.md)
  - [Story 2.2: Business Requirements Extraction](docs/stories/2.2.business-requirements-extraction-engine.md)
  - [Story 2.3: AI-Powered Clarification System](docs/stories/2.3.ai-powered-clarification-system.md)
- **[Epic 3 Stories](docs/stories/)** - AI Application Generation Engine
  - [Story 3.1: Complete Application Generation Orchestrator](docs/stories/3.1.complete-application-generation-orchestrator.md)
  - [Story 3.2: Dynamic Workflow Generation](docs/stories/3.2.dynamic-workflow-generation-system.md)
  - [Story 3.3: Dynamic Form Generation](docs/stories/3.3.dynamic-form-generation-system.md)
- **[Epic 4 Stories](docs/stories/)** - Embedded AI Chatbot System
  - [Story 4.1: Embedded Chatbot Framework](docs/stories/4.1.embedded-chatbot-framework.md)
  - [Story 4.2: Chatbot User Interaction Management](docs/stories/4.2.chatbot-user-interaction-management.md)
- **[Epic 5 Stories](docs/stories/)** - Business Process Automation & Template Creation
  - [Story 5.1: Business Process Automation Engine](docs/stories/5.1.business-process-automation-engine.md)
  - [Story 5.2: Template Generation System](docs/stories/5.2.template-generation-system.md)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### High Level Architecture
**Core Pattern**: Natural Language Business Application Generation architecture with embedded AI chatbot framework optimized for complete business system generation in <15 minutes.

**Key Architectural Layers** (as defined in [Architecture Document](docs/architecture.md)):
- **Natural Language Processing Layer**: Business description parsing and requirement extraction
- **AI Application Generation Layer**: Complete business system creation (workflows, forms, integrations, embedded AI chatbots)
- **Embedded AI Chatbot Layer**: Intelligent assistants within generated applications
- **Business Process Automation Layer**: Workflow execution, approval routing, AI-powered validation
- **Template Generation Layer**: Convert applications into reusable templates with embedded AI
- **Real-time AI Assistance Layer**: WebSocket-based intelligent guidance within generated applications

### Backend Architecture
- **Framework**: Express.js with TypeScript for thin API layer pattern
- **Database**: PostgreSQL with Drizzle ORM for enterprise-grade data persistence
- **Database Provider**: Neon serverless database with WebSocket support
- **AI Integration**: OpenAI GPT-4 primary, Anthropic Claude fallback with streaming support
- **API Design**: RESTful structure with `/api/nlp/`, `/api/applications/`, `/api/chatbots/` endpoints
- **Storage Layer**: MemStorage (MVP) → PostgreSQL (production) migration path
- **Real-time**: WebSocket integration for streaming AI responses and generation progress

### Frontend Architecture
- **Framework**: React 18.2 with TypeScript and Vite (no Vite config modifications)
- **UI Components**: Shadcn UI component system with Radix UI primitives
- **Styling**: Tailwind CSS with enterprise turquoise/orange color scheme
- **State Management**: TanStack React Query v5 (object form) for server state
- **Routing**: Wouter for lightweight client-side routing
- **AI Integration**: Streaming responses via WebSocket, real-time progress updates

### AI & Data Architecture
- **NLP Engine**: Multi-stage pipeline with OpenAI GPT-4 for business requirement extraction
- **Code Generation**: AI-powered React component, API endpoint, and schema generation
- **Embedded Intelligence**: Chatbot framework with contextual business knowledge
- **Data Models**: 12+ enterprise tables supporting RBAC, applications, workflows, chatbots (see [Architecture](docs/architecture.md#data-models))
- **Type Safety**: Full TypeScript with Drizzle-Zod validation across frontend/backend

### Service Architecture
- **Natural Language Processing**: `NLPService` for business description → structured requirements
- **Application Generation**: `ApplicationGenerationService` orchestrating complete system creation
- **Embedded Chatbots**: `ChatbotService` for AI assistants within generated applications
- **Workflow Engine**: `WorkflowExecutionService` for business process automation
- **Template System**: `TemplateGenerationService` for reusable application templates

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL database connectivity
- **drizzle-orm**: Type-safe SQL database toolkit and ORM
- **express**: Web application framework for Node.js
- **react**: Frontend user interface library
- **typescript**: Static type checking for JavaScript

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant API for styling
- **clsx**: Utility for constructing className strings conditionally

### State Management and Data Fetching
- **@tanstack/react-query**: Data fetching and caching library
- **@hookform/resolvers**: Form validation resolvers
- **zod**: TypeScript-first schema validation

### Development and Build Tools
- **vite**: Frontend build tool and development server
- **vitest**: Testing framework
- **tsx**: TypeScript execution environment for Node.js
- **@replit/vite-plugin-runtime-error-modal**: Development error handling

### Authentication and Session Management
- **connect-pg-simple**: PostgreSQL session store for Express
- **ws**: WebSocket library for real-time features

## Current Development Status

### ✅ **COMPLETED EPICS & STORIES**

**Epic 1: Foundation & Authentication Infrastructure**
- ✅ **[Story 1.2: Replit Auth Integration](docs/development-stories.md#story-12-replit-auth-integration)** - Complete OAuth flow, JWT management, RBAC foundation
- ✅ **[Story 1.4: Security Framework Foundation](docs/development-stories.md#story-14-security-framework-foundation)** - Enterprise-grade security with RBAC authorization
- ✅ **[Story 1.5: Authorization Response Hardening](docs/development-stories.md#story-15-authorization-response-hardening)** - Fail-closed security, information disclosure elimination

**Security Achievements (Architect Validated)**:
- **Production-Ready Authorization**: Real organization membership validation, storage-backed permissions
- **Enterprise RBAC**: 5 roles (owner/admin/manager/contributor/viewer) with 20+ granular permissions
- **Fail-Closed Security**: 403 responses for all authorization errors, zero information disclosure
- **Security Hardening**: Eliminated 500 errors, minimal error responses, NODE_ENV isolation

### 🚧 **IN PROGRESS / NEXT PRIORITIES**

**Epic 1 Remaining**: [Story 1.1: Project Foundation](docs/stories/1.1.project-foundation.md) - Final project setup validation

**Epic 2 Ready**: [Natural Language Processing Engine](docs/prd.md#epic-2-natural-language-processing-engine)
- [Story 2.1: Natural Language Input Interface](docs/stories/2.1.natural-language-input-interface.md)
- [Story 2.2: Business Requirements Extraction](docs/stories/2.2.business-requirements-extraction-engine.md)
- [Story 2.3: AI-Powered Clarification System](docs/stories/2.3.ai-powered-clarification-system.md)

### 📊 **Current Technical Status**
- **Core BMAD Implementation**: Natural Language Business Application Generator architecture established
- **Security**: Bank-grade authentication with enterprise RBAC suitable for Fortune 500 companies
- **Database**: Production-ready schema with 20+ enterprise tables (RBAC, tasks, integrations, analytics)
- **Server**: Running successfully on port 5000 with comprehensive authorization middleware
- **Documentation**: Complete BMAD documentation with individual story specifications

## BMAD Methodology Implementation

### Development Philosophy
This project exemplifies the **BMAD methodology** (Brainstorm, Model, Architect, Deliver) as the operating system for enterprise AI platform development:

1. **✅ Brainstorm**: [Project Brief](docs/brief.md) - $30B+ market opportunity, natural language application generation vision
2. **✅ Model**: [Product Requirements Document](docs/prd.md) - 5 epics, 20 user stories, functional/non-functional requirements
3. **✅ Architect**: [Architecture Document](docs/architecture.md) - Technical implementation, AI integration, data models, service patterns
4. **🚧 Deliver**: [Development Stories](docs/development-stories.md) - Granular implementation with acceptance criteria and technical specifications

### Enterprise Development Roadmap
Following strategic prioritization for maximum Fortune 500 business impact (as defined in [PRD Epic List](docs/prd.md#epic-list)):

**Epic 1: Foundation & Authentication Infrastructure** ✅ **75% COMPLETE**
- Enterprise-grade security, RBAC authorization, Replit Auth integration

**Epic 2: Natural Language Processing Engine** 🚧 **NEXT**
- Business description parsing, requirement extraction, AI-powered clarification

**Epic 3: AI Application Generation Engine** 📋 **PLANNED**
- Complete business system creation, workflow/form/integration generation

**Epic 4: Embedded AI Chatbot System** 📋 **PLANNED**
- Intelligent assistants within generated applications, contextual guidance

**Epic 5: Business Process Automation & Template Creation** 📋 **PLANNED**
- Workflow execution, template generation, reusable business patterns

### Success Metrics & Goals
- **Generation Speed**: <15 minutes from description to deployed application
- **Market Target**: $2M+ ARR, 100+ Fortune 500 customers
- **AI Intelligence**: 100% of generated applications include embedded AI assistance
- **User Experience**: 60% completion time reduction via AI guidance
- **Platform Reliability**: 99.9% uptime, <200ms API response times