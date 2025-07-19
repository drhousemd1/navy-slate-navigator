
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload, Image } from 'lucide-react';
import { useLogoManager } from '@/hooks/useLogoManager';
import { AppLogo } from '@/components/common/AppLogo';
import AppLayout from '@/components/AppLayout';

const LogoUpload: React.FC = () => {
  const navigate = useNavigate();
  const { isUploading, uploadProgress, handleLogoUpload } = useLogoManager();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">Upload App Logo</h1>
          <p className="text-nav-inactive">
            Upload a new logo for your application. Supports PNG, JPEG, SVG, and WebP formats.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Current Logo Preview */}
          <Card className="bg-light-navy border-navy">
            <CardHeader>
              <CardTitle className="text-white">Current Logo</CardTitle>
              <CardDescription>This is how your logo currently appears</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-8">
              <div className="w-32 h-32">
                <AppLogo size="responsive" />
              </div>
            </CardContent>
          </Card>

          {/* Upload Section */}
          <Card className="bg-light-navy border-navy">
            <CardHeader>
              <CardTitle className="text-white">Upload New Logo</CardTitle>
              <CardDescription>
                Drag and drop your logo file here, or click to select
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  {isUploading ? (
                    <Upload className="w-12 h-12 text-blue-500 animate-pulse" />
                  ) : (
                    <Image className="w-12 h-12 text-gray-400" />
                  )}
                  
                  <div>
                    <p className="text-white font-medium">
                      {isUploading ? 'Uploading...' : 'Choose a file or drag it here'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      PNG, JPEG, SVG, WebP up to 10MB
                    </p>
                  </div>
                  
                  {isUploading && (
                    <div className="w-full max-w-xs">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-gray-400 mt-1 text-center">
                        {uploadProgress}% uploaded
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <input
                id="file-upload"
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default LogoUpload;
