import twilio from 'twilio';
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement } from "@shared/schema";

export interface TelephonyProviderInterface {
  makeCall: (to: string, from: string, url: string) => Promise<string>;
  sendSMS: (to: string, from: string, message: string) => Promise<string>;
  createConference: (name: string, options?: any) => Promise<string>;
  getCallStatus: (callSid: string) => Promise<any>;
  listCalls: (options?: any) => Promise<any[]>;
}

export interface TelephonyRequest {
  action: 'call' | 'sms' | 'conference' | 'status' | 'list';
  to?: string;
  from?: string;
  message?: string;
  url?: string; // TwiML URL for call handling
  conferenceName?: string;
  callSid?: string;
}

export interface TelephonyResponse {
  success: boolean;
  sid?: string;
  status?: string;
  data?: any;
  error?: string;
}

export interface CallConfiguration {
  provider: 'twilio' | 'vonage' | 'aws' | 'azure';
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  applicationSid?: string;
}

export interface TelephonyAnalytics {
  totalCalls: number;
  totalSMS: number;
  averageCallDuration: number;
  callSuccessRate: number;
  smsDeliveryRate: number;
  costMetrics: {
    totalCost: number;
    averageCostPerCall: number;
    averageCostPerSMS: number;
  };
}

/**
 * TelephonyService handles phone calls, SMS, and conference calling
 * with provider abstraction for future flexibility
 */
export class TelephonyService {
  private twilioClient: any = null;
  private providers: Map<string, TelephonyProviderInterface> = new Map();
  private configuration: CallConfiguration;

