import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Isolation tests spin up an in-memory MongoDB per file; keep
    // things simple and run test files sequentially rather than
    // in parallel workers, since each starts its own mongod.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});