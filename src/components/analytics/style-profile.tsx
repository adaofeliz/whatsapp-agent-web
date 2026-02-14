'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface StyleProfile {
  messageLength: "short" | "medium" | "long";
  formalityLevel: "casual" | "neutral" | "formal";
  emojiUsage: "none" | "low" | "medium" | "high";
  responseSpeed: "quick" | "delayed";
  responseStyle: "terse" | "verbose";
  commonPhrases: string[];
  topics: string[];
  emotionalTone: "warm" | "neutral" | "professional";
  summary: string;
}

interface StyleProfileProps {
  data: StyleProfile | null;
  isLoading: boolean;
}

export function StyleProfileCard({ data, isLoading }: StyleProfileProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
          <CardDescription>AI analysis of messaging patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Style</CardTitle>
        <CardDescription>AI analysis of messaging patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground italic">
          "{data.summary}"
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tone & Formality</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.formalityLevel}</Badge>
              <Badge variant="secondary">{data.emotionalTone}</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Habits</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{data.messageLength} msgs</Badge>
              <Badge variant="outline">{data.responseSpeed} reply</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Common Topics</h4>
          <div className="flex flex-wrap gap-2">
            {data.topics.map((topic, i) => (
              <Badge key={i} variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
