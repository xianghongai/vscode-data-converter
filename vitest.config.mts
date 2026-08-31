import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // 与 tsconfig.json 的 paths 对应；vitest 不读 tsconfig paths
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
});
