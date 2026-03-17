'use client';

import { Command } from 'cmdk';
import { useRouter } from '@/i18n/navigation';
import { useViewMode } from '@/contexts/view-mode-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  searchStaticItems,
  GROUP_LABELS,
  type SearchableItem,
  type SearchResultGroup,
} from '@/lib/search/search-index';
import {
  LayoutDashboard,
  Sparkles,
  Bot,
  BookOpen,
  Code,
  MessageCircle,
  Users,
  FileText,
  Workflow,
  UserPlus,
  CreditCard,
  Settings,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPalette } from './command-palette-context';

type SearchRecord = {
  id: string;
  group: string;
  label: string;
  subtitle?: string;
  href: string;
};

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pages: LayoutDashboard,
  actions: Sparkles,
  leads: Users,
  'quote-requests': FileText,
  conversations: MessageCircle,
  knowledge: BookOpen,
  automations: Workflow,
  team: UserPlus,
  settings: Settings,
};

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'page-overview': LayoutDashboard,
  'page-ai-setup': Sparkles,
  'page-agents': Bot,
  'page-knowledge': BookOpen,
  'page-install': Code,
  'page-conversations': MessageCircle,
  'page-leads': Users,
  'page-quote-requests': FileText,
  'page-automations': Workflow,
  'page-team': UserPlus,
  'page-billing': CreditCard,
  'page-settings': Settings,
  'page-help': HelpCircle,
};

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 font-medium">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

function ResultItem({
  item,
  query,
  onSelect,
  type,
}: {
  item: SearchableItem | SearchRecord;
  query: string;
  onSelect: () => void;
  type: 'static' | 'record';
}) {
  const isStatic = type === 'static';
  const label = item.label;
  const subtitle = 'subtitle' in item ? item.subtitle : undefined;
  const href = item.href;
  const group = item.group;
  const id = item.id;

  let Icon = GROUP_ICONS[group] ?? LayoutDashboard;
  if (isStatic && id in PAGE_ICONS) {
    Icon = PAGE_ICONS[id];
  }

  return (
    <Command.Item
      value={`${group}-${id}-${label}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          <Highlight text={label} query={query} />
        </div>
        {subtitle && (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Command.Item>
  );
}

export function CommandPaletteContent() {
  const router = useRouter();
  const { close } = useCommandPalette();
  const { mode } = useViewMode();
  const isSimpleMode = mode === 'simple';
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const staticItems = useMemo(() => {
    return searchStaticItems(query, isSimpleMode);
  }, [query, isSimpleMode]);

  const fetchRecords = useCallback(async (q: string) => {
    if (q.length < 2) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) return;
      const data = await res.json();
      const all: SearchRecord[] = [
        ...(data.leads ?? []),
        ...(data.quoteRequests ?? []),
        ...(data.conversations ?? []),
        ...(data.knowledge ?? []),
        ...(data.automations ?? []),
        ...(data.agents ?? []),
      ];
      setRecords(all);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchRecords(query), 150);
    return () => clearTimeout(t);
  }, [query, fetchRecords]);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const hasStatic = staticItems.length > 0;
  const hasRecords = records.length > 0;
  const isEmpty = !hasStatic && !hasRecords && !loading;
  const showEmpty = query.length >= 1 && isEmpty;

  const groupedStatic = useMemo(() => {
    const byGroup = new Map<string, SearchableItem[]>();
    for (const item of staticItems) {
      const arr = byGroup.get(item.group) ?? [];
      arr.push(item);
      byGroup.set(item.group, arr);
    }
    return byGroup;
  }, [staticItems]);

  const groupedRecords = useMemo(() => {
    const byGroup = new Map<string, SearchRecord[]>();
    for (const r of records) {
      const arr = byGroup.get(r.group) ?? [];
      arr.push(r);
      byGroup.set(r.group, arr);
    }
    return byGroup;
  }, [records]);

  const orderedGroups: SearchResultGroup[] = [
    'pages',
    'actions',
    'leads',
    'quote-requests',
    'conversations',
    'knowledge',
    'automations',
    'team',
    'settings',
  ];

  return (
    <Command
      className="flex flex-col overflow-hidden rounded-lg border bg-popover shadow-xl"
      shouldFilter={false}
      loop
    >
      <div className="flex items-center border-b px-3">
        <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search…"
          className="flex h-12 w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          autoFocus
        />
        <kbd className="pointer-events-none hidden shrink-0 items-center gap-1 rounded border bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">esc</span>
        </kbd>
      </div>
      <Command.List className="max-h-[min(70vh,400px)] overflow-auto p-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Searching…
          </div>
        )}
        {!loading && (
          <>
            {orderedGroups.map((group) => {
              const staticGroup = groupedStatic.get(group) ?? [];
              const recordGroup = groupedRecords.get(group) ?? [];
              if (staticGroup.length === 0 && recordGroup.length === 0) return null;
              const label = GROUP_LABELS[group] ?? group;
              return (
                <Command.Group key={group} heading={label} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                  {staticGroup.map((item) => (
                    <ResultItem
                      key={item.id}
                      item={item}
                      query={query}
                      onSelect={() => navigate(item.href)}
                      type="static"
                    />
                  ))}
                  {recordGroup.map((r) => (
                    <ResultItem
                      key={r.id}
                      item={r}
                      query={query}
                      onSelect={() => navigate(r.href)}
                      type="record"
                    />
                  ))}
                </Command.Group>
              );
            })}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">No results found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching for a page, action, or record name
                </p>
              </div>
            )}
          </>
        )}
      </Command.List>
    </Command>
  );
}
