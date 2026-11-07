import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Send, X } from 'lucide-react';

interface MessageInputProps {
  message: string; setMessage: (message: string) => void;
  imageFile: Blob | null; setImageFile: (file: File | null) => void;
  handleSendMessage: () => void; isUploading: boolean; disabled?: boolean;
}
export default function MessageInput({ message, setMessage, imageFile, setImageFile, handleSendMessage, isUploading, disabled = false }: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  useEffect(() => {
    if (!imageFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(imageFile); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const locked = disabled || isUploading;
  const selectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setImageError('Choose a JPEG, PNG, GIF or WebP image smaller than 5 MiB.'); return;
    }
    setImageError(null); setImageFile(file);
  };
  return <div className="flex flex-col w-full">
    {imageFile && previewUrl && <div className="fixed bottom-32 left-4 z-50">
      <div className="inline-flex bg-dark-navy border border-light-navy rounded-md relative">
        <img src={previewUrl} alt="Image preview" className="max-h-20 object-contain rounded-md" />
        <Button type="button" aria-label="Remove image" variant="ghost" size="icon" disabled={locked} onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-dark-navy"><X className="h-4 w-4 text-red-500" /></Button>
      </div>
    </div>}
    <div className="fixed bottom-16 left-0 right-0 bg-dark-navy px-4 py-2 border-t border-light-navy z-50 shadow-lg">
      {imageError && <p role="alert" className="text-sm text-red-300 mb-2">{imageError}</p>}
      <div className="flex items-center gap-2">
        <Button type="button" aria-label="Choose image" size="icon" variant="ghost" className="h-12 w-12 shrink-0 rounded-full bg-white border-0 hover:bg-gray-200 text-gray-600" onClick={() => fileInputRef.current?.click()} disabled={locked}><Camera className="h-6 w-6" /></Button>
        <input type="file" aria-label="Message image" ref={fileInputRef} onChange={selectImage} accept="image/jpeg,image/png,image/gif,image/webp" disabled={locked} className="hidden" />
        <Input aria-label="Message" maxLength={10000} placeholder="Type a message..." value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && !locked && (message.trim() || imageFile)) { event.preventDefault(); handleSendMessage(); } }} className="flex-1 h-12 rounded-full bg-navy border-light-navy text-white placeholder:text-gray-500" disabled={locked} />
        <Button type="button" aria-label="Send message" size="icon" className="h-12 w-12 rounded-full bg-cyan-700 shrink-0 hover:bg-cyan-600" onClick={handleSendMessage} disabled={locked || (!message.trim() && !imageFile)}><Send className="h-6 w-6" /></Button>
      </div>
    </div>
  </div>;
}
