import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tokens': path.resolve(__dirname, 'src/design/tokens/index.ts'),
    },
  },
})
