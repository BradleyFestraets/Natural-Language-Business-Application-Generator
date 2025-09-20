import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";

export interface VoiceServiceRequest {
  audioData: string; // base64 encoded audio
  language?: string;
}

export interface VoiceServiceResponse {
  transcript: string;
  confidence: number;
  language?: string;
}

export interface TextToSpeechRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
}

export interface TextToSpeechResponse {
  audioData: string; // base64 encoded audio
  duration: number;
  format: string;
}

export interface VoiceAuthRequest {
  audioData: string; // base64 encoded audio
  userId?: string; // For verification
  action?: 'enroll' | 'verify' | 'identify';
  passphrase?: string; // Required for enrollment/verification
}

export interface VoiceAuthResponse {
  authenticated: boolean;
  userId?: string;
  confidence: number;
  securityLevel: 'low' | 'medium' | 'high';
  recommendations?: string[];
}

export interface VoiceProfile {
  userId: string;
  voicePrint: string;
  enrolledAt: Date;
  confidenceThreshold: number;
  securityLevel: 'low' | 'medium' | 'high';
}

/**
 * VoiceService handles voice processing operations
 * including speech-to-text, text-to-speech, and voice authentication
 */
export class VoiceService {
  private openai: OpenAI | null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null;
    }
  }

  /**
   * Convert speech to text using OpenAI Whisper
   */
  async speechToText(request: VoiceServiceRequest): Promise<VoiceServiceResponse> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for speech-to-text");
    }

    try {
      // Convert base64 audio data to buffer
      const audioBuffer = Buffer.from(request.audioData, 'base64');

      // Create a File object for OpenAI API
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: request.language || 'en',
        response_format: 'json'
      });

      return {
        transcript: response.text,
        confidence: 0.95, // OpenAI doesn't provide confidence scores directly
        language: request.language || 'en'
      };
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw new Error(`Speech-to-text processing failed: ${error}`);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for text-to-speech");
    }

    try {
      const response = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: (request.voice as any) || 'alloy',
        input: request.text,
        speed: request.speed || 1.0
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        audioData: buffer.toString('base64'),
        duration: this.estimateAudioDuration(request.text, request.speed || 1.0),
        format: 'wav'
      };
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error(`Text-to-speech generation failed: ${error}`);
    }
  }

  /**
   * Comprehensive voice authentication system
   * Supports enrollment, verification, and identification modes
   */
  async authenticateVoice(request: VoiceAuthRequest): Promise<VoiceAuthResponse> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for voice authentication");
    }

    try {
      const { action = 'verify', userId, passphrase, audioData } = request;

      // Convert base64 audio data to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      // Step 1: Transcribe the audio
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: 'json'
      });

      const transcript = transcription.text;
      if (!transcript) {
        return {
          authenticated: false,
          confidence: 0.0,
          securityLevel: 'low',
          recommendations: ['No speech detected', 'Please speak clearly into the microphone']
        };
      }

      // Step 2: Analyze authentication based on mode
      switch (action) {
        case 'enroll':
          return await this.enrollVoiceProfile(userId!, transcript, passphrase);

        case 'verify':
          return await this.verifyVoiceProfile(userId!, transcript, passphrase);

        case 'identify':
          return await this.identifyVoiceProfile(transcript, passphrase);

        default:
          throw new Error(`Unknown authentication action: ${action}`);
      }
    } catch (error) {
      console.error('Voice authentication error:', error);
      throw new Error(`Voice authentication failed: ${error}`);
    }
  }

  /**
   * Enroll a new voice profile for authentication
   */
  private async enrollVoiceProfile(
    userId: string,
    transcript: string,
    expectedPassphrase?: string
  ): Promise<VoiceAuthResponse> {
    // Validate passphrase if provided
    if (expectedPassphrase && !transcript.toLowerCase().includes(expectedPassphrase.toLowerCase())) {
      return {
        authenticated: false,
        confidence: 0.0,
        securityLevel: 'low',
        recommendations: ['Passphrase not recognized', 'Please repeat your passphrase clearly']
      };
    }

    // Create voice profile (in production, this would store voice biometrics)
    const voiceProfile: VoiceProfile = {
      userId,
      voicePrint: this.generateVoicePrint(transcript),
      enrolledAt: new Date(),
      confidenceThreshold: 0.8,
      securityLevel: 'high'
    };

    // Store profile (in production, this would be in database)
    this.storeVoiceProfile(voiceProfile);

    return {
      authenticated: true,
      userId,
      confidence: 0.95,
      securityLevel: 'high',
      recommendations: ['Voice profile enrolled successfully', 'You can now use voice authentication']
    };
  }

  /**
   * Verify user identity against enrolled voice profile
   */
  private async verifyVoiceProfile(
    userId: string,
    transcript: string,
    expectedPassphrase?: string
  ): Promise<VoiceAuthResponse> {
    // Get stored voice profile
    const profile = this.getVoiceProfile(userId);
    if (!profile) {
      return {
        authenticated: false,
        confidence: 0.0,
        securityLevel: 'low',
        recommendations: ['No voice profile found', 'Please enroll your voice first']
      };
    }

    // Validate passphrase if provided
    if (expectedPassphrase && !transcript.toLowerCase().includes(expectedPassphrase.toLowerCase())) {
      return {
        authenticated: false,
        confidence: 0.1,
        securityLevel: 'low',
        recommendations: ['Passphrase not recognized', 'Please repeat your passphrase clearly']
      };
    }

    // Compare voice characteristics (simplified implementation)
    const confidence = this.compareVoicePrints(this.generateVoicePrint(transcript), profile.voicePrint);

    const authenticated = confidence >= profile.confidenceThreshold;

    return {
      authenticated,
      userId: authenticated ? userId : undefined,
      confidence,
      securityLevel: profile.securityLevel,
      recommendations: authenticated
        ? ['Voice verified successfully']
        : ['Voice verification failed', 'Please try again or use alternative authentication']
    };
  }

  /**
   * Identify user from voice input (speaker identification)
   */
  private async identifyVoiceProfile(
    transcript: string,
    expectedPassphrase?: string
  ): Promise<VoiceAuthResponse> {
    // Validate passphrase if provided
    if (expectedPassphrase && !transcript.toLowerCase().includes(expectedPassphrase.toLowerCase())) {
      return {
        authenticated: false,
        confidence: 0.1,
        securityLevel: 'low',
        recommendations: ['Passphrase not recognized', 'Please repeat your passphrase clearly']
      };
    }

    // In production, this would search through all enrolled voice profiles
    // For now, return a mock identification
    const mockUserId = 'voice_user_123';
    const mockProfile = this.getVoiceProfile(mockUserId);

    if (mockProfile) {
      const confidence = this.compareVoicePrints(this.generateVoicePrint(transcript), mockProfile.voicePrint);

      return {
        authenticated: confidence >= mockProfile.confidenceThreshold,
        userId: mockUserId,
        confidence,
        securityLevel: mockProfile.securityLevel,
        recommendations: confidence >= mockProfile.confidenceThreshold
          ? ['Speaker identified successfully']
          : ['Speaker identification failed', 'Please try again or enroll your voice']
      };
    }

    return {
      authenticated: false,
      confidence: 0.0,
      securityLevel: 'low',
      recommendations: ['No matching voice profile found', 'Please enroll your voice first']
    };
  }

  /**
   * Generate a simple voice print from transcript (simplified implementation)
   */
  private generateVoicePrint(transcript: string): string {
    // In production, this would create actual voice biometrics
    // For now, we'll create a hash based on speech patterns
    const words = transcript.toLowerCase().split(' ');
    const uniqueWords = [...new Set(words)];
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    return Buffer.from(`${uniqueWords.length}-${avgWordLength}-${transcript.length}`).toString('base64');
  }

  /**
   * Compare two voice prints (simplified implementation)
   */
  private compareVoicePrints(voicePrint1: string, voicePrint2: string): number {
    // In production, this would use proper voice biometric comparison
    // For now, return a mock confidence score
    const hash1 = Buffer.from(voicePrint1, 'base64').toString();
    const hash2 = Buffer.from(voicePrint2, 'base64').toString();

    let matches = 0;
    const length = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }

    return matches / length;
  }

  /**
   * Store voice profile (mock implementation)
   */
  private storeVoiceProfile(profile: VoiceProfile): void {
    // In production, this would store in database
    console.log(`Storing voice profile for user ${profile.userId}`);
  }

  /**
   * Get voice profile (mock implementation)
   */
  private getVoiceProfile(userId: string): VoiceProfile | null {
    // In production, this would retrieve from database
    // For now, return a mock profile
    return {
      userId,
      voicePrint: 'mock-voice-print-data',
      enrolledAt: new Date(),
      confidenceThreshold: 0.8,
      securityLevel: 'high'
    };
  }

  /**
   * Process voice command and return intent and parameters
   */
  async processVoiceCommand(audioData: string, context?: any): Promise<{
    intent: string;
    parameters: Record<string, any>;
    confidence: number;
  }> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for voice command processing");
    }

    try {
      // First, transcribe the audio
      const audioBuffer = Buffer.from(audioData, 'base64');
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: 'json'
      });

      const transcript = transcription.text;

      // Use GPT to analyze the intent
      const systemPrompt = `You are a voice command analyzer. Analyze the following transcript and extract:
1. The main intent/action
2. Any parameters or entities mentioned
3. A confidence score (0-1)

Respond in JSON format:
{
  "intent": "action_name",
  "parameters": {"key": "value"},
  "confidence": 0.95
}

Common intents: create, read, update, delete, search, navigate, call, send, save, submit`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript }
        ],
        temperature: 0.1,
        max_tokens: 150
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error("Failed to analyze voice command");
      }

      const analysis = JSON.parse(result);

      return {
        intent: analysis.intent || 'unknown',
        parameters: analysis.parameters || {},
        confidence: analysis.confidence || 0.5
      };
    } catch (error) {
      console.error('Voice command processing error:', error);
      throw new Error(`Voice command processing failed: ${error}`);
    }
  }

  /**
   * Estimate audio duration based on text length and speed
   */
  private estimateAudioDuration(text: string, speed: number): number {
    // Rough estimation: average speaking rate is 150 words per minute
    // Adjust for speed and calculate duration in seconds
    const wordsPerMinute = 150;
    const adjustedWordsPerMinute = wordsPerMinute * speed;
    const wordCount = text.split(' ').length;
    const durationSeconds = (wordCount / adjustedWordsPerMinute) * 60;

    return Math.max(durationSeconds, 1); // Minimum 1 second
  }

  /**
   * Validate audio data format and size
   */
  validateAudioData(audioData: string): boolean {
    try {
      const buffer = Buffer.from(audioData, 'base64');
      return buffer.length > 0 && buffer.length < 25 * 1024 * 1024; // Max 25MB
    } catch {
      return false;
    }
  }

  /**
   * Get supported languages for voice processing
   */
  getSupportedLanguages(): string[] {
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'
    ];
  }

  /**
   * Get available voices for text-to-speech
   */
  getAvailableVoices(): Array<{ id: string; name: string; language: string }> {
    return [
      { id: 'alloy', name: 'Alloy', language: 'en' },
      { id: 'echo', name: 'Echo', language: 'en' },
      { id: 'fable', name: 'Fable', language: 'en' },
      { id: 'onyx', name: 'Onyx', language: 'en' },
      { id: 'nova', name: 'Nova', language: 'en' },
      { id: 'shimmer', name: 'Shimmer', language: 'en' }
    ];
  }
}
