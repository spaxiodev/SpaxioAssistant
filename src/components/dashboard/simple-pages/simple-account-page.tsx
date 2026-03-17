'use client';

import { useRouter } from 'next/navigation';
import { User, Shield, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SimplePageHeader,
  SimpleAiAssistPanel,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';

export function SimpleAccountPage() {
  const router = useRouter();
  const { setMode } = useViewMode();

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Account"
        description="Your profile, security, and preferences. Business details are in Settings."
        icon={<User className="h-6 w-6" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Name, email, and avatar. This is how you appear in the app and to your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/account')}>
              Edit profile
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Password and sign-in options. Manage your account security in Developer Mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/account')}>
              Open account settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Business information
          </CardTitle>
          <CardDescription>
            Company name, description, and how the assistant represents you. Edit in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/settings')}>
            Open Settings
          </Button>
        </CardContent>
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Get suggestions for your profile or business description."
        actions={[
          {
            label: 'Improve my business description',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'Improve my business description for the assistant.');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/account" linkLabel="Open full account in Developer Mode" />
    </div>
  );
}
