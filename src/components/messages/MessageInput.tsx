
import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Send } from 'lucide-react';

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Please select an image smaller than 5MB.");
      }
      
      setImageFile(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-dark-navy px-4 py-2 z-50 border-t border-light-navy">
      {imageFile && (
        <div className="p-2 border border-light-navy rounded-md mb-2 bg-navy">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 truncate">
              {imageFile.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImageFile(null)}
              className="text-red-400 hover:text-red-300 hover:bg-transparent p-0 h-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
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
  );
};

export default MessageInput;
