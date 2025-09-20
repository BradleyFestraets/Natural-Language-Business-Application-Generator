import { BusinessRequirement } from '@shared/schema';
import OpenAI from 'openai';
import { z } from 'zod';

const GeneratedIntegrationSchema = z.object({
  name: z.string(),
  type: z.enum(['api', 'webhook', 'oauth', 'database', 'messaging', 'payment', 'storage']),
  code: z.string(),
  path: z.string(),
  provider: z.string(),
  config: z.record(z.any()),
  credentials: z.array(z.string()).optional(),
  endpoints: z.array(z.string()).optional()
});

export type GeneratedIntegration = z.infer<typeof GeneratedIntegrationSchema>;

export class IntegrationGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateIntegrations(
    requirement: BusinessRequirement
  ): Promise<GeneratedIntegration[]> {
    const integrations: GeneratedIntegration[] = [];

    try {
      // Identify required integrations from business requirements
      const requiredIntegrations = this.identifyRequiredIntegrations(requirement);

      // Generate each identified integration
      for (const integrationType of requiredIntegrations) {
        const integration = await this.generateIntegration(integrationType, requirement);
        if (integration) {
          integrations.push(integration);
        }
      }

      // Always include authentication integration
      const authIntegration = await this.generateAuthIntegration(requirement);
      integrations.push(authIntegration);

      // Add database integration if data persistence is needed
      if (this.requiresDatabase(requirement)) {
        const dbIntegration = await this.generateDatabaseIntegration(requirement);
        integrations.push(dbIntegration);
      }

      // Add payment integration if e-commerce features detected
      if (this.requiresPaymentProcessing(requirement)) {
        const paymentIntegration = await this.generatePaymentIntegration(requirement);
        integrations.push(paymentIntegration);
      }

      return integrations;
    } catch (error) {
      console.error('Error generating integrations:', error);
      return this.generateFallbackIntegrations(requirement);
    }
  }

  private identifyRequiredIntegrations(requirement: BusinessRequirement): string[] {
    const integrations: string[] = [];
    const description = requirement.originalDescription.toLowerCase();
    
    // API integrations
    if (description.includes('api') || description.includes('external service')) {
      integrations.push('api');
    }
    
    // Webhook integrations
    if (description.includes('webhook') || description.includes('notification') || description.includes('real-time')) {
      integrations.push('webhook');
    }
    
    // OAuth integrations
    if (description.includes('login with') || description.includes('oauth') || description.includes('social login')) {
      integrations.push('oauth');
    }
    
    // Messaging integrations
    if (description.includes('email') || description.includes('sms') || description.includes('notification')) {
      integrations.push('messaging');
    }
    
    // Storage integrations
    if (description.includes('upload') || description.includes('file') || description.includes('document')) {
      integrations.push('storage');
    }
    
    return integrations;
  }

  private async generateIntegration(
    type: string,
    requirement: BusinessRequirement
  ): Promise<GeneratedIntegration | null> {
    try {
      switch (type) {
        case 'api':
          return this.generateAPIIntegration(requirement);
        case 'webhook':
          return this.generateWebhookIntegration(requirement);
        case 'oauth':
          return this.generateOAuthIntegration(requirement);
        case 'messaging':
          return this.generateMessagingIntegration(requirement);
        case 'storage':
          return this.generateStorageIntegration(requirement);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error generating ${type} integration:`, error);
      return null;
    }
  }

  private async generateAuthIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { dbStorage } from '../storage';

export class AuthIntegration {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
  private readonly TOKEN_EXPIRY = '24h';

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      
      // Check if user exists
      const existingUser = await dbStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await dbStorage.createUser({
        email,
        password: hashedPassword,
        name
      });
      
      // Generate token
      const token = this.generateToken(user.id);
      
      res.status(201).json({ user, token });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await dbStorage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate token
      const token = this.generateToken(user.id);
      
      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }

  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      const user = await dbStorage.getUser(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      (req as any).user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }
}

export const authIntegration = new AuthIntegration();`;

    return {
      name: 'AuthIntegration',
      type: 'api',
      code,
      path: 'server/integrations/authIntegration.ts',
      provider: 'internal',
      config: {
        tokenExpiry: '24h',
        hashRounds: 10
      },
      credentials: ['JWT_SECRET'],
      endpoints: ['/api/auth/register', '/api/auth/login', '/api/auth/logout']
    };
  }

  private async generateDatabaseIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

export class DatabaseIntegration {
  private pool: Pool;
  private db: any;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/app'
    });
    
    this.db = drizzle(this.pool, { schema });
  }

  async connect() {
    try {
      await this.pool.connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.pool.end();
  }

  getDb() {
    return this.db;
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return await this.db.transaction(callback);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return !!result;
    } catch {
      return false;
    }
  }
}

