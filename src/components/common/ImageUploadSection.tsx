
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ImageMetadata, createPreviewUrl, revokePreviewUrl } from '@/utils/image/helpers';
import { getBestImageUrl } from '@/utils/image/integration';
import { logger } from '@/lib/logger';

interface ImageUploadSectionProps {
  label: string;
  currentImageUrl?: string | null;
  currentImageMeta?: ImageMetadata | null;
  onImageChange: (imageUrl: string | null, imageMeta: ImageMetadata | null) => void;
  onRemoveImage: () => void;
  category: 'tasks' | 'rules' | 'rewards' | 'punishments' | 'encyclopedia';
}

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  label,
  currentImageUrl,
  currentImageMeta,
  onImageChange,
  onRemoveImage,
  category
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const imageUpload = useImageUpload({
    category,
    onUploadComplete: (result) => {
      logger.debug('[Image Upload Section] Upload completed:', result);
      // Clean up local preview
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }
      setLocalFile(null);
      
      // Update parent with new image data
      const bestUrl = getBestImageUrl(result.metadata, null, false);
      onImageChange(bestUrl, result.metadata);
    },
    onUploadError: (error) => {
      logger.error('[Image Upload Section] Upload failed:', error);
      // Clean up on error
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }
      setLocalFile(null);
    }
  });

  // Get the display URL - prefer current metadata, fallback to legacy URL
  const displayUrl = getBestImageUrl(currentImageMeta, currentImageUrl, false) || previewUrl;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create immediate preview
    const preview = createPreviewUrl(file);
    setPreviewUrl(preview);
    setLocalFile(file);

    // Start upload
    imageUpload.uploadImage(file);
  };

  const handleRemove = () => {
    // Clean up any preview
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    setLocalFile(null);
    
    // Call parent remove handler
    onRemoveImage();
  };

  // Clean up preview on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">{label}</FormLabel>
      
      <div className="border-2 border-dashed border-light-navy rounded-lg p-4">
        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {imageUpload.isUploading && (
                <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Uploading... {imageUpload.uploadProgress}%
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={imageUpload.isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 text-light-navy mx-auto mb-4" />
            <p className="text-light-navy mb-4">No image selected</p>
            <label htmlFor={`image-upload-${category}`}>
              <Button
                type="button"
                variant="outline"
                className="border-light-navy text-white hover:bg-light-navy"
                disabled={imageUpload.isUploading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {imageUpload.isUploading ? 'Uploading...' : 'Upload Image'}
                </span>
              </Button>
            </label>
          </div>
        )}
      </div>

      <input
        id={`image-upload-${category}`}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={imageUpload.isUploading}
      />
    </div>
  );
};

export default ImageUploadSection;
