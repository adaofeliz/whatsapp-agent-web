import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ChatList } from '@/components/chat/chat-list';
import { RightPanel } from '@/components/layout/right-panel';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="flex h-full min-h-0">
        <aside className="w-[280px] border-r flex-shrink-0 bg-background">
          <ChatList />
        </aside>
        <aside className="w-[360px] border-r flex-shrink-0 bg-background">
          <RightPanel />
        </aside>
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
