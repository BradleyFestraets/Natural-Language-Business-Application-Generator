
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageVideoGenerationService } from '../../server/services/imageVideoGenerationService';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      images: {
        generate: vi.fn().mockResolvedValue({
          data: [{ url: 'https://example.com/generated-image.jpg' }]
        })
      }
    }))
  };
});

// Mock AI service validation
vi.mock('../../server/config/validation', () => ({
  isAIServiceAvailable: vi.fn().mockReturnValue(true)
}));

describe('ImageVideoGenerationService', () => {
  let service: ImageVideoGenerationService;
  
  const mockBusinessRequirement = {
    originalDescription: 'Create an HR onboarding system with employee forms',
    extractedEntities: {
      businessContext: {
        industry: 'Human Resources'
      },
      processes: ['employee_onboarding', 'document_verification'],
      forms: ['employee_info_form', 'tax_form']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new ImageVideoGenerationService();
  });

  describe('generateVisualAssetPackage', () => {
    it('should generate a complete visual asset package', async () => {
      const result = await service.generateVisualAssetPackage(mockBusinessRequirement);
      
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('videos');
      expect(result).toHaveProperty('brandingAssets');
      expect(result).toHaveProperty('marketingMaterials');
      expect(result).toHaveProperty('documentation');
      
      expect(Array.isArray(result.images)).toBe(true);
      expect(Array.isArray(result.videos)).toBe(true);
      expect(Array.isArray(result.brandingAssets)).toBe(true);
      expect(Array.isArray(result.marketingMaterials)).toBe(true);
      expect(typeof result.documentation).toBe('string');
    });

    it('should include business context in generated assets', async () => {
      const result = await service.generateVisualAssetPackage(mockBusinessRequirement);
      
      const allAssets = [
        ...result.images,
        ...result.videos,
        ...result.brandingAssets,
        ...result.marketingMaterials
      ];
      
      allAssets.forEach(asset => {
        expect(asset.metadata.businessContext).toBeDefined();
        expect(asset.metadata.style).toBeDefined();
        expect(asset.generatedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('generateSingleImage', () => {
    it('should generate a single image asset', async () => {
      const imageRequest = {
        prompt: 'Professional business dashboard for HR management',
        style: 'professional' as const,
        businessContext: 'Human Resources'
      };
      
      const result = await service.generateSingleImage(imageRequest);
      
      expect(result.type).toBe('image');
      expect(result.url).toBe('https://example.com/generated-image.jpg');
      expect(result.metadata.prompt).toBe(imageRequest.prompt);
      expect(result.metadata.style).toBe(imageRequest.style);
      expect(result.metadata.businessContext).toBe(imageRequest.businessContext);
      expect(result.id).toMatch(/^img_/);
    });

    it('should handle different image styles and sizes', async () => {
      const imageRequest = {
        prompt: 'Modern office workspace',
        style: 'minimalist' as const,
        size: '1792x1024' as const,
        businessContext: 'General'
      };
      
      const result = await service.generateSingleImage(imageRequest);
      
      expect(result.metadata.style).toBe('minimalist');
      expect(result.metadata.dimensions).toBe('1792x1024');
    });
  });

  describe('generateSingleVideo', () => {
    it('should generate a single video asset', async () => {
      const videoRequest = {
        script: 'Welcome to your new HR management system tutorial',
        style: 'tutorial' as const,
        duration: 120,
        businessContext: 'Human Resources'
      };
      
      const result = await service.generateSingleVideo(videoRequest);
      
      expect(result.type).toBe('video');
      expect(result.url).toContain('.mp4');
      expect(result.metadata.prompt).toBe(videoRequest.script);
      expect(result.metadata.style).toBe(videoRequest.style);
      expect(result.metadata.duration).toBe(videoRequest.duration);
      expect(result.id).toMatch(/^vid_/);
    });
  });

  describe('enhanceTemplateWithVisuals', () => {
    it('should enhance template with visual assets', async () => {
      const templateId = 'template_123';
      const businessContext = {
        industry: 'Healthcare',
        processes: ['patient_intake']
      };
      
      const result = await service.enhanceTemplateWithVisuals(templateId, businessContext);
      
      expect(result.enhancedTemplate.id).toBe(templateId);
      expect(result.enhancedTemplate.visualEnhancements).toBeDefined();
      expect(result.visualAssets).toBeDefined();
      expect(Array.isArray(result.visualAssets)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error when AI service is unavailable', async () => {
      const { isAIServiceAvailable } = await import('../../server/config/validation');
      vi.mocked(isAIServiceAvailable).mockReturnValue(false);
      
      const newService = new ImageVideoGenerationService();
      
      await expect(
        newService.generateVisualAssetPackage(mockBusinessRequirement)
      ).rejects.toThrow('AI service unavailable for visual asset generation');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const mockOpenAI = {
        images: {
          generate: vi.fn().mockRejectedValue(new Error('API Error'))
        }
      };
      
      // Create service with mocked OpenAI that will fail
      const serviceWithError = new ImageVideoGenerationService();
      (serviceWithError as any).openai = mockOpenAI;
      
      await expect(
        serviceWithError.generateSingleImage({
          prompt: 'test prompt',
          businessContext: 'test'
        })
      ).rejects.toThrow('Image generation failed');
    });
  });

  describe('business context extraction', () => {
    it('should extract correct business context from requirements', async () => {
      const result = await service.generateVisualAssetPackage(mockBusinessRequirement);
      
      expect(result.documentation).toContain('Human Resources');
      expect(result.documentation).toContain('Business Application');
    });

    it('should handle missing business context gracefully', async () => {
      const minimalRequirement = {
        originalDescription: 'Simple task management system',
        extractedEntities: {}
      };
      
      const result = await service.generateVisualAssetPackage(minimalRequirement);
      
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('videos');
      expect(result.documentation).toContain('General Business');
    });
  });
});
