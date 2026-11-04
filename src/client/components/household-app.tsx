import { useMemo, useState } from 'react';
import type {
  Household,
  HouseholdMember,
  HouseholdTask,
} from '../../shared/types';
import type { RoomQuickAction } from '../../shared/room-events';
import { useRoom } from '../hooks/use-room';
import { Sidebar, type SidebarUser } from './sidebar';
import { ChannelView } from './channel-view';
import { ContextDrawer } from './context-drawer';

export function HouseholdApp({
  user,
  household,
  members,
  tasks,
  channelId,
  onChannelChange,
  onTasksChange,
  onSignOut,
  signingOut,
}: {
  user: SidebarUser & { id: string };
  household: Household;
  members: HouseholdMember[];
  tasks: HouseholdTask[];
  channelId: string;
  onChannelChange: (channelId: string) => void;
  onTasksChange: (tasks: HouseholdTask[]) => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const selfMember = members.find((member) => member.userId === user.id) ?? null;
  const self = useMemo(
    () => (selfMember ? { memberId: selfMember.id, name: selfMember.name } : null),
    [selfMember],
  );
  const room = useRoom(channelId, self);
  const [navOpen, setNavOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const onlineIds = useMemo(
    () => new Set(room.online.map((peer) => peer.memberId)),
    [room.online],
  );

  if (!self) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-stone-50 dark:bg-stone-950">
        <p className="text-sm text-stone-500">Joining the household…</p>
      </div>
    );
  }

  function handleQuickAction(action: RoomQuickAction) {
    room.send(action.actionText, []);
  }

  function handleSelectChannel(nextChannelId: string) {
    onChannelChange(nextChannelId);
    setNavOpen(false);
  }

  return (
    <div className="flex h-svh overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-stone-950/40 lg:hidden"
        />
      )}
      <Sidebar
        household={household}
        members={members}
        onlineIds={onlineIds}
        activeChannel={channelId}
        onSelectChannel={handleSelectChannel}
        status={room.status}
        user={user}
        onSignOut={onSignOut}
        signingOut={signingOut}
        mobileOpen={navOpen}
        onCloseMobile={() => setNavOpen(false)}
      />
      <ChannelView
        key={channelId}
        channelId={channelId}
        status={room.status}
        messages={room.messages}
        pendingIds={room.pendingIds}
        onlineCount={room.online.length}
        typing={room.typing}
        quickActions={room.quickActions}
        catchUp={room.catchUp}
        catchUpPending={room.catchUpPending}
        error={room.error}
        onSend={room.send}
        onTyping={room.sendTyping}
        onQuickAction={handleQuickAction}
        onRequestCatchUp={room.requestCatchUp}
        onDismissCatchUp={room.dismissCatchUp}
        onDismissError={room.dismissError}
        onOpenNav={() => setNavOpen(true)}
        onOpenContext={() => setContextOpen(true)}
      />
      {contextOpen && (
        <button
          type="button"
          aria-label="Close household panel"
          onClick={() => setContextOpen(false)}
          className="fixed inset-0 z-30 bg-stone-950/40 xl:hidden"
        />
      )}
      <ContextDrawer
        household={household}
        tasks={tasks}
        summaries={room.summaries}
        onTasksChange={onTasksChange}
        mobileOpen={contextOpen}
        onCloseMobile={() => setContextOpen(false)}
      />
    </div>
  );
}
