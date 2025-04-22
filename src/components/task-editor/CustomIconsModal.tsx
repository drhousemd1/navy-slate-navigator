
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CustomIconsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconUrl: string) => void;
  iconColor: string;
}

interface CustomIcon {
  id: string;
  url: string;
  created_at: string;
  name: string;
}

const CustomIconsModal: React.FC<CustomIconsModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  iconColor
}) => {
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCustomIcons();
    }
  }, [isOpen]);

  const fetchCustomIcons = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .storage
        .from('custom-icons')
        .list();
      
      if (error) {
        throw error;
      }
      
      // Filter out folders and transform the data
      const icons = data
        .filter(file => !file.name.endsWith('/'))
        .map(file => ({
          id: file.id,
          name: file.name,
          url: `${supabase.storage.from('custom-icons').getPublicUrl(file.name).data.publicUrl}`,
          created_at: file.created_at
        }));
      
      setCustomIcons(icons);
    } catch (error) {
      console.error('Error fetching custom icons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom icons',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectIcon = (iconUrl: string) => {
    onSelectIcon(iconUrl);
    onClose();
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    setIsUploading(true);
    
    try {
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('custom-icons')
        .upload(fileName, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = supabase
        .storage
        .from('custom-icons')
        .getPublicUrl(fileName);
        
      toast({
        title: 'Icon uploaded',
        description: 'Custom icon has been uploaded successfully',
      });
      
      // Refresh the list of icons
      fetchCustomIcons();
      
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload custom icon',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-navy border-light-navy text-white max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Custom Icons
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <Button 
            className="w-full bg-light-navy hover:bg-navy text-white flex items-center justify-center gap-2"
            onClick={() => document.getElementById('icon-upload-input')?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload New Icon'}
          </Button>
          <input
            id="icon-upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadIcon}
            disabled={isUploading}
          />
        </div>
        
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-light-navy">Loading custom icons...</p>
            </div>
          ) : customIcons.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-light-navy">No custom icons uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mt-4">
              {customIcons.map((icon) => (
                <div
                  key={icon.id}
                  className="aspect-square rounded-md bg-light-navy flex items-center justify-center cursor-pointer hover:bg-navy transition-colors p-2"
                  onClick={() => handleSelectIcon(icon.url)}
                  title={icon.name}
                >
                  <img
                    src={icon.url}
                    alt="Custom icon"
                    className="h-6 w-6 object-contain"
                    style={{ filter: iconColor !== '#FFFFFF' ? `drop-shadow(0 0 1px ${iconColor})` : 'none' }}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CustomIconsModal;
