import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/*.test.ts', '**/*.test.tsx'],
        exclude: ['node_modules', '.next', 'scripts/**'],
        testTimeout: 30000,
        environmentMatchGlobs: [
            ['**/*.test.tsx', 'jsdom'],
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
