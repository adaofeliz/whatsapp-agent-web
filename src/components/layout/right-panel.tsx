'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StyleProfileCard } from '@/components/analytics/style-profile';
import { TimingChart } from '@/components/analytics/timing-chart';
import { FrequencyChart } from '@/components/analytics/frequency-chart';
import { DropoutList } from '@/components/analytics/dropout-list';
import { OverviewStats } from '@/components/analytics/overview-stats';
import { SuggestionPanel } from '@/components/ai/suggestion-panel';
import { toast } from 'sonner';

export function RightPanel() {
  const params = useParams();
  const chatJid = params?.id ? decodeURIComponent(params.id as string) : null;

  const [styleProfile, setStyleProfile] = useState<any>(null);
  const [timingData, setTimingData] = useState<any>(null);
  const [frequencyData, setFrequencyData] = useState<any>(null);
  const [dropoutData, setDropoutData] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");

  useEffect(() => {
    if (!chatJid) {
      setStyleProfile(null);
      setTimingData(null);
      setFrequencyData(null);
      setDropoutData(null);
      setOverviewData(null);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [styleRes, timingRes, freqRes, dropoutRes, overviewRes] = await Promise.all([
          fetch(`/api/analytics/style?chatJid=${encodeURIComponent(chatJid)}`),
          fetch(`/api/analytics/timing?chatJid=${encodeURIComponent(chatJid)}`),
          fetch(`/api/analytics/frequency?chatJid=${encodeURIComponent(chatJid)}`),
          fetch(`/api/analytics/dropout?chatJid=${encodeURIComponent(chatJid)}`),
          fetch(`/api/analytics/overview?chatJid=${encodeURIComponent(chatJid)}`),
        ]);

        if (styleRes.ok) setStyleProfile(await styleRes.json());
        if (timingRes.ok) setTimingData(await timingRes.json());
        if (freqRes.ok) setFrequencyData(await freqRes.json());
        if (dropoutRes.ok) setDropoutData(await dropoutRes.json());
        if (overviewRes.ok) setOverviewData(await overviewRes.json());
      } catch (error) {
        console.error("Failed to fetch analytics", error);
        toast.error("Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [chatJid]);

  useEffect(() => {
    const handleOpenSuggestions = () => {
      setActiveTab("suggestions");
    };
    window.addEventListener('whatsapp-agent:open-suggestions', handleOpenSuggestions);
    return () => window.removeEventListener('whatsapp-agent:open-suggestions', handleOpenSuggestions);
  }, []);

  if (!chatJid) {
    return (
      <div className="h-full flex flex-col border-l bg-muted/10 items-center justify-center text-muted-foreground p-4 text-center">
        <p>Select a chat to view analytics</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l bg-muted/10 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b flex-shrink-0">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <TabsContent value="analytics" className="m-0 space-y-4">
                <OverviewStats data={overviewData} isLoading={isLoading} />
                <StyleProfileCard data={styleProfile} isLoading={isLoading} />
                <TimingChart data={timingData?.hourlyStats} isLoading={isLoading} />
                <FrequencyChart data={frequencyData} isLoading={isLoading} />
                <DropoutList data={dropoutData} isLoading={isLoading} />
              </TabsContent>
              
              <TabsContent value="suggestions" className="m-0 space-y-4">
                <SuggestionPanel chatJid={chatJid} />
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
