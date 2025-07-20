
import { useState } from 'react';
import { generateIconsFromImage, cropImageToSquare, loadImageFromUrl } from '@/utils/image/iconGeneration';
import { generateSplashScreens } from '@/utils/image/splashGeneration';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export const useAppIconGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generateAppAssets = async (logoUrl: string) => {
    setIsGenerating(true);
    setProgress(0);

    try {
      toast({
        title: "Generating App Assets",
        description: "Creating icons and splash screens from your logo..."
      });

      // Load and process the logo
      setProgress(10);
      const logoImage = await loadImageFromUrl(logoUrl);
      
      setProgress(20);
      const logoCanvas = cropImageToSquare(logoImage);
      
      // Generate icons
      setProgress(40);
      const icons = await generateIconsFromImage(logoUrl);
      
      // Generate splash screens
      setProgress(70);
      const splashes = await generateSplashScreens(logoCanvas);
      
      setProgress(90);

      // Create download links for all assets
      const downloads = new Map<string, string>();
      
      // Process icons
      icons.forEach((blob, filename) => {
        const url = URL.createObjectURL(blob);
        downloads.set(filename, url);
      });
      
      // Process splash screens
      splashes.forEach((blob, filename) => {
        const url = URL.createObjectURL(blob);
        downloads.set(filename, url);
      });

      setProgress(100);

      toast({
        title: "App Assets Generated!",
        description: `Generated ${icons.size} icons and ${splashes.size} splash screens ready for download.`
      });

      logger.info('[AppIconGenerator] Successfully generated all app assets', {
        iconsCount: icons.size,
        splashesCount: splashes.size
      });

      return { icons, splashes, downloads };

    } catch (error) {
      logger.error('[AppIconGenerator] Failed to generate app assets:', error);
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate app assets. Please try again."
      });
      
      throw error;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return {
    generateAppAssets,
    isGenerating,
    progress
  };
};
