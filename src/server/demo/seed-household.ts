import { and, db, eq } from "void/db";
import { DEMO_ACCOUNTS, DEMO_HOUSEHOLD_ID, DEMO_HOUSEHOLD_NAME } from "../../shared/demo-accounts";
import {
  householdMembers,
  households,
  messages,
  tasks,
} from "../../../db/schema";

export type AppDb = typeof db;

const MINUTE_MS = 60_000;

function formatSeedTime(epochMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(epochMs));
}

interface SeedMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  text: string;
  isAi: boolean;
  createdAt: number;
}

function buildSeedMessages(now: number): SeedMessage[] {
  const walkLoggedAt = now - 5 * MINUTE_MS + 20_000;
  return [
    {
      id: "demo-m1",
      channelId: "living-room",
      senderId: "mom",
      senderName: "Mom",
      text: "Running late from the clinic! Do we have anything left in the fridge for dinner?",
      isAi: false,
      createdAt: now - 10 * MINUTE_MS,
    },
    {
      id: "demo-m2",
      channelId: "living-room",
      senderId: "dad",
      senderName: "Dad",
      text: "Just checked. We have 3 chicken thighs, half an onion, butter, and some garlic.",
      isAi: false,
      createdAt: now - 8 * MINUTE_MS,
    },
    {
      id: "demo-m3",
      channelId: "living-room",
      senderId: "dad",
      senderName: "Dad",
      text: "@famuse what can we whip up in under 20 minutes with this?",
      isAi: false,
      createdAt: now - 7 * MINUTE_MS,
    },
    {
      id: "demo-m4",
      channelId: "living-room",
      senderId: "famuse",
      senderName: "famuse",
      text: "👨‍🍳 **Quick Garlic Butter Pan-Seared Chicken!**\nYou have everything you need for a savory 15-minute skillet dinner.\n\n- **Prep:** Dice the onions, mince the garlic, season the chicken thighs.\n- **Cook:** Sear on high heat for 6 mins per side with butter.\n\n💡 *Note: Buddy hasn't had his evening walk yet. Want Dad to walk him while the chicken is searing?*",
      isAi: true,
      createdAt: now - 7 * MINUTE_MS + 30_000,
    },
    {
      id: "demo-m5",
      channelId: "living-room",
      senderId: "dad",
      senderName: "Dad",
      text: "@famuse Buddy just had a 20-minute walk around the block.",
      isAi: false,
      createdAt: now - 5 * MINUTE_MS,
    },
    {
      id: "demo-m6",
      channelId: "living-room",
      senderId: "famuse",
      senderName: "famuse",
      text: `Logged! Buddy's evening walk complete at ${formatSeedTime(walkLoggedAt)}. Enjoy your dinner, Millers! 🐕`,
      isAi: true,
      createdAt: walkLoggedAt,
    },
    {
      id: "demo-m7",
      channelId: "groceries",
      senderId: "dad",
      senderName: "Dad",
      text: "We are running low on oat milk and eggs. Added them to the list.",
      isAi: false,
      createdAt: now - 3 * 60 * MINUTE_MS,
    },
    {
      id: "demo-m8",
      channelId: "announcements",
      senderId: "mom",
      senderName: "Mom",
      text: "Reminder: Leo's soccer game is Saturday at 10 AM. Go Tigers! 🐯",
      isAi: false,
      createdAt: now - 26 * 60 * MINUTE_MS,
    },
  ];
}

/**
 * Idempotently seed the Miller demo household: the household row, the family
 * roster, starter tasks, and the scripted living-room exchange. Safe to run
 * from `void db seed` and from the demo bootstrap API route.
 */
export async function seedDemoHousehold(target: AppDb, now: number = Date.now()): Promise<void> {
  const existingHousehold = await target
    .select({ id: households.id })
    .from(households)
    .where(eq(households.id, DEMO_HOUSEHOLD_ID));

  if (existingHousehold.length === 0) {
    await target.insert(households).values({
      id: DEMO_HOUSEHOLD_ID,
      name: DEMO_HOUSEHOLD_NAME,
      pinnedRecipeTitle: "Quick Garlic Butter Pan-Seared Chicken",
      pinnedRecipeDetail:
        "15-minute skillet dinner: sear seasoned chicken thighs 6 minutes per side with butter, garlic, and onion.",
      createdAt: now,
    });
  }

  for (const account of DEMO_ACCOUNTS) {
    const existing = await target
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, DEMO_HOUSEHOLD_ID),
          eq(householdMembers.id, account.memberId),
        ),
      );
    if (existing.length === 0) {
      await target.insert(householdMembers).values({
        id: account.memberId,
        householdId: DEMO_HOUSEHOLD_ID,
        userId: null,
        name: account.name,
        role: account.role,
        status: account.status,
        createdAt: now,
      });
    }
  }

  const starterTasks = [
    { id: "task-recycling", title: "Take out the recycling", assigneeMemberId: "leo" },
    { id: "task-buddy-walk", title: "Walk Buddy after dinner", assigneeMemberId: "dad" },
    { id: "task-soccer-bag", title: "Pack Leo's soccer bag", assigneeMemberId: "mom" },
  ];
  for (const task of starterTasks) {
    const existing = await target
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.householdId, DEMO_HOUSEHOLD_ID), eq(tasks.id, task.id)));
    if (existing.length === 0) {
      await target.insert(tasks).values({
        id: task.id,
        householdId: DEMO_HOUSEHOLD_ID,
        title: task.title,
        assigneeMemberId: task.assigneeMemberId,
        done: 0,
        createdAt: now,
      });
    }
  }

  const livingRoomHistory = await target
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.householdId, DEMO_HOUSEHOLD_ID),
        eq(messages.channelId, "living-room"),
      ),
    )
    .limit(1);

  if (livingRoomHistory.length === 0) {
    await target.insert(messages).values(
      buildSeedMessages(now).map((message) => ({
        id: message.id,
        householdId: DEMO_HOUSEHOLD_ID,
        channelId: message.channelId,
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text,
        isAi: message.isAi ? 1 : 0,
        attachments: null,
        createdAt: message.createdAt,
      })),
    );
  }
}
