'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface MessagesByHour {
  hour: number;
  count: number;
}

interface TimingChartProps {
  data: MessagesByHour[] | null;
  isLoading: boolean;
}

export function TimingChart({ data, isLoading }: TimingChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity by Hour</CardTitle>
          <CardDescription>When messages are most frequent</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity by Hour</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = Array.from({ length: 24 }, (_, i) => {
    const hourData = data.find((d) => d.hour === i);
    return {
      hour: i,
      count: hourData ? hourData.count : 0,
      label: `${i}:00`,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity by Hour</CardTitle>
        <CardDescription>When messages are most frequent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="hour" 
                tickFormatter={(val) => `${val}`} 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Hour
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[0].payload.label}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Messages
                            </span>
                            <span className="font-bold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
