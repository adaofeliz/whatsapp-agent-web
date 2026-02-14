'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MessageInputProps {
  chatJid: string;
}

export function MessageInput({ chatJid }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: chatJid,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      toast.success('Message sent');
      setMessage('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggest = () => {
    window.dispatchEvent(new Event('whatsapp-agent:open-suggestions'));
  };

  React.useEffect(() => {
    const handleInsert = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.text) {
        setMessage(customEvent.detail.text);
      }
    };

    window.addEventListener('whatsapp-agent:insert-proposal', handleInsert);
    return () => window.removeEventListener('whatsapp-agent:insert-proposal', handleInsert);
  }, []);

  const isDisabled = !message.trim() || isLoading;

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleSuggest}
          title="Suggest replies"
          disabled={isLoading}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1"
          disabled={isLoading}
        />
        
        <Button 
          onClick={handleSend} 
          size="icon"
          disabled={isDisabled}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
