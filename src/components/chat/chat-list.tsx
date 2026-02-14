'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatRelative } from '@/lib/utils/dates';
import { resolveDisplayName } from '@/lib/utils/names';
import { usePolling } from '@/hooks/use-polling';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Chat } from '@/types';

export function ChatList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const fetchChats = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('q', searchQuery);
      }
      const res = await fetch(`/api/chats?${params.toString()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  usePolling(fetchChats, 2000);

  useEffect(() => {
    fetchChats();
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          {chats.map((chat) => {
            const isActive = pathname === `/chat/${encodeURIComponent(chat.jid)}`;
            const displayName = chat.name || chat.jid.split('@')[0];
            
            return (
              <Link
                key={chat.jid}
                href={`/chat/${encodeURIComponent(chat.jid)}`}
                className={`flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors ${
                  isActive ? 'bg-muted' : ''
                }`}
              >
                <Avatar>
                  <AvatarImage src={`/avatars/${chat.jid}.png`} />
                  <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{displayName}</span>
                    {chat.last_message_ts && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatRelative(chat.last_message_ts)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {chat.kind === 'group' ? 'Group Chat' : 'Direct Message'}
                  </div>
                </div>
              </Link>
            );
          })}
          {chats.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              No chats found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
