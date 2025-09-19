
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Play, Eye, Share, RefreshCw } from 'lucide-react';

interface VisualAsset {
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

interface VisualAssetPackage {
  images: VisualAsset[];
  videos: VisualAsset[];
  brandingAssets: VisualAsset[];
  marketingMaterials: VisualAsset[];
  documentation: string;
}

interface VisualAssetViewerProps {
  businessRequirement: any;
  onAssetsGenerated?: (assets: VisualAssetPackage) => void;
}

export const VisualAssetViewer: React.FC<VisualAssetViewerProps> = ({
  businessRequirement,
  onAssetsGenerated
}) => {
  const [assets, setAssets] = useState<VisualAssetPackage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null);

  const generateVisualAssets = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/visual-assets/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessRequirement,
          applicationMetadata: {
            industry: businessRequirement.extractedEntities?.businessContext?.industry
          }
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate visual assets');
      }

      const generatedAssets = await response.json();
      setAssets(generatedAssets);
      onAssetsGenerated?.(generatedAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsset = (asset: VisualAsset) => {
    // In a real implementation, this would handle downloading the asset
    window.open(asset.url, '_blank');
  };

  const previewAsset = (asset: VisualAsset) => {
    setSelectedAsset(asset);
  };

  const AssetCard: React.FC<{ asset: VisualAsset; category: string }> = ({ asset, category }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-medium">{asset.type === 'image' ? '🖼️' : '🎥'} {asset.id}</CardTitle>
            <CardDescription className="text-xs">
              {asset.metadata.style} • {asset.metadata.businessContext}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {asset.type === 'image' ? (
          <div className="aspect-video bg-gray-100 rounded-md mb-3 flex items-center justify-center">
            <img 
              src={asset.url} 
              alt={asset.metadata.prompt || 'Generated image'}
              className="max-w-full max-h-full object-contain rounded-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" font-family="Arial" font-size="12" fill="%236b7280" text-anchor="middle" dy=".3em">Image Preview</text></svg>';
              }}
            />
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 rounded-md mb-3 flex items-center justify-center">
            <div className="text-center">
              <Play className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Video ({asset.metadata.duration}s)</p>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => previewAsset(asset)}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => downloadAsset(asset)}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
        
        {asset.metadata.prompt && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
            {asset.metadata.prompt}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!assets && !isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎨 Visual Assets Generator
          </CardTitle>
          <CardDescription>
            Generate professional images, videos, and marketing materials for your business application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Visual Content</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Generate professional images, instructional videos, branding assets, and marketing materials 
                tailored to your business requirements.
              </p>
            </div>
            
            <Button onClick={generateVisualAssets} className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Generate Visual Assets
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generating Visual Assets...</CardTitle>
          <CardDescription>
            Creating professional visual content for your business application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={generationProgress} className="w-full" />
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {generationProgress < 30 && "Analyzing business requirements..."}
                {generationProgress >= 30 && generationProgress < 60 && "Generating images and graphics..."}
                {generationProgress >= 60 && generationProgress < 90 && "Creating videos and tutorials..."}
                {generationProgress >= 90 && "Finalizing visual assets..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!assets) return null;

  const totalAssets = assets.images.length + assets.videos.length + 
                     assets.brandingAssets.length + assets.marketingMaterials.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎨 Visual Assets Package
            </span>
            <Badge variant="secondary">{totalAssets} assets</Badge>
          </CardTitle>
          <CardDescription>
            Professional visual content generated for your business application
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({totalAssets})</TabsTrigger>
          <TabsTrigger value="images">Images ({assets.images.length})</TabsTrigger>
          <TabsTrigger value="videos">Videos ({assets.videos.length})</TabsTrigger>
          <TabsTrigger value="branding">Branding ({assets.brandingAssets.length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({assets.marketingMaterials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...assets.images, ...assets.videos, ...assets.brandingAssets, ...assets.marketingMaterials]
              .map(asset => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset} 
                  category={
                    assets.images.includes(asset) ? 'Application' :
                    assets.videos.includes(asset) ? 'Tutorial' :
                    assets.brandingAssets.includes(asset) ? 'Branding' : 'Marketing'
                  }
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.images.map(asset => (
              <AssetCard key={asset.id} asset={asset} category="Application" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.videos.map(asset => (
              <AssetCard key={asset.id} asset={asset} category="Tutorial" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.brandingAssets.map(asset => (
              <AssetCard key={asset.id} asset={asset} category="Branding" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.marketingMaterials.map(asset => (
              <AssetCard key={asset.id} asset={asset} category="Marketing" />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {assets.documentation && (
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto">
              {assets.documentation}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VisualAssetViewer;
