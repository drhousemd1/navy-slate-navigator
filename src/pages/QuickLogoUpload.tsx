
import React, { useEffect } from 'react';
import { logoManager } from '@/services/logoManager';
import { toast } from '@/hooks/use-toast';

const QuickLogoUpload: React.FC = () => {
  useEffect(() => {
    const uploadUserLogo = async () => {
      try {
        // Fetch the user's uploaded image
        const response = await fetch('/lovable-uploads/2f7e6ae5-93d8-4961-bc18-c5cfa2471359.png');
        if (!response.ok) {
          throw new Error('Could not fetch uploaded image');
        }
        
        const blob = await response.blob();
        const file = new File([blob], 'user-logo.png', { type: 'image/png' });
        
        // Upload using the logo manager
        const result = await logoManager.uploadLogo(file);
        
        if (result.success) {
          toast({
            title: "Logo Updated!",
            description: "Your bound hands logo has been successfully uploaded and is now displayed."
          });
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: result.message
          });
        }
      } catch (error) {
        console.error('Failed to upload logo:', error);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: "Failed to upload your logo. Please try the manual upload page."
        });
      }
    };

    uploadUserLogo();
  }, []);

  return (
    <div className="container mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Uploading Your Logo...</h1>
      <p>Please wait while we upload your bound hands logo to the app.</p>
      <div className="mt-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
};

export default QuickLogoUpload;
