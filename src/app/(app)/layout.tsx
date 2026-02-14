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
      <div className="flex h-full">
        <aside className="w-[280px] border-r flex-shrink-0 bg-background">
          <ChatList />
        </aside>
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          {children}
        </main>
        <aside className="w-[320px] border-l flex-shrink-0 bg-background hidden lg:block">
          <RightPanel />
        </aside>
      </div>
    </AppShell>
  );
}
