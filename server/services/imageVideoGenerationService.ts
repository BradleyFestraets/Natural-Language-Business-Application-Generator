
import OpenAI from "openai";
import { isAIServiceAvailable } from "../config/validation";
import { BusinessRequirement } from "@shared/schema";

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'professional' | 'minimalist';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  businessContext?: string;
  brandColors?: string[];
}

export interface VideoGenerationRequest {
  script: string;
  duration?: number;
  style?: 'presentation' | 'tutorial' | 'walkthrough' | 'marketing';
  voiceOver?: boolean;
  businessContext?: string;
}

export interface GeneratedVisualAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  metadata: {
    prompt?: string;
    style: string;
    businessContext: string;
    dimensions?: string;
    duration?: number;
  };
  generatedAt: Date;
}

export interface VisualAssetPackage {
  images: GeneratedVisualAsset[];
  videos: GeneratedVisualAsset[];
  brandingAssets: GeneratedVisualAsset[];
  marketingMaterials: GeneratedVisualAsset[];
  documentation: string;
}

export interface ImageProviderInterface {
  generateImage: (request: ImageGenerationRequest) => Promise<GeneratedVisualAsset>;
  generateVideo: (request: VideoGenerationRequest) => Promise<GeneratedVisualAsset>;
}

export class ImageVideoGenerationService {
  private openai: OpenAI | null;
  private providers: Map<string, ImageProviderInterface> = new Map();

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null;
    }

    // Initialize OpenAI provider
    this.initializeOpenAIProvider();
  }

  /**
   * Initialize OpenAI provider for image and video generation
   */
  private initializeOpenAIProvider() {
    if (!this.openai) return;

    const openaiProvider: ImageProviderInterface = {
      generateImage: async (request: ImageGenerationRequest): Promise<GeneratedVisualAsset> => {
        try {
          const response = await this.openai!.images.generate({
            model: "dall-e-3",
            prompt: request.prompt,
            size: request.size || "1024x1024",
            quality: "standard",
            n: 1,
          });

          const imageUrl = response.data[0]?.url;
          if (!imageUrl) {
            throw new Error("No image URL returned from OpenAI");
          }

          return {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'image',
            url: imageUrl,
            metadata: {
              prompt: request.prompt,
              style: request.style || 'professional',
              businessContext: request.businessContext || 'general',
              dimensions: request.size || "1024x1024"
            },
            generatedAt: new Date()
          };
        } catch (error) {
          console.error("Failed to generate image with OpenAI:", error);
          throw new Error(`Image generation failed: ${error}`);
        }
      },

      generateVideo: async (request: VideoGenerationRequest): Promise<GeneratedVisualAsset> => {
        try {
          // Generate video script and scene descriptions using GPT-4
          const videoScript = await this.generateVideoScript(request);

          // For now, we'll create a comprehensive video asset with script and metadata
          // This can be enhanced when OpenAI releases video generation capabilities
          // In production, this would integrate with services like:
          // - Runway ML
          // - Synthesia
          // - Luma AI
          // - D-ID

          // Generate video thumbnail using DALL-E
          let thumbnailUrl = '';
          try {
            const thumbnailResponse = await this.openai!.images.generate({
              model: "dall-e-3",
              prompt: `Professional thumbnail for video: ${request.script.substring(0, 100)}... Business presentation style, clean and modern`,
              size: "1024x576",
              quality: "standard",
              n: 1,
            });
            thumbnailUrl = thumbnailResponse.data[0]?.url || '';
          } catch (thumbnailError) {
            console.warn("Failed to generate video thumbnail:", thumbnailError);
          }

          return {
            id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'video',
            url: `https://example.com/video/${Date.now()}.mp4`, // Mock URL - replace with actual video generation
            metadata: {
              script: request.script,
              style: request.style || 'presentation',
              businessContext: request.businessContext || 'general',
              duration: request.duration || 30,
              videoScript: videoScript,
              thumbnailUrl: thumbnailUrl,
              scenes: videoScript.scenes || [],
              narration: videoScript.narration || request.script
            },
            generatedAt: new Date()
          };
        } catch (error) {
          console.error("Failed to generate video:", error);
          throw new Error(`Video generation failed: ${error}`);
        }
      }
    };

    this.providers.set('openai', openaiProvider);
  }

  /**
   * Generate detailed video script with scenes and narration using GPT-4
   */
  private async generateVideoScript(request: VideoGenerationRequest): Promise<{
    scenes: Array<{
      description: string;
      duration: number;
      visuals: string;
      narration: string;
    }>;
    narration: string;
    totalDuration: number;
  }> {
    if (!this.openai) {
      throw new Error("OpenAI client not available");
    }

    try {
      const systemPrompt = `You are a professional video script writer and director. Create a detailed video script based on the following requirements:

1. Break down the content into 3-5 scenes
2. Each scene should have:
   - Visual description for video generation
   - Narration text
   - Suggested duration (in seconds)
3. Total video duration should be around ${request.duration || 60} seconds
4. Style: ${request.style || 'presentation'}
5. Focus on business/professional content

Respond in JSON format:
{
  "scenes": [
    {
      "description": "Scene description for visuals",
      "duration": 15,
      "visuals": "Visual elements and style",
      "narration": "Spoken narration text"
    }
  ],
  "narration": "Complete narration script",
  "totalDuration": 60
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.script }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error("Failed to generate video script");
      }

      return JSON.parse(result);
    } catch (error) {
      console.error("Video script generation error:", error);
      // Return basic structure if GPT fails
      return {
        scenes: [{
          description: "Main content presentation",
          duration: request.duration || 60,
          visuals: "Professional business presentation",
          narration: request.script
        }],
        narration: request.script,
        totalDuration: request.duration || 60
      };
    }
  }

  /**
   * Generate comprehensive visual assets for business applications
   */
  async generateVisualAssetPackage(
    businessRequirement: BusinessRequirement,
    applicationMetadata: any = {}
  ): Promise<VisualAssetPackage> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for visual asset generation");
    }

    const businessContext = this.extractBusinessContext(businessRequirement);

    // Generate different types of visual content
    const [images, videos, branding, marketing] = await Promise.all([
      this.generateApplicationImages(businessContext, applicationMetadata),
      this.generateInstructionalVideos(businessContext, applicationMetadata),
      this.generateBrandingAssets(businessContext),
      this.generateMarketingMaterials(businessContext, applicationMetadata)
    ]);

    const documentation = this.generateVisualAssetDocumentation(
      businessContext,
      [...images, ...videos, ...branding, ...marketing]
    );

    return {
      images,
      videos,
      brandingAssets: branding,
      marketingMaterials: marketing,
      documentation
    };
  }

  /**
   * Enhance template with visual assets
   */
  async enhanceTemplateWithVisuals(
    templateId: string,
    businessContext: any
  ): Promise<VisualAssetPackage> {
    if (!isAIServiceAvailable() || !this.openai) {
      throw new Error("AI service unavailable for template visual enhancement");
    }

    try {
      // Generate template-specific visual assets
      const templateAssets = await this.generateTemplateVisuals(templateId, businessContext);

      // Generate template-specific documentation
      const enhancementDoc = this.generateTemplateEnhancementDocumentation(
        templateId,
        businessContext,
        templateAssets
      );

      return {
        images: templateAssets.images,
        videos: templateAssets.videos,
        brandingAssets: templateAssets.branding,
        marketingMaterials: templateAssets.marketing,
        documentation: enhancementDoc
      };
    } catch (error) {
      console.error('Template visual enhancement error:', error);
      throw new Error(`Failed to enhance template with visuals: ${error}`);
    }
  }

  /**
   * Generate template-specific visual assets
   */
  private async generateTemplateVisuals(
    templateId: string,
    businessContext: any
  ): Promise<{
    images: GeneratedVisualAsset[];
    videos: GeneratedVisualAsset[];
    branding: GeneratedVisualAsset[];
    marketing: GeneratedVisualAsset[];
  }> {
    const templateImages: GeneratedVisualAsset[] = [];
    const templateVideos: GeneratedVisualAsset[] = [];
    const templateBranding: GeneratedVisualAsset[] = [];
    const templateMarketing: GeneratedVisualAsset[] = [];

    // Generate template-specific header images
    const headerImage = await this.generateSingleImage({
      prompt: `Professional header image for ${businessContext.industry} application template: ${templateId}, clean modern design, suitable for business use`,
      style: 'professional',
      size: '1792x1024',
      businessContext: businessContext.industry
    });
    templateImages.push(headerImage);

    // Generate template preview images
    const previewImages = await Promise.all([
      this.generateSingleImage({
        prompt: `Template preview screenshot showing ${businessContext.industry} application layout, professional interface design`,
        style: 'minimalist',
        size: '1024x1024',
        businessContext: businessContext.industry
      }),
      this.generateSingleImage({
        prompt: `Feature showcase image highlighting ${businessContext.industry} template capabilities, modern UI elements`,
        style: 'professional',
        size: '1024x1024',
        businessContext: businessContext.industry
      })
    ]);
    templateImages.push(...previewImages);

    // Generate template branding assets
    const brandingAssets = await Promise.all([
      this.generateSingleImage({
        prompt: `Template logo design for ${businessContext.industry} application, scalable vector style, professional branding`,
        style: 'minimalist',
        size: '1024x1024',
        businessContext: businessContext.industry
      }),
      this.generateSingleImage({
        prompt: `Template color palette showcase for ${businessContext.industry} application, professional design system`,
        style: 'artistic',
        size: '1024x1024',
        businessContext: businessContext.industry
      })
    ]);
    templateBranding.push(...brandingAssets);

    // Generate template marketing materials
    const marketingAssets = await Promise.all([
      this.generateSingleImage({
        prompt: `Template promotional banner for ${businessContext.industry} application, compelling marketing design`,
        style: 'professional',
        size: '1792x1024',
        businessContext: businessContext.industry
      }),
      this.generateSingleImage({
        prompt: `Template feature highlights card for ${businessContext.industry} application, informative marketing layout`,
        style: 'minimalist',
        size: '1024x1024',
        businessContext: businessContext.industry
      })
    ]);
    templateMarketing.push(...marketingAssets);

    return {
      images: templateImages,
      videos: templateVideos,
      branding: templateBranding,
      marketing: templateMarketing
    };
  }

  /**
   * Generate template enhancement documentation
   */
  private generateTemplateEnhancementDocumentation(
    templateId: string,
    businessContext: any,
    assets: any
  ): string {
    const totalImages = assets.images.length + assets.branding.length + assets.marketing.length;

    return `# Template Visual Enhancement Documentation

## Template: ${templateId}

This template has been enhanced with ${totalImages} professional visual assets optimized for ${businessContext.industry} applications.

## Generated Assets

### Template Images
${assets.images.map((img: GeneratedVisualAsset, index: number) =>
  `- **Asset ${index + 1}**: ${img.metadata.style} style, ${img.metadata.dimensions}, ${img.metadata.businessContext} context`
).join('\n')}

### Branding Assets
${assets.branding.map((asset: GeneratedVisualAsset, index: number) =>
  `- **Branding ${index + 1}**: ${asset.metadata.style} style, ${asset.metadata.dimensions}, ${asset.metadata.businessContext} context`
).join('\n')}

### Marketing Materials
${assets.marketing.map((material: GeneratedVisualAsset, index: number) =>
  `- **Marketing ${index + 1}**: ${material.metadata.style} style, ${material.metadata.dimensions}, ${material.metadata.businessContext} context`
).join('\n')}

## Integration Guide

### Using Enhanced Template Assets

1. **Header Images**: Use for page headers, hero sections, and main banners
2. **Preview Images**: Perfect for template previews, documentation, and marketing
3. **Branding Assets**: Apply consistently across all template instances
4. **Marketing Materials**: Use for promoting the template and generated applications

### Implementation Example

\`\`\`tsx
// In your template component
import headerImage from './assets/template-header.jpg';
import previewImage from './assets/template-preview.png';

function TemplatePreview() {
  return (
    <div>
      <img src={headerImage} alt="Template Header" className="w-full h-64 object-cover" />
      <img src={previewImage} alt="Template Preview" className="w-48 h-48 object-contain" />
    </div>
  );
}
\`\`\`

## Asset Specifications

- **Image Format**: High-quality PNG/JPG with transparency where appropriate
- **Resolution**: Optimized for web and print usage
- **Color Scheme**: Consistent with ${businessContext.industry} industry standards
- **Style**: Professional and modern, suitable for enterprise applications

## Customization

To customize these visual assets:

1. **Modify Prompts**: Update the generation prompts in the service configuration
2. **Adjust Styles**: Change the style parameter (professional, minimalist, artistic)
3. **Update Colors**: Specify brand colors in the business context
4. **Resize Assets**: Modify size parameters for different use cases

## Performance Considerations

- All images are optimized for web delivery
- Lazy loading recommended for better performance
- Consider using CDN for asset distribution
- Implement responsive image sizing for different screen sizes

## Generated At
${new Date().toISOString()}

---
*This template enhancement was generated using AI-powered visual asset creation optimized for ${businessContext.industry} applications.*
`;
  }

  /**
   * Generate application-specific images
   */
  async generateApplicationImages(
    businessContext: any,
    applicationMetadata: any
  ): Promise<GeneratedVisualAsset[]> {
    const imagePrompts = this.createImagePrompts(businessContext, applicationMetadata);
    const generatedImages: GeneratedVisualAsset[] = [];

    for (const prompt of imagePrompts) {
      try {
        const imageAsset = await this.generateSingleImage(prompt);
        generatedImages.push(imageAsset);
      } catch (error) {
        console.error(`Failed to generate image for prompt: ${prompt.prompt}`, error);
        // Continue with other images even if one fails
      }
    }

    return generatedImages;
  }

  /**
   * Generate instructional and walkthrough videos
   */
  async generateInstructionalVideos(
    businessContext: any,
    applicationMetadata: any
  ): Promise<GeneratedVisualAsset[]> {
    const videoScripts = this.createVideoScripts(businessContext, applicationMetadata);
    const generatedVideos: GeneratedVisualAsset[] = [];

    for (const script of videoScripts) {
      try {
        const videoAsset = await this.generateSingleVideo(script);
        generatedVideos.push(videoAsset);
      } catch (error) {
        console.error(`Failed to generate video for script: ${script.script}`, error);
        // Continue with other videos even if one fails
      }
    }

    return generatedVideos;
  }

  /**
   * Generate branding assets
   */
  async generateBrandingAssets(businessContext: any): Promise<GeneratedVisualAsset[]> {
    const brandingPrompts = [
      {
        prompt: `Professional logo design for ${businessContext.industry} business, modern and clean style, corporate branding`,
        style: 'professional' as const,
        businessContext: businessContext.industry
      },
      {
        prompt: `Business card design template for ${businessContext.industry}, professional layout with contact information`,
        style: 'professional' as const,
        businessContext: businessContext.industry
      },
      {
        prompt: `Corporate color palette and branding guide for ${businessContext.industry} business`,
        style: 'minimalist' as const,
        businessContext: businessContext.industry
      }
    ];

    const brandingAssets: GeneratedVisualAsset[] = [];
    
    for (const prompt of brandingPrompts) {
      try {
        const asset = await this.generateSingleImage(prompt);
        brandingAssets.push(asset);
      } catch (error) {
        console.error(`Failed to generate branding asset: ${prompt.prompt}`, error);
      }
    }

    return brandingAssets;
  }

  /**
   * Generate marketing materials
   */
  async generateMarketingMaterials(
    businessContext: any,
    applicationMetadata: any
  ): Promise<GeneratedVisualAsset[]> {
    const marketingPrompts = [
      {
        prompt: `Social media banner for ${businessContext.industry} business application, modern professional design`,
        style: 'professional' as const,
        size: '1792x1024' as const,
        businessContext: businessContext.industry
      },
      {
        prompt: `Promotional poster showcasing ${businessContext.industry} business automation features`,
        style: 'professional' as const,
        businessContext: businessContext.industry
      },
      {
        prompt: `Email newsletter header design for ${businessContext.industry} business updates`,
        style: 'professional' as const,
        businessContext: businessContext.industry
      }
    ];

    const marketingAssets: GeneratedVisualAsset[] = [];
    
    for (const prompt of marketingPrompts) {
      try {
        const asset = await this.generateSingleImage(prompt);
        marketingAssets.push(asset);
      } catch (error) {
        console.error(`Failed to generate marketing asset: ${prompt.prompt}`, error);
      }
    }

    return marketingAssets;
  }

  /**
   * Generate a single image using OpenAI DALL-E
   */
  async generateSingleImage(request: ImageGenerationRequest): Promise<GeneratedVisualAsset> {
    const provider = this.providers.get('openai');
    if (!provider) {
      throw new Error("No image provider available");
    }

    return provider.generateImage(request);
  }

  /**
   * Generate a single video (mock implementation - would integrate with video generation API)
   */
  async generateSingleVideo(request: VideoGenerationRequest): Promise<GeneratedVisualAsset> {
    const provider = this.providers.get('openai');
    if (!provider) {
      throw new Error("No video provider available");
    }

    return provider.generateVideo(request);
  }

  /**
   * Create image prompts based on business context
   */
  private createImagePrompts(businessContext: any, applicationMetadata: any): ImageGenerationRequest[] {
    const industry = businessContext.industry?.toLowerCase() || 'general';
    const prompts: ImageGenerationRequest[] = [];

    // Dashboard and interface images
    prompts.push({
      prompt: `Modern business dashboard interface for ${industry} company, clean professional design with charts and data visualization`,
      style: 'professional',
      businessContext: industry
    });

    // Process workflow illustrations
    prompts.push({
      prompt: `Business process workflow diagram for ${industry}, step-by-step visualization with professional icons`,
      style: 'minimalist',
      businessContext: industry
    });

    // Team collaboration images
    prompts.push({
      prompt: `Professional team collaboration in ${industry} office environment, modern workplace setting`,
      style: 'realistic',
      businessContext: industry
    });

    // Form and document templates
    prompts.push({
      prompt: `Professional document template design for ${industry} business forms and reports`,
      style: 'minimalist',
      businessContext: industry
    });

    return prompts;
  }

  /**
   * Create video scripts based on business context
   */
  private createVideoScripts(businessContext: any, applicationMetadata: any): VideoGenerationRequest[] {
    const industry = businessContext.industry || 'general business';
    const scripts: VideoGenerationRequest[] = [];

    // Application walkthrough
    scripts.push({
      script: `Welcome to your new ${industry} application. This tutorial will guide you through the main features and how to use them effectively for your business processes.`,
      style: 'tutorial',
      duration: 120,
      voiceOver: true,
      businessContext: industry
    });

    // Process automation explanation
    scripts.push({
      script: `Learn how automated workflows in this ${industry} application can streamline your business processes and improve efficiency.`,
      style: 'presentation',
      duration: 90,
      voiceOver: true,
      businessContext: industry
    });

    // Feature demonstration
    scripts.push({
      script: `Discover the key features of your ${industry} application and how they solve common business challenges.`,
      style: 'walkthrough',
      duration: 150,
      voiceOver: true,
      businessContext: industry
    });

    return scripts;
  }

  /**
   * Extract business context from requirements
   */
  private extractBusinessContext(businessRequirement: BusinessRequirement): any {
    return {
      industry: businessRequirement.extractedEntities?.businessContext?.industry || 'General Business',
      processes: businessRequirement.extractedEntities?.processes || [],
      forms: businessRequirement.extractedEntities?.forms || [],
      description: businessRequirement.originalDescription
    };
  }

  /**
   * Generate documentation for visual assets
   */
  private generateVisualAssetDocumentation(
    businessContext: any,
    assets: GeneratedVisualAsset[]
  ): string {
    let doc = `# Visual Assets Documentation\n\n`;
    doc += `Generated for: ${businessContext.industry} Business Application\n\n`;
    doc += `## Asset Summary\n\n`;
    doc += `- Total Assets: ${assets.length}\n`;
    doc += `- Images: ${assets.filter(a => a.type === 'image').length}\n`;
    doc += `- Videos: ${assets.filter(a => a.type === 'video').length}\n\n`;
    
    doc += `## Asset Categories\n\n`;
    
    const images = assets.filter(a => a.type === 'image');
    if (images.length > 0) {
      doc += `### Images\n`;
      images.forEach(asset => {
        doc += `- **${asset.id}**: ${asset.metadata.style} style, ${asset.metadata.businessContext} context\n`;
      });
      doc += `\n`;
    }
    
    const videos = assets.filter(a => a.type === 'video');
    if (videos.length > 0) {
      doc += `### Videos\n`;
      videos.forEach(asset => {
        doc += `- **${asset.id}**: ${asset.metadata.style} style, ${asset.metadata.duration}s duration\n`;
      });
      doc += `\n`;
    }
    
    doc += `## Usage Guidelines\n\n`;
    doc += `- All assets are generated specifically for ${businessContext.industry} business context\n`;
    doc += `- Images are high-resolution and suitable for professional use\n`;
    doc += `- Videos include comprehensive tutorials and walkthroughs\n`;
    doc += `- Assets follow consistent branding and visual style\n`;
    
    return doc;
  }

  /**
   * Enhance existing templates with visual assets
   */
  async enhanceTemplateWithVisuals(
    templateId: string,
    businessContext: any
  ): Promise<{ enhancedTemplate: any; visualAssets: GeneratedVisualAsset[] }> {
    const visualAssets = await this.generateApplicationImages(businessContext, { templateId });
    
    // Mock enhanced template - in production would modify actual template
    const enhancedTemplate = {
      id: templateId,
      visualEnhancements: {
        headerImage: visualAssets[0]?.url,
        brandingAssets: visualAssets.slice(1, 3).map(asset => asset.url),
        processIllustrations: visualAssets.slice(3).map(asset => asset.url)
      },
      updatedAt: new Date()
    };
    
    return {
      enhancedTemplate,
      visualAssets
    };
  }
}
