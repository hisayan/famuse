import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@void/react";
import { auth } from "void/client";
import type { Props } from "./index.server";
import type {
  Household,
  HouseholdMember,
  HouseholdTask,
} from "../src/shared/types";
import { SignIn } from "../src/client/components/sign-in";
import { HouseholdApp } from "../src/client/components/household-app";
import { Button, Card } from "../src/client/components/ui";
import "./style.css";

interface HouseholdSnapshot {
  household: Household;
  members: HouseholdMember[];
  tasks: HouseholdTask[];
}

export default function FamusePage(props: Props) {
  const router = useRouter();
  const [channelId, setChannelId] = useState("living-room");
  const [household, setHousehold] = useState<Household | null>(props.household);
  const [members, setMembers] = useState<HouseholdMember[]>(props.members);
  const [tasks, setTasks] = useState<HouseholdTask[]>(props.tasks);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  const user = props.user;
  // Derived, never a fetch guard: keeping a "joining" flag in state and in
  // the effect below self-cancels the join (the flag flips mid-flight,
  // React re-runs the effect, the cleanup marks the first fetch stale, and
  // the second run bails on the flag). A ref guards the flight instead.
  const joining = !!user && !household && !joinError;
  const joinFlightRef = useRef(false);

  useEffect(() => {
    if (!user || household || joinFlightRef.current) return;
    joinFlightRef.current = true;
    let cancelled = false;
    setJoinError(null);
    fetch("/api/demo/ensure-household", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || `Join failed (${response.status}).`);
        }
        return (await response.json()) as HouseholdSnapshot;
      })
      .then((snapshot) => {
        if (cancelled) return;
        setHousehold(snapshot.household);
        setMembers(snapshot.members);
        setTasks(snapshot.tasks);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("[famuse] Household join failed.", error);
        setJoinError(error instanceof Error ? error.message : "Could not join the household.");
      })
      .finally(() => {
        joinFlightRef.current = false;
      });
    return () => {
      cancelled = true;
      joinFlightRef.current = false;
    };
  }, [user, household, attempt]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await auth.signOut();
    } catch (error) {
      console.error("[famuse] Sign out failed.", error);
    } finally {
      router.refresh();
    }
  }

  if (!user) {
    return <SignIn onSignedIn={() => router.refresh()} />;
  }

  if (!household) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-stone-100 px-4 dark:bg-stone-950">
        <Card className="w-full max-w-sm p-6 text-center">
          {joinError ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium">Could not join the household.</p>
              <p className="text-[13px] text-stone-500 dark:text-stone-400">{joinError}</p>
              <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-stone-600 dark:text-stone-300">
              <Loader2 className="size-4 animate-spin" /> Joining the household…
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <HouseholdApp
      user={user}
      household={household}
      members={members}
      tasks={tasks}
      channelId={channelId}
      onChannelChange={setChannelId}
      onTasksChange={setTasks}
      onSignOut={handleSignOut}
      signingOut={signingOut}
    />
  );
}
