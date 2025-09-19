
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

export class ImageVideoGenerationService {
  private openai: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null as any;
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
    try {
      const response = await this.openai.images.generate({
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
      console.error("Failed to generate image:", error);
      throw new Error(`Image generation failed: ${error}`);
    }
  }

  /**
   * Generate a single video (mock implementation - would integrate with video generation API)
   */
  async generateSingleVideo(request: VideoGenerationRequest): Promise<GeneratedVisualAsset> {
    // This is a mock implementation - in production would integrate with services like:
    // - Runway ML
    // - Synthesia
    // - Luma AI
    // - D-ID
    
    try {
      // For now, return a mock video asset
      return {
        id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'video',
        url: `https://example.com/video/${Date.now()}.mp4`, // Mock URL
        metadata: {
          prompt: request.script,
          style: request.style || 'tutorial',
          businessContext: request.businessContext || 'general',
          duration: request.duration || 60
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("Failed to generate video:", error);
      throw new Error(`Video generation failed: ${error}`);
    }
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
