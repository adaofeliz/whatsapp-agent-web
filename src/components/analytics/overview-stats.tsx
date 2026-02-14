'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Inbox, Image as ImageIcon, Calendar, Clock } from 'lucide-react';

interface ChatStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  mediaMessages: number;
  firstMessageTs: number;
  lastMessageTs: number;
  avgMessagesPerDay: number;
}

interface OverviewStatsProps {
  data: ChatStats | null;
  isLoading: boolean;
}

export function OverviewStats({ data, isLoading }: OverviewStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Total Messages',
      value: data.totalMessages.toLocaleString(),
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      label: 'Sent',
      value: data.sentMessages.toLocaleString(),
      icon: Send,
      color: 'text-green-500',
    },
    {
      label: 'Received',
      value: data.receivedMessages.toLocaleString(),
      icon: Inbox,
      color: 'text-orange-500',
    },
    {
      label: 'Media',
      value: data.mediaMessages.toLocaleString(),
      icon: ImageIcon,
      color: 'text-purple-500',
    },
    {
      label: 'Avg / Day',
      value: Math.round(data.avgMessagesPerDay).toLocaleString(),
      icon: Calendar,
      color: 'text-pink-500',
    },
    {
      label: 'Duration',
      value: data.firstMessageTs && data.lastMessageTs 
        ? `${Math.ceil((data.lastMessageTs - data.firstMessageTs) / (60 * 60 * 24))} days`
        : 'N/A',
      icon: Clock,
      color: 'text-yellow-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.label}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
