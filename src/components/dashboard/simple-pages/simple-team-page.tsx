'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Sparkles, Users, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleAiAssistPanel,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';

type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  role_label: string | null;
  is_owner?: boolean;
};

type Invitation = {
  id: string;
  email: string;
  role_label: string | null;
  expires_at: string;
};

export function SimpleTeamPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/team/members'), fetch('/api/team/invitations')])
      .then(([membersRes, invRes]) => Promise.all([membersRes.json(), invRes.json()]))
      .then(([membersData, invData]) => {
        if (cancelled) return;
        setMembers(membersData.members ?? []);
        setInvitations(invData.invitations ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          setInvitations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleLabel = (m: Member) => {
    if (m.is_owner) return 'Owner';
    return m.role_label || m.role || 'Member';
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Team"
        description="See who has access, invite teammates, and change permissions. Use plain-language roles to keep it simple."
        icon={<Users className="h-6 w-6" />}
      />

      {/* Manual actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              Invite teammate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Send an invite by email. Choose what they can see and do.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/team')}>
              Invite in Developer Mode
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Change permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Edit what each member can do: leads, conversations, settings.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/team')}>
              Edit in Developer Mode
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remove access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Remove a teammate’s access when they leave.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/team')}>
              Manage in Developer Mode
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current members & invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current members</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : `${members.length} member(s). ${invitations.length} pending invite(s).`}
          </CardDescription>
        </CardHeader>
        {!loading && (members.length > 0 || invitations.length > 0) && (
          <CardContent className="space-y-4">
            {members.length > 0 && (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <span className="font-medium">{m.full_name || m.email || 'Unknown'}</span>
                      {m.email && m.full_name && (
                        <span className="ml-2 text-sm text-muted-foreground">{m.email}</span>
                      )}
                    </div>
                    <Badge variant={m.is_owner ? 'default' : 'secondary'}>{roleLabel(m)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {invitations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Pending invitations</p>
                <ul className="space-y-2">
                  {invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{inv.email}</span>
                      {inv.role_label && (
                        <Badge variant="outline" className="text-xs">{inv.role_label}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
        {!loading && members.length === 0 && invitations.length === 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground">Only you have access. Invite teammates from Developer Mode.</p>
          </CardContent>
        )}
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Get a recommendation for the right permission level for a role."
        actions={[
          {
            label: 'Recommend the right permission level',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'Help me set team permissions. I want to invite someone who should only see leads, not change settings. Recommend the right role.');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/team" linkLabel="Open Team in Developer Mode" />
    </div>
  );
}
