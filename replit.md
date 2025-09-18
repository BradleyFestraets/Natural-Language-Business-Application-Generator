# Enterprise AI Application Platform

## Overview

This is an enterprise-grade AI application platform built as a full-stack web application using React, TypeScript, and Express.js. The platform is designed to create a natural language business application generator that transforms plain English descriptions into complete business systems with embedded AI chatbots. The system enables Fortune 500 companies to deploy custom business applications in under 15 minutes by simply describing their requirements in natural language.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript for type safety and developer experience
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations and migrations
- **Database Provider**: Neon serverless database with WebSocket support for scalability
- **API Design**: RESTful API structure with comprehensive validation using Zod schemas
- **Session Management**: Built-in session handling for enterprise authentication
- **Storage Layer**: Abstracted storage interface supporting both in-memory (development) and PostgreSQL (production)

### Frontend Architecture
- **Framework**: React 18.2 with TypeScript and Vite for fast development and build processes
- **UI Components**: Shadcn UI component system with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system following enterprise SaaS patterns
- **State Management**: TanStack React Query for server state and caching
- **Routing**: Client-side routing for single-page application experience
- **Design System**: Custom color palette with turquoise primary and orange accent colors

### Data Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Schema Design**: Comprehensive schema supporting business requirements, generated applications, embedded chatbots, and workflow executions
- **Type Safety**: Full TypeScript integration with Drizzle-Zod for runtime validation
- **Migration Strategy**: Database migrations managed through Drizzle Kit

### Service Architecture
- **Natural Language Processing**: Dedicated NLP service for parsing business descriptions
- **Application Generation**: AI-powered service for creating complete business applications
- **Embedded Chatbots**: Framework for AI assistants within generated applications
- **Workflow Engine**: Business process automation with intelligent routing
- **Template System**: Reusable application templates with built-in AI guidance

### Development Architecture
- **Monorepo Structure**: Organized with client/, server/, and shared/ directories
- **Build System**: Vite for frontend bundling, ESBuild for backend compilation
- **Development Tools**: Hot reload for both frontend and backend during development
- **Testing**: Vitest for unit testing with comprehensive test coverage
- **Code Quality**: ESLint and Prettier for code formatting and quality

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

### BMAD Method Integration
- **bmad-method**: AI agent framework for agile development workflow
- Includes specialized agents (analyst, architect, PM, dev, QA, etc.)
- Provides structured development methodology and task templates
- Supports both greenfield and brownfield project development