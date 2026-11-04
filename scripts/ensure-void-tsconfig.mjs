// Works around a void 1.5.0 chicken-and-egg on fresh clones: the root
// tsconfig.json extends .void/tsconfig.json, but `void prepare` resolves
// the tsconfig before generating it, so postinstall fails with
// "Tsconfig not found .void/tsconfig.json". A stub unblocks resolution;
// prepare overwrites it with the real generated content.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('.void', { recursive: true });
if (!existsSync('.void/tsconfig.json')) {
  writeFileSync('.void/tsconfig.json', '{}\n');
}
