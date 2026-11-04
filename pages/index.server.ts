import { defineHandler, type InferProps } from "void";
import { getUser } from "void/auth";
import { db, eq } from "void/db";
import { householdMembers, households, tasks } from "@schema";
import type {
  Household,
  HouseholdMember,
  HouseholdTask,
  MemberRole,
} from "../src/shared/types";

export type Props = InferProps<typeof loader>;

function toRole(value: string): MemberRole {
  return value === "admin" || value === "agent" ? value : "member";
}

export const loader = defineHandler(async () => {
  const user = getUser();
  if (!user) {
    return { user: null, household: null, members: [], tasks: [] };
  }
  const safeUser = { id: user.id, name: user.name, email: user.email };

  const membership = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);
  if (!membership[0]) {
    return { user: safeUser, household: null, members: [], tasks: [] };
  }

  const householdId = membership[0].householdId;
  const [householdRows, memberRows, taskRows] = await Promise.all([
    db.select().from(households).where(eq(households.id, householdId)).limit(1),
    db.select().from(householdMembers).where(eq(householdMembers.householdId, householdId)),
    db.select().from(tasks).where(eq(tasks.householdId, householdId)),
  ]);
  const householdRow = householdRows[0];
  if (!householdRow) {
    return { user: safeUser, household: null, members: [], tasks: [] };
  }

  const household: Household = {
    id: householdRow.id,
    name: householdRow.name,
    pinnedRecipeTitle: householdRow.pinnedRecipeTitle,
    pinnedRecipeDetail: householdRow.pinnedRecipeDetail,
  };
  const members: HouseholdMember[] = memberRows.map((member) => ({
    id: member.id,
    householdId: member.householdId,
    userId: member.userId,
    name: member.name,
    role: toRole(member.role),
    status: member.status,
  }));
  const names = new Map(members.map((member) => [member.id, member.name]));
  const householdTasks: HouseholdTask[] = taskRows.map((task) => ({
    id: task.id,
    householdId: task.householdId,
    title: task.title,
    assigneeMemberId: task.assigneeMemberId,
    assigneeName: task.assigneeMemberId ? (names.get(task.assigneeMemberId) ?? null) : null,
    done: task.done === 1,
  }));

  return { user: safeUser, household, members, tasks: householdTasks };
});
