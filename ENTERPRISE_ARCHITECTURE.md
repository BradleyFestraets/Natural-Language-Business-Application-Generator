# Enterprise AI Platform - Technical Architecture

## System Overview

The Enterprise AI Application Platform is built as a modern, scalable web application designed for Fortune 500 companies. The architecture follows enterprise patterns with strong separation of concerns, security-first design, and event-driven communication.

## Core Architecture Principles

### Security-First Design
- **Zero Trust**: No client-controlled user identification
- **Multi-Tenancy**: Organization-level data isolation
- **RBAC**: Role-based authorization on all endpoints
- **Session Security**: PostgreSQL-backed sessions with CSRF protection

### Event-Driven Architecture
- **Pub/Sub Messaging**: In-memory EventBus for real-time communication
- **Background Processing**: Reliable job execution with retry logic
- **Audit Trail**: All business events captured for compliance
- **Integration Hooks**: Webhook-based external system connectivity

### Scalability & Performance
- **Stateless Services**: Horizontal scaling capability
- **Caching Strategy**: TanStack Query for client-side caching
- **Database Optimization**: Indexed queries and connection pooling
- **Real-Time Updates**: WebSocket connections for live data

## System Components

### 1. Authentication & Authorization Layer

#### Replit Auth Integration
```typescript
// OAuth 2.0 + OpenID Connect flow
GET  /api/login      // Initiate OAuth
GET  /api/callback   // Handle OAuth callback  
POST /api/logout     // Terminate session
GET  /api/auth/user  // Current user info
```

#### Authorization Middleware
```typescript
interface AuthContext {
  userId: string;           // From session claims
  organizationId: string;   // Multi-tenant isolation
  roles: string[];          // RBAC permissions
}

// Applied to all protected routes
app.use('/api/*', isAuthenticated, authorize(['admin', 'user']));
```

### 2. RBAC Control Plane

#### Data Model
```typescript
// Organizations (Multi-tenancy)
organizations: {
  id: varchar().primaryKey(),
  name: varchar().notNull(),
  settings: jsonb(),
  createdAt: timestamp()
}

// Users with organization membership
users: {
  id: varchar().primaryKey(),
  email: varchar().unique(),
  organizationId: varchar().references(() => organizations.id)
}

// Role-based permissions
roles: {
  id: varchar().primaryKey(),
  name: varchar().notNull(),
  permissions: varchar().array()
}

role_bindings: {
  userId: varchar().references(() => users.id),
  roleId: varchar().references(() => roles.id),
  organizationId: varchar().references(() => organizations.id)
}
```

#### API Routes
```typescript
// Admin-only organization management
POST   /api/admin/organizations      // Create organization
GET    /api/admin/organizations      // List organizations
PUT    /api/admin/organizations/:id  // Update organization
DELETE /api/admin/organizations/:id  // Delete organization

// User and role management
POST   /api/admin/users             // Create user
GET    /api/admin/users             // List users (org-scoped)
POST   /api/admin/role-bindings     // Assign roles
DELETE /api/admin/role-bindings     // Remove roles
```

### 3. Tasks & Approvals Engine

#### Workflow State Machine
```typescript
enum TaskStatus {
  DRAFT = 'draft',
  ASSIGNED = 'assigned', 
  IN_PROGRESS = 'in_progress',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

enum ApprovalState {
  PENDING = 'pending',
  APPROVED = 'approved', 
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}
```

#### API Design
```typescript
// Task management
POST   /api/tasks              // Create task
GET    /api/tasks              // List tasks (org-scoped)
PUT    /api/tasks/:id          // Update task
POST   /api/tasks/:id/assign   // Assign to user
POST   /api/tasks/:id/comments // Add comment

// Approval workflows  
POST   /api/approvals           // Create approval request
GET    /api/approvals           // List approvals (user-scoped)
PUT    /api/approvals/:id       // Approve/reject
GET    /api/approvals/:id/history // Audit trail
```