  constructor(config: CallConfiguration = { provider: 'twilio' }) {
    this.configuration = config;

    if (config.provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize telephony providers
   */
  private initializeProviders() {
    // Twilio provider
    if (this.twilioClient) {
      const twilioProvider: TelephonyProviderInterface = {
        makeCall: async (to: string, from: string, url: string): Promise<string> => {
          try {
            const call = await this.twilioClient.calls.create({
              to,
              from,
              url,
              method: 'GET'
            });
            return call.sid;
          } catch (error) {
            console.error('Twilio call error:', error);
            throw new Error(`Failed to make call: ${error}`);
          }
        },

        sendSMS: async (to: string, from: string, message: string): Promise<string> => {
          try {
            const sms = await this.twilioClient.messages.create({
              to,
              from,
              body: message
            });
            return sms.sid;
          } catch (error) {
            console.error('Twilio SMS error:', error);
            throw new Error(`Failed to send SMS: ${error}`);
          }
        },

        createConference: async (name: string, options: any = {}): Promise<string> => {
          try {
            // Create TwiML for conference
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.dial().conference(name, {
              startConferenceOnEnter: true,
              endConferenceOnExit: false,
              ...options
            });

            // For now, return a mock conference ID
            // In production, you'd create actual conference resources
            return `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          } catch (error) {
            console.error('Twilio conference error:', error);
            throw new Error(`Failed to create conference: ${error}`);
          }
        },

        getCallStatus: async (callSid: string): Promise<any> => {
          try {
            const call = await this.twilioClient.calls(callSid).fetch();
            return {
              sid: call.sid,
              status: call.status,
              duration: call.duration,
              from: call.from,
              to: call.to,
              startTime: call.startTime,
              endTime: call.endTime
            };
          } catch (error) {
            console.error('Twilio call status error:', error);
            throw new Error(`Failed to get call status: ${error}`);
          }
        },

        listCalls: async (options: any = {}): Promise<any[]> => {
          try {
            const calls = await this.twilioClient.calls.list({
              limit: options.limit || 20,
              status: options.status,
              from: options.from,
              to: options.to,
              startTimeAfter: options.startTimeAfter,
              startTimeBefore: options.startTimeBefore
            });
            return calls.map(call => ({
              sid: call.sid,
              status: call.status,
              duration: call.duration,
              from: call.from,
              to: call.to,
              direction: call.direction,
              startTime: call.startTime,
              endTime: call.endTime
            }));
          } catch (error) {
            console.error('Twilio list calls error:', error);
            throw new Error(`Failed to list calls: ${error}`);
          }
        }
      };

      this.providers.set('twilio', twilioProvider);
    }

    // Mock providers for other services (ready for implementation)
    const mockProvider: TelephonyProviderInterface = {
      makeCall: async (to: string, from: string, url: string): Promise<string> => {
        return `mock_call_${Date.now()}`;
      },

      sendSMS: async (to: string, from: string, message: string): Promise<string> => {
        return `mock_sms_${Date.now()}`;
      },

      createConference: async (name: string, options?: any): Promise<string> => {
        return `mock_conf_${Date.now()}`;
      },

      getCallStatus: async (callSid: string): Promise<any> => {
        return {
          sid: callSid,
          status: 'completed',
          duration: 120
        };
      },

      listCalls: async (options?: any): Promise<any[]> => {
        return [{
          sid: 'mock_call_1',
          status: 'completed',
          duration: 120,
          from: '+1234567890',
          to: '+0987654321',
          direction: 'outbound'
        }];
      }
    };

    this.providers.set('vonage', mockProvider);
    this.providers.set('aws', mockProvider);
    this.providers.set('azure', mockProvider);
  }

  /**
   * Process telephony requests
   */
  async processTelephonyRequest(request: TelephonyRequest): Promise<TelephonyResponse> {
    try {
      const provider = this.providers.get(this.configuration.provider);
      if (!provider) {
        throw new Error(`No provider available for ${this.configuration.provider}`);
      }

      switch (request.action) {
        case 'call':
          return await this.makeCall(provider, request);

        case 'sms':
          return await this.sendSMS(provider, request);

        case 'conference':
          return await this.createConference(provider, request);

        case 'status':
          return await this.getCallStatus(provider, request);

        case 'list':
          return await this.listCalls(provider, request);

        default:
          throw new Error(`Unknown telephony action: ${request.action}`);
      }
    } catch (error) {
      console.error('Telephony request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Make a phone call
   */
  private async makeCall(provider: TelephonyProviderInterface, request: TelephonyRequest): Promise<TelephonyResponse> {
    if (!request.to || !request.from || !request.url) {
      return {
        success: false,
        error: 'Missing required parameters: to, from, url'
      };
    }

    try {
      const callSid = await provider.makeCall(request.to, request.from, request.url);
      return {
        success: true,
        sid: callSid,
        status: 'initiated'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Call failed'
      };
    }
  }

  /**
   * Send SMS message
   */
  private async sendSMS(provider: TelephonyProviderInterface, request: TelephonyRequest): Promise<TelephonyResponse> {
    if (!request.to || !request.from || !request.message) {
      return {
        success: false,
        error: 'Missing required parameters: to, from, message'
      };
    }

    try {
      const messageSid = await provider.sendSMS(request.to, request.from, request.message);
      return {
        success: true,
        sid: messageSid,
        status: 'sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS failed'
      };
    }
  }

  /**
   * Create conference call
   */
  private async createConference(provider: TelephonyProviderInterface, request: TelephonyRequest): Promise<TelephonyResponse> {
    if (!request.conferenceName) {
      return {
        success: false,
        error: 'Missing required parameter: conferenceName'
      };
    }

    try {
      const conferenceSid = await provider.createConference(request.conferenceName, {
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        maxParticipants: 10,
        record: false
      });

      return {
        success: true,
        sid: conferenceSid,
        status: 'created'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conference creation failed'
      };
    }
  }

  /**
   * Get call status
   */
  private async getCallStatus(provider: TelephonyProviderInterface, request: TelephonyRequest): Promise<TelephonyResponse> {
    if (!request.callSid) {
      return {
        success: false,
        error: 'Missing required parameter: callSid'
      };
    }

    try {
      const callData = await provider.getCallStatus(request.callSid);
      return {
        success: true,
        data: callData,
        status: callData.status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get call status'
      };
    }
  }

  /**
   * List calls with filtering
   */
  private async listCalls(provider: TelephonyProviderInterface, request: TelephonyRequest): Promise<TelephonyResponse> {
    try {
      const calls = await provider.listCalls({
        limit: 20,
        status: request.action === 'list' ? request.status : undefined,
        from: request.from,
        to: request.to
      });

      return {
        success: true,
        data: calls
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list calls'
      };
    }
  }

  /**
   * Generate TwiML for call handling
   */
  generateTwiml(action: string, parameters: any = {}): string {
    const twiml = new twilio.twiml.VoiceResponse();

    switch (action) {
      case 'welcome':
        twiml.say('Welcome to our business application. Please wait while we connect you.');
        twiml.pause({ length: 1 });
        break;

      case 'menu':
        twiml.gather({
          numDigits: 1,
          action: parameters.actionUrl || '/handle-menu',
          method: 'POST'
        }).say('Press 1 for sales, 2 for support, 3 for general information.');
        break;

      case 'transfer':
        twiml.dial(parameters.phoneNumber || '+1234567890');
        break;

      case 'voicemail':
        twiml.say('Please leave a message after the tone.');
        twiml.record({
          maxLength: 30,
          action: parameters.actionUrl || '/handle-recording',
          transcribe: true
        });
        break;

      case 'conference':
        twiml.say(`Joining conference: ${parameters.conferenceName || 'Main Conference'}`);
        twiml.dial().conference(parameters.conferenceName || 'main', {
          startConferenceOnEnter: true,
          endConferenceOnExit: false
        });
        break;

      default:
        twiml.say('Thank you for calling. Goodbye.');
        twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Generate telephony analytics
   */
  async generateAnalytics(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<TelephonyAnalytics> {
    try {
      const provider = this.providers.get(this.configuration.provider);
      if (!provider) {
        throw new Error('No provider available for analytics');
      }

      const calls = await provider.listCalls({ limit: 100 });

      // Calculate analytics
      const totalCalls = calls.length;
      const completedCalls = calls.filter(call => call.status === 'completed').length;
      const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
      const successRate = totalCalls > 0 ? completedCalls / totalCalls : 0;

      // Mock cost calculations (in production, you'd get this from provider billing)
      const totalCost = calls.length * 0.05; // $0.05 per call
      const averageCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

      return {
        totalCalls,
        totalSMS: 0, // Would be calculated from SMS data
        averageCallDuration: averageDuration,
        callSuccessRate: successRate,
        smsDeliveryRate: 1.0, // Mock - would be calculated from actual delivery data
        costMetrics: {
          totalCost,
          averageCostPerCall,
          averageCostPerSMS: 0.01 // $0.01 per SMS
        }
      };
    } catch (error) {
      console.error('Analytics generation error:', error);
      throw new Error(`Failed to generate telephony analytics: ${error}`);
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Get provider configuration
   */
  getConfiguration(): CallConfiguration {
    return { ...this.configuration };
  }

  /**
   * Update provider configuration
   */
  updateConfiguration(config: Partial<CallConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }
}
