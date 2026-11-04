import { defineScheduled } from 'void';
import { createDb } from 'void/db';
import { resetDemoHousehold } from '../src/server/demo/reset-household';

/** Hourly wipe of the public demo household back to a fresh seed. */
export const cron = '0 * * * *';

export default defineScheduled(async (controller, env) => {
  const uploads = await resetDemoHousehold(createDb(env.DB), env.STORAGE);
  console.log(
    `[famuse] demo household reset (cron=${controller.cron}, uploads=${uploads})`,
  );
});
