
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLogoManager } from '@/hooks/useLogoManager';
import { createLogoFileInput } from '@/utils/logoUpload';
import { AppLogo } from '@/components/common/AppLogo';
import { Upload, Image } from 'lucide-react';

const LogoUpload: React.FC = () => {
  const { handleLogoUpload, isUploading, uploadProgress } = useLogoManager();

  const handleUploadClick = () => {
    const input = createLogoFileInput(handleLogoUpload);
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Logo Display */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Current Logo</h3>
            <div className="flex justify-center mb-4">
              <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <AppLogo size="large" />
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="text-center">
            <Button 
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload New Logo'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Supports PNG, JPEG, SVG, and WebP files up to 10MB
            </p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogoUpload;
