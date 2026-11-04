import { formatClockTime, formatElapsedShort } from '../../shared/format';
import type { PetStatusSummary } from '../plugins/pet';

export interface LocalAssistantContext {
  /** Raw triggering message text (may include the @famuse mention). */
  requestText: string;
  /** Recent room dialogue, oldest first, for grounded answers. */
  recentMessages: Array<{ senderName: string; text: string; isAi: boolean }>;
  petSummary: PetStatusSummary | null;
  householdName: string;
}

const RECIPE_REPLY = `👨‍🍳 **Quick Garlic Butter Pan-Seared Chicken!**
You have everything you need for a savory 15-minute skillet dinner.

- **Prep:** Dice the onions, mince the garlic, season the chicken thighs.
- **Cook:** Sear on high heat for 6 mins per side with butter.`;

function mentionsFood(text: string): boolean {
  return /(chicken|onion|garlic|butter|fridge|dinner|cook|recipe|meal|eat|hungry|whip up|ingredients)/.test(
    text,
  );
}

function asksForBuddyStatus(text: string): boolean {
  return (
    /buddy/.test(text) &&
    /(status|how|when|last|walk|fed|eat|potty|pee|poop|outside|doing|update)/.test(text)
  );
}

function asksForHelp(text: string): boolean {
  return /(^|\b)(help|what can you do|commands|who are you|hello|hi|hey)(\b|$)/.test(text);
}

function petStatusReply(pet: PetStatusSummary): string {
  const lines = [
    `🐶 **Buddy status** (as of ${formatClockTime(Date.now(), 'UTC')} UTC):`,
    `- **Walk:** ${pet.lastWalk.display} — ${formatElapsedShort(pet.lastWalk.timestamp)}`,
    `- **Meal:** ${pet.lastFed.display} — ${formatElapsedShort(pet.lastFed.timestamp)}`,
    `- **Potty:** ${pet.lastPotty.display} — ${formatElapsedShort(pet.lastPotty.timestamp)}`,
  ];
  if (pet.alerts.length > 0) {
    lines.push('', ...pet.alerts.map((alert) => `⚠️ ${alert}`));
  } else {
    lines.push('', 'All caught up. Buddy is living his best life. 🐾');
  }
  return lines.join('\n');
}

/**
 * Built-in fallback assistant. It answers from real room data (recent
 * messages and plugin state) so the demo stays useful with no API key.
 */
export function localAssistantReply(context: LocalAssistantContext): string {
  const text = context.requestText.toLowerCase();

  if (asksForBuddyStatus(text) && context.petSummary) {
    return petStatusReply(context.petSummary);
  }

  if (/(recipe|cook|whip up|dinner|what.*(eat|make)|hungry)/.test(text) && mentionsFood(text)) {
    const buddyNote =
      context.petSummary && context.petSummary.alerts.length > 0
        ? `\n\n💡 *Note: ${context.petSummary.alerts[0]}*`
        : context.petSummary
          ? `\n\n💡 *Note: Buddy was last walked ${formatElapsedShort(context.petSummary.lastWalk.timestamp)} — a stroll while dinner cooks keeps everyone happy.*`
          : '';
    return `${RECIPE_REPLY}${buddyNote}`;
  }

  if (asksForHelp(text)) {
    return `Hello! I'm **famuse**, your household butler. Here's what I can do:\n\n- 🍳 Suggest dinners from what's in your fridge\n- 🐾 Track Buddy's walks, meals, and potty breaks\n- 📰 Catch you up when you open the app\n- ✅ Keep an eye on household tasks\n\nMention me with **@famuse** any time you need a hand.`;
  }

  const lastHuman = [...context.recentMessages].reverse().find((message) => !message.isAi);
  if (lastHuman) {
    return `Got it — noted for the ${context.householdName}. If you need dinner ideas, Buddy's status, or a quick catch-up, just ask me with **@famuse**.`;
  }
  return `Hello! I'm **famuse**, your household butler. Mention me with **@famuse** any time you need dinner ideas, Buddy's status, or a quick catch-up.`;
}

/** Deterministic catch-up digest built from real message history. */
export function localCatchUp(
  history: Array<{ senderName: string; text: string; isAi: boolean; createdAt: number }>,
  householdName: string,
): string {
  if (history.length === 0) {
    return `Welcome to the ${householdName}! No messages yet — say hello and I'll keep track of everything from here. 👋`;
  }
  const lines = history.slice(-8).map((message) => {
    const who = message.isAi ? 'famuse (AI Butler)' : message.senderName;
    const snippet = message.text.replace(/\s+/g, ' ').trim().slice(0, 140);
    return `- **${who}** (${formatElapsedShort(message.createdAt)}): ${snippet}`;
  });
  const openLoop = history.some((message) => /\?/.test(message.text) && !message.isAi);
  lines.push(
    openLoop
      ? '\nThere is at least one open question above — worth a reply before dinner. 🍳'
      : '\nNothing urgent pending. The hearth is calm. 🏡',
  );
  return `📰 **Catch-up for the ${householdName}:**\n\n${lines.join('\n')}`;
}
