import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // src/game is the framework-free core: pure logic that runs (and is tested) in plain Node.
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zustand',
              message: "Use 'zustand/vanilla' in src/game; React bindings live in src/hooks.",
            },
          ],
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'three', 'three/*', '@react-three/*'],
              message: 'src/game must stay free of React and three.js so it can be unit-tested.',
            },
          ],
        },
      ],
    },
  },
  prettier,
]);
