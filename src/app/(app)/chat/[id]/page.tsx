import React from 'react';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getChat } from '@/lib/db/wacli';

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const chatJid = decodeURIComponent(id);
  const chat = getChat(chatJid);
  
  const displayName = chat?.name || chatJid.split('@')[0];

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Avatar>
          <AvatarImage src={`/avatars/${chatJid}.png`} />
          <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            {chat?.kind === 'group' ? 'Group Chat' : 'Direct Message'}
          </p>
        </div>
      </header>
      
      <div className="flex-1 min-h-0">
        <MessageList chatJid={chatJid} />
      </div>
      <MessageInput chatJid={chatJid} />
    </div>
  );
}
