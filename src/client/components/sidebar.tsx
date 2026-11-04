import { Bot, Hash, Home, Loader2, LogOut, Wifi, WifiOff } from 'lucide-react';
import { CHANNELS } from '../../shared/channels';
import type { ConnectionStatus, Household, HouseholdMember } from '../../shared/types';
import { cn } from '../lib/cn';
import { Avatar, Badge, Button, Separator } from './ui';

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'live') {
    return (
      <Badge variant="live">
        <Wifi /> Live
      </Badge>
    );
  }
  if (status === 'offline') {
    return (
      <Badge variant="warn">
        <WifiOff /> Offline
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Loader2 className="animate-spin" /> {status === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
    </Badge>
  );
}

export interface SidebarUser {
  name: string;
  email: string;
}

export function Sidebar({
  household,
  members,
  onlineIds,
  activeChannel,
  onSelectChannel,
  status,
  user,
  onSignOut,
  signingOut,
}: {
  household: Household;
  members: HouseholdMember[];
  onlineIds: Set<string>;
  activeChannel: string;
  onSelectChannel: (channelId: string) => void;
  status: ConnectionStatus;
  user: SidebarUser;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <Home className="size-4 shrink-0 text-stone-500" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight">
            {household.name} <span aria-hidden="true">🏡</span>
          </h1>
        </div>
      </div>
      <div className="px-4 pb-3">
        <StatusBadge status={status} />
      </div>
      <Separator />

      <nav aria-label="Channels" className="px-2 py-3">
        <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Channels
        </p>
        <ul className="grid gap-0.5">
          {CHANNELS.map((channel) => {
            const active = channel.id === activeChannel;
            return (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => onSelectChannel(channel.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
                  )}
                >
                  <Hash className="size-3.5 opacity-70" />
                  {channel.name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <Separator />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Family
        </p>
        <ul className="grid gap-0.5">
          {members.map((member) => {
            const online = onlineIds.has(member.id);
            return (
              <li
                key={member.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                title={member.status || member.name}
              >
                <span className="relative shrink-0">
                  <Avatar name={member.name} className="size-7 text-xs" />
                  <span
                    aria-label={online ? 'Online' : 'Away'}
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-stone-900',
                      online ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600',
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5">{member.name}</span>
                  <span className="block truncate text-xs leading-4 text-stone-500 dark:text-stone-400">
                    {online ? '🟢 ' : '⚪ '}
                    {member.status || 'Away'}
                  </span>
                </span>
              </li>
            );
          })}
          <li className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="relative shrink-0">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-violet-600 text-white">
                <Bot className="size-4" />
              </span>
              <span
                aria-label="Active"
                className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">famuse</span>
              <span className="block truncate text-xs leading-4 text-stone-500 dark:text-stone-400">
                🤖 AI Butler · Active
              </span>
            </span>
          </li>
        </ul>
      </div>
      <Separator />

      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/60">
          <Avatar name={user.name} className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-5">{user.name}</p>
            <p className="truncate text-xs leading-4 text-stone-500 dark:text-stone-400">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onSignOut}
            disabled={signingOut}
            title="Sign out"
            aria-label="Sign out"
          >
            {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
