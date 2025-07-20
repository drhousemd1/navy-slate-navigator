
import React from 'react';
import { Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppIconGenerator } from '@/hooks/useAppIconGenerator';
import { AppLogo } from '@/components/common/AppLogo';

interface AppAssetGeneratorProps {
  logoUrl: string;
}

export const AppAssetGenerator: React.FC<AppAssetGeneratorProps> = ({ logoUrl }) => {
  const { generateAppAssets, isGenerating, progress } = useAppIconGenerator();
  const [downloadUrls, setDownloadUrls] = React.useState<Map<string, string>>(new Map());

  const handleGenerate = async () => {
    try {
      const result = await generateAppAssets(logoUrl);
      setDownloadUrls(result.downloads);
    } catch (error) {
      console.error('Failed to generate assets:', error);
    }
  };

  const downloadAll = () => {
    downloadUrls.forEach((url, filename) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const downloadByPlatform = (platform: 'ios' | 'android' | 'pwa') => {
    downloadUrls.forEach((url, filename) => {
      const shouldDownload = 
        (platform === 'ios' && (filename.includes('Default') || filename.includes('icon-') && !filename.includes('ldpi') && !filename.includes('mdpi'))) ||
        (platform === 'android' && (filename.includes('splash-') || filename.includes('ldpi') || filename.includes('mdpi') || filename.includes('hdpi') || filename.includes('xhdpi') || filename.includes('xxhdpi') || filename.includes('xxxhdpi'))) ||
        (platform === 'pwa' && (filename.includes('icon-192') || filename.includes('icon-512')));

      if (shouldDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold">App Store Assets Generator</h3>
          <p className="text-muted-foreground">
            Generate all required icons and splash screens for iOS and Android app stores from your current logo.
          </p>
          
          <div className="flex justify-center">
            <div className="w-24 h-24">
              <AppLogo size="responsive" className="border rounded-lg" />
            </div>
          </div>
        </div>

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating assets...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="grid gap-4">
          {!downloadUrls.size ? (
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              size="lg"
              className="w-full"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Generate App Store Assets
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-center text-sm text-muted-foreground">
                Generated {downloadUrls.size} assets ready for download
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <Button onClick={downloadAll} variant="default">
                  <Download className="w-4 h-4 mr-2" />
                  All Assets
                </Button>
                
                <Button onClick={() => downloadByPlatform('ios')} variant="outline">
                  <Smartphone className="w-4 h-4 mr-2" />
                  iOS Assets
                </Button>
                
                <Button onClick={() => downloadByPlatform('android')} variant="outline">
                  <Monitor className="w-4 h-4 mr-2" />
                  Android Assets
                </Button>
                
                <Button onClick={() => downloadByPlatform('pwa')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  PWA Icons
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Generates all required icon sizes for iOS (20px-1024px) and Android (36px-192px)</p>
          <p>• Creates splash screens for various device sizes</p>
          <p>• Assets are optimized for app store submission</p>
          <p>• Your logo will be automatically cropped to a square format</p>
        </div>
      </div>
    </Card>
  );
};
