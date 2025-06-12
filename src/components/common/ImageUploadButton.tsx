
import React, { useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImageUpload } from '@/hooks/useImageUpload';
import { type ImageMeta } from '@/utils/image/helpers';
import { getFileSizeString } from '@/utils/image/optimize';

interface ImageUploadButtonProps {
  onImageUploaded: (imageMeta: ImageMeta) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImageUploaded,
  disabled = false,
  className = '',
  variant = 'outline',
  size = 'default',
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading, progress } = useImageUpload();

  const handleButtonClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageMeta = await uploadImage(file);
      onImageUploaded(imageMeta);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getButtonContent = () => {
    if (isUploading && progress) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {progress.message}
        </>
      );
    }

    if (children) {
      return children;
    }

    return (
      <>
        <Upload className="w-4 h-4 mr-2" />
        Upload Image
      </>
    );
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className={className}
      >
        {getButtonContent()}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      
      {/* Progress indicator */}
      {isUploading && progress && (
        <div className="mt-2 space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{progress.message}</p>
        </div>
      )}
    </>
  );
};

export default ImageUploadButton;
