'use client';

import { useRouter } from 'next/navigation';
import { Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/view-mode-context';

type SimpleDeveloperModeLinkProps = {
  title?: string;
  description?: string;
  /** If set, show a button that switches to Developer Mode and navigates to this path */
  developerPath?: string;
  linkLabel?: string;
};

export function SimpleDeveloperModeLink({
  title = 'Need more control?',
  description = 'Developer Mode gives you access to all settings and advanced options.',
  developerPath,
  linkLabel = 'Open in Developer Mode',
}: SimpleDeveloperModeLinkProps) {
  const { setMode } = useViewMode();
  const router = useRouter();

  const handleOpenInDeveloperMode = () => {
    setMode('developer');
    if (developerPath) router.push(developerPath);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {developerPath && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenInDeveloperMode}>
            {linkLabel}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setMode('developer')}>
          <Code className="h-4 w-4" />
          Switch to Developer Mode
        </Button>
      </CardContent>
    </Card>
  );
}
