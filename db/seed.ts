import { defineSeed } from "void/seed";
import { seedDemoHousehold, type AppDb } from "../src/server/demo/seed-household";

export default defineSeed<typeof import("./schema")>(async ({ db }) => {
  // The seed runner may hand over a different Drizzle driver instance than
  // the request-scoped `db`, but both speak the same SQLite dialect against
  // the same tables, so sharing the seed routine is safe.
  await seedDemoHousehold(db as unknown as AppDb);
});
