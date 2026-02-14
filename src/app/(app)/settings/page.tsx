'use client';

import React from 'react';
import { ApprovalQueue } from '@/components/auto-response/approval-queue';
import { ConfigPanel } from '@/components/auto-response/config-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Tabs defaultValue="auto-response" className="w-full">
        <TabsList>
          <TabsTrigger value="auto-response">Auto-Response</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
        
        <TabsContent value="auto-response" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ApprovalQueue />
            </div>
            <div className="space-y-6">
              <ConfigPanel />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="general">
          <div className="p-4 text-muted-foreground">
            General settings coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
