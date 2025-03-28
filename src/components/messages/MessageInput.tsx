
import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Send, X } from 'lucide-react';

interface MessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  handleSendMessage: () => void;
  isUploading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  setMessage,
  imageFile,
  setImageFile,
  handleSendMessage,
  isUploading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Please select an image smaller than 5MB.");
      }
      
      setImageFile(file);
      
      // Create a preview URL for the selected image
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const clearImage = () => {
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Clean up the object URL when the component unmounts or when the image file changes
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  return (
    <>
      {/* Image preview positioned well above the text input */}
      {imageFile && previewUrl && (
        <div className="fixed bottom-[100px] left-4 z-50">
          <div className="inline-flex bg-dark-navy border border-light-navy rounded-md relative">
            <img 
              src={previewUrl} 
              alt="Image preview" 
              className="max-h-20 object-contain rounded-md"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearImage}
              className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-dark-navy"
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Fixed message input container at bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-dark-navy px-4 py-2 border-t border-light-navy z-40">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-12 w-12 shrink-0 rounded-full bg-white border-0 hover:bg-gray-200 text-gray-600"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="h-6 w-6" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
          </Button>
          
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-12 rounded-full bg-navy border-light-navy text-white placeholder:text-gray-500"
            disabled={isUploading}
          />
          
          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full bg-cyan-700 shrink-0 hover:bg-cyan-600"
            onClick={handleSendMessage}
            disabled={(!message.trim() && !imageFile) || isUploading}
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default MessageInput;
