'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DropoutPoint {
  yourMessage: string;
  timestamp: string;
  possibleReason: string;
  reengagementSuggestion: string;
}

interface DropoutAnalysis {
  dropoutPoints: DropoutPoint[];
  overallPattern: string;
}

interface DropoutListProps {
  data: DropoutAnalysis | null;
  isLoading: boolean;
}

export function DropoutList({ data, isLoading }: DropoutListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversation Dropouts</CardTitle>
          <CardDescription>Where the conversation stalled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.dropoutPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversation Dropouts</CardTitle>
          <CardDescription>No significant dropouts detected</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Dropouts</CardTitle>
        <CardDescription>Where the conversation stalled</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground italic">
          "{data.overallPattern}"
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {data.dropoutPoints.map((point, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {new Date(point.timestamp).toLocaleString()}
                </div>
                <div className="text-sm font-medium border-l-2 border-primary pl-2">
                  "{point.yourMessage}"
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-destructive">Reason:</span> {point.possibleReason}
                </div>
                <div className="text-sm bg-muted p-2 rounded">
                  <span className="font-semibold text-primary">Try:</span> {point.reengagementSuggestion}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
