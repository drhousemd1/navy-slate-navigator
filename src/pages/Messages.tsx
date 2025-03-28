import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMessages, Message } from '@/hooks/useMessages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Messages: React.FC = () => {
  const { user, getNickname, getProfileImage } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    loadOlderMessages,
    imageFile,
    setImageFile,
    isUploading
  } = useMessages();

  const userNickname = getNickname();
  const userProfileImage = getProfileImage();

  useEffect(() => {
    if (messages.length > 0 && !loadingOlder) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (messages.length > 0 && !oldestMessageDate) {
      setOldestMessageDate(messages[0].created_at);
    }
  }, [messages, loadingOlder]);

  const handleSendMessage = async () => {
    if (!user || !message.trim() && !imageFile) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('linked_partner_id')
        .eq('id', user.id)
        .single();
      
      if (!data || !data.linked_partner_id) {
        toast({
          title: "No partner found",
          description: "You need to link with a partner before sending messages.",
          variant: "destructive"
        });
        return;
      }
      
      await sendMessage(message, data.linked_partner_id);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setImageFile(file);
    }
  };

  const handleLoadOlderMessages = async () => {
    if (!oldestMessageDate || loadingOlder) return;
    
    setLoadingOlder(true);
    try {
      const olderMessages = await loadOlderMessages(oldestMessageDate);
      if (olderMessages.length > 0) {
        setOldestMessageDate(olderMessages[0].created_at);
      } else {
        toast({
          title: "No more messages",
          description: "You've reached the beginning of your conversation.",
        });
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="bg-navy border-b border-light-navy py-4 px-4">
          <h1 className="text-xl font-semibold text-white">Messages</h1>
          <p className="text-gray-400 text-sm">Chat with your partner</p>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden p-4 pt-0 h-screen">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Loading messages...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-400">Error loading messages: {(error as Error).message}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {messages.length > 0 && (
                <div className="py-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadOlderMessages}
                    disabled={loadingOlder}
                    className="bg-navy hover:bg-light-navy text-white border-light-navy"
                  >
                    {loadingOlder ? 'Loading...' : 'Load older messages'}
                  </Button>
                </div>
              )}
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-gray-400">No messages yet. Send the first one!</p>
                    </div>
                  ) : (
                    messages.map((msg: Message) => {
                      const isSentByMe = msg.sender_id === user?.id;
                      
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex ${isSentByMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[80%]`}>
                            <Avatar className="h-8 w-8 border border-light-navy">
                              <AvatarImage 
                                src={isSentByMe ? userProfileImage : undefined} 
                                alt={isSentByMe ? userNickname : "Partner"}
                              />
                              <AvatarFallback className="bg-light-navy text-nav-active text-xs">
                                {isSentByMe ? userNickname?.charAt(0).toUpperCase() : "P"}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div 
                              className={`mx-2 p-3 rounded-lg ${
                                isSentByMe
                                  ? 'bg-cyan-800 text-white rounded-br-none'
                                  : 'bg-navy border border-light-navy text-white rounded-bl-none'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs mb-1">
                                  {isSentByMe ? userNickname : "Partner"}
                                </span>
                                
                                {msg.content && (
                                  <p className="text-sm break-words">{msg.content}</p>
                                )}
                                
                                {msg.image_url && (
                                  <div className="mt-2">
                                    <img
                                      src={msg.image_url}
                                      alt="Message attachment"
                                      className="max-w-full rounded-md max-h-60 object-contain"
                                    />
                                  </div>
                                )}
                                
                                <span className="text-xs opacity-70 mt-1 self-end">
                                  {formatMessageTime(msg.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageEndRef} />
                </div>
              </ScrollArea>
              
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
              
              <div className="flex items-center gap-2 pt-2 pb-3">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0 border-light-navy hover:bg-light-navy text-gray-300"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Camera className="h-5 w-5" />
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
                  className="flex-1 bg-navy border-light-navy text-white placeholder:text-gray-500"
                  disabled={isUploading}
                />
                
                <Button
                  type="button"
                  size="icon"
                  className="bg-cyan-700 shrink-0 hover:bg-cyan-600"
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && !imageFile) || isUploading}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
