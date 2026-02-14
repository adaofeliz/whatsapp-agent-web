'use client';

import React, { useState, useEffect } from 'react';
import { Search, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Chat, AutoResponseConfig } from '@/types';

export function ConfigPanel() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [configs, setConfigs] = useState<Record<string, AutoResponseConfig>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [chatsRes, configsRes] = await Promise.all([
        fetch(`/api/chats?kind=dm&limit=50&q=${encodeURIComponent(searchQuery)}`),
        fetch('/api/settings/auto-response')
      ]);

      if (!chatsRes.ok || !configsRes.ok) throw new Error('Failed to fetch data');

      const chatsData = await chatsRes.json();
      const configsData = await configsRes.json();

      setChats(chatsData.chats);
      
      const configMap: Record<string, AutoResponseConfig> = {};
      configsData.configs.forEach((config: AutoResponseConfig) => {
        configMap[config.chat_jid] = config;
      });
      setConfigs(configMap);
    } catch (error) {
      console.error('Error fetching config data:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggle = async (chatJid: string, enabled: boolean) => {
    try {
      setConfigs(prev => ({
        ...prev,
        [chatJid]: {
          ...prev[chatJid],
          chat_jid: chatJid,
          enabled: enabled ? 1 : 0,
        } as AutoResponseConfig
      }));

      const res = await fetch('/api/settings/auto-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatJid,
          enabled
        }),
      });

      if (!res.ok) throw new Error('Failed to update config');
      
      const data = await res.json();
      setConfigs(prev => ({
        ...prev,
        [chatJid]: data.config
      }));
      
      toast.success(`Auto-response ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
      fetchData();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Auto-Response Configuration
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search chats..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No chats found</div>
          ) : (
            chats.map((chat) => {
              const config = configs[chat.jid];
              const isEnabled = config?.enabled === 1;

              return (
                <div key={chat.jid} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{chat.name?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{chat.name || chat.jid}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{chat.jid}</div>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(chat.jid, checked)}
                    aria-label={`Toggle auto-response for ${chat.name || chat.jid}`}
                  />
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