export const databaseIntegration = new DatabaseIntegration();`;

    return {
      name: 'DatabaseIntegration',
      type: 'database',
      code,
      path: 'server/integrations/databaseIntegration.ts',
      provider: 'postgresql',
      config: {
        poolSize: 20,
        idleTimeout: 30000
      },
      credentials: ['DATABASE_URL']
    };
  }

  private async generatePaymentIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import Stripe from 'stripe';

export class PaymentIntegration {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'usd') {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true
        }
      });
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      throw error;
    }
  }

  async createCustomer(email: string, name?: string) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name
      });
      
      return customer;
    } catch (error) {
      console.error('Customer creation failed:', error);
      throw error;
    }
  }

  async createSubscription(customerId: string, priceId: string) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });
      
      return subscription;
    } catch (error) {
      console.error('Subscription creation failed:', error);
      throw error;
    }
  }

  async handleWebhook(payload: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          console.log('Payment succeeded:', event.data.object);
          break;
        case 'payment_intent.failed':
          console.log('Payment failed:', event.data.object);
          break;
        case 'customer.subscription.created':
          console.log('Subscription created:', event.data.object);
          break;
        case 'customer.subscription.deleted':
          console.log('Subscription cancelled:', event.data.object);
          break;
        default:
          console.log('Unhandled event type:', event.type);
      }
      
      return { received: true };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }
}

export const paymentIntegration = new PaymentIntegration();`;

    return {
      name: 'PaymentIntegration',
      type: 'payment',
      code,
      path: 'server/integrations/paymentIntegration.ts',
      provider: 'stripe',
      config: {
        currency: 'usd',
        webhookEndpoint: '/api/webhooks/stripe'
      },
      credentials: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
      endpoints: ['/api/payments/intent', '/api/payments/subscribe', '/api/webhooks/stripe']
    };
  }

  private async generateAPIIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import axios from 'axios';

export class APIIntegration {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.EXTERNAL_API_URL || 'https://api.example.com';
    this.apiKey = process.env.EXTERNAL_API_KEY || '';
  }

  async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: \`\${this.baseURL}\${endpoint}\`,
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint: string) {
    return this.makeRequest(endpoint, 'GET');
  }

  async post(endpoint: string, data: any) {
    return this.makeRequest(endpoint, 'POST', data);
  }

  async put(endpoint: string, data: any) {
    return this.makeRequest(endpoint, 'PUT', data);
  }

  async delete(endpoint: string) {
    return this.makeRequest(endpoint, 'DELETE');
  }
}

export const apiIntegration = new APIIntegration();`;

    return {
      name: 'APIIntegration',
      type: 'api',
      code,
      path: 'server/integrations/apiIntegration.ts',
      provider: 'external',
      config: {
        timeout: 30000,
        retryAttempts: 3
      },
      credentials: ['EXTERNAL_API_KEY', 'EXTERNAL_API_URL']
    };
  }

  private async generateWebhookIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import { Request, Response } from 'express';
import crypto from 'crypto';

