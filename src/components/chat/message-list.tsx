'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePolling } from '@/hooks/use-polling';
import { Message } from '@/types';
import { formatTime, formatDate, isToday, isYesterday } from '@/lib/utils/dates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MessageListProps {
  chatJid: string;
}

export function MessageList({ chatJid }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?chatJid=${encodeURIComponent(chatJid)}&limit=50`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  usePolling(fetchMessages, 2000);

  useEffect(() => {
    fetchMessages();
    setShouldScroll(true);
  }, [chatJid]);

  useEffect(() => {
    if (shouldScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, shouldScroll]);

  const renderMediaPlaceholder = (msg: Message) => {
    if (!msg.media_type) return null;

    let icon = '📄';
    let label = 'Document';

    if (msg.media_type.startsWith('image')) {
      icon = '📷';
      label = 'Image';
    } else if (msg.media_type.startsWith('video')) {
      icon = '🎥';
      label = 'Video';
    } else if (msg.media_type.startsWith('audio')) {
      icon = '🎵';
      label = 'Audio';
    }

    return (
      <div className="flex items-center gap-2 p-2 bg-background/10 rounded border border-border/20 my-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm italic">
          [{label}{msg.filename ? `: ${msg.filename}` : ''}]
        </span>
      </div>
    );
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const date = formatDate(msg.ts);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-6">
        {messageGroups.map((group) => (
          <div key={group.date} className="space-y-4">
            <div className="flex justify-center sticky top-0 z-10">
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full shadow-sm">
                {isToday(new Date(group.date).getTime() / 1000)
                  ? 'Today'
                  : isYesterday(new Date(group.date).getTime() / 1000)
                  ? 'Yesterday'
                  : group.date}
              </span>
            </div>
            
            {group.messages.map((msg) => {
              const isMe = msg.from_me === 1;
              
              return (
                <div
                  key={msg.msg_id}
                  className={cn(
                    "flex gap-2 max-w-[80%]",
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  {!isMe && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={`/avatars/${msg.sender_jid || msg.chat_jid}.png`} />
                      <AvatarFallback>
                        {(msg.sender_jid || msg.chat_jid || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "rounded-lg p-3 shadow-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none"
                    )}
                  >
                    {!isMe && msg.sender_jid && (
                      <div className="text-xs font-medium opacity-70 mb-1">
                        {msg.sender_jid.split('@')[0]}
                      </div>
                    )}
                    
                    {renderMediaPlaceholder(msg)}
                    
                    {msg.text && (
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {msg.text}
                      </p>
                    )}
                    
                    {msg.media_caption && (
                      <p className="whitespace-pre-wrap break-words text-sm mt-1 italic opacity-90">
                        {msg.media_caption}
                      </p>
                    )}
                    
                    <div className={cn(
                      "text-[10px] mt-1 text-right opacity-70",
                      isMe ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {formatTime(msg.ts)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
