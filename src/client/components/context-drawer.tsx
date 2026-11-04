import { useEffect, useState } from 'react';
import { AlertTriangle, Bone, ChefHat, ListChecks, Loader2, PawPrint, Sprout, X } from 'lucide-react';
import type { Household, HouseholdTask } from '../../shared/types';
import { formatElapsedShort } from '../../shared/format';
import { cn } from '../lib/cn';
import { Badge, Card, CardContent, CardHeader, CardTitle } from './ui';
import { Markdown } from './markdown';

interface PetEventView {
  timestamp: number;
  memberName: string;
  display: string;
}

interface PetStatusView {
  lastWalk: PetEventView;
  lastFed: PetEventView;
  lastPotty: PetEventView;
  alerts: string[];
}

function isPetEventView(value: unknown): value is PetEventView {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.timestamp === 'number' &&
    typeof candidate.memberName === 'string' &&
    typeof candidate.display === 'string'
  );
}

function parsePetStatus(value: unknown): PetStatusView | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    !isPetEventView(candidate.lastWalk) ||
    !isPetEventView(candidate.lastFed) ||
    !isPetEventView(candidate.lastPotty) ||
    !Array.isArray(candidate.alerts)
  ) {
    return null;
  }
  return {
    lastWalk: candidate.lastWalk,
    lastFed: candidate.lastFed,
    lastPotty: candidate.lastPotty,
    alerts: candidate.alerts.filter((alert): alert is string => typeof alert === 'string'),
  };
}

function PetRow({
  icon,
  label,
  event,
}: {
  icon: React.ReactNode;
  label: string;
  event: PetEventView;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-stone-500 dark:text-stone-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-5">{label}</span>
        <span className="block text-[13px] leading-5 text-stone-600 dark:text-stone-300">
          {event.display}
        </span>
        <span className="block text-xs tabular-nums text-stone-400 dark:text-stone-500">
          {formatElapsedShort(event.timestamp)} · by {event.memberName}
        </span>
      </span>
    </li>
  );
}

export function ContextDrawer({
  household,
  tasks,
  summaries,
  onTasksChange,
  mobileOpen = false,
  onCloseMobile,
}: {
  household: Household;
  tasks: HouseholdTask[];
  summaries: Record<string, unknown>;
  onTasksChange: (tasks: HouseholdTask[]) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const [petStatus, setPetStatus] = useState<PetStatusView | null>(null);
  const [petLoading, setPetLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Pet state is household-wide (D1 mirror); refresh it whenever any room
  // broadcast a plugin update, and seed it from the live room cache first.
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch('/api/pet/status');
        if (!response.ok) throw new Error(`Pet status failed (${response.status}).`);
        const parsed = parsePetStatus(await response.json());
        if (!cancelled) {
          if (parsed) setPetStatus(parsed);
          setPetLoading(false);
        }
      } catch (refreshError) {
        console.error('[famuse] Pet status refresh failed.', refreshError);
        if (!cancelled) setPetLoading(false);
      }
    }
    const live = parsePetStatus(summaries['pet-care']);
    if (live) {
      setPetStatus(live);
      setPetLoading(false);
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [summaries]);

  async function toggleTask(task: HouseholdTask) {
    setTogglingId(task.id);
    setTaskError(null);
    const previous = tasks;
    onTasksChange(tasks.map((entry) => (entry.id === task.id ? { ...entry, done: !entry.done } : entry)));
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });
      if (!response.ok) throw new Error(`Task update failed (${response.status}).`);
    } catch (toggleError) {
      console.error('[famuse] Task toggle failed.', toggleError);
      onTasksChange(previous);
      setTaskError('Could not update that task. Please try again.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <aside
      aria-label="Household context"
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex h-full w-[88vw] max-w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-stone-200 bg-white p-3 shadow-xl transition-transform duration-200 xl:static xl:z-auto xl:w-80 xl:max-w-none xl:translate-x-0 xl:shadow-none dark:border-stone-800 dark:bg-stone-900',
        mobileOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex items-center justify-between xl:hidden">
        <p className="text-sm font-semibold tracking-tight">Household</p>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close household panel"
          className="inline-flex size-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <X className="size-4" />
        </button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Buddy · Pet Status</CardTitle>
          <PawPrint className="size-4 text-stone-400" />
        </CardHeader>
        <CardContent>
          {petLoading && !petStatus ? (
            <p className="flex items-center gap-2 text-[13px] text-stone-500">
              <Loader2 className="size-4 animate-spin" /> Checking on Buddy…
            </p>
          ) : petStatus ? (
            <div className="grid gap-3">
              <ul className="grid gap-2.5">
                <PetRow icon={<PawPrint className="size-4" />} label="Walk" event={petStatus.lastWalk} />
                <PetRow icon={<Bone className="size-4" />} label="Food" event={petStatus.lastFed} />
                <PetRow icon={<Sprout className="size-4" />} label="Potty" event={petStatus.lastPotty} />
              </ul>
              {petStatus.alerts.length > 0 && (
                <ul className="grid gap-1.5">
                  {petStatus.alerts.map((alert) => (
                    <li
                      key={alert}
                      className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      {alert}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-stone-500">
              Pet tracking lives in #living-room and #pet-care.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dinner &amp; Pantry</CardTitle>
          <ChefHat className="size-4 text-stone-400" />
        </CardHeader>
        <CardContent>
          {household.pinnedRecipeTitle ? (
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-6">{household.pinnedRecipeTitle}</p>
              {household.pinnedRecipeDetail && (
                <Markdown text={household.pinnedRecipeDetail} className="text-[13px] leading-6 text-stone-600 dark:text-stone-300" />
              )}
              <p className="text-xs text-stone-400 dark:text-stone-500">Suggested by @famuse</p>
            </div>
          ) : (
            <p className="text-[13px] text-stone-500">
              No recipe pinned yet. Ask @famuse for dinner ideas.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Household Tasks</CardTitle>
          <ListChecks className="size-4 text-stone-400" />
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-[13px] text-stone-500">No tasks. Enjoy the calm. 🏡</p>
          ) : (
            <ul className="grid gap-1.5">
              {tasks.map((task) => (
                <li key={task.id}>
                  <label
                    className={cn(
                      'flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-stone-50 xl:min-h-0 xl:py-1.5 dark:hover:bg-stone-800',
                      togglingId === task.id && 'opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      disabled={togglingId !== null}
                      onChange={() => toggleTask(task)}
                      className="mt-0.5 size-5 shrink-0 accent-emerald-700 xl:mt-1 xl:size-3.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-[13px] leading-5',
                          task.done ? 'text-stone-400 line-through dark:text-stone-500' : 'font-medium',
                        )}
                      >
                        {task.title}
                      </span>
                      {task.assigneeName && (
                        <span className="mt-1 block">
                          <Badge variant="outline">{task.assigneeName}</Badge>
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {taskError && (
            <p role="alert" className="pt-2 text-xs text-red-700 dark:text-red-400">
              {taskError}
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