### 4. EventBus & Background Processing

#### Event System Architecture
```typescript
interface BusinessEvent {
  id: string;
  type: 'TaskCreated' | 'ApprovalUpdated' | 'UserAssigned';
  payload: any;
  actorId: string;
  resourceId: string;
  timestamp: Date;
}

class EventBus {
  publish(event: BusinessEvent): void;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}
```

#### Background Worker
```typescript
interface Job {
  id: string;
  type: 'SendEmail' | 'SendSlackMessage' | 'SendWebhook';
  payload: any;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
}

class BackgroundWorker {
  enqueue(job: Job): void;
  process(): Promise<void>;
  retry(job: Job): void;
}
```

### 5. Notification System

#### Multi-Channel Delivery
```typescript
// Notification channels
channels: {
  id: varchar().primaryKey(),
  type: 'email' | 'slack' | 'webhook',
  configuration: jsonb(),
  organizationId: varchar()
}

// Delivery tracking
deliveries: {
  id: varchar().primaryKey(),
  channelId: varchar(),
  status: 'pending' | 'sent' | 'failed',
  attemptCount: integer(),
  sentAt: timestamp()
}
```

#### Integration Patterns
```typescript
// Email via SMTP
interface EmailConfig {
  smtpHost: string;
  username: string;
  password: string;
}

// Slack via Webhook
interface SlackConfig {
  webhookUrl: string;
  channel: string;
}

// Generic Webhook
interface WebhookConfig {
  url: string;
  headers: Record<string, string>;
  method: 'POST' | 'PUT';
}
```

## Data Architecture

### Database Schema Strategy
- **Single Database**: PostgreSQL with tenant isolation via organizationId
- **Index Strategy**: Composite indexes on (organizationId, createdAt) for performance
- **Audit Tables**: Separate audit_logs table for compliance requirements
- **Session Storage**: Dedicated sessions table for authentication

### Type Safety Pipeline
```typescript
// Schema Definition (Drizzle)
export const tasks = pgTable('tasks', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar('organization_id').notNull(),
  // ... other fields
});

// Zod Validation Schemas
export const createTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true
});

// TypeScript Types
export type Task = typeof tasks.$inferSelect;
export type CreateTask = z.infer<typeof createTaskSchema>;
```

## Security Model

### Multi-Tenant Isolation
```typescript
// All queries automatically scoped by organization
const getUserTasks = async (userId: string, organizationId: string) => {
  return await db.select()
    .from(tasks)
    .where(and(
      eq(tasks.assigneeId, userId),
      eq(tasks.organizationId, organizationId)
    ));
};
```

### Authorization Patterns
```typescript
// Permission-based route protection
const authorize = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userPermissions = getUserPermissions(req.user.roles);
    if (!hasAnyPermission(userPermissions, permissions)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Deployment Architecture

### Production Environment
- **Application Server**: Node.js with clustering
- **Database**: PostgreSQL with connection pooling
- **Session Store**: PostgreSQL-backed sessions
- **File Storage**: Local filesystem with backup strategy
- **Monitoring**: Application logs and performance metrics

### Environment Configuration
```typescript
// Required environment variables
DATABASE_URL=postgresql://...     // Database connection
SESSION_SECRET=...               // Session encryption key
OPENAI_API_KEY=...              // AI service integration
NODE_ENV=production             // Environment mode
```

## Performance Considerations

### Database Performance
- Composite indexes on frequently queried columns
- Pagination for large result sets
- Connection pooling for concurrent requests
- Query optimization with EXPLAIN ANALYZE

### Frontend Performance  
- Component-level code splitting
- TanStack Query for intelligent caching
- Optimistic updates for better UX
- Real-time updates via WebSocket connections

### Scalability Patterns
- Stateless application design for horizontal scaling
- Event-driven architecture for loose coupling
- Background job processing for heavy operations
- CDN-ready static asset serving