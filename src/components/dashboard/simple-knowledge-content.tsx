'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Wand2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type SimpleKnowledgeContentProps = {
  hasSources: boolean;
};

export function SimpleKnowledgeContent({ hasSources }: SimpleKnowledgeContentProps) {
  const router = useRouter();

  const handleAskAiOrganize = () => {
    try {
      window.localStorage.setItem(
        INTENT_STORAGE_KEY,
        'Organize my learning materials and build a clear structure for my courses and AI tutor.'
      );
    } catch {
      // ignore storage errors
    }
    router.push('/dashboard/ai-setup?mode=guided');
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Let AI organize your content
            </CardTitle>
            <CardDescription>
              Spaxio can scan your materials, group them into topics, and propose a course-ready structure.
            </CardDescription>
          </div>
          <Button size="lg" className="gap-2" onClick={handleAskAiOrganize}>
            <Wand2 className="h-4 w-4" />
            Ask AI to do it for me
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your learning materials
          </CardTitle>
          <CardDescription>
            {hasSources
              ? 'Add more documents or let AI reorganize what you already have.'
              : 'Start by adding a few documents or links. AI will handle the structure.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>AI can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Group similar materials into modules</li>
              <li>Suggest lessons and chapters</li>
              <li>Highlight gaps in your content</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Content readiness</p>
            <Progress value={hasSources ? 40 : 10} />
            <p className="text-xs text-muted-foreground">
              {hasSources
                ? 'Great start. Ask AI to organize what you have into a teachable flow.'
                : 'Once you add a few documents, AI can build a structure for you.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

