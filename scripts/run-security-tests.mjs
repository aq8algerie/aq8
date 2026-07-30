import { spawnSync } from 'node:child_process';

const testFiles = [
  'src/lib/firestoreIsolation.test.ts',
  'src/lib/serverAccessIsolation.test.ts',
];

for (const testFile of testFiles) {
  const result = spawnSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', testFile],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}