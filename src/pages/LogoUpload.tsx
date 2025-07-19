import React, { useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { useLogoManager } from '@/hooks/useLogoManager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/components/AppLayout';

const LogoUpload = () => {
  const { handleLogoUpload, isUploading, uploadProgress } = useLogoManager();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleLogoUpload(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleLogoUpload(file);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload App Logo</h1>
          <p className="text-muted-foreground">
            Upload a new logo for your app. Supports PNG, JPEG, WebP, and SVG files up to 10MB.
          </p>
        </div>

        <Card className="p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            {isUploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-lg font-medium mb-2">Uploading logo...</p>
                  <Progress value={uploadProgress} className="w-full max-w-sm mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium mb-2">
                    {dragOver ? 'Drop your logo here' : 'Drag and drop your logo here'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to select a file
                  </p>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="logo-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="logo-upload">
                    <Button asChild disabled={isUploading}>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Select Logo File
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 text-sm text-muted-foreground space-y-1">
          <p>• Supported formats: PNG, JPEG, WebP, SVG</p>
          <p>• Maximum file size: 10MB</p>
          <p>• The logo will appear on your app's main page</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default LogoUpload;