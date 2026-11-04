import { index, integer, sqliteTable, text } from "void/schema-d1";

export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  pinnedRecipeTitle: text("pinned_recipe_title"),
  pinnedRecipeDetail: text("pinned_recipe_detail"),
  createdAt: integer("created_at").notNull(),
});

export const householdMembers = sqliteTable(
  "household_members",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id),
    /** Better Auth user id once a real sign-in is linked, otherwise null. */
    userId: text("user_id"),
    name: text("name").notNull(),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default(""),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("household_members_household_idx").on(table.householdId),
    index("household_members_user_idx").on(table.userId),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id),
    channelId: text("channel_id").notNull(),
    senderId: text("sender_id").notNull(),
    senderName: text("sender_name").notNull(),
    text: text("text").notNull(),
    isAi: integer("is_ai").notNull().default(0),
    /** JSON-encoded Attachment array, or null when there are none. */
    attachments: text("attachments"),
    /** Unix epoch milliseconds. */
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("messages_channel_idx").on(
      table.householdId,
      table.channelId,
      table.createdAt,
    ),
  ],
);

export const petEvents = sqliteTable(
  "pet_events",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id),
    kind: text("kind").notNull(),
    memberName: text("member_name").notNull(),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("pet_events_household_idx").on(table.householdId, table.createdAt)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id),
    title: text("title").notNull(),
    assigneeMemberId: text("assignee_member_id"),
    done: integer("done").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("tasks_household_idx").on(table.householdId)],
);