export class WebhookIntegration {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature
      const signature = req.headers['x-webhook-signature'] as string;
      if (!this.verifySignature(req.body, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Process webhook payload
      const { event, data } = req.body;
      
      switch (event) {
        case 'user.created':
          await this.handleUserCreated(data);
          break;
        case 'order.placed':
          await this.handleOrderPlaced(data);
          break;
        case 'payment.completed':
          await this.handlePaymentCompleted(data);
          break;
        default:
          console.log('Unhandled webhook event:', event);
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook processing failed:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private verifySignature(payload: any, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private async handleUserCreated(data: any) {
    console.log('User created:', data);
    // Implement user creation logic
  }

  private async handleOrderPlaced(data: any) {
    console.log('Order placed:', data);
    // Implement order processing logic
  }

  private async handlePaymentCompleted(data: any) {
    console.log('Payment completed:', data);
    // Implement payment confirmation logic
  }
}

export const webhookIntegration = new WebhookIntegration();`;

    return {
      name: 'WebhookIntegration',
      type: 'webhook',
      code,
      path: 'server/integrations/webhookIntegration.ts',
      provider: 'custom',
      config: {
        verifySignature: true,
        retryOnFailure: true
      },
      credentials: ['WEBHOOK_SECRET'],
      endpoints: ['/api/webhooks/incoming']
    };
  }

  private async generateOAuthIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import { Issuer } from 'openid-client';
import { Request, Response } from 'express';

export class OAuthIntegration {
  private client: any;

  async initialize() {
    try {
      const googleIssuer = await Issuer.discover('https://accounts.google.com');
      
      this.client = new googleIssuer.Client({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uris: [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback'],
        response_types: ['code']
      });
    } catch (error) {
      console.error('OAuth initialization failed:', error);
      throw error;
    }
  }

  getAuthorizationUrl() {
    return this.client.authorizationUrl({
      scope: 'openid email profile',
      state: crypto.randomBytes(32).toString('hex')
    });
  }

  async handleCallback(req: Request, res: Response) {
    try {
      const params = this.client.callbackParams(req);
      const tokenSet = await this.client.callback(
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback',
        params
      );
      
      const userinfo = await this.client.userinfo(tokenSet.access_token);
      
      // Process user info and create/update user
      const user = {
        email: userinfo.email,
        name: userinfo.name,
        picture: userinfo.picture,
        provider: 'google'
      };
      
      // Create session or JWT token
      req.session.user = user;
      
      res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback failed:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
}

export const oauthIntegration = new OAuthIntegration();`;

    return {
      name: 'OAuthIntegration',
      type: 'oauth',
      code,
      path: 'server/integrations/oauthIntegration.ts',
      provider: 'google',
      config: {
        scopes: ['openid', 'email', 'profile'],
        authorizationEndpoint: '/auth/google',
        callbackEndpoint: '/auth/google/callback'
      },
      credentials: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
      endpoints: ['/auth/google', '/auth/google/callback']
    };
  }

  private async generateMessagingIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import nodemailer from 'nodemailer';
import twilio from 'twilio';

export class MessagingIntegration {
  private emailTransporter: any;
  private twilioClient: any;

  constructor() {
    // Email configuration
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // SMS configuration (Twilio)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@app.com',
        to,
        subject,
        text: text || html,
        html
      });
      
      return { messageId: info.messageId, success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendSMS(to: string, message: string) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });
      
      return { messageId: result.sid, success: true };
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  async sendNotification(userId: string, message: string, channels: ('email' | 'sms' | 'push')[] = ['email']) {
    const results = [];
    
    for (const channel of channels) {
      switch (channel) {
        case 'email':
          // Get user email and send
          // results.push(await this.sendEmail(...));
          break;
        case 'sms':
          // Get user phone and send
          // results.push(await this.sendSMS(...));
          break;
        case 'push':
          // Send push notification
          break;
      }
    }
    
    return results;
  }
}

export const messagingIntegration = new MessagingIntegration();`;

    return {
      name: 'MessagingIntegration',
      type: 'messaging',
      code,
      path: 'server/integrations/messagingIntegration.ts',
      provider: 'multi',
      config: {
        emailProvider: 'smtp',
        smsProvider: 'twilio',
        defaultChannel: 'email'
      },
      credentials: [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER'
      ],
      endpoints: ['/api/notifications/send']
    };
  }

  private async generateStorageIntegration(requirement: BusinessRequirement): Promise<GeneratedIntegration> {
    const code = `import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

export class StorageIntegration {
  private s3Client: S3Client;
  private bucketName: string;
  private uploadMiddleware: any;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || 'app-storage';
    
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // Configure multer for file uploads
    const storage = multer.memoryStorage();
    this.uploadMiddleware = multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        // Add file type validation here
        cb(null, true);
      }
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'uploads') {
    try {
      const key = \`\${folder}/\${uuidv4()}-\${file.originalname}\`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      });
      
      await this.s3Client.send(command);
      
      return {
        key,
        url: \`https://\${this.bucketName}.s3.amazonaws.com/\${key}\`,
        size: file.size,
        contentType: file.mimetype
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Signed URL generation failed:', error);
      throw error;
    }
  }

  async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      await this.s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  }

  getUploadMiddleware() {
    return this.uploadMiddleware;
  }
}

export const storageIntegration = new StorageIntegration();`;

    return {
      name: 'StorageIntegration',
      type: 'storage',
      code,
      path: 'server/integrations/storageIntegration.ts',
      provider: 'aws-s3',
      config: {
        maxFileSize: 10485760,
        allowedMimeTypes: ['image/*', 'application/pdf', 'text/*']
      },
      credentials: [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'S3_BUCKET_NAME'
      ],
      endpoints: ['/api/upload', '/api/files/:key']
    };
  }

  private requiresDatabase(requirement: BusinessRequirement): boolean {
    return true; // Most applications need database
  }

  private requiresPaymentProcessing(requirement: BusinessRequirement): boolean {
    const description = requirement.originalDescription.toLowerCase();
    const paymentKeywords = ['payment', 'subscription', 'billing', 'checkout', 'purchase', 'e-commerce', 'shopping'];
    
    return paymentKeywords.some(keyword => description.includes(keyword));
  }

  private generateFallbackIntegrations(requirement: BusinessRequirement): GeneratedIntegration[] {
    return [
      {
        name: 'BasicAuthIntegration',
        type: 'api',
        code: '// Basic authentication integration',
        path: 'server/integrations/authIntegration.ts',
        provider: 'internal',
        config: {},
        endpoints: ['/api/auth/login', '/api/auth/logout']
      },
      {
        name: 'BasicDatabaseIntegration',
        type: 'database',
        code: '// Database integration',
        path: 'server/integrations/databaseIntegration.ts',
        provider: 'postgresql',
        config: {},
        credentials: ['DATABASE_URL']
      }
    ];
  }
}