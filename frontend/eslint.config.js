import js from '@eslint/js';
import react from 'eslint-plugin-react';
import tsParser from '@babel/eslint-parser';

export default [
  { ignores: ['dist/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      react,
      'type-references': {
        rules: {
          used: {
            create(context) {
              return {
                TSTypeReference(node) {
                  let name = node.typeName;
                  while (name.type === 'TSQualifiedName') name = name.left;
                  context.sourceCode.markVariableAsUsed(name.name, node);
                },
              };
            },
          },
        },
      },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { plugins: [['@babel/plugin-syntax-typescript', { isTSX: true }]] },
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'type-references/used': 'error',
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': 'warn',
      'no-undef': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
