import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    css: false,
    environment: 'node',
  },
  css: { postcss: {} },
});
